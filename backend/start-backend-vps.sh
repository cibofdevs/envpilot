#!/bin/bash

echo "🚀 Starting EnvPilot Backend on VPS"
echo "======================================"

# Set environment variables
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH

# Navigate to backend directory
cd /root/envpilot/backend

# Check if JAR file exists
if [ ! -f "target/env-pilot-0.0.1-SNAPSHOT.jar" ]; then
    echo "❌ JAR file not found. Building project first..."
    mvn clean package -DskipTests
fi

# Kill any existing Java processes for this app
echo "🔄 Stopping any existing backend processes..."
pkill -f "env-pilot-0.0.1-SNAPSHOT.jar" || true

# Wait a moment for processes to stop
sleep 2

# Start the application
echo "🚀 Starting EnvPilot backend..."
nohup java -Xmx512m -Xms256m \
    -Dspring.profiles.active=production \
    -Dserver.port=9095 \
    -jar target/env-pilot-0.0.1-SNAPSHOT.jar > app.log 2>&1 &

# Get the PID
BACKEND_PID=$!
echo "✅ Backend started with PID: $BACKEND_PID"

# Wait a moment for startup
sleep 5

# Check if application is running
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend is running successfully!"
    echo "📊 Health check: http://145.223.21.26:9095/actuator/health"
    echo "📝 Logs: tail -f app.log"
    echo "🛑 To stop: kill $BACKEND_PID"
else
    echo "❌ Backend failed to start. Check logs:"
    tail -20 app.log
fi 