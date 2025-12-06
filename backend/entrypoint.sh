#!/bin/bash

# Wait for postgres to be ready
until psql -h postgres -U ancestry -c '\q' 2>/dev/null; do
  echo "Waiting for postgres..."
  sleep 1
done

echo "Postgres is ready"

# Initialize database schema by running a Python script
python3 << 'EOF'
from database import engine, Base
from models import Individual, Family, Event, Source, Note, Media

# Drop all tables to start fresh
Base.metadata.drop_all(bind=engine)

# Create all tables
Base.metadata.create_all(bind=engine)

print("Database initialized")
EOF

exec "$@"