const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "student"],
      default: "student",
    },
    roll: { type: Number, default: null, sparse: true },
    profilePic: { type: String, default: "" }, // 👈 নতুন ফিল্ড যোগ করা হলো
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
