const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const baseOptions = {
  timestamps: true,
  discriminatorKey: 'role',
  collection: 'users',
};

const baseUserSchema = new Schema({
  username: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  role: { type: String, required: true, enum: ['Student', 'Teacher', 'Admin'], index: true },
}, baseOptions);

const User = mongoose.model("User", baseUserSchema);

const Student = User.discriminator('Student', new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  university: { type: String, required: true },
  department: { type: String, required: true },
}));

const Teacher = User.discriminator('Teacher', new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  university: { type: String, required: true },
  department: { type: String, required: true },
  designation: { type: String, required: true },
}));

const Admin = User.discriminator('Admin', new Schema({
  fullName: { type: String, required: false },
}));

module.exports = { User, Student, Teacher, Admin };
