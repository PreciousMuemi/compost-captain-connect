
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Plus, Calendar, User, CreditCard, CheckCircle, Clock, X } from "lucide-react";
import { mockPayments, mockFarmers } from "../data/mockData";
import { Payment } from "../types";
import { useToast } from "@/hooks/use-toast";

const getStatusColor = (status: Payment['status']) => {
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

const getMethodIcon = (method: Payment['paymentMethod']) => {
  switch (method) {
    case 'mpesa':
      return '📱';
    case 'bank_transfer':
      return '🏦';
    case 'cash':
      return '💵';
    default:
      return '💳';
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
  const [payments, setPayments] = useState<Payment[]>(mockPayments);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // New payment form state
  const [newPayment, setNewPayment] = useState({
    farmerId: "",
    amount: "",
    paymentMethod: "mpesa" as Payment['paymentMethod'],
    transactionId: "",
    notes: "",
  });

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = payment.farmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    const matchesMethod = methodFilter === "all" || payment.paymentMethod === methodFilter;
    
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const handleCreatePayment = () => {
    if (!newPayment.farmerId || !newPayment.amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const farmer = mockFarmers.find(f => f.id === newPayment.farmerId);
    if (!farmer) return;

    const payment: Payment = {
      id: (payments.length + 1).toString(),
      farmerId: newPayment.farmerId,
      farmerName: farmer.name,
      wasteReportId: "manual-" + Date.now(),
      amount: parseFloat(newPayment.amount),
      paymentMethod: newPayment.paymentMethod,
      status: 'pending',
      transactionId: newPayment.transactionId || undefined,
      paidAt: new Date().toISOString(),
      notes: newPayment.notes || undefined,
    };

    setPayments(prev => [payment, ...prev]);
    setNewPayment({
      farmerId: "",
      amount: "",
      paymentMethod: "mpesa",
      transactionId: "",
      notes: "",
    });
    setIsDialogOpen(false);
    
    toast({
      title: "Payment Created",
      description: `Payment of ${formatCurrency(payment.amount)} created for ${farmer.name}`,
    });
  };

  const updatePaymentStatus = (paymentId: string, newStatus: Payment['status']) => {
    setPayments(prev => prev.map(payment => 
      payment.id === paymentId 
        ? { ...payment, status: newStatus }
        : payment
    ));
    
    toast({
      title: "Status Updated",
      description: `Payment status has been updated to ${newStatus}`,
    });
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
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              New Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="farmer">Farmer</Label>
                <Select value={newPayment.farmerId} onValueChange={(value) => setNewPayment(prev => ({ ...prev, farmerId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select farmer" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockFarmers.map(farmer => (
                      <SelectItem key={farmer.id} value={farmer.id}>
                        {farmer.name} - {farmer.phoneNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Amount (KSh)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="method">Payment Method</Label>
                <Select value={newPayment.paymentMethod} onValueChange={(value: Payment['paymentMethod']) => setNewPayment(prev => ({ ...prev, paymentMethod: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="transactionId">Transaction ID (Optional)</Label>
                <Input
                  id="transactionId"
                  placeholder="Enter transaction ID"
                  value={newPayment.transactionId}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, transactionId: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes..."
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCreatePayment} className="flex-1">
                  Create Payment
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
              
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </div>

      {/* Payments List */}
      <div className="space-y-4">
        {filteredPayments.map((payment) => (
          <Card key={payment.id} className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">{getMethodIcon(payment.paymentMethod)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{payment.farmerName}</h3>
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mt-1 gap-4">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(payment.paidAt)}
                      </span>
                      <span className="flex items-center">
                        <CreditCard className="h-4 w-4 mr-1" />
                        {payment.paymentMethod.replace('_', ' ')}
                      </span>
                      {payment.transactionId && (
                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                          {payment.transactionId}
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
              
              {payment.notes && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">{payment.notes}</p>
                </div>
              )}
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
    </div>
  );
}
