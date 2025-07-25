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
  Filter,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TrackingTimeline } from "@/components/TrackingTimeline";

function ReportStatusTimeline({ report }) {
  const stages = [
    { 
      label: "Reported", 
      done: true,
      current: report.status === 'reported',
      color: "bg-blue-500"
    },
    { 
      label: "Admin Verified", 
      done: report.admin_verified || report.status !== 'reported',
      current: report.status === 'scheduled' && !report.rider_id,
      color: "bg-green-500"
    },
    { 
      label: "Rider Assigned", 
      done: !!report.rider_id,
      current: report.status === 'scheduled' && !!report.rider_id,
      color: "bg-purple-500"
    },
    { 
      label: "Collected", 
      done: report.status === 'collected' || report.status === 'processed',
      current: report.status === 'collected',
      color: "bg-orange-500"
    },
    { 
      label: "Processed", 
      done: report.status === 'processed',
      current: report.status === 'processed',
      color: "bg-indigo-500"
    },
    { 
      label: "Paid", 
      done: report.status === 'processed',
      current: report.status === 'processed',
      color: "bg-green-600"
    },
  ];
  
  return (
    <div className="flex flex-wrap gap-2 my-3">
      {stages.map((stage, i) => (
        <div 
          key={i} 
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
            stage.current 
              ? `${stage.color} text-white shadow-lg` 
              : stage.done 
                ? `${stage.color} text-white` 
                : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
          }`}
        >
          {stage.label}
          {stage.current && (
            <span className="ml-1 text-white">●</span>
          )}
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
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [showAssignRiderModal, setShowAssignRiderModal] = useState(false);
  const [selectedReportForRider, setSelectedReportForRider] = useState<any>(null);
  const [selectedRiderId, setSelectedRiderId] = useState("");

  const showActionNotification = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  useEffect(() => {
    fetchData();
    checkDatabaseSchema(); // Check what columns exist
    
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
          // Update the reports list immediately
          if (payload.eventType === 'UPDATE') {
            setReports(prev => prev.map(report => 
              report.id === payload.new.id ? { ...report, ...payload.new } : report
            ));
          } else if (payload.eventType === 'INSERT') {
            setReports(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setReports(prev => prev.filter(report => report.id !== payload.old.id));
          }
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
      console.log('Fetching waste reports data...');
      
      const { data: reportsData, error: reportsError } = await supabase
        .from("waste_reports")
        .select("*, profiles:farmer_id(full_name, phone_number), riders(name, phone_number)")
        .order("created_at", { ascending: false });

      if (reportsError) {
        console.error('Error fetching reports:', reportsError);
        throw reportsError;
      }

      console.log('Fetched reports:', reportsData?.length || 0);
      setReports(reportsData || []);
      
      const { data: ridersData, error: ridersError } = await supabase
        .from("riders")
        .select("*");

      if (ridersError) {
        console.error('Error fetching riders:', ridersError);
      } else {
        console.log('Fetched riders:', ridersData?.length || 0);
        setRiders(ridersData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch waste reports data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (reportId: string) => {
    try {
      // Update waste report status - only update status field
      const { error: updateError } = await supabase
        .from("waste_reports")
        .update({ 
          status: "scheduled"
        })
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
        showActionNotification("Report verified! Farmer notified.");
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
      console.log('Assigning rider:', riderId, 'to report:', reportId);
      
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
      const { error: updateError } = await supabase
        .from("waste_reports")
        .update({ 
          rider_id: riderId,
          status: "scheduled"
        })
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
        }

        toast({
          title: "Rider Assigned",
          description: `Rider ${rider.name} has been assigned successfully`,
        });
        
        showActionNotification(`Rider ${rider.name} assigned! Farmer notified.`);
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

  const handleMarkCollected = async (reportId: string) => {
    try {
      console.log('Marking report as collected:', reportId);
      
      // Use the updateReportStatus function to avoid column issues
      await updateReportStatus(reportId, 'collected');

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
          type: "collection_completed",
          title: "Waste Collection Completed",
          message: `Your waste collection of ${report.quantity_kg}kg ${report.waste_type.replace('_', ' ')} has been completed. Payment will be processed soon.`,
          related_entity_id: reportId
        });

        if (notificationError) {
          console.error('Notification error:', notificationError);
        }

        showActionNotification("Collection marked! Payment processing initiated.");
      }
    } catch (error) {
      console.error('Error marking as collected:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark as collected",
        variant: "destructive",
      });
    }
  };

  const updateReportStatus = async (reportId: string, newStatus: 'reported' | 'scheduled' | 'collected' | 'processed') => {
    try {
      console.log('Updating report status:', reportId, 'to:', newStatus);
      
      const { error } = await supabase
        .from("waste_reports")
        .update({ 
          status: newStatus,
          collected_date: newStatus === 'collected' ? new Date().toISOString() : null
        })
        .eq("id", reportId);

      if (error) {
        console.error('Status update error:', error);
        throw error;
      }

      // Update local state immediately
      setReports(prev => prev.map(report => 
        report.id === reportId ? { 
          ...report, 
          status: newStatus,
          collected_date: newStatus === 'collected' ? new Date().toISOString() : report.collected_date
        } : report
      ));

      toast({
        title: "Status Updated",
        description: `Report status updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
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
      case 'collected': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'processed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const openAssignRiderModal = (report: any) => {
    setSelectedReportForRider(report);
    setSelectedRiderId("");
    setShowAssignRiderModal(true);
  };

  const handleAssignRiderFromModal = async () => {
    if (!selectedRiderId || !selectedReportForRider) return;

    try {
      await handleAssignRider(selectedReportForRider.id, selectedRiderId);
      setShowAssignRiderModal(false);
      setSelectedReportForRider(null);
      setSelectedRiderId("");
    } catch (error) {
      console.error('Error assigning rider from modal:', error);
    }
  };

  const checkDatabaseSchema = async () => {
    try {
      // Try to fetch a single record to check what columns exist
      const { data, error } = await supabase
        .from("waste_reports")
        .select("*")
        .limit(1);

      if (error) {
        console.error('Schema check error:', error);
        return false;
      }

      if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log('Available columns in waste_reports:', columns);
        return true;
      }
    } catch (error) {
      console.error('Error checking schema:', error);
    }
    return false;
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
      {/* Notification Banner */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-in slide-in-from-right">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span>{notificationMessage}</span>
          </div>
        </div>
      )}

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
                    <SelectItem value="collected">Collected</SelectItem>
                    <SelectItem value="processed">Processed</SelectItem>
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
                    {/* Status-based action buttons */}
                    {report.status === 'reported' && (
                      <Button 
                        onClick={() => handleVerify(report.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Verify Report
                      </Button>
                    )}
                    
                    {report.status === 'scheduled' && !report.rider_id && (
                      <Button 
                        onClick={() => openAssignRiderModal(report)}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Assign Rider
                      </Button>
                    )}
                    
                    {report.status === 'scheduled' && report.rider_id && (
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => updateReportStatus(report.id, 'collected')}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          Mark Collected
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowTracking(true);
                          }}
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          Track
                        </Button>
                      </div>
                    )}
                    
                    {report.status === 'collected' && (
                      <div className="flex gap-2">
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                          Completed
                        </Badge>
                        <Button 
                          onClick={() => handleMarkCollected(report.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Process Payment
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

      {/* Assign Rider Modal */}
      {showAssignRiderModal && selectedReportForRider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Assign Rider
              </h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAssignRiderModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Assign a rider to this waste report:
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedReportForRider.waste_type.replace('_', ' ')} - {selectedReportForRider.quantity_kg}kg
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Location: {selectedReportForRider.location}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Rider
                </label>
                <Select value={selectedRiderId} onValueChange={setSelectedRiderId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a rider" />
                  </SelectTrigger>
                  <SelectContent>
                    {riders.map(rider => (
                      <SelectItem key={rider.id} value={rider.id}>
                        {rider.name} - {rider.phone_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAssignRiderModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAssignRiderFromModal}
                  disabled={!selectedRiderId}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Assign Rider
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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