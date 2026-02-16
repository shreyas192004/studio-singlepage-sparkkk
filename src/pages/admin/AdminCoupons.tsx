import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdmin } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Ticket,
  Home,
  CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";

/* ================= TYPES ================= */

interface Coupon {
  id: string;
  code: string;
  min_order_amount: number;
  discount_amount: number; // ✅ FIXED: Matches DB schema
  valid_from: string;
  valid_until: string;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

/* ================= COMPONENT ================= */

const AdminCoupons = () => {
  const { isAdmin, loading: authLoading } = useAdmin();
  const navigate = useNavigate();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const [validFrom, setValidFrom] = useState<Date | undefined>(new Date());
  const [validUntil, setValidUntil] = useState<Date | undefined>();

  const [formData, setFormData] = useState({
    code: "",
    min_order_amount: "",
    discount_amount: "", // ✅ FIXED: Matches DB schema
    max_uses: "",
    is_active: true,
  });

  /* ================= AUTH ================= */

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/admintesora");
    }
  }, [isAdmin, authLoading, navigate]);

  /* ================= FETCH ================= */

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
    } catch {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  /* ================= HELPERS ================= */

  const resetForm = () => {
    setFormData({
      code: "",
      min_order_amount: "",
      discount_amount: "", // ✅ FIXED
      max_uses: "",
      is_active: true,
    });
    setValidFrom(new Date());
    setValidUntil(undefined);
    setEditingCoupon(null);
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ FIXED: Validate discount_amount instead of discount_percent
    if (!formData.code || !formData.discount_amount || !validUntil) {
      toast.error("Please fill all required fields");
      return;
    }

    if (Number(formData.discount_amount) > 100) {
      toast.error("Discount amount cannot exceed 100");
      return;
    }

    try {
      // ✅ FIXED: Match DB schema exactly
      const payload = {
        code: formData.code.toUpperCase(),
        min_order_amount: Number(formData.min_order_amount) || 0,
        discount_amount: Number(formData.discount_amount), // ✅ Percentage value
        valid_from: validFrom?.toISOString() || new Date().toISOString(),
        valid_until: validUntil.toISOString(),
        max_uses: formData.max_uses ? Number(formData.max_uses) : null,
        is_active: formData.is_active,
      };

      console.log('📤 Sending to Supabase:', payload);

      if (editingCoupon) {
        const { data, error } = await supabase
          .from("coupon_codes")
          .update(payload)
          .eq("id", editingCoupon.id)
          .select(); // ✅ Return updated row

        if (error) {
          console.error('❌ Update error:', error);
          throw error;
        }
        console.log('✅ Update success:', data);
        toast.success("Coupon updated");
      } else {
        const { data, error } = await supabase
          .from("coupon_codes")
          .insert(payload)
          .select(); // ✅ Return inserted row

        if (error) {
          console.error('❌ Insert error:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            payload
          });
          throw error;
        }
        console.log('✅ Insert success:', data);
        toast.success("Coupon created");
      }

      setDialogOpen(false);
      resetForm();
      await fetchCoupons(); // ✅ Await fetch
    } catch (err: any) {
      console.error('💥 Full error:', err);

      // ✅ Detailed error messages for production
      let errorMessage = "Failed to save coupon";

      if (err.code === '42703') {
        errorMessage = "Database schema error - contact developer";
      } else if (err.code === '23502') {
        errorMessage = "Missing required fields";
      } else if (err.code === '23505') {
        errorMessage = "Coupon code already exists";
      } else if (err.code === '42501') {
        errorMessage = "Permission denied - admin access required";
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast.error(errorMessage);
    }
  };

  /* ================= ACTIONS ================= */

  const handleEdit = (coupon: Coupon) => {
    try {
      // ✅ Validate required fields exist
      if (!coupon || !coupon.id) {
        throw new Error('Invalid coupon data');
      }

      setEditingCoupon(coupon);

      // ✅ Safe conversion with fallbacks - FIXED to use discount_amount
      setFormData({
        code: String(coupon.code || ""),
        min_order_amount: String(coupon.min_order_amount ?? 0),
        discount_amount: String(coupon.discount_amount ?? ""), // ✅ FIXED
        max_uses: String(coupon.max_uses ?? ""),
        is_active: coupon.is_active ?? true,
      });

      // ✅ Safe date parsing
      try {
        setValidFrom(
          coupon.valid_from ? new Date(coupon.valid_from) : new Date()
        );
      } catch {
        setValidFrom(new Date());
      }

      try {
        setValidUntil(
          coupon.valid_until ? new Date(coupon.valid_until) : undefined
        );
      } catch {
        setValidUntil(undefined);
      }

      setDialogOpen(true);
    } catch (error) {
      console.error('❌ Error in handleEdit:', error, coupon);
      toast.error('Failed to load coupon for editing');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    const { error } = await supabase
      .from("coupon_codes")
      .delete()
      .eq("id", id);

    if (error) toast.error("Failed to delete");
    else {
      toast.success("Coupon deleted");
      fetchCoupons();
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    await supabase
      .from("coupon_codes")
      .update({ is_active: !coupon.is_active })
      .eq("id", coupon.id);
    fetchCoupons();
  };

  /* ================= RENDER ================= */

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
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

          <div className="flex gap-4">
            <Link to="/admintesora/dashboard">
              <Button variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>

            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Coupon
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingCoupon ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label>Coupon Code *</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="uppercase"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Min Order (₹)</Label>
                      <Input
                        type="number"
                        value={formData.min_order_amount}
                        onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Discount (%) *</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formData.discount_amount}
                        onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* CALENDAR */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Valid From</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <CalendarIcon className="h-4 w-4" />
                            {validFrom ? format(validFrom, "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0">
                          <Calendar
                            mode="single"
                            selected={validFrom}
                            onSelect={setValidFrom}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label>Valid Until *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <CalendarIcon className=" h-4 w-4" />
                            {validUntil ? format(validUntil, "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0">
                          <Calendar
                            mode="single"
                            selected={validUntil}
                            onSelect={setValidUntil}
                            disabled={(date) =>
                              validFrom ? date < validFrom : date < new Date()
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div>
                    <Label>Max Uses</Label>
                    <Input
                      type="number"
                      value={formData.max_uses}
                      onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                    />
                    <Label>Active</Label>
                  </div>

                  <Button type="submit" className="w-full">
                    {editingCoupon ? "Update Coupon" : "Create Coupon"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Coupons
            </CardTitle>
          </CardHeader>

          <CardContent>
            {coupons.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No coupons created
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount (%)</TableHead>
                    <TableHead>Min Order</TableHead>
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
                      <TableCell className="text-green-600 font-semibold">
                        {coupon.discount_amount ?? 0}%
                      </TableCell>
                      <TableCell>₹{coupon.min_order_amount}</TableCell>
                      <TableCell>{format(new Date(coupon.valid_until), "dd MMM yyyy")}</TableCell>
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
