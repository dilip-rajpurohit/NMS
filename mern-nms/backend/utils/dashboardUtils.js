const Device = require('../models/Device');

// Health history cache for smoothing fluctuations
let healthHistory = [];
const HEALTH_HISTORY_SIZE = 3; // Keep last 3 calculations for smoothing
const HEALTH_CHANGE_THRESHOLD = 15; // Don't change health by more than 15% per calculation

/**
 * Calculate REAL-TIME comprehensive network health score - NO DUMMY DATA
 * All data comes from actual network monitoring and device status
 * @param {Object} params - Real-time calculation parameters
 * @param {number} params.totalDevices - Actual count from database
 * @param {number} params.onlineDevices - Real-time online count
 * @param {number} params.memoryUsage - Live system memory usage
 * @param {number} params.systemUptime - Actual system uptime
 * @param {number} params.alertCount - Live alert count
 * @param {Array} params.devices - Real device data with live metrics
 * @returns {number} Real-time network health score (0-100)
 */
const calculateNetworkHealth = ({
  totalDevices,
  onlineDevices,
  memoryUsage = 0,
  systemUptime = 0,
  alertCount = 0,
  devices = []
}) => {
  console.log('🔍 REAL-TIME Network Health Analysis:', { totalDevices, onlineDevices, memoryUsage, alertCount });
  
  // If no actual devices discovered, network health is 0
  if (totalDevices === 0) {
    console.log('💭 No real network infrastructure detected, health = 0%');
    return 0;
  }

  // 1. REAL DEVICE AVAILABILITY (50%) - Most critical factor
  const deviceAvailabilityScore = (onlineDevices / totalDevices) * 100;
  console.log(`📡 Device Availability: ${onlineDevices}/${totalDevices} = ${deviceAvailabilityScore.toFixed(1)}%`);
  
  // 2. REAL NETWORK PERFORMANCE (30%) - From actual ping/response times and traffic data
  let performanceScore = 0;
  let avgResponseTime = null;
  let networkCongestion = null;
  
  if (devices.length > 0) {
    const devicesWithRealMetrics = devices.filter(d => 
      d.metrics && 
      d.metrics.responseTime && 
      d.metrics.responseTime > 0 && 
      d.status === 'online'
    );
    
    if (devicesWithRealMetrics.length > 0) {
      avgResponseTime = devicesWithRealMetrics.reduce((sum, d) => sum + d.metrics.responseTime, 0) / devicesWithRealMetrics.length;
      
      // Collect network congestion data from devices with interface metrics
      const devicesWithCongestion = devicesWithRealMetrics.filter(d => 
        d.metrics && d.metrics.networkCongestion
      );
      
      if (devicesWithCongestion.length > 0) {
        const totalTrafficRate = devicesWithCongestion.reduce((sum, d) => sum + (d.metrics.networkCongestion.totalTrafficRate || 0), 0);
        const avgUtilization = devicesWithCongestion.reduce((sum, d) => sum + (d.metrics.networkCongestion.avgUtilization || 0), 0) / devicesWithCongestion.length;
        const maxUtilization = Math.max(...devicesWithCongestion.map(d => d.metrics.networkCongestion.maxUtilization || 0));
        const avgErrorRate = devicesWithCongestion.reduce((sum, d) => sum + (d.metrics.networkCongestion.errorRate || 0), 0) / devicesWithCongestion.length;
        
        networkCongestion = {
          totalTrafficRate,
          avgUtilization,
          maxUtilization,
          errorRate: avgErrorRate
        };
      }
      
      // Enhanced performance scoring based on response times AND network congestion
      let responseScore = 30; // Base score
      if (avgResponseTime <= 10) responseScore = 100;      // Excellent: <10ms
      else if (avgResponseTime <= 25) responseScore = 95;  // Very Good: 10-25ms
      else if (avgResponseTime <= 50) responseScore = 85;  // Good: 25-50ms
      else if (avgResponseTime <= 100) responseScore = 70; // Fair: 50-100ms
      else if (avgResponseTime <= 200) responseScore = 50; // Poor: 100-200ms
      else if (avgResponseTime <= 500) responseScore = 25; // Bad: 200-500ms
      else responseScore = 10;                             // Terrible: >500ms
      
      // Factor in network congestion if available
      let congestionScore = 100; // Default if no congestion data
      if (networkCongestion) {
        if (networkCongestion.maxUtilization < 25) congestionScore = 100;
        else if (networkCongestion.maxUtilization < 50) congestionScore = 85;
        else if (networkCongestion.maxUtilization < 75) congestionScore = 60;
        else if (networkCongestion.maxUtilization < 90) congestionScore = 30;
        else congestionScore = 10; // Critical congestion
        
        // Apply error rate penalty
        if (networkCongestion.errorRate > 5) congestionScore *= 0.5;
        else if (networkCongestion.errorRate > 1) congestionScore *= 0.8;
      }
      
      // Combined performance score (70% response time, 30% congestion)
      performanceScore = (responseScore * 0.7) + (congestionScore * 0.3);
      
      console.log(`⚡ Real Performance: avg ${avgResponseTime.toFixed(1)}ms, congestion: ${networkCongestion ? networkCongestion.maxUtilization.toFixed(1) + '%' : 'N/A'} = ${performanceScore.toFixed(1)}%`);
    } else {
      performanceScore = 30; // No real metrics available, assume poor
      console.log(`⚡ No real performance metrics available, defaulting to 30%`);
    }
  }
  
  // 3. REAL INFRASTRUCTURE HEALTH (15%) - Based on actual device types discovered
  let infrastructureScore = 0;
  
  if (devices.length > 0) {
    const deviceTypes = {};
    let criticalInfraOnline = 0;
    let totalCriticalInfra = 0;
    
    devices.forEach(device => {
      const type = (device.deviceType || device.type || 'unknown').toLowerCase();
      deviceTypes[type] = (deviceTypes[type] || 0) + 1;
      
      // Count critical infrastructure
      if (type === 'router' || type === 'switch' || type === 'gateway') {
        totalCriticalInfra++;
        if (device.status === 'online' || device.status === 'up') {
          criticalInfraOnline++;
        }
      }
    });
    
    // Real infrastructure assessment
    let infraBase = 40; // Base score for having any devices
    
    // Bonus for having diverse real infrastructure
    if (deviceTypes.router > 0) infraBase += 25; // Core routing
    if (deviceTypes.switch > 0) infraBase += 20; // Switching
    if (deviceTypes.gateway > 0) infraBase += 15; // Gateway
    if (deviceTypes.server > 0) infraBase += 10; // Servers
    
    // Critical: infrastructure availability
    if (totalCriticalInfra > 0) {
      const criticalInfraRatio = criticalInfraOnline / totalCriticalInfra;
      infraBase = infraBase * criticalInfraRatio; // Scale by critical infra health
    }
    
    infrastructureScore = Math.min(100, infraBase);
    console.log(`🏗️ Real Infrastructure: ${JSON.stringify(deviceTypes)} = ${infrastructureScore.toFixed(1)}%`);
  } else {
    infrastructureScore = 0;
  }
  
  // 4. REAL ALERT IMPACT (5%) - From actual system alerts
  let alertImpactScore = 100;
  if (alertCount > 0) {
    alertImpactScore = Math.max(0, 100 - (alertCount * 20)); // Each real alert = -20%
    console.log(`🚨 Real Alerts Impact: ${alertCount} alerts = ${alertImpactScore}%`);
  }
  
  console.log('🔢 Real-time Health Components:', {
    deviceAvailability: `${deviceAvailabilityScore.toFixed(1)}% (weight: 50%)`,
    performance: `${performanceScore.toFixed(1)}% (weight: 30%)`,
    infrastructure: `${infrastructureScore.toFixed(1)}% (weight: 15%)`,
    alertImpact: `${alertImpactScore.toFixed(1)}% (weight: 5%)`
  });
  
  // REAL-TIME weighted calculation - NO DUMMY WEIGHTS
  const networkHealth = Math.round(
    (deviceAvailabilityScore * 0.50) +    // 50% - Are devices actually reachable?
    (performanceScore * 0.30) +           // 30% - How fast is real network performance?
    (infrastructureScore * 0.15) +        // 15% - Is critical infrastructure online?
    (alertImpactScore * 0.05)             // 5% - Are there real active issues?
  );
  
  console.log('🎯 Calculated Real-time Network Health:', `${networkHealth}%`);
  
  // REAL-TIME modifiers based on actual network state
  let finalHealth = networkHealth;
  
  // CRITICAL: If core network infrastructure is down
  if (devices.length > 0) {
    const coreInfraDown = devices.filter(d => 
      ['router', 'gateway'].includes((d.deviceType || d.type || '').toLowerCase()) && 
      d.status !== 'online' && d.status !== 'up'
    ).length;
    
    if (coreInfraDown > 0) {
      finalHealth = Math.min(finalHealth, 20); // Network is critically impaired
      console.log(`� CRITICAL: ${coreInfraDown} core infrastructure devices down, health capped at 20%`);
    }
  }
  
  // DEGRADED: If average response time is too high
  if (avgResponseTime && avgResponseTime > 1000) {
    finalHealth = Math.min(finalHealth, 40); // Network severely degraded
    console.log(`🐌 SEVERE DEGRADATION: avg response ${avgResponseTime.toFixed(1)}ms, health capped at 40%`);
  }
  
  // Ensure final health is realistic
  finalHealth = Math.max(0, Math.min(100, finalHealth));
  
  // Apply smoothing to prevent wild fluctuations
  if (healthHistory.length > 0) {
    const previousHealth = healthHistory[healthHistory.length - 1];
    const healthDifference = Math.abs(finalHealth - previousHealth);
    
    // If change is too drastic, dampen it
    if (healthDifference > HEALTH_CHANGE_THRESHOLD) {
      const dampenedChange = HEALTH_CHANGE_THRESHOLD * (finalHealth > previousHealth ? 1 : -1);
      finalHealth = Math.round(previousHealth + dampenedChange);
      console.log(`🔧 Health change dampened: ${previousHealth}% -> ${finalHealth}% (was ${previousHealth + (finalHealth - previousHealth)}%)`);
    }
  }
  
  // Add to history for future smoothing
  healthHistory.push(finalHealth);
  if (healthHistory.length > HEALTH_HISTORY_SIZE) {
    healthHistory.shift(); // Remove oldest entry
  }
  
  // Apply moving average for additional smoothing
  if (healthHistory.length >= 2) {
    const avgHealth = Math.round(healthHistory.reduce((sum, h) => sum + h, 0) / healthHistory.length);
    // Use weighted average: 70% current calculation, 30% historical average
    finalHealth = Math.round(finalHealth * 0.7 + avgHealth * 0.3);
    console.log(`📊 Applied smoothing: current=${finalHealth}%, historical avg=${avgHealth}%`);
  }
  
  console.log('✅ FINAL Real-time Network Health:', `${finalHealth}%`);
  
  // Check if health-based alerts should be generated
  checkHealthBasedAlerts(finalHealth);
  
  return finalHealth;
};

