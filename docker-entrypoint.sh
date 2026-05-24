#!/bin/sh
set -e

if [ "$JWT_SECRET" = "change-me-in-production" ] || [ -z "$JWT_SECRET" ]; then
  echo "ERROR: JWT_SECRET is not set or is using the default value."
  echo "       Set a strong random secret: JWT_SECRET=\$(openssl rand -hex 32)"
  exit 1
fi

# Pick the right schema based on DATABASE_URL
if echo "$DATABASE_URL" | grep -q "^postgres"; then
  SCHEMA="prisma/schema.postgresql.prisma"
  MIGRATIONS_DIR="prisma/migrations/postgresql"
else
  SCHEMA="prisma/schema.sqlite.prisma"
  MIGRATIONS_DIR="prisma/migrations/sqlite"
fi

echo "Running database migrations ($SCHEMA)..."
node_modules/.bin/prisma migrate deploy --schema="$SCHEMA"

echo "Starting TrivyHub..."
exec node server.js
