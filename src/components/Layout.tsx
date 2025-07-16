
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Bell, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { signOut, profile } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <SidebarTrigger className="text-gray-600 hover:text-gray-900" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Captain Compost</h1>
                <p className="text-xs text-gray-500">
                  {profile?.full_name} ({profile?.role})
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  3
                </span>
              </Button>
              <Button variant="ghost" size="sm">
                <User className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </header>
          
          {/* Main Content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