/**
 * Generate alerts based on network health thresholds
 * @param {number} healthScore - Current network health score (0-100)
 */
const checkHealthBasedAlerts = async (healthScore) => {
  try {
    // Define health thresholds
    const CRITICAL_THRESHOLD = 30;
    const WARNING_THRESHOLD = 60;
    
    // Skip alerting if no real devices (prevents false alerts during startup)
    const deviceCount = await Device.countDocuments({});
    if (deviceCount === 0) {
      console.log('⚠️ No devices found, skipping health-based alerting');
      return;
    }
    
    let shouldCreateAlert = false;
    let alertSeverity = 'info';
    let alertMessage = '';
    
    if (healthScore <= CRITICAL_THRESHOLD) {
      shouldCreateAlert = true;
      alertSeverity = 'critical';
      alertMessage = `Network health is critically low: ${healthScore}%. Immediate attention required.`;
    } else if (healthScore <= WARNING_THRESHOLD) {
      shouldCreateAlert = true;
      alertSeverity = 'warning';
      alertMessage = `Network health is degraded: ${healthScore}%. Investigation recommended.`;
    }
    
    if (shouldCreateAlert) {
      // Check if we recently created a similar health alert to prevent spam
      const systemDevice = await Device.findOne({ ipAddress: 'system' }) || 
                          await Device.findOne({ name: 'NMS Server' });
      
      if (systemDevice) {
        const recentHealthAlerts = systemDevice.alerts?.filter(alert => 
          alert.type === 'Network Health Alert' && 
          !alert.acknowledged &&
          (new Date() - new Date(alert.timestamp)) < 1800000 // 30 minutes
        ) || [];
        
        // Only create alert if no recent health alert exists
        if (recentHealthAlerts.length === 0) {
          console.log(`🚨 Creating health-based alert: ${alertSeverity} - ${alertMessage}`);
          
          const healthAlert = {
            type: 'Network Health Alert',
            severity: alertSeverity,
            message: alertMessage,
            timestamp: new Date(),
            acknowledged: false,
            value: healthScore,
            threshold: alertSeverity === 'critical' ? CRITICAL_THRESHOLD : WARNING_THRESHOLD
          };
          
          // Add alert to system device
          await Device.updateOne(
            { _id: systemDevice._id },
            { $push: { alerts: healthAlert } }
          );
          
          console.log('✅ Health-based alert created successfully');
        } else {
          console.log('ℹ️ Recent health alert exists, skipping duplicate');
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to check health-based alerts:', error);
  }
};

/**
 * Get comprehensive real-time dashboard statistics
 * @param {Object} systemMetrics - System metrics object
 * @returns {Object} Dashboard statistics with real-time network health
 */
const getDashboardStats = async (systemMetrics = {}) => {
  try {
    // Get real device counts and detailed device data
    const totalDevices = await Device.countDocuments({});
    const onlineDevices = await Device.countDocuments({ 
      status: { $in: ['online', 'up'] }
    });
    const offlineDevices = totalDevices - onlineDevices;
    
    // Get detailed device information for comprehensive analysis
    const devices = await Device.find({}, {
      deviceType: 1,
      type: 1,
      status: 1,
      metrics: 1,
      ipAddress: 1,
      name: 1
    }).lean();
    
    // Get alerts count from devices
    const alertsResult = await Device.aggregate([
      { $match: {} },
      { $unwind: { path: '$alerts', preserveNullAndEmptyArrays: false } },
      { $match: { 
        'alerts': { $ne: null },
        'alerts.acknowledged': { $ne: true } 
      }},
      { $count: 'totalAlerts' }
    ]);
    const alertCount = alertsResult.length > 0 ? alertsResult[0].totalAlerts : 0;
    
    // Get devices discovered today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const discoveredToday = await Device.countDocuments({
      createdAt: { $gte: today }
    });
    
    // Calculate comprehensive real-time network health
    const networkHealth = calculateNetworkHealth({
      totalDevices,
      onlineDevices,
      memoryUsage: systemMetrics.memoryUsage || 0,
      systemUptime: systemMetrics.systemUptime || 0,
      alertCount,
      devices // Pass full device data for comprehensive analysis
    });
    
    return {
      totalDevices,
      onlineDevices,
      offlineDevices,
      discoveredToday,
      alertCount,
      networkHealth
    };
  } catch (error) {
    console.error('🚨 Dashboard stats calculation error:', error);
    throw new Error(`Failed to calculate real-time dashboard stats: ${error.message}`);
  }
};

module.exports = {
  calculateNetworkHealth,
  getDashboardStats
};