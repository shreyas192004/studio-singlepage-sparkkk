import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { User, Package, MapPin, Settings, Plus } from "lucide-react";
import { OrderCard } from "@/components/OrderCard";
import { AddressCard } from "@/components/AddressCard";
import { AddressFormDialog } from "@/components/AddressFormDialog";
import { EditProfileDialog } from "@/components/EditProfileDialog";

interface Profile {
  display_name: string | null;
  email: string | null;
  created_at: string;
}

interface Address {
  id: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  address_type: string;
  is_default: boolean;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  order_items: OrderItem[];
}

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  size: string | null;
  color: string | null;
}

const Account = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [aiGenerationCount, setAiGenerationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAccountData();
    }
  }, [user]);

  const fetchAccountData = async () => {
    try {
      setLoading(true);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch addresses
      const { data: addressesData, error: addressesError } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user?.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (addressesError) throw addressesError;
      setAddresses(addressesData || []);

      // Fetch orders with items
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // Fetch AI generation count
      const { count, error: countError } = await supabase
        .from("ai_generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id);

      if (countError) throw countError;
      setAiGenerationCount(count || 0);

    } catch (error: any) {
      console.error("Error fetching account data:", error);
      toast.error("Failed to load account data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setAddresses(addresses.filter(addr => addr.id !== id));
      toast.success("Address deleted successfully");
    } catch (error: any) {
      console.error("Error deleting address:", error);
      toast.error("Failed to delete address");
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      // Remove default from all addresses
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user?.id);

      // Set new default
      const { error } = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", id);

      if (error) throw error;

      setAddresses(addresses.map(addr => ({
        ...addr,
        is_default: addr.id === id
      })));
      toast.success("Default address updated");
    } catch (error: any) {
      console.error("Error updating default address:", error);
      toast.error("Failed to update default address");
    }
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressDialogOpen(true);
  };

  const handleAddressDialogClose = () => {
    setAddressDialogOpen(false);
    setEditingAddress(null);
    fetchAccountData();
  };

  const handleProfileUpdate = () => {
    setEditProfileOpen(false);
    fetchAccountData();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const aiUsagePercent = (aiGenerationCount / 30) * 100;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-foreground">My Account</h1>

        {/* Profile Section */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                <User className="w-8 h-8 text-accent-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {profile?.display_name || "User"}
                </h2>
                <p className="text-muted-foreground">{profile?.email}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Member since {new Date(profile?.created_at || "").toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button onClick={() => setEditProfileOpen(true)} variant="outline">
              Edit Profile
            </Button>
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Orders Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Order History</h2>
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No orders yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start shopping to see your order history here!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </Card>

          {/* Addresses Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Saved Addresses</h2>
              </div>
              <Button
                onClick={() => setAddressDialogOpen(true)}
                size="sm"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
            {addresses.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No saved addresses</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add one to speed up checkout!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {addresses.map(address => (
                  <AddressCard
                    key={address.id}
                    address={address}
                    onEdit={handleEditAddress}
                    onDelete={handleDeleteAddress}
                    onSetDefault={handleSetDefaultAddress}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* AI Usage Section */}
          <Card className="p-6 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Account Settings</h2>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-foreground">
                    AI Generation Usage
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {aiGenerationCount} of 30 free generations used
                  </p>
                </div>
                <Progress value={aiUsagePercent} className="h-2" />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <AddressFormDialog
        open={addressDialogOpen}
        onClose={handleAddressDialogClose}
        address={editingAddress}
        userId={user.id}
      />

      <EditProfileDialog
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        profile={profile}
        onSuccess={handleProfileUpdate}
      />
    </div>
  );
};

export default Account;
