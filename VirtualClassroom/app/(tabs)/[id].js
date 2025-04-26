import React, { useEffect, useState, useMemo, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, PermissionsAndroid, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSelector } from "react-redux";
import axios from "axios";
// import io from "socket.io-client"; // Socket.IO might still be needed for other room management, but not WebRTC signaling now
import Constants from 'expo-constants';

import RtcEngine, { AgoraVideoView, ChannelProfile, ClientRole } from 'react-native-agora';

// You will need your Agora App ID
const { AGORA_APP_ID } = Constants.expoConfig?.extra ?? {};

export default function Room() {
  const { BACKEND_API } = Constants.expoConfig?.extra ?? {};
  const router = useRouter();
  const { id: routeRoomId } = useLocalSearchParams();
  const user = useSelector((state) => state.auth.user);

  const [roomDetails, setRoomDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState(null);

  // Agora State
  const engine = useRef<RtcEngine | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]); // UIDs of remote users
  const [localUid, setLocalUid] = useState<number>(0); // Local user's UID

  // --- Effect for fetching room details and setting up Agora ----
  useEffect(() => {
    if (!routeRoomId || !user || !user.token || !BACKEND_API) {
      if (!routeRoomId) console.error("Room ID missing from route parameters.");
      if (!user || !user.token) Alert.alert("Authentication Error", "User data not found. Please log in again.");
      if (!BACKEND_API) console.error("Backend API URL is not configured.");
      setError("Cannot load room due to missing information.");
      setIsLoading(false);
      return;
    }
     if (!AGORA_APP_ID) {
         console.error("Agora App ID is not configured in app.config.js");
         setError("Agora configuration error.");
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
        // Check if current user is already in participants list (optional, depends on your backend logic)
        if (response.data?.participants?.some(p => p === user.id || p?._id === user.id)) {
            // If already joined via backend, might automatically join Agora channel too
             // This needs careful handling to avoid joining Agora without API confirmation
            // For now, joining Agora is triggered by the `joinRoom` button.
             // setIsJoined(true);
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

    // --- Agora Initialization ---
    const initAgora = async () => {
        try {
            engine.current = await RtcEngine.create(AGORA_APP_ID);
            await engine.current.enableVideo();
             await engine.current.setChannelProfile(ChannelProfile.LiveBroadcasting);
             await engine.current.setClientRole(ClientRole.Broadcaster);

            // Set up event handlers
            engine.current.addListener('JoinChannelSuccess', (channel, uid, elapsed) => {
                console.log('JoinChannelSuccess', channel, uid, elapsed);
                setLocalUid(uid);
                setIsJoined(true);
            });

            engine.current.addListener('UserJoined', (uid, elapsed) => {
                console.log('UserJoined', uid, elapsed);
                setRemoteUsers(prevUsers => [...prevUsers, uid]);
            });

            engine.current.addListener('UserOffline', (uid, reason) => {
                console.log('UserOffline', uid, reason);
                setRemoteUsers(prevUsers => prevUsers.filter(userUid => userUid !== uid));
            });

             engine.current.addListener('Error', (err) => {
                 console.error('Agora Error:', err);
                 setError(`Agora Error: ${err}`);
             });

             console.log("Agora engine initialized.");

        } catch (e) {
            console.error("Failed to initialize Agora:", e);
             setError("Failed to initialize video conferencing. Please try again.");
        }
    };

     // Initialize Agora when the component mounts
     initAgora();

    // Cleanup: Destroy Agora engine when component unmounts
    return () => {
        console.log("Cleaning up Agora engine.");
        engine.current?.destroy();
         engine.current = null;
    };

  }, [routeRoomId, user?.token, user?.id, BACKEND_API]); // Re-run effect if these dependencies change

   // --- Permissions Request (for Android) ---
    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.requestMultiple(
                    [
                        PermissionsAndroid.PERMISSIONS.CAMERA,
                        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    ]
                );
                 if (
                     granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.results.GRANTED &&
                     granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.results.GRANTED
                 ) {
                     console.log("Camera and microphone permissions granted.");
                     return true;
                 } else {
                     console.log("Camera or microphone permissions denied.");
                     Alert.alert("Permissions Required", "Camera and microphone access are needed for video conferencing.");
                     return false;
                 }
            } catch (err) {
                console.warn(err);
                 Alert.alert("Permissions Error", "An error occurred while requesting permissions.");
                 return false;
            }
        }
        return true; // Permissions not needed this way for iOS
    };

  const joinRoom = async () => {
    if (!user || !user.id || !user.token || !routeRoomId || !BACKEND_API || !engine.current) {
      Alert.alert("Error", "Cannot join room. Missing required information or Agora engine not initialized.");
      return;
    }

     // Request permissions before joining
     const hasPermissions = await requestPermissions();
     if (!hasPermissions) {
         return;
     }

    try {
      console.log(`User ${user.id} attempting to join backend room ${routeRoomId}`);
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

      console.log(`User ${user.id} successfully joined backend room ${routeRoomId}. Attempting to join Agora channel.`);

      // Join Agora channel after successful backend join
       // For a production app, you should fetch an Agora token from your backend here
       const agoraToken = null; // Replace with token fetched from backend
       const agoraUid = 0; // Use 0 for Agora to assign a UID, or fetch a specific UID from backend

      await engine.current.joinChannel(agoraToken, routeRoomId, null, agoraUid);

      // setIsJoined(true); // This is set in the JoinChannelSuccess listener now

      Alert.alert("Success", "Attempting to join video channel..."); // Provide feedback to user

    } catch (err) {
      const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error("Error joining room:", errorMsg);
      setError(`Failed to join room: ${err.response?.data?.message || 'Please try again.'}`);
      Alert.alert("Error", `Failed to join room: ${err.response?.data?.message || 'Please try again.'}`);
    }
  };

    const leaveRoom = async () => {
        console.log("Leaving room...");
         if (engine.current) {
            try {
                await engine.current.leaveChannel();
                console.log("Left Agora channel.");
            } catch (e) {
                console.error("Error leaving Agora channel:", e);
            }
         }
         setRemoteUsers([]); // Clear remote users on leaving
         setIsJoined(false);
         // Optionally notify backend that user left the room
         // axios.post(`${BACKEND_API}api/conference/leave/${routeRoomId}`, { userId: user.id }, { headers: { Authorization: `Bearer ${user.token}` } });
         router.back(); // Navigate back
    };

    const toggleCamera = async () => {
        if (engine.current) {
            // Toggle the state of the local video stream
            const isEnabled = (await engine.current.enableLocalVideo(false)).result; // Check current state
            await engine.current.enableLocalVideo(!isEnabled); // Toggle
            console.log("Camera toggled.", !isEnabled);
        }
    };

    const toggleMic = async () => {
         if (engine.current) {
            // Toggle the state of the local audio stream
             const isMuted = (await engine.current.muteLocalAudioStream(true)).result; // Check current state
             await engine.current.muteLocalAudioStream(!isMuted); // Toggle
             console.log("Microphone toggled.", !isMuted);
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
               <View style={styles.localVideoContainer}>
                     <Text style={styles.videoLabel}>You</Text>
                     <AgoraVideoView style={styles.localVideo} showLocalVideo={true} zOrderMediaOverlay={true} />
               </View>

              {/* Remote Videos */}
              <ScrollView horizontal style={styles.remoteVideosScrollView}>
                  {remoteUsers.map(uid => (
                      <View key={uid} style={styles.remoteVideoContainer}>
                           <Text style={styles.videoLabel}>
                               Remote User {uid}
                           </Text>
                           <AgoraVideoView style={styles.remoteVideo} remoteUid={uid} zOrderMediaOverlay={true} />
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
