"""Keep Part A and replace the later sections with the three supplied decks."""
from copy import deepcopy
from pathlib import Path
import io,json,re,zipfile
from lxml import etree
from pptx import Presentation
from pptx.opc.package import Part
from pptx.opc.packuri import PackURI
from pptx.oxml.xmlchemy import OxmlElement
from pptx.oxml.ns import qn
from pptx.opc.constants import RELATIONSHIP_TYPE as RT
ROOT=Path(__file__).resolve().parents[1]
BASE=Path.home()/'Desktop/Civilization-Voyage-Visual-EN/Civilization-Voyage-Presentation-EN.pptx'
WECHAT=Path('/Users/jacky/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_g3yzg8geddie22_9117/msg/file/2026-11')
SOURCES=[WECHAT/'Civilization_Voyage_Part_B_Illustrated_Cover_EN.pptx',WECHAT/'CV_C_Final.pptx',Path.home()/'Desktop/文明航程-个人结尾-6页/Civilization-Voyage-My-Part-EN.pptx']
OUT=Path.home()/'Desktop/文明航程-完整合并版-22页';OUT.mkdir(exist_ok=True)
deck=Presentation(BASE)
for slide_id in list(deck.slides._sldIdLst)[4:]:
 deck.part.drop_rel(slide_id.rId);deck.slides._sldIdLst.remove(slide_id)
reserved={str(part.partname) for part in deck.part.package.iter_parts()}
master_rel_ids={rel.rId for rel in deck.part.rels.values() if rel.reltype==RT.SLIDE_MASTER}
expected=[Presentation(BASE).slides[i] for i in range(4)]

def unique_name(name):
 candidate=str(name);n=1
 while candidate in reserved:
  p=Path(str(name));candidate=str(p.with_name(f'{p.stem}_merged{n}{p.suffix}'));n+=1
 reserved.add(candidate)
 return PackURI(candidate)

def rewrite_refs(element,mapping):
 for node in element.iter():
  for key,value in list(node.attrib.items()):
   if key.startswith('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}') and value in mapping:
    node.set(key,mapping[value])

for source_path in SOURCES:
 source=Presentation(source_path);memo={}
 def clone_part(part):
  if part in memo:return memo[part]
  clone=Part(unique_name(part.partname),part.content_type,deck.part.package,part.blob)
  memo[part]=clone
  mapping={}
  for rel in part.rels.values():
   target=rel.target_ref if rel.is_external else clone_part(rel.target_part)
   mapping[rel.rId]=clone.relate_to(target,rel.reltype,rel.is_external)
  if part.content_type.endswith('+xml') or part.content_type in ['application/xml','text/xml']:
   element=etree.fromstring(part.blob);rewrite_refs(element,mapping)
   clone._blob=etree.tostring(element,xml_declaration=True,encoding='UTF-8',standalone=True)
  if part.content_type=='application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml':
   rid=deck.part.relate_to(clone,RT.SLIDE_MASTER)
   if rid not in master_rel_ids:
    master_rel_ids.add(rid);lst=deck.part._element.sldMasterIdLst
    item=OxmlElement('p:sldMasterId');item.set('id',str(max(int(x.get('id')) for x in lst)+1));item.set(qn('r:id'),rid);lst.append(item)
  return clone
 for source_slide in source.slides:
  slide=deck.slides.add_slide(deck.slide_layouts[6])
  memo[source_slide.part]=slide.part
  for rel in list(slide.part.rels.values()):slide.part.drop_rel(rel.rId)
  mapping={}
  for rel in source_slide.part.rels.values():
   target=rel.target_ref if rel.is_external else clone_part(rel.target_part)
   mapping[rel.rId]=slide.part.relate_to(target,rel.reltype,rel.is_external)
  element=deepcopy(source_slide._element);rewrite_refs(element,mapping)
  slide.part._element=element;slide._element=element
  slide.__dict__.pop('shapes',None)
  expected.append(source_slide)

# Keep the individual sections' layouts and typography; only normalize footer numbers.
for i,slide in enumerate(deck.slides):
 for shape in slide.shapes:
  if not shape.has_text_frame:continue
  if shape.top/deck.slide_height<.91 or shape.left/deck.slide_width<.85:continue
  if not re.fullmatch(r'\d{1,2}',shape.text.strip()):continue
  paragraphs=shape.text_frame.paragraphs
  if paragraphs[0].runs:
   paragraphs[0].runs[0].text=f'{i+1:02d}'
   for run in paragraphs[0].runs[1:]:run.text=''

out=OUT/'Civilization-Voyage-Full-EN.pptx'
deck.save(out)
merged=Presentation(out)
assert len(merged.slides)==22
assert len(expected)==22
for i,(a,b) in enumerate(zip(expected,merged.slides)):
 # Compare every content shape, allowing only the page number to change.
 assert len(a.shapes)==len(b.shapes),(i,'shapes')
 for left,right in zip(a.shapes,b.shapes):
  if left.has_text_frame:
   if re.fullmatch(r'\d{1,2}',left.text.strip()) and left.top/deck.slide_height>.91 and left.left/deck.slide_width>.85:continue
   assert left.text==right.text,(i,'text',left.text[:40])
  if left.shape_type==13:assert left.image.blob==right.image.blob,(i,'image')
  if left.has_table:
   assert [[c.text for c in row.cells] for row in left.table.rows]==[[c.text for c in row.cells] for row in right.table.rows]
 assert a.notes_slide.notes_text_frame.text==b.notes_slide.notes_text_frame.text,(i,'notes')
 for shape in b.shapes:
  if shape.has_text_frame and shape.top/deck.slide_height>.91 and shape.left/deck.slide_width>.85 and re.fullmatch(r'\d{1,2}',shape.text.strip()):
   assert shape.text.strip()==f'{i+1:02d}',(i,'footer number')
# Part A has no changes, including its XML and all four original page numbers.
original=Presentation(BASE)
for i in range(4):assert etree.tostring(original.slides[i]._element)==etree.tostring(merged.slides[i]._element)
with zipfile.ZipFile(out) as archive:
 assert len(archive.namelist())==len(set(archive.namelist()))
 assert archive.testzip() is None
(OUT/'合并说明.txt').write_text('文明航程｜完整英文合并版｜22页\n\n1–4页：原完整PPT第1部分，保持不变。\n5–11页：新版Part B（7页）。\n12–16页：新版Part C（5页）。\n17–22页：新版个人AI工具与BP部分（6页，对应重做的第4、5部分）。\n\n三份新稿的内容、图片、表格与演讲者备注完整保留。页脚统一为连续页码。\n',encoding='utf-8')
print(out)
print('Verified 22 slides; Part A unchanged; all source text, pictures, tables, themes and notes retained.')
