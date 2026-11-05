"""Export the current six-slide speaking script with rehearsal cues."""
import html,json,re
from pathlib import Path
from reportlab.platypus import SimpleDocTemplate,Paragraph,PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
import fitz
from pptx import Presentation
ROOT=Path(__file__).resolve().parents[1]
rows=json.loads((ROOT/'docs/personal-closing.json').read_text())
OUT=Path.home()/'Desktop/文明航程-个人结尾-6页'
pdfmetrics.registerFont(TTFont('Speech','/System/Library/Fonts/Supplemental/Arial Unicode.ttf'))
pdfmetrics.registerFont(TTFont('Heading','/System/Library/Fonts/Supplemental/Arial Bold.ttf'))
styles={
 'title':ParagraphStyle('title',fontName='Heading',fontSize=21,leading=26,textColor=HexColor('#102C3B'),spaceAfter=12),
 'meta':ParagraphStyle('meta',fontName='Speech',fontSize=10,leading=15,textColor=HexColor('#526D78'),spaceAfter=12),
 'cue':ParagraphStyle('cue',fontName='Speech',fontSize=9.5,leading=14,textColor=HexColor('#087F69'),spaceBefore=9,spaceAfter=6),
 'body':ParagraphStyle('body',fontName='Speech',fontSize=12.5,leading=18,spaceAfter=8),
}
flow=[]
for i,r in enumerate(rows):
 if i:flow.append(PageBreak())
 flow.append(Paragraph(html.escape(r['en']),styles['title']))
 flow.append(Paragraph(f"第 {i+1} 页 / 6 · 预计 {r['seconds']//60}:{r['seconds']%60:02d} · 全稿约8分钟（含停顿）",styles['meta']))
 for part in r['rehearsal']:
  flow.append(Paragraph('【'+html.escape(part['cue_zh'])+'】',styles['cue']))
  for para in part['en'].split('\n\n'):
   flow.append(Paragraph(html.escape(para).replace('\n','<br/>'),styles['body']))
def footer(c,d):
 c.setStrokeColor(HexColor('#CDDAD9'));c.line(45,44,A4[0]-45,44)
 c.setFont('Speech',9);c.setFillColor(HexColor('#526D78'))
 c.drawString(45,29,'Civilization Voyage | 中文提示不朗读')
 c.drawRightString(A4[0]-45,29,str(d.page))
out=OUT/'文明航程-8分钟英文演讲稿-含看图提示.pdf'
SimpleDocTemplate(str(out),pagesize=A4,rightMargin=45,leftMargin=45,topMargin=42,bottomMargin=58,title='Civilization Voyage — Eight-minute speaking script',author='Civilization Voyage').build(flow,onFirstPage=footer,onLaterPages=footer)
with fitz.open(out) as doc:
 assert len(doc)==len(rows),(len(doc),len(rows))
 for i,page in enumerate(doc):
  extracted=' '.join(page.get_text().split())
  for part in rows[i]['rehearsal']:
   assert ' '.join(part['en'].split()) in extracted,(i,part['en'][:40])
for lang in ['en','zh']:
 deck=Presentation(OUT/f'Civilization-Voyage-My-Part-{lang.upper()}.pptx')
 assert len(deck.slides)==len(rows)
 for i,slide in enumerate(deck.slides):
  assert slide.notes_slide.notes_text_frame.text.startswith(rows[i][lang+'_script'])
 assert all(r[lang+'_script'] in (OUT/f'Speech-{lang.upper()}.txt').read_text() for r in rows)
assert sum(r['seconds'] for r in rows)==480
assert not re.search(r'\b(?:there|here) are\b',' '.join(r['en_script'] for r in rows),re.I)
print(out)
print('Verified: six PDF pages, complete script, matching bilingual PPT notes and TXT.')
