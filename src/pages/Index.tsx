
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { UGCCreator } from "@/components/departments/UGCCreator";
import { Library } from "@/components/departments/Library";
import { Profile } from "@/pages/Profile";

const assistants = [
  {
    id: import.meta.env.VITE_OPENAI_ASSISTANT_ID_UGC,
    name: 'UGC Creator',
    desc: 'Gerar imagens UGC realistas',
    handle: 'ugc_creator'
  },
];

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
    switch (currentView) {
      case "library":
        return <Library onBack={() => setCurrentView("dashboard")} />;
      case "ugc_creator":
        return <UGCCreator onBack={() => setCurrentView("dashboard")} />;
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
