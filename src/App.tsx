
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

// Lazy load non-critical routes for better code splitting
const CreateSelection = lazy(() => import("./pages/ModuleSelection"));
const CreateUGC = lazy(() => import("./pages/CreateUGC"));
const CreateUGCGemini = lazy(() => import("./pages/CreateUGCGemini"));
const Library = lazy(() => import("./pages/Library"));
const Account = lazy(() => import("./pages/Account"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const EmailConfirmation = lazy(() => import("./pages/EmailConfirmation"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const GettingStartedGuide = lazy(() => import("./pages/help/GettingStartedGuide"));
const FAQPage = lazy(() => import("./pages/help/FAQPage"));
const VideoTutorialsPage = lazy(() => import("./pages/help/VideoTutorialsPage"));
const APIDocsPage = lazy(() => import("./pages/help/APIDocsPage"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Success = lazy(() => import("./pages/Success"));
const Cancel = lazy(() => import("./pages/Cancel"));
const TestVideoGeneration = lazy(() => import("./pages/TestVideoGeneration"));


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
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <CreateSelection />
                  </Suspense>
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
                <Route path="library" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <Library />
                  </Suspense>
                } />
                <Route path="account" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <Account />
                  </Suspense>
                } />
                <Route path="signin" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <SignIn />
                  </Suspense>
                } />
                <Route path="signup" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <SignUp />
                  </Suspense>
                } />
                <Route path="pricing" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <Pricing />
                  </Suspense>
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
                <Route path="test/video" element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading...</div>}>
                    <TestVideoGeneration />
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
