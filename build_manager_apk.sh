#!/usr/bin/env bash
set -e

ANDROID_JAR="/usr/lib/android-sdk/platforms/android-23/android.jar"
DX_JAR="/usr/share/java/com.android.dx.jar"
KEYSTORE="/debug.keystore"

echo "=== Building Manager APK ==="
BUILD_DIR="/tmp/build_manager"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/gen" "$BUILD_DIR/obj" "$BUILD_DIR/res/values" "$BUILD_DIR/res/layout"

cat << 'EOF' > "$BUILD_DIR/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.jeeey.depositmanager"
    android:versionCode="1"
    android:versionName="0.1.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="34" />
    <uses-permission android:name="android.permission.SEND_SMS" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:label="جيّب — المدير"
        android:supportsRtl="true"
        android:icon="@android:drawable/sym_def_app_icon">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:label="جيّب — المدير">
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
</manifest>
EOF

cat << 'EOF' > "$BUILD_DIR/res/values/strings.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">جيّب — المدير</string>
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
            android:text="جسر إشعارات إيداع جيب (المدير)"
            android:textColor="#8A1538"
            android:textSize="20sp"
            android:textStyle="bold"
            android:gravity="center"
            android:layout_marginBottom="8dp" />

        <TextView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="مراقبة إشعارات المحفظة وتحويلها عبر SMS"
            android:textColor="#555555"
            android:textSize="13sp"
            android:gravity="center"
            android:layout_marginBottom="16dp" />

        <TextView
            android:id="@+id/tvNotificationStatus"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="حالة خدمة الإشعارات: غير مفعلة"
            android:textColor="#8A1538"
            android:textSize="14sp"
            android:textStyle="bold"
            android:layout_marginBottom="6dp" />

        <TextView
            android:id="@+id/tvSmsPermissionStatus"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="إذن إرسال SMS: غير ممنوح"
            android:textColor="#555555"
            android:textSize="13sp"
            android:layout_marginBottom="16dp" />

        <TextView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="رقم هاتف الكاشير (مثال: +9677XXXXXXXX):"
            android:textColor="#333333"
            android:textSize="13sp"
            android:textStyle="bold" />

        <EditText
            android:id="@+id/etCashierPhone"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:hint="+967700000000"
            android:inputType="phone"
            android:layout_marginBottom="12dp" />

        <TextView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="الكلمات المفتاحية (مفصولة بفاصلة):"
            android:textColor="#333333"
            android:textSize="13sp"
            android:textStyle="bold" />

        <EditText
            android:id="@+id/etKeywords"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:hint="جيب,jeeb,إيداع"
            android:layout_marginBottom="16dp" />

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
            android:text="طلب إذن إرسال SMS"
            android:layout_marginBottom="10dp" />

        <Button
            android:id="@+id/btnOpenNotificationSettings"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="تفعيل صلاحية الوصول للإشعارات"
            android:layout_marginBottom="10dp" />

        <Button
            android:id="@+id/btnSendTestSms"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="إرسال SMS تجريبي للكاشير"
            android:layout_marginBottom="16dp" />

        <TextView
            android:id="@+id/tvLastForwarded"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="آخر إشعار: لا يوجد"
            android:textColor="#777777"
            android:textSize="12sp"
            android:layout_marginBottom="12dp" />

        <TextView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="تنبيه: هذا التطبيق ينقل الإشعارات فقط ولا يتحقق من الرصيد الفعلي."
            android:textColor="#999999"
            android:textSize="11sp"
            android:gravity="center" />
    </LinearLayout>
</ScrollView>
EOF

mkdir -p "$BUILD_DIR/src/com/jeeey/depositmanager"

cat << 'EOF' > "$BUILD_DIR/src/com/jeeey/depositmanager/DepositNotificationListener.java"
package com.jeeey.depositmanager;

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

public class DepositNotificationListener extends NotificationListenerService {
    private static final String TAG = "DepositManager";
    public static final String PREFS_NAME = "JeebManagerPrefs";
    public static final String KEY_CASHIER_PHONE = "cashier_phone";
    public static final String KEY_KEYWORDS = "keywords";
    public static final String KEY_LAST_FORWARDED = "last_forwarded";
    public static final String SMS_PREFIX = "JEEY-DEPOSIT|";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;
        Notification notification = sbn.getNotification();
        Bundle extras = notification.extras;
        if (extras == null) return;

        CharSequence titleCs = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);

        String title = titleCs != null ? titleCs.toString() : "";
        String body = textCs != null ? textCs.toString() : "";
        String combined = (title + " " + body).toLowerCase(Locale.ROOT);

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String cashierPhone = prefs.getString(KEY_CASHIER_PHONE, "");
        String rawKeywords = prefs.getString(KEY_KEYWORDS, "جيب,jeeb,إيداع");

        if (cashierPhone.trim().isEmpty()) return;

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
            String cleanTitle = title.replace("|", " ").trim();
            String cleanBody = body.replace("|", " ").trim();
            String smsPayload = SMS_PREFIX + timestamp + "|" + cleanTitle + "|" + cleanBody;

            try {
                SmsManager smsManager = SmsManager.getDefault();
                if (smsPayload.length() > 140) {
                    java.util.ArrayList<String> parts = smsManager.divideMessage(smsPayload);
                    smsManager.sendMultipartTextMessage(cashierPhone, null, parts, null, null);
                } else {
                    smsManager.sendTextMessage(cashierPhone, null, smsPayload, null, null);
                }
                prefs.edit().putString(KEY_LAST_FORWARDED, timestamp + " - " + cleanTitle + ": " + cleanBody).apply();
            } catch (Exception e) {
                Log.e(TAG, "فشل الإرسال: " + e.getMessage());
            }
        }
    }
}
EOF

