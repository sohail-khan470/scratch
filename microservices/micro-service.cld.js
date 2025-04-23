/**
 * COMPREHENSIVE MICROSERVICES DEMO
 * 
 * This file demonstrates a simplified microservices architecture using Node.js, Express, and MongoDB.
 * It includes three services (User, Product, and Order) and simulates communication between them.
 * 
 * NOTE: In a real microservices architecture, each service would be in its own codebase/repository,
 * with its own package.json, dependencies, and deployment pipeline. This single-file approach
 * is for educational purposes only.
 * 
 * To run this demo:
 * 1. Make sure MongoDB is running locally
 * 2. Install dependencies: npm install express mongoose body-parser cors axios amqplib
 * 3. Run with Node.js: node microservices-demo.js
 */

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const http = require('http');

// ====================================
// CONFIGURATION & SETUP
// ====================================

// Ports for our services
const USER_SERVICE_PORT = 3001;
const PRODUCT_SERVICE_PORT = 3002;
const ORDER_SERVICE_PORT = 3003;
const API_GATEWAY_PORT = 3000;

// MongoDB connection strings (would be environment variables in production)
const USER_DB_URI = 'mongodb://localhost:27017/user-service-db';
const PRODUCT_DB_URI = 'mongodb://localhost:27017/product-service-db';
const ORDER_DB_URI = 'mongodb://localhost:27017/order-service-db';

// Create Express applications for each service
const userServiceApp = express();
const productServiceApp = express();
const orderServiceApp = express();
const apiGatewayApp = express();

// Apply middleware to all services
[userServiceApp, productServiceApp, orderServiceApp, apiGatewayApp].forEach(app => {
  app.use(cors());
  app.use(bodyParser.json());
});

// ====================================
// USER SERVICE
// ====================================

/**
 * User Schema & Model
 * Represents the data structure for users in the system
 */
const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Create User model using a separate Mongoose connection for the User service
const userConnection = mongoose.createConnection(USER_DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const User = userConnection.model('User', userSchema);

/**
 * User Service Routes
 */
// Health check endpoint (important for microservices monitoring)
userServiceApp.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'user-service' });
});

// Register a new user
userServiceApp.post('/api/users/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // In a real app, you would hash the password here
    // For simplicity, we're storing it as plain text
    const user = new User({
      username,
      email,
      password // In production: hashed password
    });
    
    await user.save();
    
    res.status(201).json({
      message: 'User registered successfully',
      userId: user._id
    });
  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login user
userServiceApp.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // In a real app, you would compare hashed passwords
    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // In a real app, you would generate a JWT token here
    
    res.status(200).json({
      message: 'Login successful',
      // token: "jwt_would_go_here",
      userId: user._id
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user by ID
userServiceApp.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all users (for admin purposes)
userServiceApp.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ====================================
// PRODUCT SERVICE
// ====================================

/**
 * Product Schema & Model
 * Represents the data structure for products in the system
 */
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true
  },
  inStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create Product model using a separate Mongoose connection for the Product service
const productConnection = mongoose.createConnection(PRODUCT_DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const Product = productConnection.model('Product', productSchema);

/**
 * Product Service Routes
 */
// Health check endpoint
productServiceApp.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'product-service' });
});

// Create a new product
productServiceApp.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    
    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all products
