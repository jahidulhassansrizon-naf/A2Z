const express = require("express");
const router = express.Router();
const { getChatHistory } = require("../controllers/messageController");

// 📩 স্টুডেন্টের ইমেইল দিয়ে চ্যাট হিস্ট্রি পাওয়ার রাউট
router.get("/history/:studentEmail", getChatHistory);

module.exports = router;
