"""Replace only the requested Part A pages; preserve its seven-slide contents."""
from copy import deepcopy
from pathlib import Path
from collections import Counter
import hashlib,json,re,zipfile
from lxml import etree,html
from pptx import Presentation
from pptx.opc.package import Part
from pptx.opc.packuri import PackURI
from pptx.opc.constants import RELATIONSHIP_TYPE as RT
from pptx.oxml.xmlchemy import OxmlElement
from pptx.oxml.ns import qn
ROOT=Path(__file__).resolve().parents[1]
BASE=Path('/Users/jacky/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_g3yzg8geddie22_9117/msg/file/2026-11')
FULL=BASE/'Civilization-Voyage-Full-EN(1).pptx';PART_A=BASE/'Civilization Voyage-PartA.pptx'
SPEECH=Path.home()/'Desktop/文明航程-演讲稿-17-22页.html'
OUT=Path.home()/'Desktop/文明航程-最终演讲版';OUT.mkdir(exist_ok=True)
original=Presentation(FULL);deck=Presentation(FULL);part_a=Presentation(PART_A)
assert len(original.slides)==22 and len(part_a.slides)==7
# Preserve the cover except for the exact subtitle the user asked to remove.
removed=[]
for shape in list(deck.slides[0].shapes):
 if shape.has_text_frame and ' '.join(shape.text.split())=='A voyage through lives changed by technology.':
  removed.append(shape.text);shape._element.getparent().remove(shape._element)
assert len(removed)==1
for sid in list(deck.slides._sldIdLst)[1:4]:deck.part.drop_rel(sid.rId);deck.slides._sldIdLst.remove(sid)
reserved={str(p.partname) for p in deck.part.package.iter_parts()};memo={}
colors={'071A2C':'071B29','061726':'071B29','03101C':'071B29','102B3E':'0B3046','0D3A5C':'103F43','287FA6':'087F69','78C7DE':'35C5A5','62C69A':'35C5A5','FFFFFF':'EDF6F5','D8E4EC':'D5E4E3','EDF3F6':'F1F5F4','F8FBFC':'F1F5F4','0A263D':'0B3046','0B2942':'0B3046','B8CBD6':'9BB4BC','A9BECA':'9BB4BC','91ADBB':'9BB4BC','AFC4D1':'9BB4BC','9AB5C3':'9BB4BC','8DAAB9':'9BB4BC','8CB6C9':'9BB4BC','DCE8EE':'D5E4E3','E5EEF2':'EDF6F5'}
secondary={'587084','54788C','799BAD','5D879D','5E8CA4','6B7F8C','668FA5'}
def recolor(element,light=False):
 for node in element.iter(qn('a:srgbClr')):
  value=node.get('val','').upper()
  if value in secondary:node.set('val','526D78' if light else '9BB4BC')
  elif value=='0563C1':node.set('val','087F69' if light else '35C5A5')
  elif value in colors:node.set('val',colors[value])
def unique(name):
 result=str(name);index=1
 while result in reserved:
  p=Path(str(name));result=str(p.with_name(f'{p.stem}_partA{index}{p.suffix}'));index+=1
 reserved.add(result);return PackURI(result)
def rewrite(element,mapping):
 for node in element.iter():
  for key,value in list(node.attrib.items()):
   if key.startswith('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}') and value in mapping:node.set(key,mapping[value])
def clone(part):
 if part in memo:return memo[part]
 if part.content_type.endswith('.notesMaster+xml'):return deck.notes_master.part
 result=Part(unique(part.partname),part.content_type,deck.part.package,part.blob);memo[part]=result;mapping={}
 for rel in part.rels.values():mapping[rel.rId]=result.relate_to(rel.target_ref if rel.is_external else clone(rel.target_part),rel.reltype,rel.is_external)
 if part.content_type.endswith('+xml') or part.content_type in ['application/xml','text/xml']:
  element=etree.fromstring(part.blob);rewrite(element,mapping)
  if part.content_type.endswith('.slideMaster+xml') or part.content_type.endswith('theme+xml'):recolor(element)
  result._blob=etree.tostring(element,xml_declaration=True,encoding='UTF-8',standalone=True)
 if part.content_type.endswith('.slideMaster+xml'):
  rid=deck.part.relate_to(result,RT.SLIDE_MASTER);lst=deck.part._element.sldMasterIdLst
  item=OxmlElement('p:sldMasterId');item.set('id',str(max(int(x.get('id')) for x in lst)+1));item.set(qn('r:id'),rid);lst.append(item)
 return result
for i,source in enumerate(part_a.slides):
 dest=deck.slides.add_slide(deck.slide_layouts[6]);dest.part._partname=unique(dest.part.partname);memo[source.part]=dest.part
 for rel in list(dest.part.rels.values()):dest.part.drop_rel(rel.rId)
 mapping={rel.rId:dest.part.relate_to(rel.target_ref if rel.is_external else clone(rel.target_part),rel.reltype,rel.is_external) for rel in source.part.rels.values()}
 element=deepcopy(source._element);rewrite(element,mapping);recolor(element,light=i==2)
 dest.part._element=element;dest._element=element;dest.__dict__.pop('shapes',None)
