#!/usr/bin/env bash
set -e

ANDROID_JAR="/usr/lib/android-sdk/platforms/android-23/android.jar"
DX_JAR="/usr/share/java/com.android.dx.jar"
KEYSTORE="/debug.keystore"

echo "=== Building Cashier APK ==="
BUILD_DIR="/tmp/build_cashier"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/gen" "$BUILD_DIR/obj" "$BUILD_DIR/res/values" "$BUILD_DIR/res/layout"

cat << 'EOF' > "$BUILD_DIR/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.jeeey.depositcashier"
    android:versionCode="1"
    android:versionName="0.1.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="34" />
    <uses-permission android:name="android.permission.RECEIVE_SMS" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:label="جيّب — الكاشير"
        android:supportsRtl="true"
        android:usesCleartextTraffic="true"
        android:icon="@android:drawable/sym_def_app_icon">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:label="جيّب — الكاشير">
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
</manifest>
EOF

cat << 'EOF' > "$BUILD_DIR/res/values/strings.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">جيّب — الكاشير</string>
</resources>
EOF

cat << 'EOF' > "$BUILD_DIR/res/layout/activity_main.xml"
<?xml version="1.0" encoding="utf-8"?>
<ScrollView xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:fillViewport="true"
    android:background="#F8F7FA">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="20dp">

        <TextView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="جسر إشعارات إيداع جيب (الكاشير)"
            android:textColor="#0D5C75"
            android:textSize="20sp"
            android:textStyle="bold"
            android:gravity="center"
            android:layout_marginBottom="8dp" />

        <TextView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="استقبال SMS من المدير وتحويلها للكمبيوتر عبر LAN"
            android:textColor="#555555"
            android:textSize="13sp"
            android:gravity="center"
            android:layout_marginBottom="16dp" />

        <TextView
            android:id="@+id/tvSmsStatus"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="حالة استقبال SMS: غير مفعّل"
            android:textColor="#C62828"
            android:textSize="14sp"
            android:textStyle="bold"
            android:layout_marginBottom="6dp" />

        <TextView
            android:id="@+id/tvPcConnectionStatus"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="حالة الاتصال بالكمبيوتر: لم يتم الاختبار"
            android:textColor="#555555"
            android:textSize="13sp"
            android:layout_marginBottom="16dp" />

        <TextView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="رقم هاتف المدير المعتمد:"
            android:textColor="#333333"
            android:textSize="13sp"
            android:textStyle="bold" />

        <EditText
            android:id="@+id/etManagerPhone"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:hint="+9677XXXXXXXX"
            android:inputType="phone"
            android:layout_marginBottom="12dp" />

        <TextView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="عنوان IP لكمبيوتر المحل:"
            android:textColor="#333333"
            android:textSize="13sp"
            android:textStyle="bold" />

        <EditText
            android:id="@+id/etPcIp"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:hint="192.168.1.100"
            android:inputType="textUri"
            android:layout_marginBottom="12dp" />

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:layout_marginBottom="16dp">

            <EditText
                android:id="@+id/etPcPort"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:hint="المنفذ 8765"
                android:inputType="number" />

            <EditText
                android:id="@+id/etPairToken"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="2"
                android:hint="رمز الربط Token"
                android:inputType="textPassword" />
        </LinearLayout>

        <Button
            android:id="@+id/btnSave"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="حفظ الإعدادات"
            android:layout_marginBottom="10dp" />

        <Button
            android:id="@+id/btnRequestSms"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="طلب إذن استقبال SMS"
            android:layout_marginBottom="10dp" />

        <Button
            android:id="@+id/btnTestConnection"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="اختبار الاتصال بكمبيوتر الكاشير"
            android:layout_marginBottom="16dp" />

        <TextView
            android:id="@+id/tvLastReceivedMessage"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="آخر رسالة: لا يوجد"
            android:textColor="#777777"
            android:textSize="12sp"
            android:layout_marginBottom="12dp" />

        <TextView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="تنبيه: هذا التطبيق ينقل الإشعار فقط ولا يرتبط بالمحفظة مباشرة."
            android:textColor="#999999"
            android:textSize="11sp"
            android:gravity="center" />
    </LinearLayout>
