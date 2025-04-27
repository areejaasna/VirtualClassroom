const express = require("express");
const multer = require("multer"); // Import multer
const path = require("path"); // Needed for potential storage configuration
const { conferenceCtrl } = require("../controller/conferenceController.js");
const isAuthenticated = require("../middlewares/isAuth.js");

// --- Multer Configuration (Example: Saving to disk) ---
// Define storage location and filename strategy
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // IMPORTANT: Create this directory beforehand or ensure it exists!
        cb(null, 'uploads/'); // Save files to an 'uploads' directory in the backend root
    },
    filename: function (req, file, cb) {
        // Create a unique filename to avoid collisions
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Configure multer instance
const upload = multer({ 
    storage: storage,
    // Add file filter if needed (e.g., only allow PDFs)
    fileFilter: function (req, file, cb) {
        // Example: Accept only PDFs
        // if (path.extname(file.originalname).toLowerCase() !== '.pdf') {
        //     return cb(new Error('Only PDF files are allowed!'), false);
        // }
        cb(null, true); // Accept the file
    },
    // Add size limits if needed
    // limits: { fileSize: 1024 * 1024 * 5 } // Example: 5MB limit
}); 
// Note: For production, consider cloud storage (S3, Google Cloud Storage) instead of local disk.

// --- Router Setup ---
const router = express.Router();

// Apply authentication middleware to all conference routes
router.use(isAuthenticated);

// --- Basic Room Management ---
router.post("/create", conferenceCtrl.createRoom);        // Create a new room
router.get("/rooms", conferenceCtrl.getRooms);             // Get list of active/waiting rooms
router.get("/rooms/:roomId", conferenceCtrl.getRoomById);  // Get details of a specific room
router.post("/join/:roomId", conferenceCtrl.joinRoom);       // Join a specific room
router.patch("/status/:roomId", conferenceCtrl.updateRoomStatus); // Update room status (e.g., end room - host only)

// --- Chat Routes ---
// Chat messages are primarily handled via Socket.IO ('send-message', 'new-message')
router.get("/chat/:roomId", conferenceCtrl.getChatMessages); // Get existing chat messages for a room
router.post("/chat/:roomId", conferenceCtrl.sendChatMessageREST);

// --- Submission Routes ---
// POST uses multer middleware (`upload.single('submissionFile')`) to handle the file upload.
// 'submissionFile' must match the name attribute of the file input field in the frontend form.
router.post("/submit/:roomId", upload.single('submissionFile'), conferenceCtrl.handleSubmission);
router.get("/submissions/:roomId", conferenceCtrl.getSubmissions); // Get list of submissions for a room
// Optional: Add a route for downloading files if using local/cloud storage directly
// router.get("/submissions/download/:roomId/:submissionId", conferenceCtrl.downloadSubmission);

// --- Emotion Detection Routes ---
// Primarily handled via Socket.IO ('record-emotion', 'new-emotion-event') but providing REST endpoint too
router.post("/emotion/:roomId", conferenceCtrl.recordEmotionEventREST); // Record an emotion event via REST
router.get("/emotion/:roomId", conferenceCtrl.getEmotionData); // Get emotion data (all or filtered by query param ?userId=...)

module.exports = router;
