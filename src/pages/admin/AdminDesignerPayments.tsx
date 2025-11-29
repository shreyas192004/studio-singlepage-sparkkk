import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAdmin } from "@/contexts/AdminContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CreditCard, History, IndianRupee, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface DesignerEarnings {
  designer_id: string;
  designer_name: string;
  avatar_url: string | null;
  total_sales: number;
  total_amount: number;
  pending_amount: number;
  paid_amount: number;
}

interface PaymentHistory {
  id: string;
  designer_id: string;
  designer_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_id: string;
  notes: string | null;
}

const AdminDesignerPayments = () => {
  const { isAdmin, loading } = useAdmin();
  const navigate = useNavigate();
  const [designers, setDesigners] = useState<DesignerEarnings[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedDesigner, setSelectedDesigner] = useState<DesignerEarnings | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/admintesora");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchDesignerEarnings();
      fetchPaymentHistory();
    }
  }, [isAdmin]);

  const fetchDesignerEarnings = async () => {
    try {
      // Get all designers
      const { data: designersData, error: designersError } = await supabase
        .from("designers")
        .select("id, name, avatar_url");

      if (designersError) throw designersError;

      // Get all order items with product info to calculate sales per designer
      const { data: orderItems, error: orderItemsError } = await supabase
        .from("order_items")
        .select(`
          quantity,
          total_price,
          product_id
        `);

      if (orderItemsError) throw orderItemsError;

      // Get products to map to designers
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, designer_id");

      if (productsError) throw productsError;

      // Get existing payments using raw query to avoid type issues
      const { data: payments, error: paymentsError } = await supabase
        .from("designer_payments" as any)
        .select("designer_id, amount") as any;

      // Calculate earnings per designer
      const productDesignerMap = new Map(products.map(p => [p.id, p.designer_id]));
      
      const designerEarnings: DesignerEarnings[] = (designersData || []).map(designer => {
        const designerOrderItems = (orderItems || []).filter(item => {
          const designerId = productDesignerMap.get(item.product_id);
          return designerId === designer.id;
        });

        const totalSales = designerOrderItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = designerOrderItems.reduce((sum, item) => sum + Number(item.total_price), 0);
        
        const paymentsData = payments?.data || payments || [];
        const paidAmount = paymentsData
          .filter((p: any) => p.designer_id === designer.id)
          .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

        return {
          designer_id: designer.id,
          designer_name: designer.name,
          avatar_url: designer.avatar_url,
          total_sales: totalSales,
          total_amount: totalAmount,
          pending_amount: Math.max(0, totalAmount - paidAmount),
          paid_amount: paidAmount,
        };
      });

      setDesigners(designerEarnings.filter(d => d.total_amount > 0));
    } catch (error) {
      console.error("Error fetching designer earnings:", error);
      toast.error("Failed to load designer earnings");
    } finally {
      setLoadingData(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("designer_payments" as any)
        .select(`
          id,
          designer_id,
          amount,
          payment_date,
          payment_method,
          transaction_id,
          notes,
          designers(name)
        `)
        .order("payment_date", { ascending: false }) as any;

      if (error) throw error;

      const history: PaymentHistory[] = (data || []).map((item: any) => ({
        id: item.id,
        designer_id: item.designer_id,
        designer_name: item.designers?.name || "Unknown",
        amount: item.amount,
        payment_date: item.payment_date,
        payment_method: item.payment_method,
        transaction_id: item.transaction_id,
        notes: item.notes,
      }));

      setPaymentHistory(history);
    } catch (error) {
      console.error("Error fetching payment history:", error);
    }
  };

  const handlePaymentClick = (designer: DesignerEarnings) => {
    setSelectedDesigner(designer);
    setPaymentAmount(designer.pending_amount.toString());
    setPaymentDialogOpen(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedDesigner || !paymentAmount || !paymentMethod || !transactionId) {
      toast.error("Please fill all required fields");
      return;
    }

    setProcessingPayment(true);
    try {
      const { error } = await supabase.from("designer_payments" as any).insert({
        designer_id: selectedDesigner.designer_id,
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        transaction_id: transactionId,
        notes: paymentNotes || null,
        payment_date: new Date().toISOString(),
      } as any);

      if (error) throw error;

      toast.success(`Payment of ₹${paymentAmount} processed for ${selectedDesigner.designer_name}`);
      setPaymentDialogOpen(false);
      setPaymentAmount("");
      setPaymentMethod("");
      setTransactionId("");
      setPaymentNotes("");
      setSelectedDesigner(null);
      
      // Refresh data
      fetchDesignerEarnings();
      fetchPaymentHistory();
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment");
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading || loadingData) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/admintesora/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Designer Payments</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="earnings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="earnings" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Earnings & Payouts
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Payment History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle>Designer Earnings</CardTitle>
                <CardDescription>
                  View total earnings and pending payouts for each designer
                </CardDescription>
              </CardHeader>
              <CardContent>
                {designers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No designer sales data available yet
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Designer</TableHead>
                        <TableHead className="text-right">Total Sales</TableHead>
                        <TableHead className="text-right">Total Earned</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {designers.map((designer) => (
                        <TableRow key={designer.designer_id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              {designer.avatar_url ? (
                                <img
                                  src={designer.avatar_url}
                                  alt={designer.designer_name}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                  {designer.designer_name.charAt(0)}
                                </div>
                              )}
                              {designer.designer_name}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{designer.total_sales} items</TableCell>
                          <TableCell className="text-right">
                            <span className="flex items-center justify-end gap-1">
                              <IndianRupee className="h-3 w-3" />
                              {designer.total_amount.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            <span className="flex items-center justify-end gap-1">
                              <IndianRupee className="h-3 w-3" />
                              {designer.paid_amount.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={designer.pending_amount > 0 ? "destructive" : "secondary"}>
                              <IndianRupee className="h-3 w-3 mr-1" />
                              {designer.pending_amount.toLocaleString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handlePaymentClick(designer)}
                              disabled={designer.pending_amount <= 0}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Pay
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  View all past payments made to designers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No payment history available yet
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Designer</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentHistory.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(new Date(payment.payment_date), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="font-medium">{payment.designer_name}</TableCell>
                          <TableCell className="text-right">
                            <span className="flex items-center justify-end gap-1 text-green-600">
                              <IndianRupee className="h-3 w-3" />
                              {payment.amount.toLocaleString()}
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
          </TabsContent>
        </Tabs>
      </main>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              Record payment for {selectedDesigner?.designer_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Payment Method *</Label>
              <Input
                id="method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="e.g., Bank Transfer, UPI, PayPal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transactionId">Transaction ID *</Label>
              <Input
                id="transactionId"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter transaction reference"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Any additional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProcessPayment} disabled={processingPayment}>
              {processingPayment ? "Processing..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDesignerPayments;
