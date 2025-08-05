import { Play, Clock, Star, BookOpen, Zap, Settings, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpLayout } from "@/components/help/HelpLayout";

const tutorials = {
  beginner: [
    {
      id: 1,
      title: "Getting Started with Genius UGC",
      description: "Learn the basics of creating your first UGC content",
      duration: "5:30",
      difficulty: "Beginner",
      thumbnail: "/api/placeholder/320/180",
      topics: ["Account Setup", "Interface Overview", "First Content"]
    },
    {
      id: 2,
      title: "Understanding the Create Section",
      description: "Explore different content creation options and tools",
      duration: "8:15",
      difficulty: "Beginner",
      thumbnail: "/api/placeholder/320/180",
      topics: ["Content Types", "AI Tools", "Templates"]
    },
    {
      id: 3,
      title: "Managing Your Content Library",
      description: "Organize, search, and manage your generated content",
      duration: "6:45",
      difficulty: "Beginner",
      thumbnail: "/api/placeholder/320/180",
      topics: ["Library Navigation", "Favorites", "Search & Filter"]
    }
  ],
  intermediate: [
    {
      id: 4,
      title: "Advanced Content Customization",
      description: "Learn to fine-tune AI parameters for better results",
      duration: "12:20",
      difficulty: "Intermediate",
      thumbnail: "/api/placeholder/320/180",
      topics: ["AI Parameters", "Style Customization", "Brand Consistency"]
    },
    {
      id: 5,
      title: "Workflow Optimization Tips",
      description: "Streamline your content creation process",
      duration: "9:30",
      difficulty: "Intermediate",
      thumbnail: "/api/placeholder/320/180",
      topics: ["Batch Processing", "Templates", "Shortcuts"]
    },
    {
      id: 6,
      title: "Content Strategy & Planning",
      description: "Plan and organize content for maximum impact",
      duration: "15:10",
      difficulty: "Intermediate",
      thumbnail: "/api/placeholder/320/180",
      topics: ["Content Calendar", "Campaign Planning", "Analytics"]
    }
  ],
  advanced: [
    {
      id: 7,
      title: "API Integration Guide",
      description: "Integrate Genius UGC with your existing workflows",
      duration: "18:45",
      difficulty: "Advanced",
      thumbnail: "/api/placeholder/320/180",
      topics: ["API Setup", "Authentication", "Automation"]
    },
    {
      id: 8,
      title: "Enterprise Team Management",
      description: "Manage teams and collaborate on content creation",
      duration: "14:30",
      difficulty: "Advanced",
      thumbnail: "/api/placeholder/320/180",
      topics: ["Team Setup", "Permissions", "Collaboration"]
    },
    {
      id: 9,
      title: "Advanced Analytics & Reporting",
      description: "Track performance and optimize your content strategy",
      duration: "11:20",
      difficulty: "Advanced",
      thumbnail: "/api/placeholder/320/180",
      topics: ["Performance Metrics", "ROI Tracking", "Optimization"]
    }
  ]
};

const featuredWorkshops = [
  {
    title: "UGC Content Strategy Workshop",
    description: "A comprehensive 2-hour workshop on building effective UGC strategies",
    duration: "2:15:00",
    level: "All Levels",
    icon: BookOpen
  },
  {
    title: "AI-Powered Marketing Masterclass",
    description: "Learn how to leverage AI for marketing and content creation",
    duration: "1:45:00",
    level: "Intermediate",
    icon: Zap
  }
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "Beginner": return "bg-green-100 text-green-700";
    case "Intermediate": return "bg-yellow-100 text-yellow-700";
    case "Advanced": return "bg-red-100 text-red-700";
    default: return "bg-gray-100 text-gray-700";
  }
};

const VideoTutorialsPage = () => {
  return (
    <HelpLayout title="Video Tutorials" breadcrumbTitle="Video Tutorials">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Learn with Video Tutorials</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Master Genius UGC with our comprehensive video library. 
            From beginner basics to advanced techniques.
          </p>
        </div>

        {/* Featured Workshops */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Featured Workshops</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {featuredWorkshops.map((workshop, index) => {
              const Icon = workshop.icon;
              return (
                <Card key={index} className="bg-gradient-to-br from-primary/5 to-secondary/5">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{workshop.title}</h4>
                          <Badge className="bg-primary/20 text-primary">
                            <Star className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {workshop.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {workshop.duration}
                          </span>
                          <span>{workshop.level}</span>
                        </div>
                      </div>
                      <Button size="sm">
                        <Play className="h-4 w-4 mr-2" />
                        Watch
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Tutorial Categories */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Browse by Skill Level</h3>
          <Tabs defaultValue="beginner" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="beginner">Beginner</TabsTrigger>
              <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {Object.entries(tutorials).map(([level, videos]) => (
              <TabsContent key={level} value={level} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {videos.map((video) => (
                    <Card key={video.id} className="group cursor-pointer hover:shadow-lg transition-shadow">
                      <div className="relative aspect-video bg-muted rounded-t-lg overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Play className="h-6 w-6 text-primary ml-1" />
                          </div>
                        </div>
                        <div className="absolute top-2 right-2">
                          <Badge className={getDifficultyColor(video.difficulty)}>
                            {video.difficulty}
                          </Badge>
                        </div>
                        <div className="absolute bottom-2 right-2">
                          <Badge variant="secondary" className="bg-black/60 text-white">
                            <Clock className="h-3 w-3 mr-1" />
                            {video.duration}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <h4 className="font-medium line-clamp-2">{video.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {video.description}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {video.topics.slice(0, 2).map((topic, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                          {video.topics.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{video.topics.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Quick Tips */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Learning Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <h5 className="font-medium text-sm">📱 Watch on Any Device</h5>
                <p className="text-xs text-muted-foreground">
                  All tutorials are optimized for desktop, tablet, and mobile viewing.
                </p>
              </div>
              <div className="space-y-1">
                <h5 className="font-medium text-sm">⚡ Skip to What You Need</h5>
                <p className="text-xs text-muted-foreground">
                  Use video chapters to jump to specific topics and techniques.
                </p>
              </div>
              <div className="space-y-1">
                <h5 className="font-medium text-sm">📝 Practice Along</h5>
                <p className="text-xs text-muted-foreground">
                  Follow along with your own account for hands-on learning.
                </p>
              </div>
              <div className="space-y-1">
                <h5 className="font-medium text-sm">❓ Ask Questions</h5>
                <p className="text-xs text-muted-foreground">
                  Contact support if you need clarification on any tutorial.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </HelpLayout>
  );
};

export default VideoTutorialsPage;