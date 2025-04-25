import React, { useState, createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '../constants/themes';
// import RootLayoutNav from '../_layout'; // Assuming RootLayoutNav is what you want to wrap
import { Slot } from 'expo-router';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const AppWrapper = () => {
  const colorScheme = useColorScheme(); // Detects OS theme preference
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');

  const theme = useMemo(() => (isDarkMode ? darkTheme : lightTheme), [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Provide the theme and the toggle function through context
  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
      {/* Render the actual app layout/navigation */} 
      {/* <RootLayoutNav />  Replace with Slot if this is the intended way to wrap the layout */}
      <Slot />
    </ThemeContext.Provider>
  );
};

export default AppWrapper;
