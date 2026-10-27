import React, { useState } from 'react';
import { BarChart3, ArrowUpRight, Plus } from 'lucide-react';
import { Comanda, FinancialEntry, SalonTenant } from '../types/salon';
import { buildWeeklyRevenueVsExpenses } from '../utils/salonRules';

interface WeeklyRevenueExpensesChartProps {
  salon: SalonTenant;
  selectedUnitId: string;
  financialEntries: FinancialEntry[];
  comandas: Comanda[];
  onNavigateToFinancial: () => void;
}

export const WeeklyRevenueExpensesChart: React.FC<WeeklyRevenueExpensesChartProps> = ({
  salon,
  selectedUnitId,
  financialEntries,
  comandas,
  onNavigateToFinancial,
}) => {
  const report = buildWeeklyRevenueVsExpenses(
    salon.id,
    selectedUnitId,
    financialEntries,
    comandas
  );

  const [selectedDate, setSelectedDate] = useState<string>('2026-10-26');

  const maxDailyValue = Math.max(
    1000,
    ...report.days.map((d) => Math.max(d.grossRevenue, d.expenses))
  );

  const activeDay =
    report.days.find((d) => d.date === selectedDate) ||
    report.days[report.days.length - 1];

  const activeDayEntries = financialEntries.filter(
    (f) =>
      f.salonId === salon.id &&
      (selectedUnitId === 'todas' || f.unitId === selectedUnitId) &&
      f.status !== 'estornado' &&
      f.competenceDate === activeDay.date
  );

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatCompactBRL = (val: number) => {
    if (val >= 1000) {
      return `R$ ${(val / 1000).toFixed(1).replace('.', ',')}k`;
    }
    return `R$ ${val}`;
  };

  const marginPct =
    report.totalGrossRevenue > 0
      ? (((report.totalGrossRevenue - report.totalExpenses) / report.totalGrossRevenue) * 100).toFixed(1)
      : '0.0';

  return (
    <div
      data-testid="weekly-revenue-expenses-chart"
      className="bg-white rounded-2xl p-5 border border-stone-200/80 space-y-5"
    >
      {/* Cabeçalho do Componente de Visualização de Dados */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <BarChart3 className="w-3.5 h-3.5 stroke-[1.5] text-stone-700" />
            <span>Desempenho Semanal Consolidado (20/10 a 26/10)</span>
            <span aria-hidden="true">·</span>
            <span>Baseado em Comandas e Contas Registradas</span>
          </div>
          <h3 className="text-xl font-semibold text-stone-900 mt-0.5">
            Receita Bruta vs. Despesas por Dia (Últimos 7 Dias)
          </h3>
        </div>

        {/* Legenda e Ação */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span
              style={{ backgroundColor: salon.theme.primaryColor }}
              className="w-3 h-3 rounded-xs inline-block"
            />
            <span className="font-medium text-stone-700">Receita Bruta</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-rose-600/85 inline-block" />
            <span className="font-medium text-stone-700">Despesas</span>
          </div>
          <button
            type="button"
            onClick={onNavigateToFinancial}
            className="px-3 py-1.5 font-medium text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <span>Ver Razão Financeiro</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Síntese Quantitativa da Semana + Gráfico de Barras Interativo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Área do Gráfico de Barras (8 colunas) */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          <div
            role="region"
            aria-label="Gráfico de barras de receita bruta versus despesas nos últimos 7 dias"
            className="relative pt-6 pb-2 px-2 border-b border-stone-200/80 h-60 flex items-end justify-between gap-2 sm:gap-4"
          >
            {/* Linhas de grade horizontais sutis */}
            <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none">
              <div className="border-b border-dashed border-stone-200/70 w-full flex justify-end">
                <span className="text-[10px] font-mono-tabular text-stone-400 -mt-3.5 bg-white px-1">
                  {formatCompactBRL(maxDailyValue)}
                </span>
              </div>
              <div className="border-b border-dashed border-stone-200/70 w-full flex justify-end">
                <span className="text-[10px] font-mono-tabular text-stone-400 -mt-3.5 bg-white px-1">
                  {formatCompactBRL(Math.round(maxDailyValue * 0.5))}
                </span>
              </div>
              <div className="w-full" />
            </div>

            {report.days.map((day) => {
              const revHeightPct = Math.max(
                4,
                Math.min(100, Math.round((day.grossRevenue / maxDailyValue) * 100))
              );
              const expHeightPct =
                day.expenses > 0
                  ? Math.max(4, Math.min(100, Math.round((day.expenses / maxDailyValue) * 100)))
                  : 2;
              const isSelected = day.date === activeDay.date;

              return (
                <button
                  key={day.date}
                  type="button"
                  aria-label={`${day.weekday} ${day.shortLabel}: Receita Bruta ${formatBRL(
                    day.grossRevenue
                  )}, Despesas ${formatBRL(day.expenses)}`}
                  onClick={() => setSelectedDate(day.date)}
                  className={`relative z-10 flex-1 h-full flex flex-col justify-end items-center group rounded-xl px-1.5 pt-2 pb-1 transition-colors cursor-pointer ${
                    isSelected ? 'bg-stone-100/90 ring-1 ring-stone-300' : 'hover:bg-stone-50/80'
                  }`}
                >
                  {/* Valores no topo das barras */}
                  <div className="text-[10px] font-mono-tabular text-stone-600 mb-1.5 whitespace-nowrap">
                    {formatCompactBRL(day.grossRevenue)}
                  </div>

                  {/* Par de Barras: Receita Bruta vs Despesas */}
                  <div className="w-full max-w-[54px] h-36 flex items-end justify-center gap-1.5">
                    <div
                      style={{
                        height: `${revHeightPct}%`,
                        backgroundColor: salon.theme.primaryColor,
                      }}
                      title={`Receita Bruta (${day.shortLabel}): ${formatBRL(day.grossRevenue)}`}
                      className="w-1/2 rounded-t-md transition-all duration-200"
                    />
                    <div
                      style={{
                        height: `${expHeightPct}%`,
                      }}
                      title={`Despesas (${day.shortLabel}): ${formatBRL(day.expenses)}`}
                      className="w-1/2 rounded-t-md bg-rose-600/85 transition-all duration-200"
                    />
                  </div>

                  {/* Rótulo do Eixo X */}
                  <div className="mt-2 text-center">
                    <div
                      className={`text-xs font-medium leading-tight ${
                        isSelected ? 'text-stone-950 font-semibold' : 'text-stone-700'
                      }`}
                    >
                      {day.weekday}
                    </div>
                    <div className="text-[10px] font-mono-tabular text-stone-500">
                      {day.shortLabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Totais acumulados da semana abaixo do eixo X */}
          <div className="grid grid-cols-3 gap-3 pt-3 text-xs">
            <div>
              <span className="text-stone-500 block">Receita Bruta (7 Dias)</span>
              <span className="text-base font-semibold font-mono-tabular text-stone-900">
                {formatBRL(report.totalGrossRevenue)}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block">Despesas Totais (7 Dias)</span>
              <span className="text-base font-semibold font-mono-tabular text-rose-700">
                {formatBRL(report.totalExpenses)}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block">Resultado Líquido ({marginPct}%)</span>
              <span className="text-base font-semibold font-mono-tabular text-emerald-800">
                {formatBRL(report.totalNetResult)}
              </span>
            </div>
          </div>
        </div>

        {/* Painel de Detalhamento do Dia Selecionado no Gráfico (4 colunas) */}
        <div className="lg:col-span-4 bg-stone-50/80 rounded-xl p-4 border border-stone-200/80 flex flex-col justify-between space-y-3">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
              <span className="text-xs font-semibold text-stone-900">
                Detalhe: {activeDay.weekday}, {activeDay.shortLabel}/2026
              </span>
              <span className="text-[11px] font-mono-tabular text-stone-500">
                {activeDay.entriesCount} reg.
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-600">Receita Bruta do Dia:</span>
                <strong className="font-mono-tabular text-stone-900">
                  {formatBRL(activeDay.grossRevenue)}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-600">Despesas Competência:</span>
                <strong className="font-mono-tabular text-rose-700">
                  {formatBRL(activeDay.expenses)}
                </strong>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-stone-200/70">
                <span className="font-medium text-stone-800">Saldo Diário:</span>
                <strong
                  className={`font-mono-tabular ${
                    activeDay.netResult >= 0 ? 'text-emerald-800' : 'text-rose-700'
                  }`}
                >
                  {formatBRL(activeDay.netResult)}
                </strong>
              </div>
            </div>

            <div className="pt-2 space-y-1.5">
              <div className="text-[11px] font-medium text-stone-500">
                Registros Financeiros Vinculados ({activeDay.shortLabel}):
              </div>
              {activeDayEntries.length === 0 ? (
                <div className="text-xs text-stone-500">
                  Nenhum lançamento avulso registrado nesta data.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {activeDayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="text-[11px] flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-stone-200/70"
                    >
                      <span className="truncate text-stone-700">{entry.description}</span>
                      <span
                        className={`font-mono-tabular font-medium shrink-0 ${
                          entry.type === 'receber' ? 'text-emerald-800' : 'text-rose-700'
                        }`}
                      >
                        {entry.type === 'receber' ? '+' : '-'}
                        {formatBRL(entry.grossAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToFinancial}
            className="w-full py-2 px-3 text-xs font-medium text-stone-900 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lançar Receita ou Despesa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
