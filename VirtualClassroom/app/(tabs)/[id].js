import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import axios from "axios";
import io from "socket.io-client";
import Constants from 'expo-constants'; // Expo Constants module
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  RTCView, // Import RTCView
} from 'react-native-webrtc';

export default function Room() {
  const { BACKEND_API } = Constants.expoConfig.extra;
  const socketRef = useRef(); // Use ref for socket
  const router = useRouter();
  const roomId = useSelector((state) => state.room.roomId);
  const [roomDetails, setRoomDetails] = useState(null);
  const [isJoined, setIsJoined] = useState(false);
  const user = useSelector((state) => state.auth.user);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // Store remote streams by socket ID
  const peerConnections = useRef({}); // Store peer connections by socket ID

  // WebRTC Configuration (can add STUN/TURN servers here)
  const peerConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      // Add TURN servers if needed for NAT traversal
    ],
  };

  // --- WebRTC Logic ---

  // Function to create a peer connection
  const createPeerConnection = (socketId, isInitiator) => {
    console.log(`Creating peer connection for ${socketId}, initiator: ${isInitiator}`);
    try {
      const pc = new RTCPeerConnection(peerConfig);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`Sending ICE candidate to ${socketId}`);
          socketRef.current.emit('sending-signal', { userToSignal: socketId, signal: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        console.log(`Received remote track from ${socketId}`);
        if (event.streams && event.streams[0]) {
          setRemoteStreams(prev => ({
            ...prev,
            [socketId]: event.streams[0],
          }));
        } else {
          // Fallback for browsers that don't support streams[0]
          let inboundStream = new MediaStream([event.track]);
           setRemoteStreams(prev => ({
            ...prev,
            [socketId]: inboundStream,
          }));
        }
      };

      // Add local stream tracks
      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
        console.log(`Added local stream tracks for ${socketId}`);
      } else {
        console.warn("Local stream not available when creating peer connection for", socketId);
      }

      peerConnections.current[socketId] = pc;
      return pc;
    } catch (error) {
      console.error("Error creating peer connection:", error);
      return null;
    }
  };

  // Get local media stream
  const startLocalStream = async () => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 640,
          height: 480,
          frameRate: 30,
        },
      });
      setLocalStream(stream);
      console.log("Local stream obtained successfully");
      return stream; // Return the stream so joinRoom can use it immediately
    } catch (error) {
      console.error("Error getting local stream:", error);
      // Handle permissions error etc.
      alert('Failed to get camera/microphone permissions. Please check your settings.');
      return null;
    }
  };

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!BACKEND_API) {
      console.error("BACKEND_API URL not found in Constants");
      alert("Backend API URL is not configured. Please check environment settings.");
      return;
    }
    socketRef.current = io(BACKEND_API);
    console.log("Socket connected to:", BACKEND_API);

    // Socket event listeners
    socketRef.current.on('existing-users', (users) => {
      console.log("Existing users received:", users);
      if (localStream) {
        users.forEach(socketId => {
          const pc = createPeerConnection(socketId, true); // New user initiates connection
          if (pc) {
            pc.createOffer()
              .then(offer => pc.setLocalDescription(offer))
              .then(() => {
                console.log(`Sending offer to ${socketId}`);
                socketRef.current.emit('sending-signal', { userToSignal: socketId, signal: pc.localDescription });
              })
              .catch(e => console.error("Error creating offer:", e));
          }
        });
      } else {
          console.warn("Local stream not ready when 'existing-users' received.");
          // Maybe queue these connections or wait for stream
      }
    });

    socketRef.current.on('user-joined', ({ signalerId, userId }) => {
        console.log(`User joined: ${userId} (${signalerId}), initiating connection.`);
        // We don't need to create a connection here. The existing users will initiate.
        // The new user will receive 'existing-users' and initiate connections from their side.
        // OR the *other* users will initiate. Let's have the existing users initiate.
        // * Correction: The logic in 'existing-users' handles the new user initiating.
        // * Let's refine: The new user receives 'existing-users', the *existing* users receive 'user-joined'.
        // * The 'user-joined' event on *existing* clients should trigger *them* to create a connection
        // * and send an offer to the *new* user (`signalerId`).

        if (localStream) {
             console.log(`New user ${signalerId} joined. Creating peer connection and sending offer.`);
            const pc = createPeerConnection(signalerId, true); // Existing user initiates
            if (pc) {
                pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                    console.log(`Sending offer to new user ${signalerId}`);
                    socketRef.current.emit('sending-signal', { userToSignal: signalerId, signal: pc.localDescription });
                })
                .catch(e => console.error("Error creating offer for new user:", e));
            }
        } else {
             console.warn("Local stream not ready when 'user-joined' received.");
        }

        // Update participants list visually (optional, if needed beyond WebRTC)
        setRoomDetails(prevDetails => {
            if (prevDetails && !prevDetails.participants.some(p => p === userId)) { // Avoid duplicates if backend also sends updates
                return { ...prevDetails, participants: [...prevDetails.participants, userId] };
            }
            return prevDetails;
        });
    });

    socketRef.current.on('signal-received', ({ signal, signalerId }) => {
      console.log(`Signal received from ${signalerId}`);
      let pc = peerConnections.current[signalerId];
      if (!pc) {
        console.log(`Creating peer connection for ${signalerId} as receiver.`);
        pc = createPeerConnection(signalerId, false); // Create connection if it doesn't exist (receiver)
      }

      const desc = new RTCSessionDescription(signal);
      pc.setRemoteDescription(desc)
        .then(() => {
          if (signal.type === 'offer') {
            console.log(`Received offer from ${signalerId}, creating answer.`);
            return pc.createAnswer();
          }
        })
        .then(answer => {
          if (answer) {
            return pc.setLocalDescription(answer);
          }
        })
        .then(() => {
          if (signal.type === 'offer') {
            console.log(`Sending answer back to ${signalerId}`);
            socketRef.current.emit('returning-signal', { signal: pc.localDescription, callerId: signalerId });
          }
        })
        .catch(e => console.error("Error handling received signal:", e));
    });

    // Handle received answer signal
    socketRef.current.on('signal-accepted', ({ signal, id }) => {
        console.log(`Received signal acceptance (answer) from ${id}`);
        const pc = peerConnections.current[id];
        if (pc) {
            pc.setRemoteDescription(new RTCSessionDescription(signal))
              .catch(e => console.error("Error setting remote description on answer:", e));
        } else {
            console.warn(`Peer connection for ${id} not found when accepting signal.`);
        }
    });

    // Handle ICE candidates (Corrected logic based on backend emitting 'signal-received' for candidates too)
    // We need to handle candidate signals slightly differently.
    // The backend was updated to send 'signal-received' for offers/answers and 'ice-candidate' separately.
    // Let's adjust the backend OR the frontend. Assuming backend sends candidate type in signal.
    // *Revising*: Backend IS sending 'signal-received' for offer/answer and 'ice-candidate' for candidates.
    // Let's listen for 'ice-candidate' separately.

    socketRef.current.on('ice-candidate', ({ candidate, senderId }) => {
        console.log(`Received ICE candidate from ${senderId}`);
        const pc = peerConnections.current[senderId];
        if (pc && candidate) {
            pc.addIceCandidate(new RTCIceCandidate(candidate))
              .catch(e => console.error("Error adding received ICE candidate:", e));
        }
         else {
             console.warn(`Peer connection for ${senderId} not found or candidate invalid when receiving ICE candidate.`);
        }
    });


    socketRef.current.on('user-left', (socketId) => {
      console.log(`User left: ${socketId}`);
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
      }
      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[socketId];
        return newStreams;
      });
    });

    // Cleanup on unmount
    return () => {
      console.log("Cleaning up Room component");
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [BACKEND_API, localStream]); // Re-run if API changes or localStream becomes available

  // Fetch room details effect
  useEffect(() => {
    if (!user || !roomId || !BACKEND_API) return;

    const fetchRoomDetails = async () => {
      try {
        const response = await axios.get(`${BACKEND_API}/api/conference/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setRoomDetails(response.data);
      } catch (error) {
        console.error("Error fetching room details:", error);
        // Handle error (e.g., room not found)
      }
    };

    fetchRoomDetails();
  }, [roomId, user, BACKEND_API]);

  // Join Room Function
  const joinRoom = async () => {
    if (!user || !roomId || !BACKEND_API) {
      console.error("Cannot join room: Missing user, roomId, or backend API URL.");
      alert("Cannot join room. Please ensure you are logged in and a room is selected.");
      return;
    }

    // Start local stream first
    const stream = await startLocalStream();
    if (!stream) {
        console.error("Failed to start local stream. Cannot join room.");
        return; // Don't proceed if stream failed
    }

    try {
      // Join room API call (optional, depending on whether backend needs this explicitly)
      await axios.post(
        `${BACKEND_API}/api/conference/join/${roomId}`,
        { userId: user.id }, // Send user ID if needed by backend logic
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      // Emit join-room via Socket.IO *after* local stream is ready
      socketRef.current.emit("join-room", { roomId, userId: user.id });
      setIsJoined(true);
      console.log("Successfully joined room and emitted join-room event");

    } catch (error) {
      console.error("Error joining room via API:", error);
      alert("Failed to join the room. Please try again.");
       // Stop stream if join failed? Maybe not, let user retry?
      // if (stream) stream.getTracks().forEach(track => track.stop());
      // setLocalStream(null);
    }
  };

  if (!roomDetails) {
    return <View style={styles.container}><Text>Loading room details...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Room: {roomDetails.title}</Text>
      <Text style={styles.subtitle}>Host: {roomDetails.host ? roomDetails.host.email : "Unknown"}</Text>
      {/* <Text style={styles.subtitle}>Participants: {roomDetails.participants.length}</Text> */} 
      {/* Participant count might be better derived from remoteStreams + local user */} 

      {/* Video Views */} 
      <View style={styles.videoContainer}>
        {localStream && (
          <View style={styles.localVideoWrapper}>
            <Text>Your Video</Text>
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localVideo}
              objectFit={'cover'}
              mirror={true} // Mirror local video
            />
          </View>
        )}
        {Object.entries(remoteStreams).map(([socketId, stream]) => (
          <View key={socketId} style={styles.remoteVideoWrapper}>
             <Text>Remote User ({socketId.substring(0, 6)})</Text>
            <RTCView
              streamURL={stream.toURL()}
              style={styles.remoteVideo}
              objectFit={'cover'}
            />
          </View>
        ))}
      </View>

      {!isJoined ? (
        <TouchableOpacity style={styles.button} onPress={joinRoom}>
          <Text style={styles.buttonText}>Join Room & Start Video</Text>
        </TouchableOpacity>
      ) : (
         <Text style={styles.info}>You are in the video call.</Text>
         // Add buttons for mute, hang up, etc. here
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#6200ea",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  info: {
    fontSize: 16,
    marginTop: 15,
    textAlign: "center",
    color: "green",
  },
  videoContainer: {
    flex: 1, // Take remaining space
    flexDirection: 'row', // Arrange videos side-by-side (or column)
    flexWrap: 'wrap', // Allow wrapping
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    padding: 5,
  },
  localVideoWrapper: {
    width: '48%', // Adjust width as needed
    aspectRatio: 1, // Maintain aspect ratio (e.g., 1 for square, 16/9 for widescreen)
    margin: '1%',
    backgroundColor: 'black',
    justifyContent: 'center', // Center placeholder text
    alignItems: 'center', // Center placeholder text
  },
   remoteVideoWrapper: {
    width: '48%', // Adjust width as needed
    aspectRatio: 1, // Maintain aspect ratio
    margin: '1%',
    backgroundColor: 'black',
     justifyContent: 'center', // Center placeholder text
    alignItems: 'center', // Center placeholder text
  },
  localVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  remoteVideo: {
     flex: 1,
    width: '100%',
    height: '100%',
  },
});
