import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./SignIn";
import Home from "./Home";
import TransfersPage from "./TransfersPage";
import TransfersInbox from "./TransfersInBox";
import TransfersCompleted from "./TransfersCompleted";
import MySentTransfers from "./MySentTransfers";
import FileHistory from "./FileHistory";

function App() {
  const [user, setUser] = useState(null); // store user info after sign-in

  const onLogout = () => {
    setUser(null);           // Clear user state
    window.location.href = "/signin"; // Optional redirect
  };

  return (
    <Router>
      <Routes>
        <Route path="/signin" element={<SignIn setUser={setUser} />} />
        <Route
          path="/"
          element={user ? <Home user={user} onLogout={onLogout} /> : <Navigate to="/signin" />}
              />

              <Route path="/transfers" element={<TransfersPage user={user} />} />
              <Route path="/inbox" element={<TransfersInbox user={user} />} />
              <Route path="/registre" element={<TransfersCompleted user={user} />} />
              <Route path="/SentTransfers" element={<MySentTransfers user={user} />} />
              <Route path="/file-history" element={<FileHistory />} />
              
      </Routes>
    </Router>
  );
}

export default App;