</ScrollView>
EOF

mkdir -p "$BUILD_DIR/src/com/jeeey/depositcashier"

cat << 'EOF' > "$BUILD_DIR/src/com/jeeey/depositcashier/DepositSmsReceiver.java"
package com.jeeey.depositcashier;

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
        if (intent == null || !"android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) return;
        Bundle bundle = intent.getExtras();
        if (bundle == null) return;
        Object[] pdus = (Object[]) bundle.get("pdus");
        if (pdus == null || pdus.length == 0) return;

        StringBuilder fullBodyBuilder = new StringBuilder();
        String originatingAddress = "";

        for (Object pdu : pdus) {
            SmsMessage message = SmsMessage.createFromPdu((byte[]) pdu);
            if (message != null) {
                if (originatingAddress.isEmpty()) {
                    originatingAddress = message.getDisplayOriginatingAddress();
                }
                fullBodyBuilder.append(message.getMessageBody());
            }
        }

        String fullMessage = fullBodyBuilder.toString().trim();
        if (!fullMessage.startsWith(SMS_PREFIX)) return;

        final SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String savedManagerPhone = prefs.getString(KEY_MANAGER_PHONE, "").trim();
        final String pcIp = prefs.getString(KEY_PC_IP, "").trim();
        final String pcPort = prefs.getString(KEY_PC_PORT, "8765").trim();
        final String pairToken = prefs.getString(KEY_PAIR_TOKEN, "").trim();

        if (!isAuthorizedSender(originatingAddress, savedManagerPhone)) {
            Log.w(TAG, "تم رفض SMS من مرسل غير مصرح: " + originatingAddress);
            prefs.edit().putString(KEY_LAST_STATUS, "تم رفض SMS من: " + originatingAddress).apply();
            return;
        }

        String[] parts = fullMessage.split("\\|", 4);
        final String smsTimestamp = parts.length > 1 ? parts[1] : "";
        String title = parts.length > 2 ? parts[2] : "";
        String body = parts.length > 3 ? parts[3] : "";
        final String summary = (title + " - " + body).trim();

        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US);
        final String receivedAt = sdf.format(new Date());
        final String dedupeKey = calculateSha256(fullMessage + "|" + originatingAddress);
        final String rawMsg = fullMessage;

        prefs.edit().putString(KEY_LAST_MESSAGE, summary).putString(KEY_LAST_STATUS, "جاري الإرسال للكمبيوتر...").apply();

        final String finalSender = originatingAddress;
        new Thread(new Runnable() {
            public void run() {
                boolean ok = dispatchToPc(pcIp, pcPort, pairToken, finalSender, smsTimestamp, receivedAt, summary, rawMsg, dedupeKey);
                prefs.edit().putString(KEY_LAST_STATUS, ok ? "تم التحويل بنجاح للكمبيوتر ✓" : "فشل التحويل إلى الكمبيوتر").apply();
            }
        }).start();
    }

    private boolean isAuthorizedSender(String incoming, String auth) {
        if (auth.isEmpty()) return false;
        String dInc = incoming.replaceAll("[^0-9]", "");
        String dAuth = auth.replaceAll("[^0-9]", "");
        if (dInc.length() >= 9 && dAuth.length() >= 9) {
            return dInc.substring(dInc.length() - 9).equals(dAuth.substring(dAuth.length() - 9));
        }
        return dInc.equals(dAuth);
    }

    private boolean dispatchToPc(String ip, String port, String token, String sender, String smsTime, String rcvTime, String msg, String raw, String dedupeKey) {
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
            json.put("smsTimestamp", smsTime);
            json.put("receivedAt", rcvTime);
            json.put("message", msg);
            json.put("rawForwardedMessage", raw);
            json.put("dedupeKey", dedupeKey);

            byte[] b = json.toString().getBytes(StandardCharsets.UTF_8);
            OutputStream os = conn.getOutputStream();
            os.write(b, 0, b.length);
            os.close();

            int code = conn.getResponseCode();
            return (code >= 200 && code < 300);
        } catch (Exception e) {
            return false;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private String calculateSha256(String base) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(base.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                String h = Integer.toHexString(0xff & b);
                if (h.length() == 1) hex.append('0');
                hex.append(h);
            }
            return hex.toString();
        } catch (Exception e) {
            return String.valueOf(base.hashCode());
        }
    }
}
EOF

