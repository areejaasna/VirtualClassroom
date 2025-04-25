import React, { useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons'; // Assuming Ionicons are available, adjust if needed

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
          <Ionicons name="arrow-forward" size={30} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7F6", // Assuming a light background based on Figma
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  skipButton: {
    alignSelf: "flex-end",
  },
  skipButtonText: {
    fontSize: 16,
    color: "#555",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#333",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
  },
  bottomContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  dotContainer: {
    flexDirection: "row",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ccc",
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: "#007BFF", // Or a color matching the Figma active dot
  },
  arrowButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#007BFF", // Or a color matching the Figma arrow button background
    justifyContent: "center",
    alignItems: "center",
  },
});
