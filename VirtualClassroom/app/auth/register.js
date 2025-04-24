import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView, // Import ScrollView
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Formik } from "formik";
import * as Yup from "yup";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { registerUser } from "../(services)/api/api";

// Expanded validation schema
const RegisterSchema = Yup.object().shape({
  username: Yup.string().required("Username is required"),
  firstName: Yup.string().required("First name is required"),
  lastName: Yup.string().required("Last name is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  phone: Yup.string().required("Phone number is required"), // Basic validation, consider adding regex for format
  role: Yup.string()
    .required("Role is required")
    .oneOf(['Student', 'Teacher', 'Admin'], 'Role must be Student, Teacher, or Admin'),
  password: Yup.string().min(6, "Password too short!").required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password"), null], "Passwords must match")
    .required("Confirm Password is required"),
  college: Yup.string().required("College is required"),
});

export default function Register() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: registerUser,
    mutationKey: ["register"],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingView}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Register</Text>
        {mutation?.isError ? (
          <Text style={styles.errorText}>
            {mutation?.error?.response?.data?.message || mutation?.error?.message}
          </Text>
        ) : null}
        {mutation?.isSuccess ? (
          <Text style={styles.successText}>Registration successful! Redirecting...</Text>
        ) : null}
        <Formik
          // Expanded initial values
          initialValues={{
            username: "",
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            role: "", // Default to empty, or set 'Student'
            password: "",
            confirmPassword: "",
            college: "",
          }}
          validationSchema={RegisterSchema}
          onSubmit={(values, { setSubmitting }) => {
            // Prepare data object with all fields except confirmPassword
            const { confirmPassword, ...dataToSend } = values;
            console.log("Submitting registration data:", dataToSend);
            mutation
              .mutateAsync(dataToSend)
              .then(() => {
                // Success: Navigate after a short delay
                setTimeout(() => {
                  router.push("/(tabs)"); // Or login screen router.push("/auth/login");
                }, 1500);
              })
              .catch((error) => {
                // Error message is handled by the isError check above
                console.error("Registration failed:", error.response?.data || error.message);
              })
              .finally(() => {
                 setSubmitting(false);
              });
          }}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
            isSubmitting // Get isSubmitting from Formik
          }) => (
            <View style={styles.form}>
              {/* Username Input */}
              <TextInput
                style={styles.input}
                placeholder="Username"
                onChangeText={handleChange("username")}
                onBlur={handleBlur("username")}
                value={values.username}
              />
              {errors.username && touched.username ? (
                <Text style={styles.errorText}>{errors.username}</Text>
              ) : null}

              {/* First Name Input */}
              <TextInput
                style={styles.input}
                placeholder="First Name"
                onChangeText={handleChange("firstName")}
                onBlur={handleBlur("firstName")}
                value={values.firstName}
              />
              {errors.firstName && touched.firstName ? (
                <Text style={styles.errorText}>{errors.firstName}</Text>
              ) : null}

              {/* Last Name Input */}
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                onChangeText={handleChange("lastName")}
                onBlur={handleBlur("lastName")}
                value={values.lastName}
              />
              {errors.lastName && touched.lastName ? (
                <Text style={styles.errorText}>{errors.lastName}</Text>
              ) : null}

              {/* Email Input */}
              <TextInput
                style={styles.input}
                placeholder="Email"
                onChangeText={handleChange("email")}
                onBlur={handleBlur("email")}
                value={values.email}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && touched.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}

              {/* Phone Input */}
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                onChangeText={handleChange("phone")}
                onBlur={handleBlur("phone")}
                value={values.phone}
                keyboardType="phone-pad"
              />
              {errors.phone && touched.phone ? (
                <Text style={styles.errorText}>{errors.phone}</Text>
              ) : null}

              {/* Role Input (Consider replacing with Picker) */}
              <TextInput
                style={styles.input}
                placeholder="Role (Student, Teacher, Admin)"
                onChangeText={handleChange("role")}
                onBlur={handleBlur("role")}
                value={values.role}
                autoCapitalize="words"
              />
              {errors.role && touched.role ? (
                <Text style={styles.errorText}>{errors.role}</Text>
              ) : null}

              {/* College Input */}
              <TextInput
                style={styles.input}
                placeholder="College"
                onChangeText={handleChange("college")}
                onBlur={handleBlur("college")}
                value={values.college}
              />
              {errors.college && touched.college ? (
                <Text style={styles.errorText}>{errors.college}</Text>
              ) : null}

              {/* Password Input */}
              <TextInput
                style={styles.input}
                placeholder="Password"
                onChangeText={handleChange("password")}
                onBlur={handleBlur("password")}
                value={values.password}
                secureTextEntry
              />
              {errors.password && touched.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}

              {/* Confirm Password Input */}
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                onChangeText={handleChange("confirmPassword")}
                onBlur={handleBlur("confirmPassword")}
                value={values.confirmPassword}
                secureTextEntry
              />
              {errors.confirmPassword && touched.confirmPassword ? (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              ) : null}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.button, (isSubmitting || mutation.isPending) && styles.buttonDisabled]} // Style updates for disabled state
                onPress={handleSubmit}
                disabled={isSubmitting || mutation.isPending} // Disable button
              >
                {isSubmitting || mutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Register</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </Formik>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flexGrow: 1, // Changed from flex: 1 to allow scrolling
    justifyContent: "center",
    alignItems: "center",
    padding: 20, // Increased padding
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 28, // Slightly smaller title
    fontWeight: "bold",
    marginBottom: 20,
    color: '#333',
  },
  form: {
    width: "100%",
    maxWidth: 400, // Added maxWidth for better layout on larger screens
  },
  input: {
    height: 48,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 12, // Adjusted margin
    backgroundColor: "#fff",
    fontSize: 16,
  },
  errorText: {
    color: "red",
    marginBottom: 10, // Adjusted margin
    fontSize: 12,
    marginLeft: 5, // Indent error messages slightly
  },
  successText: {
    color: "green",
    marginBottom: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    height: 50,
    backgroundColor: "#6200ea",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginTop: 10, // Adjusted margin
    elevation: 2, // Added subtle shadow for Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  buttonDisabled: {
    backgroundColor: "#ccc", // Style for disabled button
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
