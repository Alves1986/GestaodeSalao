import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Gift,
  Package,
  Plus,
  Scissors,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  ClientPackage,
  ClientProfile,
  CommissionRecord,
  ProductStock,
  Professional,
  SalonMenuId,
  SalonService,
  SalonTenant,
  StockMovement,
} from '../types/salon';

interface CatalogAndStockViewProps {
  activeMenu: Extract<
    SalonMenuId,
    'clientes' | 'servicos' | 'estoque' | 'profissionais' | 'comissoes' | 'pacotes'
  >;
  salon: SalonTenant;
  clients: ClientProfile[];
  services: SalonService[];
  products: ProductStock[];
  stockMovements: StockMovement[];
  professionals: Professional[];
  commissions: CommissionRecord[];
  packages: ClientPackage[];
  onCreateClient: (client: Omit<ClientProfile, 'id'>) => void;
  onCreateService: (service: Omit<SalonService, 'id'>) => void;
  onRecordStockMovement: (
    productId: string,
    type: StockMovement['type'],
    quantity: number,
    reference: string
  ) => void;
  onApproveAndPayCommissions: (commissionIds: string[]) => void;
  onRedeemPackageSession: (packageId: string) => void;
  onCreatePackage: (pkg: Omit<ClientPackage, 'id'>) => void;
}

