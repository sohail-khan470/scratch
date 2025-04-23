// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

// Initialize Express apps for User Service and Product Service
const userApp = express();
const productApp = express();

// Middleware to parse JSON requests
userApp.use(express.json());
productApp.use(express.json());

// Connect to MongoDB databases
mongoose.connect('mongodb://localhost:27017/user-service', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to User Service DB'))
    .catch(err => console.error('User Service DB connection error:', err));

mongoose.connect('mongodb://localhost:27017/product-service', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to Product Service DB'))
    .catch(err => console.error('Product Service DB connection error:', err));

// Define User Schema and Model
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
});
const User = mongoose.model('User', userSchema);

// Define Product Schema and Model
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    userId: { type: String, required: true }, // Reference to the user who created the product
});
const Product = mongoose.model('Product', productSchema);

// User Service Routes
userApp.post('/api/users', async (req, res) => {
    // Create a new user
    const { name, email } = req.body;
    const user = new User({ name, email });
    await user.save();
    res.status(201).json(user);
});

userApp.get('/api/users/:id', async (req, res) => {
    // Fetch a user by ID
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
});

// Product Service Routes
productApp.post('/api/products', async (req, res) => {
    // Create a new product
    const { name, price, userId } = req.body;
    const product = new Product({ name, price, userId });
    await product.save();
    res.status(201).json(product);
});

productApp.get('/api/products/:id', async (req, res) => {
    // Fetch a product by ID and include user details
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Fetch user details from User Service
    try {
        const userResponse = await axios.get(`http://localhost:3001/api/users/${product.userId}`);
        const user = userResponse.data;
        res.json({ product, user });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user details', error: error.message });
    }
});

// Start User Service on port 3001
userApp.listen(3001, () => {
    console.log('User Service running on port 3001');
});

// Start Product Service on port 3002
productApp.listen(3002, () => {
    console.log('Product Service running on port 3002');
});