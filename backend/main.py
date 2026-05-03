from fastapi import FastAPI

app = FastAPI(title="Smart Attendance System", version="1.0")

@app.get("/")
def homepage():
    return {"pesan": "Smart Attendance System berjalan!"}

@app.get("/health")
def health_check():
    return {"status": "ok", "sistem": "Smart Atendance System"}