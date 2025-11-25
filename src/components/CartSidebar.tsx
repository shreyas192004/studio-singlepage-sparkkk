import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
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

  // which item (by key) triggered the bulk prompt (UI hint)
  const [bulkItemKey, setBulkItemKey] = useState<string | null>(null);

  // modal state for bulk buy details
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkModalItem, setBulkModalItem] = useState<any | null>(null);

  // ---- Commented: future form state for bulk contact (kept for reference) ----
  // const [email, setEmail] = useState("");
  // const [phone, setPhone] = useState("");
  // const [address, setAddress] = useState("");
  // const [formError, setFormError] = useState<string | null>(null);
  // ---------------------------------------------------------------------------

  const handleCheckout = () => {
    onClose(); // Close the sidebar
    navigate("/checkout"); // Navigate to checkout page
  };

  const handleIncrease = (item: any, itemKey: string) => {
    const nextQty = item.quantity + 1;
    if (nextQty > 9) {
      // show bulk button/prompt instead of increasing
      setBulkItemKey(itemKey);
      return;
    }
    // safe to update
    updateQuantity(item.id, nextQty, item.size, item.color);
    if (bulkItemKey === itemKey) setBulkItemKey(null);
  };

  const handleDecrease = (item: any) => {
    const nextQty = item.quantity - 1;
    if (nextQty < 1) {
      removeFromCart(item.id, item.size, item.color);
      return;
    }
    updateQuantity(item.id, nextQty, item.size, item.color);
  };

  // open the small modal (show company details)
  const openBulkModal = (item: any) => {
    setBulkModalItem(item);
    setBulkModalOpen(true);
    // future: reset form & errors if form is re-enabled
    // setEmail(""); setPhone(""); setAddress(""); setFormError(null);
  };

  const closeBulkModal = () => {
    setBulkModalOpen(false);
    setBulkModalItem(null);
    // setFormError(null);
  };

  // If user wants to proceed to the bulk flow, navigate with productId in state
  const handleContactSales = () => {
    if (!bulkModalItem) return;
    const payload = {
      productId: bulkModalItem.id,
      // future: include contact details here if form is enabled
    };
    closeBulkModal();
    onClose(); // close cart sidebar
    navigate("/bulk", { state: payload });
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
                  const isAtLimit = item.quantity >= 9;
                  const showBulk = isAtLimit || bulkItemKey === itemKey;

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
                            onClick={() => handleDecrease(item)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>

                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>

                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleIncrease(item, itemKey)}
                            disabled={isAtLimit}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>

                          {isAtLimit && (
                            <span className="text-xs text-muted-foreground ml-2">Max 9 per order</span>
                          )}
                        </div>

                        {showBulk && (
                          <div className="mt-3 flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openBulkModal(item)}
                              className="px-3"
                            >
                              Buy in bulk
                            </Button>

                            <span className="text-xs text-muted-foreground mt-1">
                              For quantities above 9, contact us.
                            </span>
                          </div>
                        )}
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

        {/* Bulk modal (small inline modal) showing company details.
            The contact form is commented out for future use. */}
        {bulkModalOpen && bulkModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={closeBulkModal}
              aria-hidden
            />
            <div className="relative z-10 w-full max-w-md bg-popover rounded-2xl shadow-lg p-6">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold">Bulk order — Company details</h3>
                <Button variant="ghost" size="icon" onClick={closeBulkModal}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-sm text-muted-foreground mt-2">
                Product: <span className="font-medium">{bulkModalItem.name}</span>
              </p>

              {/* === Company details view === */}
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Company</div>
                  <div className="font-medium">Acme Supplies Pvt. Ltd.</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Sales email</div>
                  <div className="font-medium">sales@acmesupplies.example</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Phone</div>
                  <div className="font-medium">+91 98765 43210</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Address</div>
                  <div className="font-medium">123 Industrial Park, Pune, MH — 411045</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">GST / CIN</div>
                  <div className="font-medium">27ABCDE1234F1Z5</div>
                </div>
              </div>

              {/* ---- Commented: original contact form (kept for future) ----
              <form onSubmit={handleBulkSubmit} className="mt-4 space-y-3">
                <div>
                  <label className="text-xs block mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs block mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs block mb-1">Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, city, pincode..."
                    className="w-full rounded-md border px-3 py-2 text-sm min-h-[72px]"
                  />
                </div>

                {formError && <p className="text-sm text-destructive">{formError}</p>}

                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={closeBulkModal} type="button">
                    Cancel
                  </Button>
                  <Button type="submit">Send request</Button>
                </div>
              </form>
              ---- end commented form ---- */}

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={closeBulkModal}>
                  Close
                </Button>
                <Button onClick={handleContactSales}>Contact Sales</Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
