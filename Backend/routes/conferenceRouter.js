const express = require("express");
const { createConferenceRoom, generateConferenceToken, getConferenceDetails } = require("../controller/conferenceController.js");
const isAuthenticated = require("../middlewares/isAuth.js");

const router = express.Router();

router.post("/create", isAuthenticated, createConferenceRoom);
router.get("/token/:roomId/:role/:userId", isAuthenticated, generateConferenceToken);
router.get("/details/:roomId", isAuthenticated, getConferenceDetails); // New route to get conference details by database ID

// router.get("/rooms", isAuthenticated, conferenceCtrl.getRooms);
// router.post("/join/:roomId", isAuthenticated, conferenceCtrl.joinRoom);
// router.get("/rooms/:roomId", isAuthenticated, conferenceCtrl.getRoomById);

module.exports = router;
