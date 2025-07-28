#!/bin/bash
set -euo pipefail

# Function for logging with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "🔐 Setting environment variables..."
export VAULT_URL=http://127.0.0.1:8200
export VAULT_TOKEN=YOUR_VAULT_TOKEN

DEPLOY_DIR="/root/data/install/envpilot"
LOG_DIR="$DEPLOY_DIR/log"
JAR_NAME="envpilot.jar"
BUILD_JAR_PATTERN="backend/target/env-pilot-*.jar"
PID_FILE="$DEPLOY_DIR/envpilot.pid"

log "📁 Creating deployment directories..."
mkdir -p "$LOG_DIR"

log "🔍 Checking if jar file exists..."
if ! ls $BUILD_JAR_PATTERN 1> /dev/null 2>&1; then
    log "❌ Error: No jar file found matching pattern $BUILD_JAR_PATTERN"
    exit 1
fi

log "📦 Renaming jar file from build output..."
# Use array to handle multiple files
jar_files=($BUILD_JAR_PATTERN)
if [ ${#jar_files[@]} -gt 1 ]; then
    log "⚠️  Warning: Multiple jar files found, using the first one: ${jar_files[0]}"
fi
mv "${jar_files[0]}" "backend/target/$JAR_NAME"

log "📦 Copying jar file to deployment directory..."
cp "backend/target/$JAR_NAME" "$DEPLOY_DIR/$JAR_NAME"

log "🧹 Stopping existing application (if any)..."
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        log "🛑 Stopping process with PID: $OLD_PID"
        kill "$OLD_PID"
        # Wait for process to stop
        for i in {1..30}; do
            if ! kill -0 "$OLD_PID" 2>/dev/null; then
                break
            fi
            sleep 1
        done
        if kill -0 "$OLD_PID" 2>/dev/null; then
            log "⚠️  Force killing process $OLD_PID"
            kill -9 "$OLD_PID"
        fi
    fi
    rm -f "$PID_FILE"
fi

# Alternative: kill by jar name (fallback)
pkill -f "$JAR_NAME" || true
sleep 2

log "🔍 Verifying jar file exists and is executable..."
if [ ! -f "$DEPLOY_DIR/$JAR_NAME" ]; then
    log "❌ Error: Jar file not found at $DEPLOY_DIR/$JAR_NAME"
    exit 1
fi

log "🚀 Starting application in background..."
cd "$DEPLOY_DIR"

# Start application with proper environment variables
nohup java -jar \
    -Dvault.url="$VAULT_URL" \
    -Dvault.token="$VAULT_TOKEN" \
    -Dspring.profiles.active=prod \
    -Xms512m -Xmx1024m \
    "$DEPLOY_DIR/$JAR_NAME" \
    > "$LOG_DIR/envpilot.log" 2>&1 &

# Save PID for future reference
APP_PID=$!
echo $APP_PID > "$PID_FILE"

log "✅ Application started with PID: $APP_PID"

# Wait a bit and check if process is still running
sleep 5
if kill -0 $APP_PID 2>/dev/null; then
    log "✅ Application is running successfully"
    log "📋 PID: $APP_PID"
    log "📄 Log file: $LOG_DIR/envpilot.log"
    log "🔧 PID file: $PID_FILE"
else
    log "❌ Application failed to start. Check logs:"
    tail -n 20 "$LOG_DIR/envpilot.log" || log "No log file found"
    exit 1
fi

log "🎉 Deployment completed successfully!"