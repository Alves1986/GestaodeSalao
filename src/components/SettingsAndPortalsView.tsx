import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Globe,
  Lock,
  Palette,
  Plus,
  RefreshCw,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  Appointment,
  AppointmentStatus,
  AuditLogEntry,
  ClientPackage,
  ClientProfile,
  CommissionRecord,
  Professional,
  SalonService,
  SalonTenant,
  SalonTheme,
  TechnicalRecord,
  UserRole,
} from '../types/salon';
import { getContrastRatio } from '../utils/salonRules';

interface SettingsAndPortalsViewProps {
  viewType: 'settings' | 'professional_portal' | 'client_portal' | 'platform_admin';
  salon: SalonTenant;
  allSalons: SalonTenant[];
  professionals: Professional[];
  services: SalonService[];
  appointments: Appointment[];
  commissions: CommissionRecord[];
  packages: ClientPackage[];
  clients: ClientProfile[];
  technicalRecords: TechnicalRecord[];
  auditLogs: AuditLogEntry[];
  onUpdateSalonTheme: (salonId: string, theme: SalonTheme, commercialName: string) => void;
  onUpdateSalonRule: (salonId: string, commissionRule: 'execucao' | 'recebimento') => void;
  onUpdateAppointmentStatus: (appointmentId: string, status: AppointmentStatus) => void;
  onCreateOnlineAppointment: (appt: Omit<Appointment, 'id'>) => void;
  onCreateNewTenantSalon: (commercialName: string, cnpj: string, plan: SalonTenant['plan']) => void;
  onToggleTenantStatus: (salonId: string) => void;
  onSwitchActiveSalon: (salonId: string) => void;
}

