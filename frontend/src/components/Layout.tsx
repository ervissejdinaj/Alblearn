import React, { useMemo, useState } from "react";
import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Layout: React.FC = () => {
  const { state, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  type NavigationItem = {
    to: string;
    label: string;
    icon: React.ReactNode;
    exact?: boolean;
  };

  const DashboardIcon = () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3h8v8H3V3zm10 0h8v5h-8V3zm0 7h8v11h-8V10zM3 13h8v11H3V13z"
      />
    </svg>
  );

  const UsersIcon = () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 9a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 19a4 4 0 014-4h8a4 4 0 014 4"
      />
    </svg>
  );

  const ModulesIcon = () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 5.25h16.5M3.75 9.75h16.5M3.75 14.25h16.5M3.75 18.75h10.5"
      />
    </svg>
  );

  const FilesIcon = () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7.5V5.25A2.25 2.25 0 015.25 3h5.086a2.25 2.25 0 011.59.659l1.914 1.914A2.25 2.25 0 0015.43 6.75H18.75A2.25 2.25 0 0121 9v9.75A2.25 2.25 0 0118.75 21H5.25A2.25 2.25 0 013 18.75V7.5z"
      />
    </svg>
  );

  const LogoutIcon = () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9l3 3-3 3m3-3H4.5"
      />
    </svg>
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navigationItems = useMemo<NavigationItem[]>(() => {
    switch (state.user?.role) {
      case "admin":
        return [
          {
            to: "/admin",
            label: "Dashboard",
            icon: <DashboardIcon />,
            exact: true,
          },
          {
            to: "/admin/users",
            label: "Users",
            icon: <UsersIcon />,
            exact: true,
          },
          {
            to: "/admin/modules",
            label: "Modules",
            icon: <ModulesIcon />,
            exact: true,
          },
          {
            to: "/admin/files",
            label: "Files",
            icon: <FilesIcon />,
            exact: true,
          },
        ];
      case "instructor":
        return [
          {
            to: "/instructor",
            label: "Dashboard",
            icon: <DashboardIcon />,
            exact: true,
          },
          {
            to: "/instructor",
            label: "My Modules",
            icon: <ModulesIcon />,
            exact: false,
          },
        ];
      default:
        return [
          {
            to: "/dashboard",
            label: "Dashboard",
            icon: <DashboardIcon />,
            exact: true,
          },
        ];
    }
  }, [state.user?.role]);

  const renderNavLink = (item: NavigationItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      className={({ isActive }) =>
        `nav-link w-full md:w-auto justify-between md:justify-start ${
          isActive ? "nav-link-active" : ""
        }`.trim()
      }
      onClick={() => setIsMobileMenuOpen(false)}
      end={item.exact ?? false}
    >
      <div className="flex items-center space-x-2">
        <span>{item.icon}</span>
        <span>{item.label}</span>
      </div>
    </NavLink>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 backdrop-blur-sm bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-primary-600/95 via-primary-700/95 to-primary-800/95 border border-white/15 shadow-glow px-4 md:px-6 h-20 md:h-16">
            <Link
              to="/dashboard"
              className="flex items-center gap-3 text-white transition-colors duration-200 hover:text-white"
            >
              <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 shadow-inner flex items-center justify-center">
                <span className="text-lg">🇦🇱</span>
              </div>
              <div className="leading-tight">
                <span className="block text-lg font-semibold tracking-tight">
                  AlbLearn
                </span>
                <span className="text-[11px] uppercase tracking-[0.32em] text-white/60">
                  Learn Albanian
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-1.5">
                {navigationItems.map(renderNavLink)}
              </div>

              <div className="md:hidden">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                  className="btn-icon border border-white/20 bg-white/10 text-white/90 hover:bg-white/20 focus:ring-white/40"
                  aria-label="Toggle navigation menu"
                  aria-expanded={isMobileMenuOpen}
                >
                  {isMobileMenuOpen ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 md:gap-3 md:pl-3 md:border-l md:border-white/15">
                {/* Current User Display */}
                <div className="hidden sm:flex items-center gap-2 text-white/85 px-3 py-2 rounded-xl bg-white/10 border border-white/15">
                  <div
                    className={`avatar-sm text-xs ${
                      state.user?.role === "admin"
                        ? "bg-red-500/30 text-red-100"
                        : state.user?.role === "instructor"
                        ? "bg-yellow-500/30 text-yellow-100"
                        : "bg-green-500/30 text-green-100"
                    }`}
                  >
                    {state.user?.firstName?.[0]}
                    {state.user?.lastName?.[0]}
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm leading-tight">
                      {state.user?.firstName} {state.user?.lastName}
                    </div>
                    <div className="text-xs text-white/60 capitalize leading-tight">
                      {state.user?.role}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="btn-compact bg-white/5 text-white/80 hover:text-white hover:bg-white/10 border border-white/15 transition-all duration-300"
                  title="Logout"
                >
                  <LogoutIcon />
                  <span className="hidden lg:inline">Logout</span>
                </button>
              </div>
            </div>
          </nav>
        </div>

        {isMobileMenuOpen && navigationItems.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mt-3 rounded-2xl bg-gradient-to-br from-primary-600/95 via-primary-700/95 to-primary-800/95 border border-white/15 shadow-glow p-3 space-y-2">
              {navigationItems.map((item) => (
                <div key={item.to} className="flex">
                  {renderNavLink(item)}
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
