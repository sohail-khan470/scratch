const authService = require('../services/auth.service');
const userService = require('../services/user.service');

class AuthController {
  async emailLogin(req, res) {
    try {
      const { email, password } = req.body;
      const { token, userId } = await authService.loginWithEmail(email, password);
      const user = await userService.getUserById(userId);
      
      res.json({ token, user });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }

  async initiatePhoneLogin(req, res) {
    try {
      const { phone } = req.body;
      const result = await authService.loginWithPhone(phone);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async verifyPhoneLogin(req, res) {
    try {
      const { phone, otp } = req.body;
      const { token, userId } = await authService.verifyPhoneLogin(phone, otp);
      const user = await userService.getUserById(userId);
      
      res.json({ token, user });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }

  async googleAuth(req, res) {
    try {
      // In a real app, you'd verify the Google token first
      const { googleId, email, name } = req.body;
      const { token, userId } = await authService.handleGoogleAuth(googleId, email, name);
      const user = await userService.getUserById(userId);
      
      res.json({ token, user });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async signUp(req, res) {
    try {
      const { email, password, phone } = req.body;
      const user = await authService.signUp(email, password, phone);
      
      // Automatically log in after signup
      const { token } = await authService.createSession(user.id);
      res.json({ token, user });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async validateSession(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new Error('No token provided');
      }
      
      const user = await authService.validateSession(token);
      res.json({ user });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }
}

module.exports = new AuthController();