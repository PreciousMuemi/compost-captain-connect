
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Filter, CheckCircle, X, User, MapPin, Calendar } from "lucide-react";
import { mockWasteReports } from "../data/mockData";
import { WasteReport } from "../types";
import { useToast } from "@/hooks/use-toast";

const getStatusColor = (status: WasteReport['status']) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'assigned':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'collected':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
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
  const [reports, setReports] = useState<WasteReport[]>(mockWasteReports);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const { toast } = useToast();

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
      </div>

      {/* Filters */}
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by farmer name or location..."
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions.map(region => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  {report.status === 'pending' && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateReportStatus(report.id, 'assigned')}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Assign
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => updateReportStatus(report.id, 'rejected')}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  
                  {report.status === 'assigned' && (
                    <Button 
                      size="sm" 
                      onClick={() => updateReportStatus(report.id, 'collected')}
                      className="w-full"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Collected
                    </Button>
                  )}
                  
                  {report.status === 'collected' && (
                    <Button size="sm" variant="outline" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  )}
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
