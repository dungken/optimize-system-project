#!/usr/bin/env bash
# Tạo DB rồi seed. Cần sudo MỘT lần để tạo user/database.
# Chạy:  ./backend/setup-db.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if psql -w -d lab -c 'select 1' >/dev/null 2>&1; then
  echo "· DB lab đã có, bỏ qua bước tạo"
else
  echo "· tạo role + database (cần sudo một lần)"
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$USER'" | grep -q 1 \
    || sudo -u postgres createuser -s "$USER"
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='lab'" | grep -q 1 \
    || sudo -u postgres createdb -O "$USER" lab
fi

echo "· ép data lớn hơn cache (để thấy IO thật, không phải đọc từ RAM)"
psql -d postgres -c "ALTER SYSTEM SET shared_buffers='128MB'" >/dev/null
sudo systemctl restart postgresql
until pg_isready -q; do sleep 0.5; done

echo "· seed 200k customers + 2M orders"
psql -d lab -f "$ROOT/backend/seed.sql"

echo
echo "✓ xong. Kiểm: psql lab -c 'select count(*) from orders'"
