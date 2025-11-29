import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAdmin } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, BarChart3, LogOut, ShoppingCart, Ticket, CreditCard } from "lucide-react";

const AdminDashboard = () => {
  const { isAdmin, loading, signOut } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/admintesora");
    }
  }, [isAdmin, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/admintesora");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link to="/admintesora/products">
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

          <Link to="/admintesora/designers">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <Users className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Designers</CardTitle>
                <CardDescription>Manage designer profiles</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Add, edit, and delete designer profiles and their portfolios.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admintesora/orders">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <ShoppingCart className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Orders</CardTitle>
                <CardDescription>Manage customer orders</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View and manage all orders, invoices, and delivery status.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admintesora/analytics">
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

          <Link to="/admintesora/coupons">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <Ticket className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Coupons</CardTitle>
                <CardDescription>Manage discount codes</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Create and manage coupon codes like TESORA100, TESORA500, etc.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admintesora/AI-Orders">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <Ticket className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>AI Orders</CardTitle>
                <CardDescription>Manage AI-generated orders</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View and manage all AI-generated orders.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admintesora/designer-payments">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CreditCard className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Designer Payments</CardTitle>
                <CardDescription>Manage designer payouts</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View designer earnings, process payments, and track payment history.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;