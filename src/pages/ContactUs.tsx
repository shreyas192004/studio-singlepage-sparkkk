// src/pages/ContactUs.tsx
import React from "react";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Clock,
} from "lucide-react";

const ContactUs: React.FC = () => {
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
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 rounded-full mb-4">
              <MessageCircle className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-foreground">
              Contact Us
            </h1>
            <p className="text-lg text-muted-foreground">
              Have a question about your order, AI designs, or customisation?
              We’re here to help.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto">
          {/* Info Card */}
          <div className="bg-card rounded-xl shadow-lg border border-border p-8 space-y-6">
            <h2 className="text-2xl font-bold text-foreground mb-1">
              Reach Out to Tesora
            </h2>
            <p className="text-muted-foreground mb-4">
              You can contact us using the details below. For faster resolution,
              please mention your <strong>Order ID</strong> (if applicable).
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 mt-1 text-accent" />
                <div>
                  <h3 className="font-semibold text-foreground">Email</h3>
                  <p className="text-muted-foreground">
                    For general queries, feedback, or support:
                  </p>
                  <a
                    href="mailto:tesora.dev@gmail.com"
                    className="text-accent hover:underline text-sm"
                  >
                    tesora.dev@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 mt-1 text-accent" />
                <div>
                  <h3 className="font-semibold text-foreground">Phone</h3>
                  <p className="text-muted-foreground">
                    For urgent issues like cancellations within 10 minutes or
                    damaged orders:
                  </p>
                  <a
                    href="tel:9921283434"
                    className="text-accent hover:underline text-sm"
                  >
                    +91 99212 83434
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 mt-1 text-accent" />
                <div>
                  <h3 className="font-semibold text-foreground">Address</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Tesora Lifestyle
                    <br />
                    FC Road, Pune, 411004
                    <br />
                    Maharashtra, India
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 mt-1 text-accent" />
                <div>
                  <h3 className="font-semibold text-foreground">
                    Support Hours
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Monday – Saturday: 10:00 AM – 7:00 PM (IST)
                    <br />
                    Sundays & public holidays: Email support only
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              For refund or replacement requests, please remember to share
              <strong> Order ID, photos/videos, and unboxing video</strong>, as
              per our Refund & Cancellation Policy.
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

export default ContactUs;
