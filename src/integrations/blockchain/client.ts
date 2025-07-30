import { ethers } from 'ethers';
import { supabase } from '../supabase/client';

// Smart contract ABIs
const TRACEABILITY_ABI = [
  "event ProductRegistered(string qrCode, uint256 batchId, string productType, uint256 quantity)",
  "event TransactionCreated(uint256 transactionId, address from, address to, uint256 amount, string transactionType)",
  "event SupplyChainEventLogged(uint256 eventId, string eventType, string qrCode, address farmer, uint256 quantity)",
  "event PaymentProcessed(uint256 transactionId, address farmer, uint256 amount, string paymentMethod)",
  "event WasteReported(address farmer, string wasteType, uint256 quantity, string location)",
  "event ProcessingStarted(string qrCode, uint256 batchId, uint256 inputWeight)",
  "event ProcessingCompleted(string qrCode, uint256 batchId, uint256 outputWeight)",
  "event ProductSold(string qrCode, address buyer, uint256 quantity, uint256 totalAmount)",
  
  "function registerProduct(string qrCode, uint256 batchId, address[] farmers, string[] locations, string productType, uint256 quantity, uint256 pricePerKg) public",
  "function logWasteReport(address farmer, string wasteType, uint256 quantity, string location) public",
  "function logWasteCollection(address farmer, string qrCode, uint256 quantity, string location) public",
  "function logProcessingStarted(string qrCode, uint256 batchId, uint256 inputWeight) public",
  "function logProcessingCompleted(string qrCode, uint256 batchId, uint256 outputWeight) public",
  "function createTransaction(address from, address to, uint256 amount, string transactionType, string description) public returns (uint256)",
  "function processPayment(uint256 transactionId, address farmer, uint256 amount, string paymentMethod) public",
  "function logProductSale(string qrCode, address buyer, uint256 quantity, uint256 totalAmount) public",
  "function verifyProduct(string qrCode) public view returns (tuple)",
  "function getFarmerTransactions(address farmer) public view returns (uint256[])",
  "function getFarmerEvents(address farmer) public view returns (uint256[])",
  "function getTransaction(uint256 transactionId) public view returns (tuple)",
  "function getSupplyChainEvent(uint256 eventId) public view returns (tuple)",
  "function getProductTraceability(string qrCode) public view returns (tuple, uint256[])"
];

const WASTE_REPORT_ABI = [
  "event ReportCreated(uint256 id, address farmer, string wasteType, uint256 quantity)",
  "function createReport(string wasteType, uint256 quantity, string location, string phoneNumber) public",
  "function getFarmerReports(address farmer) public view returns (uint256[])"
];

const PROCESSING_BATCH_ABI = [
  "event BatchCreated(uint256 id, string batchNumber, string qrCode)",
  "event BatchCompleted(uint256 id, uint256 outputWeight)",
  "function createBatch(string batchNumber, uint256[] wasteReportIds, string qrCode, address[] farmers) public",
  "function completeBatch(uint256 batchId, uint256 outputWeight) public"
];

class BlockchainClient {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private traceabilityContract: ethers.Contract | null = null;
  private wasteReportContract: ethers.Contract | null = null;
  private processingBatchContract: ethers.Contract | null = null;

  constructor() {
    this.initializeProvider();
  }

