import hashlib
import hmac
import re
import secrets
import time
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta
import json
import random
import os

from fastapi.staticfiles import StaticFiles
from backend.gps_validator import validasi_gps_lengkap, KAMPUS_LAT, KAMPUS_LON, RADIUS_KAMPUS_METER
from backend.database import engine, get_db, Base
from backend import models
from backend.face_detection import proses_gambar_bytes, load_model, deteksi_wajah, crop_wajah
from backend.face_recognition import load_arcface, simpan_embedding, kenali_wajah as kenali_identitas, generate_embedding
from backend.gesture_detection import (
    generate_gesture_challenge, proses_gesture_challenge,
    load_gesture_model, INSTRUKSI_GESTURE,
    generate_gesture_challenge_registrasi,
)
from urllib.parse import urlparse
from backend.database import DATABASE_URL


TOLERANSI_MENIT = 15  # dipertahankan untuk kompatibilitas nama, TIDAK dipakai lagi sebagai jendela lebih awal

HARI_INDEX = {
    0: "Senin",
    1: "Selasa",
    2: "Rabu",
    3: "Kamis",
    4: "Jumat",
    5: "Sabtu",
    6: "Minggu",
}


def hari_ini_label() -> str:
    return HARI_INDEX[datetime.now().weekday()]


def format_telat_detik(total_detik: int) -> dict:
    if total_detik <= 0:
        return {"terlambat": False, "detik": 0, "menit": 0, "jam": 0, "teks": "Tepat waktu"}

    jam = total_detik // 3600
    sisa = total_detik % 3600
    menit = sisa // 60
    detik = sisa % 60

    bagian = []
    if jam > 0:
        bagian.append(f"{jam} jam")
    if menit > 0:
        bagian.append(f"{menit} menit")
    if detik > 0 or not bagian:
        bagian.append(f"{detik} detik")

    return {
        "terlambat": True,
        "detik": total_detik,
        "menit": total_detik // 60,
        "jam": round(total_detik / 3600, 2),
        "teks": "Terlambat " + " ".join(bagian),
    }


def generate_jam_acak(jam_mulai: str, jam_selesai: str, jumlah: int) -> list:
    """
    Generate `jumlah` waktu unik acak di antara jam_mulai dan jam_selesai.
    Sudah divalidasi: rentang waktu tidak boleh <= 0, jumlah diclamp 1-10,
    dan jumlah efektif diturunkan otomatis kalau rentang menit terlalu sempit.
    """
    fmt = "%H:%M"
    try:
        mulai = datetime.strptime(jam_mulai, fmt)
        selesai = datetime.strptime(jam_selesai, fmt)
    except (ValueError, TypeError):
        return []

    # Kelas yang menyeberang tengah malam (jarang, tapi jaga-jaga)
    if selesai <= mulai:
        selesai += timedelta(days=1)

    total_menit = int((selesai - mulai).total_seconds() / 60)
    jumlah = max(1, min(int(jumlah or 1), 10))  # clamp 1-10

    if total_menit <= 0:
        return []

    # Kalau rentang waktu terlalu sempit untuk jumlah yang diminta,
    # turunkan otomatis supaya tetap bisa menghasilkan waktu unik
    jumlah_efektif = min(jumlah, total_menit + 1)

    hasil = set()
    percobaan = 0
    batas_percobaan = max(jumlah_efektif * 50, 200)
    while len(hasil) < jumlah_efektif and percobaan < batas_percobaan:
        offset = random.randint(0, total_menit)
        waktu = mulai + timedelta(minutes=offset)
        hasil.add(waktu.strftime(fmt))
        percobaan += 1

    return sorted(hasil)


def _jadwal_to_dict(j: models.Jadwal) -> dict:
    try:
        daftar_jam = json.loads(j.daftar_jam_absensi) if j.daftar_jam_absensi else []
    except (json.JSONDecodeError, TypeError):
        daftar_jam = []

    return {
        "id": j.id,
        "id_dosen": j.id_dosen,
        "id_kelas": j.id_kelas,
        "id_mata_kuliah": j.id_mata_kuliah,
        "hari": j.hari,
        "jam": j.jam,
        "jam_mulai": j.jam_mulai,
        "jam_selesai": j.jam_selesai,
        "latitude": j.latitude,
        "longitude": j.longitude,
        "radius_meter": j.radius_meter,
        "gps_aktif": j.gps_aktif,
        "jumlah_gesture": j.jumlah_gesture,
        "mode_absensi": j.mode_absensi,
        "daftar_jam_absensi": daftar_jam,
        "jumlah_sesi_acak": j.jumlah_sesi_acak,
        "toleransi_telat_menit": j.toleransi_telat_menit,
        "aktif": j.aktif,
    }


def _pastikan_sesi_hari_ini(jadwal: models.Jadwal, id_mahasiswa: str, db: Session) -> list:
    """
    Pastikan ada row AbsensiSesi (status 'belum') untuk tiap jam_target hari ini.
    Dipanggil di awal setiap percobaan absensi supaya progres per-slot bisa dilacak.
    """
    try:
        daftar_jam = json.loads(jadwal.daftar_jam_absensi) if jadwal.daftar_jam_absensi else []
    except (json.JSONDecodeError, TypeError):
        daftar_jam = []

    if not daftar_jam:
        return []

    hari_ini = datetime.now().date()
    existing = db.query(models.AbsensiSesi).filter(
        models.AbsensiSesi.id_mahasiswa == id_mahasiswa,
        models.AbsensiSesi.id_jadwal == jadwal.id,
        func.date(models.AbsensiSesi.tanggal) == hari_ini,
    ).all()
    existing_jam = {s.jam_target for s in existing}

    ada_baru = False
    for jam in daftar_jam:
        if jam not in existing_jam:
            db.add(models.AbsensiSesi(
                id_mahasiswa=id_mahasiswa,
                id_jadwal=jadwal.id,
                tanggal=datetime.now(),
                jam_target=jam,
                status_sesi="belum",
            ))
            ada_baru = True
    if ada_baru:
        db.commit()

    return db.query(models.AbsensiSesi).filter(
        models.AbsensiSesi.id_mahasiswa == id_mahasiswa,
        models.AbsensiSesi.id_jadwal == jadwal.id,
        func.date(models.AbsensiSesi.tanggal) == hari_ini,
    ).order_by(models.AbsensiSesi.jam_target).all()


def _perbarui_kadaluarsa_dan_ambil_sesi_aktif(sesi_list: list, jadwal: models.Jadwal, now: datetime, db: Session):
    """
    Tandai 'terlewat' untuk sesi yang jendelanya sudah tertutup tanpa diselesaikan,
    lalu kembalikan (sesi_aktif, target_dt, batas_dt) untuk sesi yang SEDANG bisa dikerjakan.

    Jendela sesi ke-i: [target_dt[i], target_dt[i+1] atau jam_selesai kelas).
    TIDAK ADA jendela lebih awal — sesi baru "aktif" begitu now >= target_dt.
    """
    berubah = False
    sesi_aktif = None

    for i, sesi in enumerate(sesi_list):
        h, m = map(int, sesi.jam_target.split(":"))
        target_dt = now.replace(hour=h, minute=m, second=0, microsecond=0)

        if i + 1 < len(sesi_list):
            hh, mm = map(int, sesi_list[i + 1].jam_target.split(":"))
            batas_dt = now.replace(hour=hh, minute=mm, second=0, microsecond=0)
        elif jadwal.jam_selesai:
            hh, mm = map(int, jadwal.jam_selesai.split(":"))
            batas_dt = now.replace(hour=hh, minute=mm, second=0, microsecond=0)
            if batas_dt <= target_dt:
                batas_dt += timedelta(hours=2)
        else:
            batas_dt = target_dt + timedelta(hours=2)

        if sesi.status_sesi == "belum":
            if now >= batas_dt:
                sesi.status_sesi = "terlewat"
                berubah = True
            elif now >= target_dt - timedelta(minutes=2) and sesi_aktif is None:
                sesi_aktif = (sesi, target_dt, batas_dt)

    if berubah:
        db.commit()

    return sesi_aktif


def _tentukan_status_final(sesi_list: list) -> tuple[str, int, str]:
    sesi_terlewat = [i for i, s in enumerate(sesi_list, start=1) if s.status_sesi == "terlewat"]
    sesi_telat = [i for i, s in enumerate(sesi_list, start=1) if s.status_sesi == "telat"]

    if len(sesi_terlewat) == len(sesi_list):
        status_final = "tidak_hadir"
    elif sesi_terlewat or sesi_telat:
        status_final = "terlambat"
    else:
        status_final = "hadir"

    total_telat_detik = sum(s.telat_detik or 0 for s in sesi_list)

    catatan_bagian = []
    if sesi_terlewat:
        catatan_bagian.append(f"tidak melakukan absensi pada sesi {', '.join(f'ke-{n}' for n in sesi_terlewat)}")
    if sesi_telat:
        catatan_bagian.append(f"terlambat pada sesi {', '.join(f'ke-{n}' for n in sesi_telat)}")
    catatan_final = "; ".join(catatan_bagian) if catatan_bagian else "Semua sesi diselesaikan tepat waktu"

    return status_final, total_telat_detik, catatan_final


def _simpan_absensi_final(
    id_mahasiswa: str, id_jadwal: int, jadwal: models.Jadwal, sesi_list: list, now: datetime, db: Session,
    confidence: float | None = None, latitude: float | None = None, longitude: float | None = None,
):
    status_final, total_telat_detik, catatan_final = _tentukan_status_final(sesi_list)

    absensi_existing = db.query(models.Absensi).filter(
        models.Absensi.id_mahasiswa == id_mahasiswa,
        models.Absensi.id_jadwal == id_jadwal,
        func.date(models.Absensi.tanggal_absensi) == now.date(),
    ).first()

    if absensi_existing:
        absensi_baru = absensi_existing
        absensi_baru.status = status_final
        absensi_baru.telat_detik = total_telat_detik
        if confidence is not None:
            absensi_baru.confidence = confidence
        if latitude is not None:
            absensi_baru.latitude = latitude
        if longitude is not None:
            absensi_baru.longitude = longitude
    else:
        absensi_baru = models.Absensi(
            id_mahasiswa=id_mahasiswa,
            id_jadwal=id_jadwal,
            id_mata_kuliah=jadwal.id_mata_kuliah,
            jam_target=sesi_list[0].jam_target,
            latitude=latitude,
            longitude=longitude,
            lokasi_valid=(confidence is not None),
            confidence=confidence,
            status=status_final,
            telat_detik=total_telat_detik,
        )
        db.add(absensi_baru)

    db.commit()
    db.refresh(absensi_baru)
    return absensi_baru, status_final, catatan_final


