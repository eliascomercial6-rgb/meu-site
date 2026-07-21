/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Album, Photo, Category } from '../../../types';
import { getPlanLimits, PlanLimits } from '../../../lib/plan-limits';
import { 
  Camera, FolderHeart, Tags, HardDrive, Sparkles, 
  ArrowUpRight, Plus, Eye, Image as ImageIcon, CheckCircle, 
  Activity, TrendingUp, Info, Clock, Zap
} from 'lucide-react';

interface DashboardTabProps {
  userId: string;
  photographerName: string;
  onTabChange?: (tab: any) => void;
}

export default function DashboardTab({ userId, photographerName, onTabChange }: DashboardTabProps) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [photosCount, setPhotosCount] = useState(0);
  const [storageUsedBytes, setStorageUsedBytes] = useState(0);
  const [recentPhotos, setRecentPhotos] = useState<Photo[]>([]);
  const [allPhotos, setAllPhotos] = useState<any[]>([]);
  const [slug, setSlug] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Plan / trial info — drives the storage limit shown below (per-photographer,
  // not a fixed global number) and the trial status banner.
  const [planLimits, setPlanLimits] = useState<PlanLimits>(getPlanLimits(null));

  // Chart interaction state
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);

  // Preview Image state
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    async function loadDashboardStats() {
      try {
        setLoading(true);
        
        // 1. Fetch photographer slug + plan/trial info
        const { data: pData } = await supabase
          .from('photographers')
          .select('slug, plan, trial_ends_at, created_at')
          .eq('id', userId)
          .maybeSingle();
        if (pData?.slug) {
          setSlug(pData.slug);
        }
        setPlanLimits(getPlanLimits(pData));

        // 2. Fetch all active categories
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('*')
          .eq('photographer_id', userId);
        const loadedCategories = categoriesData || [];
        setCategories(loadedCategories);

        // 3. Fetch all active albums
        const { data: albumsData } = await supabase
          .from('albums')
          .select('*, categories(name)')
          .eq('photographer_id', userId);

        const loadedAlbums = albumsData || [];
        setAlbums(loadedAlbums);

        // 4. Fetch all active photos count and storage size
        const { data: photosData } = await supabase
          .from('photos')
          .select('id, file_size_bytes, created_at, title, thumbnail_url, album_id, category_id')
          .eq('photographer_id', userId)
          .is('deleted_at', null);

        const activePhotos = photosData || [];
        setPhotosCount(activePhotos.length);
        setAllPhotos(activePhotos);

        const totalBytes = activePhotos.reduce((acc, photo) => acc + (photo.file_size_bytes || 0), 0);
        setStorageUsedBytes(totalBytes);

        // Map recent photos with album names in memory
        const albumTitleById = Object.fromEntries(loadedAlbums.map(a => [a.id, a.title]));
        const enrichedRecent = activePhotos
          .slice(0, 5)
          .map(photo => ({
            ...photo,
            album_title: albumTitleById[photo.album_id || ''] || '—'
          }));
        
        setRecentPhotos(enrichedRecent as any);

      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardStats();
  }, [userId]);

  const formatStorageAmount = (bytes: number) => {
    const MB = 1024 ** 2;
    const GB = 1024 ** 3;
    if (bytes < GB) {
      return `${(bytes / MB).toFixed(2)} MB`;
    }
    return `${(bytes / GB).toFixed(2)} GB`;
  };

  const publishedAlbumsCount = albums.filter(a => a.is_published).length;
  const categoriesServed = new Set(
    albums.filter(a => a.is_published && a.category_id).map(a => a.category_id)
  ).size;

  const gbUsed = storageUsedBytes / (1024 ** 3);
  const percentUsed = (gbUsed / planLimits.storageLimitGB) * 100;

  // Compute dynamic chart data for the last 6 months based on actual photos created_at dates
  const getChartData = () => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const list = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push({
        monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: monthNames[d.getMonth()],
        count: 0
      });
    }

    // Populate counts dynamically using ALL active photos
    allPhotos.forEach(p => {
      if (!p.created_at) return;
      const date = new Date(p.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const found = list.find(m => m.monthKey === key);
      if (found) {
        found.count += 1;
      }
    });

    return list;
  };

  const chartData = getChartData();
  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  // Compute SVG Points for historical area chart
  const svgWidth = 520;
  const svgHeight = 160;
  const paddingX = 40;
  const paddingY = 25;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  const points = chartData.map((d, idx) => {
    const x = paddingX + (idx / (chartData.length - 1)) * chartWidth;
    const y = paddingY + chartHeight - (d.count / maxCount) * chartHeight;
    return { x, y, label: d.label, count: d.count };
  });

  // Build SVG path strings
  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingY + chartHeight} L ${points[0].x} ${paddingY + chartHeight} Z`;

  // Group photos by categories for visual progress bar breakdown — real counts only
  const categoryStats = categories.map(cat => {
    const count = allPhotos.filter(p => p.category_id === cat.id).length;
    return {
      name: cat.name,
      count
    };
  }).filter(c => c.count > 0).sort((a, b) => b.count - a.count).slice(0, 4);

  const totalCatPhotos = categoryStats.reduce((sum, item) => sum + item.count, 0) || 1;

  if (loading) {
    return (
      <div className="py-24 flex flex-col justify-center items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[var(--app-accent)] animate-spin" />
        <span className="text-xs font-sans text-neutral-400 uppercase tracking-widest">Carregando informações do painel...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-neutral-200">
      {/* Dynamic Status / Welcome Header */}
      <div className="p-6 md:p-8 rounded-3xl border border-zinc-900 bg-black relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.02)]">
        {/* Chrome hairline accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-[linear-gradient(90deg,transparent_0%,rgba(231,233,236,0.5)_50%,transparent_100%)]" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--app-accent)]/[0.04] rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-zinc-800/5 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shadow-[0_0_5px_rgba(255,255,255,0.45)]" />
              <span className="text-[10px] font-sans uppercase text-zinc-400 font-semibold tracking-widest">Ambiente de Gestão Autoral</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-display italic text-white font-medium">Seja bem-vindo de volta, {photographerName}!</h2>
            <p className="text-xs text-neutral-400 font-light max-w-xl">
              Seu painel administrativo está integrado ao Supabase. Todas as fotos cadastradas, depoimentos e álbuns publicados refletem instantaneamente para seus clientes.
            </p>
          </div>

          {slug && (
            <button 
              onClick={() => window.open(`/p/${slug}`, '_blank')}
              className="app-btn-accent flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-semibold transition-all duration-200 active:scale-95 group shrink-0 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Ver Meu Site</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>

      {/* Trial / plan status banner */}
      {planLimits.isTrial && (
        <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          planLimits.isExpired
            ? 'border-red-500/20 bg-red-500/[0.04]'
            : planLimits.daysLeft <= 3
              ? 'border-amber-500/20 bg-amber-500/[0.04]'
              : 'border-white/10 bg-[linear-gradient(135deg,rgba(138,143,153,0.08)_0%,rgba(244,245,247,0.05)_50%,rgba(138,143,153,0.08)_100%)]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              planLimits.isExpired ? 'bg-red-500/10 text-red-400' : planLimits.daysLeft <= 3 ? 'bg-amber-500/10 text-amber-400' : 'bg-white/5 text-[var(--app-accent)]'
            }`}>
              <Clock className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {planLimits.isExpired
                  ? 'Seu teste grátis expirou'
                  : `Teste grátis: ${planLimits.daysLeft} ${planLimits.daysLeft === 1 ? 'dia restante' : 'dias restantes'}`}
              </p>
              <p className="text-xs text-neutral-400">
                {planLimits.isExpired
                  ? 'Novos uploads estão bloqueados. Faça upgrade para continuar publicando fotos.'
                  : `Plano de teste com até ${planLimits.storageLimitGB} GB de armazenamento.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="app-btn-accent px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" /> Fazer Upgrade
          </button>
        </div>
      )}

      {/* Interactive Quick Action Shortcuts */}
      <div className="space-y-3">
        <h3 className="font-display italic text-lg text-white/90 font-medium">Ações de Acesso Rápido</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => onTabChange?.('fotos')}
            className="chrome-hairline-top chrome-card-hover p-5 rounded-2xl border border-white/5 bg-neutral-950/40 hover:bg-indigo-500/[0.04] hover:border-indigo-500/30 text-left transition-all duration-200 group relative overflow-hidden cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
            <span className="block font-sans text-[10px] tracking-widest text-indigo-400 font-semibold uppercase mb-1">FOTOS</span>
            <span className="block text-sm font-semibold text-white">Carregar Imagens</span>
            <p className="text-[10px] text-neutral-500 mt-1">Upload e gerenciamento em lote</p>
          </button>

          <button 
            onClick={() => onTabChange?.('albuns')}
            className="chrome-hairline-top chrome-card-hover p-5 rounded-2xl border border-white/5 bg-neutral-950/40 hover:bg-emerald-500/[0.04] hover:border-emerald-500/30 text-left transition-all duration-200 group relative overflow-hidden cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
              <FolderHeart className="w-5 h-5" />
            </div>
            <span className="block font-sans text-[10px] tracking-widest text-emerald-400 font-semibold uppercase mb-1">ÁLBUNS</span>
            <span className="block text-sm font-semibold text-white">Criar Novo Álbum</span>
            <p className="text-[10px] text-neutral-500 mt-1">Organize ensaios e coleções</p>
          </button>

          <button 
            onClick={() => onTabChange?.('categorias')}
            className="chrome-hairline-top chrome-card-hover p-5 rounded-2xl border border-white/5 bg-neutral-950/40 hover:bg-purple-500/[0.04] hover:border-purple-500/30 text-left transition-all duration-200 group relative overflow-hidden cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <Tags className="w-5 h-5" />
            </div>
            <span className="block font-sans text-[10px] tracking-widest text-purple-400 font-semibold uppercase mb-1">CATEGORIAS</span>
            <span className="block text-sm font-semibold text-white">Definir Nichos</span>
            <p className="text-[10px] text-neutral-500 mt-1">Filtros especiais no portfolio</p>
          </button>

          <button 
            onClick={() => onTabChange?.('perfil')}
            className="chrome-hairline-top chrome-card-hover p-5 rounded-2xl border border-white/5 bg-neutral-950/40 hover:bg-white/[0.03] hover:border-[var(--app-accent)]/30 text-left transition-all duration-200 group relative overflow-hidden cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-300 mb-4 group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="block font-sans text-[10px] tracking-widest text-zinc-300 font-semibold uppercase mb-1">PERFIL</span>
            <span className="block text-sm font-semibold text-white">Editar Minha Bio</span>
            <p className="text-[10px] text-neutral-500 mt-1">Equipamentos e especialidades</p>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="chrome-hairline-top chrome-card-hover p-6 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.01] hover:border-emerald-500/20 transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-sans uppercase text-neutral-400 tracking-wider font-semibold">Álbuns Publicados</span>
            <FolderHeart className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="font-display italic text-4xl text-white font-semibold">{publishedAlbumsCount}</p>
          <p className="text-[9px] text-neutral-500 uppercase tracking-wider font-sans mt-2">de {albums.length} álbuns criados</p>
        </div>

        {/* Card 2 */}
        <div className="chrome-hairline-top chrome-card-hover p-6 rounded-2xl border border-purple-500/10 bg-purple-500/[0.01] hover:border-purple-500/20 transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-sans uppercase text-neutral-400 tracking-wider font-semibold">Fotos no Acervo</span>
            <Camera className="w-4 h-4 text-purple-400" />
          </div>
          <p className="font-display italic text-4xl text-white font-semibold">{photosCount}</p>
          <p className="text-[9px] text-neutral-500 uppercase tracking-wider font-sans mt-2">Prontas para exibição</p>
        </div>

        {/* Card 3 */}
        <div className="chrome-hairline-top chrome-card-hover p-6 rounded-2xl border border-blue-500/10 bg-blue-500/[0.01] hover:border-blue-500/20 transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-sans uppercase text-neutral-400 tracking-wider font-semibold">Categorias Ativas</span>
            <Tags className="w-4 h-4 text-blue-400" />
          </div>
          <p className="font-display italic text-4xl text-white font-semibold">{categoriesServed}</p>
          <p className="text-[9px] text-neutral-500 uppercase tracking-wider font-sans mt-2">nichos de atuação</p>
        </div>

        {/* Card 4 - Storage and limits */}
        <div className="chrome-hairline-top chrome-card-hover p-6 rounded-2xl border border-white/10 bg-white/[0.01] flex flex-col justify-between hover:border-white/15 transition-all">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-sans uppercase text-neutral-400 tracking-wider font-semibold">Seu Armazenamento</span>
              <HardDrive className="w-4 h-4 text-zinc-300" />
            </div>
            <p className="font-display italic text-xl text-white font-semibold mb-2">
              {formatStorageAmount(storageUsedBytes)}
            </p>
          </div>
          <div>
            <div className="w-full h-1.5 rounded-full bg-neutral-900 overflow-hidden mb-1">
              <div 
                className={`h-full transition-all duration-300 ${percentUsed >= 90 ? 'bg-red-500/80' : percentUsed >= 75 ? 'bg-zinc-400' : 'bg-white'}`}
                style={{ width: `${percentUsed <= 0 ? 0 : Math.max(1.5, Math.min(100, percentUsed))}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-sans text-neutral-500">
              <span>{planLimits.isTrial ? 'Plano Teste Grátis' : 'Plano Pro'}</span>
              <span>{planLimits.storageLimitGB} GB total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dynamic Photo upload analytics SVG line area chart */}
        <div className="chrome-hairline-top p-6 rounded-3xl border border-white/5 bg-neutral-950/40 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-zinc-300" />
              <h4 className="font-display italic text-lg text-white">Histórico de Obras Criadas</h4>
            </div>
            <span className="text-[9px] font-sans font-semibold uppercase bg-white/10 text-zinc-300 px-2 py-0.5 rounded">6 meses</span>
          </div>

          <div className="relative pt-4 flex justify-center">
            {/* Legend or point tooltip display */}
            {hoveredPointIdx !== null && (
              <div className="absolute top-2 left-6 bg-neutral-900 border border-white/10 p-2.5 rounded-xl text-xs font-sans flex items-center gap-2.5 shadow-2xl animate-scale-up">
                <Activity className="w-3.5 h-3.5 text-zinc-300" />
                <div>
                  <p className="font-semibold text-white uppercase text-[10px]">{chartData[hoveredPointIdx].label}</p>
                  <p className="text-neutral-400">{chartData[hoveredPointIdx].count} fotos adicionadas</p>
                </div>
              </div>
            )}

            {/* Custom SVG Line Chart */}
            <svg 
              viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
              className="w-full h-[180px] drop-shadow-xl"
            >
              <defs>
                <linearGradient id="silver-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              {Array.from({ length: 4 }).map((_, i) => {
                const y = paddingY + (i / 3) * chartHeight;
                return (
                  <line 
                    key={i} 
                    x1={paddingX} 
                    y1={y} 
                    x2={svgWidth - paddingX} 
                    y2={y} 
                    stroke="rgba(255,255,255,0.04)" 
                    strokeDasharray="4 4"
                  />
                );
              })}

              {/* Area path */}
              <path d={areaPath} fill="url(#silver-gradient)" className="transition-all duration-500" />

              {/* Stroke line path */}
              <path d={linePath} fill="none" stroke="#e4e4e7" strokeWidth="2.5" strokeLinecap="round" className="transition-all duration-500" />

              {/* Interactive interactive nodes */}
              {points.map((p, idx) => (
                <g key={idx}>
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r={hoveredPointIdx === idx ? '6' : '4'} 
                    fill="#121212" 
                    stroke="#ffffff" 
                    strokeWidth={hoveredPointIdx === idx ? '3' : '2'}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredPointIdx(idx)}
                    onMouseLeave={() => setHoveredPointIdx(null)}
                  />
                  {/* Monthly Labels */}
                  <text 
                    x={p.x} 
                    y={svgHeight - 6} 
                    fill="#a3a3a3" 
                    fontSize="9" 
                    fontFamily="sans-serif"
                    fontWeight="500"
                    textAnchor="middle"
                  >
                    {p.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Category breakdown visual card */}
        <div className="chrome-hairline-top p-6 rounded-3xl border border-white/5 bg-neutral-950/40 space-y-4">
          <div className="border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <h4 className="font-display italic text-lg text-white">Foco por Nicho</h4>
            </div>
          </div>

          {categoryStats.length === 0 ? (
            <div className="h-[180px] flex flex-col justify-center items-center text-center p-4">
              <Info className="w-8 h-8 text-neutral-600 mb-2" />
              <p className="text-xs text-neutral-500 font-sans">
                {categories.length === 0
                  ? 'Crie categorias para visualizar a distribuição.'
                  : 'Nenhuma foto vinculada a uma categoria ainda.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {categoryStats.map((item, idx) => {
                const percent = Math.round((item.count / totalCatPhotos) * 100);
                const colors = [
                  'bg-zinc-300',
                  'bg-indigo-500',
                  'bg-emerald-500',
                  'bg-pink-500'
                ];
                const textColors = [
                  'text-zinc-300 bg-white/10',
                  'text-indigo-400 bg-indigo-400/10',
                  'text-emerald-400 bg-emerald-400/10',
                  'text-pink-400 bg-pink-400/10'
                ];
                const colorClass = colors[idx % colors.length];
                const bgTextClass = textColors[idx % textColors.length];

                return (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-neutral-300">{item.name}</span>
                      <span className={`text-[9px] font-sans px-2 py-0.5 rounded font-semibold uppercase ${bgTextClass}`}>{percent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-900 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${colorClass} transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="block text-[9px] font-sans text-neutral-500 uppercase">{item.count} fotos cadastradas</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent uploads */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-display italic text-2xl text-white font-medium">Últimos uploads realizados</h3>
          <span className="text-xs font-sans text-neutral-500 uppercase">Total: {photosCount} fotos</span>
        </div>
        
        <div className="chrome-hairline-top border border-white/5 bg-neutral-950/20 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-neutral-950/40">
                <th className="p-4 text-[10px] font-sans uppercase text-neutral-500 tracking-wider w-16">Foto</th>
                <th className="p-4 text-[10px] font-sans uppercase text-neutral-500 tracking-wider">Título</th>
                <th className="p-4 text-[10px] font-sans uppercase text-neutral-500 tracking-wider">Álbum Associado</th>
                <th className="p-4 text-[10px] font-sans uppercase text-neutral-500 tracking-wider w-36">Data de Envio</th>
                <th className="p-4 text-[10px] font-sans uppercase text-neutral-500 tracking-wider w-24 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {recentPhotos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-500 font-sans text-xs">
                    Nenhuma foto enviada ainda. Use a aba "Fotos" para carregar novas imagens.
                  </td>
                </tr>
              ) : (
                recentPhotos.map((photo: any) => (
                  <tr key={photo.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors group">
                    <td className="p-4">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 group-hover:border-white/40 transition-colors">
                        <img 
                          src={photo.thumbnail_url} 
                          alt={photo.title || ''} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-neutral-200">
                      {photo.title || '(sem título)'}
                    </td>
                    <td className="p-4 text-neutral-400">
                      {photo.album_title}
                    </td>
                    <td className="p-4 text-neutral-500 font-sans text-xs">
                      {new Date(photo.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setPreviewPhoto(photo)}
                        className="text-xs font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      >
                        Visualizar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mini Lightbox modal for dashboard photo preview */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-50 flex flex-col items-start pt-12 md:pt-24 overflow-y-auto justify-start bg-black/90 backdrop-blur-sm animate-fade-in p-6"
          onClick={() => setPreviewPhoto(null)}
        >
          <div 
            className="relative max-w-lg w-full bg-neutral-900 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-scale-up mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/5 bg-black">
              <img 
                src={previewPhoto.image_url} 
                alt={previewPhoto.title || ''} 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">{previewPhoto.title || 'Sem título'}</p>
              <p className="text-[10px] font-sans text-neutral-500 uppercase">Tamanho: {formatStorageAmount(previewPhoto.file_size_bytes || 0)} • Envia em {new Date(previewPhoto.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
            <button 
              onClick={() => setPreviewPhoto(null)}
              className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-sans uppercase font-semibold text-white border border-white/10 transition-colors"
            >
              Fechar Pré-visualização
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