productServiceApp.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get product by ID
productServiceApp.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update product
productServiceApp.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update product inventory
productServiceApp.patch('/api/products/:id/inventory', async (req, res) => {
  try {
    const { adjustment } = req.body;
    
    // Get current product
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Ensure we don't go below zero inventory
    const newInventory = Math.max(0, product.inStock + adjustment);
    
    // Update the inventory
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { inStock: newInventory },
      { new: true }
    );
    
    res.status(200).json({
      message: 'Inventory updated successfully',
      previousStock: product.inStock,
      currentStock: updatedProduct.inStock,
      adjustment
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete product
productServiceApp.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json({
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ====================================
// ORDER SERVICE
// ====================================

/**
 * Order Schema & Model
 * Represents the data structure for orders in the system
 */
const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  products: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    name: String,
    price: Number,
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  shippingAddress: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create Order model using a separate Mongoose connection for the Order service
const orderConnection = mongoose.createConnection(ORDER_DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const Order = orderConnection.model('Order', orderSchema);

/**
 * Order Service Helper Functions for Service-to-Service Communication
 * 
 * In a real microservices architecture, these would be in separate files
 * and would include circuit breakers, retries, and other resilience patterns
 */

// Get user information from User Service
async function getUserDetails(userId) {
  try {
    const response = await axios.get(`http://localhost:${USER_SERVICE_PORT}/api/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error.message);
    // Return minimal fallback data
    return { _id: userId, username: 'Unknown User' };
  }
}

// Get product information from Product Service
async function getProductDetails(productId) {
  try {
    const response = await axios.get(`http://localhost:${PRODUCT_SERVICE_PORT}/api/products/${productId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching product ${productId}:`, error.message);
    // Return minimal fallback data
    return { _id: productId, name: 'Unknown Product', price: 0 };
  }
}

// Update product inventory in Product Service
async function updateProductInventory(productId, adjustment) {
  try {
    const response = await axios.patch(
      `http://localhost:${PRODUCT_SERVICE_PORT}/api/products/${productId}/inventory`,
      { adjustment }
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating inventory for product ${productId}:`, error.message);
    return null;
  }
}

/**
 * Order Service Routes
 */
// Health check endpoint
orderServiceApp.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'order-service' });
});

// Create a new order
orderServiceApp.post('/api/orders', async (req, res) => {
  try {
    const { userId, products, shippingAddress } = req.body;
    
    // Validate user exists
    try {
      await getUserDetails(userId);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Get product details and calculate total
    let orderProducts = [];
    let totalAmount = 0;
    
    for (const item of products) {
      // Get product details
      const product = await getProductDetails(item.productId);
      
      if (!product) {
        return res.status(400).json({ 
          message: `Product ${item.productId} not found` 
        });
      }
      
      // Check if enough inventory is available
      if (product.inStock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient inventory for product ${product.name}. Available: ${product.inStock}, Requested: ${item.quantity}`
        });
      }
      
      // Add to order products
      orderProducts.push({
        productId: item.productId,
        name: product.name,
        price: product.price,
        quantity: item.quantity
      });
      
      // Add to total
      totalAmount += product.price * item.quantity;
    }
    
    // Create order
    const order = new Order({
      userId,
      products: orderProducts,
      totalAmount,
      shippingAddress,
      status: 'pending'
    });
    
    await order.save();
    
    // Update inventory for each product
    // In a real system, this would be done through an event/message queue
    // to ensure consistency even if this service fails
    for (const item of products) {
      await updateProductInventory(item.productId, -item.quantity);
    }
    
    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get order by ID
orderServiceApp.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.status(200).json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all orders for a user
orderServiceApp.get('/api/users/:userId/orders', async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update order status
orderServiceApp.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate status
    if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // If order is cancelled, return items to inventory
    if (status === 'cancelled') {
      for (const item of order.products) {
        await updateProductInventory(item.productId, item.quantity);
      }
    }
    
    res.status(200).json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ====================================
// API GATEWAY
// ====================================

/**
 * API Gateway
 * 
 * Acts as a single entry point for clients to interact with multiple microservices.
 * In a production environment, you would use a proper API Gateway like Kong, Amazon API Gateway, or NGINX.
 * This is a simplified implementation for demonstration purposes.
 */

// Route traffic to the appropriate service based on the path
apiGatewayApp.use('/api/users', async (req, res) => {
  try {
    // Forward the request to the User Service
    const response = await axios({
      method: req.method,
      url: `http://localhost:${USER_SERVICE_PORT}${req.originalUrl}`,
      data: req.body,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      // Forward error response from the service
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('API Gateway error (user service):', error);
      res.status(500).json({ 
        message: 'Service unavailable',
        error: 'Could not connect to User Service'
      });
    }
  }
});

apiGatewayApp.use('/api/products', async (req, res) => {
  try {
    // Forward the request to the Product Service
    const response = await axios({
      method: req.method,
      url: `http://localhost:${PRODUCT_SERVICE_PORT}${req.originalUrl}`,
      data: req.body,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      // Forward error response from the service
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('API Gateway error (product service):', error);
      res.status(500).json({ 
        message: 'Service unavailable',
        error: 'Could not connect to Product Service'
      });
    }
  }
});

apiGatewayApp.use('/api/orders', async (req, res) => {
  try {
    // Forward the request to the Order Service
    const response = await axios({
      method: req.method,
      url: `http://localhost:${ORDER_SERVICE_PORT}${req.originalUrl}`,
      data: req.body,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      // Forward error response from the service
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('API Gateway error (order service):', error);
      res.status(500).json({ 
        message: 'Service unavailable',
        error: 'Could not connect to Order Service'
      });
    }
  }
});

// ====================================
// START ALL SERVICES
// ====================================

/**
 * Start all services
 * 
 * In a real microservices architecture, each service would be started independently,
 * possibly in different containers/servers. This combined startup is for demonstration purposes.
 */
function startMicroservices() {
  // Start User Service
  const userServiceServer = http.createServer(userServiceApp);
  userServiceServer.listen(USER_SERVICE_PORT, () => {
    console.log(`User Service running on http://localhost:${USER_SERVICE_PORT}`);
  });

  // Start Product Service
  const productServiceServer = http.createServer(productServiceApp);
  productServiceServer.listen(PRODUCT_SERVICE_PORT, () => {
    console.log(`Product Service running on http://localhost:${PRODUCT_SERVICE_PORT}`);
  });

  // Start Order Service
  const orderServiceServer = http.createServer(orderServiceApp);
  orderServiceServer.listen(ORDER_SERVICE_PORT, () => {
    console.log(`Order Service running on http://localhost:${ORDER_SERVICE_PORT}`);
  });

  // Start API Gateway
  const apiGatewayServer = http.createServer(apiGatewayApp);
  apiGatewayServer.listen(API_GATEWAY_PORT, () => {
    console.log(`API Gateway running on http://localhost:${API_GATEWAY_PORT}`);
    console.log('All microservices are up and running!');
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down all services...');
    userServiceServer.close();
    productServiceServer.close();
    orderServiceServer.close();
    apiGatewayServer.close();
    
    // Close MongoDB connections
    userConnection.close();
    productConnection.close();
    orderConnection.close();
    
    console.log('All services shut down successfully');
    process.exit(0);
  });
}

// Start all microservices
startMicroservices();

/**
 * EXAMPLE USAGE (with curl or Postman):
 * 
 * 1. Create a user:
 * POST http://localhost:3000/api/users/register
 * {
 *   "username": "testuser",
 *   "email": "test@example.com",
 *   "password": "password123"
 * }
 * 
 * 2. Create a product:
 * POST http://localhost:3000/api/products
 * {
 *   "name": "Smartphone",
 *   "description": "Latest model smartphone",
 *   "price": 999.99,
 *   "category": "Electronics",
 *   "inStock": 100
 * }
 * 
 * 3. Create an order:
 * POST http://localhost:3000/api/orders
 * {
 *   "userId": "user_id_from_step_1",
 *   "products": [
 *     {
 *       "productId": "product_id_from_step_2",
 *       "quantity": 1
 *     }
 *   ],
 *   "shippingAddress": "123 Main St, Anytown, USA"
 * }
 */