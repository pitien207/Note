from __future__ import annotations

import json
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "data"
NOTES_FILE = DATA_DIR / "notes.json"


def ensure_notes_file() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if not NOTES_FILE.exists():
        NOTES_FILE.write_text("[]\n", encoding="utf-8")


class NoteRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def do_GET(self) -> None:
        if self.path == "/api/notes":
            self.handle_get_notes()
            return

        super().do_GET()

    def do_PUT(self) -> None:
        if self.path == "/api/notes":
            self.handle_put_notes()
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Endpoint not found")

    def handle_get_notes(self) -> None:
        ensure_notes_file()
        payload = NOTES_FILE.read_text(encoding="utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload.encode("utf-8"))

    def handle_put_notes(self) -> None:
        ensure_notes_file()

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid content length")
            return

        raw_body = self.rfile.read(content_length)

        try:
            notes = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError:
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid JSON body")
            return

        if not isinstance(notes, list):
            self.send_error(HTTPStatus.BAD_REQUEST, "Notes payload must be an array")
            return

        NOTES_FILE.write_text(
            json.dumps(notes, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

        response = json.dumps({"status": "ok"}).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)


def run() -> None:
    ensure_notes_file()
    server = ThreadingHTTPServer(("0.0.0.0", 8000), NoteRequestHandler)
    print("Serving Note app on http://0.0.0.0:8000")
    print(f"Notes file: {NOTES_FILE}")
    server.serve_forever()


if __name__ == "__main__":
    run()
