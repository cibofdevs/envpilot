#!/bin/bash

echo "🛑 Stopping EnvPilot Backend on VPS"
echo "===================================="

# Find and kill Java processes for this app
echo "🔍 Looking for backend processes..."
JAVA_PROCESSES=$(ps aux | grep "env-pilot-0.0.1-SNAPSHOT.jar" | grep -v grep)

if [ -n "$JAVA_PROCESSES" ]; then
    echo "📊 Found backend processes:"
    echo "$JAVA_PROCESSES"
    
    # Get PIDs
    PIDS=$(echo "$JAVA_PROCESSES" | awk '{print $2}')
    
    echo "🔄 Stopping processes..."
    for PID in $PIDS; do
        echo "   Stopping PID: $PID"
        kill $PID
    done
    
    # Wait for processes to stop
    sleep 3
    
    # Check if processes are still running
    REMAINING_PROCESSES=$(ps aux | grep "env-pilot-0.0.1-SNAPSHOT.jar" | grep -v grep)
    if [ -n "$REMAINING_PROCESSES" ]; then
        echo "⚠️ Some processes still running, force killing..."
        for PID in $PIDS; do
            if ps -p $PID > /dev/null 2>&1; then
                echo "   Force killing PID: $PID"
                kill -9 $PID
            fi
        done
    fi
    
    echo "✅ Backend stopped successfully"
else
    echo "ℹ️ No backend processes found"
fi

# Check if port is still in use
echo ""
echo "🌐 Checking if port 9095 is still in use..."
if netstat -tlnp 2>/dev/null | grep :9095 > /dev/null; then
    echo "⚠️ Port 9095 is still in use"
    netstat -tlnp 2>/dev/null | grep :9095
else
    echo "✅ Port 9095 is free"
fi 