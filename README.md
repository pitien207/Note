# Note

A small, elegant note-taking website built with plain HTML, CSS, JavaScript, and a tiny Python file API for persistent storage.

## Structure

- `index.html`: main page layout
- `server.py`: local web server plus `/api/notes` file storage endpoint
- `data/notes.json`: note data saved on disk
- `src/styles/`: split styles for base, layout, and UI components
- `src/scripts/store.js`: browser + Raspberry Pi file persistence
- `src/scripts/utils.js`: note formatting and ordering helpers
- `src/scripts/ui.js`: DOM rendering and form helpers
- `src/scripts/app.js`: app state and event wiring

## Usage

Run the app through the Python server so notes are written to disk:

```bash
python3 server.py
```

Then open:

```text
http://<your-raspberry-pi-ip>:8000
```

Notes will be stored in `data/notes.json` inside this project folder.

If you are using Cloudflare Tunnel or another reverse proxy on a custom local port, run the server on that port instead:

```bash
PORT=34003 python3 server.py
```

Then point your proxy or tunnel ingress to the same port.
