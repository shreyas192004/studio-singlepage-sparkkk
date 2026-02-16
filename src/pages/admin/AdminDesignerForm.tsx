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
import { ArrowLeft, Home } from "lucide-react";
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
  boys_only: boolean;
  girls_only: boolean;
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
    boys_only: false,
    girls_only: false,
  });

  // Auth inputs for create flow
  const [authData, setAuthData] = useState({
    email: "",
    password: "",
  });

  // Avatar file
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  const fetchDesigner = async () => {
    const { data, error } = await supabase
      .from("designers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("fetchDesigner error:", error);
      toast.error("Failed to load designer");
      navigate("/admintesora/designers");
    } else if (data) {
      setFormData({
        name: data.name || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
        social_links:
          data.social_links || { instagram: "", twitter: "", website: "" },
        featured: data.featured || false,
        men_only: data.men_only || false,
        women_only: data.women_only || false,
        boys_only: data.boys_only || false,
        girls_only: data.girls_only || false,
      });
    }
  };

  // Upload avatar to storage (if selected) and return PUBLIC URL
  const uploadAvatarIfNeeded = async (): Promise<string> => {
    // No new file – keep existing URL
    if (!avatarFile) return formData.avatar_url || "";

    const ext = avatarFile.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;
    const filePath = `avatars/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("designer-avatar")
      .upload(filePath, avatarFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Avatar upload error:", uploadError);
      throw new Error("Failed to upload avatar");
    }

    const path = uploadData?.path ?? filePath;

    const { data: publicUrlData } = supabase.storage
      .from("designer-avatar")
      .getPublicUrl(path);

    const publicUrl = publicUrlData.publicUrl;

    if (!publicUrl) {
      throw new Error("Could not get public URL for avatar");
    }

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Upload avatar (if needed) and get final public URL
      let avatarUrl: string;
      try {
        avatarUrl = await uploadAvatarIfNeeded();
      } catch (uploadErr: any) {
        console.error(uploadErr);
        toast.error(uploadErr.message || "Avatar upload failed");
        setSubmitting(false);
        return;
      }

      if (isEdit) {
        // UPDATE
        const updatedDesigner = {
          ...formData,
          avatar_url: avatarUrl,
        };

        const { error } = await supabase
          .from("designers")
          .update(updatedDesigner)
          .eq("id", id);

        if (error) {
          console.error("Update designer error:", error);
          toast.error("Failed to update designer");
        } else {
          toast.success("Designer updated successfully");
          navigate("/admintesora/designers");
        }
      } else {
        // CREATE
        if (!authData.email || !authData.password) {
          toast.error("Email and password are required to create a designer");
          setSubmitting(false);
          return;
        }

        const newDesigner = {
          ...formData,
          avatar_url: avatarUrl,
        };

        const { data, error } = await supabase.functions.invoke(
          "create-designer",
          {
            body: {
              email: authData.email,
              password: authData.password,
              designer: newDesigner,
            },
          }
        );

        if (error) {
          console.error("create-designer invoke error:", error);
          toast.error((error as any).message || "Failed to create designer");
        } else {
          console.log("create-designer response:", data);
          toast.success("Designer created successfully");
          navigate("/admintesora/designers");
        }
      }
    } catch (err) {
      console.error("handleSubmit error:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-5 items-center">
              <Button variant="ghost" onClick={() => navigate("/admintesora/designers")}>
                  <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold">
                {isEdit ? "Edit Designer" : "Add Designer"}
              </h1>
            </div>
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
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <div>
                  <Label htmlFor="avatar_url">Avatar URL</Label>
                  <Input
                    id="avatar_url"
                    value={formData.avatar_url}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        avatar_url: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="avatar_file">Upload Avatar</Label>
                  <Input
                    id="avatar_file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setAvatarFile(file);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    You can either paste an image URL above or upload a file
                    here. Uploaded image URL will be saved in the Avatar URL
                    field.
                  </p>
                </div>

                {formData.avatar_url && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">
                      Preview:
                    </p>
                    <img
                      src={formData.avatar_url}
                      alt="Avatar preview"
                      className="h-20 w-20 rounded-full object-cover border"
                    />
                  </div>
                )}
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
                      social_links: {
                        ...formData.social_links,
                        instagram: e.target.value,
                      },
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
                      social_links: {
                        ...formData.social_links,
                        twitter: e.target.value,
                      },
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
                      social_links: {
                        ...formData.social_links,
                        website: e.target.value,
                      },
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
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      featured: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="featured">Featured Designer</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="men_only"
                  checked={formData.men_only}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      men_only: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="men_only">Men Only</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="women_only"
                  checked={formData.women_only}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      women_only: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="women_only">Women Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="boys_only"
                  checked={formData.boys_only}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      boys_only: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="boys_only">Boys Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="girls_only"
                  checked={formData.girls_only}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      girls_only: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="girls_only">Girls Only</Label>
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
                    onChange={(e) =>
                      setAuthData({ ...authData, email: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    required
                    type="password"
                    value={authData.password}
                    onChange={(e) =>
                      setAuthData({ ...authData, password: e.target.value })
                    }
                  />
                </div>

                <p className="text-sm text-muted-foreground">
                  A user will be created in Supabase Auth and linked to the
                  designer record.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : isEdit
                ? "Update Designer"
                : "Create Designer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admintesora/designers")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AdminDesignerForm;
