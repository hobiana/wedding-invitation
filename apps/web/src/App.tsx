import { Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { InvitationPage } from "./pages/InvitationPage";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { ProtectedRoute } from "./auth/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/i/:linkId" element={<InvitationPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}

export default App;
