export interface PythonFileItem {
  filename: string;
  language: string;
  description: string;
  content: string;
}

export const PYTHON_CODE_PACKAGE: PythonFileItem[] = [
  {
    filename: 'config.py',
    language: 'python',
    description: 'Cấu hình khung giờ chấm công, thông tin Google Sheets và IP mạng LAN',
    content: `# config.py - Cấu hình hệ thống chấm công QR Code
import os

# Khung giờ làm việc theo PRD
CHECKIN_START = "06:00:00"      # Bắt đầu nhận chấm công sáng
ON_TIME_END = "08:15:00"        # Đúng giờ: 06:00:00 - 08:15:00
LATE_END = "08:30:00"           # Đi trễ: 08:15:01 - 08:30:00 (sau mốc này là Trễ đặc biệt)
CHECKOUT_START = "16:30:00"     # Khung giờ tan ca tham khảo

# Thông tin Google Sheets
GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID", "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms")
SHEET_TAB_NAME = "CHAM_CONG"
SERVICE_ACCOUNT_FILE = "service_account.json"

# Cấu hình Mạng Nội Bộ (LAN)
SERVER_HOST = "0.0.0.0"
SERVER_PORT = 8000
ALLOWED_SUBNET_PREFIX = "192.168."  # Chỉ cho phép IP thuộc dải LAN này truy cập
`,
  },
  {
    filename: 'database.py',
    language: 'python',
    description: 'Khởi tạo SQLite, bảng users, attendance_logs, seed user mẫu và ghi nhận log',
    content: `# database.py - Thao tác cơ sở dữ liệu SQLite
import sqlite3
from datetime import datetime
import hashlib

DB_NAME = "attendance.db"

def get_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Bảng người dùng (Nhân viên)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        department TEXT,
        is_active INTEGER DEFAULT 1
    )
    """)
    
    # Bảng nhật ký chấm công (Attendance Logs)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT NOT NULL,
        full_name TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        action_type TEXT NOT NULL, -- CHECK-IN hoặc CHECK-OUT
        status TEXT NOT NULL,      -- Đúng giờ, Đi trễ, Hợp lệ, Trễ đặc biệt
        note TEXT,
        client_ip TEXT,
        synced_sheets INTEGER DEFAULT 0, -- 0: chưa sync, 1: đã sync lên Google Sheets
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    """)
    conn.commit()
    conn.close()
    seed_users()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def seed_users():
    conn = get_connection()
    cursor = conn.cursor()
    sample_users = [
        ("NV001", "123", "Nguyễn Văn An", "Kho Vận & Hậu Cần"),
        ("NV002", "123", "Trần Thị Bích", "Kế Toán & Nhân Sự"),
        ("NV003", "123", "Lê Hoàng Nam", "Kỹ Thuật & Vận Hành"),
        ("NV004", "123", "Phạm Minh Đức", "Kinh Doanh & Dự Án"),
        ("NV005", "123", "Đỗ Quỳnh Anh", "Chăm Sóc Khách Hàng"),
    ]
    for username, pwd, name, dept in sample_users:
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO users (username, password_hash, full_name, department) VALUES (?, ?, ?, ?)",
                (username, hash_password(pwd), name, dept)
            )
    conn.commit()
    conn.close()

def authenticate_user(username: str, password: str):
    conn = get_connection()
    cursor = conn.cursor()
    pwd_hash = hash_password(password)
    cursor.execute("SELECT * FROM users WHERE username = ? AND password_hash = ? AND is_active = 1", (username, pwd_hash))
    user = cursor.fetchone()
    conn.close()
    return user

def check_duplicate_today(username: str, action_type: str, date_str: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM attendance_logs WHERE username = ? AND date = ? AND action_type = ?",
        (username, date_str, action_type)
    )
    existing = cursor.fetchone()
    conn.close()
    return existing

def save_attendance_log(user_id: int, username: str, full_name: str, date_str: str, time_str: str, action_type: str, status: str, note: str = "", client_ip: str = ""):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO attendance_logs (user_id, username, full_name, date, time, action_type, status, note, client_ip, synced_sheets)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    """, (user_id, username, full_name, date_str, time_str, action_type, status, note, client_ip))
    log_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return log_id

def mark_log_synced(log_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE attendance_logs SET synced_sheets = 1 WHERE id = ?", (log_id,))
    conn.commit()
    conn.close()

def get_unsynced_logs():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM attendance_logs WHERE synced_sheets = 0 ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    return rows
`,
  },
  {
    filename: 'sheets_sync.py',
    language: 'python',
    description: 'Kết nối Google Sheets qua gspread, ghi hàng dữ liệu và xử lý hàng đợi bù khi mất mạng',
    content: `# sheets_sync.py - Đồng bộ dữ liệu chấm công lên Google Sheets
import os
import gspread
from google.oauth2.service_account import Credentials
import config
import database

# Phạm vi quyền truy cập Google Sheets & Drive
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]

def get_sheets_client():
    if not os.path.exists(config.SERVICE_ACCOUNT_FILE):
        return None
    try:
        credentials = Credentials.from_service_account_file(
            config.SERVICE_ACCOUNT_FILE,
            scopes=SCOPES
        )
        gc = gspread.authorize(credentials)
        return gc
    except Exception as e:
        print(f"[SheetsSync Error] Không thể kết nối Google: {e}")
        return None

def append_attendance_row(date_str: str, emp_code: str, full_name: str, action_type: str, time_str: str, status: str, note: str = "") -> bool:
    """
    Ghi 1 dòng dữ liệu lên file Google Sheets theo cấu trúc PRD Data Dictionary:
    Cột A: Ngày (YYYY-MM-DD)
    Cột B: Mã NV (NV001)
    Cột C: Họ và tên (Nguyễn Văn A)
    Cột D: Loại thao tác (CHECK-IN / CHECK-OUT)
    Cột E: Thời gian ghi nhận (HH:MM:SS)
    Cột F: Trạng thái (Đúng giờ / Đi trễ / Hợp lệ / Trễ đặc biệt)
    Cột G: Ghi chú (WiFi Kho / Thiết bị)
    """
    try:
        gc = get_sheets_client()
        if not gc:
            return False
            
        sheet = gc.open_by_key(config.GOOGLE_SHEET_ID).worksheet(config.SHEET_TAB_NAME)
        row = [date_str, emp_code, full_name, action_type, time_str, status, note]
        sheet.append_row(row, value_input_option="USER_ENTERED")
        print(f"[SheetsSync Success] Đã đồng bộ dòng của {emp_code} - {action_type} lên Google Sheets")
        return True
    except Exception as e:
        print(f"[SheetsSync Retry Queued] Lỗi ghi Google Sheet: {e}. Dữ liệu được giữ trong SQLite để đồng bộ sau.")
        return False

def sync_pending_queue():
    """Chạy ngầm (Background Task) để đẩy các dòng chưa đồng bộ từ SQLite lên Google Sheets"""
    unsynced = database.get_unsynced_logs()
    if not unsynced:
        return
    print(f"[Background Sync] Đang thử đẩy {len(unsynced)} bản ghi chưa đồng bộ...")
    for item in unsynced:
        success = append_attendance_row(
            date_str=item["date"],
            emp_code=item["username"],
            full_name=item["full_name"],
            action_type=item["action_type"],
            time_str=item["time"],
            status=item["status"],
            note=item["note"] or ""
        )
        if success:
            database.mark_log_synced(item["id"])
`,
  },
  {
    filename: 'main.py',
    language: 'python',
    description: 'FastAPI Backend xử lý logic nghiệp vụ, khung giờ, bảo vệ mạng LAN và giao diện Web App',
    content: `# main.py - FastAPI Server Chấm Công Nội Bộ
from fastapi import FastAPI, Request, Form, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from datetime import datetime
import config
import database
import sheets_sync

app = FastAPI(title="QR Attendance System LAN")
templates = Jinja2Templates(directory="templates")

# Khởi tạo DB khi chạy server
database.init_db()

def is_lan_ip(client_ip: str) -> bool:
    """Kiểm tra xem thiết bị có thuộc mạng LAN nội bộ công ty không"""
    if client_ip in ["127.0.0.1", "localhost", "::1"]:
        return True
    return client_ip.startswith(config.ALLOWED_SUBNET_PREFIX)

def evaluate_status(action: str, current_time_str: str) -> tuple[str, str]:
    """Đánh giá trạng thái theo khung giờ PRD"""
    if action == "CHECK-OUT":
        return "Hợp lệ", "Ghi nhận tan ca hợp lệ."
        
    t = datetime.strptime(current_time_str, "%H:%M:%S").time()
    t_start = datetime.strptime(config.CHECKIN_START, "%H:%M:%S").time()
    t_ontime = datetime.strptime(config.ON_TIME_END, "%H:%M:%S").time()
    t_late = datetime.strptime(config.LATE_END, "%H:%M:%S").time()
    
    if t_start <= t <= t_ontime:
        return "Đúng giờ", "Chúc mừng bạn đã vào ca đúng giờ!"
    elif t_ontime < t <= t_late:
        return "Đi trễ", "Bạn đã vào ca trễ so với mốc 08:15:00."
    else:
        return "Trễ đặc biệt", "Cảnh báo quá giờ quy định hoặc ngoài khung giờ chấm công."

@app.get("/checkin", response_class=HTMLResponse)
async def checkin_page(request: Request, token: str = ""):
    client_ip = request.client.host if request.client else "Unknown"
    
    # Kiểm tra IP LAN nội bộ để ngăn chặn quét QR từ ngoài văn phòng
    lan_valid = is_lan_ip(client_ip)
    
    return templates.TemplateResponse("login.html", {
        "request": request,
        "token": token,
        "client_ip": client_ip,
        "lan_valid": lan_valid,
        "server_date": datetime.now().strftime("%Y-%m-%d"),
    })

@app.post("/submit-attendance", response_class=HTMLResponse)
async def submit_attendance(
    request: Request,
    background_tasks: BackgroundTasks,
    username: str = Form(...),
    password: str = Form(...),
    action: str = Form(...), # CHECK-IN hoặc CHECK-OUT
):
    client_ip = request.client.host if request.client else "Unknown"
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    
    # 1. Kiểm tra mạng LAN
    if not is_lan_ip(client_ip):
        return templates.TemplateResponse("login.html", {
            "request": request,
            "error_msg": f"Truy cập bị từ chối: IP {client_ip} không thuộc mạng WiFi nội bộ công ty ({config.ALLOWED_SUBNET_PREFIX}*).",
            "client_ip": client_ip,
            "lan_valid": False,
        })
    
    # 2. Xác thực tài khoản & mật khẩu
    user = database.authenticate_user(username.strip(), password.strip())
    if not user:
        return templates.TemplateResponse("login.html", {
            "request": request,
            "error_msg": "Sai Mã nhân viên hoặc Mật khẩu! Vui lòng kiểm tra lại.",
            "client_ip": client_ip,
            "lan_valid": True,
        })
    
    # 3. Kiểm tra trùng lặp
    dup = database.check_duplicate_today(user["username"], action, date_str)
    if dup:
        if action == "CHECK-IN":
            err_msg = f"Bạn đã Check-in hôm nay lúc {dup['time']} ({dup['status']}). Vui lòng chọn CHECK-OUT khi kết thúc ca làm."
        else:
            err_msg = f"Bạn đã ghi nhận Check-out hôm nay lúc {dup['time']}."
        return templates.TemplateResponse("login.html", {
            "request": request,
            "error_msg": err_msg,
            "client_ip": client_ip,
            "lan_valid": True,
        })
    
    # 4. Đánh giá trạng thái
    status, status_desc = evaluate_status(action, time_str)
    note = f"WiFi Nội Bộ ({client_ip})"
    
    # 5. Lưu vào SQLite
    log_id = database.save_attendance_log(
        user_id=user["id"],
        username=user["username"],
        full_name=user["full_name"],
        date_str=date_str,
        time_str=time_str,
        action_type=action,
        status=status,
        note=note,
        client_ip=client_ip
    )
    
    # 6. Đẩy đồng bộ lên Google Sheets qua Background Task
    def background_sync_task():
        success = sheets_sync.append_attendance_row(
            date_str=date_str,
            emp_code=user["username"],
            full_name=user["full_name"],
            action_type=action,
            time_str=time_str,
            status=status,
            note=note
        )
        if success:
            database.mark_log_synced(log_id)
        # Thử đồng bộ bù các bản ghi cũ nếu có
        sheets_sync.sync_pending_queue()
        
    background_tasks.add_task(background_sync_task)
    
    # 7. Trả về màn hình thành công
    return templates.TemplateResponse("success.html", {
        "request": request,
        "full_name": user["full_name"],
        "username": user["username"],
        "action": action,
        "record_time": time_str,
        "record_date": date_str,
        "status": status,
        "status_desc": status_desc,
        "client_ip": client_ip
    })
`,
  },
  {
    filename: 'generate_qr.py',
    language: 'python',
    description: 'Script tự động dò IP LAN máy tính và xuất ảnh mã QR code dán tường',
    content: `# generate_qr.py - Tự động phát hiện IP LAN và tạo mã QR in ấn
import socket
import qrcode
from PIL import Image, ImageDraw, ImageFont
import os

def get_lan_ip():
    """Lấy IP LAN cục bộ (dạng 192.168.x.x) của máy tính đang chạy"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Không cần kết nối thật, chỉ mượn socket routing để lấy IP card mạng LAN
        s.connect(('8.8.8.8', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def generate_attendance_qr():
    ip = get_lan_ip()
    port = 8000
    qr_url = f"http://{ip}:{port}/checkin"
    
    print(f"==================================================")
    print(f"[LAN IP Phát Hiện]: {ip}")
    print(f"[Đường Dẫn Chấm Công]: {qr_url}")
    print(f"==================================================")
    
    # Tạo QR Code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=12,
        border=4,
    )
    qr.add_data(qr_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="#0F172A", back_color="#FFFFFF").convert('RGB')
    filename = "qr_checkin_lan.png"
    img.save(filename)
    print(f"-> Đã tạo mã QR thành công: '{filename}'")
    print("-> Bạn có thể in ảnh này dán tại cửa văn phòng hoặc kho công ty!")

if __name__ == "__main__":
    generate_attendance_qr()
`,
  },
  {
    filename: 'run_server.bat',
    language: 'bat',
    description: 'File khởi chạy 1 cú click trên máy tính công ty (Windows Batch)',
    content: `@echo off
title He Thong Cham Cong QR Code Mang Noi Bo
color 0A
echo =======================================================
echo     HE THONG CHAM CONG QR CODE MANG LAN CONG TY
echo =======================================================
echo.
echo 1. Dang cai dat thu vien neu chua co...
pip install -r requirements.txt
echo.
echo 2. Dang tao ma QR Code dan tuong...
python generate_qr.py
echo.
echo 3. Dang khoi chay Web Server tren host=0.0.0.0 port=8000...
echo Nhan vien co the ket noi WiFi va quet ma QR de cham cong!
echo Nhan Ctrl + C de dung server.
echo.
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
`,
  },
  {
    filename: 'requirements.txt',
    language: 'plaintext',
    description: 'Danh sách thư viện Python cần thiết',
    content: `fastapi>=0.100.0
uvicorn>=0.22.0
jinja2>=3.1.2
gspread>=5.10.0
google-auth>=2.20.0
qrcode[pil]>=7.4.2
pandas>=2.0.0
python-multipart>=0.0.6
Pillow>=10.0.0
`,
  },
  {
    filename: 'service_account.json',
    language: 'json',
    description: 'Mẫu cấu hình Google Cloud Service Account Key kết nối Google Sheets',
    content: `{
  "type": "service_account",
  "project_id": "company-attendance-system",
  "private_key_id": "d8f7b3a123456789abcdef",
  "private_key": "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC6XYZ...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "sheets-sync@company-attendance-system.iam.gserviceaccount.com",
  "client_id": "112233445566778899001",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
}`,
  },
];
