#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build editable bilingual pitch decks plus PDF/PNG previews from one layout model."""
import argparse,io,json,math,re,shutil
from functools import lru_cache
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from pptx import Presentation
from pptx.util import Inches,Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
import fitz
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--preview',action='store_true');parser.add_argument('--content',type=Path);parser.add_argument('--output',type=Path);parser.add_argument('--final-talk',action='store_true');ARGS=parser.parse_args()
OUT=ARGS.output or Path.home()/'Desktop/文明航程演讲包/资源后果与实录Demo-深海信号版'
RAW=ROOT/'.impeccable/demo-v3/raw-sync'
W,H=1920,1080
INK='071B29';DEEP='0B3046';JADE='35C5A5';FOAM='EDF6F5';MUTED='A4BDC3';PAPER='F1F6F5';DARK='152D39'
DATA=json.loads((ARGS.content or ROOT/'docs/pitch-v3-content.json').read_text())
FONTS={'en':('/System/Library/Fonts/Avenir Next.ttc',7,0),'zh':('/System/Library/Fonts/Hiragino Sans GB.ttc',0,1)}

def rgb(value):return '#'+value

@lru_cache(maxsize=128)
def font(lang,size,bold=False):
 path,regular,heavy=FONTS[lang]
 try:return ImageFont.truetype(path,int(size),index=heavy if bold else regular)
 except OSError:return ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Unicode.ttf',int(size))

def wrap(value,lang,size,width,bold=False):
 f=font(lang,size,bold);result=[]
 for paragraph in value.split('\n'):
  words=paragraph.split(' ') if lang=='en' else list(paragraph)
  line=''
  for word in words:
   separator=' ' if lang=='en' and line else ''
   candidate=line+separator+word
   if line and f.getlength(candidate)>width:result.append(line);line=word
   else:line=candidate
  result.append(line)
 return result

