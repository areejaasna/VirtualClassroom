const asyncHandler = require("express-async-handler");
const { Server } = require("socket.io");
const ConferenceRoom = require("../model/ConferenceRoom.js");
// Import base User model to easily find user details
const { User } = require("../model/User.js");

// --- Helper function to check if user is a participant ---
const isParticipant = (room, userId) => {
  // Use .toString() comparison for ObjectId safety
  return room.participants.some(participantId => participantId.toString() === userId.toString());
};

// --- Controller Functions for REST API ---
const conferenceCtrl = {
  //! Create a Video Conference Room
  createRoom: asyncHandler(async (req, res) => {
    const { title } = req.body;
    // Assuming host ID comes from authenticated user
    const hostId = req.user; // Make sure isAuth middleware provides the ID here

    if (!title || !hostId) {
      res.status(400);
      throw new Error("Title and host ID are required");
    }

    // Find the host user to ensure they exist
    const hostUser = await User.findById(hostId);
    if (!hostUser) {
        res.status(404);
        throw new Error("Host user not found");
    }

    const room = await ConferenceRoom.create({
      title,
      host: hostId,
      participants: [hostId], // Host is initially the only participant
      status: 'Waiting', // Initial status
      // chatMessages, submissions, emotionData will default to empty arrays
    });

    console.log(`Room created: ${room.title} by ${hostUser.username}`);
    res.status(201).json({ message: "Room created successfully", room });
  }),

  //! Get all active/waiting rooms (can be filtered later)
  getRooms: asyncHandler(async (req, res) => {
    // Example: Find rooms that are not 'Ended'
    const rooms = await ConferenceRoom.find({ status: { $ne: 'Ended' } })
                                      .populate('host', 'username email role') // Populate basic host info
                                      .select('title host participants status createdAt'); // Select specific fields
    res.status(200).json(rooms);
  }),

  //! Get details of a specific room
  getRoomById: asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user; // Get current user ID

    const room = await ConferenceRoom.findById(roomId)
                                     .populate('host', 'username email role')
                                     .populate('participants', 'username email role'); // Populate participants details

    if (!room) {
      res.status(404);
      throw new Error("Room not found");
    }

    // Optional: Check if the requesting user is a participant or host
    // if (room.host._id.toString() !== userId && !isParticipant(room, userId)) {
    //    res.status(403);
    //    throw new Error("Not authorized to view this room's details");
    // }

    res.status(200).json(room);
  }),

  //! Join a room
  joinRoom: asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user; // User ID from auth middleware

    const room = await ConferenceRoom.findById(roomId);
    if (!room) {
      res.status(404);
      throw new Error("Room not found");
    }

    if (room.status === 'Ended') {
        res.status(400);
        throw new Error("Cannot join an ended room");
    }

    // Find the user trying to join
    const user = await User.findById(userId);
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    // Add participant if not already included
    if (!isParticipant(room, userId)) {
      // Use $addToSet to avoid duplicates
      await ConferenceRoom.updateOne({ _id: roomId }, { $addToSet: { participants: userId } });
      console.log(`User ${user.username} joined room ${room.title}`);
      // Optionally: Emit a socket event here if needed, though often handled on client join
    }

    // Return the updated room state (or just success message)
    const updatedRoom = await ConferenceRoom.findById(roomId).populate('participants', 'username'); // Get updated participants list
    res.status(200).json({ message: "Joined room successfully", room: updatedRoom });
  }),

  //! Get Chat Messages for a Room
  getChatMessages: asyncHandler(async (req, res) => {
      const { roomId } = req.params;
      const userId = req.user;

      const room = await ConferenceRoom.findById(roomId).select('participants chatMessages'); // Select only needed fields

      if (!room) {
          res.status(404);
          throw new Error("Room not found");
      }

      // Authorization: Check if user is a participant
      if (!isParticipant(room, userId)) {
          res.status(403);
          throw new Error("Not authorized to view chat messages for this room");
      }

      res.status(200).json(room.chatMessages); // Return the array of chat messages
  }),

  sendChatMessageREST: asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user;
    const { message } = req.body;
  
    if (!message) {
      res.status(400);
      throw new Error("Message is required");
    }
  
    const room = await ConferenceRoom.findById(roomId);
    if (!room) {
      res.status(404);
      throw new Error("Room not found");
    }
  
    if (!isParticipant(room, userId)) {
      res.status(403);
      throw new Error("Not authorized to send messages in this room");
    }
  
    const user = await User.findById(userId).select('username');
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
  
    const newMessage = {
      user: userId,
      username: user.username,
      message: message,
      timestamp: new Date()
    };
  
    room.chatMessages.push(newMessage);
    await room.save();
  
    res.status(201).json({ message: "Message sent", chat: newMessage });
  }),
  

  //! Handle File Submission (Metadata only) - Requires file upload middleware (e.g., multer) on the route
  handleSubmission: asyncHandler(async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user;
    const { description } = req.body;
    const file = req.file; // File object provided by upload middleware (like multer)

    if (!file) {
        res.status(400);
        throw new Error("No file submitted");
    }

    const room = await ConferenceRoom.findById(roomId);
    if (!room) {
        res.status(404);
        throw new Error("Room not found");
    }

     // Authorization: Check if user is a participant
     if (!isParticipant(room, userId)) {
        // Optional: Delete the uploaded file if user is not authorized
        // require('fs').unlinkSync(file.path); // Example for local storage
        res.status(403);
        throw new Error("Not authorized to submit files to this room");
    }

    // Find the user to get their username
    const user = await User.findById(userId).select('username');
     if (!user) {
        // Should generally not happen if isAuth middleware is working
        res.status(404);
        throw new Error("Submitting user not found");
    }

    const newSubmission = {
        user: userId,
        username: user.username, // Store username
        originalFileName: file.originalname,
        // IMPORTANT: storagePath depends on your storage strategy (e.g., file.path for local, file.key for S3)
        storagePath: file.path || file.key || file.filename,
        description: description || '', // Handle optional description
        // submittedAt will be added by default
    };

    // Add the submission metadata to the room document
    room.submissions.push(newSubmission);
    await room.save();

    console.log(`File submitted by ${user.username} to room ${room.title}: ${file.originalname}`);
    res.status(201).json({ message: "File submitted successfully", submission: newSubmission });
  }),

  //! Get Submissions for a Room
  getSubmissions: asyncHandler(async (req, res) => {
      const { roomId } = req.params;
      const userId = req.user;

      const room = await ConferenceRoom.findById(roomId).select('participants submissions');

      if (!room) {
          res.status(404);
          throw new Error("Room not found");
      }

      // Authorization: Check if user is a participant
      if (!isParticipant(room, userId)) {
          res.status(403);
          throw new Error("Not authorized to view submissions for this room");
      }

      res.status(200).json(room.submissions);
  }),

   //! Record an Emotion Event (can be called via REST or Socket internally)
   recordEmotionEventREST: asyncHandler(async (req, res) => {
        const { roomId } = req.params;
        const userId = req.user;
        const { emotion, confidence } = req.body; // Expect emotion data in body

        if (!emotion) {
            res.status(400);
            throw new Error("Emotion data is required");
        }

        const room = await ConferenceRoom.findById(roomId);
        if (!room) {
            res.status(404);
            throw new Error("Room not found");
        }

        // Authorization: Check if user is a participant
        if (!isParticipant(room, userId)) {
            res.status(403);
            throw new Error("User is not a participant in this room");
        }

         // Find the user to get their username
        const user = await User.findById(userId).select('username');
        if (!user) {
            res.status(404);
            throw new Error("User not found");
        }

        const newEmotionEvent = {
            user: userId,
            username: user.username,
            emotion: emotion,
            confidence: confidence, // Optional confidence score
            // timestamp added by default
        };

        // Add the emotion event
        room.emotionData.push(newEmotionEvent);
        await room.save();

        // Optionally: Broadcast via Socket.IO if needed in real-time by others
        // req.io.to(roomId).emit('new-emotion-event', newEmotionEvent);

        console.log(`Emotion event recorded for ${user.username} in room ${room.title}: ${emotion}`);
        res.status(201).json({ message: "Emotion event recorded", event: newEmotionEvent });
   }),

   //! Get Emotion Data for a Room
   getEmotionData: asyncHandler(async (req, res) => {
        const { roomId } = req.params;
        const userId = req.user; // Authenticated user
        const filterByUserId = req.query.userId; // Optional query param to filter by specific user

        const room = await ConferenceRoom.findById(roomId).select('participants emotionData');

        if (!room) {
            res.status(404);
            throw new Error("Room not found");
        }

        // Authorization: Check if requesting user is a participant
        if (!isParticipant(room, userId)) {
            res.status(403);
            throw new Error("Not authorized to view emotion data for this room");
        }

        let responseData = room.emotionData;

        // Filter by specific user if requested
        if (filterByUserId) {
             // Basic check: Ensure the requesting user is asking for their own data OR is maybe a host/teacher?
             // Add more sophisticated role-based checks if needed (e.g., Teacher can see all)
             // if (userId !== filterByUserId /* && userRole !== 'Teacher' */ ) {
             //    res.status(403);
             //    throw new Error("Not authorized to view this specific user's emotion data");
             // }
            responseData = room.emotionData.filter(event => event.user.toString() === filterByUserId);
        }

        res.status(200).json(responseData);
   }),

   // Example: Endpoint to change room status (e.g., end the room) - Authorization needed
   updateRoomStatus: asyncHandler(async (req, res) => {
        const { roomId } = req.params;
        const userId = req.user; // ID of user making request
        const { status } = req.body; // New status ('Active', 'Ended')

        if (!status || !['Active', 'Ended'].includes(status)) {
            res.status(400);
            throw new Error("Invalid status provided. Must be 'Active' or 'Ended'.");
        }

        const room = await ConferenceRoom.findById(roomId);
        if (!room) {
            res.status(404);
            throw new Error("Room not found");
        }

        // Authorization: ONLY the host can change the status (example)
        if (room.host.toString() !== userId) {
             res.status(403);
             throw new Error("Only the host can change the room status.");
        }

        room.status = status;
        await room.save();

        // Optionally broadcast status change via socket
        // req.io.to(roomId).emit('room-status-changed', { status: room.status });

        console.log(`Room ${room.title} status changed to ${status} by host`);
        res.status(200).json({ message: `Room status updated to ${status}`, room });
   })

};

