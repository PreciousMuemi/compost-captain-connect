
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
import { AdminPaymentModal } from "@/components/AdminPaymentModal";

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
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<{ id: string; name: string; phone_number: string } | null>(null);
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

  const handleMpesaPayment = (farmerId: string, farmerName: string, phoneNumber: string) => {
    setSelectedFarmer({ id: farmerId, name: farmerName, phone_number: phoneNumber });
    setIsPaymentModalOpen(true);
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
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payments</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage farmer payments and track transaction history.</p>
            </div>
            
            <Select value="" onValueChange={(farmerId) => {
              const farmer = farmers.find(f => f.id === farmerId);
              if (farmer) handleMpesaPayment(farmer.id, farmer.full_name, farmer.phone_number);
            }}>
              <SelectTrigger className="bg-green-600 hover:bg-green-700 text-white border-green-600 px-6 py-2 rounded-lg transition-colors duration-200 font-medium">
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
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalPaid)}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Paid</p>
                </div>
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingAmount)}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                </div>
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{pendingCount}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending Count</p>
                </div>
                <div className="h-12 w-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by farmer name or transaction ID..."
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
            <Card key={payment.id} className="bg-white dark:bg-gray-800 shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <Smartphone className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{payment.farmer?.full_name || 'Unknown'}</h3>
                        <Badge className={`${getStatusColor(payment.status || 'pending')} dark:bg-opacity-20`}>
                          {payment.status}
                        </Badge>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1 gap-4">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(payment.created_at || '')}
                        </span>
                        <span className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-1" />
                          {payment.payment_type.replace('_', ' ')}
                        </span>
                        {payment.mpesa_transaction_id && (
                          <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {payment.mpesa_transaction_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(payment.amount)}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {payment.status === 'pending' && (
                        <>
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
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
          <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
            <CardContent className="p-12 text-center">
              <DollarSign className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No payments found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your search criteria or create a new payment.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Admin Payment Modal */}
      <AdminPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        farmer={selectedFarmer}
        onSuccess={fetchPayments}
      />
    </div>
  );
}
