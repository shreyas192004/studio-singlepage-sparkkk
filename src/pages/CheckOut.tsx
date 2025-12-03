import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Download, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/contexts/CartContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cart, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    address: '',
    city: '',
    pincode: '',
    phone: '',
  });
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Coupon and discount states
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [isFirstOrder, setIsFirstOrder] = useState(false);
  const [firstOrderDiscount, setFirstOrderDiscount] = useState(0);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Check first order status
  useEffect(() => {
    const checkFirstOrder = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_order_stats')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (error || !data) {
            setIsFirstOrder(true);
          } else {
            setIsFirstOrder(data.order_count === 0 && !data.first_order_discount_used);
          }
        } catch (err) {
          console.error('Error checking first order:', err);
          setIsFirstOrder(false);
        }
      }
    };
    checkFirstOrder();
  }, [user]);

  // Calculate first order discount (5% on orders > 4000)
  useEffect(() => {
    if (isFirstOrder && cartTotal > 4000) {
      setFirstOrderDiscount(Math.round(cartTotal * 0.05));
    } else {
      setFirstOrderDiscount(0);
    }
  }, [cartTotal, isFirstOrder]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    setApplyingCoupon(true);
    try {
      const { data, error } = await supabase
        .from('coupon_codes')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        toast.error('Invalid coupon code');
        return;
      }

      const coupon = data as any;
      const now = new Date();
      const validFrom = new Date(coupon.valid_from);
      const validUntil = new Date(coupon.valid_until);

      if (now < validFrom || now > validUntil) {
        toast.error('Coupon has expired or is not yet valid');
        return;
      }

      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        toast.error('Coupon usage limit reached');
        return;
      }

      if (cartTotal < coupon.min_order_amount) {
        toast.error(`Minimum order amount is ₹${coupon.min_order_amount} for this coupon`);
        return;
      }

      setAppliedCoupon({
        code: coupon.code,
        discount: Number(coupon.discount_amount),
      });
      toast.success(`Coupon applied! ₹${coupon.discount_amount} discount`);
    } catch (err) {
      console.error('Error applying coupon:', err);
      toast.error('Failed to apply coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast.success('Coupon removed');
  };

  // Calculate totals
  const totalDiscount = (appliedCoupon?.discount || 0) + firstOrderDiscount;
  const finalTotal = Math.max(0, cartTotal - totalDiscount);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const generateInvoicePDF = (orderNumber: string) => {
    const invoiceHTML = generateInvoiceHTML(orderNumber);
    
    // Create a Blob from the HTML
    const blob = new Blob([invoiceHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${orderNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.email || !formData.name || !formData.address || !formData.city || !formData.pincode || !formData.phone) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!user) {
      toast.error('Please sign in to place an order');
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const confirmAndPlaceOrder = async () => {
  setShowConfirmDialog(false);
  setIsProcessing(true);

  try {
    // Generate order number
    const newOrderId = `ORD${Date.now().toString().slice(-8)}`;

    // 1) Create shipping address
    const { data: addressData, error: addressError } = await supabase
      .from('addresses')
      .insert({
        user_id: user!.id,
        address_type: 'shipping',
        full_name: formData.name,
        phone: formData.phone,
        address_line1: formData.address,
        city: formData.city,
        state: formData.city, // Using city as state for now
        postal_code: formData.pincode,
        country: 'India',
      })
      .select()
      .single();

    if (addressError) throw addressError;

    // 2) Generate and upload invoice to storage
    const invoiceHTML = generateInvoiceHTML(newOrderId);
    const blob = new Blob([invoiceHTML], { type: 'text/html' });
    
    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(`${newOrderId}.html`, blob, {
        contentType: 'text/html',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 3) Get public URL for the invoice
    const { data: urlData } = supabase.storage
      .from('invoices')
      .getPublicUrl(`${newOrderId}.html`);

    // 4) Insert order into database with invoice URL and address
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user!.id,
        order_number: newOrderId,
        total_amount: finalTotal,
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'cash_on_delivery',
        shipping_address_id: addressData.id,
        billing_address_id: addressData.id,
        invoice_url: urlData.publicUrl,
        notes: appliedCoupon
          ? `Coupon: ${appliedCoupon.code} (-₹${appliedCoupon.discount})${
              firstOrderDiscount > 0
                ? `, First Order Discount (-₹${firstOrderDiscount})`
                : ''
            }`
          : firstOrderDiscount > 0
          ? `First Order Discount (-₹${firstOrderDiscount})`
          : null,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 5) Update coupon usage if coupon was applied
    if (appliedCoupon) {
      const { data: couponData } = await supabase
        .from('coupon_codes')
        .select('current_uses')
        .eq('code', appliedCoupon.code)
        .single();
      
      if (couponData) {
        await supabase
          .from('coupon_codes')
          .update({ current_uses: couponData.current_uses + 1 })
          .eq('code', appliedCoupon.code);
      }
    }

    // 6) Update first order discount tracking if used
    if (firstOrderDiscount > 0 && user) {
      const { data: existingStats } = await supabase
        .from('user_order_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingStats) {
        await supabase
          .from('user_order_stats')
          .update({ 
            first_order_discount_used: true,
            order_count: existingStats.order_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_order_stats')
          .insert({
            user_id: user.id,
            order_count: 1,
            first_order_discount_used: true,
          });
      }
    }

    // 7) Insert order items
    const orderItems = cart.map(item => ({
      order_id: orderData.id,
      product_id: item.id.toString(),
      product_name: item.name,
      product_image: item.image,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
      size: item.size || null,
      color: item.color || null,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // 8) 🔁 RESET AI GENERATION COUNT IF >= 20
    if (user) {
      try {
        const { data: genStats, error: genError } = await supabase
          .from('user_generation_stats')
          .select('generation_count')
          .eq('user_id', user.id)
          .single();

        if (!genError && genStats && genStats.generation_count >= 20) {
          await supabase
            .from('user_generation_stats')
            .update({
              generation_count: 0,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);
        }
      } catch (err) {
        console.error('Error resetting generation count:', err);
      }
    }

    // 9) Final UI updates
    setOrderId(newOrderId);
    setOrderPlaced(true);

    setTimeout(() => {
      generateInvoicePDF(newOrderId);
    }, 500);

    toast.success('Order placed successfully!');
  } catch (error: any) {
    console.error('Error placing order:', error);
    toast.error(error.message || 'Failed to place order. Please try again.');
  } finally {
    setIsProcessing(false);
  }
};

  const generateInvoiceHTML = (orderNumber: string) => {
    const invoiceDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice #${orderNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 40px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            font-size: 32px;
          }
          .header p {
            margin: 5px 0;
            color: #666;
          }
          .invoice-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .section {
            margin-bottom: 20px;
          }
          .section h3 {
            margin-bottom: 10px;
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background-color: #f5f5f5;
            padding: 12px;
            text-align: left;
            border-bottom: 2px solid #ddd;
            font-weight: 600;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #eee;
          }
          .text-right {
            text-align: right;
          }
          .totals {
            margin-left: auto;
            width: 300px;
          }
          .totals table {
            margin-bottom: 0;
          }
          .totals td {
            border: none;
            padding: 8px 12px;
          }
          .total-row {
            font-weight: bold;
            font-size: 18px;
            border-top: 2px solid #000 !important;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <p>Order #${orderNumber}</p>
          <p>Date: ${invoiceDate}</p>
        </div>

        <div class="invoice-info">
          <div class="section">
            <h3>Bill To:</h3>
            <p><strong>${formData.name}</strong></p>
            <p>${formData.address}</p>
            <p>${formData.city}, ${formData.pincode}</p>
            <p>Phone: ${formData.phone}</p>
            <p>Email: ${formData.email}</p>
          </div>
          <div class="section">
            <h3>Ship To:</h3>
            <p><strong>${formData.name}</strong></p>
            <p>${formData.address}</p>
            <p>${formData.city}, ${formData.pincode}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Details</th>
              <th class="text-right">Quantity</th>
              <th class="text-right">Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${cart.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>
                  ${item.size ? `Size: ${item.size}<br>` : ''}
                  ${item.color ? `Color: ${item.color}` : ''}
                </td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">Rs ${item.price.toFixed(2)}</td>
                <td class="text-right">Rs ${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <table>
            <tr>
              <td>Subtotal:</td>
              <td class="text-right">Rs ${cartTotal.toFixed(2)}</td>
            </tr>
            ${appliedCoupon ? `
            <tr style="color: #16a34a;">
              <td>Coupon (${appliedCoupon.code}):</td>
              <td class="text-right">-Rs ${appliedCoupon.discount.toFixed(2)}</td>
            </tr>
            ` : ''}
            ${firstOrderDiscount > 0 ? `
            <tr style="color: #16a34a;">
              <td>First Order Discount (5%):</td>
              <td class="text-right">-Rs ${firstOrderDiscount.toFixed(2)}</td>
            </tr>
            ` : ''}
            <tr>
              <td>Shipping:</td>
              <td class="text-right">Free</td>
            </tr>
            <tr class="total-row">
              <td>Total:</td>
              <td class="text-right">Rs ${finalTotal.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <p>Thank you for your purchase!</p>
          <p>If you have any questions about this invoice, please contact us.</p>
        </div>
      </body>
      </html>
    `;
  };

  const handleContinue = () => {
    clearCart();
    navigate('/');
  };

  // Redirect if cart is empty and order not placed
  if (cart.length === 0 && !orderPlaced) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
          <Button onClick={() => navigate('/')}>Continue Shopping</Button>
        </div>
      </div>
    );
  }

  // Order success screen
  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-card border rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Order Placed Successfully!</h2>
            <p className="text-muted-foreground mb-4">Order ID: {orderId}</p>
            <p className="text-sm text-muted-foreground mb-6">
              Your invoice has been downloaded. A confirmation email has been sent to {formData.email}
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => generateInvoicePDF(orderId)}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Invoice Again
              </Button>
              <Button
                onClick={handleContinue}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <CreditCard className="w-5 h-5" />
            <h1 className="text-xl font-bold">Checkout</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handlePlaceOrder} className="space-y-6">
              <div className="bg-card border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-card border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      placeholder="123 Main St, Apartment 4B"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        placeholder="Mumbai"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="pincode">Pincode *</Label>
                      <Input
                        id="pincode"
                        placeholder="400001"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-lg"
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : `Place Order - Rs ${finalTotal.toFixed(2)}`}
              </Button>
            </form>
          </div>

          {/* Confirmation Dialog */}
          <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Your Order</DialogTitle>
                <DialogDescription>
                  Please review your order details before confirming.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Shipping To:</h4>
                  <p className="text-sm text-muted-foreground">
                    {formData.name}<br />
                    {formData.address}<br />
                    {formData.city}, {formData.pincode}<br />
                    {formData.phone}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Order Summary:</h4>
                  <div className="text-sm space-y-1">
                    <p className="text-muted-foreground">
                      {cart.length} item(s) - Subtotal: Rs {cartTotal.toFixed(2)}
                    </p>
                    {appliedCoupon && (
                      <p className="text-green-600">
                        Coupon ({appliedCoupon.code}): -Rs {appliedCoupon.discount.toFixed(2)}
                      </p>
                    )}
                    {firstOrderDiscount > 0 && (
                      <p className="text-green-600">
                        First Order Discount: -Rs {firstOrderDiscount.toFixed(2)}
                      </p>
                    )}
                    <p className="font-semibold text-foreground pt-1 border-t">
                      Total: Rs {finalTotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmAndPlaceOrder}
                  disabled={isProcessing}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {isProcessing ? 'Processing...' : 'Confirm Order'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card border rounded-lg p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              
              <ScrollArea className="max-h-96 mb-4">
                <div className="space-y-4">
                  {cart.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="flex gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{item.name}</h4>
                        {item.size && (
                          <p className="text-xs text-muted-foreground">Size: {item.size}</p>
                        )}
                        {item.color && (
                          <p className="text-xs text-muted-foreground">Color: {item.color}</p>
                        )}
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                          <span className="text-sm font-semibold">Rs {(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Coupon Input */}
              <div className="border-t pt-4 mb-4">
                <Label className="text-sm font-medium mb-2 block">Have a coupon?</Label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-700">{appliedCoupon.code}</span>
                      <span className="text-green-600">(-₹{appliedCoupon.discount})</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={removeCoupon}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={applyCoupon}
                      disabled={applyingCoupon}
                    >
                      {applyingCoupon ? 'Applying...' : 'Apply'}
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>Rs {cartTotal.toFixed(2)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Coupon ({appliedCoupon.code})</span>
                    <span>-Rs {appliedCoupon.discount.toFixed(2)}</span>
                  </div>
                )}
                {firstOrderDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>First Order Discount (5%)</span>
                    <span>-Rs {firstOrderDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>Rs {finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};