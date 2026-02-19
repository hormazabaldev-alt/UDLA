# Altius Analytics (PowerBI-web)

Dashboard analítico premium (snapshot diario, sin histórico) con carga de Excel y persistencia en Supabase para que cualquier persona con la URL vea el mismo snapshot hasta que se reemplace.

## Stack
- Next.js (App Router) + TypeScript strict
- TailwindCSS + UI custom (shadcn-style)
- ECharts (próximo), AG Grid (preview/tabla)
- Zustand (estado global)
- Supabase (persistencia del snapshot)

## Setup (Supabase)
1) Ejecuta la migración SQL en tu proyecto Supabase:
- `supabase/migrations/001_snapshot.sql`

2) Configura variables de entorno (Vercel + local):
```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Protege el endpoint de carga (sin login)
DASHBOARD_ADMIN_KEY=una-clave-larga
```

Notas:
- `SUPABASE_SERVICE_ROLE_KEY` **solo server-side** (ya lo usamos únicamente en API Routes).
- No hay auth de lectura: el dashboard consume `/api/snapshot` (servidor) y se comparte por URL.

## Desarrollo
```bash
pnpm dev
```

## Uso
- Botón `Cargar Excel` → pega tu `DASHBOARD_ADMIN_KEY` (se guarda en ese navegador) → arrastra el `.xlsx` → preview → `Reemplazar datos actuales`.
- Cualquier persona con la URL verá el snapshot persistido desde Supabase hasta la próxima carga.

