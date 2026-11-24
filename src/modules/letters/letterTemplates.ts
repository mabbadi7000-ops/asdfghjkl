import type { Driver, OfficialLetter, Vehicle } from '../../types';

export type TemplateGroupId = 'salary' | 'traffic' | 'insurance' | 'custody' | 'platforms' | 'admin';

export interface LetterTemplate {
  id: string;
  group: TemplateGroupId;
  category: OfficialLetter['category'];
  name: string;
  title: string;
  subject: string;
  recipient: string;
  recipientTitle: string;
  contentHtml: string;
}

export const TEMPLATE_GROUPS: Array<{ id: TemplateGroupId; label: string }> = [
  { id: 'salary', label: 'الرواتب' },
  { id: 'traffic', label: 'المرور' },
  { id: 'insurance', label: 'التأمين' },
  { id: 'custody', label: 'العهد والاتفاقيات' },
  { id: 'platforms', label: 'المنصات' },
  { id: 'admin', label: 'الشؤون الإدارية' },
];

export const COMPANY_DEFAULTS = {
  name: 'شركة مارشال لوجستيكس',
  crNumber: '7054828277',
} as const;

export interface PlaceholderDef { key: string; label: string }

export const DRIVER_PLACEHOLDERS: PlaceholderDef[] = [
  { key: 'driver_name', label: 'اسم المندوب' },
  { key: 'iqama_number', label: 'رقم الهوية / الإقامة' },
  { key: 'nationality', label: 'الجنسية' },
  { key: 'job_title', label: 'المسمى الوظيفي' },
  { key: 'driver_phone', label: 'رقم الجوال' },
  { key: 'join_date', label: 'تاريخ المباشرة' },
];

export const VEHICLE_PLACEHOLDERS: PlaceholderDef[] = [
  { key: 'plate_number', label: 'رقم اللوحة' },
  { key: 'vehicle_model', label: 'نوع / موديل المركبة' },
  { key: 'chassis_number', label: 'رقم الهيكل' },
  { key: 'sequence_number', label: 'الرقم التسلسلي' },
];

export const FINANCIAL_PLACEHOLDERS: PlaceholderDef[] = [
  { key: 'basic_salary', label: 'الراتب الأساسي' },
  { key: 'housing_allowance', label: 'بدل السكن' },
  { key: 'transport_allowance', label: 'بدل النقل' },
  { key: 'other_allowance', label: 'بدلات أخرى' },
  { key: 'total_salary', label: 'إجمالي الراتب' },
  { key: 'advance_amount', label: 'مبلغ السلفة / العهدة' },
  { key: 'installment_amount', label: 'قسط الخصم الشهري' },
];

export const SYSTEM_PLACEHOLDERS: PlaceholderDef[] = [
  { key: 'ref_number', label: 'الرقم المرجعي' },
  { key: 'issue_date_gregorian', label: 'التاريخ الميلادي' },
  { key: 'issue_date_hijri', label: 'التاريخ الهجري' },
  { key: 'company_name', label: 'اسم الشركة' },
  { key: 'cr_number', label: 'السجل التجاري' },
];

export const MANUAL_PLACEHOLDERS: PlaceholderDef[] = [
  { key: 'platform_name', label: 'اسم المنصة' },
  { key: 'najm_report_number', label: 'رقم تقرير نجم' },
  { key: 'accident_date', label: 'تاريخ الحادث' },
  { key: 'policy_number', label: 'رقم الوثيقة' },
  { key: 'odometer_reading', label: 'قراءة العداد' },
  { key: 'violation_details', label: 'تفاصيل المخالفة' },
];

const B = (key: string) => `<strong>{{${key}}}</strong>`;

const DRIVER_IDENT = `السيد/ ${B('driver_name')}، ${B('nationality')} الجنسية، حامل الهوية / الإقامة رقم ${B('iqama_number')}`;
const VEHICLE_IDENT = `المركبة نوع ${B('vehicle_model')}، لوحة رقم ${B('plate_number')}، رقم الهيكل ${B('chassis_number')}، الرقم التسلسلي ${B('sequence_number')}`;
const COMPANY_IDENT = `${B('company_name')}، سجل تجاري رقم ${B('cr_number')}`;

