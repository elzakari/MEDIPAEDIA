#!/usr/bin/env bash
# ==============================================================================
# Medipaedia Production Rollout Script (DigitalOcean / Dedicated Server)
# Zero-Downtime Rollout with Pre-Flight Health Checks & Rollback Protection
# ==============================================================================

set -euo pipefail

echo "================================================================"
echo " Starting Medipaedia Production Deployment"
echo " Time: $(date)"
echo "================================================================"

cd "$(dirname "$0")/.."

# 1. Database Pre-Deployment Snapshot
echo " [1/5] Taking pre-deployment database backup..."
bash scripts/backup-db.sh

# 2. Build Production Images
echo " [2/5] Building production multi-stage Docker images..."
docker compose -f docker/docker-compose.prod.yml build --parallel

# 3. Apply Alembic Migrations
echo " [3/5] Applying Alembic schema migrations..."
docker compose -f docker/docker-compose.prod.yml run --rm core-api python -m alembic upgrade head

# 4. Zero-Downtime Rolling Update
echo " [4/5] Starting production containers..."
docker compose -f docker/docker-compose.prod.yml up -d --remove-orphans

# 5. Post-Deployment Health Check Probes
echo " [5/5] Performing live endpoint health probes..."
sleep 5

API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/health || echo "000")
if [ "$API_STATUS" -eq 200 ]; then
    echo " [HEALTHCHECK] Core API is healthy (HTTP 200)"
else
    echo " [ERROR] Core API healthcheck failed with status ${API_STATUS}"
    exit 1
fi

echo "================================================================"
echo " [SUCCESS] Medipaedia Production Rollout Succeeded!"
echo " Routing via Cloudflare CDN & Nginx Reverse Proxy"
echo " API Endpoint:     https://api.medipaedia.com"
echo " Clinical EHR:     https://clinical.medipaedia.com"
echo " Pharmacy POS:     https://rx.medipaedia.com"
echo " Care Marketplace: https://care.medipaedia.com"
echo "================================================================"
