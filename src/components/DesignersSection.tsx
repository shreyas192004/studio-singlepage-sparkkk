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
        <div className="container mx-auto px-4 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </section>
    );
  }

  if (designers.length === 0) return null;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">

        {/* Centered Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2 text-foreground">
  Featured Designers
</h2>

          <p className="text-muted-foreground">
            Discover unique collections from our talented designers
          </p>
        </div>

        {/* Scrolling Cards */}
        <div className="overflow-hidden w-full py-6">
          <div className="flex gap-8 w-max animate-scroll hover:[animation-play-state:paused]">

            {[...designers, ...designers].map((designer, index) => (
              <Link
                key={`${designer.id}-${index}`}
                to={`/designer/${designer.id}`}
              >
                <Card className="w-[300px] flex-shrink-0 h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                  <CardContent className="p-6">

                    {/* Avatar */}
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
                          className="
                            absolute -top-2 -right-2
                            bg-accent-gold
                            text-white
                            text-xs
                            shadow-[0_0_10px_hsl(43_55%_62%/0.25)]
                          "
                        >
                          Featured
                        </Badge>
                      )}
                    </div>

                    {/* Info */}
                    <div className="text-center">
                      <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                        {designer.name}
                      </h3>

                      {/* Gender Badges */}
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

                      {/* View Collection */}
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
        </div>

        {/* Bottom Centered View All Button */}
        <div className="mt-12 text-center">
          <Link to="/designers">
            <Button
              size="lg"
              className="
                mx-auto
                bg-accent-gold
                text-white
                hover:brightness-110
                transition-all
                px-8
              "
            >
              View All Designers
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>

      </div>
    </section>
  );
};
