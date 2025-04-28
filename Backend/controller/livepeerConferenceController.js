const LivepeerConferenceRoom = require('../model/LivepeerConferenceRoom');
const axios = require('axios');

// Livepeer API Base URL
const LIVEPEER_API_URL = 'https://livepeer.studio/api';

// Controller function to create a Livepeer stream and conference room
exports.createLivepeerConferenceRoom = async (req, res, next) => {
  const { title } = req.body;
  const hostId = req.user._id; // Assuming user is authenticated and user ID is in req.user._id

  try {
    // 1. Create stream in Livepeer using REST API
    const streamResponse = await axios.post(
      `${LIVEPEER_API_URL}/stream`,
      {
        name: title, // Use the title as the stream name
        profiles: [
          // Define your desired encoding profiles here.
          // For a conference, you might want profiles suitable for low-latency playback.
          // This is a basic example, adjust profiles as needed.
          {
            name: '720p',
            bitrate: 2000000,
            fps: 30,
            width: 1280,
            height: 720,
          },
          {
            name: '480p',
            bitrate: 1000000,
            fps: 24,
            width: 854,
            height: 480,
          },
        ],
        // You might need to configure other options like dStorage, etc.
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LIVEPEER_API_KEY}`,
        },
      }
    );

    const stream = streamResponse.data; // The created stream details from Livepeer

    // Extract streamId and playbackId
    const livepeerStreamId = stream.id;
    const livepeerPlaybackId = stream.playbackId;

    // 2. Create conference room in your database
    const newConferenceRoom = new LivepeerConferenceRoom({
      title,
      host: hostId,
      livepeerStreamId: livepeerStreamId,
      livepeerPlaybackId: livepeerPlaybackId,
      participants: [hostId], // Add host as initial participant
    });

    await newConferenceRoom.save();

    res.status(201).json({
      message: 'Conference room created successfully',
      roomId: newConferenceRoom._id,
      livepeerStreamId: livepeerStreamId,
      livepeerPlaybackId: livepeerPlaybackId,
    });

  } catch (error) {
    console.error('Error creating Livepeer conference room:', error);
    // Log detailed error if it's an axios error
    if (error.response) {
      console.error('Livepeer API Error Response Data:', error.response.data);
      console.error('Livepeer API Error Response Status:', error.response.status);
    } else if (error.request) {
      console.error('Livepeer API Error Request:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    next(error); // Pass error to error handling middleware
  }
};

// Controller function to get Livepeer conference details by database ID
exports.getLivepeerConferenceDetails = async (req, res, next) => {
  const { roomId } = req.params; // Get the database room ID from the URL

  try {
    const conferenceRoom = await LivepeerConferenceRoom.findById(roomId);

    if (!conferenceRoom) {
      return res.status(404).json({ message: 'Livepeer conference room not found' });
    }

    // Return the database room ID, Livepeer stream ID, and playback ID
    res.status(200).json({
      roomId: conferenceRoom._id,
      livepeerStreamId: conferenceRoom.livepeerStreamId,
      livepeerPlaybackId: conferenceRoom.livepeerPlaybackId,
    });

  } catch (error) {
    console.error('Error fetching Livepeer conference details:', error);
    next(error); // Pass error to error handling middleware
  }
};

// You might need more controller functions here, e.g., for:
// - Handling participant joining/leaving (you might track participants in your DB)
// - Deleting streams/rooms
