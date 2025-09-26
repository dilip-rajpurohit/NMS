# NMS Cross-Platform Setup

## Quick Setup Commands

### Windows Command Prompt
```cmd
git clone <repository-url>
cd NMS\mern-nms
deploy.bat
```

### Windows PowerShell
```powershell
git clone <repository-url>
cd NMS/mern-nms
./deploy.bat
```

### Git Bash (Windows)
```bash
git clone <repository-url>
cd NMS/mern-nms
bash deploy.sh
```

### Linux/macOS Terminal
```bash
git clone <repository-url>
cd NMS/mern-nms
chmod +x deploy.sh
./deploy.sh
```

## Troubleshooting

### Windows Docker Issues
- Ensure Docker Desktop is running
- Enable WSL2 integration in Docker settings
- Run as Administrator if permission errors occur

### Line Ending Issues (Windows)
- Git automatically converts line endings
- Scripts include automatic CRLF to LF conversion
- Use Git Bash if Command Prompt has issues

### Network Access
- Windows: Check Windows Firewall settings
- All platforms: Verify Docker containers bind to 0.0.0.0
- Set correct IP address in .env file