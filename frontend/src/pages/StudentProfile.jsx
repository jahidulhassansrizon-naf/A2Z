import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { socket } from "../App";

function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showProfile, setShowProfile] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showNoticePanel, setShowNoticePanel] = useState(false);

  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  const [messages, setMessages] = useState([]);
  const [notices, setNotices] = useState([]);
  const [unreadNotices, setUnreadNotices] = useState(false);
  const [inputMsg, setInputMsg] = useState("");

  // Resources, Search & Pagination States
  const [resources, setResources] = useState([]);
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourcePage, setResourcePage] = useState(1);
  const [resourceTotalPages, setResourceTotalPages] = useState(1);

  const chatEndRef = useRef(null);
  const audioCtxRef = useRef(null);
  const fileInputRef = useRef(null);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  const playNotificationSound = async () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (
          window.AudioContext || window.webkitAudioContext
        )();
      }

      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }

      const audioCtx = audioCtxRef.current;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.00001,
        audioCtx.currentTime + 0.3,
      );

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  useEffect(() => {
    const unlockAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (
          window.AudioContext || window.webkitAudioContext
        )();
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };

    window.addEventListener("click", unlockAudio);
    window.addEventListener("keydown", unlockAudio);

    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchProfileAndData = async () => {
      try {
        const res = await axios.get(
          "https://a2z-4ds1.onrender.com/api/auth/profile",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!res.data || !res.data.data) {
          alert(
            "Your account is not active or has been removed from the system.",
          );
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }

        const userProfile = res.data.data;
        setProfile(userProfile);
        setEditName(userProfile.name || "");
        setEditAge(userProfile.age || "");
        setLoading(false);

        if (userProfile.email) {
          try {
            const chatRes = await axios.get(
              `https://a2z-4ds1.onrender.com/api/messages/history/${userProfile.email}`,
            );
            if (chatRes.data.success) {
              setMessages(chatRes.data.data);
            }

            const noticeRes = await axios.get(
              `https://a2z-4ds1.onrender.com/api/students/notices/${userProfile.email}`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            if (noticeRes.data.success) {
              setNotices(noticeRes.data.data);
              if (noticeRes.data.data.length > 0) {
                setUnreadNotices(true);
              }
            }
          } catch (err) {
            console.error("Data Fetch Error:", err);
          }
        }
      } catch (err) {
        console.error("Profile Fetch Error:", err);
        setLoading(false);
        alert(
          "Your account is not active or has been removed from the system.",
        );
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    };

    fetchProfileAndData();
  }, [token, navigate]);

  const fetchResources = async () => {
    try {
      const res = await axios.get(
        `https://a2z-4ds1.onrender.com/api/resources?search=${resourceSearch}&page=${resourcePage}&limit=4`,
      );
      if (res.data.success) {
        setResources(res.data.data);
        setResourceTotalPages(res.data.totalPages);
      }
    } catch (err) {
      console.error("Resource fetch error:", err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResources();
    }, 300);

    return () => clearTimeout(timer);
  }, [resourceSearch, resourcePage]);

  const handleDownload = async (fileUrl, title) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = title || "download";
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      await axios.post(
        "https://a2z-4ds1.onrender.com/api/resources/track-download",
        {
          userEmail: profile?.email,
          userName: profile?.name,
          resourceTitle: title,
        },
      );
    } catch (error) {
      console.error("Download failed:", error);
      window.open(fileUrl, "_blank");
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    try {
      const res = await axios.put(
        "https://a2z-4ds1.onrender.com/api/auth/profile/update",
        { name: editName, age: editAge },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data.success) {
        setProfile(res.data.data);
        setIsEditing(false);
        alert("Profile updated successfully!");
      }
    } catch (err) {
      console.error("Update error:", err);
      alert(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profilePic", file);

    try {
      const res = await axios.put(
        "https://a2z-4ds1.onrender.com/api/auth/profile/pic-update",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );
      if (res.data.success) {
        setProfile(res.data.data);
        alert("Profile picture updated successfully!");
      }
    } catch (err) {
      console.error("Pic upload error:", err);
      alert("Failed to upload picture.");
    }
  };

  useEffect(() => {
    const currentEmail = profile?.email || user.email;
    if (!currentEmail) return;

    socket.emit("user_connected", currentEmail);

    const handleReceiveMessage = (data) => {
      const isForMe =
        data.receiverEmail === currentEmail ||
        data.senderEmail === currentEmail;

      if (isForMe) {
        setMessages((prev) => [...prev, data]);

        if (data.senderEmail !== currentEmail) {
          playNotificationSound();
          setShowChat(true);
        }
      }
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [user.email, profile?.email]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const handleResourceUpdate = (eventData) => {
      setResources((prevResources) => {
        if (eventData.action === "add" || eventData.type === "CREATE") {
          const newItem = eventData.data || eventData.resource;
          if (!newItem) return prevResources;
          if (prevResources.some((item) => item._id === newItem._id)) {
            return prevResources;
          }
          return [newItem, ...prevResources];
        }

        if (eventData.action === "delete" || eventData.type === "DELETE") {
          const deleteId = eventData.id || eventData._id;
          return prevResources.filter((item) => item._id !== deleteId);
        }

        return prevResources;
      });
    };

    socket.on("resource-updated", handleResourceUpdate);
    socket.on("admin_resource_updated", handleResourceUpdate);

    return () => {
      socket.off("resource-updated", handleResourceUpdate);
      socket.off("admin_resource_updated", handleResourceUpdate);
    };
  }, [socket]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const currentEmail = profile?.email || user.email;

    const msgData = {
      senderEmail: currentEmail,
      receiverEmail: "admin",
      senderName: profile?.name || user.name || "User",
      message: inputMsg,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    socket.emit("send_message", msgData);
    setInputMsg("");
  };

  const handleDeleteNotice = async (noticeId) => {
    try {
      const res = await axios.delete(
        `https://a2z-4ds1.onrender.com/api/students/notices/${noticeId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.data.success) {
        setNotices(notices.filter((notice) => notice._id !== noticeId));
      }
    } catch (err) {
      console.error("Failed to delete notice:", err);
      alert("Failed to delete notice.");
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#f8fafc",
        }}
      >
        <p style={{ fontSize: "16px", color: "#64748b", fontWeight: "600" }}>
          Loading details...
        </p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div
      style={{
        padding: "20px 30px",
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
        fontFamily: "'Inter', sans-serif",
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      {/* Top Floating User Profile Toggle Button */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => setShowProfile(!showProfile)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: "12px",
            border: "none",
            fontSize: "13.5px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.15)",
            transition: "all 0.2s ease",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          {showProfile ? "Close Profile" : "User Profile"}
        </button>
      </div>

      {/* User Profile Popup Card */}
      {showProfile && (
        <div
          style={{
            width: "360px",
            position: "absolute",
            top: "75px",
            left: "30px",
            zIndex: "1050",
            background: "#ffffff",
            borderRadius: "20px",
            boxShadow:
              "0 20px 35px -5px rgba(0,0,0,0.1), 0 10px 15px -5px rgba(0,0,0,0.04)",
            border: "1px solid #e2e8f0",
            padding: "24px",
            boxSizing: "border-box",
          }}
        >
          <button
            onClick={() => setShowProfile(false)}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: "bold",
              color: "#64748b",
            }}
          >
            ✕
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              paddingRight: "25px",
              marginBottom: "18px",
            }}
          >
            <div
              style={{ position: "relative", cursor: "pointer" }}
              onClick={() => fileInputRef.current?.click()}
              title="Click to change profile picture"
            >
              <div
                style={{
                  overflow: "hidden",
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: "20px",
                  flexShrink: 0,
                  boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)",
                }}
              >
                {profile.profilePic ? (
                  <img
                    src={profile.profilePic}
                    alt="Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : profile.name ? (
                  profile.name[0].toUpperCase()
                ) : (
                  "U"
                )}
              </div>
            </div>

            <div style={{ overflow: "hidden" }}>
              <h3
                style={{
                  margin: "0 0 3px 0",
                  fontSize: "16.5px",
                  color: "#0f172a",
                  fontWeight: "700",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {profile.name}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "12.5px",
                  color: "#64748b",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {profile.email}
              </p>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleProfilePicChange}
            style={{ display: "none" }}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
              borderRadius: "10px",
              padding: "10px",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: "18px",
            }}
          >
            <span
              style={{ fontSize: "12px", color: "#0284c7", fontWeight: "600" }}
            >
              Change Profile Picture
            </span>
          </div>

          <hr
            style={{
              margin: "14px 0",
              border: "0",
              borderTop: "1px solid #f1f5f9",
            }}
          />

          {!isEditing ? (
            <>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "13.5px",
                    color: "#475569",
                  }}
                >
                  <span>Role</span>
                  <span style={{ fontWeight: "600", color: "#0284c7" }}>
                    {profile.role === "STUDENT" || profile.role === "student"
                      ? "USER"
                      : profile.role}
                  </span>
                </div>
                {profile.roll && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "13.5px",
                      color: "#475569",
                    }}
                  >
                    <span>User ID</span>
                    <span style={{ fontWeight: "600", color: "#1e293b" }}>
                      #{profile.roll}
                    </span>
                  </div>
                )}
                {profile.age && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "13.5px",
                      color: "#475569",
                    }}
                  >
                    <span>Age</span>
                    <span style={{ fontWeight: "600", color: "#334155" }}>
                      {profile.age}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "13.5px",
                    color: "#475569",
                  }}
                >
                  <span>Status</span>
                  <span style={{ color: "#16a34a", fontWeight: "600" }}>
                    Active
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  width: "100%",
                  marginTop: "20px",
                  background:
                    "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                  color: "#fff",
                  border: "none",
                  padding: "11px",
                  borderRadius: "10px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "13.5px",
                  boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)",
                }}
              >
                Edit Profile
              </button>
            </>
          ) : (
            <form
              onSubmit={handleUpdateProfile}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginTop: "10px",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    fontWeight: "600",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    fontWeight: "600",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Age
                </label>
                <input
                  type="number"
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  type="submit"
                  disabled={updateLoading}
                  style={{
                    flex: 1,
                    background: "#16a34a",
                    color: "#fff",
                    border: "none",
                    padding: "10px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  {updateLoading ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{
                    flex: 1,
                    background: "#64748b",
                    color: "#fff",
                    border: "none",
                    padding: "10px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Notice Board Slide Panel */}
      {showNoticePanel && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: "420px",
            height: "100vh",
            background: "#ffffff",
            boxShadow: "-20px 0 50px rgba(0, 0, 0, 0.15)",
            zIndex: 1100,
            display: "flex",
            flexDirection: "column",
            borderLeft: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              padding: "24px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#ffffff",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: "19px",
                  fontWeight: "700",
                }}
              >
                Notice Board
              </h3>
              <p
                style={{
                  margin: "3px 0 0 0",
                  color: "#64748b",
                  fontSize: "12.5px",
                }}
              >
                Official updates from administration
              </p>
            </div>
            <button
              onClick={() => setShowNoticePanel(false)}
              style={{
                background: "#f1f5f9",
                border: "none",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: "15px",
                color: "#475569",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              padding: "20px",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              background: "#f8fafc",
            }}
          >
            {notices.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  marginTop: "120px",
                  color: "#94a3b8",
                }}
              >
                <p style={{ fontSize: "14px", fontWeight: "500", margin: 0 }}>
                  No notices available right now.
                </p>
              </div>
            ) : (
              notices.map((notice) => (
                <div
                  key={notice._id}
                  style={{
                    background: "#ffffff",
                    padding: "18px",
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    borderLeft: "5px solid #0284c7",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "10px",
                      marginBottom: "8px",
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        color: "#1e293b",
                        fontSize: "15.5px",
                        fontWeight: "600",
                      }}
                    >
                      {notice.subject}
                    </h4>
                    <button
                      onClick={() => handleDeleteNotice(notice._id)}
                      title="Delete Notice"
                      style={{
                        background: "#fff1f2",
                        border: "none",
                        color: "#e11d48",
                        padding: "6px 8px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <p
                    style={{
                      margin: "0 0 14px 0",
                      color: "#475569",
                      fontSize: "14px",
                      lineHeight: "1.5",
                    }}
                  >
                    {notice.message}
                  </p>
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: "11.5px",
                      borderTop: "1px solid #f1f5f9",
                      paddingTop: "10px",
                    }}
                  >
                    {new Date(notice.createdAt).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Live Chat Support Box */}
      {showChat && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            width: "350px",
            height: "480px",
            background: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            border: "1px solid #e2e8f0",
            zIndex: 1300,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "#0f172a",
              color: "#fff",
              padding: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>
                Admin Support
              </h4>
              <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                Live helpdesk
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  fontSize: "11px",
                  background: "#16a34a",
                  color: "#fff",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  fontWeight: "600",
                }}
              >
                Online
              </span>
              <button
                onClick={() => setShowChat(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              padding: "16px",
              overflowY: "auto",
              background: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  marginTop: "130px",
                  color: "#94a3b8",
                  fontSize: "13px",
                }}
              >
                <p>No messages yet. Send a message to admin.</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const currentEmail = profile?.email || user.email;
                const isMe = msg.senderEmail === currentEmail;
                return (
                  <div
                    key={idx}
                    style={{
                      alignSelf: isMe ? "flex-end" : "flex-start",
                      background: isMe ? "#0284c7" : "#ffffff",
                      color: isMe ? "#fff" : "#1e293b",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      maxWidth: "80%",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      border: isMe ? "none" : "1px solid #e2e8f0",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: "13.5px",
                        lineHeight: "1.4",
                      }}
                    >
                      {msg.message}
                    </p>
                    <span
                      style={{
                        fontSize: "10px",
                        color: isMe ? "#e0f2fe" : "#94a3b8",
                        display: "block",
                        textAlign: "right",
                      }}
                    >
                      {msg.time}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={handleSendMessage}
            style={{
              padding: "12px",
              background: "#ffffff",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              gap: "8px",
            }}
          >
            <input
              type="text"
              placeholder="Type your message..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                background: "#0284c7",
                color: "#fff",
                border: "none",
                padding: "10px 16px",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Main Dashboard Layout */}
      <div style={{ width: "100%" }}>
        {/* Header Section */}
        <div
          className="mailo"
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: "18px",
          }}
        >
          <div>
            <h2
              style={{
                margin: "0 0 6px 0",
                fontSize: "24px",
                color: "#0f172a",
                fontWeight: "700",
              }}
            >
              Dashboard Overview
            </h2>
            <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
              Welcome back,{" "}
              <span style={{ fontWeight: "600", color: "#334155" }}>
                {profile.name}
              </span>
              . Explore my development services.
            </p>
          </div>

          <div className="dashboard-action-buttons">
            {/* Notices Button */}
            <button
              className="btn-dashboard-notice"
              onClick={() => {
                setShowNoticePanel(!showNoticePanel);
                setUnreadNotices(false);
              }}
            >
              <i className="fa-solid fa-bell"></i> Notices
              {unreadNotices && notices.length > 0 && (
                <span className="notice-badge-count">{notices.length}</span>
              )}
            </button>

            {/* Contact Admin / Support Button */}
            <button
              className={`btn-dashboard-contact ${showChat ? "active-chat" : ""}`}
              onClick={() => setShowChat(!showChat)}
            >
              <i className="fa-solid fa-headset"></i>{" "}
              {showChat ? "Close Support" : "Contact Admin"}
            </button>
          </div>
        </div>

        {/* Services Card - Full Width */}
        <div
          style={{
            marginTop: "24px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div className="custom-services-card">
            <div className="services-header-flex">
              <h3 className="services-title">
                My Development Services & Expertise
              </h3>
              <span className="services-badge">Available for Hire</span>
            </div>
            <p className="services-subtitle">
              Explore what I can build for you. Custom solutions tailored to
              your exact project demands:
            </p>

            <div className="services-grid-list">
              <div className="service-item-box">
                <h4>Full Stack MERN Apps</h4>
                <p>
                  Complete web applications with secure backend, database, and
                  responsive frontend.
                </p>
              </div>

              <div className="service-item-box">
                <h4>Animated Business Sites</h4>
                <p>
                  Modern, eye-catching, and interactive animated websites for
                  business or agencies.
                </p>
              </div>

              <div className="service-item-box">
                <h4>Bug Fixing & Debugging</h4>
                <p>
                  Fixing errors, improving performance, and resolving
                  backend/frontend issues.
                </p>
              </div>

              <div className="service-item-box">
                <h4>SEO Optimization</h4>
                <p>
                  On-page SEO, fast loading speed, and search engine friendly
                  architecture.
                </p>
              </div>

              <div className="service-item-box">
                <h4>Custom Client Demand</h4>
                <p>
                  Any custom web feature, dashboard, or tool built precisely
                  according to your needs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Resources Section */}
        <div className="admin-info-banner">
          <p className="animated-banner-text">
            Need any specific <span className="banner-highlight">web dev</span>{" "}
            materials or resources? Just click on{" "}
            <span className="banner-highlight">"Contact Admin"</span> above and
            let us know! Admin will upload your requested items right here in
            the Admin Resources section for you to download completely for free.
          </p>
        </div>

        <div
          style={{ marginTop: "24px", width: "100%", boxSizing: "border-box" }}
        >
          <div
            style={{
              background: "#ffffff",
              padding: "28px",
              borderRadius: "20px",
              border: "1px solid #e2e8f0",
              width: "100%",
              boxSizing: "border-box",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "18px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "17px",
                  color: "#1e293b",
                  fontWeight: "700",
                }}
              >
                Admin Resources
              </h3>
              <span
                style={{
                  background: "#e0f2fe",
                  color: "#0369a1",
                  padding: "5px 12px",
                  borderRadius: "12px",
                  fontSize: "12.5px",
                  fontWeight: "600",
                }}
              >
                Files Found
              </span>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <input
                type="text"
                placeholder="Search admin resources..."
                value={resourceSearch}
                onChange={(e) => {
                  setResourceSearch(e.target.value);
                  setResourcePage(1);
                }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  boxSizing: "border-box",
                  outline: "none",
                  background: "#f8fafc",
                }}
              />
            </div>

            {resources.length === 0 ? (
              <p
                style={{
                  color: "#94a3b8",
                  fontSize: "14px",
                  margin: "30px 0",
                  textAlign: "center",
                }}
              >
                No admin resources or files found.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {resources.map((item) => (
                  <div
                    key={item._id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px 20px",
                      background: "#f8fafc",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          margin: "0 0 4px 0",
                          fontSize: "15px",
                          color: "#0f172a",
                          fontWeight: "600",
                        }}
                      >
                        {item.title}
                      </h4>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "13px",
                          color: "#64748b",
                        }}
                      >
                        {item.description || "No description provided"}
                      </p>
                    </div>

                    {item.fileUrl && item.fileUrl !== "#" ? (
                      <button
                        onClick={() => handleDownload(item.fileUrl, item.title)}
                        style={{
                          background: "#0284c7",
                          color: "#fff",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "8px",
                          fontSize: "12.5px",
                          fontWeight: "600",
                          cursor: "pointer",
                          boxShadow: "0 2px 6px rgba(2, 132, 199, 0.2)",
                        }}
                      >
                        Download
                      </button>
                    ) : (
                      <span
                        style={{
                          fontSize: "11.5px",
                          background: "#e2e8f0",
                          color: "#475569",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontWeight: "600",
                        }}
                      >
                        Note
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {resourceTotalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "24px",
                }}
              >
                <button
                  onClick={() =>
                    setResourcePage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={resourcePage === 1}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: resourcePage === 1 ? "#f1f5f9" : "#fff",
                    cursor: resourcePage === 1 ? "not-allowed" : "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: resourcePage === 1 ? "#94a3b8" : "#334155",
                  }}
                >
                  Previous
                </button>

                <span
                  style={{
                    fontSize: "13.5px",
                    color: "#475569",
                    fontWeight: "600",
                  }}
                >
                  Page {resourcePage} of {resourceTotalPages}
                </span>

                <button
                  onClick={() =>
                    setResourcePage((prev) =>
                      Math.min(prev + 1, resourceTotalPages),
                    )
                  }
                  disabled={resourcePage === resourceTotalPages}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background:
                      resourcePage === resourceTotalPages ? "#f1f5f9" : "#fff",
                    cursor:
                      resourcePage === resourceTotalPages
                        ? "not-allowed"
                        : "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                    color:
                      resourcePage === resourceTotalPages
                        ? "#94a3b8"
                        : "#334155",
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
