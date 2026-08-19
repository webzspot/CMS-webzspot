import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import Login from "./auth/Login";
import Register from "./auth/Register";
import VerifyEmail from "./auth/VerifyEmail";
import PortalLayout from "./components/PortalLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import ComingSoon from "./components/ComingSoon";
import SuperAdminDashboard from "./superadmin/Dashboard";
import Plan from "./superadmin/Plan";
import AdminDashboard from "./admin/Dashboard";
import Billing from "./admin/Billing";
import Projects from "./admin/Projects";
import ProjectDetail from "./admin/ProjectDetail";
import CollectionsTab from "./admin/CollectionsTab";
import ApiKeysTab from "./admin/ApiKeysTab";
import FormsTab from "./admin/FormsTab";
import FormBuilder from "./admin/FormBuilder";
import FormSubmissions from "./admin/FormSubmissions";
import Team from "./admin/Team";
import CollectionDetail from "./admin/CollectionDetail";
import TabPlaceholder from "./components/TabPlaceholder";
import UserDashboard from "./user/Dashboard";
import UserProjectLayout from "./user/ProjectLayout";
import UserCollectionsTab from "./user/CollectionsTab";
import UserFormsTab from "./user/FormsTab";
import CollectionRecords from "./user/CollectionRecords";
import UserFormSubmissions from "./user/FormSubmissions";

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/auth/verify-email" element={<VerifyEmail />} />
          <Route path="/login" element={<Navigate to="/auth/login" replace />} />

          {/* Super Admin */}
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute role="SUPER_ADMIN">
                <PortalLayout portal="SUPER_ADMIN" />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="plans" element={<Plan />} />
            <Route path="tenants" element={<ComingSoon title="Tenants" />} />
            <Route path="users" element={<ComingSoon title="Users" />} />
            <Route path="settings" element={<ComingSoon title="Settings" />} />
          </Route>

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="ADMIN">
                <PortalLayout portal="ADMIN" />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />

            {/* Collections, media and API keys live inside a project */}
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:projectId" element={<ProjectDetail />}>
              <Route index element={<Navigate to="collections" replace />} />
              <Route path="collections" element={<CollectionsTab />} />
              <Route path="api-keys" element={<ApiKeysTab />} />
              <Route path="media" element={<TabPlaceholder title="Media" />} />
              <Route path="forms" element={<FormsTab />} />
              <Route
                path="analytics"
                element={<TabPlaceholder title="Analytics" />}
              />
            </Route>
            <Route
              path="projects/:projectId/collections/:collectionId"
              element={<CollectionDetail />}
            />
            <Route
              path="projects/:projectId/forms/:formId"
              element={<FormBuilder />}
            />
            <Route
              path="projects/:projectId/forms/:formId/submissions"
              element={<FormSubmissions />}
            />

            <Route path="team" element={<Team />} />
            <Route path="billing" element={<Billing />} />
            <Route path="settings" element={<ComingSoon title="Settings" />} />
          </Route>

          {/* User */}
          <Route
            path="/user"
            element={
              <ProtectedRoute role="USER">
                <PortalLayout portal="USER" />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<UserDashboard />} />
            <Route path="projects/:projectId" element={<UserProjectLayout />}>
              <Route index element={<Navigate to="collections" replace />} />
              <Route path="collections" element={<UserCollectionsTab />} />
              <Route path="forms" element={<UserFormsTab />} />
            </Route>
            <Route
              path="collections/:collectionId"
              element={<CollectionRecords />}
            />
            <Route
              path="projects/:projectId/forms/:formId/submissions"
              element={<UserFormSubmissions />}
            />
            <Route path="profile" element={<ComingSoon title="Profile" />} />
          </Route>

          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
