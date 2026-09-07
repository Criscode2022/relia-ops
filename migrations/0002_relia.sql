-- Relia CMMS schema. All tenant data is scoped by user_id (TEXT).

create table if not exists workspaces (
  user_id     text primary key,
  org_name    text not null default 'Riverside Operations',
  wo_seq      integer not null default 1000,
  seeded_at   timestamptz
);

create table if not exists sites (
  id          text primary key,
  user_id     text not null,
  name        text not null,
  code        text not null,
  city        text not null,
  region      text not null,
  kind        text not null,
  status      text not null default 'active',
  notes       text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists sites_user_id_idx on sites (user_id);

create table if not exists technicians (
  id          text primary key,
  user_id     text not null,
  name        text not null,
  trade       text not null,
  role        text not null,
  email       text not null default '',
  phone       text not null default '',
  status      text not null default 'active',
  created_at  timestamptz not null default now()
);
create index if not exists technicians_user_id_idx on technicians (user_id);

create table if not exists assets (
  id              text primary key,
  user_id         text not null,
  site_id         text not null references sites(id) on delete cascade,
  name            text not null,
  asset_tag       text not null,
  category        text not null,
  manufacturer    text not null default '',
  model           text not null default '',
  serial_no       text not null default '',
  criticality     text not null default 'B',
  status          text not null default 'running',
  installed_on    date,
  warranty_until  date,
  notes           text not null default '',
  created_at      timestamptz not null default now()
);
create index if not exists assets_user_id_idx on assets (user_id);
create index if not exists assets_site_id_idx on assets (site_id);

create table if not exists parts (
  id            text primary key,
  user_id       text not null,
  sku           text not null,
  name          text not null,
  category      text not null,
  qty_on_hand   integer not null default 0,
  min_qty       integer not null default 0,
  unit_cost     numeric(12,2) not null default 0,
  location      text not null default '',
  created_at    timestamptz not null default now()
);
create index if not exists parts_user_id_idx on parts (user_id);

create table if not exists pm_plans (
  id                text primary key,
  user_id           text not null,
  asset_id          text not null references assets(id) on delete cascade,
  title             text not null,
  frequency_days    integer not null,
  last_completed_at timestamptz,
  next_due_at       timestamptz not null,
  estimated_hours   numeric(6,1) not null default 2,
  checklist         text not null default '',
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);
create index if not exists pm_plans_user_id_idx on pm_plans (user_id);
create index if not exists pm_plans_next_due_idx on pm_plans (user_id, next_due_at);

create table if not exists work_orders (
  id                text primary key,
  user_id           text not null,
  site_id           text not null references sites(id) on delete restrict,
  asset_id          text not null references assets(id) on delete restrict,
  technician_id     text references technicians(id) on delete set null,
  pm_plan_id        text references pm_plans(id) on delete set null,
  number            text not null,
  title             text not null,
  description       text not null default '',
  type              text not null,
  priority          text not null,
  status            text not null default 'open',
  due_at            timestamptz,
  started_at        timestamptz,
  completed_at      timestamptz,
  labor_hours       numeric(8,2) not null default 0,
  downtime_minutes  integer not null default 0,
  created_at        timestamptz not null default now()
);
create unique index if not exists work_orders_user_number_idx on work_orders (user_id, number);
create index if not exists work_orders_user_status_idx on work_orders (user_id, status);
create index if not exists work_orders_asset_id_idx on work_orders (asset_id);

create table if not exists wo_parts (
  id              text primary key,
  user_id         text not null,
  work_order_id   text not null references work_orders(id) on delete cascade,
  part_id         text not null references parts(id) on delete restrict,
  qty             integer not null,
  created_at      timestamptz not null default now()
);
create index if not exists wo_parts_wo_idx on wo_parts (work_order_id);

create table if not exists wo_comments (
  id              text primary key,
  user_id         text not null,
  work_order_id   text not null references work_orders(id) on delete cascade,
  author_name     text not null,
  body            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists wo_comments_wo_idx on wo_comments (work_order_id);

create table if not exists activity_log (
  id              text primary key,
  user_id         text not null,
  entity_type     text not null,
  entity_id       text not null,
  action          text not null,
  detail          text not null default '',
  created_at      timestamptz not null default now()
);
create index if not exists activity_log_user_idx on activity_log (user_id, created_at desc);
