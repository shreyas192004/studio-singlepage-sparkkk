import { useRef, useState, useEffect } from "react";
import { useScroll, useTransform, motion, MotionValue, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import HeroGenerator from "@/components/HeroGenerator";
import { Sparkles, Zap, ArrowRight } from "lucide-react";

// Component to handle individual character coloring
const ScrollRevealText = ({ text, progress }: { text: string; progress: MotionValue<number> }) => {
    const characters = text.split("");
    return (
        <span className="inline-flex">
            {characters.map((char, i) => {
                // Calculate range for each character (e.g., 0-0.1, 0.1-0.2, etc.)
                const start = i / characters.length;
                const end = start + (1 / characters.length);

                // Transform progress to color: Black -> Electric Orange
                const color = useTransform(progress, [start, end], ["#000000", "#FF5F1F"]);

                return (
                    <motion.span key={i} style={{ color }}>
                        {char}
                    </motion.span>
                );
            })}
        </span>
    );
};

const HeroScroll = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Track scroll progress within this 300vh container
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"],
    });

    const bgSlides = [
        "/slide1.png",
        "/slide2.jpeg",
        "/slide3.jpeg"
    ];

    const [bgIndex, setBgIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "-6%"]);

    useEffect(() => {
        const interval = setInterval(() => {
            setBgIndex((prev) => (prev + 1) % bgSlides.length);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        // 1. TALL CONTAINER (Responsive heights) to create scroll space for animations
        <div ref={containerRef} className="relative pt-20 h-[100vh] lg:h-[110vh]">

            {/* 2. STICKY WRAPPER (h-screen) - Stay pinned while user scrolls */}
            <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center">

                {/* Cinematic Background System */}
                <div className="absolute inset-0 z-0 bg-white overflow-hidden pointer-events-none">

                    {/* Layer 1: Parallax Slideshow Container */}
                    <motion.div style={{ y: bgY }} className="absolute inset-0 w-full h-full">
                        <AnimatePresence mode="wait">
                            <motion.img
                                key={bgSlides[bgIndex]}
                                src={bgSlides[bgIndex]}
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{
                                    filter: "saturate(0.9) contrast(1.1) brightness(1.05)",
                                }}
                                initial={{ opacity: 0, scale: isMobile ? 1.1 : 1.15 }}
                                animate={{ opacity: 1, scale: isMobile ? 1.02 : 1.05 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: isMobile ? 1.8 : 2.2, ease: "easeInOut" }}
                            />
                        </AnimatePresence>
                    </motion.div>

                    {/* Layer 2: Film Grain Texture */}
                    <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none bg-noise-pattern animate-pulse"></div>
                    <style>
                        {`
                          .bg-noise-pattern {
                            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
                          }
                        `}
                    </style>

                    {/* Layer 3: Vignette & Shadows */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.15)_100%)]"></div>

                    {/* Layer 4: Studio Lighting Highlight (Top) */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.15)_0%,transparent_70%)]"></div>

                    {/* Layer 5: Readability Overlay (Atmospheric) */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/30 to-white/70"></div>
                </div>

                {/* Content Container */}
                <div className="container relative z-10 px-4 md:px-6 md:mt-[-5vh]">
                    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-12 items-center">

                        {/* Text Content */}
                        <div className="space-y-6 md:space-y-8 text-center lg:text-left order-1">
                            <div className="inline-block bg-black text-accent-neon-lime px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest border-2 border-accent-neon-lime shadow-[4px_4px_0px_0px_rgba(204,255,0,1)]">
                                Only for the Bold
                            </div>

                            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.95] text-black drop-shadow-sm">
                                DESIGN YOUR DREAM <br />
                                {/* 3. FUTURE TEXT - Character Mapped */}
                                <span className="flex justify-center lg:justify-start">
                                    <ScrollRevealText text="STREETWEAR." progress={scrollYProgress} />
                                </span>
                            </h1>

                            <p className="text-base sm:text-lg md:text-2xl font-medium text-black/80 max-w-md md:max-w-xl mx-auto lg:mx-0 leading-relaxed">
                                <span className="bg-accent-neon-lime/30 px-2 rounded-lg">AI-generated</span> streetwear that doesn't exist anywhere else. Guaranteed unique.
                            </p>

                            {/* Mobile Generator */}
                            <div className="block lg:hidden w-full pt-2 sm:pt-4">
                                <HeroGenerator />
                            </div>

                            {/* Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start hidden lg:flex">
                                <Button
                                    onClick={() => navigate("/ai-generator")}
                                    className="h-16 px-10 rounded-2xl bg-black text-white text-lg font-bold border-2 border-transparent hover:bg-neutral-800 transition-all shadow-[6px_6px_0px_0px_rgba(37,99,235,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                                >
                                    <Sparkles className="mr-2 h-6 w-6 text-accent-neon-lime" />
                                    Generate Your Fit
                                </Button>
                                <Button
                                    onClick={() => navigate("/products")}
                                    className="h-16 px-10 rounded-2xl bg-white text-black text-lg font-bold border-2 border-black hover:bg-accent-neon-lime hover:text-black transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                                >
                                    Shop Drops
                                    <ArrowRight className="ml-2 h-6 w-6" />
                                </Button>
                            </div>

                            {/* Trust Indicators */}
                            <div className="pt-8 flex items-center justify-center lg:justify-start gap-6 text-sm font-bold uppercase tracking-wide text-black">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-accent-neon-lime rounded-full animate-pulse border border-black"></div>
                                    500+ New Designs
                                </div>
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-accent-neon-blue fill-current" />
                                    Instant Delivery
                                </div>
                            </div>
                        </div>

                        {/* Desktop Generator */}
                        <div className="relative hidden lg:block order-2">
                            <div className="relative z-10 bg-white/40 backdrop-blur-xl border-4 border-white rounded-[2.5rem] p-6 shadow-2xl transform rotate-2 hover:rotate-0 transition-all duration-500">
                                <HeroGenerator />
                                <div className="absolute -top-12 -right-8 bg-accent-soft-purple text-black font-black text-xl p-4 rounded-full rotate-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black animate-bounce">
                                    TRY ME!
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Scroll Hint */}
                <motion.div
                    style={{ opacity: useTransform(scrollYProgress, [0, 0.2], [1, 0]) }}
                    className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 text-black/50 font-bold uppercase text-xs animate-bounce"
                >
                    Scroll to Explore
                </motion.div>
            </div>
        </div>
    );
};

export default HeroScroll;
