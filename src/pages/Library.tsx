import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Library as LibraryComponent } from "@/components/departments/LibraryOld";

const Library = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden">
        <div className="flex items-center gap-4 p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Library</h1>
        </div>
      </div>

      <LibraryComponent onBack={() => navigate("/")} />
    </div>
  );
};

export default Library;