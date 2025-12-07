import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Row, Col, Card, Badge, Button, Alert, Spinner, Container, OverlayTrigger, Tooltip, Modal, Form } from 'react-bootstrap';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import api, { discoveryAPI, devicesAPI } from '../../services/api';
import { formatTimestamp, getSeverityBadge } from '../../utils/common';
import ErrorHandler from '../../utils/ErrorHandler';
import '../../styles/dashboard.css';

const Dashboard = () => {
  const [networkStatus, setNetworkStatus] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    discoveredToday: 0,
    alertCount: 0,
    networkHealth: 0
  });
  
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [quickActions, setQuickActions] = useState([]);
  const [systemOverview, setSystemOverview] = useState({
    scanStatus: 'idle',
    lastScan: null,
    activeSessions: 0,
    totalDataTransfer: '0.00 GB',
    transferRate: '0 KB/s',
    memoryUsage: 0,
    systemUptime: 0,
    cpuCount: 0,
    platform: '',
    hostname: '',
    loadAverage: [],
    networkInterfaces: 0
  });
  
  const [networkPerformance, setNetworkPerformance] = useState({
    totalTrafficRate: 0,
    avgUtilization: 0,
    maxUtilization: 0,
    avgResponseTime: 0,
    errorRate: 0,
    congestionLevel: 'none',
    activeInterfaces: 0
  });
  
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLiveUpdating, setIsLiveUpdating] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states for production-ready UI
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAdvancedScanModal, setShowAdvancedScanModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({});
  
  // Form state for modals
  const [networkSelection, setNetworkSelection] = useState('');
  const [customNetwork, setCustomNetwork] = useState('');
  const [deviceIP, setDeviceIP] = useState('');
  const [deviceIPError, setDeviceIPError] = useState('');
  
  // Advanced scan configuration state
  const [advancedScanConfig, setAdvancedScanConfig] = useState({
    scanType: 'comprehensive',
    networkRange: 'auto',
    customRange: '',
    customMethods: 'ping,arp,port',
    timeout: 3000
  });
  
  // Cleanup ref for memory leak prevention
  const timeoutRef = useRef(null);
  
  // Network scanning state
  const [networkScanConfig, setNetworkScanConfig] = useState({
    availableNetworks: [],
    selectedNetwork: '',
    showNetworkSelector: false,
    autoDetected: null
  });
  const [scanningState, setScanningState] = useState({
    isScanning: false,
    scanProgress: 0,
    scanStatus: 'idle',
    canStop: false
  });
  const [actionLoading, setActionLoading] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  
  const { socket, connected, realTimeData, subscribe } = useSocket();
  const { user } = useAuth();

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Production-ready success message with auto-clear
  const showSuccess = useCallback((message) => {
    setSuccessMessage(message);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setSuccessMessage('');
    }, 4000);
  }, []);

  // Helper function to set loading state for specific actions
  const setButtonLoading = useCallback((buttonId, isLoading) => {
    setActionLoading(prev => ({
      ...prev,
      [buttonId]: isLoading
    }));
  }, []);

  // Production-ready error handler
  const handleError = useCallback((error, context) => {
    console.error(`${context}:`, error);
    ErrorHandler.handle(error, context);
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    setError(`${context}: ${message}`);
  }, []);

  // Modal management
  const closeAllModals = useCallback(() => {
    // Handle cancellation if modal was closed without selection
    const { cancel } = modalConfig;
    if (cancel && typeof cancel === 'function') {
      cancel();
    }
    
    setShowNetworkModal(false);
    setShowAddDeviceModal(false);
    setShowConfirmModal(false);
    setShowAdvancedScanModal(false);
    setModalConfig({});
    setNetworkSelection('');
    setCustomNetwork('');
    setDeviceIP('');
    setDeviceIPError('');
  }, [modalConfig]);

  const showConfirmation = useCallback((title, message, onConfirm) => {
    setModalConfig({ title, message, onConfirm });
    setShowConfirmModal(true);
  }, []);

  // Real-time data updates
  useEffect(() => {
    if (realTimeData) {
      setNetworkStatus(prev => ({
        ...prev,
        totalDevices: realTimeData.deviceCount || prev.totalDevices,
        onlineDevices: realTimeData.onlineDevices || prev.onlineDevices,
        offlineDevices: (realTimeData.deviceCount || prev.totalDevices) - (realTimeData.onlineDevices || prev.onlineDevices),
        alertCount: realTimeData.alertCount || prev.alertCount,
        networkHealth: realTimeData.networkHealth || prev.networkHealth
      }));
      
      // Real-time scan status updates for production-ready interface
      if (realTimeData.scanStatus !== undefined) {
        console.log('🔄 Real-time scan status update:', realTimeData.scanStatus);
        setScanningState(prev => ({
          ...prev,
          isScanning: realTimeData.scanStatus === 'running',
          scanStatus: realTimeData.scanStatus,
          canStop: realTimeData.scanStatus === 'running'
        }));
        setSystemOverview(prev => ({
          ...prev,
          scanStatus: realTimeData.scanStatus
        }));
      }
      
      // Track scan progress
      if (realTimeData.scanProgress !== undefined) {
        setScanningState(prev => ({
          ...prev,
          scanProgress: realTimeData.scanProgress
        }));
      }
      
      // Network updates after scan completion
      if (realTimeData.scanResults) {
        console.log('📊 Network updated after scan:', realTimeData.scanResults);
        
        // Reset scanning state
        setScanningState(prev => ({
          ...prev,
          isScanning: false,
          scanProgress: 0,
          scanStatus: 'completed',
          canStop: false
        }));
        
        if (realTimeData.scanResults.newDevices > 0) {
          showSuccess(`🔍 Scan completed! Found ${realTimeData.scanResults.newDevices} new devices. Network updated.`);
        // Update only specific stats instead of full refresh
        setNetworkStatus(prev => ({
          ...prev,
          totalDevices: prev.totalDevices + (realTimeData.scanResults.newDevices || 0),
          discoveredToday: prev.discoveredToday + (realTimeData.scanResults.newDevices || 0)
        }));
        } else if (realTimeData.scanResults.totalScanned > 0) {
          showSuccess(`🔍 Scan completed! Scanned ${realTimeData.scanResults.totalScanned} hosts. Network updated.`);
          // Light update instead of full refresh
          setLastUpdated(new Date());
        }
        
        // Update last scan time
        setSystemOverview(prev => ({
          ...prev,
          lastScan: new Date(realTimeData.lastScanTime),
          scanResults: realTimeData.scanResults
        }));
      }
      
      if (realTimeData.alerts) {
        setRecentAlerts(realTimeData.alerts.slice(0, 3)); // Only top 3 for compact view
      }
      
      setLastUpdated(new Date());
    }
  }, [realTimeData]);

  // Subscribe to real-time events  
  useEffect(() => {
    if (socket && connected) {
      const unsubscribe = subscribe([
        'dashboard.deviceAdded',
        'dashboard.deviceDeleted',
        'deviceStatusChanged',
        'newAlert',
        'discovery.scanStarted',
        'discovery.scanCompleted',
        'discovery.scanStopped',
        'discovery.scanProgress',
        'device.discovered'
      ], (data) => {
        // Handle different event types
        if (data.type === 'discovery.scanStarted' || data.event === 'discovery.scanStarted') {
          setSystemOverview(prev => ({ ...prev, scanStatus: 'running' }));
          showSuccess(`Network scan started for range: ${data.networkRange || 'default'}`);
        } else if (data.type === 'discovery.scanCompleted' || data.event === 'discovery.scanCompleted') {
          setSystemOverview(prev => ({ 
            ...prev, 
            scanStatus: 'idle',
            lastScan: new Date()
          }));
          showSuccess(`Discovery completed! Found ${data.foundDevices || 0} devices in ${(data.duration/1000).toFixed(1)}s`);
        } else if (data.type === 'discovery.scanStopped' || data.event === 'discovery.scanStopped') {
          setSystemOverview(prev => ({ ...prev, scanStatus: 'idle' }));
          showSuccess('Network scan stopped');
        } else if (data.type === 'discovery.scanProgress' || data.event === 'discovery.scanProgress') {
          // Update scan progress with real-time data
          console.log(`Scan progress: ${data.progress}% (${data.scannedHosts}/${data.totalHosts})`);
          setScanningState(prev => ({
            ...prev,
            scanProgress: data.progress || 0,
            isScanning: true,
            canStop: true
          }));
        } else if (data.type === 'device.discovered' || data.event === 'device.discovered') {
          showSuccess(`🎯 New device discovered: ${data.device?.ip || 'Unknown IP'}`);
          // Increment discovered count and update device counts with targeted updates
          setSystemOverview(prev => ({ 
            ...prev, 
            discoveredToday: prev.discoveredToday + 1 
          }));
          setNetworkStatus(prev => ({
            ...prev,
            totalDevices: prev.totalDevices + 1
          }));
        }
        
        // Update timestamp only - no full page refresh for production performance
        setLastUpdated(new Date());
      });

      return unsubscribe;
    }
  }, [socket, connected, subscribe]);

  // Lightweight function for frequently changing metrics only - REAL-TIME UPDATES
  const fetchLiveMetrics = useCallback(async () => {
    try {
      // Skip if no user authenticated
      if (!user) return;
      
      setIsLiveUpdating(true);
      // Fetch live metrics for real-time updates
      const metricsRes = await api.get('/dashboard/live-metrics').catch(err => {
        if (err.response?.status === 401) {
          console.log('🔒 Authentication required for live metrics');
          return { data: null };
        }
        throw err;
      });
      
      if (!metricsRes.data) return;
      const liveData = metricsRes.data;
      
      if (liveData) {
        // Update system metrics
        setSystemOverview(prev => ({
          ...prev,
          memoryUsage: liveData.memoryUsage ?? prev.memoryUsage,
          totalDataTransfer: liveData.totalDataTransfer ?? prev.totalDataTransfer,
          transferRate: liveData.transferRate ?? prev.transferRate,
          activeSessions: liveData.activeSessions ?? prev.activeSessions,
          loadAverage: liveData.loadAverage ?? prev.loadAverage,
          systemUptime: liveData.systemUptime ?? prev.systemUptime,
          scanStatus: liveData.scanStatus ?? prev.scanStatus,
          lastScan: liveData.lastScan ? new Date(liveData.lastScan) : prev.lastScan
        }));
        
        // Update network status with live calculations
        if (liveData.networkStatus) {
          setNetworkStatus(prev => ({
            ...prev,
            totalDevices: liveData.networkStatus.totalDevices ?? prev.totalDevices,
            onlineDevices: liveData.networkStatus.onlineDevices ?? prev.onlineDevices,
            offlineDevices: liveData.networkStatus.offlineDevices ?? prev.offlineDevices,
            alertCount: liveData.networkStatus.alertCount ?? prev.alertCount,
            networkHealth: liveData.networkStatus.networkHealth ?? prev.networkHealth,
            discoveredToday: liveData.networkStatus.discoveredToday ?? prev.discoveredToday
          }));
        }
        
        // Update network performance metrics
        if (liveData.networkPerformance) {
          setNetworkPerformance(prev => ({
            ...prev,
            totalTrafficRate: liveData.networkPerformance.totalTrafficRate ?? prev.totalTrafficRate,
            avgUtilization: liveData.networkPerformance.avgUtilization ?? prev.avgUtilization,
            maxUtilization: liveData.networkPerformance.maxUtilization ?? prev.maxUtilization,
            avgResponseTime: liveData.networkPerformance.avgResponseTime ?? prev.avgResponseTime,
            errorRate: liveData.networkPerformance.errorRate ?? prev.errorRate,
            congestionLevel: liveData.networkPerformance.congestionLevel ?? prev.congestionLevel,
            activeInterfaces: liveData.networkPerformance.activeInterfaces ?? prev.activeInterfaces
          }));
        }
        
        setLastUpdated(new Date());
      }
    } catch (error) {
      // Silent fail to avoid disrupting UX for background updates
      console.debug('Live metrics update failed:', error.message);
    } finally {
      setIsLiveUpdating(false);
    }
  }, [user]);

  // Removed duplicate polling - consolidated into single useEffect above

  // Smart dashboard update - avoids unnecessary full refreshes
  const updateDashboardContent = useCallback(async (sections = ['all']) => {
    try {
      // Skip API calls if user is not authenticated
      if (!user) {
        setLoading(false);
        return;
      }

      // If real-time data is recent, prefer it over API calls
      if (realTimeData?.lastUpdate) {
        const dataAge = Date.now() - new Date(realTimeData.lastUpdate).getTime();
        if (dataAge < 10000) {
          console.log('📡 Using recent real-time data instead of API fetch');
          return;
        }
      }

      setLoading(true);
      setError(null);
      
      // Only fetch sections that are requested
      if (sections.includes('all') || sections.includes('overview')) {
        const overviewRes = await api.get('/dashboard/system-overview').catch(err => {
          if (err.response?.status === 401) {
            console.log('🔒 Authentication required for dashboard data');
            setError('Please log in to view dashboard data');
            return { data: null };
          }
          throw err;
        });
        
        if (!overviewRes.data) return;
        const overviewData = overviewRes.data;
        
        if (overviewData.networkStatus) {
          setNetworkStatus(prev => ({
            ...prev,
            ...overviewData.networkStatus
          }));
        }
        
        if (overviewData.systemMetrics) {
          setSystemOverview(prev => ({
            ...prev,
            memoryUsage: overviewData.systemMetrics.memoryUsage,
            systemUptime: overviewData.systemMetrics.systemUptime,
            cpuCount: overviewData.systemMetrics.cpuCount,
            totalDataTransfer: overviewData.systemMetrics.totalDataTransfer || '0.00 GB',
            transferRate: overviewData.systemMetrics.transferRate || '0 KB/s',
            platform: overviewData.systemMetrics.platform || '',
            hostname: overviewData.systemMetrics.hostname || '',
            loadAverage: overviewData.systemMetrics.loadAverage || [],
            networkInterfaces: overviewData.systemMetrics.networkInterfaces || 0,
            scanStatus: overviewData.systemMetrics.scanStatus || 'idle',
            lastScan: overviewData.systemMetrics.lastScan ? new Date(overviewData.systemMetrics.lastScan) : null,
            activeSessions: overviewData.systemMetrics.activeSessions || 0
          }));
        }
      }
      
      if (sections.includes('all') || sections.includes('alerts')) {
        const alertsRes = await api.get('/alerts').catch(() => ({ data: { alerts: [] } }));
        const alerts = alertsRes.data.alerts || [];
        setRecentAlerts(alerts.slice(0, 3));
      }
      
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Dashboard content update error:', err);
      setError('Failed to update dashboard content');
    } finally {
      setLoading(false);
    }
  }, []);

  // Full dashboard data fetch (for initial load and manual refresh)
  const fetchDashboardData = useCallback(async () => {
    return updateDashboardContent(['all']);
  }, [updateDashboardContent]);

  // Setup data fetching strategy - optimized for faster loading
  useEffect(() => {
    // Skip data fetching if no user (avoid errors)
    if (!user) {
      setLoading(false);
      return;
    }
    
    // Initial full load
    fetchDashboardData();
    
    // Use longer intervals to reduce API load
    const interval = setInterval(fetchLiveMetrics, 15000); // Reduced frequency from 5s to 15s
    
    return () => {
      clearInterval(interval);
    };
  }, [fetchDashboardData, fetchLiveMetrics, user]);

  // Real-time data integration from Socket.IO
  useEffect(() => {
    if (realTimeData && realTimeData.lastUpdate) {
      console.log('📡 Updating dashboard with real-time data:', realTimeData);
      
      // Update network status with real-time data
      if (realTimeData.deviceCount !== undefined || realTimeData.onlineDevices !== undefined) {
        setNetworkStatus(prev => ({
          ...prev,
          totalDevices: realTimeData.deviceCount ?? prev.totalDevices,
          onlineDevices: realTimeData.onlineDevices ?? prev.onlineDevices,
          offlineDevices: (realTimeData.deviceCount ?? prev.totalDevices) - (realTimeData.onlineDevices ?? prev.onlineDevices),
          networkHealth: realTimeData.networkHealth ?? prev.networkHealth,
          alertCount: realTimeData.alertCount ?? prev.alertCount
        }));
      }
      
      setLastUpdated(new Date());
    }
  }, [realTimeData]);

  // Network scanning functions
  const fetchAvailableNetworks = async () => {
    try {
      const response = await discoveryAPI.getNetworks();
      if (response.data?.success) {
        const recommended = response.data.recommended || [];
        const current = response.data.current || 'auto';
        
        setNetworkScanConfig(prev => ({
          ...prev,
          availableNetworks: recommended,
          selectedNetwork: current,
          autoDetected: current,
          environment: response.data.environment
        }));
        
        // Show environment info
        if (response.data.environment?.isDocker) {
          console.log('🐳 Running in Docker environment - using intelligent network detection');
        }
        
        return current;
      }
    } catch (error) {
      console.warn('Failed to fetch networks:', error);
      // Fallback to auto-detection
      setNetworkScanConfig(prev => ({
        ...prev,
        availableNetworks: [
          { label: 'Auto-detect Best Network', value: 'auto', type: 'auto', priority: 0 },
          { label: 'Default (192.168.1.x)', value: '192.168.1.0/24', type: 'fallback', priority: 5 }
        ],
        selectedNetwork: 'auto',
        autoDetected: 'auto'
      }));
      return 'auto';
    }
  };

  const handleStartScan = async () => {
    const buttonId = 'startScan';
    setButtonLoading(buttonId, true);
    
    try {
      // Set scanning state
      setScanningState(prev => ({
        ...prev,
        isScanning: true,
        scanProgress: 0,
        scanStatus: 'starting',
        canStop: false
      }));
      
      // First, get available networks if we don't have them
      let networkRange = networkScanConfig.selectedNetwork;
      
      if (!networkRange || networkScanConfig.availableNetworks.length === 0) {
        console.log('🌐 Fetching available networks...');
        networkRange = await fetchAvailableNetworks();
      }
      
      // Show network selector if multiple networks available or user wants to choose
      if (networkScanConfig.showNetworkSelector || networkScanConfig.availableNetworks.length > 2) {
        networkRange = await showNetworkSelector();
        
        // Check if user cancelled the selection
        if (!networkRange || networkRange === 'cancelled') {
          console.log('🚫 User cancelled network selection');
          setScanningState(prev => ({
            ...prev,
            isScanning: false,
            scanStatus: 'cancelled',
            canStop: false
          }));
          setSystemOverview(prev => ({ ...prev, scanStatus: 'idle' }));
          return; // Exit early if cancelled
        }
      }
      
      // Use auto-detection if still no specific network chosen
      if (!networkRange) {
        networkRange = 'auto';
      }
      
      setSystemOverview(prev => ({ ...prev, scanStatus: 'running' }));
      setScanningState(prev => ({
        ...prev,
        scanStatus: 'running',
        canStop: true
      }));
      setError(null);
      
      const displayRange = networkRange === 'auto' ? 'auto-detected network' : networkRange;
      console.log('� Starting advanced network scan for:', displayRange);
      
      // Use the selected or auto-detected network range with advanced methods
      const response = await discoveryAPI.startScan({ 
        networkRange: networkRange,
        immediate: true,
        methods: ['ping', 'arp', 'port'],
        autoScan: true
      });
      console.log('✅ Advanced scan API response:', response);
      
      if (response.data) {
        const actualRange = response.data.networkRange || networkRange;
        const methods = response.data.methods?.join(', ') || 'ping, arp, port';
        showSuccess(`🚀 Advanced network scan started on ${actualRange} using ${methods}!`);
        
        // Update scan status will be handled by socket events
        setTimeout(() => {
          setSystemOverview(prev => ({ ...prev, lastScan: new Date() }));
        }, 2000);
      }
    } catch (err) {
      console.error('❌ Advanced scan failed:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred';
      setError(`Failed to start advanced network scan: ${errorMessage}`);
      setSystemOverview(prev => ({ ...prev, scanStatus: 'idle' }));
      setScanningState(prev => ({
        ...prev,
        isScanning: false,
        scanStatus: 'error',
        canStop: false
      }));
    } finally {
      setButtonLoading(buttonId, false);
    }
  };

  const showNetworkSelector = () => {
    return new Promise((resolve) => {
      const networks = networkScanConfig.availableNetworks;
      const defaultNetwork = networkScanConfig.autoDetected || 'auto';
      
      // Set up modal data
      setNetworkSelection(defaultNetwork);
      setCustomNetwork('');
      
      // Show modal
      setShowNetworkModal(true);
      setModalConfig({
        type: 'networkSelection',
        resolve: (selectedNetwork) => {
          setShowNetworkModal(false);
          resolve(selectedNetwork);
        },
        cancel: () => {
          setShowNetworkModal(false);
          resolve('cancelled'); // Signal cancellation
        }
      });
    });
  };

  const handleNetworkSelection = useCallback(() => {
    const { resolve } = modalConfig;
    let selectedValue = networkSelection;
    
    if (networkSelection === 'custom' && customNetwork.trim()) {
      // Validate custom network format
      const networkPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
      if (networkPattern.test(customNetwork.trim())) {
        selectedValue = customNetwork.trim();
      } else {
        setError('Invalid network format. Use CIDR notation (e.g., 192.168.1.0/24)');
        return;
      }
    }
    
    closeAllModals();
    if (resolve) resolve(selectedValue);
  }, [networkSelection, customNetwork, modalConfig, closeAllModals]);

  const handleAdvancedScanConfig = useCallback(() => {
    const { resolve } = modalConfig;
    
    // Determine final network range
    let finalNetworkRange = advancedScanConfig.networkRange;
    if (advancedScanConfig.networkRange === 'custom') {
      finalNetworkRange = advancedScanConfig.customRange;
      if (!finalNetworkRange || !/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(finalNetworkRange)) {
        setError('Invalid custom network range. Use CIDR notation (e.g., 192.168.1.0/24)');
        return;
      }
    }
    
    // Build scan options based on configuration
    const scanTypes = {
      comprehensive: { 
        methods: ['ping', 'arp', 'port', 'snmp'], 
        timeout: 5000 
      },
      network_deep: { 
        methods: ['ping', 'arp', 'port_extended'], 
        timeout: 4000 
      },
      service_discovery: { 
        methods: ['port', 'snmp'], 
        timeout: 3000 
      },
      custom: { 
        methods: advancedScanConfig.customMethods.split(',').map(m => m.trim()).filter(m => m),
        timeout: advancedScanConfig.timeout 
      }
    };
    
    const selectedConfig = scanTypes[advancedScanConfig.scanType];
    if (!selectedConfig || (advancedScanConfig.scanType === 'custom' && selectedConfig.methods.length === 0)) {
      setError('Invalid scan configuration');
      return;
    }
    
    const scanOptions = {
      networkRange: finalNetworkRange,
      immediate: true,
      methods: selectedConfig.methods,
      advancedScan: true,
      timeout: selectedConfig.timeout
    };
    
    if (resolve) {
      resolve(scanOptions);
    }
    closeAllModals();
  }, [advancedScanConfig, modalConfig, closeAllModals]);

  // Load available networks and check initial scan state
  useEffect(() => {
    fetchAvailableNetworks();
    
    // Initialize scanning state as idle
    setScanningState(prev => ({
      ...prev,
      isScanning: false,
      scanStatus: 'idle',
      canStop: false,
      scanProgress: 0
    }));
  }, []);

  // Quick action handlers
  const handleStartScanOriginal = async () => {
    const buttonId = 'startScan';
    setButtonLoading(buttonId, true);
    
    try {
      setSystemOverview(prev => ({ ...prev, scanStatus: 'running' }));
      setError(null);
      
      console.log('🔍 Starting network scan...');
      console.log('🔧 API Config Check:', {
        baseURL: discoveryAPI.defaults?.baseURL || 'Not set',
        hasToken: !!localStorage.getItem('nms_token'),
        tokenPreview: localStorage.getItem('nms_token')?.substring(0, 20) + '...'
      });
      
      // Use api instance; it sets Authorization header from local storage
      const response = await discoveryAPI.startScan({ networkRange: '192.168.29.0/24', immediate: true });
      console.log('✅ Scan API response:', response);
      
      if (response.data) {
        showSuccess('Network scan started successfully! Scanning devices...');
        // Update scan status will be handled by socket events
        setTimeout(() => {
          setSystemOverview(prev => ({ ...prev, lastScan: new Date() }));
        }, 2000);
      }
    } catch (err) {
      console.error('❌ Scan failed:', err);
      console.error('📊 Error details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          baseURL: err.config?.baseURL,
          headers: err.config?.headers
        }
      });
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred';
      setError(`Failed to start network scan: ${errorMessage}`);
      setSystemOverview(prev => ({ ...prev, scanStatus: 'idle' }));
    } finally {
      setButtonLoading(buttonId, false);
    }
  };

  const handleAddDevice = useCallback(async () => {
    setShowAddDeviceModal(true);
  }, []);

  const validateDeviceIP = useCallback((ip) => {
    const cleanIp = ip.trim();
    
    // Enhanced IP validation
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    if (!ipRegex.test(cleanIp)) {
      return 'Please enter a valid IP address (e.g., 192.168.1.100)';
    }

    // Check for common invalid IPs
    if (cleanIp === '0.0.0.0' || cleanIp === '255.255.255.255' || cleanIp.endsWith('.0') || cleanIp.endsWith('.255')) {
      return 'Please enter a valid host IP address (not network or broadcast address)';
    }

    return null;
  }, []);

  const handleAddDeviceSubmit = useCallback(async () => {
    const validationError = validateDeviceIP(deviceIP);
    if (validationError) {
      setDeviceIPError(validationError);
      return;
    }

    const buttonId = 'addDevice';
    const cleanIp = deviceIP.trim();

    setButtonLoading(buttonId, true);
    
    try {
      setError(null);
      console.log('➕ Adding device:', cleanIp);
      
      // Use the manual discovery endpoint to properly add and discover the device
      const response = await api.post('/discovery/manual', { 
        ipAddress: cleanIp, 
        snmpCommunity: 'public' 
      });
      
      console.log('✅ Manual discovery response:', response);

      if (response.data && response.data.device) {
        showSuccess(`Device ${cleanIp} added successfully! Discovery completed.`);
        
        // Force a complete dashboard refresh to show new device
        await fetchDashboardData();
        
        // Also refresh the network status to show updated device counts
        setNetworkStatus(prev => ({
          ...prev,
          totalDevices: prev.totalDevices + 1,
          onlineDevices: prev.onlineDevices + (response.data.device.status === 'online' ? 1 : 0),
          offlineDevices: prev.offlineDevices + (response.data.device.status === 'offline' ? 1 : 0),
          discoveredToday: prev.discoveredToday + 1
        }));
        
        closeAllModals();
      } else {
        throw new Error('Device was not properly created');
      }
    } catch (err) {
      console.error('❌ Add device failed:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Unknown error occurred';
      
      if (err.response?.status === 400 && errorMessage.includes('already exists')) {
        setError(`Device ${cleanIp} is already in the system.`);
      } else if (err.response?.status === 400 && (errorMessage.includes('not reachable') || errorMessage.includes('not responding'))) {
        setError(`Device ${cleanIp} is not reachable. Please check the IP address and network connectivity.`);
      } else if (err.response?.status === 400 && errorMessage.includes('timeout')) {
        setError(`Connection to ${cleanIp} timed out. The device may be slow to respond or behind a firewall.`);
      } else {
        setError(`Failed to add device: ${errorMessage}`);
      }
    } finally {
      setButtonLoading(buttonId, false);
    }
  }, [deviceIP, validateDeviceIP, closeAllModals, showSuccess, fetchDashboardData, setButtonLoading, setError]);

  // Enhanced scan control handlers
  const handleStopScan = async () => {
    const buttonId = 'stopScan';
    console.log('🛑 Stop scan button clicked');
    
    try {
      setActionLoading(prev => ({ ...prev, [buttonId]: true }));
      setScanningState(prev => ({
        ...prev,
        scanStatus: 'stopping',
        canStop: false
      }));
      setError(null);
      console.log('🛑 Stopping network scan...');
      
      const response = await discoveryAPI.stopScan();
      console.log('✅ Stop scan response:', response);
      
      // Force UI update to idle state
      setSystemOverview(prev => ({ ...prev, scanStatus: 'idle' }));
      setScanningState(prev => ({
        ...prev,
        isScanning: false,
        scanStatus: 'stopped',
        canStop: false,
        scanProgress: 0
      }));
      
      if (response && (response.data?.success || response.success)) {
        showSuccess('Network scan stopped successfully!');
      } else {
        showSuccess('Stop scan request sent');
      }
    } catch (err) {
      console.error('❌ Failed to stop scan:', err);
      // Always set to idle - stopping should work regardless
      setSystemOverview(prev => ({ ...prev, scanStatus: 'idle' }));
      setScanningState(prev => ({
        ...prev,
        isScanning: false,
        scanStatus: 'stopped',
        canStop: false,
        scanProgress: 0
      }));
      
      // Don't show error for "no scan in progress" - that's actually success
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred';
      if (errorMessage.includes('No scan in progress') || errorMessage.includes('not found')) {
        showSuccess('No scan was running');
      } else {
        setError(`Failed to stop network scan: ${errorMessage}`);
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [buttonId]: false }));
    }
  };


  const handleAdvancedScan = async () => {
    const buttonId = 'advancedScan';
    console.log('🔧 Advanced scan button clicked');
    
    try {
      setActionLoading(prev => ({ ...prev, [buttonId]: true }));
      setError(null);
      console.log('🔧 Starting advanced network scan...');
      
      // Show advanced scan options with better error handling
      let scanOptions;
      try {
        scanOptions = await showAdvancedScanOptions();
        if (!scanOptions) {
          console.log('Advanced scan cancelled by user');
          return; // User cancelled
        }
      } catch (optionError) {
        console.error('❌ Error getting scan options:', optionError);
        setError('Failed to get scan options');
        return;
      }
      
      // Only set scanning state AFTER user confirms configuration
      setScanningState(prev => ({
        ...prev,
        isScanning: true,
        scanProgress: 0,
        scanStatus: 'starting',
        canStop: false
      }));
      
      const response = await discoveryAPI.startScan(scanOptions);
      console.log('✅ Advanced scan response:', response);
      
      if (response && response.data) {
        // Update states
        setSystemOverview(prev => ({ ...prev, scanStatus: 'running' }));
        setScanningState(prev => ({
          ...prev,
          scanStatus: 'running',
          canStop: true
        }));
        const methodsText = scanOptions.methods?.join(', ') || 'all methods';
        const networkText = scanOptions.networkRange === 'auto' ? 'auto-detected network' : scanOptions.networkRange;
        showSuccess(`🔧 Advanced scan started on ${networkText} using ${methodsText}!`);
        // Real-time status updates will be handled by WebSocket events
      } else {
        throw new Error('Invalid response from scan API');
      }
    } catch (err) {
      console.error('❌ Advanced scan failed:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred';
      setError(`Failed to start advanced scan: ${errorMessage}`);
      setSystemOverview(prev => ({ ...prev, scanStatus: 'idle' }));
      setScanningState(prev => ({
        ...prev,
        isScanning: false,
        scanStatus: 'error',
        canStop: false
      }));
    } finally {
      setActionLoading(prev => ({ ...prev, [buttonId]: false }));
    }
  };

  const showAdvancedScanOptions = () => {
    return new Promise((resolve) => {
      // Fetch available networks and set current network as default
      fetchAvailableNetworks().then(() => {
        // Set default configuration with auto-detected current network
        setAdvancedScanConfig(prev => ({
          ...prev,
          scanType: 'comprehensive',
          networkRange: networkScanConfig.autoDetected || 'auto',
          customRange: '',
          customMethods: 'ping,arp,port',
          timeout: 3000
        }));
        
        // Show modal
        setShowAdvancedScanModal(true);
        setModalConfig({
          type: 'advancedScanConfig',
          resolve: (scanOptions) => {
            setShowAdvancedScanModal(false);
            resolve(scanOptions);
          },
          cancel: () => {
            setShowAdvancedScanModal(false);
            resolve(null); // Signal cancellation
          }
        });
      });
    });
  };

  const handleExportData = async () => {
    const buttonId = 'exportData';
    setButtonLoading(buttonId, true);
    
    try {
      setError(null);
      // Get current timestamp for filename
      const timestamp = new Date().toISOString().split('T')[0];
      
      const response = await api.get('/dashboard/export', {
        responseType: 'blob'
      });

      if (response.data) {
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `network-data-${timestamp}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        showSuccess('Network data exported successfully!');
      }
    } catch (err) {
      console.error('Export failed:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred';
      setError(`Failed to export data: ${errorMessage}`);
    } finally {
      setButtonLoading(buttonId, false);
    }
  };

  const handleSettings = () => {
    const buttonId = 'settings';
    setButtonLoading(buttonId, true);
    
    try {
      console.log('⚙️ Settings button clicked');
      console.log('🔧 Button state check:', {
        buttonLoading: actionLoading.settings,
        loading: loading,
        hasAuthToken: !!localStorage.getItem('nms_token')
      });
      
      // Navigate to settings page using confirmation modal
      showConfirmation(
        'Open Network Settings',
        'This will redirect you to the admin panel where you can configure network discovery, SNMP settings, and monitoring parameters.',
        () => {
          console.log('✅ User confirmed settings navigation');
          // Dispatch a global navigation event so Layout switches to system settings
          window.dispatchEvent(new CustomEvent('nms:navigate', { detail: { section: 'system' } }));
          showSuccess('Opening System Settings...');
        }
      );
    } catch (err) {
      console.error('❌ Settings error:', err);
      setError('Failed to open settings');
    } finally {
      setTimeout(() => setButtonLoading(buttonId, false), 500);
    }
  };

  const handleAcknowledgeAlert = async (alertId) => {
    const buttonId = `ack_${alertId}`;
    setButtonLoading(buttonId, true);
    
    try {
      setError(null);
      const response = await api.put(`/alerts/${alertId}/acknowledge`, {});

      if (response.data) {
        // Update alert in local state
        setRecentAlerts(prev => prev.map(alert => 
          alert._id === alertId 
            ? { ...alert, acknowledged: true, acknowledgedAt: new Date(), acknowledgedBy: user?.username || 'current_user' }
            : alert
        ));
        
        showSuccess('Alert acknowledged successfully');
      }
    } catch (err) {
      console.error('Acknowledge alert failed:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred';
      setError(`Failed to acknowledge alert: ${errorMessage}`);
    } finally {
      setButtonLoading(buttonId, false);
    }
  };

  const getHealthColor = (percentage) => {
    if (percentage === 0) return 'secondary'; // No network
    if (percentage >= 95) return 'success';   // Excellent network health
    if (percentage >= 80) return 'info';      // Good network health
    if (percentage >= 60) return 'warning';   // Acceptable network health
    if (percentage >= 30) return 'danger';    // Poor network health
    return 'dark';                            // Critical network issues
  };

  const getHealthIcon = (percentage) => {
    if (percentage === 0) return 'fas fa-network-wired text-muted';     // No network
    if (percentage >= 95) return 'fas fa-wifi text-success';            // Excellent
    if (percentage >= 80) return 'fas fa-signal text-info';             // Good  
    if (percentage >= 60) return 'fas fa-exclamation-triangle';         // Acceptable
    if (percentage >= 30) return 'fas fa-exclamation-circle';           // Poor
    return 'fas fa-skull-crossbones';                                   // Critical
  };

  const getCongestionColor = (level) => {
    switch (level) {
      case 'critical': return 'danger';
      case 'high': return 'warning'; 
      case 'moderate': return 'info';
      case 'low': return 'success';
      case 'none':
      default: return 'success';
    }
  };

  if (loading && networkStatus.totalDevices === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <Container fluid className="p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="text-white mb-1">
            <i className="fas fa-chart-pie me-2 text-primary"></i>
            Network Dashboard
          </h2>
        </div>
        <div className="d-flex align-items-center">
          {connected ? (
            <Badge bg="success" className="me-2">
              <i className="fas fa-circle me-1"></i>Live
            </Badge>
          ) : (
            <Badge bg="danger" className="me-2">
              <i className="fas fa-circle me-1"></i>Offline
            </Badge>
          )}
          <small className="text-muted me-2">{lastUpdated.toLocaleTimeString()}</small>
          <Button 
            variant="outline-light" 
            size="sm" 
            onClick={fetchDashboardData} 
            disabled={loading}
          >
            <i className="fas fa-sync-alt"></i>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-2 py-2" style={{ whiteSpace: 'pre-line' }}>
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" className="mb-2 py-2" style={{ whiteSpace: 'pre-line' }}>
          <i className="fas fa-check-circle me-2"></i>
          {successMessage}
        </Alert>
      )}

      {/* Content - Natural Layout */}
      <div className="dashboard-content">
        
        {/* Row 1: Network Status Cards - Natural height */}
        <Row className="mb-4">
          <Col xs={6} md={4} lg={2}>
            <Card className="status-card h-100">
              <Card.Body>
                <div className={`text-${getHealthColor(networkStatus.networkHealth)} status-icon`}>
                  <i className={`${getHealthIcon(networkStatus.networkHealth)}`}></i>
                </div>
                <div className="status-value">{networkStatus.networkHealth}%</div>
                <div className="status-label">Network Health</div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <Card className="status-card h-100">
              <Card.Body>
                <div className="text-success status-icon">
                  <i className="fas fa-server"></i>
                </div>
                <div className="status-value">{networkStatus.totalDevices}</div>
                <div className="status-label">Total Devices</div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <Card className="status-card h-100">
              <Card.Body>
                <div className="text-info status-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="status-value">{networkStatus.onlineDevices}</div>
                <div className="status-label">Online</div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <Card className="status-card h-100">
              <Card.Body>
                <div className="text-warning status-icon">
                  <i className="fas fa-times-circle"></i>
                </div>
                <div className="status-value">{networkStatus.offlineDevices}</div>
                <div className="status-label">Offline</div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <Card className="status-card h-100">
              <Card.Body>
                <div className="text-danger status-icon">
                  <i className="fas fa-bell"></i>
                </div>
                <div className="status-value">{networkStatus.alertCount}</div>
                <div className="status-label">Active Alerts</div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} md={4} lg={2}>
            <Card className="status-card h-100">
              <Card.Body>
                <div className="text-secondary status-icon">
                  <i className="fas fa-plus-circle"></i>
                </div>
                <div className="status-value">{networkStatus.discoveredToday}</div>
                <div className="status-label">New Today</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Row 2: Quick Actions & System Overview - Natural height */}
        <Row className="mb-4">
          <Col lg={6}>
            <Card className="h-100">
              <Card.Header>
                <h6 className="mb-0">
                  <i className="fas fa-bolt me-2 text-warning"></i>
                  Quick Actions
                </h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  {/* Enhanced Network Scanner Controls */}
                  <Col sm={6}>
                    <div className="d-flex gap-2 mb-2">
                      <Button 
                        className="flex-fill scan-control-btn" 
                        variant={scanningState.isScanning ? 'success' : 'primary'}
                        onClick={handleStartScan}
                        disabled={scanningState.isScanning || actionLoading.startScan}
                        size="sm"
                      >
                        {actionLoading.startScan ? (
                          <>
                            <Spinner as="span" animation="border" size="sm" className="me-1" />
                            Starting...
                          </>
                        ) : scanningState.isScanning ? (
                          <>
                            <i className="fas fa-sync fa-spin me-1"></i>
                            Scanning {scanningState.scanProgress > 0 ? `${scanningState.scanProgress}%` : '...'}
                          </>
                        ) : (
                          <>
                            <i className="fas fa-search me-1"></i>
                            Start Scan
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        className="scan-control-btn" 
                        variant="warning"
                        onClick={handleStopScan}
                        disabled={actionLoading.stopScan || !scanningState.canStop}
                        size="sm"
                        style={{ minWidth: '90px' }}
                      >
                        {actionLoading.stopScan ? (
                          <>
                            <Spinner as="span" animation="border" size="sm" className="me-1" />
                            Stopping...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-stop me-1"></i>
                            Stop
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <div className="d-flex gap-2 mb-2">
                      <Button 
                        className="flex-fill scan-control-btn" 
                        variant="info"
                        onClick={handleStartScan}
                        disabled={actionLoading.quickScan || scanningState.isScanning}
                        size="sm"
                      >
                        {actionLoading.quickScan ? (
                          <>
                            <Spinner as="span" animation="border" size="sm" className="me-1" />
                            Quick Scan...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-bolt me-1"></i>
                            Quick Scan
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        className="flex-fill scan-control-btn" 
                        variant="secondary"
                        onClick={handleAdvancedScan}
                        disabled={actionLoading.advancedScan || scanningState.isScanning}
                        size="sm"
                      >
                        {actionLoading.advancedScan ? (
                          <>
                            <Spinner as="span" animation="border" size="sm" className="me-1" />
                            Advanced...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-cogs me-1"></i>
                            Advanced
                          </>
                        )}
                      </Button>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <Button 
                      className="w-100 action-button mb-2" 
                      onClick={handleAddDevice}
                      disabled={loading || actionLoading.addDevice}
                    >
                      {actionLoading.addDevice ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" className="me-2" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-plus me-2"></i>
                          Add Device
                        </>
                      )}
                    </Button>
                  </Col>
                  <Col sm={6}>
                    <Button 
                      className="w-100 action-button mb-2" 
                      onClick={handleExportData}
                      disabled={loading || actionLoading.exportData}
                    >
                      {actionLoading.exportData ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" className="me-2" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-download me-2"></i>
                          Export Data
                        </>
                      )}
                    </Button>
                  </Col>
                  <Col sm={6}>
                    <Button 
                      className="w-100 action-button mb-2" 
                      onClick={handleSettings}
                      disabled={loading || actionLoading.settings}
                    >
                      {actionLoading.settings ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" className="me-2" />
                          Opening...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-cog me-2"></i>
                          Settings
                        </>
                      )}
                    </Button>
                  </Col>
                </Row>
                <div className="border-top pt-3 mt-3">
                  <div className="text-center">
                    <small className="text-muted">
                      Last Scan: {systemOverview.lastScan ? systemOverview.lastScan.toLocaleString() : 'Never'}
                    </small>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={6}>
            <Card className="h-100">
              <Card.Header>
                <h6 className="mb-0">
                  <i className="fas fa-info-circle me-2 text-info"></i>
                  System Overview
                </h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col sm={6}>
                    <div className="text-center">
                      <div className="text-warning mb-2">
                        <i className="fas fa-memory" style={{ fontSize: '1.5rem' }}></i>
                      </div>
                      <div className="text-white mb-1" style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                        {systemOverview.memoryUsage}%
                      </div>
                      <small className="text-muted">Memory Usage</small>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-center">
                      <div className="text-info mb-2">
                        <i className="fas fa-clock" style={{ fontSize: '1.5rem' }}></i>
                      </div>
                      <div className="text-white mb-1" style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                        {Math.floor(systemOverview.systemUptime / 3600)}h
                      </div>
                      <small className="text-muted">System Uptime</small>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-center">
                      <div className={`mb-2 text-${getCongestionColor(networkPerformance.congestionLevel)}`}>
                        <i className="fas fa-network-wired" style={{ fontSize: '1.2rem' }}></i>
                      </div>
                      <div className="text-white mb-1" style={{ fontSize: '1rem', fontWeight: '500' }}>
                        {systemOverview.transferRate}
                      </div>
                      <small className="text-muted">
                        Transfer Rate
                        {networkPerformance.congestionLevel !== 'none' && (
                          <span className={`d-block text-${getCongestionColor(networkPerformance.congestionLevel)}`}>
                            {networkPerformance.maxUtilization.toFixed(1)}% max util
                          </span>
                        )}
                      </small>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-center">
                      <div className="text-primary mb-2">
                        <i className="fas fa-users" style={{ fontSize: '1.2rem' }}></i>
                      </div>
                      <div className="text-white mb-1" style={{ fontSize: '1rem', fontWeight: '500' }}>
                        {systemOverview.activeSessions}
                      </div>
                      <small className="text-muted">Active Sessions</small>
                    </div>
                  </Col>
                </Row>
                <div className="text-center mt-3">
                  <Badge bg={systemOverview.scanStatus === 'running' ? 'warning' : 'success'}>
                    <i className={`fas fa-${systemOverview.scanStatus === 'running' ? 'spinner fa-spin' : 'check'} me-2`}></i>
                    {systemOverview.scanStatus === 'running' ? 'Scanning' : `Ready (${systemOverview.cpuCount} CPUs)`}
                  </Badge>
                  {systemOverview.hostname && (
                    <div className="mt-2">
                      <small className="text-muted">{systemOverview.hostname}</small>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Row 3: Recent Alerts - Natural height */}
        <Row>
          <Col>
            <Card>
              <Card.Header>
                <h6 className="mb-0">
                  <i className="fas fa-exclamation-triangle me-2 text-warning"></i>
                  Recent Alerts
                  <Badge bg="secondary" className="ms-2">
                    {recentAlerts.length}
                  </Badge>
                </h6>
              </Card.Header>
              <Card.Body>
                {recentAlerts.length > 0 ? (
                  <div className="alert-list">
                    {recentAlerts.map((alert, index) => (
                      <div 
                        key={alert._id || index} 
                        className="alert-item d-flex align-items-center justify-content-between"
                      >
                        <div className="d-flex align-items-center flex-grow-1">
                          <div className="me-3">
                            {getSeverityBadge(alert.severity)}
                          </div>
                          <div className="flex-grow-1">
                            <div className="text-white mb-1" style={{ fontWeight: '500' }}>
                              {alert.message || alert.type}
                            </div>
                            <small className="text-muted">
                              {alert.deviceName && `${alert.deviceName} • `}
                              {formatTimestamp(alert.timestamp)}
                            </small>
                          </div>
                        </div>
                        {!alert.acknowledged && (
                          <Button 
                            size="sm"
                            variant="outline-warning"
                            onClick={() => handleAcknowledgeAlert(alert._id)}
                            disabled={loading || actionLoading[`ack_${alert._id}`]}
                            title="Acknowledge Alert"
                          >
                            {actionLoading[`ack_${alert._id}`] ? (
                              <Spinner as="span" animation="border" size="sm" />
                            ) : (
                              <i className="fas fa-check"></i>
                            )}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted py-4">
                    <i className="fas fa-check-circle mb-3 text-success" style={{ fontSize: '2rem' }}></i>
                    <h6 className="text-white mb-2">No active alerts</h6>
                    <p className="mb-0">Your network is running smoothly</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Network Selection Modal */}
        <Modal show={showNetworkModal} onHide={() => {
          const { cancel } = modalConfig;
          if (cancel) cancel();
          closeAllModals();
        }} centered>
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="fas fa-network-wired me-2"></i>
              Select Network Range
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Available Networks:</Form.Label>
                {modalConfig.networks?.map((network, idx) => (
                  <Form.Check
                    key={network.value}
                    type="radio"
                    id={`network-${idx}`}
                    name="networkSelection"
                    label={`${network.label} (${network.value}) [${network.type}]`}
                    value={network.value}
                    checked={networkSelection === network.value}
                    onChange={(e) => setNetworkSelection(e.target.value)}
                    className="mb-2"
                  />
                ))}
                <Form.Check
                  type="radio"
                  id="network-custom"
                  name="networkSelection"
                  label="Custom Network Range"
                  value="custom"
                  checked={networkSelection === 'custom'}
                  onChange={(e) => setNetworkSelection(e.target.value)}
                  className="mb-2"
                />
              </Form.Group>
              
              {networkSelection === 'custom' && (
                <Form.Group className="mb-3">
                  <Form.Label>Custom Network (CIDR):</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., 10.0.0.0/24"
                    value={customNetwork}
                    onChange={(e) => setCustomNetwork(e.target.value)}
                    isInvalid={!!error}
                  />
                  <Form.Text className="text-muted">
                    Use CIDR notation (e.g., 192.168.1.0/24)
                  </Form.Text>
                </Form.Group>
              )}
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeAllModals}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleNetworkSelection} disabled={scanningState.isScanning}>
              <i className="fas fa-search me-2"></i>
              {scanningState.isScanning ? 'Scanning...' : 'Start Scan'}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Add Device Modal */}
        <Modal show={showAddDeviceModal} onHide={closeAllModals} centered>
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="fas fa-plus me-2"></i>
              Add Device
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Device IP Address:</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g., 192.168.1.100"
                  value={deviceIP}
                  onChange={(e) => {
                    setDeviceIP(e.target.value);
                    setDeviceIPError('');
                  }}
                  isInvalid={!!deviceIPError}
                />
                <Form.Control.Feedback type="invalid">
                  {deviceIPError}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  Enter a valid IPv4 address for the device you want to add
                </Form.Text>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeAllModals}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleAddDeviceSubmit}
              disabled={actionLoading.addDevice}
            >
              {actionLoading.addDevice ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Adding...
                </>
              ) : (
                <>
                  <i className="fas fa-plus me-2"></i>
                  Add Device
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Confirmation Modal */}
        <Modal show={showConfirmModal} onHide={closeAllModals} centered>
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="fas fa-question-circle me-2"></i>
              {modalConfig.title}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>{modalConfig.message}</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeAllModals}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={() => {
                if (modalConfig.onConfirm) {
                  modalConfig.onConfirm();
                }
                closeAllModals();
              }}
            >
              Confirm
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Advanced Scan Configuration Modal */}
        <Modal show={showAdvancedScanModal} onHide={() => {
          const { cancel } = modalConfig;
          if (cancel) cancel();
          closeAllModals();
        }} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="fas fa-cogs me-2"></i>
              Advanced Scan Configuration
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Scan Type:</Form.Label>
                <Form.Select 
                  value={advancedScanConfig.scanType} 
                  onChange={(e) => setAdvancedScanConfig(prev => ({...prev, scanType: e.target.value}))}
                >
                  <option value="comprehensive">Comprehensive Scan (All Methods)</option>
                  <option value="network_deep">Deep Network Scan (Ping + ARP + Extended Ports)</option>
                  <option value="service_discovery">Service Discovery (Port + SNMP)</option>
                  <option value="custom">Custom Configuration</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  Select the scanning strategy that best fits your needs
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Network Range:</Form.Label>
                <Form.Select 
                  value={advancedScanConfig.networkRange} 
                  onChange={(e) => setAdvancedScanConfig(prev => ({...prev, networkRange: e.target.value}))}
                >
                  <option value="auto">Auto-detect Current Network</option>
                  {networkScanConfig.availableNetworks.map((network, idx) => (
                    <option key={idx} value={network.value}>
                      {network.label} - {network.value}
                    </option>
                  ))}
                  <option value="custom">Custom Range...</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  Choose the network range to scan (auto-detect recommended)
                </Form.Text>
              </Form.Group>

              {advancedScanConfig.networkRange === 'custom' && (
                <Form.Group className="mb-3">
                  <Form.Label>Custom Network Range:</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., 172.20.27.0/24"
                    value={advancedScanConfig.customRange || ''}
                    onChange={(e) => setAdvancedScanConfig(prev => ({...prev, customRange: e.target.value}))}
                  />
                  <Form.Text className="text-muted">
                    Use CIDR notation (e.g., 192.168.1.0/24)
                  </Form.Text>
                </Form.Group>
              )}

              {advancedScanConfig.scanType === 'custom' && (
                <Form.Group className="mb-3">
                  <Form.Label>Custom Methods:</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="ping,arp,port,snmp"
                    value={advancedScanConfig.customMethods}
                    onChange={(e) => setAdvancedScanConfig(prev => ({...prev, customMethods: e.target.value}))}
                  />
                  <Form.Text className="text-muted">
                    Available methods: ping, arp, port, snmp, port_extended (comma-separated)
                  </Form.Text>
                </Form.Group>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Timeout (ms): {advancedScanConfig.timeout}</Form.Label>
                <Form.Range
                  min={1000}
                  max={10000}
                  step={500}
                  value={advancedScanConfig.timeout}
                  onChange={(e) => setAdvancedScanConfig(prev => ({...prev, timeout: parseInt(e.target.value)}))}
                />
                <Form.Text className="text-muted">
                  Adjust scan timeout for different network speeds
                </Form.Text>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeAllModals}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAdvancedScanConfig} disabled={scanningState.isScanning}>
              <i className="fas fa-search me-2"></i>
              {scanningState.isScanning ? 'Scanning...' : 'Start Advanced Scan'}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </Container>
  );
};

export default Dashboard;
