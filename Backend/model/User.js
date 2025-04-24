const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true }, // Added firstName
    lastName: { type: String, required: true }, // Added lastName
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true }, // Added unique constraint for email
    password: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['Student', 'Teacher', 'Admin'], // Added role with enum validation
      default: 'Student' // Optional: set a default role
    },
    college: { type: String, required: true }, // Added college
  },
  {
    timestamps: true,
  }
);

//Compile to form the model
module.exports = mongoose.model("User", userSchema);
