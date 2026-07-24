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
    <div className="space-y-8 animate-fade-in text-neutral-200" style={{
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
      {/* Welcome — open editorial header instead of a boxed card. A stacked
          pile of bordered panels reads as a template; a page with one clear
          point of entry reads as a product. */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-7 border-b border-white/5 relative">
        <div className="pointer-events-none absolute -top-16 -left-16 w-72 h-72 rounded-full bg-[var(--app-accent)]/[0.05] blur-[110px] -z-10" />
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)] shadow-[0_0_6px_rgba(var(--app-accent-rgb),0.6)]" />
            <span className="text-[10px] font-sans uppercase text-neutral-500 font-semibold tracking-[0.2em]">Ambiente de Gestão Autoral</span>
          </div>
          <h2 className="leading-[0.98]">
            <span className="block text-3xl sm:text-4xl font-sans font-extrabold text-white tracking-tighter">Bem-vindo de volta,</span>
            <span className="block text-3xl sm:text-4xl font-display italic font-light bg-[image:var(--app-accent-gradient)] bg-clip-text text-transparent">{photographerName}.</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-light max-w-xl leading-relaxed">
            Todas as fotos, depoimentos e álbuns publicados aqui refletem instantaneamente no seu site público.
          </p>
        </div>

        {slug && (
          <button 
            onClick={() => window.open(`/p/${slug}`, '_blank')}
            className="app-btn-accent flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-semibold transition-all duration-200 active:scale-95 hover:-translate-y-0.5 shadow-[0_8px_24px_-8px_rgba(var(--app-accent-rgb),0.5)] group shrink-0 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Ver Meu Site</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        )}
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
                  ? `Novos uploads bloqueados. Seus dados serão excluídos permanentemente em ${planLimits.daysUntilDeletion} ${planLimits.daysUntilDeletion === 1 ? 'dia' : 'dias'} caso não assine.`
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

      {/* Overview — one asymmetric bento instead of two separate rows of
          near-duplicate boxes (a "Fotos" stat card AND a "Fotos" action
          card said almost the same thing twice). Each tile now carries
          both the number and the action it leads to, so the eye has fewer,
          denser, more meaningful stops instead of eight look-alike panels. */}
      <div className="space-y-3">
        <h3 className="font-display italic text-lg text-white/90 font-medium">Visão Geral</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Fotos — hero tile, spans two columns */}
          <button
            onClick={() => onTabChange?.('fotos')}
            className="sm:col-span-2 lg:col-span-2 chrome-hairline-top chrome-card-hover text-left p-6 rounded-3xl border border-white/10 bg-white/[0.02] hover:border-[var(--app-accent)]/30 hover:bg-white/[0.03] transition-all duration-300 group relative overflow-hidden cursor-pointer flex flex-col justify-between min-h-[176px]"
          >
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-2xl bg-[var(--app-accent)]/10 flex items-center justify-center text-[var(--app-accent)] group-hover:scale-105 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-neutral-600 group-hover:text-[var(--app-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <div>
              <p className="font-display italic text-5xl text-white font-semibold leading-none mb-2">{photosCount}</p>
              <p className="text-xs font-sans uppercase tracking-wider text-neutral-500 group-hover:text-neutral-300 transition-colors">Fotos no acervo</p>
              <p className="text-[11px] text-neutral-600 group-hover:text-neutral-400 transition-colors mt-2">Carregar novas imagens →</p>
            </div>
          </button>

          {/* Álbuns */}
          <button
            onClick={() => onTabChange?.('albuns')}
            className="chrome-hairline-top chrome-card-hover text-left p-6 rounded-3xl border border-white/10 bg-white/[0.02] hover:border-[var(--app-accent)]/30 hover:bg-white/[0.03] transition-all duration-300 group relative overflow-hidden cursor-pointer flex flex-col justify-between min-h-[176px]"
          >
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-2xl bg-[var(--app-accent)]/10 flex items-center justify-center text-[var(--app-accent)] group-hover:scale-105 transition-transform">
                <FolderHeart className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-neutral-600 group-hover:text-[var(--app-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <div>
              <p className="font-display italic text-4xl text-white font-semibold leading-none mb-2">{publishedAlbumsCount}</p>
              <p className="text-xs font-sans uppercase tracking-wider text-neutral-500 group-hover:text-neutral-300 transition-colors">de {albums.length} álbuns publicados</p>
            </div>
          </button>

          {/* Categorias */}
          <button
            onClick={() => onTabChange?.('categorias')}
            className="chrome-hairline-top chrome-card-hover text-left p-6 rounded-3xl border border-white/10 bg-white/[0.02] hover:border-[var(--app-accent)]/30 hover:bg-white/[0.03] transition-all duration-300 group relative overflow-hidden cursor-pointer flex flex-col justify-between min-h-[176px]"
          >
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-2xl bg-[var(--app-accent)]/10 flex items-center justify-center text-[var(--app-accent)] group-hover:scale-105 transition-transform">
                <Tags className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-neutral-600 group-hover:text-[var(--app-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <div>
              <p className="font-display italic text-4xl text-white font-semibold leading-none mb-2">{categoriesServed}</p>
              <p className="text-xs font-sans uppercase tracking-wider text-neutral-500 group-hover:text-[var(--app-accent)] transition-colors whitespace-nowrap">nichos ativos</p>
            </div>
          </button>

          {/* Armazenamento — informational, not a nav shortcut, so it's a div not a button */}
          <div className="sm:col-span-2 lg:col-span-2 chrome-hairline-top p-6 rounded-3xl border border-white/10 bg-white/[0.02] flex flex-col justify-between min-h-[176px]">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-300">
                <HardDrive className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-sans uppercase text-neutral-500 tracking-wider">{planLimits.isTrial ? 'Plano Teste' : 'Plano Pro'}</span>
            </div>
            <div>
              <p className="font-display italic text-3xl text-white font-semibold mb-3">
                {formatStorageAmount(storageUsedBytes)} <span className="text-sm text-neutral-500 font-sans not-italic">/ {planLimits.storageLimitGB} GB</span>
              </p>
              <div className="w-full h-1.5 rounded-full bg-neutral-900 overflow-hidden mb-1.5">
                <div 
                  className={`h-full transition-all duration-300 ${percentUsed >= 90 ? 'bg-red-500/80' : percentUsed >= 75 ? 'bg-zinc-400' : 'bg-white'}`}
                  style={{ width: `${percentUsed <= 0 ? 0 : Math.max(1.5, Math.min(100, percentUsed))}%` }}
                />
              </div>
              <p className="text-[10px] text-neutral-500">{Math.max(0, Math.round(100 - percentUsed))}% de espaço livre</p>
            </div>
          </div>

          {/* Perfil */}
          <button
            onClick={() => onTabChange?.('perfil')}
            className="sm:col-span-2 lg:col-span-2 chrome-hairline-top chrome-card-hover text-left p-6 rounded-3xl border border-white/10 bg-white/[0.02] hover:border-[var(--app-accent)]/30 hover:bg-white/[0.03] transition-all duration-300 group relative overflow-hidden cursor-pointer flex items-center justify-between gap-4 min-h-[176px]"
          >
            <div>
              <div className="w-11 h-11 rounded-2xl bg-[var(--app-accent)]/10 flex items-center justify-center text-[var(--app-accent)] group-hover:scale-105 transition-transform mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">Editar Minha Bio</p>
              <p className="text-[11px] text-neutral-500 group-hover:text-neutral-400 transition-colors">Equipamentos, especialidades e história pessoal</p>
            </div>
            <ArrowUpRight className="w-5 h-5 text-neutral-600 group-hover:text-[var(--app-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
          </button>
        </div>
      </div>

      {/* Analytics Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dynamic Photo upload analytics SVG line area chart */}
        <div className="chrome-hairline-top p-6 rounded-3xl border border-white/5 bg-neutral-950/40 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-zinc-300" />
                <h4 className="font-display italic text-lg text-white">Histórico de Obras Criadas</h4>
              </div>
              <p className="text-[11px] text-neutral-500 font-sans">
                <span className="text-white font-semibold">{chartData.reduce((s, d) => s + d.count, 0)}</span> fotos adicionadas nos últimos 6 meses
              </p>
            </div>
            <span className="text-[9px] font-sans font-semibold uppercase bg-white/10 text-zinc-300 px-2 py-0.5 rounded shrink-0">6 meses</span>
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
              <Activity className="w-4 h-4 text-zinc-300" />
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
                  'bg-white',
                  'bg-[var(--app-accent)]',
                  'bg-zinc-400',
                  'bg-zinc-600'
                ];
                const textColors = [
                  'text-white bg-white/10',
                  'text-[var(--app-accent)] bg-[var(--app-accent)]/10',
                  'text-zinc-400 bg-zinc-400/10',
                  'text-zinc-500 bg-zinc-500/10'
                ];
                const colorClass = colors[idx % colors.length];
                const bgTextClass = textColors[idx % textColors.length];

                return (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-2 font-semibold text-neutral-300">
                        <span className="text-[9px] font-sans text-neutral-600 tabular-nums">{String(idx + 1).padStart(2, '0')}</span>
                        {item.name}
                      </span>
                      <span className={`text-[9px] font-sans px-2 py-0.5 rounded font-semibold uppercase ${bgTextClass}`}>{percent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-900 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${colorClass} transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="block text-[9px] font-sans text-neutral-500 uppercase pl-[19px]">{item.count} fotos cadastradas</span>
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
        
        <div className="chrome-hairline-top border border-white/5 bg-neutral-950/20 rounded-2xl overflow-hidden shadow-sm divide-y divide-white/5">
          {recentPhotos.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 font-sans text-xs">
              Nenhuma foto enviada ainda. Use a aba "Fotos" para carregar novas imagens.
            </div>
          ) : (
            recentPhotos.map((photo: any, idx) => (
              <button
                key={photo.id}
                onClick={() => setPreviewPhoto(photo)}
                className="w-full flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 hover:bg-white/[0.02] transition-colors group text-left cursor-pointer"
              >
                <span className="hidden sm:block text-[9px] font-sans text-neutral-600 tabular-nums w-4 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden border border-white/10 group-hover:border-white/40 transition-colors shrink-0">
                  <img 
                    src={photo.thumbnail_url} 
                    alt={photo.title || ''} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-200 truncate">{photo.title || '(sem título)'}</p>
                  <p className="text-xs text-neutral-500 truncate">
                    {photo.album_title} <span className="text-neutral-700 mx-1">•</span> {new Date(photo.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className="hidden sm:inline text-xs font-medium text-neutral-500 group-hover:text-white transition-colors shrink-0">Visualizar</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-[var(--app-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </button>
            ))
          )}
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
