import React, { useState } from 'react';
import { 
  Smartphone, Monitor, Radio, ArrowLeft, Send, CheckCircle2, 
  AlertTriangle, RefreshCw, Key, ShieldCheck, Download, Trash2, 
  Copy, Volume2, Sparkles, Server, Zap, WifiOff
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playDepositChime, playAlertChime } from '../utils/audioChime';

export interface DepositRecord {
  id: number;
  sender: string;
  smsTimestamp: string;
  receivedAt: string;
  title: string;
  body: string;
  amount: number | null;
  rawForwardedMessage: string;
  dedupeKey: string;
  isDuplicate?: boolean;
}

export const InteractiveSimulator: React.FC = () => {
  // Manager State
  const [managerPhone, setManagerPhone] = useState('+967771234567');
  const [cashierPhone, setCashierPhone] = useState('+967779876543');
  const [managerKeywords, setManagerKeywords] = useState('جيب,jeeb,إيداع,حوالة,استلام');
  const [notificationAccessEnabled, setNotificationAccessEnabled] = useState(true);
  const [smsPermissionGranted, setSmsPermissionGranted] = useState(true);
  
  // Custom or Preset Notification
  const [notifTitle, setNotifTitle] = useState('محفظة جيب - إشعار إيداع');
  const [notifBody, setNotifBody] = useState('تم استلام حوالة إيداع بقيمة 25,000 ريال من حساب سالم محمد العريقي. المرجع: JB884109');
  
  // Cashier State
  const [cashierManagerPhoneFilter, setCashierManagerPhoneFilter] = useState('+967771234567');
  const [pcIp, setPcIp] = useState('192.168.1.100');
  const [pcPort, setPcPort] = useState('8765');
  const [cashierToken, setCashierToken] = useState('jbp_9a87f12e8bc34d71');
  const [cashierSmsStatus, setCashierSmsStatus] = useState<string>('جاهز لاستقبال SMS من المدير');
  const [lastConnectionTest, setLastConnectionTest] = useState<string | null>(null);

  // PC Windows Receiver State
  const [pcPairingToken, setPcPairingToken] = useState('jbp_9a87f12e8bc34d71');
  const [showToken, setShowToken] = useState(false);
  const [serverOnline, setServerOnline] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<DepositRecord | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Transmission Animation State
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<'idle' | 'manager_match' | 'sms_flight' | 'cashier_verify' | 'lan_flight' | 'pc_saved'>('idle');
  const [latestLog, setLatestLog] = useState<string>('النظام متزامن ومستعد لنقل الإشعارات.');

  // Records in SQLite
  const [records, setRecords] = useState<DepositRecord[]>([
    {
      id: 1,
      sender: '+967771234567',
      smsTimestamp: '2026-10-20 18:42:10',
      receivedAt: '2026-10-20 18:42:13',
      title: 'محفظة جيب',
      body: 'تم استلام إيداع نقدي بمبلغ 12,000 ريال يمني من نقطة رقم 4029',
      amount: 12000,
      rawForwardedMessage: 'JEEY-DEPOSIT|2026-10-20 18:42:10|محفظة جيب|تم استلام إيداع نقدي بمبلغ 12,000 ريال يمني من نقطة رقم 4029',
      dedupeKey: 'e4d82b0179f82638a164c09f30b921fa4189e802319f3e1b712cfa729bc12340',
      isDuplicate: false,
    }
  ]);

  // Extract amount helper
  const extractAmount = (text: string): number | null => {
    const match = text.match(/([0-9,]+)\s*(?:ريال|YR|YER)/i);
    if (match) {
      const num = parseInt(match[1].replace(/,/g, ''), 10);
      return isNaN(num) ? null : num;
    }
    return null;
  };

  // Test Connection to PC Receiver
  const handleTestConnection = () => {
    if (!serverOnline) {
      setLastConnectionTest('فشل الاتصال: خادم الكمبيوتر متوقف حالياً.');
      return;
    }
    if (cashierToken !== pcPairingToken) {
      setLastConnectionTest('❌ رفض الاتصال (401 Unauthorized): رمز الربط غير مطابق للكمبيوتر!');
      playAlertChime();
    } else {
      setLastConnectionTest('✓ تم الاتصال بنجاح (200 OK): خدمة jeeb-deposit-bridge جاهزة على المنفذ 8765.');
      if (soundEnabled) playDepositChime();
    }
  };

  // Trigger Notification to SMS to LAN Flow
  const handleProcessNotification = async () => {
    if (isTransmitting) return;

    // 1. Check Manager notification service
    if (!notificationAccessEnabled) {
      setLatestLog('⚠️ تنبيه: خدمة قراءة الإشعارات غير مفعّلة على هاتف المدير!');
      playAlertChime();
      return;
    }

    if (!smsPermissionGranted) {
      setLatestLog('⚠️ تنبيه: إذن إرسال SMS غير ممنوح لهاتف المدير!');
      playAlertChime();
      return;
    }

    setIsTransmitting(true);
    setCurrentStep('manager_match');
    setLatestLog('🔍 هاتف المدير: فحص عنوان الإشعار ونصه مقابل الكلمات المفتاحية...');

    await new Promise((r) => setTimeout(r, 600));

    // Check keyword matching
    const combined = (notifTitle + ' ' + notifBody).toLowerCase();
    const keywords = managerKeywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
    const matched = keywords.some((kw) => combined.includes(kw));

    if (!matched) {
      setLatestLog('❌ هاتف المدير: تم تجاهل الإشعار لعدم احتوائه على أي كلمة مفتاحية مطابقة.');
      setIsTransmitting(false);
      setCurrentStep('idle');
      return;
    }

    // 2. Prepare SMS payload
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
    const cleanTitle = notifTitle.replace(/\|/g, ' ').trim();
    const cleanBody = notifBody.replace(/\|/g, ' ').trim();
    const rawForwarded = `JEEY-DEPOSIT|${timestamp}|${cleanTitle}|${cleanBody}`;

    setCurrentStep('sms_flight');
    setLatestLog(`📡 شبكة الاتصالات: إرسال SMS بصيغة (${rawForwarded.substring(0, 30)}...) إلى هاتف الكاشير (${cashierPhone})...`);

    await new Promise((r) => setTimeout(r, 800));

    // 3. Cashier Phone SMS reception & filter
    setCurrentStep('cashier_verify');
    setLatestLog('📱 هاتف الكاشير: استلام SMS وفحص البادئة ورقم هاتف المدير...');

    await new Promise((r) => setTimeout(r, 600));

    // Compare last 9 digits of sender
    const cleanManager = managerPhone.replace(/[^0-9]/g, '');
    const cleanAuth = cashierManagerPhoneFilter.replace(/[^0-9]/g, '');
    const last9Sender = cleanManager.slice(-9);
    const last9Auth = cleanAuth.slice(-9);

    if (last9Sender !== last9Auth) {
      setCashierSmsStatus(`تم رفض الرسالة: رقم المرسل (${managerPhone}) لا يطابق رقم المدير المعتمد!`);
      setLatestLog(`❌ هاتف الكاشير: تم رفض الرسالة لأن المرسل (${managerPhone}) غير معتمد.`);
      setIsTransmitting(false);
      setCurrentStep('idle');
      playAlertChime();
      return;
    }

    setCashierSmsStatus(`تم قبول SMS: ${cleanTitle}`);

    // Compute simple sha256 mock/hash
    const dedupeString = rawForwarded + '|' + managerPhone;
    let hash = 0;
    for (let i = 0; i < dedupeString.length; i++) {
      hash = (hash << 5) - hash + dedupeString.charCodeAt(i);
      hash |= 0;
    }
    const dedupeKey = 'sha256_' + Math.abs(hash).toString(16).padStart(16, '0') + '_jbp';

    // 4. LAN Dispatch
    setCurrentStep('lan_flight');
    setLatestLog(`📶 الشبكة المحلية (LAN): إرسال HTTP POST إلى http://${pcIp}:${pcPort}/api/deposit...`);

    await new Promise((r) => setTimeout(r, 700));

    if (!serverOnline) {
      setLatestLog('❌ فشل الاتصال: خادم الكمبيوتر غير متاح أو متوقف.');
      setIsTransmitting(false);
      setCurrentStep('idle');
      playAlertChime();
      return;
    }

    if (cashierToken !== pcPairingToken) {
      setLatestLog('❌ رفض الكمبيوتر الطلب: رمز الربط (X-Receiver-Token) غير صحيح (401)!');
      setIsTransmitting(false);
      setCurrentStep('idle');
      playAlertChime();
      return;
    }

    // 5. PC Receiver Deduplication & Save
    setCurrentStep('pc_saved');
    const existing = records.find((r) => r.dedupeKey === dedupeKey);

    if (existing) {
      setLatestLog('⚠️ تنبيه خادم ويندوز: تم استلام إشعار مكرر مسبقاً! تم منعه من الإضافة المكررة في SQLite.');
      if (soundEnabled) playAlertChime();
    } else {
      const parsedAmount = extractAmount(cleanBody);
      const newRec: DepositRecord = {
        id: records.length + 1,
        sender: managerPhone,
        smsTimestamp: timestamp,
        receivedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        title: cleanTitle,
        body: cleanBody,
        amount: parsedAmount,
        rawForwardedMessage: rawForwarded,
        dedupeKey: dedupeKey,
        isDuplicate: false,
      };

      setRecords([newRec, ...records]);
      setSelectedRecord(newRec);
      setLatestLog(`✓ تم تسجيل الإيداع بنجاح في قاعدة SQLite رقم #${newRec.id}`);
      
      if (soundEnabled) {
        playDepositChime();
      }
      
      // Fire visual celebration
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#0284c7', '#10b981', '#f59e0b']
      });
    }

    await new Promise((r) => setTimeout(r, 600));
    setIsTransmitting(false);
    setCurrentStep('idle');
  };

  // Replay duplicate test
  const handleTestDuplicate = () => {
    if (records.length === 0) return;
    const first = records[0];
    setNotifTitle(first.title);
    setNotifBody(first.body);
    setTimeout(() => {
      handleProcessNotification();
    }, 200);
  };

  // Export records
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `jeeb_deposits_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Sender', 'SMS Timestamp', 'Received At', 'Amount', 'Title', 'Body', 'Dedupe Key'];
    const rows = records.map((r) => [
      r.id,
      `"${r.sender}"`,
      `"${r.smsTimestamp}"`,
      `"${r.receivedAt}"`,
      r.amount ?? 'N/A',
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.body.replace(/"/g, '""')}"`,
      `"${r.dedupeKey}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `jeeb_deposits_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const totalCalculated = records.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / System Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">المحاكي التفاعلي المتكامل ثلاثي الأطراف</h2>
                <span className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs px-2.5 py-0.5 rounded-full font-mono">
                  v0.1.0 Live Demo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                محاكاة حية لسلسلة نقل الإشعار: هاتف المدير (Android) ← رسالة SMS خلوية ← هاتف الكاشير (Android) ← شبكة محلية LAN ← كمبيوتر المحل (Windows)
              </p>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setNotifTitle('محفظة جيب');
                setNotifBody('تم استلام حوالة إيداع بقيمة 5,000 ريال من حساب هاني العنسي');
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              إيداع 5,000 ريال
            </button>
            <button
              onClick={() => {
                setNotifTitle('محفظة جيب');
                setNotifBody('تم استلام حوالة إيداع بقيمة 50,000 ريال من حساب شركة النور للتجارة');
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              إيداع 50,000 ريال
            </button>
            <button
              onClick={() => {
                setNotifTitle('رسالة واتساب');
                setNotifBody('السلام عليكم، هل البضاعة متوفرة في المحل؟');
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 border border-amber-800/50 transition"
              title="اختبار رفض الإشعارات غير التابعة لجيب"
            >
              إشعار غير مطابق (واتساب)
            </button>
            <button
              onClick={handleTestDuplicate}
              disabled={records.length === 0}
              className="text-xs px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/50 transition disabled:opacity-40"
              title="اختبار آلية منع تكرار نفس الرسالة"
            >
              اختبار منع التكرار
            </button>
          </div>
        </div>

        {/* Live Transaction Pipeline Visualizer */}
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isTransmitting ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
              <span className="text-slate-300 font-medium font-mono">سجل الحركة اللحظي:</span>
              <span className="text-amber-300 font-sans">{latestLog}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                />
                <Volume2 className="w-3.5 h-3.5 text-slate-300" />
                <span>نغمة الكاشير الصوتية</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Devices Grid: Phone 1 (Manager), Phone 2 (Cashier), Desktop (Windows) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ================= DEVICE 1: MANAGER PHONE ================= */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl relative overflow-hidden flex flex-col">
          {/* Phone Top Notch / Speaker */}
          <div className="flex justify-center mb-3">
            <div className="w-24 h-4 bg-slate-950 rounded-full flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-800"></div>
              <div className="w-8 h-1 bg-slate-800 rounded-full"></div>
            </div>
          </div>

          {/* Header Card */}
          <div className="bg-gradient-to-r from-rose-900 to-rose-950 border border-rose-700/50 rounded-2xl p-4 text-white mb-4 shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-rose-300" />
                <span className="font-bold text-sm">1. هاتف المدير (أندرويد)</span>
              </div>
              <span className="text-[10px] bg-rose-500/20 text-rose-200 px-2 py-0.5 rounded-md border border-rose-400/30 font-mono">
                com.jeeey.depositmanager
              </span>
            </div>
            <p className="text-[11px] text-rose-200/80 mt-1">
              يراقب إشعارات محفظة جيب ويرسل SMS تلقائيًا للكاشير
            </p>
          </div>

          {/* Manager Controls */}
          <div className="space-y-3.5 flex-1 text-xs">
            {/* Notification Access Toggle */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="font-medium text-slate-200 block">خدمة الوصول للإشعارات</span>
                <span className="text-[10px] text-slate-400">NotificationListenerService</span>
              </div>
              <button
                onClick={() => setNotificationAccessEnabled(!notificationAccessEnabled)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  notificationAccessEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {notificationAccessEnabled ? 'مفعّلة ✓' : 'معطّلة ✕'}
              </button>
            </div>

            {/* SMS Permission */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="font-medium text-slate-200 block">إذن إرسال SMS</span>
                <span className="text-[10px] text-slate-400">android.permission.SEND_SMS</span>
              </div>
              <button
                onClick={() => setSmsPermissionGranted(!smsPermissionGranted)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  smsPermissionGranted
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {smsPermissionGranted ? 'ممنوح ✓' : 'مرفوض ✕'}
              </button>
            </div>

            {/* Inputs */}
            <div>
              <label className="text-slate-400 block mb-1 font-medium">رقم هاتف المدير (هذا الهاتف):</label>
              <input
                type="text"
                value={managerPhone}
                onChange={(e) => setManagerPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:border-rose-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">رقم هاتف الكاشير المستهدف:</label>
              <input
                type="text"
                value={cashierPhone}
                onChange={(e) => setCashierPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:border-rose-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">الكلمات المفتاحية للمطابقة:</label>
              <input
                type="text"
                value={managerKeywords}
                onChange={(e) => setManagerKeywords(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-rose-500 outline-none"
              />
            </div>

            {/* Simulated Incoming Jeeb Notification Card */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <label className="text-slate-300 font-semibold block mb-1.5 flex items-center justify-between">
                <span>الإشعار الوارد لهاتف المدير:</span>
                <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">اختبار حي</span>
              </label>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                <input
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="عنوان الإشعار"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-medium outline-none focus:border-rose-500"
                />
                <textarea
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  placeholder="نص الإشعار"
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-rose-500 resize-none"
                />
              </div>

              {/* Action Button */}
              <button
                onClick={handleProcessNotification}
                disabled={isTransmitting}
                className="mt-3 w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isTransmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري التوجيه عبر SMS...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>محاكاة وصول الإشعار وتوجيهه</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ================= DEVICE 2: CASHIER PHONE ================= */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl relative overflow-hidden flex flex-col">
          {/* Phone Top Notch */}
          <div className="flex justify-center mb-3">
            <div className="w-24 h-4 bg-slate-950 rounded-full flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-800"></div>
              <div className="w-8 h-1 bg-slate-800 rounded-full"></div>
            </div>
          </div>

          {/* Header Card */}
          <div className="bg-gradient-to-r from-sky-900 to-teal-950 border border-sky-700/50 rounded-2xl p-4 text-white mb-4 shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-sky-300" />
                <span className="font-bold text-sm">2. هاتف الكاشير (أندرويد)</span>
              </div>
              <span className="text-[10px] bg-sky-500/20 text-sky-200 px-2 py-0.5 rounded-md border border-sky-400/30 font-mono">
                com.jeeey.depositcashier
              </span>
            </div>
            <p className="text-[11px] text-sky-200/80 mt-1">
              يستقبل SMS من المدير ويحولها للكمبيوتر عبر الشبكة المحلية LAN
            </p>
          </div>

          {/* Cashier Controls */}
          <div className="space-y-3.5 flex-1 text-xs">
            {/* Status info */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-400 text-[10px] block">حالة استلام SMS الأخير:</span>
              <span className="text-sky-300 font-medium text-xs mt-0.5 block">{cashierSmsStatus}</span>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">رقم المدير المعتمد (فحص آخر 9 أرقام):</label>
              <input
                type="text"
                value={cashierManagerPhoneFilter}
                onChange={(e) => setCashierManagerPhoneFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1 font-medium">IP كمبيوتر المحل:</label>
                <input
                  type="text"
                  value={pcIp}
                  onChange={(e) => setPcIp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 outline-none"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-medium">المنفذ (Port):</label>
                <input
                  type="text"
                  value={pcPort}
                  onChange={(e) => setPcPort(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">رمز الربط (من شاشة الكمبيوتر):</label>
              <div className="relative">
                <input
                  type="text"
                  value={cashierToken}
                  onChange={(e) => setCashierToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sky-400 font-mono text-xs focus:border-sky-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setCashierToken(pcPairingToken)}
                  className="absolute left-2 top-2 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded"
                  title="مزامنة نفس رمز الكمبيوتر"
                >
                  مطابقة
                </button>
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="pt-2">
              <button
                onClick={handleTestConnection}
                className="w-full bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-600/30 font-semibold py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 text-xs"
              >
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                <span>اختبار الاتصال بكمبيوتر الكاشير (GET /api/status)</span>
              </button>

              {lastConnectionTest && (
                <div className={`mt-2 p-2 rounded-lg text-[11px] leading-relaxed ${
                  lastConnectionTest.includes('✓') 
                    ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-300' 
                    : 'bg-rose-950/40 border border-rose-800/40 text-rose-300'
                }`}>
                  {lastConnectionTest}
                </div>
              )}
            </div>

            {/* LAN packet details */}
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>البروتوكول المحلي:</span>
                <span className="text-slate-200 font-mono">HTTP Cleartext (LAN only)</span>
              </div>
              <div className="flex justify-between">
                <span>الترويسة الأمنية:</span>
                <span className="text-slate-200 font-mono">X-Receiver-Token</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= DEVICE 3: WINDOWS RECEIVER ================= */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col">
          {/* Windows 11 Chrome Titlebar */}
          <div className="bg-slate-950 border border-slate-800 rounded-t-2xl px-3 py-2 flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-slate-200">3. شاشة كاشير ويندوز (Windows Receiver)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setServerOnline(!serverOnline)}
                className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                  serverOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}
                title="محاكاة إطفاء/تشغيل الخادم"
              >
                {serverOnline ? 'ONLINE' : 'OFFLINE'}
              </button>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-rose-600/80"></div>
            </div>
          </div>

          {/* PC Server Details Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 mb-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">حالة المستقبِل المحلي:</span>
              <span className={`font-semibold flex items-center gap-1.5 ${serverOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span className={`w-2 h-2 rounded-full ${serverOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
                {serverOnline ? 'مستمع على المنفذ 8765' : 'متوقف'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">عنوان الكمبيوتر في LAN:</span>
              <span className="font-mono text-sky-400 font-bold">{pcIp}:{pcPort}</span>
            </div>

            <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">رمز الربط (Pairing Token):</span>
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <span className="bg-slate-900 px-2 py-0.5 rounded text-amber-300 font-bold">
                  {showToken ? pcPairingToken : '••••••••••••••••'}
                </span>
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="text-slate-400 hover:text-white p-1"
                  title="إظهار / إخفاء"
                >
                  <Key className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pcPairingToken);
                    alert('تم نسخ رمز الربط إلى الحافظة!');
                  }}
                  className="text-slate-400 hover:text-white p-1"
                  title="نسخ"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <span className="text-slate-400 text-[10px] block">عدد الإيداعات المسجلة:</span>
              <span className="text-lg font-bold text-white">{records.length}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <span className="text-slate-400 text-[10px] block">المجموع التقريبي (نصي):</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">
                {totalCalculated.toLocaleString()} <span className="text-xs font-normal text-slate-400">ريال</span>
              </span>
            </div>
          </div>

          {/* Financial Warning Bar */}
          <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-2.5 mb-3 text-[11px] text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-snug">
              <strong>تنبيه مالي أساسي:</strong> هذا السجل يعكس إشعارًا منقولًا فقط. لا يثبت رصيد الحساب. تحقق رسميًا من المحفظة قبل تسليم البضائع ذات القيمة العالية.
            </p>
          </div>

          {/* Table of Records */}
          <div className="flex-1 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="font-bold text-slate-200">سجل الإيداعات (SQLite3):</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExportCsv}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded flex items-center gap-1"
                  title="تصدير CSV"
                >
                  <Download className="w-3 h-3" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handleExportJson}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded flex items-center gap-1"
                  title="تصدير JSON"
                >
                  <Download className="w-3 h-3" />
                  <span>JSON</span>
                </button>
                <button
                  onClick={() => setRecords([])}
                  className="text-[10px] bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 p-1 rounded"
                  title="مسح السجل"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-y-auto max-h-56 divide-y divide-slate-800/60">
              {records.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  لا توجد إيداعات مسجلة بعد. استخدم زر المحاكاة بالأعلى لإرسال إيداع تجريبي.
                </div>
              ) : (
                records.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRecord(r)}
                    className={`p-2.5 text-xs cursor-pointer transition ${
                      selectedRecord?.id === r.id ? 'bg-sky-950/60 border-l-2 border-sky-400' : 'hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-100 flex items-center gap-1.5">
                        <span className="text-slate-400 font-mono text-[10px]">#{r.id}</span>
                        {r.amount ? (
                          <span className="text-emerald-400 font-bold font-mono">{r.amount.toLocaleString()} ريال</span>
                        ) : (
                          <span className="text-slate-300">{r.title}</span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{r.smsTimestamp.slice(11)}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-1">{r.body}</p>
                  </div>
                ))
              )}
            </div>

            {/* Selected Item Raw Inspect */}
            {selectedRecord && (
              <div className="mt-2.5 p-2 bg-slate-950 border border-slate-800 rounded-xl text-[10px] space-y-1 font-mono text-slate-400">
                <div className="text-slate-300 font-bold font-sans">تفاصيل الإشعار المحدد:</div>
                <div className="truncate"><span className="text-slate-500">Raw:</span> {selectedRecord.rawForwardedMessage}</div>
                <div className="truncate"><span className="text-slate-500">Dedupe Key (SHA-256):</span> {selectedRecord.dedupeKey}</div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