class Slide:
 def __init__(self,deck,lang,index,role,light=False):
  self.deck=deck;self.lang=lang;self.index=index;self.role=role;self.light=light
  self.fore=DARK if light else FOAM;self.muted='526A72' if light else MUTED;self.accent='008D72' if light else JADE
  self.slide=deck.slides.add_slide(deck.slide_layouts[6]);self.slide.background.fill.solid();self.slide.background.fill.fore_color.rgb=RGBColor.from_string(PAPER if light else INK)
  self.image=Image.new('RGB',(W,H),rgb(PAPER if light else INK));self.draw=ImageDraw.Draw(self.image)
  self.artwork();self.text('CIVILIZATION VOYAGE',96,42,900,44,25,self.accent,bold=True)
  self.text(f'{index+1:02d} / {len(DATA):02d}'+('' if ARGS.final_talk else '   ·   '+('SPEAKER ' if lang=='en' else '主讲 ')+role),1370,42,460,44,22,self.muted)
  self.line(96,1004,1824,1004,self.muted,1)
  self.text(('CIVILIZATION VOYAGE' if ARGS.final_talk else 'PLAYABLE PROTOTYPE  /  PROPOSED CLASSROOM PILOT') if lang=='en' else '可玩原型  /  拟议课堂试点',96,1033,1500,35,21,self.muted)
 def artwork(self):
  # Native shapes reflect the public site's tide rings without copying its logo or assets.
  color='D3E5E0' if self.light else '103946'
  for i in range(5):
   size=320+i*115;x=1880-size/2;y=1080-size/2
   self.draw.ellipse((x,y,x+size,y+size),outline=rgb(color),width=2)
   shape=self.slide.shapes.add_shape(MSO_SHAPE.OVAL,Inches(x/144),Inches(y/144),Inches(size/144),Inches(size/144));shape.fill.background();shape.line.color.rgb=RGBColor.from_string(color);shape.line.width=Pt(.6)
 def line(self,x1,y1,x2,y2,color,width=2):
  self.draw.line((x1,y1,x2,y2),fill=rgb(color),width=width)
  shape=self.slide.shapes.add_shape(MSO_SHAPE.RECTANGLE,Inches(x1/144),Inches(y1/144),Inches(max(x2-x1,1)/144),Inches(max(y2-y1,width)/144));shape.fill.solid();shape.fill.fore_color.rgb=RGBColor.from_string(color);shape.line.fill.background()
 def rect(self,x,y,w,h,color):
  self.draw.rectangle((x,y,x+w,y+h),fill=rgb(color))
  shape=self.slide.shapes.add_shape(MSO_SHAPE.RECTANGLE,Inches(x/144),Inches(y/144),Inches(w/144),Inches(h/144));shape.fill.solid();shape.fill.fore_color.rgb=RGBColor.from_string(color);shape.line.fill.background()
 def text(self,value,x,y,w,h,size=44,color=None,bold=False,minsize=30):
  color=color or self.fore;rows=wrap(str(value),self.lang,size,w,bold)
  while (len(rows)*size*1.23>h or any(font(self.lang,size,bold).getlength(line)>w for line in rows)) and size>minsize:
   size-=1;rows=wrap(str(value),self.lang,size,w,bold)
  assert len(rows)*size*1.23<=h+2,(self.index+1,value,len(rows),size,h)
  for i,row in enumerate(rows):self.draw.text((x,y+i*size*1.23),row,font=font(self.lang,size,bold),fill=rgb(color),anchor='lt')
  shape=self.slide.shapes.add_textbox(Inches(x/144),Inches(y/144),Inches(w/144),Inches(h/144));frame=shape.text_frame;frame.margin_left=frame.margin_right=frame.margin_top=frame.margin_bottom=0;frame.word_wrap=False
  for i,row in enumerate(rows):
   p=frame.paragraphs[0] if i==0 else frame.add_paragraph();p.text=row;p.font.name='Avenir Next' if self.lang=='en' else 'Hiragino Sans GB';p.font.size=Pt(size/2);p.font.bold=bold;p.font.color.rgb=RGBColor.from_string(color);p.line_spacing=Pt(size*1.23/2);p.space_before=p.space_after=Pt(0)
  return len(rows)*size*1.23
 def picture(self,path,x,y,w,h):
  if not path or not path.exists():return
  image=Image.open(path).convert('RGB');image.thumbnail((int(w),int(h)),Image.Resampling.LANCZOS);ox=x+(w-image.width)/2;oy=y+(h-image.height)/2
  self.image.paste(image,(int(ox),int(oy)))
  self.slide.shapes.add_picture(str(path),Inches(ox/144),Inches(oy/144),width=Inches(image.width/144),height=Inches(image.height/144))
 def points(self,values,x,y,w,h,size=43):
  per=(h-26*(len(values)-1))/len(values)
  for index,value in enumerate(values):
   self.line(x,y+index*(per+26)+20,x+32,y+index*(per+26)+20,self.accent,3) if ARGS.final_talk else self.text(f'{index+1:02d}',x,y+index*(per+26),55,45,24,self.accent,bold=True,minsize=20)
   self.text(value,x+78,y+index*(per+26),w-78,per,size,self.fore,minsize=32)
 def flow(self,labels,y):
  width=1580/len(labels)
  for i,label in enumerate(labels):
   x=120+i*width;self.rect(x,y,18,18,self.accent)
   if i<len(labels)-1:self.line(x+30,y+8,x+width-18,y+8,self.muted,2)
   self.text(label,x,y+32,width-28,75,28,self.accent,bold=True,minsize=24)
 def finish(self,row,target):
  notes=row.get('note_'+self.lang) or ' '.join(row[self.lang+'_points'])
  self.slide.notes_slide.notes_text_frame.text=notes
  self.image.save(target)
  return notes

def capture(row):
 name=row.get('capture')
 if row['kind']=='sources' and row.get('capture'):return ROOT/'.impeccable/bilingual/picture-background.png'
 if row['kind']=='consequences':return ROOT/'.impeccable/consequences/empty-hold-desktop.png'
 if row['kind']=='progress':return ROOT/'.impeccable/bilingual/shipyard.png'
 return RAW/name if name else None

