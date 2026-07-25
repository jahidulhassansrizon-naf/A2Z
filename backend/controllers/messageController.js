const Message = require("../models/messageModel");

// 📩 নির্দিষ্ট স্টুডেন্ট এবং এডমিনের আগের সব চ্যাট হিস্ট্রি পাওয়ার API
const getChatHistory = async (req, res) => {
  try {
    const { studentEmail } = req.params;

    // এই স্টুডেন্ট এবং এডমিনের মধ্যকার আদান-প্রদান করা সব মেসেজ বের করা
    const messages = await Message.find({
      $or: [
        { senderEmail: studentEmail, receiverEmail: "admin" },
        { senderEmail: "admin", receiverEmail: studentEmail },
      ],
    }).sort({ createdAt: 1 }); // পুরনো থেকে নতুন মেসেজের ক্রমানুসারে সাজানো

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("Chat history fetch error:", error);
    res.status(500).json({
      success: false,
      message: "চ্যাট হিস্ট্রি লোড করতে ব্যর্থ হয়েছে!",
    });
  }
};

module.exports = { getChatHistory };
