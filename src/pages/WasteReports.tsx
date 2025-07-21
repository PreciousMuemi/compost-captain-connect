import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Filter, CheckCircle, X, User, MapPin, Calendar, FileText } from "lucide-react";
import { WasteReport } from "../types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const getStatusColor = (status: WasteReport['status']) => {
  switch (status) {
    case 'reported':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'scheduled':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'collected':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'processed':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

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
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function WasteReports() {
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const { toast } = useToast();
  const [riders, setRiders] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReports = async () => {
      const { data, error } = await supabase
        .from('waste_reports')
        .select(`
          id,
          farmer_id,
          waste_type,
          quantity_kg,
          status,
          location,
          created_at,
          collected_date,
          farmer:profiles!waste_reports_farmer_id_fkey(full_name, location)
        `)
        .order('created_at', { ascending: false });
      if (error) return;
      console.log(data); // Debug: see what is returned
      setReports(
        (data || []).map((row: any) => ({
          id: row.id,
          farmerId: row.farmer_id,
          farmerName: row.farmer?.full_name || 'Unknown',
          wasteType: row.waste_type,
          quantity: row.quantity_kg,
          status: row.status,
          location: row.location || '',
          region: row.farmer?.location || '',
          reportedAt: row.created_at,
          collectedAt: row.collected_date,
          estimatedValue: 0, // You can calculate or fetch this if needed
          assignedAgent: '', // You can map this if you have the data
        }))
      );
    };
    fetchReports();
  }, []);

  useEffect(() => {
    // Fetch riders for assignment
    supabase.from('riders').select('*').then(({ data }) => setRiders(data || []));
  }, []);

  const assignRider = async (reportId: string, riderId: string) => {
    await supabase.from('waste_reports').update({ assigned_driver_id: riderId, status: 'scheduled' }).eq('id', reportId);
    // Refresh reports
    toast({
      title: "Dispatch Assigned",
      description: `Dispatch assigned to rider ${riders.find(r => r.id === riderId)?.name}`,
    });
  };

  const approveReport = async (reportId: string) => {
    await supabase.from('waste_reports').update({ status: 'processed' }).eq('id', reportId);
    // Refresh reports
    toast({
      title: "Dispatch Approved",
      description: `Dispatch approved.`,
    });
  };

  // Remove or comment out rejectReport, as 'rejected' is not a valid status
  // const rejectReport = async (reportId: string) => {
  //   await supabase.from('waste_reports').update({ status: 'rejected' }).eq('id', reportId);
  //   // Refresh reports
  //   toast({
  //     title: "Dispatch Rejected",
  //     description: `Dispatch rejected.`,
  //   });
  // };

  const filteredReports = reports.filter((report) => {
    const matchesSearch = report.farmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    const matchesRegion = regionFilter === "all" || report.region === regionFilter;
    return matchesSearch && matchesStatus && matchesRegion;
  });

  const updateReportStatus = (reportId: string, newStatus: WasteReport['status']) => {
    setReports(prev => prev.map(report => 
      report.id === reportId 
        ? { ...report, status: newStatus, collectedAt: newStatus === 'collected' ? new Date().toISOString() : report.collectedAt }
        : report
    ));
    toast({
      title: "Status Updated",
      description: `Report status has been updated to ${newStatus}`,
    });
  };

  const regions = [...new Set(reports.map(r => r.region))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Waste Reports</h1>
          <p className="text-gray-600 mt-1">Manage and track waste collection reports from farmers.</p>
        </div>
        <button
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate('/login');
          }}
        >
          Logout
        </button>
      </div>

      {/* Filters Row (above cards) */}
      <div className="flex flex-col md:flex-row gap-4 items-center mb-2">
        <Input
          placeholder="Search by farmer name or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-64"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="reported">Reported</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="collected">Collected</SelectItem>
            <SelectItem value="processed">Processed</SelectItem>
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

      {/* Reports Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredReports.map((report) => (
          <Card key={report.id} className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {report.farmerName}
                </CardTitle>
                <Badge className={getStatusColor(report.status)}>
                  {report.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  <span className="capitalize">{report.wasteType.replace('_', ' ')}</span>
                  <span className="ml-auto font-medium">{report.quantity} kg</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{report.location}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>{formatDate(report.reportedAt)}</span>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">Estimated Value</span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(report.estimatedValue)}
                  </span>
                </div>

                <div className="flex gap-2">
                  {/* Only allow assign/approve for valid statuses */}
                  {report.status === 'reported' && (
                    <>
                      <Select onValueChange={riderId => assignRider(report.id, riderId)}>
                        <SelectTrigger>Assign Rider</SelectTrigger>
                        <SelectContent>
                          {riders.map(rider => (
                            <SelectItem key={rider.id} value={rider.id}>{rider.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                  {report.status === 'scheduled' && (
                    <Button onClick={() => approveReport(report.id)}>Mark as Processed</Button>
                  )}
                  {/* Remove reject button as 'rejected' is not a valid status */}
                </div>
              </div>

              {report.assignedAgent && (
                <div className="text-xs text-gray-500 border-t pt-2">
                  Assigned to: {report.assignedAgent}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
