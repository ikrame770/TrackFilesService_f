import React, { useState, useEffect } from "react";
import "./styles/App.css";
import "./styles/TransferFile.css";

function TransfersPage({ user, onClose, transferToEdit, mode }) {
    const [fileNumber, setFileNumber] = useState("");
    const [destination, setDestination] = useState("");
    const isEditMode = mode === "edit";
    const [account, setAccount] = useState("");
    const [isWathiqa, setIsWathiqa] = useState(false);
    const [errors, setErrors] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [roles, setRoles] = useState([]);
    const [users, setUsers] = useState([]);
    const [ownership, setOwnership] = useState(null);
    const [ownedFiles, setOwnedFiles] = useState([]);
    
    // 🔹 Add File modal state (from old version)
    const [showAddFileForm, setShowAddFileForm] = useState(false);
    const [newFile, setNewFile] = useState({
        number: "",
        isWathiqa: false,
        appellant: "",
        respondent: "",
        subject: "",
        status: "",
        magistrate: "",
    });
    const [addFileErrors, setAddFileErrors] = useState("");
    const [addFileSuccess, setAddFileSuccess] = useState("");

    // Populate form if editing
    useEffect(() => {
        if (!transferToEdit) return;

        setFileNumber(transferToEdit.entityNumber || "");

        if (isEditMode) {
            setIsWathiqa(transferToEdit.type === "وثيقة");
            if (transferToEdit.toRole) setDestination(transferToEdit.toRole);
            if (transferToEdit.toUserId) setAccount(transferToEdit.toUserId);
        } else {
            setIsWathiqa(false);
            setDestination("");
            setAccount("");
        }
    }, [transferToEdit, isEditMode]);

    useEffect(() => {
        if (!fileNumber || ownedFiles.length === 0) return;
        const result = checkLocalOwnership(fileNumber);
        setOwnership(result);
    }, [fileNumber, ownedFiles]);

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

    // Fetch all owned file numbers once
    useEffect(() => {
        fetch("http://localhost:5000/api/entity/my-entities", { credentials: "include" })
            .then(res => res.json())
            .then(data => setOwnedFiles(data))
            .catch(console.error);
    }, []);

    const validateNumber = (num, isWathiqa) => {
        return isWathiqa
            ? /^\d{3,4}\/\d{3,4}$/.test(num)
            : /^\d{3,4}\/\d{3,4}\/\d{2,4}$/.test(num);
    };

    const checkLocalOwnership = (num) => {
        if (!num.includes("/")) return null;
        const exists = ownedFiles.includes(num);
        return { exists, owned: exists };
    };

    const handleFileNumberChange = (e) => {
        const value = e.target.value;
        setFileNumber(value);
        setErrors("");
        setSuccessMsg("");

        const result = checkLocalOwnership(value);
        setOwnership(result);
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

        const isEdit = mode === "edit" && transferToEdit?.transferId;

        if (!validateNumber(fileNumber, isWathiqa)) {
            setErrors(
                isWathiqa
                    ? "⚠️ رقم الوثيقة غير صالح. مثال: 1333/2334"
                    : "⚠️ رقم الملف غير صالح. مثال: 2025/2323/232"
            );
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
            const url = isEdit
                ? `http://localhost:5000/api/transfers/${transferToEdit.transferId}`
                : "http://localhost:5000/api/transfers";

            const res = await fetch(url, {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "فشل العملية");

            setSuccessMsg(isEdit ? "✅ تم تحديث الإحالة بنجاح" : "✅ تم إرسال الإحالة بنجاح");

            if (!isEdit) {
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

    // 🔹 Add File modal submission (from old version)
    const handleAddFileSubmit = async (e) => {
        e.preventDefault();
        setAddFileErrors("");

        if (!validateNumber(newFile.number, newFile.isWathiqa)) {
            setAddFileErrors(
                newFile.isWathiqa ? "⚠️ رقم الوثيقة غير صالح." : "⚠️ رقم الملف غير صالح."
            );
            return;
        }

        const payload = {
            EntityNumber: newFile.number,
            Part1: newFile.appellant,
            Part2: newFile.respondent,
            Sujet: newFile.subject,
            Status: newFile.status,
            Magistrale: newFile.magistrate,
            Type: newFile.isWathiqa ? "وثيقة" : "ملف",
        };

        try {
            const res = await fetch("http://localhost:5000/api/AddEntity", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "فشل إضافة الملف");

            setAddFileSuccess("✅ تم إضافة الملف بنجاح");
            setNewFile({
                number: "",
                isWathiqa: false,
                appellant: "",
                respondent: "",
                subject: "",
                status: "",
                magistrate: "",
            });
            setTimeout(() => setAddFileSuccess(""), 4000);
        } catch (err) {
            setAddFileErrors(err.message);
        }
    };

    return (
        <div className="transfer-form-container">
            <h2>{isEditMode ? "✏️ تعديل إحالة" : "إحالة ملف"}</h2>

            <form onSubmit={handleSubmit} className="transfer-form">
                <div className="form-row">
                    <div className="form-group">
                        <label>رقم {isWathiqa ? "الوثيقة" : "الملف"}</label>
                        <input
                            list="ownedFilesList"
                            type="text"
                            value={fileNumber}
                            onChange={handleFileNumberChange}
                            placeholder={isWathiqa ? "مثال: 1333/2334" : "مثال: 2025/2323/232"}
                            className={getInputBorderClass()}
                            required
                        />
                        <datalist id="ownedFilesList">
                            {ownedFiles.map(num => (
                                <option key={num} value={num} />
                            ))}
                        </datalist>
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
                        {isEditMode ? "💾 حفظ التغييرات" : "إرسال الإحالة"}
                    </button>
                    <button type="button" className="cancel-btn" onClick={onClose}>
                        إلغاء
                    </button>
                </div>
            </form>

            {/* 🔹 Add File Button */}
            {(user.role === "مكتب ضبط" || user.role === "الصندوق") && (
                <button className="add-file-btn" onClick={() => setShowAddFileForm(true)}>
                    إضافة ملف
                </button>
            )}

            {/* 🔹 Add File Modal */}
            {showAddFileForm && (
                <div className="add-file-modal">
                    <div className="add-file-form">
                        <button className="close-btn" onClick={() => setShowAddFileForm(false)}>
                            ✕
                        </button>
                        <h2>إضافة ملف جديد</h2>

                        <form onSubmit={handleAddFileSubmit}>
                            <div className="form-row checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={newFile.isWathiqa}
                                        onChange={(e) =>
                                            setNewFile({ ...newFile, isWathiqa: e.target.checked })
                                        }
                                    />
                                    هذا وثيقة (بدل ملف)
                                </label>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>رقم {newFile.isWathiqa ? "الوثيقة" : "الملف"}</label>
                                    <input
                                        type="text"
                                        value={newFile.number}
                                        onChange={(e) =>
                                            setNewFile({ ...newFile, number: e.target.value })
                                        }
                                        placeholder={newFile.isWathiqa ? "مثال: 1333/2334" : "مثال: 2025/2323/232"}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>المستأنف</label>
                                    <input
                                        type="text"
                                        value={newFile.appellant}
                                        onChange={(e) =>
                                            setNewFile({ ...newFile, appellant: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>المستأنف عليه</label>
                                    <input
                                        type="text"
                                        value={newFile.respondent}
                                        onChange={(e) =>
                                            setNewFile({ ...newFile, respondent: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>موضوع الدعوى</label>
                                    <input
                                        type="text"
                                        value={newFile.subject}
                                        onChange={(e) =>
                                            setNewFile({ ...newFile, subject: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>الحالة</label>
                                    <select
                                        value={newFile.status}
                                        onChange={(e) =>
                                            setNewFile({ ...newFile, status: e.target.value })
                                        }
                                        required
                                    >
                                        <option value="">اختر الحالة</option>
                                        <option value="محكوم">محكوم</option>
                                        <option value="غير محكوم">غير محكوم</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>المستشار المقرر</label>
                                    <input
                                        type="text"
                                        value={newFile.magistrate}
                                        onChange={(e) =>
                                            setNewFile({ ...newFile, magistrate: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                            </div>

                            {addFileErrors && <p className="error-text">{addFileErrors}</p>}
                            {addFileSuccess && <p className="success-text">{addFileSuccess}</p>}

                            <div className="form-buttons">
                                <button type="submit" className="submit-btn">حفظ</button>
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={() => setShowAddFileForm(false)}
                                >
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TransfersPage;
