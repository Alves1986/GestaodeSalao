import { ClientProfile, Professional, SalonService, SalonTenant } from '../types/salon';
import {
  INITIAL_CLIENTS,
  INITIAL_PROFESSIONALS,
  INITIAL_SALONS,
  INITIAL_SERVICES,
} from '../data/initialData';

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
    database_name: string;
  };
}

/**
 * Fetch database connection status & metrics
 */
export async function getDbStatus(): Promise<DbStatus | null> {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Carrega Tenants e Unidades do Neon com fallback para os dados iniciais
 */
export async function fetchTenantsFromDb(): Promise<SalonTenant[]> {
  try {
    const res = await fetch('/api/tenants');
    if (!res.ok) throw new Error('Falha ao carregar tenants');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return INITIAL_SALONS;
  } catch (err) {
    console.warn('[DB] Usando fallback local para tenants:', err);
    return INITIAL_SALONS;
  }
}

/**
 * Carrega Profissionais do Neon
 */
export async function fetchProfessionalsFromDb(): Promise<Professional[]> {
  try {
    const res = await fetch('/api/professionals');
    if (!res.ok) throw new Error('Falha ao carregar profissionais');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return INITIAL_PROFESSIONALS;
  } catch (err) {
    console.warn('[DB] Usando fallback local para profissionais:', err);
    return INITIAL_PROFESSIONALS;
  }
}

/**
 * Carrega Serviços do Neon
 */
export async function fetchServicesFromDb(): Promise<SalonService[]> {
  try {
    const res = await fetch('/api/services');
    if (!res.ok) throw new Error('Falha ao carregar serviços');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return INITIAL_SERVICES;
  } catch (err) {
    console.warn('[DB] Usando fallback local para serviços:', err);
    return INITIAL_SERVICES;
  }
}

/**
 * Carrega Clientes do Neon
 */
export async function fetchClientsFromDb(): Promise<ClientProfile[]> {
  try {
    const res = await fetch('/api/clients');
    if (!res.ok) throw new Error('Falha ao carregar clientes');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return INITIAL_CLIENTS;
  } catch (err) {
    console.warn('[DB] Usando fallback local para clientes:', err);
    return INITIAL_CLIENTS;
  }
}

/**
 * Salva novo cliente no Neon
 */
export async function createClientInDb(client: Partial<ClientProfile>): Promise<boolean> {
  try {
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    });
    return res.ok;
  } catch (err) {
    console.error('[DB] Falha ao persistir cliente no banco:', err);
    return false;
  }
}

/**
 * Salva novo serviço no Neon
 */
export async function createServiceInDb(service: Partial<SalonService>): Promise<boolean> {
  try {
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service),
    });
    return res.ok;
  } catch (err) {
    console.error('[DB] Falha ao persistir serviço no banco:', err);
    return false;
  }
}