new_ids=list(deck.slides._sldIdLst)[-7:]
for i,sid in enumerate(new_ids):deck.slides._sldIdLst.remove(sid);deck.slides._sldIdLst.insert(i+1,sid)
# Avoid slide-layout ID collisions between imported master parts.
next_layout=2147484000
for part in deck.part.package.iter_parts():
 if not part.content_type.endswith('.slideMaster+xml'):continue
 element=part._element if hasattr(part,'_element') else etree.fromstring(part.blob)
 for node in element.iter(qn('p:sldLayoutId')):node.set('id',str(next_layout));next_layout+=1
 if not hasattr(part,'_element'):part._blob=etree.tostring(element,xml_declaration=True,encoding='UTF-8',standalone=True)
# Keep Part A's own 01/07 ... 07/07 labels. Update only existing global footer numbers elsewhere.
for i,slide in enumerate(deck.slides):
 if 1<=i<=7:continue
 for shape in slide.shapes:
  if shape.has_text_frame and shape.top/deck.slide_height>.91 and shape.left/deck.slide_width>.85 and re.fullmatch(r'\d{1,2}',shape.text.strip()):
   runs=shape.text_frame.paragraphs[0].runs
   if runs:
    runs[0].text=f'{i+1:02d}'
    for run in runs[1:]:run.text=''
# Extract the latest exact spoken text, including each page's bridge sentence.
doc=html.fromstring(SPEECH.read_text());cls=lambda n:"contains(concat(' ',normalize-space(@class),' '),' "+n+" ')"
txt=lambda e:' '.join(' '.join(e.itertext()).split());notes=[]
for section in doc.xpath('//section['+cls('slide')+']'):
 page=int(section.get('id')[1:]);paragraphs=[txt(p) for p in section.xpath('.//*['+cls('en')+']/p')]
 paragraphs.extend(txt(p) for p in section.xpath('.//*['+cls('bridge')+']/*['+cls('b-en')+']'))
 spoken='\n\n'.join(paragraphs);destination=page+4;deck.slides[destination-1].notes_slide.notes_text_frame.text=spoken
 notes.append({'source_page':page,'destination_page':destination,'script':spoken})
assert [n['source_page'] for n in notes]==list(range(17,23))
full_copy=''.join(doc.xpath('//textarea[@id="full-src"]')[0].itertext());parts=re.split(r'\[Slide (\d+)\][^\n]*\n',full_copy)
for note in notes:
 k=parts.index(str(note['source_page']));assert ' '.join(parts[k+1].split())==' '.join(note['script'].split())
path=OUT/'Civilization-Voyage-Full-EN.pptx';deck.save(path);final=Presentation(path);assert len(final.slides)==26
# Check that Part A's text, images, tables, shape geometry and original notes remain intact.
for i,(source,dest) in enumerate(zip(part_a.slides,list(final.slides)[1:8])):
 assert len(source.shapes)==len(dest.shapes),(i,'shape count')
 for a,b in zip(source.shapes,dest.shapes):
  assert (a.left,a.top,a.width,a.height)==(b.left,b.top,b.width,b.height),(i,'geometry')
  if a.has_text_frame:assert a.text==b.text,(i,'text')
  if a.shape_type==13:assert a.image.blob==b.image.blob,(i,'image')
  if a.has_table:assert [[c.text for c in row.cells] for row in a.table.rows]==[[c.text for c in row.cells] for row in b.table.rows]
 assert source.notes_slide.notes_text_frame.text==dest.notes_slide.notes_text_frame.text,(i,'Part A notes')
for note in notes:assert final.slides[note['destination_page']-1].notes_slide.notes_text_frame.text==note['script']
# Everything after the replaced section keeps its content; only footer numbers and the user's notes change.
for source,dest in zip(list(original.slides)[4:],list(final.slides)[8:]):
 assert len(source.shapes)==len(dest.shapes)
 for a,b in zip(source.shapes,dest.shapes):
  if a.has_text_frame and not (a.top/deck.slide_height>.91 and a.left/deck.slide_width>.85 and re.fullmatch(r'\d{1,2}',a.text.strip())):assert a.text==b.text
  if a.shape_type==13:assert a.image.blob==b.image.blob
with zipfile.ZipFile(path) as z:assert z.testzip() is None and len(z.namelist())==len(set(z.namelist()))
(ROOT/'docs/speaker-notes-from-latest-html.json').write_text(json.dumps({'source':str(SPEECH),'sha256':hashlib.sha256(SPEECH.read_bytes()).hexdigest(),'slides':notes},ensure_ascii=False,indent=2)+'\n')
(OUT/'页码与讲稿说明.txt').write_text('文明航程｜最新版完整PPT｜26页\n\n第1页：原封面，仅移除指定的绿色副标题。\n第2–8页：Part A原7页；内容、布局、图片和备注不变，只统一颜色。\n第9–15页：Part B。\n第16–20页：Part C。\n第21–26页：你的AI工作流与BP部分。\n\n你的台词来源：桌面《文明航程-演讲稿-17-22页.html》。\n原17–22页的台词已按顺序写入新PPT第21–26页的演讲者备注，包含每页过渡句。\nPowerPoint：幻灯片放映 → 使用演讲者视图。编辑模式也可以点击底部“备注”查看。\n',encoding='utf-8')
print(path)
print('Verified 26 slides; all seven Part A slides retain content and layout; latest HTML speeches match notes exactly on slides 21–26.')
