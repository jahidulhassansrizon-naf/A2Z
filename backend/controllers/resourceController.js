const DownloadLog = require("../models/downloadLogModel");
const Resource = require("../models/resourceModel");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });
const uploadMiddleware = upload.single("file");

const getResources = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      };
    }

    const resources = await Resource.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: resources });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const addResource = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    if (!title) {
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }

    const fileUrl = `http://localhost:3000/uploads/${req.file.filename}`;

    const newResource = new Resource({
      title,
      description: description || "",
      fileName: req.file.originalname,
      fileUrl,
    });

    await newResource.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("resource-updated", { action: "add", data: newResource });
    }

    res.status(201).json({
      success: true,
      message: "Resource uploaded successfully",
      data: newResource,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await Resource.findById(id);

    if (!resource) {
      return res
        .status(404)
        .json({ success: false, message: "Resource not found" });
    }

    if (resource.fileUrl) {
      const filePath = path.join(
        __dirname,
        "..",
        "uploads",
        path.basename(resource.fileUrl),
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Resource.findByIdAndDelete(id);

    const io = req.app.get("io");
    if (io) {
      io.emit("resource-updated", { action: "delete", id });
    }

    res.status(200).json({
      success: true,
      message: "Resource and file deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const trackDownload = async (req, res) => {
  try {
    const { userEmail, userName, resourceTitle } = req.body;

    const newLog = new DownloadLog({
      userEmail,
      userName,
      resourceTitle,
    });
    await newLog.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("resource-downloaded", newLog);
    }

    res
      .status(200)
      .json({ success: true, message: "Download tracked successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getDownloadLogs = async (req, res) => {
  try {
    const logs = await DownloadLog.find().sort({ downloadedAt: -1 });
    res.status(200).json({ success: true, data: logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteDownloadLog = async (req, res) => {
  try {
    const { id } = req.params;
    await DownloadLog.findByIdAndDelete(id);
    res
      .status(200)
      .json({ success: true, message: "Download log deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getResources,
  addResource,
  uploadMiddleware,
  deleteResource,
  trackDownload,
  getDownloadLogs,
  deleteDownloadLog,
};
