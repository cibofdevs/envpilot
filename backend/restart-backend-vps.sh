#!/bin/bash

echo "🔄 Restarting EnvPilot Backend on VPS"
echo "======================================"

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Stop backend first
echo "🛑 Stopping backend..."
bash "$SCRIPT_DIR/stop-backend-vps.sh"

# Wait a moment
echo "⏳ Waiting for processes to stop..."
sleep 5

# Start backend
echo "🚀 Starting backend..."
bash "$SCRIPT_DIR/start-backend-vps.sh"

echo ""
echo "✅ Backend restart completed!"
echo "📊 Check status: bash $SCRIPT_DIR/check-backend-status.sh" 