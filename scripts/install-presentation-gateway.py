#!/usr/bin/env python3
"""Install the optional per-request model gateway beside the desktop game."""
import argparse
import datetime
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import time
import urllib.request

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--start',action='store_true');args=parser.parse_args()
    root=Path(__file__).resolve().parents[1]
    support=Path.home()/'Library/Application Support/CivilizationVoyage'
    launcher=support/'launch.sh';python=support/'venv/bin/python'
    if not launcher.is_file() or not python.is_file():raise SystemExit('需要现有桌面App和Python环境。')
    source=(root/'apps/api/voyage/presentation.py').read_bytes();destination=support/'gateway';destination.mkdir(exist_ok=True)
    stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f');backup=support/'backups'/('gateway-'+stamp);backup.mkdir(parents=True)
    shutil.copy2(launcher,backup/'launch.sh')
    changed=not (destination/'app.py').exists() or (destination/'app.py').read_bytes()!=source
    if (destination/'app.py').exists():shutil.copy2(destination/'app.py',backup/'app.py')
    (destination/'app.py.next').write_bytes(source);os.replace(destination/'app.py.next',destination/'app.py')
    block='''# BEGIN CIVILIZATION PRESENTATION GATEWAY
if ! port_open 8016; then
  nohup "$PY" -m uvicorn app:app --host 127.0.0.1 --port 8016 --app-dir "$SUP/gateway" >"$SUP/logs/gateway.log" 2>&1 &
  echo $! >"$SUP/gateway.pid"
  for i in $(seq 1 40); do port_open 8016 && break; sleep 0.1; done
fi
# END CIVILIZATION PRESENTATION GATEWAY

'''
    text=launcher.read_text();start=text.find('# BEGIN CIVILIZATION PRESENTATION GATEWAY')
    if start>=0:
        end=text.index('# END CIVILIZATION PRESENTATION GATEWAY',start)+len('# END CIVILIZATION PRESENTATION GATEWAY')
        text=text[:start]+block+text[end:].lstrip('\n')
    else:
        marker='open -a "Google Chrome"'
        if marker not in text:raise SystemExit('启动器格式不符，未修改启动命令。')
        position=text.index(marker);text=text[:position]+block+text[position:]
    launcher.write_text(text)
    pid_file=support/'gateway.pid'
    if changed and pid_file.exists():
        try:
            pid=int(pid_file.read_text());command=subprocess.run(['ps','-p',str(pid),'-o','command='],capture_output=True,text=True).stdout
            if 'uvicorn app:app' in command and '--port 8016' in command and str(destination) in command:
                os.kill(pid,signal.SIGTERM)
                for _ in range(50):
                    try:os.kill(pid,0)
                    except ProcessLookupError:break
                    time.sleep(.1)
        except (ValueError,ProcessLookupError):pass
    if args.start:
        try:
            with socket.create_connection(('127.0.0.1',8016),timeout=1):running=True
        except OSError:running=False
        if not running:
            with (support/'logs/gateway.log').open('ab') as log:
                process=subprocess.Popen([str(python),'-m','uvicorn','app:app','--host','127.0.0.1','--port','8016','--app-dir',str(destination)],stdout=log,stderr=log,start_new_session=True)
            pid_file.write_text(str(process.pid))
        for _ in range(50):
            try:
                with urllib.request.urlopen('http://127.0.0.1:8016/health',timeout=1) as response:health=json.load(response)
                if health.get('service')!='presentation-gateway':raise SystemExit('8016端口由其他服务占用，未停止它。')
                print('本机模型接口已就绪，密钥仅按请求接收；原游戏API和存档未更换。');break
            except (OSError,ValueError):time.sleep(.1)
        else:raise SystemExit('模型接口未启动，请检查本机gateway日志。')
    print('启动器和接口备份：'+str(backup))

if __name__=='__main__':main()
