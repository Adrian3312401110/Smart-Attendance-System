FROM python:3.10-slim

# Install dependensi sistem untuk OpenCV, GL, dan PostgreSQL client
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /code

# 1. Salin requirements dari dalam folder backend lokal ke kontainer
COPY ./requirements.txt /code/requirements.txt

# Instal semua library Python yang dibutuhkan aplikasi Anda
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# 2. Salin seluruh folder backend lokal ke kontainer
COPY ./backend /code/backend

# Jalankan server FastAPI menggunakan Uvicorn di port 7860 (Port wajib Hugging Face)
# Catatan: Hapus argumen --reload untuk produksi di Hugging Face agar lebih stabil
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
