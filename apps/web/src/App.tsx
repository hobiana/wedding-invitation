import { Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { InvitationPage } from "./pages/InvitationPage";
import { ProtectedRoute } from "./auth/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/i/:linkId" element={<InvitationPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<div className="p-8">Dashboard (à venir)</div>} />
      </Route>
    </Routes>
  );
}

export default App;
