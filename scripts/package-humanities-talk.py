#!/usr/bin/env python3
"""Deliver matching English and Chinese introductions; each archive contains a demo and one PPT."""
import hashlib,json,re,shutil,subprocess,tempfile,zipfile
from pathlib import Path
from pptx import Presentation
import fitz
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'.impeccable/humanities-talk';DATA=json.loads((ROOT/'docs/humanities-introduction.json').read_text())
assert len(DATA)==20
for lang in ['en','zh']:
 work=BASE/lang;tag=lang.upper();name='Civilization-Voyage-Project-'+tag
 source=work/'Presentation'/('Civilization-Voyage-中文理解.pptx' if lang=='zh' else 'Civilization-Voyage-Presentation-EN.pptx')
 pdf=source.with_suffix('.pdf');movie=work/'Civilization-Voyage-Demo.mp4';deck=Presentation(source);assert len(deck.slides)==len(DATA)
 for index,slide in enumerate(deck.slides):
  note=slide.notes_slide.notes_text_frame.text;expected=DATA[index]['note_zh' if lang=='zh' else 'note_en'];assert note.startswith(expected)
  text=' '.join(s.text for s in slide.shapes if s.has_text_frame)
  assert bool(re.search(r'[\u3400-\u9fff]',text))==(lang=='zh')
 with fitz.open(pdf) as document:assert len(document)==len(DATA)
 with zipfile.ZipFile(source) as archive:
  assert archive.testzip() is None;media=[n for n in archive.namelist() if n.endswith('.mp4')];assert len(media)==1
  assert hashlib.sha256(archive.read(media[0])).digest()==hashlib.sha256(movie.read_bytes()).digest()
 folder=Path.home()/'Desktop'/name;folder.mkdir(exist_ok=True)
 expected={'Civilization-Voyage-Presentation-'+tag+'.pptx','Civilization-Voyage-Demo-'+tag+'.mp4'}
 assert {p.name for p in folder.iterdir()}<=expected,'Unexpected files: preserve the existing folder'
 shutil.copy2(source,folder/('Civilization-Voyage-Presentation-'+tag+'.pptx'));shutil.copy2(movie,folder/('Civilization-Voyage-Demo-'+tag+'.mp4'))
 shutil.copy2(pdf,Path.home()/'Desktop'/(name+'.pdf'));target=folder.with_suffix('.zip')
 subprocess.run(['/usr/bin/ditto','-c','-k','--keepParent','--norsrc',str(folder),str(target)],check=True)
 with zipfile.ZipFile(target) as archive:assert len([n for n in archive.namelist() if not n.endswith('/')])==2 and archive.testzip() is None
 with tempfile.TemporaryDirectory(prefix='voyage-project-unpack-') as tmp:
  subprocess.run(['/usr/bin/ditto','-x','-k',str(target),tmp],check=True)
  unpacked=[p for p in Path(tmp).rglob('*') if p.is_file()];assert len(unpacked)==2
  for p in unpacked:assert hashlib.sha256(p.read_bytes()).digest()==hashlib.sha256((folder/p.name).read_bytes()).digest()
 print('Verified',lang,'20 pages, aligned speaker notes, correct-language movie, two-file archive and actual extraction:',target,flush=True)
