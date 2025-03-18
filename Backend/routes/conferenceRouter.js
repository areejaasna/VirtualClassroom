const express = require("express");
const { conferenceCtrl } = require("../controller/conferenceController.js");
const isAuthenticated = require("../middlewares/isAuth.js");

const router = express.Router();

router.post("/create", isAuthenticated, conferenceCtrl.createRoom);
router.get("/rooms", isAuthenticated, conferenceCtrl.getRooms);
router.post("/join/:roomId", isAuthenticated, conferenceCtrl.joinRoom);
router.get("/rooms/:roomId", isAuthenticated, conferenceCtrl.getRoomById);

module.exports = router;
