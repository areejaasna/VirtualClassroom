import React, { useEffect, useState, useMemo, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSelector } from "react-redux";
import axios from "axios";
import io from "socket.io-client";
import Constants from 'expo-constants';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
  RTCView, // Import RTCView
} from 'react-native-webrtc';

// STUN server configuration (You might want to use a TURN server for more robust connections)
const configuration = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
  ],
};

export default function Room() {
  const { BACKEND_API } = Constants.expoConfig?.extra ?? {};
  const router = useRouter();
  const { id: routeRoomId } = useLocalSearchParams();
  const user = useSelector((state) => state.auth.user);

  const [roomDetails, setRoomDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState(null);

  // WebRTC state
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // { [socketId]: MediaStream }
  const peerConnections = useRef({}); // { [socketId]: RTCPeerConnection }
  const localStreamRef = useRef(localStream); // Ref to hold the latest localStream

  // Use a memoized socket instance
  const socket = useMemo(() => {
      if (!BACKEND_API) return null;
      return io(BACKEND_API, { transports: ['websocket'] });
  }, [BACKEND_API]);

  // Update localStreamRef whenever localStream changes
  useEffect(() => {
      localStreamRef.current = localStream;
  }, [localStream]);

  // --- Effect for fetching room details and setting up socket ----
  useEffect(() => {
    if (!routeRoomId || !user || !user.token || !BACKEND_API) {
      if (!routeRoomId) console.error("Room ID missing from route parameters.");
      if (!user || !user.token) Alert.alert("Authentication Error", "User data not found. Please log in again.");
      if (!BACKEND_API) console.error("Backend API URL is not configured.");
      setError("Cannot load room due to missing information.");
      setIsLoading(false);
      return;
    }

    const fetchRoomDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${BACKEND_API}api/conference/rooms/${routeRoomId}`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });
        setRoomDetails(response.data);
        if (response.data?.participants?.some(p => p === user.id || p?._id === user.id)) {
            setIsJoined(true);
        }
      } catch (err) {
        const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
        console.error("Error fetching room details:", errorMsg);
        setError(`Failed to load room details. ${err.response?.status === 404 ? 'Room not found.' : 'Please try again.'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomDetails();

    // --- Socket Logic ---
    if(socket) {
      socket.connect();

      socket.on("connect", () => {
          console.log("Socket connected: ", socket.id);
          // Join the room automatically if already 'joined' via backend or on connect
          if (isJoined) {
              socket.emit("join-webrtc-room", { roomId: routeRoomId, userId: user.id });
          }
      });

      socket.on("user-joined", async (data) => {
        console.log(`User ${data.userId} joined the room. Creating offer...`);
        // A new user joined, initiate a call by creating an offer
        createPeerConnection(data.socketId, true); // true to create offer
      });

      socket.on("offer", async (data) => {
        console.log(`Received offer from \${data.socketId}`);
        // Received an offer, create an answer
        createPeerConnection(data.socketId, false); // false to not create offer initially
        const pc = peerConnections.current[data.socketId];
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { socketId: data.socketId, sdp: pc.localDescription, roomId: routeRoomId });
      });

      socket.on("answer", async (data) => {
        console.log(`Received answer from \${data.socketId}`);
        // Received an answer, set remote description
        const pc = peerConnections.current[data.socketId];
        if (pc && pc.remoteDescription === null) {
           await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } else {
            console.warn("Peer connection or remote description not ready for answer.", data.socketId);
        }
      });

      socket.on("candidate", async (data) => {
        console.log(`Received ICE candidate from ${data.socketId}`);
        // Received an ICE candidate, add it to the peer connection
        const pc = peerConnections.current[data.socketId];
         if (pc) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (e) {
                console.error("Error adding received ICE candidate:", e);
            }
         } else {
             console.warn("Peer connection not found for candidate.", data.socketId);
         }
      });

      socket.on("user-left", (data) => {
        console.log(`User ${data.socketId} left the room.`);
        // A user left, close their peer connection and remove their stream
        closePeerConnection(data.socketId);
      });

       socket.on("webrtc-users-in-room", async (data) => {
           console.log("WebRTC users in room:", data.users);
            // For users already in the room when you join, create offers for them
            for (const userId in data.users) {
                if (userId !== user.id) { // Don't connect to self
                    createPeerConnection(data.users[userId].socketId, true); // true to create offer
                }
            }
       });

      // Cleanup: disconnect socket and close peer connections
      return () => {
        console.log("Cleaning up room effect:", routeRoomId);
        if (socket) {
            socket.emit('leave-webrtc-room', { roomId: routeRoomId, userId: user.id }); // Notify backend
            socket.disconnect();
        }
        // Close all peer connections
        for (const socketId in peerConnections.current) {
            closePeerConnection(socketId);
        }
         setRemoteStreams({});
         setLocalStream(null);
      };
    } else {
        console.warn("Socket not initialized due to missing BACKEND_API");
    }
  }, [routeRoomId, user?.token, user?.id, socket, isJoined]); // Added socket and isJoined to dependency array

    // --- Effect for getting local media stream ---
    useEffect(() => {
        let stream = null;
        const getLocalStream = async () => {
            try {
                 stream = await mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                setLocalStream(stream);
                 console.log("Local stream obtained.");
            } catch (e) {
                console.error("Error getting local stream:", e);
                 Alert.alert("Permissions Error", "Failed to get camera/microphone access.");
            }
        };

        if (!localStream) {
           getLocalStream();
        }

        return () => {
            // Stop all tracks on cleanup
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };

    }, [localStream]); // Rerun if localStream is null


  const createPeerConnection = (socketId, isOfferCreator) => {
    if (peerConnections.current[socketId]) {
        console.log("Peer connection already exists for", socketId);
        return peerConnections.current[socketId];
    }
    console.log("Creating peer connection for", socketId);
    const pc = new RTCPeerConnection(configuration);

    // Add local stream tracks to the peer connection
    if (localStreamRef.current) {
       localStreamRef.current.getTracks().forEach(track => {
           pc.addTrack(track, localStreamRef.current);
           console.log("Added local track to peer connection.", track.kind);
       });
    } else {
        console.warn("Local stream not available when creating peer connection.");
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Generated ICE candidate.", event.candidate);
        // Send ICE candidates to the remote peer via socket
        socket.emit("candidate", { socketId: socketId, candidate: event.candidate, roomId: routeRoomId });
      }
    };

    pc.ontrack = (event) => {
        console.log("Track received from remote peer.", event.streams);
         // event.streams is an array of MediaStream objects
        setRemoteStreams(prev => ({
            ...prev,
            [socketId]: event.streams[0] // Assuming one stream per peer
        }));
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${socketId}: ${pc.iceConnectionState}`);
    };

     pc.onconnectionstatechange = () => {
         console.log(`Connection state for ${socketId}: ${pc.connectionState}`);
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
               console.log(`Connection closed for ${socketId}. Cleaning up.`);
               closePeerConnection(socketId);
           }
     };

     pc.onsignalingstatechange = () => {
        console.log(`Signaling state for ${socketId}: ${pc.signalingState}`);
     };

    peerConnections.current[socketId] = pc;

    if (isOfferCreator) {
      // If this instance is initiating the call, create an offer
      createOffer(socketId);
    }

     return pc;
  };

  const createOffer = async (socketId) => {
    console.log("Creating offer for", socketId);
    const pc = peerConnections.current[socketId];
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
       console.log("Sending offer to", socketId);
      socket.emit("offer", { socketId: socketId, sdp: pc.localDescription, roomId: routeRoomId });
    } catch (e) {
      console.error("Error creating offer:", e);
    }
  };

   const closePeerConnection = (socketId) => {
        const pc = peerConnections.current[socketId];
        if (pc) {
            console.log("Closing peer connection for", socketId);
            pc.close();
            delete peerConnections.current[socketId];
            // Remove the remote stream for this peer
            setRemoteStreams(prev => {
                const newStreams = { ...prev };
                delete newStreams[socketId];
                return newStreams;
            });
        }
   };

  const joinRoom = async () => {
    if (!user || !user.id || !user.token || !routeRoomId || !BACKEND_API) {
      Alert.alert("Error", "Cannot join room. Missing required information.");
      return;
    }
     if (!socket || !socket.connected) {
         Alert.alert("Error", "Socket not connected. Please check your network.");
         return;
     }

    try {
      console.log(`User ${user.id} attempting to join room ${routeRoomId}`);
      // API call to backend to register user in the room
      await axios.post(
        `${BACKEND_API}api/conference/join/${routeRoomId}`,
        { userId: user.id },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      // Emit socket event AFTER successful API call to join the WebRTC room
      socket.emit("join-webrtc-room", { roomId: routeRoomId, userId: user.id });
      console.log(`User ${user.id} successfully joined backend room ${routeRoomId} and emitted socket event`);
      setIsJoined(true);

      // Optimistically update participants list (optional)
      setRoomDetails(prev => prev ? ({...prev, participants: [...prev.participants, user.id]}) : null);
      // Alert.alert("Success", "You have joined the room."); // Avoid alert on successful join for smoother UX

    } catch (err) {
      const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error("Error joining room:", errorMsg);
      Alert.alert("Error", `Failed to join room: ${err.response?.data?.message || 'Please try again.'}`);
    }
  };

    const leaveRoom = () => {
        console.log("Leaving room...");
         if (socket) {
            socket.emit('leave-webrtc-room', { roomId: routeRoomId, userId: user.id }); // Notify backend/other peers
             // The cleanup effect will handle closing connections and socket disconnect
         }
         router.back(); // Navigate back after initiating leave
    };

    const toggleCamera = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
        }
    };

    const toggleMic = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
        }
    };

  // --- Render States ---
  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" /><Text>Loading Room...</Text></View>;
  }

  if (error) {
    return <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>;
  }

  if (!roomDetails) {
    return <View style={styles.centered}><Text>Room details not available.</Text></View>;
  }

  // --- Main Room View ---Rendering video components
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Room: {roomDetails.title}</Text>
      {isJoined ? (
          <View style={styles.videoContainer}>
              {/* Local Video */}
              {localStream && (
                  <View style={styles.localVideoContainer}>
                       <Text style={styles.videoLabel}>You</Text>
                      <RTCView
                          streamURL={localStream.toURL()}
                          style={styles.localVideo}
                          objectFit={'cover'}
                          mirror={true} // Mirror local video
                      />
                  </View>
              )}

              {/* Remote Videos */}
              <ScrollView horizontal style={styles.remoteVideosScrollView}>
                  {Object.keys(remoteStreams).map(socketId => (
                      <View key={socketId} style={styles.remoteVideoContainer}>
                           {/* You might want to display remote user's name based on socketId/userId mapping */}
                           <Text style={styles.videoLabel}>Remote User ({socketId.substring(0, 4)}...)</Text>
                           <RTCView
                              streamURL={remoteStreams[socketId].toURL()}
                              style={styles.remoteVideo}
                              objectFit={'cover'}
                          />
                      </View>
                  ))}
              </ScrollView>

              {/* Controls */}
              <View style={styles.controlsContainer}>
                  <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
                      <Text style={styles.buttonText}>Toggle Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.controlButton} onPress={toggleMic}>
                      <Text style={styles.buttonText}>Toggle Mic</Text>
                  </TouchableOpacity>
                   <TouchableOpacity style={[styles.controlButton, styles.leaveButton]} onPress={leaveRoom}>
                      <Text style={styles.buttonText}>Leave Room</Text>
                  </TouchableOpacity>
              </View>

          </View>
      ) : (
        <TouchableOpacity style={styles.button} onPress={joinRoom}>
          <Text style={styles.buttonText}>Join Room</Text>
        </TouchableOpacity>
      )}

      {/* Add button to go back - maybe remove this if joinRoom handles navigation */}
       {!isJoined && (
           <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
       )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    flex: 1,
    padding: 10, // Adjusted padding
    paddingTop: 40,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20, // Adjusted margin bottom
  },
  subtitle: {
    fontSize: 18,
    marginTop: 10,
    textAlign: "center",
    color: '#555',
  },
  button: {
    backgroundColor: "#6200ea",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 30,
    marginHorizontal: 40,
  },
   backButton: {
    backgroundColor: "#757575",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
    marginHorizontal: 40,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  info: {
    fontSize: 18,
    marginTop: 30,
    textAlign: "center",
    color: "green",
    fontWeight: 'bold',
  },
   errorText: {
       color: 'red',
       fontSize: 16,
       textAlign: 'center',
   },
    videoContainer: {
        flex: 1, // Take available space
        justifyContent: 'center', // Center videos vertically
        alignItems: 'center', // Center videos horizontally
        marginTop: 20,
    },
    localVideoContainer: {
        width: '90%', // Adjust as needed
        aspectRatio: 16/9, // Common video aspect ratio
        backgroundColor: '#000',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 10,
        position: 'relative',
    },
    localVideo: {
        width: '100%',
        height: '100%',
    },
    remoteVideosScrollView: {
        width: '100%',
        marginBottom: 10,
    },
    remoteVideoContainer: {
        width: 200, // Fixed width for remote videos in horizontal scroll
        height: 150, // Fixed height
        backgroundColor: '#000',
        borderRadius: 8,
        overflow: 'hidden',
        marginRight: 10, // Space between videos
        position: 'relative',
    },
     remoteVideo: {
        width: '100%',
        height: '100%',
     },
    videoLabel: {
        position: 'absolute',
        top: 5,
        left: 5,
        backgroundColor: 'rgba(0,0,0,0.5)',
        color: '#fff',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 4,
        zIndex: 1, // Ensure label is above video
        fontSize: 12,
    },
    controlsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: 10,
        paddingHorizontal: 20,
    },
    controlButton: {
        backgroundColor: "#007bff", // Control button color
        padding: 10,
        borderRadius: 5,
         flex: 1, // Distribute space evenly
         marginHorizontal: 5, // Space between buttons
        alignItems: "center",
    },
     leaveButton: {
         backgroundColor: '#dc3545', // Red color for leave button
     }
});
