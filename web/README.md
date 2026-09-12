# Royal Square — web

The user-facing layer. React, built with Vite, styled with Tailwind.

It talks to the platform through one thing: the REST API on port 8000. It has
no knowledge of Kafka, Spark, dbt, Airflow or MinIO, and it cannot affect them.
Deleting this folder leaves the pipeline running exactly as before.

## Running it

Requires Node 18 or newer, on the Windows host — not in a container.

```powershell
cd web
npm install          # once
npm run dev          # http://localhost:5173, hot reload
```

`npm run dev` proxies `/health`, `/realtime` and `/analytics` to
`http://localhost:8000`, so the browser sees a single origin and you never
touch CORS while developing.

## Building for the demo

```powershell
npm run build        # writes web/dist/
```

`dist/` is plain HTML, CSS and JavaScript. FastAPI serves it (see
`API_MOUNT.md`), which means the whole platform is still one
`docker compose up` and Node never runs at demo time.

## Why this shape

**Polling intervals encode data freshness.** The claims pipeline polls every
4 seconds because it reads Redis, which the Kafka consumer updates
continuously. The province mart polls every 60 seconds because Airflow rebuilds
it daily — polling it faster would be dishonest about what the number means.
`usePolling` takes the interval as an argument for exactly this reason.

**Every figure is labelled live or batch.** The two paths disagree by design:
the stream is seconds old and approximate, the batch is a day old and
reconciled. A user who cannot tell which they are looking at will eventually
make a decision on the wrong one.

**Empty states are instructions.** "The daily mart has not been built yet. Run
make batch" is more useful than a spinner or a zero. Zeros are indistinguishable
from real zeros.

## Structure

```
src/
  api.js               single fetch layer + ZAR/percentage formatting
  hooks/usePolling.js   interval polling with error state
  components/
    Nav.jsx             sidebar
    LivePipeline.jsx    the stream, flashing on change
    KpiRow.jsx          four headline figures
    ProvinceTable.jsx   batch mart, loss ratio as colour
    OpenClaims.jsx      live Redis sorted set
    ClientLookup.jsx    single-client batch query
    StatusBar.jsx       dependency health
    Primitives.jsx      Card, Tag, Empty, LiveDot
    Icons.jsx           inline SVG, no icon dependency
```
