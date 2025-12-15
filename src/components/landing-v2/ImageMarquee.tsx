import { Heart, Eye } from "lucide-react";

// Import gallery images
import img1 from "@/assets/landing_gallery/1.webp";
import img3 from "@/assets/landing_gallery/3.webp";
import img4 from "@/assets/landing_gallery/4.webp";
import img5 from "@/assets/landing_gallery/5.webp";
import img6 from "@/assets/landing_gallery/6.webp";
import img7 from "@/assets/landing_gallery/7.webp";
import img8 from "@/assets/landing_gallery/8.webp";
import img9 from "@/assets/landing_gallery/9.webp";
import img10 from "@/assets/landing_gallery/10.webp";
import img11 from "@/assets/landing_gallery/11.webp";
import img12 from "@/assets/landing_gallery/12.webp";
import img15 from "@/assets/landing_gallery/15.webp";

const topRowImages = [
  { src: img1, likes: "2.4K", views: "12K" },
  { src: img3, likes: "1.8K", views: "9.2K" },
  { src: img4, likes: "3.1K", views: "15K" },
  { src: img5, likes: "2.7K", views: "11K" },
  { src: img6, likes: "1.5K", views: "8.3K" },
  { src: img7, likes: "4.2K", views: "21K" },
];

const bottomRowImages = [
  { src: img8, likes: "3.5K", views: "18K" },
  { src: img9, likes: "2.1K", views: "10K" },
  { src: img10, likes: "1.9K", views: "9.8K" },
  { src: img11, likes: "2.8K", views: "14K" },
  { src: img12, likes: "3.3K", views: "16K" },
  { src: img15, likes: "2.6K", views: "13K" },
];

interface ImageCardProps {
  src: string;
  likes: string;
  views: string;
}

const ImageCard = ({ src, likes, views }: ImageCardProps) => (
  <div className="flex-shrink-0 w-64 md:w-80 mx-2 group">
    <div className="relative rounded-xl overflow-hidden bg-card border border-border/50 shadow-lg">
      <img 
        src={src} 
        alt="AI Generated Product" 
        className="w-full aspect-[4/5] object-cover"
      />
      {/* Overlay with stats */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center gap-4 text-white text-sm">
          <span className="flex items-center gap-1">
            <Heart className="h-4 w-4 fill-current" />
            {likes}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {views}
          </span>
        </div>
      </div>
    </div>
  </div>
);

export const ImageMarquee = () => {
  return (
    <section className="py-16 overflow-hidden">
      {/* Top row - scrolls left */}
      <div className="relative mb-4">
        <div className="flex animate-marquee">
          {[...topRowImages, ...topRowImages, ...topRowImages].map((img, index) => (
            <ImageCard key={`top-${index}`} {...img} />
          ))}
        </div>
      </div>

      {/* Bottom row - scrolls right */}
      <div className="relative">
        <div className="flex animate-marquee-reverse">
          {[...bottomRowImages, ...bottomRowImages, ...bottomRowImages].map((img, index) => (
            <ImageCard key={`bottom-${index}`} {...img} />
          ))}
        </div>
      </div>
    </section>
  );
};
