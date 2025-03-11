// Project structure:
// - server.js (main entry point)
// - prisma/schema.prisma (database schema)
// - middleware/auth.js (authentication middleware)
// - middleware/rbac.js (authorization middleware)
// - utils/logger.js (activity logging utility)
// - routes/auth.js (authentication routes)
// - routes/users.js (user management routes)
// - routes/roles.js (role management routes)

// ============================
// prisma/schema.prisma
// ============================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id            Int             @id @default(autoincrement())
  email         String          @unique
  name          String
  password      String
  roleId        Int
  role          Role            @relation(fields: [roleId], references: [id])
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  activityLogs  ActivityLog[]
}

model Role {
  id            Int             @id @default(autoincrement())
  name          String          @unique
  description   String?
  users         User[]
  permissions   Permission[]    @relation("RolePermissions")
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
}

model Permission {
  id            Int             @id @default(autoincrement())
  name          String          @unique
  description   String?
  roles         Role[]          @relation("RolePermissions")
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
}

model ActivityLog {
  id            Int             @id @default(autoincrement())
  userId        Int
  user          User            @relation(fields: [userId], references: [id])
  action        String
  resource      String
  details       String?         @db.Text
  createdAt     DateTime        @default(now())
}

// ============================
// server.js (Main entry point)
// ============================

const express = require('express');
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const logger = require('./utils/logger');

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(bodyParser.json());
app.use(logger.requestLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('exit', async () => {
  await prisma.$disconnect();
});

module.exports = app;

// ============================
// middleware/auth.js
// ============================

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });
    
    if (!user) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    
    // Add user and permissions to request object
    req.user = user;
    req.userPermissions = user.role.permissions.map(p => p.name);
    
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

module.exports = { authenticateToken };

// ============================
// middleware/rbac.js
// ============================

const logger = require('../utils/logger');

const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // User and permissions should be attached by auth middleware
      if (!req.user || !req.userPermissions) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const hasPermission = req.userPermissions.includes(requiredPermission);
      
      // Log the access attempt
      await logger.logActivity(
        req.user.id,
        hasPermission ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
        req.originalUrl,
        `Permission check for ${requiredPermission}`
      );
      
      if (!hasPermission) {
        return res.status(403).json({ 
          message: `Permission denied. Required: ${requiredPermission}` 
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { checkPermission };

// ============================
// utils/logger.js
// ============================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Log all requests
const requestLogger = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
};

// Log user activities to database
const logActivity = async (userId, action, resource, details = null) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        resource,
        details
      }
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

module.exports = { requestLogger, logActivity };

// ============================
// routes/auth.js
// ============================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { email, name, password, roleId } = req.body;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        roleId
      }
    });
    
    // Log activity
    await logger.logActivity(
      newUser.id,
      'USER_REGISTERED',
      'auth/register',
      `User registered with role ID: ${roleId}`
    );
    
    res.status(201).json({ 
      message: 'User registered successfully',
      userId: newUser.id 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      // Log failed login attempt
      await logger.logActivity(
        user.id,
        'LOGIN_FAILED',
        'auth/login',
        'Invalid password'
      );
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Log successful login
    await logger.logActivity(
      user.id,
      'LOGIN_SUCCESS',
      'auth/login',
      `Login from ${req.ip}`
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        permissions: user.role.permissions.map(p => p.name)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error during login' });
  }
});

module.exports = router;

// ============================
// routes/users.js
// ============================

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Get all users (Admin only)
router.get('/', 
  authenticateToken, 
  checkPermission('READ_USERS'),
  async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: {
            select: {
              id: true,
              name: true
            }
          },
          createdAt: true
        }
      });
      
      await logger.logActivity(
        req.user.id,
        'LIST_USERS',
        'users',
        `Retrieved ${users.length} users`
      );
      
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error retrieving users' });
    }
  }
);

