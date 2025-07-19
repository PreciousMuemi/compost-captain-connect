
import { 
  Home, 
  Users, 
  FileText, 
  CreditCard, 
  TrendingUp,
  Leaf,
  Menu
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

// Navigation items based on user role
const getNavigationItems = (userRole: string) => {
  const baseItems = [
    { name: "Dashboard", href: "/", icon: Home, roles: ['farmer', 'admin', 'dispatch'] },
  ];

  if (userRole === 'farmer') {
    return [
      ...baseItems,
      { name: "My Reports", href: "/waste-reports", icon: FileText, roles: ['farmer'] },
    ];
  }

  if (userRole === 'admin' || userRole === 'dispatch') {
    return [
      ...baseItems,
      { name: "Waste Reports", href: "/waste-reports", icon: FileText, roles: ['admin', 'dispatch'] },
      { name: "Farmers", href: "/farmers", icon: Users, roles: ['admin', 'dispatch'] },
      { name: "Payments", href: "/payments", icon: CreditCard, roles: ['admin', 'dispatch'] },
      { name: "Analytics", href: "/analytics", icon: TrendingUp, roles: ['admin', 'dispatch'] },
    ];
  }

  return baseItems;
};

export function AppSidebar() {
  const { open } = useSidebar();
  const { profile } = useAuth();
  const location = useLocation();
  const collapsed = !open;
  
  const navigation = getNavigationItems(profile?.role || 'farmer');

  const isActive = (href: string) => {
    return location.pathname === href || (href !== "/" && location.pathname.startsWith(href));
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center space-x-2">
          <div className="bg-accent rounded-lg p-2">
            <Leaf className="h-6 w-6 text-accent-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-lg font-bold text-sidebar-foreground">Captain Compost</h2>
              <p className="text-xs text-sidebar-foreground/70">Waste Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            {!collapsed && "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.href}
                      className={({ isActive: navActive }) =>
                        `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive(item.href) || navActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        }`
                      }
                    >
                      <item.icon className={`h-5 w-5 ${collapsed ? "" : "mr-3"}`} />
                      {!collapsed && <span>{item.name}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
