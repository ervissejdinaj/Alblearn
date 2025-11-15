import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import ModuleManagement from "./pages/admin/ModuleManagement";
import FileManager from "./pages/admin/FileManager";
import InstructorDashboard from "./pages/instructor/InstructorDashboard";
import ModuleEditor from "./pages/instructor/ModuleEditor";
import UserDashboard from "./pages/user/UserDashboard";
import ModuleViewer from "./pages/user/ModuleViewer";
import SectionViewer from "./pages/user/SectionViewer";
import QuizPage from "./pages/user/QuizPage";
import LoadingSpinner from "./components/LoadingSpinner";

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { state } = useAuth();

  if (state.isLoading) {
    return <LoadingSpinner />;
  }

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(state.user?.role || "")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const ProtectedLayout: React.FC = () => (
  <ProtectedRoute>
    <Layout />
  </ProtectedRoute>
);

// Smart dashboard router që dërgon sipas rolit
const DashboardRouter: React.FC = () => {
  const { state } = useAuth();

  if (state.isLoading) {
    return <LoadingSpinner />;
  }

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Instruktori shkon te /instructor
  if (state.user?.role === "instructor") {
    return <Navigate to="/instructor" replace />;
  }

  // Admin shkon te /admin
  if (state.user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  // Studenti shfaq UserDashboard
  return <UserDashboard />;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<DashboardRouter />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/modules"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <ModuleManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/files"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <FileManager />
            </ProtectedRoute>
          }
        />

        <Route
          path="/instructor"
          element={
            <ProtectedRoute allowedRoles={["instructor"]}>
              <InstructorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/modules/:slug"
          element={
            <ProtectedRoute allowedRoles={["instructor"]}>
              <ModuleEditor />
            </ProtectedRoute>
          }
        />

        <Route
          path="/modules/:slug"
          element={
            <ProtectedRoute>
              <ModuleViewer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/modules/:slug/sections/:sectionId"
          element={
            <ProtectedRoute>
              <SectionViewer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/modules/:slug/sections/:sectionId/quiz"
          element={
            <ProtectedRoute>
              <QuizPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <div className="min-h-screen">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
