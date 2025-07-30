import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Package, 
  QrCode, 
  Search, 
  Filter,
  ShoppingCart,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Eye
} from "lucide-react";
import { InventoryItem } from "../types";

// Mock inventory data
const mockInventory: InventoryItem[] = [
  {
    id: "1",
    batchId: "BATCH-2024-001",
    productType: "manure_pellets",
    quantity: 1500,
    packageSize: 25,
    pricePerKg: 120,
    location: "Nairobi Warehouse",
    status: "available",
    qrCode: "QR-INV-001",
    expiryDate: "2024-06-15"
  },
  {
    id: "2",
    batchId: "BATCH-2024-002",
    productType: "compost",
    quantity: 800,
    packageSize: 50,
    pricePerKg: 80,
    location: "Kisumu Depot",
    status: "available",
    qrCode: "QR-INV-002",
    expiryDate: "2024-05-20"
  },
  {
    id: "3",
    batchId: "BATCH-2024-003",
    productType: "organic_fertilizer",
    quantity: 2000,
    packageSize: 10,
    pricePerKg: 150,
    location: "Mombasa Warehouse",
    status: "reserved",
    qrCode: "QR-INV-003",
    expiryDate: "2024-07-10"
  }
];

const getStatusColor = (status: InventoryItem['status']) => {
  switch (status) {
    case 'available':
      return 'bg-green-100 text-green-800';
    case 'reserved':
      return 'bg-yellow-100 text-yellow-800';
    case 'sold':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getProductTypeLabel = (type: InventoryItem['productType']) => {
  switch (type) {
    case 'manure_pellets':
      return 'Manure Pellets';
    case 'compost':
      return 'Compost';
    case 'organic_fertilizer':
      return 'Organic Fertilizer';
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

export default function Inventory() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Track packaged products and manage traceability</p>
        </div>
        <Button>
          <Package className="h-4 w-4 mr-2" />
          Add New Product
        </Button>
      </div>

      {/* Inventory Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Inventory</p>
                <p className="text-2xl font-bold text-gray-900">4,300 kg</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available Stock</p>
                <p className="text-2xl font-bold text-gray-900">2,300 kg</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">KSh 516K</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Traceable Items</p>
                <p className="text-2xl font-bold text-gray-900">156</p>
              </div>
              <QrCode className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by batch ID, QR code, or location..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockInventory.map((item) => (
              <div key={item.id} className="border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                    <h3 className="text-lg font-semibold">{item.batchId}</h3>
                    <span className="text-sm text-gray-500">
                      {getProductTypeLabel(item.productType)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      <QrCode className="h-4 w-4 mr-1" />
                      View QR
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      Trace
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="text-sm text-gray-600">Quantity</span>
                      <p className="font-medium">{item.quantity}kg</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="text-sm text-gray-600">Package Size</span>
                      <p className="font-medium">{item.packageSize}kg</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="text-sm text-gray-600">Price per kg</span>
                      <p className="font-medium">{formatCurrency(item.pricePerKg)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="text-sm text-gray-600">Location</span>
                      <p className="font-medium">{item.location}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <QrCode className="h-3 w-3" />
                      <span>{item.qrCode}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Expires: {new Date(item.expiryDate!).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total Value</p>
                    <p className="font-bold text-lg">{formatCurrency(item.quantity * item.pricePerKg)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Traceability Info */}
      <Card>
        <CardHeader>
          <CardTitle>Traceability Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <QrCode className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">QR Code Scanning</h3>
              <p className="text-sm text-gray-600">
                Each package has a unique QR code for instant traceability
              </p>
            </div>
            <div className="text-center">
              <Users className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Farmer Tracking</h3>
              <p className="text-sm text-gray-600">
                See exactly which farmers contributed to each batch
              </p>
            </div>
            <div className="text-center">
              <MapPin className="h-12 w-12 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Location History</h3>
              <p className="text-sm text-gray-600">
                Track the journey from farm to final product
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 