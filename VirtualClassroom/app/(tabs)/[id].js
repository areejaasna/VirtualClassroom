import React, { useEffect, useState, useRef } from "react-native";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, PermissionsAndroid, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSelector } from "react-redux";
import axios from "axios";
import Constants from 'expo-constants';

// Import Daily.co SDK
import Daily from '@daily-co/react-native-daily-js'; // Make sure you have installed @daily-co/react-native-daily-js

const { BACKEND_API } = Constants.expoConfig?.extra ?? {};

export default function Room() {
  const router = useRouter();
  const { id: routeRoomId } = useLocalSearchParams();
  const user = useSelector((state) => state.auth.user);

  const [roomDetails, setRoomDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState(null);

  // Daily.co State
  const callObject = useRef(null);
  // State to hold remote participants (Daily.co participant objects)
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  // State to hold local participant (Daily.co participant object)
  const [localParticipant, setLocalParticipant] = useState(null);


  // --- Effect for fetching room details and setting up Daily.co ----
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
      } catch (err) {
        const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
        console.error("Error fetching room details:", errorMsg);
        setError(`Failed to load room details. ${err.response?.status === 404 ? 'Room not found.' : 'Please try again.'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomDetails();

    // --- Daily.co Initialization ---
    // We will create the call object when the component mounts
    callObject.current = Daily.createCallObject();

    // Set up Daily.co event handlers
    const CO = callObject.current;

    const handleJoinedMeeting = (event) => {
        console.log('Daily event: joined-meeting', event);
        setIsJoined(true);
        setLocalParticipant(event.participants.local);
        // Initialize remote participants from the event
        const initialRemoteParticipants = Object.values(event.participants).filter(p => !p.local);
        setRemoteParticipants(initialRemoteParticipants);
    };

    const handleParticipantJoined = (event) => {
        console.log('Daily event: participant-joined', event);
        setRemoteParticipants(prevParticipants => [...prevParticipants, event.participant]);
    };

    const handleParticipantLeft = (event) => {
        console.log('Daily event: participant-left', event);
        setRemoteParticipants(prevParticipants => prevParticipants.filter(p => p.session_id !== event.participant.session_id));
    };

    const handleParticipantUpdated = (event) => {
         console.log('Daily event: participant-updated', event);
         // Update the participant in the state
         setRemoteParticipants(prevParticipants =>
             prevParticipants.map(p =>
                 p.session_id === event.participant.session_id ? event.participant : p
             )
         );
         if (event.participant.local) {
             setLocalParticipant(event.participant);
         }
     };


    const handleError = (event) => {
        console.error('Daily event: error', event);
        setError(`Daily.co Error: ${event.errorMsg}`);
        // Depending on the error, you might want to leave the room or show an error message
        // callObject.current?.leave();
        // setIsJoined(false);
    };

    // Add event listeners
    CO.on('joined-meeting', handleJoinedMeeting);
    CO.on('participant-joined', handleParticipantJoined);
    CO.on('participant-left', handleParticipantLeft);
    CO.on('participant-updated', handleParticipantUpdated); // Listen for track changes, etc.
    CO.on('error', handleError);
    // Add more listeners as needed (e.g., 'camera-error', 'microphone-error')


    console.log("Daily.co call object created and listeners set.");

    // Cleanup: Leave the Daily.co room and destroy the call object
    return () => {
        console.log("Cleaning up Daily.co call object.");
        CO.leave(); // Attempt to leave gracefully
        CO.destroy();
        callObject.current = null;
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
                 Alert.alert("Permissions Error", "An error occurred while requesting permissions." , err.message);
                 return false;
            }
        }
        return true; // Permissions not needed this way for iOS
    };

  const joinRoom = async () => {
    // Check if callObject is initialized
    if (!user || !user.id || !user.token || !routeRoomId || !BACKEND_API || !callObject.current) {
      Alert.alert("Error", "Cannot join room. Missing required information or Daily.co call object not initialized.");
      return;
    }

     // Request permissions before joining
     const hasPermissions = await requestPermissions();
     if (!hasPermissions) {
         return;
     }

    try {
      console.log(`User ${user.id} attempting to join backend room ${routeRoomId}`);
      // API call to backend to register user in the room and get Daily.co room information
      const response = await axios.post(
        `${BACKEND_API}api/conference/join/${routeRoomId}`,
        { userId: user.id },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      console.log(`User ${user.id} successfully joined backend room ${routeRoomId}. Attempting to join Daily.co channel.`);

      // --- Join Daily.co channel after successful backend join ---
      // You need to get the Daily.co room URL from the backend response.
      // Assuming the backend response includes a field like `dailyRoomUrl`
      const dailyRoomUrl = response.data?.dailyRoomUrl; // <-- **You need to update your backend to return this**

      if (!dailyRoomUrl) {
          console.error("Daily.co room URL not received from backend.");
          setError("Failed to get Daily.co room information from backend.");
          Alert.alert("Error", "Failed to get Daily.co room information from backend.");
          return;
      }

      // Join the Daily.co meeting
      await callObject.current.join({ url: dailyRoomUrl });

      // setIsJoined is set in the 'joined-meeting' event listener

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
         if (callObject.current) {
            try {
                await callObject.current.leave();
                console.log("Left Daily.co channel.");
            } catch (e) {
                console.error("Error leaving Daily.co channel:", e);
            }
         }
         setRemoteParticipants([]); // Clear remote users on leaving
         setLocalParticipant(null);
         setIsJoined(false);
         // Optionally notify backend that user left the room
         // axios.post(`${BACKEND_API}api/conference/leave/${routeRoomId}`, { userId: user.id }, { headers: { Authorization: `Bearer ${user.token}` } });
         router.back(); // Navigate back
    };

    const toggleCamera = async () => {
        if (callObject.current) {
            const participant = callObject.current.participants().local;
            const currentCameraState = participant?.videoTrack?.state;
            const isCameraOff = currentCameraState === 'off' || !participant?.videoTrack;
            await callObject.current.setLocalVideo(isCameraOff);
            console.log("Camera toggled.");
        }
    };

    const toggleMic = async () => {
         if (callObject.current) {
             const participant = callObject.current.participants().local;
             const currentMicState = participant?.audioTrack?.state;
             const isMicMuted = currentMicState === 'off' || !participant?.audioTrack;
             await callObject.current.setLocalAudio(isMicMuted);
             console.log("Microphone toggled.");
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
                     {/* TODO: Replace with Daily.co local video rendering component */}
                     {/* Example: <DailyMediaView callObject={callObject.current} sessionId="local" style={styles.localVideo} /> */}
                    {localParticipant?.videoTrack && (
                         // You might need a custom component or a component from @daily-co/react-native-daily-js
                         // that takes the video track or participant object to render the video.
                         // <DailyVideoRenderer participant={localParticipant} style={styles.localVideo} />
                         <View style={{flex: 1, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center'}}>
                            <Text>Local Video Feed Here</Text>
                            {/* Integrate DailyMediaView or equivalent */}
                         </View>
                     )}
               </View>

              {/* Remote Videos */}
              <ScrollView horizontal style={styles.remoteVideosScrollView}>
                  {remoteParticipants.map(participant => (
                      <View key={participant.session_id} style={styles.remoteVideoContainer}>
                           <Text style={styles.videoLabel}>
                               {participant.user_name || `Remote User ${participant.session_id.substring(0, 4)}...`}
                           </Text>
                           {/* TODO: Replace with Daily.co remote video rendering component */}
                            {participant.videoTrack && (
                                // You might need a custom component or a component from @daily-co/react-native-daily-js
                                // that takes the video track or participant object to render the video.
                                // <DailyVideoRenderer participant={participant} style={styles.remoteVideo} />
                                <View style={{flex: 1, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center'}}>
                                    <Text>Remote Video Feed Here</Text>
                                    {/* Integrate DailyMediaView or equivalent */}
                                </View>
                            )}
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
