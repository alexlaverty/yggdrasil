"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import (
    people, families, events, places,
    media, backup, upload, nav, map, mcp
)

app = FastAPI(title="Ancestry API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST API routes
app.include_router(people.router, prefix="/api")
app.include_router(families.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(places.router, prefix="/api")
app.include_router(media.router, prefix="/api")
app.include_router(backup.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(nav.router, prefix="/api")
app.include_router(map.router, prefix="/api")


# ===========================
# MCP DEEP DEBUG (TEMPORARY)
# ===========================

import inspect
import types
import logging

logging.basicConfig(level=logging.DEBUG)

print("\n========== MCP DEBUG START ==========\n")

# 1️⃣ What is the FastMCP instance?
print("FastMCP instance:", mcp.mcp)
print("FastMCP class:", type(mcp.mcp))
print("FastMCP module:", inspect.getmodule(type(mcp.mcp)))

# 2️⃣ List public attributes on FastMCP
print("\nFastMCP public attributes (SAFE):")
for name in dir(mcp.mcp):
    if name.startswith("_"):
        continue
    if name in {"session_manager"}:
        print(f"  {name}: <lazy – skipped>")
        continue
    try:
        attr = getattr(mcp.mcp, name)
        print(f"  {name}: {type(attr)}")
    except Exception as e:
        print(f"  {name}: <error on access: {e}>")



# 3️⃣ Inspect sse_app
print("\nInspecting sse_app:")
print("  sse_app:", mcp.mcp.sse_app)
print("  is callable:", callable(mcp.mcp.sse_app))
print("  signature:", inspect.signature(mcp.mcp.sse_app))

sse_app_instance = mcp.mcp.sse_app()
print("\nResult of sse_app():")
print("  instance:", sse_app_instance)
print("  type:", type(sse_app_instance))
print("  callable:", callable(sse_app_instance))

# Try to introspect routes if it's Starlette/FastAPI
if hasattr(sse_app_instance, "routes"):
    print("\nRoutes inside sse_app():")
    for r in sse_app_instance.routes:
        print(f"  {r.path} [{getattr(r, 'methods', None)}]")
else:
    print("\nNo .routes attribute on sse_app() result")

# 4️⃣ Inspect streamable_http_app
print("\nInspecting streamable_http_app:")
print("  streamable_http_app:", mcp.mcp.streamable_http_app)
print("  signature:", inspect.signature(mcp.mcp.streamable_http_app))

http_app_instance = mcp.mcp.streamable_http_app()
print("\nResult of streamable_http_app():")
print("  instance:", http_app_instance)
print("  type:", type(http_app_instance))
print("  callable:", callable(http_app_instance))

if hasattr(http_app_instance, "routes"):
    print("\nRoutes inside streamable_http_app():")
    for r in http_app_instance.routes:
        print(f"  {r.path} [{getattr(r, 'methods', None)}]")
else:
    print("\nNo .routes attribute on streamable_http_app() result")

print("\n========== MCP DEBUG END ==========\n")


# MCP transports — CORRECT
app.mount("/mcp", mcp.mcp.sse_app())
app.mount("/mcp-http", mcp.mcp.streamable_http_app())

# ===========================
# FASTAPI ROUTE DEBUG
# ===========================

print("\n========== FASTAPI ROUTES ==========\n")
for r in app.routes:
    print(f"{r.path} -> {type(r)}")
print("\n===================================\n")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
