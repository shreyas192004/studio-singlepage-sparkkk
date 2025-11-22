export interface Product {
  id: number;
  name: string;
  price: number;
  oldPrice?: string;
  currency?: string;
  image: string;
  tag?: string | null;
  category: string;
  color: string;
  description: string;
  images: string[];
  sizes: string[];
  colors: string[];
  popularity: number;
  dateAdded: string;
}

export const products: Product[] = [
  {
    id: 1,
    name: "SCARF",
    price: 100,
    currency: "Rs",
    image: "https://placehold.co/300x400/8B7355/FFFFFF?text=Scarf",
    tag: null,
    category: "Accessories",
    color: "Brown",
    description: "Luxurious wool scarf perfect for cold winter days. Made from premium materials for ultimate comfort and warmth.",
    images: [
      "https://placehold.co/600x800/8B7355/FFFFFF?text=Scarf+1",
      "https://placehold.co/600x800/9B8365/FFFFFF?text=Scarf+2",
      "https://placehold.co/600x800/7B6345/FFFFFF?text=Scarf+3",
    ],
    sizes: ["One Size"],
    colors: ["Brown", "Beige", "Black"],
    popularity: 85,
    dateAdded: "2024-01-15",
  },
  {
    id: 2,
    name: "BUCKET HAT",
    price: 120,
    oldPrice: "Rs 150.00",
    currency: "Rs",
    image: "https://placehold.co/300x400/D4A574/FFFFFF?text=Bucket+Hat",
    tag: "Sale",
    category: "Accessories",
    color: "Beige",
    description: "Stylish bucket hat with UV protection. Perfect for outdoor activities and casual streetwear.",
    images: [
      "https://placehold.co/600x800/D4A574/FFFFFF?text=Bucket+Hat+1",
      "https://placehold.co/600x800/E4B584/FFFFFF?text=Bucket+Hat+2",
      "https://placehold.co/600x800/C49564/FFFFFF?text=Bucket+Hat+3",
    ],
    sizes: ["S", "M", "L"],
    colors: ["Beige", "Black", "White"],
    popularity: 92,
    dateAdded: "2024-02-01",
  },
  {
    id: 3,
    name: "SNOW COAT",
    price: 250,
    currency: "Rs",
    image: "https://placehold.co/300x400/6B7A5E/FFFFFF?text=Snow+Coat",
    tag: "Best Seller",
    category: "Outerwear",
    color: "Green",
    description: "Premium insulated puffer coat designed for extreme cold. Water-resistant and windproof with down filling.",
    images: [
      "https://placehold.co/600x800/6B7A5E/FFFFFF?text=Snow+Coat+1",
      "https://placehold.co/600x800/7B8A6E/FFFFFF?text=Snow+Coat+2",
      "https://placehold.co/600x800/5B6A4E/FFFFFF?text=Snow+Coat+3",
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Green", "Black", "Brown"],
    popularity: 98,
    dateAdded: "2024-01-20",
  },
  {
    id: 4,
    name: "UTILITY CASE",
    price: 80,
    currency: "Rs",
    image: "https://placehold.co/300x400/9B8B7E/FFFFFF?text=Utility+Case",
    tag: null,
    category: "Accessories",
    color: "Brown",
    description: "Versatile crossbody case with multiple compartments. Perfect for keeping essentials organized on the go.",
    images: [
      "https://placehold.co/600x800/9B8B7E/FFFFFF?text=Utility+Case+1",
      "https://placehold.co/600x800/AB9B8E/FFFFFF?text=Utility+Case+2",
      "https://placehold.co/600x800/8B7B6E/FFFFFF?text=Utility+Case+3",
    ],
    sizes: ["One Size"],
    colors: ["Brown", "Black", "Beige"],
    popularity: 78,
    dateAdded: "2024-02-10",
  },
  {
    id: 5,
    name: "LEATHER BELT",
    price: 70,
    currency: "Rs",
    image: "https://placehold.co/300x400/654321/FFFFFF?text=Leather+Belt",
    tag: "New",
    category: "Accessories",
    color: "Brown",
    description: "Genuine leather belt with metal buckle. Classic design that pairs well with any outfit.",
    images: [
      "https://placehold.co/600x800/654321/FFFFFF?text=Leather+Belt+1",
      "https://placehold.co/600x800/755431/FFFFFF?text=Leather+Belt+2",
      "https://placehold.co/600x800/553311/FFFFFF?text=Leather+Belt+3",
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Brown", "Black"],
    popularity: 88,
    dateAdded: "2024-02-25",
  },
  {
    id: 6,
    name: "TECH GLOVES",
    price: 90,
    currency: "Rs",
    image: "https://placehold.co/300x400/4A4A4A/FFFFFF?text=Tech+Gloves",
    tag: null,
    category: "Accessories",
    color: "Black",
    description: "Touchscreen-compatible gloves with thermal insulation. Stay connected while keeping warm.",
    images: [
      "https://placehold.co/600x800/4A4A4A/FFFFFF?text=Tech+Gloves+1",
      "https://placehold.co/600x800/5A5A5A/FFFFFF?text=Tech+Gloves+2",
      "https://placehold.co/600x800/3A3A3A/FFFFFF?text=Tech+Gloves+3",
    ],
    sizes: ["S", "M", "L"],
    colors: ["Black", "Brown"],
    popularity: 82,
    dateAdded: "2024-01-30",
  },
  {
    id: 7,
    name: "BASEBALL CAP",
    price: 60,
    currency: "Rs",
    image: "https://placehold.co/300x400/8B7355/FFFFFF?text=Baseball+Cap",
    tag: null,
    category: "Accessories",
    color: "Brown",
    description: "Classic baseball cap with adjustable strap. Comfortable fit for everyday wear.",
    images: [
      "https://placehold.co/600x800/8B7355/FFFFFF?text=Baseball+Cap+1",
      "https://placehold.co/600x800/9B8365/FFFFFF?text=Baseball+Cap+2",
      "https://placehold.co/600x800/7B6345/FFFFFF?text=Baseball+Cap+3",
    ],
    sizes: ["One Size"],
    colors: ["Brown", "Black", "White", "Beige"],
    popularity: 75,
    dateAdded: "2024-02-05",
  },
  {
    id: 8,
    name: "LARGE BACKPACK",
    price: 180,
    currency: "Rs",
    image: "https://placehold.co/300x400/3D3D3D/FFFFFF?text=Large+Backpack",
    tag: null,
    category: "Bags",
    color: "Black",
    description: "Spacious backpack with padded laptop compartment. Durable construction for daily commutes and travel.",
    images: [
      "https://placehold.co/600x800/3D3D3D/FFFFFF?text=Large+Backpack+1",
      "https://placehold.co/600x800/4D4D4D/FFFFFF?text=Large+Backpack+2",
      "https://placehold.co/600x800/2D2D2D/FFFFFF?text=Large+Backpack+3",
    ],
    sizes: ["One Size"],
    colors: ["Black", "Brown", "Green"],
    popularity: 90,
    dateAdded: "2024-01-25",
  },
];
