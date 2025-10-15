import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { OnboardingView } from "@/components/OnboardingView";
import { ChatView } from "@/components/ChatView";
import { MindMapView } from "@/components/MindMapView";

type ViewState = "onboarding" | "chat" | "mindmap";

const Index = () => {
  const [currentView, setCurrentView] = useState<ViewState>("onboarding");
  const [initialMessage, setInitialMessage] = useState("");

  const handleStart = (message: string) => {
    setInitialMessage(message);
    setCurrentView("chat");
  };

  const handleViewMap = () => {
    setCurrentView("mindmap");
  };

  const handleContinueChat = () => {
    setCurrentView("chat");
  };

  return (
    <div className="relative">
      <Navigation />
      
      {currentView === "onboarding" && <OnboardingView onStart={handleStart} />}
      {currentView === "chat" && <ChatView initialMessage={initialMessage} onViewMap={handleViewMap} />}
      {currentView === "mindmap" && <MindMapView onContinueChat={handleContinueChat} />}
    </div>
  );
};

export default Index;
