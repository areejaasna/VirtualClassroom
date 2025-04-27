const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// --- Sub-Schema for Chat Messages ---
const ChatMessageSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model (works with discriminators)
    required: true
  },
  username: { // Store username for easier display, denormalization
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: true }); // Ensure each message gets an ID

// --- Sub-Schema for File Submissions ---
const SubmissionSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: { // Store username for easier identification
      type: String,
      required: true
  },
  originalFileName: { // The name of the file uploaded by the user
    type: String,
    required: true
  },
  storagePath: { // Path or identifier for where the file is stored (e.g., S3 key, local path)
    type: String,
    required: true
  },
  description: { // Optional description for the submission
    type: String,
    trim: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// --- Sub-Schema for Emotion Events ---
// Storing individual events. Aggregation might be done in controllers or specific routes if needed.
const EmotionEventSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: { // Store username for easier context
        type: String,
        required: true
    },
    emotion: { // The detected emotion (e.g., 'happy', 'sad', 'neutral', 'surprised')
        type: String,
        required: true
    },
    confidence: { // Optional: confidence score from the ML model
        type: Number
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { _id: true });


// --- Main Conference Room Schema ---
const ConferenceRoomSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    host: { // The user who created/hosts the room (likely a Teacher or Admin)
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [ // List of users currently or allowed in the room
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // --- New Fields ---
    chatMessages: [ChatMessageSchema], // Embed chat messages
    submissions: [SubmissionSchema],     // Embed submissions
    emotionData: [EmotionEventSchema],    // Embed emotion detection events
    // --- Timestamps ---
    // createdAt is implicitly added by timestamps: true
    // You might want specific start/end times for the room session itself
    // startTime: { type: Date },
    // endTime: { type: Date },
    status: { // Status of the room (e.g., waiting, active, ended)
      type: String,
      enum: ['Waiting', 'Active', 'Ended'],
      default: 'Waiting'
    }
  },
  { timestamps: true } // Adds createdAt and updatedAt automatically
);

// Indexing potentially queried fields
ConferenceRoomSchema.index({ host: 1 });
ConferenceRoomSchema.index({ 'participants': 1 });
ConferenceRoomSchema.index({ 'chatMessages.timestamp': -1 }); // For fetching recent messages
ConferenceRoomSchema.index({ 'submissions.submittedAt': -1 });
ConferenceRoomSchema.index({ 'emotionData.timestamp': -1 });
ConferenceRoomSchema.index({ 'emotionData.user': 1 });


const ConferenceRoom = mongoose.model("ConferenceRoom", ConferenceRoomSchema);
module.exports = ConferenceRoom;
