import httpx
import pytest
from fastapi.testclient import TestClient
from voyage import presentation as gateway

SECRET='sk-presentation-test-only-never-a-real-key'

@pytest.fixture
def client():
    gateway.receipts.clear()
    with TestClient(gateway.app) as client:
        yield client

def body(**updates):
    return dict(provider='openai',api_key=SECRET,model='gpt-5.4-mini',prompt='技术与文明有什么关系？',request_id='presentation-request-001',**updates)

def transport(monkeypatch,payload):
    calls=[]
    class Client:
        def __init__(self,*args,**kwargs):pass
        async def __aenter__(self):return self
        async def __aexit__(self,*args):pass
        async def post(self,url,**kwargs):
            calls.append((url,kwargs))
            return httpx.Response(200,json=payload,request=httpx.Request('POST',url))
    monkeypatch.setattr(gateway.httpx,'AsyncClient',Client)
    return calls

def test_openai_shape_usage_and_idempotency(client,monkeypatch):
    calls=transport(monkeypatch,{'output':[{'type':'reasoning','summary':[]},{'type':'message','content':[{'type':'output_text','text':'需要区分能力与共同生活。'}]}],'usage':{'input_tokens':31,'output_tokens':18}})
    first=client.post('/chat',json=body())
    assert first.status_code==200
    assert first.json()['usage']=={'input_tokens':31,'output_tokens':18}
    assert SECRET not in first.text
    assert client.post('/chat',json=body()).json()==first.json()
    assert len(calls)==1
    assert calls[0][0]=='https://api.openai.com/v1/responses'
    assert calls[0][1]['json']['store'] is False
    assert calls[0][1]['json']['max_output_tokens']==1200
    assert SECRET not in calls[0][1]['json']['input']
    changed=body();changed['prompt']='另一个问题'
    assert client.post('/chat',json=changed).status_code==409
    assert len(calls)==1

def test_claude_response_and_fixed_destination(client,monkeypatch):
    calls=transport(monkeypatch,{'content':[{'type':'text','text':'先查来源，再看谁承担代价。'}],'usage':{'input_tokens':25,'output_tokens':16}})
    request=body();request.update(provider='anthropic',model='claude-sonnet-5-5')
    result=client.post('/chat',json=request)
    assert result.status_code==200
    assert result.json()['text']=='先查来源，再看谁承担代价。'
    assert calls[0][0]=='https://api.anthropic.com/v1/messages'
    assert calls[0][1]['headers']['anthropic-version']=='2026-10-21'
    assert calls[0][1]['json']['max_tokens']==800

def test_rejection_never_echoes_key_or_accepts_custom_proxy(client):
    invalid=body();invalid['model']='invalid/model';invalid['proxy']='https://example.com'
    result=client.post('/chat',json=invalid)
    assert result.status_code==400 and SECRET not in result.text
    denied=client.post('/chat',json=body(),headers={'Origin':'https://example.com'})
    assert denied.status_code==403 and SECRET not in denied.text
    oversized=body();oversized['prompt']='水'*20000
    assert client.post('/chat',json=oversized).status_code==413

def test_timeout_does_not_replay_uncertain_paid_request(client,monkeypatch):
    calls=[]
    async def timeout(value):calls.append(value.request_id);raise httpx.ReadTimeout('provider data including '+SECRET)
    monkeypatch.setattr(gateway,'call_provider',timeout)
    first=client.post('/chat',json=body())
    assert first.status_code==504 and SECRET not in first.text
    assert client.post('/chat',json=body()).status_code==409
    assert len(calls)==1

def test_provider_errors_are_redacted(client,monkeypatch):
    async def failure(value):raise httpx.HTTPError('private provider message '+SECRET)
    monkeypatch.setattr(gateway,'call_provider',failure)
    result=client.post('/chat',json=body())
    assert result.status_code==502 and SECRET not in result.text
    assert client.get('/health').json()['credentials']=='per-request-only'
