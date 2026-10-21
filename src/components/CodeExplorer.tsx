import React, { useState } from 'react';
import { 
  FolderTree, FileCode, Copy, Check, Download, Archive, 
  Terminal, ShieldAlert, ExternalLink, Layers, Sparkles 
} from 'lucide-react';
import JSZip from 'jszip';
import { PROJECT_FILES, ProjectFile } from '../data/projectFiles';

export const CodeExplorer: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<'manager' | 'cashier' | 'pc_receiver' | 'root'>('manager');
  const [selectedFile, setSelectedFile] = useState<ProjectFile>(PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const filteredFiles = PROJECT_FILES.filter((f) => f.category === selectedCategory);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();
      
      // Add all project files into zip structure
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
      alert('حدث خطأ أثناء تجميع ملف ZIP: ' + e);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Category Tabs & Zip Download Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setSelectedCategory('manager');
              const first = PROJECT_FILES.find((f) => f.category === 'manager');
              if (first) setSelectedFile(first);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              selectedCategory === 'manager'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <span>📱 1. تطبيق أندرويد للمدير (Manager)</span>
          </button>

          <button
            onClick={() => {
              setSelectedCategory('cashier');
              const first = PROJECT_FILES.find((f) => f.category === 'cashier');
              if (first) setSelectedFile(first);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              selectedCategory === 'cashier'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <span>📱 2. تطبيق أندرويد للكاشير (Cashier)</span>
          </button>

          <button
            onClick={() => {
              setSelectedCategory('pc_receiver');
              const first = PROJECT_FILES.find((f) => f.category === 'pc_receiver');
              if (first) setSelectedFile(first);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              selectedCategory === 'pc_receiver'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <span>💻 3. مستقبِل ويندوز (Windows Receiver)</span>
          </button>

          <button
            onClick={() => {
              setSelectedCategory('root');
              const first = PROJECT_FILES.find((f) => f.category === 'root');
              if (first) setSelectedFile(first);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              selectedCategory === 'root'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <span>⚙️ إعدادات Gradle والتوثيق</span>
          </button>
        </div>

        {/* Full Project ZIP Download Button */}
        <button
          onClick={handleDownloadZip}
          disabled={isZipping}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-lg transition flex items-center gap-2 shrink-0 disabled:opacity-60"
        >
          <Archive className="w-4 h-4" />
          <span>{isZipping ? 'جاري ضغط الملفات...' : 'تحميل المشروع بالكامل (.ZIP)'}</span>
        </button>
      </div>

      {/* Explorer Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Side: File List */}
        <div className="md:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-sky-400" />
              <span>ملفات القسم المحدد ({filteredFiles.length})</span>
            </span>
          </div>

          <div className="space-y-1.5">
            {filteredFiles.map((file) => (
              <button
                key={file.path}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-right p-3 rounded-xl text-xs transition flex flex-col gap-1 border ${
                  selectedFile.path === file.path
                    ? 'bg-slate-800 border-sky-500 text-white shadow-md'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/70 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono font-bold text-[13px]">{file.name}</span>
                  <span className="text-[10px] font-mono uppercase bg-slate-900 px-2 py-0.5 rounded text-slate-400 border border-slate-800">
                    {file.language}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-sans line-clamp-1">{file.description}</span>
                <span className="text-[9px] text-slate-500 font-mono mt-0.5 truncate">{file.path}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Code Viewer */}
        <div className="md:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          {/* Viewer Header */}
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-sm font-bold text-white">{selectedFile.path}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{selectedFile.description}</p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={handleCopy}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ!' : 'نسخ الكود'}</span>
              </button>

              <button
                onClick={handleDownloadSingle}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>تنزيل الملف</span>
              </button>
            </div>
          </div>

          {/* Code Window with Line Numbers */}
          <div className="p-4 bg-slate-950/90 overflow-x-auto max-h-[620px] font-mono text-xs text-slate-300 leading-relaxed dir-ltr">
            <pre className="text-left font-mono whitespace-pre selection:bg-rose-600 selection:text-white">
              {selectedFile.content.split('\n').map((line, idx) => (
                <div key={idx} className="table-row">
                  <span className="table-cell pr-4 text-slate-600 select-none text-right w-10 text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="table-cell pl-2 text-slate-200">{line}</span>
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
