#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
جسر إشعارات إيداع جيب — برنامج الاستقبال لويندوز
Jeeb Deposit Bridge — Windows Receiver
الإصدار: 0.1.0
المتطلبات: Python 3.10+ (المكتبات القياسية فقط)
"""

import os
import sys
import json
import sqlite3
import socket
import secrets
import hashlib
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

# واجهة المستخدم الرسومية عبر Tkinter
try:
    import tkinter as tk
    from tkinter import ttk, messagebox, filedialog
    TKINTER_AVAILABLE = True
except ImportError:
    TKINTER_AVAILABLE = False

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, "config.json")
DB_FILE = os.path.join(BASE_DIR, "deposits.sqlite3")
DEFAULT_PORT = 8765

# --- إدارة قاعدة البيانات ---
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS deposits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT,
            sms_timestamp TEXT,
            received_at TEXT,
            message TEXT,
            raw_message TEXT,
            dedupe_key TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def save_deposit(sender, sms_timestamp, received_at, message, raw_message, dedupe_key):
    """
    يحفظ الإشعار في SQLite.
    يعيد (True, False) إذا كان جديدًا، و (True, True) إذا كان مكررًا.
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO deposits (sender, sms_timestamp, received_at, message, raw_message, dedupe_key)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (sender, sms_timestamp, received_at, message, raw_message, dedupe_key))
        conn.commit()
        last_id = cursor.lastrowid
        conn.close()
        return True, False, last_id
    except sqlite3.IntegrityError:
        conn.close()
        return True, True, None
    except Exception as e:
        conn.close()
        raise e

def fetch_recent_deposits(limit=300):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, sender, sms_timestamp, received_at, message, raw_message, dedupe_key, created_at
        FROM deposits
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return rows

# --- إدارة الإعدادات ورمز الربط ---
def load_or_create_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    # توليد رمز ربط عشوائي قوي افتراضي
    token = "jbp_" + secrets.token_hex(12)
    config = {
        "port": DEFAULT_PORT,
        "pairing_token": token,
        "allowed_origins": ["*"]
    }
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    return config

