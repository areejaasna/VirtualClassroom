import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { useSelector, useDispatch } from "react-redux";
import { getRoom } from "../(redux)/roomSlice";

export default function Room() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { roomId, roomName, users, videoCall } = useSelector((state) => state.room);
  const { user } = useSelector((state) => state.auth);
  const [stream, setStream] = useState(null);
  const localVideo = useRef();
  const remoteVideo = useRef();
  const peerConnection = useRef();


  useEffect(() => {
    dispatch(getRoom({ roomName: roomName }));
    
    const configuration = {
        iceServers: [
          {
            urls: [
              "stun:stun1.l.google.com:19302",
              "stun:stun2.l.google.com:19302",
            ],
          },
        ],
      };
      peerConnection.current = new RTCPeerConnection(configuration);
    if (roomId) {
      initWebRTC();
    }
  }, [roomId]);

  const initWebRTC = async () => {
    console.log("initWebRTC");
    const userStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setStream(userStream);
    localVideo.current.srcObject = userStream;
    userStream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, userStream);
    });

    peerConnection.current.ontrack = (event) => {
      console.log("ontrack", event);
      remoteVideo.current.srcObject = event.streams[0];
    });
  };

  if (!roomId) {
    return <Text>Loading...</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.videoContainer}>
      {videoCall ? (
          <video
            style={styles.video}
            autoPlay
            ref={localVideo}
            muted={true}
          ></video>
        ) : null}
        {stream ? (
            <video style={styles.video} autoPlay ref={remoteVideo}></video>
          ) : null}
        <View>
            <Text>Users :</Text>
            {users.map((user,index)=><Text key={index}>{user}</Text>)}
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "space-around",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  videoContainer: {
    flexDirection: "column",
    width: "100%",
    height: "100%",
    backgroundColor: "#f0f0f0",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  video: {
    width: 300,
    height: 300,
    backgroundColor: "black",
    marginBottom: 20
  },
  // container: {
  //   flex: 1,
  //   padding: 20,
  //   backgroundColor: "#f5f5f5",
  //   justifyContent: "center",
  // },
  // title: {
  //   fontSize: 24,
  //   fontWeight: "bold",
  //   textAlign: "center",
  // },
  // subtitle: {
  //   fontSize: 18,
  //   marginTop: 10,
  //   textAlign: "center",
  // },
  // button: {
  //   backgroundColor: "#6200ea",
  //   padding: 15,
  //   borderRadius: 8,
  //   alignItems: "center",
  //   marginTop: 20,
  // },
  // buttonText: {
  //   color: "#fff",
  //   fontSize: 16,
  //   fontWeight: "bold",
  // },
  // info: {
  //   fontSize: 18,
  //   marginTop: 10,
  //   textAlign: "center",
  //   color: "green",
  // },
});
