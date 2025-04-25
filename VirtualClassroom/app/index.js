import * as React from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Switch,
  StatusBar,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { useRouter } from "expo-router";
import { useTheme } from "./(redux)/AppWrapper"; // Import the theme hook

export default function App() {
  const video = React.useRef(null);
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme(); // Use the theme context

  // Create dynamic styles based on the theme
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: theme.background, // Apply background color from theme
    },
    video: {
      ...StyleSheet.absoluteFillObject,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.overlay, // Apply overlay color from theme
    },
    mainText: {
      color: theme.textPrimary, // Apply text color from theme
      fontSize: 68,
      fontWeight: "bold",
      textAlign: "center",
    },
    subText: {
      color: theme.textPrimary, // Apply text color from theme
      fontSize: 24,
      fontWeight: "bold",
      textAlign: "center",
    },
    tagline: {
      color: theme.textSecondary, // Apply text color from theme
      fontSize: 18,
      fontStyle: "italic",
      textAlign: "center",
      marginTop: 10,
    },
    buttons: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      position: "absolute",
      bottom: 50, // Adjusted position slightly
      left: 0,
      right: 0,
      paddingHorizontal: 20,
    },
    button: {
      backgroundColor: theme.button, // Apply button color from theme
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 25,
      elevation: 3,
    },
    buttonText: {
      color: theme.buttonText, // Apply button text color from theme
      fontSize: 18,
      fontWeight: "bold",
    },
    themeToggleContainer: {
      position: "absolute",
      top: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 50, // Position below status bar
      right: 20,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.secondary, // Use secondary theme color for background
      padding: 5,
      borderRadius: 15,
    },
    themeToggleText: {
      marginRight: 5,
      color: theme.textPrimary,
    },
  });

  return (
    <View style={styles.container}>
      {/* Set status bar style based on theme */}
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <Video
        ref={video}
        style={styles.video}
        source={{
          uri: "https://videos.pexels.com/video-files/5377700/5377700-sd_540_960_25fps.mp4",
        }}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        onError={(e) => console.error("Video Error:", e)}
      />
      <View style={styles.overlay}>
        {/* Theme Toggle Switch */}
        <View style={styles.themeToggleContainer}>
          <Text style={styles.themeToggleText}>{isDarkMode ? "🌙" : "🌤️"}</Text>
          <Switch
            trackColor={{ false: theme.secondary, true: theme.primary }} // Use theme colors
            thumbColor={isDarkMode ? theme.button : theme.secondary}
            ios_backgroundColor={theme.secondary}
            onValueChange={toggleTheme}
            value={isDarkMode}
          />
        </View>

        <Text style={styles.mainText}>Virtual Classroom</Text>
        <Text style={styles.subText}>Chop The Data</Text>
        <Text style={styles.tagline}>Have Fun</Text>
      </View>
      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/auth/login")}
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/auth/register")}
        >
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
