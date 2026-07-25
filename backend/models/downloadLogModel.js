const mongoose = require("mongoose");

const downloadLogSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  resourceTitle: { type: String, required: true },
  downloadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("DownloadLog", downloadLogSchema);
