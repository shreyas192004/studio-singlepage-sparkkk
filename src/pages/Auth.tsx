// src/pages/Auth.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Sparkles, Mail, Lock, ArrowRight, ShoppingBag, Zap, Shield, TrendingUp } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/ai-generator");
  }, [user, navigate]);

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
      if (result.error) {
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
        // For redirect after password sign-in, session listener will trigger navigation
        navigate("/ai-generator");
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(error.message ?? "Google sign-in failed");
      } else {
        toast('Redirecting to Google...', { type: 'info' });
        // The redirect happens automatically, no further action here.
      }
    } catch (err) {
      toast.error("Google sign-in error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    {
      icon: Sparkles,
      title: "Unlimited AI Designs",
      description: "Create as many unique designs as you want",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: ShoppingBag,
      title: "Exclusive Access",
      description: "Get early access to limited edition drops",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Generate designs in seconds, not minutes",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your designs are yours, always protected",
      color: "from-green-500 to-emerald-500"
    }
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Left */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center p-12 relative z-10">
        <div className="max-w-lg space-y-8 animate-fade-in">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm animate-scale-in">
              <TrendingUp className="w-4 h-4" />
              Join 10,000+ Creators
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-fade-in" style={{ animationDelay: "0.1s" }}>
              Design the Future
            </h1>
            <p className="text-xl text-muted-foreground animate-fade-in" style={{ animationDelay: "0.2s" }}>
              Transform your ideas into stunning AI-powered designs in seconds
            </p>
          </div>

          <div className="grid gap-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            {benefits.map((b, i) => (
              <div key={b.title} className="flex items-start gap-4 p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-lg group animate-fade-in" style={{ animationDelay: `${0.4 + i * 0.1}s` }}>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${b.color} shadow-lg group-hover:scale-110 transition-transform`}>
                  <b.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right - form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <Card className="w-full max-w-md p-8 shadow-2xl border-2 border-border/50 backdrop-blur-sm bg-card/95 animate-scale-in">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg mb-4 animate-scale-in" style={{ animationDelay: "0.2s" }}>
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent animate-fade-in" style={{ animationDelay: "0.3s" }}>
                {isLogin ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: "0.4s" }}>
                {isLogin ? "Sign in to continue your creative journey" : "Start creating amazing designs today"}
              </p>
            </div>

            {/* Google button */}
            <div className="space-y-3">
              <Button onClick={handleGoogle} className="w-full h-12 flex items-center justify-center gap-3 border border-border/50 bg-card/80 hover:scale-105">
                <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" className="w-5 h-5" />
                Continue with Google
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-sm"><span className="px-4 bg-card text-muted-foreground">or sign in with email</span></div>
              </div>
            </div>

            {/* Email form */}
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in" style={{ animationDelay: "0.5s" }}>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-foreground">
                  <Mail className="w-4 h-4" /> Email
                </Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 text-base" disabled={loading} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2 text-foreground">
                  <Lock className="w-4 h-4" /> Password
                </Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 text-base" disabled={loading} required minLength={6} />
              </div>

              <Button type="submit" className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent" disabled={loading}>
                {loading ? <div className="flex items-center gap-2"><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />{isLogin ? "Signing in..." : "Creating account..."}</div> : <div className="flex items-center gap-2">{isLogin ? "Sign In" : "Create Account"}<ArrowRight className="w-5 h-5" /></div>}
              </Button>
            </form>

            <div className="text-center space-y-4">
              <Button type="button" variant="ghost" onClick={() => setIsLogin((s) => !s)} className="w-full">
                {isLogin ? <>Don't have an account? <span className="text-primary ml-1">Sign up</span></> : <>Already have an account? <span className="text-primary ml-1">Sign in</span></>}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
