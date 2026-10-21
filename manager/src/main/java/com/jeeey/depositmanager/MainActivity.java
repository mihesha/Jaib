package com.jeeey.depositmanager;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
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

/**
 * شاشة إعداد وتحكم تطبيق المدير
 * معرّف التطبيق: com.jeeey.depositmanager
 */
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

        // تحميل الإعدادات المحفوظة
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
        // فحص صلاحية قراءة الإشعارات
        boolean isNotificationAccessGranted = isNotificationServiceEnabled();
        if (isNotificationAccessGranted) {
            tvNotificationStatus.setText("حالة خدمة الإشعارات: مفعّلة وجاهزة ✓");
            tvNotificationStatus.setTextColor(0xFF2E7D32); // أخضر
        } else {
            tvNotificationStatus.setText("حالة خدمة الإشعارات: غير مفعلة (اضغط لتفعيلها)");
            tvNotificationStatus.setTextColor(0xFFC62828); // أحمر
        }

        // فحص إذن SMS
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
}
