import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView, // Use ScrollView for longer forms
  Platform, // For platform-specific styling if needed
} from "react-native";
import { Picker } from '@react-native-picker/picker'; // Import Picker
import { Formik } from "formik";
import * as Yup from "yup";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { registerUser } from "../(services)/api/api"; // Assuming this function sends the data object as is

// Define roles
const ROLES = ['Student', 'Teacher', 'Admin'];

// --- Validation Schema ---
const RegisterSchema = Yup.object().shape({
  role: Yup.string().oneOf(ROLES).required("Role is required"),
  username: Yup.string().required("Username is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  password: Yup.string().min(6, "Password must be at least 6 characters").required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password"), null], "Passwords must match")
    .required("Confirm Password is required"),

  // --- Conditional Fields ---
  firstName: Yup.string().when('role', {
    is: (role) => role === 'Student' || role === 'Teacher',
    then: (schema) => schema.required('First Name is required'),
    otherwise: (schema) => schema.optional(),
  }),
  lastName: Yup.string().when('role', {
    is: (role) => role === 'Student' || role === 'Teacher',
    then: (schema) => schema.required('Last Name is required'),
    otherwise: (schema) => schema.optional(),
  }),
   phoneNumber: Yup.string().when('role', {
    is: (role) => role === 'Student' || role === 'Teacher',
    then: (schema) => schema.required('Phone Number is required'), // Add more specific validation (e.g., regex) if needed
    otherwise: (schema) => schema.optional(),
  }),
  collegeOrUniversity: Yup.string().when('role', {
     is: (role) => role === 'Student' || role === 'Teacher',
    then: (schema) => schema.required('College/University is required'),
    otherwise: (schema) => schema.optional(),
  }),
  department: Yup.string().when('role', {
    is: 'Teacher',
    then: (schema) => schema.required('Department is required'),
    otherwise: (schema) => schema.optional(),
  }),
  designation: Yup.string().when('role', {
    is: 'Teacher',
    then: (schema) => schema.required('Designation is required'),
    otherwise: (schema) => schema.optional(),
  }),
  fullName: Yup.string().when('role', {
    is: 'Admin',
    then: (schema) => schema.required('Full Name is required'),
    otherwise: (schema) => schema.optional(),
  }),
});

