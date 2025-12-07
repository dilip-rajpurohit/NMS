const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Authorization middleware for admin actions
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// Simple test endpoint
router.get('/test', authenticateToken, requireAdmin, (req, res) => {
  console.log('=== ADMIN TEST endpoint called ===');
  res.json({ message: 'Admin routes working', user: req.user._id });
});

module.exports = router;