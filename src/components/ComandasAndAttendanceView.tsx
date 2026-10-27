import React, { useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  FileCheck2,
  FileText,
  Lock,
  Plus,
  Printer,
  Receipt,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserPlus,
} from 'lucide-react';
import {
  ClientProfile,
  Comanda,
  ComandaItem,
  PaymentMethod,
  ProductStock,
  Professional,
  SalonService,
  SalonTenant,
  TechnicalRecord,
} from '../types/salon';
import { calculateComandaTotals, calculateItemCommission } from '../utils/salonRules';

interface ComandasAndAttendanceViewProps {
  salon: SalonTenant;
  comandas: Comanda[];
  selectedComandaId: string | null;
  onSelectComanda: (id: string) => void;
  services: SalonService[];
  products: ProductStock[];
  professionals: Professional[];
  clients: ClientProfile[];
  technicalRecords: TechnicalRecord[];
  onAddComandaItem: (comandaId: string, item: Omit<ComandaItem, 'id'>) => void;
  onCancelComandaItem: (comandaId: string, itemId: string, reason: string) => void;
  onUpdateComandaAdjustments: (
    comandaId: string,
    globalDiscount: number,
    tipAmount: number
  ) => void;
  onFinishAttendanceOnly: (comandaId: string) => void;
  onRegisterPayment: (
    comandaId: string,
    method: PaymentMethod,
    amount: number,
    installments: number,
    payerLabel: string
  ) => void;
  onIssueNfse: (comandaId: string) => void;
  onCreateStandaloneComanda: (clientId: string) => void;
  onAddTechnicalRecord: (record: Omit<TechnicalRecord, 'id'>) => void;
}

