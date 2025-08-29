import React, { useState } from "react";
import "./styles/App.css";

function UpdateUser() {
    const [username, setUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [cho3ba, setCho3ba] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [confirmError, setConfirmError] = useState("");
    const [message, setMessage] = useState(null); // success or error

    const handleUpdate = async (e) => {
        e.preventDefault();

        let hasError = false;
        setPasswordError("");
        setConfirmError("");
        setMessage(null);

        if (newPassword && newPassword.length < 8) {
            setPasswordError("كلمة المرور يجب أن تحتوي على الأقل 8 أحرف");
            hasError = true;
        }

        if (newPassword && newPassword !== confirmPassword) {
            setConfirmError("كلمتا المرور غير متطابقتين");
            hasError = true;
        }

        if (hasError) return;

        try {
            const res = await fetch("http://localhost:5000/api/UpdateUser", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    username,
                    newPassword: newPassword || undefined,
                    role: cho3ba || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data?.message || "فشل في تحديث الحساب");

            setMessage({ type: "success", text: data.message || "✅ تم تحديث الحساب بنجاح !" });

            setUsername("");
            setNewPassword("");
            setConfirmPassword("");
            setCho3ba("");
            setPasswordError("");
            setConfirmError("");
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        }
    };

    return (
        <div className="transfer-form-container">
            <h2 style={{ textAlign: "center", marginBottom: "20px" }}>تحديث حساب مستخدم</h2>

            {message && <div className={`message-box ${message.type}-message rtl`}>{message.text}</div>}

            <form className="transfer-form" onSubmit={handleUpdate}>
                <div className="form-group">
                    <label>اسم المستخدم</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>كلمة السر الجديدة (اختياري)</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => {
                            setNewPassword(e.target.value);
                            setPasswordError(e.target.value.length > 0 && e.target.value.length < 8
                                ? "كلمة المرور يجب أن تحتوي على الأقل 8 أحرف"
                                : "");
                        }}
                        className={passwordError ? "error-input" : ""}
                    />
                    {passwordError && <span className="error-text">{passwordError}</span>}
                </div>

                <div className="form-group">
                    <label>تأكيد كلمة السر الجديدة</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setConfirmError(newPassword && newPassword !== e.target.value
                                ? "كلمتا المرور غير متطابقتين"
                                : "");
                        }}
                        className={confirmError ? "error-input" : ""}
                    />
                    {confirmError && <span className="error-text">{confirmError}</span>}
                </div>

                <div className="form-group">
                    <label>الشعبة (اختياري)</label>
                    <select
                        value={cho3ba}
                        onChange={(e) => setCho3ba(e.target.value)}
                        className="form-input select-input"
                    >
                        <option value="">-- بدون تغيير --</option>
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

                <div className="form-buttons">
                    <button type="submit" className="submit-btn">تحديث</button>
                    <button
                        type="button"
                        className="cancel-btn"
                        onClick={() => {
                            setUsername("");
                            setNewPassword("");
                            setConfirmPassword("");
                            setCho3ba("");
                            setPasswordError("");
                            setConfirmError("");
                            setMessage(null);
                        }}
                    >
                        إلغاء
                    </button>
                </div>
            </form>
        </div>
    );
}

export default UpdateUser;
