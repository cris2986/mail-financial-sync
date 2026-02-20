// Servicio para interactuar con Gmail API y extraer eventos financieros
import { FinancialEvent, ScanSettings } from '../types';
import { DEFAULT_SCAN_SETTINGS, coerceScanSettings } from '../domain/scanSettings';
import {
  DEFAULT_FINANCIAL_SENDERS,
  type ExclusionRules,
  type GmailMessage,
  messageToEvent,
  quoteForGmailQuery
} from './gmailParser';

const isDev = import.meta.env.DEV;
const debugLog = (...args: unknown[]) => {
  if (isDev) console.log(...args);
};
const debugWarn = (...args: unknown[]) => {
  if (isDev) console.warn(...args);
};

interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
}

// Callback de progreso
export type ProgressCallback = (phase: string, current: number, total: number, message: string) => void;

interface RequestOptions {
  retries?: number;
  timeoutMs?: number;
  allowPartialFailure?: boolean;
}

export interface GmailRunDiagnostics {
  degraded: boolean;
  warning: string | null;
  detailRequests: number;
  partialDetailFailures: number;
  parsingFailures: number;
}

// Clase principal para interactuar con Gmail API
export class GmailService {
  private accessToken: string;
  private baseUrl = 'https://gmail.googleapis.com/gmail/v1/users/me';
  private scanSettings: ScanSettings;
  private onProgress?: ProgressCallback;
  private lastWarning: string | null = null;
  private detailRequests = 0;
  private partialDetailFailures = 0;
  private parsingFailures = 0;
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;

  private readonly defaultTimeoutMs = 12_000;
  private readonly circuitFailureThreshold = 4;
  private readonly circuitCooldownMs = 30_000;

  constructor(accessToken: string, scanSettings?: ScanSettings, onProgress?: ProgressCallback) {
    this.accessToken = accessToken;
    this.scanSettings = coerceScanSettings(scanSettings ?? DEFAULT_SCAN_SETTINGS);
    this.onProgress = onProgress;
  }

  private reportProgress(phase: string, current: number, total: number, message: string) {
    if (this.onProgress) {
      this.onProgress(phase, current, total, message);
    }
  }

  private resetRunDiagnostics() {
    this.lastWarning = null;
    this.detailRequests = 0;
    this.partialDetailFailures = 0;
    this.parsingFailures = 0;
  }

  private addWarning(message: string) {
    if (!message) return;
    this.lastWarning = this.lastWarning
      ? `${this.lastWarning} ${message}`
      : message;
  }

  private registerRequestSuccess() {
    this.consecutiveFailures = 0;
  }

