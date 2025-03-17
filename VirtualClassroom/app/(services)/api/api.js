import axios from "axios";

export const registerUser = async (user) => {
  console.log(user);
  const response = await axios.post(
    "http://192.168.0.104:8000/api/users/register",
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
  const response = await axios.post(
    "http://192.168.0.104:8000/api/users/login",
    user,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};
