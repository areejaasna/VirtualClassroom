const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: { 
      type: String, 
      required: true 
    },
    firstName: { 
      type: String, 
      required: true 
    }, 
    lastName: { 
      type: String, 
      required: true 
    }, 
    email: { 
      type: String, 
      required: true, 
      unique: true 
    },
    phone: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true,
      enum: ['Student', 'Teacher', 'Admin'], // Role validation
    },
    password: { 
      type: String, 
      required: true 
    },
    college: { 
      type: String, 
      required: true 
    }, 
  },
  {
    timestamps: true,
  }
);

// Compile to form the model
module.exports = mongoose.model("User", userSchema);
