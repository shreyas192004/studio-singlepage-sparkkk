import React from 'react';
import { ArrowLeft, Package, RefreshCw, AlertCircle, Truck, XCircle, CheckCircle } from 'lucide-react';

export default function ShippingAndRefundPolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-primary/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <a href="/" className="text-lg md:text-xl font-bold tracking-wider text-primary-foreground">TESORA</a>
            <a href="/" className="flex items-center gap-2 text-primary-foreground hover:text-accent transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Header Section */}
      <div className="bg-gradient-to-b from-primary/20 to-background py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 rounded-full mb-4">
              <Package className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">Shipping & Delivery Policy</h1>
            <p className="text-lg text-muted-foreground">Last Updated: 24/11/2025</p>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-accent/5 border-l-4 border-accent rounded-r-lg p-6 mb-8">
            <div className="flex gap-4">
              <AlertCircle className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg mb-2 text-foreground">Important Notice</h3>
                <p className="text-muted-foreground">
                  At Tesora Lifestyle, every product is custom-made based on the design you create or request. 
                  Shipping timelines may vary depending on production load and delivery location.
                </p>
              </div>
            </div>
          </div>

          {/* Shipping Policy Content */}
          <div className="bg-card rounded-xl shadow-lg border border-border p-8 md:p-12 space-y-8 mb-12">
            
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">1. Processing Time</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>Standard orders:</strong> 7 business days</li>
                <li><strong>Custom prints / user-provided garments:</strong> 3-5 business days</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Processing begins only after successful payment.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">2. Delivery Time</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>Metro cities:</strong> 7-10 days</li>
                <li><strong>Non-metro / remote areas:</strong> 8-12 days</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                <strong>Shipping partners:</strong> Yet to be fixed. (India Post/BlueDart/Shiprocket/Delhivery)
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">3. Shipping Charges</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>Standard shipping:</strong> ₹80</li>
                <li><strong>Free shipping above:</strong> ₹1899</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">4. Tracking Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                A tracking link will be sent via SMS/Email/WhatsApp once your order is dispatched.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">5. Delivery Issues</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Tesora is not responsible for delays caused by:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>incorrect address</li>
                <li>courier delays</li>
                <li>customer unavailability</li>
                <li>unforeseen events (weather, strikes, etc.)</li>
              </ul>
            </section>

          </div>

          {/* Refund & Cancellation Policy Header */}
          <div className="bg-gradient-to-b from-primary/10 to-background py-8 rounded-xl mb-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 rounded-full mb-4">
                <RefreshCw className="w-8 h-8 text-accent" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">Refund & Cancellation Policy</h1>
              <p className="text-lg text-muted-foreground">Last Updated: 24/11/2025</p>
            </div>
          </div>

          {/* Important Notice for Refunds */}
          <div className="bg-accent/5 border-l-4 border-accent rounded-r-lg p-6 mb-8">
            <div className="flex gap-4">
              <AlertCircle className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg mb-2 text-foreground">Custom-Made Products</h3>
                <p className="text-muted-foreground">
                  Tesora creates custom-made products, and each order is printed individually based on your prompt or design request. 
                  For this reason, we follow strict guidelines for refunds and cancellations.
                </p>
              </div>
            </div>
          </div>

          {/* Refund Policy Content */}
          <div className="bg-card rounded-xl shadow-lg border border-border p-8 md:p-12 space-y-8">
            
            {/* Section 1 - Cancellation */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">1. Cancellation Policy</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Orders can be cancelled within 10 minutes of placing the order.</li>
                <li>After production begins, cancellations are not allowed.</li>
                <li><strong>To request cancellation:</strong> Call us on 9921283434 with your order ID.</li>
              </ul>
            </section>

            {/* Section 2 - Refund Policy */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">2. Refund Policy</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Refunds are not available for:
              </p>
              <div className="bg-destructive/5 border-l-4 border-destructive rounded-r-lg p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">AI-generated designs</span>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Custom clothing printed on demand</span>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">User-owned clothing provided for customization</span>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Incorrect prompt/design submitted by the user</span>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Minor color variations (screen vs print)</span>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Wrong size ordered by the customer</span>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed mt-4 font-semibold">
                Users are requested to check the designs before adding item to cart.
              </p>
            </section>

            {/* Section 3 - Valid Refund Cases */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">3. Refunds Are Only Provided If:</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Tesora will issue a replacement or refund only if:
              </p>
              <div className="bg-green-500/5 border-l-4 border-green-500 rounded-r-lg p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Product is damaged on arrival</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Wrong product delivered</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Incorrect size shipped (different from what was ordered)</span>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed mt-4 mb-2">
                <strong>To qualify, please provide within 48 hours of delivery:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Order ID</li>
                <li>Clear pictures/videos of defect</li>
                <li>Unboxing video (compulsory)</li>
              </ul>
            </section>

            {/* Section 4 - Replacement Policy */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">4. Replacement Policy</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Replacements are subject to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>product availability</li>
                <li>verification of defect</li>
                <li>return of unused/unwashed product</li>
              </ul>
            </section>

            {/* Section 5 - Return Shipping */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">5. Return Shipping</h2>
              <p className="text-muted-foreground leading-relaxed">
                Tesora will bear return shipping cost only for valid defects. For all other reasons, returns/refunds are not supported.
              </p>
            </section>

            {/* Section 6 - Contact */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">6. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                For refund/cancellation support:
              </p>
              <div className="bg-muted rounded-lg p-4 space-y-1">
                <p className="text-foreground"><strong>Email:</strong> tesora.dev@gmail.com</p>
                <p className="text-foreground"><strong>Phone:</strong> 9921283434</p>
                <p className="text-foreground"><strong>Address:</strong> FC Road, Pune</p>
              </div>
            </section>

          </div>

          {/* Footer Note */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              By using the Tesora website and services, you acknowledge that you have read, understood, and agree to be bound by these policies.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              For questions or concerns, please contact us at <a href="mailto:tesora.dev@gmail.com" className="text-accent hover:underline">tesora.dev@gmail.com</a>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm opacity-80">© 2025 Tesora Lifestyle. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}