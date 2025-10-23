import { useAuthContext } from "@/components/AuthProvider";

export const UserInfo = () => {
  const { user, loading } = useAuthContext();

  if (loading) return <div>Loading...</div>;
  
  if (!user) return <div>Not logged in</div>;

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="text-white font-bold mb-2">User Information</h3>
      <div className="space-y-1 text-sm">
        <p className="text-white/80">
          <strong>User ID:</strong> {user.id}
        </p>
        <p className="text-white/80">
          <strong>Email:</strong> {user.email}
        </p>
        <p className="text-white/80">
          <strong>Name:</strong> {user.user_metadata?.full_name || 'Not provided'}
        </p>
        <p className="text-white/80">
          <strong>Provider:</strong> {user.app_metadata?.provider || 'email'}
        </p>
        <p className="text-white/80">
          <strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};