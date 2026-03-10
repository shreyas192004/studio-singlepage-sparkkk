import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    Menu,
    X,
    ShoppingBasket,
    User,
    LogOut,
    Heart,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { CartSidebar } from "@/components/CartSidebar";
import { cn } from "@/lib/utils";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
    const { user, signOut } = useAuth();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [cartOpen, setCartOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();

    // Scroll effect for glass banking
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleLogout = async () => {
        await signOut();
    };

    const navLinks = [
        { name: "Shop", path: "/products" },
        { name: "AI Studio", path: "/ai-generator" },
    ];

    return (
        <>
            {/* Full-Width Sticky Navbar */}
            <nav
                className={cn(
                    "fixed top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out border-b-2 border-black",
                    scrolled
                        ? "bg-white/90 backdrop-blur-xl py-2 shadow-sm"
                        : "bg-white/80 backdrop-blur-md py-4"
                )}
            >
                <div className="container mx-auto px-4 flex items-center justify-between">

                    {/* 1. Logo */}
                    <Link to="/" className="flex items-center gap-2 group">
                        <img
                            src="/logo.png"
                            alt="Tesora"
                            className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
                        />
                    </Link>

                    {/* 2. Desktop Links */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={cn(
                                    "text-sm font-bold uppercase tracking-widest hover:text-accent-neon-blue transition-colors relative group",
                                    location.pathname === link.path ? "text-accent-neon-blue" : "text-black"
                                )}
                            >
                                {link.name}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent-neon-blue group-hover:w-full transition-all duration-300"></span>
                            </Link>
                        ))}
                    </div>

                    {/* 3. Actions */}
                    <div className="flex items-center gap-4">
                        <Link
                            to="/wishlist"
                            className="p-2 hover:bg-black hover:text-white rounded-lg transition-all"
                        >
                            <Heart className="w-5 h-5" />
                        </Link>

                        <button
                            onClick={() => setCartOpen(true)}
                            className="p-2 hover:bg-accent-neon-lime hover:text-black rounded-lg transition-all relative border-2 border-transparent hover:border-black"
                        >
                            <ShoppingBasket className="w-5 h-5" />
                        </button>

                        {user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-black text-white hover:bg-gray-800 transition-colors">
                                        <User className="w-4 h-4" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl border-2 border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <DropdownMenuItem asChild className="focus:bg-accent-neon-blue focus:text-white cursor-pointer font-bold">
                                        <Link to="/account"><User className="w-4 h-4 mr-2" /> My Account</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-black/10" />
                                    <DropdownMenuItem onClick={handleLogout} className="focus:bg-red-500 focus:text-white cursor-pointer font-bold text-red-500">
                                        <LogOut className="w-4 h-4 mr-2" /> Logout
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Link
                                to="/auth"
                                className="px-6 py-2 bg-black text-white text-sm font-bold uppercase tracking-wide hover:bg-accent-neon-blue transition-colors shadow-[4px_4px_0px_0px_rgba(37,99,235,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                            >
                                Sign In
                            </Link>
                        )}

                        {/* Mobile Toggle */}
                        <button
                            className="md:hidden p-2 hover:bg-black hover:text-white rounded-lg transition-colors"
                            onClick={() => setMobileNavOpen((s) => !s)}
                        >
                            {mobileNavOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {mobileNavOpen && (
                    <div className="md:hidden absolute top-[100%] left-0 right-0 bg-white border-b-2 border-black animate-in slide-in-from-top-2 z-40">
                        <div className="flex flex-col p-4 gap-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setMobileNavOpen(false)}
                                    className="text-2xl font-black uppercase tracking-tighter hover:text-accent-neon-blue"
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <div className="h-px bg-black/10 w-full my-2"></div>
                            <Link
                                to="/auth"
                                onClick={() => setMobileNavOpen(false)}
                                className="w-full py-4 text-center bg-black text-white font-bold uppercase tracking-widest"
                            >
                                Join / Sign In
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
        </>
    );
};

export default Navbar;
