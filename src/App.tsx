/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Bell,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Database,
  FileText,
  Gift,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageSquare,
  Package,
  Percent,
  Plus,
  Scissors,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Appointment,
  AppointmentStatus,
  AuditLogEntry,
  AutomationRule,
  CashSession,
  ClientPackage,
  ClientProfile,
  Comanda,
  ComandaItem,
  CommissionRecord,
  EnvironmentMode,
  FinancialEntry,
  PaymentMethod,
  ProductStock,
  Professional,
  SalonMenuId,
  SalonService,
  SalonTenant,
  SalonTheme,
  StockMovement,
  SupplierOrder,
  TechnicalRecord,
  UserRole,
} from './types/salon';
import {
  FALLBACK_SALON,
  INITIAL_APPOINTMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_AUTOMATIONS,
  INITIAL_CASH_SESSION,
  INITIAL_CLIENTS,
  INITIAL_COMANDAS,
  INITIAL_COMMISSIONS,
  INITIAL_FINANCIAL_ENTRIES,
  INITIAL_PACKAGES,
  INITIAL_PRODUCTS,
  INITIAL_PROFESSIONALS,
  INITIAL_SALONS,
  INITIAL_SERVICES,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SUPPLIER_ORDERS,
  INITIAL_TECHNICAL_RECORDS,
} from './data/initialData';
import {
  calculateComandaTotals,
  getAllowedMenusForRole,
  redeemPackageSession,
} from './utils/salonRules';
import { OperationDashboard } from './components/OperationDashboard';
import { AgendaAndReceptionView } from './components/AgendaAndReceptionView';
import { ComandasAndAttendanceView } from './components/ComandasAndAttendanceView';
import { CatalogAndStockView } from './components/CatalogAndStockView';
import { FinancialAndReportsView } from './components/FinancialAndReportsView';
import { SettingsAndPortalsView } from './components/SettingsAndPortalsView';
import { AuthScreen } from './components/AuthScreen';
import {
  AuthUser,
  DbStatus,
  generateUuid,
  getDbStatus,
  getStoredUser,
  clearStoredUser,
  fetchTenantsFromDb,
  createTenantInDb,
  updateTenantInDb,
  fetchProfessionalsFromDb,
  createProfessionalInDb,
  fetchServicesFromDb,
  createServiceInDb,
  fetchClientsFromDb,
  createClientInDb,
  fetchAppointmentsFromDb,
  createAppointmentInDb,
  updateAppointmentInDb,
  fetchComandasFromDb,
  createComandaInDb,
  updateComandaInDb,
  fetchProductsFromDb,
  createProductInDb,
  updateProductInDb,
} from './services/dbClient';

const MENU_ITEMS: {
  id: SalonMenuId;
  number: string;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'operacao', number: '01', label: 'Painel de operação', icon: LayoutDashboard },
  { id: 'agenda', number: '02', label: 'Agenda', icon: Calendar },
  { id: 'recepcao', number: '03', label: 'Recepção e fila', icon: UserCheck },
  { id: 'comandas', number: '04', label: 'Atendimentos e comandas', icon: FileText },
  { id: 'clientes', number: '05', label: 'Clientes e CRM', icon: Users },
  { id: 'servicos', number: '06', label: 'Serviços', icon: Scissors },
  { id: 'estoque', number: '07', label: 'Produtos e estoque', icon: Package },
  { id: 'profissionais', number: '08', label: 'Profissionais', icon: Sparkles },
  { id: 'comissoes', number: '09', label: 'Comissões', icon: Percent },
  { id: 'pacotes', number: '10', label: 'Pacotes, planos e assinaturas', icon: Gift },
  { id: 'financeiro', number: '11', label: 'Financeiro e caixa', icon: Wallet },
  { id: 'compras', number: '12', label: 'Compras e fornecedores', icon: ShoppingBag },
  { id: 'marketing', number: '13', label: 'Marketing e automações', icon: MessageSquare },
  { id: 'relatorios', number: '14', label: 'Relatórios', icon: BarChart3 },
  { id: 'configuracoes', number: '15', label: 'Configurações', icon: Settings },
];