cat << 'EOF' > "$BUILD_DIR/src/com/jeeey/depositcashier/MainActivity.java"
package com.jeeey.depositcashier;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends Activity {
    private EditText etManagerPhone;
    private EditText etPcIp;
    private EditText etPcPort;
    private EditText etPairToken;
    private TextView tvSmsStatus;
    private TextView tvPcConnectionStatus;
    private TextView tvLastReceivedMessage;
    private SharedPreferences prefs;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences(DepositSmsReceiver.PREFS_NAME, Context.MODE_PRIVATE);

        etManagerPhone = (EditText) findViewById(R.id.etManagerPhone);
        etPcIp = (EditText) findViewById(R.id.etPcIp);
        etPcPort = (EditText) findViewById(R.id.etPcPort);
        etPairToken = (EditText) findViewById(R.id.etPairToken);

        tvSmsStatus = (TextView) findViewById(R.id.tvSmsStatus);
        tvPcConnectionStatus = (TextView) findViewById(R.id.tvPcConnectionStatus);
        tvLastReceivedMessage = (TextView) findViewById(R.id.tvLastReceivedMessage);

        Button btnSave = (Button) findViewById(R.id.btnSave);
        Button btnRequestSms = (Button) findViewById(R.id.btnRequestSms);
        Button btnTestConnection = (Button) findViewById(R.id.btnTestConnection);

        etManagerPhone.setText(prefs.getString(DepositSmsReceiver.KEY_MANAGER_PHONE, ""));
        etPcIp.setText(prefs.getString(DepositSmsReceiver.KEY_PC_IP, "192.168.1.100"));
        etPcPort.setText(prefs.getString(DepositSmsReceiver.KEY_PC_PORT, "8765"));
        etPairToken.setText(prefs.getString(DepositSmsReceiver.KEY_PAIR_TOKEN, ""));

        btnSave.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                saveSettings();
            }
        });

        btnRequestSms.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                requestSmsPermission();
            }
        });

        btnTestConnection.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                testConnection();
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateStatuses();
    }

    private void updateStatuses() {
        if (Build.VERSION.SDK_INT >= 23) {
            boolean hasPerm = checkSelfPermission("android.permission.RECEIVE_SMS") == PackageManager.PERMISSION_GRANTED;
            if (hasPerm) {
                tvSmsStatus.setText("حالة استقبال SMS: مفعّل وجاهز ✓");
                tvSmsStatus.setTextColor(0xFF2E7D32);
            } else {
                tvSmsStatus.setText("حالة استقبال SMS: غير مفعّل (مطلوب الإذن)");
                tvSmsStatus.setTextColor(0xFFC62828);
            }
        }
        tvPcConnectionStatus.setText("حالة الخادم: " + prefs.getString(DepositSmsReceiver.KEY_LAST_STATUS, "لم يتم الاتصال"));
        tvLastReceivedMessage.setText("آخر رسالة: " + prefs.getString(DepositSmsReceiver.KEY_LAST_MESSAGE, "لا يوجد"));
    }

    private void saveSettings() {
        prefs.edit()
            .putString(DepositSmsReceiver.KEY_MANAGER_PHONE, etManagerPhone.getText().toString().trim())
            .putString(DepositSmsReceiver.KEY_PC_IP, etPcIp.getText().toString().trim())
            .putString(DepositSmsReceiver.KEY_PC_PORT, etPcPort.getText().toString().trim())
            .putString(DepositSmsReceiver.KEY_PAIR_TOKEN, etPairToken.getText().toString().trim())
            .apply();
        Toast.makeText(this, "تم حفظ إعدادات الكاشير بنجاح", Toast.LENGTH_SHORT).show();
        updateStatuses();
    }

    private void requestSmsPermission() {
        if (Build.VERSION.SDK_INT >= 23) {
            requestPermissions(new String[]{"android.permission.RECEIVE_SMS"}, 201);
        } else {
            Toast.makeText(this, "إذن SMS ممنوح مسبقًا", Toast.LENGTH_SHORT).show();
        }
    }

    private void testConnection() {
        final String ip = etPcIp.getText().toString().trim();
        final String port = etPcPort.getText().toString().trim();
        final String token = etPairToken.getText().toString().trim();

        tvPcConnectionStatus.setText("جاري فحص الاتصال بـ " + ip + ":" + port + "...");
        tvPcConnectionStatus.setTextColor(0xFF0D5C75);

        new Thread(new Runnable() {
            public void run() {
                HttpURLConnection conn = null;
                try {
                    URL url = new URL("http://" + ip + ":" + port + "/api/status");
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(4000);
                    conn.setRequestProperty("X-Receiver-Token", token);

                    final int code = conn.getResponseCode();
                    handler.post(new Runnable() {
                        public void run() {
                            if (code == 200) {
                                tvPcConnectionStatus.setText("تم الاتصال بالكمبيوتر بنجاح ✓ (200 OK)");
                                tvPcConnectionStatus.setTextColor(0xFF2E7D32);
                                Toast.makeText(MainActivity.this, "تم الاتصال بالكمبيوتر بنجاح!", Toast.LENGTH_SHORT).show();
                            } else if (code == 401) {
                                tvPcConnectionStatus.setText("فشل الاتصال: رمز الربط غير صحيح (401)");
                                tvPcConnectionStatus.setTextColor(0xFFC62828);
                            } else {
                                tvPcConnectionStatus.setText("استجابة غير متوقعة: " + code);
                                tvPcConnectionStatus.setTextColor(0xFFE65100);
                            }
                        }
                    });
                } catch (final Exception e) {
                    handler.post(new Runnable() {
                        public void run() {
                            tvPcConnectionStatus.setText("تعذر الوصول: " + e.getMessage());
                            tvPcConnectionStatus.setTextColor(0xFFC62828);
                        }
                    });
                } finally {
                    if (conn != null) conn.disconnect();
                }
            }
        }).start();
    }
}
EOF

