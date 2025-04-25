import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Switch,
  StatusBar,
  ScrollView,
  FlatList,
  TextInput,
  Platform, // Import Platform
  LayoutAnimation, // Import LayoutAnimation
  UIManager, // Import UIManager
  Alert, // Import Alert for error messages
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { logoutAction } from "./(redux)/authSlice"; // Adjusted path
import { setRoomId } from "./(redux)/roomSlice"; // Adjusted path
import { useTheme } from "./(redux)/AppWrapper"; // Adjusted path
import axios from "axios";
import Constants from 'expo-constants';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Reusable Dropdown Component ---
const DropdownMenu = ({ children, theme, isDarkMode, toggleTheme, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen(!isOpen);
  };

  // Define styles inside the component to access theme prop easily
   const styles = StyleSheet.create({
        dropdownContainer: {
          position: 'absolute',
          top: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 50,
          right: 20,
          zIndex: 10, // Ensure dropdown is above other content
        },
        dropdownHeader: {
          backgroundColor: theme.secondary,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 15,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end', // Align items to the right
          minWidth: 100, // Give it some width
          elevation: 4, // Add shadow for header
        },
        dropdownHeaderText: {
           color: theme.textPrimary,
           fontWeight: 'bold',
           marginRight: 5,
        },
        dropdownContent: {
          backgroundColor: theme.secondary,
          borderRadius: 15,
          marginTop: 5,
          padding: 10,
          elevation: 3,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 2,
        },
         themeToggleContainer: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: 'space-between', // Space out elements
          marginBottom: 10, // Add margin below toggle
          paddingVertical: 5,
        },
        themeToggleText: {
          marginRight: 10, // Increased margin
          color: theme.textPrimary,
          fontSize: 14,
        },
        logoutButton: {
           backgroundColor: theme.error || '#d32f2f', // Use theme error color or default red
           padding: 10,
           borderRadius: 8,
           alignItems: "center",
        },
         logoutButtonText: {
           color: theme.buttonText || '#fff',
           fontSize: 14,
           fontWeight: "bold",
        },
      });


  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity style={styles.dropdownHeader} onPress={toggleDropdown}>
         <Text style={styles.dropdownHeaderText}>Menu</Text>
         <Text style={{color: theme.textPrimary}}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.dropdownContent}>
           <View style={styles.themeToggleContainer}>
             <Text style={styles.themeToggleText}>{isDarkMode ? "🌙 Dark" : "🌤️ Light"}</Text>
             <Switch
               trackColor={{ false: theme.primary, true: theme.primary }} // Use consistent track color
               thumbColor={isDarkMode ? theme.button : theme.secondary} // Use theme colors for thumb
               ios_backgroundColor={theme.secondary}
               onValueChange={toggleTheme}
               value={isDarkMode}
             />
           </View>
           <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
           </TouchableOpacity>
           {/* Add other dropdown items here if needed */}
           {children}
        </View>
      )}
    </View>
  );
};


