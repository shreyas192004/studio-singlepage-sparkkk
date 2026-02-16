import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAdmin } from "@/contexts/AdminContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Home, Download, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

/* -------------------- Types -------------------- */

interface AiGeneration {
  id: string;
  prompt: string | null;
  style: string | null;
  color_scheme: string | null;
  image_url: string | null;
  session_id: string | null;
  created_at: string;
  email: string | null;
}

interface AnalyticsStats {
  aiGenerations: AiGeneration[];
}

/* -------------------- Component -------------------- */

const AdminAnalytics = () => {
  const { isAdmin, loading } = useAdmin();
  const navigate = useNavigate();

const [stats, setStats] = useState<AnalyticsStats>({
    aiGenerations: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [selectedGen, setSelectedGen] = useState<AiGeneration | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 50;

  /* -------------------- Auth Guard -------------------- */

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/admintesora");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchAnalytics();
  }, [isAdmin, page]);

  /* -------------------- Fetch AI Analytics -------------------- */

  const fetchAnalytics = async () => {
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Get total count
      const { count } = await (supabase as any)
        .from("ai_generations_with_email")
        .select("id", { count: "exact", head: true });
      
      if (count !== null) setTotalCount(count);

      const { data: generations, error } = await (supabase as any)
        .from("ai_generations_with_email")
        .select("id, prompt, style, color_scheme, session_id, created_at, email")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.warn("View query failed, falling back to direct table query:", error.message);
        const { data: fallbackData, count: fbCount } = await supabase
          .from("ai_generations")
          .select("id, prompt, style, color_scheme, session_id, created_at, user_id", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to);

        if (fbCount !== null) setTotalCount(fbCount);
        setStats({
          aiGenerations: (fallbackData || []).map((g: any) => ({ ...g, email: null, image_url: null })),
        });
      } else {
        setStats({
          aiGenerations: (generations || []).map((g: any) => ({ ...g, image_url: null })),
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load analytics. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGenerationImage = async (gen: AiGeneration) => {
    const { data } = await supabase
      .from("ai_generations")
      .select("image_url")
      .eq("id", gen.id)
      .single();
    setSelectedGen({ ...gen, image_url: data?.image_url || null });
  };

  /* -------------------- CSV Export -------------------- */

  const exportAIGenerationsCSV = () => {
    if (!stats.aiGenerations.length) {
      toast.error("No data to export");
      return;
    }

    const csv = [
      ["Email", "Session", "Prompt", "Style", "Color", "Created At"],
      ...stats.aiGenerations.map((g) => [
        g.email || "Anonymous",
        g.session_id || "N/A",
        `"${(g.prompt || "").replace(/"/g, '""')}"`,
        g.style || "",
        g.color_scheme || "",
        new Date(g.created_at).toLocaleString(),
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-generations.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isLoading && stats.aiGenerations.length === 0) {
    // Show empty state with retry
  }

  /* -------------------- UI -------------------- */

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          </div>

          <Link to="/admintesora/dashboard">
            <Button variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* ---------------- Google Analytics ---------------- */}
        <Card>
          <CardHeader>
            <CardTitle>Website Analytics (Google Analytics)</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="w-full h-[80vh] rounded-lg overflow-hidden border">
              <iframe
                src="https://lookerstudio.google.com/embed/reporting/29d38c99-0d23-4f28-90aa-5ed395bec128/page/kIV1C"
                className="w-full h-full"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
              />
            </div>
          </CardContent>
        </Card>

        {/* ---------------- AI Generations ---------------- */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>AI Design Generations {totalCount > 0 && <span className="text-sm font-normal text-muted-foreground ml-2">({totalCount} total)</span>}</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setPage(0); setIsLoading(true); fetchAnalytics(); }}>
                Retry
              </Button>
              <Button size="sm" variant="outline" onClick={exportAIGenerationsCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Style</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {stats.aiGenerations.map((gen) => (
                  <TableRow
                    key={gen.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => fetchGenerationImage(gen)}
                  >
                    <TableCell>{gen.email || "Anonymous"}</TableCell>

                    <TableCell className="max-w-[300px]">
                      <div className="line-clamp-2">{gen.prompt}</div>
                    </TableCell>

                    <TableCell>{gen.style || "-"}</TableCell>

                    <TableCell>
                      {new Date(gen.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalCount > PAGE_SIZE && (
              <div className="flex items-center justify-between pt-4">
                <span className="text-sm text-muted-foreground">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={(page + 1) * PAGE_SIZE >= totalCount}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* ---------------- Modal ---------------- */}
      <Dialog open={!!selectedGen} onOpenChange={() => setSelectedGen(null)}>
        <DialogContent className="max-w-3xl">
          {selectedGen && (
            <>
              <DialogHeader>
                <DialogTitle>AI Design Details</DialogTitle>
              </DialogHeader>

              <div className="grid md:grid-cols-2 gap-6">
                <img
                  src={selectedGen.image_url || "/placeholder.svg"}
                  className="w-full rounded-lg object-cover shadow"
                />

                <div className="space-y-3 text-sm">
                  <div>
                    <b>User:</b> {selectedGen.email || "Anonymous"}
                  </div>
                  <div>
                    <b>Session:</b> {selectedGen.session_id || "N/A"}
                  </div>
                  <div>
                    <b>Style:</b> {selectedGen.style || "-"}
                  </div>
                  <div>
                    <b>Color:</b> {selectedGen.color_scheme || "-"}
                  </div>
                  <div>
                    <b>Date:</b>{" "}
                    {new Date(selectedGen.created_at).toLocaleString()}
                  </div>
                  <div>
                    <b>Prompt:</b>
                    <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
                      {selectedGen.prompt}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAnalytics;
