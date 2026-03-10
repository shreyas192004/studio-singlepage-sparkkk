import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, ArrowRight } from "lucide-react";

const HeroGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();

  const handleGenerate = () => {
    if (prompt.trim()) {
      navigate(`/ai-generator?prompt=${encodeURIComponent(prompt.trim())}`);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative group p-2">
        {/* Main Card with POP */}
        <div className="relative bg-white border-4 border-black rounded-2xl p-3 flex flex-col sm:flex-row gap-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200">
          <div className="flex-1 relative">
            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-accent-neon-blue animate-pulse" />
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your fit (e.g., 'Cyberpunk hoodie')..."
              className="w-full pl-12 h-14 bg-transparent border-transparent text-black placeholder:text-black/40 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg font-bold"
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
          </div>
          <Button
            onClick={handleGenerate}
            size="lg"
            className="h-14 px-8 bg-black text-white font-black uppercase tracking-wide border-2 border-transparent hover:bg-accent-neon-lime hover:text-black hover:border-black transition-all shadow-none rounded-xl"
          >
            Generate
            <ArrowRight className="ml-2 w-6 h-6" />
          </Button>
        </div>
      </div>
      <p className="text-black/60 text-xs mt-4 text-center font-bold tracking-wide uppercase">
        <span className="text-accent-neon-blue">●</span> AI Powered <span className="mx-2">|</span> <span className="text-accent-neon-lime">●</span> Custom Fit
      </p>
    </div>
  );
};

export default HeroGenerator;