cat << 'EOF' > "$BUILD_DIR/src/com/jeeey/depositmanager/MainActivity.java"
package com.jeeey.depositmanager;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends Activity {
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

        etCashierPhone = (EditText) findViewById(R.id.etCashierPhone);
        etKeywords = (EditText) findViewById(R.id.etKeywords);
        tvNotificationStatus = (TextView) findViewById(R.id.tvNotificationStatus);
        tvSmsPermissionStatus = (TextView) findViewById(R.id.tvSmsPermissionStatus);
        tvLastForwarded = (TextView) findViewById(R.id.tvLastForwarded);

        Button btnSave = (Button) findViewById(R.id.btnSave);
        Button btnRequestSms = (Button) findViewById(R.id.btnRequestSms);
        Button btnOpenNotificationSettings = (Button) findViewById(R.id.btnOpenNotificationSettings);
        Button btnSendTestSms = (Button) findViewById(R.id.btnSendTestSms);

        etCashierPhone.setText(prefs.getString(DepositNotificationListener.KEY_CASHIER_PHONE, ""));
        etKeywords.setText(prefs.getString(DepositNotificationListener.KEY_KEYWORDS, "جيب,jeeb,إيداع"));

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

        btnOpenNotificationSettings.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                startActivity(new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS"));
            }
        });

        btnSendTestSms.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                sendTestSms();
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateStatuses();
    }

    private void updateStatuses() {
        String flat = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        boolean enabled = flat != null && flat.contains(getPackageName());
        if (enabled) {
            tvNotificationStatus.setText("حالة خدمة الإشعارات: مفعّلة وجاهزة ✓");
            tvNotificationStatus.setTextColor(0xFF2E7D32);
        } else {
            tvNotificationStatus.setText("حالة خدمة الإشعارات: غير مفعلة (اضغط لتفعيلها)");
            tvNotificationStatus.setTextColor(0xFFC62828);
        }

        if (Build.VERSION.SDK_INT >= 23) {
            boolean hasPerm = checkSelfPermission("android.permission.SEND_SMS") == PackageManager.PERMISSION_GRANTED;
            if (hasPerm) {
                tvSmsPermissionStatus.setText("إذن إرسال SMS: ممنوح ✓");
                tvSmsPermissionStatus.setTextColor(0xFF2E7D32);
            } else {
                tvSmsPermissionStatus.setText("إذن إرسال SMS: غير ممنوح");
                tvSmsPermissionStatus.setTextColor(0xFFE65100);
            }
        }

        tvLastForwarded.setText("آخر إشعار: " + prefs.getString(DepositNotificationListener.KEY_LAST_FORWARDED, "لا يوجد"));
    }

    private void saveSettings() {
        String phone = etCashierPhone.getText().toString().trim();
        String keywords = etKeywords.getText().toString().trim();
        prefs.edit()
            .putString(DepositNotificationListener.KEY_CASHIER_PHONE, phone)
            .putString(DepositNotificationListener.KEY_KEYWORDS, keywords)
            .apply();
        Toast.makeText(this, "تم حفظ الإعدادات بنجاح", Toast.LENGTH_SHORT).show();
        updateStatuses();
    }

    private void requestSmsPermission() {
        if (Build.VERSION.SDK_INT >= 23) {
            requestPermissions(new String[]{"android.permission.SEND_SMS"}, 101);
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
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US);
        String testPayload = DepositNotificationListener.SMS_PREFIX + sdf.format(new Date()) + "|رسالة تجريبية|إيداع تجريبي بقيمة 1000 ريال";
        try {
            android.telephony.SmsManager.getDefault().sendTextMessage(phone, null, testPayload, null, null);
            Toast.makeText(this, "تم إرسال SMS تجريبي بنجاح", Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            Toast.makeText(this, "فشل الإرسال: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }
}
EOF

# 1. AAPT Generate R.java
aapt package -f -m -J "$BUILD_DIR/gen" -M "$BUILD_DIR/AndroidManifest.xml" -S "$BUILD_DIR/res" -I "$ANDROID_JAR"

# 2. Compile Java classes with -source 7 -target 7
javac -source 7 -target 7 -bootclasspath "$ANDROID_JAR" \
    -d "$BUILD_DIR/obj" \
    "$BUILD_DIR/gen/com/jeeey/depositmanager/R.java" \
    "$BUILD_DIR/src/com/jeeey/depositmanager/DepositNotificationListener.java" \
    "$BUILD_DIR/src/com/jeeey/depositmanager/MainActivity.java"

# 3. DX compile to classes.dex
java -jar "$DX_JAR" --dex --output="$BUILD_DIR/classes.dex" "$BUILD_DIR/obj"

# 4. AAPT package resources
aapt package -f -M "$BUILD_DIR/AndroidManifest.xml" -S "$BUILD_DIR/res" -I "$ANDROID_JAR" -F "$BUILD_DIR/unaligned.apk"
(cd "$BUILD_DIR" && aapt add "$BUILD_DIR/unaligned.apk" classes.dex)

# 5. Zipalign
zipalign -f -v 4 "$BUILD_DIR/unaligned.apk" "$BUILD_DIR/aligned.apk"

# 6. Sign APK with apksigner
apksigner sign --ks "$KEYSTORE" --ks-pass pass:android --key-pass pass:android --out "Jeeb_Deposit_Manager.apk" "$BUILD_DIR/aligned.apk"
cp "Jeeb_Deposit_Manager.apk" "manager.apk"
echo "=== Manager APK Build SUCCESS ==="
apksigner verify "Jeeb_Deposit_Manager.apk"
