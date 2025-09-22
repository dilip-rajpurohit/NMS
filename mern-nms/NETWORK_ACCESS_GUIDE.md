# NMS Network Access Guide

## 🌍 Multi-Device Deployment

This guide ensures you won't have network login issues when deploying NMS on any laptop or device.

## ✅ Recommended Deployment (No Network Issues)

### For Home/Development Use:
```bash
# This prevents network login issues
./deploy.sh --non-interactive
```
**OR** in interactive mode, when prompted:
```
Allow connections from any IP address? (Y/n): [Press Enter or type 'y']
```

## 🔧 What This Fixes

### ❌ Without Proper CORS (Network Login Issues):
- Can only access from localhost (127.0.0.1)
- Network login fails from other devices
- CORS errors in browser console
- "Network error" when trying to login from phones/tablets

### ✅ With Proper CORS (No Network Issues):
- Access from any device on the network
- Works on laptops, phones, tablets, desktops
- No login errors
- Seamless multi-device experience

## 📱 Access URLs

Once deployed with proper CORS, access from any device using:
```
http://[YOUR-IP]:3000
```

Examples:
- `http://192.168.1.100:3000`
- `http://10.0.0.50:3000`
- `http://172.16.1.200:3000`

## 🔒 Security Modes

### Development/Home Use (Recommended):
- `ALLOW_ALL_ORIGINS=true`
- ✅ No network login issues
- ✅ Multi-device access
- ⚠️  Less secure (suitable for private networks)

### Production Use:
- `ALLOW_ALL_ORIGINS=false`
- 🔒 More secure
- ⚠️  May have network access limitations

## 🚀 Quick Deployment Steps

1. **On any laptop, run:**
   ```bash
   git clone [your-repo]
   cd NMS/mern-nms
   ./deploy.sh --non-interactive
   ```

2. **Note the IP address shown:**
   ```
   Frontend URL: http://192.168.x.x:3000
   ```

3. **Access from any device:**
   - Open browser on any device
   - Navigate to the Frontend URL
   - Login with: admin / admin123

## 🛠️ Troubleshooting

### If you still get network login issues:

1. **Check CORS setting:**
   ```bash
   grep ALLOW_ALL_ORIGINS .env
   ```
   Should show: `ALLOW_ALL_ORIGINS=true`

2. **If it shows `false`, fix it:**
   ```bash
   sed -i 's/ALLOW_ALL_ORIGINS=false/ALLOW_ALL_ORIGINS=true/' .env
   docker compose restart backend
   ```

3. **Check Content Security Policy (CSP) - MOST COMMON ISSUE:**
   ```bash
   curl -v http://[YOUR-IP]:3000 2>&1 | grep "Content-Security-Policy"
   ```
   Should include your server IP in connect-src like: `http://192.168.x.x:5000`

4. **If CSP doesn't include your IP, rebuild frontend:**
   ```bash
   docker compose build frontend
   docker compose up -d frontend
   ```

5. **Verify CSP is fixed:**
   ```bash
   curl -v http://[YOUR-IP]:3000 2>&1 | grep "connect-src"
   ```
   Should show your IP: `http://192.168.x.x:5000 ws://192.168.x.x:5000`

6. **Check firewall (if needed):**
   ```bash
   # Ubuntu/Debian
   sudo ufw allow 3000
   sudo ufw allow 5000
   ```

### Common Error Symptoms:

❌ **CSP Violation Error (Browser Console):**
```
Refused to connect to 'http://192.168.x.x:5000/api/auth/login' 
because it violates the following Content Security Policy directive: 
"connect-src 'self' http://backend:5000..."
```
**Solution:** Rebuild frontend container (step 4 above)

❌ **CORS Error:**
```
Access to fetch at 'http://192.168.x.x:5000/api/auth/login' from origin 
'http://192.168.x.x:3000' has been blocked by CORS policy
```
**Solution:** Set ALLOW_ALL_ORIGINS=true (step 2 above)

## 📋 Default Credentials

- **Username:** admin
- **Password:** admin123
- **Email:** admin@example.com

Remember to change these after first login!

---

✅ **With this configuration, you should never experience network login issues on any deployment!**