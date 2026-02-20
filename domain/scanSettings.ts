import type { EmailRule, EventCategory, ScanSettings } from '../types';
import { ALL_EVENT_CATEGORIES } from './categories';

export const MAX_RULE_VALUE_LENGTH = 120;
export const MAX_RULES_PER_LIST = 200;

export const DEFAULT_SCAN_SETTINGS: ScanSettings = {
  customSenders: [],
  keywords: [],
  excludedSenders: [],
  excludedKeywords: [],
  excludedSubjects: [],
  useDefaultSenders: true,
  daysToScan: 90,
  enabledCategories: [...ALL_EVENT_CATEGORIES]
};

export type RuleListKey =
  | 'customSenders'
  | 'keywords'
  | 'excludedSenders'
  | 'excludedKeywords'
  | 'excludedSubjects';

export const RULE_LIST_BY_TYPE: Record<EmailRule['type'], RuleListKey> = {
  sender: 'customSenders',
  keyword: 'keywords',
  subject: 'keywords',
  excluded_sender: 'excludedSenders',
  excluded_keyword: 'excludedKeywords',
  excluded_subject: 'excludedSubjects'
};

const isRuleType = (value: unknown): value is EmailRule['type'] => {
  return value === 'sender'
    || value === 'keyword'
    || value === 'subject'
    || value === 'excluded_sender'
    || value === 'excluded_keyword'
    || value === 'excluded_subject';
};

export const createRuleId = (): string => {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

const toSafeDate = (date: unknown): string => {
  if (typeof date === 'string' && !Number.isNaN(Date.parse(date))) {
    return date;
  }
  return new Date().toISOString();
};

export const sanitizeRuleValue = (type: EmailRule['type'], value: string): string => {
  const allowlistPattern = type === 'sender' || type === 'excluded_sender'
    ? /[^\p{L}\p{N}@._+\-\s]/gu
    : /[^\p{L}\p{N}\s.,:/%()\-]/gu;

  const normalized = value
    .normalize('NFKC')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const cleaned = normalized
    .replace(allowlistPattern, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (cleaned.length < 2) {
    return '';
  }

  return cleaned.slice(0, MAX_RULE_VALUE_LENGTH);
};

export const sanitizeDaysToScan = (days: unknown): number => {
  const parsed = Number(days);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SCAN_SETTINGS.daysToScan;
  }
  return Math.max(1, Math.min(365, Math.trunc(parsed)));
};

export const sanitizeEnabledCategories = (categories: unknown): EventCategory[] => {
  if (!Array.isArray(categories)) {
    return [...DEFAULT_SCAN_SETTINGS.enabledCategories];
  }

  const validSet = new Set<EventCategory>(ALL_EVENT_CATEGORIES);
  const unique: EventCategory[] = [];

  for (const item of categories) {
    if (typeof item !== 'string') {
      continue;
    }

    if (!validSet.has(item as EventCategory)) {
      continue;
    }

    const category = item as EventCategory;
    if (!unique.includes(category)) {
      unique.push(category);
    }
  }

  return unique.length > 0 ? unique : [...DEFAULT_SCAN_SETTINGS.enabledCategories];
};

const sanitizeRuleList = (rules: unknown, fallbackType: EmailRule['type']): EmailRule[] => {
  if (!Array.isArray(rules)) {
    return [];
  }

  const sanitized: EmailRule[] = [];
  const seenValues = new Set<string>();

  for (const rawRule of rules) {
    if (!rawRule || typeof rawRule !== 'object') {
      continue;
    }

    const candidate = rawRule as Partial<EmailRule>;
    const safeType = isRuleType(candidate.type) ? candidate.type : fallbackType;
    const rawValue = typeof candidate.value === 'string' ? candidate.value : '';
    const sanitizedValue = sanitizeRuleValue(safeType, rawValue);

    if (!sanitizedValue || seenValues.has(sanitizedValue)) {
      continue;
    }

    seenValues.add(sanitizedValue);
    sanitized.push({
      id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : createRuleId(),
      type: safeType,
      value: sanitizedValue,
      enabled: candidate.enabled !== false,
      createdAt: toSafeDate(candidate.createdAt)
    });

    if (sanitized.length >= MAX_RULES_PER_LIST) {
      break;
    }
  }

  return sanitized;
};

// Coerce settings applying defaults without rewriting each rule value.
export const coerceScanSettings = (settings?: Partial<ScanSettings>): ScanSettings => {
  return {
    customSenders: Array.isArray(settings?.customSenders) ? settings.customSenders : [],
    keywords: Array.isArray(settings?.keywords) ? settings.keywords : [],
    excludedSenders: Array.isArray(settings?.excludedSenders) ? settings.excludedSenders : [],
    excludedKeywords: Array.isArray(settings?.excludedKeywords) ? settings.excludedKeywords : [],
    excludedSubjects: Array.isArray(settings?.excludedSubjects) ? settings.excludedSubjects : [],
    useDefaultSenders: settings?.useDefaultSenders ?? true,
    daysToScan: sanitizeDaysToScan(settings?.daysToScan),
    enabledCategories: sanitizeEnabledCategories(settings?.enabledCategories)
  };
};

export const normalizeScanSettings = (settings?: Partial<ScanSettings>): ScanSettings => {
  const source = settings ?? {};

  return {
    customSenders: sanitizeRuleList(source.customSenders, 'sender'),
    keywords: sanitizeRuleList(source.keywords, 'keyword'),
    excludedSenders: sanitizeRuleList(source.excludedSenders, 'excluded_sender'),
    excludedKeywords: sanitizeRuleList(source.excludedKeywords, 'excluded_keyword'),
    excludedSubjects: sanitizeRuleList(source.excludedSubjects, 'excluded_subject'),
    useDefaultSenders: source.useDefaultSenders !== false,
    daysToScan: sanitizeDaysToScan(source.daysToScan),
    enabledCategories: sanitizeEnabledCategories(source.enabledCategories)
  };
};

export const removeRuleFromAllLists = (scanSettings: ScanSettings, id: string): ScanSettings => ({
  ...scanSettings,
  customSenders: scanSettings.customSenders.filter((rule) => rule.id !== id),
  keywords: scanSettings.keywords.filter((rule) => rule.id !== id),
  excludedSenders: scanSettings.excludedSenders.filter((rule) => rule.id !== id),
  excludedKeywords: scanSettings.excludedKeywords.filter((rule) => rule.id !== id),
  excludedSubjects: scanSettings.excludedSubjects.filter((rule) => rule.id !== id)
});

export const toggleRuleInAllLists = (scanSettings: ScanSettings, id: string): ScanSettings => ({
  ...scanSettings,
  customSenders: scanSettings.customSenders.map((rule) =>
    rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
  ),
  keywords: scanSettings.keywords.map((rule) =>
    rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
  ),
  excludedSenders: scanSettings.excludedSenders.map((rule) =>
    rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
  ),
  excludedKeywords: scanSettings.excludedKeywords.map((rule) =>
    rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
  ),
  excludedSubjects: scanSettings.excludedSubjects.map((rule) =>
    rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
  )
});
