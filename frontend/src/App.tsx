import React from 'react';
import { Header } from './components/Header';
import { ChatArea } from './components/ChatArea';
import { ErrorBanner } from './components/ErrorBanner';
import { Composer } from './components/Composer';

export const App: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-background text-slate-100 overflow-hidden">
      {/* Header */}
      <Header />

      {/* Actionable Error Banner */}
      <ErrorBanner />

      {/* Main Chat Scroll Container */}
      <ChatArea />

      {/* Input Composer */}
      <Composer />
    </div>
  );
};

export default App;
