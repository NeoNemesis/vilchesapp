#!/bin/sh
# ============================================
# VilchesApp — Docker Entrypoint
# Runs Prisma migrations automatically on startup
# ============================================

set -e

echo "🚀 VilchesApp starting up..."
echo "⚡ Powered by VilchesApp — https://github.com/NeoNemesis/vilchesapp"

# Wait for database to be ready
echo "⏳ Waiting for database..."
for i in $(seq 1 30); do
  if npx prisma db push --skip-generate 2>/dev/null; then
    echo "✅ Database is ready and schema synced"
    break
  fi
  echo "   Attempt $i/30 — waiting for database..."
  sleep 2
done

# Run Prisma migrations
echo "📦 Running database migrations..."
cd /app/backend
npx prisma migrate deploy 2>/dev/null || npx prisma db push --skip-generate
echo "✅ Database schema is up to date"

cd /app

echo "🌐 VilchesApp is ready!"
echo "📍 Open http://localhost:3001 in your browser"

# Execute the main command
exec "$@"
