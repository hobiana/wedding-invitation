import { Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { InvitationPage } from "./pages/InvitationPage";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { HouseholdsPage } from "./pages/admin/HouseholdsPage";
import { TablesPage } from "./pages/admin/TablesPage";
import { ProtectedRoute } from "./auth/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/i/:linkId" element={<InvitationPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<DashboardPage />} />
        <Route path="/admin/households" element={<HouseholdsPage />} />
        <Route path="/admin/tables" element={<TablesPage />} />
      </Route>
    </Routes>
  );
}

export default App;