  private registerRequestFailure() {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.circuitFailureThreshold) {
      this.circuitOpenUntil = Date.now() + this.circuitCooldownMs;
    }
  }

  private isRetriableStatus(status: number): boolean {
    return status === 408 || status === 429 || status >= 500;
  }

  private async delayWithBackoff(attempt: number) {
    const baseDelay = Math.min(400 * (2 ** attempt), 2_500);
    const jitter = Math.floor(Math.random() * 250);
    await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
  }

  private async fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      });
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T | null> {
    const retries = options.retries ?? 2;
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
    const allowPartialFailure = options.allowPartialFailure ?? false;

    if (Date.now() < this.circuitOpenUntil) {
      throw new Error('Circuit breaker activo para Gmail API. Espera unos segundos e intenta nuevamente.');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(`${this.baseUrl}${endpoint}`, timeoutMs);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Sin detalle');
          const statusMessage = `${response.status} ${response.statusText}`.trim();
          const responseError = new Error(`Gmail API ${statusMessage}: ${errorText}`);
          console.error(`Gmail API error (intento ${attempt + 1}):`, response.status, errorText);
          console.error(`Endpoint: ${endpoint}`);

          this.registerRequestFailure();
          lastError = responseError;

          // Fallas de auth/permisos no se deben degradar ni reintentar
          if (response.status === 401) {
            throw new Error('401 Unauthorized: Token inválido o expirado');
          }
          if (response.status === 403) {
            throw new Error('403 Forbidden: Permiso denegado o cuota excedida');
          }

          const shouldRetry = this.isRetriableStatus(response.status) && attempt < retries;
          if (shouldRetry) {
            await this.delayWithBackoff(attempt);
            continue;
          }

          if (allowPartialFailure) {
            this.partialDetailFailures += 1;
            return null;
          }

          throw responseError;
        }

        this.registerRequestSuccess();
        return await response.json();
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        const isTimeout = errorObj.name === 'AbortError';
        const isNetwork = isTimeout || /fetch|network|connection|failed to fetch/i.test(errorObj.message);

        if (isTimeout) {
          lastError = new Error(`Timeout Gmail API (${timeoutMs}ms) en endpoint ${endpoint}`);
        } else {
          lastError = errorObj;
        }

        console.error(`Gmail API request error (intento ${attempt + 1}):`, lastError);
        console.error(`Endpoint: ${endpoint}`);

        this.registerRequestFailure();

        // Auth/permiso inválido nunca debe degradarse en silencio.
        if (/\b401\b|\b403\b/.test(lastError.message)) {
          throw lastError;
        }

        const shouldRetry = isNetwork && attempt < retries;
        if (shouldRetry) {
          await this.delayWithBackoff(attempt);
          continue;
        }

        if (allowPartialFailure) {
          this.partialDetailFailures += 1;
          return null;
        }

        throw lastError;
      }
    }

    if (allowPartialFailure) {
      this.partialDetailFailures += 1;
      return null;
    }

    throw (lastError ?? new Error('Error desconocido en Gmail API'));
  }

  // Construir lista de emisores según configuración
  private getSendersToSearch(): string[] {
    const senders: string[] = [];

    // Agregar emisores predeterminados si está habilitado
    if (this.scanSettings.useDefaultSenders) {
      senders.push(...DEFAULT_FINANCIAL_SENDERS);
    }

    // Agregar emisores personalizados habilitados
    const customSenders = this.scanSettings.customSenders
      .filter(r => r.enabled)
      .map(r => r.value);
    senders.push(...customSenders);

    return senders;
  }

  private getExclusionRules(): ExclusionRules {
    const excludedSenders = this.scanSettings.excludedSenders
      .filter((rule) => rule.enabled)
      .map((rule) => rule.value.trim().toLowerCase())
      .filter(Boolean);

    const excludedKeywords = this.scanSettings.excludedKeywords
      .filter((rule) => rule.enabled)
      .map((rule) => rule.value.trim().toLowerCase())
      .filter(Boolean);

    const excludedSubjects = this.scanSettings.excludedSubjects
      .filter((rule) => rule.enabled)
      .map((rule) => rule.value.trim().toLowerCase())
      .filter(Boolean);

    return {
      senders: excludedSenders,
      keywords: excludedKeywords,
      subjects: excludedSubjects
    };
  }

  // Buscar correos de emisores financieros con paginación completa
  async searchFinancialEmails(maxResults = 500): Promise<GmailMessage[]> {
    this.resetRunDiagnostics();
    const senders = this.getSendersToSearch()
      .map((sender) => sender.trim())
      .filter(Boolean);
    const exclusionRules = this.getExclusionRules();
    const daysToScan = this.scanSettings.daysToScan;

    debugLog('[Gmail] === INICIANDO BÚSQUEDA ===');
    debugLog('[Gmail] Días a escanear:', daysToScan);

    if (senders.length === 0) {
      debugWarn('No hay emisores configurados para buscar');
      return [];
    }

    // Construir query de búsqueda escapando cada emisor para evitar inyección de operadores
    const senderQuery = senders
      .map((sender) => `from:${quoteForGmailQuery(sender)}`)
      .join(' OR ');

    // Agregar palabras clave si existen
    const keywords = this.scanSettings.keywords
      .filter(r => r.enabled)
      .map(r => r.value.trim())
      .filter(Boolean);

    let query = `(${senderQuery})`;

    if (keywords.length > 0) {
      const keywordQuery = keywords.map((keyword) => quoteForGmailQuery(keyword)).join(' OR ');
      query = `(${senderQuery}) (${keywordQuery})`;
    }

    if (exclusionRules.senders.length > 0) {
      const excludedSenderQuery = exclusionRules.senders
        .map((sender) => `-from:${quoteForGmailQuery(sender)}`)
        .join(' ');
      query += ` ${excludedSenderQuery}`;
    }

    if (exclusionRules.subjects.length > 0) {
      const excludedSubjectQuery = exclusionRules.subjects
        .map((subject) => `-subject:${quoteForGmailQuery(subject)}`)
        .join(' ');
      query += ` ${excludedSubjectQuery}`;
    }

    if (exclusionRules.keywords.length > 0) {
      const excludedKeywordQuery = exclusionRules.keywords
        .map((keyword) => `-${quoteForGmailQuery(keyword)}`)
        .join(' ');
      query += ` ${excludedKeywordQuery}`;
    }

    // Usar días configurados
    query += ` newer_than:${daysToScan}d`;

    debugLog('[Gmail] Query de búsqueda:', query);
    debugLog('[Gmail] Emisores a buscar:', senders.length);
    debugLog('[Gmail] Reglas de bloqueo:', exclusionRules);
    debugLog('[Gmail] Max resultados:', maxResults);

    // Paginar para obtener todos los mensajes
    const allMessageIds: Array<{ id: string; threadId: string }> = [];
    let pageToken: string | undefined;
    let pageCount = 0;
    const pageSize = 100; // Máximo permitido por Gmail API

    this.reportProgress('searching', 0, 1, 'Buscando correos financieros...');

    do {
      pageCount++;
      let endpoint = `/messages?q=${encodeURIComponent(query)}&maxResults=${Math.min(pageSize, maxResults - allMessageIds.length)}`;
      if (pageToken) {
        endpoint += `&pageToken=${pageToken}`;
      }

      debugLog(`[Gmail] Obteniendo página ${pageCount}...`);
      this.reportProgress('searching', pageCount, pageCount + 1, `Buscando correos (página ${pageCount})...`);

      const listResponse = await this.request<GmailListResponse>(endpoint, {
        retries: 2,
        timeoutMs: this.defaultTimeoutMs
      });

      if (listResponse?.messages) {
        allMessageIds.push(...listResponse.messages);
        debugLog(`[Gmail] Página ${pageCount}: ${listResponse.messages.length} mensajes (total: ${allMessageIds.length})`);
      }

      pageToken = listResponse?.nextPageToken;

      // Detener si alcanzamos el máximo
      if (allMessageIds.length >= maxResults) {
        debugLog('[Gmail] Alcanzado límite máximo de resultados');
        break;
      }
    } while (pageToken);

    debugLog('[Gmail] Total mensajes encontrados:', allMessageIds.length);

    if (allMessageIds.length === 0) {
      return [];
    }

    // Obtener detalles de cada mensaje EN PARALELO (batches de 10)
    const messages: GmailMessage[] = [];
    const batchSize = 10;
    const totalBatches = Math.ceil(allMessageIds.length / batchSize);

    for (let i = 0; i < allMessageIds.length; i += batchSize) {
      const batch = allMessageIds.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;
      debugLog(`[Gmail] Descargando batch ${currentBatch}/${totalBatches} (${batch.length} correos)`);

      this.reportProgress('downloading', currentBatch, totalBatches, `Descargando correos (${currentBatch}/${totalBatches})...`);

      // Procesar batch en paralelo
      const batchResults = await Promise.all(
        batch.map((msg) => {
          this.detailRequests += 1;
          return this.request<GmailMessage>(`/messages/${msg.id}?format=full`, {
            retries: 1,
            timeoutMs: 10_000,
            allowPartialFailure: true
          });
        })
      );

      // Filtrar nulls y agregar a resultados
      for (const result of batchResults) {
        if (result) {
          messages.push(result);
        }
      }
    }

    if (this.detailRequests > 0 && this.partialDetailFailures > 0) {
      const failureRate = this.partialDetailFailures / this.detailRequests;
      this.addWarning(
        `Sincronización parcial de Gmail: ${this.partialDetailFailures}/${this.detailRequests} correos no pudieron descargarse.`
      );

      if (failureRate > 0.5) {
        throw new Error('Gmail respondió inestable: demasiados correos no pudieron descargarse.');
      }
    }

    this.reportProgress('processing', 0, 1, 'Procesando correos...');
    return messages;
  }

  // Obtener eventos financieros del correo
  // processedIds: IDs de correos ya procesados (para sync incremental)
  async getFinancialEvents(processedIds: string[] = []): Promise<FinancialEvent[]> {
    const messages = await this.searchFinancialEmails();
    const events: FinancialEvent[] = [];
    const enabledCategories = this.scanSettings.enabledCategories;
    const allowedSenders = this.getSendersToSearch();
    const exclusionRules = this.getExclusionRules();
    const processedSet = new Set(processedIds);

    // Contadores para diagnóstico
    let skippedAlreadyProcessed = 0;
    let rejectedCategory = 0;

    debugLog('[Gmail] Procesando', messages.length, 'mensajes...');
    debugLog('[Gmail] Categorías habilitadas:', enabledCategories);
    debugLog('[Gmail] IDs ya procesados:', processedIds.length);

    for (const message of messages) {
      // Skip si ya fue procesado (sync incremental)
      if (processedSet.has(message.id)) {
        skippedAlreadyProcessed++;
        continue;
      }

      let event: FinancialEvent | null = null;
      try {
        event = messageToEvent(message, allowedSenders, exclusionRules);
      } catch (error) {
        this.parsingFailures += 1;
        console.error('[Gmail] Error procesando correo individual:', {
          messageId: message.id,
          error
        });
        continue;
      }

      if (!event) {
        // El log ya está en messageToEvent indicando si fue por sender o amount
        continue;
      }

      // Filtrar por categorías habilitadas
      if (enabledCategories.includes(event.category)) {
        events.push(event);
        debugLog('[Gmail] ✓ Evento agregado:', event.description, '|', event.amount, '|', event.category);
      } else {
        rejectedCategory++;
        debugLog('[Gmail] ❌ Categoría no habilitada:', event.category, 'para:', event.description);
      }
    }

    // Ordenar por fecha descendente
    events.sort((a, b) => b.date.localeCompare(a.date));

    debugLog('[Gmail] === RESUMEN ===');
    debugLog('[Gmail] Total mensajes:', messages.length);
    debugLog('[Gmail] Omitidos (ya procesados):', skippedAlreadyProcessed);
    debugLog('[Gmail] Rechazados por categoría:', rejectedCategory);
    debugLog('[Gmail] Eventos nuevos:', events.length);

    if (this.parsingFailures > 0) {
      this.addWarning(`Se omitieron ${this.parsingFailures} correos malformados durante el procesamiento.`);
    }

    return events;
  }

  getRunDiagnostics(): GmailRunDiagnostics {
    const degraded = this.partialDetailFailures > 0 || this.parsingFailures > 0;
    return {
      degraded,
      warning: this.lastWarning,
      detailRequests: this.detailRequests,
      partialDetailFailures: this.partialDetailFailures,
      parsingFailures: this.parsingFailures
    };
  }
}

// Factory function
export const createGmailService = (accessToken: string, scanSettings?: ScanSettings, onProgress?: ProgressCallback): GmailService => {
  return new GmailService(accessToken, scanSettings, onProgress);
};
