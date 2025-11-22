import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAdmin } from "@/contexts/AdminContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Home, Star } from "lucide-react";
import { toast } from "sonner";

const AdminDesigners = () => {
  const { isAdmin, loading } = useAdmin();
  const navigate = useNavigate();
  const [designers, setDesigners] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/admintesora");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchDesigners();
    }
  }, [isAdmin]);

  const fetchDesigners = async () => {
    const { data, error } = await (supabase as any)
      .from("designers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load designers");
    } else {
      setDesigners(data || []);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this designer?")) return;

    const { error } = await (supabase as any).from("designers").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete designer");
    } else {
      toast.success("Designer deleted");
      fetchDesigners();
    }
  };

  const toggleFeatured = async (id: string, currentFeatured: boolean) => {
    const { error } = await (supabase as any)
      .from("designers")
      .update({ featured: !currentFeatured })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update featured status");
    } else {
      toast.success(`Designer ${!currentFeatured ? "featured" : "unfeatured"}`);
      fetchDesigners();
    }
  };

  const filteredDesigners = designers.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Designers Management</h1>
            <div className="flex gap-2">
              <Link to="/admintesora/dashboard">
                <Button variant="outline">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link to="/admintesora/designers/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Designer
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Input
            placeholder="Search designers by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading designers...</div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Avatar</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Bio</TableHead>
                    <TableHead>Filters</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDesigners.map((designer) => (
                    <TableRow key={designer.id}>
                      <TableCell>
                        <img
                          src={designer.avatar_url || "/placeholder.svg"}
                          alt={designer.name}
                          className="w-12 h-12 object-cover rounded-full"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{designer.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{designer.bio}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {designer.men_only && <Badge variant="outline">Men</Badge>}
                          {designer.women_only && <Badge variant="outline">Women</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={designer.featured ? "default" : "secondary"}>
                          {designer.featured ? "Featured" : "Not Featured"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleFeatured(designer.id, designer.featured)}
                          >
                            <Star
                              className={`h-4 w-4 ${
                                designer.featured ? "fill-yellow-400 text-yellow-400" : ""
                              }`}
                            />
                          </Button>
                          <Link to={`/admintesora/designers/${designer.id}/edit`}>
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(designer.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {filteredDesigners.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No designers found</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDesigners;
