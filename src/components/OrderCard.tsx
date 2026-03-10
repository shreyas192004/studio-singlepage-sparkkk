import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  size: string | null;
  color: string | null;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  order_items: OrderItem[];
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  confirmed: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  processing: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  shipped: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400",
  delivered: "bg-green-500/20 text-green-700 dark:text-green-400",
  cancelled: "bg-red-500/20 text-red-700 dark:text-red-400",
  refunded: "bg-gray-500/20 text-gray-700 dark:text-gray-400",
};

export const OrderCard = ({ order }: { order: Order }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden border border-border hover:border-primary/50 transition-colors">
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-foreground">{order.order_number}</p>
              <Badge className={statusColors[order.status] || "bg-muted"}>
                {order.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(order.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-bold text-foreground">
                {order.currency} {order.total_amount.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                {order.order_items?.length || 0} item(s)
              </p>
            </div>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {expanded && order.order_items && order.order_items.length > 0 && (
        <div className="border-t border-border bg-muted/30 p-4 space-y-3">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex gap-3">
              {item.product_image && (
                <img
                  src={item.product_image}
                  alt={item.product_name}
                  className="w-16 h-16 object-cover rounded-md"
                />
              )}
              <div className="flex-1">
                <p className="font-medium text-foreground">{item.product_name}</p>
                <div className="flex gap-2 text-sm text-muted-foreground">
                  {item.size && <span>Size: {item.size}</span>}
                  {item.color && <span>Color: {item.color}</span>}
                  <span>Qty: {item.quantity}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-foreground">
                  {order.currency} {item.total_price.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  @ {order.currency} {item.unit_price.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
