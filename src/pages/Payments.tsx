
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Plus, Calendar, User, CreditCard, CheckCircle, Clock, X, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { MpesaPaymentModal } from "@/components/MpesaPaymentModal";

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'failed':
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

export default function Payments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<Tables<'profiles'>[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isMpesaModalOpen, setIsMpesaModalOpen] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
    fetchFarmers();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          farmer:profiles(full_name, phone_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payments",
        variant: "destructive",
      });
    }
  };

  const fetchFarmers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'farmer')
        .order('full_name');

      if (error) throw error;
      setFarmers(data || []);
    } catch (error) {
      console.error('Error fetching farmers:', error);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const farmerName = payment.farmer?.full_name || '';
    const matchesSearch = farmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.mpesa_transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleMpesaPayment = (farmerId: string, farmerName: string) => {
    setSelectedFarmer({ id: farmerId, name: farmerName });
    setIsMpesaModalOpen(true);
  };

  const updatePaymentStatus = async (paymentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: newStatus as any })
        .eq('id', paymentId);

      if (error) throw error;

      setPayments(prev => prev.map(payment => 
        payment.id === paymentId 
          ? { ...payment, status: newStatus as any }
          : payment
      ));
      
      toast({
        title: "Status Updated",
        description: `Payment status has been updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    }
  };

  // Calculate stats
  const totalPaid = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const completedCount = payments.filter(p => p.status === 'completed').length;
  const pendingCount = payments.filter(p => p.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-1">Manage farmer payments and track transaction history.</p>
        </div>
        
        <Select value="" onValueChange={(farmerId) => {
          const farmer = farmers.find(f => f.id === farmerId);
          if (farmer) handleMpesaPayment(farmer.id, farmer.full_name);
        }}>
          <SelectTrigger className="bg-primary hover:bg-primary/90 text-primary-foreground border-primary">
            <Smartphone className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Send M-Pesa Payment" />
          </SelectTrigger>
          <SelectContent>
            {farmers.map(farmer => (
              <SelectItem key={farmer.id} value={farmer.id}>
                {farmer.full_name} - {farmer.phone_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalPaid)}</div>
                <p className="text-sm text-gray-600">Total Paid</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingAmount)}</div>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-600">{pendingCount}</div>
                <p className="text-sm text-gray-600">Pending Count</p>
              </div>
              <Clock className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by farmer name or transaction ID..."
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
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <div className="space-y-4">
        {filteredPayments.map((payment) => (
          <Card key={payment.id} className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                  <div className="text-2xl">📱</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{payment.farmer?.full_name || 'Unknown'}</h3>
                      <Badge className={getStatusColor(payment.status || 'pending')}>
                        {payment.status}
                      </Badge>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mt-1 gap-4">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(payment.created_at || '')}
                      </span>
                      <span className="flex items-center">
                        <CreditCard className="h-4 w-4 mr-1" />
                        {payment.payment_type.replace('_', ' ')}
                      </span>
                      {payment.mpesa_transaction_id && (
                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                          {payment.mpesa_transaction_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(payment.amount)}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {payment.status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => updatePaymentStatus(payment.id, 'completed')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => updatePaymentStatus(payment.id, 'failed')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Fail
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPayments.length === 0 && (
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or create a new payment.</p>
          </CardContent>
        </Card>
      )}
      
      <MpesaPaymentModal
        isOpen={isMpesaModalOpen}
        onClose={() => setIsMpesaModalOpen(false)}
        farmerId={selectedFarmer?.id}
        farmerName={selectedFarmer?.name}
        onSuccess={fetchPayments}
      />
    </div>
  );
}
