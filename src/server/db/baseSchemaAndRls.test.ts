import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  BASE_TABLES,
  MEMBER_ROLES,
  hasRole,
  evaluateRlsPolicy,
  parseMigrationMetadata,
  InMemoryRlsDatabase,
  type MembershipRow,
} from './baseSchemaAndRls';

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  'supabase/migrations/20261027000103_t1_3_base_tables_rls.sql'
);

test('T1.3 SQL Migration: contém enum member_role, função has_role, 8 tabelas base, centavos, timestamps e RLS ativo', () => {
  assert.equal(
    fs.existsSync(MIGRATION_PATH),
    true,
    'Arquivo de migration SQL da T1.3 deve existir em supabase/migrations/'
  );

  const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
  const meta = parseMigrationMetadata(sql);

  // Verifica enum member_role com os 8 perfis do salão
  for (const role of MEMBER_ROLES) {
    assert.ok(
      meta.enumRoles.includes(role),
      `Enum member_role na migration deve conter o perfil "${role}"`
    );
  }

  // Verifica função has_role(uuid, member_role[]) com security definer e search_path = public
  assert.equal(meta.hasRoleFunctionDefined, true, 'Função has_role deve estar definida');
  assert.equal(
    meta.hasRoleSecurityDefiner,
    true,
    'Função has_role deve usar SECURITY DEFINER SET search_path = public'
  );

  // Verifica criação e habilitação de RLS nas 8 tabelas base da T1.3
  for (const tableName of BASE_TABLES) {
    assert.ok(
      meta.tablesCreated.includes(tableName),
      `Tabela base "${tableName}" deve ser criada na migration`
    );
    assert.ok(
      meta.tablesWithRlsEnabled.includes(tableName),
      `Tabela base "${tableName}" deve ter ROW LEVEL SECURITY habilitado`
    );
    assert.ok(
      meta.tablesWithPolicies.includes(tableName),
      `Tabela base "${tableName}" deve possuir políticas RLS criadas`
    );
  }

  // Verifica convenções da Seção 6: valores em centavos (bigint) e soft-delete (deleted_at)
  assert.match(sql, /base_price_cents\s+bigint\s+not\s+null/i);
  assert.match(sql, /deposit_required_cents\s+bigint\s+not\s+null/i);
  assert.match(sql, /monthly_goal_cents\s+bigint\s+not\s+null/i);
  assert.match(sql, /internal_credit_cents\s+bigint\s+not\s+null/i);
  assert.match(sql, /deleted_at\s+timestamptz/i);
});

test('T1.3 has_role: valida vínculo por usuário, tenant_id, lista de perfis e ignora memberships removidos (deleted_at)', () => {
  const memberships: MembershipRow[] = [
    {
      user_id: 'user-owner-a',
      tenant_id: 'tenant-a',
      unit_id: null,
      role: 'proprietario',
      created_at: '2026-10-27T10:00:00Z',
      updated_at: '2026-10-27T10:00:00Z',
      deleted_at: null,
    },
    {
      user_id: 'user-recepcao-a',
      tenant_id: 'tenant-a',
      unit_id: 'unit-a1',
      role: 'recepcao',
      created_at: '2026-10-27T10:00:00Z',
      updated_at: '2026-10-27T10:00:00Z',
      deleted_at: null,
    },
    {
      user_id: 'user-revoked-a',
      tenant_id: 'tenant-a',
      unit_id: null,
      role: 'gerente',
      created_at: '2026-10-27T08:00:00Z',
      updated_at: '2026-10-27T09:00:00Z',
      deleted_at: '2026-10-27T09:00:00Z',
    },
    {
      user_id: 'user-owner-b',
      tenant_id: 'tenant-b',
      unit_id: null,
      role: 'proprietario',
      created_at: '2026-10-27T10:00:00Z',
      updated_at: '2026-10-27T10:00:00Z',
      deleted_at: null,
    },
  ];

  // Proprietário do tenant A tem papel no tenant A, mas NÃO no tenant B
  assert.equal(hasRole(memberships, 'user-owner-a', 'tenant-a', ['proprietario', 'gerente']), true);
  assert.equal(hasRole(memberships, 'user-owner-a', 'tenant-b', ['proprietario', 'gerente']), false);

  // Recepção do tenant A tem papel 'recepcao', mas NÃO tem papel 'gerente' ou 'proprietario'
  assert.equal(hasRole(memberships, 'user-recepcao-a', 'tenant-a', ['recepcao']), true);
  assert.equal(hasRole(memberships, 'user-recepcao-a', 'tenant-a', ['proprietario', 'gerente']), false);

  // Membership com deleted_at preenchido não concede permissão
  assert.equal(hasRole(memberships, 'user-revoked-a', 'tenant-a', ['gerente']), false);

  // Usuário não autenticado (null) nunca possui permissão
  assert.equal(hasRole(memberships, null, 'tenant-a', ['proprietario']), false);
});

