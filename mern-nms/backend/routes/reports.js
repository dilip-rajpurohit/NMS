const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const Device = require('../models/Device');
const NetworkMetrics = require('../models/NetworkMetrics');
const NetworkReport = require('../models/NetworkReport');
const { ReportConfig } = require('../models/SystemConfig');
const logger = require('../utils/logger');

// Utility function to generate report ID
const generateReportId = () => {
  return `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
};

// Utility function to calculate time ranges
const getTimeRange = (range) => {
  const now = new Date();
  let start, end = now;
  
  switch (range) {
    case '1hour':
      start = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '6hours':
      start = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      break;
    case '24hours':
    case '1day':
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7days':
    case '1week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30days':
    case '1month':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90days':
    case '3months':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '365days':
    case '1year':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  
  return { start, end };
};

// GET /api/reports/dashboard - Enhanced dashboard report
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { timeRange = '24hours' } = req.query;
    const { start, end } = getTimeRange(timeRange);
    
    // Get all devices with their latest metrics
    const devices = await Device.find({});
    const totalDevices = devices.length;
    const onlineDevices = devices.filter(d => d.status === 'online').length;
    const offlineDevices = devices.filter(d => d.status === 'offline').length;
    const criticalDevices = devices.filter(d => d.status === 'critical').length;
    
    // Calculate network health score
    let networkHealthScore = 100;
    if (totalDevices > 0) {
      const healthFactor = (onlineDevices / totalDevices) * 100;
      const criticalPenalty = (criticalDevices / totalDevices) * 50;
      networkHealthScore = Math.max(0, healthFactor - criticalPenalty);
    }
    
    // Get aggregated alerts
    const totalAlerts = devices.reduce((sum, device) => sum + (device.alerts?.length || 0), 0);
    const criticalAlerts = devices.reduce((sum, device) => {
      return sum + (device.alerts?.filter(a => a.severity === 'critical' && !a.acknowledged).length || 0);
    }, 0);
    const warningAlerts = devices.reduce((sum, device) => {
      return sum + (device.alerts?.filter(a => a.severity === 'warning' && !a.acknowledged).length || 0);
    }, 0);
    
    // Get recent network metrics for performance data
    const recentMetrics = await NetworkMetrics.find({
      timestamp: { $gte: start, $lte: end }
    }).limit(100).sort({ timestamp: -1 });
    
    // Calculate average performance metrics
    const avgMetrics = recentMetrics.reduce((acc, metric) => {
      if (metric.systemMetrics) {
        acc.avgCpuUsage += metric.systemMetrics.cpuUtilization || 0;
        acc.avgMemoryUsage += metric.systemMetrics.memoryUtilization || 0;
        acc.avgResponseTime += metric.healthMetrics?.responseTime || 0;
        acc.avgAvailability += metric.healthMetrics?.availability || 100;
        acc.count++;
      }
      return acc;
    }, { avgCpuUsage: 0, avgMemoryUsage: 0, avgResponseTime: 0, avgAvailability: 0, count: 0 });
    
    if (avgMetrics.count > 0) {
      avgMetrics.avgCpuUsage /= avgMetrics.count;
      avgMetrics.avgMemoryUsage /= avgMetrics.count;
      avgMetrics.avgResponseTime /= avgMetrics.count;
      avgMetrics.avgAvailability /= avgMetrics.count;
    }
    
    // Calculate bandwidth utilization
    const bandwidthData = recentMetrics.reduce((acc, metric) => {
      if (metric.interfaces && metric.interfaces.length > 0) {
        const totalIn = metric.interfaces.reduce((sum, iface) => sum + (iface.inBitsPerSec || 0), 0);
        const totalOut = metric.interfaces.reduce((sum, iface) => sum + (iface.outBitsPerSec || 0), 0);
        acc.totalTrafficIn += totalIn;
        acc.totalTrafficOut += totalOut;
        acc.peakTrafficIn = Math.max(acc.peakTrafficIn, totalIn);
        acc.peakTrafficOut = Math.max(acc.peakTrafficOut, totalOut);
        acc.samples++;
      }
      return acc;
    }, { totalTrafficIn: 0, totalTrafficOut: 0, peakTrafficIn: 0, peakTrafficOut: 0, samples: 0 });
    
    // Device type distribution
    const deviceTypes = devices.reduce((acc, device) => {
      const type = device.deviceType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    // Top performers and issues
    const topPerformers = devices
      .filter(d => d.metrics && d.status === 'online')
      .sort((a, b) => (b.metrics.availability || 0) - (a.metrics.availability || 0))
      .slice(0, 5)
      .map(d => ({
        id: d._id,
        name: d.name,
        ipAddress: d.ipAddress,
        availability: d.metrics.availability || 0,
        responseTime: d.metrics.responseTime || 0
      }));
    
    const deviceIssues = devices
      .filter(d => d.status !== 'online' || (d.alerts && d.alerts.some(a => !a.acknowledged)))
      .slice(0, 10)
      .map(d => ({
        id: d._id,
        name: d.name,
        ipAddress: d.ipAddress,
        status: d.status,
        issueCount: d.alerts?.filter(a => !a.acknowledged).length || 0,
        lastSeen: d.metrics?.lastSeen,
        criticalAlerts: d.alerts?.filter(a => a.severity === 'critical' && !a.acknowledged).length || 0
      }));
    
    const dashboardData = {
      // Core metrics
      totalDevices,
      onlineDevices,
      offlineDevices,
      criticalDevices,
      networkHealth: Math.round(networkHealthScore),
      
      // Alerts summary
      totalAlerts,
      criticalAlerts,
      warningAlerts,
      infoAlerts: totalAlerts - criticalAlerts - warningAlerts,
      
      // Performance metrics
      averageUptime: Math.round(avgMetrics.avgAvailability * 100) / 100,
      averageResponseTime: Math.round(avgMetrics.avgResponseTime * 100) / 100,
      averageCpuUsage: Math.round(avgMetrics.avgCpuUsage * 100) / 100,
      averageMemoryUsage: Math.round(avgMetrics.avgMemoryUsage * 100) / 100,
      
      // Traffic data
      totalTrafficIn: bandwidthData.samples > 0 ? Math.round(bandwidthData.totalTrafficIn / bandwidthData.samples) : 0,
      totalTrafficOut: bandwidthData.samples > 0 ? Math.round(bandwidthData.totalTrafficOut / bandwidthData.samples) : 0,
      peakTrafficIn: bandwidthData.peakTrafficIn,
      peakTrafficOut: bandwidthData.peakTrafficOut,
      
      // Device distribution
      deviceTypes,
      
      // Performance insights
      topPerformers,
      deviceIssues,
      
      // Metadata
      timeRange,
      generatedAt: new Date(),
      sampleCount: recentMetrics.length
    };

    res.json(dashboardData);
  } catch (error) {
    logger.error('Dashboard report error:', error);
    res.status(500).json({
      error: 'Failed to generate dashboard report',
      message: error.message
    });
  }
});

// GET /api/reports/performance - Detailed performance report
router.get('/performance', authenticateToken, async (req, res) => {
  try {
    const { 
      timeRange = '24hours',
      deviceType = 'all',
      deviceIds,
      includeInterfaces = 'true'
    } = req.query;
    
    const { start, end } = getTimeRange(timeRange);
    
    // Build device filter
    let deviceFilter = {};
    if (deviceType !== 'all') {
      deviceFilter.deviceType = deviceType;
    }
    if (deviceIds) {
      const ids = Array.isArray(deviceIds) ? deviceIds : deviceIds.split(',');
      deviceFilter._id = { $in: ids };
    }
    
    const devices = await Device.find(deviceFilter);
    const deviceIdList = devices.map(d => d._id);
    
    // Get performance metrics for the time range
    const performanceMetrics = await NetworkMetrics.find({
      deviceId: { $in: deviceIdList },
      timestamp: { $gte: start, $lte: end }
    }).sort({ timestamp: -1 });
    
    // Aggregate performance data by device
    const devicePerformance = {};
    
    performanceMetrics.forEach(metric => {
      const deviceId = metric.deviceId.toString();
      if (!devicePerformance[deviceId]) {
        const device = devices.find(d => d._id.toString() === deviceId);
        devicePerformance[deviceId] = {
          device: {
            id: device._id,
            name: device.name,
            ipAddress: device.ipAddress,
            deviceType: device.deviceType,
            status: device.status
          },
          metrics: {
            cpu: [],
            memory: [],
            responseTime: [],
            availability: [],
            interfaces: {}
          }
        };
      }
      
      const dp = devicePerformance[deviceId];
      
      // Collect system metrics
      if (metric.systemMetrics) {
        dp.metrics.cpu.push({
          timestamp: metric.timestamp,
          value: metric.systemMetrics.cpuUtilization
        });
        dp.metrics.memory.push({
          timestamp: metric.timestamp,
          value: metric.systemMetrics.memoryUtilization
        });
      }
      
      if (metric.healthMetrics) {
        dp.metrics.responseTime.push({
          timestamp: metric.timestamp,
          value: metric.healthMetrics.responseTime
        });
        dp.metrics.availability.push({
          timestamp: metric.timestamp,
          value: metric.healthMetrics.availability
        });
      }
      
      // Collect interface metrics if requested
      if (includeInterfaces === 'true' && metric.interfaces) {
        metric.interfaces.forEach(iface => {
          if (!dp.metrics.interfaces[iface.interfaceName]) {
            dp.metrics.interfaces[iface.interfaceName] = {
              inUtilization: [],
              outUtilization: [],
              inErrors: [],
              outErrors: []
            };
          }
          
          const ifaceMetrics = dp.metrics.interfaces[iface.interfaceName];
          ifaceMetrics.inUtilization.push({
            timestamp: metric.timestamp,
            value: iface.inUtilization
          });
          ifaceMetrics.outUtilization.push({
            timestamp: metric.timestamp,
            value: iface.outUtilization
          });
          ifaceMetrics.inErrors.push({
            timestamp: metric.timestamp,
            value: iface.inErrors
          });
          ifaceMetrics.outErrors.push({
            timestamp: metric.timestamp,
            value: iface.outErrors
          });
        });
      }
    });
    
    // Calculate statistics for each device
    const performanceReport = Object.values(devicePerformance).map(dp => {
      const calculateStats = (values) => {
        if (values.length === 0) return { avg: 0, min: 0, max: 0, current: 0 };
        const nums = values.map(v => v.value).filter(v => v !== null && v !== undefined);
        return {
          avg: nums.reduce((a, b) => a + b, 0) / nums.length,
          min: Math.min(...nums),
          max: Math.max(...nums),
          current: nums[nums.length - 1] || 0,
          samples: nums.length
        };
      };
      
      return {
        device: dp.device,
        performance: {
          cpu: calculateStats(dp.metrics.cpu),
          memory: calculateStats(dp.metrics.memory),
          responseTime: calculateStats(dp.metrics.responseTime),
          availability: calculateStats(dp.metrics.availability)
        },
        interfaces: Object.keys(dp.metrics.interfaces).map(ifaceName => ({
          name: ifaceName,
          inUtilization: calculateStats(dp.metrics.interfaces[ifaceName].inUtilization),
          outUtilization: calculateStats(dp.metrics.interfaces[ifaceName].outUtilization),
          inErrors: calculateStats(dp.metrics.interfaces[ifaceName].inErrors),
          outErrors: calculateStats(dp.metrics.interfaces[ifaceName].outErrors)
        })),
        timeSeries: {
          cpu: dp.metrics.cpu,
          memory: dp.metrics.memory,
          responseTime: dp.metrics.responseTime
        }
      };
    });
    
    res.json({
      reportType: 'performance',
      timeRange: { start, end },
      parameters: { timeRange, deviceType, includeInterfaces },
      devices: performanceReport,
      summary: {
        totalDevices: performanceReport.length,
        avgCpuUsage: performanceReport.reduce((sum, d) => sum + (d.performance.cpu.avg || 0), 0) / performanceReport.length,
        avgMemoryUsage: performanceReport.reduce((sum, d) => sum + (d.performance.memory.avg || 0), 0) / performanceReport.length,
        avgResponseTime: performanceReport.reduce((sum, d) => sum + (d.performance.responseTime.avg || 0), 0) / performanceReport.length,
        avgAvailability: performanceReport.reduce((sum, d) => sum + (d.performance.availability.avg || 0), 0) / performanceReport.length
      },
      generatedAt: new Date()
    });
    
  } catch (error) {
    logger.error('Performance report error:', error);
    res.status(500).json({
      error: 'Failed to generate performance report',
      message: error.message
    });
  }
});

// GET /api/reports/availability - Availability and uptime report
router.get('/availability', authenticateToken, async (req, res) => {
  try {
    const { timeRange = '7days', deviceType = 'all' } = req.query;
    const { start, end } = getTimeRange(timeRange);
    
    let deviceFilter = {};
    if (deviceType !== 'all') {
      deviceFilter.deviceType = deviceType;
    }
    
    const devices = await Device.find(deviceFilter);
    const deviceIdList = devices.map(d => d._id);
    
    // Get availability metrics
    const availabilityMetrics = await NetworkMetrics.find({
      deviceId: { $in: deviceIdList },
      timestamp: { $gte: start, $lte: end },
      'healthMetrics.availability': { $exists: true }
    }).sort({ timestamp: 1 });
    
    // Calculate availability statistics per device
    const availabilityReport = devices.map(device => {
      const deviceMetrics = availabilityMetrics.filter(m => m.deviceId.toString() === device._id.toString());
      
      let totalUptime = 0;
      let totalDowntime = 0;
      let outages = [];
      let currentOutage = null;
      
      deviceMetrics.forEach((metric, index) => {
        const isUp = metric.healthMetrics.availability >= 95; // Consider 95%+ as "up"
        const duration = index > 0 ? 
          (metric.timestamp - deviceMetrics[index - 1].timestamp) / (1000 * 60) : // minutes
          0;
        
        if (isUp) {
          totalUptime += duration;
          if (currentOutage) {
            currentOutage.end = metric.timestamp;
            currentOutage.duration = (currentOutage.end - currentOutage.start) / (1000 * 60);
            outages.push(currentOutage);
            currentOutage = null;
          }
        } else {
          totalDowntime += duration;
          if (!currentOutage) {
            currentOutage = {
              start: metric.timestamp,
              end: null,
              reason: metric.healthMetrics.availability < 50 ? 'Critical' : 'Degraded'
            };
          }
        }
      });
      
      // Handle ongoing outage
      if (currentOutage) {
        currentOutage.end = end;
        currentOutage.duration = (currentOutage.end - currentOutage.start) / (1000 * 60);
        outages.push(currentOutage);
      }
      
      const totalTime = totalUptime + totalDowntime;
      const availabilityPercent = totalTime > 0 ? (totalUptime / totalTime) * 100 : 100;
      
      return {
        device: {
          id: device._id,
          name: device.name,
          ipAddress: device.ipAddress,
          deviceType: device.deviceType,
          currentStatus: device.status
        },
        availability: {
          percentage: Math.round(availabilityPercent * 100) / 100,
          uptime: Math.round(totalUptime), // minutes
          downtime: Math.round(totalDowntime), // minutes
          mtbf: outages.length > 0 ? Math.round(totalUptime / outages.length) : null, // Mean Time Between Failures
          mttr: outages.length > 0 ? Math.round(totalDowntime / outages.length) : null, // Mean Time To Repair
          outageCount: outages.length
        },
        outages: outages.map(outage => ({
          start: outage.start,
          end: outage.end,
          duration: Math.round(outage.duration),
          reason: outage.reason
        })),
        slaStatus: availabilityPercent >= 99.9 ? 'met' : availabilityPercent >= 99 ? 'at_risk' : 'breached'
      };
    });
    
    // Calculate overall statistics
    const totalDevices = availabilityReport.length;
    const avgAvailability = availabilityReport.reduce((sum, d) => sum + d.availability.percentage, 0) / totalDevices;
    const devicesUp = availabilityReport.filter(d => d.device.currentStatus === 'online').length;
    const totalOutages = availabilityReport.reduce((sum, d) => sum + d.availability.outageCount, 0);
    const slaCompliant = availabilityReport.filter(d => d.slaStatus === 'met').length;
    
    res.json({
      reportType: 'availability',
      timeRange: { start, end },
      summary: {
        totalDevices,
        devicesOnline: devicesUp,
        averageAvailability: Math.round(avgAvailability * 100) / 100,
        totalOutages,
        slaCompliance: Math.round((slaCompliant / totalDevices) * 100),
        worstPerformers: availabilityReport
          .sort((a, b) => a.availability.percentage - b.availability.percentage)
          .slice(0, 5)
      },
      devices: availabilityReport,
      generatedAt: new Date()
    });
    
  } catch (error) {
    logger.error('Availability report error:', error);
    res.status(500).json({
      error: 'Failed to generate availability report',
      message: error.message
    });
  }
});

// GET /api/reports/capacity - Capacity planning and utilization report
router.get('/capacity', authenticateToken, async (req, res) => {
  try {
    const { timeRange = '30days', forecastDays = 30 } = req.query;
    const { start, end } = getTimeRange(timeRange);
    
    const devices = await Device.find({});
    const deviceIdList = devices.map(d => d._id);
    
    // Get capacity metrics
    const capacityMetrics = await NetworkMetrics.find({
      deviceId: { $in: deviceIdList },
      timestamp: { $gte: start, $lte: end }
    }).sort({ timestamp: 1 });
    
    // Calculate capacity trends and forecast
    const capacityReport = devices.map(device => {
      const deviceMetrics = capacityMetrics.filter(m => m.deviceId.toString() === device._id.toString());
      
      if (deviceMetrics.length === 0) {
        return {
          device: {
            id: device._id,
            name: device.name,
            ipAddress: device.ipAddress,
            deviceType: device.deviceType
          },
          capacity: {
            cpu: { current: 0, trend: 'stable', forecast: 0, daysToCapacity: null },
            memory: { current: 0, trend: 'stable', forecast: 0, daysToCapacity: null },
            storage: { current: 0, trend: 'stable', forecast: 0, daysToCapacity: null },
            bandwidth: { current: 0, trend: 'stable', forecast: 0, daysToCapacity: null }
          }
        };
      }
      
      // Calculate trends using linear regression
      const calculateTrend = (values) => {
        if (values.length < 2) return { slope: 0, forecast: values[0] || 0, trend: 'stable' };
        
        const n = values.length;
        const x = values.map((_, i) => i);
        const y = values;
        
        const sumX = x.reduce((a, b) => a + b);
        const sumY = y.reduce((a, b) => a + b);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        const forecast = slope * (n + forecastDays) + intercept;
        const trend = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';
        
        // Calculate days to reach 90% capacity
        let daysToCapacity = null;
        if (slope > 0) {
          const currentValue = y[y.length - 1];
          const capacityThreshold = 90;
          if (currentValue < capacityThreshold) {
            daysToCapacity = Math.round((capacityThreshold - currentValue) / slope);
            if (daysToCapacity < 0) daysToCapacity = null;
          }
        }
        
        return { slope, forecast: Math.max(0, Math.min(100, forecast)), trend, daysToCapacity };
      };
      
      const cpuValues = deviceMetrics.map(m => m.systemMetrics?.cpuUtilization || 0);
      const memoryValues = deviceMetrics.map(m => m.systemMetrics?.memoryUtilization || 0);
      const storageValues = deviceMetrics.map(m => m.systemMetrics?.diskUtilization || 0);
      
      // Calculate average bandwidth utilization
      const bandwidthValues = deviceMetrics.map(m => {
        if (!m.interfaces || m.interfaces.length === 0) return 0;
        return m.interfaces.reduce((sum, iface) => {
          return sum + ((iface.inUtilization || 0) + (iface.outUtilization || 0)) / 2;
        }, 0) / m.interfaces.length;
      });
      
      const cpuTrend = calculateTrend(cpuValues);
      const memoryTrend = calculateTrend(memoryValues);
      const storageTrend = calculateTrend(storageValues);
      const bandwidthTrend = calculateTrend(bandwidthValues);
      
      return {
        device: {
          id: device._id,
          name: device.name,
          ipAddress: device.ipAddress,
          deviceType: device.deviceType
        },
        capacity: {
          cpu: {
            current: Math.round(cpuValues[cpuValues.length - 1] || 0),
            trend: cpuTrend.trend,
            forecast: Math.round(cpuTrend.forecast),
            daysToCapacity: cpuTrend.daysToCapacity
          },
          memory: {
            current: Math.round(memoryValues[memoryValues.length - 1] || 0),
            trend: memoryTrend.trend,
            forecast: Math.round(memoryTrend.forecast),
            daysToCapacity: memoryTrend.daysToCapacity
          },
          storage: {
            current: Math.round(storageValues[storageValues.length - 1] || 0),
            trend: storageTrend.trend,
            forecast: Math.round(storageTrend.forecast),
            daysToCapacity: storageTrend.daysToCapacity
          },
          bandwidth: {
            current: Math.round(bandwidthValues[bandwidthValues.length - 1] || 0),
            trend: bandwidthTrend.trend,
            forecast: Math.round(bandwidthTrend.forecast),
            daysToCapacity: bandwidthTrend.daysToCapacity
          }
        },
        riskLevel: (() => {
          const risks = [cpuTrend, memoryTrend, storageTrend, bandwidthTrend]
            .filter(t => t.daysToCapacity && t.daysToCapacity <= 30);
          
          if (risks.some(r => r.daysToCapacity <= 7)) return 'critical';
          if (risks.some(r => r.daysToCapacity <= 30)) return 'warning';
          return 'normal';
        })()
      };
    });
    
    // Generate capacity alerts
    const capacityAlerts = capacityReport
      .filter(d => d.riskLevel !== 'normal')
      .map(d => {
        const alerts = [];
        ['cpu', 'memory', 'storage', 'bandwidth'].forEach(resource => {
          const cap = d.capacity[resource];
          if (cap.daysToCapacity && cap.daysToCapacity <= 30) {
            alerts.push({
              device: d.device.name,
              resource: resource.toUpperCase(),
              currentUtilization: cap.current,
              forecastUtilization: cap.forecast,
              daysToCapacity: cap.daysToCapacity,
              severity: cap.daysToCapacity <= 7 ? 'critical' : 'warning'
            });
          }
        });
        return alerts;
      })
      .flat();
    
    res.json({
      reportType: 'capacity',
      timeRange: { start, end },
      forecastPeriod: forecastDays,
      devices: capacityReport,
      summary: {
        totalDevices: capacityReport.length,
        devicesAtRisk: capacityReport.filter(d => d.riskLevel !== 'normal').length,
        criticalDevices: capacityReport.filter(d => d.riskLevel === 'critical').length,
        avgCpuUtilization: Math.round(capacityReport.reduce((sum, d) => sum + d.capacity.cpu.current, 0) / capacityReport.length),
        avgMemoryUtilization: Math.round(capacityReport.reduce((sum, d) => sum + d.capacity.memory.current, 0) / capacityReport.length),
        capacityAlerts: capacityAlerts.length
      },
      alerts: capacityAlerts,
      generatedAt: new Date()
    });
    
  } catch (error) {
    logger.error('Capacity report error:', error);
    res.status(500).json({
      error: 'Failed to generate capacity report',
      message: error.message
    });
  }
});

// Additional report endpoints would go here...
// GET /api/reports/security - Security report
// GET /api/reports/compliance - Compliance report  
// GET /api/reports/sla - SLA report
// GET /api/reports/traffic - Traffic analysis report

// GET /api/reports/scheduled - Get scheduled reports
router.get('/scheduled', authenticateToken, async (req, res) => {
  try {
    const scheduledReports = await NetworkReport.find({
      'metadata.schedule.enabled': true
    })
    .populate('metadata.generatedBy', 'username email')
    .sort({ 'metadata.schedule.nextRun': 1 });
    
    res.json({ scheduledReports });
  } catch (error) {
    logger.error('Scheduled reports error:', error);
    res.status(500).json({
      error: 'Failed to fetch scheduled reports',
      message: error.message
    });
  }
});

// POST /api/reports/schedule - Schedule a new report
router.post('/schedule', authenticateToken, async (req, res) => {
  try {
    const reportData = {
      reportId: generateReportId(),
      title: req.body.name,
      type: req.body.type,
      parameters: {
        timeRange: {
          start: new Date(),
          end: new Date()
        },
        devices: [],
        filters: {}
      },
      metadata: {
        generatedBy: req.user.id,
        status: 'generating',
        schedule: {
          enabled: true,
          frequency: req.body.frequency,
          time: req.body.time,
          recipients: req.body.recipients.split(',').map(email => email.trim()),
          nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000) // Default to tomorrow
        }
      }
    };
    
    const report = new NetworkReport(reportData);
    report.updateSchedule(); // Calculate proper next run time
    await report.save();
    
    res.json({ 
      message: 'Report scheduled successfully',
      reportId: report.reportId,
      nextRun: report.metadata.schedule.nextRun
    });
  } catch (error) {
    logger.error('Schedule report error:', error);
    res.status(500).json({
      error: 'Failed to schedule report',
      message: error.message
    });
  }
});

// DELETE /api/reports/scheduled/:id - Delete a scheduled report
router.delete('/scheduled/:id', authenticateToken, async (req, res) => {
  try {
    await NetworkReport.findByIdAndDelete(req.params.id);
    res.json({ message: 'Scheduled report deleted successfully' });
  } catch (error) {
    logger.error('Delete scheduled report error:', error);
    res.status(500).json({
      error: 'Failed to delete scheduled report',
      message: error.message
    });
  }
});

module.exports = router;