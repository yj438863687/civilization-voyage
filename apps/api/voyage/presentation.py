"""Optional loopback-only, stateless model gateway for the presentation demo.

Keys arrive with an explicit user action, are forwarded to the chosen official
provider, and are never persisted. This service has no access to the game DB.
"""
import hashlib
import json
import time
from collections import OrderedDict
from typing import Literal

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, SecretStr, ValidationError

app = FastAPI(title='Civilization Voyage presentation model gateway')
app.add_middleware(CORSMiddleware, allow_origin_regex=r'https?://(127\.0\.0\.1|localhost)(:\d+)?', allow_methods=['GET','POST'], allow_headers=['Content-Type'])
PROVIDERS = {'openai':'https://api.openai.com/v1/responses','anthropic':'https://api.anthropic.com/v1/messages'}
receipts = OrderedDict()

class ChatInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    provider: Literal['openai','anthropic']
    api_key: SecretStr
    model: str = Field(min_length=1,max_length=120,pattern=r'^[a-zA-Z0-9_.:-]+$')
    prompt: str = Field(min_length=1,max_length=12000)
    instructions: str = Field(default='用中文简洁回答。区分材料依据、解释和不确定性，不编造来源。',max_length=2000)
    request_id: str = Field(min_length=8,max_length=100,pattern=r'^[a-zA-Z0-9_-]+$')

@app.get('/health')
def health():
    return {'service':'presentation-gateway','version':1,'providers':list(PROVIDERS),'credentials':'per-request-only','external_calls':'only-on-user-action'}

async def call_provider(body: ChatInput):
    key=body.api_key.get_secret_value()
    if body.provider=='openai':
        headers={'Authorization':'Bearer '+key}
        payload={'model':body.model,'input':body.prompt,'instructions':body.instructions,'max_output_tokens':1200,'store':False}
        if body.model.startswith(('gpt-5','gpt-6','o3','o4')):payload['reasoning']={'effort':'low'}
    else:
        headers={'Authorization':'Bearer '+key,'anthropic-version':'2026-10-21'}
        payload={'model':body.model,'max_tokens':800,'system':body.instructions,'messages':[{'role':'user','content':body.prompt}]}
    async with httpx.AsyncClient(timeout=60,follow_redirects=False) as client:
        response=await client.post(PROVIDERS[body.provider],headers=headers,json=payload)
        response.raise_for_status()
        result=response.json()
    if body.provider=='openai':
        text='\n'.join(part['text'] for item in result.get('output',[]) if item.get('type')=='message' for part in item.get('content',[]) if part.get('type')=='output_text' and isinstance(part.get('text'),str))
    else:text='\n'.join(item['text'] for item in result.get('content',[]) if item.get('type')=='text' and isinstance(item.get('text'),str))
    usage=result.get('usage',{})
    if not text.strip() or not isinstance(usage,dict):raise ValueError('No displayable model output')
    return {'provider':body.provider,'model':body.model,'text':text[:12000],'usage':{name:max(0,int(usage.get(name,0))) for name in ['input_tokens','output_tokens']},'request_id':body.request_id}

@app.post('/chat')
async def chat(request: Request):
    if request.client and request.client.host not in {'127.0.0.1','::1','localhost','testclient'}:raise HTTPException(403,'仅供本机演示使用。')
    origin=request.headers.get('origin','')
    if origin:
        from urllib.parse import urlsplit
        parsed=urlsplit(origin)
        if parsed.scheme not in {'http','https'} or parsed.hostname not in {'127.0.0.1','localhost'}:raise HTTPException(403,'仅接受本机游戏页面。')
    raw=await request.body()
    if len(raw)>32000:raise HTTPException(413,'演示请求过长，请缩短问题或材料。')
    try:body=ChatInput.model_validate(json.loads(raw))
    except (ValueError,ValidationError,TypeError):raise HTTPException(400,'请求格式不正确，请检查模型、问题与密钥字段。') from None
    key=body.api_key.get_secret_value()
    if len(key.strip())<8:raise HTTPException(400,'请在App内填写有效的API Key。')
    now=time.monotonic()
    for cached in list(receipts):
        if now-receipts[cached]['time']>900:del receipts[cached]
    if len(receipts)>=128:
        completed=next((item for item,value in receipts.items() if value['state']!='running'),None)
        if completed is None:raise HTTPException(429,'请求较多，请稍后再试。')
        del receipts[completed]
    identity=hashlib.sha256((key+'\0'+body.request_id).encode()).hexdigest()
    signature=hashlib.sha256(json.dumps({'provider':body.provider,'model':body.model,'prompt':body.prompt,'instructions':body.instructions},sort_keys=True).encode()).hexdigest()
    if identity in receipts:
        prior=receipts[identity]
        if signature!=prior['signature']:raise HTTPException(409,'这个请求编号已用于其他内容，请发起新请求。')
        if prior['state']=='done':return prior['response']
        raise HTTPException(409,'这次请求正在执行或上游结果尚不确定；请先检查记录，不自动重复付费调用。')
    if sum(value['state']=='running' for value in receipts.values())>=2:raise HTTPException(429,'已有两次模型请求，请等它们结束。')
    receipt={'time':now,'signature':signature,'state':'running'};receipts[identity]=receipt
    try:result=await call_provider(body)
    except httpx.TimeoutException:
        receipt['state']='unknown'
        raise HTTPException(504,'请求超时，上游是否已计费尚不确定；请先检查服务商记录，不自动重试。') from None
    except (httpx.HTTPError,ValueError,KeyError,TypeError):
        receipt['state']='failed'
        raise HTTPException(502,'模型未返回可用结果。请检查密钥、型号、账户权限或网络；未切换成演示台词。') from None
    receipt.update(state='done',response=result)
    return result