export const LETTER_TEMPLATES: LetterTemplate[] = [
  {
    id: 'salary-certificate',
    group: 'salary',
    category: 'salary_certificate',
    name: 'شهادة تعريف بالراتب وإثبات عمل',
    title: 'شهادة تعريف بالراتب وإثبات عمل',
    subject: 'شهادة تعريف بالراتب وإثبات عمل',
    recipient: 'إلى من يهمه الأمر / البنوك والجهات التمويلية والرسمية',
    recipientTitle: 'المحترمين',
    contentHtml: `<p>تشهد ${COMPANY_IDENT}، بأن ${DRIVER_IDENT}، يعمل لدينا بوظيفة (${B('job_title')}) منذ تاريخ ${B('join_date')}، وما زال على رأس العمل حتى تاريخ إصدار هذه الشهادة.</p>
<p>وتفصيل راتبه الشهري الثابت كما يلي:</p>
<ul><li>الراتب الأساسي: ${B('basic_salary')} ريال سعودي</li><li>بدل السكن: ${B('housing_allowance')} ريال سعودي</li><li>بدل النقل: ${B('transport_allowance')} ريال سعودي</li><li>بدلات أخرى: ${B('other_allowance')} ريال سعودي</li><li>إجمالي الراتب الشهري: ${B('total_salary')} ريال سعودي</li></ul>
<p>وتؤكد الشركة استمرار علاقته الوظيفية وعدم وجود ما يمنع من استمرارها حتى تاريخه، وقد أعطيت هذه الشهادة بناءً على طلبه لتقديمها لمن يلزم، دون أدنى مسؤولية مالية أو قانونية على الشركة تجاه الغير.</p>`,
  },
  {
    id: 'traffic-vehicle-authorization',
    group: 'traffic',
    category: 'traffic',
    name: 'تفويض قيادة مركبة تشغيلية داخل/خارج المملكة',
    title: 'تفويض قيادة مركبة تشغيلية',
    subject: 'تفويض قيادة مركبة تشغيلية داخل المملكة وخارجها',
    recipient: 'الإدارة العامة للمرور / المنافذ الحدودية',
    recipientTitle: 'المحترمين',
    contentHtml: `<p>تفيد ${COMPANY_IDENT}، بصفتها المالكة / المستأجرة النظامية للمركبة الموضحة أدناه، بأنها تفوض ${DRIVER_IDENT}، رقم الجوال ${B('driver_phone')}، بقيادة واستخدام ${VEHICLE_IDENT}.</p>
<p>ويشمل التفويض القيادة داخل المملكة العربية السعودية، وخارجها متى استلزمت أعمال الشركة ذلك وفق الأنظمة والتعليمات المعمول بها وبعد استيفاء متطلبات المنافذ الحدودية.</p>
<p>ويلتزم المفوض بحمل رخصة قيادة سارية وأصل هذا التفويض، والتقيد بأنظمة المرور، ويتحمل المسؤولية النظامية عن أي مخالفة أو إخلال خلال فترة التفويض. وهذا التفويض ساري حتى إشعار آخر ما لم تلغه الشركة كتابياً.</p>`,
  },
  {
    id: 'traffic-possession-transfer',
    group: 'traffic',
    category: 'traffic',
    name: 'إشعار نقل حيازة وتفويض إسقاط/تجديد رخص السير',
    title: 'إشعار نقل حيازة وتفويض إجراءات رخص السير',
    subject: 'إشعار نقل حيازة وتفويض بإسقاط / تجديد رخصة السير',
    recipient: 'الإدارة العامة للمرور',
    recipientTitle: 'المحترمين',
    contentHtml: `<p>نفيدكم بأن ${COMPANY_IDENT}، تقوم بإشعاركم بنقل حيازة ${VEHICLE_IDENT}، وإسنادها تشغيلياً إلى ${DRIVER_IDENT}.</p>
<p>وعليه فإن الشركة تفوض المذكور بمراجعة الجهات المختصة لإسقاط أو تجديد رخصة السير (الاستمارة) وإنهاء ما يتعلق بها من إجراءات، على أن يكون ذلك في حدود هذا التفويض فقط، ولا يشمل بيع المركبة أو رهنها أو التصرف في ملكيتها.</p>
<p>نأمل التكرم بالاطلاع واتخاذ ما يلزم نظاماً، مع الإحاطة بأن الشركة مسؤولة عن صحة البيانات الواردة أعلاه.</p>`,
  },
  {
    id: 'traffic-surety',
    group: 'traffic',
    category: 'traffic',
    name: 'كفالة غرامية وحضورية لمندوب في واقعة مرورية',
    title: 'كفالة غرامية وحضورية',
    subject: 'كفالة غرامية وحضورية لمندوب في واقعة مرورية',
    recipient: 'الإدارة العامة للمرور / الجهة المختصة بالنظر في الواقعة',
    recipientTitle: 'المحترمين',
    contentHtml: `<p>تتقدم ${COMPANY_IDENT}، بصفتها جهة العمل، بكفالة ${DRIVER_IDENT}، المسند إليه قيادة ${VEHICLE_IDENT}، في الواقعة المرورية المتعلقة به (${B('violation_details')}).</p>
<p>وتتعهد الشركة بما يلي:</p>
<ol><li>كفالة حضور المذكور إلى الجهة المختصة في كل موعد تحدده، وإحضاره متى طُلب.</li><li>كفالة غرامية بسداد ما قد يصدر بحقه من غرامات مرورية نظامية مرتبطة بهذه الواقعة.</li><li>حق الشركة في الرجوع على المذكور بما تسدده عنه وفق الأنظمة والعقود المبرمة معه.</li></ol>
<p>وقد أصدرنا هذه الكفالة بناءً على طلب الجهة المختصة لاعتمادها وإجراء اللازم.</p>`,
  },
  {
    id: 'insurance-claim',
    group: 'insurance',
    category: 'insurance',
    name: 'مطالبة تعويض عن حادث سير',
    title: 'مطالبة تعويض عن حادث سير',
    subject: 'مطالبة تعويض عن حادث سير – تقرير نجم رقم {{najm_report_number}}',
    recipient: 'السادة / شركة التأمين',
    recipientTitle: 'المحترمين',
    contentHtml: `<p>إشارة إلى وثيقة التأمين رقم ${B('policy_number')} الصادرة لصالح ${COMPANY_IDENT}، نتقدم إليكم بمطالبة تعويض عن الحادث الموضحة بياناته أدناه:</p>
<ul><li>رقم تقرير نجم: ${B('najm_report_number')}</li><li>تاريخ الحادث: ${B('accident_date')}</li><li>المركبة: ${B('vehicle_model')}</li><li>رقم اللوحة: ${B('plate_number')}</li><li>رقم الهيكل: ${B('chassis_number')}</li><li>قائد المركبة وقت الحادث: ${B('driver_name')} – هوية رقم ${B('iqama_number')}</li></ul>
<p>نأمل التكرم بفتح مطالبة رسمية ومعاينة المركبة وإصدار الموافقات اللازمة للإصلاح أو التعويض وفق شروط الوثيقة، علماً بأن كافة المستندات المؤيدة (تقرير نجم، الاستمارة، رخصة القيادة، صور الأضرار) مرفقة بهذا الخطاب.</p>`,
  },
  {
    id: 'insurance-fleet-endorsement',
    group: 'insurance',
    category: 'insurance',
    name: 'طلب إضافة / حذف مركبة من وثيقة التأمين الموحدة',
    title: 'طلب إضافة / حذف مركبة من وثيقة التأمين',
    subject: 'طلب إضافة / حذف مركبة من وثيقة التأمين الموحدة لأسطول مارشال لوجستيكس',
    recipient: 'السادة / شركة التأمين',
    recipientTitle: 'المحترمين',
    contentHtml: `<p>إشارة إلى وثيقة التأمين الموحدة للأسطول رقم ${B('policy_number')} الصادرة لصالح ${COMPANY_IDENT}، نأمل التكرم بإجراء الملحق التالي على الوثيقة (إضافة / حذف) اعتباراً من تاريخ ${B('issue_date_gregorian')}:</p>
<ul><li>نوع المركبة: ${B('vehicle_model')}</li><li>رقم اللوحة: ${B('plate_number')}</li><li>رقم الهيكل: ${B('chassis_number')}</li><li>الرقم التسلسلي: ${B('sequence_number')}</li></ul>
<p>ونرجو إصدار الملحق وإفادتنا بقيمة القسط الإضافي أو المسترد وفق شروط الوثيقة، مع إرسال نسخة محدثة من جدول المركبات المؤمنة.</p>`,
  },
  {
    id: 'financial-advance',
    group: 'custody',
    category: 'custody',
    name: 'إقرار وتعهد استلام عهدة مالية وسلفة',
    title: 'إقرار وتعهد باستلام سلفة / عهدة مالية',
    subject: 'إقرار وتعهد باستلام سلفة مالية / عهدة نقدية تشغيلية',
    recipient: 'إدارة الموارد البشرية والشؤون المالية',
    recipientTitle: 'المحترمين',
    contentHtml: `<p>أقر أنا ${DRIVER_IDENT}، رقم الجوال ${B('driver_phone')}، وأنا بكامل أهليتي المعتبرة شرعاً ونظاماً، بأنني استلمت من ${COMPANY_IDENT}، مبلغاً قدره ${B('advance_amount')} ريال سعودي، كسلفة مالية / عهدة نقدية تشغيلية، وأن هذا المبلغ دين في ذمتي واجب السداد للشركة.</p>
<p>وأتعهد بما يلي:</p>
<ol><li>الموافقة غير القابلة للرجوع على خصم المبلغ من راتبي الشهري بواقع ${B('installment_amount')} ريال سعودي شهرياً حتى السداد التام، وفق نظام العمل السعودي.</li><li>سداد كامل المتبقي دفعة واحدة عند انتهاء علاقتي الوظيفية لأي سبب، ويحق للشركة خصمه من مستحقاتي النهائية.</li><li>استخدام العهدة في الأغراض التشغيلية المخصصة لها فقط، وتقديم المستندات المؤيدة عند الطلب.</li><li>في حال التخلف عن السداد أو سوء استخدام المبلغ أو التصرف فيه بغير وجه حق، فإنني أتحمل المسؤولية المدنية والجزائية كاملة وفق الأنظمة المعمول بها في المملكة العربية السعودية، بما في ذلك حق الشركة في المطالبة القضائية وتحمل ما يترتب عليها من تكاليف.</li></ol>
<p>وهذا إقرار مني بذلك، وعلى ذلك جرى التوقيع بتاريخ ${B('issue_date_gregorian')} الموافق ${B('issue_date_hijri')}.</p>`,
  },
  {
    id: 'vehicle-custody',
    group: 'custody',
    category: 'custody',
    name: 'محضر تسليم واستلام عهدة مركبة تشغيلية',
    title: 'محضر تسليم واستلام عهدة مركبة تشغيلية',
    subject: 'محضر تسليم واستلام مركبة تشغيلية وتعهد بالمحافظة عليها',
    recipient: 'إدارة الأسطول والعمليات',
    recipientTitle: 'المحترمين',
    contentHtml: `<p>في تاريخ ${B('issue_date_gregorian')} سلمت ${COMPANY_IDENT}، إلى ${DRIVER_IDENT}، ${VEHICLE_IDENT}، لاستخدامها في أعمال التوصيل التشغيلية، وقد استلمها المذكور بحالتها الراهنة بعد المعاينة النافية للجهالة.</p>
<p><strong>بيانات الاستلام:</strong> قراءة العداد عند التسليم: ${B('odometer_reading')} كم.</p>
<p><strong>قائمة الفحص الفني:</strong> (الهيكل الخارجي، الإطارات والإطار الاحتياطي، الإضاءة والإشارات، المكابح، الزيت والسوائل، المكيف، الأوراق الرسمية، طفاية الحريق ومثلث التحذير) – وقد تم فحصها وإثبات الملاحظات عليها في نموذج الفحص المرفق.</p>
<p>ويتعهد المستلم بما يلي:</p>
<ol><li>المحافظة على المركبة واستخدامها في الأغراض التشغيلية فقط، وعدم إعارتها أو تسليمها للغير.</li><li>الالتزام بجدول الصيانة الدورية وإبلاغ الشركة فوراً عن أي عطل أو حادث.</li><li>المحافظة على بطاقة الوقود المسلمة له وعدم استخدامها لغير هذه المركبة، ويتحمل مسؤولية فقدها أو إساءة استخدامها.</li><li>تحمل المسؤولية الكاملة عن جميع المخالفات المرورية التي تقع خلال فترة العهدة، وللشركة الحق في خصمها من مستحقاته.</li><li>إعادة المركبة بالحالة التي استلمها بها عند الطلب أو عند انتهاء العلاقة، مع استثناء الاستهلاك الطبيعي.</li></ol>`,
  },
  {
    id: 'platform-authorization',
    group: 'platforms',
    category: 'platform_undertaking',
    name: 'خطاب تفويض مندوب لمنصة توصيل',
    title: 'خطاب تفويض واعتماد مندوب توصيل',
    subject: 'تفويض واعتماد مندوب توصيل على منصة {{platform_name}}',
    recipient: 'إدارة منصة {{platform_name}}',
    recipientTitle: 'المحترمين',
    contentHtml: `<p>تفيد ${COMPANY_IDENT}، بأنها شريك تشغيلي معتمد لدى منصة ${B('platform_name')} (جاهز / هنقرستيشن / ذا شيفز / تويو)، وأنها تفوض وتعتمد ${DRIVER_IDENT}، رقم الجوال ${B('driver_phone')}، للعمل بصفة مندوب توصيل تحت كود أسطول الشركة على المنصة المذكورة.</p>
<p>وتقر الشركة بأن المندوب موظف نظامي لديها، وأنها مسؤولة عن التزامه بأنظمة المنصة وسياسات الجودة والسلامة، وصلاحية وثائقه ووثائق مركبته، كما تلتزم بالتعاون مع المنصة في معالجة أي ملاحظات تشغيلية.</p>
<p>صدر هذا الخطاب بناءً على طلب المندوب لتفعيل حسابه واعتماده، وهو ساري المفعول حتى إشعار آخر.</p>`,
  },
  {
    id: 'disciplinary-warning',
    group: 'admin',
    category: 'disciplinary',
    name: 'إشعار إنذار إداري ومخالفة تشغيلية',
    title: 'إشعار إنذار إداري',
    subject: 'إنذار إداري بشأن مخالفة تشغيلية',
    recipient: 'السيد / {{driver_name}}',
    recipientTitle: 'المحترم',
    contentHtml: `<p>إلى ${DRIVER_IDENT}، يعمل لدينا بوظيفة (${B('job_title')}).</p>
<p>نشير إلى ما رصدته إدارة العمليات بحقكم من تراجع في مستوى أداء التوصيل و/أو إيقاف حسابكم على منصة ${B('platform_name')} و/أو مخالفة لتعليمات الأسطول الداخلية، وتفصيلها: ${B('violation_details')}.</p>
<p>وعليه، وبناءً على لائحة تنظيم العمل في الشركة وما نص عليه نظام العمل السعودي، فإننا نوجه إليكم <strong>إنذاراً إدارياً</strong> بضرورة تصحيح الوضع والالتزام بتعليمات الشركة ومعايير الأداء المعتمدة فوراً.</p>
<p>ونفيدكم بأن تكرار المخالفة سيعرضكم لاتخاذ الإجراءات النظامية الأشد وفق لائحة الجزاءات المعتمدة ونظام العمل، بما في ذلك الحسم من الأجر أو إنهاء العلاقة العقدية في الحالات التي يجيزها النظام. ولكم حق الاعتراض كتابياً خلال المدة النظامية.</p>`,
  },
  {
    id: 'end-of-service-clearance',
    group: 'admin',
    category: 'clearance',
    name: 'شهادة إخلاء طرف ومخالصة نهائية تامة',
    title: 'شهادة إخلاء طرف ومخالصة نهائية',
    subject: 'إخلاء طرف ومخالصة نهائية تامة',
    recipient: 'إلى من يهمه الأمر',
    recipientTitle: 'المحترمين',
    contentHtml: `<p>تشهد ${COMPANY_IDENT}، بأن ${DRIVER_IDENT}، الذي كان يعمل لدينا بوظيفة (${B('job_title')})، قد أنهى علاقته الوظيفية بالشركة، وقد تم بحمد الله إخلاء طرفه نهائياً بعد استيفاء ما يلي:</p>
<ol><li>إعادة المركبة (لوحة رقم ${B('plate_number')}) وملحقاتها واستلامها من الشركة بعد الفحص.</li><li>تسوية جميع المستحقات المالية بين الطرفين، بما في ذلك السلف والعهد والخصومات.</li><li>إلغاء بطاقة الوقود المسلمة له وإيقاف العمل بها.</li><li>تسليم حسابه على منصة ${B('platform_name')} وإلغاء ارتباطه بكود الأسطول.</li></ol>
<p>وبموجب ذلك تبرأ ذمة كل من الطرفين تجاه الآخر براءة تامة شاملة، ولا يحق لأي منهما مطالبة الآخر بأي حق أو تعويض ناشئ عن العلاقة الوظيفية السابقة لتاريخه، وقد أعطي هذا الخطاب بناءً على طلبه.</p>`,
  },
];

