import React, { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router"; // Import useLocalSearchParams
import { useSelector } from "react-redux";
import axios from "axios";
import io from "socket.io-client";
import Constants from 'expo-constants';

export default function Room() {
  const { BACKEND_API } = Constants.expoConfig?.extra ?? {}; // Ensure extra exists
  const router = useRouter();
  const { id: routeRoomId } = useLocalSearchParams(); // Get room ID from route parameters
  const user = useSelector((state) => state.auth.user);

  // Use a memoized socket instance
  const socket = useMemo(() => {
      if (!BACKEND_API) return null;
      return io(BACKEND_API, { transports: ['websocket'] }); // Explicitly use websocket if needed
  }, [BACKEND_API]);

  // Keep Redux roomId for potential consistency checks or other features if needed
  // const reduxRoomId = useSelector((state) => state.room.roomId);

  const [roomDetails, setRoomDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Ensure essential data is present
    if (!routeRoomId) {
      console.error("Room ID missing from route parameters.");
      setError("Room ID is missing. Cannot load room.");
      setIsLoading(false);
      return;
    }
    if (!user || !user.token) {
      console.error("User authentication missing.");
      Alert.alert("Authentication Error", "User data not found. Please log in again.");
      // Optionally redirect to login
      // router.replace("/auth/login");
      setIsLoading(false);
      return;
    }
     if (!BACKEND_API) {
       console.error("Backend API URL is not configured.");
       setError("Application configuration error.");
       setIsLoading(false);
       return;
     }

    // Fetch room details using the ID from the route
    const fetchRoomDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log(`Fetching details for room: ${routeRoomId}`);
        const response = await axios.get(`${BACKEND_API}api/conference/rooms/${routeRoomId}`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });
        console.log("Room details fetched:", response.data);
        setRoomDetails(response.data);
        // Check if current user is already in participants list
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
      // Handler for user joining
      const userJoinedHandler = (data) => {
        console.log('Socket event: user-joined', data);
        if (data.roomId === routeRoomId) {
          setRoomDetails((prevDetails) => {
            if (!prevDetails || prevDetails.participants?.some(p => p === data.userId || p?._id === data.userId)) {
              return prevDetails; // Already joined or no details yet
            }
            // Add participant (ensure it's just the ID or an expected object structure)
            const newParticipant = data.userId; // Assuming backend sends the ID
            return {
              ...prevDetails,
              participants: [...prevDetails.participants, newParticipant],
            };
          });
        }
      };

      // Handler for user leaving (example)
      const userLeftHandler = (data) => {
         console.log('Socket event: user-left', data);
         if (data.roomId === routeRoomId) {
            setRoomDetails((prevDetails) => {
                if (!prevDetails) return prevDetails;
                return {
                    ...prevDetails,
                    participants: prevDetails.participants.filter(p => p !== data.userId && p?._id !== data.userId)
                }
            });
         }
      };

      // Connect and set up listeners
      socket.connect();
      socket.on("user-joined", userJoinedHandler);
      socket.on("user-left", userLeftHandler); // Add listener for user leaving

      // Emit event to signal presence in this room (optional, depends on backend)
      // socket.emit('enter-room', { roomId: routeRoomId, userId: user.id });

      // Cleanup: disconnect socket and remove listeners
      return () => {
        console.log("Cleaning up socket for room:", routeRoomId);
        socket.off("user-joined", userJoinedHandler);
        socket.off("user-left", userLeftHandler);
        // socket.emit('leave-room', { roomId: routeRoomId, userId: user.id }); // Notify backend on unmount
        socket.disconnect();
      };
    }\ else {
        console.warn("Socket not initialized due to missing BACKEND_API");
    }
    // Depend on the routeRoomId and user token to refetch if they change
  }, [routeRoomId, user?.token, user?.id, socket]); // Added socket to dependency array

  const joinRoom = async () => {
    if (!user || !user.id || !user.token || !routeRoomId || !BACKEND_API) {
      Alert.alert("Error", "Cannot join room. Missing required information.");
      return;
    }
    if (!socket || !socket.connected) {
        Alert.alert("Error", "Connection issue. Please try again.");
        // Optionally try to reconnect
        // socket?.connect(); 
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

      // Emit socket event AFTER successful API call
      socket.emit("join-room", { roomId: routeRoomId, userId: user.id });
      console.log(`User ${user.id} successfully joined room ${routeRoomId} via API and emitted socket event`);
      setIsJoined(true);
      // Optimistically update participants list (optional)
      setRoomDetails(prev => prev ? ({...prev, participants: [...prev.participants, user.id]}) : null);
      Alert.alert("Success", "You have joined the room.");

    } catch (err) {
      const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error("Error joining room:", errorMsg);
      Alert.alert("Error", `Failed to join room: ${err.response?.data?.message || 'Please try again.'}`);
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

  // --- Main Room View ---
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Room: {roomDetails.title}</Text>
      <Text style={styles.subtitle}>Host: {roomDetails.host?.email || roomDetails.host || "Unknown"}</Text>
      <Text style={styles.subtitle}>
        Participants: {roomDetails.participants?.length ?? 0}
      </Text>
      {/* Optional: List participants */}
      {/* <View>
          {roomDetails.participants.map(p => <Text key={p._id || p}>{p.email || p}</Text>)}
      </View> */}

      {isJoined ? (
        <Text style={styles.info}>You are in this room.</Text>
      ) : (
        <TouchableOpacity style={styles.button} onPress={joinRoom}>
          <Text style={styles.buttonText}>Join Room</Text>
        </TouchableOpacity>
      )}

      {/* Add button to go back */}
       <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
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
    padding: 20,
    paddingTop: 40, // Add padding top
    backgroundColor: "#f5f5f5", // Consider using theme background
    // alignItems: "center", // Center items horizontally
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10, // Add margin bottom
  },
  subtitle: {
    fontSize: 18,
    marginTop: 10,
    textAlign: "center",
    color: '#555', // Adjust color
  },
  button: {
    backgroundColor: "#6200ea", // Consider using theme button color
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 30, // Increase margin top
    marginHorizontal: 40, // Add horizontal margin
  },
   backButton: {
    backgroundColor: "#757575", // Different color for back button
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
    marginHorizontal: 40,
  },
  buttonText: {
    color: "#fff", // Consider using theme button text color
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
   }
});
