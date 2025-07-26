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
export VAULT_URL="http://145.223.21.26:8200"
export VAULT_TOKEN="hvs.BubRW7vSeLAXIXkyZP1QgaIm"

echo "🧼 Killing old process..."
pkill -f "$JAR_NAME" || true

echo "🚀 Starting application..."
nohup java -jar "$DEPLOY_DIR/$JAR_NAME" --spring.profiles.active=default > "$LOG_DIR/envpilot.log" 2>&1 &

echo "✅ Deployment successful!"