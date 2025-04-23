const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class UserService {
  async getUserById(id) {
    return prisma.user.findUnique({ where: { id } });
  }

  async getUserByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  }

  async getUserByPhone(phone) {
    return prisma.user.findUnique({ where: { phone } });
  }
}

module.exports = new UserService();