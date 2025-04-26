const mongoose = require("mongoose");

const ConferenceRoomSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    dailyRoomUrl: { // Added field for Daily.co room URL
      type: String,
      required: false, // Not required initially
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const ConferenceRoom = mongoose.model("ConferenceRoom", ConferenceRoomSchema);
module.exports = ConferenceRoom;
