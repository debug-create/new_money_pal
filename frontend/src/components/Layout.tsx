import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Receipt, PieChart, Bot, Settings, LogOut, Bell } from "lucide-react";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [userName, setUserName] = useState("User");
  const [showNotifs, setShowNotifs] = useState(false);

  // Fake Notifications
  const notifications = [
    { id: 1, text: "Budget Alert: 85% limit reached!", time: "2h ago", type: "alert" },
    { id: 2, text: "Welcome to MoneyPal Premium 🌟", time: "1d ago", type: "info" }
  ];

  useEffect(() => {
    const storedName = localStorage.getItem("user_name");
    if (storedName) setUserName(storedName);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_name");
    navigate("/login");
  };

  const menuItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Transactions", icon: Receipt, path: "/transactions" },
    { label: "Analytics", icon: PieChart, path: "/analytics" },
    { label: "AI Coach", icon: Bot, path: "/coach" },
    { label: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo-container">
          <h1 className="brand-logo">MoneyPal</h1>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button onClick={handleLogout} className="nav-item logout">
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {/* HEADER (Clean - No Search Bar) */}
        <header className="topbar" style={{ justifyContent: 'flex-end' }}>
          
          <div className="user-actions">
            
            {/* NOTIFICATIONS */}
            <div className="notification-wrapper">
              <button onClick={() => setShowNotifs(!showNotifs)} className="icon-btn">
                <Bell size={22} />
                <span className="notification-dot"></span>
              </button>
              
              {/* DROPDOWN */}
              {showNotifs && (
                <div className="notification-dropdown">
                  <div style={{borderBottom:'1px solid #f1f5f9', paddingBottom:'10px', marginBottom:'10px', fontWeight:'700', fontSize:'16px', color:'#1e293b'}}>Notifications</div>
                  {notifications.map(n => (
                    <div key={n.id} className="notif-item">
                      <div className={`notif-indicator ${n.type}`}></div>
                      <div>
                        <p style={{fontSize:'14px', margin:0, fontWeight:'600', color:'#1e293b'}}>{n.text}</p>
                        <span style={{fontSize:'12px', color:'#94a3b8'}}>{n.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PROFILE */}
            <div onClick={() => navigate('/settings')} className="user-profile-pill">
              <div className="avatar-sm">{userName.charAt(0).toUpperCase()}</div>
              <div className="user-text">
                <span className="name">{userName}</span>
                <span className="role">Premium</span>
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT CONTAINER */}
        <div className="content-scrollable">
          <Outlet />
        </div>
      </main>
    </div>
  );
}