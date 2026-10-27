import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasScheduleConflict,
  calculateComandaTotals,
  calculateItemCommission,
  redeemPackageSession,
  calculateCashSessionSummary,
  getContrastRatio,
  getAllowedMenusForRole,
  canViewFinancialIndicators,
  buildWeeklyRevenueVsExpenses,
  calculateDailyRevenueGoalProgress,
} from './salonRules';
import { Appointment, CashSession, ClientPackage, Comanda, FinancialEntry } from '../types/salon';

test('Regra 1: impede conflito de horário para o mesmo profissional no mesmo salão', () => {
  const existing: Appointment[] = [
    {
      id: 'ag-1',
      salonId: 'salon-1',
      unitId: 'unit-1',
      clientId: 'cli-1',
      clientName: 'Camila Vasconcelos',
      clientPhone: '11999990000',
      serviceId: 'srv-1',
      serviceName: 'Mechas Contour',
      professionalId: 'prof-1',
      professionalName: 'Valentina Moretti',
      chairOrRoom: 'Cadeira 01',
      date: '2026-10-27',
      startTime: '14:00',
      endTime: '15:30',
      durationMinutes: 90,
      status: 'confirmado',
      paymentStatus: 'pendente',
      estimatedPrice: 680,
      depositPaid: 150,
      depositDeductedInComanda: false,
      origin: 'Online',
      notes: '',
    },
  ];

  // Sobreposição 14:30 - 15:15 -> conflito
  const overlap = hasScheduleConflict(existing, {
    salonId: 'salon-1',
    professionalId: 'prof-1',
    date: '2026-10-27',
    startTime: '14:30',
    durationMinutes: 45,
  });
  assert.equal(overlap.conflict, true);

  // Horário livre 15:30 - 16:30 -> sem conflito
  const free = hasScheduleConflict(existing, {
    salonId: 'salon-1',
    professionalId: 'prof-1',
    date: '2026-10-27',
    startTime: '15:30',
    durationMinutes: 60,
  });
  assert.equal(free.conflict, false);

  // Encaixe autorizado -> sem bloqueio
  const fitIn = hasScheduleConflict(existing, {
    salonId: 'salon-1',
    professionalId: 'prof-1',
    date: '2026-10-27',
    startTime: '14:30',
    durationMinutes: 45,
    allowAuthorizedFitIn: true,
  });
  assert.equal(fitIn.conflict, false);
});

test('Regras 2, 3 e 4: comanda abate sinal uma única vez, deduplica externalTxId e separa atendimento de pagamento', () => {
  const comanda: Comanda = {
    id: 'cmd-101',
    number: 101,
    salonId: 'salon-1',
    unitId: 'unit-1',
    clientId: 'cli-1',
    clientName: 'Camila Vasconcelos',
    openedAt: '14:05',
    attendanceStatus: 'concluido',
    comandaStatus: 'fechada_pendente',
    paymentStatus: 'pendente',
    depositAlreadyPaid: 100,
    depositApplied: true,
    globalDiscount: 20,
    tipAmount: 30,
    nfseStatus: 'nao_solicitada',
    items: [
      {
        id: 'it-1',
        type: 'servico',
        referenceId: 'srv-1',
        name: 'Coloração & Gloss',
        professionalId: 'prof-1',
        professionalName: 'Valentina Moretti',
        quantity: 1,
        unitPrice: 400,
        discount: 0,
        commissionPct: 45,
        cancelled: false,
      },
      {
        id: 'it-2',
        type: 'produto',
        referenceId: 'prd-1',
        name: 'Óleo Reparador Lumière 50ml',
        professionalId: 'prof-1',
        professionalName: 'Valentina Moretti',
        quantity: 1,
        unitPrice: 150,
        discount: 10,
        commissionPct: 15,
        cancelled: false,
      },
    ],
    payments: [
      {
        id: 'pay-1',
        method: 'pix',
        amount: 200,
        installments: 1,
        payerLabel: 'Camila',
        paidAt: '16:00',
        operatorFeePct: 0.99,
        netAmount: 198.02,
        externalTxId: 'tx-pix-999',
      },
      {
        // Webhook duplicado com o mesmo externalTxId (Regra 3)
        id: 'pay-1-dup',
        method: 'pix',
        amount: 200,
        installments: 1,
        payerLabel: 'Camila',
        paidAt: '16:00',
        operatorFeePct: 0.99,
        netAmount: 198.02,
        externalTxId: 'tx-pix-999',
      },
    ],
  };

  const totals = calculateComandaTotals(comanda);
  // 400 + 150 = 550; descontos: 10 (item) + 20 (global) = 30; sinal: 100; gorjeta: +30 -> líquido a pagar = 450
  assert.equal(totals.activeItemsTotal, 550);
  assert.equal(totals.depositDeducted, 100);
  assert.equal(totals.netPayable, 450);
  // Pagamento duplicado ignorado -> totalPaid = 200
  assert.equal(totals.totalPaid, 200);
  assert.equal(totals.remainingBalance, 250);
  // Mesmo com attendanceStatus = concluido, paymentStatus continua parcial (Regra 4)
  assert.equal(totals.paymentStatus, 'parcial');
});

test('Regra 5: uso de sessão de pacote não gera nova receita financeira duplicada', () => {
  const pkg: ClientPackage = {
    id: 'pkg-1',
    salonId: 'salon-1',
    clientId: 'cli-1',
    clientName: 'Beatriz Alencar',
    packageName: 'Ritual Cronograma Capilar (4 sessões)',
    serviceId: 'srv-2',
    serviceName: 'Nutrição Profunda',
    totalSessions: 4,
    usedSessions: 2,
    totalPricePaid: 960,
    purchaseDate: '2026-09-10',
    validUntil: '2027-03-10',
    commissionRule: 'na_execucao',
    status: 'ativo',
  };

  const result = redeemPackageSession(pkg);
  assert.equal(result.canRedeem, true);
  assert.equal(result.financialRevenueGenerated, 0);
  assert.equal(result.updatedPackage.usedSessions, 3);
  assert.equal(result.updatedPackage.status, 'ativo');
});

