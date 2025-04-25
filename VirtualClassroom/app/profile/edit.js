import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, TextInput, Text, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useRouter, useFocusEffect } from 'expo-router'; // useFocusEffect to refetch data on screen focus
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';

import { getUserProfile, updateUserProfile } from '../(services)/api/api';
import { updateUserInState } from '../(redux)/authSlice'; // Action to update Redux state
import ProtectedRoute from '../../components/ProtectedRoute'; // Assuming this checks auth

// Define roles (Consider sharing this from a constants file)
const ROLES = ['Student', 'Teacher', 'Admin'];

// --- Role-Specific Validation Schema ---
const EditProfileSchema = (role) => Yup.object().shape({
  // Common editable fields (add more if needed, e.g., phoneNumber)
  phoneNumber: Yup.string().matches(/^[0-9]+$/, "Must be only digits").min(10, 'Must be at least 10 digits').nullable(), // Example validation

  // --- Conditional Fields based on role ---
  firstName: Yup.string().when([], { // No dependency on 'role' as role is fixed here
    is: () => role === 'Student' || role === 'Teacher',
    then: (schema) => schema.required('First Name is required'),
    otherwise: (schema) => schema.optional(),
  }),
  lastName: Yup.string().when([], {
    is: () => role === 'Student' || role === 'Teacher',
    then: (schema) => schema.required('Last Name is required'),
    otherwise: (schema) => schema.optional(),
  }),
  collegeOrUniversity: Yup.string().when([], {
     is: () => role === 'Student' || role === 'Teacher',
    then: (schema) => schema.required('College/University is required'),
    otherwise: (schema) => schema.optional(),
  }),
  department: Yup.string().when([], {
    is: () => role === 'Teacher',
    then: (schema) => schema.required('Department is required'),
    otherwise: (schema) => schema.optional(),
  }),
  designation: Yup.string().when([], {
    is: () => role === 'Teacher',
    then: (schema) => schema.required('Designation is required'),
    otherwise: (schema) => schema.optional(),
  }),
  fullName: Yup.string().when([], {
    is: () => role === 'Admin',
    then: (schema) => schema.required('Full Name is required'),
    otherwise: (schema) => schema.optional(),
  }),
});


