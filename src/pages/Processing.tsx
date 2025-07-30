import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Package, 
  Factory, 
  QrCode, 
  Users, 
  MapPin, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Plus,
  Eye,
  Truck,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { blockchainClient } from "@/integrations/blockchain/client";

interface ProcessingBatch {
  id: string;
  batchNumber: string;
  wasteReportIds: string[];
  totalInputWeight: number;
  totalOutputWeight: number;
  processingDate: string;
  status: 'pending' | 'drying' | 'crushing' | 'cleaning' | 'pelletizing' | 'packaged' | 'completed';
  qrCode: string;
  traceabilityData: {
    farmerNames: string[];
    locations: string[];
    wasteTypes: string[];
    processingSteps: ProcessingStep[];
  };
}

interface ProcessingStep {
  step: string;
  startTime: string;
  endTime?: string;
  operator: string;
  qualityMetrics?: any;
}

interface WasteReport {
  id: string;
  farmer_id: string;
  waste_type: string;
  quantity_kg: number;
  location: string;
  status: string;
  farmer?: {
    full_name: string;
    phone_number: string;
  };
}

export default function Processing() {
  const { toast } = useToast();
  const [batches, setBatches] = useState<ProcessingBatch[]>([]);
  const [availableReports, setAvailableReports] = useState<WasteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [batchNumber, setBatchNumber] = useState('');

  useEffect(() => {
    fetchProcessingData();
  }, []);

  const fetchProcessingData = async () => {
    try {
      // Fetch processing batches
      const { data: batchData } = await supabase
        .from('processing_batches')
        .select(`
          *,
          waste_reports (
            id,
            waste_type,
            quantity_kg,
            location,
            farmer:profiles(full_name, phone_number)
          )
        `)
        .order('created_at', { ascending: false });

      // Fetch available waste reports for new batches
      const { data: reports } = await supabase
        .from('waste_reports')
        .select(`
          *,
          farmer:profiles(full_name, phone_number)
        `)
        .eq('status', 'collected')
        .is('batch_id', null);

      setBatches(batchData || []);
      setAvailableReports(reports || []);
    } catch (error) {
      console.error('Error fetching processing data:', error);
      toast({
        title: "Error",
        description: "Failed to load processing data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewBatch = async () => {
    if (!batchNumber || selectedReports.length === 0) {
      toast({
        title: "Error",
        description: "Please enter batch number and select waste reports",
        variant: "destructive"
      });
      return;
    }

    try {
      const totalWeight = availableReports
        .filter(r => selectedReports.includes(r.id))
        .reduce((sum, r) => sum + r.quantity_kg, 0);

      const farmerNames = availableReports
        .filter(r => selectedReports.includes(r.id))
        .map(r => r.farmer?.full_name || 'Unknown');

      const locations = availableReports
        .filter(r => selectedReports.includes(r.id))
        .map(r => r.location);

      const wasteTypes = availableReports
        .filter(r => selectedReports.includes(r.id))
        .map(r => r.waste_type);

      // Generate QR code
      const qrCode = `QR-BATCH-${batchNumber}-${Date.now()}`;

      const { data: newBatch, error } = await supabase
        .from('processing_batches')
        .insert({
          batch_number: batchNumber,
          waste_report_ids: selectedReports,
          total_input_weight: totalWeight,
          status: 'pending',
          qr_code: qrCode,
          traceability_data: {
            farmerNames,
            locations,
            wasteTypes,
            processingSteps: []
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Log to blockchain
      try {
        const blockchainSuccess = await blockchainClient.logProcessingBatchToBlockchain(
          batchNumber,
          selectedReports,
          qrCode,
          farmerNames
        );

        if (blockchainSuccess) {
          await supabase
            .from('processing_batches')
            .update({ blockchain_synced: true })
            .eq('id', newBatch.id);
        }
      } catch (blockchainError) {
        console.error('Blockchain logging failed:', blockchainError);
        toast({
          title: "Warning",
          description: "Batch created but blockchain logging failed",
          variant: "destructive"
        });
      }

      if (error) throw error;

      // Update waste reports to mark them as in processing
      await supabase
        .from('waste_reports')
        .update({ 
          status: 'processing',
          batch_id: newBatch.id 
        })
        .in('id', selectedReports);

      toast({
        title: "Success",
        description: `Batch ${batchNumber} created successfully with QR: ${qrCode}`
      });

      setShowCreateBatch(false);
      setSelectedReports([]);
      setBatchNumber('');
      fetchProcessingData();
    } catch (error) {
      console.error('Error creating batch:', error);
      toast({
        title: "Error",
        description: "Failed to create batch",
        variant: "destructive"
      });
    }
  };

  const updateBatchStatus = async (batchId: string, newStatus: ProcessingBatch['status']) => {
    try {
      await supabase
        .from('processing_batches')
        .update({ status: newStatus })
        .eq('id', batchId);

      toast({
        title: "Success",
        description: `Batch status updated to ${newStatus}`
      });

      fetchProcessingData();
    } catch (error) {
      console.error('Error updating batch status:', error);
      toast({
        title: "Error",
        description: "Failed to update batch status",
        variant: "destructive"
      });
    }
  };

  const completeBatch = async (batchId: string, outputWeight: number) => {
    try {
      await supabase
        .from('processing_batches')
        .update({ 
          status: 'completed',
          total_output_weight: outputWeight,
          completed_at: new Date().toISOString()
        })
        .eq('id', batchId);

      // Update inventory
      await supabase
        .from('inventory')
        .update({ 
          pellets_ready_kg: supabase.sql`pellets_ready_kg + ${outputWeight}`,
          last_updated: new Date().toISOString()
        })
        .eq('id', 1); // Assuming single inventory record

      // Log processing completion to blockchain
      try {
        await blockchainClient.logProcessingCompletedToBlockchain(
          batch.qrCode,
          batch.batchNumber,
          outputWeight
        );
      } catch (blockchainError) {
        console.error('Blockchain logging failed:', blockchainError);
      }

      toast({
        title: "Success",
        description: `Batch completed! ${outputWeight}kg of pellets ready for sale`
      });

      fetchProcessingData();
    } catch (error) {
      console.error('Error completing batch:', error);
      toast({
        title: "Error",
        description: "Failed to complete batch",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: ProcessingBatch['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'drying':
        return 'bg-yellow-100 text-yellow-800';
      case 'crushing':
        return 'bg-blue-100 text-blue-800';
      case 'cleaning':
        return 'bg-purple-100 text-purple-800';
      case 'pelletizing':
        return 'bg-green-100 text-green-800';
      case 'packaged':
        return 'bg-emerald-100 text-emerald-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressValue = (status: ProcessingBatch['status']) => {
    switch (status) {
      case 'pending':
        return 0;
      case 'drying':
        return 20;
      case 'crushing':
        return 40;
      case 'cleaning':
        return 60;
      case 'pelletizing':
        return 80;
      case 'packaged':
        return 90;
      case 'completed':
        return 100;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Processing Center</h1>
            <p className="text-gray-600">Manage waste processing batches and traceability</p>
          </div>
          <Dialog open={showCreateBatch} onOpenChange={setShowCreateBatch}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Create New Batch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Processing Batch</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Batch Number</label>
                  <Input
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="e.g., BATCH-2024-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Select Waste Reports</label>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {availableReports.map((report) => (
                      <div key={report.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedReports.includes(report.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedReports([...selectedReports, report.id]);
                            } else {
                              setSelectedReports(selectedReports.filter(id => id !== report.id));
                            }
                          }}
                        />
                        <span className="text-sm">
                          {report.farmer?.full_name} - {report.waste_type} ({report.quantity_kg}kg) - {report.location}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateBatch(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createNewBatch}>
                    Create Batch
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Active Batches</p>
                  <p className="text-2xl font-bold">{batches.filter(b => b.status !== 'completed').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Factory className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Input</p>
                  <p className="text-2xl font-bold">
                    {batches.reduce((sum, b) => sum + b.totalInputWeight, 0)}kg
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <QrCode className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Pellets Ready</p>
                  <p className="text-2xl font-bold">
                    {batches.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.totalOutputWeight, 0)}kg
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Farmers Involved</p>
                  <p className="text-2xl font-bold">
                    {new Set(batches.flatMap(b => b.traceabilityData.farmerNames)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Processing Batches */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Processing Batches</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {batches.map((batch) => (
              <Card key={batch.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <Package className="h-5 w-5" />
                        <span>{batch.batchNumber}</span>
                      </CardTitle>
                      <p className="text-sm text-gray-600">QR: {batch.qrCode}</p>
                    </div>
                    <Badge className={getStatusColor(batch.status)}>
                      {batch.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{getProgressValue(batch.status)}%</span>
                    </div>
                    <Progress value={getProgressValue(batch.status)} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Input Weight</p>
                      <p className="font-semibold">{batch.totalInputWeight}kg</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Output Weight</p>
                      <p className="font-semibold">{batch.totalOutputWeight || 0}kg</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Contributing Farmers:</p>
                    <div className="flex flex-wrap gap-1">
                      {batch.traceabilityData.farmerNames.map((name, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {batch.status !== 'completed' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            const statuses = ['pending', 'drying', 'crushing', 'cleaning', 'pelletizing', 'packaged', 'completed'];
                            const currentIndex = statuses.indexOf(batch.status);
                            if (currentIndex < statuses.length - 1) {
                              updateBatchStatus(batch.id, statuses[currentIndex + 1] as ProcessingBatch['status']);
                            }
                          }}
                        >
                          Next Step
                        </Button>
                        {batch.status === 'packaged' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const outputWeight = Math.round(batch.totalInputWeight * 0.7); // 70% yield
                              completeBatch(batch.id, outputWeight);
                            }}
                          >
                            Complete Batch
                          </Button>
                        )}
                      </>
                    )}
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 