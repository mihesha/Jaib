"""
اختبارات تحقق أولية لمصدر برنامج ويندوز (Jeeb Deposit Bridge)
"""
import unittest
import os
import sys
import json

class TestWindowsReceiverSource(unittest.TestCase):

    def setUp(self):
        self.current_dir = os.path.dirname(os.path.abspath(__file__))
        self.receiver_path = os.path.join(self.current_dir, "windows_receiver.py")

    def test_receiver_file_exists(self):
        """التحقق من وجود ملف windows_receiver.py"""
        self.assertTrue(os.path.exists(self.receiver_path), "ملف windows_receiver.py غير موجود!")

    def test_syntax_compilation(self):
        """التحقق من خلو ملف windows_receiver.py من الأخطاء النحوية"""
        with open(self.receiver_path, "r", encoding="utf-8") as f:
            code = f.read()
        compiled = compile(code, self.receiver_path, "exec")
        self.assertIsNotNone(compiled)

    def test_routes_and_headers_present(self):
        """التحقق من وجود المسارات وترويسة المصادقة وقواعد البيانات في الكود"""
        with open(self.receiver_path, "r", encoding="utf-8") as f:
            code = f.read()
        self.assertIn("/api/status", code, "المسار /api/status غير معرف في الكود")
        self.assertIn("/api/deposit", code, "المسار /api/deposit غير معرف في الكود")
        self.assertIn("X-Receiver-Token", code, "ترويسة X-Receiver-Token غير موجودة")
        self.assertIn("dedupe_key", code, "خاصية dedupe_key لمنع التكرار غير موجودة")
        self.assertIn("deposits.sqlite3", code, "قاعدة البيانات deposits.sqlite3 غير معرّفة")

    def test_batch_files_exist(self):
        """التحقق من وجود ملفات الدفعات start_windows.bat و allow_firewall_port_admin.bat"""
        start_bat = os.path.join(self.current_dir, "start_windows.bat")
        firewall_bat = os.path.join(self.current_dir, "allow_firewall_port_admin.bat")
        self.assertTrue(os.path.exists(start_bat), "ملف start_windows.bat غير موجود!")
        self.assertTrue(os.path.exists(firewall_bat), "ملف allow_firewall_port_admin.bat غير موجود!")

if __name__ == '__main__':
    unittest.main()
