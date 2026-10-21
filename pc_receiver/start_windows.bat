@echo off
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
)
