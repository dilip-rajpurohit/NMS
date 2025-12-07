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
    // Normalize various payload shapes into a canonical device object
    const normalize = (payload) => {
      if (!payload) return null;

      // If payload wraps device under `device` key (some discovery events)
      const d = payload.device || payload;

      // Map possible id fields
      const _id = d._id || d.id || d.deviceId || d.device_id || null;
      const ipAddress = d.ipAddress || d.ip || d.address || d.host || null;
      const name = d.name || d.hostname || d.sysName || null;
      const status = (d.status || d.state || '').toLowerCase() || null;
      const metrics = d.metrics || { responseTime: d.responseTime || null, lastSeen: d.lastSeen || null };
      const deviceType = d.deviceType || d.type || d.model || null;

      return {
        _id,
        id: _id,
        ipAddress,
        ip: ipAddress,
        name,
        hostname: name,
        status,
        metrics,
        deviceType
      };
    };

    const normalized = normalize(device);
    if (!normalized) return;

    setRealTimeData(prev => {
      const existingDevices = Array.isArray(prev.devices) ? prev.devices : [];

      // Try matching by _id or ipAddress
      const deviceIndex = existingDevices.findIndex(d => {
        const existingId = d._id || d.id || d.deviceId;
        const existingIp = d.ipAddress || d.ip;
        return (existingId && normalized._id && existingId.toString() === normalized._id.toString()) ||
               (existingIp && normalized.ipAddress && existingIp === normalized.ipAddress);
      });

      let updatedDevices;
      if (deviceIndex >= 0) {
        updatedDevices = [...existingDevices];
        updatedDevices[deviceIndex] = { ...updatedDevices[deviceIndex], ...normalized };
      } else {
        updatedDevices = [...existingDevices, normalized];
      }

      const onlineCount = updatedDevices.filter(d => (d.status || '').toLowerCase() === 'online' || (d.status || '').toLowerCase() === 'up').length;

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

        // Register this session on the server so activeSessions is tracked
        try {
          newSocket.emit('session.register', { userId: user?.id || null });
        } catch (err) {
          // ignore
        }
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

      // Real-time event handlers - accept both legacy/dotted and simple event names
      // New consolidated dashboard events (primary handlers)
      newSocket.on('dashboard.deviceAdded', (payload) => {
        console.log('📱 Dashboard: Device added', payload);
        if (payload.device) {
          handleDeviceUpdate(payload.device);
        }
        if (payload.dashboardStats) {
          setRealTimeData(prev => ({
            ...prev,
            deviceCount: payload.dashboardStats.totalDevices,
            onlineDevices: payload.dashboardStats.onlineDevices,
            offlineDevices: payload.dashboardStats.offlineDevices,
            networkHealth: payload.dashboardStats.networkHealth,
            alertCount: payload.dashboardStats.alertCount,
            lastUpdate: new Date().toISOString()
          }));
        }
      });

      newSocket.on('dashboard.deviceDeleted', (payload) => {
        console.log('🗑️ Dashboard: Device deleted', payload);
        if (payload.deletedDevice && payload.deletedDevice.deviceId) {
          setRealTimeData(prev => ({
            ...prev,
            devices: (prev.devices || []).filter(d => (d._id || d.id) !== payload.deletedDevice.deviceId),
            lastUpdate: new Date().toISOString()
          }));
        }
        if (payload.dashboardStats) {
          setRealTimeData(prev => ({
            ...prev,
            deviceCount: payload.dashboardStats.totalDevices,
            onlineDevices: payload.dashboardStats.onlineDevices,
            offlineDevices: payload.dashboardStats.offlineDevices,
            networkHealth: payload.dashboardStats.networkHealth,
            alertCount: payload.dashboardStats.alertCount,
            lastUpdate: new Date().toISOString()
          }));
        }
      });

      // Legacy device events (keep for backward compatibility but don't update counts)
      newSocket.on('deviceFound', (payload) => {
        console.log('📱 Legacy: Device found', payload);
        handleDeviceUpdate(payload);
        // Note: Don't update counts here, let dashboard.deviceAdded handle it
      });
      newSocket.on('deviceUpdated', (payload) => {
        console.log('📱 Legacy: Device updated', payload);
        handleDeviceUpdate(payload);
      });
      newSocket.on('device.updated', (payload) => {
        console.log('📱 Legacy: Device updated (dotted)', payload);
        handleDeviceUpdate(payload);
      });
      newSocket.on('deviceStatusChanged', (payload) => {
        console.log('📱 Legacy: Device status changed', payload);
        handleDeviceUpdate(payload);
      });
      newSocket.on('device.statusChanged', (payload) => {
        console.log('📱 Legacy: Device status changed (dotted)', payload);
        handleDeviceUpdate(payload);
      });
      // Device metrics updates
      newSocket.on('device.metrics', (payload) => {
        // payload may include deviceId and metrics
        if (!payload) return;
        if (payload.deviceId || payload._id || payload.id) {
          // attach metrics to device as a device update as well
          handleDeviceUpdate({ device: { _id: payload.deviceId || payload._id || payload.id, metrics: payload.metrics || payload } });
        }
        updateRealTimeData('metrics', payload.metrics || payload);
      });

      // Legacy discovery events (keep for compatibility)
      newSocket.on('discovery.deviceFound', (payload) => {
        console.log('🔍 Legacy: Discovery device found', payload);
        // discovery.deviceFound often contains { scanId, device: {...} }
        if (payload && payload.device) return handleDeviceUpdate(payload.device);
        return handleDeviceUpdate(payload);
        // Note: Don't update counts here, let dashboard.deviceAdded handle it
      });

      newSocket.on('device.deleted', (payload) => {
        console.log('🗑️ Legacy: Device deleted', payload);
        // Keep backward compatibility but don't update counts - let dashboard.deviceDeleted handle it
        if (payload && (payload.id || payload.deviceId)) {
          const deviceId = payload.id || payload.deviceId;
          setRealTimeData(prev => ({
            ...prev,
            devices: (prev.devices || []).filter(d => (d._id || d.id) !== deviceId),
            lastUpdate: new Date().toISOString()
          }));
        }
        // Note: Don't update device counts here
      });

      newSocket.on('newAlert', handleAlertUpdate);
      newSocket.on('alertUpdated', handleAlertUpdate);
      newSocket.on('alertAcknowledged', handleAlertUpdate);
      
      // Legacy dashboard.update handler (disabled to prevent conflicts)
      // Note: dashboard.deviceAdded and dashboard.deviceDeleted now handle all updates
      
      newSocket.on('metricsUpdate', (metrics) => {
        updateRealTimeData('metrics', metrics);
      });
      
      // discovery progress may come under discovery.progress or scanProgress
      newSocket.on('scanProgress', (progress) => updateRealTimeData('scanProgress', progress));
      newSocket.on('discovery.progress', (progress) => updateRealTimeData('scanProgress', progress));

      // Real-time scan status events for production-ready updates
      newSocket.on('discovery.scanStarted', (data) => {
        console.log('🔍 Real-time: Scan started', data);
        updateRealTimeData('scanStatus', 'running');
        updateRealTimeData('scanProgress', 0);
        setRealTimeData(prev => ({
          ...prev,
          scanStatus: 'running',
          scanProgress: 0,
          scanStartTime: new Date().toISOString(),
          lastUpdate: new Date().toISOString()
        }));
      });

      newSocket.on('discovery.scanStopped', (data) => {
        console.log('🛑 Real-time: Scan stopped', data);
        updateRealTimeData('scanStatus', 'idle');
        setRealTimeData(prev => ({
          ...prev,
          scanStatus: 'idle',
          scanStopTime: new Date().toISOString(),
          lastUpdate: new Date().toISOString()
        }));
      });

      newSocket.on('discovery.scanCompleted', (data) => {
        console.log('✅ Real-time: Scan completed', data);
        updateRealTimeData('scanStatus', 'idle');
        updateRealTimeData('scanProgress', 100);
        setRealTimeData(prev => ({
          ...prev,
          scanStatus: 'idle',
          scanProgress: 100,
          scanCompletedTime: new Date().toISOString(),
          lastUpdate: new Date().toISOString()
        }));
        
        // Update network stats if included in scan completion
        if (data.updatedStats) {
          console.log('📊 Updating network stats after scan:', data.updatedStats);
          setRealTimeData(prev => ({
            ...prev,
            deviceCount: data.updatedStats.totalDevices,
            onlineDevices: data.updatedStats.onlineDevices,
            alertCount: data.updatedStats.totalAlerts,
            networkHealth: data.updatedStats.networkHealth,
            lastScanTime: data.endTime,
            scanResults: data.scanResults,
            lastUpdate: new Date().toISOString()
          }));
        }
      });

      newSocket.on('discovery.scanError', (data) => {
        console.log('❌ Real-time: Scan error', data);
        updateRealTimeData('scanStatus', 'idle');
        setRealTimeData(prev => ({
          ...prev,
          scanStatus: 'idle',
          scanError: data.error || 'Unknown scan error',
          lastUpdate: new Date().toISOString()
        }));
      });

      // Network updates after scan completion
      newSocket.on('dashboard.update', (data) => {
        console.log('📊 Real-time: Network stats updated', data);
        if (data.scanResults) {
          // This is a post-scan update
          setRealTimeData(prev => ({
            ...prev,
            deviceCount: data.totalDevices,
            onlineDevices: data.onlineDevices,
            offlineDevices: data.offlineDevices,
            alertCount: data.totalAlerts,
            networkHealth: data.networkHealth,
            lastScanTime: data.lastScanTime,
            scanResults: data.scanResults,
            lastUpdate: new Date().toISOString()
          }));
        }
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