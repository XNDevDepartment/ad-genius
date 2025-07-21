
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { UGCCreator } from "@/components/departments/UGCCreator";
import { Library } from "@/components/departments/Library";
import { Profile } from "@/pages/Profile";
import { ConversationHistory } from "@/components/ConversationHistory";
import { AdminAccessButton } from "@/components/AdminAccessButton";

const Index = () => {
  const [currentView, setCurrentView] = useState(localStorage.getItem("currentView") || "dashboard");
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>();

  const handleSelectDepartment = (departmentId: string) => {
    setCurrentView(departmentId);
    localStorage.setItem("currentView", departmentId);
    
    // Reset thread if switching to a new UGC Creator instance
    if (departmentId === "ugc_creator") {
      setCurrentThreadId(undefined);
    }
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    localStorage.setItem("currentView", view);
    
    // Reset thread when navigating away from UGC Creator
    if (view !== "ugc_creator") {
      setCurrentThreadId(undefined);
    }
  };

  const handleSelectConversation = (threadId: string) => {
    setCurrentThreadId(threadId);
    setCurrentView("ugc_creator");
    localStorage.setItem("currentView", "ugc_creator");
  };

  const handleNewConversation = () => {
    setCurrentThreadId(undefined);
    setCurrentView("ugc_creator");
    localStorage.setItem("currentView", "ugc_creator");
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case "library":
        return <Library onBack={() => setCurrentView("dashboard")} />;
      case "ugc_creator":
        return (
          <UGCCreator 
            onBack={() => setCurrentView("dashboard")} 
            initialThreadId={currentThreadId}
          />
        );
      case "profile":
        return <Profile onBack={() => setCurrentView("dashboard")} />;
      case "conversation_history":
        return (
          <ConversationHistory 
            onBack={() => setCurrentView("dashboard")}
            onSelectConversation={handleSelectConversation}
          />
        );
      case "dashboard":
      default:
        return <Dashboard onSelectDepartment={handleSelectDepartment} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        currentView={currentView} 
        onNavigate={handleNavigate}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        currentThreadId={currentThreadId}
      />
      <div className="lg:ml-64 min-h-screen">
        <div className="fixed top-4 right-4 z-50">
          <AdminAccessButton />
        </div>
        {renderCurrentView()}
      </div>
    </div>
  );
};

export default Index;
