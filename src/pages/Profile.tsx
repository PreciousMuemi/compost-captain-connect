import { useAuth } from "@/hooks/useAuth";
import NotificationFeed from "@/components/NotificationFeed";
export default function Profile() {
  const { profile } = useAuth();
  return (
    <div className="glass p-6 max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-2">{profile.full_name}</h2>
      <p className="mb-1">Phone: {profile.phone_number}</p>
      <p className="mb-1">Location: {profile.location}</p>
      <p className="mb-1">Role: {profile.role}</p>
      {/* Add more stats or edit button as needed */}
      <NotificationFeed userId={profile.id} />
    </div>
  );
}
