import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Menu } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        {/* Mobile Hamburger */}
        <button
          className="fixed top-4 left-4 z-40 md:hidden bg-white rounded-full p-2 shadow"
          aria-label="Open sidebar"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>
        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:static md:translate-x-0 md:block ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:w-64 w-64 bg-white shadow-lg md:shadow-none`}
        >
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
        <main className="flex-1 p-6 space-y-6 md:ml-0 ml-0 md:pl-0 pl-0">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
