from fastapi import APIRouter

from backend.api.routes import novels, reader

api_router = APIRouter()
api_router.include_router(novels.router)
api_router.include_router(reader.router)
