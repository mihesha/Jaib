# جسر إشعارات إيداع جيب
**Jeeb Deposit Bridge — الوثيقة الرئيسية للمشروع**

الإصدار الحالي للمصدر: `0.1.0` · الحالة: **نموذج أولي يحتاج إلى اختبار ميداني** · اللغة: العربية (RTL)

> الهدف: نقل إشعار الإيداع الذي يظهر على هاتف المدير إلى هاتف الكاشير برسالة SMS، ثم نقل الرسالة من هاتف الكاشير إلى كمبيوتر المحل عبر الشبكة المحلية، حتى يعمل الجزء المحلي دون إنترنت.
>
> **تنبيه مالي أساسي:** هذا النظام ينقل إشعارًا وصل إلى الهاتف، ولا يتصل بمحفظة جيب مباشرة ولا يثبت رصيد الحساب. لا تعتمد على الإشعار المنقول وحده كدليل نهائي على الدفع، ولا تسلّم البضاعة عند وجود تعارض أو شك.

---

## الأجزاء الثلاثة للمشروع

1. **`manager/` (تطبيق المدير على أندرويد):**
   - معرّف الحزمة: `com.jeeey.depositmanager`
   - يراقب إشعارات محفظة جيب عبر `NotificationListenerService`.
   - عند تطابق الكلمات المفتاحية (مثل: جيب، إيداع، استلام)، يقوم بإرسال SMS بصيغة `JEEY-DEPOSIT|<timestamp>|<title>|<body>` إلى رقم هاتف الكاشير.

2. **`cashier/` (تطبيق الكاشير على أندرويد):**
   - معرّف الحزمة: `com.jeeey.depositcashier`
   - يستقبل SMS ويتحقق من مطابقة رقم المدير والبادئة `JEEY-DEPOSIT|`.
   - يقوم بإرسال بيانات الإيداع عبر الشبكة المحلية (LAN HTTP) إلى كمبيوتر الكاشير باستخدام رمز الربط `X-Receiver-Token`.

3. **`pc_receiver/` (برنامج الاستقبال لويندوز):**
   - تطبيق بايثون خفيف بواجهة رسومية وقاعدة بيانات SQLite مدمجة.
   - يستمع على المنفذ `8765`.
   - يمنع التكرار باستخدام بصمة `SHA-256` فريدة.
   - ينبه الكاشير صوتيًا وبصريًا عند وصول إشعار جديد.

---

## هيكل الملفات
```text
jeeb-deposit-bridge/
├── README_AR.md
├── BUILD_ANDROID_AR.txt
├── settings.gradle.kts
├── build.gradle.kts
├── gradle.properties
├── manager/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── res/
│       │   ├── layout/activity_main.xml
│       │   └── values/strings.xml
│       └── java/com/jeeey/depositmanager/
│           ├── MainActivity.java
│           └── DepositNotificationListener.java
├── cashier/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── res/
│       │   ├── layout/activity_main.xml
│       │   └── values/strings.xml
│       └── java/com/jeeey/depositcashier/
│           ├── MainActivity.java
│           └── DepositSmsReceiver.java
└── pc_receiver/
    ├── README_AR.md
    ├── windows_receiver.py
    ├── start_windows.bat
    ├── allow_firewall_port_admin.bat
    ├── requirements.txt
    ├── config.example.json
    └── test_source.py
```
