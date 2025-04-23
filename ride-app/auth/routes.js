const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const userController = require('../controllers/user.controller');

const router = Router();

// Auth routes
router.post('/auth/email', authController.emailLogin);
router.post('/auth/phone/initiate', authController.initiatePhoneLogin);
router.post('/auth/phone/verify', authController.verifyPhoneLogin);
router.post('/auth/google', authController.googleAuth);
router.post('/auth/signup', authController.signUp);
router.get('/auth/validate', authController.validateSession);

// User routes
router.get('/users/:id', userController.getUser);

module.exports = router;