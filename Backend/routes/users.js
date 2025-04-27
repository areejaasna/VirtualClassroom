const express = require("express");
const userCtrl = require("../controller/user");
const isAuthenticated = require("../middlewares/isAuth");
//const { storage } = require("../cloudinary");
//const multer = require("multer");

//const upload = multer({ storage });
const router = express.Router();

// Register User with Image Upload
router.post('/register', userCtrl.register);

// Login User
router.post('/login', userCtrl.login);

// Get Profile (Protected)
router.get('/profile', isAuthenticated, userCtrl.profile);

// Update Profile (Protected)
router.put('/profile', isAuthenticated, userCtrl.updateProfile);

module.exports = router;
