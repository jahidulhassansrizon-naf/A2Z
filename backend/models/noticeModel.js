const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true },
);

const Notice = mongoose.model("Notice", noticeSchema);
module.exports = Notice;
