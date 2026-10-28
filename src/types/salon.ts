export type EnvironmentMode = 'salon_admin' | 'professional_portal' | 'client_portal' | 'platform_admin';

export type UserRole =
  | 'proprietario'
  | 'gerente'
  | 'recepcao'
  | 'caixa'
  | 'financeiro'
  | 'profissional'
  | 'estoque'
  | 'marketing'
  | 'cliente'
  | 'admin_plataforma';

export type SalonMenuId =
  | 'operacao'
  | 'agenda'
  | 'recepcao'
  | 'comandas'
  | 'clientes'
  | 'servicos'
  | 'estoque'
  | 'profissionais'
  | 'comissoes'
  | 'pacotes'
  | 'financeiro'
  | 'compras'
  | 'marketing'
  | 'relatorios'
  | 'configuracoes';

export type AppointmentStatus =
  | 'solicitado'
  | 'aguardando_sinal'
  | 'confirmado'
  | 'chegou'
  | 'em_espera'
  | 'em_atendimento'
  | 'concluido'
  | 'cancelado'
  | 'nao_compareceu';

export type PaymentStatus = 'pendente' | 'parcial' | 'pago' | 'estornado';

export type PaymentMethod =
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'dinheiro'
  | 'credito_interno'
  | 'pacote_sessao'
  | 'link_pagamento';

export interface SalonTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  themeMode: 'claro' | 'escuro' | 'padrao';
  logoText: string;
  logoSubtext: string;
  shortIconText: string;
  institutionalMessage: string;
  publicDomain: string;
}

export interface SalonUnit {
  id: string;
  salonId: string;
  name: string;
  address: string;
  phone: string;
  openingHours: string;
  chairsCount: number;
  rooms: string[];
}

export interface SalonTenant {
  id: string;
  commercialName: string;
  legalName: string;
  cnpj: string;
  plan: 'Essencial' | 'Signature' | 'Enterprise Multi-Unidades';
  status: 'ativo' | 'teste' | 'suspenso';
  monthlyFee: number;
  dailyRevenueGoal: number;
  commissionReleaseRule: 'execucao' | 'recebimento';
  shareClientsAcrossUnits: boolean;
  theme: SalonTheme;
  units: SalonUnit[];
  cancellationPolicy: string;
  municipalTaxCode: string;
  messageQuotaUsed: number;
  messageQuotaLimit: number;
  storageUsedGb: number;
}

export interface Professional {
  id: string;
  salonId: string;
  unitId: string;
  name: string;
  roleTitle: string;
  specialty: string;
  avatarInitials: string;
  commissionServicePct: number;
  commissionProductPct: number;
  assistantSplitPct: number;
  monthlyGoal: number;
  workingHours: { start: string; end: string; lunchStart: string; lunchEnd: string };
  enabledServiceIds: string[];
  active: boolean;
  chairLabel: string;
}

export interface TechnicalMaterialUsage {
  productId: string;
  productName: string;
  expectedQuantity: number;
  unit: 'g' | 'ml' | 'un';
  unitCost: number;
}

export interface SalonService {
  id: string;
  salonId: string;
  name: string;
  category: 'Cabelo & Coloração' | 'Tratamentos Capilares' | 'Manicure & Pedicure' | 'Estética Facial & Corporal' | 'Maquiagem & Noivas';
  description: string;
  durationMinutes: number;
  pauseMinutes: number; // e.g., tempo de ação da coloração
  prepMinutes: number;
  priceType: 'fixo' | 'a_partir_de' | 'avaliacao';
  basePrice: number;
  depositRequired: number;
  defaultCommissionPct: number;
  resourceRequired: string;
  onlineBookingAvailable: boolean;
  requiresPreEvaluation: boolean;
  technicalMaterials: TechnicalMaterialUsage[];
}

export interface TechnicalRecord {
  id: string;
  clientId: string;
  appointmentId: string;
  date: string;
  professionalName: string;
  templateType: 'coloracao' | 'tratamento' | 'manicure' | 'estetica';
  formulaOrProtocol: string;
  actionTimeMinutes: number;
  productsUsedNotes: string;
  healthAllergiesSensitive: string; // LGPD protected field
  lgpdConsentSigned: boolean;
}

export interface ClientProfile {
  id: string;
  salonId: string;
  name: string;
  socialName?: string;
  phone: string;
  email: string;
  birthDate: string;
  cpf?: string;
  preferredProfessionalId?: string;
  origin: 'Instagram' | 'Indicação' | 'Google' | 'Passante' | 'Página Online' | 'WhatsApp';
  tags: string[];
  internalCredit: number;
  loyaltyPoints: number;
  totalSpent: number;
  lastVisitDate: string;
  lgpdHealthConsent: boolean;
  marketingOptIn: boolean;
  restrictedNotes: string;
  crmStage: 'novo_contato' | 'orcamento_enviado' | 'aguardando_decisao' | 'agendado' | 'recorrente' | 'inativo';
}

export interface Appointment {
  id: string;
  salonId: string;
  unitId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  chairOrRoom: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  estimatedPrice: number;
  depositPaid: number;
  depositDeductedInComanda: boolean;
  origin: 'Online' | 'Recepção' | 'WhatsApp' | 'Encaixe';
  notes: string;
  checkInTime?: string;
  serviceStartTime?: string;
  serviceEndTime?: string;
  comandaId?: string;
}