export function getTemplateById(id: string): LetterTemplate | undefined {
  return LETTER_TEMPLATES.find((template) => template.id === id);
}

export type PlaceholderValues = Record<string, string>;

const money = (value: unknown): string => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '';
};

const dateOnly = (value?: string): string => (value ? value.slice(0, 10) : '');

export function buildDriverValues(driver: Driver): PlaceholderValues {
  const extra = driver as unknown as Record<string, unknown>;
  const basic = Number(driver.basicSalary) || 0;
  const housing = Number(extra.housingAllowance) || 0;
  const transport = Number(extra.transportAllowance) || 0;
  const other = Number(extra.otherAllowance) || 0;
  return {
    driver_name: driver.fullName || '',
    iqama_number: driver.iqamaNumber || '',
    nationality: driver.nationality || '',
    job_title: String(extra.jobTitle || 'مندوب توصيل'),
    driver_phone: driver.phone || '',
    join_date: dateOnly(driver.startDate),
    basic_salary: basic ? money(basic) : '',
    housing_allowance: housing ? money(housing) : '0',
    transport_allowance: transport ? money(transport) : '0',
    other_allowance: other ? money(other) : '0',
    total_salary: basic + housing + transport + other ? money(basic + housing + transport + other) : '',
  };
}

export function buildVehicleValues(vehicle: Vehicle): PlaceholderValues {
  const extra = vehicle as unknown as Record<string, unknown>;
  return {
    plate_number: vehicle.plateNumber || '',
    vehicle_model: [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || vehicle.vehicleType || '',
    chassis_number: vehicle.vin || '',
    sequence_number: String(extra.sequenceNumber || extra.istemaraSerial || ''),
    odometer_reading: vehicle.currentOdometer ? String(vehicle.currentOdometer) : '',
  };
}

export function formatLetterDates(isoDate: string) {
  const date = new Date(isoDate);
  return {
    gregorian: new Intl.DateTimeFormat('ar-SA', { dateStyle: 'long' }).format(date),
    hijri: new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { dateStyle: 'long' }).format(date),
  };
}

export function makeSerialReference(): string {
  return `ML-LET-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

/** Replaces known {{placeholders}}; unknown or empty values stay visible for manual completion. */
export function resolvePlaceholders(text: string, values: PlaceholderValues): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) => {
    const value = values[key];
    return value ? value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : match;
  });
}

export function countUnresolved(text: string): number {
  return (text.match(/\{\{\s*[a-z_]+\s*\}\}/g) || []).length;
}
