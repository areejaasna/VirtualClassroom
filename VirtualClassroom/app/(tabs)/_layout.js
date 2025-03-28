import { Tabs, useRouter, useSegments } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

export default function RootLayout() {
  const segments = useSegments(); // Read the current route segments

  // Check if we are on the dynamic [id].js page (join room page)
  const isInRoom = segments[0] === "room" && segments[1]; 

  // Use the room name as the title if we are inside a dynamic room page
  const dynamicRoomTitle = `Room: ${segments[1] || "Unknown Room"}`;

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: "Home",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="home" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="user" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="cog" color={color} />
          ),
        }}
      />
      {/* test */}
      <Tabs.Screen
        name="test"
        options={{
          title: "Test",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="comment" color={color} />
          ),
        }}
      />

      {/* Dynamic Room Tab */}
      <Tabs.Screen
        name="[id]"
        options={{
          headerShown: false, 
          title: isInRoom ? dynamicRoomTitle : "Join Room",
          tabBarStyle: { display: isInRoom ? "none" : "flex" }, // Hide tab bar inside room
          tabBarIcon: ({ color }) => 
          <FontAwesome name="video-camera" size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}
