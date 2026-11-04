#!/usr/bin/env python3
"""Build bilingual first-draft decks for the original game plus image notes."""
from pathlib import Path
import json
from pptx import Presentation
from pptx.util import Inches,Pt
from pptx.dml.color import RGBColor
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=Path.home()/'Desktop/文明航程演讲包/原版加图片背景-初版'
SLIDES=[
 ('A','文明航程：原版加图片背景','Civilization Voyage: Original Game with Image Notes',['保留c1a8fe8的人物、场景、字幕与玩法','仅增加按需打开的图片背景解说','照片、画像与游戏创作分别说明'],['Retain the characters, scenery, subtitles and gameplay of c1a8fe8','Add optional image-based background explanations','Distinguish photographs, portraits and game fiction'],'original-character-subtitles.png'),
 ('B','故事仍按原来的方式发生','Keep the Original Storytelling',['开船接近岛屿，与岛上原人物交谈','字幕与水上互动沿用原版','两座岛、危机与岸上回顾均保留'],['Sail toward an island and meet its original character','Retain the existing subtitles and interactions on the water','Preserve the islands, crisis and reflection at the shore'],'original-character-subtitles.png'),
 ('C','图片为故事补充背景','Images Add Context to the Story',['16座故事岛提供图片背景入口','注明图片所处年代、作者与授权','后世画像与示意图不当作故事现场'],['Provide background-image entries for 16 story islands','Identify the image context, author and license','Do not present later portraits or diagrams as eyewitness records'],'picture-background.png'),
 ('D','看图片，收起后继续原航程','Read, Close and Continue the Voyage',['靠近岛屿，点“图片背景”','读配图与简短背景，按Escape收起','返回后仍按原玩法交谈与航行'],['Approach an island and open its image-background entry','Read the image and short explanation; press Escape to close','Continue the existing dialogue and sailing controls'],'picture-background.png'),
 ('E','AI工具用于整理与实现','AI Tools Support Content Preparation',['用工具协助整理素材与实现阅读入口','人工核对人物对应、图片年代与许可','本次没有新增运行时模型调用或Agent剧情'],['Use tools to organize source material and implement the reading entry','Review character matching, image context and licenses','This revision adds no runtime model calls or agent storyline'],None),
 ('E','商业落地先做小规模验证','Start Business Validation with a Small Pilot',['客群假设：课堂文化体验与展项','交付：原游戏、配图解说、出处清单','先验证理解与复玩意愿，再讨论定价'],['Customer hypothesis: cultural classroom activities and exhibits','Deliver the original game, image notes and source credits','Test comprehension and replay interest before setting prices'],None),
 ('D','验证范围与演示边界','Verification Scope and Demo Limits',['14个核心文件与c1a8fe8逐字一致','第一岛图片打开、返回、手机宽度与资源进度检查通过','没有重跑完整航程，没有录制新Demo'],['Fourteen core source files match c1a8fe8 byte for byte','Check the first island, image return, mobile width and unchanged resources','No full voyage replay or new demo recording'],None),
 ('附录','素材与分工','Sources and Speaker Roles',['图片出处与许可在游戏阅读窗内提供','A文化理解；B原故事；C图片解说；D产品演示；E工具与商业','初版供讨论，尚未做完整演讲与逐页PowerPoint视觉验收'],['Image sources and licenses are available in the reading window','A: culture; B: narrative; C: image context; D: product demo; E: tools and business','First draft: no complete rehearsal or page-by-page PowerPoint visual acceptance'],None),
]

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
        footer=f'{index+1:02d}/08 · '+('Speaker ' if lang=='en' else '主讲 ')+shown_role+(' · First draft / original + image notes' if lang=='en' else ' · 原版加图片背景初版')
        box(slide,footer,.8,7.0,11.8,.3,11,'D3C2A0')
        note=('This revision is limited to the original game plus optional image notes. ' if lang=='en' else '本版严格限定为原游戏加可选图片背景。')+' '.join(lines)
        slide.notes_slide.notes_text_frame.text=note
        notes.append(f'{index+1:02d} {title}\n{note}\n')
    deck.save(path)
    assert len(Presentation(path).slides)==len(indices)
    path.with_suffix('.txt').write_text('\n'.join(notes))

def main():
    for lang,folder in [('en','English'),('zh','中文理解')]:
        target=OUTPUT/folder;target.mkdir(parents=True,exist_ok=True)
        suffix='EN' if lang=='en' else '中文理解版'
        write_deck(target/f'Civilization-Voyage-Original-Background-{suffix}.pptx',lang,list(range(8)))
        for role in 'ABCDE':write_deck(target/f'Speaker-{role}-{suffix}.pptx',lang,[i for i,s in enumerate(SLIDES) if s[0]==role])
    (OUTPUT/'version.json').write_text(json.dumps({'baseline':'c1a8fe8','change':'optional-image-background-only','languages':['en','zh'],'status':'first-draft','full_demo_recorded':False},ensure_ascii=False,indent=2))
    print('已生成原版加图片背景的中英文初版、五人个人PPT与备注：'+str(OUTPUT))

if __name__=='__main__':main()
