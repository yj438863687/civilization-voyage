"""Six-slide business presentation aligned with the presenter's speaking script."""
import json,re
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches
import fitz
from PIL import Image
import presentation_core as core
from presentation_core import Page,GREEN,WHITE,INK
from presentation_plan import calculate_plan
ROOT=Path(__file__).resolve().parents[1];OUT=Path.home()/'Desktop/文明航程-个人结尾-6页';OUT.mkdir(exist_ok=True)
BASE=ROOT/'.impeccable/personal-closing';BASE.mkdir(exist_ok=True)
M=json.loads((ROOT/'docs/business-assumptions.json').read_text())
PLAN=calculate_plan(M)
rows=json.loads((ROOT/'docs/personal-closing.json').read_text())
WORKFLOW=ROOT/'.impeccable/presentation-workflow'
def crop_picture(p,path,x,y,w,h,box):
 im=Image.open(path).convert('RGB');iw,ih=im.size;l,top,right,bottom=box
 if (right-l)/(bottom-top)>w/h:
  trim=((right-l)-(bottom-top)*w/h)/2;l+=trim;right-=trim
 else:
  trim=((bottom-top)-(right-l)*h/w)/2;top+=trim;bottom-=trim
 preview=im.crop((l,top,right,bottom)).resize((int(w),int(h)),Image.Resampling.LANCZOS)
 p.image.paste(preview,(int(x),int(y)))
 shape=p.slide.shapes.add_picture(str(path),Inches(x/144),Inches(y/144),width=Inches(w/144),height=Inches(h/144))
 shape.crop_left=l/iw;shape.crop_top=top/ih;shape.crop_right=1-right/iw;shape.crop_bottom=1-bottom/ih
 return shape
