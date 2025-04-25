import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';

// This file primarily exists to satisfy the Tabs navigator.
// The actual content rendering based on auth state is handled by VirtualClassroom/app/index.js
// You could potentially redirect immediately, but often just rendering minimal content works.

export default function TabIndexPlaceholder() {
  // Option 1: Show minimal content (safer if root index handles auth redirect logic properly)
 return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {/* <ActivityIndicator size="large" />
      <Text>Loading Home...</Text> */}
      {/* Or even just an empty view */}
    </View>
  );

 // Option 2: Redirect (use cautiously, ensure no redirect loops with root index)
 // return <Redirect href="/" />; 
}
