import React, { useState, useEffect } from "react";
import "./styles/App.css";
import "./styles/form.css";
import "./styles/DeleteUser.css";

function DeleteUser() {
    const [users, setUsers] = useState([]);
    const [searchCNE, setSearchCNE] = useState("");
    const [searchUsername, setSearchUsername] = useState("");
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [message, setMessage] = useState(null); // success or error

    // Fetch users on component mount, exclude admins
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch("http://localhost:5000/api/Users", {
                    method: "GET",
                    credentials: "include"
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.message || "فشل في جلب المستخدمين");

                // Filter out admin users
                const nonAdminUsers = (data.users || []).filter(u => u.role !== "admin");

                setUsers(nonAdminUsers);
                setFilteredUsers(nonAdminUsers);
            } catch (err) {
                setMessage({ type: "error", text: err.message });
            }
        };
        fetchUsers();
    }, []);

    const handleSearch = () => {
        const results = users.filter(
            (user) =>
                (searchCNE ? user.cne.toLowerCase().includes(searchCNE.toLowerCase()) : true) &&
                (searchUsername ? user.username.toLowerCase().includes(searchUsername.toLowerCase()) : true)
        );
        setFilteredUsers(results);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("⚠️ هل أنت متأكد أنك تريد حذف هذا الحساب ؟")) return;

        try {
            const res = await fetch(`http://localhost:5000/api/Users/${id}`, {
                method: "DELETE",
                credentials: "include"
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "فشل في حذف المستخدم");

            const updatedUsers = users.filter((u) => u.id !== id);
            setUsers(updatedUsers);
            setFilteredUsers(updatedUsers);
            setMessage({ type: "success", text: "✅ تم حذف الحساب بنجاح !" });
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        }
    };

    return (
        <div className="delete-user-container">
            <h2 className="main-title">إدارة حذف الحسابات</h2>

            {message && <div className={`message-box ${message.type}-message rtl`}>{message.text}</div>}

            <div className="search-bar">
                <div className="search-group">
                    <label>بحث برقم CNE:</label>
                    <input
                        type="text"
                        placeholder="أدخل رقم CNE"
                        value={searchCNE}
                        onChange={(e) => setSearchCNE(e.target.value)}
                    />
                </div>

                <div className="search-group">
                    <label>بحث باسم المستخدم:</label>
                    <input
                        type="text"
                        placeholder="أدخل اسم المستخدم"
                        value={searchUsername}
                        onChange={(e) => setSearchUsername(e.target.value)}
                    />
                </div>

                <button className="search-btn" onClick={handleSearch}>
                    بحث🔎
                </button>
            </div>

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
                        {filteredUsers.map((user) => (
                            <tr key={user.id}>
                                <td>{user.firstName}</td>
                                <td>{user.lastName}</td>
                                <td>{user.cne}</td>
                                <td>{user.role}</td>
                                <td>{user.username}</td>
                                <td>
                                    <button
                                        className="delete-btn"
                                        onClick={() => handleDelete(user.id)}
                                    >
                                        حذف
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default DeleteUser;
