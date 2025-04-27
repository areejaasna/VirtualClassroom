const mongoose = require("mongoose");

const ConferenceRoomSchema = new mongoose.Schema(
  {
    roomName: {
      type: String,
      required: true,
    },
    roomId:{
      type:String,
      required: true,
    }

  },
  { timestamps: true }
);

const ConferenceRoom = mongoose.model("ConferenceRoom", ConferenceRoomSchema);
module.exports = ConferenceRoom;
