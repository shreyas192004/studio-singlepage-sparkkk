import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Mail, Lock, ArrowRight, ShoppingBag, Zap, Shield, TrendingUp, ArrowLeft, Check } from "lucide-react";

// --- Types ---

interface LoginUIProps {
  email: string;
  setEmail: (e: string) => void;
  password: string;
  setPassword: (p: string) => void;
  handleGoogle: () => void;
  handleSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  setIsLogin: (val: boolean) => void;
  isForgotPassword: boolean;
  setIsForgotPassword: (val: boolean) => void;
  handleForgotPassword: (e: React.FormEvent) => void;
}

interface SignupUIProps {
  email: string;
  setEmail: (e: string) => void;
  password: string;
  setPassword: (p: string) => void;
  handleGoogle: () => void;
  handleSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  setIsLogin: (val: boolean) => void;
}

// --- Components ---

const LoginUI = ({
  email,
  setEmail,
  password,
  setPassword,
  handleGoogle,
  handleSubmit,
  loading,
  setIsLogin,
  isForgotPassword,
  setIsForgotPassword,
  handleForgotPassword,
}: LoginUIProps) => {
  if (isForgotPassword) {
    return (
      <Card className="w-full max-w-md p-8 shadow-xl border-border/40 backdrop-blur-xl bg-card/90 rounded-2xl animate-fade-in">
        <div className="text-center space-y-2 mb-6">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Mail className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold">Reset Password</h2>
          <p className="text-sm text-muted-foreground">
            Enter your email to receive a reset link
          </p>
        </div>

        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email Address</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="h-11 rounded-xl"
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl font-semibold">
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsForgotPassword(false)}
            className="w-full h-11 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sign In
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md p-8 shadow-xl border-border/40 backdrop-blur-xl bg-card/90 rounded-2xl animate-fade-in">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access your account
        </p>
      </div>

      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="h-11 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-xs text-primary hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="h-11 rounded-xl"
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl font-semibold">
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full h-11 rounded-xl"
        >
          <img
            src="https://www.svgrepo.com/show/355037/google.svg"
            className="w-4 h-4 mr-2"
            alt="Google"
          />
          Google
        </Button>
      </div>

      <div className="mt-8 text-center text-sm">
        <span className="text-muted-foreground">Don't have an account? </span>
        <button
          onClick={() => setIsLogin(false)}
          className="text-primary hover:underline font-semibold"
        >
          Sign up
        </button>
      </div>
    </Card>
  );
};

const SignupUI = ({
  email,
  setEmail,
  password,
  setPassword,
  handleGoogle,
  handleSubmit,
  loading,
  setIsLogin,
}: SignupUIProps) => {
  const benefits = [
    "Unlimited AI Designs",
    "High-speed Generation",
    "Commercial Rights",
    "Secure & Private"
  ];

  return (
    <Card className="w-full max-w-lg p-8 md:p-10 shadow-2xl border-border/40 backdrop-blur-xl bg-card/95 rounded-3xl animate-scale-in">
      <div className="space-y-6">
        <div className="text-center md:text-left space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
            <Sparkles className="w-3 h-3" />
            Start creating for free
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Create your account</h2>
          <p className="text-muted-foreground">
            Join thousands of creators designing the future with AI
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {benefits.map((benefit, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-green-500" />
              {benefit}
            </div>
          ))}
        </div>

        <div className="space-y-4 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full h-12 rounded-xl text-base"
          >
            <img
              src="https://www.svgrepo.com/show/355037/google.svg"
              className="w-5 h-5 mr-2"
              alt="Google"
            />
            Sign up with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-12 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-12 rounded-xl"
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters long
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-bold text-base bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
            >
              {loading ? "Creating account..." : "Get Started"}
            </Button>
          </form>
        </div>

        <div className="text-center text-sm pt-2">
          <span className="text-muted-foreground">Already have an account? </span>
          <button
            onClick={() => setIsLogin(true)}
            className="text-primary hover:underline font-semibold"
          >
            Sign in
          </button>
        </div>
      </div>
    </Card>
  );
};

