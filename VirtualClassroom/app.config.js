import 'dotenv/config';

export default {
  expo: {
    "name": "practice",
    "slug": "practice",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "practice",
    extra: {
        BACKEND_API: process.env.BACKEND_API,
        ML_API:process.env.ML_API,
        AGORA_APP_ID: process.env.AGORA_APP_ID,
    },
  },
};