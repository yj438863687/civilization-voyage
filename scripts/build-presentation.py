#!/usr/bin/env python3
"""Build editable EN/ZH PowerPoint decks, speaker notes and print-ready HTML."""
import argparse
import html
import json
import math
from pathlib import Path
import shutil

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.xmlchemy import OxmlElement
from pptx.util import Inches, Pt

ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'docs/presentation/deck.json').read_text())
CAPTURES=ROOT/'.impeccable/presentation'
INK='142D33';PAPER='F0E4CC';BRASS='D8B77A';MUTED='BDD0C7';RED='B85332'
FONT='Microsoft YaHei'
LABELS={'en':{'edition':'English presentation','appendix':'Appendix','speaker':'Speaker','original':'Actual game capture; original interface language is Chinese.','minutes':'min','main':'Main deck','notes':'Speaker notes'},'zh':{'edition':'中文理解版','appendix':'附录','speaker':'主讲','original':'游戏实机截图；与英文主讲版页码一致。','minutes':'分钟','main':'完整演讲','notes':'逐页讲稿'}}

def local(slide,lang,key):return slide['en'][key] if lang=='en' else slide[key]
def speaker(slide,lang):
    role=slide['speaker']
    if role not in 'ABCDE':return LABELS[lang]['appendix']
    return f"{LABELS[lang]['speaker']} {role} | "+(DATA['roles_en'][role] if lang=='en' else DATA['roles'][role])
def color(value):return RGBColor.from_string(value)
def rect(slide,x,y,w,h,fill,line=None):
    shape=slide.shapes.add_shape(MSO_SHAPE.RECTANGLE,Inches(x),Inches(y),Inches(w),Inches(h));shape.fill.solid();shape.fill.fore_color.rgb=color(fill)
    if line:shape.line.color.rgb=color(line);shape.line.width=Pt(.7)
    else:shape.line.fill.background()
    return shape
def text(slide,value,x,y,w,h,size=24,fill=PAPER,bold=False,align=None):
    shape=slide.shapes.add_textbox(Inches(x),Inches(y),Inches(w),Inches(h));frame=shape.text_frame;frame.word_wrap=True;frame.margin_left=frame.margin_right=0;frame.margin_top=frame.margin_bottom=0
    for index,line in enumerate(str(value).split('\n')):
        paragraph=frame.paragraphs[0] if index==0 else frame.add_paragraph();paragraph.text=line;paragraph.space_after=Pt(5);paragraph.line_spacing=1.13
        if align is not None:paragraph.alignment=align
        for run in paragraph.runs:
            run.font.name=FONT;run.font.size=Pt(size);run.font.bold=bold;run.font.color.rgb=color(fill)
            properties=run._r.get_or_add_rPr();properties.set('lang','en-US' if all(ord(char)<128 for char in line) else 'zh-CN')
            east=OxmlElement('a:ea');east.set('typeface',FONT);properties.append(east)
    return shape
def image_path(slide):
    name=slide.get('image')
    if not name:return None
    if name=='06-city' and (CAPTURES/'06-city-panel.png').exists():name='06-city-panel'
    if name=='02-route' and (CAPTURES/'02-route-cards.png').exists():name='02-route-cards'
    if name=='07-reflection' and (CAPTURES/'07-retrieval-answer.png').exists():name='07-retrieval-answer'
    path=CAPTURES/(name+'.png')
    if not path.exists():path=ROOT/'.impeccable/review'/(name+'.png')
    if not path.exists():raise RuntimeError('Required real-game screenshot missing: '+str(path))
    return path
def picture(slide,path,x,y,w,h):
    from PIL import Image
    with Image.open(path) as bitmap:ratio=bitmap.width/bitmap.height
    width=min(w,h*ratio);height=width/ratio
    return slide.shapes.add_picture(str(path),Inches(x+(w-width)/2),Inches(y+(h-height)/2),width=Inches(width),height=Inches(height))
def bullets(slide,lines,x,y,w,h,size=23):
    per=h/len(lines)
    for index,line in enumerate(lines):
        text(slide,'—',x,y+index*per,.25,.4,size,BRASS)
        text(slide,line,x+.35,y+index*per,w-.35,per-.1,size)
