from fastapi import FastAPI, File, UploadFile, Form, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

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
    foto: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    isi_file = await foto.read()

    hasil_kenali = kenali_identitas(isi_file, db)

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
        "pesan": f"Absensi berhasil dicatat",
        "data": {
            "id_mahasiswa": hasil_kenali["identitas"],
            "nama": hasil_kenali["nama"],
            "confidence": hasil_kenali["confidence"],
            "id_jadwal": id_jadwal,
            "status": "hadir",
            "waktu": str(absensi_baru.tanggal_absensi)
        }
    }