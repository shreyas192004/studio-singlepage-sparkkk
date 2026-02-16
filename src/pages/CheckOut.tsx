// src/pages/CheckoutPage.tsx
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Download, Tag, X, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
// @ts-ignore - html2pdf doesn't have perfect TS types
import html2pdf from 'html2pdf.js';

// Razorpay global type
declare global {
  interface Window {
    Razorpay: any;
  }
}

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cart, cartTotal, clearCart, updateQuantity, removeFromCart } = useCart();
  const { user, session } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    address: '',
    city: '',
    pincode: '',
    phone: '',
    specialInstructions: '',
  });
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Coupon and discount states
  const [couponCode, setCouponCode] = useState('');

  // Coupon with percentage discount
  type AppliedCoupon = {
    code: string;
    discountPercent: number;      // Percentage value (0-100)
    calculatedDiscount: number;   // Calculated ₹ amount
  };

  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const [isFirstOrder, setIsFirstOrder] = useState(false);
  const [firstOrderDiscount, setFirstOrderDiscount] = useState(0);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // ---------- helpers ----------
  const escapeHtml = (s: string | number | null | undefined) => {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  // Check first order status
  useEffect(() => {
    const checkFirstOrder = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_order_stats')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(); // no 406 on 0 rows

        if (error) {
          console.error('Error checking first order:', error);
          setIsFirstOrder(false);
          return;
        }

        if (!data) {
          // no stats row yet → definitely first order
          setIsFirstOrder(true);
        } else {
          setIsFirstOrder(data.order_count === 0 && !data.first_order_discount_used);
        }
      } catch (err) {
        console.error('Error checking first order:', err);
        setIsFirstOrder(false);
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
      toast.error("Please enter a coupon code");
      return;
    }

    setApplyingCoupon(true);

    try {
      const { data, error } = await supabase
        .from("coupon_codes")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toast.error("Invalid coupon code");
        return;
      }

      const coupon = data as any;
      const now = new Date();

      // ✅ Safe date validation
      const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
      const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

      if (validFrom && now < validFrom) {
        toast.error("Coupon not yet active");
        return;
      }

      if (validUntil && now > validUntil) {
        toast.error("Coupon has expired");
        return;
      }

      // Usage limit
      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        toast.error("Coupon usage limit reached");
        return;
      }

      // Min order check
      const minOrder = Number(coupon.min_order_amount ?? 0);
      if (cartTotal < minOrder) {
        toast.error(`Minimum order amount is ₹${minOrder}`);
        return;
      }

      // ✅ PERCENTAGE: discount_amount is a percentage (0-100)
      const discountPercent = Number(coupon.discount_amount ?? 0);

      // Validate percentage range
      if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
        toast.error("Invalid coupon configuration");
        return;
      }

      // Calculate discount as percentage of cart total
      const calculatedDiscount = Math.round((cartTotal * discountPercent) / 100);

      if (calculatedDiscount <= 0) {
        toast.error("Invalid discount amount");
        return;
      }

      setAppliedCoupon({
        code: coupon.code,
        discountPercent,
        calculatedDiscount,
      });

      toast.success(
        `${discountPercent}% OFF applied (-₹${calculatedDiscount})`
      );
    } catch (err) {
      console.error("Error applying coupon:", err);
      toast.error("Failed to apply coupon");
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
  const totalDiscount = (appliedCoupon?.calculatedDiscount || 0) + firstOrderDiscount;
  const finalTotal = Math.max(0, cartTotal - totalDiscount);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  // Cart modification handlers
  const handleIncrease = (item: any) => {
    const nextQty = (Number(item.quantity) || 0) + 1;
    if (nextQty > 9) return; // Limit to 9 items per type
    updateQuantity(item.id, nextQty, item.size, item.color);
  };

  const handleDecrease = (item: any) => {
    const nextQty = (Number(item.quantity) || 0) - 1;
    if (nextQty < 1) {
      removeFromCart(item.id, item.size, item.color);
      return;
    }
    updateQuantity(item.id, nextQty, item.size, item.color);
  };

  // ---------- Invoice HTML + PDF ----------
  const generateInvoiceHTML = (orderNumber: string) => {
    const invoiceDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const itemsRows = cart
      .map(
        (item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>
            ${item.size
            ? `<span style="display:inline-block;margin-right:8px;background:#e3f2fd;padding:3px 8px;border-radius:4px;font-weight:600;">Size&nbsp;${escapeHtml(
              item.size
            )}</span>`
            : ''
          }
            ${item.color
            ? `<span style="display:inline-block;margin-right:8px;background:#e3f2fd;padding:3px 8px;border-radius:4px;font-weight:600;">Color&nbsp;${escapeHtml(
              item.color
            )}</span>`
            : ''
          }
          </td>
          <td class="right">${item.quantity}</td>
          <td class="right">Rs ${item.price.toFixed(2)}</td>
          <td class="right">Rs ${(item.price * item.quantity).toFixed(2)}</td>
        </tr>`
      )
      .join('');

    return `
    <!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice #${orderNumber}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
    color: #333;
    line-height: 1.5;
    font-size: 12px;
    background: #fff;
  }
  .page {
    /* Reduced width from 800px to 700px to fit standard A4 margins */
    width: 700px;
    margin: 20px auto;
    padding: 10px;
  }
  .header {
    text-align: center;
    margin-bottom: 22px;
    padding-bottom: 14px;
    border-bottom: 2px solid #000;
  }
  .header h1 {
    margin: 0;
    font-size: 28px;
    letter-spacing: 1px;
  }
  .header p {
    margin: 3px 0;
    color: #666;
  }
  .invoice-info {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 22px;
    width: 100%;
  }
  .info-column {
    flex: 1;
    /* Forces blocks to stay within their half of the page */
    max-width: 48%; 
  }
  .section-title {
    font-size: 11px;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    margin-bottom: 6px;
    letter-spacing: 0.5px;
  }
  .info-block {
    font-size: 12px;
    line-height: 1.4;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }
  th {
    background-color: #f8f9fa;
    padding: 10px;
    text-align: left;
    border-bottom: 2px solid #ddd;
    font-weight: 600;
  }
  td {
    padding: 10px;
    border-bottom: 1px solid #eee;
    vertical-align: top;
  }
  .right { 
    text-align: right; 
    /* Padding buffer to prevent edge cropping */
    padding-right: 8px; 
  }
  .totals {
    width: 280px;
    margin-left: auto;
    margin-top: 20px;
  }
  .totals td {
    border: none;
    padding: 5px 10px;
  }
  .total-row {
    font-weight: 700;
    font-size: 15px;
    border-top: 2px solid #000 !important;
  }
  .total-row td {
      padding-top: 10px;
  }
  .footer {
    margin-top: 40px;
    text-align: center;
    color: #999;
    font-size: 11px;
    padding-top: 15px;
    border-top: 1px solid #eee;
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>INVOICE</h1>
    <p>Order #${escapeHtml(orderNumber)}</p>
    <p>${escapeHtml(invoiceDate)}</p>
  </div>

  <div class="invoice-info">
    <div class="info-column">
      <div class="section-title">Bill To</div>
      <div class="info-block">
        <strong>${escapeHtml(formData.name)}</strong><br/>
        ${escapeHtml(formData.address)}<br/>
        ${escapeHtml(formData.city)}, ${escapeHtml(formData.pincode)}<br/>
        <strong>Phone:</strong> ${escapeHtml(formData.phone)}<br/>
        <strong>Email:</strong> ${escapeHtml(formData.email)}
      </div>
    </div>
    <div class="info-column" style="text-align: right;">
      <div class="section-title">Ship To</div>
      <div class="info-block">
        <strong>${escapeHtml(formData.name)}</strong><br/>
        ${escapeHtml(formData.address)}<br/>
        ${escapeHtml(formData.city)}, ${escapeHtml(formData.pincode)}
      </div>
    </div>
  </div>

  <div class="section-title">Items</div>
  <table>
    <thead>
      <tr>
        <th style="width: 28%;">Item</th>
        <th style="width: 32%;">Details</th>
        <th style="width: 10%;" class="right">Qty</th>
        <th style="width: 15%;" class="right">Price</th>
        <th style="width: 15%;" class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td>Subtotal</td>
      <td class="right">Rs ${cartTotal.toFixed(2)}</td>
    </tr>
    ${appliedCoupon
        ? `<tr style="color:#16a34a;">
             <td>Coupon (${escapeHtml(appliedCoupon.code)}):</td>
             <td class="right">-Rs ${appliedCoupon.calculatedDiscount.toFixed(2)}</td>
           </tr>`
        : ''
      }
    ${firstOrderDiscount > 0
        ? `<tr style="color:#16a34a;">
             <td>First Order Discount (5%):</td>
             <td class="right">-Rs ${firstOrderDiscount.toFixed(2)}</td>
           </tr>`
        : ''
      }
    <tr>
      <td>Shipping</td>
      <td class="right">Free</td>
    </tr>
    <tr class="total-row">
      <td>Total</td>
      <td class="right">Rs ${finalTotal.toFixed(2)}</td>
    </tr>
  </table>

  <div class="footer">
    Thank you for your purchase!<br/>
    If you have any questions about this invoice, please contact us.
  </div>
</div>
</body>
</html>
`;
  };

  const generateInvoicePDF = (orderNumber: string) => {
    const html = generateInvoiceHTML(orderNumber);

    const opt = {
      margin: 8,
      filename: `Invoice_${orderNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    };

    // @ts-ignore
    html2pdf().set(opt).from(html).save();
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (
      !formData.email ||
      !formData.name ||
      !formData.address ||
      !formData.city ||
      !formData.pincode ||
      !formData.phone
    ) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!user) {
      toast.error('Please sign in to place an order');
      return;
    }

    if (finalTotal <= 0) {
      toast.error('Order total must be greater than 0 to proceed with payment');
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  // 👉 Helper: create order in Supabase AFTER payment is verified
  const createOrderInSupabase = async (
    newOrderId: string,
    razorpayPaymentId: string,
    razorpayOrderId: string
  ) => {
    if (!user) throw new Error('No user found while creating order');

    // 1) Create shipping address
    const { data: addressData, error: addressError } = await supabase
      .from('addresses')
      .insert({
        user_id: user.id,
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

    // 2) Generate and upload invoice HTML to storage
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
        user_id: user.id,
        order_number: newOrderId,
        total_amount: finalTotal,
        status: 'pending',
        payment_status: 'paid',
        payment_method: 'razorpay',
        shipping_address_id: addressData.id,
        billing_address_id: addressData.id,
        invoice_url: urlData.publicUrl,
        notes: (() => {
          let notes = '';
          if (appliedCoupon) {
            notes += `Coupon: ${appliedCoupon.code} (${appliedCoupon.discountPercent}% OFF, -₹${appliedCoupon.calculatedDiscount})`;
          }
          if (firstOrderDiscount > 0) {
            if (notes) notes += ', ';
            notes += `First Order Discount (-₹${firstOrderDiscount})`;
          }
          if (formData.specialInstructions.trim()) {
            if (notes) notes += '. ';
            notes += `Special Instructions: ${formData.specialInstructions.trim()}`;
          }

          // Aggregate Item notes
          const itemNotes = cart
            .map(item => (item as any).note ? `${item.name}: ${(item as any).note}` : null)
            .filter(Boolean)
            .join("; ");

          if (itemNotes) {
            notes = notes ? `${notes} | ${itemNotes}` : itemNotes;
          }

          // Append Razorpay IDs
          const rpInfo = `Difference: RP_OID: ${razorpayOrderId} | RP_PID: ${razorpayPaymentId}`;
          notes = notes ? `${notes} | ${rpInfo}` : rpInfo;

          return notes || null;
        })(),
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
        .maybeSingle();

      if (existingStats) {
        await supabase
          .from('user_order_stats')
          .update({
            first_order_discount_used: true,
            order_count: existingStats.order_count + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      } else {
        await supabase.from('user_order_stats').insert({
          user_id: user.id,
          order_count: 1,
          first_order_discount_used: true,
        });
      }
    }

    // 7) Insert order items
    const orderItems = cart.map((item) => ({
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

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

    if (itemsError) throw itemsError;

    // 8) 🔁 RESET AI GENERATION COUNT IF >= 20
    if (user) {
      try {
        const { data: genStats, error: genError } = await supabase
          .from('user_generation_stats')
          .select('generation_count')
          .eq('user_id', user.id)
          .maybeSingle();

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

    // auto-download PDF
    setTimeout(() => {
      generateInvoicePDF(newOrderId);
    }, 500);

    toast.success('Order placed successfully!');
  };

  // 🔐 MAIN: Confirm button → Razorpay via supabase.functions.invoke → then create order
  const confirmAndPlaceOrder = async () => {
    setShowConfirmDialog(false);
    setIsProcessing(true);

    try {
      if (!user || !session) {
        toast.error('Session expired. Please sign in again.');
        setIsProcessing(false);
        return;
      }

      const newOrderId = `ORD${Date.now().toString().slice(-8)}`;

      // 1️⃣ Create Razorpay order via Edge Function WITH AUTH HEADER
      const { data, error } = await supabase.functions.invoke('razorpay-create-order', {
        body: {
          amount: finalTotal, // rupees
          currency: 'INR',
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error || !data) {
        console.error('razorpay-create-order error:', error);
        if ((error as any)?.context) {
          try {
            const ctx = await (error as any).context.json();
            console.error('Edge Function response:', ctx);
          } catch (e) {
            console.error('Failed to parse error context:', e);
          }
        }
        toast.error('Failed to start payment');
        setIsProcessing(false);
        return;
      }

      const { orderId, keyId, amount, currency } = data as any;

      // 2️⃣ Open Razorpay Checkout
      const options = {
        key: keyId,
        amount, // in paise (from function)
        currency,
        name: 'Tesora Lifestyle',
        description: `Order ${newOrderId}`,
        order_id: orderId,
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: '#111827',
        },
        handler: async (response: any) => {
          try {
            // 3️⃣ Verify payment via Edge Function (also with auth header)
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              'razorpay-verify-payment',
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              }
            );

            if (verifyError || !verifyData || !(verifyData as any).success) {
              console.error('razorpay-verify-payment error:', verifyError, verifyData);
              toast.error('Payment verification failed');
              setIsProcessing(false);
              return;
            }

            // 4️⃣ Payment is verified → create order in Supabase
            await createOrderInSupabase(
              newOrderId,
              response.razorpay_payment_id,
              response.razorpay_order_id
            );
          } catch (err: any) {
            console.error('Error after payment:', err);
            toast.error(
              err?.message || 'Something went wrong after payment. Please contact support.'
            );
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            toast.message('Payment cancelled');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error('Error starting Razorpay:', error);
      toast.error('Failed to start payment. Please try again.');
      setIsProcessing(false);
    }
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
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Order Placed Successfully!</h2>
            <p className="text-muted-foreground mb-4">Order ID: {orderId}</p>
            <p className="text-sm text-muted-foreground mb-6">
              Your invoice PDF has been downloaded. A confirmation email has been sent to{' '}
              {formData.email}
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

  // Main checkout UI
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
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
                    {formData.name}
                    <br />
                    {formData.address}
                    <br />
                    {formData.city}, {formData.pincode}
                    <br />
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
                        Coupon ({appliedCoupon.code}): -Rs {appliedCoupon.calculatedDiscount.toFixed(2)}
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
                    <div key={`${item.id}-${index}`} className="flex gap-3 relative group">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-sm truncate pr-6">{item.name}</h4>
                          <button
                            onClick={() => removeFromCart(item.id, item.size, item.color)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {(item as any).note && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Note: {(item as any).note}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          {item.size && <span>Size: {item.size}</span>}
                          {item.color && <span>Color: {item.color}</span>}
                        </div>

                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleDecrease(item)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="text-sm font-medium w-4 text-center">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleIncrease(item)}
                              disabled={item.quantity >= 9}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <span className="text-sm font-semibold">
                            Rs {(item.price * item.quantity).toFixed(2)}
                          </span>
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
                      <span className="font-medium text-green-700">
                        {appliedCoupon.code}
                      </span>
                      <span className="text-green-600">
                        (-₹{appliedCoupon.calculatedDiscount})
                      </span>
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
                    <span>-Rs {appliedCoupon.calculatedDiscount.toFixed(2)}</span>
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
