import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  FileText,
  History,
  Italic,
  List,
  ListOrdered,
  Minus,
  Printer,
  Save,
  Search,
  Trash2,
  Underline,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createDocument, deleteDocument, fetchCollection, fetchDocument, updateDocument } from '../../services/dataService';
import { getSettings, CompanyProfileSettings } from '../../services/settingsService';
import { Driver, OfficialLetter, Vehicle } from '../../types';
import { getCompanyStamp, toAbsoluteUrl } from '../../utils/brandAssets';
import { buildLetterheadDocument, getLetterheadLayersCss, getLetterheadLayersHtml, LETTERHEAD_LAYOUT } from '../../utils/letterhead';
import { printHtmlViaIframe } from '../../utils/printDocumentHelpers';
import {
  buildDriverValues,
  buildVehicleValues,
  COMPANY_DEFAULTS,
  countUnresolved,
  DRIVER_PLACEHOLDERS,
  FINANCIAL_PLACEHOLDERS,
  formatLetterDates,
  LETTER_TEMPLATES,
  LetterTemplate,
  makeSerialReference,
  MANUAL_PLACEHOLDERS,
  PlaceholderDef,
  PlaceholderValues,
  resolvePlaceholders,
  SYSTEM_PLACEHOLDERS,
  TEMPLATE_GROUPS,
  VEHICLE_PLACEHOLDERS,
} from './letterTemplates';

const SINGLE_PAGE_MAX_CHARS = 1000;

const LETTERHEAD_LAYERS_HTML = getLetterheadLayersHtml();
const LETTERHEAD_LAYERS_CSS = getLetterheadLayersCss();

const LETTER_PRINT_CSS = `
  @page { size: A4 portrait; margin: 0; }
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .letter-meta { display: flex; justify-content: space-between; gap: 12px; font-size: 10pt; color: #334155; line-height: 1.5; margin-bottom: 3mm; page-break-inside: avoid; break-inside: avoid; }
  .letter-meta > div { display: inline-flex; gap: 10px; }
  .letter-text { font-size: 11pt; line-height: 1.55; }
  .letter-text p { margin: 0 0 8px; }
  .letter-text ul, .letter-text ol { padding-right: 22px; margin: 0 0 8px; }
  .letter-to { font-weight: 700; page-break-inside: avoid; }
  .letter-subject { text-align: center; font-size: 12pt; font-weight: 900; margin: 8px 0; page-break-inside: avoid; }
  .letter-content { text-align: justify; }
  .letter-content hr { border: 0; border-top: 1px solid #94a3b8; margin: 10px 0; }
  .letter-sign { position: relative; display: flex; justify-content: space-between; align-items: flex-end; height: 32mm; margin-top: 16px; padding: 0 8mm; page-break-inside: avoid; break-inside: avoid; }
  .letter-sign .signer { min-width: 56mm; text-align: center; }
  .letter-sign .signer .role { font-weight: 700; margin-bottom: 8mm; }
  .letter-sign .signer .name { border-top: 1px solid #94a3b8; padding-top: 4px; font-weight: 900; }
  .letter-sign .stamp { width: 28mm; height: 28mm; object-fit: contain; transform: rotate(-6deg); opacity: .92; }
  .letter-qr { text-align: center; font-size: 8px; color: #475569; }
  .letter-qr img { width: 20mm; height: 20mm; display: block; margin: 0 auto 2px; image-rendering: pixelated; }
`;

const CATEGORY_LABELS: Record<OfficialLetter['category'], string> = {
  salary_certificate: 'شهادة تعريف دخل',
  driver_authorization: 'تفويض مركبة',
  platform_undertaking: 'تعهد منصة',
  clearance: 'مخالصة وإخلاء طرف',
  general: 'خطاب عام',
  traffic: 'المرور',
  insurance: 'التأمين',
  custody: 'العهد والاتفاقيات',
  disciplinary: 'إنذار إداري',
};

const STATUS_LABELS: Record<OfficialLetter['status'], string> = { draft: 'مسودة', issued: 'صادر', archived: 'مؤرشف' };

const BLOCKED_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math']);
const ALLOWED_TAGS = new Set(['p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'div', 'span', 'h2', 'h3']);

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sanitizeLetterHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return escapeHtml(html);
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const serialize = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent || '');
    if (!(node instanceof Element)) return '';
    const tag = node.tagName.toLowerCase();
    if (BLOCKED_TAGS.has(tag)) return '';
    const content = Array.from(node.childNodes).map(serialize).join('');
    if (tag === 'br') return '<br>';
    if (tag === 'hr') return '<hr>';
    if (!ALLOWED_TAGS.has(tag)) return content;
    const textAlign = (node as HTMLElement).style.textAlign;
    const alignment = ['right', 'center', 'left', 'justify'].includes(textAlign)
      ? ` style="text-align:${textAlign}"`
      : '';
    return `<${tag}${alignment}>${content}</${tag}>`;
  };
  return Array.from(parsed.body.childNodes).map(serialize).join('');
}

