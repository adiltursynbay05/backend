# Backend server deploy

1. Copy the server environment file:

```bash
cp .env.server.example .env.server
```

2. Fill `.env.server` with real API keys and your frontend domain.

3. Start backend with a direct exposed port:

```bash
docker compose -f docker-compose.server.yml --env-file .env.server up --build -d
```

Or start backend behind Caddy with automatic HTTPS:

```bash
docker compose -f docker-compose.caddy.yml --env-file .env.server up --build -d
```

4. Check status:

```bash
docker compose -f docker-compose.server.yml ps
```

The backend is exposed on `BACKEND_PORT`, default `5000`.
Health check URL: `http://your-server-ip:5000/api/health`.

For HTTPS deploy, set `BACKEND_DOMAIN` in `.env.server`, point the domain DNS to the server, and open ports `80` and `443`.
