import React, { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Download, IndianRupee, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface PaymentRecord {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_id: string;
  notes: string | null;
}

interface ProductSale {
  id: string;
  title: string;
  price: number;
  totalSold: number;
  revenue: number;
}

const DesignerPayment: React.FC = () => {
  const { isDesigner, loading } = useDesigner();
  const navigate = useNavigate();

  const [designerId, setDesignerId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductSale[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!loading && !isDesigner) navigate("/designer/login");
  }, [isDesigner, loading, navigate]);

  useEffect(() => {
    if (isDesigner) init();
  }, [isDesigner]);

  const init = async () => {
    setIsLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: designerData } = await supabase
        .from("designers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!designerData) {
        setIsLoading(false);
        return;
      }

      setDesignerId(designerData.id);

      // Fetch products for designer
      const { data: productsData } = await supabase
        .from("products")
        .select("id, title, price")
        .eq("designer_id", designerData.id)
        .order("created_at", { ascending: false });

      // Fetch order items for these products to calculate sales
      const productIds = productsData?.map(p => p.id) || [];
      let productSales: ProductSale[] = [];

      if (productIds.length > 0) {
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("product_id, quantity, total_price")
          .in("product_id", productIds);

        productSales = (productsData || []).map(product => {
          const items = (orderItems || []).filter(item => item.product_id === product.id);
          const totalSold = items.reduce((sum, item) => sum + item.quantity, 0);
          const revenue = items.reduce((sum, item) => sum + Number(item.total_price), 0);
          return {
            id: product.id,
            title: product.title,
            price: product.price,
            totalSold,
            revenue,
          };
        });
      }

      setProducts(productSales);

      // Fetch payments from designer_payments table
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("designer_payments")
        .select("id, amount, payment_date, payment_method, transaction_id, notes")
        .eq("designer_id", designerData.id)
        .order("payment_date", { ascending: false });

      if (paymentsError) {
        console.error("Error fetching payments:", paymentsError);
      } else {
        setPayments(paymentsData || []);
      }
    } catch (err) {
      console.error("DesignerPayment init error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate totals
  const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingAmount = Math.max(0, totalRevenue - totalPaid);

  const exportPaymentsCSV = () => {
    const csvRows = [
      ["Date", "Amount", "Payment Method", "Transaction ID", "Notes"],
      ...payments.map((p) => [
        format(new Date(p.payment_date), "yyyy-MM-dd"),
        p.amount,
        p.payment_method,
        p.transaction_id,
        p.notes || "-",
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
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/designer/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">My Payments</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportPaymentsCSV} disabled={payments.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-1">
                <IndianRupee className="h-6 w-6" />
                {totalRevenue.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">From product sales</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 flex items-center gap-1">
                <IndianRupee className="h-6 w-6" />
                {totalPaid.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Payments received</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-1">
                <Badge variant={pendingAmount > 0 ? "destructive" : "secondary"} className="text-xl px-3 py-1">
                  <IndianRupee className="h-5 w-5 mr-1" />
                  {pendingAmount.toLocaleString()}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">Yet to be paid</div>
            </CardContent>
          </Card>
        </div>

        {/* Products Sales Table */}
        <Card>
          <CardHeader>
            <CardTitle>Product Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No products or sales data yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Units Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell className="text-right">₹{p.price.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{p.totalSold}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        ₹{p.revenue.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Toggle Payment History */}
        <div className="flex justify-end">
          <Button onClick={() => setShowHistory((s) => !s)}>
            {showHistory ? "Hide Payment History" : "View Payment History"}
          </Button>
        </div>

        {/* Payment History Table */}
        {showHistory && (
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No payments received yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.payment_date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="flex items-center justify-end gap-1 text-green-600 font-medium">
                            <IndianRupee className="h-3 w-3" />
                            {Number(payment.amount).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>{payment.payment_method}</TableCell>
                        <TableCell className="font-mono text-sm">{payment.transaction_id}</TableCell>
                        <TableCell className="text-muted-foreground">{payment.notes || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default DesignerPayment;
