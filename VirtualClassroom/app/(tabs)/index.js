import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text, FlatList, TouchableOpacity, TextInput } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { logoutAction } from "../(redux)/authSlice";
import { setRoomId } from "../(redux)/roomSlice"; // Import setRoomId action
import ProtectedRoute from "../../components/ProtectedRoute";
import axios from "axios"; // Import axios
import Constants from 'expo-constants'; // Expo Constants module

export default function Home() {
  const { BACKEND_API } = Constants.expoConfig.extra;
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const roomId = useSelector((state) => state.room.roomId); // Access roomId from Redux
  const [rooms, setRooms] = useState([]);
  const [title, setTitle] = useState(""); // State to hold room title

  useEffect(() => {
    if (user && user.token) {
      // Fetch open video conference rooms from backend
      axios
        .get(`${BACKEND_API}api/conference/rooms`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        })
        .then((response) => {
          setRooms(response.data); // assuming 'data' contains the list of rooms
        })
        .catch((error) => {
          console.error("Error fetching rooms:", error);
        });
    } else {
      router.push("/auth/login"); // Redirect to login page if user is not authenticated
    }
  }, [user]);

  const handleLogout = () => {
    dispatch(logoutAction());
    router.push("/auth/login");
  };

  const createRoom = async () => {
    if (!title) {
      alert("Title is required");
      return;
    }

    if (!user || !user.token) {
      alert("You must be logged in to create a room.");
      return;
    }

    try {
      const response = await axios.post(
        `${BACKEND_API}api/conference/create`,
        {
          title,
          host: user.id, // Send title and user ID
        },
        { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${user.token}` } }
      );

      setRooms([...rooms, response.data.room]); // Assuming 'room' is returned in the response
      setTitle(""); // Reset title after creating the room
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };

  const handleRoomPress = (id) => {
    dispatch(setRoomId(id)); // Set the roomId in Redux when a room is selected
    router.push(`/(tabs)/${id}`); // Navigate to the room
  };

  return (
    <ProtectedRoute>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome, {user?.email}</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter room title"
          value={title}
          onChangeText={setTitle}
        />

        <TouchableOpacity style={styles.button} onPress={createRoom}>
          <Text style={styles.buttonText}>Create Conference Room</Text>
        </TouchableOpacity>

        <Text style={styles.subtitle}>Open Conference Rooms:</Text>
        <FlatList
          data={rooms}
          keyExtractor={(item) => (item._id ? item._id.toString() : "default_key")}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.roomItem}
              onPress={() => handleRoomPress(item._id)} // Update to call handleRoomPress
            >
              <Text style={styles.roomText}>Room title: {item.title}{'\n'}(Host: {item.host})</Text>
            </TouchableOpacity>
          )}
        />

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
  },
  button: {
    backgroundColor: "#6200ea",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  roomItem: {
    padding: 15,
    backgroundColor: "#ddd",
    marginVertical: 8,
    borderRadius: 8,
  },
  roomText: {
    fontSize: 16,
  },
  logoutButton: {
    marginTop: 20,
    backgroundColor: "#d32f2f",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  input: {
    height: 40,
    borderColor: "#6200ea",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
    paddingLeft: 10,
    fontSize: 16,
  },
});
