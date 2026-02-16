// FULL UPDATED ADMIN DESIGNER PAYMENTS PAGE
// Industry-style weekly settlement (1–7, 8–14, 15–21, 22–end)
// Handles previous 3 months pending/paid + current week logic

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/contexts/AdminContext";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

import { CreditCard, History, Check, Home } from "lucide-react";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";

/* ================= CONFIG ================= */

const PLATFORM_FEE_PERCENT = 10;

const netAmount = (gross: number) =>
  Math.round(gross - (gross * PLATFORM_FEE_PERCENT) / 100);

/* ================= HELPERS ================= */

function getFixedWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDate();

  let startDay = 1;
  let endDay = 7;

  if (day >= 8 && day <= 14) [startDay, endDay] = [8, 14];
  else if (day >= 15 && day <= 21) [startDay, endDay] = [15, 21];
  else if (day >= 22) [startDay, endDay] = [22, 31];

  const start = new Date(d.getFullYear(), d.getMonth(), startDay);
  const end = new Date(d.getFullYear(), d.getMonth(), endDay);

  return { start, end };
}

/* ================= TYPES ================= */

interface DesignerRow {
  id: string;
  name: string;
  prev_pending: number;
  prev_pending_net: number;
  prev_paid: number;
  curr_pending: number;
  curr_pending_net: number;
  prev_unpaid_items: string[];
  curr_unpaid_items: string[];
}

interface PaymentHistoryRow {
  id: string;
  designer: string;
  amount: number;
  week: string;
  method: string;
  txn: string;
  date: string;
  notes?: string | null;
}

/* ================= COMPONENT ================= */