export default function App() {
  // Multi-tenant & Environment state
  const [salons, setSalons] = useState<SalonTenant[]>(INITIAL_SALONS);
  const [activeSalonId, setActiveSalonId] = useState<string>('salon-1');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('todas');
  const [environmentMode, setEnvironmentMode] = useState<EnvironmentMode>('salon_admin');
  const [currentRole, setCurrentRole] = useState<UserRole>('proprietario');
  const [activeMenu, setActiveMenu] = useState<SalonMenuId>('operacao');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [periodFilter, setPeriodFilter] = useState<'hoje' | '7dias' | 'mes'>('hoje');
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Shared Operational & Financial Stores (Seção 1: Agenda, estoque, comissões e financeiro compartilham os mesmos registros)
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [comandas, setComandas] = useState<Comanda[]>(INITIAL_COMANDAS);
  const [selectedComandaId, setSelectedComandaId] = useState<string | null>('cmd-2041');
  const [clients, setClients] = useState<ClientProfile[]>(INITIAL_CLIENTS);
  const [professionals, setProfessionals] = useState<Professional[]>(INITIAL_PROFESSIONALS);
  const [services, setServices] = useState<SalonService[]>(INITIAL_SERVICES);
  const [products, setProducts] = useState<ProductStock[]>(INITIAL_PRODUCTS);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(INITIAL_STOCK_MOVEMENTS);
  const [commissions, setCommissions] = useState<CommissionRecord[]>(INITIAL_COMMISSIONS);
  const [cashSession, setCashSession] = useState<CashSession>(INITIAL_CASH_SESSION);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>(INITIAL_FINANCIAL_ENTRIES);
  const [packages, setPackages] = useState<ClientPackage[]>(INITIAL_PACKAGES);
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>(INITIAL_SUPPLIER_ORDERS);
  const [automations, setAutomations] = useState<AutomationRule[]>(INITIAL_AUTOMATIONS);
  const [technicalRecords, setTechnicalRecords] = useState<TechnicalRecord[]>(INITIAL_TECHNICAL_RECORDS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  // Status de Conexão com o Neon Lakebase Postgres
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [isDbLoading, setIsDbLoading] = useState<boolean>(true);

  // Autenticação & Usuário
  const [authUser, setAuthUser] = useState<AuthUser | null>(getStoredUser());

  // Carregamento de dados por Tenant direto do Neon Postgres
  const loadTenantData = async (tenantId?: string) => {
    try {
      setIsDbLoading(true);
      const [status, fetchedTenants, fetchedProfs, fetchedServices, fetchedClients, fetchedAppts, fetchedCmds, fetchedProds] =
        await Promise.all([
          getDbStatus(),
          fetchTenantsFromDb(),
          fetchProfessionalsFromDb(tenantId),
          fetchServicesFromDb(tenantId),
          fetchClientsFromDb(tenantId),
          fetchAppointmentsFromDb(tenantId),
          fetchComandasFromDb(tenantId),
          fetchProductsFromDb(tenantId),
        ]);

      if (status) setDbStatus(status);
      if (fetchedTenants.length > 0) {
        setSalons(fetchedTenants);
        if (!tenantId && !activeSalonId && fetchedTenants[0]?.id) {
          setActiveSalonId(fetchedTenants[0].id);
        }
      }

      // Se o usuário logado pertence a um tenant que não existe mais (ex: reset de dados), limpa
      if (authUser && fetchedTenants.length > 0 && !fetchedTenants.some((t) => t.id === authUser.tenantId)) {
        clearStoredUser();
        setAuthUser(null);
        setEnvironmentMode('salon_admin');
      }

      setProfessionals(fetchedProfs);
      setServices(fetchedServices);
      setClients(fetchedClients);
      setAppointments(fetchedAppts);
      setComandas(fetchedCmds);
      setProducts(fetchedProds);
      setIsDbLoading(false);
    } catch (e) {
      console.warn('Erro ao carregar dados do Neon DB:', e);
      setIsDbLoading(false);
    }
  };

  useEffect(() => {
    const currentTenant = authUser?.tenantId || activeSalonId;
    loadTenantData(currentTenant);

    const interval = setInterval(async () => {
      const s = await getDbStatus();
      if (s) setDbStatus(s);
    }, 20000);

    return () => clearInterval(interval);
  }, [activeSalonId, authUser?.tenantId]);

  const handleLoginSuccess = (user: AuthUser) => {
    setAuthUser(user);
    if (user.tenantId) {
      setActiveSalonId(user.tenantId);
    }
    if (user.role) {
      setCurrentRole(user.role);
    }
    setEnvironmentMode('salon_admin');
    loadTenantData(user.tenantId);
  };

  const handleLogout = () => {
    clearStoredUser();
    setAuthUser(null);
    setEnvironmentMode('salon_admin');
  };

  const activeSalon =
    salons.find((s) => s.id === activeSalonId || (s as any).slug === activeSalonId) ||
    salons[0] ||
    FALLBACK_SALON;
  const allowedMenus = getAllowedMenusForRole(currentRole);

  // Sync CSS theme variables with the active salon's White-Label theme (Seção 2.2)
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--salon-primary', activeSalon.theme.primaryColor);
    root.style.setProperty('--salon-secondary', activeSalon.theme.secondaryColor);
    root.style.setProperty('--salon-accent', activeSalon.theme.accentColor);
    root.style.setProperty('--salon-bg', activeSalon.theme.backgroundColor);
    root.style.setProperty('--salon-surface', activeSalon.theme.surfaceColor);
  }, [activeSalon]);

  // Ensure activeMenu is valid for currentRole
  useEffect(() => {
    if (!allowedMenus.includes(activeMenu)) {
      setActiveMenu(allowedMenus[0] || 'operacao');
    }
  }, [currentRole, allowedMenus, activeMenu]);

  const appendAudit = (action: string, module: string, details: string, severity: AuditLogEntry['severity'] = 'info') => {
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        salonId: activeSalon.id,
        timestamp: '2026-10-26 15:10:00',
        userName: `Usuário (${currentRole})`,
        userRole: currentRole,
        action,
        module,
        details,
        severity,
      },
      ...prev,
    ]);
  };

  // Handlers connecting Agenda -> Recepção -> Comanda -> Pagamento -> Caixa -> Estoque -> Comissão
  const handleCreateAppointment = async (newAppt: Omit<Appointment, 'id'>) => {
    const tempId = generateUuid();
    const created: Appointment = {
      ...newAppt,
      id: tempId,
    };
    setAppointments((prev) => [created, ...prev]);
    appendAudit(
      'Novo Agendamento Criado',
      'Agenda',
      `${created.clientName} agendado para ${created.serviceName} às ${created.startTime} com ${created.professionalName}.`
    );

    // Persiste no Neon
    const saved = await createAppointmentInDb({
      ...created,
      salonId: activeSalon.id,
      unitId: selectedUnitId !== 'todas' ? selectedUnitId : activeSalon.units[0]?.id,
    });
    if (saved?.id) {
      setAppointments((prev) => prev.map((a) => (a.id === tempId ? { ...a, id: saved.id } : a)));
    }
  };

  const handleUpdateAppointmentStatus = async (appointmentId: string, newStatus: AppointmentStatus) => {
    const checkInTime = newStatus === 'chegou' ? '15:05' : undefined;
    const serviceStartTime = newStatus === 'em_atendimento' ? '15:10' : undefined;
    const serviceEndTime = newStatus === 'concluido' ? '16:10' : undefined;

    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId
          ? {
              ...a,
              status: newStatus,
              checkInTime: checkInTime || a.checkInTime,
              serviceStartTime: serviceStartTime || a.serviceStartTime,
              serviceEndTime: serviceEndTime || a.serviceEndTime,
            }
          : a
      )
    );

    // Persiste no Neon
    await updateAppointmentInDb(appointmentId, {
      status: newStatus,
      checkInTime,
      serviceStartTime,
    });
  };

  const handleStartAttendanceAndOpenComanda = async (appointmentId: string) => {
    const appt = appointments.find((a) => a.id === appointmentId);
    if (!appt) return;

    // Se já tem comanda aberta, apenas navega
    if (appt.comandaId) {
      handleUpdateAppointmentStatus(appointmentId, 'em_atendimento');
      setSelectedComandaId(appt.comandaId);
      setActiveMenu('comandas');
      return;
    }

    const srv = services.find((s) => s.id === appt.serviceId);
    const newComandaId = generateUuid();
    const newComandaNumber = 2040 + comandas.length + 1;

    const newComanda: Comanda = {
      id: newComandaId,
      number: newComandaNumber,
      salonId: appt.salonId || activeSalon.id,
      unitId: appt.unitId,
      appointmentId: appt.id,
      clientId: appt.clientId,
      clientName: appt.clientName,
      openedAt: '15:10',
      attendanceStatus: 'em_andamento',
      comandaStatus: 'aberta',
      paymentStatus: 'pendente',
      depositAlreadyPaid: appt.depositPaid,
      depositApplied: appt.depositPaid > 0,
      globalDiscount: 0,
      tipAmount: 0,
      nfseStatus: 'nao_solicitada',
      items: [
        {
          id: generateUuid(),
          type: 'servico',
          referenceId: appt.serviceId,
          name: appt.serviceName,
          professionalId: appt.professionalId,
          professionalName: appt.professionalName,
          quantity: 1,
          unitPrice: appt.estimatedPrice,
          discount: 0,
          commissionPct: srv?.defaultCommissionPct || 45,
          cancelled: false,
        },
      ],
      payments: [],
    };

    setComandas((prev) => [newComanda, ...prev]);
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId
          ? {
              ...a,
              status: 'em_atendimento',
              serviceStartTime: '15:10',
              comandaId: newComandaId,
              depositDeductedInComanda: appt.depositPaid > 0,
            }
          : a
      )
    );
    setSelectedComandaId(newComandaId);
    setActiveMenu('comandas');
    appendAudit(
      `Atendimento Iniciado e Comanda #${newComandaNumber} Aberta`,
      'Recepção & Comandas',
      `Cliente ${appt.clientName} iniciou ${appt.serviceName}. Sinal prévio abatido: R$ ${appt.depositPaid}.`
    );

    // Persiste no Neon
    createComandaInDb(newComanda);
    updateAppointmentInDb(appointmentId, {
      status: 'em_atendimento',
      serviceStartTime: '15:10',
    });
  };

  const handleTransferProfessional = (appointmentId: string, newProfessionalId: string) => {
    const prof = professionals.find((p) => p.id === newProfessionalId);
    if (!prof) return;
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId
          ? { ...a, professionalId: prof.id, professionalName: prof.name }
          : a
      )
    );
    appendAudit(
      'Transferência de Profissional',
      'Recepção & Fila',
      `Agendamento ${appointmentId} transferido para ${prof.name}.`
    );
  };

  const handleAddComandaItem = (comandaId: string, item: Omit<ComandaItem, 'id'>) => {
    const newItem: ComandaItem = { ...item, id: generateUuid() };
    const cmd = comandas.find((c) => c.id === comandaId);
    if (!cmd) return;
    const nextItems = [...cmd.items, newItem];

    setComandas((prev) =>
      prev.map((c) => (c.id === comandaId ? { ...c, items: nextItems } : c))
    );
    updateComandaInDb(comandaId, { items: nextItems });

    // Se for produto de revenda, baixa automaticamente o estoque (Seção 10 e 13)
    if (item.type === 'produto') {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === item.referenceId) {
            const nextStock = Math.max(0, p.currentStock - item.quantity);
            updateProductInDb(p.id, { currentStock: nextStock });
            return { ...p, currentStock: nextStock };
          }
          return p;
        })
      );
      setStockMovements((prev) => [
        {
          id: generateUuid(),
          salonId: activeSalon.id,
          productId: item.referenceId,
          productName: item.name,
          type: 'venda_comanda',
          quantity: -item.quantity,
          unit: 'un',
          date: '2026-10-26 15:15',
          reference: `Venda em Comanda · ${item.professionalName}`,
          operator: item.professionalName,
        },
        ...prev,
      ]);
    }

    // Gera registro de comissão prevista
    const base = item.unitPrice * item.quantity - item.discount;
    const commVal = Number(((base * item.commissionPct) / 100).toFixed(2));
    setCommissions((prev) => [
      {
        id: generateUuid(),
        salonId: activeSalon.id,
        comandaId: cmd.id,
        comandaNumber: cmd.number,
        professionalId: item.professionalId,
        professionalName: item.professionalName,
        roleInService: item.type === 'produto' ? 'vendedor_produto' : 'executor',
        itemDescription: item.name,
        grossValue: base,
        discountApplied: item.discount,
        calculationBase: base,
        commissionPct: item.commissionPct,
        commissionAmount: commVal,
        status: 'prevista',
        date: '2026-10-26',
      },
      ...prev,
    ]);
  };

  // Regra 6 (Seção 21): Um item cancelado gera os ajustes de estoque, comissão e financeiro correspondentes
  const handleCancelComandaItem = (comandaId: string, itemId: string, reason: string) => {
    const cmd = comandas.find((c) => c.id === comandaId);
    const targetItem = cmd?.items.find((i) => i.id === itemId);
    if (!cmd || !targetItem) return;

    const nextItems = cmd.items.map((i) =>
      i.id === itemId ? { ...i, cancelled: true, cancelReason: reason } : i
    );

    setComandas((prev) =>
      prev.map((c) =>
        c.id === comandaId
          ? {
              ...c,
              items: nextItems,
            }
          : c
      )
    );
    updateComandaInDb(comandaId, { items: nextItems });

    if (targetItem.type === 'produto') {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === targetItem.referenceId) {
            const nextStock = p.currentStock + targetItem.quantity;
            updateProductInDb(p.id, { currentStock: nextStock });
            return { ...p, currentStock: nextStock };
          }
          return p;
        })
      );
      setStockMovements((prev) => [
        {
          id: generateUuid(),
          salonId: activeSalon.id,
          productId: targetItem.referenceId,
          productName: targetItem.name,
          type: 'estorno_cancelamento',
          quantity: targetItem.quantity,
          unit: 'un',
          date: '2026-10-26 15:20',
          reference: `Estorno Item Cancelado Comanda #${cmd.number}`,
          operator: `Usuário (${currentRole})`,
        },
        ...prev,
      ]);
    }

    appendAudit(
      `Cancelamento de Item em Comanda #${cmd.number}`,
      'Comandas',
      `Item "${targetItem.name}" cancelado (${reason}). Estoque e comissão ajustados (Regra 6).`,
      'sensivel'
    );
  };

  const handleUpdateComandaAdjustments = (
    comandaId: string,
    globalDiscount: number,
    tipAmount: number
  ) => {
    setComandas((prev) =>
      prev.map((c) =>
        c.id === comandaId ? { ...c, globalDiscount, tipAmount } : c
      )
    );
    updateComandaInDb(comandaId, { globalDiscount, tipAmount });
  };

  // Regra 4 (Seção 21): Concluir atendimento não marca automaticamente a dívida como paga
  const handleFinishAttendanceOnly = (comandaId: string) => {
    const cmd = comandas.find((c) => c.id === comandaId);
    if (!cmd) return;

    setComandas((prev) =>
      prev.map((c) =>
        c.id === comandaId
          ? { ...c, attendanceStatus: 'concluido', comandaStatus: 'fechada_pendente' }
          : c
      )
    );
    updateComandaInDb(comandaId, { attendanceStatus: 'concluido', comandaStatus: 'fechada_pendente' });

    if (cmd.appointmentId) {
      handleUpdateAppointmentStatus(cmd.appointmentId, 'concluido');
    }
  };

  const handleRegisterPayment = (
    comandaId: string,
    method: PaymentMethod,
    amount: number,
    installments: number,
    payerLabel: string
  ) => {
    const cmd = comandas.find((c) => c.id === comandaId);
    if (!cmd) return;

    const feePct =
      method === 'pix'
        ? 0.89
        : method === 'cartao_debito'
        ? 1.39
        : method === 'cartao_credito'
        ? 2.89
        : 0;
    const netAmount = Number((amount * (1 - feePct / 100)).toFixed(2));

    const updatedComandas = comandas.map((c) => {
      if (c.id !== comandaId) return c;
      const nextPayments = [
        ...c.payments,
        {
          id: generateUuid(),
          method,
          amount,
          installments,
          payerLabel,
          paidAt: '15:25',
          operatorFeePct: feePct,
          netAmount,
          externalTxId: `TX-${Date.now()}`,
        },
      ];
      const nextCmd: Comanda = {
        ...c,
        payments: nextPayments,
        attendanceStatus: 'concluido',
      };
      const totals = calculateComandaTotals(nextCmd);
      return {
        ...nextCmd,
        paymentStatus: totals.paymentStatus,
        comandaStatus: totals.paymentStatus === 'pago' ? ('liquidada' as const) : ('fechada_pendente' as const),
        closedAt: totals.paymentStatus === 'pago' ? '15:25' : undefined,
      };
    });

    setComandas(updatedComandas);

    const targetCmd = updatedComandas.find((c) => c.id === comandaId);
    if (targetCmd) {
      updateComandaInDb(comandaId, {
        attendanceStatus: targetCmd.attendanceStatus,
        comandaStatus: targetCmd.comandaStatus,
        paymentStatus: targetCmd.paymentStatus,
        closedAt: targetCmd.closedAt,
        payments: targetCmd.payments,
      });
    }

    // Atualiza sessão de caixa (separando dinheiro físico de Pix/Cartão)
    setCashSession((prev) => ({
      ...prev,
      movements: [
        ...prev.movements,
        {
          id: generateUuid(),
          type: 'entrada_venda',
          paymentMethod: method,
          description: `Comanda #${cmd.number} · ${cmd.clientName} (${payerLabel})`,
          amount,
          timestamp: '15:25',
          operatorName: prev.operatorName,
        },
      ],
    }));

    // Atualiza elegibilidade das comissões vinculadas
    setCommissions((prev) =>
      prev.map((com) =>
        com.comandaId === comandaId ? { ...com, status: 'elegivel' } : com
      )
    );

    if (cmd.appointmentId) {
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === cmd.appointmentId
            ? { ...a, status: 'concluido', paymentStatus: 'pago' }
            : a
        )
      );
    }

    appendAudit(
      `Recebimento Registrado na Comanda #${cmd.number}`,
      'Comandas & Caixa',
      `Recebido R$ ${amount.toFixed(2)} via ${method.toUpperCase()} (${installments}x).`
    );
  };

  const handleIssueNfse = (comandaId: string) => {
    setComandas((prev) =>
      prev.map((c) =>
        c.id === comandaId
          ? {
              ...c,
              nfseStatus: 'emitida',
              nfseNumber: `NFS-e 2026/${Math.floor(100000 + Math.random() * 900000)}`,
            }
          : c
      )
    );
  };

  const handleCreateStandaloneComanda = (clientId: string) => {
    const cli = clients.find((c) => c.id === clientId) || clients[0];
    if (!cli) return;
    const newId = generateUuid();
    const newNum = 2040 + comandas.length + 1;
    const newCmd: Comanda = {
      id: newId,
      number: newNum,
      salonId: activeSalon.id,
      unitId: activeSalon.units[0]?.id || 'unit-1',
      clientId: cli.id,
      clientName: cli.name,
      openedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      attendanceStatus: 'em_andamento',
      comandaStatus: 'aberta',
      paymentStatus: 'pendente',
      depositAlreadyPaid: 0,
      depositApplied: false,
      globalDiscount: 0,
      tipAmount: 0,
      nfseStatus: 'nao_solicitada',
      items: [],
      payments: [],
    };
    setComandas((prev) => [newCmd, ...prev]);
    setSelectedComandaId(newId);
    createComandaInDb(newCmd);
  };

  // Quando não houver sessão ativa e não estiver na visualização pública, renderiza a tela de login estruturada
  if (!authUser && environmentMode !== 'client_portal') {
    return (
      <AuthScreen
        dbStatus={dbStatus}
        isDbLoading={isDbLoading}
        onLoginSuccess={handleLoginSuccess}
        onViewClientPortal={() => setEnvironmentMode('client_portal')}
      />
    );
  }

  return (
    <div
      style={{ backgroundColor: activeSalon.theme.backgroundColor }}
      className="min-h-screen flex flex-col lg:flex-row text-stone-900"
    >
      {/* MENU LATERAL FIXO COM LOGO DO SALÃO (Seção 2.1 e Seção 3) - Oculto na visualização pública do cliente */}
      {environmentMode !== 'client_portal' && (
        <aside
          style={{ backgroundColor: activeSalon.theme.primaryColor }}
          className={`${
            mobileMenuOpen ? 'fixed inset-y-0 left-0 z-40 w-72 flex' : 'hidden lg:flex'
          } shrink-0 text-white flex-col justify-between transition-all duration-200 ${
            sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
          }`}
        >
        <div>
          {/* Identidade Visual do Salão no Topo da Sidebar */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                style={{
                  backgroundColor: activeSalon.theme.accentColor,
                  color: '#14201A',
                }}
                className="w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-xs"
              >
                {activeSalon.theme.shortIconText}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="font-editorial text-lg font-semibold tracking-tight truncate">
                    {activeSalon.theme.logoText}
                  </div>
                  <div className="text-[11px] text-white/70 truncate">
                    {activeSalon.theme.logoSubtext}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
            {mobileMenuOpen && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden px-2 py-1 text-xs text-white/80 hover:text-white"
              >
                Fechar
              </button>
            )}
          </div>

          {/* Seletor de Ambiente (Gestão do Salão, Área do Profissional, Área do Cliente, Admin SaaS - Seção 1) */}
          {!sidebarCollapsed && (
            <div className="px-3.5 pt-3.5 pb-1.5">
              <div className="text-[11px] text-white/60 mb-1.5 px-1">
                Ambiente Conectado (Seção 1)
              </div>
              <div className="grid grid-cols-2 gap-1 bg-black/20 p-1 rounded-xl text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setEnvironmentMode('salon_admin');
                    setMobileMenuOpen(false);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-medium text-left truncate cursor-pointer ${
                    environmentMode === 'salon_admin'
                      ? 'bg-white text-stone-900'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  1. Gestão Salão
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEnvironmentMode('professional_portal');
                    setMobileMenuOpen(false);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-medium text-left truncate cursor-pointer ${
                    environmentMode === 'professional_portal'
                      ? 'bg-white text-stone-900'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  2. Profissional
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEnvironmentMode('client_portal');
                    setMobileMenuOpen(false);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-medium text-left truncate cursor-pointer ${
                    (environmentMode as string) === 'client_portal'
                      ? 'bg-white text-stone-900'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  3. Área Cliente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEnvironmentMode('platform_admin');
                    setMobileMenuOpen(false);
                  }}
                  className={`py-1.5 px-2 rounded-lg font-medium text-left truncate cursor-pointer ${
                    environmentMode === 'platform_admin'
                      ? 'bg-white text-stone-900'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  4. Admin SaaS
                </button>
              </div>
            </div>
          )}

          {/* Lista dos 15 Menus do Painel do Salão filtrados por permissão (Seção 3 e 18) */}
          <nav
            aria-label="Menu principal do salão"
            className="p-2.5 space-y-0.5 overflow-y-auto max-h-[calc(100vh-210px)]"
          >
            {MENU_ITEMS.filter((item) => allowedMenus.includes(item.id)).map((item) => {
              const Icon = item.icon;
              const isActive =
                environmentMode === 'salon_admin' && activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setEnvironmentMode('salon_admin');
                    setActiveMenu(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-white/15 text-white shadow-xs'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[1.5] shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="truncate">
                      <span className="text-white/45 font-mono-tabular mr-1.5">
                        {item.number}.
                      </span>
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Rodapé da Sidebar: Troca Rápida de Salão Assinante (Multi-Tenant Seção 17) */}
        {!sidebarCollapsed && (
          <div className="p-3.5 border-t border-white/10 space-y-1.5 text-xs">
            <label htmlFor="tenant-switcher" className="block text-[11px] text-white/65">
              Estabelecimento Ativo (Multi-Salão):
            </label>
            <select
              id="tenant-switcher"
              value={activeSalonId}
              onChange={(e) => {
                setActiveSalonId(e.target.value);
                setSelectedUnitId('todas');
              }}
              className="w-full rounded-xl bg-black/25 border border-white/15 px-2.5 py-1.5 text-xs text-white font-medium"
            >
              {salons.map((s) => (
                <option key={s.id} value={s.id} className="text-stone-900">
                  {s.commercialName} ({s.plan})
                </option>
              ))}
            </select>
          </div>
        )}
      </aside>
      )}

      {/* ÁREA DE CONTEÚDO PRINCIPAL + BARRA SUPERIOR (Seção 2.1) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra Superior: 3 zonas em linha única no desktop */}
        <header className="bg-white/95 backdrop-blur-xs border-b border-stone-200/80 px-4 lg:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-20">
          {/* Zona 1: Menu Mobile + Busca Global (ou Logo na visão pública) */}
          {environmentMode !== 'client_portal' ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                aria-label="Abrir menu de navegação"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{ backgroundColor: activeSalon.theme.primaryColor }}
                className="lg:hidden px-2.5 py-1.5 rounded-lg text-white text-xs font-medium shrink-0"
              >
                Menu
              </button>
              <div className="relative w-44 sm:w-56 xl:w-64">
                <Search className="w-3.5 h-3.5 text-stone-400 stroke-[1.5] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  aria-label="Busca global de clientes, comandas ou serviços"
                  placeholder="Buscar cliente, comanda #2041..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && globalSearch.trim()) {
                      setEnvironmentMode('salon_admin');
                      setActiveMenu('agenda');
                    }
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200/90 bg-stone-50/70 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                style={{ backgroundColor: activeSalon.theme.primaryColor }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
              >
                {activeSalon.theme.shortIconText}
              </div>
              <div>
                <span className="text-xs font-semibold text-stone-900 block leading-tight">{activeSalon.commercialName}</span>
                <span className="text-[10px] text-stone-500 block">Página Pública de Agendamento Online</span>
              </div>
            </div>
          )}

          {/* Zona 2: Seletores de Unidade e Perfil de Permissão (Seção 17 e 18) - Somente na área administrativa */}
          {environmentMode !== 'client_portal' && (
            <div className="hidden md:flex items-center gap-2.5 text-xs shrink-0">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-stone-500 stroke-[1.5]" />
                <select
                  aria-label="Selecionar unidade do salão"
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="border border-stone-200 rounded-lg px-2 py-1.5 bg-white text-stone-800 font-medium"
                >
                  <option value="todas">Todas as Unidades ({activeSalon.units.length})</option>
                  {activeSalon.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-stone-500">Perfil:</span>
                <select
                  aria-label="Simular perfil de permissão de usuário"
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value as UserRole)}
                  className="border border-stone-200 rounded-lg px-2 py-1.5 bg-white text-stone-900 font-medium"
                >
                  <option value="proprietario">Proprietário (Total)</option>
                  <option value="gerente">Gerente</option>
                  <option value="recepcao">Recepção</option>
                  <option value="caixa">Caixa</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="profissional">Profissional</option>
                  <option value="estoque">Estoque</option>
                  <option value="marketing">Marketing</option>
                </select>
              </div>
            </div>
          )}

          {/* Zona 3: Data & Conexão Neon & Ação Rápida */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Indicador de Fluidez e Conexão em Tempo Real com Neon Lakebase Postgres */}
            <div 
              title={dbStatus ? `Banco: ${dbStatus.stats?.database_name || 'neondb'} (Latência: ${dbStatus.latencyMs}ms)` : 'Conectando ao Neon...'}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/90 border border-emerald-200/80 text-[11px] text-emerald-800 font-medium cursor-default shadow-xs"
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dbStatus ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${dbStatus ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
              <Database className="w-3.5 h-3.5 text-emerald-700 stroke-[1.8]" />
              <span className="font-mono-tabular">
                {dbStatus ? `Neon: ${dbStatus.latencyMs}ms` : isDbLoading ? 'Conectando DB...' : 'Neon DB'}
              </span>
            </div>

            <span className="hidden xl:inline text-xs text-stone-500 font-mono-tabular whitespace-nowrap">
              26 Out 2026
            </span>
            <button
              type="button"
              onClick={() =>
                setEnvironmentMode(
                  environmentMode === 'client_portal' ? 'salon_admin' : 'client_portal'
                )
              }
              className="px-3 py-1.5 text-xs font-medium text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              {environmentMode === 'client_portal'
                ? 'Painel do Salão'
                : 'Página Pública do Cliente'}
            </button>

            {/* Sistema de Login / Usuário Conectado */}
            {authUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-stone-900 leading-tight">{authUser.fullName}</span>
                  <span className="text-[10px] text-stone-500 capitalize">{authUser.role}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sair / Trocar de Conta"
                  className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 stroke-[1.8]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEnvironmentMode('salon_admin')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#143328] hover:bg-[#1a4436] rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar no Painel</span>
              </button>
            )}
          </div>
        </header>

        {/* VIEWPORT PRINCIPAL */}
        <main className="flex-1 p-5 lg:p-8 max-w-[1440px] w-full mx-auto">
          {environmentMode === 'professional_portal' && (
            <SettingsAndPortalsView
              viewType="professional_portal"
              salon={activeSalon}
              allSalons={salons}
              professionals={professionals}
              services={services}
              appointments={appointments}
              commissions={commissions}
              packages={packages}
              clients={clients}
              technicalRecords={technicalRecords}
              auditLogs={auditLogs}
              onUpdateSalonTheme={() => {}}
              onUpdateSalonRule={() => {}}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
              onCreateOnlineAppointment={handleCreateAppointment}
              onCreateNewTenantSalon={() => {}}
              onToggleTenantStatus={() => {}}
              onSwitchActiveSalon={setActiveSalonId}
            />
          )}

          {environmentMode === 'client_portal' && (
            <SettingsAndPortalsView
              viewType="client_portal"
              salon={activeSalon}
              allSalons={salons}
              professionals={professionals}
              services={services}
              appointments={appointments}
              commissions={commissions}
              packages={packages}
              clients={clients}
              technicalRecords={technicalRecords}
              auditLogs={auditLogs}
              onUpdateSalonTheme={() => {}}
              onUpdateSalonRule={() => {}}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
              onCreateOnlineAppointment={handleCreateAppointment}
              onCreateNewTenantSalon={() => {}}
              onToggleTenantStatus={() => {}}
              onSwitchActiveSalon={setActiveSalonId}
            />
          )}

          {environmentMode === 'platform_admin' && (
            <SettingsAndPortalsView
              viewType="platform_admin"
              salon={activeSalon}
              allSalons={salons}
              professionals={professionals}
              services={services}
              appointments={appointments}
              commissions={commissions}
              packages={packages}
              clients={clients}
              technicalRecords={technicalRecords}
              auditLogs={auditLogs}
              onUpdateSalonTheme={() => {}}
              onUpdateSalonRule={() => {}}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
              onCreateOnlineAppointment={handleCreateAppointment}
              onCreateNewTenantSalon={async (commercialName, cnpj, plan) => {
                const created = await createTenantInDb({ name: commercialName, cnpj });
                if (created) {
                  setSalons((prev) => [...prev, created]);
                  setActiveSalonId(created.id);
                }
              }}
              onToggleTenantStatus={async (salonId) => {
                const s = salons.find((item) => item.id === salonId);
                const nextStatus = s?.status === 'ativo' ? 'suspenso' : 'ativo';
                setSalons((prev) =>
                  prev.map((item) =>
                    item.id === salonId ? { ...item, status: nextStatus } : item
                  )
                );
                updateTenantInDb(salonId, { status: nextStatus });
              }}
              onSwitchActiveSalon={(salonId) => {
                setActiveSalonId(salonId);
                setEnvironmentMode('salon_admin');
                setActiveMenu('operacao');
              }}
            />
          )}

          {environmentMode === 'salon_admin' && (
            <>
              {activeMenu === 'operacao' && (
                <OperationDashboard
                  salon={activeSalon}
                  selectedUnitId={selectedUnitId}
                  currentRole={currentRole}
                  periodFilter={periodFilter}
                  onPeriodFilterChange={setPeriodFilter}
                  appointments={appointments}
                  comandas={comandas}
                  professionals={professionals}
                  products={products}
                  cashSession={cashSession}
                  commissions={commissions}
                  financialEntries={financialEntries}
                  onNavigate={setActiveMenu}
                  onOpenNewAppointmentModal={() => setActiveMenu('agenda')}
                  onOpenNewClientModal={() => setActiveMenu('clientes')}
                  onCheckInAppointment={(id) => handleUpdateAppointmentStatus(id, 'chegou')}
                  onStartAttendance={handleStartAttendanceAndOpenComanda}
                  onSelectComanda={(cmdId) => {
                    setSelectedComandaId(cmdId);
                    setActiveMenu('comandas');
                  }}
                  onOpenQuickExpenseModal={() => setActiveMenu('financeiro')}
                  onUpdateDailyRevenueGoal={async (newGoal) => {
                    setSalons((prev) =>
                      prev.map((s) =>
                        s.id === activeSalon.id ? { ...s, dailyRevenueGoal: newGoal } : s
                      )
                    );
                    updateTenantInDb(activeSalon.id, { dailyRevenueGoal: newGoal });
                    appendAudit(
                      'Atualização de Meta de Faturamento Diário',
                      'Painel de Operação',
                      `Meta diária de ${activeSalon.commercialName} definida para R$ ${newGoal.toFixed(2)}.`
                    );
                  }}
                />
              )}

              {(activeMenu === 'agenda' || activeMenu === 'recepcao') && (
                <AgendaAndReceptionView
                  mode={activeMenu}
                  salon={activeSalon}
                  selectedUnitId={selectedUnitId}
                  appointments={appointments}
                  professionals={professionals}
                  services={services}
                  clients={clients}
                  onCreateAppointment={handleCreateAppointment}
                  onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
                  onStartAttendanceAndOpenComanda={handleStartAttendanceAndOpenComanda}
                  onTransferProfessional={handleTransferProfessional}
                />
              )}

              {activeMenu === 'comandas' && (
                <ComandasAndAttendanceView
                  salon={activeSalon}
                  comandas={comandas}
                  selectedComandaId={selectedComandaId}
                  onSelectComanda={setSelectedComandaId}
                  services={services}
                  products={products}
                  professionals={professionals}
                  clients={clients}
                  technicalRecords={technicalRecords}
                  onAddComandaItem={handleAddComandaItem}
                  onCancelComandaItem={handleCancelComandaItem}
                  onUpdateComandaAdjustments={handleUpdateComandaAdjustments}
                  onFinishAttendanceOnly={handleFinishAttendanceOnly}
                  onRegisterPayment={handleRegisterPayment}
                  onIssueNfse={handleIssueNfse}
                  onCreateStandaloneComanda={handleCreateStandaloneComanda}
                  onAddTechnicalRecord={(rec) => {
                    setTechnicalRecords((prev) => [{ ...rec, id: `tr-${Date.now()}` }, ...prev]);
                    appendAudit(
                      'Registro de Ficha Técnica com Dados Sensíveis LGPD',
                      'Atendimentos & Fichas',
                      `Ficha (${rec.templateType}) salva para cliente ${rec.clientId}.`,
                      'sensivel'
                    );
                  }}
                />
              )}

              {(activeMenu === 'clientes' ||
                activeMenu === 'servicos' ||
                activeMenu === 'estoque' ||
                activeMenu === 'profissionais' ||
                activeMenu === 'comissoes' ||
                activeMenu === 'pacotes') && (
                <CatalogAndStockView
                  activeMenu={activeMenu}
                  salon={activeSalon}
                  clients={clients}
                  services={services}
                  products={products}
                  stockMovements={stockMovements}
                  professionals={professionals}
                  commissions={commissions}
                  packages={packages}
                  onCreateClient={async (cli) => {
                    const newId = generateUuid();
                    const newClient = {
                      ...cli,
                      id: newId,
                      salonId: activeSalon.id,
                      internalCredit: 0,
                      loyaltyPoints: 0,
                      totalSpent: 0,
                      tags: cli.tags || [],
                      crmStage: cli.crmStage || 'novo_contato',
                    };
                    setClients((prev) => [newClient, ...prev]);
                    const saved = await createClientInDb({ ...newClient, salonId: activeSalon.id });
                    if (saved?.id && saved.id !== newId) {
                      setClients((prev) => prev.map((c) => (c.id === newId ? { ...c, id: saved.id } : c)));
                    }
                  }}
                  onCreateService={async (srv) => {
                    const newId = generateUuid();
                    const newService = {
                      ...srv,
                      id: newId,
                      salonId: activeSalon.id,
                      technicalMaterials: srv.technicalMaterials || [],
                    };
                    setServices((prev) => [newService, ...prev]);
                    const saved = await createServiceInDb({ ...newService, salonId: activeSalon.id });
                    if (saved?.id && saved.id !== newId) {
                      setServices((prev) => prev.map((s) => (s.id === newId ? { ...s, id: saved.id } : s)));
                    }
                  }}
                  onCreateProfessional={async (prof) => {
                    const newId = generateUuid();
                    const newProf = {
                      ...prof,
                      id: newId,
                      salonId: activeSalon.id,
                      unitId: activeSalon.units[0]?.id || selectedUnitId,
                    };
                    setProfessionals((prev) => [newProf, ...prev]);
                    const saved = await createProfessionalInDb({ ...newProf, salonId: activeSalon.id });
                    if (saved?.id && saved.id !== newId) {
                      setProfessionals((prev) => prev.map((p) => (p.id === newId ? { ...p, id: saved.id } : p)));
                    }
                  }}
                  onCreateProduct={async (prd) => {
                    const newId = generateUuid();
                    const newProd = {
                      ...prd,
                      id: newId,
                      salonId: activeSalon.id,
                      unitId: activeSalon.units[0]?.id || selectedUnitId,
                    };
                    setProducts((prev) => [newProd, ...prev]);
                    const saved = await createProductInDb({ ...newProd, salonId: activeSalon.id });
                    if (saved?.id && saved.id !== newId) {
                      setProducts((prev) => prev.map((p) => (p.id === newId ? { ...p, id: saved.id } : p)));
                    }
                  }}
                  onRecordStockMovement={(productId, type, quantity, reference) => {
                    const prd = products.find((p) => p.id === productId);
                    if (!prd) return;
                    const nextStock = Math.max(0, prd.currentStock + quantity);
                    setProducts((prev) =>
                      prev.map((p) =>
                        p.id === productId
                          ? { ...p, currentStock: nextStock }
                          : p
                      )
                    );
                    updateProductInDb(productId, { currentStock: nextStock });
                    setStockMovements((prev) => [
                      {
                        id: generateUuid(),
                        salonId: activeSalon.id,
                        productId,
                        productName: prd.name,
                        type,
                        quantity,
                        unit: prd.unit,
                        date: '2026-10-26 15:35',
                        reference,
                        operator: `Usuário (${currentRole})`,
                      },
                      ...prev,
                    ]);
                  }}
                  onApproveAndPayCommissions={(ids) => {
                    setCommissions((prev) =>
                      prev.map((c) => (ids.includes(c.id) ? { ...c, status: 'paga' } : c))
                    );
                    appendAudit(
                      'Liquidação de Repasses de Comissões',
                      'Comissões',
                      `${ids.length} comissões aprovadas e marcadas como pagas.`
                    );
                  }}
                  onRedeemPackageSession={(pkgId) => {
                    setPackages((prev) =>
                      prev.map((pkg) => {
                        if (pkg.id !== pkgId) return pkg;
                        return redeemPackageSession(pkg).updatedPackage;
                      })
                    );
                  }}
                  onCreatePackage={(pkg) =>
                    setPackages((prev) => [{ ...pkg, id: `pkg-${Date.now()}` }, ...prev])
                  }
                />
              )}

              {(activeMenu === 'financeiro' ||
                activeMenu === 'compras' ||
                activeMenu === 'marketing' ||
                activeMenu === 'relatorios') && (
                <FinancialAndReportsView
                  activeMenu={activeMenu}
                  salon={activeSalon}
                  cashSession={cashSession}
                  financialEntries={financialEntries}
                  supplierOrders={supplierOrders}
                  automations={automations}
                  comandas={comandas}
                  appointments={appointments}
                  commissions={commissions}
                  products={products}
                  clients={clients}
                  onAddCashMovement={(type, amount, description) => {
                    setCashSession((prev) => ({
                      ...prev,
                      movements: [
                        ...prev.movements,
                        {
                          id: `cm-${Date.now()}`,
                          type,
                          paymentMethod: 'dinheiro_fisico',
                          description,
                          amount,
                          timestamp: '15:40',
                          operatorName: prev.operatorName,
                        },
                      ],
                    }));
                  }}
                  onCloseOrReopenCashSession={(informedCash, divergenceNote) => {
                    const nextStatus = cashSession.status === 'aberto' ? 'fechado' : 'aberto';
                    setCashSession((prev) => ({
                      ...prev,
                      status: nextStatus,
                      informedClosingCash: informedCash,
                      divergenceNote,
                      closedAt: nextStatus === 'fechado' ? '15:45' : undefined,
                    }));
                    appendAudit(
                      nextStatus === 'fechado'
                        ? 'Fechamento de Sessão de Caixa'
                        : 'Reabertura Auditada de Sessão de Caixa (Regra 9)',
                      'Financeiro & Caixa',
                      `Valor informado: R$ ${informedCash}. Obs: ${divergenceNote || 'Conferência padrão'}.`,
                      'critico'
                    );
                  }}
                  onCreateFinancialEntry={(entry) =>
                    setFinancialEntries((prev) => [
                      { ...entry, id: `fin-${Date.now()}` },
                      ...prev,
                    ])
                  }
                  onSettleFinancialEntry={(entryId) =>
                    setFinancialEntries((prev) =>
                      prev.map((e) =>
                        e.id === entryId
                          ? {
                              ...e,
                              status: 'liquidado',
                              paidAmount: e.grossAmount,
                              paymentDate: '2026-10-26',
                            }
                          : e
                      )
                    )
                  }
                  onReceiveSupplierOrder={(orderId) => {
                    const ord = supplierOrders.find((o) => o.id === orderId);
                    if (!ord) return;
                    setSupplierOrders((prev) =>
                      prev.map((o) =>
                        o.id === orderId ? { ...o, status: 'recebido_integral' } : o
                      )
                    );
                    // Reabastece o tonalizante em alerta no estoque
                    setProducts((prev) =>
                      prev.map((p) =>
                        p.id === 'prd-2' ? { ...p, currentStock: p.currentStock + 500 } : p
                      )
                    );
                  }}
                  onCreateSupplierOrder={(supplierName, itemsSummary, totalAmount) => {
                    const newOrderId = `ped-${Date.now()}`;
                    const newFinId = `fin-${Date.now()}`;
                    setSupplierOrders((prev) => [
                      {
                        id: newOrderId,
                        salonId: activeSalon.id,
                        supplierName,
                        cnpj: '12.550.901/0001-88',
                        createdAt: '2026-10-26',
                        expectedDelivery: '2026-10-30',
                        totalAmount,
                        status: 'pedido_enviado',
                        itemsSummary,
                        generatedPayableId: newFinId,
                      },
                      ...prev,
                    ]);
                    setFinancialEntries((prev) => [
                      {
                        id: newFinId,
                        salonId: activeSalon.id,
                        unitId: activeSalon.units[0]?.id || 'unit-1',
                        type: 'pagar',
                        category: 'Fornecedores',
                        description: `Pedido de Compra #${newOrderId} · ${itemsSummary}`,
                        entityName: supplierName,
                        dueDate: '2026-11-10',
                        competenceDate: '2026-10-26',
                        grossAmount: totalAmount,
                        feeAmount: 0,
                        netAmount: totalAmount,
                        paidAmount: 0,
                        status: 'pendente',
                        paymentMethod: 'pix',
                      },
                      ...prev,
                    ]);
                  }}
                  onToggleAutomation={(id) =>
                    setAutomations((prev) =>
                      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
                    )
                  }
                  onTriggerCampaignDispatch={(id) =>
                    setAutomations((prev) =>
                      prev.map((a) =>
                        a.id === id ? { ...a, sentCountMonth: a.sentCountMonth + 14 } : a
                      )
                    )
                  }
                />
              )}

              {activeMenu === 'configuracoes' && (
                <SettingsAndPortalsView
                  viewType="settings"
                  salon={activeSalon}
                  allSalons={salons}
                  professionals={professionals}
                  services={services}
                  appointments={appointments}
                  commissions={commissions}
                  packages={packages}
                  clients={clients}
                  technicalRecords={technicalRecords}
                  auditLogs={auditLogs}
                  onUpdateSalonTheme={(salonId, theme, commercialName) => {
                    // Regra Seção 2.2: Não permitir que um salão altere o tema de outro
                    setSalons((prev) =>
                      prev.map((s) =>
                        s.id === salonId ? { ...s, commercialName, theme } : s
                      )
                    );
                    updateTenantInDb(salonId, { theme, commercialName });
                    appendAudit(
                      'Atualização de Identidade Visual White-Label',
                      'Configurações → Aparência',
                      `Tema atualizado exclusivamente para ${commercialName} (Cor principal: ${theme.primaryColor}).`
                    );
                  }}
                  onUpdateSalonRule={(salonId, commissionReleaseRule) => {
                    setSalons((prev) =>
                      prev.map((s) =>
                        s.id === salonId ? { ...s, commissionReleaseRule } : s
                      )
                    );
                    updateTenantInDb(salonId, { commissionReleaseRule });
                  }}
                  onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
                  onCreateOnlineAppointment={handleCreateAppointment}
                  onCreateNewTenantSalon={async (commercialName, cnpj) => {
                    const created = await createTenantInDb({ name: commercialName, cnpj });
                    if (created) {
                      setSalons((prev) => [...prev, created]);
                      setActiveSalonId(created.id);
                    }
                  }}
                  onToggleTenantStatus={async (salonId) => {
                    const s = salons.find((item) => item.id === salonId);
                    const nextStatus = s?.status === 'ativo' ? 'suspenso' : 'ativo';
                    setSalons((prev) =>
                      prev.map((item) =>
                        item.id === salonId ? { ...item, status: nextStatus } : item
                      )
                    );
                    updateTenantInDb(salonId, { status: nextStatus });
                  }}
                  onSwitchActiveSalon={setActiveSalonId}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