test('T1.3 Isolamento Multi-Tenant (RLS): usuário do Tenant A não lê nem escreve dados do Tenant B em nenhuma das 8 tabelas base', () => {
  const db = new InMemoryRlsDatabase();

  // Seed dos dois tenants e memberships via contexto de sistema (service_role)
  db.seedSystemData({
    tenants: [
      { id: 'tenant-a', slug: 'maison-lumiere', name: 'Maison Lumière', status: 'active' },
      { id: 'tenant-b', slug: 'belle-epoque', name: 'Studio Belle Époque', status: 'active' },
    ],
    memberships: [
      {
        user_id: 'user-owner-a',
        tenant_id: 'tenant-a',
        unit_id: null,
        role: 'proprietario',
        created_at: '2026-10-27T10:00:00Z',
        updated_at: '2026-10-27T10:00:00Z',
        deleted_at: null,
      },
      {
        user_id: 'user-owner-b',
        tenant_id: 'tenant-b',
        unit_id: null,
        role: 'proprietario',
        created_at: '2026-10-27T10:00:00Z',
        updated_at: '2026-10-27T10:00:00Z',
        deleted_at: null,
      },
    ],
  });

  // Proprietário B insere registros nas tabelas do Tenant B
  db.insert('units', 'user-owner-b', {
    id: 'unit-b1',
    tenant_id: 'tenant-b',
    name: 'Unidade Leblon',
  });
  db.insert('profiles', 'user-owner-b', {
    id: 'user-owner-b',
    tenant_id: 'tenant-b',
    full_name: 'Eduarda Fontes',
    email: 'eduarda@example.com',
  });
  db.insert('professionals', 'user-owner-b', {
    id: 'prof-b1',
    tenant_id: 'tenant-b',
    unit_id: 'unit-b1',
    name: 'Eduarda Fontes',
    monthly_goal_cents: 3000000,
  });
  db.insert('services', 'user-owner-b', {
    id: 'srv-b1',
    tenant_id: 'tenant-b',
    name: 'Corte Autoral',
    base_price_cents: 32000,
    deposit_required_cents: 10000,
  });
  db.insert('clients', 'user-owner-b', {
    id: 'cli-b1',
    tenant_id: 'tenant-b',
    name: 'Cliente Secreta B',
    phone: '21999990000',
    internal_credit_cents: 0,
    total_spent_cents: 0,
  });
  db.insert('resources', 'user-owner-b', {
    id: 'res-b1',
    tenant_id: 'tenant-b',
    unit_id: 'unit-b1',
    name: 'Cadeira 01 Leblon',
    kind: 'chair',
  });

  // Usuário do Tenant A consulta todas as 8 tabelas base: não deve enxergar NENHUM registro do Tenant B
  for (const table of BASE_TABLES) {
    const visibleToA = db.select(table, 'user-owner-a');
    const leakedFromB = visibleToA.filter((row) =>
      table === 'tenants' ? row.id === 'tenant-b' : row.tenant_id === 'tenant-b'
    );
    assert.equal(
      leakedFromB.length,
      0,
      `Vazamento cross-tenant detectado na tabela "${table}": usuário do Tenant A viu dados do Tenant B`
    );
  }

  // Usuário do Tenant A tenta inserir registro forjando tenant_id = 'tenant-b': deve ser bloqueado pela RLS (WITH CHECK)
  assert.throws(
    () =>
      db.insert('clients', 'user-owner-a', {
        id: 'cli-forged',
        tenant_id: 'tenant-b',
        name: 'Injeção Cross-Tenant',
        phone: '11000000000',
        internal_credit_cents: 0,
        total_spent_cents: 0,
      }),
    /RLS policy violation/i
  );
});

