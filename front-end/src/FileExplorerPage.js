// FileExplorerPage.js
import React, { useState, useEffect } from "react";
import "./styles/App.css";
import "./styles/form.css";
import "./styles/FileExplorerPage.css";
function BatchTransferModal({ selectedFiles, onClose, onTransfer, user, isEdit = false }) {
    const [roles, setRoles] = useState([]);
    const [users, setUsers] = useState([]);
    const [toRole, setToRole] = useState("");
    const [toUserId, setToUserId] = useState("");
    const [content, setContent] = useState("");


    // Fetch roles
    useEffect(() => {
        if (!user?.role) return;
        const fetchRoles = async () => {
            try {
                const res = await fetch("http://localhost:5000/api/transfers/roles", { credentials: "include" });
                const data = await res.json();
                const filteredRoles = data.filter(r => r.toLowerCase() !== "admin" && r !== user.role);
                setRoles(filteredRoles);
            } catch (err) { console.error(err); }
        };
        fetchRoles();
    }, [user]);

    // Fetch users for selected role
    useEffect(() => {
        if (!toRole) {
            setUsers([]);
            setToUserId("");
            return;
        }
        const fetchUsers = async () => {
            try {
                const res = await fetch(`http://localhost:5000/api/transfers/users/${toRole}`, { credentials: "include" });
                const data = await res.json();
                const filteredUsers = data.filter(u => u.role.toLowerCase() !== "admin" && u.id !== user.id);
                setUsers(filteredUsers);
            } catch (err) { console.error(err); }
        };
        fetchUsers();
    }, [toRole, user]);

    const handleSubmit = async () => {
        if (!toRole && !toUserId) {
            alert("🚫 اختر مستخدم أو جهة للإحالة.");
            return;
        }

        const body = isEdit
            ? { transferIds: selectedFiles.map(id => Number(id)), toRole, toUserId, content }
            : { entityIds: selectedFiles.map(id => Number(id)), toRole, toUserId, content };



        try {
            const url = isEdit
                ? "http://localhost:5000/api/transfers/update-batch"
                : "http://localhost:5000/api/transfers/batch-by-id";

            const res = await fetch(url, {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                onTransfer();
                onClose();
            } else {
                alert(data.message || "🚫 حدث خطأ أثناء العملية");
            }
        } catch (err) {
            console.error(err);
            alert("🚫 حدث خطأ أثناء العملية");
        }
    };

    return (
        <div className="modal">
            <h3>{isEdit ? "تعديل الإحالات المحددة" : "إحالة الملفات المحددة"}</h3>
            <div>
                <label>جهة الإحالة (Role): </label>
                <select value={toRole} onChange={(e) => setToRole(e.target.value)}>
                    <option value="">-- اختر --</option>
                    {roles.map((r, i) => <option key={i} value={r}>{r}</option>)}
                </select>
            </div>
            <div>
                <label>المستخدم (User): </label>
                <select value={toUserId} onChange={(e) => setToUserId(e.target.value)} disabled={!users.length}>
                    <option value="">-- اختر --</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
            </div>
            <div>
                <label>المحتوى (اختياري): </label>
                <input value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
            <button onClick={handleSubmit}>{isEdit ? "تعديل الإحالات" : "إحالة الملفات"}</button>
            <button onClick={onClose}>إلغاء</button>
        </div>
    );
}

export default function FileExplorerPage({ user }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [showBatchModal, setShowBatchModal] = useState(false);

    // Filters
    const [filterNumber, setFilterNumber] = useState("");
    const [filterSource, setFilterSource] = useState("");
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");

    const fetchFiles = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/entity/reunion", { credentials: "include" });
            const data = await res.json();
            const normalized = data.map(f => ({
                id: f.id ?? f.entityId,
                number: f.number ?? f.entityNumber,
                sujet: f.sujet,
                part1: f.part1,
                part2: f.part2,
                status: f.status,
                magistrale: f.magistrale,
                type: f.type,
                date: f.date,
                fromOrTo: f.fromOrTo,
                source: f.source,
            }));
            setFiles(normalized);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchFiles(); }, []);

    const toggleFileSelection = (fileId) => {
        const clickedFile = files.find(f => f.id === fileId);
        if (!clickedFile) return;

        if (selectedFiles.length === 0) {
            setSelectedFiles([fileId]);
            return;
        }

        const firstSelected = files.find(f => f.id === selectedFiles[0]);
        if (clickedFile.source !== firstSelected.source) {
            alert("🚫 لا يمكنك تحديد ملفات بمصدر مختلف.");
            return;
        }

        setSelectedFiles(prev =>
            prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
        );
    };

    const handleCancelTransfers = async () => {
        if (!window.confirm("هل أنت متأكد من إلغاء الإحالات المحددة؟")) return;

        try {
            const res = await fetch("http://localhost:5000/api/transfers/cancel-batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(selectedFiles)
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message || `✅ تم إلغاء ${selectedFiles.length} إحالة بنجاح`);
                setSelectedFiles([]);
                fetchFiles();
            } else { alert(data.message || "حدث خطأ أثناء إلغاء الإحالات"); }
        } catch (err) { console.error(err); alert("حدث خطأ أثناء إلغاء الإحالات"); }
    };

    const handleAcceptTransfers = async () => {
        if (!selectedFiles.length) return;
        try {
            const res = await fetch("http://localhost:5000/api/transfers/accept-batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(selectedFiles)
            });
            const data = await res.json();
            alert(data.message + (data.errors.length ? "\n" + data.errors.join("\n") : ""));
            setSelectedFiles([]);
            fetchFiles();
        } catch (err) { console.error(err); alert("حدث خطأ أثناء قبول الإحالات"); }
    };

    const handleRejectTransfers = async () => {
        if (!selectedFiles.length) return;
        try {
            const res = await fetch("http://localhost:5000/api/transfers/reject-batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(selectedFiles)
            });
            const data = await res.json();
            alert(data.message + (data.errors.length ? "\n" + data.errors.join("\n") : ""));
            setSelectedFiles([]);
            fetchFiles();
        } catch (err) { console.error(err); alert("حدث خطأ أثناء رفض الإحالات"); }
    };

    if (loading) return <p>جاري التحميل...</p>;

    // Apply filters
    const filteredFiles = files.filter(f => {
        const numberMatch = f.number.toLowerCase().includes(filterNumber.toLowerCase());
        const sourceMatch = filterSource ? f.source.toLowerCase() === filterSource.toLowerCase() : true;
        let dateMatch = true;
        if (filterStartDate) dateMatch = dateMatch && new Date(f.date).getTime() >= new Date(filterStartDate).getTime();
        if (filterEndDate) dateMatch = dateMatch && new Date(f.date).getTime() <= new Date(filterEndDate).getTime();
        return numberMatch && sourceMatch && dateMatch;
    });

    const selected = files.filter(f => selectedFiles.includes(f.id));
    const source = selected.length > 0 ? selected[0].source : null;

    return (
        <div className="file-explorer">
            <h2>جميع الملفات</h2>

            {/* Filters */}
            <div className="filters" style={{ marginBottom: "10px" }}>
                <label>رقم الملف</label>
                <input
                    type="text"
                    placeholder="رقم الملف"
                    value={filterNumber}
                    onChange={(e) => setFilterNumber(e.target.value)}
                    style={{ marginRight: "10px" }}
                />
                
                <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    style={{ marginRight: "10px" }}
                >
                    <option value="">الحالة</option>
                    <option value="Owned">ملفاتي</option>
                    <option value="Sent">الملفات المرسلة</option>
                    <option value="Received"> محالة على الحساب</option>
                </select>
                <label>من</label>
                <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    style={{ marginRight: "5px" }}
                />
                <label>إلى</label>
                <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                />
            </div>

            <button onClick={() => setShowBatchModal(true)} disabled={source !== "Owned"}>
                إحالة الملفات
            </button>
            <button onClick={handleCancelTransfers} disabled={source !== "Sent"}>
                إلغاء الإحالات
            </button>
            <button onClick={handleAcceptTransfers} disabled={source !== "Received"}>
                قبول
            </button>
            <button onClick={handleRejectTransfers} disabled={source !== "Received"}>
                رفض
            </button>
            <button disabled={source !== "Sent"} onClick={() => setShowBatchModal("edit")}>
                تعديل
            </button>

            <table>
                <thead>
                    <tr>
                        <th>
                            <input
                                type="checkbox"
                                checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                                onChange={() => {
                                    if (selectedFiles.length === filteredFiles.length) {
                                        setSelectedFiles([]);
                                    } else {
                                        setSelectedFiles(filteredFiles.map(f => f.id));
                                    }
                                }}
                            /> تحديد الكل
                        </th>
                        <th>رقم الملف</th>
                        <th>الموضوع</th>
                        <th>الحالة</th>
                        <th>النوع</th>
                        <th>التاريخ</th>
                        <th>من / إلى</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredFiles.map(f => (
                        <tr key={`${f.source}-${f.id}`}>
                            <td>
                                <input
                                    type="checkbox"
                                    checked={selectedFiles.includes(f.id)}
                                    onChange={() => toggleFileSelection(f.id)}
                                />
                            </td>
                            <td>{f.number}</td>
                            <td>{f.sujet}</td>
                            <td>
                            {f.source === "Sent"
                                ? "مرسلة"
                                : f.source === "Received"
                                ? "محالة على الحساب"
                                : f.source === "Owned"
                                ? "ملفاتي"
                                : f.source}
                            </td>

                            <td>{f.type}</td>
                            <td>{f.date ? new Date(f.date).toLocaleDateString("ar-MA") : "-"}</td>
                            <td>{f.fromOrTo ?? "-"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {showBatchModal && (
                <BatchTransferModal
                    selectedFiles={selectedFiles}
                    onClose={() => setShowBatchModal(false)}
                    onTransfer={() => setSelectedFiles([])}
                    user={user}
                    isEdit={showBatchModal === "edit"}
                />
            )}
        </div>
    );
}
