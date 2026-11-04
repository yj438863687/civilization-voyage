#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build bilingual first-draft decks for the native game with history and upgrades."""
from pathlib import Path
import json
from pptx import Presentation
from pptx.util import Inches,Pt
from pptx.dml.color import RGBColor
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=Path.home()/'Desktop/文明航程演讲包/历史配乐船坞版-初版'
SLIDES=[('A',
  '文明航程：技术怎样改变共同生活',
  'Civilization Voyage: Technology and Shared Life',
  ['农业、工业、信息、人工智能四个时代', '中国与世界八条航线，保留人物、场景与字幕', '用故事选择连接技术能力与文明责任'],
  ['Four eras: agriculture, industry, information and artificial intelligence',
   'Eight routes across China and the world, with the original characters and scenes',
   'Connect technical capability with responsibility through story choices'],
  'original-character-subtitles.png'),
 ('A',
  '同一条船，两种需要',
  'One Ship, Two Needs',
  ['补给维持眼前航行，也能用来整修船体', '人心来自合作，解锁船员的新行装', '前一站的安排，会改变后一站的支援与回顾'],
  ['Supplies support the voyage and pay for visible ship upgrades',
   'Trust grows through cooperation and unlocks crew outfits',
   'Earlier decisions shape later support and the final reflection'],
  None),
 ('B',
  '内海：中国的四条时间线',
  'Inner Sea: Four Timelines in China',
  ['农业：鲧与禹的传说 → 战国都江堰维护',
   '工业：1839—1841译书 → 1842编纂 → 1909铁路',
   '信息：1871海缆 → 1881电报 → 1896办学倡议',
   '人工智能：2017规划 → 2021资料边界 → 2035未来推演'],
  ['Agriculture: Gun and Yu in legend → irrigation maintenance in the Warring States period',
   'Industry: translations, 1839–1841 → compilation, 1842 → railway, 1909',
   'Information: cable, 1871 → telegraph, 1881 → education proposal, 1896',
   'AI: development plan, 2017 → data boundaries, 2021 → imagined future, 2035'],
  None),
 ('B',
  '外海：世界的四条时间线',
  'Outer Sea: Four Timelines in the World',
  ['农业：约前3500年灌溉 → 约前3200年记录与储备',
   '工业：1769蒸汽改进 → 1833劳动制度 → 1842交班',
   '信息：1844电报 → 1866跨洋电缆 → 1948信号',
   '人工智能：1950提问／1966ELIZA → 2016围棋与验证'],
  ['Agriculture: irrigation, c. 3500 BCE → records and reserves, c. 3200 BCE',
   'Industry: steam improvement, 1769 → factory rules, 1833 → shifts, 1842',
   'Information: telegraph, 1844 → ocean cable, 1866 → signals, 1948',
   'AI: questions in 1950 and ELIZA in 1966 → Go and validation in 2016'],
  None),
 ('C',
  '年代与人物要对得上',
  'Dates and People Must Fit',
  ['每条航线从较早事件讲到较晚事件', '终点人物符合回顾时段，不让已故人物见证后来事件', '传说、史实背景、对话创作与未来推演明确标注'],
  ['Each route moves from earlier to later events',
   'The final speaker fits the period of the reflection',
   'Clearly label legend, historical context, creative dialogue and future scenarios'],
  None),
 ('C',
  '图片是额外入口',
  'Images Provide Optional Context',
  ['24站提供图片与背景出处', '区分现代照片、后世画像和历史图像', '阅读后返回原人物互动，不改变资源与进度'],
  ['Background images and sources accompany all 24 scenes',
   'Distinguish modern photographs, later portraits and historical images',
   'Return to the character interaction without changing resources or progress'],
  'picture-background.png'),
 ('D',
  '看清任务，再动手',
  'Understand the Task, Then Act',
  ['WASD开船，E进入人物故事，Escape返回', '浮标选择、稳船光环、收集物件与顺序校验', '操作完成后再决定怎样使用成果；没有正确价值观按钮'],
  ['Use WASD to sail, E to enter a story and Escape to return',
   'Choose a buoy gate, hold position, collect objects or verify a sequence',
   'After the task, decide how to use the result; choices carry visible tradeoffs'],
  'original-character-subtitles.png'),
 ('D',
  '升级要真的看得见',
  'Upgrades Must Be Visible',
  ['补给购买三级船体整修，至少留15份口粮', '人心达到55／65／75，解锁三级行装', '免费预览、实际购买和海上外观使用同一船型'],
  ['Buy three ship upgrade tiers while keeping at least 15 supplies',
   'Unlock three outfit tiers at trust levels 55, 65 and 75',
   'Preview and sailing use the same ship and crew models'],
  'shipyard.png'),
 ('D',
  '音乐与操作一起发生',
  'Music and Interaction Work Together',
  ['四时代分别使用原创合成配乐', '收集、错误、光环和结果触发对应音效', '音量、配乐和音效可分别控制，后台自动暂停'],
  ['Each era has an original synthesized musical score',
   'Collections, mistakes, the holding ring and results trigger sound cues',
   'Control music, effects and volume; audio pauses in the background'],
  None),
 ('E',
  'AI工具支持创作与实现',
  'AI Tools Support Research and Delivery',
  ['工具协助整理史料、实现代码与生成演讲初稿', '历史来源与图片许可需逐项核对', '当前故事不依赖付费模型；RAG是后续方向'],
  ['Tools support source organization, implementation and presentation drafts',
   'Check historical sources and image licenses for every scene',
   'The story does not require a paid model; retrieval is a future extension'],
  None),
 ('E',
  '商业落地：先验证课堂与展项',
  'Business Validation: Classrooms and Exhibits',
  ['交付游戏、带出处的背景解说与教师引导稿', '先验证玩家能否讲清一次选择的代价', '用小规模试点测试理解、完成率与复玩意愿，再定价'],
  ['Deliver the game, sourced context and a facilitator guide',
   'First test whether players can explain the cost of one decision',
   'Use small pilots to study comprehension, completion and replay interest before pricing'],
  None),
 ('附录',
  '五人分工与演示边界',
  'Speaker Roles and Demonstration Scope',
  ['A主题与文化；B历史结构；C史料与图片；D操作；E工具与商业', '功能检查预置到目标场景，不等于完整人工通关', '本文件为中英文初稿；未录制新Demo，未完成演讲排练'],
  ['A: theme; B: history; C: sources and images; D: gameplay; E: tools and business',
   'Targeted checks start at prepared scenes; they are not a full manual playthrough',
   'Editable first draft; no new demo recording or complete presentation rehearsal'],
  None)]

