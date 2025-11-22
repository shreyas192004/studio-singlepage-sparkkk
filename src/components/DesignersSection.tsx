import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const DesignersSection = () => {
  const [designers, setDesigners] = useState<any[]>([]);

  useEffect(() => {
    fetchDesigners();
  }, []);

  const fetchDesigners = async () => {
    const { data } = await (supabase as any)
      .from("designers")
      .select("*")
      .eq("featured", true)
      .order("name")
      .limit(6);

    if (data) setDesigners(data);
  };

  if (designers.length === 0) return null;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Featured Designers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {designers.map((designer) => (
            <Link key={designer.id} to={`/designer/${designer.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src={designer.avatar_url || "/placeholder.svg"}
                      alt={designer.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-bold text-lg">{designer.name}</h3>
                      <p className="text-sm text-muted-foreground">Designer</p>
                    </div>
                  </div>
                  {designer.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{designer.bio}</p>
                  )}
                  <Button variant="link" className="mt-4 px-0">
                    View Collection →
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
