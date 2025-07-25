import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Package, 
  User, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Truck, 
  DollarSign,
  Search,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TrackingTimeline } from "@/components/TrackingTimeline";

function ReportStatusTimeline({ report }) {
  const stages = [
    { label: "Reported", done: true },
    { label: "Admin Verified", done: report.admin_verified },
    { label: "Rider Assigned", done: !!report.rider_id },
    { label: "Pickup Started", done: !!report.pickup_started_at },
    { label: "Pickup Completed", done: !!report.pickup_completed_at },
    { label: "Paid", done: report.paid },
  ];
  return (
    <div className="flex gap-2 my-2">
      {stages.map((s, i) => (
        <div key={i} className={`px-2 py-1 rounded ${s.done ? "bg-green-500 text-white" : "bg-gray-200"}`}>
          {s.label}
        </div>
      ))}
    </div>
  );
}

export default function AdminWasteReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showTracking, setShowTracking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('waste_reports')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waste_reports'
        },
        (payload) => {
          console.log('Waste report update:', payload);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: reportsData } = await supabase
        .from("waste_reports")
        .select("*, profiles:farmer_id(full_name, phone_number), riders(name, phone_number)")
        .order("created_at", { ascending: false });
      setReports(reportsData || []);
      
      const { data: ridersData } = await supabase.from("riders").select("*");
      setRiders(ridersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (reportId: string) => {
    try {
      // First check if the report exists and get current data
      const { data: existingReport, error: fetchError } = await supabase
        .from("waste_reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (fetchError) {
        console.error('Error fetching report:', fetchError);
        throw new Error('Report not found');
      }

      // Update waste report status with only the fields that exist
      const updateData: any = {
        admin_verified: true,
        status: "scheduled"
      };

      // Only add admin_verified_at if the column exists
      try {
        updateData.admin_verified_at = new Date().toISOString();
      } catch (e) {
        console.log('admin_verified_at column may not exist, skipping');
      }

      const { error: updateError } = await supabase
        .from("waste_reports")
        .update(updateData)
        .eq("id", reportId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Get the report details for notification
      const { data: report } = await supabase
        .from("waste_reports")
        .select("farmer_id, waste_type, quantity_kg")
        .eq("id", reportId)
        .single();

      if (report) {
        // Send real-time notification to farmer
        const { error: notificationError } = await supabase.from("notifications").insert({
          recipient_id: report.farmer_id,
          type: "approval",
          title: "Waste Report Approved",
          message: `Your waste report for ${report.quantity_kg}kg of ${report.waste_type.replace('_', ' ')} has been approved. A rider will be assigned soon.`,
          related_entity_id: reportId
        });

        if (notificationError) {
          console.error('Notification error:', notificationError);
          // Don't throw here, the main update was successful
        }

        toast({
          title: "Report Verified",
          description: "Farmer has been notified of approval",
        });
      }

      fetchData();
    } catch (error) {
      console.error('Error verifying report:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify report",
        variant: "destructive",
      });
    }
  };

  const handleAssignRider = async (reportId: string, riderId: string) => {
    try {
      // First check if the rider exists
      const { data: rider, error: riderError } = await supabase
        .from("riders")
        .select("name, phone_number")
        .eq("id", riderId)
        .single();

      if (riderError || !rider) {
        throw new Error('Rider not found');
      }

      // Update waste report with rider assignment
      const updateData: any = {
        rider_id: riderId,
        status: "scheduled"
      };

      // Only add rider_assigned_at if the column exists
      try {
        updateData.rider_assigned_at = new Date().toISOString();
      } catch (e) {
        console.log('rider_assigned_at column may not exist, skipping');
      }

      const { error: updateError } = await supabase
        .from("waste_reports")
        .update(updateData)
        .eq("id", reportId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Get the report details for notification
      const { data: report } = await supabase
        .from("waste_reports")
        .select("farmer_id, waste_type, quantity_kg")
        .eq("id", reportId)
        .single();

      if (report) {
        // Send real-time notification to farmer
        const { error: notificationError } = await supabase.from("notifications").insert({
          recipient_id: report.farmer_id,
          type: "rider_assigned",
          title: "Rider Assigned",
          message: `Rider ${rider.name} (${rider.phone_number}) has been assigned to your pickup. They will contact you soon.`,
          related_entity_id: reportId
        });

        if (notificationError) {
          console.error('Notification error:', notificationError);
          // Don't throw here, the main update was successful
        }

        toast({
          title: "Rider Assigned",
          description: "Farmer has been notified of rider assignment",
        });
      }

      fetchData();
    } catch (error) {
      console.error('Error assigning rider:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign rider",
        variant: "destructive",
      });
    }
  };

  const filteredReports = reports.filter((report) => {
    const farmerName = report.profiles?.full_name || '';
    const matchesSearch = farmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.waste_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reported': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'pickup_started': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'pickup_completed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'collected': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Waste Reports</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and track waste collection reports</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Filters */}
        <Card className="glassmorphism border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Filter className="h-5 w-5 text-blue-600" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by farmer name or waste type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-gray-200 dark:border-gray-700 focus:border-green-500 dark:focus:border-green-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 border-2 border-gray-200 dark:border-gray-700">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="reported">Reported</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="pickup_started">Pickup Started</SelectItem>
                    <SelectItem value="pickup_completed">Pickup Completed</SelectItem>
                    <SelectItem value="collected">Collected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <Card key={report.id} className="glassmorphism border-0 shadow-lg hover:shadow-xl transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {report.waste_type.replace('_', ' ')}
                          </h3>
                          <Badge className={getStatusColor(report.status)}>
                            {report.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {report.quantity_kg}kg • {report.location}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <User className="h-4 w-4" />
                        <span>{report.profiles?.full_name} ({report.profiles?.phone_number})</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4" />
                        <span>{report.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <ReportStatusTimeline report={report} />

                    {report.rider_id && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 text-sm">
                          <Truck className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Assigned Rider:</span>
                          <span>{report.riders?.name} ({report.riders?.phone_number})</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {!report.admin_verified && (
                      <Button 
                        onClick={() => handleVerify(report.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Verify
                      </Button>
                    )}
                    
                    {report.admin_verified && !report.rider_id && (
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(riderId) => handleAssignRider(report.id, riderId)}
                          defaultValue=""
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Assign Rider" />
                          </SelectTrigger>
                          <SelectContent>
                            {riders.map(r => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {report.rider_id && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowTracking(true);
                          }}
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          Track
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredReports.length === 0 && (
          <Card className="glassmorphism border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No reports found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your search criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tracking Modal */}
      {showTracking && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Tracking Report #{selectedReport.id.slice(-8)}</h2>
                <Button variant="outline" onClick={() => setShowTracking(false)}>
                  Close
                </Button>
              </div>
              <TrackingTimeline 
                entityId={selectedReport.id} 
                entityType="waste_report" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}