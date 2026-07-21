/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { supabase } from '../../lib/supabase';
import { 
  LayoutDashboard, Camera, FolderHeart, Tags, 
  MessageSquare, UserCircle, Settings, LogOut, Aperture
} from 'lucide-react';

export type AdminTab = 'dashboard' | 'fotos' | 'albuns' | 'categorias' | 'depoimentos' | 'perfil' | 'configuracoes';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLogout: () => void;
  userName?: string;
}

interface NavItem {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<any>;
}


const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'fotos', label: 'Fotos', icon: Camera },
  { id: 'albuns', label: 'Álbuns', icon: FolderHeart },
  { id: 'categorias', label: 'Categorias', icon: Tags },
  { id: 'depoimentos', label: 'Depoimentos', icon: MessageSquare },
  { id: 'perfil', label: 'Perfil', icon: UserCircle },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

export default function AdminSidebar({ activeTab, onTabChange, onLogout, userName }: AdminSidebarProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-900 bg-black flex flex-col justify-between py-6 shrink-0 md:h-screen sticky top-0 z-[35]">
      <div className="flex flex-col">
        {/* Brand header */}
        <div className="px-6 pb-6 border-b border-zinc-900 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[linear-gradient(135deg,#6B6E76_0%,#F4F5F7_45%,#FFFFFF_55%,#9AA0AA_100%)] p-[1px] flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_1px_2px_rgba(0,0,0,0.4)]">
            <div className="w-full h-full rounded-lg bg-gradient-to-b from-zinc-800 to-black flex items-center justify-center">
              <Aperture className="w-4 h-4 text-zinc-200" />
            </div>
          </div>
          <span className="font-display italic text-xl font-light tracking-tight text-white">FocusPortfolio</span>
        </div>

        {/* Sidebar Nav */}
        <nav className="px-3 py-6 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wide rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'app-nav-active text-white border-l-2 border-[var(--app-accent)]' 
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.03] border-l-2 border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--app-accent)] drop-shadow-[0_0_3px_rgba(231,233,236,0.3)]' : 'text-neutral-500'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout button & User Profile info */}
      <div className="px-3 pt-6 border-t border-zinc-900 space-y-3">
        {userName && (
          <div className="px-4 py-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neutral-900 border border-[var(--app-accent)]/30 shadow-[0_0_6px_rgba(var(--app-accent-rgb),0.1)] flex items-center justify-center font-sans text-xs text-[var(--app-accent)] font-semibold">
              {userName.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-300 truncate">{userName}</p>
              <p className="text-[10px] text-neutral-500">Fotógrafo Pro</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium tracking-wide rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 group"
        >
          <span className="flex items-center gap-3">
            <LogOut className="w-4 h-4 text-neutral-500 group-hover:text-red-400 transition-colors" />
            Sair
          </span>
        </button>
      </div>
    </aside>
  );
}
