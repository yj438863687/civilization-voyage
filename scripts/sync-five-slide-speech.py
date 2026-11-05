"""Update notes and speaking copies in the presenter's existing five-slide deck."""
import json,shutil
from datetime import datetime
from pathlib import Path
from pptx import Presentation
ROOT=Path(__file__).resolve().parents[1]
rows=json.loads((ROOT/'docs/personal-closing-five.json').read_text())
OUT=Path.home()/'Desktop/文明航程-个人结尾-5页'
backup=ROOT/'.impeccable/speech-backups'/datetime.now().strftime('%Y%m%d-%H%M%S')
backup.mkdir(parents=True,exist_ok=True)
for lang in ['en','zh']:
 tag=lang.upper();path=OUT/f'Civilization-Voyage-My-Part-{tag}.pptx'
 shutil.copy2(path,backup/path.name)
 deck=Presentation(path)
 assert len(deck.slides)==len(rows)==5
 for i,(slide,row) in enumerate(zip(deck.slides,rows)):
  old=slide.notes_slide.notes_text_frame.text
  extra=''
  if i==1:
   extra='\n\nReference sources:\nhttps://www.ubisoft.com/en-ca/game/assassins-creed/discovery-tour\nhttps://education.minecraft.net/en-us/discover/what-is-minecraft'
  if i==2 and '\nwatt:' in old:
   extra='\n\nImage credits:\n'+old.split('\nwatt:',1)[1]
   extra=extra.replace('Image credits:\n','Image credits:\nwatt:',1)
  slide.notes_slide.notes_text_frame.text=row[lang+'_script']+extra
 deck.save(path)
 timing=' / '.join(f"{r['seconds']//60}:{r['seconds']%60:02d}" for r in rows)
 header=f"Civilization Voyage | About 8 minutes | {timing}\n\n"
 text=header+'\n\n'.join(f"SLIDE {i+1} — {r[lang]}\n\n{r[lang+'_script']}" for i,r in enumerate(rows))
 (OUT/f'Speech-{tag}.txt').write_text(text,encoding='utf-8')
rehearsal='排练版｜中文提示不朗读。对应当前5页PPT，含停顿约8分钟。\n\n'+'\n\n'.join(f"第{i+1}页｜{r['seconds']//60}:{r['seconds']%60:02d}\n"+'\n\n'.join('【'+part['cue_zh']+'】\n'+part['en'] for part in r['rehearsal']) for i,r in enumerate(rows))
(OUT/'Speech-Rehearsal-看图提示.txt').write_text(rehearsal,encoding='utf-8')
print(OUT)
print('Updated five-slide notes and speaking copies; preserved slide designs.')