export const ComandasAndAttendanceView: React.FC<ComandasAndAttendanceViewProps> = ({
  salon,
  comandas,
  selectedComandaId,
  onSelectComanda,
  services,
  products,
  professionals,
  clients,
  technicalRecords,
  onAddComandaItem,
  onCancelComandaItem,
  onUpdateComandaAdjustments,
  onFinishAttendanceOnly,
  onRegisterPayment,
  onIssueNfse,
  onCreateStandaloneComanda,
  onAddTechnicalRecord,
}) => {
  const unitComandas = comandas.filter((c) => c.salonId === salon.id);
  const activeComanda =
    unitComandas.find((c) => c.id === selectedComandaId) || unitComandas[0] || null;

  const [activeSubTab, setActiveSubTab] = useState<'comanda' | 'ficha_tecnica'>('comanda');

  // Add item form state
  const [itemType, setItemType] = useState<'servico' | 'produto'>('produto');
  const [selectedRefId, setSelectedRefId] = useState(products[3]?.id || products[0]?.id || '');
  const [selectedProfId, setSelectedProfId] = useState(professionals[0]?.id || '');
  const [selectedAssistantId, setSelectedAssistantId] = useState('');
  const [itemQty, setItemQty] = useState(1);

  // Payment allocation state (Seção 10: suporta divisão entre pessoas e múltiplos meios)
  const [payMethod, setPayMethod] = useState<PaymentMethod>('pix');
  const [payAmountInput, setPayAmountInput] = useState('');
  const [payInstallments, setPayInstallments] = useState(1);
  const [payerLabel, setPayerLabel] = useState('Titular da Comanda');
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // New standalone comanda client selector
  const [newComandaClientId, setNewComandaClientId] = useState(clients[0]?.id || '');

  // Technical record form state (Seção 7 - Ficha Técnica + LGPD)
  const [templateType, setTemplateType] = useState<'coloracao' | 'tratamento' | 'manicure' | 'estetica'>('coloracao');
  const [formulaText, setFormulaText] = useState('');
  const [actionTime, setActionTime] = useState(40);
  const [productsNotes, setProductsNotes] = useState('');
  const [healthAllergies, setHealthAllergies] = useState('');
  const [lgpdConsent, setLgpdConsent] = useState(true);
  const [showSensitiveHealthData, setShowSensitiveHealthData] = useState(false);

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (!activeComanda) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-stone-200 text-center space-y-3">
        <h2 className="text-xl font-semibold text-stone-900">Nenhuma Comanda Encontrada</h2>
        <p className="text-xs text-stone-500">Abra uma comanda avulsa ou inicie um atendimento pela Agenda.</p>
      </div>
    );
  }

  const totals = calculateComandaTotals(activeComanda);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const prof = professionals.find((p) => p.id === selectedProfId) || professionals[0];
    if (!prof) return;

    if (itemType === 'servico') {
      const srv = services.find((s) => s.id === selectedRefId) || services[0];
      if (!srv) return;
      onAddComandaItem(activeComanda.id, {
        type: 'servico',
        referenceId: srv.id,
        name: srv.name,
        professionalId: prof.id,
        professionalName: prof.name,
        assistantProfessionalId: selectedAssistantId || undefined,
        quantity: itemQty,
        unitPrice: srv.basePrice,
        discount: 0,
        commissionPct: srv.defaultCommissionPct,
        cancelled: false,
      });
    } else {
      const prd = products.find((p) => p.id === selectedRefId) || products[0];
      if (!prd) return;
      onAddComandaItem(activeComanda.id, {
        type: 'produto',
        referenceId: prd.id,
        name: prd.name,
        professionalId: prof.id,
        professionalName: prof.name,
        quantity: itemQty,
        unitPrice: prd.salePrice || Math.round(prd.costPrice * 2),
        discount: 0,
        commissionPct: prd.saleCommissionPct || prof.commissionProductPct,
        cancelled: false,
      });
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountToPay =
      payAmountInput.trim() !== ''
        ? Number(payAmountInput)
        : totals.remainingBalance;

    if (amountToPay <= 0) return;

    onRegisterPayment(
      activeComanda.id,
      payMethod,
      amountToPay,
      payInstallments,
      payerLabel || activeComanda.clientName
    );
    setPayAmountInput('');
  };

  const handleCreateTechRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formulaText.trim()) return;
    onAddTechnicalRecord({
      clientId: activeComanda.clientId,
      appointmentId: activeComanda.appointmentId || activeComanda.id,
      date: '2026-10-26',
      professionalName: professionals[0]?.name || 'Valentina Moretti',
      templateType,
      formulaOrProtocol: formulaText,
      actionTimeMinutes: actionTime,
      productsUsedNotes: productsNotes || 'Consumo padrão registrado no estoque técnico.',
      healthAllergiesSensitive: healthAllergies || 'Nenhuma restrição relatada.',
      lgpdConsentSigned: lgpdConsent,
    });
    setFormulaText('');
    setProductsNotes('');
    setHealthAllergies('');
  };

  const clientTechRecords = technicalRecords.filter(
    (tr) => tr.clientId === activeComanda.clientId
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-stone-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
            <span>Gestão de Consumo, Fichas Técnicas & Liquidação</span>
            <span aria-hidden="true">·</span>
            <span>{salon.commercialName}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-stone-900">
            Atendimentos, Comandas & Fichas Técnicas
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Finalizar atendimento, fechar comanda e liquidar pagamento são ações distintas e auditadas (Seção 10).
          </p>
        </div>

        {/* Abrir venda avulsa */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Selecionar cliente para venda avulsa"
            value={newComandaClientId}
            onChange={(e) => setNewComandaClientId(e.target.value)}
            className="text-xs border border-stone-300 rounded-xl px-3 py-2 bg-white text-stone-900"
          >
            {clients
              .filter((c) => c.salonId === salon.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={() => onCreateStandaloneComanda(newComandaClientId)}
            style={{ backgroundColor: salon.theme.primaryColor }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white rounded-xl hover:opacity-95 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Abrir Comanda Avulsa</span>
          </button>
        </div>
      </div>

      {/* Layout Principal: Lista de Comandas na Esquerda (4 cols) + Detalhe da Comanda e Fechamento na Direita (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lista de Comandas do Dia */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-base font-semibold text-stone-900">
            Comandas do Dia ({unitComandas.length})
          </h2>

          <div className="space-y-2.5">
            {unitComandas.map((cmd) => {
              const cmdTotals = calculateComandaTotals(cmd);
              const isSelected = cmd.id === activeComanda.id;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => onSelectComanda(cmd.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-white border-stone-900 shadow-xs'
                      : 'bg-white/70 border-stone-200/80 hover:bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                    <span className="font-mono-tabular font-semibold text-stone-900">
                      Comanda #{cmd.number} · {cmd.openedAt}
                    </span>
                    <span
                      className={`font-medium ${
                        cmdTotals.paymentStatus === 'pago'
                          ? 'text-emerald-700'
                          : cmdTotals.paymentStatus === 'parcial'
                          ? 'text-amber-700'
                          : 'text-rose-700'
                      }`}
                    >
                      Pgto: {cmdTotals.paymentStatus.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-base font-semibold text-stone-900">{cmd.clientName}</div>
                  <div className="text-xs text-stone-500 mt-1 flex items-center justify-between">
                    <span>
                      Atend.:{' '}
                      {cmd.attendanceStatus === 'concluido' ? 'Concluído' : 'Na Cadeira'}
                    </span>
                    <span className="font-mono-tabular font-semibold text-stone-900">
                      Líquido: {formatBRL(cmdTotals.netPayable)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Painel Central da Comanda Selecionada */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-stone-200/80 overflow-hidden">
          {/* Topo da Comanda + Abas */}
          <div className="p-5 border-b border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50/50">
            <div>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span className="font-mono-tabular font-semibold text-stone-900">
                  COMANDA #{activeComanda.number}
                </span>
                <span aria-hidden="true">·</span>
                <span>Aberta às {activeComanda.openedAt}</span>
                <span aria-hidden="true">·</span>
                <span>
                  Status Atendimento:{' '}
                  <strong>
                    {activeComanda.attendanceStatus === 'concluido'
                      ? 'Concluído'
                      : 'Em Atendimento'}
                  </strong>
                </span>
              </div>
              <h2 className="text-2xl font-semibold text-stone-900 mt-0.5">
                {activeComanda.clientName}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-stone-200/70 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('comanda')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    activeSubTab === 'comanda'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Itens & Fechamento
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('ficha_tecnica')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    activeSubTab === 'ficha_tecnica'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Ficha Técnica & LGPD ({clientTechRecords.length})
                </button>
              </div>
            </div>
          </div>

          {activeSubTab === 'comanda' ? (
            <div className="p-5 space-y-6">
              {/* Barra de Ação Distinta: Concluir Atendimento vs Liquidar Pagamento (Regra 4 - Seção 21) */}
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-stone-600">
                  <strong>Separação de Estados (Seção 10 & Regra 4):</strong> Concluir o serviço libera a cadeira do profissional, mas mantém o saldo financeiro pendente até o recebimento no caixa.
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activeComanda.attendanceStatus !== 'concluido' ? (
                    <button
                      type="button"
                      onClick={() => onFinishAttendanceOnly(activeComanda.id)}
                      className="px-3 py-1.5 text-xs font-medium text-stone-900 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      1. Concluir Atendimento na Cadeira
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-800 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Atendimento Técnico Concluído</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Tabela de Itens da Comanda (Serviços, Produtos, Comissões Individualizadas Executor/Auxiliar) */}
              <div>
                <h3 className="text-sm font-semibold text-stone-900 mb-2.5">
                  Itens Consumidos & Rateio de Comissões por Profissional
                </h3>
                <div className="overflow-x-auto border border-stone-200/80 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-stone-200/80 bg-stone-50/70 text-stone-500">
                        <th className="py-2.5 px-3 font-medium">Tipo / Descrição</th>
                        <th className="py-2.5 px-3 font-medium">Profissional & Auxiliar</th>
                        <th className="py-2.5 px-3 font-medium text-right">Qtd × Unit.</th>
                        <th className="py-2.5 px-3 font-medium text-right">Comissão Prev.</th>
                        <th className="py-2.5 px-3 font-medium text-right">Subtotal</th>
                        <th className="py-2.5 px-3 font-medium text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200/70">
                      {activeComanda.items.map((item) => {
                        const profObj = professionals.find((p) => p.id === item.professionalId);
                        const comm = calculateItemCommission(
                          item,
                          profObj?.assistantSplitPct || 15,
                          salon.commissionReleaseRule,
                          activeComanda.attendanceStatus === 'concluido',
                          totals.paymentStatus === 'pago'
                        );
                        return (
                          <tr
                            key={item.id}
                            className={item.cancelled ? 'bg-rose-50/40 line-through text-stone-400' : ''}
                          >
                            <td className="py-3 px-3">
                              <div className="font-medium text-stone-900">{item.name}</div>
                              <div className="text-stone-500 uppercase text-[10px]">
                                {item.type} {item.cancelReason ? `· Cancelado: ${item.cancelReason}` : ''}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="text-stone-800 font-medium">{item.professionalName}</div>
                              {item.assistantProfessionalId && (
                                <div className="text-stone-500">
                                  + Auxiliar técnico (rateio {profObj?.assistantSplitPct || 15}%)
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono-tabular">
                              {item.quantity} × {formatBRL(item.unitPrice)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono-tabular">
                              <div className="text-stone-800">
                                Exec: {formatBRL(comm.executorAmount)} ({item.commissionPct}%)
                              </div>
                              {comm.assistantAmount > 0 && (
                                <div className="text-stone-500">
                                  Aux: {formatBRL(comm.assistantAmount)}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono-tabular font-semibold text-stone-900">
                              {formatBRL(item.unitPrice * item.quantity - item.discount)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {!item.cancelled && totals.paymentStatus !== 'pago' && (
                                <button
                                  type="button"
                                  aria-label={`Cancelar item ${item.name}`}
                                  onClick={() =>
                                    onCancelComandaItem(
                                      activeComanda.id,
                                      item.id,
                                      'Solicitação do cliente antes do fechamento (Regra 6: ajuste de estoque/comissão)'
                                    )
                                  }
                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Adicionar Serviço ou Produto durante o atendimento (Seção 10) */}
              {totals.paymentStatus !== 'pago' && (
                <form
                  onSubmit={handleAddItem}
                  className="p-4 rounded-xl bg-stone-50/80 border border-stone-200/80 space-y-3"
                >
                  <div className="text-xs font-semibold text-stone-800">
                    Adicionar Serviço Adicional ou Produto de Revenda (Baixa Automática de Estoque)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                    <select
                      aria-label="Tipo de item"
                      value={itemType}
                      onChange={(e) => {
                        const t = e.target.value as 'servico' | 'produto';
                        setItemType(t);
                        setSelectedRefId(t === 'servico' ? services[0]?.id || '' : products[3]?.id || products[0]?.id || '');
                      }}
                      className="text-xs border border-stone-300 rounded-lg px-2.5 py-2 bg-white text-stone-900"
                    >
                      <option value="produto">Produto (Revenda)</option>
                      <option value="servico">Serviço / Adicional</option>
                    </select>

                    <select
                      aria-label="Escolher produto ou serviço"
                      value={selectedRefId}
                      onChange={(e) => setSelectedRefId(e.target.value)}
                      className="sm:col-span-2 text-xs border border-stone-300 rounded-lg px-2.5 py-2 bg-white text-stone-900"
                    >
                      {itemType === 'servico'
                        ? services
                            .filter((s) => s.salonId === salon.id)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({formatBRL(s.basePrice)})
                              </option>
                            ))
                        : products
                            .filter((p) => p.salonId === salon.id && p.usageType !== 'uso_interno')
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({formatBRL(p.salePrice)} · Estoque: {p.currentStock}{p.unit})
                              </option>
                            ))}
                    </select>

                    <select
                      aria-label="Profissional responsável pelo item"
                      value={selectedProfId}
                      onChange={(e) => setSelectedProfId(e.target.value)}
                      className="text-xs border border-stone-300 rounded-lg px-2.5 py-2 bg-white text-stone-900"
                    >
                      {professionals
                        .filter((p) => p.salonId === salon.id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>

                    <button
                      type="submit"
                      className="px-3 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      + Incluir Item
                    </button>
                  </div>
                </form>
              )}

              {/* Conferência do Fechamento (10 Passos da Seção 10) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-stone-200/80">
                {/* Resumo Financeiro da Comanda */}
                <div className="space-y-3 bg-stone-50/60 p-4 rounded-xl border border-stone-200/80">
                  <h3 className="text-sm font-semibold text-stone-900">
                    Conferência de Valores & Abatimento Único de Sinal
                  </h3>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span>Subtotal Serviços</span>
                      <span className="font-mono-tabular">{formatBRL(totals.subtotalServices)}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Subtotal Produtos (Home Care)</span>
                      <span className="font-mono-tabular">{formatBRL(totals.subtotalProducts)}</span>
                    </div>
                    <div className="flex justify-between items-center text-stone-600 pt-1">
                      <label htmlFor="cmd-discount">Desconto Autorizado (R$)</label>
                      <input
                        id="cmd-discount"
                        type="number"
                        min={0}
                        value={activeComanda.globalDiscount}
                        onChange={(e) =>
                          onUpdateComandaAdjustments(
                            activeComanda.id,
                            Math.max(0, Number(e.target.value) || 0),
                            activeComanda.tipAmount
                          )
                        }
                        className="w-24 text-right font-mono-tabular border border-stone-300 rounded px-2 py-1 bg-white text-stone-900"
                      />
                    </div>
                    <div className="flex justify-between items-center text-stone-600">
                      <label htmlFor="cmd-tip">Gorjeta Opcional p/ Equipe (R$)</label>
                      <input
                        id="cmd-tip"
                        type="number"
                        min={0}
                        value={activeComanda.tipAmount}
                        onChange={(e) =>
                          onUpdateComandaAdjustments(
                            activeComanda.id,
                            activeComanda.globalDiscount,
                            Math.max(0, Number(e.target.value) || 0)
                          )
                        }
                        className="w-24 text-right font-mono-tabular border border-stone-300 rounded px-2 py-1 bg-white text-stone-900"
                      />
                    </div>
                    <div className="flex justify-between text-emerald-800 font-medium pt-1">
                      <span>Sinal Já Pago no Agendamento (Abatido 1x)</span>
                      <span className="font-mono-tabular">- {formatBRL(totals.depositDeducted)}</span>
                    </div>
                    <div className="border-t border-stone-200 pt-2 flex justify-between text-sm font-semibold text-stone-900">
                      <span>Total Líquido da Comanda</span>
                      <span className="font-mono-tabular">{formatBRL(totals.netPayable)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-700 font-medium">
                      <span>Total Recebido no Caixa</span>
                      <span className="font-mono-tabular">{formatBRL(totals.totalPaid)}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold text-stone-900 pt-1">
                      <span>Saldo Restante a Receber</span>
                      <span className="font-mono-tabular text-amber-800">
                        {formatBRL(totals.remainingBalance)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recebimento Multi-Meios, Divisão de Conta e Emissão Fiscal (Seção 10 e 11.7) */}
                <div className="space-y-4">
                  <form onSubmit={handlePaymentSubmit} className="space-y-3">
                    <h3 className="text-sm font-semibold text-stone-900">
                      Liquidar Pagamento (Aceita Múltiplos Meios / Divisão)
                    </h3>

                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <label htmlFor="pay-method" className="block text-stone-600 mb-1">
                          Meio de Pagamento
                        </label>
                        <select
                          id="pay-method"
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                          className="w-full border border-stone-300 rounded-lg px-2.5 py-2 bg-white text-stone-900"
                        >
                          <option value="pix">Pix (Liquidação Imediata)</option>
                          <option value="cartao_credito">Cartão de Crédito</option>
                          <option value="cartao_debito">Cartão de Débito</option>
                          <option value="dinheiro">Dinheiro (Gaveta Física)</option>
                          <option value="credito_interno">Crédito Interno do Cliente</option>
                          <option value="link_pagamento">Link de Pagamento Online</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="pay-amount" className="block text-stone-600 mb-1">
                          Valor a Receber Agora (R$)
                        </label>
                        <input
                          id="pay-amount"
                          type="number"
                          step="0.01"
                          placeholder={String(totals.remainingBalance)}
                          value={payAmountInput}
                          onChange={(e) => setPayAmountInput(e.target.value)}
                          className="w-full border border-stone-300 rounded-lg px-2.5 py-2 font-mono-tabular bg-white text-stone-900"
                        />
                      </div>

                      <div>
                        <label htmlFor="pay-payer" className="block text-stone-600 mb-1">
                          Pagador (Divisão de Conta)
                        </label>
                        <input
                          id="pay-payer"
                          type="text"
                          value={payerLabel}
                          onChange={(e) => setPayerLabel(e.target.value)}
                          className="w-full border border-stone-300 rounded-lg px-2.5 py-2 bg-white text-stone-900"
                        />
                      </div>

                      <div>
                        <label htmlFor="pay-inst" className="block text-stone-600 mb-1">
                          Parcelas
                        </label>
                        <select
                          id="pay-inst"
                          value={payInstallments}
                          onChange={(e) => setPayInstallments(Number(e.target.value))}
                          className="w-full border border-stone-300 rounded-lg px-2.5 py-2 bg-white text-stone-900 font-mono-tabular"
                        >
                          <option value={1}>1x à vista</option>
                          <option value={2}>2x sem juros</option>
                          <option value={3}>3x sem juros</option>
                          <option value={6}>6x Cartão</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={totals.remainingBalance <= 0}
                      style={{
                        backgroundColor:
                          totals.remainingBalance > 0 ? salon.theme.primaryColor : '#9ca3af',
                      }}
                      className="w-full py-2.5 px-4 text-xs font-medium text-white rounded-xl hover:opacity-95 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                    >
                      {totals.remainingBalance > 0
                        ? `Confirmar Recebimento (${formatBRL(
                            payAmountInput ? Number(payAmountInput) : totals.remainingBalance
                          )})`
                        : 'Comanda Totalmente Liquidada'}
                    </button>
                  </form>

                  {/* Lista de Pagamentos Alocados + Comprovante e NFS-e Separada */}
                  {activeComanda.payments.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-stone-200/70 text-xs">
                      <div className="font-semibold text-stone-800">Pagamentos Registrados:</div>
                      {activeComanda.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-stone-600">
                          <span>
                            {p.method.toUpperCase()} ({p.installments}x) · {p.payerLabel}
                          </span>
                          <span className="font-mono-tabular font-medium text-emerald-800">
                            {formatBRL(p.amount)} (Líq. {formatBRL(p.netAmount)})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Ações pós-fechamento: Comprovante vs NFS-e (Seção 11.7) */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowReceiptModal(!showReceiptModal)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Ver Comprovante de Pagamento</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onIssueNfse(activeComanda.id)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>
                        {activeComanda.nfseStatus === 'emitida'
                          ? ` Emitida (${activeComanda.nfseNumber})`
                          : 'Solicitar Emissão NFS-e Municipal'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Comprovante Digital Expandido */}
              {showReceiptModal && (
                <div className="p-4 rounded-xl border border-stone-300 bg-stone-50 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <span className="font-semibold text-stone-900">
                      COMPROVANTE DE ATENDIMENTO E PAGAMENTO — {salon.commercialName.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowReceiptModal(false)}
                      className="text-stone-500 hover:text-stone-900 cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                  <p className="text-stone-600">
                    Cliente: <strong>{activeComanda.clientName}</strong> · Comanda #{activeComanda.number} · CNPJ {salon.cnpj}
                  </p>
                  <p className="text-stone-600 font-mono-tabular">
                    Total Serviços/Produtos: {formatBRL(totals.activeItemsTotal)} | Sinal Abatido: {formatBRL(totals.depositDeducted)} | Pago: {formatBRL(totals.totalPaid)} | Pendente: {formatBRL(totals.remainingBalance)}
                  </p>
                  <p className="text-stone-500 italic">
                    Nota: Este comprovante financeiro não substitui a NFS-e de serviços (Seção 11.7). Status Fiscal: {activeComanda.nfseStatus.toUpperCase()}.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Aba 2: Ficha Técnica Personalizável & Proteção de Dados Sensíveis de Saúde LGPD (Seção 7 e 20) */
            <div className="p-5 space-y-6">
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 text-xs text-amber-950">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Proteção de Dados Pessoais Sensíveis (LGPD — Art. 11):</strong> Informações de alergias, gestação, dermatites e restrições clínicas possuem acesso restrito e geram trilha de auditoria automática.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSensitiveHealthData(!showSensitiveHealthData)}
                  className="px-3 py-1.5 text-xs font-medium text-amber-950 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {showSensitiveHealthData ? 'Ocultar Dados de Saúde' : 'Desbloquear Dados de Saúde (Auditado)'}
                </button>
              </div>

              {/* Lista de Fichas Técnicas da Cliente */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-stone-900">
                  Histórico de Fórmulas & Protocolos de {activeComanda.clientName}
                </h3>
                {clientTechRecords.map((tr) => (
                  <div
                    key={tr.id}
                    className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/40 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-stone-500">
                      <span className="font-mono-tabular font-semibold text-stone-900">
                        Data: {tr.date} · Modelo: {tr.templateType.toUpperCase()}
                      </span>
                      <span>Profissional: {tr.professionalName}</span>
                    </div>
                    <div className="text-stone-800">
                      <strong>Fórmula / Protocolo:</strong> {tr.formulaOrProtocol}
                    </div>
                    <div className="text-stone-600">
                      <strong>Tempo de Ação:</strong> {tr.actionTimeMinutes} min ·{' '}
                      <strong>Insumos:</strong> {tr.productsUsedNotes}
                    </div>
                    <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
                      {showSensitiveHealthData ? (
                        <span className="text-rose-800 font-medium">
                          Restrições / Alergias (LGPD): {tr.healthAllergiesSensitive}
                        </span>
                      ) : (
                        <span className="text-stone-400 flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Dados de saúde ocultos por privacidade (clique em Desbloquear acima)</span>
                        </span>
                      )}
                      <span className="text-emerald-700 font-medium">
                        {tr.lgpdConsentSigned ? 'Termo LGPD Assinado' : 'Consentimento Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Formulário para Nova Ficha Técnica */}
              <form
                onSubmit={handleCreateTechRecord}
                className="p-4 rounded-xl border border-stone-200/80 space-y-3 bg-stone-50/40"
              >
                <h3 className="text-sm font-semibold text-stone-900">
                  Registrar Nova Ficha Técnica no Atendimento Atual
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label htmlFor="tr-type" className="block text-stone-600 mb-1">
                      Modelo de Procedimento
                    </label>
                    <select
                      id="tr-type"
                      value={templateType}
                      onChange={(e) =>
                        setTemplateType(
                          e.target.value as 'coloracao' | 'tratamento' | 'manicure' | 'estetica'
                        )
                      }
                      className="w-full border border-stone-300 rounded-lg px-2.5 py-2 bg-white text-stone-900"
                    >
                      <option value="coloracao">Coloração (Fórmula, Volumetria e Pausa)</option>
                      <option value="tratamento">Tratamento Capilar (Avaliação e Protocolo)</option>
                      <option value="manicure">Manicure & Gel (Preferências e Formato)</option>
                      <option value="estetica">Estética (Anamnese e Restrições)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="tr-time" className="block text-stone-600 mb-1">
                      Tempo de Ação / Pausa (min)
                    </label>
                    <input
                      id="tr-time"
                      type="number"
                      value={actionTime}
                      onChange={(e) => setActionTime(Number(e.target.value))}
                      className="w-full border border-stone-300 rounded-lg px-2.5 py-2 bg-white text-stone-900 font-mono-tabular"
                    />
                  </div>

                  <div>
                    <label htmlFor="tr-products" className="block text-stone-600 mb-1">
                      Gramatura / Consumo Real
                    </label>
                    <input
                      id="tr-products"
                      type="text"
                      placeholder="Ex: 45g 8.13 + 60ml OX 20vol"
                      value={productsNotes}
                      onChange={(e) => setProductsNotes(e.target.value)}
                      className="w-full border border-stone-300 rounded-lg px-2.5 py-2 bg-white text-stone-900"
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label htmlFor="tr-formula" className="block text-stone-600 mb-1">
                    Descrição Técnica da Fórmula / Protocolo Executado
                  </label>
                  <input
                    id="tr-formula"
                    type="text"
                    placeholder="Descreva proporções, fundo de clareamento, tonalizante e observações..."
                    value={formulaText}
                    onChange={(e) => setFormulaText(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 bg-white text-stone-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center text-xs">
                  <input
                    type="text"
                    placeholder="Alergias / Restrições de saúde (Campo Sensível LGPD)..."
                    value={healthAllergies}
                    onChange={(e) => setHealthAllergies(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 bg-white text-stone-900"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-stone-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lgpdConsent}
                        onChange={(e) => setLgpdConsent(e.target.checked)}
                      />
                      <span>Termo LGPD validado</span>
                    </label>
                    <button
                      type="submit"
                      style={{ backgroundColor: salon.theme.primaryColor }}
                      className="px-4 py-2 font-medium text-white rounded-xl hover:opacity-95 cursor-pointer whitespace-nowrap"
                    >
                      Salvar Ficha Técnica
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
