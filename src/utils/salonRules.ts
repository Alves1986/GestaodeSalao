import {
  Appointment,
  CashSession,
  ClientPackage,
  Comanda,
  ComandaItem,
  ComandaPaymentAllocation,
  FinancialEntry,
  UserRole,
  SalonMenuId,
} from '../types/salon';

/**
 * Regra 1 (Seção 21): O mesmo horário não pode ser confirmado duas vezes indevidamente
 * para o mesmo profissional (salvo encaixe explícito autorizado).
 */
export function hasScheduleConflict(
  existingAppointments: Appointment[],
  candidate: {
    salonId: string;
    professionalId: string;
    date: string;
    startTime: string;
    durationMinutes: number;
    excludeAppointmentId?: string;
    allowAuthorizedFitIn?: boolean;
  }
): { conflict: boolean; conflictingAppointment?: Appointment } {
  if (candidate.allowAuthorizedFitIn) {
    return { conflict: false };
  }

  const toMinutes = (hhmm: string): number => {
    const [h, m] = hhmm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const candStart = toMinutes(candidate.startTime);
  const candEnd = candStart + candidate.durationMinutes;

  for (const appt of existingAppointments) {
    if (appt.salonId !== candidate.salonId) continue;
    if (appt.id === candidate.excludeAppointmentId) continue;
    if (appt.professionalId !== candidate.professionalId) continue;
    if (appt.date !== candidate.date) continue;
    if (appt.status === 'cancelado' || appt.status === 'nao_compareceu') continue;

    const existingStart = toMinutes(appt.startTime);
    const existingEnd = existingStart + appt.durationMinutes;

    if (candStart < existingEnd && candEnd > existingStart) {
      return { conflict: true, conflictingAppointment: appt };
    }
  }

  return { conflict: false };
}

/**
 * Regra 2, 3, 4 e 10 (Seção 21):
 * - Um sinal pago deve ser abatido apenas uma vez.
 * - Uma notificação repetida de pagamento (mesmo externalTxId) não pode gerar duas receitas.
 * - Concluir atendimento não marca automaticamente uma dívida como paga.
 */
export function calculateComandaTotals(comanda: Comanda): {
  subtotalServices: number;
  subtotalProducts: number;
  activeItemsTotal: number;
  itemDiscounts: number;
  globalDiscount: number;
  depositDeducted: number;
  tipAmount: number;
  netPayable: number;
  totalPaid: number;
  remainingBalance: number;
  paymentStatus: 'pendente' | 'parcial' | 'pago' | 'estornado';
} {
  const activeItems = comanda.items.filter((item) => !item.cancelled);

  const subtotalServices = activeItems
    .filter((i) => i.type === 'servico' || i.type === 'adicional')
    .reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);

  const subtotalProducts = activeItems
    .filter((i) => i.type === 'produto')
    .reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);

  const itemDiscounts = activeItems.reduce((acc, i) => acc + i.discount, 0);
  const activeItemsTotal = subtotalServices + subtotalProducts;

  // Sinal abatido uma única vez e limitado ao saldo devedor
  const depositDeducted = comanda.depositAlreadyPaid > 0 ? comanda.depositAlreadyPaid : 0;

  const rawPayable =
    activeItemsTotal - itemDiscounts - comanda.globalDiscount - depositDeducted + comanda.tipAmount;
  const netPayable = Math.max(0, Number(rawPayable.toFixed(2)));

  // Deduplica transações repetidas por externalTxId (Regra 3)
  const seenTxIds = new Set<string>();
  const uniquePayments: ComandaPaymentAllocation[] = [];
  for (const p of comanda.payments) {
    if (p.externalTxId) {
      if (seenTxIds.has(p.externalTxId)) continue;
      seenTxIds.add(p.externalTxId);
    }
    uniquePayments.push(p);
  }

  const totalPaid = Number(
    uniquePayments.reduce((acc, p) => acc + p.amount, 0).toFixed(2)
  );
  const remainingBalance = Math.max(0, Number((netPayable - totalPaid).toFixed(2)));

  let paymentStatus: 'pendente' | 'parcial' | 'pago' | 'estornado' = 'pendente';
  if (comanda.paymentStatus === 'estornado') {
    paymentStatus = 'estornado';
  } else if (netPayable === 0 && activeItems.length > 0) {
    paymentStatus = 'pago';
  } else if (totalPaid >= netPayable && netPayable > 0) {
    paymentStatus = 'pago';
  } else if (totalPaid > 0 && totalPaid < netPayable) {
    paymentStatus = 'parcial';
  }

  return {
    subtotalServices,
    subtotalProducts,
    activeItemsTotal,
    itemDiscounts,
    globalDiscount: comanda.globalDiscount,
    depositDeducted,
    tipAmount: comanda.tipAmount,
    netPayable,
    totalPaid,
    remainingBalance,
    paymentStatus,
  };
}

