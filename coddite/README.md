# Coddite

> Anonymous coding community for students and developers.

Coddite is a Reddit-style platform where developers share posts, ask questions, discuss coding topics and help each other — all under anonymous, auto-generated handles. Real identity is never exposed.

## Quick Start

```bash
# Prerequisites: Node.js 24+, pnpm 9+, Docker

# 1. Clone and install
git clone <repo-url> coddite && cd coddite
pnpm install

# 2. Start local services (Postgres + pgvector, Redis, Mailpit)
docker compose up -d

# 3. Generate secrets and set up environment
pnpm secrets:generate        # Copy output into backend/.env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit the .env files with your values

# 4. Validate environment
pnpm env:check

# 5. Run database migrations and seed
pnpm db:migrate:dev
pnpm db:seed

# 6. Start development
pnpm dev
# Frontend: http://localhost:5173
# API:      http://localhost:4000
# Mailpit:  http://localhost:8025
```

## Architecture

```
coddite/
├── frontend/     # React + Vite SPA (JavaScript, JSX, Tailwind CSS)
├── backend/      # Node.js + Express API + Socket.IO + BullMQ
├── ml/           # AI/ML library (toxicity, embeddings, tagging)
├── shared/       # Zod schemas, constants, error codes
├── docs/         # All documentation (SRS, architecture, ADRs, UML)
├── infra/        # Docker, k6, helper scripts
└── docker-compose.yml
```

**Stack:** Node.js 24 · Express · React 19 · Vite · Tailwind CSS · PostgreSQL + pgvector · Redis · BullMQ · Socket.IO · Prisma · Zod · Vitest

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start frontend and backend in development mode |
| `pnpm build` | Build all packages |
| `pnpm lint` | Run ESLint across all packages |
| `pnpm typecheck` | Run JSDoc type checking (tsc --noEmit) |
| `pnpm test` | Run all tests |
| `pnpm env:check` | Validate environment variables |
| `pnpm secrets:generate` | Generate cryptographic secrets |
| `pnpm db:migrate:dev` | Run Prisma migrations (development) |
| `pnpm db:test:reset` | Reset test database (drops DB, runs migrations) |

## Deployment

Coddite is designed to be deployed across two platforms:
- **Render**: Hosts the Node.js backend (API) and BullMQ worker via `render.yaml`.
- **Vercel**: Hosts the React SPA frontend via `vercel.json`.

### Production Deployment

1. **Database & Redis**: Provision a PostgreSQL database and a Redis instance (Render offers these, or use Supabase/Upstash).
2. **Backend**:
   - Connect your GitHub repository to Render.
   - Render will automatically read `render.yaml` and provision a `coddite-api` web service and a `coddite-worker` background worker.
   - Set `JWT_SECRET`, `COOKIE_SECRET`, and production `FRONTEND_URL` in the Render dashboard.
3. **Frontend**:
   - Connect your GitHub repository to Vercel.
   - Vercel will automatically read `vercel.json`.
   - Set `VITE_API_URL` to your new Render backend URL in the Vercel dashboard.

> **Note on Cookies**: Coddite relies on `SameSite=None` secure cookies to support cross-origin auth when the frontend (Vercel) and backend (Render) operate on different domains (e.g., `coddite.vercel.app` and `api-coddite.onrender.com`). Ensure HTTPS is active.

## Documentation

See [`docs/`](docs/) for the full documentation set including:

- [Architecture Decision Records](docs/decisions/)
- [Known Limitations](docs/KNOWN_LIMITATIONS.md)

## License

[MIT](LICENSE)
