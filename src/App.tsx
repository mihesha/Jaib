import React, { useState } from 'react';
import { 
  Radio, Laptop, Code2, BookOpen, Download, ShieldAlert, 
  Smartphone, Monitor, CheckCircle2, Sparkles, Github, ExternalLink 
} from 'lucide-react';
import JSZip from 'jszip';
import { InteractiveSimulator } from './components/InteractiveSimulator';
import { CodeExplorer } from './components/CodeExplorer';
import { DocumentationGuide } from './components/DocumentationGuide';
import { PROJECT_FILES } from './data/projectFiles';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'docs'>('simulator');
  const [isExportingZip, setIsExportingZip] = useState(false);

  const handleDownloadFullZip = async () => {
    try {
      setIsExportingZip(true);
      const zip = new JSZip();
      
      PROJECT_FILES.forEach((f) => {
        zip.file(f.path, f.content);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'jeeb-deposit-bridge-v0.1.0.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('حدث خطأ أثناء تحميل الحزمة: ' + e);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Cairo',sans-serif]">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-950/40">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  جسر إشعارات إيداع جيب
                </h1>
                <span className="text-[11px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                  v0.1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Jeeb Deposit Bridge — النظام المتكامل ثلاثي الحلقات (مدير • كاشير • ويندوز)
              </p>
            </div>
          </div>

          {/* Navigation Pills */}
          <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
                activeTab === 'simulator'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>المحاكي التفاعلي الحي</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
                activeTab === 'code'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-900/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>الكود المصدري للمشاريع الثلاثة</span>
            </button>

            <button
              onClick={() => setActiveTab('docs')}
              className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
                activeTab === 'docs'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>دليل التشغيل والمواصفات</span>
            </button>
          </div>

          {/* Quick 1-Click Full ZIP Download */}
          <button
            onClick={handleDownloadFullZip}
            disabled={isExportingZip}
            className="hidden lg:flex bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-lg transition items-center gap-2 disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingZip ? 'جاري التحميل...' : 'تحميل المشروع كاملاً (.ZIP)'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Direct Downloads Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-5">
            <div className="space-y-1 text-center lg:text-right">
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                  الملفات التنفيذية جاهزة للتحميل المباشر في الجذر
                </span>
              </div>
              <h2 className="text-lg font-black text-white">
                تطبيقات أندرويد الجاهزة (APK) وبرنامج ويندوز التنفيذي (EXE)
              </h2>
              <p className="text-xs text-slate-400">
                تم بناء وتوقيع حزم APK للهاتفين وتجميع ملف EXE لويندوز وتجهيز حزمة التشغيل المحمولة في الجذر:
              </p>
            </div>

            {/* Download Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto">
              <a
                href="/Jeeb_Deposit_Manager.apk"
                download="Jeeb_Deposit_Manager.apk"
                className="bg-rose-950/60 hover:bg-rose-900/60 border border-rose-600/40 hover:border-rose-500 text-rose-200 hover:text-white p-3 rounded-2xl transition flex flex-col items-center justify-center text-center shadow-lg group"
              >
                <Smartphone className="w-5 h-5 text-rose-400 group-hover:scale-110 transition mb-1" />
                <span className="font-bold text-xs">تطبيق المدير</span>
                <span className="text-[10px] text-rose-300/80 font-mono">Manager.apk</span>
              </a>

              <a
                href="/Jeeb_Deposit_Cashier.apk"
                download="Jeeb_Deposit_Cashier.apk"
                className="bg-sky-950/60 hover:bg-sky-900/60 border border-sky-600/40 hover:border-sky-500 text-sky-200 hover:text-white p-3 rounded-2xl transition flex flex-col items-center justify-center text-center shadow-lg group"
              >
                <Smartphone className="w-5 h-5 text-sky-400 group-hover:scale-110 transition mb-1" />
                <span className="font-bold text-xs">تطبيق الكاشير</span>
                <span className="text-[10px] text-sky-300/80 font-mono">Cashier.apk</span>
              </a>

              <a
                href="/Jeeb_Deposit_Receiver.exe"
                download="Jeeb_Deposit_Receiver.exe"
                className="bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-600/40 hover:border-emerald-500 text-emerald-200 hover:text-white p-3 rounded-2xl transition flex flex-col items-center justify-center text-center shadow-lg group"
              >
                <Monitor className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition mb-1" />
                <span className="font-bold text-xs">برنامج ويندوز</span>
                <span className="text-[10px] text-emerald-300/80 font-mono">Receiver.exe</span>
              </a>

              <a
                href="/Jeeb_Receiver_Windows_Portable.zip"
                download="Jeeb_Receiver_Windows_Portable.zip"
                className="bg-amber-950/60 hover:bg-amber-900/60 border border-amber-600/40 hover:border-amber-500 text-amber-200 hover:text-white p-3 rounded-2xl transition flex flex-col items-center justify-center text-center shadow-lg group"
              >
                <Download className="w-5 h-5 text-amber-400 group-hover:scale-110 transition mb-1" />
                <span className="font-bold text-xs">حزمة ويندوز</span>
                <span className="text-[10px] text-amber-300/80 font-mono">Portable.zip</span>
              </a>
            </div>
          </div>
        </div>

        {activeTab === 'simulator' && <InteractiveSimulator />}
        {activeTab === 'code' && <CodeExplorer />}
        {activeTab === 'docs' && <DocumentationGuide />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500/80" />
            <span>
              نظام نقل إشعارات محلي تجريبي — لا يغني عن التحقق الرسمي من محفظة جيب قبل تسليم البضائع.
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>manager: com.jeeey.depositmanager</span>
            <span>•</span>
            <span>cashier: com.jeeey.depositcashier</span>
            <span>•</span>
            <span>pc_receiver: port 8765</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
