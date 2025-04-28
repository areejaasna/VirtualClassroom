const ConferenceRoom = require('../model/ConferenceRoom');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// 100ms API Base URL
const HMS_API_URL = 'https://api.100ms.live/v2';

// Function to generate a management token
const generateManagementToken = () => {
  const payload = {
    access_key: process.env.HMS_ACCESS_KEY,
    type: 'management',
    version: 2,
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000)
  };
  const token = jwt.sign(payload, process.env.HMS_SECRET, { algorithm: 'HS256' });
  return token;
};

// Controller function to create a conference room
exports.createConferenceRoom = async (req, res, next) => {
  const { title } = req.body;
  const hostId = req.user._id; // Assuming user is authenticated and user ID is in req.user._id

  try {
    // 1. Generate management token
    const managementToken = generateManagementToken();

    // 2. Create room in 100ms using REST API
    const roomResponse = await axios.post(
      `${HMS_API_URL}/rooms`,
      {
        name: title,
        description: `Conference room for ${title}`,
        template_id: process.env.HMS_DEFAULT_TEMPLATE_ID,
      },
      {
        headers: {
          Authorization: `Bearer ${managementToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const room = roomResponse.data; // The created room details from 100ms

    // 3. Create room in your database
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
    // Check if it's an axios error with response data
    if (error.response) {
      console.error('100ms API Error Response Data:', error.response.data);
      console.error('100ms API Error Response Status:', error.response.status);
      console.error('100ms API Error Response Headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('100ms API Error Request:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    next(error); // Pass error to error handling middleware
  }
};

// Controller function to generate a conference token
exports.generateConferenceToken = async (req, res, next) => {
  const { roomId, role, userId } = req.params; // Get database room ID, role, and user ID from the URL

  try {
    // 1. Fetch the 100ms room ID from your database using the database conference room ID (`roomId`)
    const conferenceRoom = await ConferenceRoom.findById(roomId);

    if (!conferenceRoom) {
      return res.status(404).json({ message: 'Conference room not found in database' });
    }

    const hmsRoomId = conferenceRoom.hmsRoomId; // Get the 100ms room ID

    if (!hmsRoomId) {
        return res.status(400).json({ message: '100ms Room ID not found for this conference.' });
    }

    // 2. Generate management token for API authentication
    const managementToken = generateManagementToken();

    // 3. Generate join token using 100ms REST API
    const tokenResponse = await axios.post(
      `${HMS_API_URL}/tokens`,
      {
        room_id: hmsRoomId,
        user_id: userId,
        role: role,
      },
      {
        headers: {
          Authorization: `Bearer ${managementToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json({ token: tokenResponse.data.token });

  } catch (error) {
    console.error('Error generating conference token:', error);
     // Check if it's an axios error with response data
    if (error.response) {
      console.error('100ms API Error Response Data:', error.response.data);
      console.error('100ms API Error Response Status:', error.response.status);
      console.error('100ms API Error Response Headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('100ms API Error Request:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    next(error); // Pass error to error handling middleware
  }
};

// Controller function to get conference details by database ID
// This function remains largely the same as it only interacts with the local database
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
