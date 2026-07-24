/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Photographer } from '../../../types';
import { Sparkles } from 'lucide-react';

interface PerfilTabProps {
  userId: string;
  onShowToast: (message: string, isError?: boolean) => void;
  onProfileUpdate: (name: string) => void;
}

export default function PerfilTab({ userId, onShowToast, onProfileUpdate }: PerfilTabProps) {
  const [profile, setProfile] = useState<Photographer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState<number | ''>('');
  const [specialties, setSpecialties] = useState('');
  const [equipment, setEquipment] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('photographers')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          onShowToast('Erro ao carregar dados do perfil.', true);
          return;
        }

        if (data) {
          setProfile(data);
          setName(data.name || '');
          setSlug(data.slug || '');
          setBio(data.bio || '');
          setExperienceYears(data.experience_years ?? '');
          setSpecialties((data.specialties || []).join(', '));
          setEquipment(data.equipment || '');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    const specialtiesList = specialties
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      const { error } = await supabase
        .from('photographers')
        .update({
          name: name.trim(),
          bio: bio.trim() || null,
          experience_years: experienceYears === '' ? null : Number(experienceYears),
          specialties: specialtiesList,
          equipment: equipment.trim() || null
        })
        .eq('id', userId);

      if (error) throw error;
      onShowToast('Perfil atualizado com sucesso.');
      onProfileUpdate(name.trim());
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Erro ao salvar alterações do perfil.', true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[var(--app-accent)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl animate-fade-in space-y-6" style={{
        // Same silver tokens as SaaSLandingPage/Login — without this the
        // admin panel's buttons/borders/gradients fall back to whatever
        // index.css defines globally, which reads as a duller/different
        // silver than the rest of the product.
        '--app-accent': '#DCE3EA',
        '--app-accent-dim': '#9AA3AF',
        '--app-accent-rgb': '220,227,234',
        '--app-accent-ink': '#0B0D10',
        '--app-accent-gradient': 'linear-gradient(120deg, #2A2E34 0%, #7B8492 18%, #C3C9D1 34%, #FFFFFF 46%, #EBEFF2 54%, #FFFFFF 66%, #9AA3AF 80%, #4B515A 100%)',
      } as React.CSSProperties}>
      <div className="space-y-1">
        <p className="text-xs text-zinc-400 font-semibold">Identidade</p>
        <h2 className="text-xl font-display italic text-white font-medium">Perfil Profissional</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-5 border border-white/5 bg-neutral-950/20 rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-neutral-400 mb-2">Endereço do seu site (Slug)</label>
            <input 
              type="text" 
              value={slug}
              disabled
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/5 text-neutral-500 text-sm outline-none cursor-not-allowed"
            />
            <p className="text-[10px] text-neutral-500 mt-1.5">O endereço único não pode ser alterado nesta fase.</p>
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-2">Nome Completo</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-neutral-400 mb-2">História / Biografia</label>
          <textarea 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
            placeholder="Conte um pouco sobre sua trajetória, seu olhar fotográfico e seu propósito profissional..."
            className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none resize-none focus:border-[var(--app-accent)] transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-neutral-400 mb-2">Anos de experiência</label>
            <input 
              type="number" 
              min={0}
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Ex: 5"
              className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-2">Especialidades (separadas por vírgula)</label>
            <input 
              type="text" 
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
              placeholder="Casamentos, Retratos, Fine Art"
              className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-neutral-400 mb-2">Equipamentos (opcional)</label>
          <textarea 
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            rows={3}
            placeholder="Ex: Sony A7R IV, Lente 24-70mm f/2.8 GM, Lente 85mm f/1.4..."
            className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none resize-none focus:border-[var(--app-accent)] transition-all"
          />
        </div>

        <p className="text-[11px] text-neutral-400 flex items-center gap-1.5 py-2">
          <Sparkles className="w-3.5 h-3.5 text-zinc-300" /> Logo, imagem de destaque e retrato de perfil são configurados na aba "Configurações".
        </p>

        <button 
          type="submit" 
          disabled={submitting}
          className="px-6 py-3 rounded-xl font-semibold text-xs app-btn-accent transition-all duration-200 disabled:opacity-50 cursor-pointer"
        >
          {submitting ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
    </div>
  );
}
