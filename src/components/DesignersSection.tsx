import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Star } from "lucide-react";

export const DesignersSection = () => {
  const [designers, setDesigners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDesigners();
  }, []);

  const fetchDesigners = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("designers")
        .select("*")
        .eq("featured", true)
        .order("name")
        .limit(6);

      if (error) throw error;
      if (data) setDesigners(data);
    } catch (error) {
      console.error("Error fetching designers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <section className="py-12 bg-white relative overflow-hidden">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-black" />
        </div>
      </section>
    );
  }

  if (designers.length === 0) return null;

  const loopDesigners = [...designers, ...designers];

  return (
    <section className="py-16 bg-white relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50 z-0"></div>

      <div className="container mx-auto px-4 relative z-10">

        {/* Header - Brutalist & Bold */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-2">
          <div className="space-y-4 max-w-2xl">
            <Badge className="bg-accent-neon-lime text-black border-2 border-black font-bold uppercase tracking-widest px-4 py-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
              Fresh Drops
            </Badge>
            <h2 className="text-4xl md:text-6xl font-black text-black tracking-tighter uppercase leading-[0.9]">
              Featured <br /> Designers
            </h2>
            <p className="text-xl font-bold text-black/60 max-w-lg">
              The minds behind the movement. 100% unique, AI-co-created collections.
            </p>
          </div>

          <Link to="/designers" className="hidden md:block">
            <Button
              size="lg"
              className="h-16 px-10 bg-black text-white text-lg font-bold uppercase tracking-wider border-2 border-transparent hover:bg-accent-neon-blue hover:text-black hover:border-black transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
            >
              View All <ArrowRight className="ml-2 w-6 h-6" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Cards Marquee - Full Width (Edge to Edge) */}
      <div className="w-full overflow-hidden pb-12 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max animate-marquee hover:[animation-play-state:paused] will-change-transform">
          {loopDesigners.map((designer, index) => (
            <Link
              key={`${designer.id}-${index}`}
              to={`/designer/${designer.id}`}
              className="group block relative shrink-0 mx-4"
            >
              <div className="w-[280px] h-[420px] bg-white border-4 border-black rounded-[2rem] overflow-hidden relative shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[6px] group-hover:translate-y-[6px] transition-all duration-300">

                {/* Image */}
                <div className="h-[75%] w-full relative overflow-hidden bg-gray-100 border-b-4 border-black">
                  <img
                    src={designer.avatar_url || "/placeholder.svg"}
                    alt={designer.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                  />
                  {/* Sticker Badge */}
                  {designer.featured && (
                    <div className="absolute top-4 right-4 z-20">
                      <div className="bg-accent-neon-blue text-white font-black uppercase text-xs px-3 py-1.5 border-2 border-black rotate-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                        Verified
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="h-[25%] p-6 flex flex-col justify-between bg-white relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-2xl text-black uppercase tracking-tight leading-none mb-2">
                        {designer.name}
                      </h3>
                      <p className="text-black/60 font-bold text-xs uppercase tracking-wide line-clamp-1">
                        {designer.bio || "Visionary Creator"}
                      </p>
                    </div>
                    <div className="bg-accent-neon-lime p-2 rounded-full border-2 border-black">
                      <Star className="w-5 h-5 text-black fill-current" />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto">
                    {designer.men_only && (
                      <span className="text-[10px] font-black uppercase bg-black text-white px-2 py-1 rounded-sm">Men</span>
                    )}
                    {designer.women_only && (
                      <span className="text-[10px] font-black uppercase bg-black text-white px-2 py-1 rounded-sm">Women</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Mobile View All Button */}
        <div className="md:hidden mt-8 text-center">
          <Link to="/designers">
            <Button
              size="lg"
              className="w-full h-14 bg-black text-white text-lg font-bold uppercase tracking-wider border-2 border-transparent hover:bg-accent-neon-blue hover:text-black hover:border-black transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
            >
              View All <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>

      </div>
    </section>
  );
};
