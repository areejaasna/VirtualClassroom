const express = require("express");
const multer = require("multer");
const userCtrl = require("../controller/user");
const isAuthenticated = require("../middlewares/isAuth");

// Configure Multer for memory storage (to get buffer for Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

// Register User with Image Upload
// The 'profileImage' field name must match the name attribute in your form input
router.post('/register', upload.single('profileImage'), userCtrl.register);

// Login User
router.post('/login', userCtrl.login);

// Get Profile (Protected)
router.get('/profile', isAuthenticated, userCtrl.profile);

// Update Profile (Protected)
// If you want image update here too, add: upload.single('profileImage')
router.put('/profile', isAuthenticated, /* upload.single('profileImage'), */ userCtrl.updateProfile);

module.exports = router;
