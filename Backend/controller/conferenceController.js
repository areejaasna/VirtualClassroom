const asyncHandler = require("express-async-handler");
const ConferenceRoom = require("../model/ConferenceRoom.js");
const { v4: uuidv4 } = require('uuid');

const createNewRoom = asyncHandler(async (req, res) => {
  const { roomName } = req.body;

  if (!roomName) {
    res.status(400);
    throw new Error("Room name is required");
  }

  const roomId = uuidv4();
  const conferenceRoom = await ConferenceRoom.create({
    roomName,
    roomId,
  });

  res.status(201).json({ roomId });
});

const getAllRooms = asyncHandler(async (req, res) => {
    const conferenceRooms = await ConferenceRoom.find();
    res.status(200).json({rooms:conferenceRooms});
});

const getRoomById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const room = await ConferenceRoom.findOne({ roomId: id });

    if(!room) {
        res.status(404);
        throw new Error("Room not found");
    }
    res.status(200).json(room);
});

module.exports = { createNewRoom, getAllRooms,getRoomById };

