
import { Farmer, WasteReport, Payment, DashboardStats } from '../types';

// Mock data for development - replace with real API calls
export const mockFarmers: Farmer[] = [
  {
    id: '1',
    name: 'John Kamau',
    phoneNumber: '+254712345678',
    location: 'Kiambu County',
    region: 'Central',
    totalEarnings: 15750,
    totalWasteSubmitted: 450,
    joinedDate: '2024-01-15',
    isActive: true,
  },
  {
    id: '2',
    name: 'Mary Wanjiku',
    phoneNumber: '+254723456789',
    location: 'Nakuru County',
    region: 'Rift Valley',
    totalEarnings: 12300,
    totalWasteSubmitted: 380,
    joinedDate: '2024-02-20',
    isActive: true,
  },
  {
    id: '3',
    name: 'Peter Ochieng',
    phoneNumber: '+254734567890',
    location: 'Kisumu County',
    region: 'Nyanza',
    totalEarnings: 8900,
    totalWasteSubmitted: 250,
    joinedDate: '2024-03-10',
    isActive: false,
  },
];

export const mockWasteReports: WasteReport[] = [
  {
    id: '1',
    farmerId: '1',
    farmerName: 'John Kamau',
    wasteType: 'crop_residue',
    quantity: 45,
    location: 'Kiambu County',
    region: 'Central',
    status: 'reported',
    reportedAt: '2024-07-14T08:30:00Z',
    estimatedValue: 1350,
  },
  {
    id: '2',
    farmerId: '2',
    farmerName: 'Mary Wanjiku',
    wasteType: 'organic',
    quantity: 32,
    location: 'Nakuru County',
    region: 'Rift Valley',
    status: 'scheduled',
    reportedAt: '2024-07-14T10:15:00Z',
    assignedAgent: 'Agent Mike',
    estimatedValue: 960,
  },
  {
    id: '3',
    farmerId: '3',
    farmerName: 'Peter Ochieng',
    wasteType: 'animal_waste',
    quantity: 28,
    location: 'Kisumu County',
    region: 'Nyanza',
    status: 'collected',
    reportedAt: '2024-07-13T14:20:00Z',
    collectedAt: '2024-07-14T09:00:00Z',
    assignedAgent: 'Agent Sarah',
    estimatedValue: 840,
  },
];

export const mockPayments: Payment[] = [
  {
    id: '1',
    farmerId: '1',
    farmerName: 'John Kamau',
    wasteReportId: '3',
    amount: 840,
    paymentMethod: 'mpesa',
    status: 'completed',
    transactionId: 'MPX123456789',
    paidAt: '2024-07-14T11:30:00Z',
  },
  {
    id: '2',
    farmerId: '2',
    farmerName: 'Mary Wanjiku',
    wasteReportId: '2',
    amount: 960,
    paymentMethod: 'bank_transfer',
    status: 'pending',
    paidAt: '2024-07-14T12:00:00Z',
  },
];

export const mockDashboardStats: DashboardStats = {
  totalFarmers: 847,
  wasteReportsToday: 23,
  wasteCollectedKg: 12450,
  totalPaidKsh: 287500,
  pendingReports: 15,
  activeAgents: 8,
};
