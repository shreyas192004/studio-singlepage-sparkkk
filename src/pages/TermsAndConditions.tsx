import React from 'react';
import { ArrowLeft, FileText, AlertCircle } from 'lucide-react';

export default function TermsAndConditions() {
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
              <FileText className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">Terms of Use</h1>
            
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
                  These Terms of Use constitute a legally binding agreement between you and Tesora Lifestyle. 
                  By accessing or using our Website, you agree to be bound by these Terms. If you do not agree, 
                  please do not use the Website.
                </p>
              </div>
            </div>
          </div>

          {/* Terms Content */}
          <div className="bg-card rounded-xl shadow-lg border border-border p-8 md:p-12 space-y-8">
            
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">1. Introduction & Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms constitute a legally binding agreement between you and Tesora Lifestyle. By accessing this Website or using any of our Services—including AI-generated design features, customization tools, or ordering apparel—you accept these Terms and our Privacy Policy.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">2. Eligibility to Use the Website</h2>
              <p className="text-muted-foreground leading-relaxed">
                You must be at least 18 years old to use the Website. If you are under 18, you may use the Services only under the supervision of a parent or legal guardian who accepts these Terms on your behalf.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">3. Description of Services</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">Tesora provides:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>AI-powered T-shirt design generation</li>
                <li>Customization tools for apparel</li>
                <li>Printing and delivery of clothing</li>
                <li>Modification services for user-owned garments of any brand</li>
                <li>E-commerce functionality for ordering Tesora products</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Services may evolve, change, or be discontinued at any time.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">4. User Accounts & Registration</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                You may need to create an account to access certain features. You agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>provide accurate information</li>
                <li>maintain confidentiality of your login credentials</li>
                <li>accept responsibility for activities under your account</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Tesora may suspend or terminate accounts for fraudulent or abusive activity. Tesora will not be held liable for any violations of any laws caused by user inputs/prompts.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">5. Use of AI-Generated Designs</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Tesora's AI system generates artwork, apparel previews, and outputs based on the text prompts you enter. By using the AI features, you agree and understand that:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>AI output is generated algorithmically and may not be unique</li>
                <li>AI may produce unexpected, imperfect, or inaccurate results</li>
                <li>AI output may be similar to outputs requested by others</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Tesora does not guarantee artistic quality, correctness, uniqueness, or reproducibility of the generated content.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">6. Intellectual Property Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                All content on the Website—including logos, designs, software, code, layout, and UI—is owned by Tesora or its licensors. Users may not:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>copy</li>
                <li>modify</li>
                <li>reverse engineer</li>
                <li>resell</li>
                <li>exploit any part of the Website</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Your submitted prompts remain yours, but the generated output may be used by Tesora for product improvement, unless opted out as per our Privacy Policy.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">7. User-Generated Content & Prompts</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                You are solely responsible for prompts, text, designs, or materials you provide. You agree not to submit prompts that:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>infringe copyrights or trademarks</li>
                <li>include celebrities or real individuals</li>
                <li>contain hate speech, violence, or illegal content</li>
                <li>request replication of branded or copyrighted artwork (e.g., "Nike logo", "Mickey Mouse", etc.)</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Tesora reserves the right to refuse designs that violate intellectual property laws. You will be held liable for any copyright/trademark infringement arising out of the prompts given by users. You agree not to enter any words/phrases/sentences that may cause violence/hate. You agree not to engage with political and/or religious based prompts. Tesora only customises apparel based solely on user inputs, and you will be held responsible for prompts you enter.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">8. Customization of User-Owned Clothing</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Tesora offers customization of apparel only when the customer already owns the clothing item. You agree that:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>you own the clothing you provide</li>
                <li>the original brand holds no affiliation with Tesora</li>
                <li>customization is for personal use only, not resale</li>
                <li>Tesora is not responsible for defects in user-provided items</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                A consent form may be required before service is performed.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">9. Prohibited Activities</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">You agree NOT to:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>use automated bots or scrapers</li>
                <li>reverse engineer the AI system</li>
                <li>upload viruses or harmful code</li>
                <li>impersonate others</li>
                <li>perform unauthorized commercial use</li>
                <li>generate unlawful or defamatory content</li>
                <li>bypass security features</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Tesora may suspend accounts violating these rules. Tesora may pursue legal action against criminal activities under Indian Laws.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">10. Pricing, Payments & Refunds</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Prices are listed in INR and may change without notice. Refunds and exchanges and returns are not provided for:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>AI-generated designs</li>
                <li>customized items</li>
                <li>user-owned items altered</li>
                <li>garments damaged due to user misuse</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Refunds for manufacturing defects follow the Refund Policy.
              </p>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">11. Order Processing, Delivery & Turnaround Times</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Delivery timelines are estimates only. Tesora is not responsible for delays caused by:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>courier services</li>
                <li>unforeseen events</li>
                <li>incorrect address</li>
                <li>user unavailability</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Orders cannot be cancelled once payment is processed.
              </p>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">12. No Affiliation with Third-Party Brands</h2>
              <p className="text-muted-foreground leading-relaxed">
                Tesora is not affiliated, endorsed, or connected with any brand such as Zara, Nike, Louis Vuitton, H&M, or others. Customization of branded clothing is done only on user request and not marketed as a collaboration.
              </p>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">13. Consent for Modifying Customer-Owned Items</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                By submitting an item for customization, you agree that:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Tesora is authorized to alter or modify it</li>
                <li>Modifications may affect the original brand's warranty</li>
                <li>No liability is assumed for sentimental value</li>
                <li>The item cannot be represented as an original branded product after modification</li>
              </ul>
            </section>

            {/* Section 14 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">14. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">Tesora is not liable for:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>indirect, incidental, or consequential damages</li>
                <li>loss of data</li>
                <li>errors in AI output</li>
                <li>damage to user-owned clothing</li>
                <li>delays in delivery</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Liability is limited to the amount paid for the order.
              </p>
            </section>

            {/* Section 15 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">15. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Services are provided "as is" and "as available". Tesora makes no warranties regarding:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>AI output accuracy</li>
                <li>website uptime</li>
                <li>error-free functionality</li>
                <li>merchantability</li>
                <li>fitness for a particular purpose</li>
              </ul>
            </section>

            {/* Section 16 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">16. Indemnification</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                You agree to indemnify Tesora for claims arising from:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>misuse of the Website</li>
                <li>infringement caused by your prompts</li>
                <li>defamation</li>
                <li>unlawful content</li>
                <li>violation of these Terms</li>
              </ul>
            </section>

            {/* Section 17 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">17. Termination of Access</h2>
              <p className="text-muted-foreground leading-relaxed">
                Tesora may block or terminate access for any user who violates these Terms or engages in harmful behavior.
              </p>
            </section>

            {/* Section 18 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">18. Privacy Policy & Data Handling</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Your use of the Website is governed by our Privacy Policy under the DPDP Act 2023 (India). We collect:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>basic user details</li>
                <li>usage data</li>
                <li>design prompts</li>
                <li>device and cookie information</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Data is stored securely and processed for improving services.
              </p>
            </section>

            {/* Section 19 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">19. Third-Party Links & Integrations</h2>
              <p className="text-muted-foreground leading-relaxed">
                Tesora may include links to third-party services. We are not responsible for their content, privacy practices, or reliability.
              </p>
            </section>

            {/* Section 20 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">20. Changes to the Terms of Use</h2>
              <p className="text-muted-foreground leading-relaxed">
                Tesora may revise these Terms at any time. Updates will be posted on the Website with a revised "Last Updated" date. Continued use constitutes acceptance of changes.
              </p>
            </section>

            {/* Section 21 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">21. Governing Law & Jurisdiction</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Pune, Maharashtra.
              </p>
            </section>

            {/* Section 22 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">22. Grievance Officer / Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                In accordance with Indian law, the Grievance Officer shall be:
              </p>
              <div className="bg-muted rounded-lg p-4 space-y-1">
                <p className="text-foreground"><strong>Name:</strong> Soumitra Satish Ranade</p>
                <p className="text-foreground"><strong>Email:</strong> tesora.dev@gmail.com</p>
                <p className="text-foreground"><strong>Address:</strong> FC Road, Pune, 411004</p>
              </div>
            </section>

            {/* Section 23 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">23. AI Output Limitations & Accuracy Disclaimer</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">AI outputs:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>may contain distortions</li>
                <li>may not match final printed result</li>
                <li>may vary by fabric</li>
                <li>may not reflect color accuracy due to screen variations</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                You agree to accept minor variations.
              </p>
            </section>

            {/* Section 24 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">24. No Rights to AI-Generated Output</h2>
              <p className="text-muted-foreground leading-relaxed">
                Tesora grants users limited personal-use rights to AI-generated designs. Tesora may store, reuse, or analyze prompts to improve its AI. No exclusivity is provided.
              </p>
            </section>

            {/* Section 25 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">25. Use of User Prompts for Training/Improvement</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Unless specified otherwise, Tesora may use anonymized prompts to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>train its models</li>
                <li>improve user experience</li>
                <li>generate analytics</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Sensitive data is never used.
              </p>
            </section>

            {/* Section 26 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">26. Restrictions on Copyrighted or Trademarked Content</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">You must not prompt:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>brand logos</li>
                <li>copyrighted characters</li>
                <li>celebrity likenesses</li>
                <li>political party symbols</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Tesora may decline or delete such content. You accept any liability arising if Tesora gives service.
              </p>
            </section>

            {/* Section 27 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">27. Product Representation & Color Accuracy Disclaimer</h2>
              <p className="text-muted-foreground leading-relaxed">
                Images on the site, including AI mockups, are for representation. Actual product color may vary slightly.
              </p>
            </section>

            {/* Section 28 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">28. Age Restrictions for Use</h2>
              <p className="text-muted-foreground leading-relaxed">
                Users below 18 require parental consent and supervision.
              </p>
            </section>

            {/* Section 29 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">29. Fraudulent Use, Abuse & Automated Access Protection</h2>
              <p className="text-muted-foreground leading-relaxed">
                Automated access, scraping, or attempts to extract AI model behavior are strictly prohibited and liable for penal action.
              </p>
            </section>

            {/* Section 30 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">30. Data Storage & AI Logs Policy</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">Tesora may log:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>prompt inputs and outputs</li>
                <li>system usage</li>
                <li>error reports</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Retention follows our Privacy Policy.
              </p>
            </section>

            {/* Section 31 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">31. Customization of Third-Party Branded Clothing Disclaimer</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Customizing user-owned branded items does not imply:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>endorsement</li>
                <li>affiliation</li>
                <li>licensing</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Tesora only provides a modification service.
              </p>
            </section>

            {/* Section 32 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">32. "No Collaboration Implied" Clause</h2>
              <p className="text-muted-foreground leading-relaxed">
                Nothing on this Website should be interpreted as collaboration with any third-party brand unless explicitly stated.
              </p>
            </section>

            {/* Section 33 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">33. User Responsibility for Design Legality</h2>
              <p className="text-muted-foreground leading-relaxed">
                Users are responsible for ensuring their design requests do not violate laws. Tesora may reject illegal/inappropriate content.
              </p>
            </section>

            {/* Section 34 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">34. AI Errors & Glitches Not Grounds for Legal Claims</h2>
              <p className="text-muted-foreground leading-relaxed">
                AI may produce unexpected or imperfect output. Such glitches are not grounds for refunds, claims, or litigation.
              </p>
            </section>

            {/* Section 35 */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">35. Pre-Launch / Beta Service Disclaimer</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                During MVP/Beta, users acknowledge:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>service may be unstable</li>
                <li>features may change</li>
                <li>bugs and downtime may occur</li>
                <li>AI output may be inaccurate</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Tesora is not liable for Beta-related issues.
              </p>
            </section>

          </div>

          {/* Footer Note */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              By using the Tesora website and services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use.
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