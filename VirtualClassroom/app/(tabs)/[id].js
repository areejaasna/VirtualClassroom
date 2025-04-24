import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  ScrollView, // Use ScrollView for dynamic content
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSelector } from "react-redux";
import axios from "axios";
import Constants from 'expo-constants';
import RtcEngine, { // Import Agora RtcEngine
  RtcLocalView, // View for local video
  RtcRemoteView, // View for remote video
  VideoRenderMode, // Render mode options
  ChannelProfile, // Channel profile options
  ClientRole, // Client role options
} from 'react-native-agora';

export default function Room() {
  const { BACKEND_API, AGORA_APP_ID } = Constants.expoConfig.extra;
  const router = useRouter();
  const { id: roomId } = useLocalSearchParams(); // Get roomId from route params
  const [roomDetails, setRoomDetails] = useState(null);
  const user = useSelector((state) => state.auth.user); // Get user data

  const engine = useRef(null); // Agora engine instance
  const [isJoined, setIsJoined] = useState(false); // Track if user has joined the Agora channel
  const [peerIds, setPeerIds] = useState([]); // Array of remote user IDs (UIDs) in the channel
  const [localUid, setLocalUid] = useState(0); // UID for the local user (set dynamically or keep 0)

  // --- Permission Handling ---
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.CAMERA,
        ]);
        console.log('Permissions grants:', grants);
        if (
          grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED &&
          grants[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED
        ) {
          console.log('Permissions granted');
          return true;
        } else {
          console.log('Permissions denied');
          Alert.alert("Permissions Required", "Camera and Microphone permissions are needed for video calls.");
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else if (Platform.OS === 'ios') {
      // iOS permissions are typically requested automatically by the library when needed
      // You might need Info.plist entries (NSCameraUsageDescription, NSMicrophoneUsageDescription)
      console.log("iOS permissions requested implicitly by Agora SDK.");
      return true;
    }
    return false;
  };

  // --- Agora Engine Initialization and Event Handling ---
  const initAgora = async () => {
    if (!AGORA_APP_ID) {
      Alert.alert("Configuration Error", "Agora App ID is missing. Please configure it.");
      console.error("Agora App ID not found in Constants");
      return;
    }
    console.log("Initializing Agora with App ID:", AGORA_APP_ID);
    try {
      engine.current = await RtcEngine.create(AGORA_APP_ID);
      console.log("Agora Engine created");

      // Enable video and audio
      await engine.current.enableVideo();
      await engine.current.enableAudio();

      // Set channel profile to communication (1-on-1 or group call)
      await engine.current.setChannelProfile(ChannelProfile.Communication);

      // --- Register Event Listeners ---
      engine.current.addListener('JoinChannelSuccess', (channel, uid, elapsed) => {
        console.log(`Successfully joined channel ${channel} with uid ${uid}`);
        setIsJoined(true);
        setLocalUid(uid); // Store the assigned UID
      });

      engine.current.addListener('UserJoined', (uid, elapsed) => {
        console.log(`Remote user joined with uid ${uid}`);
        // Add remote user ID to state if not already present
        if (peerIds.indexOf(uid) === -1) {
           setPeerIds((prevPeerIds) => [...prevPeerIds, uid]);
        }
      });

      engine.current.addListener('UserOffline', (uid, reason) => {
        console.log(`Remote user offline uid ${uid}, reason ${reason}`);
        // Remove remote user ID from state
        setPeerIds((prevPeerIds) => prevPeerIds.filter((id) => id !== uid));
      });

       engine.current.addListener('LeaveChannel', (stats) => {
        console.log('Left channel successfully', stats);
        setIsJoined(false);
        setPeerIds([]);
        setLocalUid(0);
      });

       engine.current.addListener('Error', (err) => {
        console.error('Agora Engine Error:', err);
        // Handle specific errors if needed
        // Example: Token expired error code might require fetching a new token
      });

    } catch (e) {
      console.error('Error initializing Agora:', e);
      Alert.alert("Agora Error", "Failed to initialize video call engine.");
    }
  };

  // --- Join and Leave Channel Logic ---
  const joinChannel = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    if (!engine.current) {
      await initAgora(); // Initialize if not already done
    }

    if (!engine.current) {
        console.error("Agora engine failed to initialize. Cannot join channel.");
        Alert.alert("Error", "Video call engine could not be initialized.");
        return;
    }

    // --- Call backend to update participant list (optional but good practice) ---
     if (user && roomId && BACKEND_API) {
        try {
            // Use user.id or generate a unique ID if needed for Agora UID
            // For simplicity, Agora can assign a UID (pass 0)
            await axios.post(
                `${BACKEND_API}/api/conference/join/${roomId}`,
                { userId: user.id }, // Send user ID for DB tracking
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            console.log("Updated backend participant list.");
        } catch (error) {
            console.error("Error updating backend participant list:", error);
            // Decide if this should prevent joining the Agora channel
            // Alert.alert("Backend Error", "Could not register participation with server.");
        }
    }
    // --- End backend call ---

    // Join Agora Channel
    // Use the MongoDB room ID as the channel name
    // Pass 0 as UID for Agora to assign one, or use a specific user ID (e.g., user.id converted to int)
    // Token is null for App ID authentication (simplest), or provide the token generated by backend
    console.log(`Attempting to join Agora channel: ${roomId}`);
    await engine.current?.joinChannel(null, roomId, 0); // Token = null, Channel = roomId, UID = 0 (auto-assign)
    // Make user a broadcaster to send video/audio
    await engine.current?.setClientRole(ClientRole.Broadcaster);
  };

  const leaveChannel = async () => {
    console.log("Leaving Agora channel...");
    await engine.current?.leaveChannel();
    // Backend update for leaving can be added here if needed
  };

  // --- Fetch Room Details Effect ---
  useEffect(() => {
    if (!user || !roomId || !BACKEND_API) return;

    const fetchRoomDetails = async () => {
      try {
        const response = await axios.get(`${BACKEND_API}/api/conference/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setRoomDetails(response.data);
        console.log("Fetched room details:", response.data.title);
      } catch (error) {
        console.error("Error fetching room details:", error);
        Alert.alert("Error", "Could not load room details.");
        router.back(); // Go back if room details fail
      }
    };

    fetchRoomDetails();
  }, [roomId, user, BACKEND_API]); // Dependencies for fetching room details

  // --- Component Lifecycle: Init and Cleanup ---
  useEffect(() => {
    // Initialize Agora when component mounts (or when ready)
    // initAgora(); // Consider initializing only when user clicks join?

    // Cleanup function
    return () => {
      console.log("Cleaning up Room component (Agora)");
      engine.current?.destroy(); // Destroy engine instance on unmount
    };
  }, []); // Empty dependency array means this runs once on mount and cleanup on unmount

  // --- Render Logic ---
  if (!roomDetails) {
    return <View style={styles.container}><Text>Loading room details...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Room: {roomDetails.title}</Text>
      <Text style={styles.subtitle}>Host: {roomDetails.host ? roomDetails.host.email : "Unknown"}</Text>

      {/* Button to Join/Leave */} 
      {!isJoined ? (
        <TouchableOpacity style={styles.button} onPress={joinChannel}>
          <Text style={styles.buttonText}>Join Video Call</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.button, styles.leaveButton]} onPress={leaveChannel}>
          <Text style={styles.buttonText}>Leave Video Call</Text>
        </TouchableOpacity>
      )}

      {/* Video Views Area */} 
      {isJoined && (
        <ScrollView contentContainerStyle={styles.videoContainer}>
          {/* Local Video */} 
          <Text style={styles.videoLabel}>You ({localUid})</Text>
          <RtcLocalView.SurfaceView
            style={styles.localVideo}
            channelId={roomId} // Pass channelId
            renderMode={VideoRenderMode.Hidden} // Fit or Hidden
            zOrderMediaOverlay={true} // Ensure UI elements can overlay video
          />

          {/* Remote Videos */} 
          {peerIds.map((uid) => (
            <View key={uid} style={styles.remoteVideoContainer}>
              <Text style={styles.videoLabel}>Remote User ({uid})</Text>
              <RtcRemoteView.SurfaceView
                style={styles.remoteVideo}
                uid={uid} // UID of the remote user
                channelId={roomId} // Pass channelId
                renderMode={VideoRenderMode.Hidden}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// --- Styles ---
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
    marginBottom: 15,
  },
  leaveButton: {
      backgroundColor: '#dc3545',
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  videoContainer: {
    flexGrow: 1, // Allows ScrollView to take space but also grow
    alignItems: 'center',
    paddingVertical: 10,
  },
  videoLabel: {
      fontSize: 14,
      marginBottom: 5,
      color: '#555',
  },
  localVideo: {
    width: 180, // Adjust size as needed
    height: 240,
    backgroundColor: '#000',
    marginBottom: 15,
  },
  remoteVideoContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },
  remoteVideo: {
    width: 180, // Adjust size as needed
    height: 240,
    backgroundColor: '#333',
  },
});
