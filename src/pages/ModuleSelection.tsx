import { ArrowLeft, Sparkles, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useCredits } from "@/hooks/useCredits";

import demoUgc from "@/assets/module_icons/ugc.mp4";
import demoVideo from "@/assets/module_icons/video.mp4";
import demoVideo2 from "@/assets/module_icons/product_catalog.gif";
import demoOutfit from "@/assets/module_icons/fashion_catalog.mp4";
import demoBulk from "@/assets/module_icons/product_catalog.mp4";
import demoUgcImg from "@/assets/module_icons/ugc.webp";
import demoVideoImg from "@/assets/module_icons/video.webp";
import demoOutfitImg from "@/assets/module_icons/fashion_catalog.webp";
import demoBulkImg from "@/assets/module_icons/product_catalog.webp";

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  visible: (i: number) => ({
    opacity: 1, scale: 1, y: 0,
    transition: { delay: Math.min(i * 0.06, 0.4), duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const ModuleSelection = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const { isFreeTier } = useCredits();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/account');
    }
  }, [user, loading, navigate]);

  if (loading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const DemoMedia = ({
      id,
      src,
      fallbackImage,
      alt,
    }: {
      id: string;
      src: string;
      fallbackImage?: string;
      alt: string;
    }) => {
      const videoRef = useRef<HTMLVideoElement | null>(null);
      const [isMobile, setIsMobile] = useState(false);

      useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 768px)");
        setIsMobile(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mediaQuery.addEventListener("change", handler);

        return () => mediaQuery.removeEventListener("change", handler);
      }, []);

      // if (isMobile) {
        return <img src={fallbackImage || src} alt={alt} className="w-full h-full object-cover" />;
      // }

      // return (
      //   <video
      //     ref={videoRef}
      //     className="w-full h-full object-cover"
      //     muted
      //     loop
      //     playsInline
      //     preload="metadata"
      //     onMouseEnter={() => videoRef.current?.play()}
      //     onMouseLeave={() => {
      //       if (videoRef.current) {
      //         videoRef.current.pause();
      //         videoRef.current.currentTime = 0;
      //       }
      //     }}
      //   >
      //     <source src={src} type="video/mp4" />
      //   </video>
      // );
    };

  const workflows = [
    {
      id: "ugc",
      title: t('createSelection.ugcCreator.title'),
      description: t('createSelection.ugcCreator.description'),
      path: "/create/ugc",
      demoImage: demoUgc,
      fallbackImage: demoUgcImg,
      isBeta: false,
    },
    {
      id: "video",
      title: t('createSelection.videoCreator.title'),
      description: t('createSelection.videoCreator.description'),
      path: "/create/video",
      demoImage: demoVideo2,
      fallbackImage: demoVideo2,
      isBeta: false,
      locked: isFreeTier(),
    },
    {
      id: "outfit-swap",
      title: t('createSelection.outfitSwap.title'),
      description: t('createSelection.outfitSwap.description'),
      path: "/create/outfit-swap",
      demoImage: demoOutfit,
      fallbackImage: demoOutfitImg,
      isBeta: false,
      locked: false,
    },
    {
      id: "bulk-background",
      title: t('createSelection.bulkBackground.title'),
      description: t('createSelection.bulkBackground.description'),
      path: "/create/bulk-background",
      demoImage: demoBulk,
      fallbackImage: demoBulkImg,
      isBeta: true,
      locked: false,
    },
    {
      id: "soon",
      title: t('createSelection.inProgress.title'),
      description: t('createSelection.inProgress.description'),
      path: "",
      disabled: true,
    },
  ];

  return (
    <PageTransition>
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="h-11 w-11"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">
              {t('createSelection.title')}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {t('createSelection.description')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {workflows.map((workflow, index) => (
            <motion.div
              key={workflow.id}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              whileHover={!(workflow.disabled || workflow.locked) ? { scale: 1.03 } : undefined}
              whileTap={!(workflow.disabled || workflow.locked) ? { scale: 0.97 } : undefined}
            >
            <Card
              className={`bg-transparent shadow-md cursor-pointer transition-shadow hover:shadow-lg overflow-hidden h-full
                ${workflow.disabled || workflow.locked ? 'opacity-50 cursor-not-allowed' : ''}
                ${workflow.isBeta ? 'border-2 border-purple-500/30 bg-purple-500/5' : ''}`}
              onClick={() => {
                if (workflow.locked) {
                  navigate('/pricing');
                } else if (!workflow.disabled) {
                  navigate(workflow.path);
                }
              }}
            >
              {/* Mobile layout */}
              <div className="md:hidden relative">
                {workflow.demoImage ? (
                  <div className="relative aspect-square">
                     <DemoMedia id={workflow.id} src={workflow.demoImage} fallbackImage={workflow.fallbackImage} alt={workflow.title} />

                    {workflow.locked && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Crown className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                      <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2">
                        {workflow.title}
                      </h3>
                      {workflow.isBeta && (
                        <span className="text-[10px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full mt-1 inline-block">NEW</span>
                      )}
                      {workflow.locked && (
                        <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full mt-1 inline-block">PLUS+</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 p-4 aspect-square">
                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-center leading-tight">{workflow.title}</h3>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">Soon</span>
                  </div>
                )}
              </div>

              {/* Desktop layout */}
              <div className="hidden md:block">
                {workflow.demoImage ? (
                  <div className="relative h-80">
                      <DemoMedia id={workflow.id} src={workflow.demoImage} fallbackImage={workflow.fallbackImage} alt={workflow.title} />

                    {workflow.locked && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Crown className="h-8 w-8 text-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center bg-muted/30">
                    <Sparkles className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <CardHeader className="pt-4 pb-2">
                  <CardTitle className="text-xl flex items-center gap-2 flex-wrap">
                    {workflow.title}
                    {workflow.isBeta && (
                      <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full">NEW</span>
                    )}
                    {workflow.locked && (
                      <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded-full">PLUS+</span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {workflow.locked
                      ? "Upgrade to Plus to access this feature"
                      : workflow.description
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {workflow.disabled && (
                    <div className="text-center">
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-apple-sm">
                        {t('createSelection.comingSoon')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
    </PageTransition>
  );
};

export default ModuleSelection;
