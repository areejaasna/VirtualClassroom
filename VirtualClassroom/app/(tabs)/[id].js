import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Button, View, Text, ActivityIndicator, Alert } from 'react-native';
import { HMSPrebuilt } from '@100mslive/react-native-room-kit';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { requestCameraPermissionsAsync, requestMicrophonePermissionsAsync } from 'expo-camera';
import { useLocalSearchParams } from 'expo-router';
import axios from 'axios'; // Assuming axios is installed and configured

const API_URL = process.env.EXPO_PUBLIC_API_URL; // Assuming you have an environment variable for your backend API URL

const App = () => {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Bold': require("./assets/fonts/Inter-Bold.ttf"),
    'Inter-Medium': require("./assets/fonts/Inter-Medium.ttf"),
    'Inter-Regular': require("./assets/fonts/Inter-Regular.ttf"),
    'Inter-SemiBold': require("./assets/fonts/Inter-SemiBold.ttf"),
  });

  const [showHMSPrebuilt, setShowHMSPrebuilt] = useState(false);
  const [hmsToken, setHmsToken] = useState(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [error, setError] = useState(null);
  const { id } = useLocalSearchParams(); // This `id` is your database's conference room ID

  // Assuming you have user information available, e.g., from an auth context or state
  // REPLACE WITH YOUR ACTUAL USER DATA FETCHING LOGIC
  const user = {
      _id: 'dummy_user_id', // Replace with actual user ID
      role: 'participant', // Replace with actual user role (e.g., 'host', 'participant')
      name: 'Guest User', // Replace with actual user name
  };
  // END OF REPLACE SECTION

  // Asking Camera & Microphone permissions from user
  useEffect(() => {
    Promise.allSettled([
      requestCameraPermissionsAsync(),
      requestMicrophonePermissionsAsync(),
    ])
      .then((results) => {
        console.log('Permissions Result: ', results);
      })
      .catch((error) => {
        console.log('Permissions Error: ', error);
      });
  }, []);

  const fetchHmsToken = async () => {
    if (!id || !user._id || !user.role) {
        setError('Missing conference ID or user data.');
        return;
    }
    setLoadingToken(true);
    setError(null);
    try {
      // 1. Fetch the 100ms room ID from your backend using the database conference room ID (`id`)
      const conferenceDetailsResponse = await axios.get(`${API_URL}/api/conference/details/${id}`);
      const hmsRoomId = conferenceDetailsResponse.data.hmsRoomId; // Get the 100ms room ID

      if (!hmsRoomId) {
          setError('100ms Room ID not found for this conference.');
          setLoadingToken(false);
          return;
      }

      // 2. Fetch the token using the 100ms room ID, user ID, and role
      const tokenResponse = await axios.get(`${API_URL}/api/conference/token/${hmsRoomId}/${user.role}/${user._id}`);
      setHmsToken(tokenResponse.data.token);

    } catch (err) {
      console.error('Error fetching HMS token:', err);
      setError('Failed to fetch conference token. Please try again.');
      Alert.alert('Error', 'Failed to fetch conference token.');
    } finally {
      setLoadingToken(false);
    }
  };

  useEffect(() => {
    // Fetch token when the component mounts and we have the conference ID
    if (id && !hmsToken && !loadingToken && !error) {
      fetchHmsToken();
    }
  }, [id, hmsToken, loadingToken, error]); // Depend on id, hmsToken, loadingToken, error

  // If fonts are not loaded or there's a font error
  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (!!fontError) {
    return <Text>Font Error: {fontError.message}</Text>;
  }

  // Content
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar barStyle={'dark-content'} />

        {showHMSPrebuilt && hmsToken ? (
          <HMSPrebuilt
            token={hmsToken} // Pass the fetched token here
            options={{ userName: user.name }} // Use dynamic user name
            onLeave={() => {
              setShowHMSPrebuilt(false);
              setHmsToken(null); // Clear token on leaving
              // You might want to navigate back here, e.g., router.back();
            }}
          />
        ) : (
          <View style={styles.joinContainer}>
            {loadingToken ? (
                <ActivityIndicator size="large" color="#0000ff" />
            ) : error ? (
                <Text style={{ color: 'red' }}>{error}</Text>
            ) : (
                <Button
                  title='Join Conference'
                  onPress={() => setShowHMSPrebuilt(true)}
                  disabled={!hmsToken || loadingToken} // Disable button while loading or if token is not available
                />
            )}

             {/* Display the database room ID for debugging */}
            <Text style={{ marginTop: 20 }}>Conference ID: {id}</Text>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  joinContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

export default App;
