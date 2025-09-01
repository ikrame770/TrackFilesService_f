import React, { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx"; // For exporting Excel
import { saveAs } from "file-saver"; // For saving files locally

import "./styles/App.css";
import "./styles/FileReceive.css";
import "./styles/modelTransfersCompleted.css";

import TransfersPage from "./TransfersPage";

const TransfersCompleted = ({ user, onSelectFeature }) => {
  // 🔹 State to store all transfers fetched from server
  const [transfers, setTransfers] = useState([]);
  
  // 🔹 Loading indicator and messages for user feedback
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // 🔹 Pagination state
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 20; // number of rows per page
  const [totalPages, setTotalPages] = useState(1);

  // 🔹 Filters for table
  const [filterNumber, setFilterNumber] = useState("");
  const [filterSujet, setFilterSujet] = useState("");
  const [filterSentDate, setFilterSentDate] = useState("");
  const [filterAcceptedDate, setFilterAcceptedDate] = useState("");

  // 🔹 Modal for opening transfer
  const [transferModalData, setTransferModalData] = useState(null);

  // 🔹 Fetch completed transfers from backend
  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(
        `http://localhost:5000/api/transfersin/completed?pageNumber=1&pageSize=1000`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("فشل في جلب التحويلات المكتملة");

      const data = await res.json();

      // Sort by dateSent descending
      const sortedTransfers = data.transfers.sort(
        (a, b) => new Date(b.dateSent) - new Date(a.dateSent)
      );

      setTransfers(sortedTransfers);
      setTotalPages(Math.ceil(sortedTransfers.length / pageSize));
      setPageNumber(1); // Reset to first page
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  // 🔹 Initial fetch on mount
  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  // 🔹 Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return isNaN(d) ? "-" : d.toISOString().split("T")[0];
  };

  // 🔹 Apply filters to transfers
  const filteredTransfers = transfers
    .filter((t) => !filterNumber || t.entityNumber.includes(filterNumber))
    .filter((t) => !filterSujet || (t.sujet ?? "").includes(filterSujet))
    .filter((t) => !filterSentDate || formatDate(t.dateSent) === filterSentDate)
    .filter(
      (t) => !filterAcceptedDate || formatDate(t.dateAccepted) === filterAcceptedDate
    );

  // 🔹 Paginate filtered transfers
  const paginatedTransfers = filteredTransfers.slice(
    (pageNumber - 1) * pageSize,
    pageNumber * pageSize
  );

  // 🔹 Export filtered transfers to Excel
  const exportToExcel = () => {
    if (!filteredTransfers.length) return;

    const worksheet = XLSX.utils.json_to_sheet(
      filteredTransfers.map((t) => ({
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
    saveAs(
      new Blob([excelBuffer], { type: "application/octet-stream" }),
      `completed_transfers.xlsx`
    );
  };

  // 🔹 Pagination helper functions
  const goToFirstPage = () => setPageNumber(1);
  const goToLastPage = () => setPageNumber(totalPages);

  // 🔹 Open Transfer modal from completed transfer
  const handleOpenTransferModal = async (transfer) => {
    try {
      const fileNumber = transfer.entityNumber;

      // Verify if user owns this file
      const res = await fetch("http://localhost:5000/api/entity/my-entities", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل في التحقق من ملكية الملف");

      const ownedFiles = await res.json();
      const exists = ownedFiles.includes(fileNumber);

      if (!exists) {
        setMessage({ type: "error", text: "⚠️ الملف غير موجود أو ليس ملكك." });
        return;
      }

      // Open TransfersPage modal in CREATE mode
      setTransferModalData({
        entityNumber: fileNumber,
        type: transfer.type,
        mode: "create",
      });
    } catch (err) {
      setMessage({ type: "error", text: "⚠️ حدث خطأ أثناء التحقق من الملف." });
      console.error(err);
    }
  };

  return (
    <div className="app-container">
      <div className="content-card">
        {/* Header */}
        <div className="header-section">
          <h1 className="main-title">سجل التداول الخاص بالحساب</h1>
          <p className="subtitle">
            هنا يمكنك مراجعة جميع الأنشطة التي تمت على هذا الحساب.
          </p>
          <button className="export-btn" onClick={exportToExcel}>
            ⬇️ تصدير إلى Excel
          </button>
        </div>

        {/* Filters */}
        <div className="filters" style={{ marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="رقم الملف"
            value={filterNumber}
            onChange={(e) => setFilterNumber(e.target.value)}
          />
          <input
            type="text"
            placeholder="الموضوع"
            value={filterSujet}
            onChange={(e) => setFilterSujet(e.target.value)}
          />
          <input
            type="date"
            placeholder="تاريخ الإرسال"
            value={filterSentDate}
            onChange={(e) => setFilterSentDate(e.target.value)}
          />
          <input
            type="date"
            placeholder="تاريخ القبول"
            value={filterAcceptedDate}
            onChange={(e) => setFilterAcceptedDate(e.target.value)}
          />
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

        {/* No transfers */}
        {!loading && paginatedTransfers.length === 0 && (
          <div className="no-dossiers">
            <p>لا توجد تحويلات مكتملة حالياً.</p>
          </div>
        )}

        {/* Transfers table */}
        {!loading && paginatedTransfers.length > 0 && (
          <>
            <div className="table-container">
              <table className="dossiers-table rtl">
                <thead>
                  <tr>
                    <th>رقم الملف</th>
                    <th>الموضوع</th>
                    <th>من</th>
                    <th>إلى</th>
                    <th>تاريخ الإرسال</th>
                    <th>تاريخ القبول</th>
                    <th>الاختصارات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransfers.map((t) => (
                    <tr key={t.transferId}>
                      <td>{t.entityNumber ?? "-"}</td>
                      <td>{t.sujet ?? "-"}</td>
                      <td>{t.from ?? "-"}</td>
                      <td>{t.to ?? "-"}</td>
                      <td>{formatDate(t.dateSent)}</td>
                      <td>{formatDate(t.dateAccepted)}</td>
                      <td>
                        <button onClick={() => handleOpenTransferModal(t)}>📤</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination rtl">
              <button onClick={goToFirstPage} disabled={pageNumber === 1}>
                {"<< أول صفحة"}
              </button>
              <button
                onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                disabled={pageNumber === 1}
              >
                {"< السابق"}
              </button>
              <span className="page-info">
                {pageNumber} / {totalPages}
              </span>
              <button
                onClick={() => setPageNumber((prev) => Math.min(prev + 1, totalPages))}
                disabled={pageNumber === totalPages}
              >
                {"التالي >"}
              </button>
              <button onClick={goToLastPage} disabled={pageNumber === totalPages}>
                {"آخر صفحة >>"}
              </button>
            </div>
          </>
        )}

        {/* Transfer Modal */}
        {transferModalData && (
          <div className="modal-overlay">
            <TransfersPage
              user={user}
              onClose={() => {
                setTransferModalData(null);
                fetchTransfers(); // Refresh after successful transfer
              }}
              transferToEdit={transferModalData}
              mode={transferModalData.mode}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TransfersCompleted;
