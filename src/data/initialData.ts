import {
  Appointment,
  AuditLogEntry,
  AutomationRule,
  CashSession,
  ClientPackage,
  ClientProfile,
  Comanda,
  CommissionRecord,
  FinancialEntry,
  ProductStock,
  Professional,
  SalonService,
  SalonTenant,
  StockMovement,
  SupplierOrder,
  TechnicalRecord,
} from '../types/salon';

export const DEFAULT_THEME = {
  primaryColor: '#143328',
  secondaryColor: '#224B3C',
  accentColor: '#C59B27',
  backgroundColor: '#FAF8F5',
  surfaceColor: '#FFFFFF',
  themeMode: 'padrao' as const,
  logoText: 'Meu Salão',
  logoSubtext: 'Gestão Inteligente',
  shortIconText: 'MS',
  institutionalMessage: 'Bem-vindo ao sistema de gestão do seu salão.',
  publicDomain: '',
};

export const FALLBACK_SALON: SalonTenant = {
  id: 'default',
  commercialName: 'Meu Salão',
  legalName: 'Meu Salão de Beleza LTDA',
  cnpj: '',
  plan: 'Essencial',
  status: 'ativo',
  monthlyFee: 0,
  dailyRevenueGoal: 0,
  commissionReleaseRule: 'recebimento',
  shareClientsAcrossUnits: true,
  cancellationPolicy: '',
  municipalTaxCode: '',
  messageQuotaUsed: 0,
  messageQuotaLimit: 1000,
  storageUsedGb: 0,
  theme: DEFAULT_THEME,
  units: [],
};

export const INITIAL_SALONS: SalonTenant[] = [];

export const INITIAL_PROFESSIONALS: Professional[] = [];

export const INITIAL_SERVICES: SalonService[] = [];

export const INITIAL_CLIENTS: ClientProfile[] = [];

export const INITIAL_APPOINTMENTS: Appointment[] = [];

export const INITIAL_COMANDAS: Comanda[] = [];

export const INITIAL_PRODUCTS: ProductStock[] = [];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [];

export const INITIAL_COMMISSIONS: CommissionRecord[] = [];

export const INITIAL_CASH_SESSION: CashSession = {
  id: 'cx-default',
  salonId: '',
  unitId: '',
  openedAt: '08:00',
  operatorName: 'Caixa',
  status: 'aberto',
  openingBalanceCash: 0,
  movements: [],
};

export const INITIAL_FINANCIAL_ENTRIES: FinancialEntry[] = [];

export const INITIAL_PACKAGES: ClientPackage[] = [];

export const INITIAL_SUPPLIER_ORDERS: SupplierOrder[] = [];

export const INITIAL_AUTOMATIONS: AutomationRule[] = [];

export const INITIAL_TECHNICAL_RECORDS: TechnicalRecord[] = [];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];
