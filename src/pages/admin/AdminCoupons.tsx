import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Ticket } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  min_order_amount: number;
  discount_amount: number;
  valid_from: string;
  valid_until: string;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_at: string;
}

const AdminCoupons = () => {
  const { isAdmin, loading: authLoading } = useAdmin();
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    min_order_amount: "",
    discount_amount: "",
    valid_from: new Date().toISOString().slice(0, 16),
    valid_until: "",
    max_uses: "",
    is_active: true,
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/admintesora");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from("coupon_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCoupons((data as Coupon[]) || []);
    } catch (err: any) {
      console.error("Error fetching coupons:", err);
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const resetForm = () => {
    setFormData({
      code: "",
      min_order_amount: "",
      discount_amount: "",
      valid_from: new Date().toISOString().slice(0, 16),
      valid_until: "",
      max_uses: "",
      is_active: true,
    });
    setEditingCoupon(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.discount_amount || !formData.valid_until) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const couponData = {
        code: formData.code.toUpperCase(),
        min_order_amount: parseFloat(formData.min_order_amount) || 0,
        discount_amount: parseFloat(formData.discount_amount),
        valid_from: formData.valid_from,
        valid_until: formData.valid_until,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        is_active: formData.is_active,
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from("coupon_codes")
          .update(couponData)
          .eq("id", editingCoupon.id);

        if (error) throw error;
        toast.success("Coupon updated successfully");
      } else {
        const { error } = await supabase
          .from("coupon_codes")
          .insert(couponData as any);

        if (error) throw error;
        toast.success("Coupon created successfully");
      }

      setDialogOpen(false);
      resetForm();
      fetchCoupons();
    } catch (err: any) {
      console.error("Error saving coupon:", err);
      toast.error(err?.message || "Failed to save coupon");
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      min_order_amount: coupon.min_order_amount.toString(),
      discount_amount: coupon.discount_amount.toString(),
      valid_from: new Date(coupon.valid_from).toISOString().slice(0, 16),
      valid_until: new Date(coupon.valid_until).toISOString().slice(0, 16),
      max_uses: coupon.max_uses?.toString() || "",
      is_active: coupon.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    try {
      const { error } = await supabase.from("coupon_codes").delete().eq("id", id);
      if (error) throw error;
      toast.success("Coupon deleted");
      fetchCoupons();
    } catch (err: any) {
      console.error("Error deleting coupon:", err);
      toast.error("Failed to delete coupon");
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from("coupon_codes")
        .update({ is_active: !coupon.is_active })
        .eq("id", coupon.id);

      if (error) throw error;
      toast.success(`Coupon ${!coupon.is_active ? "activated" : "deactivated"}`);
      fetchCoupons();
    } catch (err: any) {
      console.error("Error toggling coupon:", err);
      toast.error("Failed to update coupon");
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admintesora/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Coupon Codes</h1>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCoupon ? "Edit Coupon" : "Add New Coupon"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Coupon Code *</Label>
                  <Input
                    id="code"
                    name="code"
                    placeholder="e.g. TESORA100"
                    value={formData.code}
                    onChange={handleInputChange}
                    className="uppercase"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_order_amount">Min Order Amount (₹)</Label>
                    <Input
                      id="min_order_amount"
                      name="min_order_amount"
                      type="number"
                      placeholder="e.g. 700"
                      value={formData.min_order_amount}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount_amount">Discount Amount (₹) *</Label>
                    <Input
                      id="discount_amount"
                      name="discount_amount"
                      type="number"
                      placeholder="e.g. 100"
                      value={formData.discount_amount}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valid_from">Valid From</Label>
                    <Input
                      id="valid_from"
                      name="valid_from"
                      type="datetime-local"
                      value={formData.valid_from}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valid_until">Valid Until *</Label>
                    <Input
                      id="valid_until"
                      name="valid_until"
                      type="datetime-local"
                      value={formData.valid_until}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_uses">Max Uses (leave empty for unlimited)</Label>
                  <Input
                    id="max_uses"
                    name="max_uses"
                    type="number"
                    placeholder="e.g. 100"
                    value={formData.max_uses}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>

                <Button type="submit" className="w-full">
                  {editingCoupon ? "Update Coupon" : "Create Coupon"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Active Coupons
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coupons.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No coupons created yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Min Order</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                      <TableCell>₹{coupon.min_order_amount}</TableCell>
                      <TableCell className="text-green-600 font-semibold">₹{coupon.discount_amount}</TableCell>
                      <TableCell>{new Date(coupon.valid_until).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {coupon.current_uses}
                        {coupon.max_uses ? ` / ${coupon.max_uses}` : " / ∞"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={coupon.is_active}
                          onCheckedChange={() => toggleActive(coupon)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(coupon)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(coupon.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminCoupons;
