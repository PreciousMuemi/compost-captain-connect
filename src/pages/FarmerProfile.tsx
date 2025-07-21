import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FarmerProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      setProfile(data);
      setLoading(false);
    };
    fetchProfile();
  }, [id]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!profile) return <div className="p-6">Farmer not found.</div>;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{profile.full_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div><b>Phone:</b> {profile.phone_number}</div>
          <div><b>Location:</b> {profile.location}</div>
          <div><b>Role:</b> {profile.role}</div>
          <div><b>Joined:</b> {new Date(profile.created_at).toLocaleDateString()}</div>
        </CardContent>
      </Card>
    </div>
  );
} 