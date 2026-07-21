# Deployment guide

Kin ships as a GitHub Actions release: the workflow builds a tarball on every
`v*` tag, and `install.sh` drops it onto an appliance as a systemd (Debian) or
OpenRC (Alpine) service. There is **no database and no backend logic** — the Node
process only serves the built SPA. All user data lives in cookies on the device.

## Quick install (recommended)

Run as root on the appliance:

```bash
curl -fsSL https://raw.githubusercontent.com/nebuloss/kin-app/main/install.sh | sh
```

The app is then available on **http://localhost:3000** — point a reverse proxy
(Nginx Proxy Manager, Caddy…) at that port.

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_DIR` | `/opt/kin-app` | Install directory |
| `APP_USER` | `kin` | System user (created if missing) |
| `APP_PORT` | `3000` | HTTP port |
| `NODE_VERSION` | `22` | Node.js major version (Debian only) |
| `GH_REPO` | `nebuloss/kin-app` | GitHub `owner/repo` to pull releases from |

### What the script does

1. Detects the OS (Alpine vs Debian-based).
2. Installs `curl`, `ca-certificates`, and Node.js.
3. Creates a system user `kin` (no login shell, no home directory).
4. Downloads the latest release tarball into `APP_DIR`.
5. Runs `npm ci --omit=dev`.
6. Installs and starts a system service (`kin-app`).

Re-running the same command updates an existing install to the latest release.

## Cutting a release

```bash
npm version patch      # bump version + create a git tag
git push --follow-tags # pushing the v* tag triggers .github/workflows/release.yml
```

The workflow runs `npm run build` and attaches `kin-app.tar.gz`
(`dist/ dist-server/ package.json package-lock.json`) to the GitHub release.

## Manual / local build

```bash
npm ci
npm run build   # tsc -p tsconfig.server.json && vite build  → dist-server/ + dist/
PORT=3000 NODE_ENV=production node dist-server/server.js
```

## Service management

### Debian / Ubuntu (systemd)

```bash
systemctl status kin-app
systemctl restart kin-app
journalctl -u kin-app -f
```

### Alpine (OpenRC)

```bash
rc-service kin-app status
rc-service kin-app restart
tail -f /var/log/kin-app.log
```

## Reverse proxy (optional)

### Caddy

```
kin.example.com {
    reverse_proxy localhost:3000
}
```

### Nginx

```nginx
server {
    listen 80;
    server_name kin.example.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Notes

- **No database required** — all state lives in cookies in the browser.
- **Cookies are sent to the server** on each request but the server ignores them;
  they exist purely for client-side persistence.
- **Port conflicts** — set `APP_PORT=8080` (or any free port) before running the
  install script.
