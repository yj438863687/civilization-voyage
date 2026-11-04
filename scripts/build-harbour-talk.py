#!/usr/bin/env python3
"""Build the revised talk using the supplied BP's editorial structures and public site palette."""
import json,math,re,shutil
from pathlib import Path
from functools import lru_cache
from PIL import Image,ImageDraw,ImageFont,ImageOps
from pptx import Presentation
from pptx.util import Inches,Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE,MSO_CONNECTOR
from pptx.chart.data import ChartData
from pptx.oxml import parse_xml
from pptx.oxml.ns import nsdecls
from pptx.enum.chart import XL_CHART_TYPE,XL_LEGEND_POSITION
import fitz
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'.impeccable/harbour-talk';OUT.mkdir(exist_ok=True)
DATA=json.loads((ROOT/'docs/harbour-talk-content.json').read_text());W,H=1920,1080
INK='071B29';PANEL='0B3046';GREEN='35C5A5';PAPER='F1F5F4';WHITE='EDF6F5';MUTED='9BB4BC';LINE='264454'
RAW=ROOT/'.impeccable/demo-v3/raw-sync';MOVIE=OUT/'Video/Civilization-Voyage-Demo-EN.mp4'
MOVIE.parent.mkdir(exist_ok=True);shutil.copy2(ROOT/'.impeccable/final-talk/Video/Civilization-Voyage-Demo-EN.mp4',MOVIE)
@lru_cache(maxsize=128)
def font(size,bold=False,kind='sans'):
 if kind=='serif':return ImageFont.truetype('/System/Library/Fonts/Supplemental/Georgia.ttf',int(size))
 if kind=='mono':return ImageFont.truetype('/System/Library/Fonts/Menlo.ttc',int(size))
 return ImageFont.truetype('/System/Library/Fonts/Avenir Next.ttc',int(size),index=0 if bold else 7)
def wrap(value,size,width,bold=False,kind='sans'):
 lines=[];f=font(size,bold,kind)
 for paragraph in str(value).split('\n'):
  line=''
  for word in paragraph.split():
   trial=(line+' '+word).strip()
   if line and f.getlength(trial)>width:lines.append(line);line=word
   else:line=trial
  lines.append(line)
 return lines
