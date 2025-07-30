import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ShoppingCart, 
  Users, 
  DollarSign, 
  TrendingUp,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  QrCode
} from "lucide-react";
import { Sale, Customer } from "../types";

// Mock sales data
const mockSales: Sale[] = [
  {
    id: "1",
    customerId: "CUST-001",
    customerName: "Mary Wanjiku",
    customerType: "farmer",
    inventoryItemIds: ["1", "2"],
    totalAmount: 45000,
    paymentMethod: "mpesa",
    status: "completed",
    soldAt: "2024-01-15T10:30:00Z",
    deliveryAddress: "Kisii, Kenya",
    mpesaTransactionId: "MPESA-123456"
  },
  {
    id: "2",
    customerId: "CUST-002",
    customerName: "Agrovet Plus",
    customerType: "agrovet",
    inventoryItemIds: ["3"],
    totalAmount: 300000,
    paymentMethod: "bank_transfer",
    status: "pending",
    soldAt: "2024-01-16T14:20:00Z",
    deliveryAddress: "Nairobi, Kenya"
  },
  {
    id: "3",
    customerId: "CUST-003",
    customerName: "John Kamau",
    customerType: "farmer",
    inventoryItemIds: ["1"],
    totalAmount: 15000,
    paymentMethod: "mpesa",
    status: "completed",
    soldAt: "2024-01-17T09:15:00Z",
    deliveryAddress: "Murang'a, Kenya",
    mpesaTransactionId: "MPESA-789012"
  }
];

// Mock customers data
const mockCustomers: Customer[] = [
  {
    id: "CUST-001",
    name: "Mary Wanjiku",
    phoneNumber: "+254712345678",
    customerType: "farmer",
    location: "Kisii",
    region: "Western",
    totalPurchases: 3,
    joinedDate: "2023-06-15",
    isActive: true
  },
  {
    id: "CUST-002",
    name: "Agrovet Plus",
    phoneNumber: "+254723456789",
    customerType: "agrovet",
    location: "Nairobi",
    region: "Central",
    totalPurchases: 12,
    joinedDate: "2023-03-20",
    isActive: true
  },
  {
    id: "CUST-003",
    name: "John Kamau",
    phoneNumber: "+254734567890",
    customerType: "farmer",
    location: "Murang'a",
    region: "Central",
    totalPurchases: 5,
    joinedDate: "2023-08-10",
    isActive: true
  }
];

const getStatusColor = (status: Sale['status']) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getCustomerTypeLabel = (type: Customer['customerType']) => {
  switch (type) {
    case 'farmer':
      return 'Farmer';
    case 'agrovet':
      return 'Agrovet';
    case 'wholesaler':
      return 'Wholesaler';
    default:
      return type;
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
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function Sales() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales & Customers</h1>
          <p className="text-gray-600 mt-1">Manage customer orders and track sales performance</p>
        </div>
        <Button>
          <ShoppingCart className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>

      {/* Sales Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(360000)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Orders Today</p>
                <p className="text-2xl font-bold text-gray-900">8</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Customers</p>
                <p className="text-2xl font-bold text-gray-900">156</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Growth</p>
                <p className="text-2xl font-bold text-gray-900">+23%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockSales.map((sale) => (
              <div key={sale.id} className="border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(sale.status)}>
                      {sale.status}
                    </Badge>
                    <h3 className="text-lg font-semibold">{sale.customerName}</h3>
                    <Badge variant="outline">
                      {getCustomerTypeLabel(sale.customerType)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button size="sm" variant="outline">
                      <QrCode className="h-4 w-4 mr-1" />
                      Trace Products
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="text-sm text-gray-600">Total Amount</span>
                      <p className="font-medium">{formatCurrency(sale.totalAmount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="text-sm text-gray-600">Payment Method</span>
                      <p className="font-medium">{sale.paymentMethod}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="text-sm text-gray-600">Delivery</span>
                      <p className="font-medium">{sale.deliveryAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="text-sm text-gray-600">Order Date</span>
                      <p className="font-medium">{formatDate(sale.soldAt)}</p>
                    </div>
                  </div>
                </div>

                {sale.mpesaTransactionId && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>M-Pesa: {sale.mpesaTransactionId}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockCustomers.map((customer) => (
              <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{customer.name}</h3>
                    <p className="text-sm text-gray-600">
                      {getCustomerTypeLabel(customer.customerType)} • {customer.location}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{customer.totalPurchases} orders</p>
                  <p className="text-sm text-gray-600">Since {new Date(customer.joinedDate).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sales Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">M-Pesa</span>
                <span className="font-medium">65%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Bank Transfer</span>
                <span className="font-medium">25%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Cash</span>
                <span className="font-medium">10%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Farmers</span>
                <span className="font-medium">70%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Agrovets</span>
                <span className="font-medium">25%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Wholesalers</span>
                <span className="font-medium">5%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 