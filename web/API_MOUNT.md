# Serving the frontend from FastAPI

Add this to the **bottom** of `api/main.py`, after every route is defined.
Order matters: mounting at `/` catches everything, so it must come last or
it will swallow your API routes.

```python
from pathlib import Path
from fastapi.staticfiles import StaticFiles

# Serve the built React app, if it exists.
# The pipeline runs with or without this — the UI is optional.
WEB_DIST = Path(__file__).parent.parent / "web" / "dist"
if WEB_DIST.is_dir():
    app.mount("/", StaticFiles(directory=WEB_DIST, html=True), name="ui")
```

The `if` guard matters. Someone who clones the repo and runs `docker compose up`
without ever installing Node still gets a working API. The frontend is additive.

## Mounting it into the container

`api/Dockerfile` copies only the `api/` folder today. Add the built assets in
`docker-compose.yml` as a read-only bind mount so a rebuild of the UI does not
require a rebuild of the image:

```yaml
  api:
    volumes:
      - ./web/dist:/app/web/dist:ro
```

## CORS

Once the UI is served from the same origin as the API, the browser makes
same-origin requests and CORS stops applying. You can leave the existing
`CORSMiddleware` in place for `npm run dev` (port 5173 to port 8000), but it is
no longer load-bearing in production.
