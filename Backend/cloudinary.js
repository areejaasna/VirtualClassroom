const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config(); // Make sure you have a .env file with your credentials

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'YOUR_CLOUD_NAME', // Replace with your Cloud Name or use environment variable
  api_key: process.env.CLOUDINARY_API_KEY || 'YOUR_API_KEY',         // Replace with your API Key or use environment variable
  api_secret: process.env.CLOUDINARY_API_SECRET || 'YOUR_API_SECRET' // Replace with your API Secret or use environment variable
});

module.exports = cloudinary;
