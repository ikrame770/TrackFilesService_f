import React, { useState } from "react";
import "./styles/App.css";
import "./styles/CreateUser.css";

function CreateUser() {
    const [signupData, setSignupData] = useState({
        firstName: "",
        lastName: "",
        cne: "",
        role: "",
        password: "",
        confirmPassword: "",
    });

    const [passwordError, setPasswordError] = useState("");
    const [confirmError, setConfirmError] = useState("");
    const [message, setMessage] = useState(null); // success or error

    const handleSignupChange = (e) => {
        const { name, value } = e.target;
        setSignupData({ ...signupData, [name]: value });

        if (name === "password") {
            setPasswordError(value.length > 0 && value.length < 8 ? "كلمة المرور يجب أن تحتوي على الأقل 8 أحرف" : "");
            setConfirmError(signupData.confirmPassword && value !== signupData.confirmPassword ? "كلمتا المرور غير متطابقتين" : "");
        }

        if (name === "confirmPassword") {
            setConfirmError(value !== signupData.password ? "كلمتا المرور غير متطابقتين" : "");
        }
    };

    const handleSignupSubmit = async (e) => {
        e.preventDefault();

        if (signupData.password.length < 8) {
            setPasswordError("كلمة المرور يجب أن تحتوي على الأقل 8 أحرف");
            return;
        }

        if (signupData.password !== signupData.confirmPassword) {
            setConfirmError("كلمتا المرور غير متطابقتين");
            return;
        }

        try {
            const res = await fetch("http://localhost:5000/api/SignUp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // important! sends session cookie
                body: JSON.stringify({
                    firstName: signupData.firstName,
                    lastName: signupData.lastName,
                    cne: signupData.cne,
                    role: signupData.role,   // e.g., "كاتب ضبط" or "الصندوق"
                    passwordHash: signupData.password // plain password
                }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data || "فشل في إنشاء الحساب");

            setMessage({ type: "success", text: "✅ تم إنشاء الحساب بنجاح !" });

            setSignupData({
                firstName: "",
                lastName: "",
                cne: "",
                role: "",
                password: "",
                confirmPassword: "",
            });
            setPasswordError("");
            setConfirmError("");
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        }
    };

    return (
        <div className="transfer-form-container">
            <h2 style={{ textAlign: "center", marginBottom: "20px" }}>إنشاء حساب موظف جديد</h2>

            {message && <div className={`message-box ${message.type}-message rtl`}>{message.text}</div>}

            <form className="transfer-form" onSubmit={handleSignupSubmit}>
                <div className="form-row">
                    <div className="form-group">
                        <label>الاسم الشخصي</label>
                        <input name="firstName" type="text" value={signupData.firstName} onChange={handleSignupChange} required />
                    </div>

                    <div className="form-group">
                        <label>الاسم العائلي</label>
                        <input name="lastName" type="text" value={signupData.lastName} onChange={handleSignupChange} required />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>رقم CNI</label>
                        <input name="cne" type="text" value={signupData.cne} onChange={handleSignupChange} required />
                    </div>

                    <div className="form-group">
                        <label>الشعبة</label>
                        <select name="role" value={signupData.role} onChange={handleSignupChange} required>
                            <option value="">اختر الشعبة</option>
                            <option value="مستشار مقرر">مستشار مقرر</option>
                            <option value="مكتب ضبط">مكتب ضبط</option>
                            <option value="الكتابة الخاصة">الكتابة الخاصة</option>
                            <option value="كتب الخبرة">كتب الخبرة</option>
                            <option value="مكتب الجلسات">مكتب الجلسات</option>
                            <option value="رئيس أول">رئيس أول</option>
                            <option value="الصندوق">الصندوق</option>
                            <option value="الحفظ">الحفظ</option>
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>كلمة المرور</label>
                        <input
                            name="password"
                            type="password"
                            value={signupData.password}
                            onChange={handleSignupChange}
                            className={passwordError ? "error-input" : ""}
                            required
                        />
                        {passwordError && <p className="error-text">{passwordError}</p>}
                    </div>

                    <div className="form-group">
                        <label>تأكيد كلمة المرور</label>
                        <input
                            name="confirmPassword"
                            type="password"
                            value={signupData.confirmPassword}
                            onChange={handleSignupChange}
                            className={confirmError ? "error-input" : ""}
                            required
                        />
                        {confirmError && <p className="error-text">{confirmError}</p>}
                    </div>
                </div>

                <div className="form-buttons">
                    <button type="submit" className="submit-btn">إنشاء الحساب</button>
                    <button type="button" className="cancel-btn" onClick={() => setSignupData({
                        firstName: "",
                        lastName: "",
                        cne: "",
                        role: "",
                        password: "",
                        confirmPassword: "",
                    })}>إلغاء</button>
                </div>
            </form>
        </div>
    );
}

export default CreateUser;