def _pastikan_finalisasi_hari_ini(jadwal: models.Jadwal, id_mahasiswa: str, now: datetime, db: Session):
    """
    Idempotent. Pastikan sesi hari ini ada, tandai yang kadaluarsa 'terlewat',
    dan kalau SEMUA sesi sudah resolved (hadir/telat/terlewat), langsung
    tulis/perbarui baris final di tabel Absensi -- termasuk kasus tidak_hadir
    walau mahasiswa TIDAK PERNAH mencoba absen sama sekali.
    """
    sesi_list = _pastikan_sesi_hari_ini(jadwal, id_mahasiswa, db)
    if not sesi_list:
        return None

    hasil_aktif = _perbarui_kadaluarsa_dan_ambil_sesi_aktif(sesi_list, jadwal, now, db)

    if hasil_aktif is None and all(s.status_sesi != "belum" for s in sesi_list):
        _simpan_absensi_final(id_mahasiswa, jadwal.id, jadwal, sesi_list, now, db)

    return hasil_aktif


def _auto_finalisasi_kelas(jadwal: models.Jadwal, db: Session, now: datetime | None = None):
    """
    Jalankan finalisasi untuk SEMUA mahasiswa approved di kelas jadwal ini.
    Dipanggil dari endpoint dashboard/riwayat supaya mahasiswa yang tidak
    pernah membuka halaman absen tetap otomatis tercatat Alfa begitu
    jendela sesi lewat -- pengganti cron job.
    """
    now = now or datetime.now()
    if jadwal.hari != HARI_INDEX[now.weekday()] or not jadwal.id_kelas:
        return

    anggota = db.query(models.KelasMahasiswa).filter(
        models.KelasMahasiswa.id_kelas == jadwal.id_kelas,
        models.KelasMahasiswa.status == "approved",
    ).all()

    for a in anggota:
        try:
            _pastikan_finalisasi_hari_ini(jadwal, a.id_mahasiswa, now, db)
        except Exception:
            db.rollback()


Base.metadata.create_all(bind=engine)

load_model()
load_arcface()
load_gesture_model()

