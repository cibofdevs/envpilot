#!/bin/bash
set -euo pipefail

echo "🚧 Building project..."
cd backend
mvn clean package -DskipTests

DEPLOY_DIR="/opt/envpilot"
LOG_DIR="$DEPLOY_DIR/log"
JAR_NAME="envpilot.jar"

echo "📁 Preparing deployment directory..."
mkdir -p "$LOG_DIR"

echo "📦 Copying jar file..."
cp target/*.jar "$DEPLOY_DIR/$JAR_NAME"

echo "🔧 Setting up environment variables..."
export VAULT_URL="REPLACE_WITH_YOUR_VAULT_URL"
export VAULT_TOKEN="REPLACE_WITH_YOUR_VAULT_TOKEN"

echo "🧼 Killing old process..."
pkill -f "$JAR_NAME" || true

echo "🚀 Starting application..."
nohup java -jar "$DEPLOY_DIR/$JAR_NAME" --spring.profiles.active=default > "$LOG_DIR/envpilot.log" 2>&1 &

echo "✅ Deployment successful!"