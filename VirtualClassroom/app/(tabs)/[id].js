import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Button, Text } from 'react-native';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  mediaDevices,
} from 'react-native-webrtc';
import { useLocalSearchParams } from 'expo-router'; // Assuming you use expo-router based on file path structure

const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }; // Basic STUN server config

const RoomScreen = () => {
  const { id } = useLocalSearchParams(); // Get room ID from router params
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const peerConnection = useRef(null);

  useEffect(() => {
    // Initialize WebRTC and get local stream
    const initializeWebRTC = async () => {
      try {
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: {
            mandatory: {
              minWidth: 500, // Provide your own width, height and frame rate here
              minHeight: 300,
              minFrameRate: 30,
            },
            facingMode: 'user', // 'environment' for back camera
          },
        });
        setLocalStream(stream);

        // Create peer connection
        peerConnection.current = new RTCPeerConnection(configuration);

        // Add local stream to peer connection
        stream.getTracks().forEach(track => {
          peerConnection.current.addTrack(track, stream);
        });

        // Handle incoming tracks (remote stream)
        peerConnection.current.ontrack = event => {
          if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0]);
          }
        };

        // Handle ICE candidates
        peerConnection.current.onicecandidate = event => {
          if (event.candidate) {
            // Send the candidate to the remote peer via your signaling server
            console.log('New ICE candidate:', event.candidate);
            // Signaling logic to send candidate needed here
          }
        };

        // Handle ICE connection state changes
        peerConnection.current.oniceconnectionstatechange = () => {
          console.log('ICE connection state:', peerConnection.current.iceConnectionState);
        };

        // Handle signaling state changes
        peerConnection.current.onsignalingstatechange = () => {
          console.log('Signaling state:', peerConnection.current.signalingState);
        };

        // You would typically join a room and exchange SDP here using your signaling server
        // For now, we'll just log that setup is complete.
        console.log('WebRTC setup complete. Ready to connect.');

      } catch (error) {
        console.error('Could not get media stream or set up WebRTC:', error);
      }
    };

    initializeWebRTC();

    // Clean up on component unmount
    return () => {
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      if (localStream) {
        localStream.release(); // Release the media stream tracks
      }
      if (remoteStream) {
         // Depending on how you manage remoteStream, you might need to release it too
         // if it's not automatically handled by peerConnection.close
      }
    };
  }, [id]); // Re-run effect if room ID changes

  // Basic functions for call initiation (placeholders - signaling needed)
  const createOffer = async () => {
    try {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      console.log('Created offer:', offer);
      // Signaling logic to send offer to the other peer needed here
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const createAnswer = async () => {
     // This function would be called when you receive an offer from another peer
     // setRemoteDescription first, then createAnswer, setLocalDescription, then send answer
     console.log('createAnswer function - signaling logic needed');
  };

  const handleIncomingCall = async (offer) => {
      // This function would be called when you receive an offer via signaling
      // setRemoteDescription(offer), then call createAnswer
      console.log('handleIncomingCall function - signaling logic needed');
  };

   const handleAnswer = async (answer) => {
      // This function would be called when you receive an answer via signaling
      // setRemoteDescription(answer)
      console.log('handleAnswer function - signaling logic needed');
   };

    const handleNewICECandidate = async (candidate) => {
        // This function would be called when you receive an ICE candidate via signaling
        // peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate))
        console.log('handleNewICECandidate function - signaling logic needed');
    };


  return (
    <View style={styles.container}>
      <Text style={styles.roomTitle}>Room: {id}</Text>
      <View style={styles.videoContainer}>
        {localStream && (
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror={true} // Mirror local camera
          />
        )}
        {remoteStream && (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        )}
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Create Offer" onPress={createOffer} disabled={!peerConnection.current} />
        {/* Add buttons for hang up, mute, etc. later */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    paddingTop: 20,
  },
  roomTitle: {
    fontSize: 24,
    marginBottom: 20,
  },
  videoContainer: {
    flex: 1,
    width: '100%',
    aspectRatio: 16/9, // Common video aspect ratio
    position: 'relative', // Needed for absolute positioning of local video
    backgroundColor: '#ccc', // Placeholder background
  },
  localVideo: {
    position: 'absolute',
    width: 100, // Smaller size for local video
    height: 150,
    bottom: 20,
    right: 20,
    zIndex: 1, // Ensure local video is on top
    borderRadius: 10,
    backgroundColor: '#000', // Placeholder
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000', // Placeholder
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 20,
  },
});

export default RoomScreen;