#!/bin/bash

echo "🔧 EnvPilot Backend VPS Troubleshooting"
echo "========================================"

# Check Java installation
echo "☕ Checking Java installation..."
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1)
    echo "✅ Java found: $JAVA_VERSION"
else
    echo "❌ Java not found!"
    echo "💡 Install Java: apt update && apt install openjdk-17-jdk"
    exit 1
fi

# Check Maven installation
echo ""
echo "📦 Checking Maven installation..."
if command -v mvn &> /dev/null; then
    MVN_VERSION=$(mvn -version 2>&1 | head -n 1)
    echo "✅ Maven found: $MVN_VERSION"
else
    echo "❌ Maven not found!"
    echo "💡 Install Maven: apt install maven"
    exit 1
fi

# Check if project directory exists
echo ""
echo "📁 Checking project directory..."
if [ -d "/root/envpilot/backend" ]; then
    echo "✅ Project directory found: /root/envpilot/backend"
else
    echo "❌ Project directory not found!"
    echo "💡 Clone repository: git clone https://github.com/cibofdevs/envpilot.git /root/envpilot"
    exit 1
fi

# Check if pom.xml exists
if [ -f "/root/envpilot/backend/pom.xml" ]; then
    echo "✅ pom.xml found"
else
    echo "❌ pom.xml not found!"
    exit 1
fi

# Check disk space
echo ""
echo "💾 Checking disk space..."
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "⚠️ Low disk space: ${DISK_USAGE}% used"
else
    echo "✅ Disk space OK: ${DISK_USAGE}% used"
fi

# Check memory
echo ""
echo "🧠 Checking memory..."
FREE_MEM=$(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')
echo "Memory usage: $FREE_MEM"

# Check if port 9095 is in use
echo ""
echo "🌐 Checking port 9095..."
if netstat -tlnp 2>/dev/null | grep :9095 > /dev/null; then
    echo "⚠️ Port 9095 is in use:"
    netstat -tlnp 2>/dev/null | grep :9095
else
    echo "✅ Port 9095 is free"
fi

# Check firewall
echo ""
echo "🔥 Checking firewall..."
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(ufw status | head -1)
    echo "UFW Status: $UFW_STATUS"
    if echo "$UFW_STATUS" | grep -q "active"; then
        echo "⚠️ UFW is active - make sure port 9095 is allowed"
        echo "💡 Allow port: ufw allow 9095"
    fi
else
    echo "ℹ️ UFW not installed"
fi

# Check recent logs
echo ""
echo "📝 Checking recent logs..."
if [ -f "/root/envpilot/backend/app.log" ]; then
    echo "Recent log entries:"
    tail -5 /root/envpilot/backend/app.log
else
    echo "ℹ️ No log file found"
fi

# Check Java processes
echo ""
echo "📊 Checking Java processes..."
JAVA_PROCESSES=$(ps aux | grep java | grep -v grep)
if [ -n "$JAVA_PROCESSES" ]; then
    echo "Java processes running:"
    echo "$JAVA_PROCESSES"
else
    echo "ℹ️ No Java processes running"
fi

echo ""
echo "🔧 Troubleshooting complete!"
echo "💡 To start backend: bash /root/envpilot/backend/start-backend-vps.sh"
echo "💡 To check status: bash /root/envpilot/backend/check-backend-status.sh"
echo "💡 To restart: bash /root/envpilot/backend/restart-backend-vps.sh" 