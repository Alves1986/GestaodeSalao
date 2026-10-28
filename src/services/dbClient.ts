import { Appointment, ClientProfile, Comanda, ProductStock, Professional, SalonService, SalonTenant, UserRole } from '../types/salon';

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface DbStatus {
  online: boolean;
  provider: string;
  latencyMs: number;
  stats?: {
    tenants_count: string;
    units_count: string;
    professionals_count: string;
    services_count: string;
    clients_count: string;
    appointments_count: string;
    comandas_count: string;
    users_count: string;
    database_name: string;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string;
  salonSlug: string;
  salonName: string;
  unitId?: string;
}

// -----------------------------------------------------------------------------
// Sessão Local & Autenticação
// -----------------------------------------------------------------------------
const AUTH_KEY = 'gestao_salao_auth_user';

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Falha ao salvar sessão:', e);
  }
}

export function clearStoredUser(): void {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch (e) {
    console.error('Falha ao limpar sessão:', e);
  }
}

export async function loginUser(email: string, password: string): Promise<{ user?: AuthUser; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.error || 'Falha ao autenticar.' };
    }
    setStoredUser(data.user);
    return { user: data.user };
  } catch (err: any) {
    return { error: err.message || 'Erro de conexão ao servidor.' };
  }
}

export async function registerUser(payload: {
  fullName: string;
  email: string;
  password: string;
  salonName: string;
  cnpj?: string;
}): Promise<{ user?: AuthUser; error?: string }> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.error || 'Falha ao registrar salão.' };
    }
    setStoredUser(data.user);
    return { user: data.user };
  } catch (err: any) {
    return { error: err.message || 'Erro de conexão ao servidor.' };
  }
}

// -----------------------------------------------------------------------------
// Status e Métricas
// -----------------------------------------------------------------------------
export async function getDbStatus(): Promise<DbStatus | null> {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Tenants e Unidades
// -----------------------------------------------------------------------------
export async function fetchTenantsFromDb(): Promise<SalonTenant[]> {
  try {
    const res = await fetch('/api/tenants');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[DB] Erro ao buscar tenants:', err);
    return [];
  }
}

export async function createTenantInDb(tenant: { name: string; legalName?: string; cnpj?: string }): Promise<SalonTenant | null> {
  try {
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenant),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('[DB] Erro ao cadastrar salão:', err);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Clientes
// -----------------------------------------------------------------------------
export async function fetchClientsFromDb(tenantId?: string): Promise<ClientProfile[]> {
  try {
    const url = tenantId ? `/api/clients?tenantId=${encodeURIComponent(tenantId)}` : '/api/clients';
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[DB] Erro ao buscar clientes:', err);
    return [];
  }
}

export async function createClientInDb(client: Partial<ClientProfile>): Promise<ClientProfile | null> {
  try {
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('[DB] Erro ao persistir cliente:', err);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Serviços
// -----------------------------------------------------------------------------
export async function fetchServicesFromDb(tenantId?: string): Promise<SalonService[]> {
  try {
    const url = tenantId ? `/api/services?tenantId=${encodeURIComponent(tenantId)}` : '/api/services';
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[DB] Erro ao buscar serviços:', err);
    return [];
  }
}

export async function createServiceInDb(service: Partial<SalonService>): Promise<SalonService | null> {
  try {
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('[DB] Erro ao persistir serviço:', err);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Profissionais
// -----------------------------------------------------------------------------
export async function fetchProfessionalsFromDb(tenantId?: string): Promise<Professional[]> {
  try {
    const url = tenantId ? `/api/professionals?tenantId=${encodeURIComponent(tenantId)}` : '/api/professionals';
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[DB] Erro ao buscar profissionais:', err);
    return [];
  }
}

export async function createProfessionalInDb(professional: Partial<Professional>): Promise<Professional | null> {
  try {
    const res = await fetch('/api/professionals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(professional),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('[DB] Erro ao persistir profissional:', err);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Agendamentos (Appointments)
// -----------------------------------------------------------------------------
export async function fetchAppointmentsFromDb(tenantId?: string): Promise<Appointment[]> {
  try {
    const url = tenantId ? `/api/appointments?tenantId=${encodeURIComponent(tenantId)}` : '/api/appointments';
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[DB] Erro ao buscar agendamentos:', err);
    return [];
  }
}

export async function createAppointmentInDb(appointment: Partial<Appointment>): Promise<Appointment | null> {
  try {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointment),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('[DB] Erro ao persistir agendamento:', err);
    return null;
  }
}

export async function updateAppointmentInDb(id: string, updates: Partial<Appointment>): Promise<boolean> {
  try {
    const res = await fetch(`/api/appointments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch (err) {
    console.error('[DB] Erro ao atualizar agendamento:', err);
    return false;
  }
}

// -----------------------------------------------------------------------------
// Comandas
// -----------------------------------------------------------------------------
export async function fetchComandasFromDb(tenantId?: string): Promise<Comanda[]> {
  try {
    const url = tenantId ? `/api/comandas?tenantId=${encodeURIComponent(tenantId)}` : '/api/comandas';
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[DB] Erro ao buscar comandas:', err);
    return [];
  }
}

export async function createComandaInDb(comanda: Partial<Comanda>): Promise<Comanda | null> {
  try {
    const res = await fetch('/api/comandas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comanda),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('[DB] Erro ao persistir comanda:', err);
    return null;
  }
}

export async function updateComandaInDb(id: string, updates: Partial<Comanda>): Promise<boolean> {
  try {
    const res = await fetch(`/api/comandas/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch (err) {
    console.error('[DB] Erro ao atualizar comanda:', err);
    return false;
  }
}

export async function updateTenantInDb(id: string, updates: Partial<SalonTenant>): Promise<boolean> {
  try {
    const res = await fetch(`/api/tenants/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch (err) {
    console.error('[DB] Erro ao atualizar dados do salão:', err);
    return false;
  }
}

// -----------------------------------------------------------------------------
// Produtos & Estoque
// -----------------------------------------------------------------------------
export async function fetchProductsFromDb(tenantId?: string): Promise<ProductStock[]> {
  try {
    const url = tenantId ? `/api/products?tenantId=${encodeURIComponent(tenantId)}` : '/api/products';
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[DB] Erro ao buscar produtos:', err);
    return [];
  }
}

export async function createProductInDb(product: Partial<ProductStock>): Promise<ProductStock | null> {
  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('[DB] Erro ao persistir produto:', err);
    return null;
  }
}

export async function updateProductInDb(id: string, updates: Partial<ProductStock>): Promise<boolean> {
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch (err) {
    console.error('[DB] Erro ao atualizar produto:', err);
    return false;
  }
}
