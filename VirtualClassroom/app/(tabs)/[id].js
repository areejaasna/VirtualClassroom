import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSelector } from "react-redux";
import axios from "axios";
import Constants from 'expo-constants';

const { BACKEND_API } = Constants.expoConfig?.extra ?? {};

export default function Room() {
  const router = useRouter();
  const { id: routeRoomId } = useLocalSearchParams();
  const user = useSelector((state) => state.auth.user);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dailyRoomUrl, setDailyRoomUrl] = useState(null);
  const [roomDetails, setRoomDetails] = useState(null); // Keep room details if needed for display


  useEffect(() => {
    // Check specifically for missing room ID first
    if (!routeRoomId) {
      console.error("Room ID missing from route parameters.");
      setError("Room ID is missing from navigation parameters. Cannot load room.");
      setIsLoading(false);
      return;
    }

    if (!user || !user.token) {
        Alert.alert("Authentication Error", "User data not found. Please log in again.");
        setError("User data missing. Please log in again.");
        setIsLoading(false);
        return;
    }

    if (!BACKEND_API) {
        console.error("Backend API URL is not configured.");
        setError("Backend API URL is not configured. Cannot load room.");
        setIsLoading(false);
        return;
    }


    const fetchRoomAndDailyUrl = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // API call to backend to get room details and Daily.co room URL
        const response = await axios.post(
          `${BACKEND_API}api/conference/join/${routeRoomId}`, // Assuming join endpoint returns room details and dailyRoomUrl
          { userId: user.id }, // Send user ID if backend needs it for joining logic
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );

        console.log("Backend response for room join:", response.data);

        const fetchedRoomDetails = response.data?.room; // Adjust based on your backend response structure
        const fetchedDailyRoomUrl = response.data?.dailyRoomUrl; // **Ensure your backend returns this**

        if (!fetchedDailyRoomUrl) {
            console.error("Daily.co room URL not received from backend.");
            setError("Failed to get Daily.co room information from backend.");
             Alert.alert("Error", "Failed to get Daily.co room information from backend.");
             setIsLoading(false);
            return;
        }

        setRoomDetails(fetchedRoomDetails);
        setDailyRoomUrl(fetchedDailyRoomUrl);


      } catch (err) {
        const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
        console.error("Error fetching room details or Daily URL:", errorMsg);
        setError(`Failed to load room details or join video channel: ${err.response?.data?.message || 'Please try again.'}`);
         Alert.alert("Error", `Failed to load room details or join video channel: ${err.response?.data?.message || 'Please try again.'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomAndDailyUrl();

  }, [routeRoomId, user?.token, user?.id, BACKEND_API]);


  // --- Render States ---
  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" /><Text>Loading Room...</Text></View>;
  }

  if (error) {
    return (
        <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
             <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                  <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
        </View>
    );
  }

  // Render WebView only when dailyRoomUrl is available
  if (dailyRoomUrl) {
    return (
        <View style={{ flex: 1 }}>
             {/* You can optionally display room details here */}
             {/* {roomDetails && <Text style={styles.title}>{roomDetails.title}</Text>} */}
            <WebView
              source={{ uri: dailyRoomUrl }}
              style={{ flex: 1 }}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
               // Add event handlers for WebView if needed (e.g., onNavigationStateChange)
            />
             {/* Add a back button to leave the WebView and go back */}
             <TouchableOpacity style={styles.backButtonWebView} onPress={() => router.back()}>
                  <Text style={styles.buttonText}>Leave Room</Text>
            </TouchableOpacity>
        </View>
    );
  }

    // Fallback case if not loading, no error, and no dailyRoomUrl (shouldn't happen with current logic)
    return (
        <View style={styles.centered}>
            <Text>Unable to load video room.</Text>
             <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                  <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
        </View>
    );

}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
     backgroundColor: '#f2f2f2'
  },
  errorText: {
      color: 'red',
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 20,
  },
   backButton: {
    backgroundColor: "#757575",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
    marginHorizontal: 40,
  },
    backButtonWebView: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        backgroundColor: '#dc3545', // Red color for leave button
        padding: 12,
        borderRadius: 8,
        zIndex: 10, // Ensure it's above the WebView
    },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
   title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center'
  },
});
