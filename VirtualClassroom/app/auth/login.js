import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Text,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Formik } from "formik";
import * as Yup from "yup";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { loginUser } from "../(services)/api/api";
import { useDispatch, useSelector } from "react-redux";
import { loginAction } from "../(redux)/authSlice";

const { height, width } = Dimensions.get('window');

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

            <TouchableOpacity onPress={() => router.push("/auth/register")}>
              <Text style={styles.registerText}>Don't have an account? Register here.</Text>
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
    justifyContent: "center",
    alignItems: "center",
    padding: height * 0.02,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: height * 0.04,
    fontWeight: "bold",
    marginBottom: height * 0.03,
  },
  form: {
    width: "100%",
  },
  input: {
    height: height * 0.06,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: width * 0.04,
    marginBottom: height * 0.02,
    backgroundColor: "#fff",
  },
  errorText: {
    color: "red",
    marginBottom: height * 0.02,
    fontSize: height * 0.018,
  },
  button: {
    height: height * 0.06,
    backgroundColor: "#6200ea",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginTop: height * 0.02,
    marginBottom: height * 0.02,
  },
  buttonText: {
    color: "#fff",
    fontSize: height * 0.022,
    fontWeight: "bold",
  },
  registerText: {
    color: "#6200ea",
    fontSize: height * 0.018,
    textAlign: "center",
    marginTop: height * 0.015,
    textDecorationLine: "underline",
  },
});
