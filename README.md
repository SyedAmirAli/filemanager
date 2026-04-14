# File manager & chat

A full-stack app for **shared file uploads** (with drag-and-drop, raw text files, previews) and a **real-time chat** backed by SQLite. The **NestJS** API serves REST endpoints and **Socket.IO**; the **React (Vite)** UI is bundled and served from the same server in production.

---

## Tech stack

| Layer | Technology |
|--------|------------|
| Backend | NestJS 11, Express, Prisma 7, SQLite (via `better-sqlite3`) |
| Realtime | Socket.IO (server + `socket.io-client` in the browser) |
| Frontend | React 19, Vite 8, TypeScript, Fuse.js (chat search), Lucide icons |
| Storage | Local disk under `public/uploads/` (organized by type) |

---

## Repository layout

```
filemanager/
├── client/                 # Vite + React SPA
│   ├── src/
│   │   ├── App.tsx         # Files UI, chat, modals, socket client
│   │   ├── apiConfig.ts    # API base URL (dev proxy vs prod SERVER_URL)
│   │   ├── previewableFile.ts
│   │   └── ...
│   ├── index.html          # __SERVER_URL__ injected at build time
│   └── vite.config.ts      # Dev proxy → :5180; production public URL
├── prisma/
│   ├── schema.prisma       # FileRecord, Message
│   └── migrations/
├── public/                 # Static assets + uploads (default)
│   └── uploads/            # Created per upload category
├── src/                    # NestJS application
│   ├── main.ts             # HTTP :5180, CORS, SPA fallback, static public + client/dist
│   ├── files/              # Upload, list, download, preview, delete
│   ├── chat/               # Messages CRUD + bulk delete
│   ├── realtime/           # Socket gateway (chat + filesChanged)
│   └── prisma/
├── dev.db                  # SQLite DB (created after migrate; path from DATABASE_URL)
├── package.json            # Root: Nest scripts + dev:tunnel / host
└── README.md
```

---

## Prerequisites

- **Node.js** (LTS recommended)
- **Yarn** (Classic v1)
- **cloudflared** (optional, for Cloudflare Tunnel — see below)

---

## Installation

From the repository root:

```bash
yarn install
cd client && yarn install && cd ..
```

Generate the Prisma client and apply migrations:

```bash
yarn prisma generate
yarn prisma migrate deploy
```

> On a fresh clone, `migrate deploy` applies existing migrations and creates `dev.db` (or the DB file in `DATABASE_URL`).

---

## Environment variables

Create a `.env` file in the **project root** (Nest loads it via `dotenv` in `main.ts`). Typical keys:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Prisma connection string. Default: `file:./dev.db` (SQLite file in project root). |
| `PORT` | HTTP port for Nest. Default: **5180**. |
| `PUBLIC_DIR` | Absolute path to the public assets root (uploads + static files). If unset: `public/` under `process.cwd()`. |
| `PUBLIC_HOST` or `ADVERTISE_HOST` | Optional hostname/IP printed at startup (no network I/O). |

The **client** does not read `.env` for the API URL in production: `client/vite.config.ts` sets `PRODUCTION_SERVER_URL` and injects `window.SERVER_URL` into `index.html` at **production build** time. Adjust that constant (or refactor to `import.meta.env.VITE_*`) if your public URL is not `https://filemanager.syedamirali.me`.

---

## Development

### 1. Backend (API + Socket.IO)

```bash
yarn dev
```

Listens on **http://0.0.0.0:5180** (default). REST under `/api`, Socket.IO at `/socket.io`.

### 2. Frontend (Vite dev server)

In another terminal:

```bash
cd client
yarn dev
```

Vite runs on **port 5173** and **proxies** `/api` and `/socket.io` to `http://127.0.0.1:5180`, so the UI uses same-origin `/api` without CORS issues.

### 3. Backend + Cloudflare Tunnel together