def render_row(deck,row,lang,index,target,movie):
 s=Slide(deck,lang,index,row['role'],row.get('light',False));title=row[lang];points=row[lang+'_points'];kind=row['kind'];photo=capture(row)
 if kind=='cover':
  s.text(points[0],96,136,1050,100,65,s.accent,bold=True)
  s.text(title,96,278,1040,340,102,s.fore,bold=True,minsize=66 if ARGS.final_talk else 76)
  s.text(points[1],100,661,1020,180,45,s.muted,minsize=38)
  s.text(points[2],100,881,1000,85,28,s.muted,minsize=24)
  s.picture(photo,1190,235,650,625)
 elif kind=='video':
  s.text(title.replace('\n',' '),96,116,1728,105,60,s.fore,bold=True,minsize=50)
  poster=ROOT/'.impeccable/demo-v3/video-poster.png'
  if not poster.exists():poster=photo
  x,y,w,h=240,222,1440,810
  if movie.exists():s.slide.shapes.add_movie(str(movie),Inches(x/144),Inches(y/144),Inches(w/144),Inches(h/144),poster_frame_image=str(poster),mime_type='video/mp4')
  elif not ARGS.preview:raise SystemExit('Final deck requires an actual MP4: '+str(movie))
  s.picture(poster,x,y,w,h)
  # Keep the poster behind the media shape so PowerPoint can receive the play click.
  if movie.exists():
   poster_shape=s.slide.shapes[-1]._element;media=s.slide.shapes[-2]._element;poster_shape.addnext(media)
  s.text('ACTUAL GAME CAPTURE · PREPARED SAVES DISCLOSED · SYNTHETIC NARRATION' if lang=='en' else '实际游戏录制 · 预置存档已说明 · 合成旁白',96,1041,1728,28,20,s.muted,minsize=18)
 elif kind in ['balances','era-questions','river-chain']:
  s.text(title,96,145,1728,210,77,s.fore,bold=True,minsize=60)
  if kind=='balances':
   for x,label,meaning,detail in [(96,'SUPPLIES','Capacity to act','Food, water and the means to keep moving.'),(1010,'TRUST','Willingness to cooperate','People who will continue the journey together.')]:
    s.line(x,432,x+810,432,s.accent,3);s.text(label,x,466,810,60,29,s.accent,bold=True);s.text(meaning,x,552,810,130,60,s.fore,bold=True,minsize=46);s.text(detail,x,718,810,125,39,s.muted,minsize=34)
   s.text('What does today’s choice leave for tomorrow?',96,895,1728,75,48,s.fore,bold=True,minsize=40)
  elif kind=='era-questions':
   entries=[('AGRICULTURE','Who receives the water?'),('INDUSTRY','Who organizes power and labour?'),('INFORMATION','Whose experience enters the record?'),('ARTIFICIAL INTELLIGENCE','Who answers for a delegated decision?')]
   for i,(label,question) in enumerate(entries):
    y=410+i*139;s.line(96,y+110,1824,y+110,s.muted,1);s.text(label,96,y,595,95,32,s.accent,bold=True,minsize=28);s.text(question,735,y-2,1080,102,47,s.fore,minsize=38)
  else:
   entries=[('GUN','Defend a village','A higher dike can move the danger downstream.'),('YU','Allocate the water','A working channel needs an agreement about access.'),('DUJIANGYAN','Maintain the system','The agreement depends on continuing work together.')]
   for i,(label,action,detail) in enumerate(entries):
    x=96+i*576;s.rect(x,430,18,18,s.accent)
    if i<2:s.line(x+30,438,x+550,438,s.muted,2)
    s.text(label,x,482,510,55,29,s.accent,bold=True);s.text(action,x,572,440,145,48,s.fore,bold=True,minsize=42);s.text(detail,x,735,440,155,34,s.muted,minsize=30)
   s.text('Engineering and shared rules have to endure together.',96,913,1728,63,40,s.fore,minsize=34)
 else:
  s.text(title,96,145,1728,210,77,s.fore,bold=True,minsize=60)
  if row.get('assumption'):
   s.rect(96,350,1728,46,'D9F1E8' if s.light else '144A49');s.text('ILLUSTRATIVE ASSUMPTIONS — NOT VALIDATED SALES, QUOTES OR FUNDING' if lang=='en' else '示例假设——不是已验证销售、供应商报价或已融资金额',112,360,1690,35,23,'126653' if s.light else 'B5E7D5',bold=True,minsize=20)
  if row.get('metrics'):
   for i,metric in enumerate(row['metrics']):
    x=96+i*576;s.text(metric[0],x,420,520,145,116,s.accent,bold=True,minsize=92);s.text(metric[1 if lang=='en' else 2],x,570,520,65,26,s.muted,bold=True,minsize=22)
   s.points(points,96,676,1728,290,36)
  elif row.get('budget'):
   y=430
   for item in row['budget']:
    s.text(item[0],96,y,260,76,57,s.accent,bold=True,minsize=48);s.text(item[1 if lang=='en' else 2],370,y+8,1300,60,37,s.fore,bold=True,minsize=32);y+=98
   s.text(points[1]+' '+points[2],96,868,1728,105,34,s.muted,minsize=29)
  elif photo and photo.exists():
   s.points(points,96,409,810,550,40);s.rect(962,398,870,541,DEEP if not s.light else 'DFEBE8');s.picture(photo,976,411,842,513)
  elif row.get('flow'):
   s.points(points,96,403,1728,378,41);s.flow(row['flow' if lang=='en' else 'flow_zh'],839)
  else:s.points(points,96,420,1728,535,47)
  if row.get('links'):
   s.text('docs.lovable.dev  ·  harbourmind.ai  ·  github.com/yj438863687/civilization-voyage',96,959,1728,31,20,s.muted,minsize=18)
 return s,s.finish(row,target)