/**
 * Regra 12: Cálculo de comissões (suporta divisão entre executor e auxiliar, e regra por execução ou recebimento).
 */
export function calculateItemCommission(
  item: ComandaItem,
  assistantSplitPct: number,
  releaseRule: 'execucao' | 'recebimento',
  attendanceCompleted: boolean,
  comandaPaid: boolean
): {
  executorAmount: number;
  assistantAmount: number;
  status: 'prevista' | 'elegivel' | 'estornada';
} {
  if (item.cancelled) {
    return { executorAmount: 0, assistantAmount: 0, status: 'estornada' };
  }

  const baseValue = Math.max(0, item.unitPrice * item.quantity - item.discount);
  const totalCommission = Number(((baseValue * item.commissionPct) / 100).toFixed(2));

  let assistantAmount = 0;
  let executorAmount = totalCommission;

  if (item.assistantProfessionalId && assistantSplitPct > 0) {
    assistantAmount = Number(((totalCommission * assistantSplitPct) / 100).toFixed(2));
    executorAmount = Number((totalCommission - assistantAmount).toFixed(2));
  }

  const isEligible =
    releaseRule === 'execucao' ? attendanceCompleted : attendanceCompleted && comandaPaid;

  return {
    executorAmount,
    assistantAmount,
    status: isEligible ? 'elegivel' : 'prevista',
  };
}

/**
 * Regra 5 (Seção 21): Vender um pacote não pode gerar nova venda financeira a cada uso da sessão.
 */
export function redeemPackageSession(pkg: ClientPackage): {
  updatedPackage: ClientPackage;
  financialRevenueGenerated: number;
  canRedeem: boolean;
} {
  if (pkg.status !== 'ativo' || pkg.usedSessions >= pkg.totalSessions) {
    return {
      updatedPackage: pkg,
      financialRevenueGenerated: 0,
      canRedeem: false,
    };
  }

  const nextUsed = pkg.usedSessions + 1;
  const updatedPackage: ClientPackage = {
    ...pkg,
    usedSessions: nextUsed,
    status: nextUsed >= pkg.totalSessions ? 'concluido' : 'ativo',
  };

  return {
    updatedPackage,
    financialRevenueGenerated: 0, // Zero new revenue on redemption to avoid double counting
    canRedeem: true,
  };
}

/**
 * Seção 11.1: O saldo físico em dinheiro não deve ser confundido com vendas em cartão ou Pix.
 */
export function calculateCashSessionSummary(session: CashSession): {
  expectedPhysicalCash: number;
  digitalReceiptsTotal: number;
  suprimentosTotal: number;
  sangriasTotal: number;
  expensesCashTotal: number;
  cashDivergence: number;
} {
  let cashSales = 0;
  let digitalReceiptsTotal = 0;
  let suprimentosTotal = 0;
  let sangriasTotal = 0;
  let expensesCashTotal = 0;

  for (const mov of session.movements) {
    if (mov.type === 'entrada_venda') {
      if (mov.paymentMethod === 'dinheiro' || mov.paymentMethod === 'dinheiro_fisico') {
        cashSales += mov.amount;
      } else {
        digitalReceiptsTotal += mov.amount;
      }
    } else if (mov.type === 'suprimento') {
      suprimentosTotal += mov.amount;
    } else if (mov.type === 'sangria') {
      sangriasTotal += mov.amount;
    } else if (mov.type === 'despesa_caixa') {
      expensesCashTotal += mov.amount;
    }
  }

  const expectedPhysicalCash = Number(
    (
      session.openingBalanceCash +
      cashSales +
      suprimentosTotal -
      sangriasTotal -
      expensesCashTotal
    ).toFixed(2)
  );

  const informed = session.informedClosingCash ?? expectedPhysicalCash;
  const cashDivergence = Number((informed - expectedPhysicalCash).toFixed(2));

  return {
    expectedPhysicalCash,
    digitalReceiptsTotal: Number(digitalReceiptsTotal.toFixed(2)),
    suprimentosTotal,
    sangriasTotal,
    expensesCashTotal,
    cashDivergence,
  };
}

