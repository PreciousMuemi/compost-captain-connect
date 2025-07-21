import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Menu } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen flex-row overflow-x-hidden">
        {/* Mobile Hamburger */}
        <button
          className="fixed top-4 left-4 z-40 md:hidden bg-white rounded-full p-2 shadow"
          aria-label="Open sidebar"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>
        {/* Sidebar */}
        {/* Mobile sidebar: fixed, slides in/out */}
        <div
          className={
            (sidebarOpen
              ? "fixed inset-y-0 left-0 z-50 translate-x-0 md:hidden "
              : "fixed inset-y-0 left-0 z-50 -translate-x-full md:hidden ") +
            "transition-transform duration-200 bg-white shadow-lg w-64"
          }
          style={{ maxWidth: '100vw' }}
        >
          <AppSidebar onNavigate={() => setSidebarOpen(false)} />
        </div>
        {/* Desktop sidebar: always visible, static in flex row */}
        <div className="hidden md:block bg-white shadow-lg w-64 lg:sticky lg:top-0 lg:h-screen">
          <AppSidebar />
        </div>
        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            tabIndex={-1}
          />
        )}
        {/* Main content */}
        <main className="flex-1 h-screen overflow-y-scroll bg-white">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
