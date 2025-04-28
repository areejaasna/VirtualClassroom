const ConferenceRoom = require('../model/ConferenceRoom');
const { HMSAdmin } = require('@100mslive/server-sdk');

// Initialize 100ms SDK
const hmsAdmin = new HMSAdmin(process.env.HMS_ACCESS_KEY, process.env.HMS_SECRET);

// Controller function to create a conference room
exports.createConferenceRoom = async (req, res, next) => {
  const { title } = req.body;
  const hostId = req.user._id; // Assuming user is authenticated and user ID is in req.user._id

  try {
    // 1. Create room in 100ms
    const room = await hmsAdmin.createRoom({
      name: title, // Use the title as the room name
      description: `Conference room for ${title}`,
      template_id: process.env.HMS_DEFAULT_TEMPLATE_ID, // Assuming a default template ID env variable
    });

    // 2. Create room in your database
    const newConferenceRoom = new ConferenceRoom({
      title,
      host: hostId,
      hmsRoomId: room.id, // Store the 100ms room ID
    });

    await newConferenceRoom.save();

    res.status(201).json({
      message: 'Conference room created successfully',
      roomId: newConferenceRoom._id,
      hmsRoomId: room.id,
    });

  } catch (error) {
    console.error('Error creating conference room:', error);
    next(error); // Pass error to error handling middleware
  }
};

// Controller function to generate a conference token
exports.generateConferenceToken = async (req, res, next) => {
  const { roomId, role, userId } = req.params; // Get parameters from the URL

  try {
    // Generate token using 100ms SDK
    const token = await hmsAdmin.getAuthToken({ room_id: roomId, role: role, user_id: userId });

    res.status(200).json({ token });

  } catch (error) {
    console.error('Error generating conference token:', error);
    next(error); // Pass error to error handling middleware
  }
};

// Controller function to get conference details by database ID
exports.getConferenceDetails = async (req, res, next) => {
  const { roomId } = req.params; // Get the database room ID from the URL

  try {
    const conferenceRoom = await ConferenceRoom.findById(roomId);

    if (!conferenceRoom) {
      return res.status(404).json({ message: 'Conference room not found' });
    }

    // Return the 100ms room ID and the database room ID
    res.status(200).json({
      roomId: conferenceRoom._id,
      hmsRoomId: conferenceRoom.hmsRoomId,
    });

  } catch (error) {
    console.error('Error fetching conference details:', error);
    next(error); // Pass error to error handling middleware
  }
};
