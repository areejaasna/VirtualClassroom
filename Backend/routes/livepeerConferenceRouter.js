const express = require("express");
const { createLivepeerConferenceRoom, getLivepeerConferenceDetails } = require("../controller/livepeerConferenceController");
const isAuthenticated = require("../middlewares/isAuth"); // Assuming you still want authentication for conference creation/details

const router = express.Router();

// Route to create a new Livepeer conference room and stream
router.post("/create", isAuthenticated, createLivepeerConferenceRoom);

// Route to get Livepeer conference details by database room ID
router.get("/details/:roomId", isAuthenticated, getLivepeerConferenceDetails);

// You might add more routes here for joining participants, etc.

module.exports = router;
