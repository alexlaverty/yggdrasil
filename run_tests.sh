#!/bin/bash

set -e

echo "Stopping and removing containers and volumes..."
docker compose down --volumes

echo "Building and starting services..."
docker compose up --build -d

echo "Waiting for web service to be ready..."
while ! curl -s http://localhost:8001/api/people > /dev/null; do
    sleep 1
done
echo "Web service is ready."

echo "Running pytest tests..."
pytest tests/

echo "Tests passed. Checking if GEDCOM was successfully uploaded..."

# Check if people are in the database
response=$(curl -s http://localhost:8001/api/people)

if [ "$response" != "[]" ]; then
    echo "GEDCOM upload successful: People found in database."
else
    echo "GEDCOM upload failed: No people in database."
    exit 1
fi

echo "All checks passed. GEDCOM uploaded and parsed successfully."