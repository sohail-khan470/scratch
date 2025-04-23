const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

class AuthService {
  async loginWithEmail(email, password) {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user || !user.password) {
      throw new Error('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new Error('Invalid credentials');
    }

    return this.createSession(user.id);
  }

  async loginWithPhone(phone) {
    // In a real app, you'd send an OTP here
    const user = await prisma.user.findUnique({ where: { phone } });
    
    if (!user) {
      throw new Error('Phone number not registered');
    }

    return { message: 'OTP sent to phone' };
  }

  async verifyPhoneLogin(phone, otp) {
    // Verify OTP (mock implementation)
    if (otp !== '123456') { // In real app, verify against stored OTP
      throw new Error('Invalid OTP');
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new Error('User not found');
    }

    return this.createSession(user.id);
  }

  async handleGoogleAuth(googleId, email, name) {
    let user = await prisma.user.findFirst({ 
      where: { OR: [{ googleId }, { email }] } 
    });

    if (!user) {
      user = await prisma.user.create({
        data: { googleId, email, name }
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId }
      });
    }

    return this.createSession(user.id);
  }

  async signUp(email, password, phone) {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    return prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        phone
      }
    });
  }

  async createSession(userId) {
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    await prisma.session.create({
      data: {
        userId,
        token,
        expiresAt
      }
    });

    return { token, userId };
  }

  async validateSession(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const session = await prisma.session.findFirst({
        where: { 
          token,
          userId: decoded.userId,
          expiresAt: { gt: new Date() }
        },
        include: { user: true }
      });

      if (!session) {
        throw new Error('Invalid session');
      }

      return session.user;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

module.exports = new AuthService();