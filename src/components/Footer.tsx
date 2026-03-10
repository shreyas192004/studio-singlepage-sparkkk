import { Instagram, Send, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const Footer = () => {
    // BUG 22 FIX: newsletter email state + handler
    const [newsletterEmail, setNewsletterEmail] = useState("");

    const handleNewsletter = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newsletterEmail || !newsletterEmail.includes("@")) {
            toast.error("Please enter a valid email address");
            return;
        }
        // TODO: integrate with email service (Mailchimp / Supabase etc.)
        toast.success("You're on the list! We'll keep you posted.");
        setNewsletterEmail("");
    };
    return (
        <footer className="bg-black text-white border-t-8 border-accent-neon-blue">
            {/* Top Marquee */}
            <div className="bg-accent-neon-lime py-2 overflow-hidden">
                <div className="animate-infinite-scroll whitespace-nowrap text-black font-black uppercase text-sm tracking-widest">
                    JOIN THE MOVEMENT • CREATE YOUR OWN • FUTURE OF FASHION • JOIN THE MOVEMENT • CREATE YOUR OWN • FUTURE OF FASHION •
                </div>
            </div>

            <div className="container mx-auto px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12">

                    {/* Brand Column */}
                    <div className="md:col-span-4 space-y-6">
                        <h2 className="text-4xl font-black italic tracking-tighter">TESORA</h2>
                        <p className="text-white/60 text-lg max-w-sm">
                            The world's first AI-powered streetwear marketplace. Design it. Wear it. Own it.
                        </p>
                        <div className="flex gap-4">
                            <a href="https://instagram.com" className="p-3 bg-white/10 rounded-full hover:bg-accent-soft-purple hover:text-black transition-all">
                                <Instagram className="w-6 h-6" />
                            </a>
                        </div>
                    </div>

                    {/* Links Column 1 */}
                    <div className="md:col-span-2">
                        <h3 className="font-bold text-accent-neon-lime mb-6 tracking-widest uppercase">Shop</h3>
                        <ul className="space-y-4">
                            {['Men', 'Women', 'Accessories', 'New Drops'].map((item) => (
                                <li key={item}>
                                    <Link to="/products" className="text-white/70 hover:text-white hover:underline decoration-accent-neon-blue underline-offset-4 transition-all">
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Links Column 2 */}
                    <div className="md:col-span-2">
                        <h3 className="font-bold text-accent-neon-lime mb-6 tracking-widest uppercase">Support</h3>
                        <ul className="space-y-4">
                            <li><Link to="/contact-us" className="text-white/70 hover:text-white">Contact</Link></li>
                            <li><Link to="/shippingPolicy" className="text-white/70 hover:text-white">Shipping</Link></li>
                            <li><Link to="/terms-and-conditions" className="text-white/70 hover:text-white">Terms</Link></li>
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div className="md:col-span-4">
                        <h3 className="font-bold text-accent-neon-lime mb-6 tracking-widest uppercase">Stay Loop'd</h3>
                        <p className="text-white/60 mb-4">Get early access to secret drops.</p>
                        <form className="flex gap-2" onSubmit={handleNewsletter}>
                            <Input
                                type="email"
                                placeholder="EMAIL ADDRESS"
                                value={newsletterEmail}
                                onChange={(e) => setNewsletterEmail(e.target.value)}
                                className="bg-white/10 border-transparent text-white placeholder:text-white/30 focus:border-accent-neon-blue h-12 rounded-lg"
                            />
                            <Button type="submit" size="icon" className="h-12 w-12 bg-accent-neon-blue hover:bg-accent-soft-purple text-white rounded-lg">
                                <ArrowUpRight className="w-6 h-6" />
                            </Button>
                        </form>
                    </div>
                </div>

                <div className="border-t border-white/10 mt-16 pt-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center text-sm text-white/40">
                    <p>© 2026 TESORA LIFESTYLE. ALL RIGHTS RESERVED.</p>
                    <p className="flex items-center gap-2">
                        POWERED BY <span className="text-white font-bold">BISUGENTECH</span>
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
