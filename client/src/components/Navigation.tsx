import { Button } from '@/components/ui/button';
import { useAuth } from './AuthContext';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const tabs = [
    { id: 'dashboard', label: '🏠 Dashboard', icon: '🏠' },
    { id: 'transactions', label: '💳 Transactions', icon: '💳' },
    { id: 'reports', label: '📊 Reports', icon: '📊' },
    { id: 'notes', label: '📝 Notes', icon: '📝' }
  ];

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-blue-600">💰 NopiFin</h1>
            <div className="hidden md:flex space-x-1">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  onClick={() => onTabChange(tab.id)}
                  className={`${
                    activeTab === tab.id 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="hidden sm:inline text-sm text-gray-600">
              👋 Welcome, {user?.email}
            </span>
            <Button variant="outline" onClick={handleLogout}>
              🚪 Logout
            </Button>
          </div>
        </div>
        
        {/* Mobile navigation */}
        <div className="md:hidden pb-4">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                size="sm"
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                onClick={() => onTabChange(tab.id)}
                className={`whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon} {tab.id.charAt(0).toUpperCase() + tab.id.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}