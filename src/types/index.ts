
export interface Farmer {
  id: string;
  name: string;
  phoneNumber: string;
  location: string;
  region: string;
  totalEarnings: number;
  totalWasteSubmitted: number;
  joinedDate: string;
  isActive: boolean;
}

export interface WasteReport {
  id: string;
  farmerId: string;
  farmerName: string;
  wasteType: 'organic' | 'crop_residue' | 'animal_waste' | 'food_waste';
  quantity: number; // in kg
  location: string;
  region: string;
  status: 'pending' | 'assigned' | 'collected' | 'rejected';
  reportedAt: string;
  collectedAt?: string;
  assignedAgent?: string;
  notes?: string;
  estimatedValue: number; // in KSh
}

export interface Payment {
  id: string;
  farmerId: string;
  farmerName: string;
  wasteReportId: string;
  amount: number; // in KSh
  paymentMethod: 'mpesa' | 'bank_transfer' | 'cash';
  status: 'pending' | 'completed' | 'failed';
  transactionId?: string;
  paidAt: string;
  notes?: string;
}

export interface DashboardStats {
  totalFarmers: number;
  wasteReportsToday: number;
  wasteCollectedKg: number;
  totalPaidKsh: number;
  pendingReports: number;
  activeAgents: number;
}
