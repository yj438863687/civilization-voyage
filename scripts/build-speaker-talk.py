#!/usr/bin/env python3
"""A speaker-led talk with layouts chosen for the argument on each page."""
import json,math,re,shutil,zipfile,hashlib,argparse
from pathlib import Path
from PIL import Image,ImageDraw
from pptx import Presentation
from pptx.util import Inches
from pptx.enum.shapes import MSO_SHAPE
import fitz
import presentation_core as core
from presentation_core import Page,INK,PANEL,GREEN,PAPER,WHITE,MUTED,LINE
ROOT=Path(__file__).resolve().parents[1];parser=argparse.ArgumentParser();parser.add_argument('--content',type=Path,default=ROOT/'docs/speaker-led-talk.json');parser.add_argument('--output',type=Path,default=ROOT/'.impeccable/speaker-talk');args=parser.parse_args();OUT=args.output;OUT.mkdir(parents=True,exist_ok=True);core.OUT=OUT
DATA=json.loads(args.content.read_text());OLD=ROOT/'.impeccable/harbour-talk';RAW=ROOT/'.impeccable/demo-v3/raw-sync'
MOVIE=OUT/'Video/Civilization-Voyage-Demo-EN.mp4';MOVIE.parent.mkdir(exist_ok=True);shutil.copy2(OLD/'Video/Civilization-Voyage-Demo-EN.mp4',MOVIE)
prs=Presentation();prs.slide_width=Inches(13.333333);prs.slide_height=Inches(7.5)
images=[];RED='E7A086'
def section(p,label):p.text(label,96,64,1728,44,22,p.accent,kind='mono')
def heading(p,title,y=145,size=70,w=1728):p.text(title,96,y,w,192,size,p.fg,True,minsize=52)
def arrow(p,x1,y1,x2,y2,color=GREEN):
 p.line(x1,y1,x2,y2,color,4);a=math.atan2(y2-y1,x2-x1)
 for d in [-.55,.55]:p.line(x2-22*math.cos(a+d),y2-22*math.sin(a+d),x2,y2,color,4)
def circle(p,x,y,r,color,border=None):
 p.draw.ellipse((x-r,y-r,x+r,y+r),fill='#'+color,outline='#'+(border or color),width=2)
 s=p.slide.shapes.add_shape(MSO_SHAPE.OVAL,Inches((x-r)/144),Inches((y-r)/144),Inches(2*r/144),Inches(2*r/144));s.fill.solid();s.fill.fore_color.rgb=core.RGBColor.from_string(color);s.line.color.rgb=core.RGBColor.from_string(border or color)
