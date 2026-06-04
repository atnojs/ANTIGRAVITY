import { useState } from "react";
import { 
  Sparkles, 
  Layout, 
  Grid, 
  Compass, 
  Settings, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  Cpu, 
  Image as ImageIcon
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ 
  currentTab, 
  onChangeTab, 
  collapsed, 
  setCollapsed 
}: SidebarProps) {
  const menuItems = [
    { id: "generator", label: "Espacio Aura", icon: Sparkles },
    { id: "gallery", label: "Mis Esculturas", icon: Grid },
    { id: "explore", label: "Exhibición Aura", icon: Compass },
    { id: "models", label: "Centro de Modelos", icon: Cpu },
  ];

  const secondaryItems = [
    { id: "docs", label: "Documentación", icon: HelpCircle },
    { id: "settings", label: "Ajustes Globales", icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        id="desktop-sidebar"
        className={`hidden md:flex flex-col h-screen fixed left-0 top-0 z-30 transition-all duration-300 ease-in-out border-r border-white/10 bg-[#080B11]/95 backdrop-blur-md ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Branding */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Pulsing Gradient Logo */}
            <div className="relative flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] animate-pulse">
              <div className="absolute inset-0.5 rounded-full bg-[#080B11] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#EC4899]" />
              </div>
            </div>
            
            {!collapsed && (
              <span className="font-display font-bold text-lg tracking-wider bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                AURA<span className="text-[#EC4899]">STUDIO</span>
              </span>
            )}
          </div>

          <button 
            id="toggle-sidebar"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg border border-white/5 hover:border-white/15 bg-white/5 text-slate-400 hover:text-white transition-all"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            <p className={`px-2 mb-2 text-[10px] font-mono tracking-widest text-slate-500 uppercase ${collapsed ? "text-center" : ""}`}>
              {collapsed ? "WORK" : "Entorno de Trabajo"}
            </p>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => onChangeTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 group relative ${
                    isActive 
                      ? "text-white font-medium bg-gradient-to-r from-white/10 to-transparent border-l-2 border-[#7C3AED]" 
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-[#7C3AED]" : "text-slate-400 group-hover:text-slate-200"}`} />
                  {!collapsed && <span className="text-sm tracking-wide">{item.label}</span>}
                  
                  {/* Tooltip for collapsed state */}
                  {collapsed && (
                    <div className="absolute left-full ml-4 px-2.5 py-1.5 rounded-md bg-[#121824] border border-white/10 text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-6 space-y-1">
            <p className={`px-2 mb-2 text-[10px] font-mono tracking-widest text-slate-500 uppercase ${collapsed ? "text-center" : ""}`}>
              {collapsed ? "CONF" : "Configuración"}
            </p>
            {secondaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => onChangeTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 group relative ${
                    isActive 
                      ? "text-white font-medium bg-gradient-to-r from-white/10 to-transparent border-l-2 border-[#EC4899]" 
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-[#EC4899]" : "text-slate-400 group-hover:text-slate-200"}`} />
                  {!collapsed && <span className="text-sm tracking-wide">{item.label}</span>}

                  {collapsed && (
                    <div className="absolute left-full ml-4 px-2.5 py-1.5 rounded-md bg-[#121824] border border-white/10 text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] p-0.5">
              <div className="w-full h-full bg-[#080B11] rounded-full flex items-center justify-center font-bold text-xs text-white">
                AS
              </div>
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-slate-200 truncate">Artista Aura</p>
                <p className="text-[10px] font-mono text-emerald-400">● Motor Conectado</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav 
        id="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#080B11]/95 backdrop-blur-xl border-t border-white/10 z-40 flex items-center justify-around px-4"
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              onClick={() => onChangeTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 ${
                isActive ? "text-white" : "text-slate-500"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? "text-[#7C3AED]" : "text-slate-500"}`} />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#7C3AED]" />
                )}
              </div>
              <span className="text-[9px] font-medium tracking-wide font-sans">
                {item.id === "generator" ? "Espacio" : item.id === "gallery" ? "Esculturas" : item.id === "explore" ? "Exhibición" : "Centro"}
              </span>
            </button>
          );
        })}

        <button
          id="mobile-nav-settings"
          onClick={() => onChangeTab("settings")}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 ${
            currentTab === "settings" ? "text-white" : "text-slate-500"
          }`}
        >
          <div className="relative">
            <Settings className={`w-5 h-5 ${currentTab === "settings" ? "text-[#EC4899]" : "text-slate-500"}`} />
            {currentTab === "settings" && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#EC4899]" />
            )}
          </div>
          <span className="text-[9px] font-medium tracking-wide">Ajustes</span>
        </button>
      </nav>
    </>
  );
}
