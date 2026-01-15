# app/main.py
# CAYNANA API – FINAL CORS FIXED VERSION
# Render + SPA + Google Login uyumlu

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# -------------------------------------------------
# APP
# -------------------------------------------------
app = FastAPI(
    title="CAYNANA.AI API",
    version="v9600"
)

# -------------------------------------------------
# CORS  (⚠️ EN KRİTİK KISIM – ROUTERLARDAN ÖNCE)
# -------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://caynana.ai",
        "https://www.caynana.ai",
        "https://bikonomi-web.onrender.com",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# ROUTER IMPORTS
# -------------------------------------------------
from .models.auth import router as auth_router
from .models.profile import router as profile_router
from .models.memory import router as memory_router
from .models.chat import router as chat_router
from .models.fal import router as fal_router
from .models.plans import router as plans_router
from .models.tts import router as tts_router

# -------------------------------------------------
# ROUTER MOUNTS (Frontend ile birebir)
# -------------------------------------------------

# AUTH
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])

# PROFILE
app.include_router(profile_router, prefix="/api/profile", tags=["profile"])

# MEMORY
app.include_router(memory_router, prefix="/api/memory", tags=["memory"])

# CHAT  → frontend: /api/chat
app.include_router(chat_router, prefix="/api", tags=["chat"])

# FAL → /api/fal/check
app.include_router(fal_router, prefix="/api/fal", tags=["fal"])

# PLANS
app.include_router(plans_router, prefix="/api/plans", tags=["plans"])

# TTS → /api/speak
app.include_router(tts_router, prefix="/api", tags=["tts"])

# -------------------------------------------------
# HEALTH
# -------------------------------------------------
@app.get("/health")
def health():
    return {
        "ok": True,
        "app": "CAYNANA.AI API",
        "cors": "fixed",
        "version": "v9600"
    }

# ROOT
@app.get("/")
def root():
    return {"message": "Caynana API çalışıyor."}

# -------------------------------------------------
# LOCAL DEV
# -------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=10000,
        reload=False
    )
