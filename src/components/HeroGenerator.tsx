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

  return null;
};

export default HeroGenerator;