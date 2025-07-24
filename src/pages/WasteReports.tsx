import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, Calendar, Scale } from "lucide-react";

export default function WasteReports() {
  const { profile } = useAuth();
  const [reports, setReports] = useState([]);

  useEffect(() => {
    if (profile?.id) {
      supabase
        .from("waste_reports")
        .select("*")
        .eq("farmer_id", profile.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setReports(data || []));
    }
  }, [profile]);

    return (
    <div className="p-4 md:p-6">
        <Card>
          <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            My Waste Reports
          </CardTitle>
          </CardHeader>
          <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p>No reports found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((report: any) => (
                <Card key={report.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <Badge 
                        variant={report.status === 'collected' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {report.status}
                      </Badge>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-foreground">
                          {report.waste_type.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-blue-600" />
                        <span className="text-foreground">
                          {report.quantity_kg} kg
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-orange-600" />
                        <span className="text-foreground">
                          {report.location}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar className="h-3 w-3" />
                        {new Date(report.created_at).toLocaleString()}
              </div>
              </div>
                  </CardContent>
                </Card>
              ))}
              </div>
          )}
          </CardContent>
        </Card>
    </div>
  );
}
