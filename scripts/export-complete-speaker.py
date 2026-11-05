"""Prepare the presenter's read-aloud copy against the merged deck, slides 17–22."""
import html,json,re
from pathlib import Path
from reportlab.platypus import SimpleDocTemplate,Paragraph,PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from pptx import Presentation
import fitz
ROOT=Path(__file__).resolve().parents[1]
OUT=Path.home()/'Desktop/文明航程-完整合并版-22页'
rows=json.loads((ROOT/'docs/personal-closing.json').read_text())
deck=Presentation(OUT/'Civilization-Voyage-Full-EN.pptx')
assert len(deck.slides)==22
assert len(rows)==6 and sum(row['seconds'] for row in rows)==480
for i,row in enumerate(rows):
 assert deck.slides[i+16].notes_slide.notes_text_frame.text.startswith(row['en_script'])
 assert '\n\n'.join(part['en'] for part in row['rehearsal'])==row['en_script']
assert deck.slides[21].shapes and any(s.has_text_frame and s.text=='Thank you' for s in deck.slides[21].shapes)
pdfmetrics.registerFont(TTFont('Reading','/System/Library/Fonts/Supplemental/Arial Unicode.ttf'))
meta=ParagraphStyle('meta',fontName='Reading',fontSize=10,leading=15,textColor=HexColor('#526D78'),spaceAfter=17)
body_en=ParagraphStyle('en',fontName='Reading',fontSize=13.5,leading=20,spaceAfter=12)
body_zh=ParagraphStyle('zh',fontName='Reading',fontSize=14,leading=24,spaceAfter=14,wordWrap='CJK')
def footer(c,doc):
 c.setStrokeColor(HexColor('#CDDAD9'));c.line(45,44,A4[0]-45,44)
 c.setFont('Reading',9);c.setFillColor(HexColor('#526D78'))
 c.drawString(45,29,'Civilization Voyage | AI tools and business plan')
 c.drawRightString(A4[0]-45,29,str(doc.page))
for lang,tag in [('en','英文'),('zh','中文理解')]:
 flow=[]
 for i,row in enumerate(rows):
  if i:flow.append(PageBreak())
  timing=f"{row['seconds']//60}:{row['seconds']%60:02d}"
  heading=f'CIVILIZATION VOYAGE · PPT {i+17} / 22 · {timing}' if lang=='en' else f'文明航程｜对应完整PPT第{i+17}页｜约{timing}'
  flow.append(Paragraph(heading,meta))
  for para in row[lang+'_script'].split('\n\n'):
   flow.append(Paragraph(html.escape(para).replace('\n','<br/>'),body_en if lang=='en' else body_zh))
 path=OUT/f'我的演讲稿-{tag}-第17至22页.pdf'
 SimpleDocTemplate(str(path),pagesize=A4,rightMargin=45,leftMargin=45,topMargin=42,bottomMargin=58,title=f'Civilization Voyage — Speaker copy, slides 17–22 ({lang.upper()})',author='Civilization Voyage').build(flow,onFirstPage=footer,onLaterPages=footer)
 with fitz.open(path) as pdf:
  assert len(pdf)==6,(lang,len(pdf))
  if lang=='en':
   for i,page in enumerate(pdf):
    text=' '.join(page.get_text().split())
    assert ' '.join(rows[i]['en_script'].split()) in text,i
  else:
   for i,page in enumerate(pdf):
    text=re.sub(r'\s+','',page.get_text())
    assert re.sub(r'\s+','',rows[i]['zh_script']) in text,i
 print(path)
words=sum(len(re.findall(r"\b[\w’-]+\b",row['en_script'])) for row in rows)
print(f'Verified: {words}-word English speech, six pages, matching merged PPT 17–22 and final Thank you.')
