import React from "react";
import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastProvider } from "./context/ToastContext";
import { ToastContainer } from "./components/Toast";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Purchases from "./pages/Purchases";
import Sales from "./pages/Sales";
import Staff from "./pages/Staff";
import Attendance from "./pages/Attendance";
import Salary from "./pages/Salary";
import Ledger from "./pages/Ledger";
import Settings from "./pages/Settings";
import Customers from "./pages/Customers";
import { useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Layout from "./components/Layout";
import { Pricing } from "./pages/Pricing";
import { ResetPassword } from "./pages/ResetPassword";
import PublicInvoice from "./pages/PublicInvoice";

const App: React.FC = () => {
  const { user } = useAuth();

  return (
    <ToastProvider>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/public-invoice/:id" element={<PublicInvoice />} />

        <Route
          path="/dashboard"
          element={user ? <Layout /> : <Navigate to="/login" />}
        >
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="sales" element={<Sales />} />
          <Route path="staff" element={<Staff />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="salary" element={<Salary />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="settings" element={<Settings />} />
          <Route path="customers" element={<Customers />} />
          <Route path="pricing" element={<Pricing />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
};

export default App;
