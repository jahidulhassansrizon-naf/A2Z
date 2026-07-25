import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { io } from "socket.io-client";

import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import StudentProfile from "./pages/StudentProfile";

// 🟢 Socket Instance Export (লাইভ রেন্ডার ব্যাকএন্ড ইউআরএল সহ)
export const socket = io("https://a2z-4ds1.onrender.com");

function App() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // 📡 অ্যাপে ঢুকলে বা লগইন থাকলে সকেটে ইমেইল নোটিফাই করা
  useEffect(() => {
    if (user && user.email) {
      socket.emit("user_connected", user.email);
    }
  }, [user]);

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* হোম রুট */}
        <Route
          path="/"
          element={
            token && user ? (
              user.role === "admin" ? (
                <Navigate to="/admin" />
              ) : (
                <Navigate to="/profile" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* 🔐 লগইন করা থাকলে Login/Register পেজে ঢুকতে দেবে না */}
        <Route
          path="/login"
          element={
            token && user ? (
              user.role === "admin" ? (
                <Navigate to="/admin" />
              ) : (
                <Navigate to="/profile" />
              )
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/register"
          element={
            token && user ? (
              user.role === "admin" ? (
                <Navigate to="/admin" />
              ) : (
                <Navigate to="/profile" />
              )
            ) : (
              <Register />
            )
          }
        />

        {/* Protected Routes */}
        <Route
          path="/admin"
          element={
            token && user && user.role === "admin" ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/profile"
          element={
            token && user ? <StudentProfile /> : <Navigate to="/login" />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
