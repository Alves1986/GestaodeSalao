import { sql, runQuery } from './db.js';
import {
  INITIAL_SALONS,
  INITIAL_PROFESSIONALS,
  INITIAL_SERVICES,
  INITIAL_CLIENTS,
} from '../src/data/initialData.js';

export async function seedDatabase() {
  console.log('--- Iniciando Sincronização / Seed no Neon Database ---');

  const tenantMap = new Map<string, string>(); // slug -> db_uuid
  const unitMap = new Map<string, string>(); // unitId -> db_uuid

  // 1. Tenants e Unidades
  for (const salon of INITIAL_SALONS) {
    const slug = salon.id; // 'salon-1', 'salon-2'
    const dailyRevenueGoalCents = Math.round((salon.dailyRevenueGoal || 0) * 100);

    const rows = await runQuery(sql`
      INSERT INTO tenants (
        slug, name, legal_name, cnpj, status, daily_revenue_goal_cents,
        commission_release_rule, share_clients_across_units, cancellation_policy,
        municipal_tax_code, theme
      )
      VALUES (
        ${slug}, ${salon.commercialName}, ${salon.legalName}, ${salon.cnpj},
        'active', ${dailyRevenueGoalCents}, ${salon.commissionReleaseRule},
        ${salon.shareClientsAcrossUnits}, ${salon.cancellationPolicy},
        ${salon.municipalTaxCode}, ${JSON.stringify(salon.theme)}
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        legal_name = EXCLUDED.legal_name,
        cnpj = EXCLUDED.cnpj,
        daily_revenue_goal_cents = EXCLUDED.daily_revenue_goal_cents,
        theme = EXCLUDED.theme
      RETURNING id, slug;
    `);

    const tenantUuid = rows[0]?.id;
    if (tenantUuid) {
      tenantMap.set(slug, tenantUuid);
      console.log(`✓ Tenant gravado: ${salon.commercialName} [UUID: ${tenantUuid}]`);

      // Unidades
      for (const unit of salon.units) {
        const unitRows = await runQuery(sql`
          INSERT INTO units (tenant_id, name, address, phone, opening_hours, chairs_count, active)
          VALUES (
            ${tenantUuid}, ${unit.name}, ${unit.address}, ${unit.phone},
            ${unit.openingHours}, ${unit.chairsCount}, true
          )
          ON CONFLICT DO NOTHING
          RETURNING id, name;
        `);

        let unitUuid = unitRows[0]?.id;
        if (!unitUuid) {
          const existing = await runQuery(sql`
            SELECT id FROM units WHERE tenant_id = ${tenantUuid} AND name = ${unit.name} LIMIT 1;
          `);
          unitUuid = existing[0]?.id;
        }

        if (unitUuid) {
          unitMap.set(unit.id, unitUuid);
          console.log(`  ✓ Unidade: ${unit.name} [UUID: ${unitUuid}]`);
        }
      }
    }
  }

  // 2. Profissionais
  const profMap = new Map<string, string>();
  for (const prof of INITIAL_PROFESSIONALS) {
    const tenantUuid = tenantMap.get(prof.salonId);
    let unitUuid = unitMap.get(prof.unitId);
    if (!unitUuid && tenantUuid) {
      const u = await runQuery(sql`SELECT id FROM units WHERE tenant_id = ${tenantUuid} LIMIT 1`);
      unitUuid = u[0]?.id;
    }

    if (tenantUuid && unitUuid) {
      const commServiceBps = Math.round(prof.commissionServicePct * 100);
      const commProductBps = Math.round(prof.commissionProductPct * 100);
      const assistantSplitBps = Math.round(prof.assistantSplitPct * 100);
      const monthlyGoalCents = Math.round(prof.monthlyGoal * 100);

      const profRows = await runQuery(sql`
        INSERT INTO professionals (
          tenant_id, unit_id, name, role_title, specialty, avatar_initials,
          commission_service_bps, commission_product_bps, assistant_split_bps,
          monthly_goal_cents, working_hours, active
        )
        VALUES (
          ${tenantUuid}, ${unitUuid}, ${prof.name}, ${prof.roleTitle},
          ${prof.specialty}, ${prof.avatarInitials}, ${commServiceBps},
          ${commProductBps}, ${assistantSplitBps}, ${monthlyGoalCents},
          ${JSON.stringify(prof.workingHours)}, ${prof.active}
        )
        ON CONFLICT DO NOTHING
        RETURNING id, name;
      `);

      let profUuid = profRows[0]?.id;
      if (!profUuid) {
        const existing = await runQuery(sql`
          SELECT id FROM professionals WHERE tenant_id = ${tenantUuid} AND name = ${prof.name} LIMIT 1;
        `);
        profUuid = existing[0]?.id;
      }
      if (profUuid) {
        profMap.set(prof.id, profUuid);
        console.log(`✓ Profissional: ${prof.name} [UUID: ${profUuid}]`);
      }
    }
  }

  // 3. Serviços
  for (const srv of INITIAL_SERVICES) {
    const tenantUuid = tenantMap.get(srv.salonId);
    if (tenantUuid) {
      const basePriceCents = Math.round(srv.basePrice * 100);
      const depositRequiredCents = Math.round(srv.depositRequired * 100);
      const defaultCommissionBps = Math.round(srv.defaultCommissionPct * 100);

      await runQuery(sql`
        INSERT INTO services (
          tenant_id, name, category, description, duration_minutes,
          pause_minutes, prep_minutes, price_type, base_price_cents,
          deposit_required_cents, default_commission_bps, online_booking_available,
          requires_pre_evaluation, active
        )
        VALUES (
          ${tenantUuid}, ${srv.name}, ${srv.category}, ${srv.description},
          ${srv.durationMinutes}, ${srv.pauseMinutes}, ${srv.prepMinutes},
          ${srv.priceType}, ${basePriceCents}, ${depositRequiredCents},
          ${defaultCommissionBps}, ${srv.onlineBookingAvailable},
          ${srv.requiresPreEvaluation}, true
        )
        ON CONFLICT DO NOTHING;
      `);
      console.log(`✓ Serviço: ${srv.name}`);
    }
  }

  // 4. Clientes
  for (const cli of INITIAL_CLIENTS) {
    const tenantUuid = tenantMap.get(cli.salonId);
    if (tenantUuid) {
      const preferredProfUuid = cli.preferredProfessionalId ? profMap.get(cli.preferredProfessionalId) || null : null;
      const internalCreditCents = Math.round(cli.internalCredit * 100);
      const totalSpentCents = Math.round(cli.totalSpent * 100);

      await runQuery(sql`
        INSERT INTO clients (
          tenant_id, preferred_professional_id, name, phone, email,
          birth_date, cpf, origin, tags, internal_credit_cents, loyalty_points,
          total_spent_cents, lgpd_health_consent, marketing_opt_in,
          restricted_notes, crm_stage
        )
        VALUES (
          ${tenantUuid}, ${preferredProfUuid}, ${cli.name}, ${cli.phone},
          ${cli.email || null}, ${cli.birthDate || null}, ${cli.cpf || null},
          ${cli.origin}, ${cli.tags}, ${internalCreditCents}, ${cli.loyaltyPoints},
          ${totalSpentCents}, ${cli.lgpdHealthConsent}, ${cli.marketingOptIn},
          ${cli.restrictedNotes || null}, ${cli.crmStage}
        )
        ON CONFLICT DO NOTHING;
      `);
      console.log(`✓ Cliente: ${cli.name}`);
    }
  }

  console.log('--- Sincronização concluída com sucesso! ---');
}

// Execução direta
seedDatabase()
  .then(() => {
    console.log('Seed finalizado.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Falha no seed:', err);
    process.exit(1);
  });
