-- =============================================================================
-- Tarefa T1.3 — Tabelas base (tenants, units, memberships, profiles,
-- professionals, services, clients, resources), RLS e função has_role
-- Convenções (Seção 6 do PLANO_SAAS.md):
--   - tenant_id em toda tabela de domínio
--   - id uuid com gen_random_uuid()
--   - valores monetários em centavos (bigint)
--   - created_at / updated_at timestamptz
--   - deleted_at timestamptz em vez de DELETE físico
--   - RLS habilitado e forçado em 100% das tabelas ("negar por padrão")
-- =============================================================================

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- 1. Tipo enumerado de perfis de acesso do salão
do $$
begin
  if not exists (select 1 from pg_type where typname = 'member_role') then
    create type member_role as enum (
      'proprietario',
      'gerente',
      'recepcao',
      'caixa',
      'financeiro',
      'profissional',
      'estoque',
      'marketing'
    );
  end if;
end $$;

-- Função utilitária para manter updated_at sincronizado
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- 2. Tabelas Base
-- =============================================================================

-- 2.1 tenants
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  legal_name text,
  cnpj text,
  timezone text not null default 'America/Sao_Paulo',
  status text not null default 'trial'
    check (status in ('trial', 'active', 'past_due', 'suspended', 'canceled')),
  trial_ends_at timestamptz,
  daily_revenue_goal_cents bigint not null default 0 check (daily_revenue_goal_cents >= 0),
  commission_release_rule text not null default 'recebimento'
    check (commission_release_rule in ('execucao', 'recebimento')),
  share_clients_across_units boolean not null default true,
  cancellation_policy text,
  municipal_tax_code text,
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create or replace trigger tenants_set_updated_at
  before update on tenants
  for each row execute function set_updated_at();

-- 2.2 units
create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  opening_hours text,
  chairs_count int not null default 1 check (chairs_count >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_units_tenant_id on units(tenant_id) where deleted_at is null;

create or replace trigger units_set_updated_at
  before update on units
  for each row execute function set_updated_at();

-- 2.3 memberships
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  unit_id uuid references units(id) on delete set null,
  role member_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, tenant_id, role)
);

create index if not exists idx_memberships_user_tenant
  on memberships(user_id, tenant_id)
  where deleted_at is null;

create or replace trigger memberships_set_updated_at
  before update on memberships
  for each row execute function set_updated_at();

-- 2.4 profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  full_name text not null,
  social_name text,
  email text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_profiles_tenant_id on profiles(tenant_id) where deleted_at is null;

