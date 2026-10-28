import { sql, runQuery } from './db.js';

export async function handleApiRequest(url: string, method: string, body?: any): Promise<{ status: number; data: any }> {
  const parsedUrl = new URL(url, 'http://localhost:3000');
  const pathname = parsedUrl.pathname;
  const tenantSlug = parsedUrl.searchParams.get('tenant') || parsedUrl.searchParams.get('salonId');

  try {
    // 1. Status & Health Check
    if (pathname === '/api/status' && method === 'GET') {
      const t0 = performance.now();
      const rows = await runQuery(sql`
        SELECT 
          (SELECT count(*) FROM tenants WHERE deleted_at IS NULL) as tenants_count,
          (SELECT count(*) FROM units WHERE deleted_at IS NULL) as units_count,
          (SELECT count(*) FROM professionals WHERE deleted_at IS NULL) as professionals_count,
          (SELECT count(*) FROM services WHERE deleted_at IS NULL) as services_count,
          (SELECT count(*) FROM clients WHERE deleted_at IS NULL) as clients_count,
          current_database() as database_name,
          version() as pg_version
      `);
      const latencyMs = Number((performance.now() - t0).toFixed(1));

      return {
        status: 200,
        data: {
          online: true,
          provider: 'Neon Lakebase Postgres',
          latencyMs,
          stats: rows[0],
        },
      };
    }

    // 2. Tenants (com suas unidades)
    if (pathname === '/api/tenants' && method === 'GET') {
      const tenants = await runQuery(sql`
        SELECT 
          t.id, t.slug, t.name as "commercialName", t.legal_name as "legalName",
          t.cnpj, t.status, (t.daily_revenue_goal_cents / 100.0) as "dailyRevenueGoal",
          t.commission_release_rule as "commissionReleaseRule",
          t.share_clients_across_units as "shareClientsAcrossUnits",
          t.cancellation_policy as "cancellationPolicy",
          t.municipal_tax_code as "municipalTaxCode",
          t.theme,
          coalesce(
            json_agg(
              json_build_object(
                'id', u.id,
                'salonId', t.slug,
                'name', u.name,
                'address', u.address,
                'phone', u.phone,
                'openingHours', u.opening_hours,
                'chairsCount', u.chairs_count,
                'active', u.active
              )
            ) FILTER (WHERE u.id IS NOT NULL),
            '[]'
          ) as units
        FROM tenants t
        LEFT JOIN units u ON u.tenant_id = t.id AND u.deleted_at IS NULL
        WHERE t.deleted_at IS NULL
        GROUP BY t.id
        ORDER BY t.created_at ASC;
      `);

      return { status: 200, data: tenants };
    }

    // 3. Profissionais
    if (pathname === '/api/professionals' && method === 'GET') {
      const professionals = await runQuery(sql`
        SELECT 
          p.id, t.slug as "salonId", u.id as "unitId", p.name,
          p.role_title as "roleTitle", p.specialty, p.avatar_initials as "avatarInitials",
          (p.commission_service_bps / 100.0) as "commissionServicePct",
          (p.commission_product_bps / 100.0) as "commissionProductPct",
          (p.assistant_split_bps / 100.0) as "assistantSplitPct",
          (p.monthly_goal_cents / 100.0) as "monthlyGoal",
          p.working_hours as "workingHours",
          p.active
        FROM professionals p
        JOIN tenants t ON t.id = p.tenant_id
        LEFT JOIN units u ON u.id = p.unit_id
        WHERE p.deleted_at IS NULL
        ORDER BY p.name ASC;
      `);

      return { status: 200, data: professionals };
    }

    // 4. Serviços
    if (pathname === '/api/services' && method === 'GET') {
      const services = await runQuery(sql`
        SELECT 
          s.id, t.slug as "salonId", s.name, s.category, s.description,
          s.duration_minutes as "durationMinutes",
          s.pause_minutes as "pauseMinutes",
          s.prep_minutes as "prepMinutes",
          s.price_type as "priceType",
          (s.base_price_cents / 100.0) as "basePrice",
          (s.deposit_required_cents / 100.0) as "depositRequired",
          (s.default_commission_bps / 100.0) as "defaultCommissionPct",
          s.online_booking_available as "onlineBookingAvailable",
          s.requires_pre_evaluation as "requiresPreEvaluation",
          s.active
        FROM services s
        JOIN tenants t ON t.id = s.tenant_id
        WHERE s.deleted_at IS NULL
        ORDER BY s.category ASC, s.name ASC;
      `);

      return { status: 200, data: services };
    }

    if (pathname === '/api/services' && method === 'POST') {
      const b = body || {};
      const targetSlug = b.salonId || 'salon-1';
      const tenantRow = await runQuery(sql`SELECT id FROM tenants WHERE slug = ${targetSlug} LIMIT 1;`);
      const tenantUuid = tenantRow[0]?.id;

      if (!tenantUuid) {
        return { status: 400, data: { error: 'Tenant não encontrado para o serviço.' } };
      }

      const basePriceCents = Math.round((b.basePrice || 0) * 100);
      const depositRequiredCents = Math.round((b.depositRequired || 0) * 100);
      const defaultCommissionBps = Math.round((b.defaultCommissionPct || 0) * 100);

      const inserted = await runQuery(sql`
        INSERT INTO services (
          tenant_id, name, category, description, duration_minutes,
          pause_minutes, prep_minutes, price_type, base_price_cents,
          deposit_required_cents, default_commission_bps, online_booking_available,
          requires_pre_evaluation, active
        )
        VALUES (
          ${tenantUuid}, ${b.name}, ${b.category || 'Geral'}, ${b.description || ''},
          ${b.durationMinutes || 60}, ${b.pauseMinutes || 0}, ${b.prepMinutes || 0},
          ${b.priceType || 'fixo'}, ${basePriceCents}, ${depositRequiredCents},
          ${defaultCommissionBps}, ${b.onlineBookingAvailable ?? true},
          ${b.requiresPreEvaluation ?? false}, true
        )
        RETURNING id, name;
      `);

      return { status: 201, data: inserted[0] };
    }

    // 5. Clientes (GET & POST)
    if (pathname === '/api/clients' && method === 'GET') {
      const clients = await runQuery(sql`
        SELECT 
          c.id, t.slug as "salonId", c.name, c.social_name as "socialName",
          c.phone, c.email, c.birth_date as "birthDate", c.cpf,
          c.origin, c.tags,
          (c.internal_credit_cents / 100.0) as "internalCredit",
          c.loyalty_points as "loyaltyPoints",
          (c.total_spent_cents / 100.0) as "totalSpent",
          c.last_visit_at as "lastVisitDate",
          c.lgpd_health_consent as "lgpdHealthConsent",
          c.marketing_opt_in as "marketingOptIn",
          c.restricted_notes as "restrictedNotes",
          c.crm_stage as "crmStage"
        FROM clients c
        JOIN tenants t ON t.id = c.tenant_id
        WHERE c.deleted_at IS NULL
        ORDER BY c.created_at DESC;
      `);

      return { status: 200, data: clients };
    }

    if (pathname === '/api/clients' && method === 'POST') {
      const b = body || {};
      const targetSlug = b.salonId || 'salon-1';
      const tenantRow = await runQuery(sql`SELECT id FROM tenants WHERE slug = ${targetSlug} LIMIT 1;`);
      const tenantUuid = tenantRow[0]?.id;

      if (!tenantUuid) {
        return { status: 400, data: { error: 'Tenant não encontrado para o cliente.' } };
      }

      const internalCreditCents = Math.round((b.internalCredit || 0) * 100);
      const totalSpentCents = Math.round((b.totalSpent || 0) * 100);

      const inserted = await runQuery(sql`
        INSERT INTO clients (
          tenant_id, name, social_name, phone, email,
          birth_date, cpf, origin, tags, internal_credit_cents, loyalty_points,
          total_spent_cents, lgpd_health_consent, marketing_opt_in,
          restricted_notes, crm_stage
        )
        VALUES (
          ${tenantUuid}, ${b.name}, ${b.socialName || null}, ${b.phone},
          ${b.email || null}, ${b.birthDate || null}, ${b.cpf || null},
          ${b.origin || 'Recepção'}, ${b.tags || []}, ${internalCreditCents},
          ${b.loyaltyPoints || 0}, ${totalSpentCents}, ${b.lgpdHealthConsent || false},
          ${b.marketingOptIn || false}, ${b.restrictedNotes || null},
          ${b.crmStage || 'novo_contato'}
        )
        RETURNING id, name;
      `);

      return { status: 201, data: inserted[0] };
    }

    return { status: 404, data: { error: 'Endpoint não encontrado' } };
  } catch (error: any) {
    console.error('API Error:', error);
    return { status: 500, data: { error: error.message || 'Erro interno do servidor' } };
  }
}
