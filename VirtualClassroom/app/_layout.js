import { Stack } from "expo-router";
import queryClient from "./(services)/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import store from "./(redux)/store";
import { Provider } from "react-redux";
import AppWrapper from "./(redux)/AppWrapper";

// This is likely the entry point for your navigation/layout
export default function RootLayout() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        {/* AppWrapper now provides the theme context */} 
        <AppWrapper>
           {/* The Stack component defines your navigation structure */}
           {/* It will be rendered inside AppWrapper */}
          <Stack screenOptions={{ headerShown: false }}/>
        </AppWrapper>
      </QueryClientProvider>
    </Provider>
  );
}
