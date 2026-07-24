/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { supabase } from '../../lib/supabase';
import { 
  LayoutDashboard, Camera, FolderHeart, Tags, 
  MessageSquare, UserCircle, Settings, LogOut
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
  shortLabel: string;
  icon: React.ComponentType<any>;
}

// shortLabel powers the compact mobile pill strip; label is the full word
// used in the desktop rail.
const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Início', icon: LayoutDashboard },
  { id: 'fotos', label: 'Fotos', shortLabel: 'Fotos', icon: Camera },
  { id: 'albuns', label: 'Álbuns', shortLabel: 'Álbuns', icon: FolderHeart },
  { id: 'categorias', label: 'Categorias', shortLabel: 'Categ.', icon: Tags },
  { id: 'depoimentos', label: 'Depoimentos', shortLabel: 'Depoim.', icon: MessageSquare },
  { id: 'perfil', label: 'Perfil', shortLabel: 'Perfil', icon: UserCircle },
  { id: 'configuracoes', label: 'Configurações', shortLabel: 'Config.', icon: Settings },
];

export default function AdminSidebar({ activeTab, onTabChange, onLogout, userName }: AdminSidebarProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const initials = (userName || 'FP').substring(0, 2).toUpperCase();

  return (
    <>
      {/* ================= DESKTOP — "contact sheet" rail ================= */}
      {/* Reimagined as an editorial index rather than a generic icon list:
          each destination is a numbered frame (like frame numbers on a roll
          of film), the active frame gets a solid chrome-gradient plate
          instead of a thin accent border, and the whole rail carries the
          same layered ambient light + grain used on the hero/login instead
          of a flat panel. Hidden below md — mobile gets its own component
          below so it never has to squeeze this layout into a top bar. */}
      <aside className="hidden md:flex w-[248px] shrink-0 md:h-full flex-col justify-between border-r border-white/5 bg-[#030304] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -top-[20%] -left-[30%] w-[380px] h-[380px] rounded-full blur-[110px] mix-blend-screen opacity-70"
            style={{ background: 'radial-gradient(circle, rgba(214,220,228,0.10) 0%, transparent 70%)' }}
          />
          <div
            className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='sn'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23sn)'/%3E%3C/svg%3E\")",
            }}
          />
        </div>
        {/* Chrome hairline down the right edge instead of a flat border */}
        <div className="absolute top-0 right-0 bottom-0 w-px bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.1)_15%,rgba(255,255,255,0.1)_85%,transparent_100%)]" />

        <div className="relative flex flex-col min-h-0">
          {/* Brand plate */}
          <div className="px-6 pt-7 pb-6 flex items-center gap-3 relative">
            <div className="w-9 h-9 rounded-xl bg-[image:var(--app-accent-gradient)] p-[1.5px] shrink-0">
              <div className="w-full h-full rounded-xl bg-black flex items-center justify-center">
                <img src="/focus-mark.png" alt="" className="w-4 h-4 object-contain" />
              </div>
            </div>
            <div className="min-w-0">
              <img src="/focus-logo-metallic.png" alt="FocusPortfolio" className="h-3.5 w-auto shrink-0 object-contain" loading="eager" />
              <p className="text-[9px] text-neutral-600 font-sans uppercase tracking-widest mt-1">Painel Autoral</p>
            </div>
          </div>

          {/* Index rail — frame-numbered nav, active state is a solid plate */}
          <nav className="px-4 pt-2 pb-6 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map((item, idx) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`group relative w-full flex items-center gap-3 pl-2.5 pr-3 py-2.5 rounded-xl text-sm font-medium tracking-wide transition-all duration-300 ease-out ${
                    isActive
                      ? 'bg-[image:var(--app-accent-gradient)] bg-[length:200%_100%] bg-[position:20%_0%] text-[var(--app-accent-ink)] shadow-[0_10px_26px_-10px_rgba(var(--app-accent-rgb),0.5)]'
                      : 'text-neutral-500 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span className={`font-mono text-[9px] tabular-nums w-4 shrink-0 text-center ${isActive ? 'text-[var(--app-accent-ink)]/60' : 'text-neutral-700 group-hover:text-neutral-500'}`}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--app-accent-ink)]' : 'text-neutral-500 group-hover:text-neutral-300'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User frame — styled like a film-negative frame instead of a plain row */}
        <div className="relative px-4 pb-5 pt-4 border-t border-white/5">
          {userName && (
            <div className="flex items-center gap-3 px-2.5 py-2 mb-2 rounded-xl">
              <div className="relative w-8 h-8 rounded-lg bg-black border border-white/10 shrink-0 flex items-center justify-center font-sans text-[10px] text-[var(--app-accent)] font-bold tracking-wide">
                {initials}
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--app-accent)] shadow-[0_0_6px_1px_rgba(var(--app-accent-rgb),0.7)]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-neutral-200 truncate">{userName}</p>
                <p className="text-[9px] text-neutral-600 uppercase tracking-wider">Fotógrafo Pro</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium tracking-wide rounded-xl text-neutral-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 group"
          >
            <LogOut className="w-3.5 h-3.5 text-neutral-600 group-hover:text-red-400 transition-colors" />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* ================= MOBILE — horizontal pill strip ================= */}
      {/* Replaces the old full-width vertical button stack, which used to
          push the entire page's content down by 7 stacked rows before the
          user saw anything — a direct cause of the "unnecessary scrolling"
          complaint. This is a single-row, horizontally scrollable strip
          instead, sticky under the (implicit) top of the viewport. */}
      <div className="md:hidden sticky top-0 z-[35] border-b border-white/5 bg-[#030304]/95 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar">
          <img src="/focus-mark.png" alt="" className="w-5 h-5 object-contain shrink-0 mr-1" />
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`shrink-0 flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-all duration-200 ${
                  isActive
                    ? 'bg-[image:var(--app-accent-gradient)] text-[var(--app-accent-ink)]'
                    : 'text-neutral-500 bg-white/[0.03] border border-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.shortLabel}
              </button>
            );
          })}
          <button
            onClick={handleLogout}
            className="shrink-0 flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide text-neutral-600 bg-white/[0.03] border border-white/5 ml-1"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}
