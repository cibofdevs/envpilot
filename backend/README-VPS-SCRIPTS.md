# EnvPilot Backend VPS Scripts

Script-script untuk mengelola backend EnvPilot di VPS.

## 📋 Daftar Script

### 1. `vps-troubleshoot.sh`
**Fungsi:** Troubleshooting dan diagnosa masalah backend
```bash
bash vps-troubleshoot.sh
```
**Yang dicek:**
- ✅ Java installation
- ✅ Maven installation  
- ✅ Project directory
- ✅ Disk space
- ✅ Memory usage
- ✅ Port availability
- ✅ Firewall settings
- ✅ Recent logs
- ✅ Java processes

### 2. `start-backend-vps.sh`
**Fungsi:** Menjalankan backend di VPS
```bash
bash start-backend-vps.sh
```
**Yang dilakukan:**
- 🔄 Stop existing processes
- 🔨 Build project (jika JAR tidak ada)
- 🚀 Start backend dengan nohup
- ✅ Health check
- 📊 Status report

### 3. `stop-backend-vps.sh`
**Fungsi:** Menghentikan backend di VPS
```bash
bash stop-backend-vps.sh
```
**Yang dilakukan:**
- 🔍 Find backend processes
- 🛑 Kill processes gracefully
- ⚡ Force kill jika perlu
- ✅ Verify port is free

### 4. `restart-backend-vps.sh`
**Fungsi:** Restart backend di VPS
```bash
bash restart-backend-vps.sh
```
**Yang dilakukan:**
- 🛑 Stop backend
- ⏳ Wait for processes to stop
- 🚀 Start backend
- ✅ Status report

### 5. `check-backend-status.sh`
**Fungsi:** Mengecek status backend
```bash
bash check-backend-status.sh
```
**Yang dicek:**
- 📊 Java processes
- 💾 Memory usage
- 🌐 Port 9095
- 🏥 Health endpoint
- 📝 Recent logs

### 6. `deploy-and-start-vps.sh`
**Fungsi:** Deploy dan jalankan backend (full deployment)
```bash
bash deploy-and-start-vps.sh
```
**Yang dilakukan:**
- 🛑 Stop existing processes
- 🔨 Clean build project
- 🚀 Start backend
- ⏳ Wait for startup
- 🏥 Health check
- ✅ Deployment report

## 🚀 Quick Start

### Langkah 1: Troubleshooting
```bash
cd /root/envpilot/backend
bash vps-troubleshoot.sh
```

### Langkah 2: Deploy dan Start
```bash
bash deploy-and-start-vps.sh
```

### Langkah 3: Check Status
```bash
bash check-backend-status.sh
```

## 🔧 Troubleshooting

### Backend tidak start
1. **Cek Java:** `java -version`
2. **Cek Maven:** `mvn -version`
3. **Cek disk space:** `df -h`
4. **Cek memory:** `free -m`
5. **Cek logs:** `tail -f app.log`

### Port 9095 sudah digunakan
```bash
# Cek process yang menggunakan port
netstat -tlnp | grep :9095

# Kill process
kill -9 <PID>
```

### Firewall blocking
```bash
# Allow port 9095
ufw allow 9095
```

## 📊 Monitoring

### Check logs real-time
```bash
tail -f /root/envpilot/backend/app.log
```

### Check process status
```bash
ps aux | grep env-pilot
```

### Check health endpoint
```bash
curl http://localhost:9095/actuator/health
```

## 🛑 Emergency Stop

Jika backend hang atau bermasalah:
```bash
# Force kill semua Java processes
pkill -9 java

# Atau kill specific process
kill -9 <PID>
```

## 📝 Log Files

- **Application logs:** `/root/envpilot/backend/app.log`
- **Build logs:** Output dari Maven build
- **System logs:** `/var/log/syslog`

## 🔄 Auto-restart

Untuk auto-restart jika crash, gunakan systemd service atau supervisor.

## 📞 Support

Jika ada masalah:
1. Jalankan `vps-troubleshoot.sh`
2. Cek logs dengan `tail -f app.log`
3. Restart dengan `restart-backend-vps.sh` 