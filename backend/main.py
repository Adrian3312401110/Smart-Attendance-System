from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse

app = FastAPI(
    title="Smart Attendance System",
    description="Sistem absensi otomatis berbasis computer vision",
    version="1.0.0"
)

@app.get("/")
def homepage():
    return {
        "aplikasi": "Smart Attendance System",
        "versi": "1.0",
        "status": "berjalan"
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/absensi/manual")
def absensi_manual(
    nim: str = Form(...),
    nama: str = Form(...),
    mata_kuliah: str = Form(...)
):
    
    return {
        "berhasil": True,
        "pesan": f"Absensi {nama} berhasil dicatat",
        "data": {
            "nim": nim,
            "nama": nama,
            "mata_kuliah": mata_kuliah,
            "status": "hadir"
        }
    }

@app.post("/absensi/foto")
async def absensi_foto(
    nim: str = Form(...),
    foto: UploadFile = File(...)
):
    
    isi_file = await foto.read()

    ukuran_kb = round(len(isi_file) / 1024, 2)

    return {
        "berhasil": True,
        "nim": nim,
        "nama_file": foto.filename,
        "tipe_file": foto.content_type,
        "ukuran": f"{ukuran_kb} KB",
        "simulasi_ai": {
            "wajah_terdeteksi": True,
            "identitas": "Menunggu integrasi ArcFace",
            "confidence": "N/A"
        }
    }

@app.get("/absensi/{kode_mk}")
def lihat_absensi(kode_mk: str):

    data_simulasi = [
        {"nim": "3312401001", "nama": "Budi Santoso",  "status": "hadir"},
        {"nim": "3312401002", "nama": "Siti Aminah",   "status": "hadir"},
        {"nim": "3312401003", "nama": "Ahmad Rizki",   "status": "tidak hadir"},
    ]

    return {
        "mata_kuliah": kode_mk,
        "total_mahasiswa": len(data_simulasi),
        "total_hadir": sum(1 for m in data_simulasi if m["status"] == "hadir"),
        "daftar": data_simulasi
    }