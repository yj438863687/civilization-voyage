import asyncio
import json
import os
import sqlite3
import time
import uuid
from contextlib import asynccontextmanager, contextmanager
from pathlib import Path
from typing import List

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from .models import (VoyageCreate, VoyageUpdate, Voyage, RecordCreate, Record, TradeCreate,
                     Trade, TaskCreate, Task, Event, Usage, ModelInfo, Port, Scene, Confirmation, Provider)

ROOT = Path(__file__).resolve().parents[3]
FIXTURE = json.loads((Path(__file__).resolve().parents[1] / 'fixtures/economy.json').read_text())

def encode(value):
    return json.dumps(value, ensure_ascii=False)

def ident():
    return str(uuid.uuid4())

@contextmanager
def db():
    con = sqlite3.connect(os.getenv('VOYAGE_DB', 'voyage.sqlite3'), timeout=30)
    con.row_factory = sqlite3.Row
    try:
        with con:
            yield con
    finally:
        con.close()

def init():
    with db() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS voyages(id TEXT PRIMARY KEY, body TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY, voyage TEXT, body TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS markets(voyage TEXT, port TEXT, body TEXT, PRIMARY KEY(voyage,port));
        CREATE TABLE IF NOT EXISTS trades(voyage TEXT, request TEXT, input TEXT, body TEXT, PRIMARY KEY(voyage,request));
        CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, voyage TEXT, request TEXT, body TEXT, UNIQUE(voyage,request));
        CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT, task TEXT, kind TEXT, data TEXT);
        CREATE TABLE IF NOT EXISTS usage(task TEXT PRIMARY KEY, body TEXT);
        CREATE TABLE IF NOT EXISTS scenes(id TEXT, version INTEGER, track TEXT, body TEXT, PRIMARY KEY(id,version,track));
        CREATE TABLE IF NOT EXISTS confirmations(id TEXT, version INTEGER, reviewer TEXT, note TEXT);
        ''')
        for path in (ROOT / 'content/scenes').rglob('*.json'):
            scene = Scene.model_validate_json(path.read_text())
            track = {'pending': 'candidate', 'test': 'test', 'confirmed': 'confirmed'}[scene.status]
            c.execute('INSERT OR IGNORE INTO scenes VALUES(?,?,?,?)', (scene.id, scene.version, track, scene.model_dump_json()))
        # Never replay an ambiguous paid call after a process interruption.
        for row in c.execute('SELECT body FROM tasks').fetchall():
            task = json.loads(row['body'])
            if task['status'] == 'running':
                task['status'] = 'failed'
                save_task(c, task)
                event(c, task['id'], 'failed', {'code': 'worker_interrupted', 'message': 'Upstream outcome unknown; no automatic paid retry.'})

def voyage(c, vid):
    row = c.execute('SELECT body FROM voyages WHERE id=?', (vid,)).fetchone()
    if not row:
        raise HTTPException(404, 'Voyage not found')
    return json.loads(row['body'])

def save_voyage(c, value):
    c.execute('UPDATE voyages SET body=? WHERE id=?', (encode(value), value['id']))

def task_get(c, vid, tid):
    voyage(c, vid)
    row = c.execute('SELECT body FROM tasks WHERE id=? AND voyage=?', (tid, vid)).fetchone()
    if not row:
        raise HTTPException(404, 'Task not found')
    return json.loads(row['body'])

def save_task(c, task):
    c.execute('UPDATE tasks SET body=? WHERE id=?', (encode(task), task['id']))

def event(c, tid, kind, data):
    c.execute('INSERT INTO events(task,kind,data) VALUES(?,?,?)', (tid, kind, encode(data)))

def providers():
    # Read only explicitly named server environment configuration, never files.
    configured = os.getenv('VOYAGE_MODELS')
    if configured:
        entries = [Provider.model_validate(p) for p in json.loads(configured)]
        if len({p.id for p in entries}) != len(entries):
            raise ValueError('Duplicate provider IDs')
        return {p.id: (p.url, p.model, os.getenv(p.key_env)) for p in entries}
    if all(os.getenv(k) for k in ['VOYAGE_MODEL_URL', 'VOYAGE_MODEL_NAME', 'VOYAGE_MODEL_KEY']):
        return {'configured': (os.environ['VOYAGE_MODEL_URL'], os.environ['VOYAGE_MODEL_NAME'], os.environ['VOYAGE_MODEL_KEY'])}
    return {}

async def execute(tid):
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        task = json.loads(c.execute('SELECT body FROM tasks WHERE id=?', (tid,)).fetchone()['body'])
        if task['status'] != 'queued':
            return
        task['status'] = 'running'
        save_task(c, task)
        event(c, tid, 'started', {'model_id': task['model_id'], 'input': task['prompt']})
    started = time.monotonic()
    try:
        url, model, key = providers()[task['model_id']]
        if not key:
            raise ValueError('Credential not configured')
        async with httpx.AsyncClient(timeout=httpx.Timeout(30, read=None), follow_redirects=False) as client:
            response = await client.post(url, headers={'Authorization': 'Bearer ' + key}, json={'model': model, 'messages': [{'role': 'user', 'content': task['prompt']}]})
            response.raise_for_status()
            result = response.json()
            output = result['choices'][0]['message']['content']
            if not isinstance(output, str) or not isinstance(result.get('usage', {}), dict):
                raise ValueError('Invalid upstream response')
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
        with db() as c:
            c.execute('BEGIN IMMEDIATE')
            latest = task_get(c, task['voyage_id'], tid)
            latest['status'] = 'cancelled' if latest['cancel_requested'] else 'failed'
            save_task(c, latest)
            event(c, tid, latest['status'], {'code': 'upstream_failure', 'message': 'Model request failed; provider details redacted.'})
        return
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        latest = task_get(c, task['voyage_id'], tid)
        latest['status'] = 'cancelled' if latest['cancel_requested'] else 'succeeded'
        save_task(c, latest)
        usage = Usage(task_id=tid, model=model, elapsed_ms=int((time.monotonic()-started)*1000), usage=result.get('usage', {}))
        c.execute('INSERT INTO usage VALUES(?,?)', (tid, usage.model_dump_json()))
        event(c, tid, latest['status'], {'output': output, 'usage': usage.model_dump()})
        record = Record(id=ident(), voyage_id=task['voyage_id'], kind='artifact', text=output, classification='creative')
        c.execute('INSERT INTO records VALUES(?,?,?)', (record.id, record.voyage_id, record.model_dump_json()))

async def worker():
    while True:
        with db() as c:
            ids = [r['id'] for r in c.execute('SELECT id FROM tasks WHERE json_extract(body,\'$.status\')=\'queued\'')]
        for tid in ids:
            await execute(tid)
        await asyncio.sleep(.2)

@asynccontextmanager
async def lifespan(app):
    providers()  # Reject malformed explicit provider configuration at startup.
    init()
    runner = asyncio.create_task(worker())
    yield
    runner.cancel()
    try:
        await runner
    except asyncio.CancelledError:
        pass

app = FastAPI(title='Civilization Voyage API', version='0.1.0', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173'], allow_methods=['GET','POST','PUT'], allow_headers=['Content-Type'])

@app.get('/health')
def health():
    return {'status': 'ok', 'access_mode': 'local_single_user', 'hmt': 'not_connected'}

@app.get('/models', response_model=List[ModelInfo])
def models():
    return [ModelInfo(id=pid, model=value[1], capabilities=['chat']) for pid,value in providers().items() if value[2]]

@app.get('/scenes', response_model=List[Scene])
def scenes():
    with db() as c:
        return [json.loads(r['body']) for r in c.execute('SELECT body FROM scenes')]

@app.put('/scenes/candidates', response_model=Scene)
def edit_scene(body: Scene):
    if body.status != 'pending':
        raise HTTPException(422, 'Candidate must remain pending')
    with db() as c:
        c.execute('INSERT OR REPLACE INTO scenes VALUES(?,?,?,?)', (body.id, body.version, 'candidate', body.model_dump_json()))
    return body

@app.post('/scenes/{sid}/{version}/confirm', response_model=Scene)
def confirm_scene(sid: str, version: int, body: Confirmation):
    with db() as c:
        row = c.execute('SELECT body FROM scenes WHERE id=? AND version=? AND track=?', (sid,version,'candidate')).fetchone()
        if not row:
            raise HTTPException(404, 'Candidate not found')
        value = json.loads(row['body'])
        value.update(status='confirmed', label='组员确认：' + body.reviewer)
        if c.execute('SELECT 1 FROM scenes WHERE id=? AND version=? AND track=?', (sid,version,'confirmed')).fetchone():
            raise HTTPException(409, 'Confirmed version is immutable; create a new version')
        c.execute('INSERT INTO scenes VALUES(?,?,?,?)', (sid,version,'confirmed',encode(value)))
        c.execute('INSERT INTO confirmations VALUES(?,?,?,?)', (sid,version,body.reviewer,body.decision_note))
        return value

@app.post('/voyages', response_model=Voyage, status_code=201)
def create_voyage(body: VoyageCreate):
    with db() as c:
        row = c.execute('SELECT body FROM scenes WHERE id=? AND version=? AND track=?', (body.scene_id, body.scene_version, body.scene_track)).fetchone()
        if not row:
            raise HTTPException(422, 'Unknown scene/version/track')
        v = Voyage(**body.model_dump(), id=ident(), scene_snapshot=json.loads(row['body']), balance=FIXTURE['balance'], capacity=FIXTURE['capacity'], inventory={})
        c.execute('INSERT INTO voyages VALUES(?,?)', (v.id, v.model_dump_json()))
        for pid, port in FIXTURE['ports'].items():
            c.execute('INSERT INTO markets VALUES(?,?,?)', (v.id,pid,encode(port)))
        return v

@app.get('/voyages', response_model=List[Voyage])
def list_voyages():
    with db() as c:
        return [json.loads(r['body']) for r in c.execute('SELECT body FROM voyages')]

@app.get('/voyages/{vid}', response_model=Voyage)
def get_voyage(vid: str):
    with db() as c:
        return voyage(c, vid)

@app.put('/voyages/{vid}', response_model=Voyage)
def update_voyage(vid: str, body: VoyageUpdate):
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        v = voyage(c, vid)
        v.update(body.model_dump())
        save_voyage(c, v)
        return v

@app.post('/voyages/{vid}/records', response_model=Record, status_code=201)
def add_record(vid: str, body: RecordCreate):
    with db() as c:
        voyage(c, vid)
        if body.kind in ['material', 'fragment'] and body.classification == 'historical_claim' and not body.sources:
            raise HTTPException(422, 'Historical materials require sources')
        r = Record(**body.model_dump(), id=ident(), voyage_id=vid)
        c.execute('INSERT INTO records VALUES(?,?,?)', (r.id,vid,r.model_dump_json()))
        return r

@app.get('/voyages/{vid}/records', response_model=List[Record])
def records(vid: str):
    with db() as c:
        voyage(c, vid)
        return [json.loads(r['body']) for r in c.execute('SELECT body FROM records WHERE voyage=?', (vid,))]

@app.get('/voyages/{vid}/ports', response_model=List[Port])
def ports(vid: str):
    with db() as c:
        voyage(c, vid)
        return [dict(id=r['port'], **json.loads(r['body'])) for r in c.execute('SELECT port,body FROM markets WHERE voyage=?', (vid,))]

@app.post('/voyages/{vid}/trades', response_model=Trade)
def trade(vid: str, body: TradeCreate):
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        v = voyage(c, vid)
        prior = c.execute('SELECT input,body FROM trades WHERE voyage=? AND request=?', (vid,body.request_id)).fetchone()
        if prior:
            if json.loads(prior['input']) != body.model_dump():
                raise HTTPException(409, 'Idempotency key reused with different input')
            return json.loads(prior['body'])
        row = c.execute('SELECT body FROM markets WHERE voyage=? AND port=?', (vid,body.port_id)).fetchone()
        if not row or body.port_id != v['world'].get('port_id'):
            raise HTTPException(409, 'Ship must be at the trading port')
        port = json.loads(row['body'])
        if body.good_id not in port['goods']:
            raise HTTPException(404, 'Good not found')
        good = port['goods'][body.good_id]
        q = body.quantity
        held = v['inventory'].get(body.good_id, 0)
        delta = -q * good['buy'] if body.side == 'buy' else q * good['sell']
        change = q if body.side == 'buy' else -q
        if body.side == 'buy' and (good['stock'] < q or sum(v['inventory'].values()) + q > v['capacity'] or v['balance'] + delta < 0):
            raise HTTPException(409, 'Insufficient balance, market stock or ship capacity')
        if held + change < 0:
            raise HTTPException(409, 'Insufficient inventory')
        v['balance'] += delta
        v['inventory'][body.good_id] = held + change
        good['stock'] -= change
        result = Trade(**body.model_dump(), id=ident(), delta_balance=delta, delta_inventory=change, balance_after=v['balance'], inventory_after=held+change)
        save_voyage(c, v)
        c.execute('UPDATE markets SET body=? WHERE voyage=? AND port=?', (encode(port),vid,body.port_id))
        c.execute('INSERT INTO trades VALUES(?,?,?,?)', (vid,body.request_id,body.model_dump_json(),result.model_dump_json()))
        return result

@app.get('/voyages/{vid}/trades', response_model=List[Trade])
def trades(vid: str):
    with db() as c:
        voyage(c, vid)
        return [json.loads(r['body']) for r in c.execute('SELECT body FROM trades WHERE voyage=?', (vid,))]

@app.post('/voyages/{vid}/tasks', response_model=Task, status_code=201)
def create_task(vid: str, body: TaskCreate):
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        voyage(c, vid)
        old = c.execute('SELECT body FROM tasks WHERE voyage=? AND request=?', (vid,body.request_id)).fetchone()
        if old:
            value = json.loads(old['body'])
            if any(value[k] != v for k,v in body.model_dump().items()):
                raise HTTPException(409, 'Task idempotency conflict')
            return value
        if body.model_id not in [m.id for m in models()]:
            raise HTTPException(503, 'Model not configured; no paid call made')
        t = Task(**body.model_dump(), id=ident(), voyage_id=vid, status='queued')
        c.execute('INSERT INTO tasks VALUES(?,?,?,?)', (t.id,vid,body.request_id,t.model_dump_json()))
        event(c, t.id, 'queued', {})
        return t

@app.get('/voyages/{vid}/tasks', response_model=List[Task])
def tasks(vid: str):
    with db() as c:
        voyage(c, vid)
        return [json.loads(r['body']) for r in c.execute('SELECT body FROM tasks WHERE voyage=?', (vid,))]

@app.get('/voyages/{vid}/tasks/{tid}', response_model=Task)
def get_task(vid: str, tid: str):
    with db() as c:
        return task_get(c, vid, tid)

@app.post('/voyages/{vid}/tasks/{tid}/cancel', response_model=Task)
def cancel_task(vid: str, tid: str):
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        t = task_get(c, vid, tid)
        if t['status'] in ['queued', 'running']:
            t['cancel_requested'] = True
            if t['status'] == 'queued':
                t['status'] = 'cancelled'
            save_task(c, t)
            event(c, tid, 'cancel_requested', {})
        return t

@app.get('/voyages/{vid}/tasks/{tid}/events', response_model=List[Event])
def events(vid: str, tid: str, after: int = Query(default=0, ge=0)):
    with db() as c:
        task_get(c, vid, tid)
        return [Event(seq=r['seq'], task_id=tid, kind=r['kind'], data=json.loads(r['data'])) for r in c.execute('SELECT * FROM events WHERE task=? AND seq>? ORDER BY seq', (tid,after))]

@app.get('/voyages/{vid}/usage', response_model=List[Usage])
def usage(vid: str):
    with db() as c:
        voyage(c, vid)
        return [json.loads(r['body']) for r in c.execute('SELECT usage.body FROM usage JOIN tasks ON usage.task=tasks.id WHERE tasks.voyage=?', (vid,))]
