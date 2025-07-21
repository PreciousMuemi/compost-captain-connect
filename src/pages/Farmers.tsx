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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Farmers</h1>
          <p className="text-gray-600 mt-1">Manage farmer profiles and track their contributions.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowAddModal(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add New Farmer
        </Button>
      </div>
      {showAddModal && <AddFarmerModal onClose={() => setShowAddModal(false)} onAdd={fetchFarmers} />}
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-gray-900">{totalFarmers}</div>
            <p className="text-sm text-gray-600">Total Farmers</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-600">{activeFarmers}</div>
            <p className="text-sm text-gray-600">Active Farmers</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalEarnings)}</div>
            <p className="text-sm text-gray-600">Total Paid</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-accent">{totalWaste.toLocaleString()} kg</div>
            <p className="text-sm text-gray-600">Total Waste</p>
          </CardContent>
        </Card>
      </div>
      {/* Filters */}
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, phone, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-40">
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
          <Card key={farmer.id} className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {farmer.name}
                </CardTitle>
                <Badge variant={farmer.isActive ? "default" : "secondary"}>
                  {farmer.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>{farmer.phoneNumber}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{farmer.location}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Joined {formatDate(farmer.joinedDate)}</span>
                </div>
              </div>
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Earnings</span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(farmer.totalEarnings)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Waste Submitted</span>
                  <span className="font-semibold text-accent">
                    {farmer.totalWasteSubmitted} kg
                  </span>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1" onClick={() => navigate(`/farmers/${farmer.id}/profile`)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Profile
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/farmers/${farmer.id}/history`)}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  History
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {filteredFarmers.length === 0 && (
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-12 text-center">
            <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No farmers found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
