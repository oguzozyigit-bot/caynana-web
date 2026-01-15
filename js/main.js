# app/main.py (FINAL v9506 - RENDER PORT FIX)
# ✅ Render'ın atadığı PORT değişkenini otomatik okur.
# ✅ Manuel port (10000) zorlamasını kaldırır, sistem ne verirse ona uyar.

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Config dosyasını güvenli içe aktarma
try:
    from .core.config import APP_NAME
except ImportError:
    APP_NAME = "Caynana API"

# --- ROUTER IMPORTLARI ---
# Bu dosyalar (auth, memory, fal vb.) senin attığın SON SÜRÜMLER (prefixsiz) olmalı.
from .models.auth import router as auth_router
from .models.memory import router as memory_router
from .models.plans import router as plans_router
from .models.fal import router as fal_router
from .models.chat import router as chat_router
from .models.tts import router as tts_router

app = FastAPI(title=APP_NAME)

# --- CORS AYARLARI ---
ALLOWED_ORIGINS = [
    "https://caynana.ai",
    "https://www.caynana.ai",
    "https://bikonomi-web.onrender.com",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- HEALTH CHECK ---
@app.get("/health")
def health():
    return {"ok": True, "app": APP_NAME, "version": "v9506"}

@app.get("/")
def root():
    return {"message": "Caynana API Calisiyor."}

# --- ROUTERLARI KAYDETME ---
# Buradaki prefixler, diğer dosyalardaki rotaların başına eklenir.
# ÖRN: Auth dosyanda "/login" var + Buradaki "/api/auth" = "/api/auth/login" (DOĞRU)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(memory_router, prefix="/api/profile", tags=["profile"])
app.include_router(fal_router, prefix="/api/fal", tags=["fal"])
app.include_router(plans_router, prefix="/api/plans", tags=["plans"])
app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(tts_router, prefix="/api", tags=["tts"])

# --- BAŞLATMA AYARI (Render Uyumlu) ---
if __name__ == "__main__":
    import uvicorn
    # Render $PORT verirse onu al, vermezse 10000 kullan.
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
