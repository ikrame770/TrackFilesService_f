import React, { useState, useEffect, useRef } from "react";
import "./styles/App.css";
import "./styles/TransferFile.css";

function TransfersPage({ user, onClose, transferToEdit }) {
    const [fileNumber, setFileNumber] = useState("");
    const [destination, setDestination] = useState("");
    const [account, setAccount] = useState("");
    const [isWathiqa, setIsWathiqa] = useState(false);
    const [errors, setErrors] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [roles, setRoles] = useState([]);
    const [users, setUsers] = useState([]);
    const [ownership, setOwnership] = useState(null); // { exists: boolean, owned: boolean } | null
    const verifyTimeoutRef = useRef(null);

    // Populate form if editing
    useEffect(() => {
        if (!transferToEdit) return;
        setFileNumber(transferToEdit.entityNumber || "");
        setIsWathiqa(transferToEdit.type === "وثيقة");
        if (transferToEdit.toRole) setDestination(transferToEdit.toRole);
        if (transferToEdit.toUserId) setAccount(transferToEdit.toUserId);
    }, [transferToEdit]);

    // Fetch roles
    useEffect(() => {
        fetch("http://localhost:5000/api/transfers/roles", { credentials: "include" })
            .then(res => res.json())
            .then(data => {
                let filteredRoles = data.filter(r => r !== "admin" && r !== user.role);
                if (transferToEdit?.toRole && !filteredRoles.includes(transferToEdit.toRole)) {
                    filteredRoles.push(transferToEdit.toRole);
                }
                setRoles(filteredRoles);
            })
            .catch(console.error);
    }, [user.role, transferToEdit]);

    // Fetch users for selected role
    useEffect(() => {
        if (!destination) return setUsers([]);
        fetch(`http://localhost:5000/api/transfers/users/${destination}`, { credentials: "include" })
            .then(res => res.json())
            .then(data => {
                let filteredUsers = data.filter(u => u.role !== "admin" && u.id !== user.id);
                if (transferToEdit?.toUserId && !filteredUsers.some(u => u.id === transferToEdit.toUserId)) {
                    filteredUsers.push({ id: transferToEdit.toUserId, fullName: transferToEdit.toUserFullName });
                }
                setUsers(filteredUsers);
            })
            .catch(console.error);
    }, [destination, user.id, transferToEdit]);

    // Validate file/وثيقة number format
    const validateNumber = (num, isWathiqa) => {
        return isWathiqa
            ? /^\d{3,4}\/\d{3,4}$/.test(num)
            : /^\d{3,4}\/\d{3,4}\/\d{2,4}$/.test(num);
    };

    // Live verification
    const checkFileOwnership = async (num) => {
        // Only check if it has at least one '/'
        if (!num.includes("/")) {
            setOwnership(null);
            return;
        }
        try {
            const res = await fetch(
                `http://localhost:5000/api/entity/verify?entityNumber=${encodeURIComponent(num)}`,
                { credentials: "include" }
            );
            if (!res.ok) throw new Error("فشل التحقق");
            const data = await res.json();
            setOwnership(data);
        } catch (err) {
            console.error(err);
            setOwnership(null);
        }
    };


    const handleFileNumberChange = (e) => {
        const value = e.target.value;
        setFileNumber(value);
        setErrors("");
        setSuccessMsg("");

        if (verifyTimeoutRef.current) clearTimeout(verifyTimeoutRef.current);

        verifyTimeoutRef.current = setTimeout(() => checkFileOwnership(value), 500);
    };

    const getInputBorderClass = () => {
        if (!ownership) return "";
        if (!ownership.exists || !ownership.owned) return "input-error";
        if (ownership.exists && ownership.owned) return "input-success";
        return "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors("");

        if (!validateNumber(fileNumber, isWathiqa)) {
            setErrors(isWathiqa ? "⚠️ رقم الوثيقة غير صالح. مثال: 1333/2334" : "⚠️ رقم الملف غير صالح. مثال: 2025/2323/232");
            return;
        }

        if (!ownership?.exists || !ownership?.owned) {
            setErrors("⚠️ الملف غير موجود أو ليس ملكك");
            return;
        }

        const payload = {
            EntityNumber: fileNumber,
            ToRole: destination || null,
            ToUserId: account ? parseInt(account) : null,
            Content: `تم إحالة ${isWathiqa ? "الوثيقة" : "الملف"} رقم ${fileNumber}`,
        };

        try {
            const url = transferToEdit
                ? `http://localhost:5000/api/transfers/${transferToEdit.transferId}`
                : "http://localhost:5000/api/transfers";

            const res = await fetch(url, {
                method: transferToEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "فشل العملية");

            setSuccessMsg(transferToEdit ? "✅ تم تحديث الإحالة بنجاح" : "✅ تم إرسال الإحالة بنجاح");

            if (!transferToEdit) {
                setFileNumber("");
                setDestination("");
                setAccount("");
                setIsWathiqa(false);
                setOwnership(null);
            }

            setTimeout(() => setSuccessMsg(""), 4000);
        } catch (err) {
            setErrors(err.message);
        }
    };

    return (
        <div className="transfer-form-container">
            <h2>{transferToEdit ? "✏️ تعديل إحالة" : "إحالة ملف"}</h2>

            <form onSubmit={handleSubmit} className="transfer-form">
                <div className="form-row">
                    <div className="form-group">
                        <label>رقم {isWathiqa ? "الوثيقة" : "الملف"}</label>
                        <input
                            type="text"
                            value={fileNumber}
                            onChange={handleFileNumberChange}
                            placeholder={isWathiqa ? "مثال: 1333/2334" : "مثال: 2025/2323/232"}
                            className={getInputBorderClass()}
                            required
                        />
                        {ownership && (!ownership.exists || !ownership.owned) && (
                            <small className="ownership-msg">
                                {ownership.exists ? "هذا الملف ليس ملكك" : "الملف غير موجود"}
                            </small>
                        )}
                    </div>

                    <div className="form-group">
                        <label>الجهة المحال إليها</label>
                        <select
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            required
                        >
                            <option value="">اختر جهة</option>
                            {roles.map((role) => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>المستخدم</label>
                        <select value={account} onChange={(e) => setAccount(e.target.value)}>
                            <option value="">اختر مستخدم</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>{u.fullName}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-row checkbox-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={isWathiqa}
                            onChange={(e) => setIsWathiqa(e.target.checked)}
                        />
                        هذا وثيقة (بدل ملف)
                    </label>
                </div>

                {errors && <p className="error-text">{errors}</p>}
                {successMsg && <p className="success-text">{successMsg}</p>}

                <div className="form-buttons">
                    <button type="submit" className="submit-btn">
                        {transferToEdit ? "💾 حفظ التغييرات" : "إرسال الإحالة"}
                    </button>
                    <button type="button" className="cancel-btn" onClick={onClose}>
                        إلغاء
                    </button>
                </div>
            </form>
        </div>
    );
}

export default TransfersPage;
