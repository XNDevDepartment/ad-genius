
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Suspense, lazy } from "react";
import "@/i18n";
import AppLayout from "./components/AppLayout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingFallback } from "./components/LoadingFallback";

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
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <CreateUGC />
                  </Suspense>
                } />
                <Route path="create/ugc" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <CreateUGCGemini />
                  </Suspense>
                } />
                <Route path="create/video" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <TestVideoGeneration />
                  </Suspense>
                } />
                <Route path="create/adgenius" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <AdGenius />
                  </Suspense>
                } />
                <Route path="create/outfit-swap" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <OutfitSwap />
                  </Suspense>
                } />
                <Route path="create/product-studio" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <ProductStudioBackground />
                  </Suspense>
                } />
                <Route path="create/product-studio-bulk" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <ProductStudioBackgroundBulk />
                  </Suspense>
                } />
                <Route path="create/magazine-photoshoot" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <MagazinePhotoshoot />
                  </Suspense>
                } />
                <Route path="create/custom-model" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <CreateCustomModel />
                  </Suspense>
                } />
                <Route path="create/video-ads" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <VideoAds />
                  </Suspense>
                } />
                <Route path="library" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <Library />
                  </Suspense>
                } />
                <Route path="videos" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <VideoLibrary />
                  </Suspense>
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
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <GettingStartedGuide />
                  </Suspense>
                } />
                <Route path="help/faq" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <FAQPage />
                  </Suspense>
                } />
                <Route path="help/tutorials" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <VideoTutorialsPage />
                  </Suspense>
                } />
                <Route path="help/api-docs" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <APIDocsPage />
                  </Suspense>
                } />
              </Route>
              <Route path="/email-confirmation" element={
                <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                  <EmailConfirmation />
                </Suspense>
              } />
              <Route path="/reset-password" element={
                <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                  <ResetPassword />
                </Suspense>
              } />
              <Route path="/success" element={
                <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                  <Success />
                </Suspense>
              } />
              <Route path="/cancel" element={
                <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                  <Cancel />
                </Suspense>
              } />
              <Route path="/admin" element={
                <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                  <AdminDashboard />
                </Suspense>
              } />
              <Route path="/admin/base-models" element={
                <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                  <BaseModelManager />
                </Suspense>
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
