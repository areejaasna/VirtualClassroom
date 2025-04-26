import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function Room() {
  const [roomName, setRoomName] = useState('');
  const [joinRoom, setJoinRoom] = useState(false);

  const generateDailyRoomLink = (room) => {
    // Using Daily.co or any WebRTC platform supporting embedding.
    return `https://jojocoder28.daily.co/test/${room}`;
    // Replace with your real Daily.co domain or any public room link
  };

  return (
    <View style={{ flex: 1 }}>
      {joinRoom ? (
        <WebView
          source={{ uri: generateDailyRoomLink(roomName) }}
          style={{ flex: 1 }}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
        />
      ) : (
        <View style={styles.container}>
          <Text style={styles.title}>Join a Meeting Room</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Room Name"
            value={roomName}
            onChangeText={setRoomName}
          />
          <Button title="Join Room" onPress={() => setJoinRoom(true)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#f2f2f2'
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center'
  },
  input: {
    height: 50,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    backgroundColor: '#fff'
  }
});
