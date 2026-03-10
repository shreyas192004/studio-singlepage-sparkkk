import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const addressSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(100),
  phone: z.string().min(10, "Valid phone number required").max(15),
  address_line1: z.string().min(1, "Address is required").max(200),
  address_line2: z.string().max(200).optional(),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(100),
  postal_code: z.string().min(4, "Valid postal code required").max(10),
  country: z.string().min(1, "Country is required"),
  address_type: z.enum(["shipping", "billing", "both"]),
});

type AddressFormData = z.infer<typeof addressSchema>;

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

interface AddressFormDialogProps {
  open: boolean;
  onClose: () => void;
  address: Address | null;
  userId: string;
}

export const AddressFormDialog = ({
  open,
  onClose,
  address,
  userId,
}: AddressFormDialogProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      country: "India",
      address_type: "both",
    },
  });

  const addressType = watch("address_type");

  useEffect(() => {
    if (address) {
      reset({
        full_name: address.full_name,
        phone: address.phone,
        address_line1: address.address_line1,
        address_line2: address.address_line2 || "",
        city: address.city,
        state: address.state,
        postal_code: address.postal_code,
        country: address.country,
        address_type: address.address_type as "shipping" | "billing" | "both",
      });
    } else {
      reset({
        country: "India",
        address_type: "both",
      });
    }
  }, [address, reset]);

  const onSubmit = async (data: AddressFormData) => {
    try {
      if (address) {
        // Update existing address
        const { error } = await supabase
          .from("addresses")
          .update(data)
          .eq("id", address.id);

        if (error) throw error;
        toast.success("Address updated successfully");
      } else {
        // Create new address
        const { error } = await supabase
          .from("addresses")
          .insert([{
            user_id: userId,
            full_name: data.full_name,
            phone: data.phone,
            address_line1: data.address_line1,
            address_line2: data.address_line2 || null,
            city: data.city,
            state: data.state,
            postal_code: data.postal_code,
            country: data.country,
            address_type: data.address_type,
          }]);

        if (error) throw error;
        toast.success("Address added successfully");
      }

      onClose();
    } catch (error: any) {
      console.error("Error saving address:", error);
      toast.error("Failed to save address");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {address ? "Edit Address" : "Add New Address"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                {...register("full_name")}
                placeholder="John Doe"
              />
              {errors.full_name && (
                <p className="text-sm text-destructive mt-1">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="+91 1234567890"
              />
              {errors.phone && (
                <p className="text-sm text-destructive mt-1">
                  {errors.phone.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="address_line1">Address Line 1 *</Label>
            <Input
              id="address_line1"
              {...register("address_line1")}
              placeholder="House/Flat No., Street Name"
            />
            {errors.address_line1 && (
              <p className="text-sm text-destructive mt-1">
                {errors.address_line1.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="address_line2">Address Line 2</Label>
            <Input
              id="address_line2"
              {...register("address_line2")}
              placeholder="Landmark, Area (Optional)"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input id="city" {...register("city")} placeholder="Mumbai" />
              {errors.city && (
                <p className="text-sm text-destructive mt-1">
                  {errors.city.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                {...register("state")}
                placeholder="Maharashtra"
              />
              {errors.state && (
                <p className="text-sm text-destructive mt-1">
                  {errors.state.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="postal_code">Postal Code *</Label>
              <Input
                id="postal_code"
                {...register("postal_code")}
                placeholder="400001"
              />
              {errors.postal_code && (
                <p className="text-sm text-destructive mt-1">
                  {errors.postal_code.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                {...register("country")}
                placeholder="India"
              />
              {errors.country && (
                <p className="text-sm text-destructive mt-1">
                  {errors.country.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="address_type">Address Type *</Label>
              <Select
                value={addressType}
                onValueChange={(value) =>
                  setValue("address_type", value as any)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shipping">Shipping</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : address ? "Update" : "Add"} Address
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
