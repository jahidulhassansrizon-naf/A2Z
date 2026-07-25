import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    alert("Logout successful.");
    navigate("/login");
    window.location.reload();
  };

  const displayRole =
    user?.role?.toUpperCase() === "STUDENT" ? "USER" : user?.role;

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <div className="navbar-logo-box">AZ</div>
        <div>
          <h2 className="navbar-title">A to Z</h2>
          <span className="navbar-subtitle">MANAGEMENT SYSTEM</span>
        </div>
      </Link>

      <div className="navbar-right">
        {token && user ? (
          <>
            <div className="navbar-user-info">
              <span className="navbar-user-name">{user.name}</span>
              <span
                className={`navbar-user-role ${
                  user.role === "admin" ? "admin" : "student"
                }`}
              >
                ● {displayRole}
              </span>
            </div>
            <button onClick={handleLogout} className="btn-danger">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar-link">
              Login
            </Link>
            <Link to="/register" className="btn-primary">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
