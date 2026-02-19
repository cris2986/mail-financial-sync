// Cliente Supabase para persistencia
import { config } from '../config/env';

// Tipos para Supabase
export interface SupabaseUser {
  id: string;
  email: string;
  name: string;
  google_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseEvent {
  id: string;
  user_id: string;
  amount: number;
  direction: 'income' | 'expense';
  category: string;
  date: string;
  source: string;
  description: string;
  email_id: string;
  created_at: string;
}

// Cliente simple para Supabase REST API
class SupabaseClient {
  private url: string;
  private key: string;

  constructor(url: string, key: string) {
    this.url = url;
    this.key = key;
  }

  private async request<T>(
    table: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    options?: {
      body?: object;
      filters?: Record<string, string>;
      select?: string;
      single?: boolean;
    }
  ): Promise<T | null> {
    const headers: HeadersInit = {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      'Prefer': options?.single ? 'return=representation' : 'return=representation'
    };

    let url = `${this.url}/rest/v1/${table}`;
    const params = new URLSearchParams();

    if (options?.select) {
      params.append('select', options.select);
    }

    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        params.append(key, value);
      }
    }

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const error = await response.text();
      
      // Ignorar errores de duplicados (conflictos) - es normal en sincronización incremental
      if (response.status === 409) {
        console.warn('Supabase: Evento duplicado ignorado (normal en sync incremental):', error);
        return null;
      }
      
      console.error('Supabase error:', error);
      return null;
    }

    if (method === 'DELETE') {
      return null;
    }

    const data = await response.json();
    return options?.single ? data[0] : data;
  }

  // Usuarios
  async getUser(googleId: string): Promise<SupabaseUser | null> {
    return this.request<SupabaseUser>('users', 'GET', {
      filters: { google_id: `eq.${googleId}` },
      single: true
    });
  }

  async createUser(user: Omit<SupabaseUser, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseUser | null> {
    const users = await this.request<SupabaseUser[]>('users', 'POST', {
      body: user
    });
    return users ? users[0] : null;
  }

  async updateUser(googleId: string, updates: Partial<SupabaseUser>): Promise<SupabaseUser | null> {
    const users = await this.request<SupabaseUser[]>('users', 'PATCH', {
      filters: { google_id: `eq.${googleId}` },
      body: updates
    });
    return users ? users[0] : null;
  }

  // Eventos
  async getEvents(userId: string, month?: string): Promise<SupabaseEvent[]> {
    const filters: Record<string, string> = { user_id: `eq.${userId}` };

    if (month) {
      // Filtrar por mes (YYYY-MM)
      const startDate = `${month}-01`;
      const [year, monthNum] = month.split('-').map(Number);
      const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];
      filters.date = `gte.${startDate}`;
    }

    const events = await this.request<SupabaseEvent[]>('events', 'GET', { filters });
    return events || [];
  }

  async createEvent(event: Omit<SupabaseEvent, 'id' | 'created_at'>): Promise<SupabaseEvent | null> {
    const events = await this.request<SupabaseEvent[]>('events', 'POST', {
      body: event
    });
    return events ? events[0] : null;
  }

  async createEvents(events: Omit<SupabaseEvent, 'id' | 'created_at'>[]): Promise<SupabaseEvent[]> {
    try {
      const created = await this.request<SupabaseEvent[]>('events', 'POST', {
        body: events
      });
      return created || [];
    } catch (error) {
      // Si hay un error de duplicados, intentar crear eventos individualmente
      if (error.message && error.message.includes('duplicate key')) {
        console.warn('Supabase: Detectados duplicados, intentando crear eventos individualmente...');
        const createdEvents: SupabaseEvent[] = [];
        
        for (const event of events) {
          try {
            const created = await this.createEvent(event);
            if (created) {
              createdEvents.push(created);
            }
          } catch (e) {
            // Ignorar errores de duplicados individuales
            if (e.message && e.message.includes('duplicate key')) {
              console.warn(`Supabase: Evento duplicado ignorado: ${event.email_id}`);
              continue;
            }
            throw e;
          }
        }
        
        return createdEvents;
      }
      throw error;
    }
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    await this.request('events', 'DELETE', {
      filters: { id: `eq.${eventId}` }
    });
    return true;
  }
}

// Instancia singleton
let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (!config.supabase.url || !config.supabase.anonKey) {
    console.warn('Supabase no configurado. La persistencia será solo local.');
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = new SupabaseClient(config.supabase.url, config.supabase.anonKey);
  }

  return supabaseInstance;
};
