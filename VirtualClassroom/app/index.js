import * as React from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import { joinRoom } from "./app/(redux)/roomSlice";

export default function App() {
  const video = React.useRef(null);
  const [status, setStatus] = React.useState({});
  const router = useRouter();
  const dispatch = useDispatch();
  const [roomName, setRoomName] = React.useState("");

  const handleCreateRoom = () => {
    if (roomName.trim() !== "") {
      dispatch(joinRoom(roomName));
    }
    setRoomName("")
  };

  const handleJoinRoom = () => {
    if (roomName.trim() !== "") {
      dispatch(joinRoom(roomName));
    }
    setRoomName("")
  };

  return (
    <View style={styles.container}>
        <Video
          ref={video}
          style={styles.video}
          source={{
            uri: "https://videos.pexels.com/video-files/5377700/5377700-sd_540_960_25fps.mp4",
          }}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          onPlaybackStatusUpdate={(status) => setStatus(() => status)}
        />
      <View style={styles.contentContainer}>
        <View style={styles.overlay}>
          <Text style={styles.mainText}>Virtual Classroom</Text>
          <Text style={styles.subText}>Chop The Data</Text>
          <Text style={styles.tagline}>Have Fun</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Room Name"
            placeholderTextColor="#fff"
            value={roomName}
            onChangeText={setRoomName}
          />
        </View>
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleCreateRoom}
          >
            <Text style={styles.buttonText}>Create Room</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={handleJoinRoom}
          >
            <Text style={styles.buttonText}>Join Room</Text>
          </TouchableOpacity>
        </View>
          
      </View>
     
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position:"relative",
    flex: 1,
    justifyContent: "center",
  },
  contentContainer: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    alignItems:"center",
    justifyContent: "center",
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    zIndex: -1,
  },
  overlay: {
    marginTop: -100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  mainText: {
    color: "white",
    fontSize: 68,
    fontWeight: "bold",
    textAlign: "center",
  },
  subText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  tagline: {
    color: "white",
    fontSize: 18,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 10,
    marginVertical: 20,
    marginBottom: 100,
  },
  button: {
    backgroundColor: "#6200ea",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 3, // Adds a shadow effect on Android
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  inputContainer: {
    width: "80%",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    color: "white",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#fff",
    textAlign:"center",
    
  },
});
