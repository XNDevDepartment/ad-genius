
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { UGCCreator } from "@/components/departments/UGCCreator";
import { Library } from "@/components/departments/Library";
import { Profile } from "@/pages/Profile";
import { CategoryPage } from "@/components/categories/CategoryPage";
import { assistants, categories } from "@/data/assistants";

const Index = () => {
  const [currentView, setCurrentView] = useState(localStorage.getItem("currentView") || "dashboard");

  const handleSelectDepartment = (departmentId: string) => {
    setCurrentView(departmentId);
    localStorage.setItem("currentView", departmentId)
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    localStorage.setItem("currentView", view)
  };

  const renderCurrentView = () => {
    // Check if current view is a category
    const category = categories.find(cat => cat.id === currentView);
    if (category) {
      return (
        <CategoryPage 
          categoryId={currentView}
          onBack={() => setCurrentView("dashboard")}
          onSelectAssistant={handleSelectDepartment}
        />
      );
    }

    // Check if current view is an individual assistant
    const assistant = assistants.find(ass => ass.id === currentView);
    if (assistant) {
      // Route to the appropriate assistant component
      switch (assistant.id) {
        case "ugc_creator":
          return <UGCCreator onBack={() => setCurrentView("dashboard")} />;
        default:
          // For coming soon assistants, redirect to dashboard
          setCurrentView("dashboard");
          return <Dashboard onSelectDepartment={handleSelectDepartment} />;
      }
    }

    // Handle main navigation
    switch (currentView) {
      case "library":
        return <Library onBack={() => setCurrentView("dashboard")} />;
      case "profile":
        return <Profile onBack={() => setCurrentView("dashboard")} />;
      case "dashboard":
      default:
        return <Dashboard onSelectDepartment={handleSelectDepartment} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentView={currentView} onNavigate={handleNavigate} />
      <div className="lg:ml-64 min-h-screen">
        {renderCurrentView()}
      </div>
    </div>
  );
};

export default Index;
