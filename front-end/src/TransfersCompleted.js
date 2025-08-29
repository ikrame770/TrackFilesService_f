import React, { useState, useEffect, useCallback } from "react";
import "./styles/App.css";
import "./styles/FileReceive.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const TransfersCompleted = () => {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);

    const fetchTransfers = useCallback(() => {
        setLoading(true);
        setMessage(null);

        fetch(`http://localhost:5000/api/transfersin/completed?pageNumber=${pageNumber}&pageSize=${pageSize}`, {
            credentials: "include",
        })
            .then((res) => {
                if (!res.ok) throw new Error("فشل في جلب التحويلات المكتملة");
                return res.json();
            })
            .then((data) => {
                setTransfers(data.transfers);
                setTotalPages(data.totalPages);
                setMessage({ type: "success", text: "تم جلب التحويلات المكتملة بنجاح." });
            })
            .catch((err) => setMessage({ type: "error", text: err.message }))
            .finally(() => setLoading(false));
    }, [pageNumber, pageSize]);

    useEffect(() => {
        fetchTransfers();
    }, [fetchTransfers]);

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        if (isNaN(d)) return "-";
        return d.toISOString().split("T")[0]; // "YYYY-MM-DD"
    };

    const exportToExcel = () => {
        if (!transfers.length) return;

        const worksheet = XLSX.utils.json_to_sheet(
            transfers.map((t) => ({
                "رقم الملف": t.entityNumber ?? "N/A",
                "الموضوع": t.sujet ?? "N/A",
                "من": t.from ?? "N/A",
                "إلى": t.to ?? "N/A",
                "الحالة": t.status ?? "N/A",
                "تاريخ الإرسال": formatDate(t.dateSent),
                "تاريخ القبول": formatDate(t.dateAccepted),
            }))
        );

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "التحويلات المكتملة");

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(data, `completed_transfers_page${pageNumber}.xlsx`);
    };

    return (
        <div className="app-container">
            <div className="content-card">
                {/* Header */}
                <div className="header-section">
                    <h1 className="main-title">سجل التداول الخاص بالحساب</h1>
                    <p className="subtitle">هنا يمكنك مراجعة جميع الأنشطة التي تمت على هذا الحساب.</p>
                    <button className="export-btn" onClick={exportToExcel}>
                        ⬇️ تصدير إلى Excel
                    </button>
                </div>

                {/* Messages */}
                {message && (
                    <div className={`message-box ${message.type}-message rtl`}>
                        {message.text}
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="loading-indicator">
                        <div className="spinner"></div>
                        <p className="loading-text">جاري جلب التحويلات...</p>
                    </div>
                )}

                {/* No results */}
                {!loading && transfers.length === 0 && (
                    <div className="no-dossiers">
                        <p>لا توجد تحويلات مكتملة حالياً.</p>
                    </div>
                )}

                {/* Table */}
                {!loading && transfers.length > 0 && (
                    <>
                        <div className="table-container">
                            <table className="dossiers-table rtl">
                                <thead>
                                    <tr>
                                        <th style={{ width: "15%" }}>رقم الملف</th>
                                        <th style={{ width: "25%" }}>الموضوع</th>
                                        <th style={{ width: "20%" }}>من</th>
                                        <th style={{ width: "20%" }}>إلى</th>
                                        <th style={{ width: "15%" }}>تاريخ الإرسال</th>
                                        <th style={{ width: "15%" }}>تاريخ القبول</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transfers.map((t) => (
                                        <tr key={t.transferId}>
                                            <td>{t.entityNumber ?? "N/A"}</td>
                                            <td>{t.sujet ?? "N/A"}</td>
                                            <td>{t.from ?? "N/A"}</td>
                                            <td>{t.to ?? "N/A"}</td>
                                            <td>{formatDate(t.dateSent)}</td>
                                            <td>{formatDate(t.dateAccepted)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="pagination rtl">
                            <button
                                className="page-btn"
                                onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                                disabled={pageNumber === 1}
                            >
                                {"< السابق"}
                            </button>
                            <span className="page-info">{pageNumber} / {totalPages}</span>
                            <button
                                className="page-btn"
                                onClick={() => setPageNumber((prev) => Math.min(prev + 1, totalPages))}
                                disabled={pageNumber === totalPages}
                            >
                                {"التالي >"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default TransfersCompleted;
