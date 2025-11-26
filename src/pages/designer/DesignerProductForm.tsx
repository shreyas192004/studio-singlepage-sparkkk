import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useDesigner } from "@/contexts/DesignerContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Home, Upload, X } from "lucide-react";
import { toast } from "sonner";

const DesignerProductForm = () => {
  const { isDesigner, loading, user } = useDesigner();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [designerId, setDesignerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    sku: "",
    title: "",
    description: "",
    price: "",
    compare_at_price: "",
    currency: "INR",
    category: "",
    sub_category: "",
    material: "",
    brand: "",
    designer_id: "",
    visibility: "public",
    images: [] as string[],
    tags: [] as string[],
    colors: [] as string[],
    sizes: [] as string[],
    inventory: { total: 0, bySize: {} },
    structured_card_data: {},
    filter_requirements: {},
  });

  const [tagInput, setTagInput] = useState("");
  const [colorInput, setColorInput] = useState("");
  const [sizeInput, setSizeInput] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!loading && !isDesigner) {
      navigate("/designer/login");
    }
  }, [isDesigner, loading, navigate]);

  useEffect(() => {
    const initializeForm = async () => {
      if (!user) return;
      
      // First fetch the designer ID
      const { data, error } = await supabase
        .from("designers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (error) {
        toast.error("Failed to load designer profile");
        console.error(error);
        return;
      }
      
      if (data) {
        setDesignerId(data.id);
        setFormData(prev => ({ ...prev, designer_id: data.id }));
        
        // Then fetch the product if editing
        if (isEdit && id) {
          fetchProduct(data.id);
        }
      }
    };

    initializeForm();
  }, [user, isEdit, id]);

  const fetchProduct = async (currentDesignerId: string) => {
    if (!id) return;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching product:", error);
      toast.error("Failed to load product");
      navigate("/designer/products");
      return;
    }

    if (!data) {
      toast.error("Product not found");
      navigate("/designer/products");
      return;
    }

    // // Check if this product belongs to the current designer
    // if (data.designer_id !== currentDesignerId) {
    //   toast.error("Unauthorized: This product doesn't belong to you");
    //   navigate("/designer/products");
    //   return;
    // }

    setFormData({
      ...data,
      price: data.price.toString(),
      compare_at_price: data.compare_at_price?.toString() || "",
      designer_id: data.designer_id || currentDesignerId || "",
      tags: data.tags || [],
      colors: data.colors || [],
      sizes: data.sizes || [],
      images: data.images || [],
      inventory: (data.inventory && typeof data.inventory === 'object' && 'total' in data.inventory)
        ? { total: Number((data.inventory as any).total || 0), bySize: (data.inventory as any).bySize || {} }
        : { total: 0, bySize: {} },
      structured_card_data: data.structured_card_data || {},
      filter_requirements: data.filter_requirements || {},
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!designerId) {
      toast.error("Designer profile not found");
      return;
    }

    setSubmitting(true);

    try {
      // Check for duplicate SKU only when creating or when SKU is changed during edit
      if (!isEdit) {
        const { data: existingProduct } = await supabase
          .from("products")
          .select("id")
          .eq("sku", formData.sku)
          .maybeSingle();

        if (existingProduct) {
          toast.error(`SKU "${formData.sku}" already exists. Please use a unique SKU.`);
          setSubmitting(false);
          return;
        }
      }

      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
        designer_id: designerId,
      };

      let error;
      
      if (isEdit) {
        const result = await supabase
          .from("products")
          .update(payload)
          .eq("id", id);
        error = result.error;
      } else {
        const result = await supabase
          .from("products")
          .insert(payload);
        error = result.error;
      }

      setSubmitting(false);

      if (error) {
        console.error("Product creation error:", error);
        
        // Provide user-friendly error messages
        if (error.code === "23505") {
          toast.error(`SKU "${formData.sku}" already exists. Please use a unique SKU.`);
        } else {
          toast.error(`Failed to ${isEdit ? "update" : "create"} product: ${error.message}`);
        }
      } else {
        toast.success(`Product ${isEdit ? "updated" : "created"} successfully`);
        navigate("/designer/products");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("An unexpected error occurred");
      setSubmitting(false);
    }
  };

  const addTag = () => {
    if (tagInput && !formData.tags.includes(tagInput)) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const addColor = () => {
    if (colorInput && !formData.colors.includes(colorInput)) {
      setFormData({ ...formData, colors: [...formData.colors, colorInput] });
      setColorInput("");
    }
  };

  const removeColor = (color: string) => {
    setFormData({ ...formData, colors: formData.colors.filter((c) => c !== color) });
  };

  const addSize = () => {
    if (sizeInput && !formData.sizes.includes(sizeInput)) {
      setFormData({ ...formData, sizes: [...formData.sizes, sizeInput] });
      setSizeInput("");
    }
  };

  const removeSize = (size: string) => {
    setFormData({ ...formData, sizes: formData.sizes.filter((s) => s !== size) });
  };

  const addImage = () => {
    if (imageUrlInput && !formData.images.includes(imageUrlInput)) {
      setFormData({ ...formData, images: [...formData.images, imageUrlInput] });
      setImageUrlInput("");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      setFormData({ ...formData, images: [...formData.images, ...uploadedUrls] });
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (image: string) => {
    setFormData({ ...formData, images: formData.images.filter((i) => i !== image) });
  };

  if (loading || !isDesigner) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{isEdit ? "Edit Product" : "Add Product"}</h1>
            <Link to="/designer/dashboard">
              <Button variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Stock Keeping Unit - must be unique for each product
                  </p>
                </div>
                <div>
                  <Label htmlFor="visibility">Visibility *</Label>
                  <Select
                    value={formData.visibility}
                    onValueChange={(value) => setFormData({ ...formData, visibility: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="hidden">Hidden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing & Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="compare_at_price">Compare At Price</Label>
                  <Input
                    id="compare_at_price"
                    type="number"
                    step="0.01"
                    value={formData.compare_at_price}
                    onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Men">Men</SelectItem>
                      <SelectItem value="Women">Women</SelectItem>
                      <SelectItem value="Accessories">Accessories</SelectItem>
                      <SelectItem value="Designer">Designer</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sub_category">Sub Category</Label>
                  <Input
                    id="sub_category"
                    value={formData.sub_category}
                    onChange={(e) => setFormData({ ...formData, sub_category: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="material">Material</Label>
                  <Input
                    id="material"
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Product Images</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Image URL"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addImage())}
                    />
                    <Button type="button" onClick={addImage}>
                      Add URL
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="flex-1"
                    />
                    <Button type="button" disabled={uploadingImage} variant="secondary">
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingImage ? "Uploading..." : "Upload Files"}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {formData.images.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img src={img} alt="" className="w-full h-32 object-cover rounded" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                      onClick={() => removeImage(img)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variants & Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Colors</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add color"
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addColor())}
                  />
                  <Button type="button" onClick={addColor}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.colors.map((color) => (
                    <Badge key={color} variant="secondary">
                      {color}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => removeColor(color)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Sizes</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add size (e.g. S, M, L, XL)"
                    value={sizeInput}
                    onChange={(e) => setSizeInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSize())}
                  />
                  <Button type="button" onClick={addSize}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.sizes.map((size) => (
                    <Badge key={size} variant="secondary">
                      {size}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => removeSize(size)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="total_inventory">Total Inventory</Label>
                <Input
                  id="total_inventory"
                  type="number"
                  value={formData.inventory.total}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      inventory: { ...formData.inventory, total: parseInt(e.target.value) || 0 },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/designer/products")}>
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default DesignerProductForm;