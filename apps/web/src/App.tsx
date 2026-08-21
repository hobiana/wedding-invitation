import { Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { ProtectedRoute } from "./auth/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<div className="p-8">Dashboard (à venir)</div>} />
      </Route>
    </Routes>
  );
}

export default App;
