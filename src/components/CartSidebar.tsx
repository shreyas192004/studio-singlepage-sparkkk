import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CartSidebarProps {
  open: boolean;
  onClose: () => void;
}

export const CartSidebar = ({ open, onClose }: CartSidebarProps) => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();

  const handleCheckout = () => {
    onClose(); // Close the sidebar
    navigate('/checkout'); // Navigate to checkout page
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Shopping Cart ({cart.length})
          </SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Your cart is empty</p>
              <p className="text-sm text-muted-foreground">Add items to get started</p>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {cart.map((item, index) => {
                  const itemKey = `${item.id}-${item.size}-${item.color}-${index}`;
                  return (
                    <div key={itemKey} className="flex gap-4 pb-4 border-b">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1 truncate">{item.name}</h4>
                        {item.size && (
                          <p className="text-xs text-muted-foreground">Size: {item.size}</p>
                        )}
                        {item.color && (
                          <p className="text-xs text-muted-foreground">Color: {item.color}</p>
                        )}
                        <p className="font-bold text-sm mt-1">Rs {item.price.toFixed(2)}</p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, item.quantity - 1, item.size, item.color)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, item.quantity + 1, item.size, item.color)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeFromCart(item.id, item.size, item.color)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <SheetFooter className="flex-col gap-4 mt-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span>Rs {cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex gap-2 w-full">
                <Button variant="outline" onClick={clearCart} className="flex-1">
                  Clear Cart
                </Button>
                <Button onClick={handleCheckout} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                  Checkout
                </Button>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};