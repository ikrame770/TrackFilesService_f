import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./styles/App.css";
import logo from './assets/logo.png';

export default function SignUp() {
  const [signupData, setSignupData] = useState({
    firstName: "",
    lastName: "",
    cne: "",
    role: "",
    password: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSignupData(prev => ({ ...prev, [name]: value }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (signupData.password !== signupData.confirmPassword) {
      setMessage("كلمات المرور لا تتطابق!");
      return;
    }

    const { firstName, lastName, cne, role, password } = signupData;

    try {
      const res = await fetch("http://localhost:5000/api/signUp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, cne, role, passwordHash: password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "حدث خطأ أثناء التسجيل");

      setMessage(`تم إنشاء الحساب بنجاح! الاسم: ${data.firstName} ${data.lastName}`);
      setSignupData({
        firstName: "",
        lastName: "",
        cne: "",
        role: "",
        password: "",
        confirmPassword: "",
      });
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="logo-container">
        <img src={logo} alt="شعار وزارة العدل" />
        <h2>وزارة العدل<br />محكمة الاستئناف الإدارية – فاس</h2>
      </div>

      <form onSubmit={handleSignup}>
        <label>الاسم الشخصي</label>
        <input type="text" name="firstName" value={signupData.firstName} onChange={handleChange} required />

        <label>الاسم العائلي</label>
        <input type="text" name="lastName" value={signupData.lastName} onChange={handleChange} required />

        <label>رقم CNE</label>
        <input type="text" name="cne" value={signupData.cne} onChange={handleChange} required />

        <label>الدور</label>
        <select name="role" value={signupData.role} onChange={handleChange} required>
          <option value="">اختر الدور</option>
          <option value="admin">مدير النظام</option>
          <option value="مستشار مقرر">مستشار مقرر</option>
          <option value="كاتب ضبط">كاتب ضبط</option>
          <option value="الكتابة الخاصة">الكتابة الخاصة</option>
          <option value="كتب الخبرة">كتب الخبرة</option>
          <option value="مكتب الجلسات">مكتب الجلسات</option>
          <option value="رئيس أول">رئيس أول</option>
          <option value="الصندوق">الصندوق</option>
          <option value="الحفظ">الحفظ</option>
        </select>

        <label>كلمة المرور</label>
        <input type="password" name="password" value={signupData.password} onChange={handleChange} required />

        <label>تأكيد كلمة المرور</label>
        <input type="password" name="confirmPassword" value={signupData.confirmPassword} onChange={handleChange} required />

        <button type="submit">إنشاء الحساب</button>

        <p>
          <Link to="/signin">لديك حساب؟ تسجيل الدخول</Link>
        </p>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}