Requires `cloudflared` on your `PATH` and a valid `~/.cloudflared/config.yml` (see [Cloudflare Tunnel](#cloudflare-tunnel-cloudflared)):

```bash
yarn dev:tunnel
```

Runs `nest start --watch` and `cloudflared tunnel run` via **concurrently** (`-k` stops both when one exits).

---

## Production build

1. Build the React app (injects production `SERVER_URL` in `client/dist/index.html`):

   ```bash
   cd client && yarn build && cd ..
   ```

2. Build the Nest app:

   ```bash
   yarn build
   ```

3. Run:

   ```bash
   yarn start:prod
   ```

Nest serves:

- **`/api/*`** — REST API  
- **`/socket.io`** — WebSocket  
- **`public/`** — static files and uploads  
- **`client/dist/`** — SPA; non-API GET requests fall through to `index.html`

Ensure `client/dist/index.html` exists relative to the compiled `dist/src/main.js` (paths resolve to repo root `client/dist`).

### Optional: `yarn host` (build + Nest + tunnel)

The root script **`yarn host`** runs:

1. `yarn build` (Nest) and `cd client && yarn build` (Vite)  
2. **`yarn start`** (`nest start`, non-watch) in parallel with **`cloudflared tunnel run`**

For a **compiled** production process without the Nest CLI runtime, prefer `yarn build`, `cd client && yarn build`, then **`yarn start:prod`** (`node dist/src/main.js`) alongside the tunnel.

---

## HTTP API (summary)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/files` | List files |
| `POST` | `/api/files` | Multipart upload (`file` field) |
| `GET` | `/api/files/:id/download` | Download (`Content-Disposition: attachment`) |
| `GET` | `/api/files/:id/preview` | Inline display in browser (`Content-Disposition: inline`) |
| `DELETE` | `/api/files/:id` | Delete file + DB row |
| `GET` | `/api/messages?limit=&before=` | Paginated chat messages |
| `PATCH` | `/api/messages/:id` | Edit / pin message |
| `DELETE` | `/api/messages/:id` | Delete message |
| `POST` | `/api/messages/bulk-delete` | Bulk delete by IDs |

Filenames are normalized for UTF-8 (multipart decoding) before storage.

---

## Socket.IO events (client)

- **`sendMessage`** — emit `{ text }` to post a chat message  
- **`newMessage`**, **`messageUpdated`**, **`messageDeleted`**, **`messagesBulkDeleted`** — chat updates  
- **`filesChanged`** — refresh file list after uploads/deletes  

---

## Cloudflare Tunnel (cloudflared)

Expose your **local** Nest server (e.g. `http://127.0.0.1:5180`) on a hostname like `filemanager.example.com` without opening router ports.

### 1. Install `cloudflared`

Follow [Cloudflare’s documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) for your OS.

### 2. Authenticate

```bash
cloudflared tunnel login
```

Complete the browser flow and authorize the tunnel app for your Cloudflare account (zone with your domain).

### 3. Create a tunnel (once)

```bash
cloudflared tunnel create filemanager
```

Note the **tunnel UUID** and the **credentials JSON** path (usually `~/.cloudflared/<UUID>.json`).

### 4. Configuration file

Create or edit **`~/.cloudflared/config.yml`**:

```yaml
tunnel: <YOUR_TUNNEL_UUID>
credentials-file: /home/YOUR_USER/.cloudflared/<YOUR_TUNNEL_UUID>.json

ingress:
  - hostname: filemanager.example.com
    service: http://127.0.0.1:5180
  - service: http_status:404
```

- Replace `filemanager.example.com` with your real hostname.  
- The tunnel must point at the **same port** Nest uses (`5180` unless you set `PORT`).

### 5. DNS

Point the hostname at the tunnel:

```bash
cloudflared tunnel route dns <YOUR_TUNNEL_UUID> filemanager.example.com
```

Or in the Cloudflare dashboard: **DNS** → **CNAME** → name `filemanager` (or `@`) → target **`<UUID>.cfargotunnel.com`** (proxied).

If `tunnel route dns` fails with **authentication**, run `cloudflared tunnel login` again and retry.

### 6. Run the tunnel

With Nest already listening on `5180`:

```bash
cloudflared tunnel run
```

Or use the project script (development + tunnel):

```bash
yarn dev:tunnel
```

### 7. TLS and origin

Cloudflare terminates HTTPS for visitors; the tunnel connects to your **HTTP** origin on localhost. Ensure the **production** Vite `PRODUCTION_SERVER_URL` (or `window.SERVER_URL`) matches the **public** `https://` URL you use in the browser so API and Socket.IO calls target the correct host.

---

## Troubleshooting

| Issue | What to check |
|--------|----------------|
| SPA shows 404 on `/` | Build `client` first; confirm `client/dist/index.html` exists and `main.ts` resolves `client/dist` from `dist/src/`. |
| API 404 from Vite dev | Backend running on 5180; Vite proxy in `client/vite.config.ts`. |
| Tunnel “Tunnel not found” | Tunnel UUID matches an existing tunnel for the logged-in account; recreate tunnel if needed. |
| Chat not updating | Socket.IO URL in production (`apiConfig.ts` / `SERVER_URL`) must match the page origin or allowed CORS (`enableCors({ origin: true })` on Nest). |
| Prisma errors | Run `yarn prisma generate` after schema changes; `yarn prisma migrate deploy` for migrations. |

---

## Scripts reference (root `package.json`)

| Script | Description |
|--------|-------------|
| `yarn dev` | Nest development with watch |
| `yarn dev:tunnel` | Nest `dev` + `cloudflared tunnel run` |
| `yarn host` | Build Nest + client, then `yarn start` + tunnel (see note above) |
| `yarn build` | Compile Nest to `dist/` |
| `yarn start` | `nest start` (non-watch) |
| `yarn start:prod` | Run `node dist/src/main.js` |
| `yarn prisma generate` | Generate Prisma Client |
| `yarn prisma migrate deploy` | Apply migrations |

Client (`client/package.json`): `yarn dev`, `yarn build`, `yarn preview`.

---

## License

See `package.json` (`UNLICENSED` unless you change it).
