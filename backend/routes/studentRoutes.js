const express = require("express");
const router = express.Router();
const {
  getAllStudents,
  getStudentByRoll,
  deleteStudentByRoll,
  sendSystemNotice, // 👈 sendNotice এর বদলে এটি দিন
  getNoticesByEmail,
} = require("../controllers/studentController");

const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

// ১. সকল স্টুডেন্ট দেখার রাউট (Admin Only)
router.get("/all", verifyToken, verifyAdmin, getAllStudents);

// ২. নির্দিষ্ট স্টুডেন্ট দেখার রাউট
router.get("/:roll", verifyToken, getStudentByRoll);

// ৩. স্টুডেন্ট ডিলিট করার রাউট (Admin Only)
router.delete("/delete/:roll", verifyToken, verifyAdmin, deleteStudentByRoll);

// 📧 ৪. স্টুডেন্টকে নোটিশ পাঠানোর রাউট (Admin Only)
router.post("/send-notice", verifyToken, verifyAdmin, sendSystemNotice); // 👈 এখানে sendSystemNotice বসানো হলো

// 📌 ৫. ইউজারের নোটিশগুলো দেখার রাউট (User Email দিয়ে)
router.get("/notices/:email", verifyToken, getNoticesByEmail);

// 🗑️ ৬. নোটিশ আইডি দিয়ে নোটিশ ডিলিট করার রুট
router.delete("/notices/:id", verifyToken, async (req, res) => {
  try {
    const noticeId = req.params.id;
    const Notice = require("../models/noticeModel");
    await Notice.findByIdAndDelete(noticeId);
    res.json({ success: true, message: "Notice deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