# 1. AAPT Generate R.java
aapt package -f -m -J "$BUILD_DIR/gen" -M "$BUILD_DIR/AndroidManifest.xml" -S "$BUILD_DIR/res" -I "$ANDROID_JAR"

# 2. Compile Java classes with -source 7 -target 7
javac -source 7 -target 7 -bootclasspath "$ANDROID_JAR" \
    -d "$BUILD_DIR/obj" \
    "$BUILD_DIR/gen/com/jeeey/depositcashier/R.java" \
    "$BUILD_DIR/src/com/jeeey/depositcashier/DepositSmsReceiver.java" \
    "$BUILD_DIR/src/com/jeeey/depositcashier/MainActivity.java"

# 3. DX compile to classes.dex
java -jar "$DX_JAR" --dex --output="$BUILD_DIR/classes.dex" "$BUILD_DIR/obj"

# 4. AAPT package resources
aapt package -f -M "$BUILD_DIR/AndroidManifest.xml" -S "$BUILD_DIR/res" -I "$ANDROID_JAR" -F "$BUILD_DIR/unaligned.apk"
(cd "$BUILD_DIR" && aapt add "$BUILD_DIR/unaligned.apk" classes.dex)

# 5. Zipalign
zipalign -f -v 4 "$BUILD_DIR/unaligned.apk" "$BUILD_DIR/aligned.apk"

# 6. Sign APK with apksigner
apksigner sign --ks "$KEYSTORE" --ks-pass pass:android --key-pass pass:android --out "Jeeb_Deposit_Cashier.apk" "$BUILD_DIR/aligned.apk"
cp "Jeeb_Deposit_Cashier.apk" "cashier.apk"
echo "=== Cashier APK Build SUCCESS ==="
apksigner verify "Jeeb_Deposit_Cashier.apk"