class Page:
 def __init__(self,deck,row,index,light=False,hero=False):
  self.row=row;self.index=index;self.light=light;self.fg=INK if light else WHITE;self.muted='526D78' if light else MUTED;self.accent='087F69' if light else GREEN
  self.slide=deck.slides.add_slide(deck.slide_layouts[6]);self.slide.background.fill.solid();self.slide.background.fill.fore_color.rgb=RGBColor.from_string(PAPER if light else INK)
  self.image=Image.new('RGB',(W,H),'#'+(PAPER if light else INK));self.draw=ImageDraw.Draw(self.image)
  if not hero:
   self.text(row['label'],96,66,1500,38,22,self.accent,kind='mono')
   first,_,second=row['en'].partition('\n');self.text(first,96,145,1730,92,72,self.fg,True,minsize=56)
   if second:self.text(second,96,235,1730,92,72,self.accent,True,minsize=56)
   self.text('CV',1660,876,170,140,124,'E3EBE8' if light else '0B2433',True)
 def rect(self,x,y,w,h,color,border=None):
  self.draw.rectangle((x,y,x+w,y+h),fill='#'+color,outline='#'+border if border else None,width=2)
  s=self.slide.shapes.add_shape(MSO_SHAPE.RECTANGLE,Inches(x/144),Inches(y/144),Inches(w/144),Inches(h/144));s.fill.solid();s.fill.fore_color.rgb=RGBColor.from_string(color)
  if border:s.line.color.rgb=RGBColor.from_string(border)
  else:s.line.fill.background()
  return s
 def line(self,x1,y1,x2,y2,color=LINE,width=2):
  self.draw.line((x1,y1,x2,y2),fill='#'+color,width=width)
  s=self.slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT,Inches(x1/144),Inches(y1/144),Inches(x2/144),Inches(y2/144));s.line.color.rgb=RGBColor.from_string(color);s.line.width=Pt(width/2)
 def text(self,value,x,y,w,h,size=38,color=None,bold=False,minsize=28,kind='sans'):
  color=color or self.fg;lines=wrap(value,size,w,bold,kind)
  while (len(lines)*size*1.17>h or any(font(size,bold,kind).getlength(t)>w for t in lines)) and size>minsize:
   size-=1;lines=wrap(value,size,w,bold,kind)
  assert len(lines)*size*1.17<=h+2,(self.index+1,value,lines,size,h)
  for i,line in enumerate(lines):self.draw.text((x,y+i*size*1.17),line,font=font(size,bold,kind),fill='#'+color,anchor='lt')
  shape=self.slide.shapes.add_textbox(Inches(x/144),Inches(y/144),Inches(w/144),Inches(h/144));f=shape.text_frame;f.clear();f.margin_left=f.margin_right=f.margin_top=f.margin_bottom=0;f.word_wrap=False
  for i,line in enumerate(lines):
   p=f.paragraphs[0] if i==0 else f.add_paragraph();p.text=line;p.font.name='Georgia' if kind=='serif' else 'Menlo' if kind=='mono' else 'Avenir Next';p.font.size=Pt(size/2);p.font.bold=bold;p.font.color.rgb=RGBColor.from_string(color);p.line_spacing=Pt(size*1.17/2);p.space_before=p.space_after=Pt(0)
  return shape
 def picture(self,path,x,y,w,h,fill=False):
  img=Image.open(path).convert('RGB')
  if fill:img=ImageOps.fit(img,(int(w),int(h)),method=Image.Resampling.LANCZOS)
  else:img.thumbnail((int(w),int(h)),Image.Resampling.LANCZOS)
  px=x+(w-img.width)/2;py=y+(h-img.height)/2;self.image.paste(img,(int(px),int(py)))
  if fill:
   asset=OUT/f'crop-{self.index}.png';img.save(asset);path=asset
  self.slide.shapes.add_picture(str(path),Inches(px/144),Inches(py/144),width=Inches(img.width/144),height=Inches(img.height/144))
 def note(self,value,x,y,w=1728,size=34):self.text(value,x,y,w,110,size,self.muted,minsize=28)
 def footer(self,value='Current prototype · Sources and speaker notes in this presentation.'):
  self.line(96,1009,1824,1009,'C9D8D5' if self.light else LINE,1);self.text(value,96,1031,1580,33,20,self.muted,minsize=18);self.text(f'{self.index+1:02d}',1750,1030,75,35,22,self.muted,kind='mono')
 def band(self,value,y=904):
  self.rect(96,y,1728,76,self.accent);self.text(value,124,y+18,1672,46,30,INK if not self.light else WHITE,True,minsize=26)
 def finish(self):
  self.slide.notes_slide.notes_text_frame.text=self.row['note_en'];target=OUT/'Previews'/f'{self.index+1:02d}.png';target.parent.mkdir(exist_ok=True);self.image.save(target);return target