function htmlToText(html: string): string {
  if (typeof DOMParser === 'undefined') return html;
  const parsed = new DOMParser().parseFromString(html.replace(/<\/(p|li|h2|h3|div)>|<br>/gi, '\n'), 'text/html');
  return (parsed.body.textContent || '').trim();
}

interface Verification { hash: string; qrDataUrl: string }

async function buildVerification(letter: OfficialLetter): Promise<Verification> {
  const source = `${letter.referenceNumber}|${letter.createdAt}|${letter.recipient}|${htmlToText(letter.contentHtml)}`;
  let hash = '';
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
    hash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16).toUpperCase();
  }
  const payload = JSON.stringify({ ref: letter.referenceNumber, date: letter.createdAt.slice(0, 10), to: letter.recipient, hash });
  const qrDataUrl = await QRCode.toDataURL(payload, { margin: 0, width: 240, errorCorrectionLevel: 'M' });
  return { hash, qrDataUrl };
}

function buildLetterPrintHtml(letter: OfficialLetter, settings: CompanyProfileSettings | null, verification: Verification): string {
  const { gregorian, hijri } = formatLetterDates((letter.date || letter.createdAt).slice(0, 10));
  const signerName = escapeHtml(letter.signerName || settings?.ceoName || settings?.companyName || 'مارشال لوجستيكس');
  const stampUrl = getCompanyStamp(settings || undefined);
  const stamp = letter.hasStamp && stampUrl ? `<img class="stamp" src="${escapeHtml(toAbsoluteUrl(stampUrl))}" alt="الختم الرسمي" />` : '<span></span>';
  const signer = letter.hasSignature
    ? `<div class="signer"><p class="role">${escapeHtml(letter.signerTitle || 'المدير العام')}</p><p class="name">${signerName}</p></div>`
    : '<span></span>';
  const qr = `<div class="letter-qr"><img src="${verification.qrDataUrl}" alt="QR" />رمز التحقق ${escapeHtml(verification.hash)}</div>`;
  const bodyHtml = `
    <div class="letter-meta">
      <div><strong>الرقم:</strong> ${escapeHtml(letter.referenceNumber)}</div>
      <div><span>${gregorian}</span><span>${hijri} هـ</span></div>
    </div>
    <div class="letter-text">
      <p class="letter-to">${escapeHtml(letter.recipient) || '................................'} ${escapeHtml(letter.recipientTitle || '')}</p>
      <p>السلام عليكم ورحمة الله وبركاته،،،</p>
      <h2 class="letter-subject">الموضوع: ${escapeHtml(letter.subject) || '................................'}</h2>
      <div class="letter-content">${sanitizeLetterHtml(letter.contentHtml)}</div>
      <p>وتفضلوا بقبول فائق التحية والتقدير والاحترام،،،</p>
    </div>
    <div class="letter-sign">${stamp}${qr}${signer}</div>`;
  return buildLetterheadDocument({
    title: `${letter.title || 'خطاب رسمي'} - ${letter.referenceNumber}`,
    bodyHtml,
    extraCss: LETTER_PRINT_CSS,
  });
}

async function syncLetterToArchive(letter: OfficialLetter): Promise<void> {
  const archiveId = `doc_${letter.id}`;
  const payload = {
    id: archiveId,
    title: letter.title || letter.subject,
    category: 'letters',
    documentType: 'خطاب رسمي',
    docType: 'official_letter',
    ownerType: 'company',
    ownerId: letter.id,
    entityId: letter.id,
    referenceNumber: letter.referenceNumber,
    issueDate: letter.date || new Date().toISOString().split('T')[0],
    fileUrl: '',
    department: 'المكاتبات والخطابات الرسمية',
    uploadedById: 'sys',
    notes: `جهة الاستلام: ${letter.recipient} - صفة المستلم: ${letter.recipientTitle || ''}`,
    status: 'active',
    metadata: JSON.stringify({
      letterId: letter.id,
      recipient: letter.recipient,
      letterMode: letter.letterMode || 'direct',
      senderName: letter.senderName,
      senderRole: letter.senderRole,
      contentSnapshot: letter.content,
    }),
  };
  const existing = await fetchDocument<{ id: string }>('documents', archiveId);
  if (existing) await updateDocument('documents', archiveId, payload);
  else await createDocument('documents', payload);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('documents-archive-updated'));
}

