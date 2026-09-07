# Relia

**The control room for every asset you cannot afford to fail.**

Relia is a production-ready computerized maintenance management system (CMMS) for plants, pump stations, and facilities teams. It runs work orders, preventive maintenance, spare parts, crew assignment, and reliability reporting in one desk.

Each signed-in operator gets an isolated workspace. The first visit seeds a realistic **Riverside Water Authority** plant so the board is never empty.

**Source:** [github.com/Criscode2022/relia-ops](https://github.com/Criscode2022/relia-ops)

## What it does

- **Board** — open work, emergency jobs, overdue PM, assets down, stores below min, MTTR
- **Work orders** — status machine (open → assigned → in progress → waiting parts → complete), notes, parts issue
- **Assets & sites** — criticality, running/degraded/down, history
- **Preventive plans** — frequencies, due dates, one-click raise of a WO
- **Stores** — on-hand vs min, restock, consume against a job
- **Crew** — trades and assignment
- **Reliability** — weekly throughput, mix, downtime leaders

## Stack

| Layer | Choice |
| --- | --- |
| App | [TanStack Start](https://tanstack.com/start) (React 19, file routes, server functions) |
| UI | Tailwind CSS v4, IBM Plex Sans + Instrument Serif |
| Auth | Better Auth — Google, X, and email/password |
| Data | Neon Postgres in production, PGLite in local/preview |
| Charts | Recharts |

Server functions are the API layer: Zod-validated inputs, `authMiddleware`, and every query scoped to `context.userId`. Neon is the database.

## Local

```bash
npm install
npm run dev
```

Sign in, then open **Board**. Raise work, issue a part, complete a job, generate a PM work order.

```bash
npm run typecheck
npm run build
node --experimental-strip-types --test src/lib/relia/domain.test.ts
```

## Data model

`workspaces`, `sites`, `assets`, `technicians`, `parts`, `pm_plans`, `work_orders`, `wo_parts`, `wo_comments`, `activity_log` — see `migrations/0002_relia.sql`. All tenant tables carry `user_id text not null`.

## License

MIT
