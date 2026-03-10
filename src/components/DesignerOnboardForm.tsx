import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Palette, Mail, Lock, User, FileText } from "lucide-react";

const DesignerOnboardForm = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    bio: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      // First, create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/designer/login`,
          data: {
            display_name: formData.name,
          },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered") || authError.message.includes("already exists")) {
          toast.error("This email is already registered. Please login instead.");
        } else {
          toast.error(authError.message);
        }
        return;
      }

      if (!authData.user) {
        toast.error("Failed to create user account");
        return;
      }

      // Create designer profile linked to the user
      const { error: designerError } = await supabase.from("designers").insert({
        name: formData.name,
        bio: formData.bio || null,
        user_id: authData.user.id,
        featured: false,
      } as any);

      if (designerError) {
        console.error("Designer creation error:", designerError);
        // Still show success for account creation
        toast.success("Account created! Designer profile pending admin approval.");
      } else {
        toast.success("Designer account created successfully! Check your email to confirm, then login at /designer/login");
      }

      setFormData({ name: "", email: "", password: "", bio: "" });
      setOpen(false);
    } catch (err: any) {
      console.error("Onboard error:", err);
      toast.error(err?.message || "Failed to create designer account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2 border-dashed border-primary/30 hover:border-primary">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Palette className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Become a Designer</CardTitle>
            <CardDescription>
              Join our platform and showcase your designs to thousands of customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Apply Now
            </Button>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Designer Registration
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4" /> Designer Name *
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Your brand or designer name"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" /> Email *
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="designer@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="w-4 h-4" /> Password *
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Min 6 characters"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="flex items-center gap-2">
              <FileText className="w-4 h-4" /> Bio (optional)
            </Label>
            <Textarea
              id="bio"
              name="bio"
              placeholder="Tell us about yourself and your design style..."
              value={formData.bio}
              onChange={handleChange}
              disabled={loading}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating Account...
              </div>
            ) : (
              "Register as Designer"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            After registration, you'll receive a confirmation email. Once confirmed, 
            login at the designer portal to manage your products.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DesignerOnboardForm;
