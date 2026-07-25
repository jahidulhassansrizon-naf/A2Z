const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    roll: { type: Number, required: true, unique: true },
    age: { type: Number, required: true },
    email: { type: String, required: true, unique: true },
    courses: [{ type: String }],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Student", studentSchema);
