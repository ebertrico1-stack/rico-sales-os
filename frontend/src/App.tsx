import { Route, Routes } from "react-router-dom";
import { BottomNav } from "./components/BottomNav";
import { TodayPage } from "./pages/TodayPage";
import { ContactsPage } from "./pages/ContactsPage";
import { ContactDetailPage } from "./pages/ContactDetailPage";
import { CallModePage } from "./pages/CallModePage";
import { DashboardPage } from "./pages/DashboardPage";
import { ImportExportPage } from "./pages/ImportExportPage";

export default function App() {
  return (
    <div className="min-h-screen bg-base">
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/kontakte" element={<ContactsPage />} />
        <Route path="/kontakte/:id" element={<ContactDetailPage />} />
        <Route path="/call-mode" element={<CallModePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/import-export" element={<ImportExportPage />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
