// ============ prisma/schema.prisma ============

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  password  String
  name      String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  logs      Log[]
  comments  Comment[]
  // Add other relations as needed
}

model Comment {
  id        Int      @id @default(autoincrement())
  content   String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  // Add other fields as needed
}

// You can add more models here as needed

model Log {
  id          Int      @id @default(autoincrement())
  action      String   // CREATE, UPDATE, DELETE, etc.
  entity      String   // The model name: "comment", "user", "post", etc.
  entityId    String?  // ID of the affected entity
  description String?  // Human-readable description of the action
  metadata    Json?    // Stores both old and new values, differences, etc.
  timestamp   DateTime @default(now())
  userId      Int      // Who performed the action
  user        User     @relation(fields: [userId], references: [id])
}

// ============ src/utils/logger.js ============

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Generic logger utility for tracking operations on any entity in the system
 */
class EntityLogger {
  /**
   * Create a log entry for any entity action
   * 
   * @param {Object} options - Logging options
   * @param {number} options.userId - ID of the user performing the action
   * @param {string} options.action - Action performed (CREATE, UPDATE, DELETE, etc.)
   * @param {string} options.entity - Entity type (comment, user, post, etc.)
   * @param {string|number} options.entityId - ID of the entity
   * @param {string} options.description - Human-readable description
   * @param {Object} options.metadata - Additional data to store (old/new values, etc.)
   * @returns {Promise<Object>} - The created log entry
   */
  static async createLog({
    userId,
    action,
    entity,
    entityId,
    description,
    metadata = {}
  }) {
    try {
      return await prisma.log.create({
        data: {
          action,
          entity,
          entityId: entityId ? entityId.toString() : null,
          description,
          metadata,
          userId
        }
      });
    } catch (error) {
      console.error(`Error creating log for ${entity} ${action}:`, error);
      // Don't throw - logging should never break the main application flow
      return null;
    }
  }

  /**
   * Log entity creation
   */
  static async logCreate(userId, entity, entityId, data, description = null) {
    return this.createLog({
      userId,
      action: 'CREATE',
      entity,
      entityId,
      description: description || `User created new ${entity} #${entityId}`,
      metadata: { createdData: data }
    });
  }

  /**
   * Log entity update
   */
  static async logUpdate(userId, entity, entityId, oldData, newData, description = null) {
    const changes = this.generateChanges(oldData, newData);
    
    return this.createLog({
      userId,
      action: 'UPDATE',
      entity,
      entityId,
      description: description || `User updated ${entity} #${entityId}`,
      metadata: {
        oldData,
        newData,
        changes
      }
    });
  }

  /**
   * Log entity deletion
   */
  static async logDelete(userId, entity, entityId, deletedData, description = null) {
    return this.createLog({
      userId,
      action: 'DELETE',
      entity,
      entityId,
      description: description || `User deleted ${entity} #${entityId}`,
      metadata: { deletedData }
    });
  }

  /**
   * Log entity retrieval/view/read
   */
  static async logRead(userId, entity, entityId, description = null) {
    return this.createLog({
      userId,
      action: 'READ',
      entity,
      entityId,
      description: description || `User viewed ${entity} #${entityId}`
    });
  }

  /**
   * Log custom actions
   */
  static async logCustomAction(userId, action, entity, entityId, metadata = {}, description) {
    return this.createLog({
      userId,
      action,
      entity,
      entityId,
      description,
      metadata
    });
  }

  /**
   * Generate a difference report between old and new data
   */
  static generateChanges(oldData, newData) {
    const changes = {};
    
    // Skip if either object is null/undefined
    if (!oldData || !newData) return { complete: true, old: oldData, new: newData };
    
    // Compare all fields in new data
    Object.keys(newData).forEach(key => {
      // Only record if there's a difference
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes[key] = {
          old: oldData[key],
          new: newData[key]
        };
      }
    });
    
    // Check if any fields were removed
    Object.keys(oldData).forEach(key => {
      if (newData[key] === undefined && oldData[key] !== undefined) {
        changes[key] = {
          old: oldData[key],
          new: null,
          removed: true
        };
      }
    });
    
    return changes;
  }

  /**
   * Retrieve logs with filtering options
   */
  static async getLogs({
    userId = null,
    entity = null,
    entityId = null,
    action = null,
    startDate = null,
    endDate = null,
    limit = 50,
    offset = 0,
    includeUser = true
  } = {}) {
    // Build query conditions
    const where = {};
    if (userId) where.userId = userId;
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId.toString();
    if (action) where.action = action;
    
    // Date range filtering
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }
    
    // Execute query
    const logs = await prisma.log.findMany({
      where,
      include: includeUser ? {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      } : undefined,
      orderBy: {
        timestamp: 'desc'
      },
      skip: offset,
      take: limit
    });
    
    // Get total count for pagination
    const total = await prisma.log.count({ where });
    
    return {
      logs,
      pagination: {
        offset,
        limit,
        total
      }
    };
  }
}

module.exports = EntityLogger;

// ============ src/middleware/loggerMiddleware.js ============

const EntityLogger = require('../utils/logger');

/**
 * Middleware factory to automatically log API actions
 */
const createLoggerMiddleware = (entity, action) => {
  return async (req, res, next) => {
    // Store the original send function
    const originalSend = res.send;
    
    // Override the send function to capture response
    res.send = function(body) {
      try {
        // Only log successful actions (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
          const entityId = req.params.id || (typeof body === 'object' ? body.id : null);
          
          // Log asynchronously (don't await to avoid delaying response)
          EntityLogger.createLog({
            userId: req.user.id,
            action,
            entity,
            entityId: entityId,
            description: `User ${req.user.email} performed ${action} on ${entity}${entityId ? ' #' + entityId : ''}`,
            metadata: {
              requestBody: req.body,
              requestMethod: req.method,
              requestPath: req.path,
              requestParams: req.params,
              requestQuery: req.query,
              responseStatus: res.statusCode,
              responseBody: typeof body === 'string' ? JSON.parse(body) : body
            }
          }).catch(err => console.error('Error in logger middleware:', err));
        }
      } catch (error) {
        console.error('Error in logger middleware:', error);
        // Continue with response even if logging fails
      }
      
      // Call the original send function
      return originalSend.call(this, body);
    };
    
    next();
  };
};

