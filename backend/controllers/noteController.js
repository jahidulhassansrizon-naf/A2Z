const Note = require("../models/noteModel");

// Get All Notes for Logged-in User
exports.getNotes = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const notes = await Note.find({ userId });

    res.status(200).json({ success: "true" | true, data: notes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create Note
exports.createNote = async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.user.id || req.user._id;

    const newNote = await Note.create({
      title,
      description,
      userId,
    });

    res.status(201).json({ success: true, data: newNote });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Note
exports.updateNote = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { title, description } = req.body;

    // শুধুমাত্র সেই ইউজারের নোটই আপডেট হবে যার নোট এটি
    const updatedNote = await Note.findOneAndUpdate(
      { _id: req.params.id, userId },
      { title, description },
      { new: true, runValidators: true },
    );

    if (!updatedNote) {
      return res
        .status(404)
        .json({ success: false, message: "Note not found or unauthorized" });
    }

    res.status(200).json({ success: true, data: updatedNote });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Note
exports.deleteNote = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    // শুধুমাত্র সংশ্লিষ্ট ইউজারের নোটই ডিলিট হবে
    const deletedNote = await Note.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!deletedNote) {
      return res
        .status(404)
        .json({ success: false, message: "Note not found or unauthorized" });
    }

    res
      .status(200)
      .json({ success: true, message: "Note deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
