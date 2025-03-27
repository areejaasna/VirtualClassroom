import axios from "axios";
import Constants from 'expo-constants'; // Expo Constants module

export const registerUser = async (user) => {
  const { BACKEND_API } = Constants.expoConfig.extra;
  console.log(user);
  const response = await axios.post(
    `${BACKEND_API}api/users/register`,
    user,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};
export const loginUser = async (user) => {
  const { BACKEND_API } = Constants.expoConfig.extra;
  const response = await axios.post(
    `${BACKEND_API}api/users/login`,
    user,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};
