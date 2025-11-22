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
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/ai-generator");
    }
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
      const { error } = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        } else if (error.message.includes("User already registered")) {
          toast.error("This email is already registered. Please login instead.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success(isLogin ? "Welcome back!" : "Account created! Welcome aboard!");
        navigate("/ai-generator");
      }
    } catch (error: any) {
      toast.error("Something went wrong. Please try again.");
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
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Left Panel - Benefits */}
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
            {benefits.map((benefit, index) => (
              <div
                key={benefit.title}
                className="flex items-start gap-4 p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-lg group animate-fade-in"
                style={{ animationDelay: `${0.4 + index * 0.1}s` }}
              >
                <div className={`p-3 rounded-xl bg-gradient-to-br ${benefit.color} shadow-lg group-hover:scale-110 transition-transform`}>
                  <benefit.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <Card className="w-full max-w-md p-8 shadow-2xl border-2 border-border/50 backdrop-blur-sm bg-card/95 animate-scale-in">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg mb-4 animate-scale-in" style={{ animationDelay: "0.2s" }}>
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent animate-fade-in" style={{ animationDelay: "0.3s" }}>
                {isLogin ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: "0.4s" }}>
                {isLogin 
                  ? "Sign in to continue your creative journey" 
                  : "Start creating amazing designs today"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in" style={{ animationDelay: "0.5s" }}>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-foreground">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-base transition-all duration-200 focus:scale-105"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2 text-foreground">
                  <Lock className="w-4 h-4" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 text-base transition-all duration-200 focus:scale-105"
                  disabled={loading}
                  required
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 hover:scale-105 hover:shadow-xl group"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {isLogin ? "Sign In" : "Create Account"}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </Button>
            </form>

            {/* Toggle */}
            <div className="text-center space-y-4 animate-fade-in" style={{ animationDelay: "0.6s" }}>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-card text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsLogin(!isLogin)}
                className="w-full font-medium hover:bg-primary/10 transition-all duration-200 hover:scale-105"
                disabled={loading}
              >
                {isLogin ? (
                  <>Don't have an account? <span className="text-primary ml-1">Sign up</span></>
                ) : (
                  <>Already have an account? <span className="text-primary ml-1">Sign in</span></>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