test('Seção 11.1 e 12: separa saldo físico em dinheiro de Pix/cartão e divide comissão executor/auxiliar', () => {
  const cashSession: CashSession = {
    id: 'cx-1',
    salonId: 'salon-1',
    unitId: 'unit-1',
    openedAt: '08:30',
    operatorName: 'Helena (Caixa)',
    status: 'aberto',
    openingBalanceCash: 300,
    informedClosingCash: 470,
    movements: [
      {
        id: 'm1',
        type: 'entrada_venda',
        paymentMethod: 'dinheiro',
        description: 'Comanda #102',
        amount: 220,
        timestamp: '10:15',
        operatorName: 'Helena',
      },
      {
        id: 'm2',
        type: 'entrada_venda',
        paymentMethod: 'pix',
        description: 'Comanda #103',
        amount: 680,
        timestamp: '11:30',
        operatorName: 'Helena',
      },
      {
        id: 'm3',
        type: 'sangria',
        paymentMethod: 'dinheiro_fisico',
        description: 'Depósito cofre',
        amount: 50,
        timestamp: '13:00',
        operatorName: 'Helena',
      },
    ],
  };

  const summary = calculateCashSessionSummary(cashSession);
  assert.equal(summary.expectedPhysicalCash, 470); // 300 + 220 - 50
  assert.equal(summary.digitalReceiptsTotal, 680);
  assert.equal(summary.cashDivergence, 0);

  const comm = calculateItemCommission(
    {
      id: 'it-9',
      type: 'servico',
      referenceId: 'srv-1',
      name: 'Mechas',
      professionalId: 'prof-1',
      professionalName: 'Valentina',
      assistantProfessionalId: 'prof-4',
      quantity: 1,
      unitPrice: 500,
      discount: 0,
      commissionPct: 40, // 200 total commission
      cancelled: false,
    },
    20, // 20% da comissão para auxiliar = 40
    'recebimento',
    true,
    false // ainda não pago -> prevista
  );
  assert.equal(comm.executorAmount, 160);
  assert.equal(comm.assistantAmount, 40);
  assert.equal(comm.status, 'prevista');
});

test('Seção 2.2 e 18: validação de contraste WCAG e permissões de perfil', () => {
  const ratio = getContrastRatio('#143328', '#FAF8F5');
  assert.ok(ratio >= 10, `Contraste esperado >= 10, obtido ${ratio}`);

  assert.equal(canViewFinancialIndicators('recepcao'), false);
  assert.equal(canViewFinancialIndicators('proprietario'), true);
  assert.ok(!getAllowedMenusForRole('recepcao').includes('configuracoes'));
});

test('Gráfico Semanal: agrega receita bruta vs despesas por dia nos últimos 7 dias sem duplicar comandas', () => {
  const entries: FinancialEntry[] = [
    {
      id: 'f-1',
      salonId: 'salon-1',
      unitId: 'unit-1',
      type: 'receber',
      category: 'Comanda / Serviço',
      description: 'Serviços Terça',
      entityName: 'Clientes Diversos',
      dueDate: '2026-10-20',
      competenceDate: '2026-10-20',
      grossAmount: 3200,
      feeAmount: 50,
      netAmount: 3150,
      paidAmount: 3200,
      status: 'liquidado',
      paymentMethod: 'pix',
    },
    {
      id: 'f-2',
      salonId: 'salon-1',
      unitId: 'unit-1',
      type: 'pagar',
      category: 'Fornecedores',
      description: 'Insumos Terça',
      entityName: 'Fornecedor A',
      dueDate: '2026-10-20',
      competenceDate: '2026-10-20',
      grossAmount: 1100,
      feeAmount: 0,
      netAmount: 1100,
      paidAmount: 1100,
      status: 'liquidado',
      paymentMethod: 'pix',
    },
  ];

  const report = buildWeeklyRevenueVsExpenses('salon-1', 'todas', entries, []);
  assert.equal(report.days.length, 7);
  const tuesday = report.days.find((d) => d.date === '2026-10-20');
  assert.ok(tuesday);
  assert.equal(tuesday.grossRevenue, 3200);
  assert.equal(tuesday.expenses, 1100);
  assert.equal(tuesday.netResult, 2100);
});

test('Meta de Faturamento Diário: calcula realizado vs meta, saldo faltante, superávit e projeção com agenda', () => {
  const inProgress = calculateDailyRevenueGoalProgress({
    dailyGoal: 2500,
    realizedRevenue: 1830,
    receivedRevenue: 785,
    scheduledAdditionalRevenue: 895,
  });

  assert.equal(inProgress.achievementPct, 73.2);
  assert.equal(inProgress.remainingToGoal, 670);
  assert.equal(inProgress.surplusAmount, 0);
  assert.equal(inProgress.projectedTotalRevenue, 2725);
  assert.equal(inProgress.goalReached, false);
  assert.equal(inProgress.statusLabel, 'no_ritmo');

  const exceeded = calculateDailyRevenueGoalProgress({
    dailyGoal: 1500,
    realizedRevenue: 1830,
    receivedRevenue: 1500,
    scheduledAdditionalRevenue: 320,
  });

  assert.equal(exceeded.goalReached, true);
  assert.equal(exceeded.surplusAmount, 330);
  assert.equal(exceeded.remainingToGoal, 0);
  assert.equal(exceeded.statusLabel, 'meta_atingida');
});