def footer(p,assumed=False):p.footer('Illustrative assumptions · Customer and classroom hypotheses to test.' if assumed else 'Civilization Voyage · Sources, delivery limits and speaking cues in notes.')
for index,row in enumerate(DATA):
 k=row['kind'];light=k in ['eras','ledger','seas','skills','alternatives','economics','gates','culture-comparison','cultural-reflection'];p=Page(prs,row,index,light,True)
 if k=='cover':
  p.picture(OLD/'temple-cover-composed.png',0,0,1920,1080)
  section(p,'CIVILIZATION VOYAGE · A PLAYABLE HISTORY')
  p.text('Civilization Voyage',96,157,1728,155,116,WHITE,kind='serif',minsize=92)
  p.text(row.get('subtitle','Who carries the cost of progress?'),100,356,1700,148,64,GREEN,minsize=46)
  p.text('Four eras. Eight routes. One question carried forward.',100,925,1700,83,35,WHITE,minsize=30)
 elif k=='case':
  p.rect(700,0,1220,1080,PAPER);p.rect(0,0,700,1080,INK)
  p.text('A FLOOD-CONTROL LEGEND',770,86,1074,50,24,'087F69',True,kind='mono')
  p.text('The same river reaches both fields.',770,184,1060,126,48,INK,True,minsize=40)
  p.rect(790,588,392,210,'D7E6D8');p.text('VILLAGE FIELDS',817,624,340,48,23,'356C52',True,kind='mono');p.text('Protected',817,708,340,62,41,INK,True,minsize=34)
  p.rect(1402,731,390,210,'CEE5EB');p.text('NEIGHBOURING FIELDS',1429,767,338,50,21,'296C80',True,kind='mono',minsize=20);p.text('Flooded',1429,853,338,62,41,INK,True,minsize=34)
  arrow(p,1230,341,1230,468,'34899C');p.line(1230,468,1593,468,'34899C',20);arrow(p,1593,468,1593,707,'34899C')
  p.line(991,473,1182,473,'AA6F4A',17);p.text('HIGHER DIKE',790,404,380,47,23,'925B37',True,kind='mono');p.line(991,490,991,563,'AA6F4A',4)
  p.text('Water is displaced.',1361,588,470,75,33,'296C80',True,minsize=28)
  p.text('Schematic of the game’s fictional scene.',770,1004,1074,42,23,'526D78',minsize=21)
  p.text('BEGIN AT THE RIVER',80,75,560,42,22,GREEN,kind='mono');p.text(row['en'],80,218,550,400,69,WHITE,True,minsize=52)
  p.line(80,718,610,718,LINE,2);p.note('A local success changes someone else’s conditions.',80,790,535,38)
 elif k=='mechanism':
  section(p,'UNDERSTANDING BEFORE JUDGMENT' if row.get('culture_lens') else 'THE QUESTION BENEATH THE SCENE');p.text('Understand the setting.' if row.get('culture_lens') else 'Follow the gain.',96,177,1728,140,98,WHITE,True,minsize=80);p.text('Then form a judgment.' if row.get('culture_lens') else 'Then follow the cost.',96,321,1728,140,98,GREEN,True,minsize=80)
  items=[('SITUATION','What is happening?'),('EVIDENCE','What supports the story?'),('PERSPECTIVES','Whose voice is missing?'),('JUDGMENT','What can I explain?')] if row.get('culture_lens') else [('OBJECTIVE','What improves?'),('ALLOCATION','What must move?'),('INCIDENCE','Who carries the cost?'),('NEXT DECISION','What changes afterwards?')]
  for i,(a,b) in enumerate(items):
   x=96+i*441;p.text(a,x,612,385,45,23,GREEN,True,kind='mono');p.text(b,x,696,350,150,38,WHITE,True,minsize=31)
   if i<3:arrow(p,x+350,650,x+419,650)
  p.note('Begin with the situation, the source and the voices a first impression may miss.' if row.get('culture_lens') else 'A change in cooperation can become a change in tomorrow’s material constraint.',96,905,1728,34);footer(p)
 elif k=='eras':
  section(p,'FOUR ERAS · EIGHT HISTORICAL ROUTES');heading(p,row['en'],size=66)
  for i,(era,capability,arrangement) in enumerate([('Agriculture','Water and surplus','Allocation and upkeep'),('Industry','Power and production','Labour and shared gains'),('Information','Records and communication','Visibility and access'),('Artificial intelligence','Prediction and delegation','Responsibility and judgment')]):
   y=389+i*142;p.rect(96,y,9,110,p.accent);p.text(era,132,y+5,508,90,37,p.fg,True,minsize=31);p.text(capability,690,y+5,490,100,32,p.muted,minsize=29);p.text(arrangement,1245,y+5,570,105,36,p.fg,minsize=30);p.line(132,y+115,1824,y+115,'CBDAD6',1)
  footer(p)
 elif k=='route':
  section(p,'THE ROUTE IS THE STORY');heading(p,row['en'],size=78)
  for i,(label,title,detail) in enumerate([('ISLAND 01','Meet the problem','A person asks for an arrangement.'),('ISLAND 02','Inherit a choice','A previous relationship changes the terms.'),('SHARED CRISIS','Test the arrangement','Materials and cooperation are put under pressure.'),('THE SHORE','Account for it','A period-appropriate voice recalls your decisions.')]):
   x=96+i*441;y=466+(i%2)*75;circle(p,x+13,y,12,GREEN);p.text(label,x,y+54,380,45,23,GREEN,True,kind='mono');p.text(title,x,y+133,370,135,44,WHITE,True,minsize=36);p.text(detail,x,y+291,370,135,30,MUTED,minsize=27)
   if i<3:arrow(p,x+43,y,x+418,466+((i+1)%2)*75,LINE)
  footer(p)
 elif k=='ledger':
  section(p,'ONE SCENE · ACTUAL CHOICE VALUES');heading(p,row['en'],size=76)
  for x,title in [(96,'Arrangement'),(910,'Supplies'),(1350,'Trust')]:p.text(title,x,381,450,60,28,p.muted,True)
  options=[('Protect the village',7,-5),('Build a shared outlet',-6,8)]
  for i,(title,supply,trust) in enumerate(options):
   y=492+i*189;p.text(title,96,y+22,755,110,48,p.fg,True,minsize=39)
   for x,value in [(910,supply),(1350,trust)]:p.text(f'{value:+d}',x,y,390,138,108,p.accent if value>0 else 'AA5039',True,minsize=86)
   p.line(96,y+152,1824,y+152,'C8DAD3',1)
  p.text('Later cooperation can return +3 supplies.',96,891,1728,66,43,p.accent,True,minsize=36);p.note('Task results settle separately. Trust ≤20 suspends the later support.',96,955,1728,27);footer(p)
 elif k=='seas':
  section(p,'INNER SEA / OUTER SEA');heading(p,row['en'],size=72)
  p.text('CHINA',505,357,570,58,31,p.accent,True,kind='mono');p.text('THE WORLD',1180,357,640,58,31,p.accent,True,kind='mono')
  data=[('Agriculture','Flood-control legends → Warring States','Mesopotamia, c.3500–3200 BCE'),('Industry','1839–1909','1769–1842'),('Information','1871–1896','1844–1948'),('AI','2017 → imagined 2035','1950–2016')]
  for i,(era,china,world) in enumerate(data):
   y=459+i*117;p.text(era,96,y,365,70,32,p.fg,True);p.text(china.replace(' → ',' to '),505,y,600,90,31,p.fg,minsize=27);p.text(world,1180,y,640,90,31,p.fg,minsize=27);p.line(96,y+88,1824,y+88,'CCDAD6',1)
  p.note('Routes move forward in time; eras can overlap. Legends and imagined futures remain labelled.',96,943,1728,26);footer(p)
 elif k=='failure':
  section(p,'AN ENDING WITH A CONSEQUENCE');heading(p,row['en'],size=64)
  p.picture(ROOT/'.impeccable/consequences/empty-hold-desktop.png',1010,354,814,598)
  for i,(name,body) in enumerate([('0 supplies','The ship stops. Recovery costs hull condition and a refit tier.'),('0 trust','The crew withdraws. Recovery costs an outfit tier.')]):
   y=391+i*248;p.text(name,96,y,830,113,79,GREEN if i==0 else RED,True,minsize=65);p.text(body,96,y+128,820,110,36,WHITE,minsize=31)
  p.note('Each recovery: −200 score and a reset combo. Or preserve the failure as the voyage’s ending.',96,926,1728,31);footer(p)
 elif k=='upgrades':
  section(p,'VISIBLE PROGRESSION');p.text('The ship and crew\ncarry the history.',96,151,1728,183,78,WHITE,True,minsize=62)
  p.picture(ROOT/'.impeccable/bilingual/shipyard.png',428,349,1396,625)
  p.text('CAPACITY',96,431,300,49,26,GREEN,True,kind='mono');p.text('Supplies fund the ship.',96,515,300,147,37,WHITE,True,minsize=30)
  p.text('BELONGING',96,714,300,49,26,GREEN,True,kind='mono');p.text('Trust opens crew outfits.',96,794,300,143,37,WHITE,True,minsize=30);footer(p)
 elif k=='evidence':
  section(p,'HISTORY / INTERPRETATION');heading(p,row['en'],size=67)
  p.picture(ROOT/'.impeccable/bilingual/picture-background.png',1160,353,664,605)
  for i,(title,body) in enumerate([('What the source supports','A historical setting and the limits of its evidence.'),('What the game adds','Dialogue, choices and a reconstructed encounter.'),('What the image explains','A modern photograph or later portrait, identified as such.')]):
   y=393+i*189;p.text(title,96,y,960,60,39,WHITE,True,minsize=33);p.text(body,96,y+80,960,107,33,MUTED,minsize=28)
  footer(p)
 elif k=='video':
  section(p,'THE ACTUAL GAME');p.text('02:43',1640,64,180,50,28,MUTED,kind='mono')
  poster=ROOT/'.impeccable/demo-v3/video-poster.png';x,y,w,h=160,130,1600,900;p.picture(poster,x,y,w,h);p.slide.shapes.add_movie(str(MOVIE),Inches(x/144),Inches(y/144),Inches(w/144),Inches(h/144),poster_frame_image=str(poster),mime_type='video/mp4')
 elif k=='skills':
  section(p,'AFTER THE DEMONSTRATION');heading(p,row['en'],size=77)
  for i,(verb,detail) in enumerate([('STEER','Choose an arrangement.'),('HOLD','Keep a condition stable.'),('COLLECT','Decide what is useful.'),('CHECK','Inspect a sequence.')]):
   x=96+i*441;cx=x+165;cy=475
   if i==0:
    p.line(cx-85,cy-58,cx-85,cy+62,p.accent,7);p.line(cx+85,cy-58,cx+85,cy+62,p.accent,7);arrow(p,cx-40,cy+85,cx+40,cy-75,p.accent)
   elif i==1:circle(p,cx,cy,72,'E4EEEA',p.accent);circle(p,cx,cy,16,p.accent)
   elif i==2:
    for dx,dy in [(-65,30),(0,-40),(65,30)]:circle(p,cx+dx,cy+dy,19,p.accent)
   else:
    for j in range(3):p.rect(cx-83+j*67,cy-24,42,47,p.accent)
   p.text(verb,x,630,375,63,35,p.fg,True,kind='mono');p.text(detail,x,723,370,145,34,p.muted,minsize=28)
  p.text('The discussion follows who benefits, who pays and what the next scene inherits.',96,916,1728,72,35,p.fg,minsize=29);footer(p)
 elif k=='workflow':
  section(p,'AI TOOLS / LOCAL DELIVERY');heading(p,row['en'],size=65)
  items=[('FRAMEWORK','A bounded independent project.'),('DESIGN + CONTRACTS','Visual direction and typed API agreements.'),('LOCAL WORLD','React / Three.js, FastAPI and SQLite.'),('PERSIST + VERIFY','Saves, browser checks and the desktop build.')]
  for i,(a,b) in enumerate(items):
   y=389+i*119;p.text(a,96,y,650,60,27,GREEN,True,kind='mono');p.text(b,800,y,1018,80,33,WHITE,minsize=28);p.line(96,y+89,1824,y+89)
  p.note('Lovable provides a workflow parallel: describe, build, synchronize with GitHub and continue locally.',96,910,1728,31);footer(p)
 elif k=='buyer':
  section(p,'THE FIRST CUSTOMER HYPOTHESIS');p.text(row['en'],96,143,1728,142,78,WHITE,True,minsize=61)
  p.text('ONE HISTORY CLASS',96,345,1728,48,25,GREEN,True,kind='mono')
  points=[(382,592,'LEARNER','Agency and a story\nthat makes sense.'),(1010,461,'TEACHER','A source-linked session\nwith manageable preparation.'),(1519,739,'BUDGET OWNER','A clear purchase and\na reason to repeat it.')]
  p.line(382,592,1010,461,LINE,3);p.line(1010,461,1519,739,LINE,3);p.line(382,592,1519,739,LINE,3)
  for x,y,label,detail in points:
   circle(p,x,y,19,GREEN);p.text(label,x-218,y+56,470,45,25,GREEN,True,kind='mono');p.text(detail,x-218,y+118,470,117,32,WHITE,minsize=28)
  footer(p,True)
 elif k=='alternatives':
  section(p,'THE SUBSTITUTION TEST');heading(p,row['en'],size=66)
  for x,w,label in [(96,450,'Existing choice'),(594,560,'Why it can win'),(1202,620,'What we must demonstrate')]:p.text(label,x,371,w,55,27,p.muted,True)
  rows=[('Teacher-made slides','Familiarity and control','Lower preparation burden.'),('A factual quiz','Quick checks of recall','Value in explaining consequences.'),('A longer history game','Sustained immersion','A route that fits a real class.'),('Civilization Voyage','A source-linked decision session','Clear explanations and repeat demand.')]
  for i,(a,b,c) in enumerate(rows):
   y=467+i*116
   if i==3:p.rect(80,y-14,1760,108,'DDEDE5')
   p.text(a,96,y,450,89,31,p.fg,True,minsize=27);p.text(b,594,y,560,89,30,p.fg,minsize=27);p.text(c,1202,y,620,89,30,p.fg,minsize=27)
   if i<3:p.line(96,y+86,1824,y+86,'CCDAD6',1)
  p.note('Comparison hypotheses to test with teachers; these are not claims from a competitor study.',96,950,1728,26);footer(p,True)
 elif k=='offer':
  section(p,'ONE UNIT OF SALE');heading(p,row['en'],size=74)
  p.text('One facilitated class',96,364,1728,104,79,GREEN,True,minsize=66)
  for i,(item,detail,status) in enumerate([('The route','The playable game and saved choices.','IMPLEMENTED'),('Source notes','Historical context and image credits.','IMPLEMENTED'),('Run guide','Setup, timing and facilitator prompts.','PREPARE FOR PILOT'),('Debrief sheet','Evidence of explanation and confusion.','PREPARE FOR PILOT')]):
   y=504+i*111;p.rect(96,y,14,81,GREEN if i<2 else '668897');p.text(item,143,y+5,410,69,34,WHITE,True);p.text(detail,594,y+5,780,80,30,MUTED,minsize=27);p.text(status,1431,y+13,393,61,23,GREEN if i<2 else MUTED,True,kind='mono',minsize=21)
  footer(p,True)
 elif k=='economics':
  section(p,'ILLUSTRATIVE FIRST-PURCHASE ECONOMICS');heading(p,row['en'],size=65)
  values=[('¥3,000','PRICE'),('−¥1,200','DELIVERY'),('−¥600','ACQUISITION'),('¥1,200','CONTRIBUTION')]
  for i,(a,b) in enumerate(values):
   x=96+i*441;p.text(a,x,383,407,124,80,p.accent if i in [0,3] else p.fg,True,minsize=64);p.text(b,x,523,407,56,24,p.muted,True,kind='mono',minsize=21)
  p.line(96,617,1824,617,'ADC7BE',2)
  for x,w,label in [(96,550,'DIRECT DELIVERY COST'),(715,495,'CONTRIBUTION'),(1290,535,'FIRST PURCHASES*')]:p.text(label,x,656,w,45,23,p.muted,True,kind='mono',minsize=21)
  for i,(cost,contribution,number) in enumerate([('¥600','¥1,800','10'),('¥1,200','¥1,200','15'),('¥1,800','¥600','30')]):
   y=733+i*72;p.text(cost,96,y,550,64,35,p.fg,True);p.text(contribution,715,y,495,64,35,p.fg,True);p.text(number,1290,y,535,64,35,p.accent,True)
  p.note('*To cover ¥18,000 fixed launch work. Each purchase bears ¥600 acquisition cost; tax and further development excluded.',96,963,1728,23);footer(p,True)
 elif k=='demand':
  section(p,'A PATH TO A PURCHASING DECISION');heading(p,row['en'],size=65)
  labels=[('TRY','Facilitator agrees'),('USE','A class completes'),('RETURN','Teacher asks again'),('APPROVE','Budget owner agrees'),('PAY','A paid repeat')]
  for i,(a,b) in enumerate(labels):
   y=395+i*109;width=1570-i*176;p.rect(96,y,width,81,GREEN if i==4 else PANEL,LINE);p.text(a,125,y+20,315,47,25,INK if i==4 else GREEN,True,kind='mono');p.text(b,465,y+20,width-395,48,30,INK if i==4 else WHITE,minsize=26)
  p.note('Proposed recruitment: 3 classes × 20 learners. Attendance, reuse requests and approved payment are different evidence.',96,955,1728,26);footer(p,True)
 elif k=='reuse':
  section(p,'A PROPOSED COMPOUNDING ASSET');heading(p,row['en'],size=69)
  nodes=[(350,465,'REVIEW SOURCES',215,366),(1515,465,'RUN THE CLASS',1338,366),(1515,812,'OBSERVE CONFUSION',1279,866),(350,812,'IMPROVE THE GUIDE',137,866)]
  arrow(p,390,465,1475,465,LINE);arrow(p,1515,505,1515,772,LINE);arrow(p,1475,812,390,812,LINE);arrow(p,350,772,350,505,LINE)
  for x,y,a,tx,ty in nodes:circle(p,x,y,13,GREEN);p.text(a,tx,ty,550,56,25,GREEN,True,kind='mono',minsize=22)
  p.text('Less preparation\nper usable session',655,582,638,158,48,WHITE,True,minsize=40)
  p.note('Reviewed content, facilitator relationships and reliable delivery must earn their advantage through repeated use.',96,961,1728,26);footer(p,True)
 elif k=='budget':
  section(p,'ILLUSTRATIVE PILOT CASH PLAN');heading(p,row['en'],size=67)
  p.text('¥30,000',96,357,1728,130,105,GREEN,True,minsize=88)
  for i,(amount,label,items) in enumerate([('¥18,000','FIXED LAUNCH WORK',[('Sources / review',12000),('Product hardening',6000)]),('¥12,000','OPERATING RESERVE',[('Facilitation / evaluation',9000),('Hosting / support',3000)])]):
   x=96+i*882;p.text(amount,x,544,800,100,70,WHITE,True,minsize=59);p.text(label,x,653,800,48,24,GREEN,True,kind='mono');y=745
   for a,v in items:p.text(a,x,y,580,50,29,WHITE,minsize=26);p.text('¥'+format(v,','),x+597,y,205,50,29,MUTED,True,minsize=26);p.rect(x,y+61,800*v/18000,17,GREEN if i==0 else '558A9F');y+=101
  p.note('Reserve cash becomes expense as delivery occurs. Do not add it again to the per-class direct cost.',96,969,1728,25);footer(p,True)
 elif k=='gates':
  section(p,'WHAT EARNS THE NEXT COMMITMENT');heading(p,row['en'],size=67)
  checks=[('Can a teacher run it?','If setup is difficult','Improve the guide and reliability.'),('Can learners explain it?','If the causal story is unclear','Revise the route and debrief.'),('Will a buyer pay again?','If demand does not reach a budget','Revisit the offer and purchaser.')]
  for i,(question,condition,response) in enumerate(checks):
   y=393+i*178;p.text(question,96,y,780,83,40,p.fg,True,minsize=33);p.text(condition,96,y+91,780,55,28,p.muted,minsize=26);arrow(p,880,y+58,1000,y+58,p.accent);p.text(response,1083,y+9,733,122,37,p.fg,minsize=31);p.line(96,y+150,1824,y+150,'BDCEC7',1)
  p.text('A small pilot should identify the next constraint.',96,954,1728,62,36,p.accent,True,minsize=30);footer(p,True)
 elif k=='culture-comparison':
  section(p,'HARMONY WITH DIFFERENCE');heading(p,row['en'],size=65)
  for x,label,title,body,question in [(96,'CHINA','Water and maintenance','Gun and Yu’s legends lead towards the historical setting of Dujiangyan.','Who receives the water—and who keeps the arrangement working?'),(978,'MESOPOTAMIA','Grain and records','A storehouse and a written account organize surplus and claims.','Who receives protection—and whose claim appears in the record?')]:
   p.text(label,x,397,800,50,25,p.accent,True,kind='mono');p.text(title,x,481,800,92,50,p.fg,True,minsize=40);p.text(body,x,607,780,130,34,p.muted,minsize=29);p.text(question,x,790,780,145,37,p.fg,True,minsize=30)
  footer(p)
 elif k=='cultural-reflection':
  section(p,'UNDERSTANDING / ACTION / REFLECTION');heading(p,row['en'],size=71)
  nodes=[(350,465,'UNDERSTAND',215,366),(1515,465,'ACT',1440,366),(1515,812,'ENCOUNTER',1360,866),(350,812,'REFLECT',245,866)]
  arrow(p,390,465,1475,465,'789D91');arrow(p,1515,505,1515,772,'789D91');arrow(p,1475,812,390,812,'789D91');arrow(p,350,772,350,505,'789D91')
  for x,y,a,tx,ty in nodes:circle(p,x,y,13,p.accent);p.text(a,tx,ty,min(520,1824-tx),56,26,p.accent,True,kind='mono',minsize=23)
  p.text('Revise the explanation\nthrough what happened.',655,577,638,164,47,p.fg,True,minsize=39);p.note('A later consequence can change how we understand an earlier choice.',96,961,1728,26);footer(p)
 elif k=='course-snapshot':
  section(p,'THE IMPLEMENTED GAME');heading(p,row['en'],size=69)
  for i,(value,label) in enumerate([('4','ERAS'),('8','CHINA / WORLD ROUTES'),('24','STORY SCENES'),('4','WATER-TASK FORMS')]):
   x=96+(i%2)*882;y=397+(i//2)*258;p.rect(x,y,846,218,PANEL,LINE);p.text(value,x+32,y+24,760,116,98,GREEN,True,minsize=80);p.text(label,x+35,y+155,760,49,27,WHITE,True,kind='mono',minsize=23)
  p.note('Characters, scenes, source notes, sailing, upgrades, audio and endings remain in one world.',96,951,1728,29);footer(p)
 elif k=='course-validation':
  section(p,'PRODUCT EVIDENCE / EDUCATIONAL QUESTIONS');heading(p,row['en'],size=65)
  for x,label,items in [(96,'CHECKED IN THE GAME',['Story access and bilingual consistency','Resource failures, recovery and saved endings','Source notes and evaluation before harbour aid']),(978,'TO STUDY IN A CLASSROOM',['How learners explain a later consequence','Whether a teacher can run the route reliably','How the activity fits the course and lesson'])]:
   p.text(label,x,398,800,59,27,GREEN,True,kind='mono')
   for i,item in enumerate(items):p.text(item,x,509+i*143,780,113,36,WHITE,minsize=30)
  p.note('The current voyage uses authored stories and local rules. Classroom evaluation is the next step.',96,954,1728,27);footer(p)
 elif k=='anthropic-lens':
  section(p,'ANTHROPIC AS A CONTEMPORARY REFERENCE');heading(p,row['en'],size=72)
  for i,(label,title,body) in enumerate([('HONESTY','Make the evidence inspectable.','Distinguish historical context, legend and authored dialogue.'),('HUMAN AGENCY','Leave room to reach a judgment.','Show perspectives and consequences without replacing the player’s decision.'),('HUMAN OVERSIGHT','Keep choices open to review.','Let the journey be reconsidered through its recorded outcomes.')]):
   x=96+i*588;p.text(label,x,412,515,54,25,GREEN,True,kind='mono');p.text(title,x,509,500,164,47,WHITE,True,minsize=37);p.text(body,x,718,500,155,33,MUTED,minsize=28)
  p.note('Source: Anthropic, Claude’s Constitution. Applied here as design questions.',96,951,1728,26);footer(p)
 elif k=='closing':
  section(p,'THE NEXT VOYAGE');p.text(row['en'],96,162,1728,251,98,WHITE,True,minsize=80)
  p.text('Understanding · Difference · Action · Reflection' if row.get('course_closing') else 'Three pilot classrooms.',96,538,1728,144,60 if row.get('course_closing') else 81,GREEN,kind='serif',minsize=46 if row.get('course_closing') else 68)
  p.line(96,733,1824,733,LINE,2)
  p.text('Chinese and world stories meet in the choices people make together.' if row.get('course_closing') else 'A teacher to run it. A reviewer to question it. A buyer to assess its value.',96,795,1728,126,43,WHITE,minsize=35)
  p.note('Technology expands our abilities; cultural reflection asks how we should use them.' if row.get('course_closing') else 'The next decision should make the value—and the work it requires—visible.',96,956,1728,29)
 images.append(p.finish())
folder=OUT/'English';folder.mkdir(exist_ok=True);target=folder/'Civilization-Voyage-Deep-Sea-Pitch-EN.pptx';prs.save(target)
for slide in Presentation(target).slides:
 for shape in slide.shapes:
  if shape.has_text_frame and shape.text.strip():
   assert not re.search(r'[\u3400-\u9fff]|TODO|TBD',shape.text),shape.text
   assert 0<=shape.left and 0<=shape.top and shape.left+shape.width<=prs.slide_width+100 and shape.top+shape.height<=prs.slide_height+100,shape.text
pdf=fitz.open()
for path in images:page=pdf.new_page(width=960,height=540);page.insert_image(page.rect,filename=str(path))
pdf.save(folder/'Civilization-Voyage-Speaker-Edition.pdf',deflate=True,garbage=4)
sheet=Image.new('RGB',(4*404,math.ceil(len(images)/4)*246),'#172D39');d=ImageDraw.Draw(sheet)
for i,path in enumerate(images):
 im=Image.open(path);im.thumbnail((384,216));x=(i%4)*404+10;y=(i//4)*246+22;sheet.paste(im,(x,y));d.text((x,y-18),f'{i+1:02d}',fill='#EDF6F5')
sheet.save(OUT/'contact-sheet.jpg',quality=94)
(OUT/'production-metadata.json').write_text(json.dumps({'slides':len(DATA),'language':'en','outline_source':str(args.content),'teacher_rubric_verified':False,'anthropic_reference':'https://www.anthropic.com/constitution' if any(r['kind']=='anthropic-lens' for r in DATA) else None,'speaker_pages':{r:[i+1 for i,s in enumerate(DATA) if s['role']==r] for r in 'ABCDE'},'layouts':[r['kind'] for r in DATA],'reference_article':'Dr.Dan讲书：目标与代价的循环，从李录框架看中国资产切换 — user-opened WeChat article','source_use':'High-level reasoning sequence applied in original wording; no macroeconomic numbers, asset predictions, or claims of author endorsement','economics':'Illustrative first-purchase model; contribution=3000−delivery−600; fixed launch=18000; operating reserve=12000; reserve not double-counted','demo':'Actual existing edited recording, unchanged'},ensure_ascii=False,indent=2))
print('Built',len(DATA),'speaker-led slides:',target,flush=True)
