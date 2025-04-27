const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const streamifier = require('streamifier'); // To convert buffer to stream
const cloudinary = require("../cloudinary"); // Import Cloudinary config
const UserImage = require("../model/UserImage"); // Import the new UserImage model

// Import the destructured models from User.js
const { User, Student, Teacher, Admin } = require("../model/User");

// Helper function for validation
const validateFields = (fields) => {
  for (const key in fields) {
    if (fields[key] === undefined || fields[key] === null || fields[key] === '') {
      throw new Error(`Field '${key}' is required.`);
    }
  }
};

// Helper function for Cloudinary upload
const uploadToCloudinary = (buffer, folder, userId) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder, // e.g., 'user_profiles'
        public_id: `user_${userId}_${Date.now()}`,
        resource_type: "image"
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          return reject(new Error('Image upload failed.'));
        }
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
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
      firstName,
      lastName,
      university,
      department,
      designation,
      fullName,
    } = req.body;

    console.log("Registration Request Body:", req.body);
    console.log("File received:", req.file ? req.file.originalname : 'No file uploaded');

    //! Basic Validations
    validateFields({ username, email, password, role, phoneNumber });

    //! Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      res.status(409); // Conflict
      throw new Error(
        existingUser.email === email
          ? "Email already exists"
          : "Username already exists"
      );
    }

    //! Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //! Prepare common data
    const commonData = {
      username,
      email,
      password: hashedPassword,
      phoneNumber,
      role,
    };

    let userCreated;
    let cloudinaryResult = null;

    // Start user creation (will need user._id for Cloudinary and UserImage)
    try {
      switch (role) {
        case 'Student':
          validateFields({ firstName, lastName, university, department });
          userCreated = new Student({
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
          userCreated = new Teacher({
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
          userCreated = new Admin({
            ...commonData,
            fullName,
          });
          break;
        default:
          res.status(400); // Bad Request
          throw new Error("Invalid role specified");
      }

      // --- Image Upload Logic --- 
      if (req.file) {
          console.log("Uploading image to Cloudinary...");
          try {
              // Use a temporary ID or username if needed for folder structure before user is saved
              // Or upload after saving user initially
              // Here, we upload first, assuming it's okay if it fails before user save
              cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'user_profile_images', userCreated._id); // Pass user ID
              console.log("Cloudinary Upload Success:", cloudinaryResult.public_id);
          } catch (uploadError) {
              console.error("Cloudinary upload failed before saving user:", uploadError);
              // Decide how to handle: proceed without image, or fail registration?
              // For now, let's fail the registration if image upload fails
              res.status(500);
              throw new Error("Failed to upload profile image.");
          }
      }
      
      // Save the user document
      await userCreated.save();
      console.log("User document saved:", userCreated._id);

      // --- Save Image Reference AFTER User Saved --- 
      if (userCreated && cloudinaryResult) {
          console.log(`Saving image reference for user ${userCreated._id}`);
          const newUserImage = new UserImage({
              user: userCreated._id,
              imageUrl: cloudinaryResult.secure_url,
              publicId: cloudinaryResult.public_id,
          });
          await newUserImage.save();
          console.log("UserImage document saved:", newUserImage._id);
      }

    } catch (error) {
        console.error("Error during registration process:", error);

        // Attempt cleanup: If user doc exists but image ref failed, or if image upload succeeded but user save failed
        if (cloudinaryResult && (!userCreated || !(await User.findById(userCreated._id)))) {
            console.warn(`User save failed after image upload. Deleting image: ${cloudinaryResult.public_id}`);
            try {
                await cloudinary.uploader.destroy(cloudinaryResult.public_id);
                console.log(`Cloudinary image ${cloudinaryResult.public_id} deleted.`);
            } catch (deleteError) {
                console.error(`Failed to delete Cloudinary image ${cloudinaryResult.public_id}:`, deleteError);
                // Log this error, but don't overwrite the original error response
            }
        }
        
        // Handle Mongoose validation errors or other specific errors
        if (error.name === 'ValidationError') {
            res.status(400);
        } else if (!res.statusCode || res.statusCode < 400) {
            // Ensure a server error status if not already set
            res.status(500);
        }
        // Rethrow the original error message or a generic one
        throw new Error(error.message || "Registration failed due to an unexpected error.");
    }

    //! Construct response
    const responseData = userCreated.toObject();
    delete responseData.password;
    delete responseData.__v;
    if (cloudinaryResult) {
      responseData.profileImageUrl = cloudinaryResult.secure_url; // Add image URL to response
    }

    //!Send the response
    console.log("User Registration Successful:", responseData);
    res.status(201).json(responseData);
  }),

  //!Login
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    //! Basic Validations
    validateFields({ email, password });

    //!Check if user email exists
    const user = await User.findOne({ email }); 
    console.log("Login attempt for user:", user?.email);
    if (!user) {
        res.status(401); throw new Error("Invalid credentials");
    }

    //!Check if user password is valid
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        res.status(401); throw new Error("Invalid credentials");
    }

    // Fetch profile image URL if it exists
    const userImage = await UserImage.findOne({ user: user._id });

    //! Generate the token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "30d", 
    });

    //!Send the response
    res.json({
      message: "Login success",
      token,
      id: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
      profileImageUrl: userImage ? userImage.imageUrl : null // Include image URL in login response
    });
  }),

  //!Profile
  profile: asyncHandler(async (req, res) => {
    if (!req.user) {
        res.status(401); throw new Error("Not authorized, token failed or user ID not found in token");
    }
    
    // Find user and populate profile image
    const user = await User.findById(req.user).select("-password"); 
    const userImage = await UserImage.findOne({ user: req.user });

    if (!user) {
        res.status(404); throw new Error("User not found");
    }

    // Combine user data with image URL
    const userProfile = user.toObject(); // Convert to plain object to add properties
    userProfile.profileImageUrl = userImage ? userImage.imageUrl : null;

    res.json({ user: userProfile }); 
  }),

  // ...(updateProfile remains the same for now, can add image update later)
  updateProfile: asyncHandler(async (req, res) => {
    // TODO: Add image upload logic here similar to register if needed
    try {
      if (!req.user) {
        res.status(401);
        throw new Error("Not authorized, token failed or user ID not found in token");
      }
  
      const userId = req.user; 
      const {
        email, username, password,
        firstName, lastName, phoneNumber, university,
        department, designation, fullName,
      } = req.body;
  
      const user = await User.findById(userId);
      if (!user) {
        res.status(404);
        throw new Error("User not found");
      }
  
      if (password && password.trim() !== "") {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }
  
      if (user.role === "Student" || user.role === "Teacher") {
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (university) user.university = university;
      }
  
      if (user.role === "Teacher") {
        if (department) user.department = department;
        if (designation) user.designation = designation;
      }
  
      if (user.role === "Admin") {
        if (fullName) user.fullName = fullName;
        if (phoneNumber) user.phoneNumber = phoneNumber;
      }
  
      if (username) user.username = username;
      if (email) user.email = email;
  
      await user.save();
  
      // Fetch updated user data along with image url
      const updatedUser = await User.findById(userId).select("-password");
      const userImage = await UserImage.findOne({ user: userId });
      const userProfile = updatedUser.toObject();
      userProfile.profileImageUrl = userImage ? userImage.imageUrl : null;

      res.status(200).json({
        message: "Profile updated successfully",
        user: userProfile, // Send updated profile with image URL
      });
    } catch (error) {
      console.error("Update profile error:", error.message);
      // Check for specific errors like duplicate key if username/email changed
      if (error.code === 11000) { // MongoDB duplicate key error
          res.status(409).json({ message: "Email or username already exists." });
      } else {
          res.status(500).json({ message: error.message || "Server error during profile update" });
      }
    }
  }),

};
module.exports = userCtrl;
