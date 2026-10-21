package com.jeeey.depositcashier;

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

/**
 * شاشة إعداد وتحكم تطبيق الكاشير
 * معرّف التطبيق: com.jeeey.depositcashier
 */
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

        // تحميل الإعدادات المحفوظة
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
                    while ((line = in.readLine()) != null) {
                        response.append(line);
                    }
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

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_SMS_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this, "تم منح إذن استقبال SMS بنجاح", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "تم رفض إذن استقبال SMS", Toast.LENGTH_SHORT).show();
            }
            updateStatuses();
        }
    }
}
