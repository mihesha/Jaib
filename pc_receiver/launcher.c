#include <windows.h>
#include <shellapi.h>
#include <stdio.h>
#include <stdlib.h>

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    char curDir[MAX_PATH];
    GetCurrentDirectoryA(MAX_PATH, curDir);

    char pyScriptPath[MAX_PATH];
    snprintf(pyScriptPath, MAX_PATH, "%s\\windows_receiver.py", curDir);

    // Check if windows_receiver.py exists in current directory or in pc_receiver subfolder
    DWORD attrib = GetFileAttributesA(pyScriptPath);
    if (attrib == INVALID_FILE_ATTRIBUTES) {
        snprintf(pyScriptPath, MAX_PATH, "%s\\pc_receiver\\windows_receiver.py", curDir);
        attrib = GetFileAttributesA(pyScriptPath);
    }

    if (attrib == INVALID_FILE_ATTRIBUTES) {
        MessageBoxW(NULL, 
            L"تعذر العثور على ملف windows_receiver.py في نفس المجلد!\nيرجى التأكد من تشغيل البرنامج من مجلد المشروع.", 
            L"جسر إشعارات إيداع جيب", 
            MB_ICONERROR | MB_RTLREADING | MB_RIGHT);
        return 1;
    }

    // Try executing python with windows_receiver.py
    char cmdLine[MAX_PATH * 2];
    snprintf(cmdLine, sizeof(cmdLine), "python \"%s\"", pyScriptPath);

    STARTUPINFOA si;
    PROCESS_INFORMATION pi;
    ZeroMemory(&si, sizeof(si));
    si.cb = sizeof(si);
    si.dwFlags = STARTF_USESHOWWINDOW;
    si.wShowWindow = SW_HIDE; // Run command window hidden, Tkinter GUI opens natively

    ZeroMemory(&pi, sizeof(pi));

    if (CreateProcessA(NULL, cmdLine, NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi)) {
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
        return 0;
    }

    // Fallback: Try with 'py' launcher
    snprintf(cmdLine, sizeof(cmdLine), "py \"%s\"", pyScriptPath);
    if (CreateProcessA(NULL, cmdLine, NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi)) {
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
        return 0;
    }

    // If python is not found in PATH, prompt user with friendly message and offer to download
    int response = MessageBoxW(NULL,
        L"لم يتم العثور على بيئة Python 3 في النظام.\n\n"
        L"يتطلب تشغيل خادم استقبال إيداعات جيب تثبيت Python 3.10+ مع تفعيل خيار:\n"
        L"\"Add Python to PATH\".\n\n"
        L"هل تريد فتح صفحة تحميل بايثون الرسمية الآن؟",
        L"جسر إشعارات إيداع جيب — تنبيه بايثون",
        MB_YESNO | MB_ICONEXCLAMATION | MB_RTLREADING | MB_RIGHT);

    if (response == IDYES) {
        ShellExecuteW(NULL, L"open", L"https://www.python.org/downloads/", NULL, NULL, SW_SHOWNORMAL);
    }

    return 0;
}
