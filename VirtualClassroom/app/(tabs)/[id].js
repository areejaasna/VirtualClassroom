import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import axios from "axios";
import io from "socket.io-client";
import Constants from 'expo-constants'; // Expo Constants module


export default function Room() {
  const socket = io(`${BACKEND_API}`);
  const { BACKEND_API } = Constants.expoConfig.extra;
  const router = useRouter();
  const roomId = useSelector((state) => state.room.roomId); // Fetch roomId from Redux
  const [roomDetails, setRoomDetails] = useState(null);
  const [isJoined, setIsJoined] = useState(false);
  const user = useSelector((state) => state.auth.user); // Get user data from Redux
  
  useEffect(() => {
    if (!user) {
      alert("User not found, please log in.");
      return; // Prevent making API calls if the user is not logged in
    }

    if (!roomId) {
      console.error("Room ID not found.");
      return; // Prevent fetching room details if no room ID is present
    }

    const fetchRoomDetails = async () => {
      try {
        // Fetch room details from the backend using Axios
        const response = await axios.get(`${BACKEND_API}api/conference/rooms/${roomId}`, {
          headers: {
            Authorization: `Bearer ${user.token}`, // Send the auth token in the header
          },
        });
        setRoomDetails(response.data);
      } catch (error) {
        console.error("Error fetching room details:", error);
      }
    };

    fetchRoomDetails();

    // Listen for 'user-joined' event to update participants in real-time
    socket.on("user-joined", (userId) => {
      setRoomDetails((prevDetails) => {
        return {
          ...prevDetails,
          participants: [...prevDetails.participants, userId],
        };
      });
    });

    // Cleanup socket listener on unmount
    return () => {
      socket.off("user-joined");
    };
  }, [roomId, user]);  // Fetch room details and set up socket listener when room ID or user changes

  const joinRoom = async () => {
    if (!user) {
      console.error("User not logged in");
      return; // Prevent joining room if the user is not logged in
    }

    try {
      // Join room API call
      await axios.post(
        `${BACKEND_API}api/conference/join/${roomId}`,
        { userId: user.id },
        {
          headers: {
            Authorization: `Bearer ${user.token}`, // Send the auth token in the header
          },
        }
      );
      setIsJoined(true);
      socket.emit("join-room", { roomId, userId: user.id }); // Emit 'join-room' event
    } catch (error) {
      console.error("Error joining room:", error);
    }
  };

  if (!roomDetails) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Room: {roomDetails.title}</Text>
      <Text style={styles.subtitle}>Host: {roomDetails.host ? roomDetails.host.email : "Unknown"}</Text>
      <Text style={styles.subtitle}>
        Participants: {roomDetails.participants.length}
      </Text>

      {isJoined ? (
        <Text style={styles.info}>You have joined this room.</Text>
      ) : (
        <TouchableOpacity style={styles.button} onPress={joinRoom}>
          <Text style={styles.buttonText}>Join Room</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    marginTop: 10,
    textAlign: "center",
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
    fontSize: 18,
    marginTop: 10,
    textAlign: "center",
    color: "green",
  },
});
