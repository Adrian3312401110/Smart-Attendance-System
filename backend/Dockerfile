FROM python:3.10-slim

WORKDIR /code

# Salin file requirements terlebih dahulu agar proses build lebih cepat
COPY ./requirements.txt /code/requirements.txt

# Instal semua library Python yang dibutuhkan aplikasi Anda
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Salin seluruh kode backend Anda ke dalam kontainer
COPY postgresql://neondb_owner:npg_JPLbqV7XYD9v@ep-billowing-morning-ao498ldl-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Jalankan server FastAPI menggunakan Uvicorn di port 7860 (Port wajib Hugging Face)
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
