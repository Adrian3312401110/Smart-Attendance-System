FROM python:3.10-slim

# Install dependensi sistem untuk OpenCV, GL, dan PostgreSQL
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /code

# SANGAT PENTING: Karena file ada di root, salin langsung dari root lokal (.)
COPY ./requirements.txt /code/requirements.txt

# Instal semua library Python
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Salin folder backend ke dalam kontainer
COPY ./backend /code/backend

# Jalankan server FastAPI menggunakan Uvicorn di port wajib Hugging Face
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
