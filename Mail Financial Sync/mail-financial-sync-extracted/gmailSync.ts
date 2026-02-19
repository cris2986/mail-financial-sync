import { Transaction, User } from './types';
import '../../services/googleIdentity';

// Import TokenResponse from the main services directory
interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
}

const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const FINANCE_QUERY =
  'newer_than:12m (subject:(payment OR paid OR debit OR credit OR transfer OR invoice OR receipt OR deposit OR refund OR payroll) OR snippet:(payment OR paid OR debit OR credit OR transfer OR invoice OR receipt OR deposit OR refund OR payroll))';
const MAX_MESSAGES = 80;


interface GmailProfileResponse {
  emailAddress: string;
}

interface GmailMessagesResponse {
  messages?: Array<{ id: string }>;
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessageDetail {
  id: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: GmailHeader[];
  };
}

interface GmailSyncResult {
  user: User;
  transactions: Transaction[];
}


let gsiScriptPromise: Promise<void> | null = null;

const ICON_STYLES: Record<
  string,
  { icon: string; iconColorClass: string; bgColorClass: string }
> = {
  income: { icon: 'account_balance', iconColorClass: 'text-green-600', bgColorClass: 'bg-green-50' },
  transfer: { icon: 'swap_horiz', iconColorClass: 'text-purple-600', bgColorClass: 'bg-purple-50' },
  card: { icon: 'credit_card', iconColorClass: 'text-orange-600', bgColorClass: 'bg-orange-50' },
  utility: { icon: 'water_drop', iconColorClass: 'text-blue-600', bgColorClass: 'bg-blue-50' },
  subscription: { icon: 'receipt_long', iconColorClass: 'text-yellow-600', bgColorClass: 'bg-yellow-50' },
  generic: { icon: 'payments', iconColorClass: 'text-gray-600', bgColorClass: 'bg-gray-100' },
};

function ensureGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (gsiScriptPromise) {
    return gsiScriptPromise;
  }

  gsiScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => {
        gsiScriptPromise = null;
        reject(new Error('Unable to load Google Identity script.'));
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GSI_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gsiScriptPromise = null;
      reject(new Error('Unable to load Google Identity script.'));
    };
    document.head.appendChild(script);
  });

  return gsiScriptPromise;
}

async function requestAccessToken(clientId: string): Promise<string> {
  await ensureGoogleIdentityScript();

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity API unavailable. Check network and browser policy settings.');
  }

  return new Promise((resolve, reject) => {
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GMAIL_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          const reason = response.error_description || response.error || 'Google OAuth failed.';
          reject(new Error(reason));
          return;
        }
        resolve(response.access_token);
      },
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

