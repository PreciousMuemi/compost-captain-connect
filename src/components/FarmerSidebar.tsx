import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  User, 
  LogOut, 
  Menu, 
  X,
  Leaf,
  Clock,
  FileText
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  children: React.ReactNode;
}

export const FarmerSidebar = ({ children }: SidebarProps) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { 
      icon: Home, 
      label: 'Dashboard', 
      path: '/farmer',
      description: 'Overview & Stats'
    },
    { 
      icon: Package, 
      label: 'Report Waste', 
      path: '/farmer/waste-reports',
      description: 'Submit new waste reports'
    },
    { 
      icon: Clock, 
      label: 'My Reports', 
      path: '/farmer/waste-reports',
      description: 'View waste report status'
    },
    { 
      icon: ShoppingCart, 
      label: 'Buy Products', 
      path: '/farmer/products',
      description: 'Purchase organic products'
    },
    { 
      icon: TrendingUp, 
      label: 'Earnings', 
      path: '/farmer/payments',
      description: 'View payments & earnings'
    },
    { 
      icon: FileText, 
      label: 'Orders', 
      path: '/farmer/orders',
      description: 'Track product orders'
    },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActivePath = (path: string) => {
    if (path === '/farmer') {
      return location.pathname === '/farmer';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-4 left-4 z-50 md:hidden bg-white shadow-md border"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:shadow-lg
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-center p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-green-800">Captain Compost</h1>
                <p className="text-sm text-gray-600">Farmer Portal</p>
              </div>
            </div>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-gray-200 bg-green-50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile?.full_name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {profile?.phone_number}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.path);
              
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center space-x-3 px-3 py-4 rounded-lg text-left transition-colors touch-manipulation
                    ${isActive 
                      ? 'bg-green-100 text-green-700 border border-green-200' 
                      : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-green-600' : 'text-gray-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isActive ? 'text-green-700' : 'text-gray-900'}`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 text-red-600 border-red-200 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header spacer */}
        <div className="h-16 md:hidden"></div>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
