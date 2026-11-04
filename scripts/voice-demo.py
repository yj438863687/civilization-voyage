#!/usr/bin/env python3
"""Generate clearly labelled synthetic narration; never access an API key."""
import asyncio,json
from pathlib import Path
import edge_tts
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.impeccable/demo-v3/voice';OUT.mkdir(parents=True,exist_ok=True)
SCRIPTS=json.loads((ROOT/'docs/demo-v3-narration.json').read_text())
async def main():
 semaphore=asyncio.Semaphore(2)
 async def make(row,lang):
  async with semaphore:
   audio=OUT/f"{row['id']}-{lang}.mp3";timing=audio.with_suffix('.json')
   if audio.exists() and timing.exists():return
   words=[]
   voice='en-US-AriaNeural' if lang=='en' else 'zh-CN-XiaoxiaoNeural'
   request=edge_tts.Communicate(row[lang],voice,rate='-3%' if lang=='en' else '+0%',boundary='WordBoundary')
   with audio.open('wb') as target:
    async for chunk in request.stream():
     if chunk['type']=='audio':target.write(chunk['data'])
     elif chunk['type']=='WordBoundary':words.append({'start':chunk['offset']/1e7,'duration':chunk['duration']/1e7,'text':chunk['text']})
   if not words or audio.stat().st_size<2000:raise RuntimeError('Narration generation failed: '+row['id'])
   timing.write_text(json.dumps(words,ensure_ascii=False,indent=2))
   print('Narration ready:',row['id'],lang,flush=True)
 await asyncio.gather(*(make(row,lang) for row in SCRIPTS for lang in ['en','zh']))
asyncio.run(main())
