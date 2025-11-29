import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Sparkles } from "lucide-react";

interface GenerationLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generationCount: number;
  limit: number;
}

const GenerationLimitModal = ({
  open,
  onOpenChange,
  generationCount,
  limit,
}: GenerationLimitModalProps) => {
  const navigate = useNavigate();

  const handleBuyProducts = () => {
    onOpenChange(false);
    // Navigate to home page and scroll to products section
    navigate("/#products");
    setTimeout(() => {
      const productsSection = document.querySelector("#products");
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Generation Limit Reached
          </DialogTitle>
          <DialogDescription>
            You've used {generationCount} of {limit} free AI generations.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-primary/5 rounded-lg p-4 mb-4">
            <p className="text-sm text-muted-foreground">
              Purchase any product to restore your generation limit. Once you complete a purchase, 
              you'll get {limit} more free generations!
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-primary">{generationCount}</span>
              <span>/ {limit}</span>
            </div>
            <span>generations used</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleBuyProducts} className="w-full">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Browse Products
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GenerationLimitModal;