export default function AdminDesignerPayments() {
  const { isAdmin, loading } = useAdmin();
  const navigate = useNavigate();

  const [rows, setRows] = useState<DesignerRow[]>([]);
  const [history, setHistory] = useState<PaymentHistoryRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<DesignerRow | null>(null);
  const [includePrevious, setIncludePrevious] = useState(false);

  const [payAmount, setPayAmount] = useState(0);
  const [method, setMethod] = useState("");
  const [txn, setTxn] = useState("");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const week = useMemo(() => getFixedWeek(), []);
  const threeMonthsAgo = subMonths(new Date(), 3);

  /* ================= AUTH ================= */

  useEffect(() => {
    if (!loading && !isAdmin) navigate("/admintesora");
  }, [loading, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
      loadHistory();
    }
  }, [isAdmin]);

  /* ================= DATA ================= */

  const loadData = async () => {
    try {
      setLoadingData(true);

      const { data: designers } = await supabase
        .from("designers")
        .select("id,name");

      const { data: products } = await supabase
        .from("products")
        .select("id,designer_id");

      const { data: items } = await supabase
        .from("order_items")
        .select(
          "id,product_id,total_price,designer_payout_status,status,dispatch_date,delivery_order_id"
        )
        .eq("status", "delivered")
        .not("delivery_order_id", "is", null);

      const productMap = new Map(products?.map(p => [p.id, p.designer_id]));

      const result: DesignerRow[] = (designers || []).map(d => {
        const designerItems = (items || []).filter(
          i => productMap.get(i.product_id) === d.id
        );

        const prev = designerItems.filter(i =>
          i.dispatch_date &&
          new Date(i.dispatch_date) >= threeMonthsAgo &&
          new Date(i.dispatch_date) < week.start
        );

        const curr = designerItems.filter(i =>
          i.dispatch_date &&
          new Date(i.dispatch_date) >= week.start &&
          new Date(i.dispatch_date) <= week.end
        );

        const prevUnpaid = prev.filter(i => i.designer_payout_status === "unpaid");
        const currUnpaid = curr.filter(i => i.designer_payout_status === "unpaid");

        const prevPaid = prev.filter(i => i.designer_payout_status === "paid");

        const sum = (arr: any[]) =>
          arr.reduce((s, i) => s + Number(i.total_price || 0), 0);

        return {
          id: d.id,
          name: d.name,
          prev_pending: sum(prevUnpaid),
          prev_pending_net: netAmount(sum(prevUnpaid)),
          prev_paid: sum(prevPaid),
          curr_pending: sum(currUnpaid),
          curr_pending_net: netAmount(sum(currUnpaid)),
          prev_unpaid_items: prevUnpaid.map(i => i.id),
          curr_unpaid_items: currUnpaid.map(i => i.id),
        };
      });

      setRows(result.filter(r => r.prev_pending > 0 || r.curr_pending > 0));
    } catch {
      toast.error("Failed to load payments data");
    } finally {
      setLoadingData(false);
    }
  };

  const loadHistory = async () => {
    const { data } = await supabase
      .from("designer_payments")
      .select("id,amount,payment_date,payment_method,transaction_id,notes,payout_week_start,payout_week_end,designers(name)")
      .order("payment_date", { ascending: false });

    setHistory(
      (data || []).map(p => ({
        id: p.id,
        designer: p.designers?.name ?? "-",
        amount: p.amount,
        week: p.payout_week_start
          ? `${format(new Date(p.payout_week_start), "dd MMM")} – ${format(
            new Date(p.payout_week_end),
            "dd MMM yyyy"
          )}`
          : "-",
        method: p.payment_method,
        txn: p.transaction_id,
        date: format(new Date(p.payment_date), "dd MMM yyyy"),
        notes: p.notes,
      }))
    );
  };

  /* ================= PAYMENT ================= */

  const openPay = (row: DesignerRow) => {
    setSelected(row);
    setIncludePrevious(false);
    setPayAmount(row.curr_pending_net);
    setDialogOpen(true);
  };

  const processPayment = async () => {
    if (!selected) return;

    setProcessing(true);
    try {
      const ids = includePrevious
        ? [...selected.prev_unpaid_items, ...selected.curr_unpaid_items]
        : selected.curr_unpaid_items;

      const gross = includePrevious
        ? selected.prev_pending + selected.curr_pending
        : selected.curr_pending;

      const { data: payment } = await supabase
        .from("designer_payments")
        .insert({
          designer_id: selected.id,
          amount: netAmount(gross),
          payment_method: method,
          transaction_id: txn,
          notes: notes || null,
          payment_date: new Date().toISOString(),
          payout_week_start: week.start,
          payout_week_end: week.end,
        })
        .select("id")
        .single();

      await supabase
        .from("order_items")
        .update({
          designer_payout_status: "paid",
          designer_payment_id: payment.id,
          designer_paid_at: new Date().toISOString(),
        })
        .in("id", ids);

      toast.success("Payment completed successfully");
      setDialogOpen(false);
      loadData();
      loadHistory();
    } catch {
      toast.error("Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  /* ================= UI ================= */

  if (loading || loadingData) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-4 flex justify-between">
        <h1 className="text-2xl font-bold">Designer Payouts</h1>
        <Link to="/admintesora/dashboard">
          <Button variant="outline"><Home className="mr-2 h-4 w-4" />Dashboard</Button>
        </Link>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="earnings">
          <TabsList>
            <TabsTrigger value="earnings"><CreditCard className="mr-2 h-4 w-4" />Earnings</TabsTrigger>
            <TabsTrigger value="history"><History className="mr-2 h-4 w-4" />History</TabsTrigger>
          </TabsList>

          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Settlement</CardTitle>
                <CardDescription>
                  Current week: {format(week.start, "dd MMM")} – {format(week.end, "dd MMM yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Designer</TableHead>
                      <TableHead className="text-right">Prev 3M Pending (-10%)</TableHead>
                      <TableHead className="text-right">Prev 3M Paid</TableHead>
                      <TableHead className="text-right">Current week Pending</TableHead>
                      <TableHead className="text-right">Current week Payable (-10%)</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>{r.name}</TableCell>
                        <TableCell className="text-right">₹{r.prev_pending_net.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-green-600">₹{r.prev_paid.toLocaleString()}</TableCell>
                        <TableCell className="text-right"><Badge variant="destructive">₹{r.curr_pending.toLocaleString()}</Badge></TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">₹{r.curr_pending_net.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" disabled={r.curr_pending <= 0} onClick={() => openPay(r)}>
                            <Check className="mr-1 h-4 w-4" />Pay
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Clear, week-based payout records</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Designer</TableHead>
                      <TableHead>Week</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Txn</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map(h => (
                      <TableRow key={h.id}>
                        <TableCell>{h.date}</TableCell>
                        <TableCell>{h.designer}</TableCell>
                        <TableCell>{h.week}</TableCell>
                        <TableCell className="text-right text-green-600">₹{h.amount.toLocaleString()}</TableCell>
                        <TableCell>{h.method}</TableCell>
                        <TableCell className="font-mono">{h.txn}</TableCell>
                        <TableCell>{h.notes || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payout</DialogTitle>
            <DialogDescription>Include previous unpaid dues if required</DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox checked={includePrevious} onCheckedChange={(v: any) => {
                  setIncludePrevious(!!v);
                  const gross = !!v
                    ? selected.prev_pending + selected.curr_pending
                    : selected.curr_pending;
                  setPayAmount(netAmount(gross));
                }} />
                <span>Include previous 3 months unpaid</span>
              </div>

              <div>
                <Label>Payable Amount</Label>
                <Input type="number" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
              </div>

              <div>
                <Label>Payment Method</Label>
                <Input value={method} onChange={e => setMethod(e.target.value)} />
              </div>

              <div>
                <Label>Transaction ID</Label>
                <Input value={txn} onChange={e => setTxn(e.target.value)} />
              </div>

              <div>
                <Label>Notes</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={processPayment} disabled={processing}>
              {processing ? "Processing…" : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
