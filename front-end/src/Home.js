import React, { useState } from "react";
import "./styles/App.css";
import "./styles/Home.css";
import logo from "./assets/logo.png";
import TransfersPage from "./TransfersPage";
import TransfersInbox from "./TransfersInBox";
import CompletedTransfers from "./TransfersCompleted";
import FileHistory from "./FileHistory";
import MySentTransfers from "./MySentTransfers";
import CreateUser from "./CreateUser";
import EditUser from "./UpdateUser";
import DeleteUser from "./DeleteUser";
import FileExplorerPage from "./FileExplorerPage";

function Home({ user, onLogout }) {
    const [selectedFeature, setSelectedFeature] = useState(null);
    const [editingTransfer, setEditingTransfer] = useState(null);

    // Menu options depending on role
    const features =
        user.role === "admin"
            ? [
                  { id: "create-user", label: "إنشاء حساب" },
                  { id: "edit-user", label: "تغيير شعبة حساب أو معلومات خاصة بالحساب" },
                  { id: "delete-user", label: "حذف حساب" },
                  { id: "recherche", label: "بحث عن ملف و رؤية كافة العمليات" },
              ]
            : [
                  {
                      id: "transfers",
                      label: "سجل التداول",
                      children: [
                          { id: "registre", label: "رؤية سجل التداول الخاص بالحساب" },
                          { id: "inbox", label: "رؤية الملفات المحالة على الحساب" },
                          { id: "transfert", label: "إحالة ملف" },
                          { id: "mysent", label: "الإحالات المرسلة" },
                          { id: "FileExplorerPage", label: "تدبير ملفات متعددة" },
                      ],
                  },
                  { id: "recherche", label: "بحث عن ملف و رؤية كافة العمليات" },
              ];

    const handleFeatureClick = (f) => {
        setSelectedFeature(f.id);
        setEditingTransfer(null);
    };

    const handleEditTransfer = (transfer) => {
        console.log("Editing transfer:", transfer);
        setEditingTransfer(transfer);
        setSelectedFeature("edit-transfer");
    };

    return (
        <div style={{ display: "flex", height: "100vh", position: "relative" }}>
            {/* User info */}
            <div className="user-info">👤 {user.username}</div>

            {/* Sidebar */}
            <aside className="sidebar" style={{ right: 0 }}>
                <div>
                    <h2> مرحبا {user.username} </h2>
                    <ul>
                        {features.map((f) => (
                            <li key={f.id} className="menu-item">
                                {f.children ? (
                                    <div className="submenu">
                                        <button>{f.label}</button>
                                        <ul className="submenu-list">
                                            {f.children.map((child) => (
                                                <li key={child.id}>
                                                    <button
                                                        onClick={() => handleFeatureClick(child)}
                                                    >
                                                        {child.label}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : (
                                    <button onClick={() => handleFeatureClick(f)}>
                                        {f.label}
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
                <button
                    className="logout-btn"
                    onClick={() => {
                        onLogout();
                        setSelectedFeature(null);
                    }}
                >
                    🚪 تسجيل الخروج
                </button>
            </aside>

            {/* Main area */}
            <main>
    {selectedFeature === null && (
        <div className="default-view">
            {user.role === "admin" ? (
                <img src={logo} alt="شعار محكمة الاستئناف" />
            ) : (
                <TransfersInbox user={user} /> 
            )}
        </div>
    )}

    {/* Admin features */}
    {selectedFeature === "create-user" && <CreateUser />}
    {selectedFeature === "edit-user" && <EditUser />}
    {selectedFeature === "delete-user" && <DeleteUser />}

    {/* Normal user features */}
    {selectedFeature === "registre" && <CompletedTransfers user={user} />}
    {selectedFeature === "inbox" && <TransfersInbox user={user} />}
    {selectedFeature === "recherche" && <FileHistory user={user} />}
    {selectedFeature === "mysent" && (
        <MySentTransfers user={user} onEditTransfer={handleEditTransfer} />
    )}
    {selectedFeature === "transfert" && <TransfersPage user={user} />}
    {selectedFeature === "FileExplorerPage" && <FileExplorerPage user={user} />}

    {/* Edit mode */}
    {selectedFeature === "edit-transfer" && editingTransfer && (
        <TransfersPage user={user} transferToEdit={editingTransfer} />
    )}
</main>

        </div>
    );
}

export default Home;
