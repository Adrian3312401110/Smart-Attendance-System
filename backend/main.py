import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.liveness_gerakan import cek_liveness_gerakan
from typing import List
from backend.liveness_temporal import cek_liveness_temporal
from backend.liveness_detection import cek_liveness
from backend.face_detection import deteksi_wajah, crop_wajah
from backend.database import engine, get_db, Base
from backend import models
from backend.face_detection import proses_gambar_bytes, load_model
from backend.face_recognition import load_arcface, simpan_embedding, kenali_wajah as kenali_identitas

Base.metadata.create_all(bind=engine)

load_model()
load_arcface()

app = FastAPI(
    title="Smart Attendance System",
    description="Sistem absensi otomatis berbasis computer vision",
    version="3.1.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def homepage():
    return {
        "aplikasi": "Smart Attendance System",
        "versi": "3.1",
        "status": "berjalan",
        "database": "PostgreSQL",
        "ai_model": "YOLO11n-face (loaded)"
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


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
    return {"id_dosen": dosen.id_dosen, "nama_dosen": dosen.nama_dosen, "email": dosen.email}

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


@app.post("/jadwal")
def tambah_jadwal(
    id_dosen: str = Form(...),
    id_mata_kuliah: str = Form(...),
    hari: str = Form(...),
    jam: str = Form(...),
    db: Session = Depends(get_db)
):
    dosen = db.query(models.Dosen).filter(models.Dosen.id_dosen == id_dosen).first()
    if not dosen:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": f"Dosen {id_dosen} tidak ditemukan"})

    mk = db.query(models.MataKuliah).filter(models.MataKuliah.id_mata_kuliah == id_mata_kuliah).first()
    if not mk:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": f"Mata kuliah {id_mata_kuliah} tidak ditemukan"})

    baru = models.Jadwal(id_dosen=id_dosen, id_mata_kuliah=id_mata_kuliah, hari=hari, jam=jam)
    db.add(baru)
    db.commit()
    db.refresh(baru)

    return {"berhasil": True, "pesan": "Jadwal berhasil ditambahkan", "data": {"id": baru.id, "id_dosen": baru.id_dosen, "id_mata_kuliah": baru.id_mata_kuliah, "hari": baru.hari, "jam": baru.jam}}


@app.get("/jadwal")
def lihat_jadwal(db: Session = Depends(get_db)):
    semua = db.query(models.Jadwal).all()
    return {"total": len(semua), "data": [{"id": j.id, "id_dosen": j.id_dosen, "id_mata_kuliah": j.id_mata_kuliah, "hari": j.hari, "jam": j.jam} for j in semua]}


@app.get("/jadwal/detail")
def lihat_jadwal_detail(db: Session = Depends(get_db)):
    semua = db.query(models.Jadwal).all()
    hasil = []
    for j in semua:
        dosen = db.query(models.Dosen).filter(models.Dosen.id_dosen == j.id_dosen).first()
        mk = db.query(models.MataKuliah).filter(models.MataKuliah.id_mata_kuliah == j.id_mata_kuliah).first()
        hasil.append({
            "id": j.id,
            "id_dosen": j.id_dosen,
            "nama_dosen": dosen.nama_dosen if dosen else j.id_dosen,
            "id_mata_kuliah": j.id_mata_kuliah,
            "nama_mata_kuliah": mk.nama if mk else j.id_mata_kuliah,
            "hari": j.hari,
            "jam": j.jam,
        })
    return {"total": len(hasil), "data": hasil}


@app.delete("/jadwal/{id_jadwal}")
def hapus_jadwal(id_jadwal: int, db: Session = Depends(get_db)):
    jadwal = db.query(models.Jadwal).filter(models.Jadwal.id == id_jadwal).first()
    if not jadwal:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Jadwal tidak ditemukan"})
    db.delete(jadwal)
    db.commit()
    return {"berhasil": True, "pesan": "Jadwal berhasil dihapus"}


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
    semua = db.query(models.Mahasiswa).all()
    return {"total": len(semua), "data": [{"id_mahasiswa": m.id_mahasiswa, "nama_mahasiswa": m.nama_mahasiswa, "angkatan": m.angkatan} for m in semua]}

@app.get("/mahasiswa/{id_mahasiswa}")
def lihat_satu_mahasiswa(id_mahasiswa: str, db: Session = Depends(get_db)):
    mhs = db.query(models.Mahasiswa).filter(models.Mahasiswa.id_mahasiswa == id_mahasiswa).first()
    if not mhs:
        return JSONResponse(status_code=404, content={"berhasil": False, "pesan": "Mahasiswa tidak ditemukan"})
    return {
        "id_mahasiswa": mhs.id_mahasiswa,
        "nama_mahasiswa": mhs.nama_mahasiswa,
        "email": mhs.email,
        "angkatan": mhs.angkatan,
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
    daftar = db.query(models.Absensi).filter(
        models.Absensi.id_mahasiswa == id_mahasiswa
    ).order_by(models.Absensi.tanggal_absensi.desc()).all()

    hasil = []
    for a in daftar:
        mk = db.query(models.MataKuliah).filter(models.MataKuliah.id_mata_kuliah == a.id_mata_kuliah).first()
        hasil.append({
            "id": a.id,
            "mata_kuliah": mk.nama if mk else a.id_mata_kuliah,
            "tanggal": a.tanggal_absensi.strftime("%d %b %Y") if a.tanggal_absensi else "-",
            "waktu": a.tanggal_absensi.strftime("%H:%M") if a.tanggal_absensi else "-",
            "status": a.status,
            "confidence": a.confidence,
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

    daftar_absensi = db.query(models.Absensi).filter(models.Absensi.id_jadwal == id_jadwal).all()

    hasil = []
    for a in daftar_absensi:
        mhs = db.query(models.Mahasiswa).filter(models.Mahasiswa.id_mahasiswa == a.id_mahasiswa).first()
        hasil.append({
            "id": a.id,
            "id_mahasiswa": a.id_mahasiswa,
            "nama_mahasiswa": mhs.nama_mahasiswa if mhs else a.id_mahasiswa,
            "tanggal": a.tanggal_absensi.strftime("%d %b %Y") if a.tanggal_absensi else "-",
            "waktu": a.tanggal_absensi.strftime("%H:%M") if a.tanggal_absensi else "-",
            "status": a.status,
            "confidence": a.confidence,
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

@app.post("/absensi/foto")
async def absensi_foto(
    id_jadwal: int = Form(...),
    foto_list: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    if len(foto_list) < 3:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Minimal 3 frame diperlukan untuk pengecekan liveness gerakan"})

    frames_decoded = []
    for f in foto_list:
        isi = await f.read()
        np_array = np.frombuffer(isi, np.uint8)
        gambar = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
        if gambar is not None:
            frames_decoded.append(gambar)

    if len(frames_decoded) < 3:
        return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Gagal membaca frame gambar"})

    # ===== STEP 1: Deteksi wajah di SETIAP frame untuk dapat bbox per frame =====
    bbox_list = []
    for frame in frames_decoded:
        wajah_list = deteksi_wajah(frame, confidence_min=0.3)
        if len(wajah_list) == 0:
            return JSONResponse(status_code=400, content={"berhasil": False, "pesan": "Wajah tidak terdeteksi konsisten di seluruh frame, pastikan wajah tetap berada dalam frame kamera"})
        bbox_list.append(wajah_list[0]["bbox"])

    lebar_wajah_referensi = bbox_list[0][2] - bbox_list[0][0]

    # ===== STEP 2: Liveness check berbasis gerakan =====
    hasil_liveness = cek_liveness_gerakan(bbox_list, lebar_wajah_referensi)

    print("=== LIVENESS GERAKAN DEBUG ===")
    print(f"Lolos: {hasil_liveness['lolos']}")
    print(f"Detail: {hasil_liveness['detail']}")
    print("===============================")

    if not hasil_liveness["lolos"]:
        return JSONResponse(
            status_code=400,
            content={
                "berhasil": False,
                "pesan": hasil_liveness["pesan"],
                "liveness_detail": hasil_liveness["detail"]
            }
        )

    # ===== STEP 3: Face Recognition pakai frame terakhir =====
    crop_terakhir = crop_wajah(frames_decoded[-1], bbox_list[-1], padding=20)
    _, buffer = cv2.imencode(".jpg", frames_decoded[-1])
    isi_file_terakhir = buffer.tobytes()

    hasil_kenali = kenali_identitas(isi_file_terakhir, db)

    if not hasil_kenali["berhasil"]:
        return JSONResponse(
            status_code=400,
            content={
                "berhasil": False,
                "pesan": hasil_kenali["pesan"],
                "confidence": hasil_kenali["confidence"]
            }
        )

    jadwal = db.query(models.Jadwal).filter(models.Jadwal.id == id_jadwal).first()
    if not jadwal:
        return JSONResponse(
            status_code=404,
            content={"berhasil": False, "pesan": f"Jadwal ID {id_jadwal} tidak ditemukan"}
        )

    absensi_baru = models.Absensi(
        id_mahasiswa=hasil_kenali["identitas"],
        id_jadwal=id_jadwal,
        id_mata_kuliah=jadwal.id_mata_kuliah,
        lokasi_valid=False,
        confidence=hasil_kenali["confidence"],
        status="hadir"
    )

    db.add(absensi_baru)
    db.commit()
    db.refresh(absensi_baru)

    return {
        "berhasil": True,
        "pesan": "Absensi berhasil dicatat",
        "data": {
            "id_mahasiswa": hasil_kenali["identitas"],
            "nama": hasil_kenali["nama"],
            "confidence": hasil_kenali["confidence"],
            "liveness_detail": hasil_liveness["detail"],
            "id_jadwal": id_jadwal,
            "status": "hadir",
            "waktu": str(absensi_baru.tanggal_absensi)
        }
    }

# ===================== KELAS =====================

class KelasCreateRequest(BaseModel):
    nama: str
    pelajaran: str = None
    lokasi: str = None
    id_dosen: str


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
        hasil.append({
            "id": k.id,
            "nama": k.nama,
            "pelajaran": k.pelajaran,
            "lokasi": k.lokasi,
            "kode_gabung": k.kode_gabung,
            "id_dosen": k.id_dosen,
            "total_mahasiswa": total_approved,
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

