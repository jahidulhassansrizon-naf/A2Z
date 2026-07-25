const express = require("express");
const router = express.Router();
const {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
} = require("../controllers/noteController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getNotes);
router.post("/", verifyToken, createNote);
router.put("/:id", verifyToken, updateNote); // নোট এডিটের জন্য রাউট
router.delete("/:id", verifyToken, deleteNote);

module.exports = router;
