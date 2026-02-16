// src/pages/ShippingPolicy.tsx
import React from "react";
import { ArrowLeft, Package, AlertCircle, Truck } from "lucide-react";

const ShippingPolicy: React.FC = () => {
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

      {/* Header Section */}
      <div className="bg-gradient-to-b from-primary/20 to-background py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 rounded-full mb-4">
              <Package className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Shipping & Delivery Policy
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
                  Important Notice
                </h3>
                <p className="text-muted-foreground">
                  At Tesora Lifestyle, every product is custom-made based on the
                  design you create or request. Shipping timelines may vary
                  depending on production load and delivery location.
                </p>
              </div>
            </div>
          </div>

          {/* Card */}
          <div className="bg-card rounded-xl shadow-lg border border-border p-8 md:p-10 space-y-10">
            {/* 1. Processing Time */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                1. Processing Time
              </h2>
              <p className="text-muted-foreground mb-3">
                Processing begins only after successful payment.
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>
                  <strong>Standard orders:</strong> 7 business days
                </li>
                <li>
                  <strong>Custom prints / user-provided garments:</strong> 3–5
                  business days
                </li>
              </ul>
            </section>

            {/* 2. Delivery Time */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                2. Delivery Time
              </h2>
              <div className="flex items-start gap-3 mb-3">
                <Truck className="w-5 h-5 mt-1 text-accent" />
                <p className="text-muted-foreground">
                  Delivery timelines mentioned below are estimates and may vary
                  based on courier performance and location.
                </p>
              </div>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>
                  <strong>Metro cities:</strong> 7–10 days
                </li>
                <li>
                  <strong>Non-metro / remote areas:</strong> 8–12 days
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                <strong>Shipping partners (tentative):</strong> India Post,
                BlueDart, Shiprocket, Delhivery or other reputed courier
                partners, as may be finalised by Tesora.
              </p>
            </section>

            {/* 3. Shipping Charges */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                3. Shipping Charges
              </h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>
                  <strong>Standard shipping:</strong> ₹80
                </li>
                <li>
                  <strong>Free shipping on orders above:</strong> ₹1899
                </li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Shipping charges, if any, will be visible at checkout before you
                complete payment.
              </p>
            </section>

            {/* 4. Tracking Information */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                4. Tracking Information
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Once your order is dispatched, a tracking link will be shared
                with you via SMS/Email/WhatsApp (as available). You can use this
                link to track your shipment status until delivery.
              </p>
            </section>

            {/* 5. Delivery Issues */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                5. Delivery Issues & Delays
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                While we partner with reliable courier services, Tesora is not
                responsible for delays caused by factors outside our control,
                including but not limited to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Incorrect or incomplete address provided by the customer</li>
                <li>Courier delays, operational issues, or network disruptions</li>
                <li>Customer unavailability at the time of delivery</li>
                <li>
                  Unforeseen events such as weather conditions, strikes, natural
                  calamities, public holidays, etc.
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                In such cases, Tesora will assist you in coordinating with the
                courier partner, but cannot be held liable for any consequential
                loss or claims.
              </p>
            </section>
          </div>

          {/* Footer Note */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              By placing an order on Tesora, you acknowledge that you have read,
              understood, and agree to this Shipping & Delivery Policy.
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

export default ShippingPolicy;