/**
 * Seção 2.2: Validar contraste para evitar textos ilegíveis na personalização White-Label.
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const parseHex = (hex: string): [number, number, number] => {
    const clean = hex.replace('#', '').trim();
    if (clean.length === 3) {
      return [
        parseInt(clean[0] + clean[0], 16),
        parseInt(clean[1] + clean[1], 16),
        parseInt(clean[2] + clean[2], 16),
      ];
    }
    return [
      parseInt(clean.slice(0, 2), 16) || 0,
      parseInt(clean.slice(2, 4), 16) || 0,
      parseInt(clean.slice(4, 6), 16) || 0,
    ];
  };

  const luminance = ([r, g, b]: [number, number, number]): number => {
    const a = [r, g, b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  const l1 = luminance(parseHex(hex1));
  const l2 = luminance(parseHex(hex2));
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

/**
 * Seção 3 & 18: Permissões por perfil (o menu e os indicadores financeiros mudam conforme o perfil).
 */
export function getAllowedMenusForRole(role: UserRole): SalonMenuId[] {
  const allMenus: SalonMenuId[] = [
    'operacao',
    'agenda',
    'recepcao',
    'comandas',
    'clientes',
    'servicos',
    'estoque',
    'profissionais',
    'comissoes',
    'pacotes',
    'financeiro',
    'compras',
    'marketing',
    'relatorios',
    'configuracoes',
  ];

  switch (role) {
    case 'proprietario':
    case 'admin_plataforma':
      return allMenus;
    case 'gerente':
      return allMenus.filter((m) => m !== 'configuracoes');
    case 'recepcao':
      return ['operacao', 'agenda', 'recepcao', 'comandas', 'clientes', 'pacotes'];
    case 'caixa':
      return ['operacao', 'comandas', 'financeiro', 'pacotes'];
    case 'financeiro':
      return ['operacao', 'comandas', 'comissoes', 'financeiro', 'compras', 'relatorios'];
    case 'profissional':
      return ['operacao', 'agenda', 'comandas', 'comissoes'];
    case 'estoque':
      return ['estoque', 'compras', 'servicos', 'relatorios'];
    case 'marketing':
      return ['clientes', 'pacotes', 'marketing', 'relatorios'];
    case 'cliente':
      return ['agenda'];
    default:
      return allMenus;
  }
}

export function canViewFinancialIndicators(role: UserRole): boolean {
  return ['proprietario', 'gerente', 'financeiro', 'caixa', 'admin_plataforma'].includes(role);
}

export interface DailyRevenueExpensePoint {
  date: string; // YYYY-MM-DD
  shortLabel: string; // e.g. 'Ter 20/10'
  weekday: string;
  grossRevenue: number;
  expenses: number;
  netResult: number;
  entriesCount: number;
}

const LAST_7_DAYS_META: { date: string; shortLabel: string; weekday: string }[] = [
  { date: '2026-10-20', shortLabel: '20/10', weekday: 'Ter' },
  { date: '2026-10-21', shortLabel: '21/10', weekday: 'Qua' },
  { date: '2026-10-22', shortLabel: '22/10', weekday: 'Qui' },
  { date: '2026-10-23', shortLabel: '23/10', weekday: 'Sex' },
  { date: '2026-10-24', shortLabel: '24/10', weekday: 'Sáb' },
  { date: '2026-10-25', shortLabel: '25/10', weekday: 'Dom' },
  { date: '2026-10-26', shortLabel: '26/10', weekday: 'Seg' },
];

/**
 * Agrega Receita Bruta vs. Despesas por dia ao longo da última semana (20/10 a 26/10)
 * combinando os registros financeiros (FinancialEntry) e as comandas do dia atual (26/10)
 * sem duplicar comandas já referenciadas em FinancialEntry.
 */
