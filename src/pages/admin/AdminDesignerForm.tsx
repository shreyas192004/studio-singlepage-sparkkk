import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAdmin } from "@/contexts/AdminContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Home } from "lucide-react";
import { toast } from "sonner";

type DesignerForm = {
  name: string;
  bio: string;
  avatar_url: string;
  social_links: {
    instagram: string;
    twitter: string;
    website: string;
  };
  featured: boolean;
  men_only: boolean;
  women_only: boolean;
};

const AdminDesignerForm = () => {
  const { isAdmin, loading } = useAdmin();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState<DesignerForm>({
    name: "",
    bio: "",
    avatar_url: "",
    social_links: {
      instagram: "",
      twitter: "",
      website: "",
    },
    featured: false,
    men_only: false,
    women_only: false,
  });

  // new auth inputs
  const [authData, setAuthData] = useState({
    email: "",
    password: "",
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/admintesora");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isEdit) {
      fetchDesigner();
    }
  }, [isEdit, id]);

  const fetchDesigner = async () => {
    const { data, error } = await (supabase as any).from("designers").select("*").eq("id", id).single();
    if (error) {
      toast.error("Failed to load designer");
      navigate("/admintesora/designers");
    } else if (data) {
      setFormData({
        name: data.name,
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
        social_links: data.social_links || { instagram: "", twitter: "", website: "" },
        featured: data.featured || false,
        men_only: data.men_only || false,
        women_only: data.women_only || false,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isEdit) {
        // Update existing designer row directly
        const { error } = await (supabase as any).from("designers").update(formData).eq("id", id);
        if (error) {
          toast.error("Failed to update designer");
        } else {
          toast.success("Designer updated successfully");
          navigate("/admintesora/designers");
        }
      } else {
        // CREATE flow using supabase.functions.invoke
        if (!authData.email || !authData.password) {
          toast.error("Email and password are required to create a designer");
          setSubmitting(false);
          return;
        }

        const { data, error } = await (supabase as any).functions.invoke("create-designer", {
          body: {
            email: authData.email,
            password: authData.password,
            designer: formData,
          },
        });

        if (error) {
          // supabase error object may contain message or statusText
          console.error("create-designer invoke error:", error);
          toast.error((error as any).message || "Failed to create designer");
        } else {
          // `data` is what your edge function returns (user + designer)
          console.log("create-designer response:", data);
          toast.success("Designer created successfully");
          navigate("/admintesora/designers");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{isEdit ? "Edit Designer" : "Add Designer"}</h1>
            <Link to="/admintesora/dashboard">
              <Button variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="avatar_url">Avatar URL</Label>
                <Input
                  id="avatar_url"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  placeholder="https://instagram.com/username"
                  value={formData.social_links.instagram}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      social_links: { ...formData.social_links, instagram: e.target.value },
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="twitter">Twitter</Label>
                <Input
                  id="twitter"
                  placeholder="https://twitter.com/username"
                  value={formData.social_links.twitter}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      social_links: { ...formData.social_links, twitter: e.target.value },
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="https://example.com"
                  value={formData.social_links.website}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      social_links: { ...formData.social_links, website: e.target.value },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, featured: checked as boolean })}
                />
                <Label htmlFor="featured">Featured Designer</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="men_only"
                  checked={formData.men_only}
                  onCheckedChange={(checked) => setFormData({ ...formData, men_only: checked as boolean })}
                />
                <Label htmlFor="men_only">Men Only</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="women_only"
                  checked={formData.women_only}
                  onCheckedChange={(checked) => setFormData({ ...formData, women_only: checked as boolean })}
                />
                <Label htmlFor="women_only">Women Only</Label>
              </div>
            </CardContent>
          </Card>

          {!isEdit && (
            <Card>
              <CardHeader>
                <CardTitle>Account (will create auth user)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    required
                    type="email"
                    value={authData.email}
                    onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    required
                    type="password"
                    value={authData.password}
                    onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                  />
                </div>

                <p className="text-sm text-muted-foreground">
                  A user will be created in Supabase Auth and linked to the designer record.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Update Designer" : "Create Designer"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/admintesora/designers")}>
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AdminDesignerForm;