async function gmailFetch<T>(accessToken: string, url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail API error (${response.status}): ${errorText || 'Unknown error'}`);
  }

  return (await response.json()) as T;
}

function getHeader(message: GmailMessageDetail, key: string): string {
  const header = message.payload?.headers?.find((h) => h.name.toLowerCase() === key.toLowerCase());
  return header?.value ?? '';
}

function parseAmount(text: string): number | null {
  const matches = [...text.matchAll(/(?:\$|€|£|¥|MXN\s*\$?|USD\s*|EUR\s*|GBP\s*)([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/gi)];
  if (matches.length === 0) return null;

  const values = matches
    .map((m) => Number.parseFloat(m[1].replace(/,/g, '')))
    .filter((v) => Number.isFinite(v) && v > 0);

  if (values.length === 0) return null;
  return Math.max(...values);
}

function normalizeMerchant(fromHeader: string): string {
  const raw = fromHeader.split('<')[0]?.trim().replaceAll('"', '');
  if (raw) return raw;

  const emailMatch = fromHeader.match(/<([^>]+)>/) || fromHeader.match(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/);
  if (!emailMatch?.[1]) return 'Unknown Merchant';

  const domain = emailMatch[1].split('@')[1] || emailMatch[1];
  return domain.replace(/^mail\./i, '');
}

function classifyType(text: string): 'income' | 'expense' {
  const incomeTerms = ['deposit', 'credited', 'received', 'refund', 'payroll', 'salary', 'payout', 'income'];
  const expenseTerms = ['paid', 'payment', 'charge', 'debit', 'purchase', 'subscription', 'invoice', 'withdraw'];

  const incomeScore = incomeTerms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
  const expenseScore = expenseTerms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);

  return incomeScore > expenseScore ? 'income' : 'expense';
}

function getVisualKey(text: string, type: 'income' | 'expense'): keyof typeof ICON_STYLES {
  if (type === 'income') return 'income';
  if (text.includes('transfer')) return 'transfer';
  if (text.includes('card') || text.includes('credit')) return 'card';
  if (text.includes('utility') || text.includes('water') || text.includes('electric')) return 'utility';
  if (text.includes('subscription') || text.includes('netflix') || text.includes('spotify')) return 'subscription';
  return 'generic';
}

function formatDate(dateValue: Date): { fullDate: string; date: string } {
  const safeDate = Number.isNaN(dateValue.getTime()) ? new Date() : dateValue;
  const fullDate = safeDate.toISOString().slice(0, 10);
  const date = safeDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).replace(',', '');
  return { fullDate, date };
}

function buildTitle(subject: string, type: 'income' | 'expense'): string {
  const cleaned = subject.trim();
  if (cleaned.length > 0) {
    return cleaned.length <= 48 ? cleaned : `${cleaned.slice(0, 45)}...`;
  }
  return type === 'income' ? 'Incoming payment' : 'Outgoing payment';
}

function transactionFromMessage(message: GmailMessageDetail): Transaction | null {
  const subject = getHeader(message, 'subject');
  const from = getHeader(message, 'from');
  const dateHeader = getHeader(message, 'date');
  const combined = `${subject} ${message.snippet || ''}`.toLowerCase();
  const amount = parseAmount(combined);

  if (!amount) {
    return null;
  }

  const type = classifyType(combined);
  const visual = ICON_STYLES[getVisualKey(combined, type)];
  const parsedDate = dateHeader ? new Date(dateHeader) : new Date(Number(message.internalDate || Date.now()));
  const { fullDate, date } = formatDate(parsedDate);

  return {
    id: message.id,
    title: buildTitle(subject, type),
    merchant: normalizeMerchant(from),
    date,
    fullDate,
    amount,
    type,
    icon: visual.icon,
    iconColorClass: visual.iconColorClass,
    bgColorClass: visual.bgColorClass,
  };
}

async function fetchMessageDetails(
  accessToken: string,
  ids: string[],
  batchSize = 10
): Promise<(GmailMessageDetail | null)[]> {
  const results: (GmailMessageDetail | null)[] = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((id) =>
        gmailFetch<GmailMessageDetail>(
          accessToken,
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
        ).catch(() => null)
      )
    );
    results.push(...batchResults);
  }
  return results;
}

function sortTransactions(items: Transaction[]): Transaction[] {
  return [...items].sort((a, b) => {
    if (a.fullDate === b.fullDate) return b.amount - a.amount;
    return a.fullDate < b.fullDate ? 1 : -1;
  });
}

function uniqueTransactions(items: Transaction[]): Transaction[] {
  const map = new Map<string, Transaction>();
  for (const item of items) {
    const key = `${item.fullDate}|${item.amount.toFixed(2)}|${item.merchant}|${item.type}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return [...map.values()];
}

export async function syncFinancialEvents(): Promise<GmailSyncResult> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Missing VITE_GOOGLE_CLIENT_ID. Configure it in your environment before syncing.');
  }

  const accessToken = await requestAccessToken(clientId);

  const profile = await gmailFetch<GmailProfileResponse>(
    accessToken,
    'https://gmail.googleapis.com/gmail/v1/users/me/profile'
  );

  const listed = await gmailFetch<GmailMessagesResponse>(
    accessToken,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${MAX_MESSAGES}&q=${encodeURIComponent(FINANCE_QUERY)}`
  );

  const messageIds = listed.messages?.map((m) => m.id) || [];
  if (messageIds.length === 0) {
    return {
      user: {
        email: profile.emailAddress,
        name: profile.emailAddress.split('@')[0] || profile.emailAddress,
        isAuthenticated: true,
      },
      transactions: [],
    };
  }

  const details = await fetchMessageDetails(accessToken, messageIds);

  const parsed = details
    .filter((d): d is GmailMessageDetail => d !== null)
    .map(transactionFromMessage)
    .filter((t): t is Transaction => t !== null);

  const transactions = sortTransactions(uniqueTransactions(parsed));

  return {
    user: {
      email: profile.emailAddress,
      name: profile.emailAddress.split('@')[0] || profile.emailAddress,
      isAuthenticated: true,
    },
    transactions,
  };
}
