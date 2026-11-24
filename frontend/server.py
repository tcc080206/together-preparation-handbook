"""Local, dependency-free multi-page server. Public data is read-only."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit
import argparse
import json
from stage_sources import WORKSPACE, load_stages
import sqlite3
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "data_validation"))
from handbook import snapshot
ROOT = Path(__file__).resolve().parent / 'web'
class Handler(SimpleHTTPRequestHandler):
    stage_root = WORKSPACE
    database = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/api/handbook':
            try:
                stages = load_stages(self.stage_root)
                public = snapshot(self.database) if self.database else snapshot()
                body = json.dumps({**public, 'stages': stages}, ensure_ascii=False).encode()
            except (OSError, ValueError, sqlite3.Error) as error:
                self.log_error('%s', error)
                self.send_error(503, 'Handbook unavailable')
                return
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path == '/' or (not Path(path).suffix and (path.split('/')[1] in {'preconception','stages','start','explore','items','benefits','costs','plan','settings'})):
            self.path = '/index.html'
        super().do_GET()
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8780)
    parser.add_argument('--database', type=Path, help='Read a separate SQLite snapshot')
    parser.add_argument('--stage-root', type=Path, default=WORKSPACE, help='Read a separate set of stage files')
    args = parser.parse_args()
    Handler.database = args.database
    Handler.stage_root = args.stage_root
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'一起準備：http://localhost:{args.port}/', flush=True)
    server.serve_forever()


if __name__ == '__main__':
    main()
