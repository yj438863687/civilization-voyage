export type DemoProvider='openai'|'anthropic';
export interface DemoModelResponse {provider:DemoProvider;model:string;text:string;usage:{input_tokens:number;output_tokens:number};request_id:string;}
export const PRESENTATION_GATEWAY='http://127.0.0.1:8016';
export async function requestDemoModel(body:{provider:DemoProvider;api_key:string;model:string;prompt:string;instructions:string;request_id:string},signal:AbortSignal):Promise<DemoModelResponse>{
  const response=await fetch(PRESENTATION_GATEWAY+'/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});
  const value=await response.json();
  if(!response.ok)throw new Error(typeof value.detail==='string'?value.detail:'模型请求失败，未替换成预设台词。');
  return value as DemoModelResponse;
}
