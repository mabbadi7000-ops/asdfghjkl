import React, { useState, useEffect } from 'react';
import {
  FileText,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Eye,
  Trash2,
  Calendar,
  AlertTriangle,
  Printer,
  Download,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ReportRecord, ReportType, ReportStatus } from '../../types';
import {
  subscribeToCollection,
  createDocument,
  updateDocument,
  deleteDocument,
} from '../../services/dataService';
import { logAuditAction } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationContext';
import { exportReportMemoPDF } from '../../utils/exportUtils';

export const ReportingPortal: React.FC = () => {
  const { currentUser, canAccess } = useAuth();
  const { t } = useLanguage();
  const { sendNotification } = useNotifications();

  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<ReportRecord | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [reportType, setReportType] = useState<ReportType>('daily_operations');
  const [period, setPeriod] = useState('يومي');
  const [department, setDepartment] = useState('إدارة العمليات');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [issues, setIssues] = useState('');
  const [actionsTaken, setActionsTaken] = useState('');
  const [recommendations, setRecommendations] = useState('');

  // Review state
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    const unsub = subscribeToCollection<ReportRecord>('reports', setReports);
    return () => unsub();
  }, []);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = await createDocument<Omit<ReportRecord, 'id'>>('reports', {
      title,
      reportType,
      date: new Date().toISOString().slice(0, 10),
      period,
      department,
      authorId: currentUser?.id || 'ops',
      summary,
      details,
      issues,
      actionsTaken,
      recommendations,
      status: 'submitted',
    });

    await logAuditAction(
      currentUser,
      'SUBMIT_REPORT',
      'reports',
      id,
      `رفع تقرير تشغيلي جديد: "${title}"`
    );

    // Notify GM
    await sendNotification({
      targetRole: 'general_manager',
      title: 'تقرير تشغيلي جديد مرفوع',
      message: `قام ${currentUser?.fullName} برفع تقرير: "${title}" بانتظار الاعتماد.`,
      type: 'report',
      priority: 'high',
      link: 'reports',
    });

    setTitle('');
    setSummary('');
    setDetails('');
    setIssues('');
    setActionsTaken('');
    setRecommendations('');
    setIsCreateOpen(false);
  };

  const handleReviewAction = async (newStatus: 'approved' | 'rejected') => {
    if (!selectedReport) return;
    await updateDocument<ReportRecord>('reports', selectedReport.id, {
      status: newStatus,
      reviewFeedback: feedbackText,
      reviewedBy: currentUser?.fullName,
      reviewedAt: new Date().toISOString(),
    });

    await logAuditAction(
      currentUser,
      'REVIEW_REPORT',
      'reports',
      selectedReport.id,
      `${newStatus === 'approved' ? 'اعتماد' : 'رفض'} التقرير "${selectedReport.title}"`
    );

    // Notify author
    await sendNotification({
      recipientId: selectedReport.authorId,
      title: newStatus === 'approved' ? 'تم اعتماد التقرير' : 'ملاحظات على التقرير',
      message: `تم ${newStatus === 'approved' ? 'اعتماد' : 'إرجاع'} تقريرك "${selectedReport.title}" بواسطة ${currentUser?.fullName}`,
      type: 'report',
      priority: 'normal',
      link: 'reports',
    });

    setSelectedReport(null);
    setIsDetailOpen(false);
    setFeedbackText('');
  };

  const pendingCount = reports.filter((r) => r.status === 'submitted' || r.status === 'under_review').length;
  const approvedCount = reports.filter((r) => r.status === 'approved').length;

  const statusBadges: Record<ReportStatus, { label: string; color: string }> = {
    draft: { label: 'مسودة', color: 'bg-slate-100 text-slate-700' },
    submitted: { label: 'مرفوع للاعتماد', color: 'bg-amber-100 text-amber-800' },
    under_review: { label: 'قيد المراجعة', color: 'bg-blue-100 text-blue-800' },
    approved: { label: 'معتمد رسمياً', color: 'bg-emerald-100 text-emerald-800' },
    rejected: { label: 'مرفوض / تعديل', color: 'bg-rose-100 text-rose-800' },
  };

  const columns: Column<ReportRecord>[] = [
    {
      header: 'عنوان التقرير',
      accessor: 'title',
      sortable: true,
      render: (r) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{r.title}</span>
          <span className="text-[10px] text-slate-400 line-clamp-1">{r.summary}</span>
        </div>
      ),
    },
    {
      header: 'النوع والقسم',
      accessor: 'reportType',
      render: (r) => (
        <div>
          <span className="font-semibold text-slate-800 block text-xs capitalize">
            {r.reportType.replace('_', ' ')}
          </span>
          <span className="text-[10px] text-slate-400">{r.department}</span>
        </div>
      ),
    },
    {
      header: 'تاريخ التقرير',
      accessor: 'date',
      sortable: true,
      render: (r) => <span className="font-mono text-slate-700 text-xs">{r.date}</span>,
    },
    {
      header: 'الحالة',
      accessor: 'status',
      render: (r) => {
        const badge = statusBadges[r.status];
        return <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badge.color}`}>{badge.label}</span>;
      },
    },
    {
      header: 'الإجراءات',
      className: 'text-end',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => exportReportMemoPDF(r, currentUser)}
            title="تصدير مذكرة رسمية PDF"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer flex items-center gap-1 text-xs font-semibold"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => {
              setSelectedReport(r);
              setFeedbackText(r.reviewFeedback || '');
              setIsDetailOpen(true);
            }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer flex items-center gap-1 text-xs font-semibold"
          >
            <Eye className="w-4 h-4" />
            <span>عرض</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">بوابة التقارير الإدارية</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            رفع تقارير التشغيل اليومية والأسبوعية من الميدان إلى الإدارة العامة والاعتماد الرسمي.
          </p>
        </div>

        {canAccess(['general_manager', 'operations_manager', 'supervisor']) && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>رفع تقرير تشغيلي</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي التقارير"
          value={reports.length}
          subtitle="أرشيف التقارير"
          icon={FileText}
          colorScheme="blue"
        />
        <StatCard
          title="بانتظار الاعتماد"
          value={pendingCount}
          subtitle="تتطلب مراجعة المدير العام"
          icon={Clock}
          colorScheme="amber"
        />
        <StatCard
          title="تقارير معتمدة"
          value={approvedCount}
          subtitle="تم اعتمادها رسمياً"
          icon={CheckCircle2}
          colorScheme="emerald"
        />
        <StatCard
          title="دورية التقارير"
          value="يومي / أسبوعي"
          subtitle="التزام تشغيلي 100%"
          icon={Calendar}
          colorScheme="purple"
        />
      </div>

      {/* Table */}
      <Table
        data={reports}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="بحث في عنوان التقرير أو القسم..."
        searchFilter={(item, query) =>
          item.title.toLowerCase().includes(query) ||
          item.summary.toLowerCase().includes(query) ||
          item.department.toLowerCase().includes(query)
        }
        filterOptions={[
          { label: 'بانتظار الاعتماد (Submitted)', filterFn: (r) => r.status === 'submitted' },
          { label: 'معتمد رسمياً (Approved)', filterFn: (r) => r.status === 'approved' },
        ]}
        onRowClick={(item) => {
          setSelectedReport(item);
          setFeedbackText(item.reviewFeedback || '');
          setIsDetailOpen(true);
        }}
        exportFileName="fleetops_reports"
      />

      {/* Detail & Review Modal */}
      {selectedReport && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={selectedReport.title}
          subtitle={`التاريخ: ${selectedReport.date} • القسم: ${selectedReport.department}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">حالة الاعتماد:</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusBadges[selectedReport.status].color}`}>
                  {statusBadges[selectedReport.status].label}
                </span>
              </div>
              <button
                onClick={() => exportReportMemoPDF(selectedReport, currentUser)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>طباعة مذكرة إدارية رسمية (Official PDF)</span>
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-700 block mb-1">الملخص التنفيذي:</span>
              <p className="text-xs text-slate-600 leading-relaxed">{selectedReport.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                <span className="font-bold text-slate-800 block mb-1">تفاصيل العمليات:</span>
                <p className="text-slate-600 whitespace-pre-line leading-relaxed">{selectedReport.details}</p>
              </div>

              <div className="space-y-3">
                {selectedReport.issues && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                    <span className="font-bold text-rose-800 block mb-0.5">المشاكل والتحديات:</span>
                    <p className="text-rose-700">{selectedReport.issues}</p>
                  </div>
                )}

                {selectedReport.actionsTaken && (
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <span className="font-bold text-blue-800 block mb-0.5">الإجراءات الفورية المتخذة:</span>
                    <p className="text-blue-700">{selectedReport.actionsTaken}</p>
                  </div>
                )}

                {selectedReport.recommendations && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <span className="font-bold text-emerald-800 block mb-0.5">التوصيات للإدارة العليا:</span>
                    <p className="text-emerald-700">{selectedReport.recommendations}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Review feedback section for GM */}
            {canAccess(['general_manager']) && (
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-indigo-900 block">
                  ملاحظات وقرار المدير العام (Executive Review):
                </span>
                <textarea
                  rows={2}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="أضف تعليق الاعتماد أو توجيهات التعديل..."
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs outline-hidden"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleReviewAction('rejected')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>طلب تعديل / رفض</span>
                  </button>
                  <button
                    onClick={() => handleReviewAction('approved')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>اعتماد رسمي</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Create Report Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="رفع تقرير تشغيلي جديد"
        subtitle="إرسال تقرير مفصل إلى الإدارة العامة"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateReport} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">عنوان التقرير *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: التقرير التشغيلي اليومي - الرياض..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">نوع التقرير</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              >
                <option value="daily_operations">تشغيل يومي (Daily Operations)</option>
                <option value="weekly_summary">ملخص أسبوعي (Weekly Summary)</option>
                <option value="maintenance_audit">تدقيق صيانة (Maintenance Audit)</option>
                <option value="incident_summary">حوادث ومخاطر (Incident Summary)</option>
                <option value="fuel_audit">تدقيق وقود (Fuel Audit)</option>
                <option value="financial">تقرير مالي وتشغيلي (Financial)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">الملخص التنفيذي *</label>
            <textarea
              rows={2}
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="ملخص موجز لأهم ما تم إنجازه..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">تفاصيل العمليات والأرقام *</label>
            <textarea
              rows={3}
              required
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="عدد الطلبات المكتملة، التغطية الجغرافية، عدد الساعات..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">المشاكل التي واجهتكم</label>
              <textarea
                rows={2}
                value={issues}
                onChange={(e) => setIssues(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الإجراءات المتخذة</label>
              <textarea
                rows={2}
                value={actionsTaken}
                onChange={(e) => setActionsTaken(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">التوصيات</label>
              <textarea
                rows={2}
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              رفع التقرير للاعتماد
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
