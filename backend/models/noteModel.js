const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // এটি নিশ্চিত করবে যেন ইউজার আইডি ছাড়া নোট সেভ না হয়
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Note", noteSchema);
