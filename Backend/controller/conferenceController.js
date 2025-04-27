// This file handles Socket.io signaling for video conferencing

const users = {}; // Simple in-memory store for users in rooms

const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle joining a room
    socket.on('join', (roomId) => {
      socket.join(roomId);
      console.log(`${socket.id} joined room ${roomId}`);

      // Add user to the room's user list (simple implementation)
      if (!users[roomId]) {
        users[roomId] = [];
      }
      users[roomId].push(socket.id);

      // Notify other users in the room that a new user has joined
      socket.to(roomId).emit('user-joined', socket.id);

      // For simplicity in a basic example, we can assume 2-person calls initially.
      // In a multi-party call, you'd need more complex logic to manage peer connections
      // between all participants.
      if (users[roomId].length > 1) {
          // If there's another user, the joining user should initiate the call (send offer)
          const otherUserId = users[roomId].find(id => id !== socket.id);
          io.to(socket.id).emit('other-user-in-room', otherUserId);
      }

       // Handle disconnection
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Remove user from the room's user list
        if (users[roomId]) {
          users[roomId] = users[roomId].filter(id => id !== socket.id);
          if (users[roomId].length === 0) {
              delete users[roomId]; // Clean up empty rooms
          }
        }
         // Notify other users in the room that a user has left
        socket.to(roomId).emit('user-left', socket.id);
      });

    });

    // Handle receiving an SDP offer and forward it to the other peer in the room
    socket.on('offer', (data) => {
      const { roomId, offer } = data;
       // Find the other user in the room (simple for 2-person)
      const otherUserId = users[roomId] ? users[roomId].find(id => id !== socket.id) : null;
      if (otherUserId) {
         console.log(`Forwarding offer from ${socket.id} to ${otherUserId} in room ${roomId}`);
        io.to(otherUserId).emit('offer', { senderId: socket.id, offer });
      }
    });

    // Handle receiving an SDP answer and forward it to the other peer in the room
    socket.on('answer', (data) => {
      const { roomId, answer } = data;
      // Find the other user in the room (simple for 2-person)
      const otherUserId = users[roomId] ? users[roomId].find(id => id !== socket.id) : null;
       if (otherUserId) {
         console.log(`Forwarding answer from ${socket.id} to ${otherUserId} in room ${roomId}`);
        io.to(otherUserId).emit('answer', { senderId: socket.id, answer });
      }
    });

    // Handle receiving an ICE candidate and forward it to the other peer in the room
    socket.on('candidate', (data) => {
      const { roomId, candidate } = data;
       // Find the other user in the room (simple for 2-person)
      const otherUserId = users[roomId] ? users[roomId].find(id => id !== socket.id) : null;
       if (otherUserId) {
         console.log(`Forwarding candidate from ${socket.id} to ${otherUserId} in room ${roomId}`);
         io.to(otherUserId).emit('candidate', { senderId: socket.id, candidate });
       }
    });



  });
};

module.exports = {
  initializeSocket,
};
