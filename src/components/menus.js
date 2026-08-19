import {
  FiGrid,
  FiLayers,
  FiBriefcase,
  FiUsers,
  FiSettings,
  FiFolder,
  FiUser,
  FiCreditCard,
} from "react-icons/fi";

export const PORTALS = {
  SUPER_ADMIN: {
    label: "Super Admin",
    basePath: "/super-admin",
    items: [
      { to: "/super-admin/dashboard", label: "Dashboard", icon: FiGrid },
      { to: "/super-admin/plans", label: "Plans", icon: FiLayers },
      { to: "/super-admin/tenants", label: "Tenants", icon: FiBriefcase },
      { to: "/super-admin/users", label: "Users", icon: FiUsers },
      { to: "/super-admin/settings", label: "Settings", icon: FiSettings },
    ],
  },
  ADMIN: {
    label: "Admin",
    basePath: "/admin",
    items: [
      { to: "/admin/dashboard", label: "Dashboard", icon: FiGrid },
      // Collections, Media and API Keys live inside a project, not here
      { to: "/admin/projects", label: "Projects", icon: FiFolder },
      { to: "/admin/team", label: "Team", icon: FiUsers },
      { to: "/admin/billing", label: "Billing", icon: FiCreditCard },
      { to: "/admin/settings", label: "Settings", icon: FiSettings },
    ],
  },
  USER: {
    label: "User",
    basePath: "/user",
    items: [
      // The dashboard is the assigned-project list, so there is no separate
      // Projects entry.
      { to: "/user/dashboard", label: "My Projects", icon: FiFolder },
      { to: "/user/profile", label: "Profile", icon: FiUser },
    ],
  },
};
