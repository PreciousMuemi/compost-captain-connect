
import { 
  Home, 
  Users, 
  FileText, 
  CreditCard, 
  TrendingUp,
  Leaf,
  Menu,
  Truck,
  Package,
  ShoppingCart,
  Bell,
  MapPin,
  Settings,
  Plus
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
    { name: "Dashboard", href: "/farmer", icon: Home, roles: ['farmer'] },
  ];

  if (userRole === 'farmer') {
    return [
      ...baseItems,
      { name: "Report Waste", href: "/waste-reports", icon: Plus, roles: ['farmer'] },
      { name: "My Reports", href: "/my-reports", icon: FileText, roles: ['farmer'] },
    ];
  }

  if (userRole === 'dispatch') {
    return [
      ...baseItems,
      { name: "Orders", href: "/dispatch-dashboard", icon: Package, roles: ['dispatch'] },
      { name: "Riders", href: "/riders", icon: Truck, roles: ['dispatch'] },
      { name: "Inventory", href: "/inventory", icon: ShoppingCart, roles: ['dispatch'] },
      { name: "Notifications", href: "/notifications", icon: Bell, roles: ['dispatch'] },
      { name: "Map", href: "/dispatch-map", icon: MapPin, roles: ['dispatch'] },
      { name: "Settings", href: "/settings", icon: Settings, roles: ['dispatch'] },
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

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
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
      <SidebarHeader className="border-b border-sidebar-border p-4 flex flex-col items-center">
        <img src="/logo.png" alt="Captain Compost Logo" className="h-16 w-16 mb-2" />
        {!collapsed && (
          <div className="text-center">
            <h2 className="text-lg font-bold text-sidebar-foreground">Captain Compost</h2>
            <p className="text-xs text-sidebar-foreground/70">EST. 2025</p>
          </div>
        )}
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
                      onClick={onNavigate}
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
