import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Lock,
  Plus,
  Search,
  UserCheck,
  UserPlus,
  Users,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import {
  Appointment,
  AppointmentStatus,
  ClientProfile,
  Professional,
  SalonService,
  SalonTenant,
} from '../types/salon';
import {
  AgendaColorGroup,
  getAppointmentStatusVisual,
  hasScheduleConflict,
  summarizeSalonAgendaVisualStatus,
} from '../utils/salonRules';

interface AgendaAndReceptionViewProps {
  mode: 'agenda' | 'recepcao';
  salon: SalonTenant;
  selectedUnitId: string;
  appointments: Appointment[];
  professionals: Professional[];
  services: SalonService[];
  clients: ClientProfile[];
  onCreateAppointment: (appt: Omit<Appointment, 'id'>) => void;
  onUpdateAppointmentStatus: (appointmentId: string, newStatus: AppointmentStatus) => void;
  onStartAttendanceAndOpenComanda: (appointmentId: string) => void;
  onTransferProfessional: (appointmentId: string, newProfessionalId: string) => void;
}

export const AgendaAndReceptionView: React.FC<AgendaAndReceptionViewProps> = ({
  mode,
  salon,
  selectedUnitId,
  appointments,
  professionals,
  services,
  clients,
  onCreateAppointment,
  onUpdateAppointmentStatus,
  onStartAttendanceAndOpenComanda,
  onTransferProfessional,
}) => {
  const [viewMode, setViewMode] = useState<'colunas_profissional' | 'lista' | 'recursos'>('colunas_profissional');
  const [selectedDate, setSelectedDate] = useState('2026-10-26');
  const [filterProfId, setFilterProfId] = useState('todos');
  const [filterColorGroup, setFilterColorGroup] = useState<'todos' | AgendaColorGroup>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Form para novo agendamento ou walk-in (Seção 5.2 e 7)
  const [showForm, setShowForm] = useState(false);
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [professionalId, setProfessionalId] = useState(professionals[0]?.id || '');
  const [startTime, setStartTime] = useState('16:30');
  const [depositPaidInput, setDepositPaidInput] = useState('0');
  const [allowFitIn, setAllowFitIn] = useState(false);
  const [fitInJustification, setFitInJustification] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [waitlistNotified, setWaitlistNotified] = useState<string | null>(null);

  const unitProfessionals = professionals.filter(
    (p) => p.salonId === salon.id && (selectedUnitId === 'todas' || p.unitId === selectedUnitId)
  );
  const unitServices = services.filter((s) => s.salonId === salon.id);
  const unitClients = clients.filter((c) => c.salonId === salon.id);

  // Compromissos da data/profissional/busca antes do filtro por cor (para alimentar o termômetro visual completo)
  const baseDateAppointments = appointments
    .filter((a) => a.salonId === salon.id)
    .filter((a) => selectedUnitId === 'todas' || a.unitId === selectedUnitId)
    .filter((a) => a.date === selectedDate)
    .filter((a) => filterProfId === 'todos' || a.professionalId === filterProfId)
    .filter((a) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (a.clientName || '').toLowerCase().includes(q) ||
        (a.serviceName || '').toLowerCase().includes(q) ||
        (a.professionalName || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const visualSummary = summarizeSalonAgendaVisualStatus(
    baseDateAppointments,
    unitProfessionals.length
  );

  const filteredAppointments = baseDateAppointments.filter((a) => {
    if (filterColorGroup === 'todos') return true;
    return getAppointmentStatusVisual(a.status).group === filterColorGroup;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const client = unitClients.find((c) => c.id === clientId);
    const service = unitServices.find((s) => s.id === serviceId);
    const prof = unitProfessionals.find((p) => p.id === professionalId);

    if (!client || !service || !prof) {
      setFormError('Selecione cliente, serviço e profissional válidos.');
      return;
    }

    if (allowFitIn && !fitInJustification.trim()) {
      setFormError('Exceções de encaixe exigem justificativa operacional (Seção 5.5).');
      return;
    }

    const conflictCheck = hasScheduleConflict(appointments, {
      salonId: salon.id,
      professionalId: prof.id,
      date: selectedDate,
      startTime,
      durationMinutes: service.durationMinutes,
      allowAuthorizedFitIn: allowFitIn,
    });

    if (conflictCheck.conflict && conflictCheck.conflictingAppointment) {
      setFormError(
        `Conflito de agenda: ${prof.name} já possui "${conflictCheck.conflictingAppointment.serviceName}" com ${conflictCheck.conflictingAppointment.clientName} às ${conflictCheck.conflictingAppointment.startTime}. Habilite "Encaixe Autorizado" com justificativa se desejar sobrepor.`
      );
      return;
    }

    const [h, m] = startTime.split(':').map(Number);
    const totalMin = (h || 0) * 60 + (m || 0) + service.durationMinutes;
    const endH = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const endM = String(totalMin % 60).padStart(2, '0');

    const depositVal = Math.max(0, Number(depositPaidInput) || 0);

    onCreateAppointment({
      salonId: salon.id,
      unitId: prof.unitId,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      serviceId: service.id,
      serviceName: service.name,
      professionalId: prof.id,
      professionalName: prof.name,
      chairOrRoom: service.resourceRequired || prof.chairLabel,
      date: selectedDate,
      startTime,
      endTime: `${endH}:${endM}`,
      durationMinutes: service.durationMinutes,
      status: mode === 'recepcao' ? 'chegou' : depositVal > 0 || service.depositRequired === 0 ? 'confirmado' : 'aguardando_sinal',
      paymentStatus: 'pendente',
      estimatedPrice: service.basePrice,
      depositPaid: depositVal,
      depositDeductedInComanda: false,
      origin: allowFitIn ? 'Encaixe' : mode === 'recepcao' ? 'Recepção' : 'WhatsApp',
      notes: allowFitIn ? `[Encaixe: ${fitInJustification}] ${notes}`.trim() : notes,
      checkInTime: mode === 'recepcao' ? startTime : undefined,
    });

    setShowForm(false);
    setNotes('');
    setFitInJustification('');
    setAllowFitIn(false);
  };

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const statusText: Record<AppointmentStatus, string> = {
    solicitado: 'Solicitado',
    aguardando_sinal: 'Aguardando Sinal',
    confirmado: 'Confirmado',
    chegou: 'Cliente Chegou',
    em_espera: 'Em Espera',
    em_atendimento: 'Em Atendimento',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
    nao_compareceu: 'Não Compareceu',
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-stone-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
            <span>{mode === 'agenda' ? 'Gestão de Horários & Disponibilidade' : 'Fluxo de Chegada & Sala de Espera'}</span>
            <span aria-hidden="true">·</span>
            <span>{salon.commercialName}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-stone-900">
            {mode === 'agenda' ? 'Agenda Completa da Equipe' : 'Recepção, Fila & Check-in'}
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            {mode === 'agenda'
              ? 'Validação de conflito em tempo real, etapas de pausa de coloração, controle de sinal e lista de espera.'
              : 'Localize clientes rapidamente, registre chegada, inclua encaixes sem horário e abra comandas vinculadas.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {mode === 'agenda' && (
            <div className="flex items-center gap-1 bg-stone-200/70 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('colunas_profissional')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === 'colunas_profissional'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Por Profissional
              </button>
              <button
                type="button"
                onClick={() => setViewMode('lista')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === 'lista'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Lista Detalhada
              </button>
              <button
                type="button"
                onClick={() => setViewMode('recursos')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === 'recursos'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Por Sala / Cadeira
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            style={{ backgroundColor: salon.theme.primaryColor }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white rounded-xl hover:opacity-95 transition-opacity whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[1.75]" />
            <span>{mode === 'recepcao' ? 'Incluir Cliente Sem Horário (Walk-in)' : 'Novo Agendamento'}</span>
          </button>
        </div>
      </div>

      {/* Formulário de Novo Agendamento / Walk-in com Validação de Disponibilidade (Seção 5.2 e 5.5) */}
      {showForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="bg-white rounded-2xl p-5 border border-stone-300 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                {mode === 'recepcao'
                  ? 'Registrar Cliente na Recepção (Atendimento Imediato ou Encaixe)'
                  : 'Criar Novo Agendamento com Validação de Disponibilidade'}
              </h2>
              <p className="text-xs text-stone-500">
                Regra 1 (Seção 21): O sistema impede sobreposição involuntária de horários para o mesmo profissional.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-stone-500 hover:text-stone-900 cursor-pointer"
            >
              Fechar
            </button>
          </div>

          {formError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="ag-client" className="block text-xs font-medium text-stone-700 mb-1">
                Cliente
              </label>
              <select
                id="ag-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 bg-white"
              >
                {unitClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ag-service" className="block text-xs font-medium text-stone-700 mb-1">
                Serviço Principal
              </label>
              <select
                id="ag-service"
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  const srv = unitServices.find((s) => s.id === e.target.value);
                  if (srv) setDepositPaidInput(String(srv.depositRequired));
                }}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 bg-white"
              >
                {unitServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMinutes} min · {formatBRL(s.basePrice)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ag-prof" className="block text-xs font-medium text-stone-700 mb-1">
                Profissional Responsável
              </label>
              <select
                id="ag-prof"
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 bg-white"
              >
                {unitProfessionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.chairLabel}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="ag-time" className="block text-xs font-medium text-stone-700 mb-1">
                  Horário Início
                </label>
                <input
                  id="ag-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 font-mono-tabular bg-white"
                />
              </div>
              <div>
                <label htmlFor="ag-deposit" className="block text-xs font-medium text-stone-700 mb-1">
                  Sinal Recebido (R$)
                </label>
                <input
                  id="ag-deposit"
                  type="number"
                  min={0}
                  value={depositPaidInput}
                  onChange={(e) => setDepositPaidInput(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 font-mono-tabular bg-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowFitIn}
                  onChange={(e) => setAllowFitIn(e.target.checked)}
                  className="rounded border-stone-300"
                />
                <span>Autorizar Encaixe (Sobrepor horário / pausa técnica)</span>
              </label>
              {allowFitIn && (
                <input
                  type="text"
                  placeholder="Justificativa obrigatória para o encaixe..."
                  value={fitInJustification}
                  onChange={(e) => setFitInJustification(e.target.value)}
                  className="flex-1 rounded-xl border border-amber-400 bg-amber-50/40 px-3 py-1.5 text-xs text-stone-900"
                />
              )}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Observações de recepção ou preferências do cliente..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex-1 rounded-xl border border-stone-300 px-3 py-1.5 text-xs text-stone-900"
              />
              <button
                type="submit"
                style={{ backgroundColor: salon.theme.primaryColor }}
                className="px-4 py-2 text-xs font-medium text-white rounded-xl hover:opacity-95 transition-opacity whitespace-nowrap cursor-pointer"
              >
                Confirmar Registro
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Termômetro Visual do Salão & Legenda Interativa de Cores */}
      <section
        aria-label="Mapa Visual de Cores do Salão"
        className="bg-white rounded-2xl p-5 border border-stone-200/80 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-stone-900">
                Termômetro Visual do Salão · Mapa de Cores por Estágio
              </h2>
              <span className="text-xs text-stone-500 font-mono-tabular">
                ({visualSummary.busyProfessionalsCount}/{unitProfessionals.length} cadeiras em atendimento · {visualSummary.teamOccupancyPct}% ocupação ativa)
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Identifique imediatamente quem está na cadeira (verde), aguardando na recepção (âmbar), confirmado (azul), pendente de sinal (violeta) ou concluído (teal). Clique em uma cor para filtrar.
            </p>
          </div>

          {filterColorGroup !== 'todos' && (
            <button
              type="button"
              onClick={() => setFilterColorGroup('todos')}
              className="text-xs font-medium text-stone-700 hover:text-stone-900 underline cursor-pointer self-start sm:self-auto whitespace-nowrap"
            >
              Limpar filtro de cor (Mostrar todos os {visualSummary.totalAppointments})
            </button>
          )}
        </div>

        {/* Barra proporcional multicolorida do dia */}
        <div
          aria-label="Proporção de status da agenda por cor"
          className="h-3 w-full rounded-lg bg-stone-100 overflow-hidden flex border border-stone-200/70"
        >
          {visualSummary.segments.map((seg) =>
            seg.percentage > 0 ? (
              <div
                key={seg.group}
                style={{
                  width: `${seg.percentage}%`,
                  backgroundColor: seg.accentHex,
                }}
                title={`${seg.label}: ${seg.count} (${seg.percentage}%)`}
                className="h-full transition-all duration-300 first:rounded-l-md last:rounded-r-md"
              />
            ) : null
          )}
        </div>

        {/* Cartões interativos da legenda cromática */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
          <button
            type="button"
            onClick={() => setFilterColorGroup('todos')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              filterColorGroup === 'todos'
                ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                : 'bg-stone-50/70 text-stone-800 border-stone-200/80 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-xs font-semibold truncate">Visão Geral</span>
              <span className="text-sm font-mono-tabular font-semibold">
                {visualSummary.totalAppointments}
              </span>
            </div>
            <span
              className={`text-[11px] mt-1 truncate ${
                filterColorGroup === 'todos' ? 'text-stone-300' : 'text-stone-500'
              }`}
            >
              Todas as cores
            </span>
          </button>

          {visualSummary.segments.map((seg) => {
            const isSelected = filterColorGroup === seg.group;
            return (
              <button
                key={seg.group}
                type="button"
                onClick={() =>
                  setFilterColorGroup(isSelected ? 'todos' : seg.group)
                }
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor: seg.accentHex,
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? `${seg.bgActiveClass} ${seg.borderActiveClass} shadow-xs`
                    : 'bg-white border-stone-200/90 hover:bg-stone-50/80'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-sm shrink-0 ${seg.dotClass}`}
                    />
                    <span className={`text-xs font-semibold truncate ${seg.textClass}`}>
                      {seg.label}
                    </span>
                  </span>
                  <span className={`text-sm font-mono-tabular font-semibold ${seg.textClass}`}>
                    {seg.count}
                  </span>
                </div>
                <span className="text-[11px] text-stone-500 mt-1 truncate">
                  {seg.shortDesc} · {seg.percentage}%
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Barra de filtros operacionais */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-stone-500 stroke-[1.5]" />
            <input
              type="date"
              aria-label="Data da agenda"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-medium font-mono-tabular border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-900"
            />
          </div>

          <select
            aria-label="Filtrar por profissional"
            value={filterProfId}
            onChange={(e) => setFilterProfId(e.target.value)}
            className="text-xs border border-stone-200 rounded-lg px-3 py-1.5 text-stone-800 bg-white"
          >
            <option value="todos">Todos os Profissionais ({unitProfessionals.length})</option>
            {unitProfessionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.roleTitle})
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar cliente ou serviço..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-stone-200 rounded-lg text-stone-900 w-56"
            />
          </div>
        </div>

        <div className="text-xs text-stone-500 font-mono-tabular">
          <span>{filteredAppointments.length} compromissos listados</span>
        </div>
      </div>

      {/* Visão 1: Recepção & Fila ou Lista Detalhada */}
      {(mode === 'recepcao' || viewMode === 'lista') && (
        <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200/80 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                {mode === 'recepcao' ? 'Fila de Recepção, Check-in e Transferência' : 'Lista Cronológica de Compromissos'}
              </h2>
              <p className="text-xs text-stone-500">
                Cores distintas por estágio operacional e separação clara entre atendimento e pagamento
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200/80 text-xs text-stone-500 bg-stone-50/60">
                  <th className="py-3 px-4 font-medium">Horário</th>
                  <th className="py-3 px-4 font-medium">Cliente</th>
                  <th className="py-3 px-4 font-medium">Serviço & Recurso</th>
                  <th className="py-3 px-4 font-medium">Profissional (Transferir)</th>
                  <th className="py-3 px-4 font-medium">Cor & Estado Atendimento</th>
                  <th className="py-3 px-4 font-medium text-right">Valor & Sinal</th>
                  <th className="py-3 px-4 font-medium text-right">Ações Operacionais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/70 text-xs">
                {filteredAppointments.map((appt) => {
                  const visual = getAppointmentStatusVisual(appt.status);
                  return (
                    <tr
                      key={appt.id}
                      style={{
                        borderLeftWidth: '5px',
                        borderLeftColor: visual.accentHex,
                      }}
                      className={`${visual.cardBgClass} ${visual.rowHoverClass} transition-colors`}
                    >
                      <td className="py-3.5 px-4 font-mono-tabular whitespace-nowrap">
                        <div className={`font-semibold ${visual.textStrongClass}`}>
                          {appt.startTime} – {appt.endTime}
                        </div>
                        <div className="text-stone-600">
                          {appt.durationMinutes} min · {appt.origin}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-900">{appt.clientName}</div>
                        <div className="text-stone-600 font-mono-tabular">{appt.clientPhone}</div>
                        {appt.checkInTime && (
                          <div className="text-emerald-800 font-mono-tabular font-medium">
                            Chegou às {appt.checkInTime}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-stone-900">{appt.serviceName}</div>
                        <div className="text-stone-600">
                          {appt.chairOrRoom} {appt.notes ? `· ${appt.notes}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          aria-label={`Transferir profissional de ${appt.clientName}`}
                          value={appt.professionalId}
                          onChange={(e) => onTransferProfessional(appt.id, e.target.value)}
                          className="border border-stone-300 rounded-lg px-2 py-1 text-xs text-stone-900 bg-white"
                        >
                          {unitProfessionals.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${visual.dotClass}`} />
                          <span className={`font-semibold ${visual.textStrongClass}`}>
                            {statusText[appt.status]}
                          </span>
                        </div>
                        <div className="text-stone-600 mt-0.5">
                          Pgto: <strong className={appt.paymentStatus === 'pago' ? 'text-teal-800' : 'text-amber-800'}>{appt.paymentStatus.toUpperCase()}</strong>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-tabular whitespace-nowrap">
                        <div className="font-semibold text-stone-900">
                          {formatBRL(appt.estimatedPrice)}
                        </div>
                        <div className="text-stone-600">
                          {appt.depositPaid > 0 ? `Sinal: ${formatBRL(appt.depositPaid)}` : 'Sem sinal'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {(appt.status === 'confirmado' || appt.status === 'aguardando_sinal' || appt.status === 'solicitado') && (
                            <button
                              type="button"
                              onClick={() => onUpdateAppointmentStatus(appt.id, 'chegou')}
                              className="px-2.5 py-1.5 text-xs font-medium text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg cursor-pointer"
                            >
                              Fazer Check-in
                            </button>
                          )}
                          {(appt.status === 'chegou' || appt.status === 'em_espera' || appt.status === 'confirmado') && (
                            <button
                              type="button"
                              onClick={() => onStartAttendanceAndOpenComanda(appt.id)}
                              style={{ backgroundColor: salon.theme.primaryColor }}
                              className="px-2.5 py-1.5 text-xs font-medium text-white rounded-lg hover:opacity-95 cursor-pointer"
                            >
                              Iniciar & Abrir Comanda
                            </button>
                          )}
                          {appt.status !== 'cancelado' && appt.status !== 'concluido' && (
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateAppointmentStatus(appt.id, 'cancelado');
                                setWaitlistNotified(
                                  `Horário das ${appt.startTime} (${appt.professionalName}) liberado! Oferta automática enviada para a Lista de Espera.`
                                );
                              }}
                              className="px-2 py-1.5 text-xs text-rose-800 bg-white/80 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Visão 2: Grade de Colunas por Profissional com Cores por Status (Seção 5.1) */}
      {mode === 'agenda' && viewMode === 'colunas_profissional' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {unitProfessionals.map((prof) => {
            const profAppts = filteredAppointments.filter((a) => a.professionalId === prof.id);
            const activeAppt = baseDateAppointments.find(
              (a) => a.professionalId === prof.id && a.status === 'em_atendimento'
            );
            const waitingAppt = baseDateAppointments.find(
              (a) =>
                a.professionalId === prof.id &&
                (a.status === 'chegou' || a.status === 'em_espera')
            );
            const nextConfirmed = baseDateAppointments.find(
              (a) =>
                a.professionalId === prof.id &&
                (a.status === 'confirmado' || a.status === 'aguardando_sinal')
            );

            // Cor semântica do topo da coluna para entender instantaneamente como está cada profissional
            const columnStatus = activeAppt
              ? {
                  barHex: '#059669',
                  bgClass: 'bg-emerald-50/90 border-emerald-200',
                  dotClass: 'bg-emerald-600',
                  textClass: 'text-emerald-900',
                  statusSummary: `Em Atendimento · ${activeAppt.clientName.split(' ')[0]}`,
                }
              : waitingAppt
              ? {
                  barHex: '#D97706',
                  bgClass: 'bg-amber-50/90 border-amber-200',
                  dotClass: 'bg-amber-500',
                  textClass: 'text-amber-900',
                  statusSummary: `Cliente na Recepção · ${waitingAppt.clientName.split(' ')[0]}`,
                }
              : {
                  barHex: '#0284C7',
                  bgClass: 'bg-sky-50/70 border-sky-200/80',
                  dotClass: 'bg-sky-600',
                  textClass: 'text-sky-900',
                  statusSummary: nextConfirmed
                    ? `Cadeira Livre · Próximo às ${nextConfirmed.startTime}`
                    : 'Cadeira Livre · Disponível p/ Encaixe',
                };

            return (
              <div
                key={prof.id}
                style={{
                  borderTopWidth: '4px',
                  borderTopColor: columnStatus.barHex,
                }}
                className="bg-white rounded-2xl border border-stone-200/80 flex flex-col justify-between overflow-hidden"
              >
                <div>
                  {/* Topo da coluna do profissional com indicador visual de ocupação */}
                  <div className="p-4 border-b border-stone-200/80 bg-stone-50/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          style={{ backgroundColor: columnStatus.barHex }}
                          className="w-9 h-9 rounded-xl text-white font-semibold text-xs flex items-center justify-center shrink-0"
                        >
                          {prof.avatarInitials}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-stone-900">{prof.name}</h3>
                          <p className="text-xs text-stone-500">
                            {prof.chairLabel} · {prof.workingHours.start}–{prof.workingHours.end}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Faixa de status em tempo real do profissional */}
                    <div
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${columnStatus.bgClass} ${columnStatus.textClass}`}
                    >
                      <span className={`w-2 h-2 rounded-sm shrink-0 ${columnStatus.dotClass}`} />
                      <span className="truncate">{columnStatus.statusSummary}</span>
                    </div>
                  </div>

                  {/* Compromissos do profissional com cores distintas por status */}
                  <div className="p-3.5 space-y-2.5">
                    {profAppts.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-stone-200 text-center text-xs text-stone-500">
                        Nenhum horário neste filtro de cor.
                      </div>
                    ) : (
                      profAppts.map((appt) => {
                        const visual = getAppointmentStatusVisual(appt.status);
                        return (
                          <div
                            key={appt.id}
                            style={{
                              borderLeftWidth: '5px',
                              borderLeftColor: visual.accentHex,
                            }}
                            className={`p-3 rounded-xl border ${visual.cardBorderClass} ${visual.cardBgClass} transition-all space-y-1.5`}
                          >
                            {/* Cabeçalho colorido do cartão */}
                            <div className="flex items-center justify-between text-xs gap-2">
                              <span className={`font-mono-tabular font-semibold whitespace-nowrap ${visual.textStrongClass}`}>
                                {appt.startTime}–{appt.endTime}
                              </span>
                              <span className="inline-flex items-center gap-1.5 font-semibold whitespace-nowrap">
                                <span className={`w-2 h-2 rounded-sm shrink-0 ${visual.dotClass}`} />
                                <span className={visual.textMutedClass}>
                                  {statusText[appt.status]}
                                </span>
                              </span>
                            </div>

                            <div className="text-sm font-semibold text-stone-950">
                              {appt.clientName}
                            </div>
                            <div className="text-xs text-stone-700 font-medium">
                              {appt.serviceName}
                            </div>

                            {/* Detalhes operacionais: cadeira, check-in, sinal ou notas */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-stone-600">
                              <span>{appt.chairOrRoom}</span>
                              {appt.checkInTime && (
                                <span className="text-emerald-800 font-medium font-mono-tabular">
                                  · Check-in {appt.checkInTime}
                                </span>
                              )}
                              {appt.depositPaid > 0 && (
                                <span className="text-sky-900 font-medium font-mono-tabular">
                                  · Sinal {formatBRL(appt.depositPaid)}
                                </span>
                              )}
                            </div>

                            {appt.notes && (
                              <div className="text-[11px] text-stone-600 italic bg-white/60 px-2 py-1 rounded-lg border border-stone-200/60">
                                {appt.notes}
                              </div>
                            )}

                            <div className="pt-2 border-t border-stone-200/70 flex items-center justify-between gap-2 text-xs">
                              <span className="font-mono-tabular font-semibold text-stone-900 whitespace-nowrap">
                                {formatBRL(appt.estimatedPrice)}
                              </span>
                              {(appt.status === 'confirmado' || appt.status === 'aguardando_sinal') && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateAppointmentStatus(appt.id, 'chegou')}
                                  className="px-2 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold cursor-pointer transition-colors whitespace-nowrap"
                                >
                                  Check-in →
                                </button>
                              )}
                              {(appt.status === 'chegou' || appt.status === 'em_espera') && (
                                <button
                                  type="button"
                                  onClick={() => onStartAttendanceAndOpenComanda(appt.id)}
                                  className="px-2 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer transition-colors whitespace-nowrap"
                                >
                                  Iniciar na Cadeira →
                                </button>
                              )}
                              {appt.status === 'em_atendimento' && (
                                <span className="text-[11px] font-semibold text-emerald-800 font-mono-tabular whitespace-nowrap">
                                  Início {appt.serviceStartTime || appt.startTime}
                                </span>
                              )}
                              {appt.status === 'concluido' && (
                                <span className="text-[11px] font-semibold text-teal-800 whitespace-nowrap">
                                  Finalizado ({appt.paymentStatus.toUpperCase()})
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Intervalo de almoço bloqueado (Seção 5.3) */}
                    <div className="p-2.5 rounded-xl border border-dashed border-stone-300 bg-stone-100/70 flex items-center justify-between text-xs text-stone-600">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-stone-500" />
                        <span>Intervalo de Almoço Bloqueado</span>
                      </span>
                      <span className="font-mono-tabular font-medium">
                        {prof.workingHours.lunchStart} – {prof.workingHours.lunchEnd}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2.5 border-t border-stone-100 bg-stone-50/40 flex items-center justify-between text-xs text-stone-500">
                  <span>{profAppts.length} atendimentos</span>
                  <button
                    type="button"
                    onClick={() => {
                      setProfessionalId(prof.id);
                      setShowForm(true);
                    }}
                    className="font-medium text-stone-900 hover:underline cursor-pointer"
                  >
                    + Agendar com {prof.name.split(' ')[0]}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visão 3: Por Sala, Cadeira ou Equipamento com Cores de Ocupação (Seção 5.1) */}
      {mode === 'agenda' && viewMode === 'recursos' && (
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Ocupação Visual por Cadeira, Lavatório Spa e Cabines
              </h2>
              <p className="text-xs text-stone-500">
                Cores indicam se o espaço físico está ocupado agora (verde), com cliente aguardando (âmbar), reservado (azul), aguardando sinal (violeta) ou livre
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(salon.units[0]?.rooms || []).map((room) => {
              const roomAppts = filteredAppointments.filter((a) => a.chairOrRoom === room);
              const isBusyNow = roomAppts.some((a) => a.status === 'em_atendimento');
              const hasWaiting = roomAppts.some(
                (a) => a.status === 'chegou' || a.status === 'em_espera'
              );
              const hasConfirmed = roomAppts.some((a) => a.status === 'confirmado');
              const hasPendingDeposit = roomAppts.some(
                (a) => a.status === 'aguardando_sinal' || a.status === 'solicitado'
              );

              const roomVisual = isBusyNow
                ? {
                    borderHex: '#059669',
                    bgClass: 'bg-emerald-50/50 border-emerald-200',
                    statusLabel: 'Em Uso Agora',
                    statusColor: 'text-emerald-800',
                    dotClass: 'bg-emerald-600',
                  }
                : hasWaiting
                ? {
                    borderHex: '#D97706',
                    bgClass: 'bg-amber-50/50 border-amber-200',
                    statusLabel: 'Cliente na Recepção',
                    statusColor: 'text-amber-800',
                    dotClass: 'bg-amber-500',
                  }
                : hasConfirmed
                ? {
                    borderHex: '#0284C7',
                    bgClass: 'bg-sky-50/40 border-sky-200',
                    statusLabel: 'Reservado Confirmado',
                    statusColor: 'text-sky-800',
                    dotClass: 'bg-sky-600',
                  }
                : hasPendingDeposit
                ? {
                    borderHex: '#7C3AED',
                    bgClass: 'bg-violet-50/45 border-violet-200',
                    statusLabel: 'Aguardando Sinal',
                    statusColor: 'text-violet-800',
                    dotClass: 'bg-violet-600',
                  }
                : {
                    borderHex: '#A8A29E',
                    bgClass: 'bg-stone-50/40 border-stone-200/80',
                    statusLabel: 'Livre Agora',
                    statusColor: 'text-stone-600',
                    dotClass: 'bg-stone-400',
                  };

              return (
                <div
                  key={room}
                  style={{
                    borderLeftWidth: '5px',
                    borderLeftColor: roomVisual.borderHex,
                  }}
                  className={`p-4 rounded-xl border ${roomVisual.bgClass} space-y-2.5`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-stone-900">{room}</span>
                    <span className={`text-xs font-semibold flex items-center gap-1.5 ${roomVisual.statusColor}`}>
                      <span className={`w-2 h-2 rounded-sm ${roomVisual.dotClass}`} />
                      <span>{roomVisual.statusLabel}</span>
                    </span>
                  </div>
                  {roomAppts.length === 0 ? (
                    <p className="text-xs text-stone-500">Livre para alocação imediata</p>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      {roomAppts.map((a) => {
                        const aVisual = getAppointmentStatusVisual(a.status);
                        return (
                          <div
                            key={a.id}
                            style={{
                              borderLeftWidth: '3px',
                              borderLeftColor: aVisual.accentHex,
                            }}
                            className="text-xs bg-white/90 px-2.5 py-1.5 rounded-lg border border-stone-200/70 flex items-center justify-between gap-2"
                          >
                            <span className={`font-mono-tabular font-semibold ${aVisual.textStrongClass}`}>
                              {a.startTime}–{a.endTime}
                            </span>
                            <span className="truncate font-medium text-stone-800">
                              {a.clientName} ({a.professionalName.split(' ')[0]})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de Espera Inteligente (Seção 5.3) */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-stone-900">
            Lista de Espera Ativa & Encaixe Inteligente
          </h2>
          <p className="text-xs text-stone-500">
            Quando um horário é cancelado, o sistema oferece a vaga liberada para clientes aguardando na lista (Seção 5.3).
          </p>
          {waitlistNotified && (
            <p className="text-xs text-emerald-800 font-medium flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{waitlistNotified}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50">
            <div className="font-semibold text-stone-900">Lívia Vasconcelos · (11) 99812-4010</div>
            <div className="text-stone-500">Deseja: Mechas Contour com Valentina · Qualquer horário tarde</div>
          </div>
          <button
            type="button"
            onClick={() =>
              setWaitlistNotified(
                'Notificação WhatsApp enviada para Lívia Vasconcelos com link de reserva prioritária (expira em 15 min).'
              )
            }
            className="px-3.5 py-2 font-medium text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer whitespace-nowrap"
          >
            Oferecer Vaga via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};
