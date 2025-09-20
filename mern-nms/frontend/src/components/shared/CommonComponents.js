import React from 'react';
import { Card, Table, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { formatTimestamp, getStatusBadge, EmptyState } from '../../utils/common';

/**
 * Reusable data table component with common features
 */
export const DataTable = ({ 
  title, 
  data, 
  columns, 
  loading = false, 
  error = null, 
  actions = null,
  emptyMessage = "No data available",
  emptyIcon = "fas fa-inbox"
}) => {
  if (loading) {
    return (
      <Card>
        <Card.Header>{title}</Card.Header>
        <Card.Body>
          <div className="text-center py-4">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <div className="mt-2 text-muted">Loading data...</div>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Card.Header>{title}</Card.Header>
        <Card.Body>
          <Alert variant="danger">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h6 className="mb-0">{title}</h6>
        {actions}
      </Card.Header>
      <Card.Body className="p-0">
        {data.length === 0 ? (
          <EmptyState 
            title="No Data Found"
            description={emptyMessage}
            icon={emptyIcon}
          />
        ) : (
          <Table responsive striped hover className="mb-0">
            <thead>
              <tr>
                {columns.map((column, index) => (
                  <th key={index} className={column.className}>
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((column, colIndex) => (
                    <td key={colIndex} className={column.className}>
                      {column.render ? column.render(row) : row[column.field]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
};

/**
 * Reusable metric card component
 */
export const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color = 'primary',
  trend = null,
  onClick = null
}) => (
  <Card 
    className={`text-center ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
    style={{ cursor: onClick ? 'pointer' : 'default' }}
  >
    <Card.Body>
      {icon && <i className={`${icon} fa-2x text-${color} mb-2`}></i>}
      <h3 className={`text-${color}`}>{value}</h3>
      <p className="text-muted mb-1">{title}</p>
      {subtitle && <small className="text-muted">{subtitle}</small>}
      {trend && (
        <div className="mt-2">
          <Badge bg={trend.direction === 'up' ? 'success' : trend.direction === 'down' ? 'danger' : 'secondary'}>
            <i className={`fas fa-arrow-${trend.direction} me-1`}></i>
            {trend.value}
          </Badge>
        </div>
      )}
    </Card.Body>
  </Card>
);

/**
 * Reusable status indicator component
 */
export const StatusIndicator = ({ status, size = 'sm', showText = true }) => (
  <div className="d-flex align-items-center">
    <div 
      className={`me-2 ${
        status === 'online' || status === 'active' ? 'text-success' : 
        status === 'offline' || status === 'inactive' ? 'text-danger' : 
        'text-warning'
      }`}
    >
      <i className={`fas fa-circle ${size === 'lg' ? 'fa-lg' : ''}`} style={{ fontSize: size === 'sm' ? '8px' : '12px' }}></i>
    </div>
    {showText && (
      <span className={`text-${size === 'lg' ? 'body' : 'muted'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )}
  </div>
);

/**
 * Reusable action buttons component
 */
export const ActionButtons = ({ actions, size = 'sm' }) => (
  <div className="d-flex gap-2">
    {actions.map((action, index) => (
      <Button
        key={index}
        variant={action.variant || 'outline-primary'}
        size={size}
        onClick={action.onClick}
        disabled={action.disabled}
        title={action.tooltip}
      >
        {action.icon && <i className={`${action.icon} ${action.text ? 'me-1' : ''}`}></i>}
        {action.text}
      </Button>
    ))}
  </div>
);

/**
 * Reusable filter form component
 */
export const FilterForm = ({ filters, onFilterChange, onReset }) => (
  <Card className="mb-3">
    <Card.Header className="bg-light">
      <h6 className="mb-0">Filters</h6>
    </Card.Header>
    <Card.Body>
      <div className="row">
        {filters.map((filter, index) => (
          <div key={index} className={`col-md-${filter.width || 3}`}>
            <div className="mb-3">
              <label className="form-label">{filter.label}</label>
              {filter.type === 'select' ? (
                <select
                  className="form-select"
                  value={filter.value}
                  onChange={(e) => onFilterChange(filter.name, e.target.value)}
                >
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : filter.type === 'date' ? (
                <input
                  type="date"
                  className="form-control"
                  value={filter.value}
                  onChange={(e) => onFilterChange(filter.name, e.target.value)}
                />
              ) : (
                <input
                  type={filter.type || 'text'}
                  className="form-control"
                  value={filter.value}
                  onChange={(e) => onFilterChange(filter.name, e.target.value)}
                  placeholder={filter.placeholder}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      {onReset && (
        <div className="d-flex justify-content-end">
          <Button variant="outline-secondary" onClick={onReset}>
            <i className="fas fa-undo me-1"></i>
            Reset Filters
          </Button>
        </div>
      )}
    </Card.Body>
  </Card>
);

/**
 * Reusable progress bar component
 */
export const ProgressBar = ({ value, max = 100, label, variant = 'primary', showPercentage = true }) => {
  const percentage = Math.round((value / max) * 100);
  
  return (
    <div className="mb-3">
      {label && (
        <div className="d-flex justify-content-between mb-1">
          <span>{label}</span>
          {showPercentage && <span>{percentage}%</span>}
        </div>
      )}
      <div className="progress">
        <div 
          className={`progress-bar bg-${variant}`}
          role="progressbar"
          style={{ width: `${percentage}%` }}
          aria-valuenow={value}
          aria-valuemin="0"
          aria-valuemax={max}
        ></div>
      </div>
    </div>
  );
};