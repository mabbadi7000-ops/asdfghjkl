import * as XLSX from 'xlsx';

export interface SheetInfo {
  name: string;
  rowCount: number;
  headers: string[];
  sampleRows: Record<string, any>[];
  rawMatrix: any[][];
}

export interface ColumnMapping {
  driverNameCol: string;
  courierIdCol: string;
  iqamaCol: string;
  phoneCol: string;
  ordersCol: string;
  grossFeeCol: string;
  deductionsCol: string;
  netPayoutCol: string;
  platformContractId?: string;
}

export interface ParsedWorkbook {
  fileName: string;
  sheets: SheetInfo[];
  activeSheetIndex: number;
}

// Normalize text for matching
const norm = (s: any) => String(s || '').trim().toLowerCase();

/**
 * Parses an Excel or CSV file buffer and extracts all sheets with headers and sample data
 */
export function parseExcelWorkbook(data: any, fileName: string): ParsedWorkbook {
  const workbook = XLSX.read(data, { type: 'binary' });
  const sheets: SheetInfo[] = [];

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    // Convert to 2D array matrix first to detect true header row
    const rawMatrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (!rawMatrix || rawMatrix.length === 0) {
      sheets.push({
        name: sheetName,
        rowCount: 0,
        headers: [],
        sampleRows: [],
        rawMatrix: [],
      });
      continue;
    }

    // Find the header row (the first row with at least 2 non-empty string cells)
    let headerRowIdx = 0;
    for (let r = 0; r < Math.min(rawMatrix.length, 10); r++) {
      const row = rawMatrix[r];
      const filledCells = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
      if (filledCells.length >= 2) {
        headerRowIdx = r;
        break;
      }
    }

    const headerRow = rawMatrix[headerRowIdx] || [];
    const headers: string[] = headerRow.map((cell, colIdx) => {
      const str = String(cell || '').trim();
      return str || `عمود_${colIdx + 1}`;
    });

    // Extract rows as objects using the detected headers
    const dataRows = rawMatrix.slice(headerRowIdx + 1);
    const sampleRows: Record<string, any>[] = [];

    for (let r = 0; r < dataRows.length; r++) {
      const rowArr = dataRows[r];
      // Skip completely empty rows
      if (!rowArr || rowArr.every((c) => c === null || c === undefined || String(c).trim() === '')) {
        continue;
      }

      const rowObj: Record<string, any> = {};
      headers.forEach((h, colIdx) => {
        rowObj[h] = rowArr[colIdx] !== undefined ? rowArr[colIdx] : '';
      });
      sampleRows.push(rowObj);
    }

    sheets.push({
      name: sheetName,
      rowCount: sampleRows.length,
      headers,
      sampleRows,
      rawMatrix,
    });
  }

  return {
    fileName,
    sheets,
    activeSheetIndex: 0,
  };
}

/**
 * Intelligent fuzzy header auto-categorization
 */
export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    driverNameCol: '',
    courierIdCol: '',
    iqamaCol: '',
    phoneCol: '',
    ordersCol: '',
    grossFeeCol: '',
    deductionsCol: '',
    netPayoutCol: '',
  };

  const nameKeywords = ['اسم', 'سائق', 'كابتن', 'مندوب', 'name', 'driver', 'courier', 'captain', 'rider'];
  const idKeywords = ['كود', 'رقم المندوب', 'معرف', 'رمز', 'منصة', 'عقد', 'id', 'code', 'courier_id', 'driver_id', 'platform_id', 'badge'];
  const iqamaKeywords = ['إقامة', 'اقامة', 'هوية', 'سجل', 'iqama', 'national', 'nid', 'civil'];
  const phoneKeywords = ['جوال', 'هاتف', 'موبايل', 'رقم الاتصال', 'phone', 'mobile', 'cell', 'tel'];
  const ordersKeywords = ['طلبات', 'طلب', 'رحلات', 'عدد الطلبات', 'عدد الشحنات', 'orders', 'trips', 'deliveries', 'count', 'tasks'];
  const grossKeywords = ['أجرة', 'اجرة', 'إجمالي', 'اجمالي', 'أجور', 'gross', 'fare', 'subtotal', 'fee', 'delivery_fee'];
  const dedKeywords = ['خصم', 'خصومات', 'جزاءات', 'غرامات', 'استقطاع', 'deduction', 'penalty', 'penalties', 'fines'];
  const netKeywords = ['صافي', 'الصافي', 'مستحق', 'المستحق', 'الدخل', 'net', 'payout', 'total_net', 'balance', 'amount'];

  const matchCol = (keywords: string[]) => {
    return headers.find((h) => {
      const nh = norm(h);
      return keywords.some((k) => nh.includes(k));
    }) || '';
  };

  mapping.driverNameCol = matchCol(nameKeywords);
  mapping.courierIdCol = matchCol(idKeywords);
  mapping.iqamaCol = matchCol(iqamaKeywords);
  mapping.phoneCol = matchCol(phoneKeywords);
  mapping.ordersCol = matchCol(ordersKeywords);
  mapping.grossFeeCol = matchCol(grossKeywords);
  mapping.deductionsCol = matchCol(dedKeywords);
  mapping.netPayoutCol = matchCol(netKeywords);

  // Fallbacks if not detected
  if (!mapping.driverNameCol && headers.length > 0) mapping.driverNameCol = headers[0];
  if (!mapping.netPayoutCol && mapping.grossFeeCol) mapping.netPayoutCol = mapping.grossFeeCol;

  return mapping;
}
