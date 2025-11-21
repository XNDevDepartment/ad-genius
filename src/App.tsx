
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Suspense, lazy, useEffect } from "react";
import "@/i18n";
import AppLayout from "./components/AppLayout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingFallback } from "./components/LoadingFallback";
import { checkForCachedVersion } from "./utils/cacheCheck";

// Lazy load non-critical routes for better code splitting
const CreateSelection = lazy(() => import("./pages/ModuleSelection"));
const CreateUGC = lazy(() => import("./pages/CreateGPT"));
const CreateUGCGemini = lazy(() => import("./pages/CreateUGCGemini"));
const Library = lazy(() => import("./pages/Library"));
const Account = lazy(() => import("./pages/Account"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const EmailConfirmation = lazy(() => import("./pages/EmailConfirmation"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const BaseModelManager = lazy(() => import("./pages/admin/BaseModelManager"));
const GettingStartedGuide = lazy(() => import("./pages/help/GettingStartedGuide"));
const FAQPage = lazy(() => import("./pages/help/FAQPage"));
const VideoTutorialsPage = lazy(() => import("./pages/help/VideoTutorialsPage"));
const APIDocsPage = lazy(() => import("./pages/help/APIDocsPage"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Success = lazy(() => import("./pages/Success"));
const Cancel = lazy(() => import("./pages/Cancel"));
const TestVideoGeneration = lazy(() => import("./pages/VideoGenerator"));
const VideoLibrary = lazy(() => import("./pages/VideoLibrary"));
const AdGenius = lazy(() => import("./pages/AdGenius"));
const OutfitSwap = lazy(() => import("./pages/OutfitSwap"));
const ProductStudioBackground = lazy(() => import("./pages/ProductStudioBackground"));
const ProductStudioBackgroundBulk = lazy(() => import("./pages/ProductStudioBackgroundBulk"));
const MagazinePhotoshoot = lazy(() => import("./pages/MagazinePhotoshoot"));
const CreateCustomModel = lazy(() => import("./pages/CreateCustomModel"));
const VideoAds = lazy(() => import("./pages/VideoAds"));


const queryClient = new QueryClient();

const App = () => {
  console.log('App component rendering...');
  
  useEffect(() => {
    checkForCachedVersion();
  }, []);
 
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Index />} />
                <Route path="create" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <CreateSelection />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="create/product-display" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <CreateUGC />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="create/ugc" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <CreateUGCGemini />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="create/video" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <TestVideoGeneration />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="create/adgenius" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <AdGenius />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="create/outfit-swap" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <OutfitSwap />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="create/product-studio" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <ProductStudioBackground />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="create/product-studio-bulk" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <ProductStudioBackgroundBulk />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="create/magazine-photoshoot" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <MagazinePhotoshoot />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="create/custom-model" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <CreateCustomModel />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="create/video-ads" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <VideoAds />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="library" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <Library />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="videos" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <VideoLibrary />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="account" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <Account />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="signin" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <SignIn />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="signup" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <SignUp />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="pricing" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <Pricing />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="help/getting-started" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <GettingStartedGuide />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="help/faq" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <FAQPage />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="help/tutorials" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <VideoTutorialsPage />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="help/api-docs" element={
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <APIDocsPage />
                    </Suspense>
                  </ErrorBoundary>
                } />
              </Route>
              <Route path="/email-confirmation" element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <EmailConfirmation />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="/reset-password" element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <ResetPassword />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="/success" element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <Success />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="/cancel" element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <Cancel />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="/admin" element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminDashboard />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="/admin/base-models" element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <BaseModelManager />
                  </Suspense>
                </ErrorBoundary>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
            </TooltipProvider>
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
