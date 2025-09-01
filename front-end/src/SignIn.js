import React, { useState } from "react";
import "./styles/App.css";
import "./styles/form.css";
import "./styles/Login.css";
import logo from './assets/logo.png';
import { useNavigate } from "react-router-dom";

export default function SignIn({ setUser }) {
  // State to store form input values
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  
  // State to store error messages from login attempt
  const [message, setMessage] = useState("");

  // React Router hook to navigate programmatically
  const navigate = useNavigate();

  // 🔹 Update loginData state when user types in input fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
  };

  // 🔹 Handle login form submission
  const handleLogin = async (e) => {
    e.preventDefault(); // prevent page reload

    try {
      // Send POST request to backend with login credentials
      const res = await fetch("http://localhost:5000/api/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
        credentials: "include", // include cookies for session
      });

      // If login failed, throw error with response text
      if (!res.ok) {
        const errorMsg = await res.text();
        throw new Error(errorMsg);
      }

      // On successful login, get user data
      const userData = await res.json();

      // Update parent state with logged-in user info
      setUser({
        id: userData.id,
        username: userData.username,
        role: userData.role,
        cne: userData.cne
      });

      // Redirect to home page
      navigate("/");
    } catch (err) {
      // Display error message
      setMessage(err.message);
    }
  };

  return (
    <div className="login-container">
      {/* Logo and title */}
      <div className="logo-container">
        <img src={logo} alt="شعار وزارة العدل" />
        <h2>محكمة الاستئناف الإدارية – فاس</h2>
      </div>

      {/* Login form */}
      <form onSubmit={handleLogin}>
        <label>اسم المستخدم</label>
        <input
          type="text"
          name="username"
          value={loginData.username}
          onChange={handleChange}
          required
        />

        <label>كلمة المرور</label>
        <input
          type="password"
          name="password"
          value={loginData.password}
          onChange={handleChange}
          required
        />

        <button type="submit">تسجيل الدخول</button>
      </form>

      {/* Display error message if login fails */}
      {message && <p>{message}</p>}
    </div>
  );
}
