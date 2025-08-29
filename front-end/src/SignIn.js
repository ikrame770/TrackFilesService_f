import React, { useState } from "react";
import "./styles/App.css";
import "./styles/form.css";
import "./styles/Login.css";
import logo from './assets/logo.png';
import {useNavigate } from "react-router-dom";

export default function SignIn({ setUser }) {
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5000/api/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify(loginData),
          credentials: "include"
      });

      if (!res.ok) {
        const errorMsg = await res.text();
        throw new Error(errorMsg);
      }

      const userData = await res.json(); // renamed from 'user' to 'userData'
      
        setUser({
            id: userData.id,           // lowercase
            username: userData.username,
            role: userData.role,
            cne: userData.cne
        });

      navigate("/"); // Redirect to home page
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="logo-container">
        <img src={logo} alt="شعار وزارة العدل" />
        <h2>محكمة الاستئناف الإدارية – فاس</h2>
      </div>
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
      {message && <p>{message}</p>}
    </div>
  );
}
