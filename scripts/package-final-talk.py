#!/usr/bin/env python3
"""Package the final English talk: one MP4 and one editable presentation."""
import hashlib,re,shutil,zipfile,subprocess,tempfile
from pathlib import Path
from pptx import Presentation
ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'.impeccable/final-talk'
PPT=WORK/'English/Civilization-Voyage-Deep-Sea-Pitch-EN.pptx'
MOVIE=WORK/'Video/Civilization-Voyage-Demo-EN.mp4'
slides=Presentation(PPT).slides
assert len(slides)==18
for index,slide in enumerate(slides):
    assert len(slide.notes_slide.notes_text_frame.text)>200,(index,'Missing speaker notes')
    for shape in slide.shapes:
        if shape.has_text_frame:
            assert not re.search(r'[\u3400-\u9fff]|TODO|TBD|PLACEHOLDER',shape.text),shape.text
with zipfile.ZipFile(PPT) as archive:
    assert archive.testzip() is None
    movies=[name for name in archive.namelist() if name.endswith('.mp4')]
    assert len(movies)==1
    assert hashlib.sha256(archive.read(movies[0])).digest()==hashlib.sha256(MOVIE.read_bytes()).digest()
folder=Path.home()/'Desktop/Civilization-Voyage-Final'
folder.mkdir(exist_ok=True)
expected={'Civilization-Voyage-Presentation.pptx','Civilization-Voyage-Demo.mp4'}
assert {p.name for p in folder.iterdir()}<=expected,'Preserve unexpected files; choose a new output folder'
shutil.copy2(PPT,folder/'Civilization-Voyage-Presentation.pptx')
shutil.copy2(MOVIE,folder/'Civilization-Voyage-Demo.mp4')
path=folder.with_suffix('.zip')
subprocess.run(['/usr/bin/ditto','-c','-k','--keepParent','--norsrc',str(folder),str(path)],check=True)
with zipfile.ZipFile(path) as archive:
    files=[name for name in archive.namelist() if not name.endswith('/')]
    assert len(files)==2 and archive.testzip() is None
with tempfile.TemporaryDirectory(prefix='voyage-unpack-check-') as temporary:
    target=Path(temporary)
    subprocess.run(['/usr/bin/ditto','-x','-k',str(path),str(target)],check=True)
    unpacked=[p for p in target.rglob('*') if p.is_file()]
    assert len(unpacked)==2
    for p in unpacked:
        assert hashlib.sha256(p.read_bytes()).digest()==hashlib.sha256((folder/p.name).read_bytes()).digest()
print('Verified: 18 English slides, speaker notes, exact MP4 embedded, two-file ZIP, actual macOS extraction.')
print(path,path.stat().st_size,'bytes')
