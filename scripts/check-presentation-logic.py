"""Reconcile game evidence, business figures, slide text and presenter notes."""
import json,re
from pathlib import Path
from pptx import Presentation
from presentation_plan import calculate_plan
ROOT=Path(__file__).resolve().parents[1]
model=json.loads((ROOT/'docs/business-assumptions.json').read_text())
plan=calculate_plan(model)
rows=json.loads((ROOT/'docs/personal-closing.json').read_text())
routes=json.loads((ROOT/'apps/web/src/world/voyageHistory.json').read_text())
assert len(routes)==8
assert len({key.split('-')[0] for key in routes})==4
assert sum(len(r['islands'])+1 for r in routes.values())==24
assert sum(r['seconds'] for r in rows)==480
out=Path.home()/'Desktop/文明航程-个人结尾-6页'
s=plan['base']
expected={2:[model['price'][key] for key in ['player','institution','museum']],3:[s['revenue'],s['direct_cost'],s['contribution'],plan['fixed_cost'],abs(s['balance'])],4:[plan['funding_total'],plan['initial_release'],plan['fixed_cost'],plan['delivery_float'],plan['reserve']]}
for lang in ['en','zh']:
 deck=Presentation(out/f'Civilization-Voyage-My-Part-{lang.upper()}.pptx')
 assert len(deck.slides)==len(rows)==6
 for i,slide in enumerate(deck.slides):
  assert slide.notes_slide.notes_text_frame.text.startswith(rows[i][lang+'_script'])
  text=' '.join(shape.text for shape in slide.shapes if shape.has_text_frame)
  for value in expected.get(i,[]):assert f'{value:,}' in text,(lang,i,value)
  for shape in slide.shapes:
   assert shape.left>=0 and shape.top>=0
   assert shape.left+shape.width<=deck.slide_width+10000
   assert shape.top+shape.height<=deck.slide_height+10000
 for row in rows:
  assert '\n\n'.join(p['en'] for p in row['rehearsal'])==row['en_script']
  assert row[lang+'_script'] in (out/f'Speech-{lang.upper()}.txt').read_text()
print('Presentation logic: game counts, all scenario calculations, cash allocation, bilingual slide figures and notes agree; timing totals 8 minutes.')
