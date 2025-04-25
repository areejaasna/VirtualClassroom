const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Base User Schema Options
const baseOptions = {
  timestamps: true,
  discriminatorKey: 'role', // Important for discriminators
  collection: 'users', // Explicitly set the collection name
};

// Base User Schema Definition
const baseUserSchema = new Schema({
  username: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true }, // Common field
  role: { type: String, required: true, enum: ['Student', 'Teacher', 'Admin'], index: true },
}, baseOptions);

// Base User Model
const User = mongoose.model("User", baseUserSchema);

// --- Discriminator Schemas ---

// Student Schema
const Student = User.discriminator('Student', new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  university: { type: String, required: true },
  department: { type: String, required: true },
}));

// Teacher Schema
const Teacher = User.discriminator('Teacher', new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  university: { type: String, required: true },
  department: { type: String, required: true },
  designation: { type: String, required: true },
}));

// Admin Schema
const Admin = User.discriminator('Admin', new Schema({
  fullName: { type: String, required: true },
}));

// Export the base model and discriminators (optional, but can be useful)
module.exports = {
  User,
  Student,
  Teacher,
  Admin,
};