// Get user by ID
router.get('/:id', 
  authenticateToken, 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user is requesting their own profile or has admin permission
      const isOwnProfile = req.user.id === parseInt(id);
      const hasAdminAccess = req.userPermissions.includes('READ_USERS');
      
      if (!isOwnProfile && !hasAdminAccess) {
        await logger.logActivity(
          req.user.id,
          'ACCESS_DENIED',
          `users/${id}`,
          'Attempted to access another user\'s profile without permission'
        );
        return res.status(403).json({ message: 'Permission denied' });
      }
      
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) },
        select: {
          id: true,
          email: true,
          name: true,
          role: {
            select: {
              id: true,
              name: true,
              permissions: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          createdAt: true
        }
      });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      await logger.logActivity(
        req.user.id,
        'VIEW_USER',
        `users/${id}`,
        `Retrieved user details for ID: ${id}`
      );
      
      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error retrieving user' });
    }
  }
);

// Update user
router.put('/:id', 
  authenticateToken, 
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, roleId } = req.body;
      
      // Check if user is updating their own profile or has admin permission
      const isOwnProfile = req.user.id === parseInt(id);
      const hasAdminAccess = req.userPermissions.includes('UPDATE_USERS');
      
      if (!isOwnProfile && !hasAdminAccess) {
        await logger.logActivity(
          req.user.id,
          'ACCESS_DENIED',
          `users/${id}`,
          'Attempted to update another user\'s profile without permission'
        );
        return res.status(403).json({ message: 'Permission denied' });
      }
      
      // Only admins can change roles
      if (roleId && !hasAdminAccess) {
        await logger.logActivity(
          req.user.id,
          'ACCESS_DENIED',
          `users/${id}`,
          'Attempted to change role without permission'
        );
        return res.status(403).json({ message: 'Changing roles requires admin permission' });
      }
      
      // Prepare update data
      const updateData = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (roleId && hasAdminAccess) updateData.roleId = roleId;
      
      const updatedUser = await prisma.user.update({
        where: { id: parseInt(id) },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      
      await logger.logActivity(
        req.user.id,
        'UPDATE_USER',
        `users/${id}`,
        `Updated user ID: ${id}, Fields: ${Object.keys(updateData).join(', ')}`
      );
      
      res.json(updatedUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error updating user' });
    }
  }
);

// Delete user (Admin only)
router.delete('/:id', 
  authenticateToken, 
  checkPermission('DELETE_USERS'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) }
      });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Delete user
      await prisma.user.delete({
        where: { id: parseInt(id) }
      });
      
      await logger.logActivity(
        req.user.id,
        'DELETE_USER',
        `users/${id}`,
        `Deleted user ID: ${id}`
      );
      
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error deleting user' });
    }
  }
);

// Get user activity logs
router.get('/:id/activities', 
  authenticateToken, 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user is requesting their own logs or has admin permission
      const isOwnLogs = req.user.id === parseInt(id);
      const hasAdminAccess = req.userPermissions.includes('READ_ACTIVITY_LOGS');
      
      if (!isOwnLogs && !hasAdminAccess) {
        await logger.logActivity(
          req.user.id,
          'ACCESS_DENIED',
          `users/${id}/activities`,
          'Attempted to access another user\'s activity logs without permission'
        );
        return res.status(403).json({ message: 'Permission denied' });
      }
      
      const logs = await prisma.activityLog.findMany({
        where: { userId: parseInt(id) },
        orderBy: { createdAt: 'desc' },
        take: 100  // Limit to last 100 logs
      });
      
      await logger.logActivity(
        req.user.id,
        'VIEW_ACTIVITY_LOGS',
        `users/${id}/activities`,
        `Retrieved activity logs for user ID: ${id}`
      );
      
      res.json(logs);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error retrieving activity logs' });
    }
  }
);

module.exports = router;

