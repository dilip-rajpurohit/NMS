/**
 * Form validation utilities
 */

export const validators = {
  required: (value, fieldName = 'Field') => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return `${fieldName} is required`;
    }
    return null;
  },

  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  minLength: (value, min) => {
    if (value && value.length < min) {
      return `Must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (value, max) => {
    if (value && value.length > max) {
      return `Must not exceed ${max} characters`;
    }
    return null;
  },

  password: (value) => {
    if (!value) return null;
    
    const errors = [];
    if (value.length < 8) errors.push('at least 8 characters');
    if (!/[A-Z]/.test(value)) errors.push('one uppercase letter');
    if (!/[a-z]/.test(value)) errors.push('one lowercase letter');
    if (!/[0-9]/.test(value)) errors.push('one number');
    if (!/[!@#$%^&*]/.test(value)) errors.push('one special character');
    
    if (errors.length > 0) {
      return `Password must contain ${errors.join(', ')}`;
    }
    return null;
  },

  confirmPassword: (value, password) => {
    if (value !== password) {
      return 'Passwords do not match';
    }
    return null;
  },

  ip: (value) => {
    if (!value) return null;
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(value)) {
      return 'Please enter a valid IP address';
    }
    return null;
  },

  cidr: (value) => {
    if (!value) return null;
    const cidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/;
    if (!cidrRegex.test(value)) {
      return 'Please enter a valid CIDR notation (e.g., 192.168.1.0/24)';
    }
    return null;
  },

  port: (value) => {
    if (!value) return null;
    const port = parseInt(value);
    if (isNaN(port) || port < 1 || port > 65535) {
      return 'Please enter a valid port number (1-65535)';
    }
    return null;
  },

  number: (value, min = null, max = null) => {
    if (!value) return null;
    const num = parseFloat(value);
    if (isNaN(num)) {
      return 'Please enter a valid number';
    }
    if (min !== null && num < min) {
      return `Value must be at least ${min}`;
    }
    if (max !== null && num > max) {
      return `Value must not exceed ${max}`;
    }
    return null;
  },

  url: (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  }
};

/**
 * Validate a form object against validation rules
 * @param {Object} formData - Form data to validate
 * @param {Object} rules - Validation rules for each field
 * @returns {Object} Validation errors object
 */
export const validateForm = (formData, rules) => {
  const errors = {};

  Object.keys(rules).forEach(field => {
    const fieldRules = rules[field];
    const value = formData[field];

    for (const rule of fieldRules) {
      let error = null;

      if (typeof rule === 'function') {
        error = rule(value);
      } else if (typeof rule === 'object') {
        const { validator, ...params } = rule;
        if (validator === 'required') {
          error = validators.required(value, rule.fieldName || field);
        } else if (validator === 'minLength') {
          error = validators.minLength(value, params.min);
        } else if (validator === 'maxLength') {
          error = validators.maxLength(value, params.max);
        } else if (validator === 'number') {
          error = validators.number(value, params.min, params.max);
        } else if (validator === 'confirmPassword') {
          error = validators.confirmPassword(value, formData[params.field]);
        } else if (validators[validator]) {
          error = validators[validator](value);
        }
      }

      if (error) {
        errors[field] = error;
        break; // Stop at first error for this field
      }
    }
  });

  return errors;
};

/**
 * Check if form has any validation errors
 * @param {Object} errors - Validation errors object
 * @returns {boolean} True if form is valid
 */
export const isFormValid = (errors) => {
  return Object.keys(errors).length === 0;
};

/**
 * Get first error message from errors object
 * @param {Object} errors - Validation errors object
 * @returns {string|null} First error message or null
 */
export const getFirstError = (errors) => {
  const errorKeys = Object.keys(errors);
  return errorKeys.length > 0 ? errors[errorKeys[0]] : null;
};

/**
 * Common validation rule sets
 */
export const commonRules = {
  user: {
    name: [validators.required],
    email: [validators.required, validators.email],
    password: [validators.required, validators.password],
    confirmPassword: [
      validators.required,
      { validator: 'confirmPassword', field: 'password' }
    ]
  },

  device: {
    name: [validators.required, { validator: 'maxLength', max: 50 }],
    ip: [validators.required, validators.ip],
    snmpCommunity: [validators.required],
    description: [{ validator: 'maxLength', max: 255 }]
  },

  network: {
    name: [validators.required],
    ip: [validators.required, validators.ip],
    subnet: [validators.required],
    gateway: [validators.ip],
    mtu: [{ validator: 'number', min: 68, max: 9000 }]
  }
};