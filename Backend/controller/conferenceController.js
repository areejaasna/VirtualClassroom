const asyncHandler = require("express-async-handler");
const { Server } = require("socket.io");
const ConferenceRoom = require("../model/ConferenceRoom.js");
const User = require("../model/User.js");

const conferenceCtrl = {
  //! Create a Video Conference Room
  createRoom: asyncHandler(async (req, res) => {
    const { title } = req.body;
    const userId = req.body.host;
    console.log(title, userId);

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const room = await ConferenceRoom.create({
      title,
      host: userId,
      participants: [userId],
    });
    // console.log(room)
    res.status(201).json({ message: "Room created successfully", room });
  }),

  //! Get all active rooms
  getRooms: asyncHandler(async (req, res) => {
    const rooms = await ConferenceRoom.find();
    res.status(200).json(rooms);
  }),

  getRoomById: asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const room = await ConferenceRoom.findById(roomId).populate('host', 'email'); // Populate host details if needed
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
  
    res.status(200).json(room);
  }),
  

  //! Join a room
  joinRoom: asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await ConferenceRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (!room.participants.includes(userId)) {
      room.participants.push(userId);
      await room.save();
    }

    res.status(200).json({ message: "Joined room successfully", room });
  }),
};

// Real-time Video Conference with Socket.io
const initializeSocket = (server) => {
  const io = new Server(server, { cors: { origin: "*" } });
  io.on("connection", (socket) => {
    console.log("User connected", socket.id);

    socket.on("join-room", ({ roomId, userId }) => {
      socket.join(roomId);
      socket.to(roomId).emit("user-joined", userId);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected", socket.id);
    });
  });
};

module.exports = { conferenceCtrl, initializeSocket };
