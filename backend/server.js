const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
require("dotenv").config();

const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

// Models & Routes Import
const Message = require("./models/messageModel");
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const messageRoutes = require("./routes/messageRoutes");
const resourceRoutes = require("./routes/resourceRoutes");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// HTTP Server & Socket.io Setup (প্রথমে সার্ভার এবং io ইনিশিয়ালাইজ করতে হবে)
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// 🟢 Socket.io-কে Express app এবং request এর সাথে যুক্ত করার সঠিক জায়গা
app.set("io", io); // resourceController-এর জন্য দরকার
app.use((req, res, next) => {
  req.io = io;
  next();
});

// 🟢 Static Folder Middleware (uploads ফোল্ডার পাবলিক করার জন্য)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 🟢 Online Users Tracker (Email -> Socket ID)
const onlineUsers = new Map();

io.on("connection", (socket) => {
  socket.on("user_connected", (email) => {
    if (email) {
      socket.join(email);
      onlineUsers.set(email, socket.id);
      io.emit("get_online_users", Array.from(onlineUsers.keys()));
    }
  });

  socket.on("send_message", async (data) => {
    try {
      const newMessage = new Message({
        senderEmail: data.senderEmail,
        receiverEmail: data.receiverEmail,
        senderName: data.senderName || "User",
        message: data.message,
        time: data.time,
      });

      await newMessage.save();
      io.emit("receive_message", data);
    } catch (error) {
      console.error("Error saving message to DB:", error);
    }
  });

  socket.on("disconnect", () => {
    for (let [email, id] of onlineUsers.entries()) {
      if (id === socket.id) {
        onlineUsers.delete(email);
        break;
      }
    }
    io.emit("get_online_users", Array.from(onlineUsers.keys()));
  });
});

// Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully! 🚀"))
  .catch((err) => console.error("Database connection error:", err));

// Routes Definition
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/resources", resourceRoutes);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT} 🔥`));
