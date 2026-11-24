/**
 * Sample SVG Document & Photo Data URIs for Instant Visual Fidelity
 */

export const SAMPLE_DRIVER_PHOTO_1 = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <rect width="300" height="300" fill="#0f172a"/>
  <circle cx="150" cy="120" r="55" fill="#e2e8f0"/>
  <path d="M 60 270 C 60 190, 240 190, 240 270 Z" fill="#3b82f6"/>
  <circle cx="150" cy="115" r="45" fill="#f8fafc"/>
  <path d="M 135 110 Q 150 115 165 110" stroke="#0f172a" stroke-width="3" fill="none"/>
  <circle cx="138" cy="100" r="4" fill="#0f172a"/>
  <circle cx="162" cy="100" r="4" fill="#0f172a"/>
  <path d="M 120 75 Q 150 65 180 75" stroke="#1e293b" stroke-width="6" fill="none"/>
  <rect x="20" y="250" width="260" height="36" rx="8" fill="#1e293b"/>
  <text x="150" y="273" font-family="sans-serif" font-size="14" font-weight="bold" fill="#38bdf8" text-anchor="middle">FLEETOPS • CAPTAIN</text>
</svg>
`)}`;

export const SAMPLE_DRIVER_PHOTO_2 = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <rect width="300" height="300" fill="#1e1b4b"/>
  <circle cx="150" cy="120" r="55" fill="#cbd5e1"/>
  <path d="M 60 270 C 60 190, 240 190, 240 270 Z" fill="#059669"/>
  <circle cx="150" cy="115" r="45" fill="#f1f5f9"/>
  <circle cx="138" cy="100" r="4" fill="#0f172a"/>
  <circle cx="162" cy="100" r="4" fill="#0f172a"/>
  <path d="M 140 120 Q 150 125 160 120" stroke="#0f172a" stroke-width="3" fill="none"/>
  <rect x="20" y="250" width="260" height="36" rx="8" fill="#0f172a"/>
  <text x="150" y="273" font-family="sans-serif" font-size="14" font-weight="bold" fill="#34d399" text-anchor="middle">FLEETOPS • CAPTAIN</text>
</svg>
`)}`;

export const SAMPLE_VEHICLE_PHOTO_1 = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="carBody" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
  </defs>
  <rect width="400" height="260" fill="url(#bg)"/>
  <!-- Ground -->
  <line x1="20" y1="210" x2="380" y2="210" stroke="#334155" stroke-width="3"/>
  <!-- Car Silhouette -->
  <path d="M 60 170 Q 70 140 110 135 L 170 100 Q 200 85 270 90 L 320 125 Q 345 130 355 165 L 355 185 L 60 185 Z" fill="url(#carBody)"/>
  <!-- Windows -->
  <path d="M 165 106 L 220 106 L 220 135 L 130 135 Z" fill="#0284c7" opacity="0.8"/>
  <path d="M 230 106 L 275 106 L 310 135 L 230 135 Z" fill="#0284c7" opacity="0.8"/>
  <!-- Wheels -->
  <circle cx="115" cy="185" r="26" fill="#0f172a" stroke="#64748b" stroke-width="4"/>
  <circle cx="115" cy="185" r="14" fill="#94a3b8"/>
  <circle cx="295" cy="185" r="26" fill="#0f172a" stroke="#64748b" stroke-width="4"/>
  <circle cx="295" cy="185" r="14" fill="#94a3b8"/>
  <!-- Plate Badge -->
  <rect x="150" y="160" width="100" height="20" rx="4" fill="#ffffff" stroke="#000000" stroke-width="1.5"/>
  <text x="200" y="174" font-family="monospace" font-size="11" font-weight="900" fill="#000" text-anchor="middle">4567 أ ب ج</text>
  <text x="20" y="35" font-family="sans-serif" font-size="14" font-weight="bold" fill="#38bdf8">TOYOTA YARIS • 2024</text>
</svg>
`)}`;

