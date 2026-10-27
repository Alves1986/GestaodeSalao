import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Package,
  Plus,
  Scissors,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import {
  Appointment,
  CashSession,
  Comanda,
  CommissionRecord,
  FinancialEntry,
  ProductStock,
  Professional,
  SalonMenuId,
  SalonTenant,
  UserRole,
} from '../types/salon';
import {
  calculateCashSessionSummary,
  calculateComandaTotals,
  canViewFinancialIndicators,
} from '../utils/salonRules';
import { WeeklyRevenueExpensesChart } from './WeeklyRevenueExpensesChart';
import { DailyRevenueGoalCard } from './DailyRevenueGoalCard';

interface OperationDashboardProps {
  salon: SalonTenant;
  selectedUnitId: string;
  currentRole: UserRole;
  periodFilter: 'hoje' | '7dias' | 'mes';
  onPeriodFilterChange: (p: 'hoje' | '7dias' | 'mes') => void;
  appointments: Appointment[];
  comandas: Comanda[];
  professionals: Professional[];
  products: ProductStock[];
  cashSession: CashSession;
  commissions: CommissionRecord[];
  financialEntries: FinancialEntry[];
  onNavigate: (menu: SalonMenuId) => void;
  onOpenNewAppointmentModal: () => void;
  onOpenNewClientModal: () => void;
  onCheckInAppointment: (appointmentId: string) => void;
  onStartAttendance: (appointmentId: string) => void;
  onSelectComanda: (comandaId: string) => void;
  onOpenQuickExpenseModal: () => void;
  onUpdateDailyRevenueGoal: (newGoal: number) => void;
}

