"""
Smoke import: registers all FastAPI routers, lists every auth route.
Goal = verify POST forgot-password + reset-password exist alongside legacy login/change.
"""
import asyncio
import importlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "app"
sys.path.insert(0, str(ROOT))

if __name__ == "__main__":
    mod = importlib.import_module("app.main")
    app = mod.app
    routes = [r for r in app.routes if hasattr(r, "path") and "/api/v1/auth" in r.path]
    tuples = []
    for r in routes:
        methods = tuple(sorted(r.methods)) if hasattr(r, "methods") and r.methods else tuple()
        tuples.append((r.path, methods))
    tuples = sorted(set(tuples))
    seen = tuples
    print("AUTH_ROUTES_BEGIN")
    for p, m in seen:
        print(f"  {list(m)}  {p}")
    print("AUTH_ROUTES_END")

    required_paths = {
        "/api/v1/auth/forgot-password": {"POST"},
        "/api/v1/auth/reset-password": {"POST"},
        "/api/v1/auth/login": {"POST"},
        "/api/v1/auth/change-password": {"POST"},
        "/api/v1/auth/me": {"GET"},
    }
    built_map = {}
    for p, m in seen:
        built_map.setdefault(p, set()).update(m)
    ok = True
    for rp, rm in required_paths.items():
        has = built_map.get(rp, set())
        if not rm.issubset(has):
            print(f"MISSING ROUTE: {rm} {rp}  (have {sorted(has)})")
            ok = False
    print(f"ROUTER_SMOKE={'PASS' if ok else 'FAIL'}")
    sys.exit(0 if ok else 3)
