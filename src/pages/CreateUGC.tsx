import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UGCCreator } from "@/components/departments/UGCCreator";

const CreateUGC = () => {
  const navigate = useNavigate();
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>();

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
          <h1 className="text-xl font-bold">Create UGC</h1>
        </div>
      </div>
      
      <UGCCreator 
        onBack={() => navigate("/")} 
        initialThreadId={currentThreadId}
      />
    </div>
  );
};

export default CreateUGC;