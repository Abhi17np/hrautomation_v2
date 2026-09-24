// FIX #5: removed unused 'useState', 'useEffect', and 'axios' imports
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage   from './pages/LandingPage';
import LoginPage     from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import TemplatesPage from './pages/TemplatesPage';
import LettersPage   from './pages/LettersPage';
import ApprovalsPage from './pages/ApprovalsPage';
import ExitPage      from './pages/ExitPage';
import Layout        from './components/Layout';
import AppointmentPage from './pages/AppointmentPage';
import DocumentsPage   from './pages/DocumentsPage';
import LeaveTrackerPage    from './pages/LeaveTrackerPage';
import LeaveManagementPage from './pages/LeaveManagementPage';
import AttendancePage      from './pages/AttendancePage';
import PayslipPage         from './pages/PayslipPage';
import PayslipManagementPage from './pages/PayslipManagementPage';
import PlatformAdminPage     from './pages/PlatformAdminPage';
import AssetsPage    from './pages/AssetsPage';
import OrgChartPage  from './pages/OrgChartPage';
import ReportsPage   from './pages/ReportsPage';
import HRMSupportPage from './pages/HRMSupportPage';
import RolesPage      from './pages/RolesPage';
import WorkflowsPage  from './pages/WorkflowsPage';
import AcceptInvitePage  from './pages/AcceptInvitePage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AuditLogPage      from './pages/AuditLogPage';
import PayrollRunsPage    from './pages/PayrollRunsPage';
import PayrollSettingsPage from './pages/PayrollSettingsPage';
import ExpensesPage      from './pages/ExpensesPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import PoliciesPage      from './pages/PoliciesPage';
import AnalyticsPage     from './pages/AnalyticsPage';
import IntegrationsPage  from './pages/IntegrationsPage';


import './App.css';

// Hash-based router
function useHashRoute() {
  // FIX #5 (App.jsx L16): strip all leading # chars robustly
  const getPath = () => window.location.hash.replace(/^#+/, '') || '/';
  const [path, setPath] = useState(getPath);
  useEffect(() => {
    const handler = () => setPath(getPath());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return path;
}

const PAGES = {
  '/':             DashboardPage,
  '/employees':    EmployeesPage,
  '/templates':    TemplatesPage,
  '/letters':      LettersPage,
  '/approvals':    ApprovalsPage,
  '/exit':         ExitPage,
  '/appointment':  AppointmentPage,
  '/documents':    DocumentsPage,
  '/leave-tracker':   LeaveTrackerPage,      // <-- add: employee & manager
  '/leave-management': LeaveManagementPage,
  '/attendance': AttendancePage,
  '/attendance/web-login': () => <AttendancePage initialView="weblogin" />,
  '/attendance/holidays':  () => <AttendancePage initialView="holidays" />,
  '/attendance/incidents':      () => <AttendancePage initialView="incidents" />,
  '/attendance/configuration':  () => <AttendancePage initialView="configuration" />,
  '/attendance/shift-summary':  () => <AttendancePage initialView="shiftsummary" />,
  '/payslip': PayslipPage,
  '/payslip-management': PayslipManagementPage,
  '/organization/assets':    AssetsPage,
  '/organization/org-chart': OrgChartPage,
  '/organization/reports':   ReportsPage,
  '/organization/analytics': AnalyticsPage,
  '/organization/integrations': IntegrationsPage,
  '/organization/roles':     RolesPage,
  '/organization/workflows': WorkflowsPage,
  '/organization/audit-log': AuditLogPage,
  '/payroll/run': PayrollRunsPage,
  '/payroll/settings': PayrollSettingsPage,
  '/expenses': ExpensesPage,
  '/announcements': AnnouncementsPage,
  '/policies': PoliciesPage,
  '/support': HRMSupportPage,
};

// FIX #5 (App.jsx L41): proper 404 page for unknown routes
function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>◎</div>
      <h2 style={{ fontFamily: 'var(--display)', marginBottom: 8 }}>404 — Page not found</h2>
      <button className="btn btn-primary" onClick={() => { window.location.hash = '/'; }}>
        Go to Dashboard
      </button>
    </div>
  );
}

function AppRouter() {
  const path              = useHashRoute();
  const { user, loading } = useAuth();

  // Platform admin surface is outside tenant auth entirely — it has its own
  // separate login/session (see PlatformAdminPage.jsx) and is intentionally
  // not listed in any tenant nav.
  if (path === '/platform') return <PlatformAdminPage />;

  // Credentialing links (invite/reset emails) carry a ?token=... query
  // string and must work whether or not the visitor is currently logged
  // in, so these are checked before the auth gate below.
  if (path.startsWith('/accept-invite')) return <AcceptInvitePage />;
  if (path.startsWith('/reset-password')) return <ResetPasswordPage />;

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  if (!user) {
    if (path === '/login') return <LoginPage />;
    return <LandingPage />;
  }

  const PageComponent = PAGES[path] ?? NotFound;

  return (
    <Layout currentPath={path}>
      <PageComponent />
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}