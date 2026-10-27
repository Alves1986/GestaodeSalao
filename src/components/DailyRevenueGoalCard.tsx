import React, { useEffect, useState } from 'react';
import { CheckCircle2, Edit3, Target, TrendingUp } from 'lucide-react';
import { SalonTenant } from '../types/salon';
import { calculateDailyRevenueGoalProgress } from '../utils/salonRules';

interface DailyRevenueGoalCardProps {
  salon: SalonTenant;
  realizedRevenue: number;
  receivedRevenue: number;
  scheduledAdditionalRevenue: number;
  avgTicket: number;
  onUpdateDailyGoal: (newGoal: number) => void;
}

export const DailyRevenueGoalCard: React.FC<DailyRevenueGoalCardProps> = ({
  salon,
  realizedRevenue,
  receivedRevenue,
  scheduledAdditionalRevenue,
  avgTicket,
  onUpdateDailyGoal,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [goalInput, setGoalInput] = useState(String(salon.dailyRevenueGoal));
  const [validationError, setValidationError] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    setGoalInput(String(salon.dailyRevenueGoal));
  }, [salon.dailyRevenueGoal]);

  const progress = calculateDailyRevenueGoalProgress({
    dailyGoal: salon.dailyRevenueGoal,
    realizedRevenue,
    receivedRevenue,
    scheduledAdditionalRevenue,
  });

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(goalInput);
    if (!goalInput.trim() || Number.isNaN(parsed) || parsed < 100) {
      setValidationError('Informe uma meta diária válida (mínimo R$ 100,00).');
      return;
    }
    setValidationError('');
    onUpdateDailyGoal(Math.round(parsed));
    setIsEditing(false);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  const applyPresetGoal = (preset: number) => {
    setValidationError('');
    setGoalInput(String(preset));
    onUpdateDailyGoal(preset);
    setIsEditing(false);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  const realizedWidthPct = Math.min(100, Math.max(2, progress.achievementPct));
  const projectedWidthPct = Math.min(100, Math.max(realizedWidthPct, progress.projectedPct));

  const remainingAttendancesEstimate =
    avgTicket > 0 && progress.remainingToGoal > 0
      ? Math.ceil(progress.remainingToGoal / avgTicket)
      : 0;

  return (
    <div
      data-testid="daily-revenue-goal-card"
      className="bg-white rounded-2xl p-5 border border-stone-200/80 space-y-4"
    >
      {/* Cabeçalho e Ação de Definir Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Target className="w-3.5 h-3.5 stroke-[1.5] text-stone-700" />
            <span>Acompanhamento de Meta Diária do Proprietário</span>
            <span aria-hidden="true">·</span>
            <span>
              {progress.statusLabel === 'meta_atingida'
                ? 'Meta do Dia Superada'
                : progress.statusLabel === 'no_ritmo'
                ? 'Ritmo Forte (Projeção Acima da Meta)'
                : 'Atenção ao Ritmo do Dia'}
            </span>
          </div>
          <h3 className="text-xl font-semibold text-stone-900 mt-0.5">
            Meta de Faturamento Diário (Realizado vs. Meta Estabelecida)
          </h3>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {savedFeedback && (
            <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Meta atualizada</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setValidationError('');
              setGoalInput(String(salon.dailyRevenueGoal));
              setIsEditing(!isEditing);
            }}
            className="px-3.5 py-1.5 text-xs font-medium text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Edit3 className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>{isEditing ? 'Cancelar Edição' : 'Definir Meta Diária'}</span>
          </button>
        </div>
      </div>

      {/* Formulário Inline para Definir / Ajustar a Meta de Faturamento Diário */}
      {isEditing && (
        <form
          onSubmit={handleSaveGoal}
          className="p-4 rounded-xl bg-stone-50 border border-stone-200/90 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="flex-1 max-w-xs">
              <label
                htmlFor="daily-goal-input"
                className="block text-xs font-medium text-stone-700 mb-1"
              >
                Nova Meta de Faturamento Diário (R$)
              </label>
              <input
                id="daily-goal-input"
                type="number"
                step="50"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="Ex: 3000"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono-tabular text-stone-900 bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-stone-500 mr-1">Metas rápidas:</span>
              {[1500, 2500, 3500, 5000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPresetGoal(preset)}
                  className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-800 font-mono-tabular cursor-pointer"
                >
                  {formatBRL(preset)}
                </button>
              ))}
            </div>

            <button
              type="submit"
              style={{ backgroundColor: salon.theme.primaryColor }}
              className="px-4 py-2 text-xs font-medium text-white rounded-xl hover:opacity-95 transition-opacity cursor-pointer whitespace-nowrap"
            >
              Salvar Meta
            </button>
          </div>

          {validationError && (
            <p role="alert" className="text-xs text-rose-700 font-medium">
              {validationError}
            </p>
          )}
        </form>
      )}

      {/* Comparativo Principal: Realizado vs. Meta + Barra de Progresso Dupla */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Barra de Progresso e Indicadores de Alcance (8 colunas) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <span className="text-xs text-stone-500 block">Faturamento Realizado Hoje</span>
              <div className="flex items-baseline gap-2.5 mt-0.5">
                <span className="text-2xl lg:text-3xl font-semibold font-mono-tabular text-stone-900">
                  {formatBRL(progress.realizedRevenue)}
                </span>
                <span className="text-xs text-stone-500 font-mono-tabular">
                  de {formatBRL(progress.dailyGoal)} estabelecidos
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-stone-500 block">Percentual Atingido</span>
              <span
                className={`text-2xl font-semibold font-mono-tabular ${
                  progress.goalReached ? 'text-emerald-800' : 'text-stone-900'
                }`}
              >
                {progress.achievementPct}%
              </span>
            </div>
          </div>

          {/* Barra de Progresso (Realizado + Projeção com Agendamentos do Dia) */}
          <div
            role="progressbar"
            aria-label="Progresso da meta de faturamento diário"
            aria-valuenow={progress.achievementPct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="relative h-4 w-full bg-stone-100 rounded-full overflow-hidden border border-stone-200/70"
          >
            {/* Camada de Projeção (Realizado + Agendamentos Confirmados Hoje) */}
            <div
              style={{
                width: `${projectedWidthPct}%`,
                backgroundColor: salon.theme.accentColor,
                opacity: 0.35,
              }}
              className="absolute inset-y-0 left-0 transition-all duration-300"
            />
            {/* Camada Realizada (Comandas do Dia) */}
            <div
              style={{
                width: `${realizedWidthPct}%`,
                backgroundColor: salon.theme.primaryColor,
              }}
              className="relative h-full rounded-full transition-all duration-300"
            />
          </div>

          {/* Legenda da Barra: Realizado vs. Projeção da Agenda */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 pt-0.5">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span
                  style={{ backgroundColor: salon.theme.primaryColor }}
                  className="w-2.5 h-2.5 rounded-xs inline-block"
                />
                <span>
                  Realizado em Comandas: <strong className="font-mono-tabular">{formatBRL(progress.realizedRevenue)}</strong>
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  style={{ backgroundColor: salon.theme.accentColor }}
                  className="w-2.5 h-2.5 rounded-xs inline-block opacity-75"
                />
                <span>
                  Projeção c/ Agenda Hoje: <strong className="font-mono-tabular">{formatBRL(progress.projectedTotalRevenue)} ({progress.projectedPct}%)</strong>
                </span>
              </span>
            </div>

            <span className="font-mono-tabular text-stone-500">
              Recebido no Caixa: {formatBRL(progress.receivedRevenue)}
            </span>
          </div>
        </div>

        {/* Quadro Resumo de Gap / Superávit (4 colunas) */}
        <div className="lg:col-span-4 bg-stone-50/80 rounded-xl p-4 border border-stone-200/80 space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-stone-200/70 pb-2">
            <span className="font-semibold text-stone-900">Diagnóstico da Meta Hoje</span>
            <TrendingUp className="w-4 h-4 stroke-[1.5] text-stone-700" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-stone-600">Meta Estabelecida:</span>
            <strong className="font-mono-tabular text-stone-900">
              {formatBRL(progress.dailyGoal)}
            </strong>
          </div>

          {progress.goalReached ? (
            <div className="flex items-center justify-between text-emerald-800">
              <span className="font-medium">Superávit Acima da Meta:</span>
              <strong className="font-mono-tabular">
                + {formatBRL(progress.surplusAmount)}
              </strong>
            </div>
          ) : (
            <div className="flex items-center justify-between text-amber-900">
              <span className="font-medium">Faltam para a Meta:</span>
              <strong className="font-mono-tabular">
                {formatBRL(progress.remainingToGoal)}
              </strong>
            </div>
          )}

          <div className="pt-1.5 border-t border-stone-200/70 text-stone-500 leading-relaxed">
            {progress.goalReached ? (
              <span>
                Meta diária superada! O faturamento realizado já ultrapassou o objetivo em{' '}
                <strong className="font-mono-tabular text-emerald-800">
                  {formatBRL(progress.surplusAmount)}
                </strong>
                .
              </span>
            ) : (
              <span>
                Equivale a aproximadamente{' '}
                <strong className="text-stone-800 font-mono-tabular">
                  {remainingAttendancesEstimate} atendimento(s)
                </strong>{' '}
                no ticket médio atual ({formatBRL(avgTicket)}).
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
