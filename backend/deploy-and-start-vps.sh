#!/bin/bash

echo "🚀 Deploying and Starting EnvPilot Backend on VPS"
echo "=================================================="

# Set environment variables
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH

# Navigate to backend directory
cd /root/envpilot/backend

# Stop any existing processes
echo "🛑 Stopping existing backend processes..."
pkill -f "env-pilot-0.0.1-SNAPSHOT.jar" || true
sleep 3

# Clean and build project
echo "🔨 Building project..."
mvn clean package -DskipTests

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# Check if JAR file exists
if [ ! -f "target/env-pilot-0.0.1-SNAPSHOT.jar" ]; then
    echo "❌ JAR file not found after build!"
    exit 1
fi

# Start the application
echo "🚀 Starting EnvPilot backend..."
nohup java -Xmx512m -Xms256m \
    -Dspring.profiles.active=production \
    -Dserver.port=9095 \
    -jar target/env-pilot-0.0.1-SNAPSHOT.jar > app.log 2>&1 &

# Get the PID
BACKEND_PID=$!
echo "✅ Backend started with PID: $BACKEND_PID"

# Wait for startup
echo "⏳ Waiting for backend to start..."
sleep 10

# Check if application is running
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend is running successfully!"
    
    # Test health endpoint
    echo "🏥 Testing health endpoint..."
    for i in {1..5}; do
        HEALTH_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:9095/actuator/health 2>/dev/null)
        HTTP_CODE="${HEALTH_RESPONSE: -3}"
        
        if [ "$HTTP_CODE" = "200" ]; then
            echo "✅ Health check passed (HTTP $HTTP_CODE)"
            break
        else
            echo "⏳ Health check failed (HTTP $HTTP_CODE), retrying... ($i/5)"
            sleep 5
        fi
    done
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "📊 Health check: http://145.223.21.26:9095/actuator/health"
    echo "📝 Logs: tail -f app.log"
    echo "🛑 To stop: kill $BACKEND_PID"
    echo "📋 Process info: ps aux | grep $BACKEND_PID"
else
    echo "❌ Backend failed to start. Check logs:"
    tail -20 app.log
    exit 1
fi 