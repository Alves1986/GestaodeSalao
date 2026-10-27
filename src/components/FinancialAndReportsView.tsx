import React, { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  FileText,
  Lock,
  MessageSquare,
  Plus,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Truck,
  Unlock,
  Wallet,
} from 'lucide-react';
import {
  Appointment,
  AutomationRule,
  CashSession,
  ClientProfile,
  Comanda,
  CommissionRecord,
  FinancialEntry,
  ProductStock,
  SalonMenuId,
  SalonTenant,
  SupplierOrder,
} from '../types/salon';
import { calculateCashSessionSummary, calculateComandaTotals } from '../utils/salonRules';

interface FinancialAndReportsViewProps {
  activeMenu: Extract<SalonMenuId, 'financeiro' | 'compras' | 'marketing' | 'relatorios'>;
  salon: SalonTenant;
  cashSession: CashSession;
  financialEntries: FinancialEntry[];
  supplierOrders: SupplierOrder[];
  automations: AutomationRule[];
  comandas: Comanda[];
  appointments: Appointment[];
  commissions: CommissionRecord[];
  products: ProductStock[];
  clients: ClientProfile[];
  onAddCashMovement: (
    type: 'suprimento' | 'sangria' | 'despesa_caixa',
    amount: number,
    description: string
  ) => void;
  onCloseOrReopenCashSession: (informedCash: number, divergenceNote: string) => void;
  onCreateFinancialEntry: (entry: Omit<FinancialEntry, 'id'>) => void;
  onSettleFinancialEntry: (entryId: string) => void;
  onReceiveSupplierOrder: (orderId: string) => void;
  onCreateSupplierOrder: (
    supplierName: string,
    itemsSummary: string,
    totalAmount: number
  ) => void;
  onToggleAutomation: (automationId: string) => void;
  onTriggerCampaignDispatch: (ruleId: string) => void;
}

