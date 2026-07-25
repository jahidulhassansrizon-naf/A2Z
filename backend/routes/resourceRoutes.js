const express = require("express");
const router = express.Router();
const {
  getResources,
  addResource,
  uploadMiddleware,
  deleteResource,
  trackDownload,
  getDownloadLogs,
  deleteDownloadLog, // 🟢 এটি মিসিং ছিল, এখন যুক্ত করা হয়েছে
} = require("../controllers/resourceController");

router.get("/", getResources);
router.post("/upload", uploadMiddleware, addResource);
router.delete("/:id", deleteResource);
router.post("/track-download", trackDownload);
router.get("/download-logs", getDownloadLogs);
router.delete("/download-logs/:id", deleteDownloadLog);

module.exports = router;
