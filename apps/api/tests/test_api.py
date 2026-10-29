import asyncio
import json
import pytest
import httpx
from fastapi.testclient import TestClient
from voyage import main as m

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv('VOYAGE_DB', str(tmp_path / 'test.sqlite3'))
    for name in ['VOYAGE_MODEL_URL','VOYAGE_MODEL_NAME','VOYAGE_MODEL_KEY']:
        monkeypatch.delenv(name, raising=False)
    # No lifespan worker in deterministic tests; explicitly execute durable tasks.
    m.init()
    with TestClient(m.app) as c:
        yield c

def new(c):
    r=c.post('/voyages', json={'title':'test'})
    assert r.status_code == 201, r.text
    return '/voyages/'+r.json()['id']

def test_save_restore_and_sources(client):
    p=new(client)
    v=client.get(p).json()
    fields={k:v[k] for k in ['stage','question','shared_task','crew','route','world']}
    fields.update(stage='reflection',question='Why?',shared_task='Compare sources')
    assert client.put(p,json=fields).status_code == 200
    body={'kind':'fragment','text':'claim','classification':'historical_claim','sources':[{'id':'s','title':'source','url':'https://example.org','license':'pending'}]}
    assert client.post(p+'/records',json=body).status_code == 201
    for kind in ['choice','reflection']:
        assert client.post(p+'/records',json={'kind':kind,'text':'decision','classification':'creative'}).status_code == 201
    m.init()
    assert client.get(p).json()['question']=='Why?'
    assert len(client.get(p+'/records').json())==3
    assert client.get(p+'/records').json()[0]['sources']==[dict(body['sources'][0],verification='unverified')]
    assert client.get(p+'/usage').json()==[]
    assert client.get('/health').json()['hmt']=='not_connected'

def test_trade_atomic_idempotent_and_failures(client):
    p=new(client)
    body=dict(request_id='r1',port_id='test-port',good_id='test-cargo',side='buy',quantity=4)
    first=client.post(p+'/trades',json=body)
    assert first.status_code==200
    assert client.post(p+'/trades',json=body).json()==first.json()
    assert client.post(p+'/trades',json=dict(body,quantity=5)).status_code==409
    before=client.get(p).json()
    for side,q in [('buy',21),('sell',5)]:
        assert client.post(p+'/trades',json=dict(body,request_id=side,side=side,quantity=q)).status_code==409
        assert client.get(p).json()==before
    assert client.post(p+'/trades',json=dict(body,request_id='sell-ok',side='sell',quantity=2)).json()['delta_balance']==6
    assert len(client.get(p+'/trades').json())==2
    assert client.get(p+'/ports').json()[0]['goods']['test-cargo']['stock']==48
    # Independently force each boundary to verify rollback.
    with m.db() as db:
        v=m.voyage(db,p.split('/')[-1]); v['balance']=0; m.save_voyage(db,v)
    assert client.post(p+'/trades',json=dict(body,request_id='poor',quantity=1)).status_code==409
    with m.db() as db:
        v=m.voyage(db,p.split('/')[-1]); v['balance']=100; m.save_voyage(db,v)
        market=json.loads(db.execute('SELECT body FROM markets').fetchone()['body'])
        market['goods']['test-cargo']['stock']=0
        db.execute('UPDATE markets SET body=?',(json.dumps(market),))
    assert client.post(p+'/trades',json=dict(body,request_id='empty',quantity=1)).status_code==409

def test_candidates_require_explicit_confirmation(client):
    assert len(client.get('/scenes').json())==4
    b={'title':'candidate','scene_id':'A','scene_track':'confirmed'}
    assert client.post('/voyages',json=b).status_code==422
    assert client.post('/scenes/A/1/confirm',json={'reviewer':'test reviewer','decision_note':'test only'}).status_code==200
    assert client.post('/voyages',json=b).status_code==201
    assert len(client.get('/scenes').json())==5
    assert client.post('/scenes/A/1/confirm',json={'reviewer':'again','decision_note':'no'}).status_code==409

def test_unconfigured_model(client):
    p=new(client)
    assert client.get('/models').json()==[]
    assert client.post(p+'/tasks',json={'request_id':'t','model_id':'configured','prompt':'hi'}).status_code==503
    assert client.get(p+'/tasks').json()==[]

