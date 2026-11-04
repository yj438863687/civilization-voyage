#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Post-produce real browser recordings: calibrated game sound, narration, captions and chapter graphics."""
import concurrent.futures,json,math,re,subprocess,wave
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'.impeccable/demo-v3';RAW=WORK/'raw-sync';VOICE=WORK/'voice';EDIT=WORK/'edit';EDIT.mkdir(exist_ok=True)
OUT=Path.home()/'Desktop/文明航程演讲包/资源后果与实录Demo-深海信号版/Video';OUT.mkdir(parents=True,exist_ok=True)
FFMPEG='/Users/jacky/.local/bin/ffmpeg'
SCRIPTS=json.loads((ROOT/'docs/demo-v3-narration.json').read_text())
MANIFEST={row['id']:row for row in json.loads((RAW/'manifest.json').read_text())}
assert all(row['id'] in MANIFEST for row in SCRIPTS),'Every chapter must have actual footage'

def run(args,**kw):return subprocess.run([FFMPEG,'-hide_banner','-loglevel','error',*map(str,args)],check=True,**kw)
def pcm(path,filters=None,rate=24000):
 args=['-i',path]
 if filters:args+=['-af',filters]
 args+=['-ar',str(rate),'-ac','1','-f','f32le','-']
 return np.frombuffer(run(args,capture_output=True).stdout,dtype='<f4')