  private async initializeProvider() {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.signer = this.provider.getSigner();
        
        // Initialize contracts (replace with actual deployed addresses)
        const TRACEABILITY_ADDRESS = process.env.REACT_APP_TRACEABILITY_ADDRESS || '0x...';
        const WASTE_REPORT_ADDRESS = process.env.REACT_APP_WASTE_REPORT_ADDRESS || '0x...';
        const PROCESSING_BATCH_ADDRESS = process.env.REACT_APP_PROCESSING_BATCH_ADDRESS || '0x...';
        
        this.traceabilityContract = new ethers.Contract(TRACEABILITY_ADDRESS, TRACEABILITY_ABI, this.signer);
        this.wasteReportContract = new ethers.Contract(WASTE_REPORT_ADDRESS, WASTE_REPORT_ABI, this.signer);
        this.processingBatchContract = new ethers.Contract(PROCESSING_BATCH_ADDRESS, PROCESSING_BATCH_ABI, this.signer);
      } catch (error) {
        console.error('Failed to initialize blockchain provider:', error);
      }
    }
  }

  async connectWallet(): Promise<string | null> {
    try {
      if (!this.provider) {
        await this.initializeProvider();
      }
      
      if (this.provider) {
        await this.provider.send('eth_requestAccounts', []);
        const address = await this.signer?.getAddress();
        return address || null;
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
    return null;
  }

  async logWasteReportToBlockchain(
    farmerAddress: string,
    wasteType: string,
    quantity: number,
    location: string
  ): Promise<boolean> {
    try {
      if (!this.wasteReportContract) {
        throw new Error('Blockchain not connected');
      }

      const tx = await this.wasteReportContract.createReport(
        wasteType,
        ethers.utils.parseUnits(quantity.toString(), 18), // Convert to wei
        location,
        '' // phoneNumber (can be empty for blockchain)
      );

      await tx.wait();
      
      // Also log to traceability contract
      if (this.traceabilityContract) {
        await this.traceabilityContract.logWasteReport(
          farmerAddress,
          wasteType,
          ethers.utils.parseUnits(quantity.toString(), 18),
          location
        );
      }

      return true;
    } catch (error) {
      console.error('Failed to log waste report to blockchain:', error);
      return false;
    }
  }

  async logProcessingBatchToBlockchain(
    batchNumber: string,
    wasteReportIds: string[],
    qrCode: string,
    farmers: string[]
  ): Promise<boolean> {
    try {
      if (!this.processingBatchContract) {
        throw new Error('Blockchain not connected');
      }

      const tx = await this.processingBatchContract.createBatch(
        batchNumber,
        wasteReportIds.map(id => ethers.BigNumber.from(id)),
        qrCode,
        farmers
      );

      await tx.wait();
      return true;
    } catch (error) {
      console.error('Failed to log processing batch to blockchain:', error);
      return false;
    }
  }

  async logProductToBlockchain(
    qrCode: string,
    batchId: number,
    farmers: string[],
    locations: string[],
    productType: string,
    quantity: number,
    pricePerKg: number
  ): Promise<boolean> {
    try {
      if (!this.traceabilityContract) {
        throw new Error('Blockchain not connected');
      }

      const tx = await this.traceabilityContract.registerProduct(
        qrCode,
        batchId,
        farmers,
        locations,
        productType,
        ethers.utils.parseUnits(quantity.toString(), 18),
        ethers.utils.parseUnits(pricePerKg.toString(), 18)
      );

      await tx.wait();
      return true;
    } catch (error) {
      console.error('Failed to log product to blockchain:', error);
      return false;
    }
  }

  async createTransactionOnBlockchain(
    from: string,
    to: string,
    amount: number,
    transactionType: string,
    description: string
  ): Promise<number | null> {
    try {
      if (!this.traceabilityContract) {
        throw new Error('Blockchain not connected');
      }

      const tx = await this.traceabilityContract.createTransaction(
        from,
        to,
        ethers.utils.parseUnits(amount.toString(), 18),
        transactionType,
        description
      );

      const receipt = await tx.wait();
      
      // Parse the transaction ID from the event
      const event = receipt.events?.find(e => e.event === 'TransactionCreated');
      return event ? event.args?.transactionId?.toNumber() : null;
    } catch (error) {
      console.error('Failed to create transaction on blockchain:', error);
      return null;
    }
  }

  async processPaymentOnBlockchain(
    transactionId: number,
    farmer: string,
    amount: number,
    paymentMethod: string
  ): Promise<boolean> {
    try {
      if (!this.traceabilityContract) {
        throw new Error('Blockchain not connected');
      }

      const tx = await this.traceabilityContract.processPayment(
        transactionId,
        farmer,
        ethers.utils.parseUnits(amount.toString(), 18),
        paymentMethod
      );

      await tx.wait();
      return true;
    } catch (error) {
      console.error('Failed to process payment on blockchain:', error);
      return false;
    }
  }

  async getProductTraceability(qrCode: string): Promise<any> {
    try {
      if (!this.traceabilityContract) {
        throw new Error('Blockchain not connected');
      }

      const result = await this.traceabilityContract.getProductTraceability(qrCode);
      return {
        product: result[0],
        events: result[1]
      };
    } catch (error) {
      console.error('Failed to get product traceability:', error);
      return null;
    }
  }

  async getFarmerTransactions(farmerAddress: string): Promise<any[]> {
    try {
      if (!this.traceabilityContract) {
        throw new Error('Blockchain not connected');
      }

      const transactionIds = await this.traceabilityContract.getFarmerTransactions(farmerAddress);
      const transactions = [];

      for (const id of transactionIds) {
        const tx = await this.traceabilityContract.getTransaction(id);
        transactions.push(tx);
      }

      return transactions;
    } catch (error) {
      console.error('Failed to get farmer transactions:', error);
      return [];
    }
  }

  // Sync database events with blockchain
  async syncDatabaseToBlockchain() {
    try {
      // Sync waste reports
      const { data: wasteReports } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('blockchain_synced', false);

      for (const report of wasteReports || []) {
        const success = await this.logWasteReportToBlockchain(
          report.farmer_id,
          report.waste_type,
          report.quantity_kg,
          report.location
        );

        if (success) {
          await supabase
            .from('waste_reports')
            .update({ blockchain_synced: true })
            .eq('id', report.id);
        }
      }

      // Sync processing batches
      const { data: processingBatches } = await supabase
        .from('processing_batches')
        .select('*')
        .eq('blockchain_synced', false);

      for (const batch of processingBatches || []) {
        const success = await this.logProcessingBatchToBlockchain(
          batch.batch_number,
          batch.waste_report_ids,
          batch.qr_code,
          batch.traceability_data?.farmerNames || []
        );

        if (success) {
          await supabase
            .from('processing_batches')
            .update({ blockchain_synced: true })
            .eq('id', batch.id);
        }
      }

      // Sync products
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('blockchain_synced', false);

      for (const product of products || []) {
        const { data: batch } = await supabase
          .from('processing_batches')
          .select('*')
          .eq('id', product.batch_id)
          .single();

        if (batch) {
          const success = await this.logProductToBlockchain(
            product.qr_code,
            parseInt(batch.batch_number.split('-')[2]),
            batch.traceability_data?.farmerNames || [],
            batch.traceability_data?.locations || [],
            product.name,
            product.available_kg,
            product.price_per_kg
          );

          if (success) {
            await supabase
              .from('products')
              .update({ blockchain_synced: true })
              .eq('id', product.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to sync database to blockchain:', error);
    }
  }
}

export const blockchainClient = new BlockchainClient(); 