def pipeline(slide,lang,small=False):
    titles=['LLM','API','Agents','Human','Retrieval'] if lang=='en' else ['LLM','API','Agents','人','知识检索']
    detail=['Frame the question','Authorize and meter','Use observable tools','Approve the plan','Return to sources'] if lang=='en' else ['提出文化问题','授权与记录用量','执行可观察工具','批准与承担取舍','回到材料与来源']
    y=2.25;w=2.28
    for index,(title,description) in enumerate(zip(titles,detail)):
        x=.65+index*2.42;rect(slide,x,y,w,1.18,RED if index==3 else '284C50')
        text(slide,title,x+.15,y+.12,w-.3,.38,25,bold=True)
        text(slide,description,x+.15,y+.65,w-.3,.4,14)
        if index<4:rect(slide,x+w,y+.57,.14,.025,BRASS)
    text(slide,'One actual game voyage: question → route → historical encounters → artifact → reflection' if lang=='en' else '同一条真实航程：问题 → 线路 → 历史故事 → 文明成果 → 反思',.8,3.8,11.7,.7,21,BRASS)
    if small:
        rows=[['Credentials','Page memory only'],['Destinations','Official OpenAI / Claude APIs'],['Cost boundary','Explicit request, usage record, no automatic paid retry']] if lang=='en' else [['凭据','只在页面内存'],['请求目的地','OpenAI / Claude官方接口'],['成本边界','主动点击、用量记录、不自动重复付费调用']]
        for index,(name,value) in enumerate(rows):text(slide,name,.8,4.6+index*.5,2,.4,17,BRASS);text(slide,value,3,4.6+index*.5,9.1,.45,17)
def economic_rows():
    config=DATA['financial_assumptions'];rounds=config['students']*config['weeks']*config['rounds_per_student_per_week'];fixed=config['review_cost_cny']+config['support_cost_cny']+config['hosting_cny']
    return [(rate,round(rounds*rate,2),round(fixed+rounds*rate,2),round(config['pilot_price_cny']-fixed-rounds*rate,2)) for rate in config['sensitivity_per_round_cny']]
def table(slide,rows,x,y,width,height,col_widths=None):
    frame=slide.shapes.add_table(len(rows),len(rows[0]),Inches(x),Inches(y),Inches(width),Inches(height));tab=frame.table
    if col_widths:
        for column,weight in zip(tab.columns,col_widths):column.width=Inches(width*weight/sum(col_widths))
    for row_index,row in enumerate(rows):
        for column_index,value in enumerate(row):
            cell=tab.cell(row_index,column_index);cell.fill.solid();cell.fill.fore_color.rgb=color('355650' if row_index==0 else '233F43');cell.margin_left=cell.margin_right=Inches(.14);cell.margin_top=cell.margin_bottom=Inches(.12);cell.vertical_anchor=MSO_ANCHOR.MIDDLE;cell.text=str(value)
            for paragraph in cell.text_frame.paragraphs:
                for run in paragraph.runs:run.font.name=FONT;run.font.size=Pt(17 if len(str(value))>35 else 20);run.font.bold=row_index==0;run.font.color.rgb=color(PAPER)
    return frame
