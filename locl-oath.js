# Authentication Integration Guide

## Overview

This document outlines the steps to integrate both JWT (JSON Web Token) and OAuth authentication into your Node.js application.

## 1. JWT Authentication

### Step 1: Install Required Packages

You will need to install the following packages:

```bash
npm install jsonwebtoken bcryptjs
```

### Step 2: Create JWT Utility Functions

Create a new file `utils/jwt.js` to handle JWT operations.

```javascript```
const jwt = require("jsonwebtoken");

const secretKey = "your_secret_key"; // Use a strong secret key

// Generate a JWT token
function generateToken(user) {
  return jwt.sign({ id: user.id }, secretKey, { expiresIn: "1h" });
}

// Verify a JWT token
function verifyToken(token) {
  return jwt.verify(token, secretKey);
}

module.exports = { generateToken, verifyToken };
``````

### Step 3: Update AuthController

In your `controllers/AuthController.js`, add methods for user login and token generation.

```javascript```
const { generateToken } = require("../utils/jwt");
const bcrypt = require("bcryptjs");

// Login method
async function login(req, res) {
  const { email, password } = req.body;
  // Fetch user from database
  const user = await User.findOne({ email });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).send("Invalid credentials");
  }
  const token = generateToken(user);
  res.json({ token });
}
```

## 2. OAuth Authentication

### Step 1: Install Required Packages

You will need to install the following packages:

```bash
npm install passport passport-google-oauth20
```

### Step 2: Configure Passport for OAuth

Create a new file `config/passport.js` to configure Passport.
```
```javascript```
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: 'YOUR_GOOGLE_CLIENT_ID',
    clientSecret: 'YOUR_GOOGLE_CLIENT_SECRET',
    callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    // Find or create user in your database
    const user = await User.findOrCreate({ googleId: profile.id });
    done(null, user);
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    // Fetch user from database
    const user = await User.findById(id);
    done(null, user);
});
```

### Step 3: Set Up Routes for OAuth

In your `routes/AuthRoutes.js`, add routes for Google authentication.

```javascript``````
const express = require("express");
const passport = require("passport");
const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    // Successful authentication
    res.redirect("/dashboard");
  }
);

module.exports = router;
```

## Conclusion

This guide provides a basic implementation of JWT and OAuth authentication in your Node.js application. Make sure to adjust the code according to your project structure and requirements.
