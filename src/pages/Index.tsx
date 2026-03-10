import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroScroll from "@/components/HeroScroll";
import { DesignersSection } from "@/components/DesignersSection";
import { TestimonialsColumn } from "@/components/TestimonialsColumn";
import { useAuth } from "@/contexts/AuthContext";
import {
  Zap,
  Star
} from "lucide-react";

const Index = () => {
  // BUG 14 FIX: usePageTracking is already called in AppRoutes (App.tsx) for
  // every route change. Calling it here too was firing analytics twice on /.
  const navigate = useNavigate();
  const { user } = useAuth();  // BUG 13 FIX: check auth state for CTA button

  const testimonials = [
    {
      text: "Tesora designs feel premium and unique.",
      image: "/avatars/user1.jpg",
      name: "Arjun Mehta",
      role: "Streetwear Enthusiast"
    },
    {
      text: "The AI design studio changed how I create fashion.",
      image: "/avatars/user2.jpg",
      name: "Riya Kapoor",
      role: "Content Creator"
    },
    {
      text: "Finally something unique in Indian streetwear.",
      image: "/avatars/user3.jpg",
      name: "Karan Shah",
      role: "Designer"
    },
    {
      text: "I generated my own hoodie design in minutes.",
      image: "/avatars/user4.jpg",
      name: "Neha Sharma",
      role: "Fashion Blogger"
    }
  ];

  return (
    <div className="h-auto bg-white font-sans text-black selection:bg-accent-neon-lime selection:text-black">
      <Navbar />

      {/*
        1. HERO SECTION (Scroll Animated)
        - Sticky container (HeroScroll component)
        - "FUTURE" text highlights character-by-character on scroll
      */}
      <HeroScroll />

      {/*
        2. SOCIAL PROOF (Separation)
        - Pure Black Section
        - Added py-16 for vertical breathing room
      */}
      <section className="bg-black py-8 border-y-4 border-accent-neon-blue overflow-hidden whitespace-nowrap relative z-10">
        <div className="inline-flex animate-infinite-scroll">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center mx-8">
              <span className="text-4xl font-black text-white tracking-widest uppercase italic">
                AI DESIGNED
              </span>
              <Star className="w-8 h-8 mx-8 text-accent-neon-lime fill-current" />
              <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-accent-neon-blue to-accent-soft-purple tracking-widest uppercase">
                SUSTAINABLE
              </span>
              <Star className="w-8 h-8 mx-8 text-accent-neon-lime fill-current" />
              <span className="text-4xl font-black text-white tracking-widest uppercase italic">
                UNIQUE TO YOU
              </span>
              <Star className="w-8 h-8 mx-8 text-accent-neon-lime fill-current" />
            </div>
          ))}
        </div>
      </section>

      {/*
        3. FEATURED DESIGNERS (Open Layout)
        - Removed large wrapper padding
      */}
      <div className="py-4 bg-white relative">
        <div className="container mx-auto px-4">
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
            <div className="w-96 h-96 bg-accent-neon-lime rounded-full blur-[100px]"></div>
          </div>
          <DesignersSection />
        </div>
      </div>

      {/*
        4. TESTIMONIALS SECTION (Vertical Scroll)
      */}
      <section className="py-20 bg-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-5xl md:text-7xl font-black text-center mb-20 tracking-tighter uppercase italic">
            What Our <span className="text-accent-neon-blue">Creators</span> Say
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
            <TestimonialsColumn
              testimonials={testimonials}
              duration={15}
            />
            <TestimonialsColumn
              testimonials={testimonials}
              duration={18}
              className="hidden md:block"
            />
            <TestimonialsColumn
              testimonials={testimonials}
              duration={20}
              className="hidden lg:block"
            />
          </div>
        </div>
      </section>

      {/*
        4. SALE / CTA SECTION
        - Increased Overlay Opacity for readability
      */}
      <section className="relative py-20 overflow-hidden flex items-center justify-center bg-white">
        <div className="absolute inset-0 z-0">
          <img
            src="/sale_pop_art_1771162499543.jpg"
            alt="Pop Art Stickers"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px]"></div>
        </div>

        <div className="container relative z-10 text-center space-y-8">
          <h2 className="text-6xl md:text-9xl font-black text-black tracking-tighter uppercase transform -rotate-2 drop-shadow-sm">
            Don't Be <span className="underline decoration-wavy decoration-accent-neon-blue decoration-8">Boring.</span>
          </h2>
          <p className="text-2xl font-bold text-black/70 max-w-2xl mx-auto">
            Join the community of creators. 100% unique fashion.
          </p>

          <div className="w-full flex justify-center mt-8">
            <Button
              onClick={() => navigate(user ? "/ai-generator" : "/auth")}
              size="lg"
              className="
      h-24 px-20 text-3xl
      rounded-full bg-black text-white font-black
      hover:bg-accent-neon-lime hover:text-black
      hover:scale-105 active:scale-95 transition-all
      shadow-2xl ring-4 ring-white border-4 border-transparent hover:border-black
    "
            >
              Start Creating
              <Zap className="ml-4 h-10 w-10 fill-current" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