export const LetterPreviewModal: React.FC<{ letter: OfficialLetter; onClose: () => void }> = ({ letter, onClose }) => {
  const [html, setHtml] = useState('');
  useEffect(() => {
    let active = true;
    void (async () => {
      const settings = await getSettings().catch(() => null);
      const target = { ...letter, contentHtml: sanitizeLetterHtml(letter.contentHtml || letter.content || ''), hasStamp: Boolean(letter.hasStamp), hasSignature: Boolean(letter.hasSignature) };
      const proof = await buildVerification(target);
      if (active) setHtml(buildLetterPrintHtml(target, settings, proof));
    })();
    return () => { active = false; };
  }, [letter]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 no-print" role="dialog" aria-modal="true" aria-label="معاينة الخطاب">
      <div className="flex h-full max-h-[92vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-3">
          <h2 className="text-sm font-black text-slate-900">{letter.title} — {letter.referenceNumber}</h2>
          <div className="flex gap-2">
            <button type="button" disabled={!html} onClick={() => printHtmlViaIframe(html, 'official-letter-print-iframe')} className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"><Printer className="h-4 w-4" />طباعة</button>
            <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-md p-1.5 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <iframe title="معاينة الخطاب" srcDoc={html} className="w-full flex-1 bg-slate-100" />
      </div>
    </div>
  );
};

