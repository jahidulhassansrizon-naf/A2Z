import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { socket } from "../App";

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // 📚 Resources List State Added
  const [adminResources, setAdminResources] = useState([]);

  // 📥 Download Logs State Added
  const [downloadLogs, setDownloadLogs] = useState([]);

  const [emailData, setEmailData] = useState({
    email: "",
    subject: "",
    message: "",
  });
  const [sendingEmail, setSendingEmail] = useState(false);

  // 📚 Resource Upload States added
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceDesc, setResourceDesc] = useState("");
  const [resourceFile, setResourceFile] = useState(null);
  const [uploadingResource, setUploadingResource] = useState(false);

  const [activeChatUser, setActiveChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const chatEndRef = useRef(null);

  const audioCtxRef = useRef(null);
  const token = localStorage.getItem("token");

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
    };
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchAdminResources();
    fetchDownloadLogs();

    const handleOnlineUsers = (usersList) => {
      setOnlineUsers(usersList);
    };

    socket.on("get_online_users", handleOnlineUsers);

    return () => {
      socket.off("get_online_users", handleOnlineUsers);
    };
  }, []);

  const fetchDownloadLogs = async () => {
    try {
      const res = await axios.get(
        "https://a2z-4ds1.onrender.com/api/resources/download-logs",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.data.success) {
        setDownloadLogs(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching download logs:", err);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleResourceDownloaded = (logData) => {
      setDownloadLogs((prevLogs) => [logData, ...prevLogs]);
    };

    socket.on("resource-downloaded", handleResourceDownloaded);

    return () => {
      socket.off("resource-downloaded", handleResourceDownloaded);
    };
  }, [socket]);

  const fetchAdminResources = async () => {
    try {
      const res = await axios.get(
        "https://a2z-4ds1.onrender.com/api/resources",
      );
      if (res.data.success) {
        setAdminResources(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching admin resources:", err);
    }
  };

  const fetchChatHistory = async (userEmail) => {
    try {
      const res = await axios.get(
        `https://a2z-4ds1.onrender.com/api/messages/history/${userEmail}`,
      );
      if (res.data.success) {
        setMessages(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching chat history:", err);
    }
  };

  useEffect(() => {
    const handleReceiveMessage = (data) => {
      setMessages((prev) => [...prev, data]);

      if (data.senderEmail !== "admin") {
        playNotificationSound();

        setUsers((prevUsers) => {
          const senderUser = prevUsers.find(
            (u) => u.email === data.senderEmail,
          );

          if (senderUser) {
            setActiveChatUser((currentActive) => {
              if (!currentActive || currentActive.email !== data.senderEmail) {
                fetchChatHistory(data.senderEmail);
                return senderUser;
              }
              return currentActive;
            });
          }
          return prevUsers;
        });
      }
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(
        "https://a2z-4ds1.onrender.com/api/students/all",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setUsers(res.data.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleDelete = async (roll) => {
    if (!window.confirm(`Are you sure you want to delete user ID #${roll}?`))
      return;
    try {
      const res = await axios.delete(
        `https://a2z-4ds1.onrender.com/api/students/delete/${roll}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      alert(`${res.data.data?.name || "User"} deleted successfully.`);
      setUsers(users.filter((u) => u.roll !== roll));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete user.");
    }
  };

  const handleDeleteResource = async (id) => {
    if (!window.confirm("Are you sure you want to delete this resource?"))
      return;
    try {
      const res = await axios.delete(
        `https://a2z-4ds1.onrender.com/api/resources/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.data.success) {
        alert("Resource deleted successfully!");
        setAdminResources(adminResources.filter((item) => item._id !== id));
      }
    } catch (err) {
      console.error("Delete resource error:", err);
      alert(err.response?.data?.message || "Failed to delete resource.");
    }
  };

  const handleDeleteDownloadLog = async (id) => {
    if (!window.confirm("Are you sure you want to delete this log?")) return;
    try {
      const res = await axios.delete(
        `https://a2z-4ds1.onrender.com/api/resources/download-logs/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.data.success) {
        setDownloadLogs(downloadLogs.filter((log) => log._id !== id));
      }
    } catch (err) {
      console.error("Failed to delete download log", err);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setSendingEmail(true);
    try {
      await axios.post(
        "https://a2z-4ds1.onrender.com/api/students/send-notice",
        emailData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      alert("Notice sent successfully.");
      setEmailData({
        email: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send notice.");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleResourceUpload = async (e) => {
    e.preventDefault();
    if (!resourceFile) {
      alert("Please select a file.");
      return;
    }

    setUploadingResource(true);
    const formData = new FormData();
    formData.append("title", resourceTitle);
    formData.append("description", resourceDesc);
    formData.append("file", resourceFile);

    try {
      const res = await axios.post(
        "https://a2z-4ds1.onrender.com/api/resources/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (res.data.success) {
        alert("Study material uploaded successfully!");
        setResourceTitle("");
        setResourceDesc("");
        setResourceFile(null);
        e.target.reset();
        fetchAdminResources();
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert(err.response?.data?.message || "Failed to upload file.");
    } finally {
      setUploadingResource(false);
    }
  };

  const selectUserEmail = (email) => {
    setEmailData({ ...emailData, email: email });
  };

  const openChatWithUser = (user) => {
    setActiveChatUser(user);
    fetchChatHistory(user.email);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !activeChatUser) return;

    const msgData = {
      senderEmail: "admin",
      receiverEmail: activeChatUser.email,
      senderName: "Admin Support",
      message: inputMsg,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    socket.emit("send_message", msgData);
    setInputMsg("");
  };

  return (
    <div className="admin-container">
      <div className="admin-header-panel">
        <h2>Admin Management</h2>
        <p>
          Manage system users, dispatch email notifications, and handle live
          support sessions.
        </p>
      </div>

      <div className="section-header-flex">
        <h3 className="section-title">Registered Accounts ({users.length})</h3>
        <button onClick={fetchUsers} className="btn-reload">
          Reload
        </button>
      </div>

      {loading ? (
        <p className="text-muted">Fetching data...</p>
      ) : users.length === 0 ? (
        <div className="empty-box">
          <p>No registered users found.</p>
        </div>
      ) : (
        users.map((user) => {
          const isOnline = onlineUsers.includes(user.email);

          return (
            <div key={user._id} className="user-card">
              <div>
                <div className="user-card-header">
                  <h4>
                    #{user.roll} - {user.name}
                  </h4>
                  <span
                    className={`status-badge ${
                      isOnline ? "online" : "offline"
                    }`}
                  >
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>
                <p className="user-card-subtext">
                  Email: {user.email} | Age: {user.age || "N/A"}
                </p>
              </div>

              <div className="action-btn-group">
                <button
                  onClick={() => openChatWithUser(user)}
                  className="btn-sm btn-sm-blue"
                >
                  Message
                </button>
                <button
                  onClick={() => selectUserEmail(user.email)}
                  className="btn-sm btn-sm-sky"
                >
                  Mail
                </button>
                <button
                  onClick={() => handleDelete(user.roll)}
                  className="btn-sm btn-sm-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* SECTION: LIVE USER DOWNLOAD ACTIVITIES */}
      <div className="notice-section" style={{ marginTop: "30px" }}>
        <h3>Live User Download Activities</h3>
        <p className="notice-subtext">
          Track which user downloaded which resource or file in real-time.
        </p>

        {downloadLogs.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: "13px" }}>
            No download logs found.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              maxHeight: "250px",
              overflowY: "auto",
            }}
          >
            {downloadLogs.map((log) => (
              <div
                key={log._id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "#f0fdf4",
                  borderRadius: "8px",
                  border: "1px solid #bbf7d0",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: "0 0 2px 0",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#166534",
                    }}
                  >
                    {log.userName} ({log.userEmail})
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#374151" }}>
                    Downloaded file: <b>{log.resourceTitle}</b>
                  </p>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>
                    {new Date(log.downloadedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <button
                    onClick={() => handleDeleteDownloadLog(log._id)}
                    className="btn-sm btn-sm-danger"
                    style={{ padding: "4px 8px", fontSize: "11px" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION: UPLOAD STUDY MATERIALS */}
      <div className="notice-section" style={{ marginTop: "30px" }}>
        <h3>Upload Study Materials & Resources</h3>
        <p className="notice-subtext">
          Share files, notes, or resources with all users instantly.
        </p>

        <form onSubmit={handleResourceUpload} className="notice-form">
          <input
            type="text"
            placeholder="Material Title"
            value={resourceTitle}
            onChange={(e) => setResourceTitle(e.target.value)}
            required
            className="notice-input"
          />

          <textarea
            rows="2"
            placeholder="Short Description..."
            value={resourceDesc}
            onChange={(e) => setResourceDesc(e.target.value)}
            className="notice-textarea"
          ></textarea>

          <input
            type="file"
            onChange={(e) => setResourceFile(e.target.files[0])}
            required
            className="notice-input"
            style={{
              padding: "10px",
              background: "#f8fafc",
              cursor: "pointer",
            }}
          />

          <button
            type="submit"
            disabled={uploadingResource}
            className={`btn-primary btn-submit-notice ${
              uploadingResource ? "disabled" : ""
            }`}
          >
            {uploadingResource ? "Uploading..." : "Upload Resource"}
          </button>
        </form>

        <div style={{ marginTop: "25px" }}>
          <h4
            style={{ fontSize: "16px", color: "#1e293b", marginBottom: "12px" }}
          >
            Manage Uploaded Resources ({adminResources.length})
          </h4>
          {adminResources.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "13px" }}>
              No files uploaded yet.
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {adminResources.map((item) => (
                <div
                  key={item._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    background: "#f8fafc",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div>
                    <h5
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: "14px",
                        color: "#0f172a",
                      }}
                    >
                      {item.title}
                    </h5>
                    <p
                      style={{ margin: 0, fontSize: "12px", color: "#64748b" }}
                    >
                      {item.description || "No description"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteResource(item._id)}
                    className="btn-sm btn-sm-danger"
                    style={{ padding: "6px 12px", fontSize: "12px" }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION: SEND EMAIL */}
      <div className="notice-section">
        <h3>Dispatch System Notice</h3>
        <p className="notice-subtext">
          Send direct announcements or system messages via email.
        </p>

        <form onSubmit={handleSendEmail} className="notice-form">
          <input
            type="email"
            placeholder="Recipient Email Address"
            value={emailData.email}
            onChange={(e) =>
              setEmailData({ ...emailData, email: e.target.value })
            }
            required
            className="notice-input"
          />

          <input
            type="text"
            placeholder="Subject"
            value={emailData.subject}
            onChange={(e) =>
              setEmailData({ ...emailData, subject: e.target.value })
            }
            required
            className="notice-input"
          />

          <textarea
            rows="4"
            placeholder="Write message content..."
            value={emailData.message}
            onChange={(e) =>
              setEmailData({ ...emailData, message: e.target.value })
            }
            required
            className="notice-textarea"
          ></textarea>

          <button
            type="submit"
            disabled={sendingEmail}
            className={`btn-primary btn-submit-notice ${
              sendingEmail ? "disabled" : ""
            }`}
          >
            {sendingEmail ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>

      {/* POPUP CHAT WINDOW */}
      {activeChatUser && (
        <div className="chat-popup chat-popup-admin">
          <div className="chat-header">
            <div>
              <h4>Chat: {activeChatUser.name}</h4>
              <span className="subtext">{activeChatUser.email}</span>
            </div>
            <button
              onClick={() => setActiveChatUser(null)}
              className="btn-close-chat"
            >
              ✕
            </button>
          </div>

          <div className="chat-body">
            {messages.filter(
              (m) =>
                m.senderEmail === activeChatUser.email ||
                m.receiverEmail === activeChatUser.email,
            ).length === 0 ? (
              <p className="chat-empty">
                No active session history. Send a message to connect.
              </p>
            ) : (
              messages
                .filter(
                  (m) =>
                    m.senderEmail === activeChatUser.email ||
                    m.receiverEmail === activeChatUser.email,
                )
                .map((msg, idx) => {
                  const isAdminMsg =
                    msg.senderEmail === "admin" ||
                    msg.receiverEmail === activeChatUser.email;

                  return (
                    <div
                      key={idx}
                      className={`chat-message ${isAdminMsg ? "me" : "other"}`}
                    >
                      <p>{msg.message}</p>
                      <span className="chat-time">{msg.time}</span>
                    </div>
                  );
                })
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="chat-footer">
            <input
              type="text"
              placeholder="Type message..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              className="chat-input"
            />
            <button type="submit" className="btn-sm btn-sm-blue">
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
