import { ArrowLeft, FileImage } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Library as LibraryComponent } from "@/components/departments/LibraryOld";
import { useTranslation } from "react-i18next";

const Library = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background px-0 py-4">
      <div className="lg:hidden flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">{t('library.title')}</h1>
          </div>
        </div>
      </div>

      <LibraryComponent onBack={() => navigate("/")} />
    </div>
  );
};

export default Library;