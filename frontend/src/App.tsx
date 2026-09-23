import { Suspense, lazy } from "react";
import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastProvider } from "./context/ToastContext";
import { ToastContainer } from "./components/Toast";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Lazy Loaded Components
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Sales = lazy(() => import("./pages/Sales"));
const Staff = lazy(() => import("./pages/Staff"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Salary = lazy(() => import("./pages/Salary"));
const Ledger = lazy(() => import("./pages/Ledger"));
const Settings = lazy(() => import("./pages/Settings"));
const Reports = lazy(() => import("./pages/Reports.tsx"));
const ItemSalesReport = lazy(() => import("./pages/ItemSalesReport"));
const GSTReports = lazy(() => import("./pages/GSTReports.tsx"));
const Customers = lazy(() => import("./pages/Customers"));
const ReferAndEarn = lazy(() => import("./pages/ReferAndEarn"));
const Landing = lazy(() => import("./pages/Landing"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Success = lazy(() => import("./pages/Success"));
const ResetPassword = lazy(() => import("./pages/ResetPassword").then(m => ({ default: m.ResetPassword })));
const PublicInvoice = lazy(() => import("./pages/PublicInvoice"));
const Contact = lazy(() => import("./pages/Contact"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Catalog = lazy(() => import("./pages/Catalog"));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
  </div>
);

const App: React.FC = () => {
  const { user } = useAuth();

  const hostname = window.location.hostname;
  const isCustomDomain = 
    !hostname.includes('localhost') && 
    !hostname.includes('127.0.0.1') && 
    !hostname.includes('buildmate-erp.vercel.app') &&
    !hostname.includes('businessmate.onrender.com') &&
    !hostname.includes('onrender.com') &&
    !hostname.includes('businessmate-plum.vercel.app') &&
    !hostname.includes('billscale.in'); // Also exclude the main production domain

  if (isCustomDomain) {
    return (
      <ToastProvider>
        <ToastContainer />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/*" element={<Catalog customDomainMode={true} />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <ToastContainer />
      <Suspense fallback={<PageLoader />}>
        <ErrorBoundary>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/public-invoice/:id" element={<PublicInvoice />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/catalog/:slug" element={<Catalog />} />

          {/* Protected Dashboard Routes */}
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
            <Route path="reports" element={<Reports />} />
            <Route path="item-sales" element={<ItemSalesReport />} />
            <Route path="gst-reports" element={<GSTReports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="customers" element={<Customers />} />
            <Route path="referral" element={<ReferAndEarn />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="success" element={<Success />} />
            <Route path="contact" element={<Contact />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
          </Route>

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
      </Suspense>
    </ToastProvider>
  );
};

export default App;