export default function Register() {
  const router = useRouter();
  // No need for separate message state, mutation object has status flags
  // const [message, setMessage] = useState("");
  // const [messageType, setMessageType] = useState("");

  const mutation = useMutation({
    mutationFn: registerUser,
    mutationKey: ["register"],
    onSuccess: () => {
      // Handle successful registration (e.g., show success message, navigate)
      // setMessage("Registration successful!"); // Can use mutation.isSuccess flag directly
      // setMessageType("success");
      alert("Registration successful!"); // Simple alert for now
      // Consider navigating to login or a confirmation page instead of tabs directly
      router.push("/auth/login");
      // setTimeout(() => {
      //   // setMessage("");
      //   // router.push("/(tabs)"); // Needs update for role-based home pages later
      //   router.push("/auth/login");
      // }, 1500);
    },
    onError: (error) => {
      // Handle error (e.g., show error message)
      // setMessage(error?.response?.data?.message || "Registration failed");
      // setMessageType("error");
      // Error message is displayed below using mutation.error
    }
  });

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Register</Text>

        {/* Display Server Error Message */}
        {mutation?.isError && (
          <Text style={styles.errorText}>
            {mutation.error?.response?.data?.message || mutation.error?.message || "An error occurred"}
          </Text>
        )}

         {/* Display Success Message (Optional, often handled by navigation) */}
         {/* {mutation?.isSuccess && (
           <Text style={styles.successText}>Registration successful!</Text>
         )} */}

        <Formik
          initialValues={{
            role: ROLES[0], // Default to Student
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            firstName: '',
            lastName: '',
            phoneNumber: '',
            collegeOrUniversity: '',
            department: '',
            designation: '',
            fullName: '',
          }}
          validationSchema={RegisterSchema}
          onSubmit={(values) => {
            // Construct data based on role, only include relevant fields
            const dataToSend = {
              role: values.role,
              username: values.username,
              email: values.email,
              password: values.password, // Backend controller expects the raw password
            };

            if (values.role === 'Student' || values.role === 'Teacher') {
              dataToSend.firstName = values.firstName;
              dataToSend.lastName = values.lastName;
              dataToSend.phoneNumber = values.phoneNumber;
              dataToSend.collegeOrUniversity = values.collegeOrUniversity;
            }
            if (values.role === 'Teacher') {
              dataToSend.department = values.department;
              dataToSend.designation = values.designation;
            }
            if (values.role === 'Admin') {
              dataToSend.fullName = values.fullName;
            }
            console.log("Submitting data:", dataToSend); // For debugging
            mutation.mutate(dataToSend); // Use mutate, not mutateAsync unless specific async handling is needed here
          }}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            setFieldValue, // Needed to update role from Picker
            values,
            errors,
            touched,
          }) => (
            <View style={styles.form}>

              {/* Role Selector */}
              <Text style={styles.label}>Select Role:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={values.role}
                  style={styles.picker}
                  onValueChange={(itemValue) =>
                    setFieldValue('role', itemValue) // Update Formik state
                  }
                  itemStyle={styles.pickerItem} // Style individual items if needed
                >
                  {ROLES.map((role) => (
                    <Picker.Item key={role} label={role} value={role} />
                  ))}
                </Picker>
              </View>
               {errors.role && touched.role ? (
                 <Text style={styles.errorText}>{errors.role}</Text>
               ) : null}


              {/* --- Common Fields --- */}
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

              {/* --- Conditional Fields --- */}

              {/* Student & Teacher Fields */}
              {(values.role === 'Student' || values.role === 'Teacher') && (
                <>
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

                   <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    onChangeText={handleChange("phoneNumber")}
                    onBlur={handleBlur("phoneNumber")}
                    value={values.phoneNumber}
                    keyboardType="phone-pad"
                  />
                  {errors.phoneNumber && touched.phoneNumber ? (
                    <Text style={styles.errorText}>{errors.phoneNumber}</Text>
                  ) : null}

                   <TextInput
                    style={styles.input}
                    placeholder="College/University"
                    onChangeText={handleChange("collegeOrUniversity")}
                    onBlur={handleBlur("collegeOrUniversity")}
                    value={values.collegeOrUniversity}
                  />
                  {errors.collegeOrUniversity && touched.collegeOrUniversity ? (
                    <Text style={styles.errorText}>{errors.collegeOrUniversity}</Text>
                  ) : null}
                </>
              )}

              {/* Teacher Specific Fields */}
              {values.role === 'Teacher' && (
                <>
                   <TextInput
                    style={styles.input}
                    placeholder="Department"
                    onChangeText={handleChange("department")}
                    onBlur={handleBlur("department")}
                    value={values.department}
                  />
                  {errors.department && touched.department ? (
                    <Text style={styles.errorText}>{errors.department}</Text>
                  ) : null}

                   <TextInput
                    style={styles.input}
                    placeholder="Designation"
                    onChangeText={handleChange("designation")}
                    onBlur={handleBlur("designation")}
                    value={values.designation}
                  />
                  {errors.designation && touched.designation ? (
                    <Text style={styles.errorText}>{errors.designation}</Text>
                  ) : null}
                </>
              )}

              {/* Admin Specific Fields */}
              {values.role === 'Admin' && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    onChangeText={handleChange("fullName")}
                    onBlur={handleBlur("fullName")}
                    value={values.fullName}
                  />
                  {errors.fullName && touched.fullName ? (
                    <Text style={styles.errorText}>{errors.fullName}</Text>
                  ) : null}
                </>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.button, mutation.isPending && styles.buttonDisabled]} // Add disabled style
                onPress={handleSubmit}
                disabled={mutation.isPending} // Disable button while submitting
              >
                {mutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Register</Text>
                )}
              </TouchableOpacity>

               {/* Link to Login */}
              <TouchableOpacity onPress={() => router.push('/auth/login')} style={styles.linkButton}>
                <Text style={styles.linkText}>Already have an account? Login</Text>
              </TouchableOpacity>

            </View>
          )}
        </Formik>
      </View>
    </ScrollView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1, // Ensures content can scroll if it overflows
    justifyContent: 'center',
  },
  container: {
    flex: 1, // Takes available space within ScrollView
    justifyContent: "center",
    alignItems: "center",
    padding: 20, // Increased padding
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 28, // Slightly smaller title
    fontWeight: "bold",
    marginBottom: 20, // Adjusted margin
    color: '#333',
  },
  form: {
    width: "100%",
  },
   label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
    color: '#555',
  },
  pickerContainer: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "#fff",
    justifyContent: 'center', // Center picker content vertically
  },
  picker: {
    height: 50,
    width: '100%',
    // Note: Direct styling of Picker itself is limited, especially on Android.
    // The container handles border, background etc.
  },
   pickerItem: {
     // Styling for individual Picker items (mostly iOS)
     // height: 50, // Might affect layout
   },
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12, // Slightly reduced margin
    backgroundColor: "#fff",
    fontSize: 16,
  },
  errorText: {
    color: "red",
    // marginBottom: 10, // Adjust margin for errors
    alignSelf: 'flex-start', // Align error to the left
    marginLeft: 5, // Indent slightly
    marginBottom: 8, // Space below error
    fontSize: 13,
  },
  successText: { // Keep if needed for direct message display
    color: "green",
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    height: 50,
    backgroundColor: "#6200ea",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginTop: 10, // Adjusted margin
    elevation: 2, // Add shadow for Android
    shadowColor: '#000', // Add shadow for iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
   buttonDisabled: {
     backgroundColor: '#b39ddb', // Lighter purple when disabled
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
