const authService = require('../services/auth.service');

async function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const user = await authService.validateSession(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
}

module.exports = authMiddleware;