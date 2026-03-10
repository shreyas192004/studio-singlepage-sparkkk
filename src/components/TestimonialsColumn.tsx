import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Testimonial {
    text: string;
    image: string;
    name: string;
    role: string;
}

interface TestimonialsColumnProps {
    testimonials: Testimonial[];
    duration?: number;
    className?: string;
}

export const TestimonialsColumn = ({
    testimonials,
    duration = 20,
    className,
}: TestimonialsColumnProps) => {
    // Triple the testimonials to ensure seamless looping without gaps
    const items = [...testimonials, ...testimonials, ...testimonials];

    return (
        <div className={cn("relative h-[600px] overflow-hidden", className)}>
            {/* Top Gradient Overlay */}
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />

            <motion.div
                animate={{
                    y: ["0%", "-33.33%"],
                }}
                transition={{
                    duration: duration,
                    repeat: Infinity,
                    ease: "linear",
                }}
                className="flex flex-col gap-8 py-4"
            >
                {items.map((testimonial, i) => (
                    <div
                        key={i}
                        className="p-8 bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4 transform transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    >
                        <p className="text-xl font-bold text-black leading-tight italic">
                            "{testimonial.text}"
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                            <div className="w-12 h-12 rounded-full border-2 border-black overflow-hidden bg-accent-neon-blue/10">
                                <img
                                    src={testimonial.image}
                                    alt={testimonial.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${testimonial.name}`;
                                    }}
                                />
                            </div>
                            <div>
                                <div className="font-black text-sm uppercase tracking-tighter">
                                    {testimonial.name}
                                </div>
                                <div className="text-[10px] font-bold text-black/40 uppercase tracking-widest">
                                    {testimonial.role}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* Bottom Gradient Overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
        </div>
    );
};
