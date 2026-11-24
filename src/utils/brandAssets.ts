/**
 * Marshal Logistic visual identity: official artwork extracted from the approved letterhead (public/brand),
 * the palette sampled from it, and resolution of the logo / stamp images configured in system settings.
 */
import { CompanyProfileSettings, loadCompanySettings } from '../services/settingsService';

/** Colors sampled from the approved letterhead. */
export const BRAND = {
  navy: '#061731',
  navyMid: '#12284c',
  gold: '#cf9b35',
  goldLight: '#e5cd77',
  goldDark: '#b57f1f',
  goldBand: '#dfc16f',
} as const;

const toArgb = (hex: string) => `FF${hex.slice(1).toUpperCase()}`;

/** Same palette in the ARGB form used by ExcelJS. */
export const BRAND_ARGB = {
  navy: toArgb(BRAND.navy),
  navyMid: toArgb(BRAND.navyMid),
  gold: toArgb(BRAND.gold),
  goldLight: toArgb(BRAND.goldLight),
  goldDark: toArgb(BRAND.goldDark),
  goldBand: toArgb(BRAND.goldBand),
} as const;

const BASE_URL = (import.meta.env?.BASE_URL ?? '/').replace(/\/?$/, '/');
const brandFile = (file: string) => `${BASE_URL}brand/${file}`;

export const BRAND_ASSETS = {
  emblem: brandFile('marshal-emblem.png'),
  logo: brandFile('marshal-logo.png'),
  favicon: brandFile('favicon.png'),
  letterhead: {
    portrait: {
      header: brandFile('letterhead-header.png'),
      footer: brandFile('letterhead-footer.png'),
    },
    landscape: {
      header: brandFile('letterhead-header-landscape.png'),
      footer: brandFile('letterhead-footer-landscape.png'),
    },
    watermark: brandFile('letterhead-watermark.png'),
  },
} as const;

/** Print windows and iframes are written with document.write, so every URL must be absolute. */
export function toAbsoluteUrl(url: string): string {
  if (!url || /^(?:data:|blob:|https?:)/i.test(url) || typeof window === 'undefined') return url;
  try {
    return new URL(url, window.location.href).href;
  } catch {
    return url;
  }
}

/** Logo uploaded in settings (dark-surface variant first when requested), or '' to use the official artwork. */
export function getCustomLogo(settings: CompanyProfileSettings = loadCompanySettings(), dark = false): string {
  return (dark ? settings.darkLogo : '') || settings.logoUrl || settings.logoBase64 || '';
}

/** Stamp image uploaded in settings, or '' when none was uploaded. */
export function getCompanyStamp(settings: CompanyProfileSettings = loadCompanySettings()): string {
  return settings.stampBase64 || settings.stampUrl || settings.stamp || '';
}

export interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
}

export function loadHtmlImage(src: string): Promise<HTMLImageElement | null> {
  if (!src || typeof window === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    try {
      const target = new URL(src, window.location.href);
      if (/^https?:$/.test(target.protocol) && target.origin !== window.location.origin) image.crossOrigin = 'anonymous';
    } catch {
      // Keep the default (same-origin) behaviour for malformed URLs.
    }
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

const loadedImages = new Map<string, Promise<LoadedImage | null>>();

/** Rasterizes any browser-decodable image (PNG, JPEG, WebP...) to a PNG data URL that Excel can embed. */
export function loadImageAsset(src: string, limits: { maxWidth?: number; maxHeight?: number } = {}): Promise<LoadedImage | null> {
  if (!src || typeof document === 'undefined') return Promise.resolve(null);
  const cacheKey = `${src}|${limits.maxWidth ?? 0}|${limits.maxHeight ?? 0}`;
  const cached = loadedImages.get(cacheKey);
  if (cached) return cached;

  const pending = loadHtmlImage(toAbsoluteUrl(src)).then((image) => {
    if (!image || !image.naturalWidth || !image.naturalHeight) return null;
    const scale = Math.min(1, (limits.maxWidth ?? Infinity) / image.naturalWidth, (limits.maxHeight ?? Infinity) / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.drawImage(image, 0, 0, width, height);
      return { dataUrl: canvas.toDataURL('image/png'), width, height };
    } catch {
      return null;
    }
  });

  loadedImages.set(cacheKey, pending);
  void pending.then((result) => {
    if (!result) loadedImages.delete(cacheKey);
  });
  if (loadedImages.size > 16) loadedImages.delete(loadedImages.keys().next().value as string);
  return pending;
}
