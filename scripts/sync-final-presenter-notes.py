"""Sync six latest HTML speeches and retain every other member's submitted notes."""
import hashlib,json,shutil,re
from datetime import datetime
from pathlib import Path
from lxml import etree,html
from pptx import Presentation
ROOT=Path(__file__).resolve().parents[1]
INPUT=Path('/Users/jacky/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_g3yzg8geddie22_9117/msg/file/2026-11')
PPT=Path.home()/'Desktop/文明航程-最终演讲版/Civilization-Voyage-Full-EN.pptx'
HTML=Path.home()/'Desktop/文明航程-演讲稿-17-22页.html'
backup=ROOT/'.impeccable/presenter-note-backups'/datetime.now().strftime('%Y%m%d-%H%M%S');backup.mkdir(parents=True)
shutil.copy2(PPT,backup/PPT.name);shutil.copy2(HTML,backup/HTML.name)
deck=Presentation(PPT);assert len(deck.slides)==26
visuals=[etree.tostring(s._element) for s in deck.slides]
expected={};changed=[]
cover=Presentation(INPUT/'Civilization-Voyage-Full-EN(1).pptx')
expected[0]=cover.slides[0].notes_slide.notes_text_frame.text
for name,start,count in [('Civilization Voyage-PartA.pptx',1,7),('Civilization_Voyage_Part_B_Illustrated_Cover_EN.pptx',8,7),('CV_C_Final.pptx',15,5)]:
 source=Presentation(INPUT/name);assert len(source.slides)==count
 for i,slide in enumerate(source.slides):expected[start+i]=slide.notes_slide.notes_text_frame.text
page=html.fromstring(HTML.read_text());cls=lambda n:"contains(concat(' ',normalize-space(@class),' '),' "+n+" ')"
txt=lambda e:' '.join(' '.join(e.itertext()).split());notes=[]
for section in page.xpath('//section['+cls('slide')+']'):
 n=int(section.get('id')[1:]);assert 17<=n<=22
 paragraphs=[txt(p) for p in section.xpath('.//*['+cls('en')+']/p')]
 paragraphs.extend(txt(p) for p in section.xpath('.//*['+cls('bridge')+']/*['+cls('b-en')+']'))
 assert paragraphs and all(paragraphs)
 speech='\n\n'.join(paragraphs);destination=n+4;expected[destination-1]=speech
 notes.append(dict(source_page=n,destination_page=destination,script=speech))
assert [n['source_page'] for n in notes]==list(range(17,23))
assert set(expected)==set(range(26))
for i,speech in expected.items():
 frame=deck.slides[i].notes_slide.notes_text_frame
 if frame.text!=speech:changed.append(i+1);frame.text=speech
# Stage, reopen and verify before replacing the deliverable.
stage=PPT.with_name('Civilization-Voyage-Full-EN.notes-update.pptx');deck.save(stage)
check=Presentation(stage)
for i,slide in enumerate(check.slides):
 assert etree.tostring(slide._element)==visuals[i],('visual change',i+1)
 assert slide.notes_slide.notes_text_frame.text==expected[i],('note mismatch',i+1)
stage.replace(PPT)
(ROOT/'docs/speaker-notes-from-latest-html.json').write_text(json.dumps({'source':str(HTML),'sha256':hashlib.sha256(HTML.read_bytes()).hexdigest(),'slides':notes},ensure_ascii=False,indent=2)+'\n')
report={'ppt':str(PPT),'html':str(HTML),'html_sha256':hashlib.sha256(HTML.read_bytes()).hexdigest(),'changed_pages':changed,'cover_note_matches_supplied_full_deck':True,'part_a_pages_2_to_8_match_original':True,'part_b_pages_9_to_15_match_original':True,'part_c_pages_16_to_20_match_original':True,'personal_pages_21_to_26_match_latest_visible_html':True,'visuals_unchanged':True}
(ROOT/'docs/presenter-note-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'updated_pages':changed,'other_members_verified':19,'cover_verified':True,'personal_pages':[21,22,23,24,25,26],'visuals_unchanged':True},ensure_ascii=False))
