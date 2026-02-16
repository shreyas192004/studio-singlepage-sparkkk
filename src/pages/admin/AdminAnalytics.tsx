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
import { Home, Download, ArrowLeft } from "lucide-react";
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

  /* -------------------- Auth Guard -------------------- */

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/admintesora");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchAnalytics();
  }, [isAdmin]);

  /* -------------------- Fetch AI Analytics -------------------- */

  const fetchAnalytics = async () => {
    try {
      const { data: generations } = await (supabase as any)
        .from("ai_generations_with_email")
        .select(
          "id, prompt, style, color_scheme, image_url, session_id, created_at, email"
        )
        .order("created_at", { ascending: false })
        .limit(50);

      setStats({
        aiGenerations: generations || [],
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
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
            <CardTitle>AI Design Generations</CardTitle>
            <Button size="sm" variant="outline" onClick={exportAIGenerationsCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
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
                    onClick={() => setSelectedGen(gen)}
                  >
                    <TableCell>
                      {gen.image_url ? (
                        <img
                          src={gen.image_url}
                          className="w-16 h-16 rounded object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-xs">
                          No Image
                        </div>
                      )}
                    </TableCell>

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