def build_slide(prs,source,index,lang,video):
    slide=prs.slides.add_slide(prs.slide_layouts[6]);slide.background.fill.solid();slide.background.fill.fore_color.rgb=color(INK)
    rect(slide,.65,.45,.75,.045,BRASS)
    title=local(source,lang,'title');title_size=31 if lang=='en' and len(title)>68 else 35
    text(slide,title,.65,.75,12,.92,title_size,bold=True)
    text(slide,local(source,lang,'subtitle'),.68,1.7,11.9,.5,17,MUTED)
    kind=source['kind'];lines=local(source,lang,'bullets');path=image_path(source)
    if kind in {'architecture','architecture-small'}:pipeline(slide,lang,kind=='architecture-small')
    elif kind=='economics':
        text(slide,'40 × 4 × 12 = 1,920 interactions | Assumed pilot price: CNY 999' if lang=='en' else '40人 × 4周 × 12轮 = 1920轮｜试验报价假设：999元',.8,2.4,11.8,.65,23,BRASS)
        rows=[['Assumed CNY / interaction','Model cost','Variable cost','Contribution*']] if lang=='en' else [['每轮成本假设（元）','模型成本','可变成本','贡献余额*']]
        rows += [[f'{rate:.2f}',f'{model:.2f}',f'{total:.2f}',f'{balance:.2f}'] for rate,model,total,balance in economic_rows()]
        table(slide,rows,.8,3.2,11.7,2.3,[1.5,1,1,1])
        text(slide,'* All CNY amounts are scenario assumptions, not validated prices. Includes CNY 260 review/support/hosting. Excludes development, acquisition and tax.' if lang=='en' else '* 全部为情景假设，不是服务商报价或已验证定价。含260元审核、支持与运维，未含研发、获客与税费。',.8,5.8,11.7,.7,15,MUTED)
    elif kind=='ledger':
        rows=[['Ledger','Light route','Inquiry route'],['Game supplies','6 supplies','12 supplies'],['Charge rule','Once per voyage','Once per voyage'],['Real API calls','Explicit / metered','Explicit / metered'],['Provider charge','Separate bill','Separate bill']] if lang=='en' else [['账目','轻装线','考察线'],['游戏准备补给','6份','12份'],['扣除规则','每航程一次','每航程一次'],['真实API调用','主动发起、记录用量','主动发起、记录用量'],['服务商账单','另记','另记']]
        table(slide,rows,.8,2.45,11.7,3.2,[1.1,1,1]);text(slide,'Keep at least 15 supplies aboard. API tokens are not game money.' if lang=='en' else '至少留下15份口粮。API Token不是游戏货币。',.8,6,11.7,.5,19,BRASS)
    elif kind=='checks':
        metrics=[('3','Actual chapter records' if lang=='en' else '真实故事章节'),('1','Preparation charge' if lang=='en' else '筹备扣除次数'),('0','Duplicate city rewards' if lang=='en' else '重复建城奖励')]
        for column,(number,label) in enumerate(metrics):x=.85+column*4.05;text(slide,number,x,2.55,3.4,1.15,68,BRASS,True);text(slide,label,x,3.9,3.4,.75,22)
        text(slide,'Verified local game run. Provider account calls remain untested without credentials.' if lang=='en' else '本地游戏已实测跑通。没有账户密钥，未声称已完成付费模型实调。',.85,5.3,11.7,.85,20,MUTED)
    elif kind=='business':
        rows=[['Customer hypothesis','University humanities / AI-literacy classes'],['Job to be done','Run a source-based, decision-focused classroom activity'],['Deliverable','Voyage, teacher prompts, evidence and reflection records'],['Revenue test','Class / term license; later content packages'],['Next evidence','Teacher repeat use and willingness-to-pay interviews']] if lang=='en' else [['客群假设','大学通识、人文与AI工具课堂'],['待解决任务','组织一次有出处、要作取舍的课堂活动'],['交付物','航程、教师引导、来源与反思记录'],['收费验证','按班级/学期授权，后续内容包'],['下一步证据','教师重复使用与付费意愿访谈']]
        table(slide,rows,.8,2.4,11.7,3.8,[1,3.1])
    elif kind=='team':
        rows=[['Speaker','Responsibility','Slides','Time']] if lang=='en' else [['主讲','职责','页码','时长']]
        spans={'A':'01–03','B':'04–06','C':'07–09','D':'10–11','E':'12–16'}
        for role in 'ABCDE':seconds=sum(item['seconds'] for item in DATA['slides'] if item['speaker']==role);rows.append([role,DATA['roles_en'][role] if lang=='en' else DATA['roles'][role],spans[role],f'{seconds//60}:{seconds%60:02d}'])
        table(slide,rows,.8,2.35,11.7,3.9,[.6,2.5,.8,.8])
    elif kind=='sources':
        for row,entry in enumerate(source['extra']['links']):
            shape=text(slide,entry['title_en'] if lang=='en' else entry['title'],.85,2.4+row*.62,11.6,.48,20,BRASS)
            for paragraph in shape.text_frame.paragraphs:
                for run in paragraph.runs:run.hyperlink.address=entry['url']
        text(slide,'Checked 04 Nov 2026. Original historical sources and image licenses remain in the game.' if lang=='en' else '核对日期：2026年11月4日。历史来源与图片授权仍在游戏中提供。',.85,5.9,11.6,.6,16,MUTED)
    elif path:
        bullets(slide,lines,.8,2.55,4.7,3.45,22 if lang=='en' else 23)
        if kind=='demo' and video and video.exists():slide.shapes.add_movie(str(video),Inches(5.85),Inches(2.4),Inches(6.7),Inches(4.18),poster_frame_image=str(path),mime_type='video/mp4')
        else:picture(slide,path,5.85,2.35,6.7,4.05)
        text(slide,LABELS[lang]['original'],5.9,6.46,6.6,.35,10,MUTED)
    else:
        bullets(slide,lines,.95,2.65,11.3,3.25,28 if kind=='quote' else 25)
    rect(slide,.65,6.95,12.03,.012,'56716B')
    text(slide,speaker(source,lang),.7,7.08,9.5,.23,10,MUTED)
    text(slide,f'{index+1:02d} / {len(DATA["slides"]):02d}  |  '+LABELS[lang]['edition'],10.1,7.08,2.55,.23,9,MUTED,align=PP_ALIGN.RIGHT)
    slide.notes_slide.notes_text_frame.text=speaker(source,lang)+'\n'+local(source,lang,'notes')+'\n\n'+('Planned speaking time: ' if lang=='en' else '计划用时：')+str(source['seconds'])+' s'
    return slide

