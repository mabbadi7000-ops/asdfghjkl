import { apiFetch } from '../services/dataService';

/**
 * Enterprise File & Image Utilities
 * R2 upload, document preview, and download helpers
 */

const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

export async function uploadFileToR2(file: File, folder?: string): Promise<{ fileUrl: string; key: string }> {
  const isExcelOrCsv = /\.(xls|xlsx|csv)$/i.test(file.name);
  if (!ALLOWED_FILE_TYPES.has(file.type) && !isExcelOrCsv) {
    throw new Error('Only PDF, PNG, JPG, WEBP, XLS, XLSX, and CSV files are supported.');
  }

  const formData = new FormData();
  formData.append('file', file);
  if (folder) formData.append('folder', folder);
  const response = await apiFetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  const result = (await response.json().catch(() => null)) as
    | { success?: boolean; fileUrl?: string; key?: string; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(result?.error || `File upload failed (HTTP ${response.status}).`);
  }
  if (
    !result?.success ||
    typeof result.fileUrl !== 'string' ||
    typeof result.key !== 'string'
  ) {
    throw new Error('The upload service returned an invalid response.');
  }

  return {
    fileUrl: result.fileUrl,
    key: result.key,
  };
}

/**
 * Format bytes into human-readable size
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 بايت';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['بايت', 'ك.ب', 'م.ب', 'ج.ب'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Check if a URL or Data URL is an image
 */
export function isImageData(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(url, window.location.origin);
    const key = parsed.searchParams.get('key') || parsed.pathname;
    return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(key);
  } catch {
    return /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(url);
  }
}

/**
 * Trigger download of a file or data URL
 */
export function downloadFile(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
