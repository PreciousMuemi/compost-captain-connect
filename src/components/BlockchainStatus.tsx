import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { blockchainClient } from "@/integrations/blockchain/client";
import { 
  Link, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Database,
  Blockchain
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BlockchainStats {
  totalSynced: number;
  totalPending: number;
  totalTransactions: number;
  totalEvents: number;
}

export default function BlockchainStatus() {
  const [stats, setStats] = useState<BlockchainStats>({
    totalSynced: 0,
    totalPending: 0,
    totalTransactions: 0,
    totalEvents: 0,
  });
  const [loading, setLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBlockchainStats();
  }, []);

  const fetchBlockchainStats = async () => {
    try {
      const [
        { data: syncedWasteReports },
        { data: pendingWasteReports },
        { data: syncedBatches },
        { data: pendingBatches },
        { data: syncedProducts },
        { data: pendingProducts },
        { data: transactions },
        { data: events }
      ] = await Promise.all([
        supabase.from('waste_reports').select('id').eq('blockchain_synced', true),
        supabase.from('waste_reports').select('id').eq('blockchain_synced', false),
        supabase.from('processing_batches').select('id').eq('blockchain_synced', true),
        supabase.from('processing_batches').select('id').eq('blockchain_synced', false),
        supabase.from('products').select('id').eq('blockchain_synced', true),
        supabase.from('products').select('id').eq('blockchain_synced', false),
        supabase.from('blockchain_transactions').select('*'),
        supabase.from('blockchain_events').select('*')
      ]);

      setStats({
        totalSynced: (syncedWasteReports?.length || 0) + (syncedBatches?.length || 0) + (syncedProducts?.length || 0),
        totalPending: (pendingWasteReports?.length || 0) + (pendingBatches?.length || 0) + (pendingProducts?.length || 0),
        totalTransactions: transactions?.length || 0,
        totalEvents: events?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching blockchain stats:', error);
    }
  };

  const connectWallet = async () => {
    setLoading(true);
    try {
      const address = await blockchainClient.connectWallet();
      if (address) {
        setWalletConnected(true);
        toast({
          title: "Success",
          description: `Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to connect wallet",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast({
        title: "Error",
        description: "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncToBlockchain = async () => {
    setLoading(true);
    try {
      await blockchainClient.syncDatabaseToBlockchain();
      await fetchBlockchainStats();
      toast({
        title: "Success",
        description: "Database synced to blockchain",
      });
    } catch (error) {
      console.error('Error syncing to blockchain:', error);
      toast({
        title: "Error",
        description: "Failed to sync to blockchain",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Blockchain className="h-5 w-5" />
          Blockchain Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalSynced}</div>
            <div className="text-sm text-gray-600">Synced Records</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.totalPending}</div>
            <div className="text-sm text-gray-600">Pending Sync</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalTransactions}</div>
            <div className="text-sm text-gray-600">Transactions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalEvents}</div>
            <div className="text-sm text-gray-600">Events</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={walletConnected ? "default" : "secondary"}>
            {walletConnected ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Wallet Connected
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Wallet Disconnected
              </>
            )}
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={connectWallet}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Database className="h-4 w-4 mr-1" />
            )}
            Connect Wallet
          </Button>
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={syncToBlockchain}
            disabled={loading || !walletConnected}
            className="flex-1"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Link className="h-4 w-4 mr-1" />
            )}
            Sync to Blockchain
          </Button>
        </div>

        {stats.totalPending > 0 && (
          <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
            {stats.totalPending} records pending blockchain sync
          </div>
        )}
      </CardContent>
    </Card>
  );
} 