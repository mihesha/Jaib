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
                // تقسيم الرسالة في حال تجاوز الحد
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
}