test('T1.3 RBAC via RLS: recepção pode cadastrar clientes, mas recebe bloqueio (403/RLS) em ações exclusivas de gerente/proprietário', () => {
  const memberships: MembershipRow[] = [
    {
      user_id: 'user-recepcao-a',
      tenant_id: 'tenant-a',
      unit_id: 'unit-a1',
      role: 'recepcao',
      created_at: '2026-10-27T10:00:00Z',
      updated_at: '2026-10-27T10:00:00Z',
      deleted_at: null,
    },
    {
      user_id: 'user-marketing-a',
      tenant_id: 'tenant-a',
      unit_id: null,
      role: 'marketing',
      created_at: '2026-10-27T10:00:00Z',
      updated_at: '2026-10-27T10:00:00Z',
      deleted_at: null,
    },
    {
      user_id: 'user-gerente-a',
      tenant_id: 'tenant-a',
      unit_id: null,
      role: 'gerente',
      created_at: '2026-10-27T10:00:00Z',
      updated_at: '2026-10-27T10:00:00Z',
      deleted_at: null,
    },
  ];

  // Recepção pode ler e escrever em clients
  assert.equal(
    evaluateRlsPolicy(memberships, 'user-recepcao-a', 'clients', 'SELECT', 'tenant-a'),
    true
  );
  assert.equal(
    evaluateRlsPolicy(memberships, 'user-recepcao-a', 'clients', 'INSERT', 'tenant-a'),
    true
  );

  // Marketing pode ler clients (SELECT), mas NÃO pode criar/alterar clients (INSERT/UPDATE)
  assert.equal(
    evaluateRlsPolicy(memberships, 'user-marketing-a', 'clients', 'SELECT', 'tenant-a'),
    true
  );
  assert.equal(
    evaluateRlsPolicy(memberships, 'user-marketing-a', 'clients', 'INSERT', 'tenant-a'),
    false
  );

  // Recepção pode ler catálogo (services, professionals, resources, units), mas NÃO pode alterar/criar (ação de gerente/proprietário)
  for (const catalogTable of ['units', 'services', 'professionals', 'resources'] as const) {
    assert.equal(
      evaluateRlsPolicy(memberships, 'user-recepcao-a', catalogTable, 'SELECT', 'tenant-a'),
      true,
      `Recepção deve poder consultar ${catalogTable}`
    );
    assert.equal(
      evaluateRlsPolicy(memberships, 'user-recepcao-a', catalogTable, 'INSERT', 'tenant-a'),
      false,
      `Recepção NÃO deve poder inserir em ${catalogTable}`
    );
    assert.equal(
      evaluateRlsPolicy(memberships, 'user-gerente-a', catalogTable, 'INSERT', 'tenant-a'),
      true,
      `Gerente deve poder inserir em ${catalogTable}`
    );
  }

  // Apenas proprietário pode alterar memberships ou dados estruturais do tenant
  assert.equal(
    evaluateRlsPolicy(memberships, 'user-gerente-a', 'memberships', 'INSERT', 'tenant-a'),
    false
  );
});
