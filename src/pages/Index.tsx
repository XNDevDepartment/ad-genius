import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { UGCCreator } from "@/components/departments/UGCCreator";

const Index = () => {
  const [currentView, setCurrentView] = useState("dashboard");

  const handleSelectDepartment = (departmentId: string) => {
    setCurrentView(departmentId);
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case "ugc-creator":
        return <UGCCreator onBack={() => setCurrentView("dashboard")} />;
      case "dashboard":
      default:
        return <Dashboard onSelectDepartment={handleSelectDepartment} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar currentView={currentView} onNavigate={handleNavigate} />
      <div className="flex-1 overflow-auto">
        {renderCurrentView()}
      </div>
    </div>
  );
};

export default Index;
