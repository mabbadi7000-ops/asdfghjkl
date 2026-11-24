import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Download,
  Printer,
  ChevronRight,
  ChevronLeft,
  ArrowUpDown,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  exportToCSV as exportToEnterpriseCSV,
  exportToOfficialPDF,
  ExportColumn,
} from '../../utils/exportUtils';
import { exportToEnterpriseExcel } from '../../utils/excelExport';

export interface Column<T> {
  header: string;
  accessor?: keyof T | string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  exportValue?: (item: T) => string | number;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  filterOptions?: {
    label: string;
    filterFn: (item: T) => boolean;
  }[];
  actions?: React.ReactNode;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
  exportFileName?: string;
  title?: string;
  subtitle?: string;
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  searchPlaceholder,
  searchFilter,
  filterOptions,
  actions,
  pageSize = 10,
  emptyTitle,
  emptyDescription,
  onRowClick,
  exportFileName = 'fleetops_data',
  title,
  subtitle,
}: TableProps<T>) {
  const { t, direction, language } = useLanguage();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterIdx, setSelectedFilterIdx] = useState<number>(-1);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered & Searched Data
  const filteredData = useMemo(() => {
    let result = [...data];

    if (searchQuery.trim() && searchFilter) {
      result = result.filter((item) => searchFilter(item, searchQuery.toLowerCase()));
    } else if (searchQuery.trim()) {
      result = result.filter((item) =>
        Object.values(item).some(
          (val) =>
            val !== null &&
            val !== undefined &&
            String(val).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    if (selectedFilterIdx >= 0 && filterOptions && filterOptions[selectedFilterIdx]) {
      result = result.filter(filterOptions[selectedFilterIdx].filterFn);
    }

    if (sortKey) {
      result.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return sortDirection === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [data, searchQuery, searchFilter, selectedFilterIdx, filterOptions, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Convert table columns to export columns, omitting action columns
  const exportColumns: ExportColumn[] = useMemo(() => {
    return columns
      .filter(
        (col) =>
          col.header !== 'الإجراءات' &&
          col.header !== 'Actions' &&
          col.header !== '#' &&
          col.header !== 'إجراءات'
      )
      .map((col) => ({
        header: col.header,
        accessor: col.accessor as string,
        getValue: (item: any) => {
          if (col.exportValue) return col.exportValue(item);
          if (col.accessor && item[col.accessor] !== undefined && item[col.accessor] !== null) {
            return item[col.accessor];
          }
          return '';
        },
      }));
  }, [columns]);

  const getFilterSummaryText = () => {
    const parts: string[] = [];
    if (searchQuery.trim()) {
      parts.push(`بحث: "${searchQuery}"`);
    }
    if (selectedFilterIdx >= 0 && filterOptions && filterOptions[selectedFilterIdx]) {
      parts.push(`تصفية: ${filterOptions[selectedFilterIdx].label}`);
    }
    return parts.length > 0 ? parts.join(' • ') : 'كافة السجلات دون تصفية';
  };

  const reportDisplayName = title || exportFileName.replace(/_/g, ' ').replace(/-/g, ' ');

  const handleExportExcel = () => {
    setExportMenuOpen(false);
    exportToEnterpriseExcel({
      filename: exportFileName,
      title: reportDisplayName,
      subtitle: subtitle,
      columns: exportColumns,
      data: filteredData,
      user: currentUser,
      filtersSummary: getFilterSummaryText(),
    });
  };

  const handleExportCSV = () => {
    setExportMenuOpen(false);
    exportToEnterpriseCSV({
      filename: exportFileName,
      title: reportDisplayName,
      columns: exportColumns,
      data: filteredData,
    });
  };

  const handleExportPDF = () => {
    setExportMenuOpen(false);
    exportToOfficialPDF({
      filename: exportFileName,
      title: reportDisplayName,
      subtitle: subtitle,
      columns: exportColumns,
      data: filteredData,
      user: currentUser,
      filtersSummary: getFilterSummaryText(),
      orientation: exportColumns.length > 6 ? 'landscape' : 'portrait',
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 no-print">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder || t('search')}
              className="w-full ps-9 pe-4 py-2 bg-white text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all"
            />
          </div>

          {filterOptions && filterOptions.length > 0 && (
            <select
              value={selectedFilterIdx}
              onChange={(e) => {
                setSelectedFilterIdx(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-white text-xs font-medium border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800 text-slate-700 cursor-pointer"
            >
              <option value={-1}>{t('all')}</option>
              {filterOptions.map((opt, idx) => (
                <option key={idx} value={idx}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {actions}

          {/* Enterprise Export Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title={language === 'ar' ? 'تصدير التقارير والبيانات' : 'Export Reports & Data'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'تصدير التقارير' : 'Export Data'}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>

            {exportMenuOpen && (
              <div
                className={`absolute ${
                  direction === 'rtl' ? 'start-0' : 'end-0'
                } mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95`}
              >
                <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100 flex items-center justify-between">
                  <span>{language === 'ar' ? 'خيارات التصدير الرسمية' : 'Enterprise Export'}</span>
                  <span className="text-[9px] text-emerald-600 font-mono font-bold">
                    {filteredData.length} {language === 'ar' ? 'سجل' : 'records'}
                  </span>
                </div>

                {/* Excel Export */}
                <button
                  onClick={handleExportExcel}
                  className="w-full text-start px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer flex items-center gap-2.5"
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">
                      {language === 'ar' ? 'إكسيل معتمد (Excel .xls)' : 'Executive Excel (.xls)'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {language === 'ar' ? 'منسق مع الهوية الرسمية' : 'Corporate styled & branded'}
                    </div>
                  </div>
                </button>

                {/* PDF Report Export */}
                <button
                  onClick={handleExportPDF}
                  className="w-full text-start px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-800 transition-colors cursor-pointer flex items-center gap-2.5"
                >
                  <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">
                      {language === 'ar' ? 'وثيقة PDF رسمية (Print / PDF)' : 'Official PDF Document'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {language === 'ar' ? 'ترويسة وأختام واعتمادات' : 'With letterhead & seals'}
                    </div>
                  </div>
                </button>

                {/* CSV Export */}
                <button
                  onClick={handleExportCSV}
                  className="w-full text-start px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-2.5 border-t border-slate-100"
                >
                  <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Download className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">
                      {language === 'ar' ? 'جدول بيانات (CSV .csv)' : 'Standard CSV Data'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {language === 'ar' ? 'ترميز UTF-8 للانظمة الخارجية' : 'UTF-8 BOM for pipelines'}
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-start text-xs text-slate-600">
          <thead className="bg-slate-50/80 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  onClick={() => col.sortable && col.accessor && handleSort(col.accessor as string)}
                  className={`px-4 py-3 text-start select-none ${col.className || ''} ${
                    col.sortable ? 'cursor-pointer hover:bg-slate-100/80 transition-colors' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t(col.header)}</span>
                    {col.sortable && (
                      <ArrowUpDown
                        className={`w-3.5 h-3.5 ${
                          sortKey === col.accessor ? 'text-slate-900' : 'text-slate-300'
                        }`}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick && onRowClick(item)}
                className={`hover:bg-slate-50/80 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((col, idx) => (
                  <td key={idx} className={`px-4 py-3 ${col.className || ''}`}>
                    {col.render
                      ? col.render(item)
                      : col.accessor
                      ? String(item[col.accessor as string] ?? '-')
                      : '-'}
                  </td>
                ))}
              </tr>
            ))}

            {filteredData.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                  <div className="max-w-xs mx-auto space-y-1">
                    <p className="font-semibold text-slate-600 text-sm">
                      {emptyTitle || t('noData')}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {emptyDescription || t('noDataDesc')}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {filteredData.length > 0 && (
        <div className="p-3 px-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/40 text-xs text-slate-500 no-print">
          <div>
            <span>
              {language === 'ar' ? (
                <>
                  عرض {Math.min((currentPage - 1) * pageSize + 1, filteredData.length)} إلى{' '}
                  {Math.min(currentPage * pageSize, filteredData.length)} من أصل {filteredData.length}{' '}
                  سجل
                </>
              ) : (
                <>
                  Showing {Math.min((currentPage - 1) * pageSize + 1, filteredData.length)} to{' '}
                  {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length}{' '}
                  records
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title={language === 'ar' ? 'السابق' : 'Previous'}
            >
              {direction === 'rtl' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <span className="px-2 font-semibold text-slate-700">
              {language === 'ar'
                ? `صفحة ${currentPage} من ${totalPages}`
                : `Page ${currentPage} of ${totalPages}`}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title={language === 'ar' ? 'التالي' : 'Next'}
            >
              {direction === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
