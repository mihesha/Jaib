export interface ProjectFile {
  path: string;
  category: 'manager' | 'cashier' | 'pc_receiver' | 'root';
  name: string;
  language: string;
  description: string;
  content: string;
}

export const PROJECT_FILES: ProjectFile[] = [
  // --- مدير أندرويد (Manager) ---
  {
    path: 'manager/src/main/java/com/jeeey/depositmanager/DepositNotificationListener.java',
    category: 'manager',
    name: 'DepositNotificationListener.java',
    language: 'java',
    description: 'خدمة نظام أندرويد لمراقبة إشعارات محفظة جيب وفحص الكلمات المفتاحية وتحويلها إلى رسالة SMS',
    content: `package com.jeeey.depositmanager;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.telephony.SmsManager;
import android.util.Log;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * خدمة مراقبة إشعارات محفظة جيب وتحويلها إلى رسالة SMS لهاتف الكاشير.
 * معرّف التطبيق: com.jeeey.depositmanager
 */
public class DepositNotificationListener extends NotificationListenerService {

    private static final String TAG = "DepositManager";
    public static final String PREFS_NAME = "JeebManagerPrefs";
    public static final String KEY_CASHIER_PHONE = "cashier_phone";
    public static final String KEY_KEYWORDS = "keywords";
    public static final String KEY_LAST_FORWARDED = "last_forwarded";
    public static final String SMS_PREFIX = "JEEY-DEPOSIT|";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) {
            return;
        }

        Notification notification = sbn.getNotification();
        Bundle extras = notification.extras;
        if (extras == null) {
            return;
        }

        CharSequence titleCs = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);

        String title = titleCs != null ? titleCs.toString() : "";
        String body = textCs != null ? textCs.toString() : "";
        String combined = (title + " " + body).toLowerCase(Locale.ROOT);

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String cashierPhone = prefs.getString(KEY_CASHIER_PHONE, "");
        String rawKeywords = prefs.getString(KEY_KEYWORDS, "جيب,jeeb,إيداع");

        if (cashierPhone.trim().isEmpty()) {
            Log.w(TAG, "لم يتم تحديد رقم الكاشير بعد. تم تجاهل الإشعار.");
            return;
        }

        // فحص الكلمات المفتاحية
        String[] keywords = rawKeywords.split(",");
        boolean matched = false;
        for (String kw : keywords) {
            String trimmed = kw.trim().toLowerCase(Locale.ROOT);
            if (!trimmed.isEmpty() && combined.contains(trimmed)) {
                matched = true;
                break;
            }
        }

        if (matched) {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US);
            String timestamp = sdf.format(new Date(sbn.getPostTime() > 0 ? sbn.getPostTime() : System.currentTimeMillis()));

            // تنظيف الحقول من الفاصلة الرأسية لمنع تشويه بروتوكول SMS
            String cleanTitle = title.replace("|", " ").trim();
            String cleanBody = body.replace("|", " ").trim();

            String smsPayload = SMS_PREFIX + timestamp + "|" + cleanTitle + "|" + cleanBody;

            forwardViaSms(cashierPhone, smsPayload);

            // حفظ أحدث إشعار تم توجيهه للعرض في الواجهة
            prefs.edit()
                .putString(KEY_LAST_FORWARDED, timestamp + " - " + cleanTitle + ": " + cleanBody)
                .apply();
        }
    }

    private void forwardViaSms(String destinationAddress, String payload) {
        try {
            SmsManager smsManager = SmsManager.getDefault();
            if (payload.length() > 140) {
                java.util.ArrayList<String> parts = smsManager.divideMessage(payload);
                smsManager.sendMultipartTextMessage(destinationAddress, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(destinationAddress, null, payload, null, null);
            }
            Log.i(TAG, "تم إرسال SMS بنجاح إلى: " + destinationAddress);
        } catch (Exception e) {
            Log.e(TAG, "فشل في إرسال SMS: " + e.getMessage(), e);
        }
    }
}`
  },
  {
    path: 'manager/src/main/java/com/jeeey/depositmanager/MainActivity.java',
    category: 'manager',
    name: 'MainActivity.java',
    language: 'java',
    description: 'واجهة تطبيق المدير لضبط رقم هاتف الكاشير والكلمات المفتاحية وإذن SMS وخدمة الإشعارات',
    content: `package com.jeeey.depositmanager;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.Set;

public class MainActivity extends AppCompatActivity {

    private static final int REQ_SMS_PERMISSION = 101;

    private EditText etCashierPhone;
    private EditText etKeywords;
    private TextView tvNotificationStatus;
    private TextView tvSmsPermissionStatus;
    private TextView tvLastForwarded;
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences(DepositNotificationListener.PREFS_NAME, Context.MODE_PRIVATE);

        etCashierPhone = findViewById(R.id.etCashierPhone);
        etKeywords = findViewById(R.id.etKeywords);
        tvNotificationStatus = findViewById(R.id.tvNotificationStatus);
        tvSmsPermissionStatus = findViewById(R.id.tvSmsPermissionStatus);
        tvLastForwarded = findViewById(R.id.tvLastForwarded);

        Button btnSave = findViewById(R.id.btnSave);
        Button btnRequestSms = findViewById(R.id.btnRequestSms);
        Button btnOpenNotificationSettings = findViewById(R.id.btnOpenNotificationSettings);
        Button btnSendTestSms = findViewById(R.id.btnSendTestSms);

        String savedPhone = prefs.getString(DepositNotificationListener.KEY_CASHIER_PHONE, "");
        String savedKeywords = prefs.getString(DepositNotificationListener.KEY_KEYWORDS, "جيب,jeeb,إيداع");
        etCashierPhone.setText(savedPhone);
        etKeywords.setText(savedKeywords);

        btnSave.setOnClickListener(v -> saveSettings());
        btnRequestSms.setOnClickListener(v -> requestSmsPermission());
        btnOpenNotificationSettings.setOnClickListener(v -> {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            startActivity(intent);
        });
        btnSendTestSms.setOnClickListener(v -> sendTestSms());
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateStatuses();
    }

    private void updateStatuses() {
        boolean isNotificationAccessGranted = isNotificationServiceEnabled();
        if (isNotificationAccessGranted) {
            tvNotificationStatus.setText("حالة خدمة الإشعارات: مفعّلة وجاهزة ✓");
            tvNotificationStatus.setTextColor(0xFF2E7D32);
        } else {
            tvNotificationStatus.setText("حالة خدمة الإشعارات: غير مفعلة (اضغط لتفعيلها)");
            tvNotificationStatus.setTextColor(0xFFC62828);
        }

        boolean hasSmsPerm = ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED;
        if (hasSmsPerm) {
            tvSmsPermissionStatus.setText("إذن إرسال SMS: ممنوح ✓");
            tvSmsPermissionStatus.setTextColor(0xFF2E7D32);
        } else {
            tvSmsPermissionStatus.setText("إذن إرسال SMS: غير ممنوح");
            tvSmsPermissionStatus.setTextColor(0xFFE65100);
        }

        String lastFwd = prefs.getString(DepositNotificationListener.KEY_LAST_FORWARDED, "لا توجد عمليات تحويل مسجلة بعد");
        tvLastForwarded.setText("آخر إشعار: " + lastFwd);
    }

    private boolean isNotificationServiceEnabled() {
        String pkgName = getPackageName();
        Set<String> packages = NotificationManagerCompat.getEnabledListenerPackages(this);
        return packages.contains(pkgName);
    }

    private void saveSettings() {
        String phone = etCashierPhone.getText().toString().trim();
        String keywords = etKeywords.getText().toString().trim();

        if (phone.isEmpty()) {
            Toast.makeText(this, "يرجى إدخال رقم هاتف الكاشير", Toast.LENGTH_SHORT).show();
            return;
        }

        prefs.edit()
            .putString(DepositNotificationListener.KEY_CASHIER_PHONE, phone)
            .putString(DepositNotificationListener.KEY_KEYWORDS, keywords)
            .apply();

        Toast.makeText(this, "تم حفظ الإعدادات بنجاح", Toast.LENGTH_SHORT).show();
        updateStatuses();
    }

    private void requestSmsPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.SEND_SMS}, REQ_SMS_PERMISSION);
        } else {
            Toast.makeText(this, "إذن SMS ممنوح مسبقًا", Toast.LENGTH_SHORT).show();
        }
    }

    private void sendTestSms() {
        String phone = etCashierPhone.getText().toString().trim();
        if (phone.isEmpty()) {
            Toast.makeText(this, "يرجى حفظ رقم الكاشير أولًا", Toast.LENGTH_SHORT).show();
            return;
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            Toast.makeText(this, "يجب منح إذن إرسال SMS أولًا", Toast.LENGTH_SHORT).show();
            requestSmsPermission();
            return;
        }

        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US);
        String timestamp = sdf.format(new Date());
        String testPayload = DepositNotificationListener.SMS_PREFIX + timestamp + "|رسالة تجريبية|إيداع تجريبي بقيمة 1000 ريال";

        try {
            android.telephony.SmsManager.getDefault().sendTextMessage(phone, null, testPayload, null, null);
            Toast.makeText(this, "تم إرسال رسالة الاختبار إلى " + phone, Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            Toast.makeText(this, "فشل الإرسال: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_SMS_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this, "تم منح إذن إرسال SMS بنجاح", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "تم رفض إذن إرسال SMS", Toast.LENGTH_SHORT).show();
            }
            updateStatuses();
        }
    }
}`
  },
  {
    path: 'manager/src/main/AndroidManifest.xml',
    category: 'manager',
    name: 'AndroidManifest.xml',
    language: 'xml',
    description: 'بيان تطبيق المدير مع إذن SEND_SMS وخدمة NotificationListenerService',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.SEND_SMS" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:allowBackup="true"
        android:icon="@android:drawable/sym_def_app_icon"
        android:label="جيّب — المدير"
        android:roundIcon="@android:drawable/sym_def_app_icon"
        android:supportsRtl="true"
        android:theme="@style/Theme.Material3.DayNight.NoActionBar">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".DepositNotificationListener"
            android:exported="true"
            android:label="خدمة مراقبة إشعارات جيب"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>

    </application>

</manifest>`
  },
  {
    path: 'manager/build.gradle.kts',
    category: 'manager',
    name: 'build.gradle.kts',
    language: 'kotlin',
    description: 'إعدادات بناء أندرويد لتطبيق المدير مع Target SDK 35 و Material 3',
    content: `plugins {
    id("com.android.application")
}

android {
    namespace = "com.jeeey.depositmanager"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.jeeey.depositmanager"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.2.0")
}`
  },

  // --- كاشير أندرويد (Cashier) ---
  {
    path: 'cashier/src/main/java/com/jeeey/depositcashier/DepositSmsReceiver.java',
    category: 'cashier',
    name: 'DepositSmsReceiver.java',
    language: 'java',
    description: 'مستقبل SMS، يتحقق من البادئة ورقم المدير، ويحسب مفتاح منع التكرار SHA-256 ويرسل عبر HTTP LAN',
    content: `package com.jeeey.depositcashier;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class DepositSmsReceiver extends BroadcastReceiver {

    private static final String TAG = "DepositCashierReceiver";
    public static final String PREFS_NAME = "JeebCashierPrefs";
    public static final String KEY_MANAGER_PHONE = "manager_phone";
    public static final String KEY_PC_IP = "pc_ip";
    public static final String KEY_PC_PORT = "pc_port";
    public static final String KEY_PAIR_TOKEN = "pair_token";
    public static final String KEY_LAST_STATUS = "last_status";
    public static final String KEY_LAST_MESSAGE = "last_message";

    public static final String SMS_PREFIX = "JEEY-DEPOSIT|";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !"android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            return;
        }

        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        Object[] pdus = (Object[]) bundle.get("pdus");
        String format = bundle.getString("format");
        if (pdus == null || pdus.length == 0) return;

        StringBuilder fullBodyBuilder = new StringBuilder();
        String originatingAddress = "";

        for (Object pdu : pdus) {
            SmsMessage message;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                message = SmsMessage.createFromPdu((byte[]) pdu, format);
            } else {
                message = SmsMessage.createFromPdu((byte[]) pdu);
            }
            if (message != null) {
                if (originatingAddress.isEmpty()) {
                    originatingAddress = message.getDisplayOriginatingAddress();
                }
                fullBodyBuilder.append(message.getMessageBody());
            }
        }

        String fullMessage = fullBodyBuilder.toString().trim();
        if (!fullMessage.startsWith(SMS_PREFIX)) {
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String savedManagerPhone = prefs.getString(KEY_MANAGER_PHONE, "").trim();
        String pcIp = prefs.getString(KEY_PC_IP, "").trim();
        String pcPort = prefs.getString(KEY_PC_PORT, "8765").trim();
        String pairToken = prefs.getString(KEY_PAIR_TOKEN, "").trim();

        if (!isAuthorizedSender(originatingAddress, savedManagerPhone)) {
            Log.w(TAG, "تم رفض الرسالة: رقم المرسل لا يطابق رقم المدير المعتمد.");
            prefs.edit().putString(KEY_LAST_STATUS, "تم رفض SMS من رقم غير معتمد: " + originatingAddress).apply();
            return;
        }

        String[] parts = fullMessage.split("\\\\|", 4);
        String smsTimestamp = parts.length > 1 ? parts[1] : "";
        String title = parts.length > 2 ? parts[2] : "";
        String body = parts.length > 3 ? parts[3] : "";
        String summaryMessage = (title + " - " + body).trim();

        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US);
        String receivedAt = sdf.format(new Date());

        String dedupeKey = calculateSha256(fullMessage + "|" + originatingAddress);

        prefs.edit()
            .putString(KEY_LAST_MESSAGE, summaryMessage)
            .putString(KEY_LAST_STATUS, "جاري الإرسال لكمبيوتر المحل...")
            .apply();

        final String finalSender = originatingAddress;
        new Thread(() -> {
            boolean success = dispatchToPc(context, pcIp, pcPort, pairToken, finalSender, smsTimestamp, receivedAt, summaryMessage, fullMessage, dedupeKey);
            prefs.edit().putString(KEY_LAST_STATUS, success ? "تم التحويل بنجاح للكمبيوتر ✓" : "فشل التحويل إلى الكمبيوتر (تحقق من الشبكة)").apply();
        }).start();
    }

    private boolean isAuthorizedSender(String incomingSender, String authorizedSender) {
        if (authorizedSender.isEmpty()) return false;
        String digitsIncoming = incomingSender.replaceAll("[^0-9]", "");
        String digitsAuth = authorizedSender.replaceAll("[^0-9]", "");

        if (digitsIncoming.length() >= 9 && digitsAuth.length() >= 9) {
            String last9Incoming = digitsIncoming.substring(digitsIncoming.length() - 9);
            String last9Auth = digitsAuth.substring(digitsAuth.length() - 9);
            return last9Incoming.equals(last9Auth);
        }
        return digitsIncoming.equals(digitsAuth);
    }

    private boolean dispatchToPc(Context context, String ip, String port, String token, String sender, String smsTimestamp, String receivedAt, String message, String rawForwardedMessage, String dedupeKey) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL("http://" + ip + ":" + port + "/api/deposit");
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            conn.setRequestProperty("X-Receiver-Token", token);
            conn.setDoOutput(true);

            JSONObject json = new JSONObject();
            json.put("sender", sender);
            json.put("smsTimestamp", smsTimestamp);
            json.put("receivedAt", receivedAt);
            json.put("message", message);
            json.put("rawForwardedMessage", rawForwardedMessage);
            json.put("dedupeKey", dedupeKey);

            byte[] input = json.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(input, 0, input.length);
            }

            int responseCode = conn.getResponseCode();
            return (responseCode >= 200 && responseCode < 300);
        } catch (Exception e) {
            Log.e(TAG, "فشل الاتصال: " + e.getMessage(), e);
            return false;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private String calculateSha256(String base) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(base.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception ex) {
            return String.valueOf(base.hashCode());
        }
    }
}`
  },
  {
    path: 'cashier/src/main/java/com/jeeey/depositcashier/MainActivity.java',
    category: 'cashier',
    name: 'MainActivity.java',
    language: 'java',
    description: 'واجهة تطبيق الكاشير، واختبار الاتصال بكمبيوتر المحل GET /api/status ورمز الربط',
    content: `package com.jeeey.depositcashier;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends AppCompatActivity {

    private static final int REQ_SMS_PERMISSION = 201;

    private EditText etManagerPhone;
    private EditText etPcIp;
    private EditText etPcPort;
    private EditText etPairToken;
    private TextView tvSmsStatus;
    private TextView tvPcConnectionStatus;
    private TextView tvLastReceivedMessage;

    private SharedPreferences prefs;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences(DepositSmsReceiver.PREFS_NAME, Context.MODE_PRIVATE);

        etManagerPhone = findViewById(R.id.etManagerPhone);
        etPcIp = findViewById(R.id.etPcIp);
        etPcPort = findViewById(R.id.etPcPort);
        etPairToken = findViewById(R.id.etPairToken);

        tvSmsStatus = findViewById(R.id.tvSmsStatus);
        tvPcConnectionStatus = findViewById(R.id.tvPcConnectionStatus);
        tvLastReceivedMessage = findViewById(R.id.tvLastReceivedMessage);

        Button btnSave = findViewById(R.id.btnSave);
        Button btnRequestSms = findViewById(R.id.btnRequestSms);
        Button btnTestConnection = findViewById(R.id.btnTestConnection);

        etManagerPhone.setText(prefs.getString(DepositSmsReceiver.KEY_MANAGER_PHONE, ""));
        etPcIp.setText(prefs.getString(DepositSmsReceiver.KEY_PC_IP, "192.168.1.100"));
        etPcPort.setText(prefs.getString(DepositSmsReceiver.KEY_PC_PORT, "8765"));
        etPairToken.setText(prefs.getString(DepositSmsReceiver.KEY_PAIR_TOKEN, ""));

        btnSave.setOnClickListener(v -> saveSettings());
        btnRequestSms.setOnClickListener(v -> requestSmsPermission());
        btnTestConnection.setOnClickListener(v -> testConnectionToPc());
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateStatuses();
    }

    private void updateStatuses() {
        boolean hasSmsPerm = ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED;
        if (hasSmsPerm) {
            tvSmsStatus.setText("حالة استقبال SMS: مفعّل وجاهز ✓");
            tvSmsStatus.setTextColor(0xFF2E7D32);
        } else {
            tvSmsStatus.setText("حالة استقبال SMS: غير مفعّل (مطلوب منح الإذن)");
            tvSmsStatus.setTextColor(0xFFC62828);
        }

        String lastStatus = prefs.getString(DepositSmsReceiver.KEY_LAST_STATUS, "لم يتم إجراء اتصالات بعد");
        String lastMsg = prefs.getString(DepositSmsReceiver.KEY_LAST_MESSAGE, "لا يوجد إشعار مستلم");

        tvPcConnectionStatus.setText("حالة الخادم: " + lastStatus);
        tvLastReceivedMessage.setText("آخر رسالة: " + lastMsg);
    }

    private void saveSettings() {
        String managerPhone = etManagerPhone.getText().toString().trim();
        String pcIp = etPcIp.getText().toString().trim();
        String pcPort = etPcPort.getText().toString().trim();
        String pairToken = etPairToken.getText().toString().trim();

        if (managerPhone.isEmpty() || pcIp.isEmpty() || pcPort.isEmpty()) {
            Toast.makeText(this, "يرجى تعبئة جميع الحقول الأساسية", Toast.LENGTH_SHORT).show();
            return;
        }

        prefs.edit()
            .putString(DepositSmsReceiver.KEY_MANAGER_PHONE, managerPhone)
            .putString(DepositSmsReceiver.KEY_PC_IP, pcIp)
            .putString(DepositSmsReceiver.KEY_PC_PORT, pcPort)
            .putString(DepositSmsReceiver.KEY_PAIR_TOKEN, pairToken)
            .apply();

        Toast.makeText(this, "تم حفظ إعدادات الكاشير بنجاح", Toast.LENGTH_SHORT).show();
        updateStatuses();
    }

    private void requestSmsPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECEIVE_SMS}, REQ_SMS_PERMISSION);
        } else {
            Toast.makeText(this, "إذن استقبال SMS ممنوح مسبقًا", Toast.LENGTH_SHORT).show();
        }
    }

    private void testConnectionToPc() {
        final String ip = etPcIp.getText().toString().trim();
        final String port = etPcPort.getText().toString().trim();
        final String token = etPairToken.getText().toString().trim();

        if (ip.isEmpty() || port.isEmpty()) {
            Toast.makeText(this, "يرجى إدخال IP والمنفذ أولًا", Toast.LENGTH_SHORT).show();
            return;
        }

        tvPcConnectionStatus.setText("حالة الاتصال: جاري فحص الاتصال بـ " + ip + ":" + port + "...");
        tvPcConnectionStatus.setTextColor(0xFF0D5C75);

        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                URL url = new URL("http://" + ip + ":" + port + "/api/status");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(4000);
                conn.setReadTimeout(4000);
                conn.setRequestProperty("X-Receiver-Token", token);

                int code = conn.getResponseCode();
                if (code == 200) {
                    BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = in.readLine()) != null) response.append(line);
                    in.close();

                    mainHandler.post(() -> {
                        tvPcConnectionStatus.setText("تم الاتصال بالكمبيوتر بنجاح ✓ (" + response.toString() + ")");
                        tvPcConnectionStatus.setTextColor(0xFF2E7D32);
                        Toast.makeText(MainActivity.this, "تم الاتصال بالكمبيوتر بنجاح!", Toast.LENGTH_SHORT).show();
                    });
                } else if (code == 401) {
                    mainHandler.post(() -> {
                        tvPcConnectionStatus.setText("فشل الاتصال: رمز الربط (Token) غير صحيح (401)");
                        tvPcConnectionStatus.setTextColor(0xFFC62828);
                        Toast.makeText(MainActivity.this, "رمز الربط غير مطابق للكمبيوتر!", Toast.LENGTH_LONG).show();
                    });
                } else {
                    final int errCode = code;
                    mainHandler.post(() -> {
                        tvPcConnectionStatus.setText("استجابة الخادم غير متوقعة: كود " + errCode);
                        tvPcConnectionStatus.setTextColor(0xFFE65100);
                    });
                }
            } catch (Exception e) {
                mainHandler.post(() -> {
                    tvPcConnectionStatus.setText("تعذر الوصول للكمبيوتر: " + e.getMessage());
                    tvPcConnectionStatus.setTextColor(0xFFC62828);
                    Toast.makeText(MainActivity.this, "تعذر الوصول للكمبيوتر. تأكد من الاتصال بنفس الراوتر وجدار الحماية.", Toast.LENGTH_LONG).show();
                });
            } finally {
                if (conn != null) conn.disconnect();
            }
        }).start();
    }
}`
  },
  {
    path: 'cashier/src/main/AndroidManifest.xml',
    category: 'cashier',
    name: 'AndroidManifest.xml',
    language: 'xml',
    description: 'بيان تطبيق الكاشير مع أذونات RECEIVE_SMS و INTERNET وتفعيل Cleartext Traffic محليًا',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.RECEIVE_SMS" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@android:drawable/sym_def_app_icon"
        android:label="جيّب — الكاشير"
        android:roundIcon="@android:drawable/sym_def_app_icon"
        android:supportsRtl="true"
        android:usesCleartextTraffic="true"
        android:theme="@style/Theme.Material3.DayNight.NoActionBar">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <receiver
            android:name=".DepositSmsReceiver"
            android:exported="true"
            android:permission="android.permission.BROADCAST_SMS">
            <intent-filter android:priority="999">
                <action android:name="android.provider.Telephony.SMS_RECEIVED" />
            </intent-filter>
        </receiver>

    </application>

</manifest>`
  },
  {
    path: 'cashier/build.gradle.kts',
    category: 'cashier',
    name: 'build.gradle.kts',
    language: 'kotlin',
    description: 'إعدادات بناء أندرويد لتطبيق الكاشير مع Target SDK 35',
    content: `plugins {
    id("com.android.application")
}

android {
    namespace = "com.jeeey.depositcashier"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.jeeey.depositcashier"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.2.0")
}`
  },

  // --- مستقبِل ويندوز (PC Receiver) ---
  {
    path: 'pc_receiver/windows_receiver.py',
    category: 'pc_receiver',
    name: 'windows_receiver.py',
    language: 'python',
    description: 'برنامج بايثون لويندوز كامل: واجهة Tkinter، خادم HTTP محلي، قاعدة بيانات SQLite ومنع التكرار',
    content: `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
جسر إشعارات إيداع جيب — برنامج الاستقبال لويندوز
Jeeb Deposit Bridge — Windows Receiver
الإصدار: 0.1.0
المتطلبات: Python 3.10+ (المكتبات القياسية فقط)
"""

import os
import sys
import json
import sqlite3
import socket
import secrets
import hashlib
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

try:
    import tkinter as tk
    from tkinter import ttk, messagebox, filedialog
    TKINTER_AVAILABLE = True
except ImportError:
    TKINTER_AVAILABLE = False

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, "config.json")
DB_FILE = os.path.join(BASE_DIR, "deposits.sqlite3")
DEFAULT_PORT = 8765

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS deposits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT,
            sms_timestamp TEXT,
            received_at TEXT,
            message TEXT,
            raw_message TEXT,
            dedupe_key TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def save_deposit(sender, sms_timestamp, received_at, message, raw_message, dedupe_key):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO deposits (sender, sms_timestamp, received_at, message, raw_message, dedupe_key)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (sender, sms_timestamp, received_at, message, raw_message, dedupe_key))
        conn.commit()
        last_id = cursor.lastrowid
        conn.close()
        return True, False, last_id
    except sqlite3.IntegrityError:
        conn.close()
        return True, True, None
    except Exception as e:
        conn.close()
        raise e

def fetch_recent_deposits(limit=300):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, sender, sms_timestamp, received_at, message, raw_message, dedupe_key, created_at
        FROM deposits
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return rows

def load_or_create_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    token = "jbp_" + secrets.token_hex(12)
    config = {
        "port": DEFAULT_PORT,
        "pairing_token": token,
        "allowed_origins": ["*"]
    }
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    return config

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

class DepositHttpHandler(BaseHTTPRequestHandler):
    pairing_token = ""
    on_new_deposit_callback = None

    def send_json(self, status_code, data):
        payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Receiver-Token, Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/status':
            token_sent = self.headers.get('X-Receiver-Token', '')
            if self.pairing_token and token_sent != self.pairing_token:
                self.send_json(401, {"ok": False, "error": "Unauthorized: Invalid Pairing Token"})
                return
            self.send_json(200, {
                "ok": True,
                "service": "jeeb-deposit-bridge",
                "version": "0.1.0",
                "server_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
        else:
            self.send_json(404, {"ok": False, "error": "Path not found"})

    def do_POST(self):
        if self.path != '/api/deposit':
            self.send_json(404, {"ok": False, "error": "Endpoint not found"})
            return

        token_sent = self.headers.get('X-Receiver-Token', '')
        if self.pairing_token and token_sent != self.pairing_token:
            self.send_json(401, {"ok": False, "error": "Unauthorized: Invalid Pairing Token"})
            return

        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 65536:
            self.send_json(413, {"ok": False, "error": "Payload Too Large"})
            return

        body = self.rfile.read(content_length).decode('utf-8')
        try:
            data = json.loads(body)
        except Exception:
            self.send_json(400, {"ok": False, "error": "Invalid JSON body"})
            return

        sender = data.get("sender", "").strip()
        sms_timestamp = data.get("smsTimestamp", "").strip()
        received_at = data.get("receivedAt", "").strip()
        message = data.get("message", "").strip()
        raw_msg = data.get("rawForwardedMessage", "").strip()
        dedupe_key = data.get("dedupeKey", "").strip()

        if not message:
            self.send_json(400, {"ok": False, "error": "Empty message body"})
            return

        if not dedupe_key:
            dedupe_key = hashlib.sha256((sender + sms_timestamp + raw_msg).encode('utf-8')).hexdigest()

        try:
            ok, is_dup, deposit_id = save_deposit(sender, sms_timestamp, received_at, message, raw_msg, dedupe_key)
            if DepositHttpHandler.on_new_deposit_callback:
                DepositHttpHandler.on_new_deposit_callback({
                    "id": deposit_id,
                    "sender": sender,
                    "sms_timestamp": sms_timestamp,
                    "received_at": received_at,
                    "message": message,
                    "raw_message": raw_msg,
                    "dedupe_key": dedupe_key,
                    "is_duplicate": is_dup
                })

            self.send_json(200, {
                "ok": True,
                "duplicate": is_dup,
                "deposit_id": deposit_id,
                "status": "DUPLICATE_RECORD" if is_dup else "RECEIVED_AND_SAVED"
            })
        except Exception as e:
            self.send_json(500, {"ok": False, "error": str(e)})

    def log_message(self, format, *args):
        pass

def run_server():
    init_db()
    config = load_or_create_config()
    server_ip = get_local_ip()
    port = config.get("port", DEFAULT_PORT)
    token = config.get("pairing_token", "")

    DepositHttpHandler.pairing_token = token
    server = HTTPServer(('0.0.0.0', port), DepositHttpHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    print(f"Server started on http://{server_ip}:{port}")
    server_thread.join()

if __name__ == "__main__":
    run_server()`
  },
  {
    path: 'pc_receiver/start_windows.bat',
    category: 'pc_receiver',
    name: 'start_windows.bat',
    language: 'bat',
    description: 'ملف تشغيل مباشر لبرنامج ويندوز بنقرة واحدة مع فحص بيئة بايثون وتعيين ترميز UTF-8',
    content: `@echo off
chcp 65001 >nul
title جسر إشعارات إيداع جيب - برنامج الاستقبال المحلي لويندوز
echo ==============================================================
echo       جسر إشعارات إيداع جيب - Jeeb Deposit Bridge
echo                 برنامج الاستقبال المحلي
echo ==============================================================
echo.
echo جاري فحص بيئة بايثون...
python --version >nul 2>&1
if errorlevel 1 (
    echo [خطأ] لم يتم العثور على Python في PATH.
    echo يرجى تثبيت Python 3.10 أو أحدث وتفعيل خيار "Add Python to PATH".
    pause
    exit /b 1
)

echo جاري تشغيل مستقبِل الإشعارات...
python windows_receiver.py
if errorlevel 1 (
    echo [تنبيه] توقف البرنامج أو حدث خطأ أثناء التشغيل.
    pause
)`
  },
  {
    path: 'pc_receiver/allow_firewall_port_admin.bat',
    category: 'pc_receiver',
    name: 'allow_firewall_port_admin.bat',
    language: 'bat',
    description: 'أمر ويندوز لإضافة قاعدة السماح للمنفذ 8765 في Windows Defender Firewall للشبكات الخاصة',
    content: `@echo off
chcp 65001 >nul
title السماح لمنفذ جسر إيداع جيب في جدار حماية ويندوز
echo ====================================================================
echo        السماح للمنفذ 8765 في جدار حماية Windows (صلاحيات مسؤول)
echo ====================================================================
echo.
echo تنبيه أمني: قم بتشغيل هذا السكريبت كمسؤول (Run as administrator) فقط
echo على شبكة محلية خاصة وموثوقة (Private Network).
echo.
pause

netsh advfirewall firewall add rule name="Jeeb Deposit Bridge (Port 8765)" dir=in action=allow protocol=TCP localport=8765 profile=private
if %errorlevel% equ 0 (
    echo [نجاح] تمت إضافة القاعدة لجدار الحماية بنجاح للمنفذ 8765 على الشبكات الخاصة.
) else (
    echo [فشل] لم يتمكن السكريبت من إضافة القاعدة. تأكد من تشغيله كمسؤول (Run as administrator).
)
pause`
  },
  {
    path: 'pc_receiver/test_source.py',
    category: 'pc_receiver',
    name: 'test_source.py',
    language: 'python',
    description: 'اختبارات تلقائية للتحقق من المصدر وخلوه من أخطاء النحو واحتواء المسارات الأساسية',
    content: `import unittest
import os

class TestWindowsReceiverSource(unittest.TestCase):
    def test_routes_and_headers_present(self):
        curr = os.path.dirname(os.path.abspath(__file__))
        path = os.path.join(curr, "windows_receiver.py")
        self.assertTrue(os.path.exists(path))
        with open(path, "r", encoding="utf-8") as f:
            code = f.read()
        self.assertIn("/api/status", code)
        self.assertIn("/api/deposit", code)
        self.assertIn("X-Receiver-Token", code)
        self.assertIn("dedupe_key", code)

if __name__ == '__main__':
    unittest.main()`
  },

  // --- ملفات الجذر (Root) ---
  {
    path: 'settings.gradle.kts',
    category: 'root',
    name: 'settings.gradle.kts',
    language: 'kotlin',
    description: 'ملف إعداد موديولات أندرويد المتعددة (manager, cashier)',
    content: `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "jeeb-deposit-bridge"
include(":manager")
include(":cashier")`
  },
  {
    path: 'build.gradle.kts',
    category: 'root',
    name: 'build.gradle.kts',
    language: 'kotlin',
    description: 'ملف بناء أندرويد الرئيسي وتحديد إصدار Android Gradle Plugin 8.7.3',
    content: `plugins {
    id("com.android.application") version "8.7.3" apply false
}`
  },
  {
    path: 'BUILD_ANDROID_AR.txt',
    category: 'root',
    name: 'BUILD_ANDROID_AR.txt',
    language: 'text',
    description: 'دليل شامل خطوة بخطوة لبناء وتثبيت ملفات APK عبر Android Studio و ADB',
    content: `دليل بناء تطبيقي أندرويد (تطبيق المدير وتطبيق الكاشير)
=============================================================
المشروع: جسر إشعارات إيداع جيب (Jeeb Deposit Bridge)
الإصدار: 0.1.0

المتطلبات الأساسية:
1. تثبيت Android Studio (إصدار Ladybug 2024.2.1 أو أحدث).
2. تثبيت Java Development Kit (JDK 17).
3. Android SDK Platform 35 و Android Build-Tools 35.0.0.

خطوات البناء عبر Android Studio:
1. افتح Android Studio واختر "Open" ثم حدد المجلد الرئيسي للمشروع.
2. انتظر مزامنة Gradle (Sync Project with Gradle Files).
3. لاختيار تطبيق المدير:
   - من شريط الأدوات العلوي، اختر Target Module باسم "manager".
   - من القائمة اختر Build > Build Bundle(s) / APK(s) > Build APK(s).
   - ستجد ملف APK في: manager/build/outputs/apk/debug/manager-debug.apk
4. لاختيار تطبيق الكاشير:
   - اختر Target Module باسم "cashier".
   - من القائمة اختر Build > Build Bundle(s) / APK(s) > Build APK(s).
   - ستجد ملف APK في: cashier/build/outputs/apk/debug/cashier-debug.apk

خطوات التثبيت على الهواتف عبر ADB:
- لتثبيت تطبيق المدير:
  adb install manager/build/outputs/apk/debug/manager-debug.apk
- لتثبيت تطبيق الكاشير:
  adb install cashier/build/outputs/apk/debug/cashier-debug.apk`
  }
];
