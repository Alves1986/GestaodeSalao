export const BASE_TABLES = [
  'tenants',
  'units',
  'memberships',
  'profiles',
  'professionals',
  'services',
  'clients',
  'resources',
] as const;

export type BaseTableName = (typeof BASE_TABLES)[number];

export const MEMBER_ROLES = [
  'proprietario',
  'gerente',
  'recepcao',
  'caixa',
  'financeiro',
  'profissional',
  'estoque',
  'marketing',
] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];

export interface MembershipRow {
  id?: string;
  user_id: string;
  tenant_id: string;
  unit_id: string | null;
  role: MemberRole;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type RlsOperation = 'SELECT' | 'INSERT' | 'UPDATE';

/**
 * Matriz de autorização espelhando as políticas RLS definidas na migration SQL da T1.3.
 */
export const RLS_ROLE_MATRIX: Record<
  BaseTableName,
  { readRoles: MemberRole[]; writeRoles: MemberRole[] }
> = {
  tenants: {
    readRoles: [...MEMBER_ROLES],
    writeRoles: ['proprietario'],
  },
  units: {
    readRoles: [...MEMBER_ROLES],
    writeRoles: ['proprietario', 'gerente'],
  },
  memberships: {
    readRoles: ['proprietario', 'gerente'],
    writeRoles: ['proprietario'],
  },
  profiles: {
    readRoles: ['proprietario', 'gerente', 'recepcao'],
    writeRoles: ['proprietario', 'gerente'],
  },
  resources: {
    readRoles: ['proprietario', 'gerente', 'recepcao', 'caixa', 'profissional'],
    writeRoles: ['proprietario', 'gerente'],
  },
  professionals: {
    readRoles: [
      'proprietario',
      'gerente',
      'recepcao',
      'caixa',
      'financeiro',
      'profissional',
      'marketing',
    ],
    writeRoles: ['proprietario', 'gerente'],
  },
  services: {
    readRoles: [...MEMBER_ROLES],
    writeRoles: ['proprietario', 'gerente'],
  },
  clients: {
    readRoles: ['proprietario', 'gerente', 'recepcao', 'caixa', 'marketing'],
    writeRoles: ['proprietario', 'gerente', 'recepcao'],
  },
};

/**
 * Implementação determinística equivalente à função SQL `has_role(t uuid, roles member_role[])`.
 */
export function hasRole(
  memberships: MembershipRow[],
  authUserId: string | null,
  tenantId: string,
  allowedRoles: readonly MemberRole[]
): boolean {
  if (!authUserId || !tenantId || allowedRoles.length === 0) {
    return false;
  }

  return memberships.some(
    (m) =>
      m.user_id === authUserId &&
      m.tenant_id === tenantId &&
      m.deleted_at === null &&
      allowedRoles.includes(m.role)
  );
}

/**
 * Avalia a política RLS (USING / WITH CHECK) para uma tabela base, operação e linha/tenant alvo.
 */
export function evaluateRlsPolicy(
  memberships: MembershipRow[],
  authUserId: string | null,
  table: BaseTableName,
  operation: RlsOperation,
  targetTenantId: string,
  targetRowOwnerUserId?: string
): boolean {
  if (!authUserId) {
    return false;
  }

  // Regras especiais de auto-leitura/auto-edição (profiles e memberships do próprio auth.uid())
  if (table === 'memberships' && operation === 'SELECT' && targetRowOwnerUserId === authUserId) {
    return hasRole(memberships, authUserId, targetTenantId, MEMBER_ROLES);
  }

  if (table === 'profiles' && targetRowOwnerUserId === authUserId) {
    return hasRole(memberships, authUserId, targetTenantId, MEMBER_ROLES);
  }

  const rule = RLS_ROLE_MATRIX[table];
  const rolesToCheck = operation === 'SELECT' ? rule.readRoles : rule.writeRoles;

  return hasRole(memberships, authUserId, targetTenantId, rolesToCheck);
}

/**
 * Extrai metadados estruturais do arquivo de migration SQL da T1.3 para verificação automatizada.
 */
export function parseMigrationMetadata(sql: string): {
  enumRoles: string[];
  hasRoleFunctionDefined: boolean;
  hasRoleSecurityDefiner: boolean;
  tablesCreated: BaseTableName[];
  tablesWithRlsEnabled: BaseTableName[];
  tablesWithPolicies: BaseTableName[];
} {
  const enumMatch = sql.match(/create\s+type\s+member_role\s+as\s+enum\s*\(([\s\S]*?)\)/i);
  const enumRoles: string[] = [];
  if (enumMatch?.[1]) {
    const matches = enumMatch[1].matchAll(/'([^']+)'/g);
    for (const m of matches) {
      enumRoles.push(m[1]);
    }
  }

