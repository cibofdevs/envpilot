#!/bin/bash

echo "🔍 Checking EnvPilot Backend Status"
echo "===================================="

# Check if Java process is running
echo "📊 Checking Java processes..."
JAVA_PROCESSES=$(ps aux | grep "env-pilot-0.0.1-SNAPSHOT.jar" | grep -v grep)

if [ -n "$JAVA_PROCESSES" ]; then
    echo "✅ Backend process found:"
    echo "$JAVA_PROCESSES"
    
    # Get PID
    PID=$(echo "$JAVA_PROCESSES" | awk '{print $2}')
    echo "📋 Process ID: $PID"
    
    # Check memory usage
    MEMORY=$(ps -o pid,ppid,cmd,%mem,%cpu --no-headers -p $PID 2>/dev/null)
    if [ -n "$MEMORY" ]; then
        echo "💾 Memory usage:"
        echo "$MEMORY"
    fi
else
    echo "❌ No backend process found"
fi

echo ""

# Check if port 9095 is listening
echo "🌐 Checking port 9095..."
if netstat -tlnp 2>/dev/null | grep :9095 > /dev/null; then
    echo "✅ Port 9095 is listening"
    netstat -tlnp 2>/dev/null | grep :9095
else
    echo "❌ Port 9095 is not listening"
fi

echo ""

# Check health endpoint
echo "🏥 Checking health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:9095/actuator/health 2>/dev/null)
HTTP_CODE="${HEALTH_RESPONSE: -3}"
RESPONSE_BODY="${HEALTH_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health check passed (HTTP $HTTP_CODE)"
    echo "📋 Response: $RESPONSE_BODY"
else
    echo "❌ Health check failed (HTTP $HTTP_CODE)"
    if [ -n "$RESPONSE_BODY" ]; then
        echo "📋 Response: $RESPONSE_BODY"
    fi
fi

echo ""

# Check recent logs
echo "📝 Recent logs (last 10 lines):"
if [ -f "/root/envpilot/backend/app.log" ]; then
    tail -10 /root/envpilot/backend/app.log
else
    echo "❌ Log file not found"
fi 