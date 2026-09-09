import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#030603] text-text-primary flex flex-col justify-center items-center p-3 sm:p-6 relative overflow-x-hidden selection:bg-[#C7FF00] selection:text-black font-sans">
      {/* Subtle brand ambiance */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#C7FF00]/[0.05] rounded-full blur-[140px] pointer-events-none" />

      {/* Brand Header */}
      <div className="flex items-center gap-3.5 mb-6 select-none z-10">
        <img
          src="/Buildhub--Logo.png"
          alt="BuildHub Logo"
          className="w-12 h-12 rounded-full object-cover shrink-0 drop-shadow-[0_0_16px_rgba(199,255,0,0.4)]"
        />
        <div className="flex flex-col">
          <div className="text-2xl font-black font-display tracking-tight leading-none flex items-center gap-1">
            <span className="text-white">Build</span>
            <span className="text-[#C7FF00]">Hub</span>
          </div>
          <span className="text-[11px] text-[#869984] font-semibold tracking-[0.16em] uppercase mt-1 font-display">
            Enterprise Work Management
          </span>
        </div>
      </div>

      {/* Main Form Container Card */}
      <div className="w-full max-w-md bg-gradient-to-b from-[#132015]/95 via-[#0e1710]/98 to-[#070d08]/98 border border-[#C7FF00]/30 rounded-2xl sm:rounded-[24px] shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(199,255,0,0.08)] backdrop-blur-2xl p-6 sm:p-8 z-10 animate-scale-in relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-[#C7FF00] before:to-transparent">
        <Outlet />
      </div>

      {/* Bottom Footer Note */}
      <footer className="mt-8 text-center text-xs text-[#586B56] select-none z-10 font-sans">
        &copy; {new Date().getFullYear()} BuildHub Systems, Inc. All rights reserved.
      </footer>
    </div>
  );
};