module.exports = createLoggerMiddleware;

// ============ Example usage in src/routes/comments.js ============

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const createLoggerMiddleware = require('../middleware/loggerMiddleware');
const EntityLogger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Create a new comment with automatic logging
router.post('/', 
  authenticate, 
  createLoggerMiddleware('comment', 'CREATE'),
  async (req, res) => {
    try {
      const { content } = req.body;
      
      if (!content || content.trim() === '') {
        return res.status(400).json({ message: 'Comment content is required' });
      }
      
      const comment = await prisma.comment.create({
        data: {
          content,
          userId: req.user.id
        }
      });
      
      res.status(201).json(comment);
    } catch (error) {
      console.error('Error creating comment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Update a comment with direct logging (alternative to middleware)
router.put('/:id', 
  authenticate, 
  async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      
      if (!content || content.trim() === '') {
        return res.status(400).json({ message: 'Comment content is required' });
      }
      
      // First fetch the existing comment
      const existingComment = await prisma.comment.findUnique({
        where: { id: parseInt(id) }
      });
      
      if (!existingComment) {
        return res.status(404).json({ message: 'Comment not found' });
      }
      
      // Check if the user is the author of the comment
      if (existingComment.userId !== req.user.id) {
        return res.status(403).json({ message: 'You can only update your own comments' });
      }
      
      // Update the comment
      const updatedComment = await prisma.comment.update({
        where: { id: parseInt(id) },
        data: { content }
      });
      
      // Manually log the update with the dedicated logger
      await EntityLogger.logUpdate(
        req.user.id,
        'comment',
        updatedComment.id,
        existingComment,
        updatedComment
      );
      
      res.json(updatedComment);
    } catch (error) {
      console.error('Error updating comment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Delete a comment with specific logging
router.delete('/:id', 
  authenticate, 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // First fetch the existing comment
      const existingComment = await prisma.comment.findUnique({
        where: { id: parseInt(id) }
      });
      
      if (!existingComment) {
        return res.status(404).json({ message: 'Comment not found' });
      }
      
      // Check if the user is the author of the comment
      if (existingComment.userId !== req.user.id) {
        return res.status(403).json({ message: 'You can only delete your own comments' });
      }
      
      // Delete the comment
      await prisma.comment.delete({
        where: { id: parseInt(id) }
      });
      
      // Log the deletion
      await EntityLogger.logDelete(
        req.user.id,
        'comment',
        parseInt(id),
        existingComment
      );
      
      res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ============ Example of using the generic logger for another entity ============

// For a hypothetical "Post" entity:
router.post('/api/posts', 
  authenticate,
  createLoggerMiddleware('post', 'CREATE'), 
  async (req, res) => {
    try {
      // Your post creation logic here
      const post = await prisma.post.create({
        data: {
          title: req.body.title,
          content: req.body.content,
          userId: req.user.id
        }
      });
      
      res.status(201).json(post);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ============ Log retrieval API ============

// Generic endpoint to retrieve logs with filtering
router.get('/api/logs', 
  authenticate,
  async (req, res) => {
    try {
      const {
        userId, 
        entity, 
        entityId, 
        action,
        startDate,
        endDate,
        limit = 50,
        offset = 0
      } = req.query;
      
      const results = await EntityLogger.getLogs({
        userId: userId ? parseInt(userId) : null,
        entity,
        entityId: entityId ? parseInt(entityId) : null,
        action,
        startDate,
        endDate,
        limit: parseInt(limit),
        offset: parseInt(offset),
        includeUser: true
      });
      
      res.json(results);
    } catch (error) {
      console.error('Error retrieving logs:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ============ Usage in generic CRUD controller ============

/**
 * Example of a generic CRUD service with built-in logging
 */
class CrudService {
  constructor(model, entityName) {
    this.model = model;
    this.entityName = entityName;
    this.prisma = new PrismaClient();
  }
  
  async create(data, userId) {
    const item = await this.prisma[this.model].create({ data });
    
    // Log the creation
    await EntityLogger.logCreate(
      userId,
      this.entityName,
      item.id,
      item
    );
    
    return item;
  }
  
  async update(id, data, userId) {
    // Get existing data for comparison
    const existing = await this.prisma[this.model].findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existing) {
      throw new Error(`${this.entityName} not found`);
    }
    
    // Update the item
    const updated = await this.prisma[this.model].update({
      where: { id: parseInt(id) },
      data
    });
    
    // Log the update
    await EntityLogger.logUpdate(
      userId,
      this.entityName,
      updated.id,
      existing,
      updated
    );
    
    return updated;
  }
  
  async delete(id, userId) {
    // Get existing data before deletion
    const existing = await this.prisma[this.model].findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!existing) {
      throw new Error(`${this.entityName} not found`);
    }
    
    // Delete the item
    await this.prisma[this.model].delete({
      where: { id: parseInt(id) }
    });
    
    // Log the deletion
    await EntityLogger.logDelete(
      userId,
      this.entityName,
      parseInt(id),
      existing
    );
    
    return { success: true };
  }
}

// Example usage of generic CRUD service:
// const commentService = new CrudService('comment', 'comment');
// const postService = new CrudService('post', 'post');