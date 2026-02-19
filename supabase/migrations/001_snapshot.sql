-- Snapshot-only schema (overwrite daily; no history)

create table if not exists public.snapshot_meta (
  id int primary key,
  imported_at timestamptz not null,
  source_file_name text not null,
  sheet_name text not null,
  row_count int not null,
  active_version uuid not null
);

create table if not exists public.snapshot_rows (
  id bigserial primary key,
  version uuid not null,
  tipo text not null check (tipo in ('Stock', 'Web')),
  dia_label text null,
  mes int null,
  dia_numero int null,
  cargada int not null,
  recorrido int not null,
  contactado int not null,
  citas int not null,
  af int not null,
  mc int not null,
  pct_contactabilidad numeric null,
  pct_efectividad numeric null,
  tc_af numeric null,
  tc_mc numeric null
);

create index if not exists snapshot_rows_version_idx on public.snapshot_rows (version);
create index if not exists snapshot_rows_mes_idx on public.snapshot_rows (mes);
create index if not exists snapshot_rows_tipo_idx on public.snapshot_rows (tipo);

