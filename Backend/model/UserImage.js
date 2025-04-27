const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userImageSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    imageUrl: {
        type: String, // URL from Cloudinary
        required: true
    },
    publicId: {
        type: String, // Public ID from Cloudinary (for managing the image)
        required: true,
        unique: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const UserImage = mongoose.model("UserImage", userImageSchema);

module.exports = UserImage;
