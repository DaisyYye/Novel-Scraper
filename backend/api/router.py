from fastapi import APIRouter

from backend.api.routes import auth, novels, reader

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(novels.router)
api_router.include_router(reader.router)
