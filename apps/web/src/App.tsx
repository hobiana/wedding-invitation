import { Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { InvitationPage } from "./pages/InvitationPage";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { HouseholdsPage } from "./pages/admin/HouseholdsPage";
import { TablesPage } from "./pages/admin/TablesPage";
import { SettingsPage } from "./pages/admin/SettingsPage";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AdminLayout } from "./components/AdminLayout";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/i/:linkId" element={<InvitationPage />} />
      <Route element={<ProtectedRoute />}>
        {/* AdminLayout nests inside the guard so its nav and logout button
            never render for a signed-out visitor. */}
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/households" element={<HouseholdsPage />} />
          <Route path="/admin/tables" element={<TablesPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
