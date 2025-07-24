import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, MapPin, Calendar, TrendingUp, Eye, UserPlus, X } from "lucide-react";
import { mockFarmers } from "../data/mockData";
import { Farmer } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

function AddFarmerModal({ onClose, onAdd }: { onClose: () => void, onAdd: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [region, setRegion] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    // Use Supabase Auth admin API to create user
    // @ts-ignore: admin is available if using service role key
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: name,
        phone_number: phone,
        location,
        role: "farmer"
      }
    });
    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    onAdd();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold mb-4">Add New Farmer</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required />
          <Input placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} required />
          <Input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} required />
          <Input placeholder="Region" value={region} onChange={e => setRegion(e.target.value)} required />
          <Input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          {errorMsg && <div className="text-red-600 text-sm">{errorMsg}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? "Adding..." : "Add Farmer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Farmers() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const navigate = useNavigate();

  const fetchFarmers = async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('role', 'farmer');
    if (!error && data) {
      // Map DB rows to Farmer type
      setFarmers(
        data.map((row: any) => ({
          id: row.id,
          name: row.full_name,
          phoneNumber: row.phone_number,
          location: row.location || '',
          region: '', // region is not in DB, so leave blank or parse from location if you stored it
          totalEarnings: 0, // You can fetch/aggregate payments if needed
          totalWasteSubmitted: 0, // You can fetch/aggregate waste_reports if needed
          joinedDate: row.created_at,
          isActive: true // Or derive from another field if you have it
        }))
      );
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  const filteredFarmers = farmers.filter((farmer) => {
    const matchesSearch = farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         farmer.phoneNumber.includes(searchTerm) ||
                         farmer.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && farmer.isActive) ||
                         (statusFilter === "inactive" && !farmer.isActive);
    const matchesRegion = regionFilter === "all" || farmer.region === regionFilter;
    
    return matchesSearch && matchesStatus && matchesRegion;
  });

  const regions = [...new Set(farmers.map(f => f.region))];
  const totalFarmers = farmers.length;
  const activeFarmers = farmers.filter(f => f.isActive).length;
  const totalEarnings = farmers.reduce((sum, f) => sum + f.totalEarnings, 0);
  const totalWaste = farmers.reduce((sum, f) => sum + f.totalWasteSubmitted, 0);

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Farmers</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage farmer profiles and track their contributions.</p>
            </div>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 font-medium" 
              onClick={() => setShowAddModal(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add New Farmer
            </Button>
          </div>
        </div>
      </div>

      {showAddModal && <AddFarmerModal onClose={() => setShowAddModal(false)} onAdd={fetchFarmers} />}

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalFarmers}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Farmers</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <UserPlus className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{activeFarmers}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Farmers</p>
                </div>
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600">{formatCurrency(totalEarnings)}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Paid</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-600">{totalWaste.toLocaleString()} kg</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Waste</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name, phone, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border-2 border-gray-200 dark:border-gray-700 focus:border-green-500 dark:focus:border-green-500"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 border-2 border-gray-200 dark:border-gray-700">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger className="w-40 border-2 border-gray-200 dark:border-gray-700">
                    <SelectValue placeholder="Region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {regions.filter(region => region).map(region => (
                      <SelectItem key={region} value={region}>{region}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Farmers Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredFarmers.map((farmer) => (
            <Card key={farmer.id} className="bg-white dark:bg-gray-800 shadow-lg border-0 hover:shadow-xl transition-all duration-200 hover:scale-105">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                    {farmer.name}
                  </CardTitle>
                  <Badge 
                    variant={farmer.isActive ? "default" : "secondary"}
                    className={farmer.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"}
                  >
                    {farmer.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Phone className="h-4 w-4 mr-3 text-blue-600" />
                    <span>{farmer.phoneNumber}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4 mr-3 text-green-600" />
                    <span>{farmer.location}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4 mr-3 text-purple-600" />
                    <span>Joined {formatDate(farmer.joinedDate)}</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(farmer.totalEarnings)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Waste Submitted</span>
                    <span className="font-semibold text-blue-600">
                      {farmer.totalWasteSubmitted} kg
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700" 
                    onClick={() => navigate(`/farmers/${farmer.id}/profile`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Profile
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500" 
                    onClick={() => navigate(`/farmers/${farmer.id}/history`)}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    History
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredFarmers.length === 0 && (
          <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
            <CardContent className="p-12 text-center">
              <UserPlus className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No farmers found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your search criteria or filters.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
