"""Six-slide personal closing: AI production, product thesis and commercial discipline."""
import json,re
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches
import fitz
import presentation_core as core
from presentation_core import Page,GREEN,WHITE,INK
from presentation_business import render as business
ROOT=Path(__file__).resolve().parents[1];OUT=Path.home()/'Desktop/文明航程-个人结尾-6页';OUT.mkdir(exist_ok=True)
BASE=ROOT/'.impeccable/personal-closing';BASE.mkdir(exist_ok=True)
FULL=json.loads((ROOT/'docs/humanities-introduction.json').read_text());M=json.loads((ROOT/'docs/business-assumptions.json').read_text())
rows=json.loads((ROOT/'docs/personal-closing.json').read_text())
for lang in ['en','zh']:
 core.LANG=lang;core.font.cache_clear();core.OUT=BASE/lang;core.OUT.mkdir(exist_ok=True);zh=lang=='zh';t=lambda a,b:a if zh else b
 prs=Presentation();prs.slide_width=Inches(13.333333);prs.slide_height=Inches(7.5);pics=[]
 def text(p,s,x,y,w,h=100,size=37,color=None):p.text(s,x,y,w,h,size,color or p.fg,minsize=25)
 def label(p,s):text(p,s,96,64,1728,48,24,p.accent)
 def title(p,s,size=77):p.text(s,96,155,1728,190,size,p.fg,kind='serif',minsize=52)
 def end(p,n,business=False):p.footer(t('文明航程｜个人结尾 · 商业数字为规划假设','Civilization Voyage | Personal closing · Commercial figures are assumptions'))
 for i,r in enumerate(rows):
  note=r[lang+'_script']
  if i==1:note+='\nSources: https://www.ubisoft.com/en-ca/game/assassins-creed/discovery-tour ; https://education.minecraft.net/en-us/discover/what-is-minecraft . Comparison is purpose-specific; superior outcomes are untested.'
  if i==2:
   media=json.loads((ROOT/'apps/web/src/world/backgroundMedia.json').read_text())
   note+='\n'+'\n'.join(f"{k}: {media[k]['author']} | {media[k]['license']} | {media[k]['url']} | {media[k]['licenseUrl']}" for k in ['watt','cable'])
  if i in [3,4]:note+='\n'+FULL[19 if i==3 else 21]['note_'+lang]
  p=Page(prs,{'note_en':note},i,i==3,True)
  if i!=5:label(p,r['label_'+lang]);title(p,r[lang])
  if i==0:
   p.picture(ROOT/'.impeccable/demo-v3/raw-sync/opening-poster.png',950,370,874,491)
   for j,(a,b) in enumerate(t([('设计与接口','先确定世界，再约定连接方式'),('本机实现与测试','把3D、故事与存档接起来'),('内容判断','核对历史，设计选择与后果')],[('DESIGN / APIs','Define the world and how its parts connect.'),('BUILD / TEST','Connect 3D, stories and saved progress locally.'),('EDITORIAL JUDGMENT','Check history and design meaningful consequences.')])):
    y=384+j*180;text(p,a,96,y,780,60,34,GREEN);text(p,b,96,y+72,780,95,32)
   text(p,t('AI辅助制作；历史与体验的责任由人承担。','AI assists production. People own the history and experience.'),96,925,1728,60,30,GREEN)
  elif i==1:
   names=['Discovery Tour','Minecraft Education',t('文明航程','Civilization Voyage')]
   strength=t(['历史世界的深度与专家导览','现成课程、跨学科与教师工具','4时代、8航线、24场景'],['Historical depth and expert-guided worlds','Ready-made lessons, many subjects, teaching tools','4 eras, 8 routes, 24 scenes'])
   fit=t(['围绕特定地区与时代；中外技术文明的连贯比较仍需编排。','适用主题广；我们的跨时代故事需要另行选材与串联。','预先组织中外故事；选择改变后续支援，回港读取实际决定。'],['Focused on particular places and periods; our China/world theme needs an added structure.','Broad scope; our connected historical journey still needs selection and sequencing.','China/world stories already connected; choices affect support and are recalled at shore.'])
   for j in range(3):
    x=96+j*588
    if j==2:p.rect(x-18,343,550,519,'103F43')
    text(p,names[j],x,370,510,100,37,GREEN);text(p,t('长处','STRENGTH'),x,493,500,45,24,p.muted);text(p,strength[j],x,548,500,118,32)
    text(p,t('与本项目目标的关系','FIT FOR OUR PURPOSE'),x,682,500,45,23,p.muted);text(p,fit[j],x,735,500,123,28)
   text(p,t('我们的区别：一段航程，连贯选择，持续的后果。','Our difference: one journey, connected choices, consequences that follow you.'),96,897,1728,78,35,GREEN)
   text(p,t('已有结构；学习效果与备课节省仍需验证。','Structure implemented; learning gains and preparation savings still need testing.'),96,970,1728,35,22,p.muted)
  elif i==2:
   # Let the shared visual renderer draw the entire page on a fresh slide.
   slideid=prs.slides._sldIdLst[-1];prs.part.drop_rel(slideid.rId);prs.slides._sldIdLst.remove(slideid)
   p=Page(prs,{'note_en':note},i,False,True)
   item=dict(FULL[16]);item[lang]=r[lang];item['section_'+lang]=r['label_'+lang]
   business(p,item,i,lang,ROOT/'.impeccable/demo-v3/raw-sync',label,title,end)
  elif i==3:
   text(p,t('基准：2,000名玩家 + 10家机构 + 2个文博项目','BASE: 2,000 players + 10 institutions + 2 museum projects'),96,347,1728,76,34)
   bars=[(0,376000,'¥376,000',t('收入','Revenue'),'377DAD'),(160800,376000,'-¥215,200',t('交付与获客','Delivery + acquisition'),'B58549'),(0,160800,'¥160,800',t('贡献','Contribution'),'087F69'),(-79200,160800,'-¥240,000',t('固定投入','Fixed investment'),'B58549'),(-79200,0,'-¥79,200',t('经营测算余额','Model balance'),'B9694F')]
   base=765;scale=.00075;p.line(96,base,1824,base,'9BB4BC',1)
   for j,(lo,hi,value,word,color) in enumerate(bars):
    x=96+j*350;top=base-hi*scale;p.rect(x,top,238,(hi-lo)*scale,color);text(p,value,x,top-55,330,50,33,color);text(p,word,x,853,320,78,28,p.muted)
    if j<4:
     endval=[376000,160800,160800,-79200][j];y=base-endval*scale;p.line(x+238,y,x+350,y,'9BB4BC',1)
   text(p,t('12个月税前情景；非实际营收。下一步验证需求、获客与交付成本。','12-month pre-tax scenario, not actual revenue. Validate demand, acquisition and delivery.'),96,954,1728,48,25,p.muted)
  elif i==4:
   text(p,'¥360,000',96,374,740,133,93,GREEN);text(p,t('资金规划：先投入 ¥120,000','CASH PLAN: release CNY120,000 first'),96,525,810,91,34)
   for j,(a,b) in enumerate(t([('先让人愿意回来','体验完成、主动回访'),('再让交易成立','真实支付、交付成本'),('再扩展文化内容','新故事、伙伴复用')],[('EARN THE RETURN','Completion and voluntary return'),('PROVE THE PURCHASE','Real payment and delivery cost'),('GROW THE CATALOGUE','New stories and repeat partners')])):
    y=370+j*153;text(p,a,1040,y,780,65,33,GREEN);text(p,b,1040,y+65,780,70,29)
   for j,(v,word,c) in enumerate([(240000,t('固定工作','Fixed work'),'35C5A5'),(90000,t('交付周转','Delivery float'),'377DAD'),(30000,t('风险储备','Reserve'),'B58549')]):
    y=648+j*65;text(p,word,96,y,290,43,25,p.muted);p.rect(395,y+7,v/240000*300,16,c);text(p,f'¥{v:,}',725,y,260,45,28,c)

   p.line(96,862,1824,862,GREEN,2);text(p,t('技术让我们能够创造；值得留下什么，由我们决定。','Technology gives us the ability to create. We decide what is worth keeping.'),96,904,1728,94,38,GREEN)
  elif i==5:
   p.picture(ROOT/'.impeccable/harbour-talk/temple-cover-composed.png',0,0,1920,1080,fill=True)
   p.text(r[lang],96,72,1728,120,88,WHITE,kind='serif',minsize=72)
   p.text(t('让历史成为可以参与的文化。','History to explore. Choices to live with.'),100,217,1720,76,40,WHITE,minsize=32)
  if i not in [2,5]:end(p,i+1)
  pics.append(p.finish())
 tag=lang.upper();ppt=OUT/f'Civilization-Voyage-My-Part-{tag}.pptx';prs.save(ppt)
 pdf=fitz.open()
 for pic in pics:page=pdf.new_page(width=960,height=540);page.insert_image(page.rect,filename=str(pic))
 pdf.save(OUT/f'Civilization-Voyage-My-Part-{tag}.pdf')
 textfile=t('个人结尾演讲稿｜约8分钟｜按1:20 / 1:40 / 1:50 / 1:40 / 1:00 / 0:30排练\n\n','PERSONAL CLOSING | About 8 minutes | Rehearse: 1:20 / 1:40 / 1:50 / 1:40 / 1:00 / 0:30\n\n')+'\n\n'.join(f"SLIDE {i+1} — {r[lang]}\n\n{r[lang+'_script']}" for i,r in enumerate(rows))
 (OUT/f'Speech-{tag}.txt').write_text(textfile,encoding='utf-8')
 if lang=='en':
  rehearsal='排练版｜方括号是看图提示，不朗读。六页合计约8分钟。\n\n'+'\n\n'.join(f"第{i+1}页｜{r['seconds']//60}:{r['seconds']%60:02d}\n"+'\n\n'.join('【'+part['cue_zh']+'】\n'+part['en'] for part in r['rehearsal']) for i,r in enumerate(rows))
  (OUT/'Speech-Rehearsal-看图提示.txt').write_text(rehearsal,encoding='utf-8')
 assert len(Presentation(ppt).slides)==6
 print(ppt)
print('English words:',sum(len(re.findall(r'\b[\w’-]+\b',r['en_script'])) for r in rows))
