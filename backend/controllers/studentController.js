const Student = require("../models/studentModel");
const User = require("../models/userModel");
const Notice = require("../models/noticeModel");

// 📧 Google Apps Script Email API URL
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

// ১. সকল স্টুডেন্ট দেখা
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find();
    res.status(200).json({ data: students });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ২. রোল দিয়ে নির্দিষ্ট স্টুডেন্ট দেখা
exports.getStudentByRoll = async (req, res) => {
  try {
    const student = await Student.findOne({ roll: req.params.roll });
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }
    res.status(200).json({ data: student });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ৩. রোল দিয়ে ডিলিট করা (Student এবং User উভয় টেবিল থেকেই মুছে দেবে)
exports.deleteStudentByRoll = async (req, res) => {
  try {
    const { roll } = req.params;

    // Student Collection থেকে ডিলিট
    const deletedStudent = await Student.findOneAndDelete({ roll });

    if (!deletedStudent) {
      return res.status(404).json({ message: "Student not found." });
    }

    // User Collection থেকেও ডিলিট (যাতে আর লগইন করতে না পারে)
    if (deletedStudent.email) {
      await User.findOneAndDelete({ email: deletedStudent.email });
    }

    res.status(200).json({
      message: "Student and account deleted successfully.",
      data: deletedStudent,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 📧 ৪. স্টুডেন্টকে সরাসরি ইমেইল পাঠানোর ফাংশন (Google Apps Script) এবং ডাটাবেজে সেভ করা
exports.sendNotice = async (req, res) => {
  const { email, subject, message } = req.body;

  if (!email || !message) {
    return res.status(400).json({ message: "Email and message are required." });
  }

  if (!GOOGLE_SCRIPT_URL) {
    console.error("GOOGLE_SCRIPT_URL is missing in environment variables");
    return res.status(500).json({
      success: false,
      message: "Email service configuration missing.",
    });
  }

  try {
    const noticeSubject = subject || "Important Notice from A to Z Platform";

    const noticeHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
        <h2 style="color: #0284c7; margin-bottom: 10px;">A to Z Platform Notification</h2>
        <p style="font-size: 15px;">Dear Student,</p>
        <div style="background-color: #f1f5f9; padding: 15px; border-left: 4px solid #0284c7; margin: 15px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #1e293b;">${message}</p>
        </div>
        <p style="font-size: 14px;">If you have any questions regarding this notice, please contact administration.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 20px;" />
        <p style="font-size: 12px; color: #94a3b8;">This is an official automated notification from A to Z Platform Administration.</p>
      </div>
    `;

    const googleResponse = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        subject: noticeSubject,
        html: noticeHTML,
      }),
    });

    const responseText = await googleResponse.text();
    let googleResult;

    try {
      googleResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error(
        "Google Script did not return JSON. Response was:",
        responseText,
      );
      return res.status(500).json({
        message: "ইমেইল সার্ভিস থেকে সঠিক ফরম্যাটে ডেটা আসেনি!",
      });
    }

    if (!googleResult.success) {
      console.error("Google Email Error:", googleResult);
      return res.status(500).json({
        message: "ইমেইল পাঠাতে ব্যর্থ হয়েছে!",
      });
    }

    // ডাটাবেজে নোটিশ সেভ করা
    await Notice.create({
      email: email,
      subject: noticeSubject,
      message: message,
    });

    res.status(200).json({
      success: true,
      message: "Email sent successfully and saved to database.",
    });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({
      message: "Failed to send email. Please check your configuration.",
    });
  }
};

// ৫. ইউজারের ইমেইল দিয়ে তার নোটিশগুলো নিয়ে আসার ফাংশন
exports.getNoticesByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const notices = await Notice.find({ email }).sort({ createdAt: -1 }); // নতুন নোটিশগুলো সবার উপরে দেখানোর জন্য
    res.status(200).json({ success: true, data: notices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