export const SAMPLE_VEHICLE_PHOTO_2 = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260">
  <defs>
    <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#1f2937"/>
    </linearGradient>
    <linearGradient id="carBody2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
  </defs>
  <rect width="400" height="260" fill="url(#bg2)"/>
  <line x1="20" y1="210" x2="380" y2="210" stroke="#374151" stroke-width="3"/>
  <path d="M 50 170 Q 60 140 100 135 L 160 98 Q 200 85 280 88 L 335 125 Q 355 130 365 165 L 365 185 L 50 185 Z" fill="url(#carBody2)"/>
  <path d="M 155 106 L 225 106 L 225 135 L 120 135 Z" fill="#0284c7" opacity="0.8"/>
  <path d="M 235 106 L 285 106 L 320 135 L 235 135 Z" fill="#0284c7" opacity="0.8"/>
  <circle cx="110" cy="185" r="26" fill="#0f172a" stroke="#475569" stroke-width="4"/>
  <circle cx="110" cy="185" r="14" fill="#cbd5e1"/>
  <circle cx="300" cy="185" r="26" fill="#0f172a" stroke="#475569" stroke-width="4"/>
  <circle cx="300" cy="185" r="14" fill="#cbd5e1"/>
  <rect x="150" y="160" width="100" height="20" rx="4" fill="#ffffff" stroke="#000" stroke-width="1.5"/>
  <text x="200" y="174" font-family="monospace" font-size="11" font-weight="900" fill="#000" text-anchor="middle">9871 د ر س</text>
  <text x="20" y="35" font-family="sans-serif" font-size="14" font-weight="bold" fill="#10b981">HYUNDAI ELANTRA • 2023</text>
</svg>
`)}`;

export const SAMPLE_LICENSE_DOC = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="320" viewBox="0 0 500 320">
  <defs>
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064e3b"/>
      <stop offset="100%" stop-color="#065f46"/>
    </linearGradient>
  </defs>
  <rect width="500" height="320" rx="16" fill="url(#cardBg)"/>
  <rect x="12" y="12" width="476" height="296" rx="12" fill="none" stroke="#34d399" stroke-width="2" opacity="0.6"/>
  <!-- Header -->
  <text x="460" y="45" font-family="sans-serif" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="end">المملكة العربية السعودية</text>
  <text x="460" y="68" font-family="sans-serif" font-size="12" fill="#a7f3d0" text-anchor="end">وزارة الداخلية - الإدارة العامة للمرور</text>
  <text x="40" y="55" font-family="sans-serif" font-size="16" font-weight="bold" fill="#34d399">DRIVING LICENSE</text>
  <line x1="25" y1="80" x2="475" y2="80" stroke="#10b981" stroke-width="1.5"/>
  <!-- Photo placeholder -->
  <rect x="40" y="100" width="100" height="130" rx="8" fill="#042f2e" stroke="#34d399" stroke-width="1.5"/>
  <circle cx="90" cy="150" r="28" fill="#a7f3d0"/>
  <path d="M 55 215 C 55 180, 125 180, 125 215 Z" fill="#059669"/>
  <!-- Details -->
  <text x="450" y="115" font-family="sans-serif" font-size="11" fill="#6ee7b7" text-anchor="end">الاسم الكامل:</text>
  <text x="450" y="135" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="end">طارق عبد الرحيم نور</text>
  <text x="450" y="165" font-family="sans-serif" font-size="11" fill="#6ee7b7" text-anchor="end">رقم الرخصة / الإقامة:</text>
  <text x="450" y="185" font-family="monospace" font-size="15" font-weight="bold" fill="#fef08a" text-anchor="end">2450891234</text>
  <text x="450" y="215" font-family="sans-serif" font-size="11" fill="#6ee7b7" text-anchor="end">نوع الرخصة:</text>
  <text x="450" y="235" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="end">خصوصي (Private)</text>
  <text x="450" y="265" font-family="sans-serif" font-size="11" fill="#6ee7b7" text-anchor="end">تاريخ الانتهاء:</text>
  <text x="450" y="285" font-family="monospace" font-size="13" font-weight="bold" fill="#fca5a5" text-anchor="end">2026-10-22</text>
  <text x="40" y="260" font-family="sans-serif" font-size="10" fill="#a7f3d0">SAUDI ARABIA • OFFICIAL</text>
</svg>
`)}`;

