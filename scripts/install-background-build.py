#!/usr/bin/env python3
"""Install the native story game with history, music and upgrades, preserving all saves."""
import datetime
import json
from pathlib import Path
import shutil
import sqlite3
import urllib.request

root=Path(__file__).resolve().parents[1]
support=Path.home()/'Library/Application Support/CivilizationVoyage'
build=root/'apps/web/dist'
if not (build/'index.html').is_file() or not (support/'launch.sh').is_file():
    raise SystemExit('需要已有桌面安装和已构建的前端。')
stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
backup=support/'backups'/stamp
backup.mkdir(parents=True)
with urllib.request.urlopen('http://127.0.0.1:8010/scenes',timeout=15) as response:scenes=json.load(response)
(backup/'scenes-before.json').write_text(json.dumps(scenes,ensure_ascii=False,indent=2))
database=Path.home()/'work/civilization-voyage-api/voyage.sqlite3'
if not database.is_file():raise SystemExit('存档数据库不存在，停止安装。')
with sqlite3.connect('file:'+str(database)+'?mode=ro',uri=True) as source:
    with sqlite3.connect(str(backup/'voyage.sqlite3')) as target:source.backup(target)
# Republish the baseline scene data under a new version only if needed. Existing
# scene versions remain available to voyages created by the superseded builds.
for era in ['A','B','C','D']:
    baseline=json.loads((root/'content/scenes/candidates'/f'{era}.json').read_text())
    existing=[scene for scene in scenes if scene['id']==era]
    latest=max(existing,key=lambda scene:scene['version']) if existing else None
    if latest and all(latest.get(key)==value for key,value in baseline.items() if key!='version'):continue
    baseline['version']=max([scene['version'] for scene in existing]+[baseline['version']])+1
    request=urllib.request.Request('http://127.0.0.1:8010/scenes/candidates',data=json.dumps(baseline,ensure_ascii=False).encode(),method='PUT',headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(request,timeout=15) as response:assert json.load(response)['id']==era
staged=support/('webdist-original-next-'+stamp)
shutil.copytree(build,staged)
(staged/'release.json').write_text(json.dumps({'release':'resource-endings-demo-v3','baseline':'c1a8fe8','background_notes':24,'routes':8,'features':['chronology','music','ship-refit','crew-outfits','zh-en','larger-text','refined-crew','resource-failure','costly-recovery','recorded-endings'],'installed_at':stamp}))
installed=support/'webdist'
if installed.exists():installed.rename(backup/'webdist')
try:staged.rename(installed)
except OSError:
    if (backup/'webdist').exists():(backup/'webdist').rename(installed)
    raise
print('资源后果与结局版已安装；保留存档，备份：'+str(backup))
