const asyncHandler = require("express-async-handler");
const { Server } = require("socket.io");
const ConferenceRoom = require("../model/ConferenceRoom.js");
const User = require("../model/User.js");
const axios = require("axios"); // Import axios

// Daily.co API key - Make sure to configure this securely in your environment variables
const DAILY_API_KEY = process.env.DAILY_API_KEY;

const conferenceCtrl = {
  //! Create a Video Conference Room
  createRoom: asyncHandler(async (req, res) => {
    const { title } = req.body;
    const userId = req.body.host;
    console.log("Creating room:", title, userId);

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    try {
      const room = await ConferenceRoom.create({
        title,
        host: userId,
        participants: [userId], // Host initially is the only participant
      });
      console.log("Room created:", room._id);
      res.status(201).json({ message: "Room created successfully", room });
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ error: "Failed to create room" });
    }
  }),

  //! Get all active rooms
  getRooms: asyncHandler(async (req, res) => {
    try {
      const rooms = await ConferenceRoom.find();
      res.status(200).json(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ error: "Failed to fetch rooms" });
    }
  }),

  //! Get room details by ID
  getRoomById: asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    try {
      const room = await ConferenceRoom.findById(roomId).populate('host', 'email');
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      res.status(200).json(room);
    } catch (error) {
      console.error(`Error fetching room ${roomId}:`, error);
      res.status(500).json({ error: "Failed to fetch room details" });
    }
  }),

  //! Join a room (updates participant list in DB and gets Daily.co room URL)
  joinRoom: asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    // Assuming userId is passed in request body or available via auth middleware (req.user.id)
    const userId = req.user?.id || req.body.userId;

    if (!userId) {
       return res.status(400).json({ error: "User ID is required to join" });
    }

    if (!DAILY_API_KEY) {
        console.error("Daily.co API Key is not configured.");
        return res.status(500).json({ error: "Server configuration error: Daily.co API Key missing." });
    }

    try {
      const room = await ConferenceRoom.findById(roomId);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      let dailyRoomUrl = room.dailyRoomUrl;

      // If no Daily.co room URL exists, create one
      if (!dailyRoomUrl) {
        console.log(`No Daily.co URL found for room ${roomId}. Creating a new Daily.co room.`);
        try {
          const dailyResponse = await axios.post(
            'https://api.daily.co/v1/rooms',
            { 
                properties: { 
                    enable_screenshare: true, 
                    enable_chat: true, 
                    enable_people_ui: true, 
                    enable_pip_ui: true, 
                    enable_prejoin_ui: true, 
                    start_video_off: false,
                    start_audio_off: false,
                    // You can add more Daily.co room properties here
                    // See https://docs.daily.co/reference/rest-api/rooms/create-room
                }
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DAILY_API_KEY}`,
              },
            }
          );

          dailyRoomUrl = dailyResponse.data.url; // Get the room URL from Daily.co response
          room.dailyRoomUrl = dailyRoomUrl; // Store the URL in your DB
          await room.save();
          console.log(`Created and stored Daily.co room URL for room ${roomId}: ${dailyRoomUrl}`);

        } catch (dailyApiError) {
          console.error("Error creating Daily.co room:", dailyApiError.response ? JSON.stringify(dailyApiError.response.data) : dailyApiError.message);
          return res.status(500).json({ error: "Failed to create Daily.co room" });
        }
      }

      // Add participant to DB list if not already present
      if (!room.participants.includes(userId)) {
        room.participants.push(userId);
        await room.save();
        console.log(`User ${userId} added to participant list for room ${roomId}`);
      }

      // Send back the Daily.co room URL to the frontend
      res.status(200).json({ 
        message: "Joined room successfully (participant list updated)", 
        dailyRoomUrl: dailyRoomUrl, // Include the Daily.co room URL
        room: room // Optionally send updated room details
      });

    } catch (error) {
      console.error(`Error joining room ${roomId} for user ${userId}:`, error);
      res.status(500).json({ error: "Failed to join room" });
    }
  }),

  // TODO: Add a leaveRoom endpoint to remove user from participants array in DB
};

// Basic Socket.IO setup (Optional - can be removed if not needed for other features)
// WebView approach for Daily.co handles the real-time communication for video/audio.
// You might still use Socket.IO for chat, notifications, etc.
const initializeSocket = (server) => {
  const io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    console.log("Socket.IO user connected", socket.id);

    socket.on("join-room-notify", ({ roomId, userId }) => {
      // Example: Notify others in the room (via Socket.IO) that a user joined
      // This is separate from Daily.co room joining via WebView.
      socket.join(roomId);
      socket.to(roomId).emit("user-joined-notify", { userId, socketId: socket.id });
      console.log(`Socket ${socket.id} associated with user ${userId} joined notification room ${roomId}`);
    });

    socket.on("disconnect", () => {
      console.log("Socket.IO user disconnected", socket.id);
      // Add cleanup logic if needed, e.g., remove user from any notification rooms
    });
  });
};

module.exports = { conferenceCtrl, initializeSocket };