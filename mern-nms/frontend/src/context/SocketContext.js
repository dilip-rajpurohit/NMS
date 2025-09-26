import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [realTimeData, setRealTimeData] = useState({
    devices: [],
    alerts: [],
    metrics: {},
    deviceCount: 0,
    alertCount: 0,
    onlineDevices: 0,
    scanProgress: 0,
    lastUpdate: null
  });
  const { user } = useAuth();

  const updateRealTimeData = useCallback((type, data) => {
    setRealTimeData(prev => ({
      ...prev,
      [type]: data,
      lastUpdate: new Date().toISOString()
    }));
  }, []);

  const handleDeviceUpdate = useCallback((device) => {
    setRealTimeData(prev => {
      const existingDevices = prev.devices || [];
      const deviceIndex = existingDevices.findIndex(d => d.id === device.id || d.ip === device.ip);
      
      let updatedDevices;
      if (deviceIndex >= 0) {
        updatedDevices = [...existingDevices];
        updatedDevices[deviceIndex] = { ...updatedDevices[deviceIndex], ...device };
      } else {
        updatedDevices = [...existingDevices, device];
      }
      
      const onlineCount = updatedDevices.filter(d => d.status === 'online' || d.status === 'up').length;
      
      return {
        ...prev,
        devices: updatedDevices,
        deviceCount: updatedDevices.length,
        onlineDevices: onlineCount,
        lastUpdate: new Date().toISOString()
      };
    });
  }, []);

  const handleAlertUpdate = useCallback((alert) => {
    setRealTimeData(prev => {
      const existingAlerts = prev.alerts || [];
      const alertIndex = existingAlerts.findIndex(a => a.id === alert.id);
      
      let updatedAlerts;
      if (alertIndex >= 0) {
        updatedAlerts = [...existingAlerts];
        updatedAlerts[alertIndex] = { ...updatedAlerts[alertIndex], ...alert };
      } else {
        updatedAlerts = [alert, ...existingAlerts];
      }
      
      const activeAlerts = updatedAlerts.filter(a => !a.acknowledged).length;
      
      return {
        ...prev,
        alerts: updatedAlerts,
        alertCount: activeAlerts,
        lastUpdate: new Date().toISOString()
      };
    });
  }, []);

  useEffect(() => {
    if (user) {
      // Initialize socket connection when user is authenticated
      const socketUrl = process.env.REACT_APP_WS_URL || `${window.location.protocol}//${window.location.hostname}:${process.env.REACT_APP_BACKEND_PORT}`;
      const newSocket = io(socketUrl, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setConnected(true);
        setReconnectAttempts(0);
        
        // Request initial data
        newSocket.emit('requestInitialData');
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnected(false);
        setReconnectAttempts(prev => prev + 1);
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        setConnected(true);
        setReconnectAttempts(0);
      });

      // Real-time event handlers
      newSocket.on('deviceFound', handleDeviceUpdate);
      newSocket.on('deviceUpdated', handleDeviceUpdate);
      newSocket.on('deviceStatusChanged', handleDeviceUpdate);
      
      newSocket.on('newAlert', handleAlertUpdate);
      newSocket.on('alertUpdated', handleAlertUpdate);
      newSocket.on('alertAcknowledged', handleAlertUpdate);
      
      newSocket.on('metricsUpdate', (metrics) => {
        updateRealTimeData('metrics', metrics);
      });
      
      newSocket.on('scanProgress', (progress) => {
        updateRealTimeData('scanProgress', progress);
      });
      
      newSocket.on('initialData', (data) => {
        setRealTimeData(prev => ({
          ...prev,
          ...data,
          lastUpdate: new Date().toISOString()
        }));
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      // Clean up socket when user logs out
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
        setRealTimeData({
          devices: [],
          alerts: [],
          metrics: {},
          deviceCount: 0,
          alertCount: 0,
          onlineDevices: 0,
          scanProgress: 0,
          lastUpdate: null
        });
      }
    }
  }, [user, handleDeviceUpdate, handleAlertUpdate, updateRealTimeData]);

  const emit = (event, data) => {
    if (socket && connected) {
      socket.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  const subscribe = useCallback((events, callback) => {
    if (socket) {
      events.forEach(event => socket.on(event, callback));
      return () => {
        events.forEach(event => socket.off(event, callback));
      };
    }
    return () => {};
  }, [socket]);

  const value = {
    socket,
    connected,
    reconnectAttempts,
    realTimeData,
    updateRealTimeData,
    emit,
    on,
    off,
    subscribe,
    // Legacy compatibility
    deviceCount: realTimeData.deviceCount,
    alertCount: realTimeData.alertCount,
    onlineDevices: realTimeData.onlineDevices,
    devices: realTimeData.devices,
    alerts: realTimeData.alerts,
    metrics: realTimeData.metrics,
    scanProgress: realTimeData.scanProgress
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};