// --- Main Auth Component ---

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // BUG 8 FIX: track password-recovery mode so we don't redirect over the form
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // BUG 4 FIX: honour the page the user came from
  const from: string = (location.state as any)?.from || "/ai-generator";

  // BUG 27 FIX: listen for PASSWORD_RECOVERY event from Supabase
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // BUG 4 FIX: don't redirect while user is recovering their password
  useEffect(() => {
    if (user && !isPasswordRecovery) navigate(from, { replace: true });
  }, [user, navigate, isPasswordRecovery, from]);

  // BUG 8 FIX: handler to set a new password after clicking the reset link
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password updated! You are now signed in.");
        setIsPasswordRecovery(false);
        navigate(from, { replace: true });
      }
    } catch (err) {
      toast.error("Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset link sent to your email!");
        setIsForgotPassword(false);
      }
    } catch (err) {
      toast.error("Failed to send reset email");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const result = isLogin ? await signIn(email, password) : await signUp(email, password);
      if (result?.error) {
        const msg = result.error.message ?? String(result.error);
        if (msg.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        } else if (msg.includes("User already registered") || msg.includes("already exists")) {
          toast.error("This email is already registered. Please login instead.");
        } else {
          toast.error(msg);
        }
      } else {
        toast.success(isLogin ? "Welcome back!" : "Account created! Check your email if confirmation is needed.");
        navigate(from, { replace: true });
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // BUG 4 FIX: read `from` and pass it as redirect destination for Google OAuth
  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${from}`,
        },
      });

      if (error) {
        toast.error(error.message ?? "Google sign-in failed");
      }
    } catch (err) {
      toast.error("Google sign-in error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // BUG 8 FIX: show password-update form when user follows the reset link
  if (isPasswordRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md p-8 shadow-xl border-border/40 backdrop-blur-xl bg-card/90 rounded-2xl">
          <div className="text-center space-y-2 mb-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Lock className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">Set New Password</h2>
            <p className="text-sm text-muted-foreground">
              Enter your new password below
            </p>
          </div>
          <form onSubmit={handleSetNewPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className="h-11 rounded-xl"
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl font-semibold">
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-background">

      {/* Animated Background */}
      <div className="absolute inset-0 w-full h-full pointer-events-none -z-10">
        <div
          className="absolute top-[-20%] right-[-10%] w-[70vw] h-[70vw] min-w-[600px] min-h-[600px] bg-primary/20 rounded-full blur-[120px] animate-blob mix-blend-multiply filter opacity-70"
          style={{ animationDelay: '0s' }}
        />
        <div
          className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] min-w-[500px] min-h-[500px] bg-indigo-500/20 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply filter opacity-70"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute top-[20%] left-[20%] w-[40vw] h-[40vw] min-w-[400px] min-h-[400px] bg-rose-500/10 rounded-full blur-[80px] animate-blob animation-delay-4000 mix-blend-multiply filter opacity-70"
          style={{ animationDelay: '4s' }}
        />
        <div
          className="absolute bottom-[20%] right-[20%] w-[25vw] h-[25vw] min-w-[300px] min-h-[300px] bg-teal-500/10 rounded-full blur-[60px] animate-blob mix-blend-multiply filter opacity-70"
          style={{ animationDelay: '6s' }}
        />
      </div>

      <div className="relative z-10 w-full flex justify-center">
        {isLogin ? (
          <LoginUI
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            handleGoogle={handleGoogle}
            handleSubmit={handleSubmit}
            loading={loading}
            setIsLogin={setIsLogin}
            isForgotPassword={isForgotPassword}
            setIsForgotPassword={setIsForgotPassword}
            handleForgotPassword={handleForgotPassword}
          />
        ) : (
          <SignupUI
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            handleGoogle={handleGoogle}
            handleSubmit={handleSubmit}
            loading={loading}
            setIsLogin={setIsLogin}
          />
        )}
      </div>
    </div>
  );
};

export default Auth;