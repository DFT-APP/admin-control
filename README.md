# DFT Admin

The internal admin console for DFT: users, analysts, trades, signals, videos,
credits and withdrawals, coin icons, platform analytics and server status.

A React + TypeScript SPA built with Vite. It has no server of its own — the
build is static files, and the browser talks straight to the DFT API.

---

## Requirements

- Node 22 (matches the backend image and the Dockerfile build stage)
- A reachable DFT API

## Local development

```bash
cp .env.example .env      # then set VITE_API_URL
npm install
npm run dev               # http://localhost:5173
```

Sign in with an account that has the admin role. Logging in is not enough on
its own: after authenticating, the panel calls an admin-only endpoint and
refuses any account the server does not confirm as an admin.

> **`.env` points local development at whichever API you name.** Pointing it at
> `https://api.dft.market` means every click in your dev server is editing
> production data — deleting a user, adjusting a wallet, approving an analyst.
> Point it at a local or staging backend unless you specifically intend that.

## Configuration

| Variable | Where it applies | Notes |
| --- | --- | --- |
| `VITE_API_URL` | build time | Base URL of the API, no trailing slash. Defaults to `https://api.dft.market`. |
| `API_ORIGIN` | container run time | Origin allowed by the CSP `connect-src`. Must match `VITE_API_URL`, or the browser blocks every request. compose defaults both to the same value. |

**`VITE_API_URL` is fixed at build time.** Vite inlines `import.meta.env` into
the JavaScript it emits, so an image built against staging cannot be repointed
at production with an environment variable — it has to be rebuilt. For the same
reason, never put a secret in a `VITE_` variable: whatever you pass is readable
in the served bundle by anyone who can open the panel.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Typechecks (`tsc -b`), then builds to `dist/` |
| `npm run preview` | Serves the built `dist/` locally |
| `npm run lint` | ESLint over the whole project |

`npm run build` fails on a type error, so a broken build never reaches an image.

## Deployment

The panel is served at **https://admin.dft.market**, talking to the API at
**https://api.dft.market**. Two tiers:

```
admin.dft.market  ──►  host nginx (TLS)  ──►  container on 127.0.0.1:8080
                       docker/admin.dft.market.conf
```

**1. DNS** — point `admin.dft.market` at the server (an `A` record to the same
host that already serves `api.dft.market`).

**2. Reverse proxy** — install the vhost and issue a certificate:

```bash
sudo cp docker/admin.dft.market.conf /etc/nginx/sites-available/admin.dft.market
sudo ln -s /etc/nginx/sites-available/admin.dft.market /etc/nginx/sites-enabled/
sudo certbot --nginx -d admin.dft.market
sudo nginx -t && sudo systemctl reload nginx
```

**3. The panel:**

```bash
docker compose up -d --build
```

The container publishes to `127.0.0.1:8080` only — the vhost is the sole route
in, so binding all interfaces would expose the panel on port 8080 with no TLS.
`GET /healthz` returns `200 ok` for liveness checks.

Without compose:

```bash
docker build -t dft-admin --build-arg VITE_API_URL=https://api.dft.market .
docker run -d -p 127.0.0.1:8080:8080 -e API_ORIGIN=https://api.dft.market dft-admin
```

### Before the first deploy: allow the origin on the API

The panel is on a **different origin** from the API, so every request is
cross-origin. The backend reads `CORS_ALLOWED_ORIGINS`; when it is empty it
reflects whatever `Origin` it is given, which works but allows every site on
the internet to call the API with `credentials: true`. Now that the panel has a
fixed hostname, pin it — in `backend/.env`:

```
CORS_ALLOWED_ORIGINS=https://admin.dft.market
```

Restart the API after changing it. Get this wrong and the panel loads but every
request fails in the browser with a CORS error while the server logs a clean
200 — check the browser console before suspecting the API.

### HSTS

The vhost sends `Strict-Transport-Security` with `includeSubDomains`, which
applies to **every** `*.dft.market` host, not just this one. Do not enable it
until each of them serves HTTPS — browsers will refuse plain HTTP to the whole
domain for two years and there is no way to withdraw it early from the server.

### What the container's nginx does

See [`docker/default.conf.template`](docker/default.conf.template).

- **SPA fallback.** Routing lives in the browser, so `/users` is not a file on
  disk. Without `try_files … /index.html`, a refresh or a shared deep link
  returns 404 — the most common way a working SPA build looks broken.
- **Cache policy.** Hashed files under `/assets/` are immutable and cached for
  a year; `index.html` is never cached, because it is what names the current
  asset hashes. A cached `index.html` pins a browser to a bundle that no longer
  exists.
- **Security headers**, including a CSP with no `script-src` exception. They are
  all set at the server level: a single `add_header` inside a `location` in
  nginx discards every header inherited from the parent, so the cache policy is
  computed with a `map` instead of being set per location.
- **Missing assets 404** rather than falling back to `index.html`, so a bad
  deploy reports itself instead of handing the browser HTML where it asked for
  JavaScript.

### Deploying to a static host instead

The bundle is plain static files, so any host works — the one thing you must
configure is the SPA fallback, and the headers above are then the platform's
job:

- **Netlify** — `_redirects`: `/*  /index.html  200`
- **Vercel** — `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
- **S3 + CloudFront** — error document `index.html`, or a 404/403 → `/index.html`
  response mapping

## Layout

```
src/
  components/
    layout/      app shell — header, sidebar drawer, layout
    table/       DataTable: a table on desktop, cards on phone and tablet
    ui/          modal/sheet, toaster
    dashboard/   activity rail
  hooks/         one per API area; React Query wrappers
  lib/           apiClient (fetch + upload with progress), shared types
  router/        routes and pages
  store/         auth (Zustand)
```

### Notes for the next person

- **Responsive.** Data tables become cards below `lg`; dialogs are bottom sheets
  below `sm`. Shared `.btn` / `.chip` / `.field` / `.page` classes live in
  `src/index.css` and carry the 44px touch-target minimum.
- **Auth.** The token is in `localStorage`. A 401 or 403 from any request clears
  the session and returns to the login screen.
- **`tw-animate-css` is inert.** It ships Tailwind v4 `@utility` syntax, which
  this Tailwind v3 build does not compile. Animations are defined directly in
  `src/index.css`; do not reach for its class names.
