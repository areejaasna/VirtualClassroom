import React, { useEffect } from "react";
import { View, StyleSheet, TextInput, Text, TouchableOpacity } from "react-native";
import { Formik } from "formik";
import * as Yup from "yup";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { loginUser } from "../(services)/api/api";
import { useDispatch, useSelector } from "react-redux";
import { loginAction } from "../(redux)/authSlice";

const LoginSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string().min(6, "Too Short!").required("Required"),
});

export default function Login() {
  const router = useRouter();
  const dispatch = useDispatch();
  const mutation = useMutation({
    mutationFn: loginUser,
    mutationKey: ["login"],
  });

  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    if (user) {
      router.replace("/(tabs)"); // Use replace to avoid going back to login
    }
  }, [user]); // Trigger when 'user' updates

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Formik
        initialValues={{ email: "", password: "" }}
        validationSchema={LoginSchema}
        onSubmit={async (values, { setSubmitting }) => {
          try {
            const data = await mutation.mutateAsync(values);
            dispatch(loginAction(data)); // Update Redux state
            setSubmitting(false);
          } catch (error) {
            console.error("Login failed:", error);
            setSubmitting(false);
          }
        }}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              onChangeText={handleChange("email")}
              onBlur={handleBlur("email")}
              value={values.email}
              keyboardType="email-address"
            />
            {errors.email && touched.email && <Text style={styles.errorText}>{errors.email}</Text>}
            <TextInput
              style={styles.input}
              placeholder="Password"
              onChangeText={handleChange("password")}
              onBlur={handleBlur("password")}
              value={values.password}
              secureTextEntry
            />
            {errors.password && touched.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
            <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
              <Text style={styles.buttonText}>{isSubmitting ? "Logging in..." : "Login"}</Text>
            </TouchableOpacity>
          </View>
        )}
      </Formik>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20, // Slightly more padding
    backgroundColor: '#ffffff', // Cleaner white background
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30, // Increased spacing
    color: '#333', // Darker text color
  },
  form: {
    width: '100%',
    maxWidth: 400, // Optional: Limit max width on larger screens
  },
  input: {
    height: 55, // Slightly taller
    borderColor: '#ddd', // Lighter border
    borderWidth: 1,
    borderRadius: 10, // Softer corners
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9', // Very light grey background for input
    fontSize: 16,
     // Add shadow for depth (optional, adjust as needed)
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2, // for Android
  },
  errorText: {
    color: 'red',
    marginBottom: 10, // Keep some space
    marginTop: -10, // Reduce space above if needed
    fontSize: 12,
    paddingLeft: 5,
  },
  button: {
    height: 55,
    backgroundColor: '#007AFF', // Standard blue
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10, // Softer corners
    marginTop: 20, // Increased spacing before button
     // Add shadow for depth (optional)
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3, // for Android
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600', // Slightly less bold
  },
});
