#!/bin/bash
set -e

echo "======================================"
echo " Setting up Laravel + Vue Task Manager"
echo "======================================"

# Copy .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Copying .env.example to .env..."
    cp .env.example .env
fi

# Start Docker services
echo "Starting Docker containers..."
docker compose up -d

# Wait for MySQL to be ready (up to 60 seconds)
echo "Waiting for MySQL to be ready..."
MAX_TRIES=30
WAIT_SECONDS=2
TRIES=0
until docker compose exec db mysqladmin ping -h "127.0.0.1" --silent 2>/dev/null; do
    TRIES=$((TRIES + 1))
    if [ "$TRIES" -ge "$MAX_TRIES" ]; then
        echo "ERROR: MySQL did not become ready after $((MAX_TRIES * WAIT_SECONDS)) seconds."
        echo "Check logs with: docker compose logs db"
        exit 1
    fi
    echo "  MySQL not ready yet (attempt $TRIES/$MAX_TRIES)..."
    sleep "$WAIT_SECONDS"
done
echo "MySQL is ready!"

# Install PHP dependencies
echo "Installing PHP dependencies..."
docker compose exec app composer install --no-interaction --prefer-dist

# Generate application key
echo "Generating application key..."
docker compose exec app php artisan key:generate --force

# Run migrations with fresh seed
echo "Running migrations and seeding database..."
docker compose exec app php artisan migrate:fresh --seed --force

# Build frontend assets (node container auto-installs deps on startup)
echo "Building frontend assets..."
docker compose exec node npm run build

echo ""
echo "======================================"
echo " Setup Complete!"
echo ""
echo " App:    http://localhost:8000"
echo " Vite:   http://localhost:5173  (dev server)"
echo ""
echo " Test credentials:"
echo "   Email:    candidate@example.com"
echo "   Password: password"
echo "======================================"