app = FastAPI(
    title="Smart Attendance System",
    description="Sistem absensi otomatis berbasis computer vision",
    version="3.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://smart-attendance-system-roan-two.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads/profil"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

EKSTENSI_FOTO_DIIZINKAN = {".jpg", ".jpeg", ".png", ".webp"}

BASE_URL = "https://Adrian3312401110-smart-attendance-backend.hf.space"


def _url_foto(path_relatif: str | None) -> str | None:
    if not path_relatif:
        return None
    return f"{BASE_URL}/{path_relatif}"


class RegisterRequest(BaseModel):
    email: str
    password: str
    role: str
    user_id: str
    nama: str
    angkatan: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class ChangePasswordRequest(BaseModel):
    email: str
    password_lama: str
    password_baru: str


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return salt.hex() + ":" + derived.hex()


def verify_password(password: str, password_hash: str) -> bool:
    salt_hex, hash_hex = password_hash.split(":", 1)
    salt = bytes.fromhex(salt_hex)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return hmac.compare_digest(derived.hex(), hash_hex)


# Domain email yang diizinkan — typo sekecil apapun akan ditolak
DOMAIN_EMAIL_DIIZINKAN = {"gmail.com", "polibatam.ac.id"}

def validate_email_domain(email: str) -> str | None:
    """
    Validasi format dan domain email secara ketat.
    Kembalikan pesan error (str) jika tidak valid, atau None jika valid.
    """
    email = email.strip().lower()

    # Cek format dasar: harus ada tepat 1 '@' dan bagian setelahnya
    if email.count("@") != 1:
        return "Format email tidak valid (harus mengandung satu karakter '@')"

    local_part, domain = email.split("@", 1)

    if not local_part:
        return "Bagian nama pada email tidak boleh kosong"

    # Cek domain secara eksak
    if domain not in DOMAIN_EMAIL_DIIZINKAN:
        domain_list = ", ".join(sorted(DOMAIN_EMAIL_DIIZINKAN))
        return (
            f"Domain email '{domain}' tidak diizinkan. "
            f"Hanya email dengan domain berikut yang diterima: {domain_list}"
        )

    return None



# ===================== ROOT / HEALTH =====================

@app.get("/")
def homepage():
    return {
        "aplikasi": "Smart Attendance System",
        "versi": "3.2",
        "status": "berjalan",
        "database": "PostgreSQL",
        "ai_model": "YOLO11n-face (loaded)"
    }


@app.get("/debug/db-info")
def debug_db_info():
    parsed = urlparse(DATABASE_URL)
    return {
        "scheme": parsed.scheme,
        "host": parsed.hostname,
        "port": parsed.port,
        "database": parsed.path.lstrip("/"),
        "user": parsed.username,
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


# ===================== AUTH =====================

@app.post("/auth/register")
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if not email or not payload.password or not payload.user_id or not payload.nama:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Semua field wajib diisi"})

    email_error = validate_email_domain(email)
    if email_error:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": email_error})

    existing = db.query(models.UserAccount).filter(models.UserAccount.email == email).first()
    if existing:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Email sudah terdaftar"})

    if payload.role not in {"mahasiswa", "dosen"}:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Role tidak valid"})

    if len(payload.password) < 12 or not re.search(r"[^A-Za-z0-9]", payload.password):
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Password minimal 12 karakter dan mengandung 1 simbol unik"})

    if payload.role == "mahasiswa":
        mahasiswa = db.query(models.Mahasiswa).filter(models.Mahasiswa.id_mahasiswa == payload.user_id).first()
        if not mahasiswa:
            mahasiswa = models.Mahasiswa(
                id_mahasiswa=payload.user_id,
                nama_mahasiswa=payload.nama,
                email=email,
                angkatan=payload.angkatan,
            )
            db.add(mahasiswa)
        else:
            mahasiswa.nama_mahasiswa = payload.nama
            mahasiswa.email = email
            if payload.angkatan:
                mahasiswa.angkatan = payload.angkatan
    else:
        dosen = db.query(models.Dosen).filter(models.Dosen.id_dosen == payload.user_id).first()
        if not dosen:
            dosen = models.Dosen(id_dosen=payload.user_id, nama_dosen=payload.nama, email=email)
            db.add(dosen)
        else:
            dosen.nama_dosen = payload.nama
            dosen.email = email

    account = models.UserAccount(
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        user_id=payload.user_id,
        nama=payload.nama,
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    return {
        "berhasil": True,
        "pesan": "Akun berhasil dibuat",
        "user": {"id": account.user_id, "name": account.nama, "email": account.email, "role": account.role},
    }


@app.post("/auth/register-with-face")
async def register_user_with_face(
    nama: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    user_id: str = Form(...),
    angkatan: str = Form(None),
    foto_list: List[UploadFile] = File(default_factory=list),
    db: Session = Depends(get_db),
):
    email = email.strip().lower()
    if not email or not password or not user_id or not nama:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Semua field wajib diisi"})

    email_error = validate_email_domain(email)
    if email_error:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": email_error})

    existing = db.query(models.UserAccount).filter(models.UserAccount.email == email).first()
    if existing:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Email sudah terdaftar"})

    if role not in {"mahasiswa", "dosen"}:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Role tidak valid"})

    if len(password) < 12 or not re.search(r"[^A-Za-z0-9]", password):
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Password minimal 12 karakter dan mengandung 1 simbol unik"})

    if role == "mahasiswa" and len(foto_list) < 3:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Ambil minimal 3 sampel wajah untuk akun mahasiswa"})

    if role == "mahasiswa":
        mahasiswa = db.query(models.Mahasiswa).filter(models.Mahasiswa.id_mahasiswa == user_id).first()
        if not mahasiswa:
            mahasiswa = models.Mahasiswa(
                id_mahasiswa=user_id,
                nama_mahasiswa=nama,
                email=email,
                angkatan=angkatan,
            )
            db.add(mahasiswa)
        else:
            mahasiswa.nama_mahasiswa = nama
            mahasiswa.email = email
            if angkatan:
                mahasiswa.angkatan = angkatan
    else:
        dosen = db.query(models.Dosen).filter(models.Dosen.id_dosen == user_id).first()
        if not dosen:
            dosen = models.Dosen(id_dosen=user_id, nama_dosen=nama, email=email)
            db.add(dosen)
        else:
            dosen.nama_dosen = nama
            dosen.email = email

    validated_samples = []
    for sample in foto_list:
        isi_file = await sample.read()
        embedding, error = generate_embedding(isi_file)
        if embedding is None:
            return JSONResponse(status_code=400, content={"berhasil": False, "pesan": f"Gagal memproses sampel wajah: {error}"})
        validated_samples.append((sample, isi_file))

    account = models.UserAccount(
        email=email,
        password_hash=hash_password(password),
        role=role,
        user_id=user_id,
        nama=nama,
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    for index, (sample, isi_file) in enumerate(validated_samples, start=1):
        path_foto = f"foto_wajah/{user_id}/{user_id}_sample_{index}.jpg"
        result = simpan_embedding(
            id_mahasiswa=user_id,
            id_foto=f"{user_id}_sample_{index}",
            path_foto=path_foto,
            image_bytes=isi_file,
            db=db,
        )
        if not result.get("berhasil", False):
            return JSONResponse(status_code=400, content={"berhasil": False, "pesan": result.get("pesan", "Gagal menyimpan sampel wajah")})

    return {
        "berhasil": True,
        "pesan": "Akun berhasil dibuat dan wajah berhasil didaftarkan",
        "user": {"id": account.user_id, "name": account.nama, "email": account.email, "role": account.role},
    }


@app.post("/auth/login")
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if not email or not payload.password:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Email dan password wajib diisi"})

    email_error = validate_email_domain(email)
    if email_error:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": email_error})

    account = db.query(models.UserAccount).filter(models.UserAccount.email == email).first()
    if not account or not verify_password(payload.password, account.password_hash):
        return JSONResponse(status_code=401, content={"berhasil": False, "pesan": "Email atau password salah"})

    return {
        "berhasil": True,
        "pesan": "Login berhasil",
        "user": {"id": account.user_id, "name": account.nama, "email": account.email, "role": account.role},
    }


@app.post("/auth/change-password")
def change_password(payload: ChangePasswordRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if not email or not payload.password_lama or not payload.password_baru:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Semua field wajib diisi"})

    account = db.query(models.UserAccount).filter(models.UserAccount.email == email).first()
    if not account:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Akun tidak ditemukan"})

    if not verify_password(payload.password_lama, account.password_hash):
        return JSONResponse(status_code=401, content={"berhasil": False, "pesan": "Password lama salah"})

    if len(payload.password_baru) < 12 or not re.search(r"[^A-Za-z0-9]", payload.password_baru):
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Password baru minimal 12 karakter dan mengandung 1 simbol unik"})

    if payload.password_lama == payload.password_baru:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Password baru tidak boleh sama dengan password lama"})

    account.password_hash = hash_password(payload.password_baru)
    db.commit()

    return {"berhasil": True, "pesan": "Password berhasil diubah"}


# ===================== DOSEN =====================

@app.post("/dosen")
def tambah_dosen(
    id_dosen: str = Form(...),
    nama_dosen: str = Form(...),
    email: str = Form(None),
    db: Session = Depends(get_db)
):
    ada = db.query(models.Dosen).filter(models.Dosen.id_dosen == id_dosen).first()
    if ada:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": f"ID Dosen {id_dosen} sudah terdaftar"})

    baru = models.Dosen(id_dosen=id_dosen, nama_dosen=nama_dosen, email=email)
    db.add(baru)
    db.commit()
    db.refresh(baru)

    return {"berhasil": True, "pesan": f"Dosen {nama_dosen} berhasil didaftarkan", "data": {"id_dosen": baru.id_dosen, "nama_dosen": baru.nama_dosen}}


@app.get("/dosen")
def lihat_dosen(db: Session = Depends(get_db)):
    semua = db.query(models.Dosen).all()
    return {"total": len(semua), "data": [{"id_dosen": d.id_dosen, "nama_dosen": d.nama_dosen, "email": d.email} for d in semua]}


@app.put("/dosen/{id_dosen}")
def update_dosen(
    id_dosen: str,
    nama_dosen: str = Form(...),
    email: str = Form(None),
    db: Session = Depends(get_db)
):
    dosen = db.query(models.Dosen).filter(models.Dosen.id_dosen == id_dosen).first()
    if not dosen:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Dosen tidak ditemukan"})

    dosen.nama_dosen = nama_dosen
    dosen.email = email
    db.commit()
    db.refresh(dosen)

    return {
        "berhasil": True,
        "pesan": "Profil berhasil diperbarui",
        "data": {"id_dosen": dosen.id_dosen, "nama_dosen": dosen.nama_dosen, "email": dosen.email}
    }


@app.get("/dosen/{id_dosen}")
def lihat_satu_dosen(id_dosen: str, db: Session = Depends(get_db)):
    dosen = db.query(models.Dosen).filter(models.Dosen.id_dosen == id_dosen).first()
    if not dosen:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Dosen tidak ditemukan"})
    return {
        "id_dosen": dosen.id_dosen,
        "nama_dosen": dosen.nama_dosen,
        "email": dosen.email,
        "foto_url": _url_foto(dosen.foto_profil),
    }


@app.post("/dosen/{id_dosen}/foto")
async def upload_foto_dosen(id_dosen: str, foto: UploadFile = File(...), db: Session = Depends(get_db)):
    dosen = db.query(models.Dosen).filter(models.Dosen.id_dosen == id_dosen).first()
    if not dosen:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Dosen tidak ditemukan"})

    ekstensi = os.path.splitext(foto.filename or "")[1].lower() or ".jpg"
    if ekstensi not in EKSTENSI_FOTO_DIIZINKAN:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Format file harus jpg, jpeg, png, atau webp"})

    isi = await foto.read()
    if len(isi) > 5 * 1024 * 1024:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Ukuran foto maksimal 5MB"})

    nama_file = f"dosen_{id_dosen}{ekstensi}"
    path_disk = os.path.join(UPLOAD_DIR, nama_file)
    with open(path_disk, "wb") as f:
        f.write(isi)

    dosen.foto_profil = f"{UPLOAD_DIR}/{nama_file}"
    db.commit()
    db.refresh(dosen)

    return {
        "berhasil": True,
        "pesan": "Foto profil berhasil diperbarui",
        "foto_url": _url_foto(dosen.foto_profil),
    }


@app.delete("/mahasiswa/{id_mahasiswa}")
def delete_mahasiswa(id_mahasiswa: str, db: Session = Depends(get_db)):
    mhs = db.query(models.Mahasiswa).filter(models.Mahasiswa.id_mahasiswa == id_mahasiswa).first()
    if not mhs:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Mahasiswa tidak ditemukan"})

    # Hapus dari tabel mahasiswa
    db.delete(mhs)

    # Hapus akun login (jika ada)
    account = db.query(models.UserAccount).filter(
        models.UserAccount.user_id == id_mahasiswa, 
        models.UserAccount.role == "mahasiswa"
    ).first()
    if account:
        db.delete(account)

    db.commit()

    return {
        "berhasil": True,
        "pesan": "Data mahasiswa berhasil dihapus"
    }


# ===================== DOSEN & MATA KULIAH =====================

@app.post("/mata-kuliah")
def tambah_mata_kuliah(
    id_mata_kuliah: str = Form(...),
    nama: str = Form(...),
    sks: int = Form(None),
    db: Session = Depends(get_db)
):
    ada = db.query(models.MataKuliah).filter(models.MataKuliah.id_mata_kuliah == id_mata_kuliah).first()
    if ada:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": f"Mata kuliah {id_mata_kuliah} sudah ada"})

    baru = models.MataKuliah(id_mata_kuliah=id_mata_kuliah, nama=nama, sks=sks)
    db.add(baru)
    db.commit()
    db.refresh(baru)

    return {"berhasil": True, "pesan": f"Mata kuliah {nama} berhasil ditambahkan", "data": {"id_mata_kuliah": baru.id_mata_kuliah, "nama": baru.nama}}


@app.get("/mata-kuliah")
def lihat_mata_kuliah(db: Session = Depends(get_db)):
    semua = db.query(models.MataKuliah).all()
    return {"total": len(semua), "data": [{"id_mata_kuliah": m.id_mata_kuliah, "nama": m.nama, "sks": m.sks} for m in semua]}


@app.put("/mata-kuliah/{id_mata_kuliah}")
def update_mata_kuliah(
    id_mata_kuliah: str,
    nama: str = Form(...),
    sks: int = Form(None),
    db: Session = Depends(get_db)
):
    mk = db.query(models.MataKuliah).filter(models.MataKuliah.id_mata_kuliah == id_mata_kuliah).first()
    if not mk:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Mata kuliah tidak ditemukan"})

    mk.nama = nama
    mk.sks = sks
    db.commit()
    db.refresh(mk)

    return {
        "berhasil": True,
        "pesan": "Mata kuliah berhasil diperbarui",
        "data": {"id_mata_kuliah": mk.id_mata_kuliah, "nama": mk.nama, "sks": mk.sks}
    }


@app.delete("/mata-kuliah/{id_mata_kuliah}")
def hapus_mata_kuliah(id_mata_kuliah: str, db: Session = Depends(get_db)):
    mk = db.query(models.MataKuliah).filter(models.MataKuliah.id_mata_kuliah == id_mata_kuliah).first()
    if not mk:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Mata kuliah tidak ditemukan"})

    dipakai = db.query(models.Jadwal).filter(models.Jadwal.id_mata_kuliah == id_mata_kuliah).count()
    if dipakai > 0:
        return JSONResponse(status_code=400, content={
            "berhasil": False,
            "pesan": f"Tidak bisa dihapus — mata kuliah ini masih dipakai di {dipakai} jadwal kelas"
        })

    db.delete(mk)
    db.commit()
    return {"berhasil": True, "pesan": "Mata kuliah berhasil dihapus"}


@app.get("/mata-kuliah/{id_mata_kuliah}/kelas")
def lihat_kelas_per_matkul(id_mata_kuliah: str, id_dosen: str = None, db: Session = Depends(get_db)):
    mk = db.query(models.MataKuliah).filter(models.MataKuliah.id_mata_kuliah == id_mata_kuliah).first()
    if not mk:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Mata kuliah tidak ditemukan"})

    query = db.query(models.Jadwal).filter(models.Jadwal.id_mata_kuliah == id_mata_kuliah)
    if id_dosen:
        query = query.filter(models.Jadwal.id_dosen == id_dosen)
    jadwal_list = query.all()

    hasil = []
    for j in jadwal_list:
        kelas = db.query(models.Kelas).filter(models.Kelas.id == j.id_kelas).first()
        dosen = db.query(models.Dosen).filter(models.Dosen.id_dosen == j.id_dosen).first()

        total_approved = 0
        total_pending = 0
        if kelas:
            total_approved = db.query(models.KelasMahasiswa).filter(
                models.KelasMahasiswa.id_kelas == kelas.id,
                models.KelasMahasiswa.status == "approved"
            ).count()
            total_pending = db.query(models.KelasMahasiswa).filter(
                models.KelasMahasiswa.id_kelas == kelas.id,
                models.KelasMahasiswa.status == "pending"
            ).count()

        hasil.append({
            "id_jadwal": j.id,
            "id_kelas": kelas.id if kelas else None,
            "nama_kelas": kelas.nama if kelas else "Belum terhubung ke kelas",
            "kode_gabung": kelas.kode_gabung if kelas else None,
            "nama_dosen": dosen.nama_dosen if dosen else j.id_dosen,
            "hari": j.hari,
            "jam": j.jam,
            "aktif": j.aktif,
            "total_mahasiswa": total_approved,
            "total_pending": total_pending,
        })

    return {"mata_kuliah": mk.nama, "id_mata_kuliah": mk.id_mata_kuliah, "total": len(hasil), "data": hasil}


# ===================== JADWAL =====================

@app.post("/jadwal")
def tambah_jadwal(
    id_dosen: str = Form(...),
    id_kelas: int = Form(...),
    id_mata_kuliah: str = Form(...),
    hari: str = Form(...),
    jam_mulai: str = Form(...),
    jam_selesai: str = Form(...),
    toleransi_telat_menit: int = Form(30),
    latitude: float = Form(...),
    longitude: float = Form(...),
    radius_meter: int = Form(200),
    gps_aktif: bool = Form(True),
    jumlah_gesture: int = Form(3),
    mode_absensi: str = Form("tetap"),
    daftar_jam_absensi: str = Form("[]"),
    jumlah_sesi_acak: int = Form(1),
    db: Session = Depends(get_db)
):
    dosen = db.query(models.Dosen).filter(models.Dosen.id_dosen == id_dosen).first()
    if not dosen:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": f"Dosen {id_dosen} tidak ditemukan"})

    kelas = db.query(models.Kelas).filter(
        models.Kelas.id == id_kelas, models.Kelas.id_dosen == id_dosen
    ).first()
    if not kelas:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Kelas tidak ditemukan"})

    mk = db.query(models.MataKuliah).filter(models.MataKuliah.id_mata_kuliah == id_mata_kuliah).first()
    if not mk:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": f"Mata kuliah {id_mata_kuliah} tidak ditemukan"})

    jumlah_sesi_acak = max(1, min(int(jumlah_sesi_acak or 1), 10))

    if mode_absensi == "acak":
        jam_list = generate_jam_acak(jam_mulai, jam_selesai, jumlah_sesi_acak)
    else:
        try:
            jam_list = json.loads(daftar_jam_absensi)
        except (json.JSONDecodeError, TypeError):
            jam_list = []

    baru = models.Jadwal(
        id_dosen=id_dosen,
        id_kelas=id_kelas,
        id_mata_kuliah=id_mata_kuliah,
        hari=hari,
        jam=f"{jam_mulai} - {jam_selesai}",
        jam_mulai=jam_mulai,
        jam_selesai=jam_selesai,
        toleransi_telat_menit=max(0, toleransi_telat_menit),
        latitude=latitude,
        longitude=longitude,
        radius_meter=radius_meter,
        gps_aktif=gps_aktif,
        jumlah_gesture=max(1, min(3, jumlah_gesture)),
        mode_absensi=mode_absensi,
        daftar_jam_absensi=json.dumps(jam_list),
        jumlah_sesi_acak=jumlah_sesi_acak,
        aktif=True,
    )
    db.add(baru)
    db.commit()
    db.refresh(baru)

    return {"berhasil": True, "pesan": "Jadwal berhasil ditambahkan", "data": _jadwal_to_dict(baru)}


@app.put("/jadwal/{id_jadwal}")
def update_jadwal(
    id_jadwal: int,
    id_kelas: int = Form(...),
    id_mata_kuliah: str = Form(...),
    hari: str = Form(...),
    jam_mulai: str = Form(...),
    jam_selesai: str = Form(...),
    toleransi_telat_menit: int = Form(30),
    latitude: float = Form(...),
    longitude: float = Form(...),
    radius_meter: int = Form(200),
    gps_aktif: bool = Form(True),
    jumlah_gesture: int = Form(3),
    mode_absensi: str = Form("tetap"),
    daftar_jam_absensi: str = Form("[]"),
    jumlah_sesi_acak: int = Form(1),
    db: Session = Depends(get_db)
):
    jadwal = db.query(models.Jadwal).filter(models.Jadwal.id == id_jadwal).first()
    if not jadwal:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Jadwal tidak ditemukan"})

    kelas = db.query(models.Kelas).filter(
        models.Kelas.id == id_kelas, models.Kelas.id_dosen == jadwal.id_dosen
    ).first()
    if not kelas:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Kelas tidak ditemukan"})

    mk = db.query(models.MataKuliah).filter(models.MataKuliah.id_mata_kuliah == id_mata_kuliah).first()
    if not mk:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": f"Mata kuliah {id_mata_kuliah} tidak ditemukan"})

    jumlah_sesi_acak = max(1, min(int(jumlah_sesi_acak or 1), 10))

    if mode_absensi == "acak":
        jam_list = generate_jam_acak(jam_mulai, jam_selesai, jumlah_sesi_acak)
    else:
        try:
            jam_list = json.loads(daftar_jam_absensi)
        except (json.JSONDecodeError, TypeError):
            jam_list = []

    jadwal.id_kelas = id_kelas
    jadwal.id_mata_kuliah = id_mata_kuliah
    jadwal.hari = hari
    jadwal.jam = f"{jam_mulai} - {jam_selesai}"
    jadwal.jam_mulai = jam_mulai
    jadwal.jam_selesai = jam_selesai
    jadwal.toleransi_telat_menit = max(0, toleransi_telat_menit)
    jadwal.latitude = latitude
    jadwal.longitude = longitude
    jadwal.radius_meter = radius_meter
    jadwal.gps_aktif = gps_aktif
    jadwal.jumlah_gesture = max(1, min(3, jumlah_gesture))
    jadwal.mode_absensi = mode_absensi
    jadwal.daftar_jam_absensi = json.dumps(jam_list)
    jadwal.jumlah_sesi_acak = jumlah_sesi_acak

    db.commit()
    db.refresh(jadwal)

    return {"berhasil": True, "pesan": "Jadwal berhasil diperbarui", "data": _jadwal_to_dict(jadwal)}


@app.put("/jadwal/{id_jadwal}/lokasi")
def update_lokasi_jadwal(
    id_jadwal: int,
    latitude: float = Form(...),
    longitude: float = Form(...),
    radius_meter: int = Form(200),
    db: Session = Depends(get_db)
):
    jadwal = db.query(models.Jadwal).filter(models.Jadwal.id == id_jadwal).first()
    if not jadwal:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Jadwal tidak ditemukan"})

    jadwal.latitude = latitude
    jadwal.longitude = longitude
    jadwal.radius_meter = radius_meter
    db.commit()
    db.refresh(jadwal)

    return {"berhasil": True, "pesan": "Lokasi jadwal berhasil diperbarui", "data": _jadwal_to_dict(jadwal)}


@app.put("/jadwal/{id_jadwal}/toggle-aktif")
def toggle_aktif_jadwal(id_jadwal: int, aktif: bool = Form(...), db: Session = Depends(get_db)):
    jadwal = db.query(models.Jadwal).filter(models.Jadwal.id == id_jadwal).first()
    if not jadwal:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Jadwal tidak ditemukan"})
    jadwal.aktif = aktif
    db.commit()
    db.refresh(jadwal)
    return {"berhasil": True, "pesan": "Status jadwal diperbarui", "data": _jadwal_to_dict(jadwal)}


@app.get("/jadwal")
def lihat_jadwal(db: Session = Depends(get_db)):
    semua = db.query(models.Jadwal).all()
    return {
        "total": len(semua),
        "data": [_jadwal_to_dict(j) for j in semua]
    }


@app.get("/jadwal/detail")
def lihat_jadwal_detail(db: Session = Depends(get_db)):
    semua = db.query(models.Jadwal).all()
    for j in semua:
        _auto_finalisasi_kelas(j, db)
    hasil = []
    for j in semua:
        dosen = db.query(models.Dosen).filter(models.Dosen.id_dosen == j.id_dosen).first()
        mk = db.query(models.MataKuliah).filter(models.MataKuliah.id_mata_kuliah == j.id_mata_kuliah).first()
        kelas = db.query(models.Kelas).filter(models.Kelas.id == j.id_kelas).first()
        data = _jadwal_to_dict(j)
        data["nama_dosen"] = dosen.nama_dosen if dosen else j.id_dosen
        data["nama_mata_kuliah"] = mk.nama if mk else j.id_mata_kuliah
        data["nama_kelas"] = kelas.nama if kelas else None
        hasil.append(data)
    return {"total": len(hasil), "data": hasil}


@app.delete("/jadwal/{id_jadwal}")
def hapus_jadwal(id_jadwal: int, db: Session = Depends(get_db)):
    jadwal = db.query(models.Jadwal).filter(models.Jadwal.id == id_jadwal).first()
    if not jadwal:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Jadwal tidak ditemukan"})

    # AbsensiSesi juga punya foreign key ke jadwal.id -> harus dibersihkan
    # dulu sebelum jadwal dihapus, kalau tidak DELETE akan gagal (FK constraint).
    db.query(models.AbsensiSesi).filter(models.AbsensiSesi.id_jadwal == id_jadwal).delete()
    db.query(models.Absensi).filter(models.Absensi.id_jadwal == id_jadwal).delete()
    db.delete(jadwal)
    db.commit()

    return {"berhasil": True, "pesan": "Jadwal dan riwayat absensi terkait berhasil dihapus"}


# ===================== MAHASISWA =====================

@app.post("/mahasiswa")
def tambah_mahasiswa(
    id_mahasiswa: str = Form(...),
    nama_mahasiswa: str = Form(...),
    email: str = Form(None),
    angkatan: str = Form(None),
    db: Session = Depends(get_db)
):
    ada = db.query(models.Mahasiswa).filter(models.Mahasiswa.id_mahasiswa == id_mahasiswa).first()
    if ada:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": f"ID {id_mahasiswa} sudah terdaftar"})

    baru = models.Mahasiswa(id_mahasiswa=id_mahasiswa, nama_mahasiswa=nama_mahasiswa, email=email, angkatan=angkatan)
    db.add(baru)
    db.commit()
    db.refresh(baru)

    return {"berhasil": True, "pesan": f"Mahasiswa {nama_mahasiswa} berhasil didaftarkan", "data": {"id_mahasiswa": baru.id_mahasiswa, "nama_mahasiswa": baru.nama_mahasiswa, "angkatan": baru.angkatan}}


@app.get("/mahasiswa")
def lihat_mahasiswa(db: Session = Depends(get_db)):
    semua = db.query(models.Mahasiswa).order_by(models.Mahasiswa.dibuat_pada.desc()).all()
    return {
        "total": len(semua),
        "data": [
            {
                "id_mahasiswa": m.id_mahasiswa,
                "nama_mahasiswa": m.nama_mahasiswa,
                "email": m.email,
                "angkatan": m.angkatan,
                "dibuat_pada": str(m.dibuat_pada) if m.dibuat_pada else None,
                "foto_url": _url_foto(m.foto_profil),
            }
            for m in semua
        ]
    }


@app.get("/mahasiswa/{id_mahasiswa}")
def lihat_satu_mahasiswa(id_mahasiswa: str, db: Session = Depends(get_db)):
    mhs = db.query(models.Mahasiswa).filter(models.Mahasiswa.id_mahasiswa == id_mahasiswa).first()
    if not mhs:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Mahasiswa tidak ditemukan"})
    return {
        "id_mahasiswa": mhs.id_mahasiswa,
        "nama_mahasiswa": mhs.nama_mahasiswa,
        "angkatan": mhs.angkatan,
        "email": mhs.email,
        "foto_url": _url_foto(mhs.foto_profil),
    }


@app.post("/mahasiswa/{id_mahasiswa}/foto")
async def upload_foto_mahasiswa(id_mahasiswa: str, foto: UploadFile = File(...), db: Session = Depends(get_db)):
    mhs = db.query(models.Mahasiswa).filter(models.Mahasiswa.id_mahasiswa == id_mahasiswa).first()
    if not mhs:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Mahasiswa tidak ditemukan"})

    ekstensi = os.path.splitext(foto.filename or "")[1].lower() or ".jpg"
    if ekstensi not in EKSTENSI_FOTO_DIIZINKAN:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Format file harus jpg, jpeg, png, atau webp"})

    isi = await foto.read()
    if len(isi) > 5 * 1024 * 1024:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Ukuran foto maksimal 5MB"})

    nama_file = f"mhs_{id_mahasiswa}{ekstensi}"
    path_disk = os.path.join(UPLOAD_DIR, nama_file)
    with open(path_disk, "wb") as f:
        f.write(isi)

    mhs.foto_profil = f"{UPLOAD_DIR}/{nama_file}"
    db.commit()
    db.refresh(mhs)

    return {
        "berhasil": True,
        "pesan": "Foto profil berhasil diperbarui",
        "foto_url": _url_foto(mhs.foto_profil),
    }


@app.put("/mahasiswa/{id_mahasiswa}")
def update_mahasiswa(
    id_mahasiswa: str,
    nama_mahasiswa: str = Form(...),
    email: str = Form(None),
    angkatan: str = Form(None),
    db: Session = Depends(get_db)
):
    mhs = db.query(models.Mahasiswa).filter(models.Mahasiswa.id_mahasiswa == id_mahasiswa).first()
    if not mhs:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Mahasiswa tidak ditemukan"})

    mhs.nama_mahasiswa = nama_mahasiswa
    mhs.email = email
    mhs.angkatan = angkatan
    db.commit()
    db.refresh(mhs)

    return {
        "berhasil": True,
        "pesan": "Profil berhasil diperbarui",
        "data": {
            "id_mahasiswa": mhs.id_mahasiswa,
            "nama_mahasiswa": mhs.nama_mahasiswa,
            "email": mhs.email,
            "angkatan": mhs.angkatan,
        }
    }


@app.delete("/mahasiswa/{id_mahasiswa}")
def delete_mahasiswa(id_mahasiswa: str, db: Session = Depends(get_db)):
    mhs = db.query(models.Mahasiswa).filter(models.Mahasiswa.id_mahasiswa == id_mahasiswa).first()
    if not mhs:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Mahasiswa tidak ditemukan"})

    # Hapus dari tabel mahasiswa
    db.delete(mhs)

    # Hapus akun login (jika ada)
    account = db.query(models.UserAccount).filter(
        models.UserAccount.user_id == id_mahasiswa, 
        models.UserAccount.role == "mahasiswa"
    ).first()
    if account:
        db.delete(account)

    db.commit()

    return {
        "berhasil": True,
        "pesan": "Data mahasiswa berhasil dihapus"
    }


# ===================== STATISTIK & DASHBOARD DOSEN =====================

@app.get("/dosen/{id_dosen}/ringkasan-absensi")
def ringkasan_absensi_dosen(id_dosen: str, db: Session = Depends(get_db)):
    jadwal_list_obj = db.query(models.Jadwal).filter(models.Jadwal.id_dosen == id_dosen).all()
    for j in jadwal_list_obj:
        _auto_finalisasi_kelas(j, db)
    jadwal_ids = [j.id for j in jadwal_list_obj]

    total_mahasiswa = db.query(models.KelasMahasiswa).join(
        models.Kelas, models.Kelas.id == models.KelasMahasiswa.id_kelas
    ).filter(
        models.Kelas.id_dosen == id_dosen,
        models.KelasMahasiswa.status == "approved"
    ).count()

    if not jadwal_ids:
        return {
            "total_mahasiswa": total_mahasiswa,
            "total_jadwal": 0,
            "total_absensi": 0,
            "total_hadir": 0,
            "total_terlambat": 0,
            "total_tidak_hadir": 0,
            "hari_ini_hadir": 0,
            "hari_ini_terlambat": 0,
            "hari_ini_tidak_hadir": 0,
        }

    semua_absensi = db.query(models.Absensi).filter(models.Absensi.id_jadwal.in_(jadwal_ids)).all()

    total_hadir = sum(1 for a in semua_absensi if a.status == "hadir")
    total_terlambat = sum(1 for a in semua_absensi if a.status == "terlambat")
    total_tidak_hadir = sum(1 for a in semua_absensi if a.status == "tidak_hadir")

    hari_ini = datetime.now().date()
    absensi_hari_ini = [a for a in semua_absensi if a.tanggal_absensi and a.tanggal_absensi.date() == hari_ini]

    hari_ini_hadir = sum(1 for a in absensi_hari_ini if a.status == "hadir")
    hari_ini_terlambat = sum(1 for a in absensi_hari_ini if a.status == "terlambat")
    hari_ini_tidak_hadir = sum(1 for a in absensi_hari_ini if a.status == "tidak_hadir")

    return {
        "total_mahasiswa": total_mahasiswa,
        "total_jadwal": len(jadwal_ids),
        "total_absensi": len(semua_absensi),
        "total_hadir": total_hadir,
        "total_terlambat": total_terlambat,
        "total_tidak_hadir": total_tidak_hadir,
        "hari_ini_hadir": hari_ini_hadir,
        "hari_ini_terlambat": hari_ini_terlambat,
        "hari_ini_tidak_hadir": hari_ini_tidak_hadir,
    }


@app.get("/dosen/{id_dosen}/top-mahasiswa")
def top_mahasiswa_dosen(id_dosen: str, limit: int = 5, db: Session = Depends(get_db)):
    jadwal_ids = [j.id for j in db.query(models.Jadwal.id).filter(models.Jadwal.id_dosen == id_dosen).all()]
    if not jadwal_ids:
        return {"data": []}

    total_pertemuan = 0
    for jid in jadwal_ids:
        tanggal_unik = db.query(func.date(models.Absensi.tanggal_absensi)).filter(
            models.Absensi.id_jadwal == jid
        ).distinct().count()
        total_pertemuan += tanggal_unik

    if total_pertemuan == 0:
        return {"data": []}

    semua_absensi = db.query(models.Absensi).filter(models.Absensi.id_jadwal.in_(jadwal_ids)).all()

    hadir_per_mahasiswa: dict = {}
    for a in semua_absensi:
        if a.status == "hadir":
            hadir_per_mahasiswa[a.id_mahasiswa] = hadir_per_mahasiswa.get(a.id_mahasiswa, 0) + 1

    hasil = []
    for id_mhs, jumlah_hadir in hadir_per_mahasiswa.items():
        mhs = db.query(models.Mahasiswa).filter(models.Mahasiswa.id_mahasiswa == id_mhs).first()
        if not mhs:
            continue
        persen = round(min((jumlah_hadir / total_pertemuan) * 100, 100), 1)
        hasil.append({
            "id_mahasiswa": id_mhs,
            "nama_mahasiswa": mhs.nama_mahasiswa,
            "angkatan": mhs.angkatan,
            "jumlah_hadir": jumlah_hadir,
            "persen_kehadiran": persen,
        })

    hasil.sort(key=lambda x: x["persen_kehadiran"], reverse=True)
    return {"data": hasil[:limit]}


@app.get("/dosen/{id_dosen}/tren-kehadiran")
def tren_kehadiran_dosen(id_dosen: str, hari: int = 14, db: Session = Depends(get_db)):
    jadwal_ids = [j.id for j in db.query(models.Jadwal.id).filter(models.Jadwal.id_dosen == id_dosen).all()]
    if not jadwal_ids:
        return {"data": []}

    batas_awal = datetime.now() - timedelta(days=hari)
    absensi_list = db.query(models.Absensi).filter(
        models.Absensi.id_jadwal.in_(jadwal_ids),
        models.Absensi.tanggal_absensi >= batas_awal
    ).all()

    per_tanggal: dict = {}
    for a in absensi_list:
        if not a.tanggal_absensi:
            continue
        key = a.tanggal_absensi.strftime("%Y-%m-%d")
        if key not in per_tanggal:
            per_tanggal[key] = {"hadir": 0, "terlambat": 0, "tidak_hadir": 0, "total": 0}
        per_tanggal[key][a.status] = per_tanggal[key].get(a.status, 0) + 1
        per_tanggal[key]["total"] += 1

    hasil = []
    for tanggal in sorted(per_tanggal.keys()):
        d = per_tanggal[tanggal]
        label = datetime.strptime(tanggal, "%Y-%m-%d").strftime("%d %b")
        persen = round((d["hadir"] / d["total"]) * 100, 1) if d["total"] else 0
        hasil.append({"tanggal": tanggal, "label": label, "persen_hadir": persen, "total": d["total"]})

    return {"data": hasil}


@app.get("/dosen/{id_dosen}/kehadiran-per-matkul")
def kehadiran_per_matkul_dosen(id_dosen: str, db: Session = Depends(get_db)):
    jadwal_list = db.query(models.Jadwal).filter(models.Jadwal.id_dosen == id_dosen).all()
    if not jadwal_list:
        return {"data": []}

    hasil = []
    for j in jadwal_list:
        mk = db.query(models.MataKuliah).filter(models.MataKuliah.id_mata_kuliah == j.id_mata_kuliah).first()
        absensi_list = db.query(models.Absensi).filter(models.Absensi.id_jadwal == j.id).all()
        total = len(absensi_list)
        hadir = sum(1 for a in absensi_list if a.status == "hadir")
        persen = round((hadir / total) * 100, 1) if total else 0
        hasil.append({
            "id_jadwal": j.id,
            "nama_mata_kuliah": mk.nama if mk else j.id_mata_kuliah,
            "persen_hadir": persen,
            "total_absensi": total,
        })

    return {"data": hasil}


# ===================== DETEKSI WAJAH (TEST) =====================

@app.post("/deteksi/wajah")
async def test_deteksi_wajah(foto: UploadFile = File(...)):
    isi_file = await foto.read()
    hasil = proses_gambar_bytes(isi_file)

    return {
        "berhasil": hasil["berhasil"],
        "pesan": hasil["pesan"],
        "total_wajah": hasil.get("total_wajah", 0),
        "detail": [
            {
                "index": w["index"],
                "bbox": w["bbox"],
                "confidence": w["confidence"],
                "ukuran_crop": w["ukuran_crop"]
            }
            for w in hasil.get("wajah", [])
        ]
    }


# ===================== ABSENSI (MANUAL, TANPA FOTO) =====================

@app.post("/absensi")
def catat_absensi(
    id_mahasiswa: str = Form(...),
    id_jadwal: int = Form(...),
    id_mata_kuliah: str = Form(...),
    latitude: float = Form(None),
    longitude: float = Form(None),
    db: Session = Depends(get_db)
):
    mahasiswa = db.query(models.Mahasiswa).filter(models.Mahasiswa.id_mahasiswa == id_mahasiswa).first()
    if not mahasiswa:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": f"Mahasiswa {id_mahasiswa} tidak ditemukan"})

    jadwal = db.query(models.Jadwal).filter(models.Jadwal.id == id_jadwal).first()
    if not jadwal:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": f"Jadwal ID {id_jadwal} tidak ditemukan"})

    baru = models.Absensi(
        id_mahasiswa=id_mahasiswa,
        id_jadwal=id_jadwal,
        id_mata_kuliah=id_mata_kuliah,
        latitude=latitude,
        longitude=longitude,
        lokasi_valid=False,
        confidence=None,
        status="hadir"
    )
    db.add(baru)
    db.commit()
    db.refresh(baru)

    return {
        "berhasil": True,
        "pesan": f"Absensi {mahasiswa.nama_mahasiswa} berhasil dicatat",
        "data": {
            "id": baru.id,
            "id_mahasiswa": baru.id_mahasiswa,
            "nama_mahasiswa": mahasiswa.nama_mahasiswa,
            "id_mata_kuliah": baru.id_mata_kuliah,
            "status": baru.status,
            "waktu": str(baru.tanggal_absensi)
        }
    }


@app.get("/absensi/{id_mata_kuliah}")
def lihat_absensi(id_mata_kuliah: str, db: Session = Depends(get_db)):
    daftar = db.query(models.Absensi).filter(models.Absensi.id_mata_kuliah == id_mata_kuliah).all()
    return {
        "mata_kuliah": id_mata_kuliah,
        "total": len(daftar),
        "total_hadir": sum(1 for a in daftar if a.status == "hadir"),
        "daftar": [{"id_mahasiswa": a.id_mahasiswa, "status": a.status, "waktu": str(a.tanggal_absensi)} for a in daftar]
    }


@app.get("/absensi/mahasiswa/{id_mahasiswa}")
def lihat_riwayat_mahasiswa(id_mahasiswa: str, db: Session = Depends(get_db)):
    now = datetime.now()
    kelas_diikuti = [
        a.id_kelas for a in db.query(models.KelasMahasiswa).filter(
            models.KelasMahasiswa.id_mahasiswa == id_mahasiswa,
            models.KelasMahasiswa.status == "approved",
        ).all()
    ]
    if kelas_diikuti:
        jadwal_hari_ini = db.query(models.Jadwal).filter(
            models.Jadwal.id_kelas.in_(kelas_diikuti),
            models.Jadwal.hari == hari_ini_label(),
        ).all()
        for j in jadwal_hari_ini:
            _pastikan_finalisasi_hari_ini(j, id_mahasiswa, now, db)

    akun = db.query(models.UserAccount).filter(
        models.UserAccount.user_id == id_mahasiswa,
        models.UserAccount.role == "mahasiswa"
    ).first()

    query = db.query(models.Absensi).filter(models.Absensi.id_mahasiswa == id_mahasiswa)
    if akun and akun.dibuat_pada:
        query = query.filter(models.Absensi.tanggal_absensi >= akun.dibuat_pada)

    daftar = query.order_by(models.Absensi.tanggal_absensi.desc()).all()

    hasil = []
    for a in daftar:
        mk = db.query(models.MataKuliah).filter(models.MataKuliah.id_mata_kuliah == a.id_mata_kuliah).first()
        telat_info = format_telat_detik(a.telat_detik or 0)
        hasil.append({
            "id": a.id,
            "mata_kuliah": mk.nama if mk else a.id_mata_kuliah,
            "tanggal": a.tanggal_absensi.strftime("%d %b %Y") if a.tanggal_absensi else "-",
            "waktu": a.tanggal_absensi.strftime("%H:%M") if a.tanggal_absensi else "-",
            "status": a.status,
            "confidence": a.confidence,
            "telat_detik": a.telat_detik or 0,
            "telat_teks": telat_info["teks"],
        })

    total = len(daftar)
    hadir = sum(1 for a in daftar if a.status == "hadir")
    terlambat = sum(1 for a in daftar if a.status == "terlambat")
    tidak_hadir = sum(1 for a in daftar if a.status == "tidak_hadir")

    return {
        "id_mahasiswa": id_mahasiswa,
        "total_pertemuan": total,
        "hadir": hadir,
        "terlambat": terlambat,
        "tidak_hadir": tidak_hadir,
        "data": hasil
    }


@app.get("/absensi/jadwal/{id_jadwal}")
def lihat_absensi_per_jadwal(id_jadwal: int, db: Session = Depends(get_db)):
    jadwal = db.query(models.Jadwal).filter(models.Jadwal.id == id_jadwal).first()
    if not jadwal:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": f"Jadwal ID {id_jadwal} tidak ditemukan"})
    _auto_finalisasi_kelas(jadwal, db)
    daftar_absensi = db.query(models.Absensi).filter(models.Absensi.id_jadwal == id_jadwal).all()

    hasil = []
    for a in daftar_absensi:
        mhs = db.query(models.Mahasiswa).filter(models.Mahasiswa.id_mahasiswa == a.id_mahasiswa).first()
        telat_info = format_telat_detik(a.telat_detik or 0)
        hasil.append({
            "id": a.id,
            "id_mahasiswa": a.id_mahasiswa,
            "nama_mahasiswa": mhs.nama_mahasiswa if mhs else a.id_mahasiswa,
            "tanggal": a.tanggal_absensi.strftime("%d %b %Y") if a.tanggal_absensi else "-",
            "waktu": a.tanggal_absensi.strftime("%H:%M") if a.tanggal_absensi else "-",
            "status": a.status,
            "confidence": a.confidence,
            "telat_detik": a.telat_detik or 0,
            "telat_teks": telat_info["teks"],
        })

    return {
        "id_jadwal": id_jadwal,
        "id_mata_kuliah": jadwal.id_mata_kuliah,
        "total": len(hasil),
        "hadir": sum(1 for h in hasil if h["status"] == "hadir"),
        "data": hasil
    }


@app.get("/mahasiswa/status-absensi/{id_jadwal}")
def status_absensi_mahasiswa(id_jadwal: int, db: Session = Depends(get_db)):
    semua_mahasiswa = db.query(models.Mahasiswa).all()
    daftar_absensi = db.query(models.Absensi).filter(models.Absensi.id_jadwal == id_jadwal).all()
    jadwal = db.query(models.Jadwal).filter(models.Jadwal.id == id_jadwal).first()
    if jadwal:
        _auto_finalisasi_kelas(jadwal, db)

    id_sudah_absen = {a.id_mahasiswa: a for a in daftar_absensi}

    hasil = []
    for m in semua_mahasiswa:
        absen = id_sudah_absen.get(m.id_mahasiswa)
        hasil.append({
            "id_mahasiswa": m.id_mahasiswa,
            "nama_mahasiswa": m.nama_mahasiswa,
            "angkatan": m.angkatan,
            "sudah_absen": absen is not None,
            "status": absen.status if absen else None,
            "waktu": absen.tanggal_absensi.strftime("%H:%M") if absen and absen.tanggal_absensi else None,
            "tanggal": absen.tanggal_absensi.strftime("%d %b %Y") if absen and absen.tanggal_absensi else None,
        })

    return {
        "id_jadwal": id_jadwal,
        "total_mahasiswa": len(hasil),
        "sudah_absen": sum(1 for h in hasil if h["sudah_absen"]),
        "belum_absen": sum(1 for h in hasil if not h["sudah_absen"]),
        "data": hasil
    }


# ===================== REGISTRASI & PENGENALAN WAJAH =====================

@app.post("/mahasiswa/daftar-wajah")
async def daftar_wajah(
    id_mahasiswa: str = Form(...),
    id_foto: str = Form(...),
    foto: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    mahasiswa = db.query(models.Mahasiswa).filter(
        models.Mahasiswa.id_mahasiswa == id_mahasiswa
    ).first()

    if not mahasiswa:
        return JSONResponse(
            status_code=404,
            content={"berhasil": False, "pesan": f"Mahasiswa {id_mahasiswa} tidak ditemukan"}
        )

    isi_file = await foto.read()
    path_foto = f"foto_wajah/{id_mahasiswa}/{id_foto}.jpg"

    hasil = simpan_embedding(
        id_mahasiswa=id_mahasiswa,
        id_foto=id_foto,
        path_foto=path_foto,
        image_bytes=isi_file,
        db=db
    )

    return hasil


@app.post("/kenali/wajah")
async def kenali_wajah_endpoint(
    foto: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    isi_file = await foto.read()
    hasil = kenali_identitas(isi_file, db)
    return hasil


# ===================== KELAS =====================

class KelasCreateRequest(BaseModel):
    nama: str
    pelajaran: str = None
    lokasi: str = None
    id_dosen: str


class KelasUpdateRequest(BaseModel):
    nama: str
    pelajaran: str = None
    lokasi: str = None


class GabungKelasRequest(BaseModel):
    kode_gabung: str
    id_mahasiswa: str


@app.post("/kelas")
def buat_kelas(data: KelasCreateRequest, db: Session = Depends(get_db)):
    dosen = db.query(models.Dosen).filter(models.Dosen.id_dosen == data.id_dosen).first()
    if not dosen:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Dosen tidak ditemukan"})

    baru = models.Kelas(
        nama=data.nama,
        pelajaran=data.pelajaran,
        lokasi=data.lokasi,
        id_dosen=data.id_dosen,
    )
    db.add(baru)
    db.commit()
    db.refresh(baru)

    return {
        "berhasil": True,
        "pesan": "Kelas berhasil dibuat",
        "data": {
            "id": baru.id,
            "nama": baru.nama,
            "pelajaran": baru.pelajaran,
            "lokasi": baru.lokasi,
            "kode_gabung": baru.kode_gabung,
        }
    }


@app.put("/kelas/{id_kelas}")
def update_kelas(id_kelas: int, data: KelasUpdateRequest, db: Session = Depends(get_db)):
    kelas = db.query(models.Kelas).filter(models.Kelas.id == id_kelas).first()
    if not kelas:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Kelas tidak ditemukan"})

    if not data.nama or not data.nama.strip():
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Nama kelas wajib diisi"})

    kelas.nama = data.nama.strip()
    kelas.pelajaran = data.pelajaran
    kelas.lokasi = data.lokasi
    db.commit()
    db.refresh(kelas)

    return {
        "berhasil": True,
        "pesan": "Kelas berhasil diperbarui",
        "data": {
            "id": kelas.id,
            "nama": kelas.nama,
            "pelajaran": kelas.pelajaran,
            "lokasi": kelas.lokasi,
            "kode_gabung": kelas.kode_gabung,
        }
    }


@app.get("/kelas")
def lihat_semua_kelas(id_dosen: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Kelas)
    if id_dosen:
        query = query.filter(models.Kelas.id_dosen == id_dosen)
    semua = query.all()

    hasil = []
    for k in semua:
        total_approved = db.query(models.KelasMahasiswa).filter(
            models.KelasMahasiswa.id_kelas == k.id,
            models.KelasMahasiswa.status == "approved"
        ).count()
        total_pending = db.query(models.KelasMahasiswa).filter(
            models.KelasMahasiswa.id_kelas == k.id,
            models.KelasMahasiswa.status == "pending"
        ).count()
        hasil.append({
            "id": k.id,
            "nama": k.nama,
            "pelajaran": k.pelajaran,
            "lokasi": k.lokasi,
            "kode_gabung": k.kode_gabung,
            "id_dosen": k.id_dosen,
            "total_mahasiswa": total_approved,
            "total_pending": total_pending,
        })

    return {"total": len(hasil), "data": hasil}


@app.delete("/kelas/{id_kelas}")
def hapus_kelas(id_kelas: int, db: Session = Depends(get_db)):
    kelas = db.query(models.Kelas).filter(models.Kelas.id == id_kelas).first()
    if not kelas:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Kelas tidak ditemukan"})
    db.query(models.KelasMahasiswa).filter(models.KelasMahasiswa.id_kelas == id_kelas).delete()
    db.delete(kelas)
    db.commit()
    return {"berhasil": True, "pesan": "Kelas berhasil dihapus"}


@app.post("/kelas/gabung")
def gabung_kelas(data: GabungKelasRequest, db: Session = Depends(get_db)):
    kelas = db.query(models.Kelas).filter(models.Kelas.kode_gabung == data.kode_gabung).first()
    if not kelas:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Kode kelas tidak ditemukan"})

    mahasiswa = db.query(models.Mahasiswa).filter(models.Mahasiswa.id_mahasiswa == data.id_mahasiswa).first()
    if not mahasiswa:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Mahasiswa tidak ditemukan"})

    sudah_ada = db.query(models.KelasMahasiswa).filter(
        models.KelasMahasiswa.id_kelas == kelas.id,
        models.KelasMahasiswa.id_mahasiswa == data.id_mahasiswa
    ).first()
    if sudah_ada:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Anda sudah mengajukan/bergabung di kelas ini"})

    baru = models.KelasMahasiswa(
        id_kelas=kelas.id,
        id_mahasiswa=data.id_mahasiswa,
        status="pending"
    )
    db.add(baru)
    db.commit()

    return {"berhasil": True, "pesan": f"Permintaan bergabung ke kelas {kelas.nama} terkirim, menunggu persetujuan dosen"}


@app.get("/kelas/{id_kelas}/anggota")
def lihat_anggota_kelas(id_kelas: int, status: str = None, db: Session = Depends(get_db)):
    kelas = db.query(models.Kelas).filter(models.Kelas.id == id_kelas).first()
    if not kelas:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Kelas tidak ditemukan"})

    query = db.query(models.KelasMahasiswa).filter(models.KelasMahasiswa.id_kelas == id_kelas)
    if status:
        query = query.filter(models.KelasMahasiswa.status == status)
    anggota = query.all()

    hasil = []
    for a in anggota:
        mhs = db.query(models.Mahasiswa).filter(models.Mahasiswa.id_mahasiswa == a.id_mahasiswa).first()
        hasil.append({
            "id_anggota": a.id,
            "id_mahasiswa": a.id_mahasiswa,
            "nama_mahasiswa": mhs.nama_mahasiswa if mhs else a.id_mahasiswa,
            "email": mhs.email if mhs else None,
            "angkatan": mhs.angkatan if mhs else None,
            "status": a.status,
            "bergabung_pada": str(a.bergabung_pada),
            "foto_url": _url_foto(mhs.foto_profil) if mhs else None,
        })

    return {
        "kelas": kelas.nama,
        "total": len(hasil),
        "data": hasil
    }


@app.put("/kelas/anggota/{id_anggota}/approve")
def approve_anggota(id_anggota: int, db: Session = Depends(get_db)):
    anggota = db.query(models.KelasMahasiswa).filter(models.KelasMahasiswa.id == id_anggota).first()
    if not anggota:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Data tidak ditemukan"})
    anggota.status = "approved"
    db.commit()
    return {"berhasil": True, "pesan": "Mahasiswa berhasil disetujui"}


@app.delete("/kelas/anggota/{id_anggota}")
def kick_anggota(id_anggota: int, db: Session = Depends(get_db)):
    anggota = db.query(models.KelasMahasiswa).filter(models.KelasMahasiswa.id == id_anggota).first()
    if not anggota:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Data tidak ditemukan"})
    db.delete(anggota)
    db.commit()
    return {"berhasil": True, "pesan": "Mahasiswa berhasil dikeluarkan dari kelas"}


# ===================== LIVENESS: GESTURE CHALLENGE =====================

gesture_challenge_store: dict = {}


@app.post("/liveness/verifikasi-gesture")
async def verifikasi_gesture(
    gesture_token: str = Form(...),
    gesture_index: int = Form(...),
    foto_list: List[UploadFile] = File(...),
):
    if gesture_token not in gesture_challenge_store:
        return JSONResponse(status_code=400, content={
            "berhasil": False,
            "pesan": "Token challenge tidak valid atau sudah kadaluarsa"
        })

    challenge = gesture_challenge_store[gesture_token]

    if time.time() - challenge["timestamp"] > 300:
        del gesture_challenge_store[gesture_token]
        return JSONResponse(status_code=400, content={
            "berhasil": False,
            "pesan": "Sesi challenge sudah kadaluarsa"
        })

    gestures = challenge["gestures"]
    if gesture_index >= len(gestures):
        return JSONResponse(status_code=400, content={
            "berhasil": False,
            "pesan": "Indeks gesture tidak valid"
        })

    gesture_diminta = gestures[gesture_index]

    frames_decoded = []
    for f in foto_list:
        isi = await f.read()
        np_array = np.frombuffer(isi, np.uint8)
        gambar = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
        if gambar is not None:
            frames_decoded.append(gambar)

    if len(frames_decoded) < 2:
        return JSONResponse(status_code=400, content={
            "berhasil": False,
            "pesan": "Gagal membaca frame gambar"
        })

    hasil_gesture = proses_gesture_challenge(frames_decoded, gesture_diminta)

    if not hasil_gesture["lolos"]:
        return JSONResponse(status_code=400, content={
            "berhasil": False,
            "pesan": f"Gesture '{INSTRUKSI_GESTURE[gesture_diminta]}' tidak terdeteksi: {hasil_gesture['alasan']}",
            "gesture_detail": hasil_gesture
        })

    is_gesture_terakhir = gesture_index == len(gestures) - 1
    if is_gesture_terakhir:
        del gesture_challenge_store[gesture_token]

    return {
        "berhasil": True,
        "pesan": f"Gesture {gesture_index + 1}/{len(gestures)} berhasil diverifikasi",
        "selesai": is_gesture_terakhir,
    }


@app.get("/liveness/gesture-challenge-registrasi")
def buat_gesture_challenge_registrasi():
    gestures = generate_gesture_challenge_registrasi(3)
    token = secrets.token_hex(16)
    gesture_challenge_store[token] = {
        "gestures": gestures,
        "timestamp": time.time()
    }
    kadaluarsa = [k for k, v in gesture_challenge_store.items()
                  if time.time() - v["timestamp"] > 300]
    for k in kadaluarsa:
        del gesture_challenge_store[k]

    return {
        "token": token,
        "gestures": gestures,
        "instruksi": [INSTRUKSI_GESTURE[g] for g in gestures]
    }


@app.get("/liveness/gesture-challenge")
def buat_gesture_challenge(id_jadwal: int = None, db: Session = Depends(get_db)):
    jumlah = 3
    if id_jadwal is not None:
        jadwal = db.query(models.Jadwal).filter(models.Jadwal.id == id_jadwal).first()
        if not jadwal:
            return JSONResponse(status_code=404, content={
                "berhasil": False,
                "pesan": f"Jadwal ID {id_jadwal} tidak ditemukan"
            })

        if jadwal.hari != hari_ini_label():
            return JSONResponse(status_code=400, content={
                "berhasil": False,
                "pesan": f"Jadwal ini hanya berlaku pada hari {jadwal.hari}, bukan hari ini ({hari_ini_label()})"
            })

        if jadwal.jumlah_gesture:
            jumlah = jadwal.jumlah_gesture

    gestures = generate_gesture_challenge(jumlah)
    token = secrets.token_hex(16)
    gesture_challenge_store[token] = {
        "gestures": gestures,
        "timestamp": time.time()
    }
    kadaluarsa = [k for k, v in gesture_challenge_store.items()
                  if time.time() - v["timestamp"] > 300]
    for k in kadaluarsa:
        del gesture_challenge_store[k]

    return {
        "token": token,
        "gestures": gestures,
        "instruksi": [INSTRUKSI_GESTURE[g] for g in gestures]
    }


@app.post("/absensi/foto")
async def absensi_foto(
    id_jadwal: int = Form(...),
    id_mahasiswa: str = Form(...),
    gesture_token: str = Form(...),
    gesture_index: int = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    accuracy: float = Form(...),
    altitude: float | None = Form(None),
    foto_list: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    if gesture_token not in gesture_challenge_store:
        return JSONResponse(status_code=400, content={
            "berhasil": False,
            "pesan": "Token challenge tidak valid atau sudah kadaluarsa"
        })

    challenge = gesture_challenge_store[gesture_token]

    if time.time() - challenge["timestamp"] > 300:
        del gesture_challenge_store[gesture_token]
        return JSONResponse(status_code=400, content={
            "berhasil": False,
            "pesan": "Sesi challenge sudah kadaluarsa"
        })

    gestures = challenge["gestures"]
    if gesture_index >= len(gestures):
        return JSONResponse(status_code=400, content={
            "berhasil": False,
            "pesan": "Indeks gesture tidak valid"
        })

    jadwal = db.query(models.Jadwal).filter(models.Jadwal.id == id_jadwal).first()
    if not jadwal:
        return JSONResponse(status_code=404, content={
            "berhasil": False,
            "pesan": f"Jadwal ID {id_jadwal} tidak ditemukan"
        })

    if not jadwal.aktif:
        return JSONResponse(status_code=400, content={
            "berhasil": False,
            "pesan": "Jadwal ini sedang dinonaktifkan oleh dosen (tidak ada sesi absensi)"
        })

    now = datetime.now()
    hari_sekarang = hari_ini_label()
    if jadwal.hari != hari_sekarang:
        return JSONResponse(status_code=400, content={
            "berhasil": False,
            "pesan": f"Jadwal ini hanya berlaku pada hari {jadwal.hari}, bukan hari ini ({hari_sekarang})"
        })

    sesi_list = _pastikan_sesi_hari_ini(jadwal, id_mahasiswa, db)
    if not sesi_list:
        return JSONResponse(status_code=400, content={
            "berhasil": False,
            "pesan": "Jadwal ini belum memiliki jam absensi yang ditentukan dosen"
        })

    hasil_aktif = _perbarui_kadaluarsa_dan_ambil_sesi_aktif(sesi_list, jadwal, now, db)

    if hasil_aktif is None:
        if all(s.status_sesi != "belum" for s in sesi_list):
            absensi_final, status_final, catatan_final = _simpan_absensi_final(
                id_mahasiswa, id_jadwal, jadwal, sesi_list, now, db
            )
            if status_final == "tidak_hadir":
                pesan = "Waktu absensi jadwal ini sudah berakhir. Karena tidak ada sesi yang diselesaikan, hari ini tercatat otomatis Tidak Hadir / Alfa."
            else:
                pesan = f"Seluruh sesi absensi jadwal ini sudah berakhir dan tercatat {status_final.upper()}. {catatan_final}."
            return JSONResponse(status_code=400, content={
                "berhasil": False,
                "sudah_final": True,
                "status_final": status_final,
                "pesan": pesan,
            })
        return JSONResponse(status_code=400, content={
            "berhasil": False,
            "pesan": "Belum waktunya sesi absensi. Sistem akan memberi tahu otomatis saat waktunya tiba."
        })

    sesi_sekarang, target_dt, batas_dt = hasil_aktif
    toleransi_telat_menit = jadwal.toleransi_telat_menit if jadwal.toleransi_telat_menit is not None else 30
    selisih_detik = (now - target_dt).total_seconds()

    if jadwal.gps_aktif:
        target_lat = jadwal.latitude if jadwal.latitude is not None else KAMPUS_LAT
        target_lon = jadwal.longitude if jadwal.longitude is not None else KAMPUS_LON
        target_radius = jadwal.radius_meter if jadwal.radius_meter else RADIUS_KAMPUS_METER

        hasil_gps = validasi_gps_lengkap(
            id_mahasiswa=id_mahasiswa,
            lat=latitude,
            lon=longitude,
            accuracy=accuracy,
            target_lat=target_lat,
            target_lon=target_lon,
            radius_meter=target_radius,
            altitude=altitude,
        )

        if not hasil_gps["lolos"]:
            return JSONResponse(status_code=400, content={
                "berhasil": False,
                "pesan": f"Validasi lokasi gagal: {hasil_gps['pesan']}",
                "gps_detail": hasil_gps["detail"]
            })
        lokasi_valid_hasil = True
    else:
        lokasi_valid_hasil = None

    gesture_diminta = gestures[gesture_index]

    frames_decoded = []
    for f in foto_list:
        isi = await f.read()
        np_array = np.frombuffer(isi, np.uint8)
        gambar = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
        if gambar is not None:
            frames_decoded.append(gambar)

    if len(frames_decoded) < 2:
        return JSONResponse(status_code=400, content={
            "berhasil": False,
            "pesan": "Gagal membaca frame gambar"
        })

    hasil_gesture = proses_gesture_challenge(frames_decoded, gesture_diminta)

    if not hasil_gesture["lolos"]:
        return JSONResponse(status_code=400, content={
            "berhasil": False,
            "pesan": f"Gesture '{INSTRUKSI_GESTURE[gesture_diminta]}' tidak terdeteksi: {hasil_gesture['alasan']}",
            "gesture_detail": hasil_gesture
        })

    is_gesture_terakhir = gesture_index == len(gestures) - 1

    if not is_gesture_terakhir:
        return {
            "berhasil": True,
            "pesan": f"Gesture {gesture_index + 1}/{len(gestures)} berhasil",
            "lanjut_gesture": True,
            "gesture_berikutnya": gesture_index + 1
        }

    wajah_list = deteksi_wajah(frames_decoded[-1], confidence_min=0.3)
    if len(wajah_list) == 0:
        return JSONResponse(status_code=400, content={
            "berhasil": False,
            "pesan": "Wajah tidak terdeteksi untuk face recognition"
        })

    _, buffer = cv2.imencode(".jpg", frames_decoded[-1])
    hasil_kenali = kenali_identitas(buffer.tobytes(), db, expected_id=id_mahasiswa)

    if not hasil_kenali["berhasil"]:
        return JSONResponse(status_code=400, content={
            "berhasil": False,
            "pesan": "Wajah tidak cocok dengan akun mahasiswa ini",
            "confidence": hasil_kenali["confidence"]
        })

    del gesture_challenge_store[gesture_token]

    # ===== Catat hasil sesi (slot waktu) ini =====
    if selisih_detik <= toleransi_telat_menit * 60:
        sesi_sekarang.status_sesi = "hadir"
        sesi_sekarang.telat_detik = 0
    else:
        sesi_sekarang.status_sesi = "telat"
        sesi_sekarang.telat_detik = int(selisih_detik - (toleransi_telat_menit * 60))

    sesi_sekarang.waktu_selesai = now
    sesi_sekarang.confidence = hasil_kenali["confidence"]
    sesi_sekarang.latitude = latitude
    sesi_sekarang.longitude = longitude
    db.commit()

    sesi_terbaru = db.query(models.AbsensiSesi).filter(
        models.AbsensiSesi.id_mahasiswa == id_mahasiswa,
        models.AbsensiSesi.id_jadwal == id_jadwal,
        func.date(models.AbsensiSesi.tanggal) == now.date(),
    ).order_by(models.AbsensiSesi.jam_target).all()

    belum_selesai = [s for s in sesi_terbaru if s.status_sesi == "belum"]

    if belum_selesai:
        urutan = next(i for i, s in enumerate(sesi_terbaru) if s.id == sesi_sekarang.id) + 1
        return {
            "berhasil": True,
            "pesan": f"Sesi ke-{urutan}/{len(sesi_terbaru)} berhasil dicatat. Tunggu sesi absensi berikutnya — sistem akan memberi tahu otomatis.",
            "selesai": True,        # putaran gesture kali ini SUDAH selesai
            "hari_selesai": False,  # tapi absensi hari ini BELUM lengkap
        }

    absensi_baru, status_final, catatan_final = _simpan_absensi_final(
        id_mahasiswa, id_jadwal, jadwal, sesi_terbaru, now, db,
        confidence=hasil_kenali["confidence"], latitude=latitude, longitude=longitude,
    )
    total_telat_detik = absensi_baru.telat_detik or 0

    telat_info = format_telat_detik(total_telat_detik)
    if status_final == "hadir":
        pesan_sukses = "Absensi berhasil dicatat — seluruh sesi diselesaikan tepat waktu"
    elif status_final == "terlambat":
        pesan_sukses = f"Absensi berhasil dicatat (Terlambat) — {catatan_final}"
    else:
        pesan_sukses = "Absensi berhasil dicatat (Tidak Hadir / Alfa) — seluruh sesi terlewat"

    return {
        "berhasil": True,
        "pesan": pesan_sukses,
        "selesai": True,
        "hari_selesai": True,
        "data": {
            "id_mahasiswa": hasil_kenali["identitas"],
            "nama": hasil_kenali["nama"],
            "confidence": hasil_kenali["confidence"],
            "id_jadwal": id_jadwal,
            "status": status_final,
            "telat_detik": total_telat_detik,
            "telat_teks": catatan_final if status_final != "hadir" else telat_info["teks"],
            "waktu": str(absensi_baru.tanggal_absensi)
        }
    }