export const SettingsAndPortalsView: React.FC<SettingsAndPortalsViewProps> = ({
  viewType,
  salon,
  allSalons,
  professionals,
  services,
  appointments,
  commissions,
  packages,
  clients,
  technicalRecords,
  auditLogs,
  onUpdateSalonTheme,
  onUpdateSalonRule,
  onUpdateAppointmentStatus,
  onCreateOnlineAppointment,
  onCreateNewTenantSalon,
  onToggleTenantStatus,
  onSwitchActiveSalon,
}) => {
  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Settings state (Seção 2.2)
  const [settingsTab, setSettingsTab] = useState<'aparencia' | 'unidades_regras' | 'seguranca_lgpd'>('aparencia');
  const [draftName, setDraftName] = useState(salon.commercialName);
  const [draftTheme, setDraftTheme] = useState<SalonTheme>(salon.theme);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [backupBanner, setBackupBanner] = useState<string | null>(null);

  // Professional portal state (Seção 12)
  const unitProfList = professionals.filter((p) => p.salonId === salon.id);
  const [activeProfId, setActiveProfId] = useState(unitProfList[0]?.id || 'prof-1');
  const [blockNoteSuccess, setBlockNoteSuccess] = useState<string | null>(null);

  // Client online booking state (Seção 6)
  const [clientTab, setClientTab] = useState<'agendar' | 'meus_horarios'>('agendar');
  const [bookUnitId, setBookUnitId] = useState(salon.units[0]?.id || 'unit-1');
  const [bookServiceId, setBookServiceId] = useState(
    services.find((s) => s.salonId === salon.id)?.id || 'srv-1'
  );
  const [bookProfId, setBookProfId] = useState('qualquer');
  const [bookDate, setBookDate] = useState('2026-10-27');
  const [bookTime, setBookTime] = useState('10:30');
  const [bookClientName, setBookClientName] = useState('Camila Vasconcelos');
  const [bookClientPhone, setBookClientPhone] = useState('(11) 99412-8830');
  const [bookingConfirmedMsg, setBookingConfirmedMsg] = useState<string | null>(null);

  // Platform Admin state (Seção 19)
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantCnpj, setNewTenantCnpj] = useState('');
  const [newTenantPlan, setNewTenantPlan] = useState<SalonTenant['plan']>('Signature');
  const [supportAccessLog, setSupportAccessLog] = useState<string | null>(null);

  // 1. TELA CONFIGURAÇÕES → APARÊNCIA, UNIDADES & SEGURANÇA LGPD (Seções 2.2, 17, 18, 20)
  if (viewType === 'settings') {
    const contrastWhiteOnPrimary = getContrastRatio(draftTheme.primaryColor, '#FFFFFF');
    const contrastPrimaryOnBg = getContrastRatio(
      draftTheme.primaryColor,
      draftTheme.backgroundColor
    );
    const isContrastValid = contrastWhiteOnPrimary >= 4.5 && contrastPrimaryOnBg >= 4.5;

    const handleRestoreDefaultTheme = () => {
      const defaultTheme: SalonTheme = {
        primaryColor: '#143328',
        secondaryColor: '#224B3C',
        accentColor: '#C59B27',
        backgroundColor: '#FAF8F5',
        surfaceColor: '#FFFFFF',
        themeMode: 'padrao',
        logoText: salon.commercialName,
        logoSubtext: 'Haute Coiffure & Spa',
        shortIconText: 'ML',
        institutionalMessage:
          'Excelência técnica, diagnóstico personalizado e rituais botânicos de alta performance.',
        publicDomain: 'agendar.maisonlumiere.com.br',
      };
      setDraftTheme(defaultTheme);
      onUpdateSalonTheme(salon.id, defaultTheme, salon.commercialName);
      setSavedBanner('Tema padrão original (Verde-Escuro & Dourado) restaurado com sucesso.');
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-stone-200/80 pb-5">
          <div>
            <div className="text-xs text-stone-500 mb-1">
              Personalização White-Label Isolada por Salão, Múltiplas Unidades & Privacidade LGPD
            </div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-stone-900">
              Configurações → Aparência & Governança
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Seção 2.2: Aplique logo, cores e domínio próprio em todas as telas deste salão sem afetar outros estabelecimentos.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-stone-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setSettingsTab('aparencia')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap ${
                settingsTab === 'aparencia'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Aparência & Marca
            </button>
            <button
              type="button"
              onClick={() => setSettingsTab('unidades_regras')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap ${
                settingsTab === 'unidades_regras'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Unidades & Regras
            </button>
            <button
              type="button"
              onClick={() => setSettingsTab('seguranca_lgpd')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap ${
                settingsTab === 'seguranca_lgpd'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Auditoria, Backups & LGPD
            </button>
          </div>
        </div>

        {savedBanner && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <span>{savedBanner}</span>
            <button
              type="button"
              onClick={() => setSavedBanner(null)}
              className="underline cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {settingsTab === 'aparencia' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Formulário de Identidade Visual (Seção 2.2) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!isContrastValid) {
                  setSavedBanner(
                    'Atenção: Contraste insuficiente (< 4.5:1). Ajuste a cor principal para manter textos legíveis.'
                  );
                  return;
                }
                onUpdateSalonTheme(salon.id, draftTheme, draftName);
                setSavedBanner(
                  `Identidade visual de "${draftName}" publicada com sucesso em todas as telas e na página pública!`
                );
              }}
              className="lg:col-span-7 bg-white rounded-2xl p-5 border border-stone-200/80 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h2 className="text-lg font-semibold text-stone-900">
                  Variáveis de Tema & Identidade do Estabelecimento
                </h2>
                <button
                  type="button"
                  onClick={handleRestoreDefaultTheme}
                  className="flex items-center gap-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restaurar Tema Padrão</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label htmlFor="cfg-name" className="block text-stone-600 mb-1">
                    Nome Comercial (Cabeçalhos & Documentos)
                  </label>
                  <input
                    id="cfg-name"
                    type="text"
                    value={draftName}
                    onChange={(e) => {
                      setDraftName(e.target.value);
                      setDraftTheme({ ...draftTheme, logoText: e.target.value });
                    }}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
                  />
                </div>

                <div>
                  <label htmlFor="cfg-icon" className="block text-stone-600 mb-1">
                    Ícone Reduzido / Monograma (Menu Recolhido)
                  </label>
                  <input
                    id="cfg-icon"
                    type="text"
                    maxLength={3}
                    value={draftTheme.shortIconText}
                    onChange={(e) =>
                      setDraftTheme({ ...draftTheme, shortIconText: e.target.value.toUpperCase() })
                    }
                    className="w-full border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono-tabular"
                  />
                </div>

                <div>
                  <label htmlFor="cfg-primary" className="block text-stone-600 mb-1">
                    Cor Principal (Menu Lateral & Botões)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="cfg-primary"
                      type="color"
                      value={draftTheme.primaryColor}
                      onChange={(e) =>
                        setDraftTheme({ ...draftTheme, primaryColor: e.target.value })
                      }
                      className="w-10 h-9 rounded border border-stone-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={draftTheme.primaryColor}
                      onChange={(e) =>
                        setDraftTheme({ ...draftTheme, primaryColor: e.target.value })
                      }
                      className="flex-1 border border-stone-300 rounded-xl px-3 py-2 font-mono-tabular text-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="cfg-accent" className="block text-stone-600 mb-1">
                    Cor de Destaque (Dourado / Detalhes & Seleção)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="cfg-accent"
                      type="color"
                      value={draftTheme.accentColor}
                      onChange={(e) =>
                        setDraftTheme({ ...draftTheme, accentColor: e.target.value })
                      }
                      className="w-10 h-9 rounded border border-stone-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={draftTheme.accentColor}
                      onChange={(e) =>
                        setDraftTheme({ ...draftTheme, accentColor: e.target.value })
                      }
                      className="flex-1 border border-stone-300 rounded-xl px-3 py-2 font-mono-tabular text-stone-900"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="cfg-msg" className="block text-stone-600 mb-1">
                    Mensagem Institucional (Painel & Página Pública de Agendamento)
                  </label>
                  <input
                    id="cfg-msg"
                    type="text"
                    value={draftTheme.institutionalMessage}
                    onChange={(e) =>
                      setDraftTheme({ ...draftTheme, institutionalMessage: e.target.value })
                    }
                    className="w-full border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="cfg-domain" className="block text-stone-600 mb-1">
                    Endereço Público Próprio / Domínio Personalizado
                  </label>
                  <input
                    id="cfg-domain"
                    type="text"
                    value={draftTheme.publicDomain}
                    onChange={(e) =>
                      setDraftTheme({ ...draftTheme, publicDomain: e.target.value })
                    }
                    className="w-full border border-stone-300 rounded-xl px-3 py-2 font-mono-tabular text-stone-900"
                  />
                </div>
              </div>

              {/* Validador de Contraste WCAG (Seção 2.2) */}
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-stone-900">
                    Validação Automática de Contraste (Seção 2.2):
                  </span>{' '}
                  <span className="font-mono-tabular text-stone-600">
                    Texto claro s/ Cor Principal = {contrastWhiteOnPrimary}:1 (Mínimo exigido 4.5:1)
                  </span>
                </div>
                <span
                  className={`font-semibold ${
                    isContrastValid ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {isContrastValid ? 'APROVADO (Legível)' : 'REPROVADO (Baixo Contraste)'}
                </span>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  style={{ backgroundColor: draftTheme.primaryColor }}
                  className="px-5 py-2.5 text-xs font-medium text-white rounded-xl hover:opacity-95 cursor-pointer"
                >
                  Publicar Identidade Visual do Salão
                </button>
              </div>
            </form>

            {/* Pré-visualização antes de publicar (Seção 2.2) */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-stone-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-stone-900">
                  Pré-visualização em Tempo Real
                </h2>
                <span className="text-xs text-stone-500">Isolado para {draftName}</span>
              </div>

              <div
                style={{ backgroundColor: draftTheme.backgroundColor }}
                className="p-4 rounded-2xl border border-stone-200 space-y-4"
              >
                <div
                  style={{ backgroundColor: draftTheme.primaryColor }}
                  className="p-4 rounded-xl text-white flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        backgroundColor: draftTheme.accentColor,
                        color: '#14201A',
                      }}
                      className="w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center"
                    >
                      {draftTheme.shortIconText}
                    </div>
                    <div>
                      <div className="font-editorial text-lg font-semibold leading-tight">
                        {draftName}
                      </div>
                      <div className="text-[11px] text-white/75">{draftTheme.publicDomain}</div>
                    </div>
                  </div>
                  <span
                    style={{ color: draftTheme.accentColor }}
                    className="text-xs font-medium"
                  >
                    Tema Ativo
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-stone-200/80 space-y-2">
                  <div className="text-xs text-stone-500">Mensagem na Página de Agendamento:</div>
                  <p className="text-xs text-stone-800 italic">
                    “{draftTheme.institutionalMessage}”
                  </p>
                  <div className="pt-2 flex items-center gap-2 text-[11px] text-stone-500">
                    <span>Cores semânticas preservadas:</span>
                    <span className="text-emerald-700 font-medium">Sucesso</span>
                    <span>·</span>
                    <span className="text-amber-700 font-medium">Alerta</span>
                    <span>·</span>
                    <span className="text-rose-700 font-medium">Erro</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {settingsTab === 'unidades_regras' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 space-y-4">
              <h2 className="text-lg font-semibold text-stone-900">
                Unidades Cadastradas ({salon.units.length})
              </h2>
              <div className="space-y-3">
                {salon.units.map((u) => (
                  <div key={u.id} className="p-4 rounded-xl border border-stone-200/80 text-xs space-y-1">
                    <div className="font-semibold text-stone-900 text-sm">{u.name}</div>
                    <div className="text-stone-600">{u.address}</div>
                    <div className="text-stone-500 font-mono-tabular">
                      {u.phone} · {u.openingHours} · {u.chairsCount} cadeiras
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 space-y-4">
              <h2 className="text-lg font-semibold text-stone-900">
                Regras Financeiras, Fiscais & Comissionamento
              </h2>
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-stone-900">
                      Critério de Liberação de Comissão (Seção 12)
                    </div>
                    <div className="text-stone-500">
                      Define se a comissão torna-se elegível na execução ou apenas após o pagamento
                    </div>
                  </div>
                  <select
                    value={salon.commissionReleaseRule}
                    onChange={(e) =>
                      onUpdateSalonRule(
                        salon.id,
                        e.target.value as 'execucao' | 'recebimento'
                      )
                    }
                    className="border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white text-stone-900 font-medium"
                  >
                    <option value="recebimento">Pelo Recebimento</option>
                    <option value="execucao">Pela Execução</option>
                  </select>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80">
                  <div className="font-semibold text-stone-900">Enquadramento NFS-e Municipal</div>
                  <div className="text-stone-600 mt-0.5 font-mono-tabular">
                    {salon.municipalTaxCode} · CNPJ {salon.cnpj}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {settingsTab === 'seguranca_lgpd' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-stone-900">
                  Segurança, Backups Restauráveis & Direitos do Titular LGPD (Seção 20)
                </h2>
                <p className="text-xs text-stone-500">
                  Autenticação 2FA ativa para perfis administrativos, criptografia de fichas de saúde e validação de restauração de backup.
                </p>
                {backupBanner && (
                  <p className="text-xs text-emerald-800 font-medium pt-1">{backupBanner}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setBackupBanner(
                      'Simulação de Restauração de Backup (#BKP-2026-10-26-04h00) validada com 100% de integridade referencial.'
                    )
                  }
                  className="px-3.5 py-2 text-xs font-medium text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
                >
                  Testar Restauração de Backup
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 space-y-3">
              <h3 className="text-base font-semibold text-stone-900">
                Trilha de Auditoria Imutável (Regra 10 — Seção 21)
              </h3>
              <div className="divide-y divide-stone-200/70 text-xs">
                {auditLogs
                  .filter((l) => l.salonId === salon.id)
                  .map((log) => (
                    <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-stone-900">
                          {log.action} <span className="text-stone-400">({log.module})</span>
                        </div>
                        <div className="text-stone-600">{log.details}</div>
                      </div>
                      <div className="text-right font-mono-tabular shrink-0">
                        <div className="text-stone-800">
                          {log.userName} ({log.userRole})
                        </div>
                        <div className="text-stone-400">{log.timestamp}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. AMBIENTE 2 — ÁREA DO PROFISSIONAL (Seções 1 e 12)
  if (viewType === 'professional_portal') {
    const activeProf =
      unitProfList.find((p) => p.id === activeProfId) || unitProfList[0];
    const myAppointments = appointments.filter(
      (a) => a.salonId === salon.id && a.professionalId === activeProf?.id
    );
    const myCommissions = commissions.filter(
      (c) => c.salonId === salon.id && c.professionalId === activeProf?.id
    );
    const totalMyComm = myCommissions.reduce((acc, c) => acc + c.commissionAmount, 0);

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-stone-200/80 pb-5">
          <div>
            <div className="text-xs text-stone-500 mb-1">
              Ambiente Exclusivo do Profissional · Mobile & Desktop Adaptativo
            </div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-stone-900">
              Área do Profissional — {activeProf?.name}
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Consulte sua agenda do dia, inicie e conclua atendimentos, acesse fichas técnicas autorizadas e acompanhe suas comissões.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="select-prof-portal" className="text-xs text-stone-500">
              Profissional Logado:
            </label>
            <select
              id="select-prof-portal"
              value={activeProfId}
              onChange={(e) => setActiveProfId(e.target.value)}
              className="text-xs font-medium border border-stone-300 rounded-xl px-3 py-2 bg-white text-stone-900"
            >
              {unitProfList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.roleTitle})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            style={{ backgroundColor: salon.theme.primaryColor }}
            className="rounded-2xl p-5 text-white"
          >
            <div className="text-xs text-white/80">Minhas Comissões Apuradas Hoje</div>
            <div className="text-2xl font-semibold font-mono-tabular mt-1">
              {formatBRL(totalMyComm)}
            </div>
            <div className="text-xs text-white/80 mt-1">
              Regra do salão: Liberação por {salon.commissionReleaseRule}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-stone-200/80">
            <div className="text-xs text-stone-500">Meus Clientes Hoje</div>
            <div className="text-2xl font-semibold font-mono-tabular text-stone-900 mt-1">
              {myAppointments.length} atendimentos
            </div>
            <div className="text-xs text-stone-500 mt-1">
              Alocação principal: {activeProf?.chairLabel}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-stone-200/80">
            <div className="text-xs text-stone-500">Progresso da Meta Mensal</div>
            <div className="text-2xl font-semibold font-mono-tabular text-stone-900 mt-1">
              82% ({formatBRL(activeProf?.monthlyGoal || 30000)})
            </div>
            <div className="text-xs text-emerald-700 mt-1">
              Comissão Serviço: {activeProf?.commissionServicePct}% · Produto: {activeProf?.commissionProductPct}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-stone-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-900">
                Minha Agenda & Execução de Hoje
              </h2>
              <button
                type="button"
                onClick={() =>
                  setBlockNoteSuccess(
                    'Solicitação de bloqueio de horário enviada para validação da recepção/gerência.'
                  )
                }
                className="text-xs font-medium text-stone-700 hover:underline cursor-pointer"
              >
                + Solicitar Bloqueio de Horário
              </button>
            </div>

            {blockNoteSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                {blockNoteSuccess}
              </div>
            )}

            <div className="divide-y divide-stone-200/70">
              {myAppointments.map((appt) => (
                <div key={appt.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 text-xs">
                    <div className="font-mono-tabular font-semibold text-stone-900">
                      {appt.startTime} – {appt.endTime} · {appt.chairOrRoom}
                    </div>
                    <div className="text-sm font-semibold text-stone-900">{appt.clientName}</div>
                    <div className="text-stone-600">{appt.serviceName}</div>
                  </div>
                  <div className="shrink-0">
                    {appt.status !== 'concluido' ? (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateAppointmentStatus(
                            appt.id,
                            appt.status === 'em_atendimento' ? 'concluido' : 'em_atendimento'
                          )
                        }
                        style={{ backgroundColor: salon.theme.primaryColor }}
                        className="px-3 py-1.5 text-xs font-medium text-white rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        {appt.status === 'em_atendimento'
                          ? 'Concluir Meu Atendimento'
                          : 'Iniciar Atendimento'}
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-emerald-700">Concluído</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-stone-200/80 space-y-4">
            <h2 className="text-lg font-semibold text-stone-900">
              Extrato Individual de Comissões
            </h2>
            <div className="divide-y divide-stone-200/70 text-xs">
              {myCommissions.map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-stone-900">{c.itemDescription}</div>
                    <div className="text-stone-500">
                      Comanda #{c.comandaNumber} · {c.roleInService.toUpperCase()} ({c.commissionPct}%)
                    </div>
                  </div>
                  <div className="text-right font-mono-tabular">
                    <div className="font-semibold text-stone-900">
                      {formatBRL(c.commissionAmount)}
                    </div>
                    <div className="text-stone-500 uppercase">{c.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. AMBIENTE 3 — ÁREA DO CLIENTE & AGENDAMENTO ONLINE WHITE-LABEL (Seções 1 e 6)
  if (viewType === 'client_portal') {
    const unitServices = services.filter(
      (s) => s.salonId === salon.id && s.onlineBookingAvailable
    );
    const chosenService =
      unitServices.find((s) => s.id === bookServiceId) || unitServices[0];

    const handleConfirmOnlineBooking = (e: React.FormEvent) => {
      e.preventDefault();
      if (!chosenService) return;
      const prof =
        bookProfId === 'qualquer'
          ? unitProfList[0]
          : unitProfList.find((p) => p.id === bookProfId) || unitProfList[0];
      if (!prof) return;

      const [h, m] = bookTime.split(':').map(Number);
      const endMin = (h || 0) * 60 + (m || 0) + chosenService.durationMinutes;
      const endH = String(Math.floor(endMin / 60)).padStart(2, '0');
      const endM = String(endMin % 60).padStart(2, '0');

      onCreateOnlineAppointment({
        salonId: salon.id,
        unitId: bookUnitId,
        clientId: 'cli-1',
        clientName: bookClientName,
        clientPhone: bookClientPhone,
        serviceId: chosenService.id,
        serviceName: chosenService.name,
        professionalId: prof.id,
        professionalName: prof.name,
        chairOrRoom: chosenService.resourceRequired || prof.chairLabel,
        date: bookDate,
        startTime: bookTime,
        endTime: `${endH}:${endM}`,
        durationMinutes: chosenService.durationMinutes,
        status: 'confirmado',
        paymentStatus: 'pendente',
        estimatedPrice: chosenService.basePrice,
        depositPaid: chosenService.depositRequired,
        depositDeductedInComanda: false,
        origin: 'Online',
        notes: 'Reserva realizada pela Página Pública de Agendamento do Cliente.',
      });

      setBookingConfirmedMsg(
        `Reserva Confirmada! ${chosenService.name} em ${bookDate} às ${bookTime} com ${prof.name}. Sinal Pix de ${formatBRL(
          chosenService.depositRequired
        )} vinculado para abatimento na comanda.`
      );
    };

    return (
      <div className="space-y-6">
        {/* Banner Institucional White-Label do Salão (Seção 6) */}
        <div
          style={{ backgroundColor: salon.theme.primaryColor }}
          className="rounded-3xl p-6 lg:p-8 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6"
        >
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-white/75">
              <Globe className="w-3.5 h-3.5" />
              <span>Página Pública Oficial · {salon.theme.publicDomain}</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
              {salon.commercialName} — Agendamento Online & Área do Cliente
            </h1>
            <p className="text-sm text-white/85">{salon.theme.institutionalMessage}</p>
            <div className="pt-1 text-xs text-white/75 flex flex-wrap items-center gap-3">
              <span>{salon.units[0]?.address}</span>
              <span>·</span>
              <span>{salon.units[0]?.openingHours}</span>
              <span>·</span>
              <span>WhatsApp {salon.units[0]?.phone}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white/10 p-1.5 rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => setClientTab('agendar')}
              className={`px-4 py-2 text-xs font-medium rounded-xl cursor-pointer whitespace-nowrap ${
                clientTab === 'agendar'
                  ? 'bg-white text-stone-900'
                  : 'text-white/85 hover:text-white'
              }`}
            >
              Reservar Novo Horário
            </button>
            <button
              type="button"
              onClick={() => setClientTab('meus_horarios')}
              className={`px-4 py-2 text-xs font-medium rounded-xl cursor-pointer whitespace-nowrap ${
                clientTab === 'meus_horarios'
                  ? 'bg-white text-stone-900'
                  : 'text-white/85 hover:text-white'
              }`}
            >
              Meus Horários, Pacotes & Créditos
            </button>
          </div>
        </div>

        {bookingConfirmedMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <span className="font-medium">{bookingConfirmedMsg}</span>
            <button
              type="button"
              onClick={() => setBookingConfirmedMsg(null)}
              className="underline cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {clientTab === 'agendar' ? (
          <form
            onSubmit={handleConfirmOnlineBooking}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-stone-200/80 space-y-5">
              <h2 className="text-xl font-semibold text-stone-900">
                Jornada de Agendamento Online (Passos 1 a 8 — Seção 6)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label htmlFor="bk-unit" className="block font-medium text-stone-700 mb-1">
                    1. Escolher Unidade
                  </label>
                  <select
                    id="bk-unit"
                    value={bookUnitId}
                    onChange={(e) => setBookUnitId(e.target.value)}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2.5 bg-white text-stone-900"
                  >
                    {salon.units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {u.address}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="bk-service" className="block font-medium text-stone-700 mb-1">
                    2. Escolher Serviço ou Ritual
                  </label>
                  <select
                    id="bk-service"
                    value={bookServiceId}
                    onChange={(e) => setBookServiceId(e.target.value)}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2.5 bg-white text-stone-900"
                  >
                    {unitServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.durationMinutes} min · {formatBRL(s.basePrice)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="bk-prof" className="block font-medium text-stone-700 mb-1">
                    3. Escolher Profissional ou “Qualquer Disponível”
                  </label>
                  <select
                    id="bk-prof"
                    value={bookProfId}
                    onChange={(e) => setBookProfId(e.target.value)}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2.5 bg-white text-stone-900"
                  >
                    <option value="qualquer">Qualquer profissional disponível no horário</option>
                    {unitProfList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.specialty}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="bk-date" className="block font-medium text-stone-700 mb-1">
                      4. Data
                    </label>
                    <input
                      id="bk-date"
                      type="date"
                      value={bookDate}
                      onChange={(e) => setBookDate(e.target.value)}
                      className="w-full border border-stone-300 rounded-xl px-3 py-2.5 font-mono-tabular bg-white text-stone-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="bk-time" className="block font-medium text-stone-700 mb-1">
                      Horário Livre
                    </label>
                    <select
                      id="bk-time"
                      value={bookTime}
                      onChange={(e) => setBookTime(e.target.value)}
                      className="w-full border border-stone-300 rounded-xl px-3 py-2.5 font-mono-tabular bg-white text-stone-900"
                    >
                      <option value="09:30">09:30</option>
                      <option value="10:30">10:30</option>
                      <option value="14:00">14:00</option>
                      <option value="16:30">16:30</option>
                      <option value="18:00">18:00</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="bk-name" className="block font-medium text-stone-700 mb-1">
                    5. Seu Nome Completo
                  </label>
                  <input
                    id="bk-name"
                    type="text"
                    required
                    value={bookClientName}
                    onChange={(e) => setBookClientName(e.target.value)}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2.5 bg-white text-stone-900"
                  />
                </div>

                <div>
                  <label htmlFor="bk-phone" className="block font-medium text-stone-700 mb-1">
                    WhatsApp para Confirmação e Lembrete
                  </label>
                  <input
                    id="bk-phone"
                    type="text"
                    required
                    value={bookClientPhone}
                    onChange={(e) => setBookClientPhone(e.target.value)}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2.5 font-mono-tabular bg-white text-stone-900"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 text-xs text-stone-600 space-y-1">
                <div className="font-semibold text-stone-900">
                  6. Política de Cancelamento & Avaliação Prévia do Estabelecimento:
                </div>
                <p>{salon.cancellationPolicy}</p>
                {chosenService?.priceType === 'a_partir_de' && (
                  <p className="text-amber-800 font-medium">
                    Aviso de Transparência (Seção 9): Este serviço possui valor “a partir de”. O orçamento definitivo é validado no diagnóstico presencial antes da execução.
                  </p>
                )}
              </div>
            </div>

            {/* Resumo da Reserva e Sinal Pix (Passos 6, 7 e 8) */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-stone-200/80 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-stone-900">
                  Resumo da Sua Reserva
                </h3>
                <div className="space-y-2 text-xs border-t border-stone-100 pt-3">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Serviço:</span>
                    <strong className="text-stone-900 text-right">{chosenService?.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Duração Estimada:</span>
                    <span className="font-mono-tabular text-stone-900">
                      {chosenService?.durationMinutes} minutos
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Valor Previsto:</span>
                    <span className="font-mono-tabular font-semibold text-stone-900">
                      {formatBRL(chosenService?.basePrice || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-medium pt-2 border-t border-stone-100">
                    <span>7. Sinal p/ Garantir Vaga:</span>
                    <span className="font-mono-tabular">
                      {formatBRL(chosenService?.depositRequired || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                style={{ backgroundColor: salon.theme.primaryColor }}
                className="w-full py-3 px-4 text-xs font-medium text-white rounded-xl hover:opacity-95 cursor-pointer"
              >
                8. Confirmar Agendamento Online
              </button>
            </div>
          </form>
        ) : (
          /* Aba Meus Horários, Pacotes, Créditos e Comprovantes do Cliente */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 space-y-3">
              <h2 className="text-lg font-semibold text-stone-900">
                Meus Próximos Horários & Histórico
              </h2>
              <div className="divide-y divide-stone-200/70 text-xs">
                {appointments
                  .filter((a) => a.salonId === salon.id)
                  .slice(0, 4)
                  .map((a) => (
                    <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-stone-900">{a.serviceName}</div>
                        <div className="text-stone-500 font-mono-tabular">
                          {a.date} às {a.startTime} · Prof: {a.professionalName}
                        </div>
                      </div>
                      <span className="font-medium text-emerald-800 uppercase">{a.status}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-stone-200/80 space-y-3">
              <h2 className="text-lg font-semibold text-stone-900">
                Meus Pacotes de Sessões, Créditos & Privacidade LGPD
              </h2>
              <div className="space-y-2.5 text-xs">
                {packages
                  .filter((p) => p.salonId === salon.id)
                  .map((pkg) => (
                    <div key={pkg.id} className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80">
                      <div className="font-semibold text-stone-900">{pkg.packageName}</div>
                      <div className="text-stone-600 mt-0.5 font-mono-tabular">
                        Saldo disponível: {pkg.totalSessions - pkg.usedSessions} de {pkg.totalSessions} sessões · Válido até {pkg.validUntil}
                      </div>
                    </div>
                  ))}
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                  <span>Crédito Interno Disponível (Camila Vasconcelos):</span>
                  <strong className="font-mono-tabular text-emerald-800">{formatBRL(120)}</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. AMBIENTE 4 — PAINEL ADMINISTRATIVO DA PLATAFORMA SAAS (Seções 1, 17 e 19)
  return (
    <div className="space-y-6">
      <div className="border-b border-stone-200/80 pb-5">
        <div className="text-xs text-stone-500 mb-1">
          Governança Multi-Tenant do Software · Cobrança SaaS Independente do Faturamento Operacional dos Salões
        </div>
        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-stone-900">
          Painel Administrativo da Plataforma (SaaS Super Admin)
        </h1>
        <p className="text-sm text-stone-600 mt-1">
          Cadastre novos salões assinantes, gerencie planos, acompanhe consumo de mensagens/armazenamento e audite isolamentos.
        </p>
      </div>

      {supportAccessLog && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-center justify-between">
          <span>{supportAccessLog}</span>
          <button
            type="button"
            onClick={() => setSupportAccessLog(null)}
            className="underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Formulário para Cadastrar Novo Salão Assinante na Plataforma (Seção 19) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newTenantName.trim()) return;
          onCreateNewTenantSalon(
            newTenantName.trim(),
            newTenantCnpj.trim() || '48.920.110/0001-99',
            newTenantPlan
          );
          setNewTenantName('');
          setNewTenantCnpj('');
        }}
        className="bg-white rounded-2xl p-5 border border-stone-200/80 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs"
      >
        <div>
          <label className="block text-stone-600 mb-1">Nome Comercial do Novo Salão</label>
          <input
            type="text"
            required
            placeholder="Ex: L’Atelier Botanique Curitiba"
            value={newTenantName}
            onChange={(e) => setNewTenantName(e.target.value)}
            className="w-full border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
          />
        </div>
        <div>
          <label className="block text-stone-600 mb-1">CNPJ da Empresa Assinante</label>
          <input
            type="text"
            placeholder="00.000.000/0001-00"
            value={newTenantCnpj}
            onChange={(e) => setNewTenantCnpj(e.target.value)}
            className="w-full border border-stone-300 rounded-xl px-3 py-2 font-mono-tabular text-stone-900"
          />
        </div>
        <div>
          <label className="block text-stone-600 mb-1">Plano Contratado</label>
          <select
            value={newTenantPlan}
            onChange={(e) => setNewTenantPlan(e.target.value as SalonTenant['plan'])}
            className="w-full border border-stone-300 rounded-xl px-3 py-2 bg-white text-stone-900"
          >
            <option value="Essencial">Plano Essencial (R$ 190/mês)</option>
            <option value="Signature">Plano Signature (R$ 390/mês)</option>
            <option value="Enterprise Multi-Unidades">Enterprise Multi-Unidades (R$ 690/mês)</option>
          </select>
        </div>
        <button
          type="submit"
          className="py-2 px-4 font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl cursor-pointer whitespace-nowrap"
        >
          + Provisionar Ambiente Isolado
        </button>
      </form>

      {/* Tabela de Salões Assinantes da Plataforma */}
      <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200/80 bg-stone-50/70 text-stone-500">
                <th className="py-3 px-4 font-medium">Salão Assinante & CNPJ</th>
                <th className="py-3 px-4 font-medium">Identidade White-Label</th>
                <th className="py-3 px-4 font-medium">Plano & Mensalidade SaaS</th>
                <th className="py-3 px-4 font-medium">Consumo Mensagens / Storage</th>
                <th className="py-3 px-4 font-medium">Status Contratual</th>
                <th className="py-3 px-4 font-medium text-right">Governança</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/70">
              {allSalons.map((t) => (
                <tr key={t.id} className="hover:bg-stone-50/60">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-stone-900">{t.commercialName}</div>
                    <div className="text-stone-500 font-mono-tabular">
                      {t.cnpj} · {t.units.length} unidade(s)
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        style={{ backgroundColor: t.theme.primaryColor }}
                        className="w-4 h-4 rounded border border-stone-300 inline-block"
                      />
                      <span
                        style={{ backgroundColor: t.theme.accentColor }}
                        className="w-4 h-4 rounded border border-stone-300 inline-block"
                      />
                      <span className="font-mono-tabular text-stone-600">
                        {t.theme.publicDomain}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-stone-900">{t.plan}</div>
                    <div className="text-stone-500 font-mono-tabular">
                      {formatBRL(t.monthlyFee)}/mês
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular">
                    <div className="text-stone-800">
                      {t.messageQuotaUsed} / {t.messageQuotaLimit} msgs
                    </div>
                    <div className="text-stone-500">{t.storageUsedGb} GB arquivos</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`font-semibold uppercase ${
                        t.status === 'ativo' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onSwitchActiveSalon(t.id);
                          setSupportAccessLog(
                            `Sessão de suporte temporário auditado iniciada no ambiente "${t.commercialName}" (expira em 30 min — Seção 18).`
                          );
                        }}
                        className="px-2.5 py-1.5 font-medium text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer"
                      >
                        Alternar p/ este Salão
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleTenantStatus(t.id)}
                        className="px-2.5 py-1.5 text-stone-600 hover:text-stone-900 underline cursor-pointer"
                      >
                        {t.status === 'ativo' ? 'Suspender' : 'Reativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