export function buildWeeklyRevenueVsExpenses(
  salonId: string,
  unitId: string,
  financialEntries: FinancialEntry[],
  comandas: Comanda[]
): {
  days: DailyRevenueExpensePoint[];
  totalGrossRevenue: number;
  totalExpenses: number;
  totalNetResult: number;
} {
  const referencedComandaIds = new Set(
    financialEntries
      .filter((f) => f.salonId === salonId && f.referenceId)
      .map((f) => f.referenceId as string)
  );

  const days: DailyRevenueExpensePoint[] = LAST_7_DAYS_META.map((d) => {
    const dayEntries = financialEntries.filter(
      (f) =>
        f.salonId === salonId &&
        (unitId === 'todas' || f.unitId === unitId) &&
        f.status !== 'estornado' &&
        (f.competenceDate === d.date || f.paymentDate === d.date || f.dueDate === d.date)
    );

    // Evita contar duas vezes se competenceDate !== dueDate em outro dia: prioriza competenceDate
    const strictDayEntries = financialEntries.filter(
      (f) =>
        f.salonId === salonId &&
        (unitId === 'todas' || f.unitId === unitId) &&
        f.status !== 'estornado' &&
        f.competenceDate === d.date
    );

    let grossRevenue = strictDayEntries
      .filter((f) => f.type === 'receber')
      .reduce((acc, f) => acc + f.grossAmount, 0);

    const expenses = strictDayEntries
      .filter((f) => f.type === 'pagar')
      .reduce((acc, f) => acc + f.grossAmount, 0);

    let extraComandasCount = 0;
    if (d.date === '2026-10-26') {
      const unreferencedTodayComandas = comandas.filter(
        (c) =>
          c.salonId === salonId &&
          (unitId === 'todas' || c.unitId === unitId) &&
          c.comandaStatus !== 'cancelada' &&
          !referencedComandaIds.has(c.id)
      );
      for (const cmd of unreferencedTodayComandas) {
        const totals = calculateComandaTotals(cmd);
        grossRevenue += totals.activeItemsTotal;
        extraComandasCount += 1;
      }
    }

    const roundedRev = Number(grossRevenue.toFixed(2));
    const roundedExp = Number(expenses.toFixed(2));

    return {
      date: d.date,
      shortLabel: d.shortLabel,
      weekday: d.weekday,
      grossRevenue: roundedRev,
      expenses: roundedExp,
      netResult: Number((roundedRev - roundedExp).toFixed(2)),
      entriesCount: strictDayEntries.length + extraComandasCount + (dayEntries.length > strictDayEntries.length ? 0 : 0),
    };
  });

  const totalGrossRevenue = Number(
    days.reduce((acc, d) => acc + d.grossRevenue, 0).toFixed(2)
  );
  const totalExpenses = Number(
    days.reduce((acc, d) => acc + d.expenses, 0).toFixed(2)
  );

  return {
    days,
    totalGrossRevenue,
    totalExpenses,
    totalNetResult: Number((totalGrossRevenue - totalExpenses).toFixed(2)),
  };
}

/**
 * Calcula o progresso da meta de faturamento diário, comparando o valor realizado
 * (comandas e vendas do dia) e a projeção de agendamentos confirmados com a meta estabelecida.
 */
export function calculateDailyRevenueGoalProgress(params: {
  dailyGoal: number;
  realizedRevenue: number;
  receivedRevenue: number;
  scheduledAdditionalRevenue: number;
}): {
  dailyGoal: number;
  realizedRevenue: number;
  receivedRevenue: number;
  projectedTotalRevenue: number;
  achievementPct: number;
  projectedPct: number;
  remainingToGoal: number;
  surplusAmount: number;
  goalReached: boolean;
  statusLabel: 'meta_atingida' | 'no_ritmo' | 'atencao';
} {
  const safeGoal = Math.max(1, Number(params.dailyGoal.toFixed(2)));
  const realized = Math.max(0, Number(params.realizedRevenue.toFixed(2)));
  const received = Math.max(0, Number(params.receivedRevenue.toFixed(2)));
  const projectedTotalRevenue = Number(
    (realized + Math.max(0, params.scheduledAdditionalRevenue)).toFixed(2)
  );

  const achievementPct = Number(((realized / safeGoal) * 100).toFixed(1));
  const projectedPct = Number(((projectedTotalRevenue / safeGoal) * 100).toFixed(1));
  const remainingToGoal = Math.max(0, Number((safeGoal - realized).toFixed(2)));
  const surplusAmount = Math.max(0, Number((realized - safeGoal).toFixed(2)));
  const goalReached = realized >= safeGoal;

  let statusLabel: 'meta_atingida' | 'no_ritmo' | 'atencao' = 'atencao';
  if (goalReached) {
    statusLabel = 'meta_atingida';
  } else if (projectedPct >= 95 || achievementPct >= 70) {
    statusLabel = 'no_ritmo';
  }

  return {
    dailyGoal: safeGoal,
    realizedRevenue: realized,
    receivedRevenue: received,
    projectedTotalRevenue,
    achievementPct,
    projectedPct,
    remainingToGoal,
    surplusAmount,
    goalReached,
    statusLabel,
  };
}


