import React, { useState, useEffect } from "react";
import "./styles/App.css";
import "./styles/form.css";
import "./styles/DeleteUser.css";

function ManageUsers() {
  // State for user data, search filters, and messages
  const [users, setUsers] = useState([]);
  const [searchCNE, setSearchCNE] = useState("");
  const [searchUsername, setSearchUsername] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [message, setMessage] = useState(null); // success or error messages

  // State for editing a user
  const [editingUser, setEditingUser] = useState(null); 
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editConfirm, setEditConfirm] = useState("");
  const [editRole, setEditRole] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  // Fetch all users on component mount (excluding admin users)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/Users", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "فشل في جلب المستخدمين");
        const nonAdminUsers = (data.users || []).filter(u => u.role !== "admin");
        setUsers(nonAdminUsers);
        setFilteredUsers(nonAdminUsers);
      } catch (err) {
        setMessage({ type: "error", text: err.message });
      }
    };
    fetchUsers();
  }, []);

  // Filter users based on search inputs
  const handleSearch = () => {
    const results = users.filter(
      (user) =>
        (searchCNE ? user.cne.toLowerCase().includes(searchCNE.toLowerCase()) : true) &&
        (searchUsername ? user.username.toLowerCase().includes(searchUsername.toLowerCase()) : true)
    );
    setFilteredUsers(results);
  };

  // Delete a user after confirmation
  const handleDelete = async (id) => {
    if (!window.confirm("⚠️ هل أنت متأكد أنك تريد حذف هذا الحساب ؟")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/Users/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "فشل في حذف المستخدم");

      // Update local user lists after deletion
      const updatedUsers = users.filter(u => u.id !== id);
      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers);
      setMessage({ type: "success", text: "✅ تم حذف الحساب بنجاح !" });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  // Open modal to edit selected user
  const openEditModal = (user) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditRole(user.role);
    setEditPassword("");
    setEditConfirm("");
    setPasswordError("");
    setConfirmError("");
    setMessage(null);
  };

  // Handle updating user data
  const handleUpdate = async (e) => {
    e.preventDefault();
    let hasError = false;

    // Reset error messages
    setPasswordError("");
    setConfirmError("");
    setMessage(null);

    // Password validation
    if (editPassword && editPassword.length < 8) {
      setPasswordError("كلمة المرور يجب أن تحتوي على الأقل 8 أحرف");
      hasError = true;
    }
    if (editPassword && editPassword !== editConfirm) {
      setConfirmError("كلمتا المرور غير متطابقتين");
      hasError = true;
    }
    if (hasError) return;

    try {
      // Call API to update user
      const res = await fetch("http://localhost:5000/api/UpdateUser", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: editUsername,
          newPassword: editPassword || undefined,
          role: editRole || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "فشل في تحديث الحساب");

      // Update local user lists
      const updatedUsers = users.map(u =>
        u.id === editingUser.id ? { ...u, username: editUsername, role: editRole } : u
      );
      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers);
      setMessage({ type: "success", text: data.message || "✅ تم تحديث الحساب بنجاح !" });
      setEditingUser(null); // close modal
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  return (
    <div className="delete-user-container">
      <h2 className="main-title">إدارة المستخدمين</h2>

      {/* Display messages */}
      {message && <div className={`message-box ${message.type}-message rtl`}>{message.text}</div>}

      {/* Search inputs */}
      <div className="search-bar">
        <div className="search-group">
          <label>بحث برقم CNE:</label>
          <input type="text" placeholder="أدخل رقم CNE" value={searchCNE} onChange={e => setSearchCNE(e.target.value)} />
        </div>
        <div className="search-group">
          <label>بحث باسم المستخدم:</label>
          <input type="text" placeholder="أدخل اسم المستخدم" value={searchUsername} onChange={e => setSearchUsername(e.target.value)} />
        </div>
        <button className="search-btn" onClick={handleSearch}>بحث🔎</button>
      </div>

      {/* Users table */}
      {filteredUsers.length === 0 ? (
        <p>❌ لا يوجد أي حساب</p>
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>الاسم الشخصي</th>
              <th>الاسم العائلي</th>
              <th>CNE</th>
              <th>الشعبة</th>
              <th>اسم المستخدم</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>{user.firstName}</td>
                <td>{user.lastName}</td>
                <td>{user.cne}</td>
                <td>{user.role}</td>
                <td>{user.username}</td>
                <td>
                  <button className="edit-btn" onClick={() => openEditModal(user)}>تعديل</button>
                  <button className="delete-btn" onClick={() => handleDelete(user.id)}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Edit user modal */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            padding: '20px',
            borderRadius: '10px',
            zIndex: 1000
          }}>
            <h3>تحديث حساب مستخدم</h3>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label>اسم المستخدم</label>
                <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>كلمة السر الجديدة (اختياري)</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={e => {
                    setEditPassword(e.target.value);
                    setPasswordError(e.target.value.length > 0 && e.target.value.length < 8
                      ? "كلمة المرور يجب أن تحتوي على الأقل 8 أحرف" : ""
                    );
                  }}
                  className={passwordError ? "error-input" : ""}
                />
                {passwordError && <span className="error-text">{passwordError}</span>}
              </div>
              <div className="form-group">
                <label>تأكيد كلمة السر الجديدة</label>
                <input
                  type="password"
                  value={editConfirm}
                  onChange={e => {
                    setEditConfirm(e.target.value);
                    setConfirmError(editPassword && editPassword !== e.target.value ? "كلمتا المرور غير متطابقتين" : "");
                  }}
                  className={confirmError ? "error-input" : ""}
                />
                {confirmError && <span className="error-text">{confirmError}</span>}
              </div>
              <div className="form-group">
                <label>الشعبة (اختياري)</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value)} className="form-input select-input">
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
                <button type="button" className="cancel-btn" onClick={() => setEditingUser(null)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageUsers;