export const SAMPLE_ISTEMARA_DOC = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="320" viewBox="0 0 500 320">
  <defs>
    <linearGradient id="istBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#1e40af"/>
    </linearGradient>
  </defs>
  <rect width="500" height="320" rx="16" fill="url(#istBg)"/>
  <rect x="12" y="12" width="476" height="296" rx="12" fill="none" stroke="#60a5fa" stroke-width="2" opacity="0.5"/>
  <text x="460" y="45" font-family="sans-serif" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="end">المملكة العربية السعودية</text>
  <text x="460" y="68" font-family="sans-serif" font-size="12" fill="#bfdbfe" text-anchor="end">رخصة سير مركبة - الإدارة العامة للمرور</text>
  <text x="40" y="55" font-family="sans-serif" font-size="16" font-weight="bold" fill="#93c5fd">VEHICLE REGISTRATION</text>
  <line x1="25" y1="80" x2="475" y2="80" stroke="#3b82f6" stroke-width="1.5"/>
  <!-- Plate Box -->
  <rect x="40" y="105" width="140" height="60" rx="8" fill="#ffffff" stroke="#000" stroke-width="2"/>
  <text x="110" y="142" font-family="monospace" font-size="18" font-weight="900" fill="#000000" text-anchor="middle">9871 د ر س</text>
  <text x="450" y="115" font-family="sans-serif" font-size="11" fill="#93c5fd" text-anchor="end">الماركة والموديل:</text>
  <text x="450" y="135" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="end">هيونداي إلنترا (2023)</text>
  <text x="450" y="165" font-family="sans-serif" font-size="11" fill="#93c5fd" text-anchor="end">رقم الهيكل VIN:</text>
  <text x="450" y="185" font-family="monospace" font-size="13" font-weight="bold" fill="#fef08a" text-anchor="end">KMHD84LF2PU819203</text>
  <text x="450" y="215" font-family="sans-serif" font-size="11" fill="#93c5fd" text-anchor="end">نوع التسجيل:</text>
  <text x="450" y="235" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="end">نقل عام / تجاري خفيف</text>
  <text x="450" y="265" font-family="sans-serif" font-size="11" fill="#93c5fd" text-anchor="end">تاريخ انتهاء الاستمارة:</text>
  <text x="450" y="285" font-family="monospace" font-size="13" font-weight="bold" fill="#fca5a5" text-anchor="end">2026-10-12</text>
</svg>
`)}`;

export const SAMPLE_INSURANCE_DOC = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="320" viewBox="0 0 500 320">
  <defs>
    <linearGradient id="insBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4c1d95"/>
      <stop offset="100%" stop-color="#5b21b6"/>
    </linearGradient>
  </defs>
  <rect width="500" height="320" rx="16" fill="url(#insBg)"/>
  <rect x="12" y="12" width="476" height="296" rx="12" fill="none" stroke="#c084fc" stroke-width="2" opacity="0.5"/>
  <text x="460" y="45" font-family="sans-serif" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="end">وثيقة تأمين المركبات الموحدة</text>
  <text x="460" y="68" font-family="sans-serif" font-size="12" fill="#e9d5ff" text-anchor="end">شركة التعاونية للتأمين - معتمد من هيئة التأمين</text>
  <text x="40" y="55" font-family="sans-serif" font-size="16" font-weight="bold" fill="#c084fc">INSURANCE POLICY</text>
  <line x1="25" y1="80" x2="475" y2="80" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="450" y="115" font-family="sans-serif" font-size="11" fill="#d8b4fe" text-anchor="end">رقم الوثيقة:</text>
  <text x="450" y="135" font-family="monospace" font-size="14" font-weight="bold" fill="#fef08a" text-anchor="end">POL-99201-2025</text>
  <text x="450" y="165" font-family="sans-serif" font-size="11" fill="#d8b4fe" text-anchor="end">نوع التغطية:</text>
  <text x="450" y="185" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="end">تأمين شامل للأسطول التجاري</text>
  <text x="450" y="215" font-family="sans-serif" font-size="11" fill="#d8b4fe" text-anchor="end">المركبة المغطاة:</text>
  <text x="450" y="235" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="end">تويوتا ياريس 2024 (أ ب ج 4567)</text>
  <text x="450" y="265" font-family="sans-serif" font-size="11" fill="#d8b4fe" text-anchor="end">تاريخ انتهاء الوثيقة:</text>
  <text x="450" y="285" font-family="monospace" font-size="13" font-weight="bold" fill="#fca5a5" text-anchor="end">2026-10-18</text>
  <circle cx="80" cy="180" r="40" fill="#2e1065" stroke="#a855f7" stroke-width="2"/>
  <text x="80" y="185" font-family="sans-serif" font-size="11" font-weight="bold" fill="#c084fc" text-anchor="middle">معتمد</text>
</svg>
`)}`;