def synchronize(row):
 video=RAW/row['video'];audio=RAW/row['audio']
 pixels=run(['-i',video,'-vf','crop=24:24:44:44','-pix_fmt','rgb24','-f','rawvideo','-'],capture_output=True).stdout
 frames=np.frombuffer(pixels,dtype=np.uint8).reshape((-1,24,24,3));mean=frames.mean(axis=(1,2));flash=np.flatnonzero((mean[:,0]>180)&(mean[:,2]>180)&(mean[:,1]<85));assert len(flash)>1,row['id']+' missing visual sync'
 video_sync=float(flash[0])/25
 samples=pcm(audio,'bandpass=f=5000:w=180');window=240;usable=samples[:len(samples)//window*window].reshape((-1,window));energy=np.sqrt((usable*usable).mean(axis=1));beeps=np.flatnonzero(energy>.035);assert len(beeps)>5,row['id']+' missing audio sync'
 audio_sync=float(beeps[0])*.01
 after=row['sync']['actionAfterMarker'];vtrim=video_sync+after;atrim=audio_sync+after-row['sync']['beepDelay'];duration=row['trimEnd']-row['trimStart']
 # The calibration pulse is outside the final edit. Confirm actual game audio exists after it.
 game=pcm(audio,f'atrim=start={atrim}:duration=2');rms=float(np.sqrt(np.mean(game*game)));assert rms>.00001,row['id']+' game audio is silent'
 result=dict(video_trim=vtrim,audio_trim=atrim,source_duration=duration,video_sync=video_sync,audio_sync=audio_sync,game_rms=rms)
 print('Calibrated:',row['id'],round(vtrim,2),round(atrim,2),'game RMS',round(rms,5),flush=True);return result

def wav_duration(path):
 target=path.with_suffix('.wav')
 if not target.exists():run(['-y','-i',path,'-ar','48000','-ac','1',target])
 with wave.open(str(target),'rb') as f:return f.getnframes()/f.getframerate()

def title_frame(row,lang,index):
 image=Image.new('RGB',(1920,1080),'#071b29');draw=ImageDraw.Draw(image)
 for i in range(6):
  r=180+i*100;draw.ellipse((1640-r,940-r*.5,1640+r,940+r*.5),outline='#124b51',width=2)
 fontfile='/System/Library/Fonts/Avenir Next.ttc' if lang=='en' else '/System/Library/Fonts/Hiragino Sans GB.ttc'
 small=ImageFont.truetype('/System/Library/Fonts/Avenir Next.ttc',24,index=5);title=ImageFont.truetype(fontfile,34,index=0)
 draw.text((80,28),'CIVILIZATION VOYAGE',font=small,fill='#35c5a5')
 draw.text((580,24),row['title_'+lang],font=title,fill='#edf6f5')
 draw.text((1730,28),f'{index+1:02d} / 08',font=small,fill='#9ebbc1')
 draw.rectangle((190,90,1730,958),outline='#2a7777',width=2)
 footer='ACTUAL GAME · PREPARED SAVES · EDITED · SYNTHETIC NARRATION' if lang=='en' else '实际游戏 · 预置存档 · 剪辑展示 · 合成旁白'
 draw.text((80,1053),footer,font=ImageFont.truetype(fontfile,18,index=0),fill='#9ebbc1')
 path=EDIT/f"{row['id']}-{lang}-frame.png";image.save(path);return path

def subtitle_groups(words,lang):
 result=[];current=[];start=0
 for word in words:
  if not current:start=word['start']
  value=(' ' if lang=='en' else '').join([x['text'] for x in current]+[word['text']])
  if current and (len(value)>(78 if lang=='en' else 34) or word['start']-start>3.6):
   result.append((current[0]['start'],current[-1]['start']+current[-1]['duration']+.15,(' ' if lang=='en' else '').join(x['text'] for x in current)));current=[];start=word['start']
  current.append(word)
 if current:result.append((current[0]['start'],current[-1]['start']+current[-1]['duration']+.2,(' ' if lang=='en' else '').join(x['text'] for x in current)))
 return result

def stamp(seconds,ass=False):
 hour=int(seconds//3600);minute=int(seconds//60)%60;second=seconds%60
 return f'{hour}:{minute:02d}:{second:05.2f}' if ass else f'{hour:02d}:{minute:02d}:{int(second):02d},{int((second%1)*1000):03d}'

def write_ass(row,lang):
 font='Arial' if lang=='en' else 'Arial Unicode MS'
 header=f'''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,{font},34,&H00F5F6ED,&H00F5F6ED,&H001B1207,&H901B1207,0,0,0,0,100,100,0,0,1,1.5,0,2,96,96,37,1
[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
'''
 words=json.loads((VOICE/f"{row['id']}-{lang}.json").read_text());groups=subtitle_groups(words,lang)
 lines=[]
 for start,end,value in groups:
  value=value.replace('\\','\\\\').replace('{','\\{').replace('}','\\}')
  lines.append(f'Dialogue: 0,{stamp(start+.65,True)},{stamp(end+.65,True)},Default,,0,0,0,,{value}')
 path=EDIT/f"{row['id']}-{lang}.ass";path.write_text(header+'\n'.join(lines)+'\n');return path,groups

sync_path=EDIT/'calibration.json'
if sync_path.exists():SYNC=json.loads(sync_path.read_text())
else:SYNC={}
for row in SCRIPTS:
 if row['id'] not in SYNC:SYNC[row['id']]=synchronize(MANIFEST[row['id']]);sync_path.write_text(json.dumps(SYNC,indent=2))
DURATIONS={}
for row in SCRIPTS:
 voice=max(wav_duration(VOICE/f"{row['id']}-{lang}.mp3") for lang in ['en','zh'])
 DURATIONS[row['id']]=math.ceil(max(voice+1.5,SYNC[row['id']]['source_duration']+.3)*30)/30

def render(row,lang,index):
 target=EDIT/f"{index:02d}-{row['id']}-{lang}.mp4"
 if target.exists() and target.stat().st_size>10000:return target
 info=SYNC[row['id']];source=MANIFEST[row['id']];d=DURATIONS[row['id']];raw=info['source_duration'];frame=title_frame(row,lang,index);ass,_=write_ass(row,lang)
 # Pause the final source frame where narration needs more time; do not fabricate another game action.
 graph=(f'[0:v]trim=start={info["video_trim"]}:duration={raw},setpts=PTS-STARTPTS,scale=1536:864,setsar=1,fps=30,tpad=stop_mode=clone:stop_duration={d},trim=duration={d}[game];'
 f'[3:v]fps=30,trim=duration={d},setpts=PTS-STARTPTS[frame];[frame][game]overlay=192:92,ass={ass}:fontsdir=/System/Library/Fonts/Supplemental,fade=t=in:d=0.22,fade=t=out:st={d-.22}:d=0.22[v];'
 f'[1:a]atrim=start={info["audio_trim"]}:duration={raw},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,volume=.32,afade=t=in:d=0.15,afade=t=out:st={max(0,raw-.6)}:d=0.6,apad=whole_dur={d},atrim=duration={d}[gameaudio];'
 f'[2:a]aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-17:TP=-1.5:LRA=7,aresample=48000,adelay=650|650,apad=whole_dur={d},atrim=duration={d}[speech];'
 f'[gameaudio][speech]amix=inputs=2:normalize=0,alimiter=limit=.95,atrim=duration={d}[a]')
 log=EDIT/f"{row['id']}-{lang}.log"
 with log.open('w') as stream:
  subprocess.run([FFMPEG,'-y','-hide_banner','-threads','4','-i',str(RAW/source['video']),'-i',str(RAW/source['audio']),'-i',str(VOICE/f"{row['id']}-{lang}.mp3"),'-loop','1','-i',str(frame),'-filter_complex_threads','2','-filter_complex',graph,'-map','[v]','-map','[a]','-t',str(d),'-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',str(target)],stdout=stream,stderr=stream,check=True)
 assert target.stat().st_size>10000
 print('Edited:',row['id'],lang,'duration',round(d,1),flush=True);return target

jobs=[(row,lang,index) for index,row in enumerate(SCRIPTS) for lang in ['en','zh']]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(lambda args:render(*args),jobs))
for lang in ['en','zh']:
 inputs=EDIT/f'concat-{lang}.txt';inputs.write_text('\n'.join("file '"+str(EDIT/f"{index:02d}-{row['id']}-{lang}.mp4")+"'" for index,row in enumerate(SCRIPTS))+'\n')
 target=OUT/f'Civilization-Voyage-Demo-{lang.upper()}.mp4';run(['-y','-f','concat','-safe','0','-i',inputs,'-c','copy','-movflags','+faststart',target])
 subtitles=[];cursor=0;counter=1;chapters=[]
 for row in SCRIPTS:
  words=json.loads((VOICE/f"{row['id']}-{lang}.json").read_text())
  for start,end,text in subtitle_groups(words,lang):subtitles.append(f'{counter}\n{stamp(cursor+.65+start)} --> {stamp(cursor+.65+end)}\n{text}\n');counter+=1
  chapters.append({'id':row['id'],'start':cursor,'duration':DURATIONS[row['id']],'title':row['title_'+lang]});cursor+=DURATIONS[row['id']]
 (OUT/f'Subtitles_{lang.upper()}.srt').write_text('\n'.join(subtitles))
 (OUT/f'Chapters_{lang.upper()}.json').write_text(json.dumps(chapters,ensure_ascii=False,indent=2))
 print('Final movie:',target,'seconds:',round(cursor,2),flush=True)
run(['-y','-ss','1','-i',OUT/'Civilization-Voyage-Demo-EN.mp4','-frames:v','1',WORK/'video-poster.png'])
(OUT/'production-metadata.json').write_text(json.dumps({'recording':'Actual browser gameplay with isolated prepared saves and scripted keyboard input','narration':'Synthetic: Microsoft Edge TTS, Aria (English), Xiaoxiao (Chinese)','postproduction':'Per-shot visual flash/audio pulse calibration; pulse removed; game audio, narration, hard subtitles, chapter graphics, fades and deliberate held frames','resolution':'1920x1080','codec':'H.264 + AAC','calibration':SYNC,'durations':DURATIONS},ensure_ascii=False,indent=2))
