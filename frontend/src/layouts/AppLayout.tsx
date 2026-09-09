import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { cn } from '../utils/cn';

export const AppLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-dark-bg text-text-primary flex flex-col selection:bg-brand selection:text-dark-bg">
      {/* Collapsible / Responsive Navigation Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col">
        <Topbar
          onMenuClick={() => setIsMobileOpen(true)}
          sidebarCollapsed={isCollapsed}
        />

        <main
          className={cn(
            'flex-1 p-4 sm:p-6 lg:p-8 transition-all duration-200 ease-in-out',
            isCollapsed ? 'lg:pl-24' : 'lg:pl-72'
          )}
        >
          <div className="max-w-7xl mx-auto w-full animate-fade-in">
            <React.Suspense
              fallback={
                <div className="space-y-6 animate-pulse py-4 max-w-7xl mx-auto">
                  <div className="h-8 w-48 bg-dark-elevated rounded-lg" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="h-28 bg-dark-elevated rounded-xl" />
                    <div className="h-28 bg-dark-elevated rounded-xl" />
                    <div className="h-28 bg-dark-elevated rounded-xl" />
                  </div>
                  <div className="h-64 bg-dark-elevated rounded-xl" />
                </div>
              }
            >
              <Outlet />
            </React.Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};