for lang in ['en','zh']:
 core.LANG=lang;core.font.cache_clear();core.OUT=BASE/lang;core.OUT.mkdir(exist_ok=True);zh=lang=='zh';t=lambda a,b:a if zh else b
 prs=Presentation();prs.slide_width=Inches(13.333333);prs.slide_height=Inches(7.5);pics=[]
 def text(p,s,x,y,w,h=100,size=37,color=None):p.text(s,x,y,w,h,size,color or p.fg,minsize=25)
 def label(p,s):text(p,s,96,64,1728,48,24,p.accent)
 def title(p,s,size=77):p.text(s,96,155,1728,190,size,p.fg,kind='serif',minsize=52)
 def end(p,n,business=False):p.footer(t('文明航程｜商业计划','Civilization Voyage | Business plan'))
 for i,r in enumerate(rows):
  note=r[lang+'_script']
  if i==1:note+='\n\nReference sources:\nhttps://www.ubisoft.com/en-ca/game/assassins-creed/discovery-tour\nhttps://education.minecraft.net/en-us/discover/what-is-minecraft'
  if i==2:
   media=json.loads((ROOT/'apps/web/src/world/backgroundMedia.json').read_text())
   note+='\n'+'\n'.join(f"{k}: {media[k]['author']} | {media[k]['license']} | {media[k]['url']} | {media[k]['licenseUrl']}" for k in ['watt','cable'])
  p=Page(prs,{'note_en':note},i,i==3,True)
  if i!=5:label(p,r['label_'+lang]);title(p,r[lang])
  if i==0:
   crop_picture(p,WORKFLOW/'workflow-review.jpg',96,335,1110,560,(20,145,1955,1125))
   crop_picture(p,WORKFLOW/'workflow-contracts.jpg',1260,335,564,560,(18,135,1260,1340))
   text(p,t('真实本机协作记录｜设计审读、接口约定与3D实现','ACTUAL LOCAL WORKFLOW · Design review, API contracts and 3D development'),96,906,1728,42,25,p.muted)
   text(p,t('Lovable：想法 · Claude：设计 · Codex：接口 · Grok：前端与3D','Lovable: ideas · Claude: design · Codex: APIs · Grok: frontend + 3D'),96,961,1728,40,27,GREEN)
  elif i==1:
   names=['Discovery Tour','Minecraft Education',t('文明航程','Civilization Voyage')]
   strength=t(['历史探索','课堂平台','连贯的文化航程'],['Historical exploration','Classroom platform','Connected cultural journeys'])
   fit=t(['细致的历史世界与专家导览。','覆盖多学科的课程与教师工具。','中外历史相互参照；选择影响后续章节。'],['Detailed historical worlds and expert-guided tours.','Lessons and teaching tools across many subjects.','China and world histories. Choices that shape the next chapter.'])
   for j in range(3):
    x=96+j*588
    if j==2:p.rect(x-18,343,550,519,'103F43')
    text(p,names[j],x,370,510,100,37,GREEN);text(p,t('长处','STRENGTH'),x,493,500,45,24,p.muted);text(p,strength[j],x,548,500,118,32)
    text(p,t('用户获得什么','WHAT USERS GET'),x,682,500,45,23,p.muted);text(p,fit[j],x,735,500,123,30)
   text(p,t('我们的区别：一段航程，连贯选择，持续的后果。','Our difference: one journey, connected choices, consequences that follow you.'),96,897,1728,78,35,GREEN)
   text(p,t('现有产品：4个时代 · 8条航线 · 24个场景','IN THE APP: 4 eras · 8 routes · 24 scenes'),96,970,1728,35,23,p.muted)
  elif i==2:
   for j,key in enumerate(['player','institution','museum']):
    x=96+j*588
    if j==0:p.picture(ROOT/'.impeccable/demo-v3/raw-sync/opening-poster.png',x,345,500,281)
    elif j==1:
     p.rect(x,345,500,281,'F1F5F4');p.picture(ROOT/'apps/web/public/background/watt.jpg',x+18,367,145,198)
     p.text(t('课堂讨论指南','CLASSROOM GUIDE'),x+184,367,292,54,25,INK,minsize=23)
     p.text(t('学生先体验，\n教师再引导讨论。','Play the story.\nDiscuss the choice.'),x+184,435,292,110,29,INK,minsize=25)
     p.text(t('资料 / 活动 / 回顾','Sources / lesson / review'),x+184,570,292,35,21,'087F69',minsize=21)
    else:
     p.rect(x,345,500,281,'163748');p.picture(ROOT/'apps/web/public/background/cable.jpg',x+16,359,468,155)
     p.text(t('地方故事互动展陈','MUSEUM EXPERIENCE'),x+20,531,460,42,26,WHITE,minsize=24)
     p.text(t('一个主题，三幕故事','One local theme. Three scenes.'),x+20,578,460,42,23,GREEN,minsize=22)
    names=t(['个人游戏','学校年度服务','文博主题项目'],['FULL GAME','SCHOOL / YEAR','MUSEUM PROJECT'])
    units=t(['新增故事包：¥28','指南 · 2次培训 · 约定支持','1主题 · 3场景 · 2轮审读'],['Story packs: CNY28','Guides · 2 sessions · agreed support','1 theme · 3 scenes · 2 reviews'])
    text(p,names[j],x,657,500,62,29,GREEN);text(p,f"¥{M['price'][key]:,}",x,735,500,103,67,GREEN);text(p,units[j],x,856,500,79,27,p.muted)
   text(p,t('产品与定价规划｜左：当前游戏；中、右：服务设计。','Product and pricing plan | Left: current game. Centre/right: service designs.'),96,954,1728,43,24,p.muted)
  elif i==3:
   s=PLAN['base'];revenue=s['revenue'];contribution=s['contribution'];balance=s['balance'];money=lambda v:f'¥{v:,.0f}'
   text(p,t(f"基准：{s['player']:,}名玩家 + {s['institution']}家机构 + {s['museum']}个文博项目",f"BASE: {s['player']:,} players + {s['institution']} institutions + {s['museum']} museum projects"),96,347,1728,76,34)
   bars=[(0,revenue,money(revenue),t('收入','Sales'),'377DAD'),(contribution,revenue,'-'+money(s['direct_cost']),t('交付与获客','Delivery + sales costs'),'B58549'),(0,contribution,money(contribution),t('扣除直接成本后','Left after direct costs'),'087F69'),(balance,contribution,'-'+money(PLAN['fixed_cost']),t('开发、内容、运营','Build + content + operations'),'B58549'),(min(balance,0),max(balance,0),('-' if balance<0 else '')+money(abs(balance)),t('首年经营余额','Year-one balance'),'B9694F' if balance<0 else '087F69')]
   base=765;scale=282/revenue;p.line(96,base,1824,base,'9BB4BC',1)
   for j,(lo,hi,value,word,color) in enumerate(bars):
    x=96+j*350;top=base-hi*scale;p.rect(x,top,238,(hi-lo)*scale,color);text(p,value,x,top-55,330,50,33,color);text(p,word,x,853,320,78,28,p.muted)
    if j<4:
     endval=[revenue,contribution,contribution,balance][j];y=base-endval*scale;p.line(x+238,y,x+350,y,'9BB4BC',1)
   text(p,t('首年税前测算｜收入不含新增故事包与次年续费；周转和储备另列资金规划。','Year-one, pre-tax | Excludes story packs and later renewals. Cash buffers appear on the next slide.'),96,954,1728,48,24,p.muted)
  elif i==4:
   text(p,f"¥{PLAN['funding_total']:,}",96,374,740,133,93,GREEN);text(p,t(f"全年资金规划：首期 ¥{PLAN['initial_release']:,}",f"12-MONTH CASH PLAN: CNY{PLAN['initial_release']:,} first"),96,525,810,91,34)
   for j,(a,b) in enumerate(t([('让玩家回来','完成航程，再买新故事'),('让伙伴持续使用','学校续费、文博项目交付'),('积累文化内容','复用研究、故事与游戏系统')],[('BRING PLAYERS BACK','Finish a voyage. Return for new stories.'),('BUILD REPEAT BUSINESS','School renewals. Museum delivery.'),('GROW THE STORY LIBRARY','Reuse research, content and game systems.')])):
    y=370+j*153;text(p,a,1040,y,780,65,33,GREEN);text(p,b,1040,y+65,780,70,29)
   for j,(v,word,c) in enumerate([(PLAN['fixed_cost'],t('固定工作','Fixed work'),'35C5A5'),(PLAN['delivery_float'],t('交付周转','Delivery float'),'377DAD'),(PLAN['reserve'],t('风险储备','Reserve'),'B58549')]):
    y=648+j*65;text(p,word,96,y,290,43,25,p.muted);p.rect(395,y+7,v/PLAN['fixed_cost']*300,16,c);text(p,f'¥{v:,}',725,y,260,45,28,c)

   p.line(96,862,1824,862,GREEN,2);text(p,t('每个项目，都应为下一个故事留下积累。','Each project should help fund the next story.'),96,904,1728,94,38,GREEN)
  elif i==5:
   p.picture(WORKFLOW/'closing-industry.png',0,0,1920,1080,fill=True)
   p.text(r[lang],96,72,1728,120,88,WHITE,kind='serif',minsize=72)
   p.text(t('愿我们驶向的未来，值得抵达。','Choose a future worth arriving in.'),100,217,1720,76,40,WHITE,minsize=32)
  if i!=5:end(p,i+1)
  pics.append(p.finish())
 tag=lang.upper();ppt=OUT/f'Civilization-Voyage-My-Part-{tag}.pptx';prs.save(ppt)
 pdf=fitz.open()
 for pic in pics:page=pdf.new_page(width=960,height=540);page.insert_image(page.rect,filename=str(pic))
 pdf.save(OUT/f'Civilization-Voyage-My-Part-{tag}.pdf')
 timing=' / '.join(f"{r['seconds']//60}:{r['seconds']%60:02d}" for r in rows)
 textfile=t(f'商业演讲稿｜约8分钟｜{timing}\n\n',f'BUSINESS PRESENTATION | About 8 minutes | {timing}\n\n')+'\n\n'.join(f"SLIDE {i+1} — {r[lang]}\n\n{r[lang+'_script']}" for i,r in enumerate(rows))
 (OUT/f'Speech-{tag}.txt').write_text(textfile,encoding='utf-8')
 if lang=='en':
  rehearsal='排练版｜方括号是看图提示，不朗读。六页合计约8分钟。\n\n'+'\n\n'.join(f"第{i+1}页｜{r['seconds']//60}:{r['seconds']%60:02d}\n"+'\n\n'.join('【'+part['cue_zh']+'】\n'+part['en'] for part in r['rehearsal']) for i,r in enumerate(rows))
  (OUT/'Speech-Rehearsal-看图提示.txt').write_text(rehearsal,encoding='utf-8')
 assert len(Presentation(ppt).slides)==6
 print(ppt)
print('English words:',sum(len(re.findall(r'\b[\w’-]+\b',r['en_script'])) for r in rows))