def tiles(p,values,y=410):
 for i,(value,label) in enumerate(values):
  x=96+(i%2)*495;yy=y+(i//2)*208;p.rect(x,yy,467,181,PANEL,LINE);p.text(value,x+26,yy+22,410,85,77,GREEN,True);p.text(label,x+28,yy+119,410,43,25,MUTED,minsize=22)
def three(p,items,y=415):
 for i,(label,title,body) in enumerate(items):
  x=96+i*588;p.text(label,x,y,520,52,29,p.accent,True,kind='mono');p.text(title,x,y+91,500,130,46,p.fg,True,minsize=36);p.text(body,x,y+258,500,160,32,p.muted,minsize=28)
def pair(p,left,right):
 for i,(label,title,body) in enumerate([left,right]):
  x=96+i*882;p.rect(x,401,846,468,'E8EFED' if p.light else PANEL,'C9D8D5' if p.light else LINE);p.text(label,x+34,436,778,48,26,p.accent,True,kind='mono');p.text(title,x+34,527,768,128,52,p.fg,True,minsize=40);p.text(body,x+34,704,768,130,34,p.muted,minsize=28)

prs=Presentation();prs.slide_width=Inches(13.333333);prs.slide_height=Inches(7.5);images=[]
for index,row in enumerate(DATA):
 kind=row['kind'];light=kind in ['route','eras','river','upgrades','mechanics','business','pilot'];p=Page(prs,row,index,light,kind in ['cover','ask'])
 if kind=='cover':
  img=Image.open(OUT/'temple-cover.png').convert('RGBA').resize((W,H),Image.Resampling.LANCZOS)
  overlay=Image.new('RGBA',(W,H));d=ImageDraw.Draw(overlay)
  for y in range(H):
   alpha=int(220*(1-min(1,y/760)) if y<760 else 90*((y-760)/320));d.line((0,y,W,y),fill=(7,27,41,alpha))
  img=Image.alpha_composite(img,overlay).convert('RGB');asset=OUT/'temple-cover-composed.png';img.save(asset);p.picture(asset,0,0,W,H)
  p.text(row['label'],96,61,1728,42,22,GREEN,kind='mono');p.text('Civilization Voyage',96,142,1728,147,118,WHITE,kind='serif',minsize=92)
  p.text('Technology changes what we can do.',100,324,1500,71,50,WHITE,minsize=42);p.text('Civilization shapes how we live.',100,390,1500,71,50,GREEN,minsize=42)
  for i,(value,label) in enumerate([('4','ERAS'),('8','CHINA / WORLD ROUTES'),('24','STORY SCENES')]):
   x=96+i*520;p.text(value,x,913,170,88,76,WHITE,True);p.text(label,x+138,942,360,50,23,WHITE,minsize=20)
 elif kind=='snapshot':
  tiles(p,[('4','ERAS'),('8','CHINA / WORLD ROUTES'),('24','CONNECTED SCENES'),('2','RESOURCE BALANCES')])
  p.text('A working prototype',1150,422,660,90,53,WHITE,True);p.note('Characters, sailing, upgrades and endings form one playable loop.',1150,550,660,38);p.line(1150,697,1824,697)
  p.text('The next test',1150,744,650,68,36,GREEN,True);p.note('Can a guided session help learners explain the choices they made?',1150,830,660,34)
 elif kind=='balance':
  pair(p,('SUPPLIES','The means to act','Food, water and material capacity keep the ship moving.'),('TRUST','The will to continue','People keep the arrangements—and the ship—working.'))
  p.note('A fuller hold can still leave a weaker crew. Each gain changes the conditions of the next decision.',96,910,1728,34)
 elif kind=='route':
  stages=[('ISLAND 01','A problem to face'),('ISLAND 02','An inherited choice'),('SHARED CRISIS','An arrangement tested'),('THE SHORE','An account of the journey')]
  for i,(label,body) in enumerate(stages):
   x=96+i*441;p.text(label,x,434,395,55,25,p.accent,True,kind='mono');p.rect(x,537,22,22,p.accent)
   if i<3:p.line(x+36,548,x+419,548,'94B4AB',2)
   p.text(body,x,624,365,180,43,p.fg,True,minsize=35)
  p.band('The final speaker recalls the choices the player actually made.')
 elif kind=='eras':
  for i,(era,capability,question) in enumerate([('AGRICULTURE','Water & surplus','Who receives the water?'),('INDUSTRY','Power & labour','Who shares the gains of production?'),('INFORMATION','Records & communication','Whose experience enters the record?'),('ARTIFICIAL INTELLIGENCE','Prediction & delegation','Who answers for a delegated decision?')]):
   y=391+i*143;p.text(era,96,y+5,545,80,29,p.accent,True,minsize=25);p.text(capability,660,y+5,425,85,30,p.muted,minsize=27);p.text(question,1130,y+5,690,100,36,p.fg,minsize=30);p.line(96,y+119,1824,y+119,'CCDAD5',1)
 elif kind=='comparison':
  pair(p,('INNER SEA','China','Flood-control legends and water sharing; industrial reform; communication; AI and responsibility.'),('OUTER SEA','The world','Grain records; steam power; long-distance messages; computation and delegated judgment.'))
  p.note('Each route moves forward in time. Legends, historical settings and imagined futures remain labelled.',96,910,1728,33)
 elif kind=='river':
  three(p,[('GUN','Defend a village','A higher dike can move the danger downstream.'),('YU','Allocate the water','A working channel needs an agreement about access.'),('DUJIANGYAN','Maintain the system','The agreement depends on continuing work together.')])
  p.band('Li Bing closes the route: an engineering achievement still needs a shared practice.')
 elif kind=='legacy':
  p.rect(96,413,515,357,PANEL,LINE);p.text('CHOICE',126,444,445,45,25,GREEN,True,kind='mono');p.text('Spend now\nto cooperate',126,536,430,163,53,WHITE,True,minsize=42)
  p.line(657,580,751,580,GREEN,5);p.line(728,557,751,580,GREEN,5);p.line(728,603,751,580,GREEN,5);p.rect(800,413,1024,357,PANEL,LINE);p.text('LATER SUPPORT',839,445,920,45,25,GREEN,True,kind='mono');p.text('+3 supplies',839,532,900,130,98,GREEN,True);p.note('Earlier partners help prepare materials for the next scene.',839,690,900,30)
  p.band('At trust ≤20, cooperative support pauses. The relationship has become part of the infrastructure.')
 elif kind=='failure':
  headers=[(96,'BALANCE'),(640,'AT THE LIMIT'),(1210,'COST OF RECOVERY')]
  for x,label in headers:p.text(label,x,410,570,47,25,GREEN,True,kind='mono')
  rows=[('Supplies','≤15: 30% slower\n0: the ship stops','Restore to 35; −20 hull;\nlose one ship tier.'),('Trust','≤20: support pauses\n0: the crew withdraws','Restore to 30;\nlose one outfit tier.')]
  for i,(a,b,c) in enumerate(rows):
   y=501+i*188;p.text(a,96,y,480,100,48,WHITE,True);p.text(b,640,y,520,125,36,WHITE,minsize=31);p.text(c,1210,y,610,125,36,MUTED,minsize=31);p.line(96,y+151,1824,y+151)
  p.band('Recovery also costs 200 score. Or end the voyage and keep the failure as its recorded outcome.')
 elif kind=='upgrades':
  p.picture(ROOT/'.impeccable/bilingual/shipyard.png',890,383,934,582)
  p.text('SHIP REFITS',96,416,700,50,25,p.accent,True,kind='mono');p.text('A greater capacity to act',96,495,720,118,47,p.fg,True,minsize=39);p.note('Supplies fund changes that appear on the sailing ship.',96,638,700,34)
  p.text('CREW OUTFITS',96,787,700,45,25,p.accent,True,kind='mono');p.note('Trust opens a shared identity. It is a threshold, not a currency spent on clothing.',96,857,700,33)
 elif kind=='evidence':
  p.picture(ROOT/'.impeccable/bilingual/picture-background.png',1170,365,654,606)
  for i,(a,b) in enumerate([('Historical context','Supported by named sources and credited images.'),('Playable interpretation','Dialogue and choices are creative reconstructions.'),('Optional image notes','Explain the setting without replacing the original characters.')]):
   y=400+i*188;p.text(a,96,y,965,60,39,WHITE,True);p.note(b,96,y+77,965,32)
 elif kind=='video':
  p.text('Actual game · Prepared saves · Edited demonstration · Synthetic narration',96,339,1728,44,24,MUTED,minsize=22)
  poster=ROOT/'.impeccable/demo-v3/video-poster.png';x,y,w,h=395,390,1130,636;p.picture(poster,x,y,w,h);p.slide.shapes.add_movie(str(MOVIE),Inches(x/144),Inches(y/144),Inches(w/144),Inches(h/144),poster_frame_image=str(poster),mime_type='video/mp4')
 elif kind=='mechanics':
  pair(p,('THE TASK','Can I do it?','Steer, hold position, collect useful objects and verify a sequence.'),('THE DECISION','What will I use it for?','Choose who benefits, who bears the cost and what is carried forward.'))
  p.band('The debrief connects performance to purpose—and today’s decision to the next scene.')
 elif kind=='workflow':
  for i,(date,title,detail) in enumerate([('28 OCT','Framework','Project boundaries and an independent GitHub repository.'),('30 OCT','Handoffs','Design, API contracts and the React / Three.js frontend.'),('LOCAL BUILD','Integration','FastAPI + SQLite, Vite, typed contracts and local worktrees.'),('ITERATION','Playable checks','Saves, desktop installation, history, sound and bilingual display.')]):
   y=392+i*145;p.text(date,96,y,300,55,27,GREEN,True,kind='mono');p.text(title,439,y-4,450,70,40,WHITE,True);p.text(detail,951,y+1,870,100,34,MUTED,minsize=28);p.line(96,y+117,1824,y+117)
 elif kind=='tools':
  pair(p,('A FAMILIAR PATTERN','Lovable / GitHub / local work','Natural-language building, editable code and continued development.'),('THIS PROJECT’S RECORD','Design / contracts / playable checks','Documented local handoffs, integration and repeated revisions to the game.'))
  p.note('Lovable is a workflow comparison. The repository does not establish a Lovable project origin.',96,916,1728,31)
 elif kind=='business':
  three(p,[('01 / FIRST OFFER','A guided session','The game, reviewed background notes, setup support and a facilitator guide.'),('02 / REPEAT USE','A route package','Reusable material for schools or cultural venues, after the pilot shows demand.'),('03 / INSTITUTIONS','A supported installation','Term access or installation support, with delivery effort measured first.')])
  p.band('The buyer pays for an experience a facilitator can reliably deliver. These offers remain to be tested.')
 elif kind=='pilot':
  steps=[('RECRUIT','3 classes × 20 learners'),('PLAY','Complete one connected route'),('EXPLAIN','Benefits, costs and sources'),('RETURN','Request another session')]
  for i,(a,b) in enumerate(steps):
   x=96+i*441;p.rect(x,414,407,210,'E7EFEC','CBDAD4');p.text(a,x+24,446,355,43,24,p.accent,True,kind='mono');p.text(b,x+24,519,355,90,34,p.fg,True,minsize=29)
  p.text('What we need to observe',96,717,800,77,45,p.fg,True);p.note('Explanation quality · Source recognition · Preparation and support time · Repeat demand',96,826,1728,37);p.note('Recruitment target and proposed evaluation—not completed attendance or measured learning gains.',96,925,1728,27)
 elif kind=='economics':
  items=[('¥3,000','ASSUMED SESSION PRICE',150),('¥1,200','ASSUMED DIRECT COST',60),('¥1,800','BEFORE ACQUISITION',90)]
  for i,(a,b,height) in enumerate(items):
   x=96+i*588;p.text(a,x,420,530,130,104,GREEN,True,minsize=88);p.text(b,x,564,530,60,24,MUTED,True,minsize=22);p.rect(x,826-height,510,height,[GREEN,'4382A0','277D74'][i])
  p.note('At an assumed acquisition cost of ¥600, ¥1,200 remains before overhead, tax and development.',96,879,1728,33)
 elif kind=='budget':
  colors=[GREEN,'4B8CAC','D1AC71','546E84'];values=[40,30,20,10];chart=ChartData();chart.categories=['Source review','Facilitation','Hardening','Hosting'];chart.add_series('Budget',values)
  shape=p.slide.shapes.add_chart(XL_CHART_TYPE.DOUGHNUT,Inches(160/144),Inches(415/144),Inches(560/144),Inches(560/144),chart);ch=shape.chart;ch.has_legend=False;ch.plots[0].hole_size=72;ch.has_title=False;ch._chartSpace.append(parse_xml('<c:spPr '+nsdecls('c','a')+'><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>'))
  for point,color in zip(ch.series[0].points,colors):point.format.fill.solid();point.format.fill.fore_color.rgb=RGBColor.from_string(color);point.format.line.fill.background()
  angle=-90
  for v,c in zip(values,colors):p.draw.pieslice((160,415,720,975),angle,angle+v*3.6,fill='#'+c);angle+=v*3.6
  p.draw.ellipse((238,493,642,897),fill='#'+INK);p.text('¥30K',276,641,390,110,86,WHITE,True);p.text('PILOT SCENARIO',259,755,390,40,22,MUTED,kind='mono')
  for i,(v,c,label) in enumerate(zip(values,colors,['Sources & content review','Facilitation & evaluation','Product hardening','Hosting & support'])):
   y=427+i*123;p.text(label,877,y,700,55,31,WHITE,minsize=29);p.text(f'{v}%',1686,y,135,55,34,WHITE,True);p.rect(879,y+62,740,17,LINE);p.rect(879,y+62,740*v/100,17,c)
  p.note('Illustrative allocation · Not funds raised or supplier quotations.',877,937,940,26)
 elif kind=='roadmap':
  three(p,[('MONTH 1','Prepare the pilot','Recruit classrooms, review sources and prepare facilitators.'),('MONTHS 2–3','Run and revise','Collect explanations, completion data and observed delivery costs.'),('MONTHS 4–6','Test repeat use','Consider route packs or licences when facilitators ask to return.')])
  p.band('Expand after comprehension, manageable delivery effort and repeat demand become visible.')
 elif kind=='ask':
  p.line(96,618,1824,618,LINE,3)
  for x,label in [(96,'REVIEW THE STORY'),(740,'PLAY THE ROUTE'),(1384,'REFLECT TOGETHER')]:
   p.rect(x,607,22,22,GREEN);p.text(label,x,675,435,64,27,GREEN,True,kind='mono',minsize=24)
  p.note('A route people can question, use and improve together.',96,769,1728,40)
  p.rect(0,0,W,440,INK);p.text(row['label'],96,67,1500,45,23,GREEN,kind='mono');p.text('Three classrooms.',96,151,1728,140,109,WHITE,kind='serif',minsize=88);p.text('A chance to test what we have built.',96,312,1728,90,56,GREEN,minsize=46)
  p.rect(96,845,1728,139,PANEL,LINE);p.text('Facilitators · Historical reviewers · A route people can use together',126,881,1668,70,38,WHITE,minsize=31)
 if kind not in ['cover','ask','video']:
  p.footer('Illustrative pilot assumptions · Proposed offer and evaluation.' if kind in ['business','pilot','economics','budget','roadmap'] else 'Civilization Voyage · Historical sources and project evidence in the speaker notes.')
 images.append(p.finish())
folder=OUT/'English';folder.mkdir(exist_ok=True);target=folder/'Civilization-Voyage-Deep-Sea-Pitch-EN.pptx';prs.save(target)
for s in Presentation(target).slides:
 for shape in s.shapes:
  if shape.has_text_frame and shape.text.strip():
   assert not re.search(r'[\u3400-\u9fff]|TODO|TBD',shape.text)
   assert shape.left>=0 and shape.top>=0 and shape.left+shape.width<=prs.slide_width+100 and shape.top+shape.height<=prs.slide_height+100,shape.text
pdf=fitz.open()
for path in images:
 page=pdf.new_page(width=960,height=540);page.insert_image(page.rect,filename=str(path))
pdf.save(folder/'Civilization-Voyage-Presentation.pdf',deflate=True,garbage=4)
columns=4;sheet=Image.new('RGB',(columns*404,math.ceil(len(images)/columns)*246),'#172D39');d=ImageDraw.Draw(sheet)
for i,path in enumerate(images):
 im=Image.open(path);im.thumbnail((384,216));x=(i%columns)*404+10;y=(i//columns)*246+22;sheet.paste(im,(x,y));d.text((x,y-18),f'{i+1:02d}',fill='#EDF6F5')
sheet.save(OUT/'contact-sheet.jpg',quality=94)
(OUT/'presentation-metadata.json').write_text(json.dumps({'slides':len(DATA),'languages':['en'],'temple':'Actual native embark scene; HTML controls removed for capture','visual_reference':'Public harbourmind.ai palette, serif hero and deep-sea composition; user-supplied BP section hierarchy, highlighted theses, product snapshot, business model, funnel, unit economics, budget and roadmap','private_reference_financials_reused':False,'movie_embedded':True},indent=2))
print('Built',len(DATA),'slides:',target,flush=True)