def get_local_ip():
    """اكتشاف عنوان IP الخاص ببطاقة الشبكة المحلية LAN"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # لا ينشئ اتصالًا حقيقيًا لكنه يستكشف مسار التوجيه المحلي
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

# --- خادم HTTP المحلي ---
class DepositHttpHandler(BaseHTTPRequestHandler):
    pairing_token = ""
    on_new_deposit_callback = None

    def send_json(self, status_code, data):
        payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Receiver-Token, Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/status':
            token_sent = self.headers.get('X-Receiver-Token', '')
            if self.pairing_token and token_sent != self.pairing_token:
                self.send_json(401, {"ok": False, "error": "Unauthorized: Invalid Pairing Token"})
                return
            self.send_json(200, {
                "ok": True,
                "service": "jeeb-deposit-bridge",
                "version": "0.1.0",
                "server_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
        else:
            self.send_json(404, {"ok": False, "error": "Path not found"})

    def do_POST(self):
        if self.path != '/api/deposit':
            self.send_json(404, {"ok": False, "error": "Endpoint not found"})
            return

        token_sent = self.headers.get('X-Receiver-Token', '')
        if self.pairing_token and token_sent != self.pairing_token:
            self.send_json(401, {"ok": False, "error": "Unauthorized: Invalid Pairing Token"})
            return

        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 65536: # 64KB max
            self.send_json(413, {"ok": False, "error": "Payload Too Large"})
            return

        body = self.rfile.read(content_length).decode('utf-8')
        try:
            data = json.loads(body)
        except Exception:
            self.send_json(400, {"ok": False, "error": "Invalid JSON body"})
            return

        sender = data.get("sender", "").strip()
        sms_timestamp = data.get("smsTimestamp", "").strip()
        received_at = data.get("receivedAt", "").strip()
        message = data.get("message", "").strip()
        raw_msg = data.get("rawForwardedMessage", "").strip()
        dedupe_key = data.get("dedupeKey", "").strip()

        if not message:
            self.send_json(400, {"ok": False, "error": "Empty message body"})
            return

        if not dedupe_key:
            dedupe_key = hashlib.sha256((sender + sms_timestamp + raw_msg).encode('utf-8')).hexdigest()

        try:
            ok, is_dup, deposit_id = save_deposit(sender, sms_timestamp, received_at, message, raw_msg, dedupe_key)
            if DepositHttpHandler.on_new_deposit_callback:
                DepositHttpHandler.on_new_deposit_callback({
                    "id": deposit_id,
                    "sender": sender,
                    "sms_timestamp": sms_timestamp,
                    "received_at": received_at,
                    "message": message,
                    "raw_message": raw_msg,
                    "dedupe_key": dedupe_key,
                    "is_duplicate": is_dup
                })

            self.send_json(200, {
                "ok": True,
                "duplicate": is_dup,
                "deposit_id": deposit_id,
                "status": "DUPLICATE_RECORD" if is_dup else "RECEIVED_AND_SAVED"
            })
        except Exception as e:
            self.send_json(500, {"ok": False, "error": str(e)})

    def log_message(self, format, *args):
        # تعطيل التسجيل الافتراضي في الطرفية للحفاظ على نظافة السجل
        pass

# --- واجهة المستخدم الرسومية لنظام ويندوز ---
class ReceiverGui:
    def __init__(self, root, config, server_ip, port):
        self.root = root
        self.config = config
        self.server_ip = server_ip
        self.port = port
        self.token_revealed = False

        self.root.title("جسر إشعارات إيداع جيب — مستقبِل الكاشير لويندوز")
        self.root.geometry("1020x680")
        self.root.minsize(860, 560)
        self.root.configure(bg="#F3F4F6")

        # نمط مظهر حديث
        self.style = ttk.Style()
        self.style.theme_use("clam")
        self.setup_styles()

        self.create_widgets()
        self.refresh_table()

    def setup_styles(self):
        self.style.configure(".", font=("Segoe UI", 10), background="#F3F4F6")
        self.style.configure("Treeview.Heading", font=("Segoe UI", 10, "bold"), background="#E5E7EB", foreground="#111827")
        self.style.configure("Treeview", font=("Segoe UI", 10), rowheight=28, background="#FFFFFF", fieldbackground="#FFFFFF")
        self.style.map("Treeview", background=[("selected", "#0284C7")], foreground=[("selected", "#FFFFFF")])

    def create_widgets(self):
        # 1. الشريط العلوي Header
        top_frame = tk.Frame(self.root, bg="#0F172A", height=75)
        top_frame.pack(fill=tk.X, side=tk.TOP)

        title_lbl = tk.Label(
            top_frame,
            text="جسر إشعارات إيداع جيب — شاشة كاشير المحل",
            font=("Segoe UI", 14, "bold"),
            fg="#F8FAFC",
            bg="#0F172A"
        )
        title_lbl.pack(side=tk.RIGHT, padx=20, pady=12)

        status_badge = tk.Label(
            top_frame,
            text="● الخادم المحلي يعمل (جاهز للاستقبال)",
            font=("Segoe UI", 9, "bold"),
            fg="#4ADE80",
            bg="#1E293B",
            padx=10,
            pady=4
        )
        status_badge.pack(side=tk.LEFT, padx=20, pady=12)

        # 2. بطاقات الاتصال والمعلومات
        info_frame = tk.Frame(self.root, bg="#FFFFFF", bd=1, relief=tk.SOLID)
        info_frame.pack(fill=tk.X, padx=16, pady=12)

        # عمود IP والمنفذ
        ip_box = tk.Frame(info_frame, bg="#FFFFFF")
        ip_box.pack(side=tk.RIGHT, padx=16, pady=10)
        tk.Label(ip_box, text="عنوان IP الكمبيوتر:", font=("Segoe UI", 9), fg="#64748B", bg="#FFFFFF").pack(anchor="e")
        tk.Label(ip_box, text=f"{self.server_ip}:{self.port}", font=("Consolas", 12, "bold"), fg="#0284C7", bg="#FFFFFF").pack(anchor="e")

        # عمود رمز الربط
        token_box = tk.Frame(info_frame, bg="#FFFFFF")
        token_box.pack(side=tk.RIGHT, padx=24, pady=10)
        tk.Label(token_box, text="رمز الربط لتطبيق الكاشير (Token):", font=("Segoe UI", 9), fg="#64748B", bg="#FFFFFF").pack(anchor="e")

        token_row = tk.Frame(token_box, bg="#FFFFFF")
        token_row.pack(anchor="e")

        self.token_var = tk.StringVar(value="••••••••••••••••")
        self.lbl_token = tk.Label(token_row, textvariable=self.token_var, font=("Consolas", 11, "bold"), fg="#334155", bg="#F1F5F9", padx=8, pady=2)
        self.lbl_token.pack(side=tk.LEFT, padx=4)

        btn_toggle = tk.Button(token_row, text="إظهار/إخفاء", command=self.toggle_token, font=("Segoe UI", 8), bg="#E2E8F0", relief=tk.FLAT)
        btn_toggle.pack(side=tk.LEFT, padx=2)

        btn_copy = tk.Button(token_row, text="نسخ الرمز", command=self.copy_token, font=("Segoe UI", 8), bg="#E2E8F0", relief=tk.FLAT)
        btn_copy.pack(side=tk.LEFT, padx=2)

        # أزرار الإجراءات السريعة
        actions_box = tk.Frame(info_frame, bg="#FFFFFF")
        actions_box.pack(side=tk.LEFT, padx=16, pady=10)

        btn_refresh = tk.Button(actions_box, text="🔄 تحديث السجل", command=self.refresh_table, bg="#0284C7", fg="#FFFFFF", font=("Segoe UI", 9, "bold"), relief=tk.FLAT, padx=10, pady=4)
        btn_refresh.pack(side=tk.LEFT, padx=4)

        btn_open_folder = tk.Button(actions_box, text="📁 فتح مجلد البيانات", command=self.open_data_folder, bg="#E2E8F0", fg="#1E293B", font=("Segoe UI", 9), relief=tk.FLAT, padx=8, pady=4)
        btn_open_folder.pack(side=tk.LEFT, padx=4)

        btn_export = tk.Button(actions_box, text="📥 تصدير السجل", command=self.export_records, bg="#E2E8F0", fg="#1E293B", font=("Segoe UI", 9), relief=tk.FLAT, padx=8, pady=4)
        btn_export.pack(side=tk.LEFT, padx=4)

        # 3. شريط التنبيه المالي
        banner_frame = tk.Frame(self.root, bg="#FEF3C7", bd=1, relief=tk.SOLID)
        banner_frame.pack(fill=tk.X, padx=16, pady=(0, 10))
        banner_lbl = tk.Label(
            banner_frame,
            text="⚠️ تنبيه مالي: هذا البرنامج يعرض إشعارًا محولًا فقط من هاتف المدير، ولا يرتبط بمحفظة جيب مباشرة. لا تسلّم البضاعة عند وجود تعارض أو شك حتى تتأكد من التطبيق الرسمي.",
            font=("Segoe UI", 9),
            fg="#92400E",
            bg="#FEF3C7",
            padx=12,
            pady=6
        )
        banner_lbl.pack(anchor="center")

        # 4. جدول الإشعارات
        table_container = tk.Frame(self.root, bg="#FFFFFF", bd=1, relief=tk.SOLID)
        table_container.pack(fill=tk.BOTH, expand=True, padx=16, pady=(0, 10))

        columns = ("id", "sender", "sms_time", "rcv_time", "message", "status")
        self.tree = ttk.Treeview(table_container, columns=columns, show="headings", selectmode="browse")

        self.tree.heading("id", text="#")
        self.tree.heading("sender", text="رقم هاتف المدير")
        self.tree.heading("sms_time", text="وقت الإشعار الأصلي")
        self.tree.heading("rcv_time", text="وقت الاستلام بالكمبيوتر")
        self.tree.heading("message", text="نص الإشعار المنقول")
        self.tree.heading("status", text="الحالة")

        self.tree.column("id", width=50, anchor="center")
        self.tree.column("sender", width=140, anchor="center")
        self.tree.column("sms_time", width=150, anchor="center")
        self.tree.column("rcv_time", width=150, anchor="center")
        self.tree.column("message", width=380, anchor="w")
        self.tree.column("status", width=90, anchor="center")

        scrollbar = ttk.Scrollbar(table_container, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.tree.bind("<<TreeviewSelect>>", self.on_select_item)

        # 5. منطقة تفاصيل الإشعار المحدد
        detail_frame = tk.Frame(self.root, bg="#FFFFFF", bd=1, relief=tk.SOLID, height=100)
        detail_frame.pack(fill=tk.X, padx=16, pady=(0, 14))

        tk.Label(detail_frame, text="تفاصيل الإشعار المحدد (الرسالة الخام ومفتاح منع التكرار):", font=("Segoe UI", 9, "bold"), fg="#475569", bg="#FFFFFF").pack(anchor="e", padx=10, pady=(6, 2))
        self.lbl_detail_text = tk.Label(detail_frame, text="اختر إشعارًا من الجدول لعرض التفاصيل الكاملة.", font=("Consolas", 9), fg="#1E293B", bg="#F8FAFC", anchor="w", justify=tk.LEFT, padx=8, pady=6, relief=tk.SUNKEN)
        self.lbl_detail_text.pack(fill=tk.X, padx=10, pady=(0, 8))

    def toggle_token(self):
        real_token = self.config.get("pairing_token", "")
        if self.token_revealed:
            self.token_var.set("••••••••••••••••")
            self.token_revealed = False
        else:
            self.token_var.set(real_token)
            self.token_revealed = True

    def copy_token(self):
        real_token = self.config.get("pairing_token", "")
        self.root.clipboard_clear()
        self.root.clipboard_append(real_token)
        messagebox.showinfo("تم النسخ", "تم نسخ رمز الربط (Pairing Token) إلى الحافظة بنجاح.")

    def open_data_folder(self):
        try:
            if sys.platform == "win32":
                os.startfile(BASE_DIR)
            else:
                import subprocess
                subprocess.Popen(["xdg-open", BASE_DIR])
        except Exception as e:
            messagebox.showerror("خطأ", f"تعذر فتح المجلد: {e}")

    def refresh_table(self):
        for item in self.tree.get_children():
            self.tree.delete(item)

        rows = fetch_recent_deposits()
        for r in rows:
            dep_id, sender, sms_time, rcv_time, msg, raw, dedupe_key, created_at = r
            self.tree.insert("", tk.END, values=(
                dep_id,
                sender,
                sms_time or created_at,
                rcv_time or created_at,
                msg,
                "مسجل ✓"
            ), tags=(str(dep_id),))

    def on_select_item(self, event):
        selected = self.tree.selection()
        if not selected:
            return
        item = self.tree.item(selected[0])
        val = item['values']
        if val:
            dep_id = val[0]
            conn = sqlite3.connect(DB_FILE)
            cur = conn.cursor()
            cur.execute("SELECT raw_message, dedupe_key FROM deposits WHERE id = ?", (dep_id,))
            res = cur.fetchone()
            conn.close()
            if res:
                raw_msg, dedupe_key = res
                self.lbl_detail_text.config(text=f"Raw: {raw_msg}\nDedupe Key (SHA-256): {dedupe_key}")

    def on_new_deposit(self, dep_dict):
        # تشغيل نغمة تنبيه صوتية عند استقبال إشعار جديد
        self.play_chime()
        self.root.after(0, self.refresh_table)

    def play_chime(self):
        try:
            if sys.platform == "win32":
                import winsound
                winsound.MessageBeep(winsound.MB_ICONASTERISK)
            else:
                self.root.bell()
        except Exception:
            pass

    def export_records(self):
        file_path = filedialog.asksaveasfilename(
            defaultextension=".json",
            filetypes=[("JSON Files", "*.json"), ("CSV Files", "*.csv"), ("All Files", "*.*")]
        )
        if not file_path:
            return

        rows = fetch_recent_deposits(limit=1000)
        if file_path.endswith(".csv"):
            import csv
            with open(file_path, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f)
                writer.writerow(["ID", "Sender", "SMS Time", "Received At", "Message", "Raw", "Dedupe Key", "Created At"])
                for r in rows:
                    writer.writerow(r)
        else:
            records = []
            for r in rows:
                records.append({
                    "id": r[0], "sender": r[1], "sms_time": r[2], "received_at": r[3],
                    "message": r[4], "raw_message": r[5], "dedupe_key": r[6], "created_at": r[7]
                })
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(records, f, ensure_ascii=False, indent=2)

        messagebox.showinfo("تم التصدير", f"تم تصدير {len(rows)} سجل بنجاح إلى:\n{file_path}")

# --- نقطة البداية وتشغيل الخادم المزدوج ---
def run_server():
    init_db()
    config = load_or_create_config()
    server_ip = get_local_ip()
    port = config.get("port", DEFAULT_PORT)
    token = config.get("pairing_token", "")

    DepositHttpHandler.pairing_token = token

    server = HTTPServer(('0.0.0.0', port), DepositHttpHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()

    print(f"[Jeeb Deposit Bridge] الخادم المحلي يعمل على http://{server_ip}:{port}")
    print(f"[Jeeb Deposit Bridge] رمز الربط (Token): {token}")

    if TKINTER_AVAILABLE and "pytest" not in sys.modules:
        root = tk.Tk()
        gui = ReceiverGui(root, config, server_ip, port)
        DepositHttpHandler.on_new_deposit_callback = gui.on_new_deposit
        try:
            root.mainloop()
        except KeyboardInterrupt:
            pass
        finally:
            server.shutdown()
    else:
        print("[Jeeb Deposit Bridge] واجهة Tkinter غير متاحة أو تم تشغيله بدون واجهة رسومية.")
        try:
            server_thread.join()
        except KeyboardInterrupt:
            server.shutdown()

if __name__ == "__main__":
    run_server()
