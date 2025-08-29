import React, { useState, useEffect, useCallback } from "react";
import "./styles/App.css";
import "./styles/FileReceive.css";

const TransfersInbox = () => {
    const [dossiers, setDossiers] = useState([]);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchMokarrirJudge, setSearchMokarrirJudge] = useState("");
    const [confirmModal, setConfirmModal] = useState(null); // { transferId, actionType, dossierNumero }

    // Fetch dossiers from backend
    const fetchDossiers = useCallback(async () => {
        setMessage(null);
        setLoading(true);

        try {
            const res = await fetch("http://localhost:5000/api/transfersin/received", {
                credentials: "include",
            });
            if (!res.ok) throw new Error("فشل في جلب الملفات");

            const data = await res.json();

            // Transform API data to match dossier structure
            let mapped = data.map((t) => ({
                Id: t.transferId,
                Numero: t.entity?.entityNumber ?? "N/A",
                Statut:
                    t.status === "Sent"
                        ? "معلق"
                        : t.status === "Accepted"
                            ? "مقبول"
                            : "مرفوض",
                MahkomOuLa: t.entity?.isJudged ?? false,
                Mawdo3Da3wa: t.entity?.sujet ?? "N/A",
                Mosta2naf: t.entity?.mosta2naf ?? "N/A",
                Mosta2naf3alayh: t.entity?.mosta2naf3alayh ?? "N/A",
                MokarrirJudge: t.entity?.magistrale ?? "N/A",
            }));

            // Filter only pending by default
            mapped = mapped.filter((d) => d.Statut === "معلق");

            // Apply search filters
            if (searchTerm) {
                mapped = mapped.filter((d) => d.Numero.includes(searchTerm));
            }
            if (searchMokarrirJudge) {
                mapped = mapped.filter((d) =>
                    d.MokarrirJudge.includes(searchMokarrirJudge)
                );
            }

            setDossiers(mapped);
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setLoading(false);
        }
    }, [searchTerm, searchMokarrirJudge]);

    useEffect(() => {
        fetchDossiers();
    }, [fetchDossiers]);

    // Open/close confirmation modal
    const openConfirmModal = (dossierId, actionType, dossierNumero) => {
        setConfirmModal({ dossierId, actionType, dossierNumero });
    };
    const closeConfirmModal = () => setConfirmModal(null);

    // Handle accept/reject
    const handleDossierAction = async () => {
        if (!confirmModal) return;

        const { dossierId, actionType, dossierNumero } = confirmModal;
        closeConfirmModal();
        setMessage(null);
        setLoading(true);

        try {
            const url = `http://localhost:5000/api/transfersin/${dossierId}/${actionType}`;
            const res = await fetch(url, { method: "POST", credentials: "include" });
            if (!res.ok)
                throw new Error(
                    `فشل في ${actionType === "accept" ? "قبول" : "رفض"} الملف`
                );

            // Remove dossier from UI after action
            setDossiers((prev) => prev.filter((d) => d.Id !== dossierId));

            setMessage({
                type: "success",
                text: `تم ${actionType === "accept" ? "قبول" : "رفض"
                    } الملف رقم ${dossierNumero}.`,
            });
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setLoading(false);
        }
    };

    // Handle search
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchDossiers();
    };
    const handleSearchChange = (e) => {
        const { name, value } = e.target;
        if (name === "searchTerm") setSearchTerm(value);
        if (name === "searchMokarrirJudge") setSearchMokarrirJudge(value);
    };

    return (
        <div className="app-container">
            <div className="content-card">
                <div className="header-section">
                    <h1 className="main-title">
                        رؤية الملفات المحالة (بانتظار الإجراء)
                    </h1>
                </div>

                {message && (
                    <div className={`message-box ${message.type}-message rtl`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSearchSubmit} className="search-form rtl">
                    <div className="form-group">
                        <label htmlFor="searchTerm" className="form-label">
                            بحث برقم الملف:
                        </label>
                        <input
                            type="text"
                            id="searchTerm"
                            name="searchTerm"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            placeholder="أدخل رقم الملف"
                            className="form-input"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="searchMokarrirJudge" className="form-label">
                            بحث باسم المستشار المقرر:
                        </label>
                        <input
                            type="text"
                            id="searchMokarrirJudge"
                            name="searchMokarrirJudge"
                            value={searchMokarrirJudge}
                            onChange={handleSearchChange}
                            placeholder="أدخل اسم المستشار"
                            className="form-input"
                        />
                    </div>
                    <div className="form-group form-group-button">
                        <button
                            type="submit"
                            disabled={loading}
                            className="action-button primary-button"
                        >
                            بحث
                        </button>
                    </div>
                </form>

                {loading && (
                    <div className="loading-indicator">
                        <div className="spinner"></div>
                        <p className="loading-text">جاري جلب الملفات...</p>
                    </div>
                )}

                {!loading && dossiers.length === 0 && (
                    <div className="no-dossiers">
                        <p>لا توجد ملفات محالة بانتظار الإجراء.</p>
                    </div>
                )}

                {!loading && dossiers.length > 0 && (
                    <div className="table-container">
                        <table className="dossiers-table rtl">
                            <thead>
                                <tr>
                                    <th>رقم الملف</th>
                                    <th>الحالة</th>
                                    <th>الموضوع</th>
                                    <th>المستشار المقرر</th>
                                    <th>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dossiers.map((d) => (
                                    <tr key={d.Id}>
                                        <td>{d.Numero}</td>
                                        <td>{d.MahkomOuLa ? "محكوم" : "غير محكوم"}</td>
                                        <td>{d.Mawdo3Da3wa}</td>
                                        <td>{d.MokarrirJudge}</td>
                                        <td>
                                            {d.Statut === "معلق" ? (
                                                <div className="action-buttons-group">
                                                    <button
                                                        onClick={() =>
                                                            openConfirmModal(d.Id, "accept", d.Numero)
                                                        }
                                                        className="action-button accept-button"
                                                    >
                                                        قبول
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            openConfirmModal(d.Id, "reject", d.Numero)
                                                        }
                                                        className="action-button reject-button"
                                                    >
                                                        رفض
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="action-completed">
                                                    تم التعامل
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {confirmModal && (
                    <div className="modal-overlay">
                        <div className="modal-content rtl">
                            <h3 className="modal-title">تأكيد الإجراء</h3>
                            <p className="modal-message">
                                هل أنت متأكد أنك تريد{" "}
                                <span className="modal-action-type">
                                    {confirmModal.actionType === "accept" ? "قبول" : "رفض"}
                                </span>{" "}
                                الملف رقم{" "}
                                <span className="modal-dossier-numero">
                                    {confirmModal.dossierNumero}
                                </span>
                                ؟
                            </p>
                            <div className="modal-buttons-group">
                                <button
                                    onClick={handleDossierAction}
                                    className={`modal-button ${confirmModal.actionType === "accept"
                                            ? "confirm-accept-button"
                                            : "confirm-reject-button"
                                        }`}
                                >
                                    تأكيد
                                </button>
                                <button
                                    onClick={closeConfirmModal}
                                    className="modal-button cancel-button"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TransfersInbox;