def test_durable_tasks_events_failure_and_restart(client, monkeypatch):
    p=new(client)
    for name,value in [('VOYAGE_MODEL_URL','https://example.invalid'),('VOYAGE_MODEL_NAME','test-model'),('VOYAGE_MODEL_KEY','secret-test')]:
        monkeypatch.setenv(name,value)
    async def post(self,*args,**kwargs):
        raise httpx.ConnectError('secret-test must not leak')
    monkeypatch.setattr(httpx.AsyncClient,'post',post)
    body={'request_id':'t','model_id':'configured','prompt':'hi'}
    task=client.post(p+'/tasks',json=body).json()
    tp=p+'/tasks/'+task['id']
    assert client.post(p+'/tasks',json=body).json()['id']==task['id']
    asyncio.run(m.execute(task['id']))
    assert client.get(tp).json()['status']=='failed'
    events=client.get(tp+'/events').json()
    assert [e['kind'] for e in events]==['queued','started','failed']
    assert 'secret-test' not in json.dumps(events)
    assert client.get(tp+'/events',params={'after':events[-1]['seq']}).json()==[]
    t=client.post(p+'/tasks',json=dict(body,request_id='t2')).json()
    assert client.post(p+'/tasks/'+t['id']+'/cancel').json()['status']=='cancelled'
    asyncio.run(m.execute(t['id']))
    with m.db() as db:
        task['status']='running'; m.save_task(db,task)
    m.init()
    assert client.get(tp).json()['status']=='failed'
    assert client.get(tp+'/events').json()[-1]['data']['code']=='worker_interrupted'

def test_success_records_usage_separate_from_economy(client, monkeypatch):
    p=new(client)
    for name,value in [('VOYAGE_MODEL_URL','https://example.invalid'),('VOYAGE_MODEL_NAME','test-model'),('VOYAGE_MODEL_KEY','secret-test')]:
        monkeypatch.setenv(name,value)
    async def post(self,*args,**kwargs):
        return httpx.Response(200,json={'choices':[{'message':{'content':'creative result'}}],'usage':{'total_tokens':7}},request=httpx.Request('POST',args[0]))
    monkeypatch.setattr(httpx.AsyncClient,'post',post)
    task=client.post(p+'/tasks',json={'request_id':'ok','model_id':'configured','prompt':'hi'}).json()
    asyncio.run(m.execute(task['id']))
    assert client.get(p+'/tasks/'+task['id']).json()['status']=='succeeded'
    assert client.get(p+'/usage').json()[0]['usage']=={'total_tokens':7}
    assert client.get(p).json()['balance']==100
    assert client.get(p+'/records').json()[0]['classification']=='creative'

def test_concurrent_duplicate_trade(client):
    from concurrent.futures import ThreadPoolExecutor
    p=new(client)
    body=dict(request_id='same',port_id='test-port',good_id='test-cargo',side='buy',quantity=10)
    with ThreadPoolExecutor(max_workers=4) as pool:
        replies=list(pool.map(lambda _:client.post(p+'/trades',json=body),range(4)))
    assert all(r.status_code==200 for r in replies)
    assert len({r.json()['id'] for r in replies})==1
    assert client.get(p).json()['balance']==50
    assert client.get(p).json()['inventory']['test-cargo']==10

def test_background_completion_and_reconnect(client, monkeypatch):
    import time
    monkeypatch.setenv('VOYAGE_MODELS',json.dumps([{'id':'crew-a','url':'https://example.invalid','model':'test-a','key_env':'VOYAGE_SECRET_A'},{'id':'crew-b','url':'https://example.invalid','model':'test-b','key_env':'VOYAGE_SECRET_B'}]))
    monkeypatch.setenv('VOYAGE_SECRET_A','explicit-a')
    monkeypatch.setenv('VOYAGE_SECRET_B','explicit-b')
    calls=[]
    async def post(self,*args,**kwargs):
        calls.append(kwargs['json']['model'])
        await asyncio.sleep(.05)
        return httpx.Response(200,json={'choices':[{'message':{'content':'done'}}]},request=httpx.Request('POST',args[0]))
    monkeypatch.setattr(httpx.AsyncClient,'post',post)
    p=new(client)
    body={'request_id':'reconnect','model_id':'crew-b','prompt':'hello'}
    t=client.post(p+'/tasks',json=body).json()
    # Submission response ended; lifespan worker continues independently.
    deadline=time.monotonic()+3
    while time.monotonic()<deadline:
        state=client.get(p+'/tasks/'+t['id']).json()
        if state['status']=='succeeded':
            break
        time.sleep(.02)
    assert state['status']=='succeeded'
    assert client.post(p+'/tasks',json=body).json()['id']==t['id']
    assert calls==['test-b']
    assert client.get(p+'/tasks/'+t['id']+'/events').json()[-1]['kind']=='succeeded'
