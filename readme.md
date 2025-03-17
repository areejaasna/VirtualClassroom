# Virtual Classroom App

## Overview
This is a **Virtual Classroom** application built using **React Native** with **Expo Router** for the frontend and **Node.js with MongoDB** for the backend. The project enables students and teachers to interact seamlessly in a virtual learning environment.

## Folder Structure
```
project-root/
│-- VirtualClassroom/    # Frontend (React Native with Expo Router)
│-- backend/             # Backend (Node.js with Express & MongoDB)
│-- README.md            # Documentation
```

## Features
### Frontend (React Native - Expo Router)
- User Authentication (JWT-based)
- Class Management (Join/Create Classes)
- Live Chat & Discussion Forum
- Assignments & Submissions
- Notifications & Announcements

### Backend (Node.js, Express, MongoDB)
- User Registration & Authentication (JWT + Bcrypt)
- Class & Course Management
- WebSocket-based Real-time Messaging
- File Uploads (Assignments, Notes)
- Database Management with MongoDB

## Tech Stack
### Frontend:
- React Native (Expo)
- Expo Router
- React Navigation
- Redux Toolkit


### Backend:
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication


## Installation & Setup
### Prerequisites
Ensure you have the following installed:
- **Node.js** (Latest LTS version)
- **MongoDB** (Local or Cloud-based like MongoDB Atlas)
- **Expo CLI**
- **Git**

### Backend Setup
1. Navigate to the backend directory:
   ```sh
   cd backend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file and configure environment variables:
   ```env
   PORT=8000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   ```
4. Start the backend server:
   ```sh
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```sh
   cd VirtualClassroom
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the Expo development server:
   ```sh
   npx expo start
   ```



## Contributing
1. Fork the repository
2. Create a new branch (`git checkout -b feature-name`)
3. Commit your changes (`git commit -m 'Added feature'`)
4. Push to the branch (`git push origin feature-name`)
5. Create a pull request


---
**Happy Coding! 🚀**