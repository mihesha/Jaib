@echo off
chcp 65001 >nul
title السماح لمنفذ جسر إيداع جيب في جدار حماية ويندوز
echo ====================================================================
echo        السماح للمنفذ 8765 في جدار حماية Windows (صلاحيات مسؤول)
echo ====================================================================
echo.
echo تنبيه أمني: قم بتشغيل هذا السكريبت كمسؤول (Run as administrator) فقط
echo على شبكة محلية خاصة وموثوقة (Private Network).
echo لا تقم بعمل Port Forwarding في الراوتر لهذا المنفذ إلى الإنترنت.
echo.
pause

netsh advfirewall firewall add rule name="Jeeb Deposit Bridge (Port 8765)" dir=in action=allow protocol=TCP localport=8765 profile=private
if %errorlevel% equ 0 (
    echo.
    echo [نجاح] تمت إضافة القاعدة لجدار الحماية بنجاح للمنفذ 8765 على الشبكات الخاصة.
) else (
    echo.
    echo [فشل] لم يتمكن السكريبت من إضافة القاعدة. تأكد من تشغيله كمسؤول (Run as administrator).
)

echo.
pause
