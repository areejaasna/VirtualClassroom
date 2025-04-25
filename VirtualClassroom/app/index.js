import * as React from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Switch,
  StatusBar,
  ScrollView, // Added ScrollView for potential content overflow
} from "react-native";
// Removed Video import
import { useRouter } from "expo-router";
import { useTheme } from "./(redux)/AppWrapper"; // Import the theme hook

export default function App() {
  // Removed video ref
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme(); // Use the theme context

  // Create dynamic styles based on the theme
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: theme.background, // Apply background color from theme
    },
    // Removed video style
    overlay: {
      flex: 1, // Changed to flex: 1 to take up space
      justifyContent: "center",
      alignItems: "center",
      padding: 20, // Added padding
      backgroundColor: theme.overlay, // Apply overlay color from theme
    },
    mainText: {
      color: theme.textPrimary,
      fontSize: 48, // Adjusted size
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 10,
    },
    subText: {
      color: theme.textPrimary,
      fontSize: 20, // Adjusted size
      fontWeight: "bold",
      textAlign: "center",
    },
    tagline: {
      color: theme.textSecondary,
      fontSize: 16, // Adjusted size
      fontStyle: "italic",
      textAlign: "center",
      marginTop: 5,
      marginBottom: 30, // Added margin bottom
    },
    infographicContainer: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 20,
    },
    infographicPlaceholder: {
      backgroundColor: theme.secondary, // Use a theme color for placeholder background
      padding: 15,
      borderRadius: 10,
      marginVertical: 10,
      width: '90%',
      alignItems: 'center',
    },
    infographicText: {
      color: theme.textPrimary,
      fontSize: 14,
      textAlign: 'center',
    },
    buttons: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      width: '100%', // Make buttons take full width
      paddingHorizontal: 20,
      marginTop: 20, // Added margin top
    },
    button: {
      backgroundColor: theme.button,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 25,
      elevation: 3,
      minWidth: 120, // Ensure buttons have some minimum width
      alignItems: 'center',
    },
    buttonText: {
      color: theme.buttonText,
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
      {/* Removed Video component */}
      <ScrollView contentContainerStyle={styles.overlay}>
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
        <Text style={styles.subText}>Engage & Market Smarter</Text>
        <Text style={styles.tagline}>AI-Powered Insights for Digital Growth</Text>

        {/* Infographic Placeholders */}
        <View style={styles.infographicContainer}>
          <View style={styles.infographicPlaceholder}>
            <Text style={styles.infographicText}>📊 Infographic: Boost Engagement via Interactive Features</Text>
          </View>
          <View style={styles.infographicPlaceholder}>
            <Text style={styles.infographicText}>📈 Infographic: Track Marketing ROI with Integrated Analytics</Text>
          </View>
          <View style={styles.infographicPlaceholder}>
            <Text style={styles.infographicText}>🎯 Infographic: Target Audience Segmentation using AI</Text>
          </View>
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
      </ScrollView>
    </View>
  );
}
