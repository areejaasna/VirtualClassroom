const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../model/User");
require('dotenv').config();

const userCtrl = {
  //!Register
  register: asyncHandler(async (req, res) => {
    const { username, firstName, lastName, email, phone, role, password, college } = req.body;
    console.log({ username, firstName, lastName, email, phone, role, password, college });
    //!Validations
    if (!username || !firstName || !lastName || !email || !phone || !role || !password || !college) {
      res.status(400);
      throw new Error("Please all fields are required");
    }
    //! check if user already exists
    const userExits = await User.findOne({ email });
    if (userExits) {
      res.status(400);
      throw new Error("User already exists");
    }
    //! Hash the user password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    //!Create the user
    const userCreated = await User.create({
      username,
      firstName,
      lastName,
      email,
      phone,
      role,
      password: hashedPassword,
      college,
    });
    //!Send the response
    console.log("userCreated", userCreated);
    res.status(201).json({
      username: userCreated.username,
      firstName: userCreated.firstName,
      lastName: userCreated.lastName,
      email: userCreated.email,
      phone: userCreated.phone,
      role: userCreated.role,
      college: userCreated.college,
      id: userCreated._id,
    });
  }),
  //!Login
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    //!Check if user email exists
    const user = await User.findOne({ email });
    console.log("user backend", user);
    if (!user) {
      res.status(401);
      throw new Error("Invalid credentials - User not found");
    }
    //!Check if user password is valid
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401);
      throw new Error("Invalid credentials - Password mismatch");
    }
    //! Generate the token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    //!Send the response
    res.json({
      message: "Login success",
      token,
      id: user._id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      college: user.college
    });
  }),
  //!Profile
  profile: asyncHandler(async (req, res) => {
    //Find the user
    const user = await User.findById(req.user).select("-password");
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    res.json({ user });
  }),
};
module.exports = userCtrl;
