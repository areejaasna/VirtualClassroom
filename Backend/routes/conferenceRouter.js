const express = require("express");
const { conferenceCtrl } = require("../controller/conferenceController.js");
const isAuthenticated = require("../middlewares/isAuth.js");

const router = express.Router();

router.post("/newRoom", conferenceCtrl.createRoom);
router.get("/rooms", conferenceCtrl.getAllRooms);
router.get("/:id", conferenceCtrl.getRoomById)


module.exports = router;