export default function EditProfile() {
  const router = useRouter();
  const dispatch = useDispatch();
  const queryClient = useQueryClient(); // To invalidate profile query after update
  const authUser = useSelector((state) => state.auth.user); // Get current user from Redux
  const [errorMessage, setErrorMessage] = useState('');

   // Fetch profile data using the same key as the profile view screen
  const { data: profileQueryData, isLoading: isLoadingProfile, isError: isProfileError, error: profileError, refetch } = useQuery({
    queryKey: ['userProfile', authUser?.id],
    queryFn: getUserProfile,
    enabled: !!authUser, // Only fetch if logged in
     // We might want fresh data when editing
     // staleTime: 0,
     // cacheTime: 0, // Or disable cache for this screen if always fetching fresh
  });

  // Refetch data when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (authUser?.id) {
          console.log("Edit screen focused, refetching profile...");
         refetch();
      }
    }, [authUser?.id, refetch])
  );

   // Mutation for updating the profile
  const updateMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: (data) => {
        console.log("Profile update successful:", data);
        // Update the Redux state with the new user data
        dispatch(updateUserInState(data.user));

        // Invalidate the 'userProfile' query cache to ensure the profile screen shows updated data
        queryClient.invalidateQueries({ queryKey: ['userProfile', authUser?.id] });

        Alert.alert("Success", data.message || "Profile updated successfully!");
        // Navigate back to the profile view screen
        if(router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/profile'); // Fallback if cannot go back
        }
    },
    onError: (error) => {
        const message = error?.response?.data?.message || "Profile update failed.";
        console.error("Profile update failed:", error);
        setErrorMessage(message);
        Alert.alert("Error", message); // Show error alert
    },
  });

  // Get the actual profile data object
  const currentProfile = profileQueryData?.user;

  // --- Render logic ---

  if (isLoadingProfile) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#6200ea" /></View>;
  }

  if (isProfileError || !currentProfile) {
    const message = profileError?.response?.data?.message || profileError?.message || "Could not load profile data for editing.";
    return (
        <View style={styles.centered}>
            <Text style={styles.errorText}>{message}</Text>
             <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
                 <Text style={styles.buttonText}>Retry</Text>
             </TouchableOpacity>
             <TouchableOpacity onPress={() => router.back()} style={[styles.retryButton, styles.cancelButton]}>
                 <Text style={styles.buttonText}>Back</Text>
             </TouchableOpacity>
        </View>
    );
  }

  // Determine initial form values from fetched profile data
  const initialValues = {
    // Pre-fill common fields
    phoneNumber: currentProfile.phoneNumber || '',
    // Pre-fill role-specific fields
    firstName: currentProfile.firstName || '',
    lastName: currentProfile.lastName || '',
    collegeOrUniversity: currentProfile.collegeOrUniversity || '',
    department: currentProfile.department || '',
    designation: currentProfile.designation || '',
    fullName: currentProfile.fullName || '',
    // Include non-editable fields for context if needed, but don't submit them
    // email: currentProfile.email,
    // username: currentProfile.username,
  };

   // Get the correct validation schema based on the user's role
   const validationSchema = EditProfileSchema(currentProfile.role);

  return (
    <ProtectedRoute>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Edit Profile</Text>

          {/* Display Server Error Message from Update */}
          {errorMessage ? <Text style={styles.errorTextServer}>{errorMessage}</Text> : null}

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            enableReinitialize // Important: Update form values if profile data reloads
            onSubmit={(values) => {
              // Filter values to only send editable fields based on role
              const dataToSubmit = {};
              const allowedFields = { // Should match backend allowed fields
                  'Student': ['firstName', 'lastName', 'phoneNumber', 'collegeOrUniversity'],
                  'Teacher': ['firstName', 'lastName', 'phoneNumber', 'collegeOrUniversity', 'department', 'designation'],
                  'Admin': ['fullName', 'phoneNumber']
              };

               const fieldsForRole = allowedFields[currentProfile.role] || [];
               fieldsForRole.forEach(field => {
                   // Only include field if it's different from initial or explicitly allowed
                   // Or simply include all allowed fields for this role
                   if (values.hasOwnProperty(field)) {
                      dataToSubmit[field] = values[field];
                   }
               });

              console.log("Submitting profile updates:", dataToSubmit);
              setErrorMessage(''); // Clear previous errors
              updateMutation.mutate(dataToSubmit);
            }}
          >
            {({
              handleChange,
              handleBlur,
              handleSubmit,
              values,
              errors,
              touched,
              isSubmitting, // Provided by Formik, maps well to mutation loading state
            }) => (
              <View style={styles.form}>

                {/* --- Conditionally Render Fields based on Role --- */}

                {/* Student & Teacher Fields */}
                {(currentProfile.role === 'Student' || currentProfile.role === 'Teacher') && (
                  <>
                    <Text style={styles.label}>First Name:</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="First Name"
                      onChangeText={handleChange("firstName")}
                      onBlur={handleBlur("firstName")}
                      value={values.firstName}
                    />
                    {errors.firstName && touched.firstName ? (
                      <Text style={styles.errorTextValidation}>{errors.firstName}</Text>
                    ) : null}

                    <Text style={styles.label}>Last Name:</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Last Name"
                      onChangeText={handleChange("lastName")}
                      onBlur={handleBlur("lastName")}
                      value={values.lastName}
                    />
                    {errors.lastName && touched.lastName ? (
                      <Text style={styles.errorTextValidation}>{errors.lastName}</Text>
                    ) : null}

                    <Text style={styles.label}>College/University:</Text>
                     <TextInput
                      style={styles.input}
                      placeholder="College/University"
                      onChangeText={handleChange("collegeOrUniversity")}
                      onBlur={handleBlur("collegeOrUniversity")}
                      value={values.collegeOrUniversity}
                    />
                    {errors.collegeOrUniversity && touched.collegeOrUniversity ? (
                      <Text style={styles.errorTextValidation}>{errors.collegeOrUniversity}</Text>
                    ) : null}
                  </>
                )}

                 {/* Teacher Specific Fields */}
                 {currentProfile.role === 'Teacher' && (
                  <>
                    <Text style={styles.label}>Department:</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Department"
                      onChangeText={handleChange("department")}
                      onBlur={handleBlur("department")}
                      value={values.department}
                    />
                    {errors.department && touched.department ? (
                      <Text style={styles.errorTextValidation}>{errors.department}</Text>
                    ) : null}

                    <Text style={styles.label}>Designation:</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Designation"
                      onChangeText={handleChange("designation")}
                      onBlur={handleBlur("designation")}
                      value={values.designation}
                    />
                    {errors.designation && touched.designation ? (
                      <Text style={styles.errorTextValidation}>{errors.designation}</Text>
                    ) : null}
                  </>
                )}

                {/* Admin Specific Fields */}
                {currentProfile.role === 'Admin' && (
                  <>
                     <Text style={styles.label}>Full Name:</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Full Name"
                      onChangeText={handleChange("fullName")}
                      onBlur={handleBlur("fullName")}
                      value={values.fullName}
                    />
                    {errors.fullName && touched.fullName ? (
                      <Text style={styles.errorTextValidation}>{errors.fullName}</Text>
                    ) : null}
                  </>
                )}

                 {/* Common Editable Field: Phone Number */}
                 {/* Conditionally show based on whether role *can* have phone */}
                 {(currentProfile.role === 'Student' || currentProfile.role === 'Teacher' || currentProfile.role === 'Admin') && (
                    <>
                        <Text style={styles.label}>Phone Number:</Text>
                        <TextInput
                        style={styles.input}
                        placeholder="Phone Number"
                        onChangeText={handleChange("phoneNumber")}
                        onBlur={handleBlur("phoneNumber")}
                        value={values.phoneNumber}
                        keyboardType="phone-pad"
                        />
                        {errors.phoneNumber && touched.phoneNumber ? (
                        <Text style={styles.errorTextValidation}>{errors.phoneNumber}</Text>
                        ) : null}
                   </>
                 )}


                {/* --- Non-Editable Fields (Display Only) --- */}
                <Text style={styles.label}>Email (Cannot Change):</Text>
                <TextInput style={[styles.input, styles.readOnlyInput]} value={currentProfile.email} editable={false} />

                <Text style={styles.label}>Username (Cannot Change):</Text>
                <TextInput style={[styles.input, styles.readOnlyInput]} value={currentProfile.username} editable={false} />


                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.button, updateMutation.isPending && styles.buttonDisabled]}
                  onPress={handleSubmit}
                   // Use mutation's pending state instead of Formik's isSubmitting
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>

                 {/* Cancel Button */}
                 <TouchableOpacity
                   style={[styles.button, styles.cancelButton]}
                   onPress={() => router.back()}
                   disabled={updateMutation.isPending} // Disable while saving
                 >
                   <Text style={styles.buttonText}>Cancel</Text>
                 </TouchableOpacity>

              </View>
            )}
          </Formik>
        </View>
      </ScrollView>
    </ProtectedRoute>
  );
}

