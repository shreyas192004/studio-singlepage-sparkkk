import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDesigner } from "@/contexts/DesignerContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download } from "lucide-react";
import { toast } from "sonner";

// charts
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, Legend } from "recharts";

const COLORS = ["#4f46e5", "#06b6d4", "#f59e0b", "#ef4444", "#10b981"];

// Dummy fallback data
const DUMMY_PRODUCTS = [
  { id: "p1", title: "Cozy Hoodie", price: 399, currency: "₹", totalSold: 5, revenue: 100 },
  { id: "p2", title: "Minimalist Mug", price: 499, currency: "₹", totalSold: 10, revenue: 9000 },
  { id: "p3", title: "Desk Poster", price: 3099, currency: "₹", totalSold: 9, revenue: 2850 },
];

const DUMMY_PAYMENTS = [
  { id: "pay1", month: "2025-07", amount: 150, received: true, issued_at: "2025-07-31" },
  { id: "pay2", month: "2025-08", amount: 1200, received: false, issued_at: "2025-08-31" },
  { id: "pay3", month: "2025-09", amount: 1800, received: true, issued_at: "2025-09-30" },
];

interface PaymentRecord {
  id: string;
  month: string; // YYYY-MM
  amount: number;
  received: boolean;
  issued_at?: string;
  tx_reference?: string | null;
}