export interface ComandaItem {
  id: string;
  type: 'servico' | 'produto' | 'adicional' | 'pacote_sessao';
  referenceId: string;
  name: string;
  professionalId: string;
  professionalName: string;
  assistantProfessionalId?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  commissionPct: number;
  cancelled: boolean;
  cancelReason?: string;
}

export interface ComandaPaymentAllocation {
  id: string;
  method: PaymentMethod;
  amount: number;
  installments: number;
  payerLabel: string; // Supports bill splitting between people
  paidAt: string;
  operatorFeePct: number;
  netAmount: number;
  externalTxId?: string;
}

export interface Comanda {
  id: string;
  number: number;
  salonId: string;
  unitId: string;
  appointmentId?: string;
  clientId: string;
  clientName: string;
  openedAt: string;
  closedAt?: string;
  attendanceStatus: 'em_andamento' | 'concluido';
  comandaStatus: 'aberta' | 'fechada_pendente' | 'liquidada' | 'cancelada';
  paymentStatus: PaymentStatus;
  items: ComandaItem[];
  depositAlreadyPaid: number;
  depositApplied: boolean;
  globalDiscount: number;
  tipAmount: number;
  payments: ComandaPaymentAllocation[];
  nfseStatus: 'nao_solicitada' | 'processando' | 'emitida' | 'rejeitada';
  nfseNumber?: string;
}

export interface ProductStock {
  id: string;
  salonId: string;
  unitId: string;
  sku: string;
  barcode: string;
  name: string;
  brand: string;
  category: 'Coloração' | 'Tratamento' | 'Finalizadores' | 'Descartáveis & Estética' | 'Home Care Revenda';
  usageType: 'revenda' | 'uso_interno' | 'ambos';
  unit: 'un' | 'ml' | 'g';
  currentStock: number;
  minStock: number;
  costPrice: number;
  salePrice: number;
  saleCommissionPct: number;
  batchNumber: string;
  expiryDate: string;
  supplierId: string;
  storageLocation: string;
}

export interface StockMovement {
  id: string;
  salonId: string;
  productId: string;
  productName: string;
  type: 'entrada_compra' | 'venda_comanda' | 'consumo_tecnico' | 'perda_vencimento' | 'ajuste' | 'estorno_cancelamento';
  quantity: number;
  unit: 'un' | 'ml' | 'g';
  date: string;
  reference: string;
  operator: string;
}

export interface CommissionRecord {
  id: string;
  salonId: string;
  comandaId: string;
  comandaNumber: number;
  professionalId: string;
  professionalName: string;
  roleInService: 'executor' | 'auxiliar' | 'vendedor_produto';
  itemDescription: string;
  grossValue: number;
  discountApplied: number;
  calculationBase: number;
  commissionPct: number;
  commissionAmount: number;
  status: 'prevista' | 'elegivel' | 'aprovada' | 'paga' | 'estornada';
  date: string;
}

export interface CashMovement {
  id: string;
  type: 'abertura' | 'entrada_venda' | 'suprimento' | 'sangria' | 'despesa_caixa';
  paymentMethod: PaymentMethod | 'dinheiro_fisico';
  description: string;
  amount: number;
  timestamp: string;
  operatorName: string;
}

export interface CashSession {
  id: string;
  salonId: string;
  unitId: string;
  openedAt: string;
  closedAt?: string;
  operatorName: string;
  status: 'aberto' | 'fechado';
  openingBalanceCash: number;
  informedClosingCash?: number;
  divergenceNote?: string;
  approvedBy?: string;
  movements: CashMovement[];
}

export interface FinancialEntry {
  id: string;
  salonId: string;
  unitId: string;
  type: 'receber' | 'pagar';
  category: 'Comanda / Serviço' | 'Pacote' | 'Aluguel & Ocupação' | 'Fornecedores' | 'Comissões' | 'Energia, Água & Internet' | 'Tributos' | 'Pró-labore';
  description: string;
  entityName: string; // Client or Supplier/Professional
  dueDate: string;
  competenceDate: string;
  paymentDate?: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  paidAmount: number;
  status: 'pendente' | 'parcial' | 'liquidado' | 'vencido' | 'estornado';
  paymentMethod: PaymentMethod;
  referenceId?: string;
}

export interface ClientPackage {
  id: string;
  salonId: string;
  clientId: string;
  clientName: string;
  packageName: string;
  serviceId: string;
  serviceName: string;
  totalSessions: number;
  usedSessions: number;
  totalPricePaid: number;
  purchaseDate: string;
  validUntil: string;
  commissionRule: 'na_venda' | 'na_execucao';
  status: 'ativo' | 'concluido' | 'cancelado';
}

export interface SupplierOrder {
  id: string;
  salonId: string;
  supplierName: string;
  cnpj: string;
  createdAt: string;
  expectedDelivery: string;
  totalAmount: number;
  status: 'solicitado' | 'pedido_enviado' | 'recebido_parcial' | 'recebido_integral';
  itemsSummary: string;
  generatedPayableId?: string;
}

export interface AutomationRule {
  id: string;
  salonId: string;
  name: string;
  category: 'operacional' | 'relacionamento';
  channel: 'WhatsApp' | 'E-mail' | 'SMS';
  triggerDescription: string;
  templateText: string;
  active: boolean;
  sentCountMonth: number;
  deliveryRatePct: number;
}

export interface AuditLogEntry {
  id: string;
  salonId: string;
  timestamp: string;
  userName: string;
  userRole: UserRole;
  action: string;
  module: string;
  details: string;
  severity: 'info' | 'sensivel' | 'critico';
}
