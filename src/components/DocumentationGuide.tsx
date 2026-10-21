import React from 'react';
import { 
  BookOpen, ShieldAlert, Wifi, Server, Smartphone, CheckCircle, 
  AlertOctagon, HelpCircle, ArrowRightLeft, FileText, Lock, Terminal 
} from 'lucide-react';

export const DocumentationGuide: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-rose-500/20 text-rose-300 text-xs font-bold px-3 py-1 rounded-full border border-rose-500/30">
              دليل التشغيل والمواصفات الرسمية للمشروع
            </span>
            <span className="text-slate-400 text-xs">إصدار الوثيقة: 0.1.0</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            جسر إشعارات إيداع جيب — Jeeb Deposit Bridge
          </h2>
          <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
            يهدف المشروع إلى تمكين كاشير المحل من معرفة وصول إشعارات إيداعات محفظة جيب لحظيًا دون الحاجة للاتصال بالمدير في كل مرة، ومع ضمان عمل الجزء المحلي داخل المحل دون الحاجة إلى اتصال بالإنترنت.
          </p>
        </div>
      </div>

      {/* Critical Financial Disclaimer Card */}
      <div className="bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border-2 border-amber-600/40 rounded-3xl p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-400 shrink-0">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-amber-200">
              تنبيه مالي وقانوني أساسي (هام للغاية):
            </h3>
            <p className="text-sm text-amber-100/90 leading-relaxed">
              هذا النظام ينقل إشعارًا وصل إلى الهاتف فقط، ولا يتصل بمحفظة جيب مباشرة عبر API ولا يثبت رصيد الحساب البنكي.
            </p>
            <ul className="text-xs text-amber-200/80 list-disc list-inside space-y-1">
              <li>لا تعتمد على الإشعار المنقول وحده كدليل نهائي وحاسم على سداد المبالغ الكبيرة.</li>
              <li>لا تسلّم البضاعة عند وجود تعارض في الأرقام أو شك في العملية حتى يتم التحقق من التطبيق الرسمي.</li>
              <li>البرنامج أداة مساعدة داخلية للمحل وليس بوابة دفع أو تسوية مالية معتمدة.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Internet Requirements Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Wifi className="w-5 h-5 text-sky-400" />
          <h3 className="text-lg font-bold text-white">متى يعمل النظام بدون إنترنت؟</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold">
                <th className="py-3 px-4">المسار والحلقة</th>
                <th className="py-3 px-4">هل يحتاج إنترنت؟</th>
                <th className="py-3 px-4">المتطلب الفعلي للعمل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-semibold text-rose-300">هاتف المدير ← هاتف الكاشير</td>
                <td className="py-3 px-4 font-bold text-emerald-400">لا (بدون إنترنت)</td>
                <td className="py-3 px-4 text-slate-400">تغطية شبكة خلوية ورصيد SMS فعّال على الشريحتين</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-semibold text-sky-300">هاتف الكاشير ← كمبيوتر المحل</td>
                <td className="py-3 px-4 font-bold text-emerald-400">لا (بدون إنترنت)</td>
                <td className="py-3 px-4 text-slate-400">اتصال هاتف الكاشير والكمبيوتر بنفس راوتر المحل (Wi-Fi / LAN)</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-semibold text-amber-300">المدير في محافظة أو مدينة أخرى</td>
                <td className="py-3 px-4 font-bold text-emerald-400">لا (بدون إنترنت)</td>
                <td className="py-3 px-4 text-slate-400">طالما تتوفر تغطية رسائل SMS خلوية بين المحافظات</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-semibold text-slate-300">هاتف الكاشير ← كمبيوتر في شبكة خارجية</td>
                <td className="py-3 px-4 font-bold text-rose-400">نعم يتطلب شبكة مخصصة</td>
                <td className="py-3 px-4 text-slate-400">هذا النموذج مخصص للشبكة المحلية LAN داخل نفس المتجر</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Step by Step Execution Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="w-8 h-8 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-sm">
            1
          </div>
          <h4 className="font-bold text-white text-base">إعداد برنامج ويندوز أولاً</h4>
          <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
            <li>قم بتثبيت Python 3.10 أو أحدث على كمبيوتر المحل.</li>
            <li>شغّل الملف <code className="bg-slate-950 px-1 py-0.5 rounded text-sky-400 font-mono">start_windows.bat</code>.</li>
            <li>يقوم البرنامج بإنشاء قاعدة SQLite تلقائياً وتوليد رمز ربط عشوائي.</li>
            <li>سجّل عنوان IP المعروض على الشاشة (مثلاً: <code className="text-amber-300 font-mono">192.168.1.100</code>).</li>
            <li>انسخ رمز الربط (Token) لاستخدامه في هاتف الكاشير.</li>
          </ol>
        </div>

        {/* Step 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="w-8 h-8 rounded-xl bg-sky-600/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <h4 className="font-bold text-white text-base">إعداد هاتف الكاشير</h4>
          <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
            <li>ثبّت ملف APK الخاص بوحدة <code className="bg-slate-950 px-1 py-0.5 rounded text-sky-400 font-mono">cashier</code>.</li>
            <li>أدخل رقم هاتف المدير المعتمد (مثلاً: <code className="text-amber-300 font-mono">+967771234567</code>).</li>
            <li>أدخل عنوان IP ومنفذ الكمبيوتر (الافتراضي 8765).</li>
            <li>الصق رمز الربط الظاهر على شاشة الكمبيوتر.</li>
            <li>اضغط <strong>اختبار الاتصال بكمبيوتر الكاشير</strong> للتأكد من استجابة خادم LAN.</li>
          </ol>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm">
            3
          </div>
          <h4 className="font-bold text-white text-base">إعداد هاتف المدير</h4>
          <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
            <li>ثبّت APK الخاص بوحدة <code className="bg-slate-950 px-1 py-0.5 rounded text-sky-400 font-mono">manager</code>.</li>
            <li>أدخل رقم هاتف الكاشير بصيغة دولية كاملة.</li>
            <li>اضبط الكلمات المفتاحية لمطابقة إشعار جيب (<code className="text-amber-300">جيب,jeeb,إيداع</code>).</li>
            <li>امنح إذن إرسال SMS، وفعّل خدمة قراءة الإشعارات من إعدادات أندرويد.</li>
            <li>قم بعمل إرسال تجريبي للتأكد من وصول SMS إلى هاتف الكاشير.</li>
          </ol>
        </div>
      </div>

      {/* Troubleshooting FAQ */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-white">دليل استكشاف الأخطاء وحل المشكلات (Troubleshooting)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1.5">
            <h5 className="font-bold text-rose-300">لماذا لا تصل رسائل SMS إلى هاتف الكاشير؟</h5>
            <p className="text-slate-400 leading-relaxed">
              تأكد من توفر رصيد رسائل نصية في شريحة هاتف المدير، ومن إدخال الرقم بصيغة دولية صحيحة، ومن منح إذن SEND_SMS وتفعيل صلاحية Notification Listener.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1.5">
            <h5 className="font-bold text-rose-300">هاتف الكاشير يستقبل SMS لكن لا تظهر في شاشة ويندوز؟</h5>
            <p className="text-slate-400 leading-relaxed">
              تأكد من اتصال الهاتف والكمبيوتر بنفس الراوتر، وعدم تفعيل ميزة Client Isolation في الراوتر، وتشغيل سكريبت السماح في جدار الحماية (Port 8765).
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1.5">
            <h5 className="font-bold text-amber-300">ماذا يحدث إذا تغير عنوان IP الخاص بالكمبيوتر؟</h5>
            <p className="text-slate-400 leading-relaxed">
              إذا كان الراوتر يستخدم DHCP الديناميكي، قد يتغير IP عند إعادة تشغيله. يُفضل حجز IP ثابت (Static DHCP Lease) لكمبيوتر المحل من إعدادات الراوتر.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1.5">
            <h5 className="font-bold text-amber-300">هل يتوقف التطبيق بعد قفل شاشة الهاتف؟</h5>
            <p className="text-slate-400 leading-relaxed">
              تقوم بعض أنظمة أندرويد (مثل Xiaomi و Samsung) بإيقاف التطبيقات في الخلفية لتوفير البطارية. يجب استثناء التطبيقين من تحسين البطارية (Battery Optimization Disabled).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
