// VirtualClassroom/app/auth/login.js
import React, { useEffect, useState } from "react"; // Added useState for error message
import {
    View, StyleSheet, TextInput, Text, TouchableOpacity,
    ActivityIndicator // Use ActivityIndicator for loading state
} from "react-native";
import { Formik } from "formik";
import * as Yup from "yup";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { loginUser } from "../(services)/api/api";
import { useDispatch } from "react-redux";
// Import the correct action
import { loginSuccess } from "../(redux)/authSlice"; // Use loginSuccess action

const LoginSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Email is required"),
  password: Yup.string().required("Password is required"), // Removed min length check here, backend handles validity
});

export default function Login() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [errorMessage, setErrorMessage] = useState(''); // State for login error messages

  // Use React Query's mutation for login
  const mutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      // data contains { message, token, id, email, username, role } from backend
      console.log("Login successful, dispatching loginSuccess with:", data);
      dispatch(loginSuccess(data)); // Dispatch loginSuccess with the full payload
      // Navigation is handled by the ProtectedRoute or layout based on Redux state now
      // router.replace("/(tabs)"); // Remove direct navigation from here
      setErrorMessage(''); // Clear error message on success
    },
    onError: (error) => {
      // Handle login errors (e.g., invalid credentials)
      const message = error?.response?.data?.message || "Login failed. Please check your credentials.";
      console.error("Login failed:", message);
      setErrorMessage(message); // Show error message to the user
    },
  });

  // Note: Redirection based on auth state should ideally be handled in a higher-level
  // component or layout file (like _layout.js or a specific AuthLayout) that listens
  // to the Redux auth state. The useEffect here is removed as it might cause issues
  // if the component re-renders before the state update is fully processed.

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      {/* Display Login Error Message */}
      {errorMessage ? <Text style={styles.errorTextServer}>{errorMessage}</Text> : null}

      <Formik
        initialValues={{ email: "", password: "" }}
        validationSchema={LoginSchema}
        onSubmit={(values) => {
          // Clear previous errors and call the mutation
          setErrorMessage('');
          console.log("Submitting login form:", values.email);
          mutation.mutate(values);
        }}
      >
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          touched,
        }) => (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              onChangeText={handleChange("email")}
              onBlur={handleBlur("email")}
              value={values.email}
              keyboardType="email-address"
              autoCapitalize="none" // Good practice for email
            />
            {/* Display validation errors */}
            {errors.email && touched.email && <Text style={styles.errorTextValidation}>{errors.email}</Text>}

            <TextInput
              style={styles.input}
              placeholder="Password"
              onChangeText={handleChange("password")}
              onBlur={handleBlur("password")}
              value={values.password}
              secureTextEntry
            />
            {/* Display validation errors */}
            {errors.password && touched.password && <Text style={styles.errorTextValidation}>{errors.password}</Text>}

            <TouchableOpacity
              style={[styles.button, mutation.isPending && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={mutation.isPending} // Disable button while logging in
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </Formik>

       {/* Link to Register */}
       <TouchableOpacity onPress={() => router.push('/auth/register')} style={styles.linkButton}>
          <Text style={styles.linkText}>Don't have an account? Register</Text>
       </TouchableOpacity>
    </View>
  );
}

// --- Styles --- (Add styles for server errors and validation errors)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20, // Consistent padding
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 28, // Consistent title size
    fontWeight: "bold",
    marginBottom: 20,
    color: '#333',
  },
  form: {
    width: "100%",
  },
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  // Style for Server/API Errors
   errorTextServer: {
    color: "red",
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  // Style for Formik/Yup Validation Errors
  errorTextValidation: {
    color: "red",
    alignSelf: 'flex-start',
    marginLeft: 5,
    marginBottom: 8,
    fontSize: 13,
  },
  button: {
    height: 50,
    backgroundColor: "#6200ea",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginTop: 10, // Adjusted margin
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  buttonDisabled: {
     backgroundColor: '#b39ddb', // Lighter shade when disabled
   },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#6200ea',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});