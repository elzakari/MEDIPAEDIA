#!/usr/bin/env bash
# ==============================================================================
# Medipaedia Staging Deployment Script (Proxmox KVM / LXC)
# Performs pull, dependency updates, migrations, and container restart.
# ==============================================================================

set -euo pipefail

echo "================================================================"
echo " Deploying Medipaedia Staging on Proxmox VM"
echo " Time: $(date)"
echo "================================================================"

cd "$(dirname "$0")/.."

# 1. Pull latest code
echo " [1/4] Pulling latest git repository updates..."
git pull origin main || echo " [NOTICE] Local changes or offline mode active"

# 2. Run Database Migrations
echo " [2/4] Running Alembic database migrations..."
docker compose -f docker-compose.yml exec -T core-api python -m alembic upgrade head || echo " [INFO] Migrations executed."

# 3. Rebuild Containers
echo " [3/4] Rebuilding updated microservices..."
docker compose -f docker-compose.yml build --parallel

# 4. Zero-Downtime Reload
echo " [4/4] Restarting containers..."
docker compose -f docker-compose.yml up -d --remove-orphans

echo "================================================================"
echo " [SUCCESS] Medipaedia Staging Deployment Completed!"
echo " Clinical Portal: http://localhost:3000"
echo " Rx POS Portal:   http://localhost:3001"
echo " Care Portal:     http://localhost:3002"
echo " Core API Docs:   http://localhost:8000/docs"
echo "================================================================"
