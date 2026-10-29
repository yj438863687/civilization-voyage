"""Run from apps/api; this imports models only, without opening a database."""
import json
from pathlib import Path
from voyage.main import app
Path('../../packages/contracts/openapi.json').write_text(json.dumps(app.openapi(), ensure_ascii=False, indent=2)+'\n')
