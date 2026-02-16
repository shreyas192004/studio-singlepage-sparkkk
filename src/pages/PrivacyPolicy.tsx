// src/pages/PrivacyPolicy.tsx
import React from "react";
import { ArrowLeft, Shield, Lock, AlertCircle } from "lucide-react";

const PrivacyPolicy: React.FC = () => {
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
              <Shield className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-foreground">
              Privacy Policy
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
          {/* Notice */}
          <div className="bg-accent/5 border-l-4 border-accent rounded-r-lg p-6 mb-8">
            <div className="flex gap-4">
              <AlertCircle className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg mb-2 text-foreground">
                  Your Privacy Matters
                </h3>
                <p className="text-muted-foreground">
                  This Privacy Policy explains how Tesora Lifestyle (“Tesora”,
                  “we”, “us”, or “our”) collects, uses, stores, and protects
                  your information when you use our website, tools, and
                  services. It is prepared in line with the{" "}
                  <strong>Digital Personal Data Protection (DPDP) Act 2023</strong> (India).
                </p>
              </div>
            </div>
          </div>

          {/* Card */}
          <div className="bg-card rounded-xl shadow-lg border border-border p-8 md:p-10 space-y-8">
            {/* 1. Scope */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                1. Scope of This Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                This Privacy Policy applies to all users of our Website
                (www.tesoralifestyle.com), AI design tools, e-commerce
                functionalities, and any related services offered by Tesora.
              </p>
            </section>

            {/* 2. Information We Collect */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                2. Information We Collect
              </h2>

              <h3 className="font-semibold text-foreground mb-1">
                2.1 Information You Provide Directly
              </h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                <li>Name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Delivery/billing address</li>
                <li>Design prompts, text inputs, and uploaded materials</li>
                <li>Support queries and communication with us</li>
              </ul>

              <h3 className="font-semibold text-foreground mb-1">
                2.2 Automatically Collected Information
              </h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                <li>IP address</li>
                <li>Browser type and version</li>
                <li>Device identifiers</li>
                <li>Pages visited and time spent</li>
                <li>Referring URLs and usage analytics</li>
              </ul>

              <h3 className="font-semibold text-foreground mb-1">
                2.3 Cookies & Tracking Technologies
              </h3>
              <p className="text-muted-foreground">
                We may use cookies and similar technologies to remember your
                preferences, maintain sessions, and analyze usage patterns. You
                can manage cookies via your browser settings; however, some
                features may not work correctly if cookies are disabled.
              </p>
            </section>

            {/* 3. How We Use Your Information */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                3. How We Use Your Information
              </h2>
              <p className="text-muted-foreground mb-3">
                We use the collected data for purposes including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>creating and processing your orders</li>
                <li>providing AI-generated designs and previews</li>
                <li>improving Website performance and user experience</li>
                <li>responding to your support requests and queries</li>
                <li>detecting and preventing fraud or misuse</li>
                <li>complying with legal obligations</li>
              </ul>
            </section>

            {/* 4. AI Prompts & Design Data */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                4. AI Prompts & Design Data
              </h2>
              <p className="text-muted-foreground mb-3">
                When you enter prompts or upload designs, we may store:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-3">
                <li>prompt text and design descriptions</li>
                <li>generated outputs and previews</li>
                <li>logs of interactions with the AI system</li>
              </ul>
              <p className="text-muted-foreground">
                Unless you opt out (where available), anonymized prompts and
                outputs may be used for{" "}
                <strong>model improvement, analytics, and feature development</strong>.
                Sensitive personal data (e.g., financial credentials, Aadhaar
                numbers, etc.) should not be entered into design prompts.
              </p>
            </section>

            {/* 5. Legal Basis (India / DPDP) */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                5. Legal Basis for Processing (India / DPDP)
              </h2>
              <p className="text-muted-foreground mb-3">
                Under the DPDP Act 2023, we process your personal data based on:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Your consent (e.g., when you sign up or place an order)</li>
                <li>
                  Performance of a contract (e.g., to deliver products you have
                  purchased)
                </li>
                <li>
                  Legitimate interests (e.g., improving services, fraud
                  prevention)
                </li>
                <li>Compliance with legal obligations</li>
              </ul>
            </section>

            {/* 6. Data Sharing */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                6. Data Sharing & Third Parties
              </h2>
              <p className="text-muted-foreground mb-3">
                We do not sell your personal data. We may share your information
                with:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>
                  <strong>Payment gateways</strong> (for processing payments)
                </li>
                <li>
                  <strong>Courier partners</strong> (for delivering your orders)
                </li>
                <li>
                  <strong>Analytics and infrastructure providers</strong> (for
                  hosting, logs, performance monitoring)
                </li>
                <li>
                  <strong>Legal or regulatory authorities</strong> when required
                  by law
                </li>
              </ul>
              <p className="text-muted-foreground mt-3">
                All such third parties are expected to handle your data in
                accordance with applicable laws and reasonable security
                practices.
              </p>
            </section>

            {/* 7. Data Retention */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                7. Data Retention
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your data for as long as necessary to fulfill the
                purposes listed in this Policy, or as required by law. Order
                records and transaction details may be retained for accounting,
                audit, and compliance requirements. AI logs and prompts may be
                stored for a limited period for improvement and debugging.
              </p>
            </section>

            {/* 8. Data Security */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                8. Data Security
              </h2>
              <div className="flex items-start gap-3 mb-3">
                <Lock className="w-5 h-5 mt-1 text-accent" />
                <p className="text-muted-foreground">
                  We use reasonable technical and organizational measures to
                  protect your data from unauthorized access, loss, or misuse.
                  However, no system is 100% secure, and we cannot guarantee
                  absolute security of data transmitted over the internet.
                </p>
              </div>
            </section>

            {/* 9. Your Rights */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                9. Your Rights & Choices
              </h2>
              <p className="text-muted-foreground mb-3">
                Depending on applicable law, you may have the right to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>access your personal data</li>
                <li>request correction of inaccurate data</li>
                <li>request deletion of certain data</li>
                <li>withdraw consent where processing is based on consent</li>
                <li>opt-out of certain analytics or marketing communications</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                To exercise these rights, you can contact us at{" "}
                <a
                  href="mailto:tesora.dev@gmail.com"
                  className="text-accent hover:underline"
                >
                  tesora.dev@gmail.com
                </a>
                . We may need to verify your identity before acting on your
                request.
              </p>
            </section>

            {/* 10. Children’s Privacy */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                10. Children’s Privacy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Our Services are intended for users who are at least 18 years
                old. Users under 18 may use the Website only under parental or
                guardian supervision. We do not knowingly collect personal data
                from children without appropriate consent.
              </p>
            </section>

            {/* 11. International Transfers (if any) */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                11. Data Storage & International Transfers
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Your data may be stored on servers located within or outside
                India, depending on our infrastructure providers. By using the
                Services, you consent to such transfers subject to reasonable
                safeguards being in place.
              </p>
            </section>

            {/* 12. Changes to This Policy */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                12. Changes to This Privacy Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. Any
                changes will be posted on this page with an updated “Last
                Updated” date. Continued use of the Website after changes means
                you accept the revised Policy.
              </p>
            </section>

            {/* 13. Contact / Grievance Officer */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                13. Contact & Grievance Redressal
              </h2>
              <p className="text-muted-foreground mb-3">
                For privacy-related concerns, data requests, or complaints under
                DPDP, you may contact our Grievance Officer:
              </p>
              <div className="bg-muted rounded-lg p-4 space-y-1">
                <p className="text-foreground">
                  <strong>Name:</strong> Soumitra Satish Ranade
                </p>
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
                  <strong>Address:</strong> FC Road, Pune, 411004
                </p>
              </div>
            </section>
          </div>

          {/* Footer Note */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              By using the Tesora website and services, you consent to the
              collection and use of your information as described in this
              Privacy Policy.
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

export default PrivacyPolicy;
