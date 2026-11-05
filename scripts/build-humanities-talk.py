#!/usr/bin/env python3
"""Introduce the actual app through people, play and a clearly labelled BP; English and Chinese."""
import json,math,re,shutil,hashlib,zipfile
from pathlib import Path
from PIL import Image,ImageDraw
from pptx import Presentation
from pptx.util import Inches
from pptx.enum.shapes import MSO_SHAPE
import fitz
import presentation_core as core
from presentation_core import Page,INK,PANEL,GREEN,PAPER,WHITE,MUTED,LINE
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'.impeccable/humanities-talk';BASE.mkdir(parents=True,exist_ok=True)
ROWS=json.loads((ROOT/'docs/humanities-introduction.json').read_text());MEDIA=json.loads((ROOT/'apps/web/src/world/backgroundMedia.json').read_text());HALL=ROOT/'.impeccable/harbour-talk/temple-cover-composed.png';RAW=ROOT/'.impeccable/demo-v3/raw-sync'
assert len(ROWS)==20
for record in MEDIA.values():
 if record['author'].strip().lower().startswith('unknown'):record['author']='Unknown author'
VIDEO_SOURCE={'en':ROOT/'.impeccable/course-talk/Video/Civilization-Voyage-Demo-EN.mp4','zh':Path.home()/'Desktop/文明航程演讲包/资源后果与实录Demo-深海信号版/Video/Civilization-Voyage-Demo-ZH.mp4'}
for lang in ['en','zh']:
 OUT=BASE/lang;OUT.mkdir(exist_ok=True);core.OUT=OUT;core.LANG=lang;core.font.cache_clear();zh=lang=='zh'
 prs=Presentation();prs.core_properties.title='文明航程：项目、故事与商业应用' if zh else 'Civilization Voyage: The App, Its Stories and Business Proposal';prs.slide_width=Inches(13.333333);prs.slide_height=Inches(7.5);images=[]
 movie=OUT/'Civilization-Voyage-Demo.mp4';shutil.copy2(VIDEO_SOURCE[lang],movie)
 def t(c,e):return c if zh else e
 def label(p,value):p.text(value,96,64,1728,45,23,p.accent,kind='sans' if zh else 'mono')
 def title(p,value,x=96,y=149,w=1728,h=192,size=74):p.text(value,x,y,w,h,size,p.fg,kind='serif',minsize=48 if zh else 54)
 def paragraphs(p,values,x,y,w,size=37,step=143,color=None):
  for i,v in enumerate(values):p.text(v,x,y+i*step,w,step-24,size,color or p.fg,minsize=28)
 def line(p,x1,y1,x2,y2,color=GREEN):p.line(x1,y1,x2,y2,color,3)
 def arrow(p,x1,y1,x2,y2):
  line(p,x1,y1,x2,y2);a=math.atan2(y2-y1,x2-x1)
  for d in [-.5,.5]:line(p,x2-19*math.cos(a+d),y2-19*math.sin(a+d),x2,y2)
 def credit(p,key,x,y,w):
  m=MEDIA[key];caption={'water':t('都江堰现代照片，供理解分水结构。','Modern Dujiangyan; an explanatory photograph.'),'tablet':t('晚乌鲁克时期的数字泥板。','A Late Uruk numerical tablet.'),'watt':t('瓦特肖像，1812年；晚于作坊场景。','Watt portrait, 1812; later than the workshop scene.'),'zhan':t('詹天佑的人物背景图像。','A contextual image of Zhan Tianyou.'),'cable':t('大东方号，1866年。','Great Eastern, 1866.'),'go':t('围棋规则示意；并非AlphaGo比赛现场。','A Go board; not the AlphaGo match.')}.get(key,'')
  author=m['author'].strip().split(' according')[0]
  if author.lower().startswith('unknown'):author=t('作者不详','Unknown author')
  licence=t('公有领域','Public domain') if m['license']=='Public domain' else m['license']
  p.text(caption+' '+author+' · '+licence,x,y,w,64,21,p.muted,minsize=18)
 def end(p,n,business=False):
  p.line(96,1009,1824,1009,'CCD9D4' if p.light else LINE,1);p.text(t('文明航程｜'+('应用与价格为待验证的试点设想。' if business else '中华文明与世界文化中的技术和生活。'),'Civilization Voyage | '+('Proposed offer and illustrative assumptions.' if business else 'Technology and life in Chinese and world stories.')),96,1031,1570,35,20,p.muted,minsize=18);p.text(f'{n:02d}',1754,1030,70,35,22,p.muted)
 for i,item in enumerate(ROWS):
  row=dict(item);row['note_en']=item['note_zh' if zh else 'note_en'];k=row['kind'];light=k in ['seas','water','industry','play','making','offer','economics'];p=Page(prs,row,i,light,True);h=row[lang];body=row[lang+'_body'];keys=list(row.get('media',[]))
  if k=='industry':keys=['zhan','watt']
  if keys:
   row['note_en']+='\n\n'+t('图片资料与授权：','Image credits and licences:')+'\n'+'\n'.join(f"{key}: "+(MEDIA[key]['caption']+' | ' if zh else '')+f"{MEDIA[key]['author']} | {MEDIA[key]['license']} | {MEDIA[key]['url']} | {MEDIA[key]['licenseUrl']}" for key in keys)
  if k=='cover':
   p.picture(HALL,0,0,1920,1080);label(p,t('文明航程 · 项目介绍','CIVILIZATION VOYAGE · PROJECT PRESENTATION'))
   p.text(h,96,161,1728,220,174 if zh else 112,WHITE,kind='serif',minsize=120 if zh else 88)
   p.text(body[0],100,410,1050,195,56 if zh else 57,GREEN,minsize=45)
   p.text(t('中华文明 · 世界文化 · 技术与人的生活','Chinese civilization · World cultures · Technology and everyday life'),100,925,1700,80,32,WHITE,minsize=26)
  elif k=='departure':
   label(p,t('起航','DEPARTURE'));title(p,h,w=970,size=77)
   p.picture(RAW/'opening-poster.png',784,335,1040,588)
   for j,value in enumerate(body):
    y=410+j*172;p.text(f'{j+1:02d}',96,y,75,62,35,GREEN);p.text(value,202,y,490,131,38,WHITE,minsize=30)
   end(p,i+1)
  elif k=='seas':
   label(p,t('两片海，四个时代','TWO SEAS / FOUR ERAS'));title(p,h,size=70)
   for j,(a,b) in enumerate([(t('内海','INNER SEA'),t('中国','CHINA')),(t('外海','OUTER SEA'),t('世界','WORLD'))]):
    x=96+j*882;p.text(a,x,377,800,63,32,p.accent);p.text(b,x,465,800,133,92,p.fg,kind='serif',minsize=75);p.line(x,638,x+790,638,'ADCCC0',2)
   paragraphs(p,body,96,706,1728,33,86);end(p,i+1)
  elif k=='water':
   label(p,t('中国 · 农业航线','CHINA · AGRICULTURE'));title(p,h,w=800,h=225,size=71)
   paragraphs(p,body,96,432,752,37,158)
   p.picture(ROOT/'apps/web/public/background/water.jpg',930,366,894,503);credit(p,'water',930,907,894);end(p,i+1)
  elif k=='tablet':
   label(p,t('世界 · 农业航线','WORLD · AGRICULTURE'));title(p,h,w=900,h=226,size=70)
   paragraphs(p,body,96,455,790,38,222)
   p.picture(ROOT/'apps/web/public/background/tablet.jpg',1020,257,804,668);credit(p,'tablet',1020,933,804);end(p,i+1)
  elif k=='industry':
   label(p,t('工业时代','INDUSTRY'));title(p,h,size=77)
   for j,(key,value) in enumerate(zip(keys,body)):
    x=96+j*882;p.picture(ROOT/'apps/web/public'/MEDIA[key]['src'].lstrip('/'),x,374,306,420);p.text(value,x+346,415,472,280,36,p.fg,minsize=30);credit(p,key,x,849,800)
   end(p,i+1)
  elif k=='messages':
   label(p,t('信息时代','INFORMATION'));title(p,h,size=75)
   p.picture(ROOT/'apps/web/public/background/cable.jpg',96,346,1000,610);paragraphs(p,body,1200,421,620,36,244);credit(p,'cable',96,950,1000);end(p,i+1)
  elif k=='resources':
   label(p,t('补给与人心','SUPPLIES AND TRUST'));title(p,h,size=75)
   p.picture(RAW/'upgrades-poster.png',766,335,1058,595)
   for j,value in enumerate(body):p.rect(96,412+j*180,9,112,GREEN if j!=1 else 'C79C72');p.text(value,134,407+j*180,540,145,37,WHITE,minsize=29)
   end(p,i+1)
  elif k=='play':
   label(p,t('水上互动','ON THE WATER'));title(p,h,size=78)
   for j,(word,explanation) in enumerate([(t('浮标','GATE'),body[0]),(t('光环与收集','HOLD / COLLECT'),body[1]),(t('安排','DECIDE'),body[2])]):
    x=96+j*588;p.line(x,442,x+485,442,p.accent,3);p.text(word,x,491,500,97,45,p.fg,kind='serif',minsize=35);p.text(explanation,x,639,500,181,36,p.fg,minsize=29)
   p.text(t('WASD 航行   E 交谈   空格 下一句   Escape 返回   B 船坞','WASD Sail   E Talk   Space Next Line   Escape Return   B Shipyard'),96,929,1728,68,28,p.muted,minsize=23);end(p,i+1)
  elif k=='return':
   label(p,t('回港','RETURN TO SHORE'));title(p,h,size=80)
   for j,value in enumerate(body):
    y=438+j*161;p.text(value,96,y,1470,133,43,WHITE,minsize=34);p.line(96,y+136,1824,y+136,LINE,1)
   end(p,i+1)
  elif k=='video':
   label(p,h);p.text('02:43',1639,64,185,47,27,MUTED)
   poster=ROOT/'.impeccable/demo-v3/video-poster.png';x,y,w,hh=160,130,1600,900;p.picture(poster,x,y,w,hh);p.slide.shapes.add_movie(str(movie),Inches(x/144),Inches(y/144),Inches(w/144),Inches(hh/144),poster_frame_image=str(poster),mime_type='video/mp4')
  elif k=='details':
   label(p,t('故事的呈现','STORY AND PRESENTATION'));title(p,h,size=78)
   words=[t('人物与字幕','PEOPLE / SUBTITLES'),t('声音与动作','SOUND / ACTION'),t('图片与背景','IMAGES / CONTEXT')]
   for j,(word,value) in enumerate(zip(words,body)):
    y=425+j*162;p.text(word,96,y,510,63,36,GREEN,kind='serif',minsize=29);p.text(value,673,y,1147,114,38,WHITE,minsize=31);p.line(96,y+126,1824,y+126,LINE,1)
   end(p,i+1)
  elif k=='state':
   label(p,t('当前版本','THE CURRENT BUILD'));title(p,h,size=78)
   for j,(n,word) in enumerate([('4',t('时代','ERAS')),('8',t('航线','ROUTES')),('24',t('故事场景','SCENES'))]):
    x=96+j*588;p.text(n,x,385,500,128,104,GREEN,kind='serif',minsize=88);p.text(word,x,534,500,62,31,WHITE)
   paragraphs(p,body,96,672,1728,33,94);end(p,i+1)
  elif k=='making':
   label(p,t('AI工具与本机开发','AI TOOLS / LOCAL DEVELOPMENT'));title(p,h,size=80)
   for j,value in enumerate(body):
    y=420+j*169;p.text(f'{j+1:02d}',96,y,112,77,43,p.accent,kind='serif');p.text(value,286,y,1520,128,39,p.fg,minsize=31)
   p.text(t('GitHub中的设计、接口、前端交接与保存记录，是这段开发过程的依据。','The repository’s design, API, frontend and persistence records ground this account.'),96,941,1728,62,27,p.muted,minsize=23);end(p,i+1)
  elif k=='ai':
   label(p,t('人工智能时代','ARTIFICIAL INTELLIGENCE'));title(p,h,size=75)
   paragraphs(p,body,96,406,890,36,167)
   p.picture(ROOT/'apps/web/public/background/go.jpg',1103,453,721,439);credit(p,'go',1103,923,721);end(p,i+1)
  elif k=='buyer':
   label(p,t('BP · 使用者与采购者','BP · USERS AND BUYERS'));title(p,h,size=79)
   words=[t('学习者','LEARNER'),t('教师','TEACHER'),t('学校或机构','INSTITUTION')]
   for j,(word,value) in enumerate(zip(words,body)):
    y=418+j*168;p.text(word,96,y,474,82,43,GREEN,kind='serif',minsize=34);p.text(value.split('：',1)[-1] if zh else value,648,y,1176,121,39,WHITE,minsize=31);p.line(96,y+132,1824,y+132,LINE,1)
   end(p,i+1,True)
  elif k=='offer':
   label(p,t('BP · 第一种交付','BP · THE FIRST OFFER'));title(p,h,size=77)
   words=[t('已有基础','EXISTING'),t('试点前补齐','PREPARE'),t('比较与验证','COMPARE')]
   for j,(word,value) in enumerate(zip(words,body)):
    x=96+j*588;p.text(word,x,412,520,62,31,p.accent,kind='serif');p.text(value,x,530,500,305,37,p.fg,minsize=29)
   p.text(t('首个拟议单位：一次有引导的文化体验课。','Proposed first unit: one facilitated cultural-history class.'),96,931,1728,72,34,p.accent,minsize=28);end(p,i+1,True)
  elif k=='economics':
   label(p,t('BP · 试点测算','BP · ILLUSTRATIVE ECONOMICS'));title(p,h,size=79)
   for j,(amount,word) in enumerate([('¥3,000',t('每班假设收费','CLASS PRICE')),('-¥1,200',t('直接交付','DELIVERY')),('-¥600',t('首次获客','ACQUISITION')),('¥1,200',t('贡献余额','CONTRIBUTION'))]):
    x=96+j*441;p.text(amount,x,394,407,123,79,p.accent if j in [0,3] else p.fg,minsize=64);p.text(word,x,548,407,65,27,p.muted,minsize=23)
   paragraphs(p,body,96,682,1728,32,94);end(p,i+1,True)
  elif k=='pilot':
   label(p,t('BP · 试用与复用','BP · TRIAL AND REUSE'));title(p,h,size=76)
   steps=[t('愿意试用','TRY'),t('带完航线','COMPLETE'),t('请求复用','RETURN'),t('批准采购','PURCHASE')]
   for j,word in enumerate(steps):
    x=96+j*441;p.text(word,x,411,380,84,42,GREEN,kind='serif',minsize=33)
    if j<3:arrow(p,x+268,454,x+403,454)
   paragraphs(p,body,96,609,1728,36,116);end(p,i+1,True)
  elif k=='closing':
   label(p,t('项目的下一步','THE NEXT STEP'));title(p,h,size=84)
   quote=t('水利技术让人留下来，\n分水和维护的规矩\n才让两岸一起过下去。','Water engineering lets people settle.\nRules for sharing and maintenance\nlet both banks keep living together.')
   p.text(quote,96,387,1728,295,75 if zh else 63,WHITE,kind='serif',minsize=52 if zh else 46)
   p.text(t('游戏中的李冰回港台词，据史实创作。','Li Bing’s closing line in the game; authored reconstruction.'),96,709,1728,61,26,GREEN,minsize=23)
   paragraphs(p,body,96,829,1728,30,88)
  else:raise ValueError(k)
  images.append(p.finish())
 folder=OUT/'Presentation';folder.mkdir(exist_ok=True);ppt=folder/('Civilization-Voyage-中文理解.pptx' if zh else 'Civilization-Voyage-Presentation-EN.pptx');prs.save(ppt)
 for n,slide in enumerate(Presentation(ppt).slides):
  visible=''.join(s.text for s in slide.shapes if s.has_text_frame)
  assert bool(re.search(r'[\u3400-\u9fff]',visible))==zh,(lang,n,visible)
  for s in slide.shapes:
   if s.has_text_frame and s.text.strip():assert s.left>=0 and s.top>=0 and s.left+s.width<=prs.slide_width+100 and s.top+s.height<=prs.slide_height+100,s.text
 pdf=fitz.open()
 for path in images:page=pdf.new_page(width=960,height=540);page.insert_image(page.rect,filename=str(path))
 pdf.save(folder/('Civilization-Voyage-中文理解.pdf' if zh else 'Civilization-Voyage-Presentation-EN.pdf'),deflate=True,garbage=4)
 sheet=Image.new('RGB',(4*404,math.ceil(len(images)/4)*246),'#172D39');draw=ImageDraw.Draw(sheet)
 for n,path in enumerate(images):
  im=Image.open(path);im.thumbnail((384,216));x=(n%4)*404+10;y=(n//4)*246+22;sheet.paste(im,(x,y));draw.text((x,y-18),f'{n+1:02d}',fill='#EDF6F5')
 sheet.save(OUT/'contact-sheet.jpg',quality=94)
 print('Built',lang,len(ROWS),'pages:',ppt,flush=True)
(BASE/'metadata.json').write_text(json.dumps({'slides_per_language':len(ROWS),'languages':['en','zh'],'source':'GitHub main README.md, docs/history-music-refit.md, and the actual openings/endings in voyageHistory.json','scope':'The app, cultural meaning, game content and BP','notes':'Fully bilingual speaker notes; image authors/licences retained; no fabricated customers or revenue','roles':{role:[i+1 for i,s in enumerate(ROWS) if s['role']==role] for role in 'ABCDE'}},ensure_ascii=False,indent=2))
