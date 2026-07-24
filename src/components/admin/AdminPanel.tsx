/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminSidebar, { AdminTab } from './AdminSidebar';
import DashboardTab from './tabs/DashboardTab';
import FotosTab from './tabs/FotosTab';
import AlbunsTab from './tabs/AlbunsTab';
import CategoriasTab from './tabs/CategoriasTab';
import DepoimentosTab from './tabs/DepoimentosTab';
import PerfilTab from './tabs/PerfilTab';
import ConfiguracoesTab from './tabs/ConfiguracoesTab';
import Toast from '../Toast';

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [userName, setUserName] = useState('Fotógrafo');
  const [userId, setUserId] = useState<string | null>(null);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState('');
  const [toastIsError, setToastIsError] = useState(false);

  const showToast = (msg: string, isError = false) => {
    setToastMessage(msg);
    setToastIsError(isError);
  };

  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          
          // Fetch corresponding photographer record
          const { data, error } = await supabase
            .from('photographers')
            .select('name')
            .eq('id', user.id)
            .maybeSingle();

          if (data && data.name) {
            setUserName(data.name);
          } else {
            // If photographer profile is missing, auto-create it using localStorage or email fallback
            let finalName = localStorage.getItem('pending_signup_fullname') || '';
            let finalSlug = localStorage.getItem('pending_signup_slug') || '';
            
            if (!finalName) {
              const emailName = user.email ? user.email.split('@')[0] : 'fotografo';
              finalName = emailName
                .split(/[._-]/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            }
            
            if (!finalSlug) {
              const emailName = user.email ? user.email.split('@')[0] : 'fotografo';
              finalSlug = emailName.toLowerCase().replace(/[^a-z0-9-]/g, '');
            }

            // Check if slug already exists to prevent duplicate key constraint
            const { data: slugCheck } = await supabase
              .from('photographers')
              .select('id')
              .eq('slug', finalSlug)
              .maybeSingle();

            if (slugCheck) {
              finalSlug = `${finalSlug}-${Math.random().toString(36).substring(2, 6)}`;
            }

            // Create photographer
            const { error: insertError } = await supabase
              .from('photographers')
              .insert({
                id: user.id,
                name: finalName,
                slug: finalSlug,
                bio: `Olá! Eu sou ${finalName}, fotógrafo autoral focado em criar narrativas cinematográficas de alto nível.`,
                experience_years: 5,
                specialties: ['Editorial', 'Retrato', 'Moda'],
                plan: 'trial',
                trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
              });

            if (!insertError) {
              setUserName(finalName);
              
              // Clear pending values
              localStorage.removeItem('pending_signup_fullname');
              localStorage.removeItem('pending_signup_slug');

              // Create default site_settings too
              await supabase
                .from('site_settings')
                .upsert({
                  photographer_id: user.id,
                  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300&h=300',
                  primary_color: '#CBD5E1',
                  instagram_handle: '',
                  whatsapp_number: ''
                }, { onConflict: 'photographer_id' });
            } else {
              console.error('Error auto-creating photographer profile:', insertError);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    }
    loadUserData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  // Switch tabs
  const renderTabContent = () => {
    if (!userId) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[var(--app-accent)] animate-spin" />
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab userId={userId} photographerName={userName} onTabChange={setActiveTab} />;
      case 'fotos':
        return <FotosTab userId={userId} onShowToast={showToast} />;
      case 'albuns':
        return <AlbunsTab userId={userId} onShowToast={showToast} />;
      case 'categorias':
        return <CategoriasTab userId={userId} onShowToast={showToast} />;
      case 'depoimentos':
        return <DepoimentosTab userId={userId} onShowToast={showToast} />;
      case 'perfil':
        return <PerfilTab userId={userId} onShowToast={showToast} onProfileUpdate={setUserName} />;
      case 'configuracoes':
        return <ConfiguracoesTab userId={userId} onShowToast={showToast} />;
      default:
        return <DashboardTab userId={userId} photographerName={userName} onTabChange={setActiveTab} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen md:overflow-hidden bg-[#050506] text-neutral-200 selection:bg-white/10 selection:text-zinc-200">
      <AdminSidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        userName={userName} 
        onLogout={handleLogout} 
      />

      <main className="flex-1 p-5 sm:p-6 md:p-10 md:h-full md:overflow-y-auto relative">
        {/* Ambient workspace lighting — layered like the landing hero instead
            of a single flat glow, but kept very subtle since this is a
            working surface, not a hero moment. */}
        <div className="absolute top-0 left-0 right-0 h-[640px] pointer-events-none -z-0">
          <div className="app-workspace-glow absolute inset-0" />
          <div
            className="absolute top-[-20%] right-[10%] w-[420px] h-[420px] rounded-full blur-[140px] mix-blend-screen opacity-60"
            style={{ background: 'radial-gradient(circle, rgba(214,220,228,0.06) 0%, transparent 70%)' }}
          />
          <div
            className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='pn'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23pn)'/%3E%3C/svg%3E\")",
            }}
          />
        </div>
        <div className="max-w-6xl mx-auto space-y-8 pb-12 relative z-10">
          {renderTabContent()}
        </div>
      </main>

      {/* Reusable Toast */}
      <Toast 
        message={toastMessage} 
        isError={toastIsError} 
        isOpen={!!toastMessage}
        onClose={() => setToastMessage('')} 
      />
    </div>
  );
}
