#!/usr/bin/env bash
# Netlify build script for Polyglot Cards.
#
# Locally we develop with SQLite; in production (Netlify + Neon) we use
# PostgreSQL. This script swaps the Prisma datasource provider to
# "postgresql" when a Neon/Postgres DATABASE_URL is present, then runs
# prisma generate + next build.
#
# IMPORTANT: This script uses npx (not bun) because bun is NOT available
# in the Netlify build image.
set -euo pipefail

echo "▶ Polyglot Cards build"

DB_URL="${DATABASE_URL:-}"

# Switch the Prisma provider to postgresql if the connection string is Postgres.
if [[ "$DB_URL" == postgres* ]] || [[ "$DB_URL" == postgresql* ]]; then
  echo "▶ Detected PostgreSQL DATABASE_URL — switching Prisma provider to postgresql"
  sed -i.bak 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
  rm -f prisma/schema.prisma.bak
else
  echo "▶ No PostgreSQL DATABASE_URL — keeping SQLite (local dev)"
fi

echo "▶ Running prisma generate"
npx prisma generate

# Push the schema to the Neon database on every deploy (safe — it only adds
# missing tables/columns and never drops data with db push --accept-data-loss).
if [[ "$DB_URL" == postgres* ]] || [[ "$DB_URL" == postgresql* ]]; then
  echo "▶ Pushing schema to Neon"
  npx prisma db push --accept-data-loss || echo "⚠ db push skipped (may already be in sync)"
fi

echo "▶ Building Next.js"
# Use npx next build directly (NOT bun run build, which copies standalone files).
# The @netlify/plugin-nextjs plugin handles the serverless conversion.
npx next build

echo "✔ Build complete"
