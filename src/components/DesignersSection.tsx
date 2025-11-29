// DesignersSection.tsx
// Replace your existing DesignersSection component with this updated version

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

export const DesignersSection = () => {
  const [designers, setDesigners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDesigners();
  }, []);

  const fetchDesigners = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("designers")
        .select("*")
        .eq("featured", true)
        .order("name")
        .limit(6);

      if (error) throw error;
      if (data) setDesigners(data);
    } catch (error) {
      console.error("Error fetching designers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </section>
    );
  }

  if (designers.length === 0) return null;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold mb-2">Featured Designers</h2>
            <p className="text-muted-foreground">
              Discover unique collections from our talented designers
            </p>
          </div>
          <Link to="/designers" className="hidden md:block">
            <Button variant="outline" size="lg">
              View All Designers
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {designers.map((designer) => (
            <Link key={designer.id} to={`/designer/${designer.id}`}>
              <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                <CardContent className="p-6">
                  {/* Designer Avatar */}
                  <div className="relative mb-4">
                    <div className="w-20 h-20 mx-auto rounded-full overflow-hidden ring-4 ring-primary/10 group-hover:ring-primary/30 transition-all">
                      <img
                        src={designer.avatar_url || "/placeholder.svg"}
                        alt={designer.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {designer.featured && (
                      <Badge
                        variant="secondary"
                        className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs"
                      >
                        Featured
                      </Badge>
                    )}
                  </div>

                  {/* Designer Info */}
                  <div className="text-center">
                    <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                      {designer.name}
                    </h3>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 justify-center mb-3">
                      {designer.men_only && (
                        <Badge variant="outline" className="text-xs">
                          Men's
                        </Badge>
                      )}
                      {designer.women_only && (
                        <Badge variant="outline" className="text-xs">
                          Women's
                        </Badge>
                      )}
                    </div>

                    {/* Bio */}
                    {designer.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                        {designer.bio}
                      </p>
                    )}

                    {/* View Collection Link */}
                    <Button
                      variant="ghost"
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    >
                      View Collection →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Mobile View All Button */}
        <div className="mt-8 text-center md:hidden">
          <Link to="/designers">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              View All Designers
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};