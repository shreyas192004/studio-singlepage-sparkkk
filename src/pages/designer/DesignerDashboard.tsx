import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDesigner } from "@/contexts/DesignerContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, BarChart3, LogOut } from "lucide-react";

const DesignerDashboard = () => {
  const { isDesigner, loading, signOut } = useDesigner();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isDesigner) {
      navigate("/designer/login");
    }
  }, [isDesigner, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/designer/login");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isDesigner) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Designer Dashboard</h1>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link to="/designer/products">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <Package className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Products</CardTitle>
                <CardDescription>Manage product catalog</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Add, edit, and delete products. Manage inventory and pricing.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/designer/orders">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <Users className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Orders</CardTitle>
                <CardDescription>Manage designer profiles</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  view and manage customer orders, track order status, and handle returns.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/designer/analytics">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <BarChart3 className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Analytics</CardTitle>
                <CardDescription>View insights and metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Track clicks, purchases, and user engagement across the platform.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/designer/payments">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <BarChart3 className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Payment</CardTitle>
                <CardDescription>View insights and metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Track clicks, purchases, and user engagement across the platform.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default DesignerDashboard;