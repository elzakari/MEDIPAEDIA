#!/usr/bin/env bash
# ==============================================================================
# Medipaedia PostgreSQL + PostGIS Automated Backup Script
# Creates timestamped, gzip-compressed database dumps and manages retention.
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/medipaedia}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/medipaedia_db_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

CONTAINER_NAME="${DB_CONTAINER:-medipaedia-prod-db}"
DB_USER="${POSTGRES_USER:-medipaedia_prod}"
DB_NAME="${POSTGRES_DB:-medipaedia_db}"

mkdir -p "${BACKUP_DIR}"

echo "================================================================"
echo " Starting Medipaedia Database Backup: ${TIMESTAMP}"
echo " Database: ${DB_NAME} on container ${CONTAINER_NAME}"
echo "================================================================"

# Execute pg_dump inside container and pipe through gzip
docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip -9 > "${BACKUP_FILE}"

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo " [SUCCESS] Backup completed: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Optional S3 / DigitalOcean Spaces Sync
if [ -n "${S3_BUCKET_NAME:-}" ]; then
    echo " [S3] Uploading backup to s3://${S3_BUCKET_NAME}/database-backups/..."
    aws s3 cp "${BACKUP_FILE}" "s3://${S3_BUCKET_NAME}/database-backups/" --sse AES256 || echo " [WARNING] S3 upload failed"
fi

# Clean up older backups
echo " [CLEANUP] Removing local backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "medipaedia_db_*.sql.gz" -mtime +"${RETENTION_DAYS}" -exec rm -f {} \;

echo " Backup process finished successfully."
