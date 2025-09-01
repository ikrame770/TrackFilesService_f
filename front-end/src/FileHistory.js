import React, { useState, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./styles/App.css";
import "./styles/FileReceive.css";

// Mapping of backend status codes to readable Arabic
const statusMap = {
  Sent: "تم الإرسال",
  Accepted: "مقبول",
  Refused: "مرفوض",
};

const FileHistory = ({ user }) => {
  const { fileNumber: fileNumberParam } = useParams(); // read fileNumber from URL
  const [fileNumber, setFileNumber] = useState(fileNumberParam || "");
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Fetch transfers for a given file number
  const fetchTransfers = useCallback(async () => {
    if (!fileNumber.trim()) {
      setMessage({ type: "info", text: "الرجاء إدخال رقم الملف." });
      setTransfers([]);
      return;
    }

    setLoading(true);
    setMessage(null);
    setTransfers([]);

    try {
      const res = await fetch(
        `http://localhost:5000/api/transfers/completedfiles?fileNumber=${encodeURIComponent(fileNumber)}`,
        { credentials: "include" }
      );

      if (!res.ok) {
        let errMsg = "فشل في جلب التحويلات.";
        try {
          const errData = await res.json();
          errMsg = errData.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (!data || data.length === 0) {
        setMessage({ type: "info", text: "لا توجد تحويلات لهذا الملف." });
      }
      setTransfers(data);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }, [fileNumber]);

  // Trigger search on form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    fetchTransfers();
  };

  // Auto-fetch if fileNumber comes from URL
  useEffect(() => {
    if (fileNumberParam) {
      fetchTransfers();
    }
  }, [fileNumberParam, fetchTransfers]);

  // Format date string to YYYY-MM-DD or "-" if invalid
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return "-";
    return d.toISOString().split("T")[0];
  };

  return (
    <div className="content-card" style={{ marginRight: "20px" }}>
      <div className="header-section">
        <h1 className="main-title">البحث عن ملفات وتتبع العمليات</h1>
        <p className="text-gray-600">
          ابحث عن الملفات لتتبع مسارها بين مختلف الشعب والمستخدمين.
        </p>
      </div>

      {message && <div className={`message-box ${message.type}-message rtl`}>{message.text}</div>}

      {/* Search Form */}
      <form onSubmit={handleSubmit}>
        <div className="form-group-flex">
          <label htmlFor="fileNumber" className="form-label">
            بحث برقم الملف:
          </label>
          <input
            id="fileNumber"
            type="text"
            placeholder="مثال: 2025/234 أو 2023/7211/234"
            value={fileNumber}
            onChange={(e) => setFileNumber(e.target.value)}
            className="form-input"
            disabled={loading}
          />
        </div>
        <div className="form-group-button-flex">
          <button
            type="submit"
            disabled={loading || fileNumber.trim() === ""}
            className="action-button primary-button search-button-small"
          >
            {loading ? "جاري البحث..." : "بحث"}
          </button>
        </div>
      </form>

      {/* Loading Indicator */}
      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p className="loading-text">جاري جلب الملفات...</p>
        </div>
      )}

      {/* Transfers Table */}
      {!loading && transfers.length > 0 && (
        <div className="table-container">
          <table className="dossiers-table rtl">
            <thead>
              <tr>
                <th style={{ width: "20%" }}>رقم الملف</th>
                <th style={{ width: "20%" }}>من</th>
                <th style={{ width: "20%" }}>إلى</th>
                <th style={{ width: "10%" }}>الحالة</th>
                <th style={{ width: "15%" }}>تاريخ الإرسال</th>
                <th style={{ width: "15%" }}>تاريخ القبول</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.transferId}>
                  <td>{t.entityNumber}</td>
                  <td>{t.from}</td>
                  <td>{t.to}</td>
                  <td>{statusMap[t.status] ?? t.status}</td>
                  <td>{formatDate(t.dateSent)}</td>
                  <td>{formatDate(t.dateAccepted)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No results placeholder */}
      {!loading && transfers.length === 0 && !message && (
        <div className="no-dossiers">
          <p>يرجى إدخال رقم الملف والنقر على "بحث" لعرض النتائج.</p>
        </div>
      )}
    </div>
  );
};

export default FileHistory;
