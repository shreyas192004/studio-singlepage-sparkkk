import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdmin } from "@/contexts/AdminContext";
import { toast } from "sonner";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn, signUp, isAdmin, loading } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAdmin) {
      navigate("/admintesora/dashboard");
    }
  }, [isAdmin, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = isSignUp 
      ? await signUp(email, password)
      : await signIn(email, password);
    
    if (error) {
      toast.error(isSignUp ? "Sign up failed. Please try again." : "Invalid credentials");
      setIsLoading(false);
      return;
    }

    if (isSignUp) {
      toast.success("Account created! Please check your email to verify (or proceed if auto-confirm is enabled).");
    } else {
      toast.success("Welcome, Admin!");
    }
    navigate("/admintesora/dashboard");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? "Admin Sign Up" : "Admin Login"}
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? "Create your admin account" 
              : "Enter your credentials to access the admin panel"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading 
                ? (isSignUp ? "Creating account..." : "Signing in...") 
                : (isSignUp ? "Sign Up" : "Sign In")}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              className="w-full" 
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;