export const CatalogAndStockView: React.FC<CatalogAndStockViewProps> = ({
  activeMenu,
  salon,
  clients,
  services,
  products,
  stockMovements,
  professionals,
  commissions,
  packages,
  onCreateClient,
  onCreateService,
  onRecordStockMovement,
  onApproveAndPayCommissions,
  onRedeemPackageSession,
  onCreatePackage,
}) => {
  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Client form states
  const [showClientForm, setShowClientForm] = useState(false);
  const [cliName, setCliName] = useState('');
  const [cliPhone, setCliPhone] = useState('');
  const [cliEmail, setCliEmail] = useState('');
  const [cliBirth, setCliBirth] = useState('1992-05-14');
  const [cliNotes, setCliNotes] = useState('');

  // Service / Quote state
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [srvName, setSrvName] = useState('');
  const [srvCategory, setSrvCategory] = useState<SalonService['category']>('Cabelo & Coloração');
  const [srvPrice, setSrvPrice] = useState('350');
  const [srvDuration, setSrvDuration] = useState('60');
  const [srvDeposit, setSrvDeposit] = useState('50');
  const [quoteSentBanner, setQuoteSentBanner] = useState<string | null>(null);

  // Stock movement form state
  const [movProductId, setMovProductId] = useState(products[0]?.id || '');
  const [movType, setMovType] = useState<StockMovement['type']>('consumo_tecnico');
  const [movQty, setMovQty] = useState('30');
  const [movRef, setMovRef] = useState('Consumo bancada colorimetria');

  // Package creation state
  const [pkgClientId, setPkgClientId] = useState(clients[0]?.id || '');
  const [pkgServiceId, setPkgServiceId] = useState(services[2]?.id || services[0]?.id || '');
  const [pkgSessions, setPkgSessions] = useState(4);
  const [pkgTotalVal, setPkgTotalVal] = useState('1390');
  const [redemptionFeedback, setRedemptionFeedback] = useState<string | null>(null);

  const unitClients = clients.filter((c) => c.salonId === salon.id);
  const unitServices = services.filter((s) => s.salonId === salon.id);
  const unitProducts = products.filter((p) => p.salonId === salon.id);
  const unitProfessionals = professionals.filter((p) => p.salonId === salon.id);
  const unitCommissions = commissions.filter((c) => c.salonId === salon.id);
  const unitPackages = packages.filter((p) => p.salonId === salon.id);

  // 1. MÓDULO CLIENTES E CRM (Seção 8)
  if (activeMenu === 'clientes') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-stone-200/80 pb-5">
          <div>
            <div className="text-xs text-stone-500 mb-1">
              Relacionamento, Retorno por Serviço, Aniversariantes & Consentimento LGPD
            </div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-stone-900">
              Clientes & CRM Integrado
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Cadastro unificado com histórico de comandas, pacotes, créditos internos, fichas técnicas e funil comercial.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowClientForm(!showClientForm)}
            style={{ backgroundColor: salon.theme.primaryColor }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white rounded-xl hover:opacity-95 cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Cadastro de Cliente</span>
          </button>
        </div>

        {showClientForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!cliName.trim() || !cliPhone.trim()) return;
              onCreateClient({
                salonId: salon.id,
                name: cliName.trim(),
                phone: cliPhone.trim(),
                email: cliEmail.trim() || 'cliente@email.com',
                birthDate: cliBirth,
                origin: 'Instagram',
                tags: ['Novo Cadastro'],
                internalCredit: 0,
                loyaltyPoints: 50,
                totalSpent: 0,
                lastVisitDate: '2026-10-26',
                lgpdHealthConsent: true,
                marketingOptIn: true,
                restrictedNotes: cliNotes,
                crmStage: 'novo_contato',
              });
              setCliName('');
              setCliPhone('');
              setCliEmail('');
              setCliNotes('');
              setShowClientForm(false);
            }}
            className="bg-white rounded-2xl p-5 border border-stone-300 space-y-4"
          >
            <h2 className="text-base font-semibold text-stone-900">
              Cadastrar Novo Cliente com Termo de Privacidade LGPD
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <input
                type="text"
                required
                placeholder="Nome completo / Nome social *"
                value={cliName}
                onChange={(e) => setCliName(e.target.value)}
                className="border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
              />
              <input
                type="text"
                required
                placeholder="WhatsApp / Telefone *"
                value={cliPhone}
                onChange={(e) => setCliPhone(e.target.value)}
                className="border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono-tabular"
              />
              <input
                type="email"
                placeholder="E-mail"
                value={cliEmail}
                onChange={(e) => setCliEmail(e.target.value)}
                className="border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
              />
              <input
                type="date"
                value={cliBirth}
                onChange={(e) => setCliBirth(e.target.value)}
                className="border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono-tabular"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                placeholder="Preferências, restrições ou observações de recepção..."
                value={cliNotes}
                onChange={(e) => setCliNotes(e.target.value)}
                className="flex-1 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900"
              />
              <button
                type="submit"
                style={{ backgroundColor: salon.theme.primaryColor }}
                className="px-4 py-2 text-xs font-medium text-white rounded-xl cursor-pointer whitespace-nowrap"
              >
                Salvar Cliente
              </button>
            </div>
          </form>
        )}

        {/* Indicadores de Relacionamento CRM */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80">
            <div className="text-xs text-stone-500">Base Ativa do Salão</div>
            <div className="text-2xl font-semibold text-stone-900 font-mono-tabular mt-1">
              {unitClients.length} clientes
            </div>
            <div className="text-xs text-stone-500 mt-1">Compartilhamento configurável por unidade</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80">
            <div className="text-xs text-stone-500">Gasto Acumulado (LTV)</div>
            <div className="text-2xl font-semibold text-stone-900 font-mono-tabular mt-1">
              {formatBRL(unitClients.reduce((a, c) => a + c.totalSpent, 0))}
            </div>
            <div className="text-xs text-emerald-700 mt-1">Top 20% geram 64% da receita</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80">
            <div className="text-xs text-stone-500">Créditos Internos & Fidelidade</div>
            <div className="text-2xl font-semibold text-stone-900 font-mono-tabular mt-1">
              {formatBRL(unitClients.reduce((a, c) => a + c.internalCredit, 0))}
            </div>
            <div className="text-xs text-stone-500 mt-1">Disponíveis para abatimento em comanda</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80">
            <div className="text-xs text-stone-500">Alerta de Inativos (+60 dias)</div>
            <div className="text-2xl font-semibold text-amber-800 font-mono-tabular mt-1">
              {unitClients.filter((c) => c.crmStage === 'inativo').length} cliente(s)
            </div>
            <div className="text-xs text-amber-700 mt-1">Elegíveis para régua de recuperação</div>
          </div>
        </div>

        {/* Tabela Centralizada de Clientes */}
        <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200/80 bg-stone-50/70 text-stone-500">
                  <th className="py-3 px-4 font-medium">Cliente & Contato</th>
                  <th className="py-3 px-4 font-medium">Segmentação & Origem</th>
                  <th className="py-3 px-4 font-medium">Etapa Funil CRM</th>
                  <th className="py-3 px-4 font-medium">LGPD & Preferências</th>
                  <th className="py-3 px-4 font-medium text-right">Créditos / Pontos</th>
                  <th className="py-3 px-4 font-medium text-right">Gasto Acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/70">
                {unitClients.map((client) => (
                  <tr key={client.id} className="hover:bg-stone-50/60">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-stone-900">{client.name}</div>
                      <div className="text-stone-500 font-mono-tabular">
                        {client.phone} · {client.email}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-stone-800">{client.tags.join(' · ')}</div>
                      <div className="text-stone-500">
                        Origem: {client.origin} · Última visita: {client.lastVisitDate}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-stone-900 uppercase">
                        {client.crmStage.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-stone-700">{client.restrictedNotes}</div>
                      <div className="text-stone-500">
                        Saúde LGPD: {client.lgpdHealthConsent ? 'Autorizado' : 'Pendente'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular">
                      <div className="font-medium text-emerald-800">
                        {formatBRL(client.internalCredit)}
                      </div>
                      <div className="text-stone-500">{client.loyaltyPoints} pts</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-stone-900">
                      {formatBRL(client.totalSpent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 2. MÓDULO SERVIÇOS, PREÇOS E ORÇAMENTOS (Seção 9)
  if (activeMenu === 'servicos') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-stone-200/80 pb-5">
          <div>
            <div className="text-xs text-stone-500 mb-1">
              Catálogo Técnico, Tempo de Pausa, Consumo Previsto & Simulador de Orçamentos
            </div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-stone-900">
              Serviços, Preços & Orçamentos
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Cada serviço vincula duração, pausa de ação química, exigência de sinal, comissão e materiais técnicos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowServiceForm(!showServiceForm)}
            style={{ backgroundColor: salon.theme.primaryColor }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white rounded-xl hover:opacity-95 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Serviço</span>
          </button>
        </div>

        {showServiceForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!srvName.trim()) return;
              onCreateService({
                salonId: salon.id,
                name: srvName.trim(),
                category: srvCategory,
                description: 'Procedimento técnico personalizado com diagnóstico prévio.',
                durationMinutes: Number(srvDuration) || 60,
                pauseMinutes: 0,
                prepMinutes: 10,
                priceType: 'fixo',
                basePrice: Number(srvPrice) || 250,
                depositRequired: Number(srvDeposit) || 0,
                defaultCommissionPct: 45,
                resourceRequired: 'Cadeira 01',
                onlineBookingAvailable: true,
                requiresPreEvaluation: false,
                technicalMaterials: [],
              });
              setSrvName('');
              setShowServiceForm(false);
            }}
            className="bg-white rounded-2xl p-5 border border-stone-300 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs"
          >
            <div className="sm:col-span-2">
              <label className="block text-stone-600 mb-1">Nome do Serviço</label>
              <input
                type="text"
                required
                placeholder="Ex: Gloss Tonalizante & Tratamento Ozônio"
                value={srvName}
                onChange={(e) => setSrvName(e.target.value)}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
              />
            </div>
            <div>
              <label className="block text-stone-600 mb-1">Preço Base (R$)</label>
              <input
                type="number"
                value={srvPrice}
                onChange={(e) => setSrvPrice(e.target.value)}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 font-mono-tabular text-stone-900"
              />
            </div>
            <div>
              <label className="block text-stone-600 mb-1">Sinal Exigido (R$)</label>
              <input
                type="number"
                value={srvDeposit}
                onChange={(e) => setSrvDeposit(e.target.value)}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 font-mono-tabular text-stone-900"
              />
            </div>
            <button
              type="submit"
              style={{ backgroundColor: salon.theme.primaryColor }}
              className="py-2 px-4 font-medium text-white rounded-xl cursor-pointer"
            >
              Salvar Serviço
            </button>
          </form>
        )}

        {quoteSentBanner && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <span>{quoteSentBanner}</span>
            <button
              type="button"
              onClick={() => setQuoteSentBanner(null)}
              className="underline cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {unitServices.map((srv) => {
            const techCost = srv.technicalMaterials.reduce(
              (acc, m) => acc + m.expectedQuantity * m.unitCost,
              0
            );
            return (
              <div
                key={srv.id}
                className="bg-white rounded-2xl p-5 border border-stone-200/80 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span>{srv.category}</span>
                    <span className="font-mono-tabular">
                      {srv.durationMinutes} min total
                      {srv.pauseMinutes > 0 ? ` (${srv.pauseMinutes} min pausa química)` : ''}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-stone-900">{srv.name}</h2>
                  <p className="text-xs text-stone-600">{srv.description}</p>
                </div>

                <div className="pt-3 border-t border-stone-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-stone-600">
                    <span>
                      Modalidade: <strong>{srv.priceType === 'a_partir_de' ? 'A partir de (Avaliação)' : 'Preço Fixo'}</strong> · Comissão: <strong>{srv.defaultCommissionPct}%</strong>
                    </span>
                    <span className="text-base font-semibold font-mono-tabular text-stone-900">
                      {formatBRL(srv.basePrice)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-stone-500">
                    <span>
                      Sinal online: {srv.depositRequired > 0 ? formatBRL(srv.depositRequired) : 'Isento'} · Custo técnico previsto: {formatBRL(techCost)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuoteSentBanner(
                          `Orçamento formal de "${srv.name}" (${formatBRL(
                            srv.basePrice
                          )}, validade 7 dias) gerado e enviado ao cliente para aceite.`
                        )
                      }
                      className="text-stone-900 font-medium hover:underline cursor-pointer"
                    >
                      Gerar Orçamento →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. MÓDULO PRODUTOS, ESTOQUE FRACIONADO E CONSUMO TÉCNICO (Seção 13)
  if (activeMenu === 'estoque') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-stone-200/80 pb-5">
          <div>
            <div className="text-xs text-stone-500 mb-1">
              Controle de Lotes, Validade, Revenda Home Care vs. Consumo Técnico em Gramas e Mililitros
            </div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-stone-900">
              Produtos, Estoque & Consumo Técnico
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Separação entre produtos de revenda na vitrine e insumos fracionados (g/ml) consumidos no lavatório e colorimetria.
            </p>
          </div>
        </div>

        {/* Lançamento Rápido de Movimentação / Consumo Técnico (Seção 13) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const q = Number(movQty);
            if (!q || q <= 0) return;
            const signedQty =
              movType === 'entrada_compra' || movType === 'estorno_cancelamento' ? q : -q;
            onRecordStockMovement(movProductId, movType, signedQty, movRef);
          }}
          className="bg-white rounded-2xl p-5 border border-stone-200/80 space-y-3"
        >
          <h2 className="text-base font-semibold text-stone-900">
            Registrar Movimentação de Estoque ou Consumo Fracionado (g / ml / un)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
            <select
              aria-label="Selecionar produto para movimentação"
              value={movProductId}
              onChange={(e) => setMovProductId(e.target.value)}
              className="sm:col-span-2 border border-stone-300 rounded-xl px-3 py-2 bg-white text-stone-900"
            >
              {unitProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Atual: {p.currentStock}{p.unit})
                </option>
              ))}
            </select>

            <select
              aria-label="Tipo de movimentação de estoque"
              value={movType}
              onChange={(e) => setMovType(e.target.value as StockMovement['type'])}
              className="border border-stone-300 rounded-xl px-3 py-2 bg-white text-stone-900"
            >
              <option value="consumo_tecnico">Saída: Consumo no Atendimento</option>
              <option value="entrada_compra">Entrada: Recebimento de Compra</option>
              <option value="perda_vencimento">Saída: Perda / Vencimento</option>
              <option value="ajuste">Ajuste de Inventário</option>
            </select>

            <input
              type="number"
              min={1}
              value={movQty}
              onChange={(e) => setMovQty(e.target.value)}
              placeholder="Qtd (g/ml/un)"
              className="border border-stone-300 rounded-xl px-3 py-2 font-mono-tabular text-stone-900"
            />

            <button
              type="submit"
              style={{ backgroundColor: salon.theme.primaryColor }}
              className="px-4 py-2 font-medium text-white rounded-xl hover:opacity-95 cursor-pointer whitespace-nowrap"
            >
              Registrar Movimentação
            </button>
          </div>
        </form>

        {/* Tabela de Produtos em Estoque */}
        <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200/80 bg-stone-50/70 text-stone-500">
                  <th className="py-3 px-4 font-medium">SKU / Produto & Marca</th>
                  <th className="py-3 px-4 font-medium">Finalidade & Local</th>
                  <th className="py-3 px-4 font-medium">Lote & Validade</th>
                  <th className="py-3 px-4 font-medium text-right">Custo / Venda</th>
                  <th className="py-3 px-4 font-medium text-right">Saldo Atual (Mín.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/70">
                {unitProducts.map((p) => {
                  const isLow = p.currentStock <= p.minStock;
                  return (
                    <tr key={p.id} className="hover:bg-stone-50/60">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-900">{p.name}</div>
                        <div className="text-stone-500 font-mono-tabular">
                          {p.sku} · {p.brand} · {p.category}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-stone-800 uppercase">{p.usageType.replace('_', ' ')}</div>
                        <div className="text-stone-500">{p.storageLocation}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular">
                        <div className="text-stone-800">Lote: {p.batchNumber}</div>
                        <div className="text-stone-500">Val: {p.expiryDate}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-tabular">
                        <div className="text-stone-800">
                          Custo: {formatBRL(p.costPrice)}/{p.unit}
                        </div>
                        <div className="text-stone-500">
                          {p.salePrice > 0 ? `Venda: ${formatBRL(p.salePrice)}` : 'Uso Técnico'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-tabular">
                        <div
                          className={`text-sm font-semibold ${
                            isLow ? 'text-amber-700' : 'text-stone-900'
                          }`}
                        >
                          {p.currentStock} {p.unit}
                        </div>
                        <div className="text-stone-500">
                          Mín: {p.minStock} {p.unit} {isLow ? '· REPOR' : ''}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Histórico de Movimentações de Estoque */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 space-y-3">
          <h2 className="text-base font-semibold text-stone-900">
            Últimas Movimentações & Rastreabilidade de Consumo
          </h2>
          <div className="divide-y divide-stone-200/70 text-xs">
            {stockMovements
              .filter((m) => m.salonId === salon.id)
              .map((m) => (
                <div key={m.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-stone-900">{m.productName}</div>
                    <div className="text-stone-500">
                      {m.type.toUpperCase()} · {m.reference} · Operador: {m.operator}
                    </div>
                  </div>
                  <div className="text-right font-mono-tabular">
                    <div
                      className={`font-semibold ${
                        m.quantity > 0 ? 'text-emerald-700' : 'text-stone-900'
                      }`}
                    >
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.unit}
                    </div>
                    <div className="text-stone-400">{m.date}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  // 4. MÓDULO PROFISSIONAIS E EQUIPE (Seção 12)
  if (activeMenu === 'profissionais') {
    return (
      <div className="space-y-6">
        <div className="border-b border-stone-200/80 pb-5">
          <div className="text-xs text-stone-500 mb-1">
            Jornadas, Intervalos, Metas Mensais & Regras Individualizadas de Comissão
          </div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-stone-900">
            Profissionais & Equipe Técnica
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Configuração de comissão sobre serviço, venda de produtos e percentual de divisão com auxiliar técnico.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {unitProfessionals.map((prof) => (
            <div
              key={prof.id}
              className="bg-white rounded-2xl p-5 border border-stone-200/80 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    style={{ backgroundColor: salon.theme.primaryColor }}
                    className="w-11 h-11 rounded-2xl text-white font-semibold text-sm flex items-center justify-center shrink-0"
                  >
                    {prof.avatarInitials}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-stone-900">{prof.name}</h2>
                    <p className="text-xs text-stone-500">
                      {prof.roleTitle} · {prof.specialty}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-emerald-800">
                  {prof.active ? 'Ativo' : 'Inativo'} · {prof.chairLabel}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-stone-100 text-xs">
                <div>
                  <span className="text-stone-500 block">Comissão Serviço</span>
                  <span className="font-mono-tabular font-semibold text-stone-900">
                    {prof.commissionServicePct}%
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block">Comissão Produto</span>
                  <span className="font-mono-tabular font-semibold text-stone-900">
                    {prof.commissionProductPct}%
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block">Divisão Auxiliar</span>
                  <span className="font-mono-tabular font-semibold text-stone-900">
                    {prof.assistantSplitPct}%
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                <span>
                  Jornada: <strong className="font-mono-tabular">{prof.workingHours.start}–{prof.workingHours.end}</strong> (Almoço {prof.workingHours.lunchStart}–{prof.workingHours.lunchEnd})
                </span>
                <span className="font-mono-tabular font-medium text-stone-900">
                  Meta: {formatBRL(prof.monthlyGoal)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 5. MÓDULO COMISSÕES E REPASSES (Seção 12)
  if (activeMenu === 'comissoes') {
    const eligibleIds = unitCommissions
      .filter((c) => c.status === 'prevista' || c.status === 'elegivel')
      .map((c) => c.id);

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-stone-200/80 pb-5">
          <div>
            <div className="text-xs text-stone-500 mb-1">
              Apuração Auditada · Regra Atual do Salão: Liberação por{' '}
              <strong>{salon.commissionReleaseRule === 'recebimento' ? 'Recebimento Efetivo' : 'Execução do Serviço'}</strong>
            </div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-stone-900">
              Comissões, Rateios & Repasses
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Regra 7 (Seção 21): Alterações futuras na regra de comissão não recalculam silenciosamente períodos históricos.
            </p>
          </div>

          <button
            type="button"
            disabled={eligibleIds.length === 0}
            onClick={() => onApproveAndPayCommissions(eligibleIds)}
            style={{
              backgroundColor: eligibleIds.length > 0 ? salon.theme.primaryColor : '#9ca3af',
            }}
            className="px-4 py-2 text-xs font-medium text-white rounded-xl hover:opacity-95 cursor-pointer whitespace-nowrap disabled:cursor-not-allowed"
          >
            Aprovar e Liquidar Repasses ({eligibleIds.length})
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200/80 bg-stone-50/70 text-stone-500">
                  <th className="py-3 px-4 font-medium">Data & Comanda</th>
                  <th className="py-3 px-4 font-medium">Profissional & Papel</th>
                  <th className="py-3 px-4 font-medium">Serviço / Produto</th>
                  <th className="py-3 px-4 font-medium text-right">Base de Cálculo</th>
                  <th className="py-3 px-4 font-medium text-right">% Aplicado</th>
                  <th className="py-3 px-4 font-medium text-right">Valor Comissão</th>
                  <th className="py-3 px-4 font-medium text-right">Status do Repasse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/70">
                {unitCommissions.map((com) => (
                  <tr key={com.id} className="hover:bg-stone-50/60">
                    <td className="py-3.5 px-4 font-mono-tabular">
                      <div className="font-semibold text-stone-900">Comanda #{com.comandaNumber}</div>
                      <div className="text-stone-500">{com.date}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-stone-900">{com.professionalName}</div>
                      <div className="text-stone-500 uppercase">{com.roleInService}</div>
                    </td>
                    <td className="py-3.5 px-4 text-stone-800">{com.itemDescription}</td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular">
                      {formatBRL(com.calculationBase)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular">
                      {com.commissionPct}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-stone-900">
                      {formatBRL(com.commissionAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`font-medium uppercase ${
                          com.status === 'paga'
                            ? 'text-emerald-700'
                            : com.status === 'elegivel'
                            ? 'text-amber-700'
                            : 'text-stone-600'
                        }`}
                      >
                        {com.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 6. MÓDULO PACOTES, PLANOS E ASSINATURAS (Seção 14)
  return (
    <div className="space-y-6">
      <div className="border-b border-stone-200/80 pb-5">
        <div className="text-xs text-stone-500 mb-1">
          Controle de Saldo de Sessões, Assinaturas Recorrentes & Créditos de Fidelidade
        </div>
        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-stone-900">
          Pacotes, Planos & Assinaturas
        </h1>
        <p className="text-sm text-stone-600 mt-1">
          Regra 5 (Seção 21): A venda do pacote e o uso de cada sessão são eventos independentes para impedir dupla contagem de receita.
        </p>
      </div>

      {redemptionFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
          <span>{redemptionFeedback}</span>
          <button
            type="button"
            onClick={() => setRedemptionFeedback(null)}
            className="underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Formulário de Venda de Novo Pacote */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const cli = unitClients.find((c) => c.id === pkgClientId) || unitClients[0];
          const srv = unitServices.find((s) => s.id === pkgServiceId) || unitServices[0];
          if (!cli || !srv) return;
          onCreatePackage({
            salonId: salon.id,
            clientId: cli.id,
            clientName: cli.name,
            packageName: `Pacote ${pkgSessions} Sessões — ${srv.name}`,
            serviceId: srv.id,
            serviceName: srv.name,
            totalSessions: pkgSessions,
            usedSessions: 0,
            totalPricePaid: Number(pkgTotalVal) || 1200,
            purchaseDate: '2026-10-26',
            validUntil: '2027-04-26',
            commissionRule: 'na_execucao',
            status: 'ativo',
          });
        }}
        className="bg-white rounded-2xl p-5 border border-stone-200/80 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs"
      >
        <div>
          <label className="block text-stone-600 mb-1">Cliente</label>
          <select
            value={pkgClientId}
            onChange={(e) => setPkgClientId(e.target.value)}
            className="w-full border border-stone-300 rounded-xl px-3 py-2 bg-white text-stone-900"
          >
            {unitClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-stone-600 mb-1">Serviço do Pacote</label>
          <select
            value={pkgServiceId}
            onChange={(e) => setPkgServiceId(e.target.value)}
            className="w-full border border-stone-300 rounded-xl px-3 py-2 bg-white text-stone-900"
          >
            {unitServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-stone-600 mb-1">Sessões</label>
            <input
              type="number"
              min={2}
              value={pkgSessions}
              onChange={(e) => setPkgSessions(Number(e.target.value))}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 font-mono-tabular text-stone-900"
            />
          </div>
          <div>
            <label className="block text-stone-600 mb-1">Valor Total</label>
            <input
              type="number"
              value={pkgTotalVal}
              onChange={(e) => setPkgTotalVal(e.target.value)}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 font-mono-tabular text-stone-900"
            />
          </div>
        </div>
        <button
          type="submit"
          style={{ backgroundColor: salon.theme.primaryColor }}
          className="py-2 px-4 font-medium text-white rounded-xl cursor-pointer whitespace-nowrap"
        >
          Vender Pacote
        </button>
      </form>

      {/* Cards de Pacotes Ativos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {unitPackages.map((pkg) => {
          const remaining = pkg.totalSessions - pkg.usedSessions;
          return (
            <div
              key={pkg.id}
              className="bg-white rounded-2xl p-5 border border-stone-200/80 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>Cliente: <strong>{pkg.clientName}</strong></span>
                  <span className="font-mono-tabular">Validade: {pkg.validUntil}</span>
                </div>
                <h2 className="text-lg font-semibold text-stone-900 mt-1">{pkg.packageName}</h2>
                <p className="text-xs text-stone-600 mt-0.5">
                  Valor pago na contratação: <strong className="font-mono-tabular">{formatBRL(pkg.totalPricePaid)}</strong> · Comissão liberada: {pkg.commissionRule === 'na_execucao' ? 'A cada sessão executada' : 'Na venda'}
                </p>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-stone-500">Progresso de Consumo: </span>
                  <strong className="font-mono-tabular text-stone-900">
                    {pkg.usedSessions} de {pkg.totalSessions} sessões utilizadas ({remaining} restantes)
                  </strong>
                </div>

                <button
                  type="button"
                  disabled={remaining <= 0}
                  onClick={() => {
                    onRedeemPackageSession(pkg.id);
                    setRedemptionFeedback(
                      `Sessão resgatada para ${pkg.clientName}! Receita financeira adicional gerada: R$ 0,00 (Regra 5 cumprida: sem dupla contagem).`
                    );
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {remaining > 0 ? 'Resgatar 1 Sessão Hoje' : 'Pacote Concluído'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