// ============================
// routes/roles.js
// ============================

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Get all roles
router.get('/', 
  authenticateToken, 
  checkPermission('READ_ROLES'),
  async (req, res) => {
    try {
      const roles = await prisma.role.findMany({
        include: {
          permissions: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: { users: true }
          }
        }
      });
      
      await logger.logActivity(
        req.user.id,
        'LIST_ROLES',
        'roles',
        `Retrieved ${roles.length} roles`
      );
      
      res.json(roles);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error retrieving roles' });
    }
  }
);

// Create new role
router.post('/', 
  authenticateToken, 
  checkPermission('CREATE_ROLES'),
  async (req, res) => {
    try {
      const { name, description, permissionIds } = req.body;
      
      // Check if role with same name already exists
      const existingRole = await prisma.role.findUnique({
        where: { name }
      });
      
      if (existingRole) {
        return res.status(400).json({ message: 'Role with this name already exists' });
      }
      
      // Create role with permissions
      const newRole = await prisma.role.create({
        data: {
          name,
          description,
          permissions: {
            connect: permissionIds.map(id => ({ id }))
          }
        },
        include: {
          permissions: true
        }
      });
      
      await logger.logActivity(
        req.user.id,
        'CREATE_ROLE',
        'roles',
        `Created new role: ${name} with ${permissionIds.length} permissions`
      );
      
      res.status(201).json(newRole);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error creating role' });
    }
  }
);

// Get role by ID
router.get('/:id', 
  authenticateToken, 
  checkPermission('READ_ROLES'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const role = await prisma.role.findUnique({
        where: { id: parseInt(id) },
        include: {
          permissions: true,
          users: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      if (!role) {
        return res.status(404).json({ message: 'Role not found' });
      }
      
      await logger.logActivity(
        req.user.id,
        'VIEW_ROLE',
        `roles/${id}`,
        `Retrieved role details for ID: ${id}`
      );
      
      res.json(role);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error retrieving role' });
    }
  }
);

// Update role
router.put('/:id', 
  authenticateToken, 
  checkPermission('UPDATE_ROLES'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, permissionIds } = req.body;
      
      // Check if role exists
      const role = await prisma.role.findUnique({
        where: { id: parseInt(id) },
        include: {
          permissions: true
        }
      });
      
      if (!role) {
        return res.status(404).json({ message: 'Role not found' });
      }
      
      // Prepare update data
      const updateData = {};
      if (name) updateData.name = name;
      if (description) updateData.description = description;
      
      // Update permissions if provided
      let updatedRole;
      if (permissionIds) {
        updatedRole = await prisma.role.update({
          where: { id: parseInt(id) },
          data: {
            ...updateData,
            permissions: {
              set: permissionIds.map(permId => ({ id: permId }))
            }
          },
          include: {
            permissions: true
          }
        });
      } else {
        updatedRole = await prisma.role.update({
          where: { id: parseInt(id) },
          data: updateData,
          include: {
            permissions: true
          }
        });
      }
      
      await logger.logActivity(
        req.user.id,
        'UPDATE_ROLE',
        `roles/${id}`,
        `Updated role ID: ${id}, Fields: ${Object.keys(updateData).join(', ')}, Permissions updated: ${permissionIds ? 'Yes' : 'No'}`
      );
      
      res.json(updatedRole);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error updating role' });
    }
  }
);

// Delete role
router.delete('/:id', 
  authenticateToken, 
  checkPermission('DELETE_ROLES'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if role exists
      const role = await prisma.role.findUnique({
        where: { id: parseInt(id) },
        include: {
          users: true
        }
      });
      
      if (!role) {
        return res.status(404).json({ message: 'Role not found' });
      }
      
      // Check if role has users
      if (role.users.length > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete role with assigned users. Reassign users first.' 
        });
      }
      
      // Delete role
      await prisma.role.delete({
        where: { id: parseInt(id) }
      });
      
      await logger.logActivity(
        req.user.id,
        'DELETE_ROLE',
        `roles/${id}`,
        `Deleted role ID: ${id}, Name: ${role.name}`
      );
      
      res.json({ message: 'Role deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error deleting role' });
    }
  }
);

