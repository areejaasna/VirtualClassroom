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
    const userId = req.user.id; // Assuming user ID is available in req.user

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
  const users = {}; // Keep track of users and their socket IDs per room
  const socketToRoom = {}; // Keep track of which room a socket is in

  io.on("connection", (socket) => {
    console.log("User connected", socket.id);

    socket.on("join-room", ({ roomId, userId }) => {
      socket.join(roomId);
      socketToRoom[socket.id] = roomId;
      if (!users[roomId]) {
        users[roomId] = [];
      }
      // Add user only if they are not already in the list for that room
      if (!users[roomId].find(user => user.socketId === socket.id)) {
        users[roomId].push({ userId: userId, socketId: socket.id });
      }
      console.log(`User ${userId} (${socket.id}) joined room ${roomId}`);

      // Get list of all users (their socket IDs) currently in this room, excluding the new joiner
      const usersInThisRoom = users[roomId].filter(user => user.socketId !== socket.id);

      // Send the list of existing users to the new user
      socket.emit("existing-users", usersInThisRoom.map(u => u.socketId));

      // Notify existing users that a new user has joined (send new user's socket ID)
      // Deprecated: usersInThisRoom.forEach(user => {
      // Deprecated:   io.to(user.socketId).emit("user-joined", { signalerId: socket.id, userId: userId });
      // Deprecated: });
      // Emit to all *other* sockets in the room
      socket.to(roomId).emit("user-joined", { signalerId: socket.id, userId: userId });

    });

    // Relay signaling messages
    socket.on("sending-signal", payload => {
        console.log(`Relaying signal from ${socket.id} to ${payload.userToSignal}`);
        io.to(payload.userToSignal).emit('signal-received', { signal: payload.signal, signalerId: socket.id });
    });

    socket.on("returning-signal", payload => {
        console.log(`Relaying return signal from ${socket.id} to ${payload.callerId}`);
        io.to(payload.callerId).emit('signal-accepted', { signal: payload.signal, id: socket.id });
    });


    socket.on("disconnect", () => {
      console.log("User disconnected", socket.id);
      const roomId = socketToRoom[socket.id];
      if (roomId && users[roomId]) {
        // Remove user from the room's list
        users[roomId] = users[roomId].filter(user => user.socketId !== socket.id);
        // Notify remaining users in the room
        io.to(roomId).emit("user-left", socket.id);
      }
      delete socketToRoom[socket.id]; // Clean up mapping
    });
  });
};

module.exports = { conferenceCtrl, initializeSocket };