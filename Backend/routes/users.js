const express = require("express");
const userCtrl = require("../controller/user");
const isAuthenticated = require("../middlewares/isAuth");

const router = express.Router();

//!Register
router.post("/register", userCtrl.register);
router.post("/login", userCtrl.login);
router.get("/profile", isAuthenticated, userCtrl.profile);

module.exports = router;