// --- Main Combined Component ---
export default function CombinedIndex() {
  const { BACKEND_API } = Constants.expoConfig?.extra ?? {};
  const router = useRouter();
  const dispatch = useDispatch();
  const { theme, isDarkMode, toggleTheme } = useTheme(); // Use the theme context

  // --- Auth State ---
  const user = useSelector((state) => state.auth.user);
  const isAuthenticated = user && user.token;

  // --- Logged-in State ---
  const [rooms, setRooms] = useState([]);
  const [title, setTitle] = useState("");
  const [isLoadingRooms, setIsLoadingRooms] = useState(false); // Loading state for rooms
  const [isCreatingRoom, setIsCreatingRoom] = useState(false); // Loading state for room creation
  const roomId = useSelector((state) => state.room.roomId); // Access roomId from Redux if needed elsewhere

   // --- Fetch Rooms (only if logged in) ---
   const fetchRooms = useCallback(async () => {
     if (!isAuthenticated || !BACKEND_API) return;
     setIsLoadingRooms(true); // Start loading
     // console.log(`Fetching rooms from ${BACKEND_API}api/conference/rooms with token ${user.token ? 'present' : 'missing'}`);
     try {
       const response = await axios.get(`${BACKEND_API}api/conference/rooms`, {
         headers: { Authorization: `Bearer ${user.token}` },
       });
       // console.log("Rooms fetched:", response.data);
       setRooms(Array.isArray(response.data) ? response.data : []); // Ensure response is an array
     } catch (error) {
        const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error("Error fetching rooms:", errorMsg);
        Alert.alert("Error", `Failed to fetch rooms. ${error.response?.status === 401 ? 'Please log in again.' : ''}`);
        setRooms([]); // Clear rooms on error
     } finally {
        setIsLoadingRooms(false); // Stop loading
     }
   }, [isAuthenticated, user?.token, BACKEND_API]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRooms();
    } else {
      // Clear rooms and title when logged out
      setRooms([]);
      setTitle("");
    }
  }, [isAuthenticated, fetchRooms]);


  // --- Actions ---
  const handleLogout = () => {
    dispatch(logoutAction());
    // Component re-renders to logged-out view
  };

  const createRoom = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert("Validation Error", "Room title cannot be empty.");
      return;
    }
    if (!isAuthenticated || !BACKEND_API || !user?.id) {
      Alert.alert("Error", "Authentication, API configuration, or User ID is missing.");
      return;
    }
    // console.log(`Creating room '${trimmedTitle}' for host ${user.id} at ${BACKEND_API}api/conference/create`);
    setIsCreatingRoom(true); // Start creation loading

    try {
      const response = await axios.post(
        `${BACKEND_API}api/conference/create`,
        { title: trimmedTitle, host: user.id },
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` } }
      );
      // console.log("Room creation response:", response.data);

       if (response.data && response.data.room) {
           setRooms(prevRooms => [...prevRooms, response.data.room]);
           setTitle(""); // Reset title
           // Optionally show success message
           // Alert.alert("Success", `Room "${trimmedTitle}" created.`);
       } else {
            console.warn("Room creation response did not contain room data:", response.data);
            Alert.alert("Success (with warning)", "Room created, but couldn't update list automatically. Refreshing...");
            fetchRooms(); // Refetch rooms as a fallback
       }
    } catch (error) {
        const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error("Error creating room:", errorMsg);
        Alert.alert("Error", `Failed to create room: ${error.response?.data?.message || 'Please try again.'}`);
    } finally {
        setIsCreatingRoom(false); // Stop creation loading
    }
  };

  const handleRoomPress = (id) => {
    if (!id) {
        console.error("Attempted to navigate to room with invalid ID:", id);
        Alert.alert("Error", "Cannot navigate to this room (invalid ID).");
        return;
    }
    dispatch(setRoomId(id));
    router.push(`/(tabs)/${id}`); // Navigate to the specific room within tabs
  };

  // --- Dynamic Styles based on Theme ---
  const styles = getStyles(theme); // Function to generate styles

  // --- Render Logic ---
  if (isAuthenticated) {
    // --- Logged In View ---
    return (
      <View style={styles.authContainer}>
          <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
          <DropdownMenu
             theme={theme}
             isDarkMode={isDarkMode}
             toggleTheme={toggleTheme}
             onLogout={handleLogout}
          />

          <Text style={styles.authTitle}>Welcome, {user?.email || 'User'}</Text>

         <View style={styles.createRoomContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter New Room Title"
              placeholderTextColor={theme.textSecondary}
              value={title}
              onChangeText={setTitle}
              editable={!isCreatingRoom} // Disable input while creating
            />
            <TouchableOpacity
                style={[styles.createButton, isCreatingRoom && styles.disabledButton]} // Add disabled style
                onPress={createRoom}
                disabled={isCreatingRoom} // Disable button while creating
            >
              <Text style={styles.createButtonText}>{isCreatingRoom ? 'Creating...' : 'Create Room'}</Text>
            </TouchableOpacity>
         </View>

          <Text style={styles.subtitle}>Open Conference Rooms:</Text>
          {isLoadingRooms ? (
             <Text style={styles.loadingText}>Loading rooms...</Text>
           ) : rooms.length === 0 ? (
             <Text style={styles.noRoomsText}>No open rooms found. Create one!</Text>
           ) : (
             <FlatList
                  data={rooms}
                  keyExtractor={(item) => item._id?.toString() ?? Math.random().toString()} // Safer key extractor
                  renderItem={({ item }) => (
                      <TouchableOpacity
                          style={styles.roomItem}
                          onPress={() => handleRoomPress(item._id)}
                      >
                          <Text style={styles.roomText}>Title: {item.title}</Text>
                          {/* Display host info if available */}
                          {item.host && <Text style={styles.roomHostText}>Host ID: {typeof item.host === 'object' ? item.host._id : item.host}</Text>}
                      </TouchableOpacity>
                  )}
                  style={styles.roomList}
                  refreshing={isLoadingRooms} // Show refresh indicator while loading
                  onRefresh={fetchRooms} // Allow pull-to-refresh
             />
           )
          }
      </View>
    );
  } else {
    // --- Logged Out (Landing Page) View ---
    return (
      <View style={styles.container}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
         {/* Simple Theme Toggle for landing page */}
         <View style={styles.landingThemeToggleContainer}>
             <Text style={styles.landingThemeToggleText}>{isDarkMode ? "🌙" : "🌤️"}</Text>
             <Switch
                trackColor={{ false: theme.secondary, true: theme.primary }}
                thumbColor={isDarkMode ? theme.button : theme.secondary}
                ios_backgroundColor={theme.secondary}
                onValueChange={toggleTheme}
                value={isDarkMode}
             />
        </View>

        <ScrollView contentContainerStyle={styles.overlay}>
          <Text style={styles.mainText}>Virtual Classroom</Text>
          <Text style={styles.subText}>Engage & Market Smarter</Text>
          <Text style={styles.tagline}>AI-Powered Insights for Digital Growth</Text>

          {/* Two Column Text Section */}
          <View style={styles.textColumnsContainer}>
             <View style={styles.textColumn}>
                 <View style={styles.textBox}>
                     <Text style={styles.boxTitle}>Smart Engagement</Text>
                     <Text style={styles.boxText}>Utilize AI to enhance participation and tailor content.</Text>
                 </View>
                 <View style={styles.textBox}>
                      <Text style={styles.boxTitle}>Seamless Integration</Text>
                     <Text style={styles.boxText}>Connect effortlessly with existing marketing tools.</Text>
                 </View>
             </View>
             <View style={styles.textColumn}>
                  <View style={styles.textBox}>
                     <Text style={styles.boxTitle}>Actionable Analytics</Text>
                     <Text style={styles.boxText}>Gain deep insights into user behavior and campaign ROI.</Text>
                 </View>
                  <View style={styles.textBox}>
                      <Text style={styles.boxTitle}>Targeted Marketing</Text>
                      <Text style={styles.boxText}>Leverage AI segmentation for precise audience targeting.</Text>
                  </View>
             </View>
           </View>

          {/* Login/Register Buttons */}
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
}

// --- Styles Function ---
const getStyles = (theme) => StyleSheet.create({
  // --- General & Landing Page Styles ---
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: theme.background,
  },
  overlay: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    paddingTop: 80, // Add padding top to avoid overlap with absolute positioned elements
    backgroundColor: theme.overlay || 'rgba(0,0,0,0.3)', // Provide fallback for overlay
  },
  mainText: {
    color: theme.textPrimary,
    fontSize: 48,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subText: {
    color: theme.textPrimary,
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  tagline: {
    color: theme.textSecondary,
    fontSize: 16,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 5,
    marginBottom: 30,
  },
  textColumnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  textColumn: {
    width: '48%',
  },
  textBox: {
    backgroundColor: theme.secondary,
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    minHeight: 100,
    justifyContent: 'center',
    elevation: 2, // Add subtle shadow
  },
  boxTitle: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  boxText: {
    color: theme.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  button: {
    backgroundColor: theme.button,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 3,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: theme.buttonText,
    fontSize: 18,
    fontWeight: "bold",
  },
  landingThemeToggleContainer: { // Renamed for clarity
      position: "absolute",
      top: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 50,
      right: 20,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.secondary,
      padding: 5,
      borderRadius: 15,
      zIndex: 5, // Ensure it's above scroll content
   },
   landingThemeToggleText: { // Renamed for clarity
       marginRight: 5,
       color: theme.textPrimary,
   },

  // --- Authenticated View Styles ---
  authContainer: {
    flex: 1,
    paddingHorizontal: 20, // Horizontal padding
    paddingBottom: 20,  // Bottom padding
    paddingTop: (StatusBar.currentHeight || 0) + 70, // Adjust padding top for dropdown
    backgroundColor: theme.background, // Use theme background
  },
   authTitle: {
    fontSize: 26, // Larger title
    fontWeight: "bold",
    marginBottom: 25, // Increased margin
    textAlign: "center",
    color: theme.textPrimary, // Use theme text color
  },
   createRoomContainer: {
       marginBottom: 25, // Spacing below create section
       flexDirection: 'row', // Align input and button horizontally
       alignItems: 'center', // Vertically align items
   },
   input: {
    flex: 1, // Allow input to take available space
    height: 45, // Slightly taller input
    borderColor: theme.primary, // Use theme primary color for border
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 15, // More padding
    fontSize: 16,
    color: theme.textPrimary, // Use theme text color
    backgroundColor: theme.secondary, // Slightly different background
    marginRight: 10, // Space between input and button
  },
   createButton: {
      backgroundColor: theme.button, // Use theme button color
      paddingVertical: 12,
      paddingHorizontal: 15,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: 'center', // Center text vertically
      height: 45, // Match input height
   },
   createButtonText: {
      color: theme.buttonText, // Use theme button text color
      fontSize: 16,
      fontWeight: "bold",
   },
    disabledButton: { // Style for disabled button
      backgroundColor: theme.secondary, // Use a less prominent color
      opacity: 0.7,
   },
   subtitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10, // Adjusted margin
    marginBottom: 15, // Added margin bottom
    color: theme.textPrimary, // Use theme text color
  },
   roomList: {
       flex: 1, // Allow list to take remaining space if container has flex: 1
   },
   roomItem: {
    padding: 18, // Increased padding
    backgroundColor: theme.secondary, // Use theme secondary color
    marginVertical: 8,
    borderRadius: 12, // More rounded corners
    elevation: 2, // Subtle shadow
  },
   roomText: {
    fontSize: 17, // Slightly larger text
    fontWeight: '500', // Medium weight
    color: theme.textPrimary, // Use theme text color
    marginBottom: 4, // Space below title
  },
   roomHostText: {
      fontSize: 13,
      color: theme.textSecondary,
   },
   loadingText: { // Style for loading indicator
      textAlign: 'center',
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 30,
   },
   noRoomsText: {
      textAlign: 'center',
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 30,
   },
   // Note: Dropdown styles are now within the DropdownMenu component's scope
});

