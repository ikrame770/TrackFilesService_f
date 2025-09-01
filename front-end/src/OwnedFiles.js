import React, { useState, useEffect } from "react";
import TransfersPage from "./TransfersPage";
import "./styles/App.css";
import "./styles/TransferFile.css";

function OwnedFiles({ user }) {
    // State for all owned files and filtered files based on filters
    const [files, setFiles] = useState([]);
    const [filteredFiles, setFilteredFiles] = useState([]);
    
    // Loading state
    const [loading, setLoading] = useState(true);
    
    // Selected files for bulk actions like transfer
    const [selectedFiles, setSelectedFiles] = useState([]);
    
    // Filters for table
    const [filters, setFilters] = useState({
        fileNumber: "",
        type: "",
        magistrate: "",
        fromDate: "",
        toDate: "",
    });
    
    // State for showing transfer modal
    const [showTransferModal, setShowTransferModal] = useState(false);

    // 🔹 Fetch all files owned by the user on component mount or when user changes
    useEffect(() => {
        if (!user?.id) return;

        const fetchFiles = async () => {
            setLoading(true);
            try {
                const res = await fetch(`http://localhost:5000/api/entity/owned/${user.id}`, {
                    credentials: "include",
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "فشل في جلب الملفات");

                setFiles(data.files);          // full list of files
                setFilteredFiles(data.files);  // filtered list initially same as full list
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchFiles();
    }, [user]);

    // 🔹 Apply filters to the file list
    const applyFilters = () => {
        let result = [...files];
        if (filters.fileNumber)
            result = result.filter(f =>
                f.entityNumber.toLowerCase().includes(filters.fileNumber.toLowerCase())
            );
        if (filters.type)
            result = result.filter(f => f.type === filters.type);
        if (filters.magistrate)
            result = result.filter(f =>
                f.magistrate.toLowerCase().includes(filters.magistrate.toLowerCase())
            );
        if (filters.fromDate)
            result = result.filter(f => new Date(f.dateToOrder) >= new Date(filters.fromDate));
        if (filters.toDate)
            result = result.filter(f => new Date(f.dateToOrder) <= new Date(filters.toDate));

        setFilteredFiles(result);
    };

    // 🔹 Handle selecting/unselecting a single file
    const handleSelectFile = (fileId) => {
        setSelectedFiles(prev =>
            prev.includes(fileId)
                ? prev.filter(id => id !== fileId)  // unselect if already selected
                : [...prev, fileId]                // add if not selected
        );
    };

    // 🔹 Handle select/unselect all files in the filtered list
    const handleSelectAll = () => {
        if (selectedFiles.length === filteredFiles.length) setSelectedFiles([]);
        else setSelectedFiles(filteredFiles.map(f => f.entityId));
    };

    // 🔹 Open transfer modal for selected files
    const openTransferModal = () => {
        if (selectedFiles.length === 0) return alert("اختر ملفًا واحدًا على الأقل للإحالة");
        setShowTransferModal(true);
    };

    // Loading indicator
    if (loading) return <p className="loading-text">جاري جلب الملفات...</p>;

    return (
        <div className="owned-files-container">
            <h2>📁 الملفات المملوكة</h2>

            {/* Filters section */}
            <div className="filters">
                <input
                    type="text"
                    placeholder="رقم الملف"
                    value={filters.fileNumber}
                    onChange={e => setFilters({ ...filters, fileNumber: e.target.value })}
                />
                <input
                    type="text"
                    placeholder="المستشار المقرر"
                    value={filters.magistrate}
                    onChange={e => setFilters({ ...filters, magistrate: e.target.value })}
                />
                <select
                    value={filters.type}
                    onChange={e => setFilters({ ...filters, type: e.target.value })}
                >
                    <option value="">الكل</option>
                    <option value="ملف">ملف</option>
                    <option value="وثيقة">وثيقة</option>
                </select>
                <input
                    type="date"
                    value={filters.fromDate}
                    onChange={e => setFilters({ ...filters, fromDate: e.target.value })}
                />
                <input
                    type="date"
                    value={filters.toDate}
                    onChange={e => setFilters({ ...filters, toDate: e.target.value })}
                />
                <button onClick={applyFilters}>تطبيق الفلاتر</button>
            </div>

            {/* Table of files */}
            <table className="files-table rtl">
                <thead>
                    <tr>
                        <th>
                            <input
                                type="checkbox"
                                checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                                onChange={handleSelectAll}
                            />
                        </th>
                        <th>رقم الملف/الوثيقة</th>
                        <th>النوع</th>
                        <th>المستشار المقرر</th>
                        <th>الحالة</th>
                        <th>تاريخ الاستلام</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredFiles.map(file => (
                        <tr key={file.entityId}>
                            <td>
                                <input
                                    type="checkbox"
                                    checked={selectedFiles.includes(file.entityId)}
                                    onChange={() => handleSelectFile(file.entityId)}
                                />
                            </td>
                            <td>{file.entityNumber}</td>
                            <td>{file.type}</td>
                            <td>{file.magistrale}</td>
                            <td>{file.status}</td>
                            <td>{new Date(file.dateToOrder).toLocaleDateString("ar-MA")}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Transfer button */}
            {selectedFiles.length > 0 && (
                <button className="submit-btn" onClick={openTransferModal}>
                    إحالة الملفات المحددة ({selectedFiles.length})
                </button>
            )}

            {/* Transfer modal */}
            {showTransferModal && (
                <TransfersPage
                    user={user}
                    transferToEdit={null}
                    selectedFiles={selectedFiles}
                    onClose={() => setShowTransferModal(false)}
                />
            )}
        </div>
    );
}

export default OwnedFiles;