def box(slide,value,x,y,w,h,size=22,color='EFE3C9'):
    shape=slide.shapes.add_textbox(Inches(x),Inches(y),Inches(w),Inches(h))
    shape.text_frame.word_wrap=True
    for index,line in enumerate(value.split('\n')):
        p=shape.text_frame.paragraphs[0] if index==0 else shape.text_frame.add_paragraph()
        p.text=line;p.font.name='Microsoft YaHei';p.font.size=Pt(size);p.font.color.rgb=RGBColor.from_string(color)
    return shape

def write_deck(path,lang,indices):
    deck=Presentation();deck.slide_width=Inches(13.333333);deck.slide_height=Inches(7.5)
    notes=[]
    for index in indices:
        role,zh,en,bullets_zh,bullets_en,capture=SLIDES[index]
        title,lines=(en,bullets_en) if lang=='en' else (zh,bullets_zh)
        slide=deck.slides.add_slide(deck.slide_layouts[6]);slide.background.fill.solid();slide.background.fill.fore_color.rgb=RGBColor.from_string('142D33')
        box(slide,title,.7,.6,11.9,1.1,32)
        photo=ROOT/'.impeccable/background'/capture if capture else None
        width=5.0 if photo and photo.exists() else 11.8
        for row,line in enumerate(lines):box(slide,line,.8,2.1+row*1.15,width,1.0,22)
        if photo and photo.exists():
            with Image.open(photo) as bitmap:ratio=bitmap.width/bitmap.height
            w=min(6.3,4.3*ratio);h=w/ratio
            slide.shapes.add_picture(str(photo),Inches(6.3),Inches(2.0),width=Inches(w),height=Inches(h))
            box(slide,'Actual UI check; original game interface is Chinese.' if lang=='en' else '实际界面检查截图；不是完整航程录像。',6.3,6.4,6.2,.3,10,'D3C2A0')
        shown_role='Appendix' if lang=='en' and role not in 'ABCDE' else role
        footer=f'{index+1:02d}/{len(SLIDES):02d} · '+('Speaker ' if lang=='en' else '主讲 ')+shown_role+(' · First draft / history, music and upgrades' if lang=='en' else ' · 历史配乐船坞初版')
        box(slide,footer,.8,7.0,11.8,.3,11,'D3C2A0')
        note=('This version keeps native storytelling and adds historical routes, music and upgrades. ' if lang=='en' else '本版保留原人物互动，补齐历史线、配乐与升级。')+' '.join(lines)
        slide.notes_slide.notes_text_frame.text=note
        notes.append(f'{index+1:02d} {title}\n{note}\n')
    deck.save(path)
    assert len(Presentation(path).slides)==len(indices)
    path.with_suffix('.txt').write_text('\n'.join(notes))

def main():
    for lang,folder in [('en','English'),('zh','中文理解')]:
        target=OUTPUT/folder;target.mkdir(parents=True,exist_ok=True)
        suffix='EN' if lang=='en' else '中文理解版'
        write_deck(target/f'Civilization-Voyage-History-Music-Refit-{suffix}.pptx',lang,list(range(len(SLIDES))))
        for role in 'ABCDE':write_deck(target/f'Speaker-{role}-{suffix}.pptx',lang,[i for i,s in enumerate(SLIDES) if s[0]==role])
    (OUTPUT/'version.json').write_text(json.dumps({'baseline':'c1a8fe8','change':'history-music-refit-v1','languages':['en','zh'],'status':'first-draft','full_demo_recorded':False},ensure_ascii=False,indent=2))
    print('已生成历史配乐船坞版的中英文初版、五人个人PPT与备注：'+str(OUTPUT))

if __name__=='__main__':main()
