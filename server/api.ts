import { sql, runQuery } from './db.js';

export async function handleApiRequest(url: string, method: string, body?: any): Promise<{ status: number; data: any }> {
  const parsedUrl = new URL(url, 'http://localhost:3000');
  const pathname = parsedUrl.pathname;
  const tenantParam = parsedUrl.searchParams.get('tenant') || parsedUrl.searchParams.get('tenantId') || parsedUrl.searchParams.get('salonId');

  try {
    // -------------------------------------------------------------------------
    // 1. Status & Diagnóstico
    // -------------------------------------------------------------------------
    if (pathname === '/api/status' && method === 'GET') {
      const t0 = performance.now();
      const rows = await runQuery(sql`
        SELECT 
          (SELECT count(*) FROM tenants WHERE deleted_at IS NULL) as tenants_count,
          (SELECT count(*) FROM units WHERE deleted_at IS NULL) as units_count,
          (SELECT count(*) FROM professionals WHERE deleted_at IS NULL) as professionals_count,
          (SELECT count(*) FROM services WHERE deleted_at IS NULL) as services_count,
          (SELECT count(*) FROM clients WHERE deleted_at IS NULL) as clients_count,
          (SELECT count(*) FROM appointments WHERE deleted_at IS NULL) as appointments_count,
          (SELECT count(*) FROM comandas WHERE deleted_at IS NULL) as comandas_count,
          (SELECT count(*) FROM auth.users WHERE deleted_at IS NULL) as users_count,
          current_database() as database_name
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

    // -------------------------------------------------------------------------
    // 2. Autenticação (Login, Cadastro de Salão, Sessão)
    // -------------------------------------------------------------------------
    if (pathname === '/api/auth/register' && method === 'POST') {
      const { email, password, fullName, salonName, cnpj } = body || {};
      if (!email || !password || !fullName || !salonName) {
        return { status: 400, data: { error: 'Preencha todos os campos obrigatórios (nome, e-mail, senha e nome do salão).' } };
      }

      // Verifica se o usuário já existe
      const existingUser = await runQuery(sql`
        SELECT id FROM auth.users WHERE lower(email) = lower(${email.trim()}) LIMIT 1;
      `);
      if (existingUser.length > 0) {
        return { status: 400, data: { error: 'Este e-mail já está cadastrado.' } };
      }

      // Criação de Tenant, Usuário com pgcrypto crypt, Perfil e Membership
      const slug = salonName.toLowerCase().trim().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
      
      const userRows = await runQuery(sql`
        INSERT INTO auth.users (email, encrypted_password)
        VALUES (${email.trim().toLowerCase()}, crypt(${password}, gen_salt('bf')))
        RETURNING id, email;
      `);
      const userId = userRows[0].id;

      const tenantRows = await runQuery(sql`
        INSERT INTO tenants (slug, name, legal_name, cnpj, status, theme)
        VALUES (
          ${slug}, ${salonName}, ${salonName + ' LTDA'}, ${cnpj || null}, 'active',
          '{"primaryColor":"#143328","secondaryColor":"#224B3C","accentColor":"#C59B27","backgroundColor":"#FAF8F5","surfaceColor":"#FFFFFF","themeMode":"padrao"}'::jsonb
        )
        RETURNING id, slug, name;
      `);
      const tenantId = tenantRows[0].id;

      // Cria unidade Matriz inicial
      const unitRows = await runQuery(sql`
        INSERT INTO units (tenant_id, name, chairs_count, active)
        VALUES (${tenantId}, 'Unidade Principal', 4, true)
        RETURNING id, name;
      `);
      const unitId = unitRows[0].id;

      // Cria Profile
      await runQuery(sql`
        INSERT INTO profiles (id, tenant_id, full_name, email)
        VALUES (${userId}, ${tenantId}, ${fullName}, ${email.trim().toLowerCase()});
      `);

      // Cria Membership como Proprietário
      await runQuery(sql`
        INSERT INTO memberships (user_id, tenant_id, unit_id, role)
        VALUES (${userId}, ${tenantId}, ${unitId}, 'proprietario'::member_role);
      `);

      // Cria Profissional Inicial para o Proprietário
      const initials = fullName.slice(0, 2).toUpperCase();
      await runQuery(sql`
        INSERT INTO professionals (
          tenant_id, unit_id, profile_id, name, role_title, specialty, avatar_initials,
          commission_service_bps, commission_product_bps, assistant_split_bps,
          monthly_goal_cents, working_hours, active
        )
        VALUES (
          ${tenantId}, ${unitId}, ${userId}, ${fullName}, 'Proprietário & Especialista', 'Cabelo & Estética',
          ${initials}, 5000, 1000, 0, 500000,
          '{"start":"09:00","end":"19:00","lunchStart":"12:00","lunchEnd":"13:00"}'::jsonb, true
        );
      `);

      // Cria Serviços Iniciais Essenciais
      await runQuery(sql`
        INSERT INTO services (
          tenant_id, name, category, description, duration_minutes,
          pause_minutes, prep_minutes, price_type, base_price_cents,
          deposit_required_cents, default_commission_bps, online_booking_available,
          requires_pre_evaluation, active
        )
        VALUES 
          (${tenantId}, 'Corte & Finalização', 'Cabelo', 'Corte personalizado e lavagem com massagem capilar.', 60, 0, 0, 'fixo', 12000, 0, 5000, true, false, true),
          (${tenantId}, 'Coloração & Mechas', 'Colorimetria', 'Coloração global ou mechas com produtos de alta performance.', 120, 20, 10, 'a_partir_de', 35000, 5000, 5000, true, false, true),
          (${tenantId}, 'Manicure & Pedicure', 'Unhas', 'Higienização, cutilagem e esmaltação completa.', 60, 0, 0, 'fixo', 8000, 0, 5000, true, false, true);
      `);

      return {
        status: 201,
        data: {
          user: {
            id: userId,
            email: email.trim().toLowerCase(),
            fullName,
            role: 'proprietario',
            tenantId,
            salonSlug: slug,
            salonName,
            unitId,
          },
        },
      };
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      const { email, password } = body || {};
      if (!email || !password) {
        return { status: 400, data: { error: 'Informe e-mail e senha.' } };
      }

      const rows = await runQuery(sql`
        SELECT 
          u.id, u.email, p.full_name as "fullName",
          m.tenant_id as "tenantId", m.role, m.unit_id as "unitId",
          t.name as "salonName", t.slug as "salonSlug"
        FROM auth.users u
        LEFT JOIN profiles p ON p.id = u.id
        LEFT JOIN memberships m ON m.user_id = u.id AND m.deleted_at IS NULL
        LEFT JOIN tenants t ON t.id = m.tenant_id AND t.deleted_at IS NULL
        WHERE lower(u.email) = lower(${email.trim()})
          AND u.encrypted_password = crypt(${password}, u.encrypted_password)
        LIMIT 1;
      `);

      if (rows.length === 0) {
        return { status: 401, data: { error: 'E-mail ou senha incorretos.' } };
      }

      return {
        status: 200,
        data: {
          user: rows[0],
        },
      };
    }

    // -------------------------------------------------------------------------
    // 3. Tenants (Salões) e Unidades
    // -------------------------------------------------------------------------
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
                'salonId', t.id,
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

    if (pathname === '/api/tenants' && method === 'POST') {
      const b = body || {};
      const slug = b.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);
      const goalCents = Math.round((b.dailyRevenueGoal || 0) * 100);

      const rows = await runQuery(sql`
        INSERT INTO tenants (
          slug, name, legal_name, cnpj, daily_revenue_goal_cents,
          commission_release_rule, theme, status
        )
        VALUES (
          ${slug}, ${b.name}, ${b.legalName || b.name}, ${b.cnpj || null},
          ${goalCents}, ${b.commissionReleaseRule || 'recebimento'},
          ${JSON.stringify(b.theme || {})}, 'active'
        )
        RETURNING id, slug, name as "commercialName";
      `);

      // Cria unidade inicial
      await runQuery(sql`
        INSERT INTO units (tenant_id, name, chairs_count, active)
        VALUES (${rows[0].id}, 'Unidade Matriz', 4, true);
      `);

      return { status: 201, data: rows[0] };
    }

    if (pathname.startsWith('/api/tenants/') && (method === 'PATCH' || method === 'PUT')) {
      const id = pathname.replace('/api/tenants/', '');
      const b = body || {};
      const goalCents = b.dailyRevenueGoal !== undefined ? Math.round(b.dailyRevenueGoal * 100) : null;

      await runQuery(sql`
        UPDATE tenants SET
          name = COALESCE(${b.commercialName || b.name}, name),
          theme = CASE WHEN ${b.theme ? JSON.stringify(b.theme) : null}::jsonb IS NOT NULL THEN ${JSON.stringify(b.theme || {})}::jsonb ELSE theme END,
          daily_revenue_goal_cents = COALESCE(${goalCents}, daily_revenue_goal_cents),
          commission_release_rule = COALESCE(${b.commissionReleaseRule}, commission_release_rule),
          status = COALESCE(${b.status}, status),
          updated_at = now()
        WHERE id::text = ${id} OR slug = ${id};
      `);

      return { status: 200, data: { success: true } };
    }

    // Helper para obter o UUID do tenant a partir de id ou slug
    async function resolveTenantUuid(param?: string | null): Promise<string | null> {
      if (!param) {
        const first = await runQuery(sql`SELECT id FROM tenants WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1;`);
        return first[0]?.id || null;
      }
      // Se é um UUID
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param)) {
        return param;
      }
      // Se é um slug
      const row = await runQuery(sql`SELECT id FROM tenants WHERE slug = ${param} LIMIT 1;`);
      return row[0]?.id || null;
    }

    // -------------------------------------------------------------------------
    // 4. Clientes
    // -------------------------------------------------------------------------
    if (pathname === '/api/clients' && method === 'GET') {
      const tenantUuid = await resolveTenantUuid(tenantParam);
      const clients = await runQuery(sql`
        SELECT 
          c.id, c.tenant_id as "salonId", c.name, c.social_name as "socialName",
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
        WHERE c.deleted_at IS NULL
          AND (${tenantUuid}::uuid IS NULL OR c.tenant_id = ${tenantUuid}::uuid)
        ORDER BY c.created_at DESC;
      `);

      return { status: 200, data: clients };
    }

    if (pathname === '/api/clients' && method === 'POST') {
      const b = body || {};
      const tenantUuid = await resolveTenantUuid(b.salonId || tenantParam);

      if (!tenantUuid) {
        return { status: 400, data: { error: 'Nenhum salão cadastrado ou informado.' } };
      }

      const internalCreditCents = Math.round((b.internalCredit || 0) * 100);
      const totalSpentCents = Math.round((b.totalSpent || 0) * 100);
      const idUuid = b.id && /^[0-9a-f-]{36}$/i.test(b.id) ? b.id : null;

      const inserted = await runQuery(sql`
        INSERT INTO clients (
          id, tenant_id, name, social_name, phone, email,
          birth_date, cpf, origin, tags, internal_credit_cents, loyalty_points,
          total_spent_cents, lgpd_health_consent, marketing_opt_in,
          restricted_notes, crm_stage
        )
        VALUES (
          COALESCE(${idUuid}::uuid, gen_random_uuid()),
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

    // -------------------------------------------------------------------------
    // 5. Serviços
    // -------------------------------------------------------------------------
    if (pathname === '/api/services' && method === 'GET') {
      const tenantUuid = await resolveTenantUuid(tenantParam);
      const services = await runQuery(sql`
        SELECT 
          s.id, s.tenant_id as "salonId", s.name, s.category, s.description,
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
        WHERE s.deleted_at IS NULL
          AND (${tenantUuid}::uuid IS NULL OR s.tenant_id = ${tenantUuid}::uuid)
        ORDER BY s.category ASC, s.name ASC;
      `);

      return { status: 200, data: services };
    }

    if (pathname === '/api/services' && method === 'POST') {
      const b = body || {};
      const tenantUuid = await resolveTenantUuid(b.salonId || tenantParam);

      if (!tenantUuid) {
        return { status: 400, data: { error: 'Nenhum salão cadastrado ou informado.' } };
      }

      const basePriceCents = Math.round((b.basePrice || 0) * 100);
      const depositRequiredCents = Math.round((b.depositRequired || 0) * 100);
      const defaultCommissionBps = Math.round((b.defaultCommissionPct || 0) * 100);
      const idUuid = b.id && /^[0-9a-f-]{36}$/i.test(b.id) ? b.id : null;

      const inserted = await runQuery(sql`
        INSERT INTO services (
          id, tenant_id, name, category, description, duration_minutes,
          pause_minutes, prep_minutes, price_type, base_price_cents,
          deposit_required_cents, default_commission_bps, online_booking_available,
          requires_pre_evaluation, active
        )
        VALUES (
          COALESCE(${idUuid}::uuid, gen_random_uuid()),
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

    // -------------------------------------------------------------------------
    // 6. Profissionais
    // -------------------------------------------------------------------------
    if (pathname === '/api/professionals' && method === 'GET') {
      const tenantUuid = await resolveTenantUuid(tenantParam);
      const professionals = await runQuery(sql`
        SELECT 
          p.id, p.tenant_id as "salonId", p.unit_id as "unitId", p.name,
          p.role_title as "roleTitle", p.specialty, p.avatar_initials as "avatarInitials",
          (p.commission_service_bps / 100.0) as "commissionServicePct",
          (p.commission_product_bps / 100.0) as "commissionProductPct",
          (p.assistant_split_bps / 100.0) as "assistantSplitPct",
          (p.monthly_goal_cents / 100.0) as "monthlyGoal",
          p.working_hours as "workingHours",
          p.active
        FROM professionals p
        WHERE p.deleted_at IS NULL
          AND (${tenantUuid}::uuid IS NULL OR p.tenant_id = ${tenantUuid}::uuid)
        ORDER BY p.name ASC;
      `);

      return { status: 200, data: professionals };
    }

    if (pathname === '/api/professionals' && method === 'POST') {
      const b = body || {};
      const tenantUuid = await resolveTenantUuid(b.salonId || tenantParam);

      if (!tenantUuid) {
        return { status: 400, data: { error: 'Nenhum salão cadastrado ou informado.' } };
      }

      // Obtém ou resolve unit
      let unitUuid = b.unitId;
      if (!unitUuid || !/^[0-9a-f-]{36}$/i.test(unitUuid)) {
        const u = await runQuery(sql`SELECT id FROM units WHERE tenant_id = ${tenantUuid} LIMIT 1;`);
        unitUuid = u[0]?.id;
      }

      const commServiceBps = Math.round((b.commissionServicePct || 0) * 100);
      const commProductBps = Math.round((b.commissionProductPct || 0) * 100);
      const assistantSplitBps = Math.round((b.assistantSplitPct || 0) * 100);
      const monthlyGoalCents = Math.round((b.monthlyGoal || 0) * 100);
      const idUuid = b.id && /^[0-9a-f-]{36}$/i.test(b.id) ? b.id : null;

      const inserted = await runQuery(sql`
        INSERT INTO professionals (
          id, tenant_id, unit_id, name, role_title, specialty, avatar_initials,
          commission_service_bps, commission_product_bps, assistant_split_bps,
          monthly_goal_cents, working_hours, active
        )
        VALUES (
          COALESCE(${idUuid}::uuid, gen_random_uuid()),
          ${tenantUuid}, ${unitUuid}, ${b.name}, ${b.roleTitle || ''},
          ${b.specialty || ''}, ${b.avatarInitials || b.name.substring(0, 2).toUpperCase()},
          ${commServiceBps}, ${commProductBps}, ${assistantSplitBps},
          ${monthlyGoalCents}, ${JSON.stringify(b.workingHours || {})}, true
        )
        RETURNING id, name;
      `);

      return { status: 201, data: inserted[0] };
    }

    // -------------------------------------------------------------------------
    // 7. Agendamentos (Appointments)
    // -------------------------------------------------------------------------
    if (pathname === '/api/appointments' && method === 'GET') {
      const tenantUuid = await resolveTenantUuid(tenantParam);
      const appointments = await runQuery(sql`
        SELECT 
          a.id, a.tenant_id as "salonId", a.unit_id as "unitId",
          a.client_id as "clientId", a.client_name as "clientName", a.client_phone as "clientPhone",
          a.service_id as "serviceId", a.service_name as "serviceName",
          a.professional_id as "professionalId", a.professional_name as "professionalName",
          a.chair_or_room as "chairOrRoom",
          to_char(a.date, 'YYYY-MM-DD') as "date",
          a.start_time as "startTime", a.end_time as "endTime",
          a.duration_minutes as "durationMinutes",
          a.status, a.payment_status as "paymentStatus",
          (a.estimated_price_cents / 100.0) as "estimatedPrice",
          (a.deposit_paid_cents / 100.0) as "depositPaid",
          a.deposit_deducted as "depositDeductedInComanda",
          a.origin, a.notes,
          a.check_in_time as "checkInTime",
          a.service_start_time as "serviceStartTime"
        FROM appointments a
        WHERE a.deleted_at IS NULL
          AND (${tenantUuid}::uuid IS NULL OR a.tenant_id = ${tenantUuid}::uuid)
        ORDER BY a.date DESC, a.start_time ASC;
      `);

      return { status: 200, data: appointments };
    }

    if (pathname === '/api/appointments' && method === 'POST') {
      const b = body || {};
      const tenantUuid = await resolveTenantUuid(b.salonId || tenantParam);

      if (!tenantUuid) {
        return { status: 400, data: { error: 'Nenhum salão cadastrado ou informado.' } };
      }

      let unitUuid = b.unitId;
      if (!unitUuid || !/^[0-9a-f-]{36}$/i.test(unitUuid)) {
        const u = await runQuery(sql`SELECT id FROM units WHERE tenant_id = ${tenantUuid} LIMIT 1;`);
        unitUuid = u[0]?.id;
      }

      let clientUuid = b.clientId;
      if (!clientUuid || !/^[0-9a-f-]{36}$/i.test(clientUuid)) clientUuid = null;
      let serviceUuid = b.serviceId;
      if (!serviceUuid || !/^[0-9a-f-]{36}$/i.test(serviceUuid)) serviceUuid = null;
      let profUuid = b.professionalId;
      if (!profUuid || !/^[0-9a-f-]{36}$/i.test(profUuid)) profUuid = null;

      const estimatedCents = Math.round((b.estimatedPrice || 0) * 100);
      const depositCents = Math.round((b.depositPaid || 0) * 100);
      const idUuid = b.id && /^[0-9a-f-]{36}$/i.test(b.id) ? b.id : null;

      const inserted = await runQuery(sql`
        INSERT INTO appointments (
          id, tenant_id, unit_id, client_id, client_name, client_phone,
          service_id, service_name, professional_id, professional_name,
          chair_or_room, date, start_time, end_time, duration_minutes,
          status, payment_status, estimated_price_cents, deposit_paid_cents,
          deposit_deducted, origin, notes
        )
        VALUES (
          COALESCE(${idUuid}::uuid, gen_random_uuid()),
          ${tenantUuid}, ${unitUuid}, ${clientUuid}, ${b.clientName || 'Cliente'}, ${b.clientPhone || null},
          ${serviceUuid}, ${b.serviceName || 'Serviço'}, ${profUuid}, ${b.professionalName || 'Profissional'},
          ${b.chairOrRoom || 'Cadeira'}, ${b.date || new Date().toISOString().split('T')[0]},
          ${b.startTime || '09:00'}, ${b.endTime || '10:00'}, ${b.durationMinutes || 60},
          ${b.status || 'solicitado'}, ${b.paymentStatus || 'pendente'},
          ${estimatedCents}, ${depositCents}, ${b.depositDeductedInComanda ?? false},
          ${b.origin || 'Online'}, ${b.notes || null}
        )
        RETURNING id, client_name as "clientName";
      `);

      return { status: 201, data: inserted[0] };
    }

    if (pathname.startsWith('/api/appointments/') && (method === 'PATCH' || method === 'PUT')) {
      const id = pathname.replace('/api/appointments/', '');
      const b = body || {};

      await runQuery(sql`
        UPDATE appointments SET
          status = COALESCE(${b.status}, status),
          payment_status = COALESCE(${b.paymentStatus}, payment_status),
          check_in_time = COALESCE(${b.checkInTime}, check_in_time),
          service_start_time = COALESCE(${b.serviceStartTime}, service_start_time),
          notes = COALESCE(${b.notes}, notes),
          updated_at = now()
        WHERE id::text = ${id} OR id::text = ${b.id};
      `);

      return { status: 200, data: { success: true } };
    }

    // -------------------------------------------------------------------------
    // 8. Comandas
    // -------------------------------------------------------------------------
    if (pathname === '/api/comandas' && method === 'GET') {
      const tenantUuid = await resolveTenantUuid(tenantParam);
      const comandas = await runQuery(sql`
        SELECT 
          c.id, c.number, c.tenant_id as "salonId", c.unit_id as "unitId",
          c.appointment_id as "appointmentId", c.client_id as "clientId",
          c.client_name as "clientName", c.opened_at as "openedAt", c.closed_at as "closedAt",
          c.attendance_status as "attendanceStatus", c.comanda_status as "comandaStatus",
          c.payment_status as "paymentStatus",
          (c.deposit_applied_cents / 100.0) as "depositApplied",
          (c.courtesy_discount_cents / 100.0) as "courtesyDiscount",
          (c.tip_cents / 100.0) as "tipAmount",
          c.notes, c.payer_type as "payerType",
          c.corporate_billing_approved as "corporateBillingApproved",
          c.items, c.payments
        FROM comandas c
        WHERE c.deleted_at IS NULL
          AND (${tenantUuid}::uuid IS NULL OR c.tenant_id = ${tenantUuid}::uuid)
        ORDER BY c.number DESC;
      `);

      return { status: 200, data: comandas };
    }

    if (pathname === '/api/comandas' && method === 'POST') {
      const b = body || {};
      const tenantUuid = await resolveTenantUuid(b.salonId || tenantParam);

      if (!tenantUuid) {
        return { status: 400, data: { error: 'Nenhum salão cadastrado ou informado.' } };
      }

      // Próximo número da comanda
      const numRow = await runQuery(sql`
        SELECT COALESCE(MAX(number), 2040) + 1 as next_num FROM comandas WHERE tenant_id = ${tenantUuid};
      `);
      const nextNum = b.number || numRow[0].next_num;
      const idUuid = b.id && /^[0-9a-f-]{36}$/i.test(b.id) ? b.id : null;
      let apptUuid = b.appointmentId && /^[0-9a-f-]{36}$/i.test(b.appointmentId) ? b.appointmentId : null;
      let clientUuid = b.clientId && /^[0-9a-f-]{36}$/i.test(b.clientId) ? b.clientId : null;
      let unitUuid = b.unitId && /^[0-9a-f-]{36}$/i.test(b.unitId) ? b.unitId : null;

      const inserted = await runQuery(sql`
        INSERT INTO comandas (
          id, number, tenant_id, unit_id, appointment_id, client_id,
          client_name, opened_at, attendance_status,
          comanda_status, payment_status, items, payments
        )
        VALUES (
          COALESCE(${idUuid}::uuid, gen_random_uuid()),
          ${nextNum}, ${tenantUuid}, ${unitUuid}, ${apptUuid}, ${clientUuid},
          ${b.clientName || 'Cliente'},
          ${b.openedAt || '10:00'}, ${b.attendanceStatus || 'em_andamento'},
          ${b.comandaStatus || 'aberta'}, ${b.paymentStatus || 'pendente'},
          ${JSON.stringify(b.items || [])}::jsonb, ${JSON.stringify(b.payments || [])}::jsonb
        )
        RETURNING id, number;
      `);

      return { status: 201, data: inserted[0] };
    }

    if (pathname.startsWith('/api/comandas/') && (method === 'PATCH' || method === 'PUT')) {
      const id = pathname.replace('/api/comandas/', '');
      const b = body || {};

      await runQuery(sql`
        UPDATE comandas SET
          attendance_status = COALESCE(${b.attendanceStatus}, attendance_status),
          comanda_status = COALESCE(${b.comandaStatus}, comanda_status),
          payment_status = COALESCE(${b.paymentStatus}, payment_status),
          closed_at = COALESCE(${b.closedAt}, closed_at),
          items = COALESCE(${b.items ? JSON.stringify(b.items) : null}::jsonb, items),
          payments = COALESCE(${b.payments ? JSON.stringify(b.payments) : null}::jsonb, payments),
          updated_at = now()
        WHERE id::text = ${id} OR number::text = ${id};
      `);

      return { status: 200, data: { success: true } };
    }

    // -------------------------------------------------------------------------
    // 9. Produtos & Estoque
    // -------------------------------------------------------------------------
    if (pathname === '/api/products' && method === 'GET') {
      const tenantUuid = await resolveTenantUuid(tenantParam);
      const products = await runQuery(sql`
        SELECT 
          p.id, p.tenant_id as "salonId", p.name, p.sku, p.brand, p.category,
          p.unit, (p.cost_price_cents / 100.0) as "costPrice",
          (p.sale_price_cents / 100.0) as "salePrice",
          (p.commission_bps / 100.0) as "saleCommissionPct",
          p.current_stock as "currentStock",
          p.min_stock as "minStock",
          p.ideal_stock as "idealStock",
          p.allow_fractional_sale as "allowFractionalSale",
          p.is_technical_material as "isTechnicalMaterial",
          p.active
        FROM products p
        WHERE p.deleted_at IS NULL
          AND (${tenantUuid}::uuid IS NULL OR p.tenant_id = ${tenantUuid}::uuid)
        ORDER BY p.name ASC;
      `);

      return { status: 200, data: products };
    }

    if (pathname === '/api/products' && method === 'POST') {
      const b = body || {};
      const tenantUuid = await resolveTenantUuid(b.salonId || tenantParam);
      if (!tenantUuid) {
        return { status: 400, data: { error: 'Nenhum salão informado.' } };
      }

      const costCents = Math.round((b.costPrice || 0) * 100);
      const saleCents = Math.round((b.salePrice || 0) * 100);
      const commBps = Math.round((b.saleCommissionPct || 0) * 100);
      const idUuid = b.id && /^[0-9a-f-]{36}$/i.test(b.id) ? b.id : null;

      const inserted = await runQuery(sql`
        INSERT INTO products (
          id, tenant_id, name, sku, brand, category, unit,
          cost_price_cents, sale_price_cents, commission_bps,
          current_stock, min_stock, ideal_stock, allow_fractional_sale,
          is_technical_material, active
        )
        VALUES (
          COALESCE(${idUuid}::uuid, gen_random_uuid()),
          ${tenantUuid}, ${b.name}, ${b.sku || ''}, ${b.brand || ''}, ${b.category || 'Geral'},
          ${b.unit || 'un'}, ${costCents}, ${saleCents}, ${commBps},
          ${b.currentStock || 0}, ${b.minStock || 0}, ${b.idealStock || 0},
          ${b.allowFractionalSale ?? false}, ${b.isTechnicalMaterial ?? false}, true
        )
        RETURNING id, name;
      `);

      return { status: 201, data: inserted[0] };
    }

    if (pathname.startsWith('/api/products/') && (method === 'PATCH' || method === 'PUT')) {
      const id = pathname.replace('/api/products/', '');
      const b = body || {};

      await runQuery(sql`
        UPDATE products SET
          current_stock = COALESCE(${b.currentStock}, current_stock),
          name = COALESCE(${b.name}, name),
          updated_at = now()
        WHERE id::text = ${id};
      `);

      return { status: 200, data: { success: true } };
    }

    return { status: 404, data: { error: 'Endpoint não encontrado' } };
  } catch (error: any) {
    console.error('API Error:', error);
    return { status: 500, data: { error: error.message || 'Erro interno do servidor' } };
  }
}
