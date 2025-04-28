import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { WebView } from 'react-native-webview';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const LivepeerConference = () => {
  const [streamUrl, setStreamUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useLocalSearchParams();

  useEffect(() => {
    const fetchStreamUrl = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch conference details from your backend
        const response = await axios.get(`${API_URL}/api/livepeer-conference/details/${id}`);
        const { livepeerPlaybackId } = response.data;

        // Construct the HLS playback URL (replace with your actual logic)
        // Livepeer provides various playback URLs, HLS being a common one
        const hlsUrl = `https://cdn.livepeer.com/${livepeerPlaybackId}/index.m3u8`;
        setStreamUrl(hlsUrl);
      } catch (e) {
        console.error("Failed to fetch stream URL", e);
        setError("Failed to fetch stream URL");
      } finally {
        setLoading(false);
      }
    };

    fetchStreamUrl();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading stream...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {streamUrl ? (
        <WebView
          style={styles.videoPlayer}
          source={{ uri: streamUrl }} // Load the HLS stream in WebView
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
        />
      ) : (
        <Text>No stream URL available.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
});

export default LivepeerConference;
