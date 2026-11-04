"""Editable presentation primitives shared by the speaker-led deck."""
from pathlib import Path
from functools import lru_cache
from PIL import Image,ImageDraw,ImageFont,ImageOps
from pptx.util import Inches,Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE,MSO_CONNECTOR
W,H=1920,1080
INK='071B29';PANEL='0B3046';GREEN='35C5A5';PAPER='F1F5F4';WHITE='EDF6F5';MUTED='9BB4BC';LINE='264454'
OUT=None
@lru_cache(maxsize=128)
def font(size,bold=False,kind='sans'):
 if kind=='serif':return ImageFont.truetype('/System/Library/Fonts/Supplemental/Georgia.ttf',int(size))
 if kind=='mono':return ImageFont.truetype('/System/Library/Fonts/Menlo.ttc',int(size))
 return ImageFont.truetype('/System/Library/Fonts/Avenir Next.ttc',int(size),index=0 if bold else 7)
def wrap(value,size,width,bold=False,kind='sans'):
 lines=[];f=font(size,bold,kind)
 for paragraph in str(value).split('\n'):
  line=''
  for word in paragraph.split():
   trial=(line+' '+word).strip()
   if line and f.getlength(trial)>width:lines.append(line);line=word
   else:line=trial
  lines.append(line)
 return lines
class Page:
 def __init__(self,deck,row,index,light=False,hero=False):
  self.row=row;self.index=index;self.light=light;self.fg=INK if light else WHITE;self.muted='526D78' if light else MUTED;self.accent='087F69' if light else GREEN
  self.slide=deck.slides.add_slide(deck.slide_layouts[6]);self.slide.background.fill.solid();self.slide.background.fill.fore_color.rgb=RGBColor.from_string(PAPER if light else INK)
  self.image=Image.new('RGB',(W,H),'#'+(PAPER if light else INK));self.draw=ImageDraw.Draw(self.image)
  if not hero:
   self.text(row['label'],96,66,1500,38,22,self.accent,kind='mono')
   first,_,second=row['en'].partition('\n');self.text(first,96,145,1730,92,72,self.fg,True,minsize=56)
   if second:self.text(second,96,235,1730,92,72,self.accent,True,minsize=56)
   self.text('CV',1660,876,170,140,124,'E3EBE8' if light else '0B2433',True)
 def rect(self,x,y,w,h,color,border=None):
  self.draw.rectangle((x,y,x+w,y+h),fill='#'+color,outline='#'+border if border else None,width=2)
  s=self.slide.shapes.add_shape(MSO_SHAPE.RECTANGLE,Inches(x/144),Inches(y/144),Inches(w/144),Inches(h/144));s.fill.solid();s.fill.fore_color.rgb=RGBColor.from_string(color)
  if border:s.line.color.rgb=RGBColor.from_string(border)
  else:s.line.fill.background()
  return s
 def line(self,x1,y1,x2,y2,color=LINE,width=2):
  self.draw.line((x1,y1,x2,y2),fill='#'+color,width=width)
  s=self.slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT,Inches(x1/144),Inches(y1/144),Inches(x2/144),Inches(y2/144));s.line.color.rgb=RGBColor.from_string(color);s.line.width=Pt(width/2)
 def text(self,value,x,y,w,h,size=38,color=None,bold=False,minsize=28,kind='sans'):
  color=color or self.fg;lines=wrap(value,size,w,bold,kind)
  while (len(lines)*size*1.17>h or any(font(size,bold,kind).getlength(t)>w for t in lines)) and size>minsize:
   size-=1;lines=wrap(value,size,w,bold,kind)
  assert len(lines)*size*1.17<=h+2,(self.index+1,value,lines,size,h)
  for i,line in enumerate(lines):self.draw.text((x,y+i*size*1.17),line,font=font(size,bold,kind),fill='#'+color,anchor='lt')
  shape=self.slide.shapes.add_textbox(Inches(x/144),Inches(y/144),Inches(w/144),Inches(h/144));f=shape.text_frame;f.clear();f.margin_left=f.margin_right=f.margin_top=f.margin_bottom=0;f.word_wrap=False
  for i,line in enumerate(lines):
   p=f.paragraphs[0] if i==0 else f.add_paragraph();p.text=line;p.font.name='Georgia' if kind=='serif' else 'Menlo' if kind=='mono' else 'Avenir Next';p.font.size=Pt(size/2);p.font.bold=bold;p.font.color.rgb=RGBColor.from_string(color);p.line_spacing=Pt(size*1.17/2);p.space_before=p.space_after=Pt(0)
  return shape
 def picture(self,path,x,y,w,h,fill=False):
  img=Image.open(path).convert('RGB')
  if fill:img=ImageOps.fit(img,(int(w),int(h)),method=Image.Resampling.LANCZOS)
  else:img.thumbnail((int(w),int(h)),Image.Resampling.LANCZOS)
  px=x+(w-img.width)/2;py=y+(h-img.height)/2;self.image.paste(img,(int(px),int(py)))
  if fill:
   asset=OUT/f'crop-{self.index}.png';img.save(asset);path=asset
  self.slide.shapes.add_picture(str(path),Inches(px/144),Inches(py/144),width=Inches(img.width/144),height=Inches(img.height/144))
 def note(self,value,x,y,w=1728,size=34):self.text(value,x,y,w,110,size,self.muted,minsize=28)
 def footer(self,value='Current prototype · Sources and speaker notes in this presentation.'):
  self.line(96,1009,1824,1009,'C9D8D5' if self.light else LINE,1);self.text(value,96,1031,1580,33,20,self.muted,minsize=18);self.text(f'{self.index+1:02d}',1750,1030,75,35,22,self.muted,kind='mono')
 def band(self,value,y=904):
  self.rect(96,y,1728,76,self.accent);self.text(value,124,y+18,1672,46,30,INK if not self.light else WHITE,True,minsize=26)
 def finish(self):
  self.slide.notes_slide.notes_text_frame.text=self.row['note_en'];target=OUT/'Previews'/f'{self.index+1:02d}.png';target.parent.mkdir(exist_ok=True);self.image.save(target);return target