// Get all permissions
router.get('/permissions/all', 
  authenticateToken, 
  checkPermission('READ_PERMISSIONS'),
  async (req, res) => {
    try {
      const permissions = await prisma.permission.findMany();
      
      await logger.logActivity(
        req.user.id,
        'LIST_PERMISSIONS',
        'roles/permissions/all',
        `Retrieved ${permissions.length} permissions`
      );
      
      res.json(permissions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error retrieving permissions' });
    }
  }
);

module.exports = router;

// ============================
// Initial setup script (createInitialData.js)
// ============================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createInitialData() {
  try {
    // Create permissions
    const permissions = [
      // User permissions
      { name: 'CREATE_USERS', description: 'Create new users' },
      { name: 'READ_USERS', description: 'View user information' },
      { name: 'UPDATE_USERS', description: 'Update user information' },
      { name: 'DELETE_USERS', description: 'Delete users' },
      
      // Role permissions
      { name: 'CREATE_ROLES', description: 'Create new roles' },
      { name: 'READ_ROLES', description: 'View role information' },
      { name: 'UPDATE_ROLES', description: 'Update role information' },
      { name: 'DELETE_ROLES', description: 'Delete roles' },
      
      // Permission management
      { name: 'READ_PERMISSIONS', description: 'View permissions' },
      
      // Activity logs
      { name: 'READ_ACTIVITY_LOGS', description: 'View activity logs' },
    ];
    
    for (const permission of permissions) {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: {},
        create: permission
      });
    }
    
    console.log('Permissions created');
    
    // Create roles
    const roles = [
      {
        name: 'Admin',
        description: 'Full system access',
        permissions: permissions.map(p => ({ name: p.name }))
      },
      {
        name: 'Manager',
        description: 'Can manage users but not roles',
        permissions: [
          { name: 'CREATE_USERS' },
          { name: 'READ_USERS' },
          { name: 'UPDATE_USERS' },
          { name: 'READ_ROLES' },
          { name: 'READ_PERMISSIONS' },
          { name: 'READ_ACTIVITY_LOGS' }
        ]
      },
      {
        name: 'User',
        description: 'Regular user with limited access',
        permissions: []
      }
    ];
    
    for (const role of roles) {
      await prisma.role.upsert({
        where: { name: role.name },
        update: {
          description: role.description,
          permissions: {
            connect: role.permissions
          }
        },
        create: {
          name: role.name,
          description: role.description,
          permissions: {
            connect: role.permissions
          }
        }
      });
    }
    
    console.log('Roles created');
    
    // Create admin user
    const adminRole = await prisma.role.findUnique({
      where: { name: 'Admin' }
    });
    
    if (adminRole) {
      const adminPassword = await bcrypt.hash('admin123', 10);
      
      await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
          email: 'admin@example.com',
          name: 'System Admin',
          password: adminPassword,
          roleId: adminRole.id
        }
      });
      
      console.log('Admin user created');
    }
    
    console.log('Initial data setup completed');
  } catch (error) {
    console.error('Error creating initial data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createInitialData();

// ============================
// package.json
// ============================
/*
{
  "name": "rbac-express-prisma",
  "version": "1.0.0",
  "description": "RBAC system with Express, Prisma, MySQL and activity logging",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "setup": "node createInitialData.js"
  },
  "dependencies": {
    "@prisma/client": "^5.10.0",
    "bcrypt": "^5.1.1",
    "body-parser": "^1.20.2",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "prisma": "^5.10.0"
  }
}
*/

// ============================
// .env
// ============================
/*
DATABASE_URL="mysql://user:password@localhost:3306/rbac_db"
JWT_SECRET="your-secret-key-here"
PORT=3000
*/