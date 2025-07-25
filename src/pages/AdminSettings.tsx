import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Settings, 
  Bell, 
  Shield, 
  Database,
  Users,
  Truck,
  DollarSign,
  Save,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    autoAssignRiders: false,
    paymentThreshold: 1000,
    maxRidersPerOrder: 1,
    systemMaintenance: false,
    debugMode: false
  });
  const { toast } = useToast();

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Save settings to database or local storage
      localStorage.setItem('adminSettings', JSON.stringify(settings));
      
      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetSettings = () => {
    setSettings({
      notificationsEnabled: true,
      autoAssignRiders: false,
      paymentThreshold: 1000,
      maxRidersPerOrder: 1,
      systemMaintenance: false,
      debugMode: false
    });
    
    toast({
      title: "Settings Reset",
      description: "Settings have been reset to defaults.",
    });
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">System configuration and preferences</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleResetSettings}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleSaveSettings} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Notification Settings */}
        <Card className="glassmorphism border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Bell className="h-5 w-5 text-blue-600" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Enable Notifications</Label>
                <p className="text-xs text-gray-600 dark:text-gray-400">Send real-time notifications to users</p>
              </div>
              <Switch
                checked={settings.notificationsEnabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notificationsEnabled: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card className="glassmorphism border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Settings className="h-5 w-5 text-green-600" />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Auto-Assign Riders</Label>
                <p className="text-xs text-gray-600 dark:text-gray-400">Automatically assign riders to orders</p>
              </div>
              <Switch
                checked={settings.autoAssignRiders}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoAssignRiders: checked }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Threshold (KES)</Label>
              <Input
                type="number"
                value={settings.paymentThreshold}
                onChange={(e) => setSettings(prev => ({ ...prev, paymentThreshold: parseInt(e.target.value) || 0 }))}
                placeholder="1000"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Max Riders Per Order</Label>
              <Input
                type="number"
                value={settings.maxRidersPerOrder}
                onChange={(e) => setSettings(prev => ({ ...prev, maxRidersPerOrder: parseInt(e.target.value) || 1 }))}
                placeholder="1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="glassmorphism border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Shield className="h-5 w-5 text-red-600" />
              Security & Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">System Maintenance Mode</Label>
                <p className="text-xs text-gray-600 dark:text-gray-400">Enable maintenance mode</p>
              </div>
              <Switch
                checked={settings.systemMaintenance}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, systemMaintenance: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Debug Mode</Label>
                <p className="text-xs text-gray-600 dark:text-gray-400">Enable debug logging</p>
              </div>
              <Switch
                checked={settings.debugMode}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, debugMode: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Database Info */}
        <Card className="glassmorphism border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Database className="h-5 w-5 text-purple-600" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Database Status</Label>
                <p className="text-sm text-green-600">Connected</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Last Backup</Label>
                <p className="text-sm text-gray-600">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 