create or replace trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- 2.5 resources (cadeiras, lavatórios, salas, equipamentos)
create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  unit_id uuid not null references units(id) on delete cascade,
  name text not null,
  kind text not null default 'chair'
    check (kind in ('chair', 'washbasin', 'room', 'equipment')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_resources_tenant_unit on resources(tenant_id, unit_id) where deleted_at is null;

create or replace trigger resources_set_updated_at
  before update on resources
  for each row execute function set_updated_at();

-- 2.6 professionals
create table if not exists professionals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  unit_id uuid not null references units(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  default_resource_id uuid references resources(id) on delete set null,
  name text not null,
  role_title text,
  specialty text,
  avatar_initials text,
  commission_service_bps int not null default 0 check (commission_service_bps between 0 and 10000),
  commission_product_bps int not null default 0 check (commission_product_bps between 0 and 10000),
  assistant_split_bps int not null default 0 check (assistant_split_bps between 0 and 10000),
  monthly_goal_cents bigint not null default 0 check (monthly_goal_cents >= 0),
  working_hours jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_professionals_tenant_unit on professionals(tenant_id, unit_id) where deleted_at is null;

create or replace trigger professionals_set_updated_at
  before update on professionals
  for each row execute function set_updated_at();

-- 2.7 services
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  default_resource_id uuid references resources(id) on delete set null,
  name text not null,
  category text not null,
  description text,
  duration_minutes int not null check (duration_minutes > 0),
  pause_minutes int not null default 0 check (pause_minutes >= 0),
  prep_minutes int not null default 0 check (prep_minutes >= 0),
  price_type text not null default 'fixo'
    check (price_type in ('fixo', 'a_partir_de', 'avaliacao')),
  base_price_cents bigint not null default 0 check (base_price_cents >= 0),
  deposit_required_cents bigint not null default 0 check (deposit_required_cents >= 0),
  default_commission_bps int not null default 0 check (default_commission_bps between 0 and 10000),
  online_booking_available boolean not null default true,
  requires_pre_evaluation boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_services_tenant_id on services(tenant_id) where deleted_at is null;

create or replace trigger services_set_updated_at
  before update on services
  for each row execute function set_updated_at();

-- 2.8 clients
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  preferred_professional_id uuid references professionals(id) on delete set null,
  name text not null,
  social_name text,
  phone text not null,
  email text,
  birth_date date,
  cpf text,
  origin text not null default 'Recepção',
  tags text[] not null default '{}'::text[],
  internal_credit_cents bigint not null default 0 check (internal_credit_cents >= 0),
  loyalty_points int not null default 0 check (loyalty_points >= 0),
  total_spent_cents bigint not null default 0 check (total_spent_cents >= 0),
  last_visit_at timestamptz,
  lgpd_health_consent boolean not null default false,
  marketing_opt_in boolean not null default false,
  restricted_notes text,
  crm_stage text not null default 'novo_contato'
    check (crm_stage in ('novo_contato', 'orcamento_enviado', 'aguardando_decisao', 'agendado', 'recorrente', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_clients_tenant_phone on clients(tenant_id, phone) where deleted_at is null;

create or replace trigger clients_set_updated_at
  before update on clients
  for each row execute function set_updated_at();

-- =============================================================================
-- 3. Função de Autorização Multi-Tenant e RBAC (has_role)
-- =============================================================================

create or replace function has_role(t uuid, roles member_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.user_id = (select auth.uid())
      and m.tenant_id = t
      and m.deleted_at is null
      and m.role = any(roles)
  );
$$;

-- =============================================================================
-- 4. Row Level Security (RLS) em todas as 8 tabelas base
-- =============================================================================

alter table tenants enable row level security;
alter table tenants force row level security;

alter table units enable row level security;
alter table units force row level security;

alter table memberships enable row level security;
alter table memberships force row level security;

alter table profiles enable row level security;
alter table profiles force row level security;

alter table resources enable row level security;
alter table resources force row level security;

alter table professionals enable row level security;
alter table professionals force row level security;

alter table services enable row level security;
alter table services force row level security;

alter table clients enable row level security;
alter table clients force row level security;

-- 4.1 Políticas para tenants
create policy tenants_read on tenants for select
  using (
    deleted_at is null
    and has_role(id, array['proprietario','gerente','recepcao','caixa','financeiro','profissional','estoque','marketing']::member_role[])
  );

create policy tenants_write on tenants for all
  using (has_role(id, array['proprietario']::member_role[]))
  with check (has_role(id, array['proprietario']::member_role[]));

-- 4.2 Políticas para units
create policy units_read on units for select
  using (
    deleted_at is null
    and has_role(tenant_id, array['proprietario','gerente','recepcao','caixa','financeiro','profissional','estoque','marketing']::member_role[])
  );

create policy units_write on units for all
  using (has_role(tenant_id, array['proprietario','gerente']::member_role[]))
  with check (has_role(tenant_id, array['proprietario','gerente']::member_role[]));

-- 4.3 Políticas para memberships
create policy memberships_read on memberships for select
  using (
    deleted_at is null
    and (
      user_id = (select auth.uid())
      or has_role(tenant_id, array['proprietario','gerente']::member_role[])
    )
  );

create policy memberships_write on memberships for all
  using (has_role(tenant_id, array['proprietario']::member_role[]))
  with check (has_role(tenant_id, array['proprietario']::member_role[]));

-- 4.4 Políticas para profiles
create policy profiles_read on profiles for select
  using (
    deleted_at is null
    and (
      id = (select auth.uid())
      or has_role(tenant_id, array['proprietario','gerente','recepcao']::member_role[])
    )
  );

create policy profiles_write on profiles for all
  using (
    id = (select auth.uid())
    or has_role(tenant_id, array['proprietario','gerente']::member_role[])
  )
  with check (
    id = (select auth.uid())
    or has_role(tenant_id, array['proprietario','gerente']::member_role[])
  );

-- 4.5 Políticas para resources
create policy resources_read on resources for select
  using (
    deleted_at is null
    and has_role(tenant_id, array['proprietario','gerente','recepcao','caixa','profissional']::member_role[])
  );

create policy resources_write on resources for all
  using (has_role(tenant_id, array['proprietario','gerente']::member_role[]))
  with check (has_role(tenant_id, array['proprietario','gerente']::member_role[]));

-- 4.6 Políticas para professionals
create policy professionals_read on professionals for select
  using (
    deleted_at is null
    and has_role(tenant_id, array['proprietario','gerente','recepcao','caixa','financeiro','profissional','marketing']::member_role[])
  );

create policy professionals_write on professionals for all
  using (has_role(tenant_id, array['proprietario','gerente']::member_role[]))
  with check (has_role(tenant_id, array['proprietario','gerente']::member_role[]));

-- 4.7 Políticas para services
create policy services_read on services for select
  using (
    deleted_at is null
    and has_role(tenant_id, array['proprietario','gerente','recepcao','caixa','financeiro','profissional','estoque','marketing']::member_role[])
  );

create policy services_write on services for all
  using (has_role(tenant_id, array['proprietario','gerente']::member_role[]))
  with check (has_role(tenant_id, array['proprietario','gerente']::member_role[]));

-- 4.8 Políticas para clients (conforme Seção 6 do PLANO_SAAS.md)
create policy clients_read on clients for select
  using (
    deleted_at is null
    and has_role(tenant_id, array['proprietario','gerente','recepcao','caixa','marketing']::member_role[])
  );

create policy clients_write on clients for all
  using (has_role(tenant_id, array['proprietario','gerente','recepcao']::member_role[]))
  with check (has_role(tenant_id, array['proprietario','gerente','recepcao']::member_role[]));