// --- Socket.IO Integration ---
const initializeSocket = (server) => {
  // Attach Socket.IO to the server
  const io = new Server(server, {
      cors: { origin: "*" }, // Configure CORS as needed
      // Consider connection state recovery options if needed
  });

  // Middleware to attach io instance to requests if needed by REST controllers
  // app.use((req, res, next) => {
  //   req.io = io;
  //   next();
  // });


  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // ** Join Room Event **
    // Client emits this when they join a room's page/component
    socket.on("join-room", async ({ roomId, userId }) => {
        console.log(`Socket ${socket.id} attempting to join room ${roomId} as user ${userId}`);
        try {
            const room = await ConferenceRoom.findById(roomId);
            const user = await User.findById(userId).select('username'); // Fetch username

            if (!room || !user) {
                console.error(`Join attempt failed: Room ${roomId} or User ${userId} not found.`);
                socket.emit('join-error', { message: 'Room or User not found' }); // Inform client
                return;
            }

            // Check if user is participant (important for re-connections)
            if (!isParticipant(room, userId)) {
                 console.warn(`User ${userId} (${user.username}) is not listed as a participant in room ${roomId}. Allowing join for signaling.`);
                 // Decide if non-participants should be allowed to connect to socket room
                 // If joining requires being added via REST first, you might deny here:
                 // socket.emit('join-error', { message: 'Not authorized to join this room' });
                 // return;
            }

            socket.join(roomId); // Join the socket.io room
            socket.data.userId = userId; // Store userId and username on socket instance
            socket.data.username = user.username;
            socket.data.roomId = roomId;

            console.log(`User ${userId} (${user.username}) socket ${socket.id} joined room ${roomId}`);

            // Notify others in the room that a user's socket connected
            socket.to(roomId).emit("user-connected", { userId, username: user.username, socketId: socket.id });

            // Send confirmation back to the joining client
            socket.emit("joined-room-success", { roomId });

        } catch (error) {
            console.error(`Error during socket join-room for room ${roomId}:`, error);
            socket.emit('join-error', { message: 'Server error joining room' });
        }
    });

    // ** Send Chat Message Event **
    socket.on("send-message", async ({ roomId, message }) => {
        const userId = socket.data.userId; // Get user from socket data
        const username = socket.data.username;

        if (!userId || !roomId || !message) {
            console.error("Missing data for send-message event:", { userId, roomId, message: !!message });
            socket.emit('message-error', { message: 'Missing data to send message' });
            return;
        }

        try {
            const room = await ConferenceRoom.findById(roomId);
            if (!room) {
                 socket.emit('message-error', { message: 'Room not found' });
                 return;
            }
             // Authorization check: Ensure sender is a participant
            if (!isParticipant(room, userId)) {
                 socket.emit('message-error', { message: 'Not authorized to send messages in this room' });
                 return;
            }

            const newMessage = {
                user: userId,
                username: username,
                message: message,
                timestamp: new Date() // Add timestamp server-side
            };

            // Add message to DB
            await ConferenceRoom.updateOne(
                { _id: roomId },
                { $push: { chatMessages: newMessage } }
            );

            // Broadcast the message to everyone in the room (including sender)
            io.to(roomId).emit("new-message", newMessage);

            console.log(`Message from ${username} in room ${roomId}: ${message}`);

        } catch (error) {
             console.error(`Error sending message in room ${roomId}:`, error);
             socket.emit('message-error', { message: 'Server error sending message' });
        }
    });

     // ** Record Emotion Event via Socket **
    socket.on("record-emotion", async ({ roomId, emotion, confidence }) => {
        const userId = socket.data.userId;
        const username = socket.data.username;

        if (!userId || !roomId || !emotion) {
            console.error("Missing data for record-emotion event:", { userId, roomId, emotion: !!emotion });
            // Optionally notify client: socket.emit('emotion-error', { message: 'Missing data' });
            return;
        }

         try {
            // Note: We might skip fetching the room for performance if we trust the client's roomId
            // and rely on socket auth. But checking is safer.
            const room = await ConferenceRoom.findById(roomId);
            if (!room || !isParticipant(room, userId)) {
                 console.error(`User ${userId} not participant or room ${roomId} not found for emotion recording.`);
                 // Optionally notify client: socket.emit('emotion-error', { message: 'Room/Auth error' });
                 return;
            }

            const newEmotionEvent = {
                user: userId,
                username: username,
                emotion: emotion,
                confidence: confidence,
                timestamp: new Date()
            };

            // Add emotion event to DB
            await ConferenceRoom.updateOne(
                { _id: roomId },
                { $push: { emotionData: newEmotionEvent } }
            );

            // Decide who needs to know about this event in real-time
            // Example: Broadcast to the room (maybe filter on client-side)
             io.to(roomId).emit("new-emotion-event", newEmotionEvent);

            // Example: Send only to host? Requires finding host socket
            // const hostSocket = findSocketByUserId(io, room.host);
            // if(hostSocket) io.to(hostSocket.id).emit("new-emotion-event", newEmotionEvent);

            console.log(`Emotion recorded via socket for ${username} in ${roomId}: ${emotion}`);

        } catch (error) {
             console.error(`Error recording emotion in room ${roomId}:`, error);
             // Optionally notify client: socket.emit('emotion-error', { message: 'Server error' });
        }
    });


    // ** Handle Signaling for WebRTC ** (Example - adapt as needed)
    socket.on('signal', ({ toSocketId, signal }) => {
        // Send signal data only to the intended recipient socket
        io.to(toSocketId).emit('signal', { fromSocketId: socket.id, signal });
    });


    // ** Disconnect Event **
    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.id}, Reason: ${reason}`);
      // Notify the room that this user's socket disconnected
      const roomId = socket.data.roomId;
      const userId = socket.data.userId;
      if (roomId && userId) {
        // Use socket.to() to broadcast to others in the room
        socket.to(roomId).emit("user-disconnected", { userId, socketId: socket.id });
      }
      // Clean up any other resources associated with the socket if necessary
    });
  });

  console.log("Socket.IO initialized successfully.");
  return io; // Return the io instance if needed elsewhere
};


// Export the controller functions and the initializer
module.exports = { conferenceCtrl, initializeSocket };