// --- Styles --- (Borrow and adapt from Register/Login/Profile)
const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    // justifyContent: "center", // Align top
    alignItems: "center",
    padding: 20,
    paddingTop: 30,
    backgroundColor: "#f5f5f5",
  },
   centered: { // For loading/error states
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     padding: 20,
   },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: '#333',
  },
  form: {
    width: "100%",
    backgroundColor: '#fff', // Card-like background for form
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontSize: 15, // Slightly smaller label
    fontWeight: '500',
    marginBottom: 5,
    color: '#555',
    marginTop: 10, // Add space above labels
  },
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 5, // Reduce margin below input
    backgroundColor: "#fff",
    fontSize: 16,
  },
  readOnlyInput: {
      backgroundColor: '#eee', // Indicate non-editable
      color: '#666',
  },
  errorTextValidation: { // Formik validation errors
    color: "red",
    alignSelf: 'flex-start',
    marginLeft: 5,
    marginBottom: 10, // Space below validation error
    fontSize: 13,
  },
   errorTextServer: { // Errors from API mutation
    color: "red",
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
   errorText: { // General error text for loading failures
    fontSize: 16,
    color: "red",
    textAlign: 'center',
    marginBottom: 15,
  },
  button: {
    height: 50,
    backgroundColor: "#6200ea",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginTop: 15, // Adjusted margin
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  buttonDisabled: {
     backgroundColor: '#b39ddb',
   },
   cancelButton: {
      backgroundColor: '#888', // Grey for cancel
      marginTop: 10,
   },
   retryButton: { // Style for retry button on error
      height: 45,
      backgroundColor: "#6200ea",
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 8,
      paddingHorizontal: 30,
      marginTop: 10,
      width: '80%', // Make retry/back buttons reasonably wide
   },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
