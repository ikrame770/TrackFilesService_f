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
import ManageUsers from "./ManageUsers";
import FileExplorerPage from "./FileExplorerPage";

function Home({ user, onLogout }) {
  const [selectedFeature, setSelectedFeature] = useState(null); // active sidebar feature
  const [selectedFileNumber, setSelectedFileNumber] = useState(null); // optional file number for prefill
  const [editingTransfer, setEditingTransfer] = useState(null); // transfer selected for editing

  // Sidebar menu options based on user role
  const features =
    user.role === "admin"
      ? [
          { id: "create-user", label: "إنشاء حساب" },
          { id: "manage-user", label: "حذف / تغيير معلومات خاصة بالحساب" },
          { id: "file-history", label: "بحث عن ملف و رؤية كافة العمليات" },
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
          { id: "file-history", label: "بحث عن ملف و رؤية كافة العمليات" },
        ];

  // Handle sidebar feature selection
  const handleFeatureClick = (feature, fileNumber = null) => {
    setSelectedFeature(feature.id);
    setSelectedFileNumber(fileNumber);
    setEditingTransfer(null);
  };

  // Callback to edit a transfer
  const handleEditTransfer = (transfer) => {
    setEditingTransfer(transfer);
    setSelectedFeature("edit-transfer");
  };

  return (
    <div style={{ display: "flex", height: "100vh", position: "relative" }}>
      {/* Sidebar navigation */}
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
                          <button onClick={() => handleFeatureClick(child)}>
                            {child.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <button onClick={() => handleFeatureClick(f)}>{f.label}</button>
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

      {/* Main content area */}
      <main>
        {/* Default view */}
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
        {selectedFeature === "manage-user" && <ManageUsers />}

        {/* Normal user features */}
        {selectedFeature === "registre" && (
          <CompletedTransfers
            user={user}
            onSelectFeature={(featureId, fileNumber) => {
              setSelectedFeature(featureId);
              setSelectedFileNumber(fileNumber);
            }}
          />
        )}
        {selectedFeature === "inbox" && <TransfersInbox user={user} />}
        {selectedFeature === "file-history" && <FileHistory user={user} />}
        {selectedFeature === "mysent" && (
          <MySentTransfers user={user} onEditTransfer={handleEditTransfer} />
        )}
        {selectedFeature === "transfert" && <TransfersPage user={user} />}
        {selectedFeature === "FileExplorerPage" && <FileExplorerPage user={user} />}

        {/* Edit transfer mode */}
        {selectedFeature === "edit-transfer" && editingTransfer && (
          <TransfersPage user={user} transferToEdit={editingTransfer} />
        )}
      </main>
    </div>
  );
}

export default Home;
