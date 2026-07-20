/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { SiteSettings } from '../../../types';
import { Sparkles, Image as ImageIcon, Link as LinkIcon, Upload, Trash2 } from 'lucide-react';

interface ConfiguracoesTabProps {
  userId: string;
  onShowToast: (message: string, isError?: boolean) => void;
}

export default function ConfiguracoesTab({ userId, onShowToast }: ConfiguracoesTabProps) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [slogan, setSlogan] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#CBD5E1');
  
  // Custom image URLs or inputs
  const [logoUrl, setLogoUrl] = useState('');
  const [heroPhotoUrl, setHeroPhotoUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Tab inputs for image options (upload vs URL)
  const [logoMethod, setLogoMethod] = useState<'url' | 'upload'>('url');
  const [heroMethod, setHeroMethod] = useState<'url' | 'upload'>('url');
  const [avatarMethod, setAvatarMethod] = useState<'url' | 'upload'>('url');

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('site_settings')
          .select('*')
          .eq('photographer_id', userId)
          .maybeSingle();

        if (error) {
          onShowToast('Erro ao carregar configurações do site.', true);
          return;
        }

        if (data) {
          setSettings(data);
          setSlogan(data.slogan || '');
          setWhatsappNumber(data.whatsapp_number || '');
          setInstagramHandle(data.instagram_handle || '');
          setPrimaryColor(data.primary_color || '#CBD5E1');
          setLogoUrl(data.logo_url || '');
          setHeroPhotoUrl(data.hero_photo_url || '');
          setAvatarUrl(data.avatar_url || '');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const fields = {
      slogan: slogan.trim() || null,
      whatsapp_number: whatsappNumber.trim() || null,
      instagram_handle: instagramHandle.trim() || null,
      primary_color: primaryColor,
      logo_url: logoUrl.trim() || null,
      hero_photo_url: heroPhotoUrl.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    };

    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          photographer_id: userId,
          ...fields
        }, { onConflict: 'photographer_id' });

      if (error) throw error;
      onShowToast('Configurações salvas com sucesso.');
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Erro ao salvar configurações.', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Upload asset logic
  const handleUploadAsset = async (
    file: File, 
    bucket: 'logos' | 'hero' | 'avatars', 
    setUrl: (url: string) => void,
    fieldName: string
  ) => {
    try {
      onShowToast('Comprimindo e enviando imagem...');
      
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/${bucket}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
      
      setUrl(publicUrl);
      onShowToast('Upload concluído com sucesso!');
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Erro ao realizar upload da imagem. Usando URL direta de backup.', true);
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
    <div className="max-w-2xl animate-fade-in space-y-8">
      <div className="space-y-1">
        <p className="text-xs text-zinc-400 font-semibold">Identidade</p>
        <h2 className="text-xl font-display italic text-white font-medium">Configurações do Site</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Core fields card */}
        <div className="border border-white/5 bg-neutral-950/20 rounded-2xl p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-semibold tracking-wider text-neutral-300">Campos Principais</h3>
          
          <div>
            <label className="block text-xs text-neutral-400 mb-2">Slogan do Site</label>
            <input 
              type="text" 
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              placeholder="Ex: Fotografia de alma e sensibilidade comercial"
              className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-2">WhatsApp (com DDD)</label>
              <input 
                type="text" 
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="Ex: 5511999999999"
                className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-2">Instagram (usuário sem @)</label>
              <input 
                type="text" 
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                placeholder="Ex: seu.instagram"
                className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-2">Cor de Destaque do Site</label>
            <div className="flex items-center gap-4">
              <input 
                type="color" 
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-12 p-0.5 rounded-xl bg-neutral-900 border border-white/5 cursor-pointer"
              />
              <div className="text-xs text-neutral-400 font-sans">
                <span className="text-neutral-100 font-semibold tracking-wider font-sans bg-white/5 px-2 py-0.5 rounded border border-white/10">{primaryColor}</span>
                <p className="mt-2 text-neutral-500">Afeta as pílulas, botões, tags e seleções do seu portfólio.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Media Asset Management Card */}
        <div className="border border-white/5 bg-neutral-950/20 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-semibold tracking-wider text-neutral-300">Imagens & Identidade</h3>

          {/* Logo Field */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs text-neutral-400">Logo da Marca</label>
              <div className="flex rounded-lg overflow-hidden border border-white/5 bg-black p-[2px]">
                <button 
                  type="button" 
                  onClick={() => setLogoMethod('url')} 
                  className={`px-3 py-1 text-[10px] rounded-md transition-all ${logoMethod === 'url' ? 'app-btn-accent font-semibold' : 'text-neutral-400 hover:text-white'}`}
                >
                  Link URL
                </button>
                <button 
                  type="button" 
                  onClick={() => setLogoMethod('upload')} 
                  className={`px-3 py-1 text-[10px] rounded-md transition-all ${logoMethod === 'upload' ? 'app-btn-accent font-semibold' : 'text-neutral-400 hover:text-white'}`}
                >
                  Upload
                </button>
              </div>
            </div>

            {logoMethod === 'url' ? (
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input 
                    type="url" 
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://sua-imagem.com/logo.png"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] transition-all"
                  />
                </div>
                {logoUrl && (
                  <button 
                    type="button" 
                    onClick={() => setLogoUrl('')}
                    className="p-3 text-red-400 hover:bg-red-500/5 rounded-xl border border-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <label className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/5 hover:border-white/20 bg-black/40 rounded-xl cursor-pointer hover:bg-black transition-all">
                  <Upload className="w-6 h-6 text-neutral-500 mb-2" />
                  <span className="text-xs text-neutral-400">Escolha o arquivo de Logo</span>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleUploadAsset(e.target.files[0], 'logos', setLogoUrl, 'logo_url');
                      }
                    }}
                    className="hidden" 
                  />
                </label>
              </div>
            )}

            {logoUrl && (
              <div className="h-16 p-3 rounded-xl bg-black/50 border border-white/5 flex items-center justify-center">
                <img src={logoUrl} alt="Logo" className="max-h-full object-contain" />
              </div>
            )}
          </div>

          {/* Hero Field */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex justify-between items-center">
              <label className="text-xs text-neutral-400">Foto de Capa (Hero)</label>
              <div className="flex rounded-lg overflow-hidden border border-white/5 bg-black p-[2px]">
                <button 
                  type="button" 
                  onClick={() => setHeroMethod('url')} 
                  className={`px-3 py-1 text-[10px] rounded-md transition-all ${heroMethod === 'url' ? 'app-btn-accent font-semibold' : 'text-neutral-400 hover:text-white'}`}
                >
                  Link URL
                </button>
                <button 
                  type="button" 
                  onClick={() => setHeroMethod('upload')} 
                  className={`px-3 py-1 text-[10px] rounded-md transition-all ${heroMethod === 'upload' ? 'app-btn-accent font-semibold' : 'text-neutral-400 hover:text-white'}`}
                >
                  Upload
                </button>
              </div>
            </div>

            {heroMethod === 'url' ? (
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input 
                    type="url" 
                    value={heroPhotoUrl}
                    onChange={(e) => setHeroPhotoUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] transition-all"
                  />
                </div>
                {heroPhotoUrl && (
                  <button 
                    type="button" 
                    onClick={() => setHeroPhotoUrl('')}
                    className="p-3 text-red-400 hover:bg-red-500/5 rounded-xl border border-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <label className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/5 hover:border-white/20 bg-black/40 rounded-xl cursor-pointer hover:bg-black transition-all">
                  <Upload className="w-6 h-6 text-neutral-500 mb-2" />
                  <span className="text-xs text-neutral-400">Escolha o arquivo de Capa</span>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleUploadAsset(e.target.files[0], 'hero', setHeroPhotoUrl, 'hero_photo_url');
                      }
                    }}
                    className="hidden" 
                  />
                </label>
              </div>
            )}

            {heroPhotoUrl && (
              <div className="aspect-[21/9] rounded-xl overflow-hidden border border-white/5">
                <img src={heroPhotoUrl} alt="Capa" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Avatar Field */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex justify-between items-center">
              <label className="text-xs text-neutral-400">Foto de Perfil (Avatar)</label>
              <div className="flex rounded-lg overflow-hidden border border-white/5 bg-black p-[2px]">
                <button 
                  type="button" 
                  onClick={() => setAvatarMethod('url')} 
                  className={`px-3 py-1 text-[10px] rounded-md transition-all ${avatarMethod === 'url' ? 'app-btn-accent font-semibold' : 'text-neutral-400 hover:text-white'}`}
                >
                  Link URL
                </button>
                <button 
                  type="button" 
                  onClick={() => setAvatarMethod('upload')} 
                  className={`px-3 py-1 text-[10px] rounded-md transition-all ${avatarMethod === 'upload' ? 'app-btn-accent font-semibold' : 'text-neutral-400 hover:text-white'}`}
                >
                  Upload
                </button>
              </div>
            </div>

            {avatarMethod === 'url' ? (
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input 
                    type="url" 
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] transition-all"
                  />
                </div>
                {avatarUrl && (
                  <button 
                    type="button" 
                    onClick={() => setAvatarUrl('')}
                    className="p-3 text-red-400 hover:bg-red-500/5 rounded-xl border border-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <label className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/5 hover:border-white/20 bg-black/40 rounded-xl cursor-pointer hover:bg-black transition-all">
                  <Upload className="w-6 h-6 text-neutral-500 mb-2" />
                  <span className="text-xs text-neutral-400">Escolha o retrato de perfil</span>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleUploadAsset(e.target.files[0], 'avatars', setAvatarUrl, 'avatar_url');
                      }
                    }}
                    className="hidden" 
                  />
                </label>
              </div>
            )}

            {avatarUrl && (
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full overflow-hidden border border-white/5 shadow-lg">
                  <img src={avatarUrl} alt="Retrato" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </div>
        </div>

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
