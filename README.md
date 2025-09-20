# Network Management System (NMS) - MERN Stack

A modern, real-time Network Management System built with the MERN stack (MongoDB, Express.js, React, Node.js) designed for live Mininet topology monitoring.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (Docker container provided)
- Docker (for MongoDB)

### Run Both Services
```bash
# from repo root
npm start
```
This runs `mern-nms/dev` which starts: 
- Backend on `http://localhost:5000` (with `nodemon`)
- Frontend on `http://localhost:3000` (Create React App)

### Access the Application
- **Web UI**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Default Login**: admin / admin123

## 📁 Project Structure

```
mern-nms/
├── backend/                 # Express.js API server
│   ├── models/             # MongoDB data models
│   ├── routes/             # API route handlers
│   ├── server.js           # Main server file
│   └── .env               # Backend configuration
├── frontend/               # React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/       # React context providers
│   │   └── services/      # API services
│   └── .env              # Frontend configuration
├── utils/                  # Utility scripts
│   ├── auto_mininet_scanner.py  # Mininet network scanner
│   └── test_mininet_topology.sh # Test topology script
├── docker-compose.yml      # Multi-container setup
├── start-nms.sh           # Startup script
└── package.json           # Root package configuration
```

## 🔗 Mininet Integration

See [MININET_INTEGRATION.md](./MININET_INTEGRATION.md) for detailed instructions on:
- Setting up Mininet topologies
- Automatic network discovery
- Live monitoring configuration

## 🛠 Development

### Backend (Express.js + MongoDB)
```bash
cd backend
npm run dev
```

### Frontend (React)
```bash
cd frontend
npm start
```

### Using Docker
```bash
docker-compose up -d
```

## 📊 Features

- **Real-time Monitoring**: Live device status updates via Socket.IO
- **Network Discovery**: Automatic detection of network devices
- **Topology Visualization**: Interactive network topology maps  
- **Device Management**: Comprehensive device inventory
- **Alert System**: Automated alerting with multiple severity levels
- **Performance Metrics**: Real-time and historical performance data
- **User Authentication**: JWT-based secure authentication
- **Responsive Design**: Modern Bootstrap-based UI

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```env
PORT=5000
MONGODB_URI=mongodb://admin:password123@localhost:27017/nms?authSource=admin
JWT_SECRET=your_super_secret_jwt_key_here
```

**Frontend (.env)**
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

## 📝 API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Devices  
- `GET /api/devices` - Get all devices
- `POST /api/devices` - Add new device
- `GET /api/devices/alerts` - Get device alerts

### Discovery
- `POST /api/discovery/start` - Start network discovery
- `GET /api/discovery/results` - Get discovery results

### Topology
- `GET /api/topology` - Get network topology

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details