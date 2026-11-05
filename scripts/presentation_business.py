"""Editable, bilingual business charts driven by one explicit assumption model."""
import json
from pathlib import Path
from presentation_core import GREEN,WHITE,INK
ROOT=Path(__file__).resolve().parents[1]
MODEL=json.loads((ROOT/'docs/business-assumptions.json').read_text())
COLORS=['087F69','377DAD','B58549']
def render(p,row,index,lang,raw,label,title,end):
 zh=lang=='zh';t=lambda a,b:a if zh else b;k=row['kind'];m=MODEL
 label(p,row.get('section_'+lang,t('BP · 产品与使用场景','BP · PRODUCT AND CONTEXT')));title(p,row[lang],size=73)
 def txt(v,x,y,w,h=80,size=33,color=None):p.text(v,x,y,w,h,size,color or p.fg,minsize=23)
 def foot(v):txt(v,96,936,1728,66,25,p.muted);end(p,index+1,True)
 def money(n):return f'¥{n:,.0f}'
 if k=='bp_audience':
  p.picture(raw/'interaction-poster.png',96,355,1050,591)
  for j,(a,b) in enumerate(zip(t(['个人玩家','教育机构','文博伙伴'],['PLAYERS','EDUCATORS','MUSEUMS']),t(['完整游戏与新增故事','可组织的内容与讨论','地方文化的参与式表达'],['Game and story expansions','Content for organized discussion','Participatory cultural interpretation']))):
   y=395+j*180;txt(a,1230,y,590,65,40,GREEN);txt(b,1230,y+75,590,100,31)
  foot(t('画面来自当前游戏；三种商业交付方式为规划。','Current-game screenshot; the three commercial packages are proposals.'))
 elif k=='bp_scenarios':
  names=t(['游戏','教育服务','文博合作'],['Game','Education','Museums'])
  for j,(name,c) in enumerate(zip(names,COLORS)):p.rect(96+j*300,357,23,23,c);txt(name,133+j*300,349,255,50,26)
  maxrev=max(s['revenue'] for s in m['scenarios'])
  for j,s in enumerate(m['scenarios']):
   y=451+j*143;txt(s['name_'+lang],96,y,205,60,35)
   x=340
   for key,c in zip(['player','institution','museum'],COLORS):
    w=s[key]*m['price'][key]/maxrev*1030
    if w:p.rect(x,y,w,50,c)
    x+=w
   txt(money(s['revenue']),1430,y-6,394,70,46,p.accent)
   txt(t(f"{s['player']:,}名玩家 / {s['institution']}家机构 / {s['museum']}个项目",f"{s['player']:,} players / {s['institution']} institutions / {s['museum']} projects"),340,y+66,1100,49,25,p.muted)
  foot(t('12个月收入情景；统一单价与完整交付口径；未计续约与新增故事包。','12-month revenue scenarios at constant prices; no renewals or expansion sales.'))
 elif k=='bp_benchmarks':
  vals=[('$19.99','Discovery Tour',t('Ancient Greece · 美国商店买断','Ancient Greece · US store purchase')),('$5.04','Minecraft Education',t('合格教育机构 · 每用户每年','Eligible education · per user/year')),('$36','Minecraft Education',t('商业组织 · 每用户每年','Commercial · per user/year'))]
  for j,(price,name,unit) in enumerate(vals):
   x=96+j*588;txt(price,x,404,500,130,85,p.accent);txt(name,x,565,500,100,35);txt(unit,x,685,500,120,30)
  txt(t('我们的定位：中外文化探索 + 选择与后果；延伸为游玩、教学与文博叙事。','Our position: Chinese and world cultures, explored through choices and consequences.\nA foundation for play, teaching and museum storytelling.'),96,839,1728,85,31,p.accent)
  foot(t('来源：Ubisoft Store / Minecraft Education官网，2026-11-05；不同产品与计费单位。','Sources: Ubisoft Store / Minecraft Education, 2026-11-05; different products and units.'))
 elif k=='bp_pricing':
  photos=['opening-poster.png','interaction-poster.png','routes-poster.png']
  titles=t(['个人完整游戏','机构年度服务','文博主题合作'],['FULL GAME','EDUCATION / YEAR','MUSEUM PROJECT'])
  units=t(['新增故事包拟价 ¥28','指南、2次培训、限定支持','1个主题 / 3个场景 / 2轮审读'],['Expansion test price: CNY28','Guides, 2 sessions, bounded support','1 theme / 3 scenes / 2 reviews'])
  for j,(key,photo,name,unit) in enumerate(zip(['player','institution','museum'],photos,titles,units)):
   x=96+j*588
   if j==0:
    p.picture(raw/photo,x,345,500,281)
   elif j==1:
    p.rect(x,345,500,281,'F1F5F4')
    p.picture(ROOT/'apps/web/public/background/watt.jpg',x+18,367,145,198)
    txt(t('工业时代 · 讨论指南','INDUSTRY / DISCUSSION'),x+184,367,292,54,25,INK)
    txt(t('效率提高以后，\n谁获得更多休息？','Who gains time\nwhen work gets faster?'),x+184,435,292,90,28,INK)
    txt(t('资料 / 讨论 / 回顾','Sources / discuss / reflect'),x+184,557,292,48,23,'087F69')
   else:
    p.rect(x,345,500,281,'163748')
    p.picture(ROOT/'apps/web/public/background/cable.jpg',x+16,359,468,155)
    txt(t('跨洋通信 · 主题展陈','OCEAN CABLE / EXHIBIT'),x+20,531,460,42,26,WHITE)
    txt(t('史料解说 / 三幕互动故事','Interpretation / three story scenes'),x+20,578,460,42,23,GREEN)
   txt(name,x,657,500,62,29,GREEN);txt(money(m['price'][key]),x,735,500,103,67,GREEN);txt(unit,x,856,500,79,27,p.muted)
  foot(t('拟议价格；左为游戏实录，中、右为教育与文博交付示意，尚未上线。','Proposed CNY prices. Left: actual game. Centre/right: proposed service concepts.'))
 elif k=='bp_funnel':
  for j,(v,name,w) in enumerate(zip(['100,000','10,000','2,000'],t(['合格访问','进入体验','购买游戏'],['QUALIFIED VISITS','TRY THE GAME','PURCHASE']),[950,710,470])):
   y=363+j*172;x=96+(950-w)/2;p.rect(x,y,w,129,['16475B','176C75','087F69'][j]);txt(v,x+25,y+16,w-50,68,49,WHITE);txt(name,x+25,y+86,w-50,40,25,WHITE)
  txt(t('10% 进入体验','10% start a trial'),1185,407,620,75,40,GREEN);txt(t('20% 体验后购买','20% of trials purchase'),1185,515,620,100,40,GREEN)
  txt(t('¥18 / 付费玩家','CNY18 / acquired buyer'),1185,670,620,80,40);txt(t('基准获客预算 ¥36,000','Base acquisition budget: CNY36,000'),1185,777,620,105,32)
  foot(t('假设流程图，面积不按人数比例；团队工时、渠道与退款另计。','Assumed flow; shapes are not proportional to counts. Team effort and channel costs separate.'))
 elif k=='bp_economics':
  s=m['scenarios'][1];values=[s['revenue'],s['contribution'],m['fixed_cost']];labs=t(['收入','扣交付与获客后','固定投入'],['REVENUE','CONTRIBUTION','FIXED COST'])
  for j,(val,lab,c) in enumerate(zip(values,labs,['377DAD','087F69','B58549'])):
   x=96+j*360;hh=val/400000*370;p.rect(x,825-hh,250,hh,c);txt(money(val),x,825-hh-64,330,55,35);txt(lab,x,847,320,65,25)
  p.line(96,827,1135,827,p.muted,1)
  txt(t('基准经营测算余额','BASE MODEL BALANCE'),1240,370,584,85,31,p.muted);txt('-¥79,200',1240,490,584,110,71,'B9694F')
  txt(t('谨慎：-¥205,800\n扩展：+¥144,000','Cautious: -CNY205,800\nExpansion: +CNY144,000'),1240,665,584,137,34)
  foot(t('单位贡献：游戏 ¥32.4 / 机构 ¥6,000 / 文博 ¥18,000；税前假设，非现金流。','Unit contribution: game CNY32.4 / education CNY6,000 / museum CNY18,000; pre-tax model.'))
 elif k=='bp_budget':
  total=sum(a['amount'] for a in m['budget']);txt(money(total),96,373,750,125,94,p.accent);txt(t('12个月资金规划上限','12-MONTH CASH ENVELOPE'),96,519,750,80,31)
  txt(t('先释放 ¥120,000\n再按验证结果投入 ¥240,000','Release CNY120,000 first\nStage the remaining CNY240,000'),96,674,740,151,39)
  for j,a in enumerate(m['budget']):
   y=366+j*103;txt(a[lang],970,y,430,52,29);txt(money(a['amount']),1480,y,344,52,34,p.accent);p.rect(970,y+61,a['amount']/total*810,14,['087F69','377DAD','B58549','71998B','A4AAA8'][j])
  foot(t('¥240,000固定投入 + ¥90,000周转 + ¥30,000储备；周转与储备不重复计为费用。','CNY240k fixed + 90k float + 30k contingency; reserves are not additional expenses.'))
 else:raise ValueError(k)
