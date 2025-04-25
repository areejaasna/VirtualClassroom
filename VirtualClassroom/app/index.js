import React, { useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons'; // Assuming Ionicons are available, adjust if needed

const { height, width } = Dimensions.get('window');

const pages = [
  {
    title: "Your Smartest Classroom Yet.",
    description: "Join live sessions, access resources, and learn your way.",
  },
  {
    title: "Performance visualization",
    description: "Check Your Performance and Track Your Education",
  },
  {
    title: "Don't Just Learn — Connect.",
    description: "Next-Gen Classrooms with Emotion-Aware Learning",
  },
];

export default function OnboardingScreen() {
  const [currentPage, setCurrentPage] = useState(0);
  const router = useRouter();

  const handleSkip = () => {
    // Navigate to login or register, or perhaps a welcome screen with both options
    router.replace("/auth/login"); // Or your desired route
  };

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      // On the last page, navigate to login or register
      router.replace("/auth/login"); // Or your desired route
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipButtonText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>{pages[currentPage].title}</Text>
        <Text style={styles.description}>{pages[currentPage].description}</Text>
      </View>

      <View style={styles.bottomContainer}>
        <View style={styles.dotContainer}>
          {pages.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === currentPage ? styles.activeDot : null]}
            />
          ))}
        </View>
        <TouchableOpacity style={styles.arrowButton} onPress={handleNext}>
          <Ionicons name="arrow-forward" size={width * 0.08} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7F6",
    justifyContent: "space-between",
    paddingTop: height * 0.06,
    paddingBottom: height * 0.04,
    paddingHorizontal: width * 0.05,
  },
  skipButton: {
    alignSelf: "flex-end",
  },
  skipButtonText: {
    fontSize: width * 0.04,
    color: "#555",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: width * 0.05,
  },
  title: {
    fontSize: width * 0.06,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: height * 0.02,
    color: "#333",
  },
  description: {
    fontSize: width * 0.04,
    textAlign: "center",
    color: "#666",
  },
  bottomContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: width * 0.05,
  },
  dotContainer: {
    flexDirection: "row",
  },
  dot: {
    width: width * 0.025,
    height: width * 0.025,
    borderRadius: width * 0.0125,
    backgroundColor: "#ccc",
    marginHorizontal: width * 0.01,
  },
  activeDot: {
    backgroundColor: "#007BFF",
  },
  arrowButton: {
    width: width * 0.12,
    height: width * 0.12,
    borderRadius: width * 0.06,
    backgroundColor: "#007BFF",
    justifyContent: "center",
    alignItems: "center",
  },
});
