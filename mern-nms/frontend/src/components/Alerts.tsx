import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Alert {
  alertId: string;
  deviceId: string;
  deviceName: string;
  deviceIp: string;
  deviceType: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  resolvedAt?: string;
}

interface AlertStatistics {
  totalAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  infoAlerts: number;
  acknowledgedAlerts: number;
  unacknowledgedAlerts: number;
}

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [statistics, setStatistics] = useState<AlertStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    severity: 'all',
    acknowledged: 'all',
    page: 1,
    limit: 20
  });
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/alerts', { params: filters });
      setAlerts(response.data.alerts || []);
      setStatistics(response.data.statistics);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching alerts:', err);
      setError(err.response?.data?.message || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filters]);

  const acknowledgeAlerts = async (alertIds: string[]) => {
    try {
      await api.post('/alerts/acknowledge', { alertIds });
      fetchAlerts(); // Refresh the alerts list
      setSelectedAlerts([]);
    } catch (err: any) {
      console.error('Error acknowledging alerts:', err);
      setError(err.response?.data?.message || 'Failed to acknowledge alerts');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'info': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleSelectAlert = (alertId: string) => {
    setSelectedAlerts(prev => 
      prev.includes(alertId) 
        ? prev.filter(id => id !== alertId)
        : [...prev, alertId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAlerts.length === alerts.length) {
      setSelectedAlerts([]);
    } else {
      setSelectedAlerts(alerts.map(alert => alert.alertId));
    }
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Network Alerts</h2>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Network Alerts</h2>
        {selectedAlerts.length > 0 && (
          <button
            onClick={() => acknowledgeAlerts(selectedAlerts)}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Acknowledge Selected ({selectedAlerts.length})
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-2xl font-bold text-gray-700">{statistics.totalAlerts}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
          <div className="bg-red-50 p-3 rounded">
            <div className="text-2xl font-bold text-red-600">{statistics.criticalAlerts}</div>
            <div className="text-sm text-red-500">Critical</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded">
            <div className="text-2xl font-bold text-yellow-600">{statistics.warningAlerts}</div>
            <div className="text-sm text-yellow-500">Warning</div>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-2xl font-bold text-blue-600">{statistics.infoAlerts}</div>
            <div className="text-sm text-blue-500">Info</div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-2xl font-bold text-green-600">{statistics.acknowledgedAlerts}</div>
            <div className="text-sm text-green-500">Acknowledged</div>
          </div>
          <div className="bg-orange-50 p-3 rounded">
            <div className="text-2xl font-bold text-orange-600">{statistics.unacknowledgedAlerts}</div>
            <div className="text-sm text-orange-500">Unack.</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={filters.severity}
          onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value, page: 1 }))}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>

        <select
          value={filters.acknowledged}
          onChange={(e) => setFilters(prev => ({ ...prev, acknowledged: e.target.value, page: 1 }))}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Alerts</option>
          <option value="false">Unacknowledged</option>
          <option value="true">Acknowledged</option>
        </select>

        <button
          onClick={fetchAlerts}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Alert Cards for smaller screens, Table for larger */}
      <div className="block md:hidden space-y-4">
        {alerts.map((alert) => (
          <div key={alert.alertId} className={`border rounded-lg p-4 ${alert.acknowledged ? 'bg-gray-50' : 'bg-white'}`}>
            <div className="flex justify-between items-start mb-2">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(alert.severity)}`}>
                {alert.severity.toUpperCase()}
              </span>
              <input
                type="checkbox"
                checked={selectedAlerts.includes(alert.alertId)}
                onChange={() => handleSelectAlert(alert.alertId)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
            </div>
            <div className="text-sm font-medium text-gray-900 mb-1">{alert.deviceName}</div>
            <div className="text-sm text-gray-500 mb-2">{alert.deviceIp}</div>
            <div className="text-sm text-gray-900 mb-2">{alert.message}</div>
            <div className="text-xs text-gray-500 mb-2">{formatTimestamp(alert.timestamp)}</div>
            <div className="flex justify-between items-center">
              {alert.acknowledged ? (
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  Acknowledged
                </span>
              ) : (
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                  Open
                </span>
              )}
              {!alert.acknowledged && (
                <button
                  onClick={() => acknowledgeAlerts([alert.alertId])}
                  className="text-green-600 hover:text-green-900 text-sm"
                >
                  Acknowledge
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Table for larger screens */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectedAlerts.length === alerts.length && alerts.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Severity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Device
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Message
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {alerts.map((alert) => (
              <tr key={alert.alertId} className={alert.acknowledged ? 'bg-gray-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedAlerts.includes(alert.alertId)}
                    onChange={() => handleSelectAlert(alert.alertId)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{alert.deviceName}</div>
                  <div className="text-sm text-gray-500">{alert.deviceIp}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {alert.type}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {alert.message}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatTimestamp(alert.timestamp)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {alert.acknowledged ? (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Acknowledged
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                      Open
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlerts([alert.alertId])}
                      className="text-green-600 hover:text-green-900"
                    >
                      Acknowledge
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {alerts.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No alerts found matching your criteria.
        </div>
      )}
    </div>
  );
};

export default Alerts;