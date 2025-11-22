import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";

const HeroGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();

  const handleGenerate = () => {
    if (prompt.trim()) {
      navigate(`/ai-generator?prompt=${encodeURIComponent(prompt.trim())}`);
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-8 shadow-2xl border border-primary-foreground/10">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-6 h-6 text-accent" />
        <h3 className="text-2xl font-bold text-primary-foreground">AI Design Generator</h3>
      </div>
      <p className="text-primary-foreground/80 mb-6">
        Describe your dream t-shirt design and watch AI bring it to life instantly
      </p>
      <div className="flex gap-3">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., A futuristic city skyline at sunset..."
          className="flex-1 bg-background/95 border-primary-foreground/20 text-foreground placeholder:text-muted-foreground"
          onKeyPress={(e) => e.key === "Enter" && handleGenerate()}
        />
        <Button 
          onClick={handleGenerate}
          size="lg"
          className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8"
        >
          Generate
        </Button>
      </div>
    </div>
  );
};

export default HeroGenerator;