function emptyLetter(signerName = '', signerTitle = ''): OfficialLetter {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    letterMode: 'custom',
    date: now.slice(0, 10),
    referenceNumber: makeSerialReference(),
    title: '',
    recipient: '',
    recipientTitle: 'المحترمين',
    subject: '',
    contentHtml: '<p><br></p>',
    category: 'general',
    hasStamp: true,
    hasSignature: true,
    signerName,
    signerTitle,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

export const OfficialLetterStudio: React.FC = () => {
  const { currentUser } = useAuth();
  const [companySettings, setCompanySettings] = useState<CompanyProfileSettings | null>(null);
  const [letterData, setLetterData] = useState<OfficialLetter>(() => emptyLetter());
  const [letters, setLetters] = useState<OfficialLetter[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [editingSavedLetter, setEditingSavedLetter] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyStatus, setHistoryStatus] = useState<'all' | OfficialLetter['status']>('all');
  const [templateGroup, setTemplateGroup] = useState<string>(TEMPLATE_GROUPS[0].id);
  const [verification, setVerification] = useState<Verification | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const reloadLetters = useCallback(async () => {
    const records = await fetchCollection<OfficialLetter>('official_letters');
    setLetters(records.sort((first, second) => (second.createdAt || '').localeCompare(first.createdAt || '')));
  }, []);

  useEffect(() => {
    let active = true;
    void getSettings().then((settings) => {
      if (!active) return;
      setCompanySettings(settings);
      setLetterData((current) => current.signerName ? current : { ...current, signerName: settings.ceoName || '', signerTitle: settings.ceoTitle || 'المدير العام' });
    });
    void fetchCollection<Driver>('drivers').then((records) => { if (active) setDrivers(records); });
    void fetchCollection<Vehicle>('vehicles').then((records) => { if (active) setVehicles(records); });
    void reloadLetters();
    return () => { active = false; };
  }, [reloadLetters]);

  const systemValues = useMemo<PlaceholderValues>(() => {
    const { gregorian, hijri } = formatLetterDates((letterData.date || letterData.createdAt).slice(0, 10));
    return {
      ref_number: letterData.referenceNumber,
      issue_date_gregorian: gregorian,
      issue_date_hijri: `${hijri} هـ`,
      company_name: companySettings?.companyNameAr || companySettings?.companyName || COMPANY_DEFAULTS.name,
      cr_number: companySettings?.crNumber || COMPANY_DEFAULTS.crNumber,
    };
  }, [letterData.createdAt, letterData.date, letterData.referenceNumber, companySettings]);

  const selectedDriver = useMemo(() => drivers.find((driver) => driver.id === letterData.driverId), [drivers, letterData.driverId]);
  const selectedVehicle = useMemo(() => vehicles.find((vehicle) => vehicle.id === selectedVehicleId), [vehicles, selectedVehicleId]);

  const contextValues = useMemo<PlaceholderValues>(() => ({
    ...(selectedVehicle ? buildVehicleValues(selectedVehicle) : {}),
    ...(selectedDriver ? buildDriverValues(selectedDriver) : {}),
    platform_name: letterData.platformName || '',
    ...systemValues,
  }), [selectedDriver, selectedVehicle, systemValues, letterData.platformName]);

  useEffect(() => {
    let active = true;
    void buildVerification(letterData).then((result) => { if (active) setVerification(result); }).catch(() => undefined);
    return () => { active = false; };
  }, [letterData]);

  const updateLetter = (updates: Partial<OfficialLetter>) => {
    setLetterData((current) => ({ ...current, ...updates, updatedAt: new Date().toISOString() }));
  };

  const syncEditor = () => {
    if (editorRef.current) updateLetter({ contentHtml: sanitizeLetterHtml(editorRef.current.innerHTML) });
  };

  const applyValues = (values: PlaceholderValues) => {
    const current = sanitizeLetterHtml(editorRef.current?.innerHTML ?? letterData.contentHtml);
    const contentHtml = resolvePlaceholders(current, values);
    if (editorRef.current) editorRef.current.innerHTML = contentHtml;
    setLetterData((letter) => ({
      ...letter,
      contentHtml,
      title: resolvePlaceholders(letter.title, values),
      subject: resolvePlaceholders(letter.subject, values),
      recipient: resolvePlaceholders(letter.recipient, values),
      updatedAt: new Date().toISOString(),
    }));
  };

  const applyTemplate = (template: LetterTemplate) => {
    const contentHtml = sanitizeLetterHtml(resolvePlaceholders(template.contentHtml, contextValues));
    if (editorRef.current) editorRef.current.innerHTML = contentHtml;
    setLetterData((letter) => ({
      ...letter,
      templateId: template.id,
      category: template.category,
      title: resolvePlaceholders(template.title, contextValues),
      subject: resolvePlaceholders(template.subject, contextValues),
      recipient: resolvePlaceholders(template.recipient, contextValues),
      recipientTitle: template.recipientTitle,
      contentHtml,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    }));
  };

  const selectDriver = (driverId: string) => {
    const driver = drivers.find((item) => item.id === driverId);
    updateLetter({ driverId: driver?.id, driverName: driver?.fullName });
    if (driver) applyValues({ ...buildDriverValues(driver), ...systemValues });
  };

  const selectVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    const vehicle = vehicles.find((item) => item.id === vehicleId);
    if (vehicle) applyValues({ ...buildVehicleValues(vehicle), ...systemValues });
  };

  const insertVariable = (key: string) => {
    if (!key) return;
    editorRef.current?.focus();
    document.execCommand('insertText', false, `{{${key}}}`);
    applyValues(contextValues);
  };

  const insertPlainText = (text: string) => {
    editorRef.current?.focus();
    document.execCommand('insertText', false, text);
    syncEditor();
  };

  const runEditorCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditor();
  };

  const saveLetter = async (status: OfficialLetter['status']) => {
    if (!currentUser) return;
    if (!letterData.title.trim() || !letterData.recipient.trim() || !letterData.subject.trim()) {
      setNotice({ kind: 'error', text: 'أكمل العنوان والجهة المستلمة والموضوع قبل الحفظ.' });
      return;
    }
    const contentHtml = sanitizeLetterHtml(editorRef.current?.innerHTML || letterData.contentHtml);
    if (status === 'issued' && countUnresolved(contentHtml) > 0 && !window.confirm('يوجد متغيرات {{...}} غير مكتملة في الخطاب. هل تريد المتابعة؟')) return;

    setIsSaving(true);
    setNotice(null);
    const timestamp = new Date().toISOString();
    const record: OfficialLetter = {
      ...letterData,
      contentHtml,
      letterNumber: letterData.referenceNumber,
      content: htmlToText(contentHtml),
      date: letterData.date || timestamp.slice(0, 10),
      letterMode,
      senderName: letterData.signerName,
      senderRole: letterData.signerTitle,
      status,
      updatedAt: timestamp,
      createdAt: editingSavedLetter ? letterData.createdAt : timestamp,
    };

    try {
      if (editingSavedLetter) await updateDocument('official_letters', record.id, record);
      else await createDocument('official_letters', record);
      if (status !== 'draft') await syncLetterToArchive(record);
      await reloadLetters();
      setLetterData(record);
      setEditingSavedLetter(true);
      setNotice({ kind: 'success', text: status === 'draft' ? 'تم حفظ المسودة.' : 'تم الحفظ في السجل والأرشيف.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'تعذر حفظ الخطاب.' });
    } finally {
      setIsSaving(false);
    }
  };

  const loadLetter = (letter: OfficialLetter) => {
    const contentHtml = sanitizeLetterHtml(letter.contentHtml || letter.content || '');
    setLetterData({ ...letter, contentHtml, hasStamp: Boolean(letter.hasStamp), hasSignature: Boolean(letter.hasSignature) });
    setEditingSavedLetter(true);
    setHistoryOpen(false);
    if (editorRef.current) editorRef.current.innerHTML = contentHtml;
  };

  const startNewLetter = () => {
    setLetterData(emptyLetter(companySettings?.ceoName || '', companySettings?.ceoTitle || 'المدير العام'));
    setEditingSavedLetter(false);
    setSelectedVehicleId('');
    setNotice(null);
    if (editorRef.current) editorRef.current.innerHTML = '<p><br></p>';
  };

  const printLetter = async (letter?: OfficialLetter) => {
    const target = letter ?? { ...letterData, contentHtml: sanitizeLetterHtml(editorRef.current?.innerHTML ?? letterData.contentHtml) };
    const proof = await buildVerification(target);
    printHtmlViaIframe(buildLetterPrintHtml(target, companySettings, proof), 'official-letter-print-iframe');
  };

  const archiveLetter = async (letter: OfficialLetter) => {
    try {
      await updateDocument('official_letters', letter.id, { status: 'archived', updatedAt: new Date().toISOString() });
      await reloadLetters();
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'تعذر أرشفة الخطاب.' });
    }
  };

  const deleteLetter = async (letter: OfficialLetter) => {
    if (!window.confirm(`هل تريد حذف الخطاب ${letter.referenceNumber}؟`)) return;
    try {
      await deleteDocument('official_letters', letter.id);
      await deleteDocument('documents', `doc_${letter.id}`).catch(() => undefined);
      setLetters((current) => current.filter((item) => item.id !== letter.id));
      if (letter.id === letterData.id) startNewLetter();
      setNotice({ kind: 'success', text: 'تم حذف الخطاب.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'تعذر حذف الخطاب.' });
    }
  };

  const letterMode = letterData.letterMode || 'direct';
  const charCount = htmlToText(letterData.contentHtml).replace(/\s+/g, ' ').trim().length;
  const remainingChars = Math.max(0, SINGLE_PAGE_MAX_CHARS - charCount);
  const capacityPercent = Math.min(100, Math.round((charCount / SINGLE_PAGE_MAX_CHARS) * 100));
  const capacityTone = charCount > SINGLE_PAGE_MAX_CHARS ? 'rose' : capacityPercent >= 80 ? 'amber' : 'emerald';
  const capacityText = charCount > SINGLE_PAGE_MAX_CHARS
    ? 'تنبيه: محتوى الخطاب سيتجاوز إلى صفحة ثانية'
    : capacityPercent >= 80
      ? `الصفحة تقترب من الامتلاء • متبقي ~${remainingChars} حرف`
      : `سعة الصفحة الأولى: ${capacityPercent}% • متبقي ~${remainingChars} حرف`;
  const letterDate = (letterData.date || letterData.createdAt).slice(0, 10);
  const { gregorian: gregorianDate, hijri: hijriDate } = formatLetterDates(letterDate);
  const companyInsertions = [
    { label: 'اسم الشركة', value: companySettings?.companyNameAr || companySettings?.companyName || COMPANY_DEFAULTS.name },
    { label: 'السجل التجاري', value: companySettings?.crNumber || COMPANY_DEFAULTS.crNumber },
    { label: 'التاريخ الحالي', value: formatLetterDates(new Date().toISOString()).gregorian },
    { label: 'عنوان المنشأة', value: [companySettings?.headquarters, companySettings?.city].filter(Boolean).join('، ') },
  ];
  const canDeleteLetters = ['admin', 'executive', 'general_manager'].includes(currentUser?.role || '');
  const stampUrl = getCompanyStamp(companySettings || undefined);
  const filteredHistory = letters.filter((letter) => {
    if (historyStatus !== 'all' && letter.status !== historyStatus) return false;
    const haystack = `${letter.referenceNumber} ${letter.title} ${letter.recipient} ${letter.subject}`.toLowerCase();
    return haystack.includes(historyQuery.trim().toLowerCase());
  });

  return (
    <div className="space-y-5">
      <style>{LETTERHEAD_LAYERS_CSS}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">استوديو المكاتبات والمخاطبات الرسمية</h1>
          <p className="mt-1 text-xs text-slate-500">محرك مراسلات مؤسسي متكامل مع قاعدة بيانات D1.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={startNewLetter} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><FileText className="h-4 w-4" />خطاب جديد</button>
          <button type="button" onClick={() => setHistoryOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><History className="h-4 w-4" />سجل الخطابات الصادرة <span className="rounded-full bg-slate-100 px-1.5 text-[10px]">{letters.length}</span></button>
          <button type="button" onClick={() => void printLetter()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Printer className="h-4 w-4" />طباعة الخطاب</button>
          <button type="button" onClick={() => void saveLetter('draft')} disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">حفظ كمسودة</button>
          <button type="button" onClick={() => void saveLetter('issued')} disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"><Save className="h-4 w-4" />{isSaving ? 'جارٍ الحفظ...' : 'حفظ في السجل والأرشيف'}</button>
        </div>
      </div>

      {notice && <div role="status" className={`rounded-lg border px-3 py-2 text-xs ${notice.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{notice.text}</div>}

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(320px,0.75fr)_minmax(680px,1.25fr)]">
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm no-print">
          <div role="tablist" aria-label="نوع الخطاب" className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            {([['custom', 'خطاب مستقل'], ['direct', 'خطاب موجه']] as const).map(([mode, label]) => (
              <button key={mode} type="button" role="tab" aria-selected={letterMode === mode} onClick={() => updateLetter({ letterMode: mode })} className={`rounded-md px-3 py-2 text-xs font-bold ${letterMode === mode ? (mode === 'custom' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-600 hover:text-slate-900'}`}>{label}</button>
            ))}
          </div>

          {letterMode === 'direct' ? (<>
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-600">مكتبة القوالب</p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_GROUPS.map((group) => (
                <button key={group.id} type="button" onClick={() => setTemplateGroup(group.id)} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${templateGroup === group.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{group.label}</button>
              ))}
            </div>
            <div className="space-y-1">
              {LETTER_TEMPLATES.filter((template) => template.group === templateGroup).map((template) => (
                <button key={template.id} type="button" onClick={() => applyTemplate(template)} className={`block w-full rounded-md border px-3 py-2 text-start text-xs font-semibold ${letterData.templateId === template.id ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-800 hover:bg-slate-50'}`}>{template.name}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold text-slate-700">اختيار مندوب سريع
              <select value={letterData.driverId || ''} onChange={(event) => selectDriver(event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"><option value="">— اختر مندوباً —</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.fullName} {driver.iqamaNumber ? `(${driver.iqamaNumber})` : ''}</option>)}</select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">اختيار مركبة
              <select value={selectedVehicleId} onChange={(event) => selectVehicle(event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"><option value="">— اختر مركبة —</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plateNumber} - {vehicle.make} {vehicle.model}</option>)}</select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">اسم المنصة
              <input value={letterData.platformName || ''} onChange={(event) => updateLetter({ platformName: event.target.value })} onBlur={() => letterData.platformName && applyValues({ platform_name: letterData.platformName })} placeholder="جاهز / هنقرستيشن / ذا شيفز / تويو" className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">عنوان الخطاب<input value={letterData.title} onChange={(event) => updateLetter({ title: event.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" /></label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">الجهة المستلمة<input value={letterData.recipient} onChange={(event) => updateLetter({ recipient: event.target.value })} placeholder="مثال: بنك الرياض" className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" /></label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">صفة المستلم<input value={letterData.recipientTitle || ''} onChange={(event) => updateLetter({ recipientTitle: event.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" /></label>
            <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">موضوع الخطاب<input value={letterData.subject} onChange={(event) => updateLetter({ subject: event.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" /></label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">الرقم المرجعي
              <div className="flex gap-1"><input value={letterData.referenceNumber} onChange={(event) => updateLetter({ referenceNumber: event.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs" /><button type="button" onClick={() => updateLetter({ referenceNumber: makeSerialReference() })} className="rounded-md border border-slate-300 px-2 text-[11px] hover:bg-slate-50">توليد</button></div>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">اسم الموقّع<input value={letterData.signerName} onChange={(event) => updateLetter({ signerName: event.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" /></label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">المسمى الوظيفي للموقّع<input value={letterData.signerTitle} onChange={(event) => updateLetter({ signerTitle: event.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" /></label>
          </div>
          </>) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">عنوان الخطاب<input value={letterData.title} onChange={(event) => updateLetter({ title: event.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" /></label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">الجهة الموجه إليها الخطاب<input value={letterData.recipient} onChange={(event) => updateLetter({ recipient: event.target.value })} placeholder="وزارة التجارة / أمانة منطقة الرياض / شركة العميل" className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" /></label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">صفة المستلم<input value={letterData.recipientTitle || ''} onChange={(event) => updateLetter({ recipientTitle: event.target.value })} placeholder="سعادة رئيس مجلس الإدارة / المحترمين" className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" /></label>
              <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">موضوع الخطاب<input value={letterData.subject} onChange={(event) => updateLetter({ subject: event.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" /></label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">الرقم المرجعي
                <div className="flex gap-1"><input value={letterData.referenceNumber} onChange={(event) => updateLetter({ referenceNumber: event.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs" /><button type="button" onClick={() => updateLetter({ referenceNumber: makeSerialReference() })} className="rounded-md border border-slate-300 px-2 text-[11px] hover:bg-slate-50">إعادة توليد</button></div>
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">تاريخ الخطاب
                <input type="date" value={letterDate} onChange={(event) => event.target.value && updateLetter({ date: event.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" />
                <span className="block text-[10px] font-normal text-slate-500">{gregorianDate} — {hijriDate} هـ</span>
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">اسم الموقّع<input value={letterData.signerName} onChange={(event) => updateLetter({ signerName: event.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" /></label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">المسمى الوظيفي للموقّع<input value={letterData.signerTitle} onChange={(event) => updateLetter({ signerTitle: event.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" /></label>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-slate-600">إدراج بيانات المنشأة (اختياري)</p>
              <div className="flex flex-wrap gap-1.5">
                {companyInsertions.map((item) => (
                  <button key={item.label} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insertPlainText(item.value)} disabled={!item.value} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-40">{item.label}</button>
                ))}
              </div>
            </div>
          </div>
          )}

          <div className={`space-y-1 rounded-md border px-3 py-2 text-[11px] font-bold ${capacityTone === 'rose' ? 'border-rose-200 bg-rose-50 text-rose-800' : capacityTone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`} role="status">
            <p>{capacityText}</p>
            <div className="h-1 overflow-hidden rounded-full bg-white/70"><div className={`h-full ${capacityTone === 'rose' ? 'bg-rose-500' : capacityTone === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${capacityPercent}%` }} /></div>
          </div>

          <div className="flex flex-wrap gap-2 border-y border-slate-200 py-3">
            <ToolbarButton label="عريض" onClick={() => runEditorCommand('bold')}><Bold className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="مائل" onClick={() => runEditorCommand('italic')}><Italic className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="تسطير" onClick={() => runEditorCommand('underline')}><Underline className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="محاذاة لليمين" onClick={() => runEditorCommand('justifyRight')}><AlignRight className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="توسيط" onClick={() => runEditorCommand('justifyCenter')}><AlignCenter className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="محاذاة لليسار" onClick={() => runEditorCommand('justifyLeft')}><AlignLeft className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="ضبط النص" onClick={() => runEditorCommand('justifyFull')}><AlignJustify className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="قائمة نقطية" onClick={() => runEditorCommand('insertUnorderedList')}><List className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="قائمة مرقمة" onClick={() => runEditorCommand('insertOrderedList')}><ListOrdered className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton label="إضافة فاصل" onClick={() => runEditorCommand('insertHorizontalRule')}><Minus className="h-4 w-4" /></ToolbarButton>
          </div>

          {letterMode === 'direct' && <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-600">إدراج متغير ذكي في موضع المؤشر</p>
            <div className="grid grid-cols-2 gap-2">
              <PlaceholderSelect label="بيانات السائقين" items={DRIVER_PLACEHOLDERS} onPick={insertVariable} />
              <PlaceholderSelect label="بيانات المركبات" items={VEHICLE_PLACEHOLDERS} onPick={insertVariable} />
              <PlaceholderSelect label="الرواتب والمالية" items={FINANCIAL_PLACEHOLDERS} onPick={insertVariable} />
              <PlaceholderSelect label="النظام والتاريخ" items={SYSTEM_PLACEHOLDERS} onPick={insertVariable} />
              <PlaceholderSelect label="بيانات يدوية" items={MANUAL_PLACEHOLDERS} onPick={insertVariable} />
            </div>
            {countUnresolved(letterData.contentHtml) > 0 && <p className="text-[11px] text-amber-700">متغيرات غير مكتملة: {countUnresolved(letterData.contentHtml)} — اختر المندوب/المركبة أو أكملها يدوياً.</p>}
          </div>}

          <div className="flex flex-wrap gap-4 border-t border-slate-200 pt-3 text-xs font-semibold text-slate-700">
            <label className="flex items-center gap-2"><input type="checkbox" checked={letterData.hasStamp} onChange={(event) => updateLetter({ hasStamp: event.target.checked })} />إظهار الختم الرسمي</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={letterData.hasSignature} onChange={(event) => updateLetter({ hasSignature: event.target.checked })} />إظهار التوقيع</label>
          </div>
        </section>

        <div className="min-w-0 overflow-x-auto rounded-lg bg-slate-100 p-3 sm:p-5">
          <article className="lh-sheet text-slate-900">
            <div dangerouslySetInnerHTML={{ __html: LETTERHEAD_LAYERS_HTML }} />
            <div className="relative z-10 flex min-h-[297mm] flex-col justify-between" style={{ padding: `${LETTERHEAD_LAYOUT.headSpaceMm}mm 14mm ${LETTERHEAD_LAYOUT.footSpaceMm}mm` }}>
              <div>
                <div className="flex items-start justify-between text-[11px] leading-5 text-slate-700">
                  <p><strong>الرقم:</strong> {letterData.referenceNumber}</p>
                  <div className="text-start"><p>{gregorianDate}</p><p>{hijriDate} هـ</p></div>
                </div>

                <section className="mt-3 space-y-2 text-[13.5px] leading-[1.6]">
                  <p className="text-start font-semibold">{letterData.recipient || '................................'} {letterData.recipientTitle}</p>
                  <p>السلام عليكم ورحمة الله وبركاته،،،</p>
                  <h2 className="text-center text-sm font-black">الموضوع: {letterData.subject || '................................'}</h2>
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    role="textbox"
                    aria-label="محتوى الخطاب"
                    aria-multiline="true"
                    onBlur={syncEditor}
                    dangerouslySetInnerHTML={{ __html: sanitizeLetterHtml(letterData.contentHtml) }}
                    className="min-h-[360px] text-justify leading-[1.6] focus:outline-none [&_li]:mb-1 [&_p]:mb-2"
                  />
                  <p>وتفضلوا بقبول فائق التحية والتقدير والاحترام،،،</p>
                </section>
              </div>

              <footer className="mt-5">
                <div className="relative flex h-28 items-end justify-between gap-6 px-5 pb-2">
                  <div className="relative min-h-32 min-w-40 text-center">
                    {letterData.hasStamp && stampUrl && <img src={stampUrl} alt="الختم الرسمي" className="pointer-events-none absolute -left-4 -top-6 h-24 w-24 -rotate-6 object-contain opacity-90" />}
                  </div>
                  {verification && <div className="text-center text-[8px] text-slate-600"><img src={verification.qrDataUrl} alt="رمز التحقق" className="mx-auto mb-0.5 h-[20mm] w-[20mm]" />رمز التحقق {verification.hash}</div>}
                  {letterData.hasSignature && <div className="relative z-10 min-w-48 text-center">
                    <p className="mb-5 text-sm font-bold">{letterData.signerTitle || 'المدير العام'}</p>
                    <p className="border-t border-slate-400 pt-2 text-sm font-black">{letterData.signerName || companySettings?.ceoName || companySettings?.companyName || 'مارشال لوجستيكس'}</p>
                  </div>}
                </div>
              </footer>
            </div>
          </article>
        </div>
      </div>

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex justify-start bg-slate-900/40 no-print" role="dialog" aria-modal="true" aria-label="سجل الخطابات الصادرة">
          <aside className="flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h2 className="text-sm font-black text-slate-900">سجل الخطابات الصادرة</h2>
              <button type="button" onClick={() => setHistoryOpen(false)} aria-label="إغلاق" className="rounded-md p-1.5 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex gap-2 border-b border-slate-200 p-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute start-2 top-2.5 h-4 w-4 text-slate-400" />
                <input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="بحث بالرقم أو العنوان أو الجهة" className="w-full rounded-md border border-slate-300 py-2 pe-3 ps-8 text-xs" />
              </div>
              <select value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value as typeof historyStatus)} className="rounded-md border border-slate-300 bg-white px-2 text-xs" aria-label="تصفية بالحالة">
                <option value="all">كل الحالات</option>
                <option value="draft">مسودة</option>
                <option value="issued">صادر</option>
                <option value="archived">مؤرشف</option>
              </select>
            </div>
            <ul className="flex-1 space-y-2 overflow-y-auto p-3">
              {filteredHistory.length === 0 && <li className="py-10 text-center text-xs text-slate-500">لا توجد خطابات مطابقة.</li>}
              {filteredHistory.map((letter) => (
                <li key={letter.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">{letter.title}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-600">{letter.referenceNumber}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">{letter.recipient} • {CATEGORY_LABELS[letter.category] || CATEGORY_LABELS.general} • {letter.createdAt ? new Date(letter.createdAt).toLocaleDateString('ar-SA') : ''}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${letter.status === 'issued' ? 'bg-emerald-100 text-emerald-800' : letter.status === 'archived' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'}`}>{STATUS_LABELS[letter.status] || letter.status}</span>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <button type="button" onClick={() => loadLetter(letter)} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold hover:bg-slate-100">فتح في المحرر</button>
                    <button type="button" onClick={() => void printLetter(letter)} className="rounded-md border border-slate-200 p-1.5 hover:bg-slate-100" aria-label="طباعة"><Printer className="h-3.5 w-3.5" /></button>
                    {letter.status === 'issued' && <button type="button" onClick={() => void archiveLetter(letter)} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold hover:bg-slate-100">أرشفة</button>}
                    {canDeleteLetters && <button type="button" onClick={() => void deleteLetter(letter)} className="rounded-md border border-rose-200 p-1.5 text-rose-700 hover:bg-rose-50" aria-label="حذف"><Trash2 className="h-3.5 w-3.5" /></button>}
                  </div>
                </li>
              ))}
            </ul>
          </aside>
          <button type="button" aria-label="إغلاق" className="flex-1 cursor-default" onClick={() => setHistoryOpen(false)} />
        </div>
      )}
    </div>
  );
};

const PlaceholderSelect: React.FC<{ label: string; items: PlaceholderDef[]; onPick: (key: string) => void }> = ({ label, items, onPick }) => (
  <select
    value=""
    onChange={(event) => onPick(event.target.value)}
    aria-label={label}
    className="w-full rounded-md border border-amber-200 bg-amber-50 px-2 py-2 text-[11px] font-semibold text-amber-900"
  >
    <option value="">{label}</option>
    {items.map((item) => <option key={item.key} value={item.key}>{item.label} — {`{{${item.key}}}`}</option>)}
  </select>
);

const ToolbarButton: React.FC<{ label: string; onClick: () => void; children: React.ReactNode }> = ({ label, onClick, children }) => (
  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onClick} title={label} aria-label={label} className="rounded-md border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-100">
    {children}
  </button>
);
