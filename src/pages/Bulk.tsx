import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useTranslation } from "react-i18next";
import { Layers, Upload, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/PageTransition";

const Bulk = () => {
  const { isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <PageTransition>
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Layers className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">{t('bulk.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('bulk.description')}</p>
      </div>

      <Card className="border-dashed border-2">
        <CardHeader className="text-center">
          <CardTitle>{t('bulk.uploadTitle')}</CardTitle>
          <CardDescription>{t('bulk.uploadDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-muted-foreground/20 rounded-lg bg-muted/30">
            <Upload className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">{t('bulk.dragAndDrop')}</p>
            <div className="flex gap-4">
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                {t('bulk.importImages')}
              </Button>
              <Button variant="outline" className="gap-2">
                <FolderOpen className="h-4 w-4" />
                {t('bulk.importFolder')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">{t('bulk.maxImages')}</p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>{t('bulk.comingSoon')}</p>
      </div>
    </div>
    </PageTransition>
  );
};

export default Bulk;
