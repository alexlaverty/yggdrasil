"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import people, families, events, places, media, backup, upload, nav, map

app = FastAPI(title="Ancestry API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers under /api prefix
app.include_router(people.router, prefix="/api")
app.include_router(families.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(places.router, prefix="/api")
app.include_router(media.router, prefix="/api")
app.include_router(backup.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(nav.router, prefix="/api")
app.include_router(map.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