export const OperationDashboard: React.FC<OperationDashboardProps> = ({
  salon,
  selectedUnitId,
  currentRole,
  periodFilter,
  onPeriodFilterChange,
  appointments,
  comandas,
  professionals,
  products,
  cashSession,
  commissions,
  financialEntries,
  onNavigate,
  onOpenNewAppointmentModal,
  onOpenNewClientModal,
  onCheckInAppointment,
  onStartAttendance,
  onSelectComanda,
  onOpenQuickExpenseModal,
  onUpdateDailyRevenueGoal,
}) => {
  const unitAppointments = appointments.filter(
    (a) => a.salonId === salon.id && (selectedUnitId === 'todas' || a.unitId === selectedUnitId)
  );
  const unitComandas = comandas.filter(
    (c) => c.salonId === salon.id && (selectedUnitId === 'todas' || c.unitId === selectedUnitId)
  );
  const unitProfessionals = professionals.filter(
    (p) => p.salonId === salon.id && (selectedUnitId === 'todas' || p.unitId === selectedUnitId)
  );
  const lowStockProducts = products.filter(
    (p) => p.salonId === salon.id && p.currentStock <= p.minStock
  );

  // Operational metrics (Seção 4)
  const inChairNow = unitAppointments.filter((a) => a.status === 'em_atendimento');
  const waitingInReception = unitAppointments.filter(
    (a) => a.status === 'chegou' || a.status === 'em_espera'
  );
  const upcomingToday = unitAppointments.filter((a) => a.status === 'confirmado');
  const awaitingConfirmation = unitAppointments.filter(
    (a) => a.status === 'solicitado' || a.status === 'aguardando_sinal'
  );
  const completedToday = unitAppointments.filter((a) => a.status === 'concluido');
  const cancelledOrNoShow = unitAppointments.filter(
    (a) => a.status === 'cancelado' || a.status === 'nao_compareceu'
  );

  const busyProfIds = new Set(inChairNow.map((a) => a.professionalId));
  const availableProfessionals = unitProfessionals.filter((p) => p.active && !busyProfIds.has(p.id));

  // Financial metrics (Seção 4 - somente perfis autorizados)
  const showFinancial = canViewFinancialIndicators(currentRole);
  const periodMultiplier = periodFilter === 'hoje' ? 1 : periodFilter === '7dias' ? 5.8 : 22.4;

  const comandasWithTotals = unitComandas.map((c) => ({
    comanda: c,
    totals: calculateComandaTotals(c),
  }));

  const baseSalesToday = comandasWithTotals.reduce(
    (acc, item) => acc + item.totals.activeItemsTotal,
    0
  );
  const baseReceivedToday =
    comandasWithTotals.reduce(
      (acc, item) => acc + item.totals.totalPaid + item.totals.depositDeducted,
      0
    ) + 165; // + venda avulsa vitrine
  const basePendingToday = comandasWithTotals.reduce(
    (acc, item) => acc + item.totals.remainingBalance,
    0
  );

  const salesDisplayed = Math.round(baseSalesToday * periodMultiplier);
  const receivedDisplayed = Math.round(baseReceivedToday * periodMultiplier);
  const pendingDisplayed = Math.round(basePendingToday * (periodFilter === 'hoje' ? 1 : 1.5));

  const cashSummary = calculateCashSessionSummary(cashSession);
  const totalCommissionsGenerated = commissions
    .filter((c) => c.salonId === salon.id && c.status !== 'estornada')
    .reduce((acc, c) => acc + c.commissionAmount, 0);

  const paidExpensesToday = financialEntries
    .filter((f) => f.salonId === salon.id && f.type === 'pagar' && f.status === 'liquidado')
    .reduce((acc, f) => acc + f.paidAmount, 0);

  const avgTicket =
    unitComandas.length > 0 ? Math.round(baseSalesToday / unitComandas.length) : 0;

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const statusLabel: Record<string, string> = {
    solicitado: 'Solicitado',
    aguardando_sinal: 'Aguardando Sinal',
    confirmado: 'Confirmado',
    chegou: 'Na Recepção',
    em_espera: 'Em Espera',
    em_atendimento: 'Na Cadeira Agora',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
    nao_compareceu: 'Não Compareceu',
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da página com descrição contextual e filtro de período (Seção 2.1 e 4) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-stone-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
            <span>Operação em Tempo Real</span>
            <span aria-hidden="true">·</span>
            <span>{salon.commercialName}</span>
            <span aria-hidden="true">·</span>
            <span>
              {selectedUnitId === 'todas'
                ? 'Visão Consolidada Multi-Unidades'
                : salon.units.find((u) => u.id === selectedUnitId)?.name}
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-stone-900">
            Painel de Operação
          </h1>
          <p className="text-sm text-stone-600 mt-1 max-w-2xl">
            {salon.theme.institutionalMessage}
          </p>
        </div>

        {/* Filtro de período no topo */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Filtro de período"
            className="flex items-center gap-1 bg-stone-200/70 p-1 rounded-xl"
          >
            <button
              type="button"
              onClick={() => onPeriodFilterChange('hoje')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                periodFilter === 'hoje'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Hoje · 26 Out
            </button>
            <button
              type="button"
              onClick={() => onPeriodFilterChange('7dias')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                periodFilter === '7dias'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Últimos 7 Dias
            </button>
            <button
              type="button"
              onClick={() => onPeriodFilterChange('mes')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                periodFilter === 'mes'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Outubro 2026
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenNewAppointmentModal}
            style={{ backgroundColor: salon.theme.primaryColor }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white rounded-xl hover:opacity-95 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[1.75]" />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* Bloco 1: Indicadores Operacionais em Cartões (Seção 4) */}
      <section aria-label="Indicadores Operacionais">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-stone-900">
            Fluxo de Atendimento Hoje
          </h2>
          <div className="text-xs text-stone-500 tabular-nums">
            <span>{unitProfessionals.length} profissionais escalados</span>
            <span aria-hidden="true"> · </span>
            <span>{availableProfessionals.length} livres agora</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80">
            <div className="flex items-center justify-between text-stone-500 text-xs mb-2">
              <span>Previstos Hoje</span>
              <Calendar className="w-4 h-4 stroke-[1.5] text-stone-400" />
            </div>
            <div className="text-2xl font-semibold text-stone-900 font-mono-tabular">
              {unitAppointments.length}
            </div>
            <div className="text-xs text-stone-500 mt-1">
              <span>{upcomingToday.length} ainda vão chegar</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200/80">
            <div className="flex items-center justify-between text-stone-500 text-xs mb-2">
              <span>Na Cadeira Agora</span>
              <Scissors className="w-4 h-4 stroke-[1.5] text-emerald-700" />
            </div>
            <div className="text-2xl font-semibold text-emerald-900 font-mono-tabular">
              {inChairNow.length}
            </div>
            <div className="text-xs text-emerald-700 mt-1">
              <span>Em execução ativa</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200/80">
            <div className="flex items-center justify-between text-stone-500 text-xs mb-2">
              <span>Na Recepção / Fila</span>
              <UserCheck className="w-4 h-4 stroke-[1.5] text-amber-700" />
            </div>
            <div className="text-2xl font-semibold text-stone-900 font-mono-tabular">
              {waitingInReception.length}
            </div>
            <div className="text-xs text-amber-700 mt-1">
              <span>Check-in realizado</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200/80">
            <div className="flex items-center justify-between text-stone-500 text-xs mb-2">
              <span>Aguard. Sinal/Conf.</span>
              <Clock className="w-4 h-4 stroke-[1.5] text-stone-400" />
            </div>
            <div className="text-2xl font-semibold text-stone-900 font-mono-tabular">
              {awaitingConfirmation.length}
            </div>
            <div className="text-xs text-stone-500 mt-1">
              <span>Reserva condicional</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200/80">
            <div className="flex items-center justify-between text-stone-500 text-xs mb-2">
              <span>Concluídos</span>
              <CheckCircle2 className="w-4 h-4 stroke-[1.5] text-stone-400" />
            </div>
            <div className="text-2xl font-semibold text-stone-900 font-mono-tabular">
              {completedToday.length}
            </div>
            <div className="text-xs text-stone-500 mt-1">
              <span>{cancelledOrNoShow.length} faltas / cancel.</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200/80">
            <div className="flex items-center justify-between text-stone-500 text-xs mb-2">
              <span>Vagas / Equipe Livre</span>
              <Users className="w-4 h-4 stroke-[1.5] text-stone-400" />
            </div>
            <div className="text-2xl font-semibold text-stone-900 font-mono-tabular">
              14h
            </div>
            <div className="text-xs text-stone-500 mt-1">
              <span>{availableProfessionals.length} prof. disponíveis</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bloco 2: Indicadores Financeiros (Visíveis somente para perfis autorizados - Seção 4) */}
      {showFinancial ? (
        <section aria-label="Indicadores Financeiros">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-stone-900">
              Síntese Financeira & Caixa ({periodFilter === 'hoje' ? 'Hoje' : periodFilter === '7dias' ? '7 Dias' : 'Outubro'})
            </h2>
            <div className="text-xs text-stone-500">
              <span>Separação estrita entre venda, recebimento efetivo e saldo físico em espécie</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card destaque na cor principal do salão (Referência visual Seção 2.1) */}
            <div
              style={{ backgroundColor: salon.theme.primaryColor }}
              className="rounded-2xl p-5 text-white flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-white/80 text-xs">
                <span>Vendas Registradas (Comandas)</span>
                <TrendingUp className="w-4 h-4 stroke-[1.5]" style={{ color: salon.theme.accentColor }} />
              </div>
              <div className="my-3">
                <div className="text-2xl lg:text-3xl font-semibold font-mono-tabular">
                  {formatBRL(salesDisplayed)}
                </div>
                <div className="text-xs text-white/80 mt-1 flex items-center gap-1.5">
                  <span style={{ color: salon.theme.accentColor }} className="font-semibold">
                    +14,2%
                  </span>
                  <span>vs. período anterior · Ticket médio {formatBRL(avgTicket)}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs text-white/85">
                <span>Comissões geradas</span>
                <span className="font-mono-tabular font-medium">
                  {formatBRL(totalCommissionsGenerated * (periodFilter === 'hoje' ? 1 : 5))}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-stone-500 text-xs">
                <span>Efetivamente Recebido</span>
                <CreditCard className="w-4 h-4 stroke-[1.5] text-emerald-700" />
              </div>
              <div className="my-3">
                <div className="text-2xl font-semibold text-stone-900 font-mono-tabular">
                  {formatBRL(receivedDisplayed)}
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  <span>Pix, cartões, sinais abatidos e espécie</span>
                </div>
              </div>
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500">Digital (Pix/Cartão hoje)</span>
                <span className="font-mono-tabular font-medium text-stone-800">
                  {formatBRL(cashSummary.digitalReceiptsTotal)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-stone-500 text-xs">
                <span>Valores Pendentes (Em Aberto)</span>
                <FileText className="w-4 h-4 stroke-[1.5] text-amber-700" />
              </div>
              <div className="my-3">
                <div className="text-2xl font-semibold text-amber-800 font-mono-tabular">
                  {formatBRL(pendingDisplayed)}
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  <span>Comandas em atendimento ou aguard. caixa</span>
                </div>
              </div>
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500">Comandas abertas agora</span>
                <button
                  type="button"
                  onClick={() => onNavigate('comandas')}
                  className="font-medium text-stone-900 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{unitComandas.filter((c) => c.paymentStatus !== 'pago').length} comandas</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-stone-500 text-xs">
                <span>Saldo Físico da Gaveta (Espécie)</span>
                <Wallet className="w-4 h-4 stroke-[1.5] text-stone-700" />
              </div>
              <div className="my-3">
                <div className="text-2xl font-semibold text-stone-900 font-mono-tabular">
                  {formatBRL(cashSummary.expectedPhysicalCash)}
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  <span>Abertura {formatBRL(cashSession.openingBalanceCash)} · Gaveta separada de Pix</span>
                </div>
              </div>
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500">Despesas pagas no período</span>
                <span className="font-mono-tabular font-medium text-rose-700">
                  {formatBRL(paidExpensesToday)}
                </span>
              </div>
            </div>
          </div>

          {/* Componente de Meta de Faturamento Diário (Realizado vs. Meta Estabelecida) */}
          <div className="mt-4">
            <DailyRevenueGoalCard
              salon={salon}
              realizedRevenue={baseSalesToday}
              receivedRevenue={baseReceivedToday}
              scheduledAdditionalRevenue={unitAppointments
                .filter(
                  (a) =>
                    !a.comandaId &&
                    a.status !== 'cancelado' &&
                    a.status !== 'nao_compareceu' &&
                    a.status !== 'concluido'
                )
                .reduce((acc, a) => acc + a.estimatedPrice, 0)}
              avgTicket={avgTicket}
              onUpdateDailyGoal={onUpdateDailyRevenueGoal}
            />
          </div>

          {/* Gráfico de Barras: Receita Bruta vs. Despesas ao longo da última semana */}
          <div className="mt-4">
            <WeeklyRevenueExpensesChart
              salon={salon}
              selectedUnitId={selectedUnitId}
              financialEntries={financialEntries}
              comandas={comandas}
              onNavigateToFinancial={() => onNavigate('financeiro')}
            />
          </div>
        </section>
      ) : (
        <div className="bg-stone-100/80 border border-stone-200/80 rounded-xl px-4 py-3 text-xs text-stone-600 flex items-center justify-between">
          <span>
            Perfil atual (<strong>{currentRole.toUpperCase()}</strong>): Indicadores estratégicos de faturamento e DRE estão ocultos conforme matriz de permissões (Seção 4 e 18).
          </span>
          <span className="text-stone-500">Visão Operacional Ativa</span>
        </div>
      )}

      {/* Bloco 3: Ações Rápidas (Seção 4) */}
      <section aria-label="Ações Rápidas" className="bg-white rounded-2xl p-4 border border-stone-200/80">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-stone-900">Ações Rápidas de Recepção & Caixa</h2>
          <span className="text-xs text-stone-500">Atalhos diretos sem sair do painel</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2.5">
          <button
            type="button"
            onClick={onOpenNewAppointmentModal}
            className="flex flex-col items-start gap-1.5 p-2.5 rounded-xl border border-stone-200/80 hover:border-stone-400 hover:bg-stone-50/70 transition-colors text-left cursor-pointer"
          >
            <Calendar className="w-4 h-4 stroke-[1.5] text-stone-700" />
            <span className="text-[11px] font-medium text-stone-900 truncate w-full">Novo Agendamento</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewClientModal}
            className="flex flex-col items-start gap-1.5 p-2.5 rounded-xl border border-stone-200/80 hover:border-stone-400 hover:bg-stone-50/70 transition-colors text-left cursor-pointer"
          >
            <UserPlus className="w-4 h-4 stroke-[1.5] text-stone-700" />
            <span className="text-[11px] font-medium text-stone-900 truncate w-full">Cadastrar Cliente</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('recepcao')}
            className="flex flex-col items-start gap-1.5 p-2.5 rounded-xl border border-stone-200/80 hover:border-stone-400 hover:bg-stone-50/70 transition-colors text-left cursor-pointer"
          >
            <UserCheck className="w-4 h-4 stroke-[1.5] text-stone-700" />
            <span className="text-[11px] font-medium text-stone-900 truncate w-full">Fazer Check-in</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('comandas')}
            className="flex flex-col items-start gap-1.5 p-2.5 rounded-xl border border-stone-200/80 hover:border-stone-400 hover:bg-stone-50/70 transition-colors text-left cursor-pointer"
          >
            <FileText className="w-4 h-4 stroke-[1.5] text-stone-700" />
            <span className="text-[11px] font-medium text-stone-900 truncate w-full">Abrir Comanda</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const pending = unitComandas.find((c) => c.paymentStatus !== 'pago');
              if (pending) {
                onSelectComanda(pending.id);
              } else {
                onNavigate('comandas');
              }
            }}
            className="flex flex-col items-start gap-1.5 p-2.5 rounded-xl border border-stone-200/80 hover:border-stone-400 hover:bg-stone-50/70 transition-colors text-left cursor-pointer"
          >
            <CreditCard className="w-4 h-4 stroke-[1.5] text-stone-700" />
            <span className="text-[11px] font-medium text-stone-900 truncate w-full">Receber Comanda</span>
          </button>

          <button
            type="button"
            onClick={onOpenQuickExpenseModal}
            className="flex flex-col items-start gap-1.5 p-2.5 rounded-xl border border-stone-200/80 hover:border-stone-400 hover:bg-stone-50/70 transition-colors text-left cursor-pointer"
          >
            <Wallet className="w-4 h-4 stroke-[1.5] text-stone-700" />
            <span className="text-[11px] font-medium text-stone-900 truncate w-full">Registrar Despesa</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('agenda')}
            className="flex flex-col items-start gap-1.5 p-2.5 rounded-xl border border-stone-200/80 hover:border-stone-400 hover:bg-stone-50/70 transition-colors text-left cursor-pointer"
          >
            <Users className="w-4 h-4 stroke-[1.5] text-stone-700" />
            <span className="text-[11px] font-medium text-stone-900 truncate w-full">Agenda da Equipe</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('financeiro')}
            className="flex flex-col items-start gap-1.5 p-2.5 rounded-xl border border-stone-200/80 hover:border-stone-400 hover:bg-stone-50/70 transition-colors text-left cursor-pointer"
          >
            <Sparkles className="w-4 h-4 stroke-[1.5] text-stone-700" />
            <span className="text-[11px] font-medium text-stone-900 truncate w-full">Conferir Caixa</span>
          </button>
        </div>
      </section>

      {/* Bloco 4: Painéis de Atendimentos em Andamento ("Na cadeira agora") e Próximos Clientes (Seção 2.1 e 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda (7 cols): Na Cadeira Agora + Comandas Aguardando Pagamento */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-stone-200/80">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-stone-900">
                  Atendimentos em Andamento (Na Cadeira Agora)
                </h2>
                <p className="text-xs text-stone-500">
                  Acompanhamento de tempo de execução, pausa técnica e consumo vinculado à comanda
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('comandas')}
                className="text-xs font-medium text-stone-700 hover:text-stone-900 underline cursor-pointer whitespace-nowrap"
              >
                Ver Comandas
              </button>
            </div>

            {inChairNow.length === 0 ? (
              <div className="py-8 text-center text-sm text-stone-500">
                Nenhum cliente em atendimento neste instante. Inicie um atendimento a partir da fila de recepção.
              </div>
            ) : (
              <div className="divide-y divide-stone-200/70">
                {inChairNow.map((appt) => {
                  const linkedComanda = unitComandas.find((c) => c.id === appt.comandaId);
                  return (
                    <div key={appt.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                          <span className="font-mono-tabular font-medium text-stone-800">
                            {appt.startTime} – {appt.endTime}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{appt.chairOrRoom}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-800 font-medium">
                            Iniciado às {appt.serviceStartTime || appt.startTime}
                          </span>
                        </div>
                        <div className="text-base font-semibold text-stone-900">
                          {appt.clientName}
                        </div>
                        <div className="text-xs text-stone-600">
                          <span>{appt.serviceName}</span>
                          <span aria-hidden="true"> · </span>
                          <span>Profissional: <strong>{appt.professionalName}</strong></span>
                        </div>
                        {appt.notes && (
                          <p className="text-xs text-stone-500 italic">{appt.notes}</p>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-semibold font-mono-tabular text-stone-900">
                            {formatBRL(appt.estimatedPrice)}
                          </div>
                          <div className="text-xs text-stone-500">
                            {appt.depositPaid > 0
                              ? `Sinal pago: ${formatBRL(appt.depositPaid)}`
                              : 'Sem sinal prévio'}
                          </div>
                        </div>

                        {linkedComanda && (
                          <button
                            type="button"
                            onClick={() => onSelectComanda(linkedComanda.id)}
                            className="px-3 py-1.5 text-xs font-medium text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                          >
                            Abrir Comanda #{linkedComanda.number}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comandas aguardando fechamento / pagamento */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200/80">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-stone-900">
                  Comandas Aguardando Fechamento e Pagamento
                </h2>
                <p className="text-xs text-stone-500">
                  Regra 4: O atendimento concluído mantém a dívida aberta até a liquidação efetiva no caixa
                </p>
              </div>
            </div>

            <div className="divide-y divide-stone-200/70">
              {comandasWithTotals
                .filter((x) => x.totals.paymentStatus !== 'pago')
                .map(({ comanda, totals }) => (
                  <div
                    key={comanda.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <span className="font-mono-tabular font-semibold text-stone-900">
                          Comanda #{comanda.number}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Atendimento:{' '}
                          {comanda.attendanceStatus === 'concluido'
                            ? 'Concluído (Pronto p/ Pagar)'
                            : 'Em Execução'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Pagamento: {totals.paymentStatus.toUpperCase()}</span>
                      </div>
                      <div className="text-sm font-semibold text-stone-900 mt-0.5">
                        {comanda.clientName}
                      </div>
                      <div className="text-xs text-stone-500">
                        {comanda.items.filter((i) => !i.cancelled).length} itens · Bruto{' '}
                        {formatBRL(totals.activeItemsTotal)}
                        {totals.depositDeducted > 0 &&
                          ` · Sinal abatido (-${formatBRL(totals.depositDeducted)})`}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-stone-500">Saldo a Pagar</div>
                        <div className="text-base font-semibold font-mono-tabular text-stone-900">
                          {formatBRL(totals.remainingBalance)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectComanda(comanda.id)}
                        style={{ backgroundColor: salon.theme.primaryColor }}
                        className="px-3.5 py-2 text-xs font-medium text-white rounded-xl hover:opacity-95 transition-opacity whitespace-nowrap cursor-pointer"
                      >
                        Conferir & Receber
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Coluna Direita (5 cols): Recepção/Espera + Próximos Clientes + Alertas Operacionais */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-stone-200/80">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-stone-900">
                  Recepção & Próximos Clientes
                </h2>
                <p className="text-xs text-stone-500">
                  Clientes aguardando chamada e horários confirmados para as próximas horas
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('agenda')}
                className="text-xs font-medium text-stone-700 hover:text-stone-900 underline cursor-pointer whitespace-nowrap"
              >
                Agenda Completa
              </button>
            </div>

            <div className="divide-y divide-stone-200/70">
              {[...waitingInReception, ...upcomingToday, ...awaitingConfirmation].map((appt) => (
                <div key={appt.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <span className="font-mono-tabular font-semibold text-stone-900">
                        {appt.startTime}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{statusLabel[appt.status] || appt.status}</span>
                      <span aria-hidden="true">·</span>
                      <span>{appt.origin}</span>
                    </div>
                    <div className="text-sm font-semibold text-stone-900">{appt.clientName}</div>
                    <div className="text-xs text-stone-600">
                      {appt.serviceName} · {appt.professionalName}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {appt.status === 'chegou' || appt.status === 'em_espera' ? (
                      <button
                        type="button"
                        onClick={() => onStartAttendance(appt.id)}
                        style={{ backgroundColor: salon.theme.primaryColor }}
                        className="px-3 py-1.5 text-xs font-medium text-white rounded-lg hover:opacity-95 transition-opacity whitespace-nowrap cursor-pointer"
                      >
                        Iniciar Atendimento
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onCheckInAppointment(appt.id)}
                        className="px-3 py-1.5 text-xs font-medium text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Fazer Check-in
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alertas de Estoque, Sinal e Pendências (Seção 4) */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-900">
                Alertas de Estoque & Operação
              </h2>
              <Package className="w-4 h-4 stroke-[1.5] text-amber-700" />
            </div>

            <div className="divide-y divide-stone-200/70 text-xs">
              {lowStockProducts.map((prod) => (
                <div key={prod.id} className="py-2.5 first:pt-0 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-stone-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{prod.name}</span>
                    </div>
                    <div className="text-stone-500 mt-0.5 font-mono-tabular">
                      Saldo atual: {prod.currentStock}{prod.unit} (Mínimo: {prod.minStock}{prod.unit}) · Lote {prod.batchNumber}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('compras')}
                    className="px-2.5 py-1 text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg whitespace-nowrap cursor-pointer"
                  >
                    Repor Item
                  </button>
                </div>
              ))}

              {awaitingConfirmation.map((appt) => (
                <div key={appt.id} className="py-2.5 last:pb-0 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-stone-900">
                      Sinal Pendente · {appt.clientName} ({appt.startTime})
                    </div>
                    <div className="text-stone-500 mt-0.5">
                      {appt.serviceName} · Reserva expira se não confirmada
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCheckInAppointment(appt.id)}
                    className="px-2.5 py-1 text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg whitespace-nowrap cursor-pointer"
                  >
                    Confirmar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
