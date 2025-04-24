import React from "react";
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { logoutAction } from "../(redux)/authSlice";
import ProtectedRoute from "../../components/ProtectedRoute";

export default function Profile() {
  const router = useRouter();
  const dispatch = useDispatch();
  // Select the user object from the Redux state
  const user = useSelector((state) => state.auth?.user);

  const handleLogout = () => {
    dispatch(logoutAction());
    // Redirect to login after logout
    router.replace("/auth/login"); // Use replace to prevent going back to profile
  };

  return (
    <ProtectedRoute>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>User Profile</Text>
        {user ? (
          <View style={styles.profileInfoContainer}>
            {/* Display all user details */}
            <Text style={styles.label}>Username:</Text>
            <Text style={styles.text}>{user.username || 'N/A'}</Text>

            <Text style={styles.label}>First Name:</Text>
            <Text style={styles.text}>{user.firstName || 'N/A'}</Text>

            <Text style={styles.label}>Last Name:</Text>
            <Text style={styles.text}>{user.lastName || 'N/A'}</Text>

            <Text style={styles.label}>Email:</Text>
            <Text style={styles.text}>{user.email || 'N/A'}</Text>

            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.text}>{user.phone || 'N/A'}</Text>

            <Text style={styles.label}>Role:</Text>
            <Text style={styles.text}>{user.role || 'N/A'}</Text>

            <Text style={styles.label}>College:</Text>
            <Text style={styles.text}>{user.college || 'N/A'}</Text>

            {/* Logout Button */}
            <TouchableOpacity style={styles.button} onPress={handleLogout}>
              <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.text}>Loading profile or no user logged in...</Text>
            {/* Optionally add a button to go to login if not logged in */}
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => router.replace('/auth/login')}
            >
              <Text style={styles.buttonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8f9fa", // Lighter background
  },
  profileInfoContainer: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20, // Add margin at the bottom
  },
  loadingContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28, // Adjusted size
    fontWeight: "bold",
    marginBottom: 30, // Increased margin
    color: '#343a40',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6c757d', // Subdued color for labels
    marginTop: 10,
    marginBottom: 2,
  },
  text: {
    fontSize: 18,
    marginBottom: 15, // Increased margin between fields
    color: '#495057',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    paddingBottom: 5,
  },
  button: {
    height: 50,
    backgroundColor: "#dc3545", // Changed to red for logout
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 20,
    marginTop: 25, // Increased margin
    width: '100%',
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
