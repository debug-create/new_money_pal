import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Loader2, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  
  // State for toggling between Login and Signup
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsLoading(true);

    try {
      if (isLoginMode) {
        // --- LOGIN LOGIC ---
        const response = await fetch("http://127.0.0.1:8000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: email, password: password }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Login failed");
        }

        const data = await response.json();
        // Save token and user name to local storage
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user_name", data.user_name);
        
        // Redirect to Dashboard
        navigate("/dashboard");

      } else {
        // --- SIGNUP LOGIC ---
        // We only send Email, Password, and Name. 
        // Financial details will be set later in the dashboard.
        const payload = {
          email: email,
          password: password,
          full_name: fullName
        };

        const response = await fetch("http://127.0.0.1:8000/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Signup failed");
        }

        // Success!
        setSuccessMsg("✅ Account created! Please log in.");
        setIsLoginMode(true); // Switch to login view
        setPassword(""); // Clear password for safety
      }

    } catch (err: any) {
      setError(err.message || "Cannot reach the server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card-container">
        <form className="login-card" onSubmit={handleSubmit}>
          
          <div className="logo-section">
            <h1 className="logo-text">MoneyPal</h1>
            <p className="logo-subtitle">
              {isLoginMode 
                ? "Your financial buddy from Manipal. 🏛️" 
                : "Join the smartest students in Manipal. 🚀"}
            </p>
          </div>

          {/* Alert Messages */}
          {error && <div className="error-message" style={{color: '#ff4d4d', marginBottom: '1rem', textAlign: 'center', backgroundColor: '#ffe6e6', padding: '10px', borderRadius: '8px', fontSize: '14px'}}>{error}</div>}
          {successMsg && <div className="success-message" style={{color: '#16a34a', marginBottom: '1rem', textAlign: 'center', backgroundColor: '#dcfce7', padding: '10px', borderRadius: '8px', fontSize: '14px'}}>{successMsg}</div>}

          {/* Full Name Input (Only visible during Sign Up) */}
          {!isLoginMode && (
            <div className="form-group">
              <div className="input-wrapper">
                <User className="input-icon" size={22} />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name"
                  className="custom-input"
                />
              </div>
            </div>
          )}

          {/* Email Input */}
          <div className="form-group">
            <div className="input-wrapper">
              <Mail className="input-icon" size={22} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="custom-input"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="form-group">
            <div className="input-wrapper">
              <Lock className="input-icon" size={22} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="custom-input password-input"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle">
                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
          </div>

          {/* Main Action Button */}
          <button type="submit" className="btn-login" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : (isLoginMode ? "Access Dashboard" : "Create Account")}
          </button>

          {/* Toggle between Login and Signup */}
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
            {isLoginMode ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button" 
              onClick={() => { setIsLoginMode(!isLoginMode); setError(""); setSuccessMsg(""); }} 
              style={{ background: 'none', border: 'none', color: '#8b5cf6', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isLoginMode ? "Sign Up" : "Log In"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}