def save_deck(path,lang,indices,video):
    prs=Presentation();prs.slide_width=Inches(13.333333);prs.slide_height=Inches(7.5);prs.core_properties.title=DATA['title_en'] if lang=='en' else DATA['title'];prs.core_properties.subject='Game-integrated cultural inquiry and five-person business presentation';prs.core_properties.author='Civilization Voyage project team'
    for index in indices:build_slide(prs,DATA['slides'][index],index,lang,video)
    prs.save(path)
    # Structural QA catches accidental clipping outside the slide and empty notes.
    check=Presentation(path)
    for index,slide in enumerate(check.slides):
        assert slide.notes_slide.notes_text_frame.text.strip(),f'Missing notes at {index}'
        for shape in slide.shapes:
            assert shape.left>=-1000 and shape.top>=-1000 and shape.left+shape.width<=check.slide_width+10000 and shape.top+shape.height<=check.slide_height+10000,(index,shape.name)
    return len(check.slides)

def html_deck(path,lang):
    pages=[]
    for index,source in enumerate(DATA['slides']):
        title=html.escape(local(source,lang,'title'));subtitle=html.escape(local(source,lang,'subtitle'));items=''.join('<li>'+html.escape(line)+'</li>' for line in local(source,lang,'bullets'));kind=source['kind'];image=image_path(source)
        visual=''
        if image:visual=f'<figure><img src="{image.as_uri()}"><figcaption>{html.escape(LABELS[lang]["original"])}</figcaption></figure>'
        if kind in {'architecture','architecture-small'}:
            labels=['LLM','API','Agents','Human approval','Retrieval'] if lang=='en' else ['LLM','API','Agents','人批准','知识检索'];visual='<div class="flow">'+''.join('<div>'+html.escape(label)+'</div>' for label in labels)+'</div>'
        if kind=='economics':
            headings=['Assumed CNY / interaction','Model cost','Variable cost','Contribution*'] if lang=='en' else ['每轮成本假设','模型成本','可变成本','贡献余额*'];visual='<table><tr>'+''.join('<th>'+value+'</th>' for value in headings)+'</tr>'+''.join('<tr>'+''.join(f'<td>{value:.2f}</td>' for value in row)+'</tr>' for row in economic_rows())+'</table>'
        if kind=='sources':visual='<ol class="sources">'+''.join(f'<li><a href="{html.escape(entry["url"])}">{html.escape(entry["title_en"] if lang=="en" else entry["title"])}</a></li>' for entry in source['extra']['links'])+'</ol>'
        pages.append(f'<section class="slide kind-{kind}"><div class="rule"></div><h1>{title}</h1><p class="subtitle">{subtitle}</p><div class="content {"has-visual" if visual else ""}"><ul>{items}</ul>{visual}</div><footer><span>{html.escape(speaker(source,lang))}</span><span>{index+1:02d} / {len(DATA["slides"]):02d} · {html.escape(LABELS[lang]["edition"])}</span></footer></section>')
    css='''@page{size:13.333333in 7.5in;margin:0}*{box-sizing:border-box}body{margin:0;background:#142d33;font-family:"Microsoft YaHei","PingFang SC",sans-serif;color:#f0e4cc}.slide{width:1280px;height:720px;padding:44px 62px 28px;position:relative;break-after:page;overflow:hidden}.rule{height:4px;width:72px;background:#d8b77a}h1{font-size:36px;line-height:1.2;margin:24px 0 16px;font-weight:650;max-width:1156px;min-height:66px}.subtitle{font-size:18px;color:#bdd0c7;margin:0 0 28px;line-height:1.4}.content{display:flex;gap:28px;align-items:center;min-height:400px}.content>ul{padding-left:24px;font-size:25px;line-height:1.45;flex:1;margin:0}.content.has-visual>ul{flex:0 0 40%;font-size:23px}li{margin:0 0 28px}figure{margin:0;flex:1;min-width:0;text-align:center}figure img{max-width:100%;max-height:368px;object-fit:contain}figcaption{font-size:11px;color:#bdd0c7;margin-top:10px}footer{position:absolute;left:62px;right:62px;bottom:24px;border-top:1px solid #56716b;padding-top:12px;display:flex;justify-content:space-between;font-size:12px;color:#bdd0c7}.flow{display:flex;flex:1;gap:8px;flex-wrap:wrap}.flow>div{border:1px solid #d8b77a;background:#284c50;padding:18px;min-width:110px;font-size:21px}table{border-collapse:collapse;font-size:20px;flex:1;width:100%}td,th{padding:18px 10px;border-bottom:1px solid #7f947c;text-align:right}th{font-size:16px;color:#d8b77a}.sources{font-size:20px;flex:1;padding-left:24px}.sources a{color:#d8b77a;text-decoration:none}.sources li{margin-bottom:18px}.kind-economics .content{display:block}.kind-economics .content>ul{font-size:20px;display:flex;gap:28px;list-style:none;padding:0;margin-bottom:24px}.kind-economics .content>ul li{flex:1;font-size:18px;line-height:1.5;margin:0}.kind-sources .content>ul{display:none}.kind-hero h1,.kind-closing h1{font-size:40px}.kind-demo figure::after{content:"Actual game recording / see included MP4";display:block;color:#d8b77a;font-size:14px;margin-top:8px}@media print{html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.slide{page-break-inside:avoid}}'''
    path.write_text('<!doctype html><html lang="'+('en' if lang=='en' else 'zh-CN')+'"><meta charset="utf-8"><title>'+html.escape(DATA['title_en'] if lang=='en' else DATA['title'])+'</title><style>'+css+'</style>'+''.join(pages)+'</html>')

