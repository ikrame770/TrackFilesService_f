import React, { useState, useEffect } from "react";
import "./styles/App.css";
import "./styles/form.css";
import "./styles/EditTransfer.css";

export default function MySentTransfers({ user }) {
    // State for sent transfers, loading status, and messages
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    // State for editing a transfer
    const [editingTransfer, setEditingTransfer] = useState(null);
    const [roles, setRoles] = useState([]);        // Available roles to reassign
    const [users, setUsers] = useState([]);        // Users corresponding to selected role
    const [toRole, setToRole] = useState("");      // Selected role in edit form
    const [toUser, setToUser] = useState("");      // Selected user in edit form
    const [error, setError] = useState("");        // Error messages in edit form

    // Fetch all sent transfers when component mounts
    useEffect(() => {
        const fetchTransfers = async () => {
            setLoading(true);
            setMessage(null);
            try {
                const res = await fetch("http://localhost:5000/api/transfers/mysent", { credentials: "include" });
                if (!res.ok) throw new Error("فشل في جلب الإحالات المرسلة");
                const data = await res.json();
                setTransfers(data);
            } catch (err) {
                setMessage({ type: "error", text: err.message });
            } finally {
                setLoading(false);
            }
        };
        fetchTransfers();
    }, []);

    // Fetch all available roles except admin and current user's role
    useEffect(() => {
        let isMounted = true;
        const fetchRoles = async () => {
            try {
                const res = await fetch("http://localhost:5000/api/transfers/roles", { credentials: "include" });
                const data = await res.json();
                let filteredRoles = data.filter(r => r !== "admin" && r !== user.role);
                
                // Keep editing role if already assigned
                if (editingTransfer?.toRole && !filteredRoles.includes(editingTransfer.toRole)) {
                    filteredRoles.push(editingTransfer.toRole);
                }
                
                if (isMounted) setRoles(filteredRoles);
            } catch (err) {
                console.error(err);
            }
        };
        fetchRoles();
        return () => { isMounted = false; };
    }, [editingTransfer, user.role]);

    // Fetch users for the selected role (exclude admin and current user)
    useEffect(() => {
        let isMounted = true;
        if (!toRole) return setUsers([]);

        const fetchUsers = async () => {
            try {
                const res = await fetch(`http://localhost:5000/api/transfers/users/${toRole}`, { credentials: "include" });
                const data = await res.json();
                let filteredUsers = data.filter(u => u.role !== "admin" && u.id !== user.id);

                // Keep the currently assigned user in the list
                if (editingTransfer?.toUserId && editingTransfer.toUserId !== user.id &&
                    !filteredUsers.some(u => u.id === editingTransfer.toUserId)) {
                    filteredUsers.push({
                        id: editingTransfer.toUserId,
                        fullName: editingTransfer.toUserName
                    });
                }
                if (isMounted) setUsers(filteredUsers);
            } catch (err) {
                console.error(err);
            }
        };
        fetchUsers();
        return () => { isMounted = false; };
    }, [toRole, editingTransfer, user.id]);

    // Cancel a sent transfer
    const cancelTransfer = async id => {
        try {
            const res = await fetch(`http://localhost:5000/api/transfers/${id}`, {
                method: "DELETE",
                credentials: "include"
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "فشل في إلغاء الإحالة");

            // Remove cancelled transfer from state
            setTransfers(prev => prev.filter(t => t.transferId !== id));
            setMessage({ type: "success", text: "تم إلغاء الإحالة بنجاح" });
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        }
    };

    // Open edit form for a selected transfer
    const openEdit = transfer => {
        setEditingTransfer(transfer);
        setToRole(transfer.toRole || "");
        setToUser(transfer.toUserId || "");
        setError("");
    };

    // Handle updating a transfer
    const handleUpdate = async () => {
        if (!toRole) return setError("⚠️ الرجاء اختيار جهة المحال إليها");

        try {
            const payload = { ToRole: toRole, ToUserId: toUser || null };
            const res = await fetch(`http://localhost:5000/api/transfers/${editingTransfer.transferId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload)
            });
            const text = await res.text();
            const data = text ? JSON.parse(text) : {};
            if (!res.ok) throw new Error(data.message || "فشل تعديل الإحالة");

            const updatedTransfer = data.transfer || { ...editingTransfer, toRole, toUserId: toUser };
            setTransfers(prev => prev.map(t => t.transferId === editingTransfer.transferId ? updatedTransfer : t));

            setEditingTransfer(null);
            setMessage({ type: "success", text: "تم تعديل الإحالة بنجاح" });
        } catch (err) {
            setError(err.message);
        }
    };

    // Show loading state if transfers are being fetched
    if (loading) return <p className="loading-text">جاري جلب الإحالات المرسلة...</p>;

    return (
        <div className="file-reassign-container">
            <h2>إمكانية تغيير إحالة الملفات</h2>
            {message && <div className={`message-box ${message.type}-message rtl`}>{message.text}</div>}

            {/* Transfers table */}
            <table>
                <thead>
                    <tr>
                        <th>رقم الملف</th>
                        <th>الجهة</th>
                        <th>المستخدم</th>
                        <th>تاريخ الإرسال</th>
                        <th>العمليات</th>
                    </tr>
                </thead>
                <tbody>
                    {transfers.length === 0 ? (
                        <tr>
                            <td colSpan={7} style={{ textAlign: "center" }}>لا توجد إحالات مرسلة حاليا.</td>
                        </tr>
                    ) : (
                        transfers.map(t => (
                            <tr key={t.transferId}>
                                <td>{t.entityNumber ?? "N/A"}</td>
                                <td>{t.toRole ?? "N/A"}</td>
                                <td>{t.toUserName ?? "N/A"}</td>
                                <td>{t.dateSent ? new Date(t.dateSent).toLocaleDateString("ar-MA") : "-"}</td>
                                <td>
                                    {t.status !== 1 && (
                                        <>
                                            <button className="edit-btn" onClick={() => openEdit(t)}>تعديل</button>
                                            <button className="cancel-btn" onClick={() => cancelTransfer(t.transferId)}>إلغاء</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* Edit transfer form */}
            {editingTransfer && (
                <div className="edit-form">
                    <h3>تعديل إحالة الملف</h3>
                    {error && <p className="error-text">{error}</p>}

                    <div className="form-group">
                        <label>رقم الملف :</label>
                        <input type="text" value={editingTransfer.entityNumber} disabled />
                    </div>

                    <div className="form-group">
                        <label>الجهة المحال إليها</label>
                        <select value={toRole} onChange={e => setToRole(e.target.value)}>
                            <option value="">اختر جهة</option>
                            {roles.map(role => <option key={role} value={role}>{role}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>المستخدم</label>
                        <select value={toUser} onChange={e => setToUser(e.target.value)}>
                            <option value="">اختر مستخدم</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                        </select>
                    </div>

                    <div className="form-actions">
                        <button className="save-btn" onClick={handleUpdate}>حفظ التعديلات</button>
                        <button className="cancel-edit-btn" onClick={() => setEditingTransfer(null)}>إلغاء</button>
                    </div>
                </div>
            )}
        </div>
    );
}
