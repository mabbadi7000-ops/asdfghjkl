import { FuelChipSystem } from '../types';
import { createDocument, getDocument, safeJsonParse, safeLocalStorageGetItem, safeLocalStorageSetItem } from './dataService';

export interface CompanyProfileSettings {
  companyNameAr: string;
  companyNameEn: string;
  crNumber: string;
  taxNumber: string;
  city: string;
  headquarters: string;
  phone: string;
  email: string;
  docExpiryWarningDays: number;
  dailyFuelCap: number;
  maintenanceAlertKm: number;
  fuelContractPlatform?: FuelChipSystem;
  fuelContractPlatformName?: string;
  fuelContractNumber?: string;
  fuelContractAccount?: string;
  fuelContractDailyQuota?: number; // SAR/day
  fuelContractWorkDays?: number; // days/month (e.g. 30 or 26)
  logoBase64?: string;
  logoUrl?: string;
  darkLogo?: string;
  stamp?: string;
  stampUrl?: string;
  stampBase64?: string;
  ceoName?: string;
  ceoTitle?: string;
  faviconUrl?: string;
  companyName?: string;
  stampTextAr?: string;
  stampTextEn?: string;
  stampStatus?: string;
  systemName?: string;
}

export const DEFAULT_COMPANY_SETTINGS: CompanyProfileSettings = {
  companyNameAr: 'شركة مارشال لوجيستيكس',
  companyNameEn: 'MARSHAL LOGISTIC LLC',
  crNumber: '7054828277',
  taxNumber: '310298471200003',
  city: 'الرياض / Riyadh',
  headquarters: 'طريق الملك فهد، حي العقيق',
  phone: '+966 11 456 7890',
  email: 'operations@marshal-logistic.sa',
  docExpiryWarningDays: 30,
  dailyFuelCap: 150,
  maintenanceAlertKm: 5000,
  fuelContractPlatform: 'waee',
  fuelContractPlatformName: 'منصة واعي الذكية (Waee RFID)',
  fuelContractNumber: 'FLT-FUEL-2026/01',
  fuelContractAccount: 'MARSHAL-WAEE-9021',
  fuelContractDailyQuota: 50,
  fuelContractWorkDays: 30,
  logoBase64: '',
  logoUrl: '',
  darkLogo: '',
  stamp: '',
  stampUrl: '',
  faviconUrl: '',
  stampTextAr: 'مارشال لوجستيكس',
  stampTextEn: 'MARSHAL LOGISTIC KSA',
  stampStatus: 'معتمد رسمياً',
  systemName: 'منظومة مارشال لوجستيكس السحابية | MARSHAL LOGISTIC ERP',
};

const SETTINGS_STORAGE_KEY = 'fleetops_company_settings';
const LEGACY_SETTINGS_STORAGE_KEY = 'fleetops_settings';
const SETTINGS_COLLECTION = 'system_settings';
const SETTINGS_DOCUMENT_ID = 'global_company_settings';

function readCachedSettings(): Partial<CompanyProfileSettings> | null {
  const saved = safeLocalStorageGetItem(SETTINGS_STORAGE_KEY) || safeLocalStorageGetItem(LEGACY_SETTINGS_STORAGE_KEY);
  return saved ? safeJsonParse<Partial<CompanyProfileSettings> | null>(saved, null) : null;
}

function cacheSettings(settings: CompanyProfileSettings): void {
  safeLocalStorageSetItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Loads company settings from localStorage with fallback to default Marshal Logistics identity
 */
export function loadCompanySettings(): CompanyProfileSettings {
  return { ...DEFAULT_COMPANY_SETTINGS, ...readCachedSettings() };
}

export async function getSettings(): Promise<CompanyProfileSettings> {
  try {
    const cloudSettings = await getDocument<Partial<CompanyProfileSettings>>(SETTINGS_COLLECTION, SETTINGS_DOCUMENT_ID);
    if (cloudSettings) {
      const merged = { ...DEFAULT_COMPANY_SETTINGS, ...readCachedSettings(), ...cloudSettings };
      cacheSettings(merged);
      return merged;
    }
  } catch (err) {
    console.warn('[SettingsService] Cloud fetch skipped:', err);
  }
  return loadCompanySettings();
}

export async function saveSettings(updates: Partial<CompanyProfileSettings>): Promise<CompanyProfileSettings> {
  const current = loadCompanySettings();
  const updated: CompanyProfileSettings = {
    ...current,
    ...updates,
  };

  try {
    await createDocument(SETTINGS_COLLECTION, {
      id: SETTINGS_DOCUMENT_ID,
      ...updated,
      updatedAt: new Date().toISOString(),
    });
  } finally {
    cacheSettings(updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('company-settings-updated', { detail: updates }));
    }
  }

  return updated;
}

export async function saveCompanySettings(settings: Partial<CompanyProfileSettings>): Promise<CompanyProfileSettings> {
  return saveSettings(settings);
}

export async function syncCompanySettingsFromCloud(): Promise<CompanyProfileSettings> {
  return getSettings();
}