export const FinancialAndReportsView: React.FC<FinancialAndReportsViewProps> = ({
  activeMenu,
  salon,
  cashSession,
  financialEntries,
  supplierOrders,
  automations,
  comandas,
  appointments,
  commissions,
  products,
  clients,
  onAddCashMovement,
  onCloseOrReopenCashSession,
  onCreateFinancialEntry,
  onSettleFinancialEntry,
  onReceiveSupplierOrder,
  onCreateSupplierOrder,
  onToggleAutomation,
  onTriggerCampaignDispatch,
}) => {
  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Financial Sub-tabs
  const [finTab, setFinTab] = useState<'caixa' | 'pagar_receber' | 'conciliacao_dre'>('caixa');
  const [cashMovType, setCashMovType] = useState<'suprimento' | 'sangria' | 'despesa_caixa'>('sangria');
  const [cashMovAmount, setCashMovAmount] = useState('100');
  const [cashMovDesc, setCashMovDesc] = useState('Sangria para cofre');
  const [informedClosingInput, setInformedClosingInput] = useState('');
  const [divergenceReason, setDivergenceReason] = useState('');

  // Payable/Receivable creation
  const [entryType, setEntryType] = useState<'pagar' | 'receber'>('pagar');
  const [entryCategory, setEntryCategory] = useState<FinancialEntry['category']>('Fornecedores');
  const [entryDesc, setEntryDesc] = useState('');
  const [entryEntity, setEntryEntity] = useState('');
  const [entryAmount, setEntryAmount] = useState('450');

  // Supplier order state
  const [supName, setSupName] = useState('L’Oréal Professionnel Divisão Salões');
  const [supSummary, setSupSummary] = useState('15x Blond Studio 9 + 20x Tonalizante Dia Light');
  const [supAmount, setSupAmount] = useState('2490');

  // Marketing dispatch feedback
  const [campaignFeedback, setCampaignFeedback] = useState<string | null>(null);

  // Reports date basis (Seção 11.6 e 16: venda, execução, vencimento ou recebimento)
  const [reportDateBasis, setReportDateBasis] = useState<
    'execucao' | 'venda' | 'recebimento' | 'vencimento'
  >('execucao');

  const unitEntries = financialEntries.filter((f) => f.salonId === salon.id);
  const cashSummary = calculateCashSessionSummary(cashSession);

  // 1. MÓDULO FINANCEIRO, CAIXA DIÁRIO E FATURAMENTO (Seção 11)
  if (activeMenu === 'financeiro') {
    const receivables = unitEntries.filter((e) => e.type === 'receber');
    const payables = unitEntries.filter((e) => e.type === 'pagar');

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-stone-200/80 pb-5">
          <div>
            <div className="text-xs text-stone-500 mb-1">
              Separação Estrita entre Vendas, Recebimentos, Recebíveis, Despesas & Dinheiro Físico
            </div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-stone-900">
              Financeiro, Sessão de Caixa & DRE Gerencial
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Seção 11.1: O saldo físico em dinheiro na gaveta nunca é confundido com vendas liquidadas em Pix ou cartão.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-stone-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFinTab('caixa')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap ${
                finTab === 'caixa'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Caixa Diário (#cx-26)
            </button>
            <button
              type="button"
              onClick={() => setFinTab('pagar_receber')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap ${
                finTab === 'pagar_receber'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Contas a Pagar & Receber
            </button>
            <button
              type="button"
              onClick={() => setFinTab('conciliacao_dre')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap ${
                finTab === 'conciliacao_dre'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Recebíveis & Demonstrativo
            </button>
          </div>
        </div>

        {finTab === 'caixa' && (
          <div className="space-y-6">
            {/* Cartões de Síntese do Caixa Diário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-stone-200/80">
                <div className="text-xs text-stone-500">Fundo Inicial (Abertura 08:30)</div>
                <div className="text-2xl font-semibold font-mono-tabular text-stone-900 mt-1">
                  {formatBRL(cashSession.openingBalanceCash)}
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  Operador: {cashSession.operatorName}
                </div>
              </div>

              <div
                style={{ backgroundColor: salon.theme.primaryColor }}
                className="rounded-2xl p-5 text-white"
              >
                <div className="text-xs text-white/80">Saldo Físico Esperado em Espécie</div>
                <div className="text-2xl font-semibold font-mono-tabular mt-1">
                  {formatBRL(cashSummary.expectedPhysicalCash)}
                </div>
                <div className="text-xs text-white/80 mt-1">
                  Somente cédulas na gaveta (Abertura + Dinheiro - Sangrias)
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-stone-200/80">
                <div className="text-xs text-stone-500">Recebimentos Digitais (Pix / Cartões)</div>
                <div className="text-2xl font-semibold font-mono-tabular text-emerald-800 mt-1">
                  {formatBRL(cashSummary.digitalReceiptsTotal)}
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  Liquidados direto na conta bancária / adquirente
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-stone-200/80">
                <div className="text-xs text-stone-500">Saídas da Gaveta (Sangria + Despesas)</div>
                <div className="text-2xl font-semibold font-mono-tabular text-rose-700 mt-1">
                  {formatBRL(cashSummary.sangriasTotal + cashSummary.expensesCashTotal)}
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  Status da sessão: <strong>{cashSession.status.toUpperCase()}</strong>
                </div>
              </div>
            </div>

            {/* Suprimento, Sangria e Fechamento Auditado (Regra 9 - Seção 21) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-stone-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-stone-900">
                    Movimentações da Sessão de Caixa
                  </h2>
                  <span className="text-xs text-stone-500 font-mono-tabular">
                    {cashSession.movements.length} lançamentos
                  </span>
                </div>

                {cashSession.status === 'aberto' && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const val = Number(cashMovAmount);
                      if (!val || val <= 0) return;
                      onAddCashMovement(cashMovType, val, cashMovDesc);
                      setCashMovDesc('');
                    }}
                    className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 text-xs"
                  >
                    <select
                      aria-label="Tipo de movimento de caixa"
                      value={cashMovType}
                      onChange={(e) =>
                        setCashMovType(
                          e.target.value as 'suprimento' | 'sangria' | 'despesa_caixa'
                        )
                      }
                      className="border border-stone-300 rounded-lg px-2.5 py-2 bg-white text-stone-900"
                    >
                      <option value="sangria">Sangria (Retirada Cofre)</option>
                      <option value="suprimento">Suprimento (Reforço Troco)</option>
                      <option value="despesa_caixa">Despesa Paga pelo Caixa</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={cashMovAmount}
                      onChange={(e) => setCashMovAmount(e.target.value)}
                      placeholder="Valor R$"
                      className="border border-stone-300 rounded-lg px-2.5 py-2 font-mono-tabular bg-white text-stone-900"
                    />
                    <input
                      type="text"
                      required
                      value={cashMovDesc}
                      onChange={(e) => setCashMovDesc(e.target.value)}
                      placeholder="Justificativa / descrição..."
                      className="border border-stone-300 rounded-lg px-2.5 py-2 bg-white text-stone-900"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      Lançar no Caixa
                    </button>
                  </form>
                )}

                <div className="divide-y divide-stone-200/70 text-xs">
                  {cashSession.movements.map((mov) => (
                    <div key={mov.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-stone-900">{mov.description}</div>
                        <div className="text-stone-500">
                          {mov.timestamp} · Meio: {mov.paymentMethod.toUpperCase()} · {mov.operatorName}
                        </div>
                      </div>
                      <div
                        className={`font-mono-tabular font-semibold ${
                          mov.type === 'sangria' || mov.type === 'despesa_caixa'
                            ? 'text-rose-700'
                            : 'text-emerald-800'
                        }`}
                      >
                        {mov.type === 'sangria' || mov.type === 'despesa_caixa' ? '-' : '+'}
                        {formatBRL(mov.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conferência de Fechamento e Reabertura Auditada (Seção 11.1 e Regra 9) */}
              <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-stone-200/80 space-y-4">
                <h2 className="text-lg font-semibold text-stone-900">
                  Conferência de Fechamento de Turno
                </h2>
                <p className="text-xs text-stone-600">
                  Regra 9 (Seção 21): Caixa fechado bloqueia novos lançamentos e exige autorização e registro em auditoria para reabertura.
                </p>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-600">Valor Físico Esperado (Sistema):</span>
                    <strong className="font-mono-tabular text-stone-900">
                      {formatBRL(cashSummary.expectedPhysicalCash)}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <label htmlFor="cash-informed" className="text-stone-600">
                      Valor Físico Contado na Gaveta (R$):
                    </label>
                    <input
                      id="cash-informed"
                      type="number"
                      placeholder={String(cashSummary.expectedPhysicalCash)}
                      value={informedClosingInput}
                      onChange={(e) => setInformedClosingInput(e.target.value)}
                      className="w-28 text-right font-mono-tabular border border-stone-300 rounded px-2 py-1 bg-white text-stone-900"
                    />
                  </div>
                  {informedClosingInput !== '' && (
                    <div className="flex justify-between pt-1 border-t border-stone-200">
                      <span className="text-stone-600">Divergência Apurada:</span>
                      <strong
                        className={`font-mono-tabular ${
                          Number(informedClosingInput) - cashSummary.expectedPhysicalCash === 0
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {formatBRL(
                          Number(informedClosingInput) - cashSummary.expectedPhysicalCash
                        )}
                      </strong>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Observação de conferência ou justificativa de divergência / reabertura..."
                  value={divergenceReason}
                  onChange={(e) => setDivergenceReason(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900"
                />

                <button
                  type="button"
                  onClick={() =>
                    onCloseOrReopenCashSession(
                      informedClosingInput !== ''
                        ? Number(informedClosingInput)
                        : cashSummary.expectedPhysicalCash,
                      divergenceReason
                    )
                  }
                  style={{ backgroundColor: salon.theme.primaryColor }}
                  className="w-full py-2.5 px-4 text-xs font-medium text-white rounded-xl hover:opacity-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  {cashSession.status === 'aberto' ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Fechar Sessão de Caixa & Gerar Termo de Conferência</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Reabrir Caixa com Registro de Auditoria (Regra 9)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {finTab === 'pagar_receber' && (
          <div className="space-y-6">
            {/* Formulário de Nova Conta a Pagar ou Receber */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!entryDesc.trim()) return;
                const val = Number(entryAmount) || 0;
                onCreateFinancialEntry({
                  salonId: salon.id,
                  unitId: salon.units[0]?.id || 'unit-1',
                  type: entryType,
                  category: entryCategory,
                  description: entryDesc.trim(),
                  entityName: entryEntity.trim() || 'Fornecedor / Parceiro',
                  dueDate: '2026-10-30',
                  competenceDate: '2026-10-26',
                  grossAmount: val,
                  feeAmount: 0,
                  netAmount: val,
                  paidAmount: 0,
                  status: 'pendente',
                  paymentMethod: 'pix',
                });
                setEntryDesc('');
                setEntryEntity('');
              }}
              className="bg-white rounded-2xl p-5 border border-stone-200/80 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end text-xs"
            >
              <div>
                <label className="block text-stone-600 mb-1">Natureza</label>
                <select
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value as 'pagar' | 'receber')}
                  className="w-full border border-stone-300 rounded-xl px-2.5 py-2 bg-white text-stone-900"
                >
                  <option value="pagar">Conta a Pagar (Despesa)</option>
                  <option value="receber">Conta a Receber</option>
                </select>
              </div>
              <div>
                <label className="block text-stone-600 mb-1">Centro de Custo</label>
                <select
                  value={entryCategory}
                  onChange={(e) => setEntryCategory(e.target.value as FinancialEntry['category'])}
                  className="w-full border border-stone-300 rounded-xl px-2.5 py-2 bg-white text-stone-900"
                >
                  <option value="Fornecedores">Fornecedores</option>
                  <option value="Aluguel & Ocupação">Aluguel & Ocupação</option>
                  <option value="Energia, Água & Internet">Energia, Água & Internet</option>
                  <option value="Comissões">Comissões</option>
                  <option value="Tributos">Tributos</option>
                  <option value="Pró-labore">Pró-labore</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-stone-600 mb-1">Descrição do Lançamento</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Compra toalhas egípcias / Manutenção climatização"
                  value={entryDesc}
                  onChange={(e) => setEntryDesc(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
                />
              </div>
              <div>
                <label className="block text-stone-600 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 font-mono-tabular text-stone-900"
                />
              </div>
              <button
                type="submit"
                style={{ backgroundColor: salon.theme.primaryColor }}
                className="py-2 px-4 font-medium text-white rounded-xl cursor-pointer whitespace-nowrap"
              >
                Registrar Conta
              </button>
            </form>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contas a Receber */}
              <div className="bg-white rounded-2xl p-5 border border-stone-200/80 space-y-3">
                <h2 className="text-lg font-semibold text-stone-900">
                  Contas a Receber & Comandas em Aberto ({receivables.length})
                </h2>
                <div className="divide-y divide-stone-200/70 text-xs">
                  {receivables.map((r) => (
                    <div key={r.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-stone-900">{r.description}</div>
                        <div className="text-stone-500">
                          {r.entityName} · Venc: {r.dueDate} · Status: {r.status.toUpperCase()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono-tabular">
                          <div className="font-semibold text-stone-900">
                            {formatBRL(r.grossAmount)}
                          </div>
                          <div className="text-stone-500">Líq: {formatBRL(r.netAmount)}</div>
                        </div>
                        {r.status !== 'liquidado' && (
                          <button
                            type="button"
                            onClick={() => onSettleFinancialEntry(r.id)}
                            className="px-2.5 py-1.5 font-medium text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer"
                          >
                            Dar Baixa
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contas a Pagar */}
              <div className="bg-white rounded-2xl p-5 border border-stone-200/80 space-y-3">
                <h2 className="text-lg font-semibold text-stone-900">
                  Contas a Pagar por Centro de Custo ({payables.length})
                </h2>
                <div className="divide-y divide-stone-200/70 text-xs">
                  {payables.map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-stone-900">{p.description}</div>
                        <div className="text-stone-500">
                          {p.category} · {p.entityName} · Venc: {p.dueDate}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono-tabular">
                          <div className="font-semibold text-rose-800">
                            {formatBRL(p.grossAmount)}
                          </div>
                          <div className="text-stone-500 uppercase">{p.status}</div>
                        </div>
                        {p.status !== 'liquidado' && (
                          <button
                            type="button"
                            onClick={() => onSettleFinancialEntry(p.id)}
                            className="px-2.5 py-1.5 font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg cursor-pointer"
                          >
                            Aprovar & Pagar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {finTab === 'conciliacao_dre' && (
          <div className="bg-white rounded-2xl p-5 border border-stone-200/80 space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-stone-900">
                Demonstrativo Gerencial de Resultado & Conciliação de Taxas (Outubro 2026)
              </h2>
              <p className="text-xs text-stone-500">
                Seção 11.6: Este demonstrativo gerencial apoia a tomada de decisão dos sócios e não substitui a escrituração contábil formal.
              </p>
            </div>

            <div className="divide-y divide-stone-200/70 text-xs max-w-3xl">
              <div className="py-2.5 flex justify-between font-semibold text-stone-900">
                <span>(+) Receita Bruta Operacional (Serviços + Revenda Home Care)</span>
                <span className="font-mono-tabular">{formatBRL(68420)}</span>
              </div>
              <div className="py-2.5 flex justify-between text-stone-600">
                <span>(-) Descontos Concedidos & Taxas de Adquireência (Pix / Cartões)</span>
                <span className="font-mono-tabular text-rose-700">- {formatBRL(1940)}</span>
              </div>
              <div className="py-2.5 flex justify-between font-medium text-stone-900">
                <span>(=) Receita Líquida Conciliada</span>
                <span className="font-mono-tabular">{formatBRL(66480)}</span>
              </div>
              <div className="py-2.5 flex justify-between text-stone-600">
                <span>(-) Repasses de Comissões Profissionais & Auxiliares</span>
                <span className="font-mono-tabular text-rose-700">- {formatBRL(26800)}</span>
              </div>
              <div className="py-2.5 flex justify-between text-stone-600">
                <span>(-) Custo de Mercadoria Vendida e Consumo Técnico Fracionado (Backbar)</span>
                <span className="font-mono-tabular text-rose-700">- {formatBRL(6420)}</span>
              </div>
              <div className="py-2.5 flex justify-between text-stone-600">
                <span>(-) Despesas Fixas (Aluguel, Energia, Água, Sistemas)</span>
                <span className="font-mono-tabular text-rose-700">- {formatBRL(15840)}</span>
              </div>
              <div className="py-3 flex justify-between text-base font-semibold text-emerald-900">
                <span>(=) Resultado Operacional Gerencial (EBITDA Salão)</span>
                <span className="font-mono-tabular">{formatBRL(17420)} (25,4%)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. MÓDULO COMPRAS E FORNECEDORES (Seção 13)
  if (activeMenu === 'compras') {
    const unitOrders = supplierOrders.filter((o) => o.salonId === salon.id);
    return (
      <div className="space-y-6">
        <div className="border-b border-stone-200/80 pb-5">
          <div className="text-xs text-stone-500 mb-1">
            Reposição de Insumos, Recebimento de Mercadorias & Integração Automática com Contas a Pagar
          </div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-stone-900">
            Compras & Fornecedores Homologados
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Receber um pedido atualiza o estoque automaticamente e gera o lançamento correspondente no Contas a Pagar (Seção 13).
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onCreateSupplierOrder(supName, supSummary, Number(supAmount) || 1500);
          }}
          className="bg-white rounded-2xl p-5 border border-stone-200/80 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs"
        >
          <div>
            <label className="block text-stone-600 mb-1">Fornecedor</label>
            <input
              type="text"
              required
              value={supName}
              onChange={(e) => setSupName(e.target.value)}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-stone-600 mb-1">Itens Solicitados</label>
            <input
              type="text"
              required
              value={supSummary}
              onChange={(e) => setSupSummary(e.target.value)}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
            />
          </div>
          <div>
            <label className="block text-stone-600 mb-1">Valor do Pedido (R$)</label>
            <input
              type="number"
              value={supAmount}
              onChange={(e) => setSupAmount(e.target.value)}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 font-mono-tabular text-stone-900"
            />
          </div>
          <button
            type="submit"
            style={{ backgroundColor: salon.theme.primaryColor }}
            className="py-2 px-4 font-medium text-white rounded-xl cursor-pointer whitespace-nowrap"
          >
            Emitir Pedido de Compra
          </button>
        </form>

        <div className="space-y-3">
          {unitOrders.map((ord) => (
            <div
              key={ord.id}
              className="bg-white rounded-2xl p-5 border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="text-xs text-stone-500 font-mono-tabular">
                  Pedido #{ord.id} · Emitido em {ord.createdAt} · Previsão {ord.expectedDelivery}
                </div>
                <h2 className="text-base font-semibold text-stone-900">
                  {ord.supplierName} ({ord.cnpj})
                </h2>
                <p className="text-xs text-stone-600">{ord.itemsSummary}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right font-mono-tabular">
                  <div className="text-sm font-semibold text-stone-900">
                    {formatBRL(ord.totalAmount)}
                  </div>
                  <div className="text-xs text-stone-500 uppercase">
                    {ord.status.replace('_', ' ')}
                  </div>
                </div>
                {ord.status !== 'recebido_integral' && (
                  <button
                    type="button"
                    onClick={() => onReceiveSupplierOrder(ord.id)}
                    style={{ backgroundColor: salon.theme.primaryColor }}
                    className="px-3.5 py-2 text-xs font-medium text-white rounded-xl hover:opacity-95 cursor-pointer whitespace-nowrap"
                  >
                    Confirmar Recebimento NF
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. MÓDULO MARKETING E AUTOMAÇÕES (Seção 15)
  if (activeMenu === 'marketing') {
    const unitAutos = automations.filter((a) => a.salonId === salon.id);
    return (
      <div className="space-y-6">
        <div className="border-b border-stone-200/80 pb-5">
          <div className="text-xs text-stone-500 mb-1">
            Réguas Operacionais WhatsApp, Lembretes de Retorno, Lista de Espera & Pós-Atendimento
          </div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-stone-900">
            Comunicação & Automações de Relacionamento
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Gatilhos configuráveis com respeito ao opt-in LGPD do cliente e controle de franquia de mensagens.
          </p>
        </div>

        {campaignFeedback && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <span>{campaignFeedback}</span>
            <button
              type="button"
              onClick={() => setCampaignFeedback(null)}
              className="underline cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {unitAutos.map((rule) => (
            <div
              key={rule.id}
              className="bg-white rounded-2xl p-5 border border-stone-200/80 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>
                    {rule.channel} · {rule.category.toUpperCase()}
                  </span>
                  <span className="font-mono-tabular">
                    {rule.sentCountMonth} envios/mês · Entrega {rule.deliveryRatePct}%
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-stone-900">{rule.name}</h2>
                <p className="text-xs text-stone-500">Gatilho: {rule.triggerDescription}</p>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 text-xs text-stone-700 font-mono">
                  {rule.templateText}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => onToggleAutomation(rule.id)}
                  className={`font-medium cursor-pointer ${
                    rule.active ? 'text-emerald-700' : 'text-stone-400'
                  }`}
                >
                  {rule.active ? '● Regra Ativa (Pausar)' : '○ Regra Pausada (Ativar)'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTriggerCampaignDispatch(rule.id);
                    setCampaignFeedback(
                      `Disparo imediato da régua "${rule.name}" processado para os clientes elegíveis com opt-in ativo.`
                    );
                  }}
                  className="px-3 py-1.5 font-medium text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer"
                >
                  Testar Disparo Agora
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. MÓDULO RELATÓRIOS E INDICADORES AUDITÁVEIS (Seção 16)
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-stone-200/80 pb-5">
        <div>
          <div className="text-xs text-stone-500 mb-1">
            Rastreabilidade até a Operação de Origem · Seção 11.6 e 16
          </div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-stone-900">
            Relatórios & Indicadores de Desempenho
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Selecione o critério de data utilizado na apuração: Execução do Serviço, Venda, Vencimento ou Recebimento Efetivo.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-stone-200/70 p-1 rounded-xl">
          {(['execucao', 'venda', 'recebimento', 'vencimento'] as const).map((basis) => (
            <button
              key={basis}
              type="button"
              onClick={() => setReportDateBasis(basis)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer uppercase whitespace-nowrap ${
                reportDateBasis === basis
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Data: {basis}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80">
          <div className="text-xs text-stone-500">Ocupação da Agenda Técnica</div>
          <div className="text-2xl font-semibold font-mono-tabular text-stone-900 mt-1">
            78,4%
          </div>
          <div className="text-xs text-stone-500 mt-1">
            142h utilizadas de 181h disponíveis ({reportDateBasis})
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80">
          <div className="text-xs text-stone-500">Taxa de Retorno & Recorrência</div>
          <div className="text-2xl font-semibold font-mono-tabular text-stone-900 mt-1">
            84,0%
          </div>
          <div className="text-xs text-emerald-700 mt-1">
            Frequência média: a cada 34 dias
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80">
          <div className="text-xs text-stone-500">Margem Técnica Média s/ Serviços</div>
          <div className="text-2xl font-semibold font-mono-tabular text-stone-900 mt-1">
            46,2%
          </div>
          <div className="text-xs text-stone-500 mt-1">
            Descontados insumos em g/ml e comissão
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80">
          <div className="text-xs text-stone-500">Valor Atualizado de Estoque</div>
          <div className="text-2xl font-semibold font-mono-tabular text-stone-900 mt-1">
            {formatBRL(
              products
                .filter((p) => p.salonId === salon.id)
                .reduce((acc, p) => acc + p.currentStock * p.costPrice, 0)
            )}
          </div>
          <div className="text-xs text-stone-500 mt-1">Custo médio ponderado auditado</div>
        </div>
      </div>

      {/* Trilha Auditável de Comandas e Operações de Origem (Critério de Aceite Seção 25) */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              Conferência Analítica até a Operação de Origem (Regime: {reportDateBasis.toUpperCase()})
            </h2>
            <p className="text-xs text-stone-500">
              Cada linha explica o valor bruto, sinal abatido, comissão gerada e documento fiscal vinculado
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200/80 bg-stone-50/70 text-stone-500">
                <th className="py-2.5 px-3 font-medium">Comanda Origem</th>
                <th className="py-2.5 px-3 font-medium">Cliente</th>
                <th className="py-2.5 px-3 font-medium">Estado Atendimento</th>
                <th className="py-2.5 px-3 font-medium text-right">Bruto Itens</th>
                <th className="py-2.5 px-3 font-medium text-right">Sinal Abatido</th>
                <th className="py-2.5 px-3 font-medium text-right">Pago no Caixa</th>
                <th className="py-2.5 px-3 font-medium text-right">Pendente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/70">
              {comandas
                .filter((c) => c.salonId === salon.id)
                .map((c) => {
                  const t = calculateComandaTotals(c);
                  return (
                    <tr key={c.id}>
                      <td className="py-2.5 px-3 font-mono-tabular font-semibold text-stone-900">
                        #{c.number} ({c.openedAt})
                      </td>
                      <td className="py-2.5 px-3 text-stone-800">{c.clientName}</td>
                      <td className="py-2.5 px-3 uppercase text-stone-600">
                        {c.attendanceStatus}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular">
                        {formatBRL(t.activeItemsTotal)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular text-emerald-700">
                        {formatBRL(t.depositDeducted)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular font-semibold text-stone-900">
                        {formatBRL(t.totalPaid)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular text-amber-800">
                        {formatBRL(t.remainingBalance)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
