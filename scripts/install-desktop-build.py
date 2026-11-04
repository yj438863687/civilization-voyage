#!/usr/bin/env python3
"""Update an existing local desktop installation, retaining its launcher and saves."""
import argparse
import datetime
import json
from pathlib import Path
import shutil
import sqlite3
import urllib.request


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--support-dir', type=Path, default=Path.home() / 'Library/Application Support/CivilizationVoyage')
    parser.add_argument('--api', default='http://127.0.0.1:8010')
    parser.add_argument('--database', type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    build = root / 'apps/web/dist'
    support = args.support_dir
    if not (build / 'index.html').is_file() or not (support / 'launch.sh').is_file():
        raise SystemExit('需要已构建的前端和现有桌面启动器。请先完成 npm run build。')
    stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
    backup = support / 'backups' / stamp
    backup.mkdir(parents=True)
    with urllib.request.urlopen(args.api + '/scenes', timeout=15) as response:
        scenes = json.load(response)
    (backup / 'scenes-before.json').write_text(json.dumps(scenes, ensure_ascii=False, indent=2))
    if args.database:
        if not args.database.is_file():
            raise SystemExit('指定的数据库不存在，停止安装。')
        # The SQLite backup API takes a consistent snapshot while the API is running.
        with sqlite3.connect('file:' + str(args.database.resolve()) + '?mode=ro', uri=True) as source:
            with sqlite3.connect(str(backup / 'voyage.sqlite3')) as target:
                source.backup(target)
    staged = support / ('webdist-next-' + stamp)
    shutil.copytree(build, staged)
    # Add candidates; existing confirmed content and voyage snapshots remain intact.
    for era in ['A', 'B', 'C', 'D']:
        body = (root / 'content/scenes/candidates' / (era + '.json')).read_bytes()
        request = urllib.request.Request(args.api + '/scenes/candidates', data=body, method='PUT', headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(request, timeout=15) as response:
            value = json.load(response)
            if value.get('id') != era:
                raise RuntimeError('场景写入返回了错误的时代，未替换桌面前端。')
    installed = support / 'webdist'
    if installed.exists():
        installed.rename(backup / 'webdist')
    try:
        staged.rename(installed)
    except OSError:
        if (backup / 'webdist').exists():
            (backup / 'webdist').rename(installed)
        raise
    (installed / 'release.json').write_text(json.dumps({'release': 'voyage-story-crew-7', 'installed_at': stamp, 'story_mechanics': 12, 'story_entries': 24, 'port_summaries': 8, 'synchronized_feedback': True, 'music_tracks': 4, 'ship_refit_stages': 16, 'interactive_story_scenes': 24, 'voyage_workspace': True, 'story_first': True, 'crew_story_consultations': True, 'presentation_gateway_port': 8016}, ensure_ascii=False))
    print('桌面前端已更新；原包及安装前快照位于 ' + str(backup))


if __name__ == '__main__':
    main()
