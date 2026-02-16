// src/pages/CancellationAndRefundPolicy.tsx
import React from "react";
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  XCircle,
  CheckCircle,
} from "lucide-react";

const CancellationAndRefundPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-primary/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <a
              href="/"
              className="text-lg md:text-xl font-bold tracking-wider text-primary-foreground"
            >
              TESORA
            </a>
            <a
              href="/"
              className="flex items-center gap-2 text-primary-foreground hover:text-accent transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-b from-primary/20 to-background py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 rounded-full mb-4">
              <RefreshCw className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Refund & Cancellation Policy
            </h1>
            <p className="text-lg text-muted-foreground">
              Last Updated: 24/11/2025
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto">
          {/* Important Notice */}
          <div className="bg-accent/5 border-l-4 border-accent rounded-r-lg p-6 mb-8">
            <div className="flex gap-4">
              <AlertCircle className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg mb-2 text-foreground">
                  Custom-Made Products
                </h3>
                <p className="text-muted-foreground">
                  Tesora creates custom-made products, and each order is printed
                  individually based on your prompt or design request. For this
                  reason, we follow strict guidelines for refunds and
                  cancellations.
                </p>
              </div>
            </div>
          </div>

          {/* Card */}
          <div className="bg-card rounded-xl shadow-lg border border-border p-8 md:p-10 space-y-10">
            {/* 1. Cancellation Policy */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                1. Cancellation Policy
              </h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>
                  Orders can be cancelled within{" "}
                  <strong>10 minutes of placing the order</strong>.
                </li>
                <li>
                  Once production/printing begins,{" "}
                  <strong>cancellations are not allowed</strong>.
                </li>
                <li>
                  <strong>To request cancellation:</strong> Call us on{" "}
                  <a
                    href="tel:9921283434"
                    className="text-accent hover:underline"
                  >
                    9921283434
                  </a>{" "}
                  with your Order ID.
                </li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Refunds, if applicable on cancellation within the allowed
                window, will be processed to the original payment method as per
                your bank/UPI/card provider timelines.
              </p>
            </section>

            {/* 2. Refund Policy - Non-Refundable Cases */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                2. Refund Policy – Non-Refundable Cases
              </h2>
              <p className="text-muted-foreground mb-3">
                Due to the personalised nature of our products, the following
                orders are <strong>not eligible for refund, exchange or return</strong>:
              </p>
              <div className="bg-destructive/5 border-l-4 border-destructive rounded-r-lg p-4 space-y-3">
                {[
                  "AI-generated designs",
                  "Custom clothing printed on demand",
                  "User-owned clothing provided for customization",
                  "Incorrect prompt/design submitted by the user",
                  "Minor color variations between screen and print",
                  "Wrong size ordered by the customer",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 text-muted-foreground"
                  >
                    <XCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed mt-4 font-semibold">
                Users are requested to carefully review the design, size chart,
                and product details before adding items to the cart and
                completing the purchase.
              </p>
            </section>

            {/* 3. Valid Refund / Replacement Cases */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                3. Refunds / Replacements Are Only Provided If:
              </h2>
              <p className="text-muted-foreground mb-3">
                Tesora will issue a replacement or refund only if:
              </p>
              <div className="bg-green-500/5 border-l-4 border-green-500 rounded-r-lg p-4 space-y-3">
                {[
                  "Product is damaged on arrival",
                  "Wrong product delivered",
                  "Incorrect size shipped (different from what was ordered)",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 text-muted-foreground"
                  >
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed mt-4 mb-2">
                <strong>To qualify for a refund or replacement, you must:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Raise the issue within 48 hours of delivery</li>
                <li>Provide your Order ID</li>
                <li>Share clear pictures/videos of the defect or wrong item</li>
                <li>
                  Provide an <strong>unboxing video (compulsory)</strong> showing
                  the package being opened
                </li>
              </ul>
            </section>

            {/* 4. Replacement Policy */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                4. Replacement Policy
              </h2>
              <p className="text-muted-foreground mb-3">
                Replacement of a product is subject to the following conditions:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Product availability at the time of request</li>
                <li>Successful verification of the defect or issue</li>
                <li>
                  Return of the product in{" "}
                  <strong>unused, unwashed, and original condition</strong>,
                  with tags and packaging intact (where applicable)
                </li>
              </ul>
            </section>

            {/* 5. Return Shipping */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                5. Return Shipping
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Tesora will bear the return shipping cost{" "}
                <strong>only for valid defect or wrong product cases</strong> as
                listed above. For all other reasons (including size issues,
                change of mind, or design dissatisfaction), returns and refunds
                are <strong>not supported</strong>.
              </p>
            </section>

            {/* 6. Contact */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                6. Contact Us
              </h2>
              <p className="text-muted-foreground mb-3">
                For refund/cancellation support or to raise an issue related to
                your order, you can reach us at:
              </p>
              <div className="bg-muted rounded-lg p-4 space-y-1">
                <p className="text-foreground">
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:tesora.dev@gmail.com"
                    className="text-accent hover:underline"
                  >
                    tesora.dev@gmail.com
                  </a>
                </p>
                <p className="text-foreground">
                  <strong>Phone:</strong>{" "}
                  <a
                    href="tel:9921283434"
                    className="text-accent hover:underline"
                  >
                    9921283434
                  </a>
                </p>
                <p className="text-foreground">
                  <strong>Address:</strong> FC Road, Pune
                </p>
              </div>
            </section>
          </div>

          {/* Footer Note */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              By placing an order, you acknowledge that you have read,
              understood, and agree to be bound by this Refund & Cancellation
              Policy.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm opacity-80">
            © 2025 Tesora Lifestyle. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default CancellationAndRefundPolicy;