  const hasRoleFunctionDefined =
    /create\s+(?:or\s+replace\s+)?function\s+has_role\s*\(\s*t\s+uuid\s*,\s*roles\s+member_role\[\]\s*\)\s*returns\s+boolean/i.test(
      sql
    );

  const hasRoleSecurityDefiner =
    /security\s+definer\s+set\s+search_path\s*=\s*public/i.test(sql);

  const tablesCreated: BaseTableName[] = [];
  const tablesWithRlsEnabled: BaseTableName[] = [];
  const tablesWithPolicies: BaseTableName[] = [];

  for (const table of BASE_TABLES) {
    const createRegex = new RegExp(
      `create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?${table}\\b`,
      'i'
    );
    if (createRegex.test(sql)) {
      tablesCreated.push(table);
    }

    const rlsRegex = new RegExp(
      `alter\\s+table\\s+${table}\\s+enable\\s+row\\s+level\\s+security`,
      'i'
    );
    if (rlsRegex.test(sql)) {
      tablesWithRlsEnabled.push(table);
    }

    const policyRegex = new RegExp(`create\\s+policy\\s+\\w+\\s+on\\s+${table}\\b`, 'i');
    if (policyRegex.test(sql)) {
      tablesWithPolicies.push(table);
    }
  }

  return {
    enumRoles,
    hasRoleFunctionDefined,
    hasRoleSecurityDefiner,
    tablesCreated,
    tablesWithRlsEnabled,
    tablesWithPolicies,
  };
}

export type GenericTableRow = Record<string, unknown> & {
  id?: string;
  tenant_id?: string;
  user_id?: string;
  deleted_at?: string | null;
};

/**
 * Simulador de banco com RLS ativa e forçada para testar isolamento multi-tenant e RBAC das 8 tabelas base.
 */
export class InMemoryRlsDatabase {
  private rows: Record<BaseTableName, GenericTableRow[]> = {
    tenants: [],
    units: [],
    memberships: [],
    profiles: [],
    professionals: [],
    services: [],
    clients: [],
    resources: [],
  };

  private getActiveMemberships(): MembershipRow[] {
    return (this.rows.memberships as unknown as MembershipRow[]).filter(
      (m) => !m.deleted_at
    );
  }

  public seedSystemData(seed: {
    tenants?: GenericTableRow[];
    memberships?: MembershipRow[];
  }): void {
    if (seed.tenants) {
      for (const t of seed.tenants) {
        this.rows.tenants.push({ deleted_at: null, ...t });
      }
    }
    if (seed.memberships) {
      for (const m of seed.memberships) {
        this.rows.memberships.push({ ...m });
      }
    }
  }

  public select(table: BaseTableName, authUserId: string | null): GenericTableRow[] {
    const memberships = this.getActiveMemberships();

    return this.rows[table].filter((row) => {
      if (row.deleted_at) return false;
      const targetTenantId =
        table === 'tenants' ? String(row.id || '') : String(row.tenant_id || '');
      const ownerUserId =
        table === 'memberships'
          ? String(row.user_id || '')
          : table === 'profiles'
          ? String(row.id || '')
          : undefined;

      return evaluateRlsPolicy(
        memberships,
        authUserId,
        table,
        'SELECT',
        targetTenantId,
        ownerUserId
      );
    });
  }

  public insert(
    table: BaseTableName,
    authUserId: string | null,
    row: GenericTableRow
  ): GenericTableRow {
    const memberships = this.getActiveMemberships();
    const targetTenantId =
      table === 'tenants' ? String(row.id || '') : String(row.tenant_id || '');
    const ownerUserId =
      table === 'memberships'
        ? String(row.user_id || '')
        : table === 'profiles'
        ? String(row.id || '')
        : undefined;

    const allowed = evaluateRlsPolicy(
      memberships,
      authUserId,
      table,
      'INSERT',
      targetTenantId,
      ownerUserId
    );

    if (!allowed) {
      throw new Error(
        `RLS policy violation on table "${table}" for user "${authUserId ?? 'anon'}" and tenant "${targetTenantId}"`
      );
    }

    const now = new Date().toISOString();
    const record: GenericTableRow = {
      created_at: now,
      updated_at: now,
      deleted_at: null,
      ...row,
    };

    this.rows[table].push(record);
    return record;
  }
}
