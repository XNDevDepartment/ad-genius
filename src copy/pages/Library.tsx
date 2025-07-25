import { Image, Folder, Grid, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Library = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container-responsive px-4 py-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <h1 className="text-2xl lg:text-3xl font-bold">Library</h1>
          
          <div className="flex gap-2">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search images..." 
                className="pl-10 rounded-apple-sm"
              />
            </div>
            <Button variant="outline" className="lg:hidden">
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto bg-muted rounded-apple flex items-center justify-center">
              <Image className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">No images yet</h3>
              <p className="text-muted-foreground max-w-md">
                Your generated images will appear here. Start creating to build your library.
              </p>
            </div>
            <Button onClick={() => window.location.href = "/create"}>
              Create Your First Image
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Library;