const DesignerPayment: React.FC = () => {
  const { isDesigner, loading } = useDesigner();
  const navigate = useNavigate();

  const [designerId, setDesignerId] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [manualTxRef, setManualTxRef] = useState("");
  const [showHistory, setShowHistory] = useState(false); // NEW: toggle for payment history

  useEffect(() => {
    if (!loading && !isDesigner) navigate("/designer/login");
  }, [isDesigner, loading, navigate]);

  useEffect(() => {
    if (isDesigner) init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesigner]);

  const init = async () => {
    setIsLoading(true);
    try {
      const { data: userRes } = await (supabase as any).auth.getUser();
      const user = userRes?.user;
      if (!user) {
        applyDummy();
        return;
      }

      const { data: designerData } = await (supabase as any)
        .from("designers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!designerData) {
        applyDummy();
        return;
      }

      setDesignerId(designerData.id);

      // fetch products for designer
      const { data: productsData, error: pErr } = await (supabase as any)
        .from("products")
        .select("id, title, price, currency, images, designer_id")
        .eq("designer_id", designerData.id)
        .order("created_at", { ascending: false });

      if (pErr) throw pErr;

      // fetch payments table (monthly payouts to designer)
      const { data: paymentsData } = await (supabase as any)
        .from("designer_payments")
        .select("id, month, amount, received, issued_at, tx_reference")
        .eq("designer_id", designerData.id)
        .order("month", { ascending: false })
        .limit(100);

      setProducts(productsData && productsData.length ? productsData : DUMMY_PRODUCTS);
      setPayments(paymentsData && paymentsData.length ? paymentsData : DUMMY_PAYMENTS);
    } catch (err) {
      console.error("DesignPayment init error:", err);
      applyDummy();
    } finally {
      setIsLoading(false);
    }
  };

  const applyDummy = () => {
    setProducts(DUMMY_PRODUCTS);
    setPayments(DUMMY_PAYMENTS);
    setIsLoading(false);
  };

  // compute totals
  const totalRevenue = useMemo(() => products.reduce((s, p) => s + (p.revenue || 0), 0), [products]);
  const totalDue = useMemo(() => {
    // due = sum of months not received
    return payments.filter((p) => !p.received).reduce((s, p) => s + p.amount, 0);
  }, [payments]);

  const paymentHistoryTable = payments.map((p) => ({ ...p }));

  // mark payment as received (admin action simulated here)
  const markAsReceived = async (paymentId: string, txRef?: string) => {
    try {
      // update supabase table if available
      const { error } = await (supabase as any)
        .from("designer_payments")
        .update({ received: true, tx_reference: txRef || null, issued_at: new Date().toISOString() })
        .eq("id", paymentId);

      if (error) {
        // fallback to local update if table doesn't exist
        console.warn("update payment error, applying local update:", (error as any).message || error);
        setPayments((prev) => prev.map((r) => (r.id === paymentId ? { ...r, received: true, tx_reference: txRef, issued_at: new Date().toISOString() } : r)));
        toast.success("Marked payment as received (local)");
        return;
      }

      // refresh list
      setPayments((prev) => prev.map((r) => (r.id === paymentId ? { ...r, received: true, tx_reference: txRef || null, issued_at: new Date().toISOString() } : r)));
      toast.success("Payment marked as received");
    } catch (err: any) {
      console.error("markAsReceived error:", err);
      toast.error("Failed to mark payment as received: " + (err.message || String(err)));
    }
  };

  const exportPaymentsCSV = () => {
    // build rows first, then join to CSV — this avoids any parentheses/spread mistakes
    const csvRows = [
      ["Month", "Amount", "Received", "Issued At", "TX Reference"],
      ...paymentHistoryTable.map((p) => [
        p.month,
        p.amount,
        p.received ? "Yes" : "No",
        p.issued_at || "-",
        p.tx_reference || "-",
      ]),
    ];

    const csv = csvRows.map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `designer-payments-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Exported payments CSV");
  };

  if (loading || isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!isDesigner) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Designer Payouts</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportPaymentsCSV}><Download className="mr-2 h-4 w-4" /> Export Payments</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{totalRevenue.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Revenue across your products</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Due</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{totalDue.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Amount pending to be paid by admin</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Last Payout</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <div>
                  <div className="font-medium">{payments[0].month}</div>
                  <div className="text-sm">₹{payments[0].amount.toFixed(2)} • {payments[0].received ? "Received" : "Pending"}</div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No payouts yet</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* PRODUCTS: moved before payments */}
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Total Sold</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/50">
                      <TableCell>{p.title}</TableCell>
                      <TableCell>{p.currency || "₹"} {p.price?.toFixed ? p.price.toFixed(2) : p.price}</TableCell>
                      <TableCell>{p.totalSold || 0}</TableCell>
                      <TableCell>₹{(p.revenue || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Toggle button to show/hide payment history */}
        <div className="flex justify-end">
          <Button onClick={() => setShowHistory((s) => !s)}>
            {showHistory ? "Hide Payment History" : "View Payment History"}
          </Button>
        </div>

        {/* payments table — only visible when showHistory is true */}
        {showHistory && (
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Issued At</TableHead>
                      <TableHead>TX Reference</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistoryTable.map((p) => (
                      <TableRow key={p.id} className="hover:bg-muted/50">
                        <TableCell>{p.month}</TableCell>
                        <TableCell>₹{p.amount.toFixed(2)}</TableCell>
                        <TableCell>{p.received ? "Received" : "Pending"}</TableCell>
                        <TableCell>{p.issued_at ? new Date(p.issued_at).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>{p.tx_reference || "-"}</TableCell>
                        <TableCell>
                          {!p.received && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => { setSelectedPayment(p); setShowPaymentDialog(true); }}>
                                Mark Received
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

      </main>

      {/* Mark payment dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={() => setShowPaymentDialog(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mark Payment Received</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Month</div>
              <div className="font-medium">{selectedPayment?.month}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Amount</div>
              <div className="font-medium">₹{selectedPayment?.amount?.toFixed(2)}</div>
            </div>

            <div>
              <label className="text-sm block mb-1">Transaction Reference (optional)</label>
              <Input value={manualTxRef} onChange={(e) => setManualTxRef(e.target.value)} placeholder="Bank txn id or reference" />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
              <Button onClick={() => { if (selectedPayment) { markAsReceived(selectedPayment.id, manualTxRef); setShowPaymentDialog(false); setManualTxRef(""); } }}>Confirm Received</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DesignerPayment;
