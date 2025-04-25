const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
// Import the destructured models from User.js
const { User, Student, Teacher, Admin } = require("../model/User");
require('dotenv').config();

// Helper function for validation
const validateFields = (fields) => {
  for (const key in fields) {
    // Check for undefined, null, or empty string
    if (fields[key] === undefined || fields[key] === null || fields[key] === '') {
      throw new Error(`Field '${key}' is required.`);
    }
  }
};

const userCtrl = {
  //!Register
  register: asyncHandler(async (req, res) => {
    const {
      username,
      email,
      password,
      role,
      phoneNumber,
      // Student/Teacher specific
      firstName,
      lastName,
      university,
      department,
      // Teacher specific
      designation,
      // Admin specific
      fullName,
    } = req.body;

    console.log("Registration Request Body:", req.body);

    //! Basic Validations (Common fields)
    validateFields({ username, email, password, role, phoneNumber });

    //! check if user already exists (by email or username)
    // Use the base User model for checking existence across all roles
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        res.status(409); // Conflict
        throw new Error(
            existingUser.email === email
            ? "Email already exists"
            : "Username already exists"
        );
    }

    //! Hash the user password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //! Prepare data and create user based on role
    let userCreated;
    const commonData = {
      username,
      email,
      password: hashedPassword,
      phoneNumber,
      role, // Ensure role is passed for discriminator key
    };

    try {
      switch (role) {
        case 'Student':
          validateFields({ firstName, lastName, university, department });
          userCreated = await Student.create({
            ...commonData,
            firstName,
            lastName,
            university,
            department,
          });
          break;
        case 'Teacher':
          validateFields({
            firstName,
            lastName,
            university,
            department,
            designation,
          });
          userCreated = await Teacher.create({
            ...commonData,
            firstName,
            lastName,
            university,
            department,
            designation,
          });
          break;
        case 'Admin':
          validateFields({ fullName });
          userCreated = await Admin.create({
            ...commonData,
            fullName,
          });
          break;
        default:
          res.status(400); // Bad Request
          throw new Error("Invalid role specified");
      }
    } catch (error) {
        // Catch validation errors from Mongoose or our helper
        // Ensure a 400 status code for client-side errors
        if (!res.statusCode || res.statusCode < 400 || res.statusCode >= 500) {
             res.status(400);
        }
        throw new Error(error.message || "Failed to create user due to invalid input.");
    }

    //! Construct response (excluding sensitive info)
    const responseData = userCreated.toObject(); 
    delete responseData.password; 
    delete responseData.__v; 
    // We keep _id which is the user's ID

    //!Send the response
    console.log("User Created:", responseData);
    res.status(201).json(responseData); // 201 Created status
  }),

  //!Login
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    //! Basic Validations
    validateFields({ email, password });

    //!Check if user email exists using the base User model
    // Populate necessary fields based on role if needed, but not strictly necessary for login
    const user = await User.findOne({ email }); 
    console.log("Login attempt for user:", user?.email);
    if (!user) {
        res.status(401); // Unauthorized
        throw new Error("Invalid credentials");
    }

    //!Check if user password is valid
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        res.status(401); // Unauthorized
        throw new Error("Invalid credentials");
    }

    //! Generate the token (include id and role)
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "30d", // Token expiration time
    });

    //!Send the response
    res.json({
      message: "Login success",
      token,
      id: user._id,
      email: user.email,
      username: user.username,
      role: user.role, // Crucial to include role for frontend logic
    });
  }),

  //!Profile
  profile: asyncHandler(async (req, res) => {
    // req.user should contain the user's ID extracted by the isAuth middleware
    if (!req.user) {
        res.status(401); // Unauthorized
        throw new Error("Not authorized, token failed or user ID not found in token");
    }
    
    // Find the user using the base User model. Mongoose handles returning
    // the correct document with all discriminator fields automatically.
    // Exclude the password field from the result.
    const user = await User.findById(req.user).select("-password"); 

    if (!user) {
        res.status(404); // Not Found
        throw new Error("User not found");
    }

    // Send the complete user profile based on their role
    res.json({ user }); 
  }),

  updateProfile: asyncHandler(async (req, res) => {
    try {
      if (!req.user) {
        res.status(401);
        throw new Error("Not authorized, token failed or user ID not found in token");
      }
  
      const userId = req.user; // From JWT via middleware
      const {
        email, username, password,
        firstName, lastName, phoneNumber, collegeOrUniversity,
        department, designation, fullName,
      } = req.body;
  
      const user = await User.findById(userId);
      if (!user) {
        res.status(404);
        throw new Error("User not found");
      }
  
      // ✅ Optional: Update password if provided
      if (password && password.trim() !== "") {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }
  
      // ✅ Only allow updates based on user role
      if (user.role === "Student" || user.role === "Teacher") {
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phoneNumber) user.phone = phoneNumber;
        if (collegeOrUniversity) user.college = collegeOrUniversity;
      }
  
      if (user.role === "Teacher") {
        if (department) user.department = department;
        if (designation) user.designation = designation;
      }
  
      if (user.role === "Admin") {
        if (fullName) user.fullName = fullName;
        if (phoneNumber) user.phone = phoneNumber;
      }
  
      // ✅ Optional shared fields
      if (username) user.username = username;
      if (email) user.email = email;
  
      await user.save();
  
      const updatedUser = await User.findById(userId).select("-password");
  
      res.status(200).json({
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Update profile error:", error.message);
      res.status(500).json({ message: "Server error" });
    }
  }),  
};
module.exports = userCtrl;