def notes(path,lang,indices):
    lines=['# '+(DATA['title_en'] if lang=='en' else DATA['title']),LABELS[lang]['notes'],'']
    for index in indices:
        slide=DATA['slides'][index];lines += [f'## {index+1:02d} · {local(slide,lang,"title")}',speaker(slide,lang)+f' | {slide["seconds"]} s','',local(slide,lang,'notes'),'']
    path.write_text('\n'.join(lines))

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,default=Path.home()/'Desktop/文明航程演讲包');parser.add_argument('--without-video',action='store_true');parser.add_argument('--draft',action='store_true',help='Create a labeled draft without claiming a new gameplay run.');args=parser.parse_args();output=args.output;output.mkdir(parents=True,exist_ok=True)
    proof=CAPTURES/'verification.json'
    if args.draft:
        LABELS['en']['edition']='v'+str(DATA['version'])+' · Draft'
        LABELS['zh']['edition']='v'+str(DATA['version'])+' · 初版待验收'
    elif not proof.exists() or json.loads(proof.read_text()).get('pageErrors')!=[]:raise SystemExit('先完成实机验证，不能用未跑通的画面生成演讲资料。')
    manifest={'title':DATA['title_en'],'version':DATA['version'],'status':'draft-gameplay-review-pending' if args.draft else 'verified','source':'docs/presentation/deck.json','main_minutes':15,'slides':len(DATA['slides']),'languages':['en','zh'],'files':[],'verification':None if args.draft else json.loads(proof.read_text())}
    all_indices=list(range(len(DATA['slides'])))
    for lang in ['en','zh']:
        suffix='EN' if lang=='en' else '中文理解版';folder=output/('English' if lang=='en' else '中文理解');folder.mkdir(exist_ok=True)
        video=output/('demo-en.mp4' if lang=='en' else 'demo-zh.mp4')
        if not args.without_video and not video.exists():raise SystemExit('缺少对应语言的演示视频：'+str(video))
        save_deck(folder/f'Civilization-Voyage-{suffix}.pptx',lang,all_indices,None if args.without_video else video)
        html_deck(folder/f'slides-{lang}.html',lang);notes(folder/f'Speaker-Notes-{suffix}.md',lang,all_indices)
        for role in 'ABCDE':
            indices=[index for index,slide in enumerate(DATA['slides']) if slide['speaker']==role]
            save_deck(folder/f'Speaker-{role}-{suffix}.pptx',lang,indices,None if args.without_video else video)
            notes(folder/f'Speaker-{role}-{suffix}.md',lang,indices)
        manifest['files'] += [str(path.relative_to(output)) for path in folder.iterdir() if path.is_file()]
    (output/'verification.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
    shutil.copy2(ROOT/'docs/presentation/deck.json',output/'editable-deck-source.json')
    print(f'已生成19页双语主PPT、10份个人PPT与逐页讲稿：{output}')

if __name__=='__main__':main()
