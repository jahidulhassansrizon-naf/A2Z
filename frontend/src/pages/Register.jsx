import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    roll: "",
    adminSecret: "",
  });

  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:3000/api/auth/send-otp",
        formData,
      );
      alert(res.data.message);
      setStep(2);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(
        "https://a2z-4ds1.onrender.com/api/auth/verify-otp",
        {
          email: formData.email,
          otp: otp,
        },
      );
      alert(res.data.message);
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "Invalid OTP code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container-wrapper">
      <div className="auth-container glow-card register-container">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>Fill in the details below to register</p>
        </div>

        {step === 1 && (
          <form onSubmit={handleSendOTP} className="auth-form">
            <div className="auth-form-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="auth-input"
              />
            </div>

            <div className="auth-form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="example@gmail.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                className="auth-input"
              />
            </div>

            <div className="auth-form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                className="auth-input"
              />
            </div>

            <div className="auth-form-group">
              <label>Account Role</label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="auth-select"
              >
                <option value="student">User / Member</option>
                <option value="admin">Admin / Manager</option>
              </select>
            </div>

            {formData.role === "student" && (
              <div className="auth-form-group">
                <label className="text-cyan">Unique User ID Number</label>
                <input
                  type="number"
                  placeholder="e.g. 1001"
                  value={formData.roll}
                  onChange={(e) =>
                    setFormData({ ...formData, roll: e.target.value })
                  }
                  required
                  className="auth-input highlight-primary"
                />
              </div>
            )}

            {formData.role === "admin" && (
              <div className="auth-form-group">
                <label className="text-emerald">Admin Secret Passcode</label>
                <input
                  type="password"
                  placeholder="Enter secret passcode"
                  value={formData.adminSecret}
                  onChange={(e) =>
                    setFormData({ ...formData, adminSecret: e.target.value })
                  }
                  required
                  className="auth-input highlight-accent"
                />
              </div>
            )}

            <button
              type="submit"
              className="btn-primary btn-full-width"
              disabled={loading}
            >
              {loading ? "Sending OTP..." : "Sign Up"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="otp-box">
            <div className="text-center">
              <h3 className="text-cyan">Email Verification</h3>
              <p className="subtext">
                An OTP has been sent to <b>{formData.email}</b>
              </p>
            </div>

            <div className="auth-form-group">
              <label className="text-emerald text-center">
                Enter 6-Digit OTP Code
              </label>
              <input
                type="text"
                placeholder="e.g. 123456"
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="auth-input otp-input"
              />
            </div>

            <button
              type="submit"
              className="btn-primary btn-full-width btn-emerald"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify & Complete Signup"}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-back"
            >
              Back to Change Email
            </button>
          </form>
        )}

        <p className="auth-footer-text">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
