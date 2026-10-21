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

/**
 * مستقبل رسائل SMS الخاصة بإيداعات جيب وتحويلها عبر LAN إلى كمبيوتر المحل.
 * معرّف التطبيق: com.jeeey.depositcashier
 */
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
        if (bundle == null) {
            return;
        }

        Object[] pdus = (Object[]) bundle.get("pdus");
        String format = bundle.getString("format");
        if (pdus == null || pdus.length == 0) {
            return;
        }

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
            // ليست رسالة جسر إيداع جيب
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String savedManagerPhone = prefs.getString(KEY_MANAGER_PHONE, "").trim();
        String pcIp = prefs.getString(KEY_PC_IP, "").trim();
        String pcPort = prefs.getString(KEY_PC_PORT, "8765").trim();
        String pairToken = prefs.getString(KEY_PAIR_TOKEN, "").trim();

        // التحقق من رقم هاتف المدير عبر مقارنة آخر 9 أرقام لتجاوز اختلافات مفاتيح الدول
        if (!isAuthorizedSender(originatingAddress, savedManagerPhone)) {
            Log.w(TAG, "تم رفض الرسالة: رقم المرسل (" + originatingAddress + ") لا يطابق رقم المدير المعتمد (" + savedManagerPhone + ")");
            prefs.edit().putString(KEY_LAST_STATUS, "تم رفض SMS من رقم غير معتمد: " + originatingAddress).apply();
            return;
        }

        // تفكيك محتوى الرسالة JEEY-DEPOSIT|<timestamp>|<title>|<body>
        String[] parts = fullMessage.split("\\|", 4);
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

        // الإرسال في خيط منفصل عبر الشبكة المحلية HTTP
        final String finalSender = originatingAddress;
        new Thread(() -> {
            boolean success = dispatchToPc(context, pcIp, pcPort, pairToken, finalSender, smsTimestamp, receivedAt, summaryMessage, fullMessage, dedupeKey);
            prefs.edit().putString(KEY_LAST_STATUS, success ? "تم التحويل بنجاح للكمبيوتر ✓" : "فشل التحويل إلى الكمبيوتر (تحقق من الشبكة)").apply();
        }).start();
    }

    private boolean isAuthorizedSender(String incomingSender, String authorizedSender) {
        if (authorizedSender.isEmpty()) {
            return false;
        }
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
        if (ip.isEmpty() || port.isEmpty()) {
            Log.e(TAG, "عنوان IP أو المنفذ غير مضبوط.");
            return false;
        }

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
            Log.i(TAG, "استجابة الخادم: " + responseCode);
            return (responseCode >= 200 && responseCode < 300);
        } catch (Exception e) {
            Log.e(TAG, "فشل الاتصال بالكمبيوتر: " + e.getMessage(), e);
            return false;
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
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
}
