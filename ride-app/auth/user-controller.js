const userService = require('../services/user.service');

class UserController {
  async getUser(req, res) {
    try {
      const userId = req.params.id;
      const user = await userService.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new UserController();