def build(lang,folder,indices,label,main=False):
 folder.mkdir(parents=True,exist_ok=True);deck=Presentation();deck.slide_width=Inches(13.333333);deck.slide_height=Inches(7.5)
 images=[];notes=[];movie=OUT/'Video'/('Civilization-Voyage-Demo-EN.mp4' if lang=='en' else 'Civilization-Voyage-Demo-ZH.mp4')
 for index in indices:
  path=OUT/'Previews'/lang/f'{index+1:02d}.png';path.parent.mkdir(parents=True,exist_ok=True)
  s,note=render_row(deck,DATA[index],lang,index,path,movie);images.append(path);notes.append(f'{index+1:02d}. {DATA[index][lang].replace(chr(10)," ")}\n{note}\n')
 name=('Civilization-Voyage-Deep-Sea-Pitch' if main else 'Speaker-'+label)+('-EN' if lang=='en' else '-中文理解')
 target=folder/(name+'.pptx');deck.save(target);target.with_suffix('.txt').write_text('\n'.join(notes))
 if main:
  pdf=fitz.open()
  for path in images:
   page=pdf.new_page(width=960,height=540);page.insert_image(page.rect,filename=str(path))
  pdf.save(folder/(name+'.pdf'),garbage=4,deflate=True)
  thumbnails=[]
  for path in images:
   image=Image.open(path);image.thumbnail((384,216));thumbnails.append(image)
  columns=4;rows=math.ceil(len(thumbnails)/columns);sheet=Image.new('RGB',(columns*404,rows*246),'#172D39');draw=ImageDraw.Draw(sheet)
  for i,image in enumerate(thumbnails):x=(i%columns)*404+10;y=(i//columns)*246+22;sheet.paste(image,(x,y));draw.text((x,y-18),f'{i+1:02d}',fill='#EDF6F5')
  sheet.save(OUT/'Previews'/f'contact-sheet-{lang}.jpg',quality=92)
  print('Main deck:',target,flush=True)
 for slide in Presentation(target).slides:
  for shape in slide.shapes:
   # Decorative rings intentionally extend beyond the edge; readable objects stay in bounds.
   if shape.has_text_frame and shape.text.strip():
    assert 0<=shape.left and 0<=shape.top and shape.left+shape.width<=deck.slide_width+100 and shape.top+shape.height<=deck.slide_height+100
    if lang=='en':assert not re.search(r'[\u3400-\u9fff]',shape.text),shape.text
 return target

for lang,name in ([('en','English')] if ARGS.final_talk else [('en','English'),('zh','中文理解')]):
 folder=OUT/name;build(lang,folder,list(range(len(DATA))),lang,True)
 if not ARGS.final_talk:
  for role in 'ABCDE':build(lang,folder,[i for i,s in enumerate(DATA) if s['role']==role or s['role']=='ALL'],role)
(OUT/'presentation-metadata.json').write_text(json.dumps({'status':'presentation-ready' if ARGS.final_talk else 'editable-draft','languages':['en'] if ARGS.final_talk else ['en','zh'],'slides':len(DATA),'reference':'HarbourMind public visual style; user-supplied BP structure only','financials':'illustrative assumptions, not validated results','video_embedded':not ARGS.preview},ensure_ascii=False,indent=2))
print('PPT and PDF generation complete:',OUT,flush=True)
