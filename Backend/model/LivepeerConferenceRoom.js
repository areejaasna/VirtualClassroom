const mongoose = require("mongoose");

const LivepeerConferenceRoomSchema = new mongoose.Schema(
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
    livepeerStreamId: { // Field to store Livepeer Stream ID
      type: String,
      required: true,
      unique: true,
    },
    livepeerPlaybackId: { // Field to store Livepeer Playback ID
        type: String,
        required: true,
        unique: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const LivepeerConferenceRoom = mongoose.model("LivepeerConferenceRoom", LivepeerConferenceRoomSchema);
module.exports = LivepeerConferenceRoom;
