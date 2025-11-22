import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Star } from "lucide-react";

interface Address {
  id: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  address_type: string;
  is_default: boolean;
}

interface AddressCardProps {
  address: Address;
  onEdit: (address: Address) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export const AddressCard = ({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: AddressCardProps) => {
  return (
    <Card className="p-4 border border-border hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground">{address.full_name}</p>
          {address.is_default && (
            <Badge className="bg-accent text-accent-foreground">
              <Star className="w-3 h-3 mr-1" />
              Default
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(address)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(address.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-1 text-sm text-muted-foreground">
        <p>{address.phone}</p>
        <p>{address.address_line1}</p>
        {address.address_line2 && <p>{address.address_line2}</p>}
        <p>
          {address.city}, {address.state} {address.postal_code}
        </p>
        <p>{address.country}</p>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <Badge variant="outline" className="text-xs">
          {address.address_type}
        </Badge>
        {!address.is_default && (
          <Button
            size="sm"
            variant="link"
            onClick={() => onSetDefault(address.id)}
            className="text-xs h-auto p-0"
          >
            Set as Default
          </Button>
        )}
      </div>
    </Card>
  );
};
