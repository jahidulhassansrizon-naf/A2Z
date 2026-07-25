const jwt = require("jsonwebtoken");

// ১. টোকেন ভেরিফাই করার মিডলওয়্যার (যেকোনো লগইন করা ইউজারের জন্য)
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "অ্যাক্সেস দেওয়া সম্ভব নয়, টোকেন নেই!" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role } কাস্টম রিকোয়েস্টে সেট করে দিলাম
    next();
  } catch (err) {
    return res
      .status(403)
      .json({ message: "ইনভ্যালিড বা মেয়াদউত্তীর্ণ টোকেন!" });
  }
};

// ২. শুধু মাত্র Admin চেনার মিডলওয়্যার
const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role === "admin") {
      next();
    } else {
      res
        .status(403)
        .json({ message: "এই কাজটি করার ক্ষমতা শুধু এডমিনের আছে!" });
    }
  });
};

module.exports = { verifyToken, verifyAdmin };
