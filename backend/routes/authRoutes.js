const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const User = require("../models/userModel");
const Student = require("../models/studentModel");
const {
  sendOTP,
  verifyOTPAndRegister,
  login,
  getProfile,
} = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

// Multer Storage Setup for Profile Picture
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // নিশ্চিত করুন প্রজেক্টে uploads ফোল্ডারটি আছে
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTPAndRegister);
router.post("/login", login);
router.get("/profile", verifyToken, getProfile);

// ✏️ Profile Update Route (Name & Age)
router.put("/profile/update", verifyToken, async (req, res) => {
  try {
    const { name, age } = req.body;
    const userId = req.user.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, age },
      { new: true, runValidators: true },
    ).select("-password");

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await Student.findOneAndUpdate({ email: updatedUser.email }, { name, age });

    res.status(200).json({ success: true, data: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 🖼️ Profile Picture Update Route
router.put(
  "/profile/pic-update",
  verifyToken,
  upload.single("profilePic"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "কোনো ছবি আপলোড করা হয়নি।" });
      }

      const baseUrl = process.env.BASE_URL || `https://${req.get("host")}`;
      const picUrl = `${baseUrl}/uploads/${req.file.filename}`;
      const userId = req.user.id;

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { profilePic: picUrl },
        { new: true },
      ).select("-password");

      if (!updatedUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      res.status(200).json({ success: true, data: updatedUser });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
);

module.exports = router;
