/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Photographer, SiteSettings, Category, Album, Photo, Testimonial } from '../types';
import { getBrandColorStyles, PUB_VARS } from '../lib/brand-color';
import Lightbox from './Lightbox';
import { 
  Sun, Moon, MessageSquare, Instagram, Mail, Phone, MapPin, 
  ChevronLeft, ChevronRight, CornerDownRight, ArrowUpRight,
  ArrowUp, Sparkles, Star, Quote, Send, ArrowRight, Check, Heart,
  Search, X, FolderHeart, Tags
} from 'lucide-react';

interface PublicPortfolioProps {
  slug: string;
  onNavigateHome: () => void;
}

export default function PublicPortfolio({ slug, onNavigateHome }: PublicPortfolioProps) {
  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Active theme: 'dark' by default
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  // Lightbox control
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<{ image_url: string; title?: string }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Gallery overlay control
  const [galleryOverlayOpen, setGalleryOverlayOpen] = useState(false);

  // Photo gallery full overlay control
  const [photoGalleryOverlayOpen, setPhotoGalleryOverlayOpen] = useState(false);

  // Album overlay control
  const [selectedAlbumForOverlay, setSelectedAlbumForOverlay] = useState<Album | null>(null);
  const [albumPhotosForOverlay, setAlbumPhotosForOverlay] = useState<Photo[]>([]);
  const [albumPhotosLoading, setAlbumPhotosLoading] = useState(false);

  // Portfolio pagination page index
  const [portfolioPage, setPortfolioPage] = useState(0);
  const [fadeActive, setFadeActive] = useState(false);

  // Filter and display pagination states for Photos grid
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [visiblePhotosCount, setVisiblePhotosCount] = useState(8);

  // Testimonials active quote index
  const [activeTestimonialIdx, setActiveTestimonialIdx] = useState(0);

  // Contact form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [contactStatus, setContactStatus] = useState({ text: '', isError: false, submitting: false });

  // Specialities carousel page control
  const [carouselPage, setCarouselPage] = useState(0);

  // "O Que Eu Capturo" — keeps the specialty grid compact (max 3) for photographers
  // with few categories, with a small dot-to-pill control to reveal the rest.
  const [showAllCategories, setShowAllCategories] = useState(false);

  const [showBackToTop, setShowBackToTop] = useState(false);

  // Header search — filters categories & albums already loaded on the page
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch all database records for this photographer slug
  useEffect(() => {
    async function loadPortfolio() {
      setLoading(true);
      setErrorMsg('');
      try {
        // 1. Fetch photographer
        const { data: pData, error: pError } = await supabase
          .from('photographers')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (pError || !pData) {
          setErrorMsg('Não encontramos esse portfólio autoral.');
          setLoading(false);
          return;
        }
        setPhotographer(pData);

        // 2. Fetch parallel data
        const [settingsRes, categoriesRes, testimonialsRes, photosRes, albumsRes] = await Promise.all([
          supabase.from('site_settings').select('*').eq('photographer_id', pData.id).maybeSingle(),
          supabase.from('categories').select('*').eq('photographer_id', pData.id).order('sort_order', { ascending: true }),
          supabase.from('testimonials').select('*').eq('photographer_id', pData.id).eq('is_published', true).order('created_at', { ascending: false }),
          supabase.from('photos').select('*, categories(name)').eq('photographer_id', pData.id).eq('is_published', true).is('deleted_at', null).order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
          supabase.from('albums').select('*, categories(name)').eq('photographer_id', pData.id).eq('is_published', true).order('sort_order', { ascending: true })
        ]);

        if (settingsRes.data) setSettings(settingsRes.data);
        if (categoriesRes.data) setCategories(categoriesRes.data);
        if (testimonialsRes.data) setTestimonials(testimonialsRes.data);

        // Filter photos to only those that exist inside dynamic published albums
        const publishedAlbumIds = (albumsRes.data || []).map(a => a.id);
        const rawPhotos = photosRes.data || [];
        const photosInAlbums = rawPhotos.filter(p => p.album_id && publishedAlbumIds.includes(p.album_id));
        setPhotos(photosInAlbums);

        // Enrich albums with covers and total photo count
        const albumsRaw = albumsRes.data || [];
        if (albumsRaw.length > 0) {
          const albumIds = albumsRaw.map(a => a.id);
          const { data: aPhotos } = await supabase
            .from('photos')
            .select('id, album_id, thumbnail_url')
            .in('album_id', albumIds)
            .is('deleted_at', null);

          const byAlbum: Record<string, { id: string; thumbnail_url: string }[]> = {};
          if (aPhotos) {
            aPhotos.forEach(p => {
              (byAlbum[p.album_id] ||= []).push(p);
            });
          }

          const enriched = albumsRaw.map(album => {
            const albumPhotos = byAlbum[album.id] || [];
            const cover = albumPhotos.find(p => p.id === album.cover_photo_id) || albumPhotos[0] || null;
            return {
              ...album,
              photo_count: albumPhotos.length,
              cover_url: cover?.thumbnail_url || undefined
            } as Album;
          });
          setAlbums(enriched);
        } else {
          setAlbums([]);
        }

      } catch (err) {
        console.error('Error loading portfolio:', err);
        setErrorMsg('Erro de conexão com o banco de dados.');
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadPortfolio();
    }
  }, [slug]);

  // Handle light/dark mode styling updates on document body
  useEffect(() => {
    localStorage.setItem('theme', theme);
    const bodyClass = document.body.classList;
    if (theme === 'light') {
      bodyClass.add('light-mode');
    } else {
      bodyClass.remove('light-mode');
    }
    return () => {
      bodyClass.remove('light-mode');
    };
  }, [theme]);

  // Open Lightbox with specified items and index
  const openPhotoLightbox = (items: { image_url: string; title?: string }[], idx: number) => {
    setLightboxPhotos(items);
    setLightboxIndex(idx);
    setLightboxOpen(true);
  };

  // Open the album overlay with its photos in a beautiful grid
  const openAlbumOverlay = async (album: Album) => {
    setSelectedAlbumForOverlay(album);
    setAlbumPhotosLoading(true);
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*, categories(name)')
        .eq('album_id', album.id)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching album photos:', error);
        setAlbumPhotosForOverlay([]);
      } else {
        setAlbumPhotosForOverlay(data || []);
      }
    } catch (err) {
      console.error('Error fetching album photos:', err);
      setAlbumPhotosForOverlay([]);
    } finally {
      setAlbumPhotosLoading(false);
    }
  };

  // Handle contact form submissions
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photographer) return;
    
    setContactStatus({ text: '', isError: false, submitting: true });
    try {
      const { error } = await supabase
        .from('contacts')
        .insert({
          photographer_id: photographer.id,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          message: message.trim()
        });

      if (error) {
        setContactStatus({ text: 'Não foi possível enviar a mensagem. Tente novamente.', isError: true, submitting: false });
        return;
      }

      setContactStatus({ text: 'Mensagem enviada com sucesso! Retornaremos em breve.', isError: false, submitting: false });
      setName('');
      setPhone('');
      setEmail('');
      setMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setContactStatus({ text: 'Erro ao processar envio.', isError: true, submitting: false });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070708] flex flex-col items-center justify-center text-neutral-400 font-sans">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--pub-border)] border-t-[var(--pub-accent,#CBD5E1)] animate-spin mb-4" />
        <p className="text-xs font-sans tracking-widest uppercase text-zinc-400">Carregando portfólio autoral...</p>
      </div>
    );
  }

  if (errorMsg || !photographer) {
    return (
      <div className="min-h-screen bg-[#070708] flex flex-col items-center justify-center text-center p-6 font-sans">
        <p className="font-sans text-zinc-400 text-xs tracking-widest uppercase mb-4 font-semibold">404 — NÃO ENCONTRADO</p>
        <h1 className="font-display italic text-3xl md:text-4xl text-white max-w-md mb-8">{errorMsg || 'Portfólio indisponível.'}</h1>
        <button 
          onClick={onNavigateHome}
          className="app-btn-accent px-6 py-3 rounded-xl text-xs font-semibold tracking-wider transition-all duration-200 cursor-pointer"
        >
          Voltar para Home
        </button>
      </div>
    );
  }

  // Brand Color customization stylesheet variables calculation
  const brandStyles = getBrandColorStyles(settings?.primary_color, PUB_VARS);

  // Social Links
  const whatsappDigits = settings?.whatsapp_number ? settings.whatsapp_number.replace(/\D/g, '') : '';
  const whatsappHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent('Olá! Vi seu portfólio FocusPortfolio e gostaria de solicitar um orçamento.')}`
    : null;
  const instagramHref = settings?.instagram_handle
    ? `https://instagram.com/${settings.instagram_handle}`
    : null;

  // Bio values

  // Pagination for Editorial Portfolio (Albums block of 3)
  const portfolioPages: Album[][] = [];
  for (let i = 0; i < albums.length; i += 3) {
    portfolioPages.push(albums.slice(i, i + 3));
  }

  const activePortfolioPage = portfolioPages[portfolioPage] || [];
  const featuredAlbum = activePortfolioPage[0] || null;
  const sideAlbums = activePortfolioPage.slice(1);

  const handlePortfolioPageChange = (direction: number) => {
    setFadeActive(true);
    setTimeout(() => {
      setPortfolioPage((prev) => (prev + direction + portfolioPages.length) % portfolioPages.length);
      setFadeActive(false);
    }, 260);
  };

  // Specialties paging calculations
  const totalCategories = categories.length;
  const carouselPageCount = totalCategories > 0 ? Math.ceil(totalCategories / 3) : 1;

  // Real-time photo gallery filtering & pagination
  const filteredPhotos = selectedCategory
    ? photos.filter(p => p.category_id === selectedCategory)
    : photos;

  const currentGridPhotos = filteredPhotos.slice(0, visiblePhotosCount);

  const handleCategoryChange = (catId: string | null) => {
    setSelectedCategory(catId);
    setVisiblePhotosCount(8);
  };

  const handleLoadMorePhotos = () => {
    setVisiblePhotosCount((prev) => prev + 8);
  };

  // Testimonials Navigation
  const handleNextTestimonial = () => {
    setActiveTestimonialIdx((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrevTestimonial = () => {
    setActiveTestimonialIdx((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  // Live client-side search across the categories & albums already loaded
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchedCategories = normalizedQuery
    ? categories.filter(c => c.name.toLowerCase().includes(normalizedQuery))
    : [];
  const searchedAlbums = normalizedQuery
    ? albums.filter(a => a.is_published && a.title.toLowerCase().includes(normalizedQuery))
    : [];
  const hasSearchResults = searchedCategories.length > 0 || searchedAlbums.length > 0;

  const handleSearchSelectCategory = () => {
    setSearchOpen(false);
    setSearchQuery('');
    document.getElementById('o-que-eu-capturo')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSearchSelectAlbum = (album: Album) => {
    setSearchOpen(false);
    setSearchQuery('');
    openAlbumOverlay(album);
  };

  return (
    <div 
      className={`pub-body min-h-screen bg-[var(--pub-bg,#070708)] text-[var(--pub-ink,#F3F4F6)] font-sans transition-colors duration-300`}
      style={brandStyles}
    >
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 border-b border-[var(--pub-border)] bg-[var(--pub-glass-bg)] backdrop-blur-xl z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onNavigateHome}
              className="p-2 -ml-2 rounded-full hover:bg-neutral-500/10 text-neutral-400 hover:text-white transition-all duration-200"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={photographer.name} className="h-8 max-w-[150px] object-contain" />
            ) : (
              <span className="font-display italic text-lg font-semibold tracking-tight text-white">{photographer.name}</span>
            )}
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <nav className="hidden lg:flex items-center gap-8 text-sm font-sans text-neutral-400">
              <a href="#o-que-eu-capturo" className="hover:text-[var(--pub-accent,#CBD5E1)] transition-colors duration-200">Especialidades</a>
              <a href="#portfolio" className="hover:text-[var(--pub-accent,#CBD5E1)] transition-colors duration-200">Portfólio</a>
              <a href="#fotografias" className="hover:text-[var(--pub-accent,#CBD5E1)] transition-colors duration-200">Acervo</a>
              <a href="#quem-tira-suas-fotos" className="hover:text-[var(--pub-accent,#CBD5E1)] transition-colors duration-200">Sobre</a>
              <a href="#contato" className="hover:text-[var(--pub-accent,#CBD5E1)] transition-colors duration-200">Contato</a>
            </nav>

            {/* Search — categories & albums */}
            <div className="relative">
              {searchOpen ? (
                <div className="flex items-center gap-2 bg-[var(--pub-surface)] border border-[var(--pub-border-strong)] rounded-full pl-4 pr-1.5 py-1.5 w-[13rem] sm:w-72 shadow-lg">
                  <Search className="w-3.5 h-3.5 text-[var(--pub-ink-muted)] shrink-0" />
                  <input 
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } }}
                    placeholder="Buscar categorias e álbuns..."
                    className="flex-1 min-w-0 bg-transparent text-sm text-[var(--pub-ink)] placeholder:text-[var(--pub-ink-muted)] outline-none"
                  />
                  <button
                    onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                    className="p-1.5 rounded-full hover:bg-neutral-500/10 text-[var(--pub-ink-muted)] shrink-0"
                    aria-label="Fechar busca"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {normalizedQuery && (
                    <div className="absolute top-full mt-2 right-0 w-full sm:w-80 max-h-96 overflow-y-auto rounded-2xl border border-[var(--pub-border-strong)] bg-[var(--pub-surface)] shadow-2xl z-50 animate-scale-up">
                      {!hasSearchResults ? (
                        <p className="text-xs text-[var(--pub-ink-muted)] font-sans text-center py-8 px-4">Nenhum resultado para "{searchQuery}".</p>
                      ) : (
                        <div className="py-2">
                          {searchedCategories.length > 0 && (
                            <div className="px-2 pb-1">
                              <span className="block px-3 py-1.5 text-[10px] uppercase tracking-wider text-[var(--pub-ink-muted)] font-semibold">Especialidades</span>
                              {searchedCategories.map(cat => (
                                <button
                                  key={cat.id}
                                  onClick={handleSearchSelectCategory}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[var(--pub-ink)] hover:bg-neutral-500/10 transition-colors text-left cursor-pointer"
                                >
                                  <Tags className="w-3.5 h-3.5 text-[var(--pub-accent,#CBD5E1)] shrink-0" />
                                  {cat.name}
                                </button>
                              ))}
                            </div>
                          )}
                          {searchedAlbums.length > 0 && (
                            <div className="px-2 pt-1 border-t border-[var(--pub-border)]">
                              <span className="block px-3 py-1.5 text-[10px] uppercase tracking-wider text-[var(--pub-ink-muted)] font-semibold">Álbuns</span>
                              {searchedAlbums.map(album => (
                                <button
                                  key={album.id}
                                  onClick={() => handleSearchSelectAlbum(album)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[var(--pub-ink)] hover:bg-neutral-500/10 transition-colors text-left cursor-pointer"
                                >
                                  <FolderHeart className="w-3.5 h-3.5 text-[var(--pub-accent,#CBD5E1)] shrink-0" />
                                  {album.title}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2.5 rounded-full border border-[var(--pub-border)] hover:bg-neutral-500/10 text-[var(--pub-ink)] hover:scale-105 active:scale-95 transition-all duration-200"
                  aria-label="Buscar categorias e álbuns"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dark/Light mode toggle */}
            <button 
              onClick={() => setTheme((prev) => prev === 'light' ? 'dark' : 'light')}
              className="p-2.5 rounded-full border border-[var(--pub-border)] hover:bg-neutral-500/10 text-[var(--pub-ink)] hover:scale-105 active:scale-95 transition-all duration-200"
              aria-label="Alternar tema"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 bg-[#070708]"
        id="hero"
      >
        {/* Static background — no parallax/scroll motion */}
        {settings?.hero_photo_url ? (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-40 md:opacity-50"
            style={{ 
              backgroundImage: `url('${settings.hero_photo_url}')`,
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-tr from-neutral-950 via-[#0E0F11] to-neutral-900 opacity-80" />
        )}
        
        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--pub-bg)]/50 to-[var(--pub-bg)] z-10" />

        {/* Hero Content */}
        <div className="relative z-20 max-w-4xl mx-auto px-6 text-center flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <span className="pub-badge-dot" />
            <Sparkles className="w-3.5 h-3.5 text-[var(--pub-accent,#CBD5E1)]" />
            <p className="font-sans text-xs tracking-wide text-[var(--pub-accent,#CBD5E1)] font-medium">Fotografia autoral de luxo</p>
          </div>
          <h1 className="font-display italic text-4xl md:text-7xl text-white font-normal tracking-tight leading-[1.05] mb-6 drop-shadow-lg">
            {photographer.name}
          </h1>
          {settings?.slogan && (
            <p className="text-neutral-300 md:text-lg font-light tracking-wide max-w-xl mb-12 leading-relaxed drop-shadow-md">
              {settings.slogan}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <a 
              href="#portfolio"
              className="pub-btn pub-btn-primary min-w-[180px]"
            >
              Ver portfólio
            </a>
            {whatsappHref && (
              <a 
                href={whatsappHref}
                target="_blank"
                rel="noopener"
                className="pub-btn pub-btn-outline min-w-[180px]"
              >
                Solicitar orçamento
              </a>
            )}
          </div>
        </div>

        {/* Signature horizon glow, tinted with the photographer's own accent color */}
        <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-40 pub-glow-arc z-10" />
      </section>

      {/* "O Que Eu Capturo" - Specialties */}
      {categories.length > 0 && (
        <section className="pub-section bg-[var(--pub-bg-elevated)]" id="o-que-eu-capturo">
          <div className="pub-container">
            <div className="text-center mb-16">
              <p className="pub-section__eyebrow">Especialidades</p>
              <h2 className="pub-section__title mb-0">O Que Eu Capturo</h2>
            </div>

            <div className="pt-4 pb-8">
              {/* Compact grid of specialties — capped at 3 so photographers with
                  fewer categories still get a balanced, non-empty layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {(showAllCategories ? categories : categories.slice(0, 3)).map((cat) => {
                  const coverUrl = cat.description?.includes('http') ? cat.description : undefined;
                  const displayDesc = cat.description?.startsWith('http') ? 'Especialidade de alta sensibilidade e técnica apurada.' : (cat.description || 'Breve especialidade do profissional.');
                  return (
                    <div 
                      key={cat.id}
                      className="relative rounded-3xl overflow-hidden aspect-[3/4] w-full bg-[#0B0C0E] border border-[var(--pub-border)] group shadow-xl transition-all duration-500 hover:border-[var(--pub-accent,#CBD5E1)]/40 hover:shadow-[0_20px_45px_-22px_rgba(var(--pub-accent-rgb,226,232,240),0.16)]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/95 z-10" />
                      {coverUrl ? (
                        <img src={coverUrl} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
                      )}

                      <div className="absolute inset-0 z-20 p-8 flex flex-col justify-end">
                        <span className="text-xs font-sans text-[var(--pub-accent,#CBD5E1)] mb-2 font-medium">Especialidade</span>
                        <h3 className="font-display italic text-2xl text-white mb-3 font-medium">{cat.name}</h3>
                        <p className="text-neutral-300 text-xs leading-relaxed line-clamp-3 mb-6 opacity-90">{displayDesc}</p>
                        
                        <a 
                          href="#portfolio"
                          className="inline-flex items-center gap-2 text-xs font-sans text-white hover:text-[var(--pub-accent,#CBD5E1)] transition-colors duration-200 group/link"
                        >
                          Ver trabalhos <CornerDownRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dot-to-pill control: only appears when there are more than 3
                  specialties, so smaller photographers never see an empty control */}
              {categories.length > 3 && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={() => setShowAllCategories(v => !v)}
                    aria-expanded={showAllCategories}
                    aria-label={showAllCategories ? 'Mostrar menos especialidades' : `Mostrar mais ${categories.length - 3} especialidades`}
                    className={`group flex items-center justify-center overflow-hidden rounded-full border border-[var(--pub-border)] bg-[var(--pub-surface)] text-[var(--pub-ink-muted)] hover:text-[var(--pub-ink)] hover:border-[var(--pub-accent,#CBD5E1)]/30 transition-all duration-300 ease-out cursor-pointer h-8 ${
                      showAllCategories ? 'px-4 w-auto' : 'w-8 hover:w-auto hover:px-4'
                    }`}
                  >
                    <span className={`shrink-0 rounded-full bg-[var(--pub-accent,#CBD5E1)] transition-all duration-300 w-1.5 h-1.5 ${showAllCategories ? 'mr-2' : 'group-hover:mr-2'}`} />
                    <span className={`whitespace-nowrap text-[10px] font-sans font-medium tracking-wide transition-opacity duration-200 ${
                      showAllCategories ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      {showAllCategories ? 'Mostrar menos' : `+${categories.length - 3} especialidades`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Portfolio section (Editorial) */}
      <section className="pub-section bg-[var(--pub-bg)]" id="portfolio">
        <div className="pub-container">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-12">
            <div>
              <p className="pub-section__eyebrow">Trabalhos em destaque</p>
              <h2 className="pub-section__title mb-0">Portfólio Editorial</h2>
            </div>

            {/* Album pages navigation arrows */}
            {portfolioPages.length > 1 && (
              <div className="flex items-center gap-2.5">
                <button 
                  onClick={() => handlePortfolioPageChange(-1)}
                  className="w-12 h-12 rounded-full border border-[var(--pub-border)] flex items-center justify-center text-[var(--pub-ink)] hover:text-[var(--pub-accent,#CBD5E1)] hover:border-[var(--pub-accent,#CBD5E1)] transition-all duration-200 hover:scale-105 active:scale-95"
                  aria-label="Anteriores"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handlePortfolioPageChange(1)}
                  className="w-12 h-12 rounded-full border border-[var(--pub-border)] flex items-center justify-center text-[var(--pub-ink)] hover:text-[var(--pub-accent,#CBD5E1)] hover:border-[var(--pub-accent,#CBD5E1)] transition-all duration-200 hover:scale-105 active:scale-95"
                  aria-label="Próximos"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {albums.length === 0 ? (
            <p className="text-neutral-500 text-xs font-sans py-16 text-center border border-dashed border-[var(--pub-border)] rounded-2xl">
              Nenhum álbum publicado ainda.
            </p>
          ) : (
            <div className={`transition-opacity duration-300 ${fadeActive ? 'opacity-0' : 'opacity-100'}`}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                {/* 1 Large Featured Album Card */}
                {featuredAlbum && (
                  <button 
                    onClick={() => openAlbumOverlay(featuredAlbum)}
                    className="relative rounded-3xl overflow-hidden aspect-[4/3] lg:col-span-2 bg-[#0B0C0E] border border-[var(--pub-border)] text-left group shadow-lg shrink-0 transition-all duration-500 hover:border-[var(--pub-accent,#CBD5E1)]/40 hover:shadow-[0_20px_45px_-22px_rgba(var(--pub-accent-rgb,226,232,240),0.16)] cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent z-10" />
                    {featuredAlbum.cover_url ? (
                      <img src={featuredAlbum.cover_url} alt={featuredAlbum.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
                    )}

                    <div className="absolute inset-0 z-20 p-8 flex flex-col justify-end">
                      {featuredAlbum.categories?.name && (
                        <span className="text-xs font-sans text-[var(--pub-accent,#CBD5E1)] mb-2 font-medium">
                          {featuredAlbum.categories.name}
                        </span>
                      )}
                      <h3 className="font-display italic text-3xl md:text-5xl text-white mb-2 leading-tight font-medium">{featuredAlbum.title}</h3>
                      <p className="text-neutral-400 text-xs line-clamp-2 max-w-xl mb-6 leading-relaxed font-light">
                        {featuredAlbum.description || 'Trabalho autoral registrado no portfólio.'}
                      </p>
                      <div className="flex items-center gap-2 text-xs font-sans text-white/70">
                        <span>{featuredAlbum.photo_count || 0} fotos</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                        <span className="group-hover:text-zinc-300 transition-colors">Visualizar álbum ↗</span>
                      </div>
                    </div>
                  </button>
                )}

                {/* 2 Small Side Albums column */}
                <div className="flex flex-col gap-8 justify-between">
                  {sideAlbums.length === 0 ? (
                    <div className="flex-1 rounded-3xl border border-dashed border-[var(--pub-border)] flex items-center justify-center p-8 bg-neutral-950/20 text-neutral-500 font-sans text-xs">
                      Próximos álbuns em breve
                    </div>
                  ) : (
                    sideAlbums.map((album) => (
                      <button 
                        key={album.id}
                        onClick={() => openAlbumOverlay(album)}
                        className="relative rounded-3xl overflow-hidden flex-1 aspect-[4/3] lg:aspect-auto bg-[#0B0C0E] border border-[var(--pub-border)] text-left group shadow-lg min-h-[195px] transition-all duration-500 hover:border-[var(--pub-accent,#CBD5E1)]/40 hover:shadow-[0_20px_45px_-22px_rgba(var(--pub-accent-rgb,226,232,240),0.16)] cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent z-10" />
                        {album.cover_url ? (
                          <img src={album.cover_url} alt={album.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
                        )}

                        <div className="absolute inset-0 z-20 p-6 flex flex-col justify-end">
                          {album.categories?.name && (
                            <span className="text-xs font-sans text-[var(--pub-accent,#CBD5E1)] mb-1 font-medium">
                              {album.categories.name}
                            </span>
                          )}
                          <h3 className="font-display italic text-2xl text-white mb-2 font-medium">{album.title}</h3>
                          <span className="text-xs font-sans text-white/50">
                            {album.photo_count || 0} fotos
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Show full portfolio trigger button */}
              {albums.length > 3 && (
                <div className="text-center mt-12">
                  <button 
                    onClick={() => setGalleryOverlayOpen(true)}
                    className="pub-btn pub-btn-outline"
                  >
                    Ver portfólio completo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Fotografias (Acervo de Obras com Real-time Category Filtering e Pagination) */}
      <section className="pub-section bg-[var(--pub-bg-elevated)]" id="fotografias">
        <div className="pub-container">
          <div className="text-center mb-10">
            <p className="pub-section__eyebrow">Acervo de imagens</p>
            <h2 className="pub-section__title mb-4">Galeria de Obras</h2>
            <p className="text-sm font-light text-neutral-400 max-w-lg mx-auto">
              Navegue pelas capturas autorais categorizadas e explore narrativas singulares capturadas sob diferentes lentes.
            </p>
          </div>

          {photos.length === 0 ? (
            <p className="text-neutral-500 text-xs font-sans py-16 text-center border border-dashed border-[var(--pub-border)] rounded-2xl">
              Nenhuma fotografia avulsa cadastrada no acervo.
            </p>
          ) : (
            <div>
              {/* Premium Category Filter Bar */}
              <div className="flex flex-wrap justify-center items-center gap-2 mb-12 max-w-3xl mx-auto">
                <button
                  onClick={() => handleCategoryChange(null)}
                  className={`px-4 py-2 rounded-full text-xs font-sans transition-all duration-300 ${
                    selectedCategory === null
                      ? 'bg-[var(--pub-accent,#CBD5E1)] text-[var(--pub-accent-ink,#0F172A)] font-medium shadow-md scale-105'
                      : 'bg-neutral-500/5 border border-[var(--pub-border)] text-neutral-400 hover:text-white hover:bg-neutral-500/10'
                  }`}
                >
                  Todas ({photos.length})
                </button>
                {categories.map((cat) => {
                  const count = photos.filter(p => p.category_id === cat.id).length;
                  if (count === 0) return null; // hide empty categories
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryChange(cat.id)}
                      className={`px-4 py-2 rounded-full text-xs font-sans transition-all duration-300 ${
                        selectedCategory === cat.id
                          ? 'bg-[var(--pub-accent,#CBD5E1)] text-[var(--pub-accent-ink,#0F172A)] font-medium shadow-md scale-105'
                          : 'bg-neutral-500/5 border border-[var(--pub-border)] text-neutral-400 hover:text-white hover:bg-neutral-500/10'
                      }`}
                    >
                      {cat.name} ({count})
                    </button>
                  );
                })}
              </div>

              {/* 4-column Photos grid with fade out effect on the bottom row */}
              <div className="relative">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-20">
                  {currentGridPhotos.map((photo, idx) => {
                    const isSecondRow = idx >= 4;
                    return (
                      <button 
                        key={photo.id}
                        onClick={() => openPhotoLightbox(filteredPhotos, idx)}
                        className={`relative rounded-3xl overflow-hidden aspect-[3/4] bg-[#0B0C0E] border border-[var(--pub-border)] group shadow-lg transition-all duration-500 hover:border-[var(--pub-accent,#CBD5E1)]/40 hover:shadow-[0_20px_45px_-22px_rgba(var(--pub-accent-rgb,226,232,240),0.16)] hover:-translate-y-1 cursor-pointer ${
                          isSecondRow ? 'opacity-35 hover:opacity-100' : ''
                        }`}
                      >
                        <div className="absolute inset-0 bg-black/10 hover:bg-black/0 transition-colors duration-300 z-10" />
                        <img 
                          src={photo.thumbnail_url} 
                          alt={photo.title || ''} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                        
                        {/* Hover text overlay */}
                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-left flex flex-col justify-end">
                          <p className="text-white text-sm font-medium font-display italic mb-1">{photo.title || 'Sem título'}</p>
                          {photo.categories?.name && (
                            <p className="text-xs font-sans text-[var(--pub-accent,#CBD5E1)]">{photo.categories.name}</p>
                          )}
                        </div>

                        {/* Quick zoom lens icon on top-right */}
                        <div className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 border border-white/10 text-white">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Fade-out vertical overlay at the bottom of the grid */}
                <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[var(--pub-bg-elevated)] via-[var(--pub-bg-elevated)]/90 via-[var(--pub-bg-elevated)]/40 to-transparent pointer-events-none z-10" />
              </div>

              {/* View Full Gallery trigger */}
              {filteredPhotos.length > visiblePhotosCount && (
                <div className="flex flex-col items-center justify-center mt-6 gap-3 relative z-20">
                  <p className="text-xs font-sans text-neutral-400">
                    Exibindo {currentGridPhotos.length} de {filteredPhotos.length} fotografias
                  </p>
                  <button 
                    onClick={() => setPhotoGalleryOverlayOpen(true)}
                    className="pub-btn pub-btn-outline"
                  >
                    Ver galeria completa
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      {photographer.bio && (
        <section className="pub-section bg-[var(--pub-bg)]" id="quem-tira-suas-fotos">
          <div className="pub-container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              {/* Profile Image Column */}
              <div className="flex justify-center lg:justify-start">
                <div className="relative w-full max-w-[380px]">
                  <div className="pointer-events-none absolute -inset-6 pub-portrait-glow" />
                  <div className="relative aspect-[3/4] rounded-3xl border border-[var(--pub-border)] shadow-2xl bg-[#0B0C0E] overflow-hidden">
                    <img 
                      src={settings?.avatar_url || settings?.logo_url || 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=800'} 
                      alt={photographer.name}
                      className="w-full h-full object-cover"
                    />
                    {photographer.experience_years && (
                      <div className="absolute left-4 bottom-4 bg-[var(--pub-accent,#CBD5E1)] text-[var(--pub-accent-ink,#0F172A)] rounded-2xl p-5 shadow-2xl flex items-center gap-3 z-20 border border-white/10">
                        <span className="font-display text-4xl font-extrabold tracking-tight">{photographer.experience_years}+</span>
                        <span className="font-sans text-[10px] tracking-wider font-semibold leading-tight">Anos de<br />atuação profissional</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio Details Column */}
              <div className="max-w-xl">
                <p className="pub-section__eyebrow">A alma por trás da lente</p>
                <h2 className="pub-section__title mb-6">Fotografia Autoral & Arte</h2>
                
                {photographer.specialties && photographer.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {photographer.specialties.map((spec, idx) => (
                      <span 
                        key={idx}
                        className="text-xs font-sans border border-[var(--pub-border-strong)] px-3.5 py-1.5 rounded-full text-neutral-300 bg-neutral-500/5"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-neutral-300 font-light leading-relaxed mb-8 text-sm md:text-base whitespace-pre-line">
                  {photographer.bio}
                </p>

                {photographer.equipment && (
                  <div className="p-5 rounded-2xl border border-[var(--pub-border)] bg-neutral-500/[0.02] text-xs font-sans text-neutral-400 leading-relaxed mb-8">
                    <strong className="text-neutral-200 block mb-2 tracking-wide text-xs">Equipamento adotado:</strong> {photographer.equipment}
                  </div>
                )}

                <p className="font-display italic text-4xl text-[var(--pub-accent,#CBD5E1)] tracking-tight">
                  {photographer.name}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials (Interactive Sliding Section) */}
      {testimonials.length > 0 && (
        <section className="pub-section bg-[var(--pub-bg-elevated)]" id="depoimentos">
          <div className="pub-container max-w-4xl">
            <div className="text-center mb-12">
              <p className="pub-section__eyebrow">Reconhecimento</p>
              <h2 className="pub-section__title mb-0">Depoimentos dos Clientes</h2>
            </div>

            <div className="relative p-8 md:p-14 rounded-3xl border border-[var(--pub-border)] bg-[var(--pub-bg)] text-center shadow-xl overflow-hidden glass-card">
              <Quote className="w-12 h-12 text-[var(--pub-accent,#CBD5E1)]/25 mx-auto mb-6" />
              
              {/* Quote slider */}
              <div className="min-h-[140px] flex flex-col justify-center">
                <p className="font-display italic text-lg md:text-2xl leading-relaxed text-white/90 mb-8 font-light">
                  "{testimonials[activeTestimonialIdx].content}"
                </p>
                
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  {Array.from({ length: testimonials[activeTestimonialIdx].rating || 5 }).map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-[var(--pub-accent,#CBD5E1)] text-[var(--pub-accent,#CBD5E1)]" />
                  ))}
                </div>
                
                <p className="font-sans text-xs text-[var(--pub-accent,#CBD5E1)] font-medium">
                  — {testimonials[activeTestimonialIdx].client_name}
                </p>
              </div>

              {/* Navigation Arrows for Quotes */}
              {testimonials.length > 1 && (
                <div className="flex items-center justify-center gap-3 mt-10">
                  <button 
                    onClick={handlePrevTestimonial}
                    className="w-10 h-10 rounded-full border border-[var(--pub-border)] flex items-center justify-center text-neutral-400 hover:text-white hover:border-white transition-all duration-200"
                    aria-label="Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-sans text-xs text-neutral-500">
                    {activeTestimonialIdx + 1} de {testimonials.length}
                  </span>
                  <button 
                    onClick={handleNextTestimonial}
                    className="w-10 h-10 rounded-full border border-[var(--pub-border)] flex items-center justify-center text-neutral-400 hover:text-white hover:border-white transition-all duration-200"
                    aria-label="Próximo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section className="pub-section bg-[var(--pub-bg)] border-b border-[var(--pub-border)]" id="contato">
        <div className="pub-container">
          <p className="pub-section__eyebrow text-left">Solicitação de ensaios</p>
          <h2 className="pub-section__title text-left mb-16">Vamos Conversar?</h2>

          <div className="w-full rounded-3xl border border-[var(--pub-border)] bg-[var(--pub-bg-elevated)] overflow-hidden shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-12">
              {/* Form panel */}
              <form onSubmit={handleContactSubmit} className="p-8 md:p-12 md:col-span-7 border-b md:border-b-0 md:border-r border-[var(--pub-border)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-xs font-sans text-neutral-300 font-medium mb-2">Nome completo</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required 
                      className="w-full px-4 py-3.5 rounded-xl bg-[var(--pub-surface)] border border-[var(--pub-border)] text-[var(--pub-ink)] text-sm outline-none focus:border-[var(--pub-accent,#CBD5E1)] focus:ring-1 focus:ring-[var(--pub-accent,#CBD5E1)]/20 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-sans text-neutral-300 font-medium mb-2">Telefone <span className="text-neutral-500 font-normal">(opcional)</span></label>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="w-full px-4 py-3.5 rounded-xl bg-[var(--pub-surface)] border border-[var(--pub-border)] text-[var(--pub-ink)] placeholder:text-neutral-500 text-sm outline-none focus:border-[var(--pub-accent,#CBD5E1)] focus:ring-1 focus:ring-[var(--pub-accent,#CBD5E1)]/20 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-sans text-neutral-300 font-medium mb-2">E-mail</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="seu@email.com"
                    className="w-full px-4 py-3.5 rounded-xl bg-[var(--pub-surface)] border border-[var(--pub-border)] text-[var(--pub-ink)] placeholder:text-neutral-500 text-sm outline-none focus:border-[var(--pub-accent,#CBD5E1)] focus:ring-1 focus:ring-[var(--pub-accent,#CBD5E1)]/20 transition-all duration-200"
                  />
                </div>

                <div className="mb-8">
                  <label className="block text-xs font-sans text-neutral-300 font-medium mb-2">Mensagem sobre o ensaio</label>
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={4}
                    placeholder="Descreva o tipo de ensaio, a data preferida e o local que você gostaria..."
                    className="w-full px-4 py-3.5 rounded-xl bg-[var(--pub-surface)] border border-[var(--pub-border)] text-[var(--pub-ink)] placeholder:text-neutral-500 text-sm outline-none resize-none focus:border-[var(--pub-accent,#CBD5E1)] focus:ring-1 focus:ring-[var(--pub-accent,#CBD5E1)]/20 transition-all duration-200"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={contactStatus.submitting}
                  className="pub-btn pub-btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {contactStatus.submitting ? 'Enviando...' : (
                    <>
                      <span>Enviar mensagem</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                {contactStatus.text && (
                  <div className={`mt-4 p-4 rounded-xl flex items-center gap-2.5 text-xs font-sans border ${contactStatus.isError ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'}`}>
                    {contactStatus.isError ? null : <Check className="w-4 h-4 shrink-0" />}
                    <span>{contactStatus.text}</span>
                  </div>
                )}
              </form>

              {/* Other channels sidebar */}
              <div className="p-8 md:p-12 md:col-span-5 flex flex-col justify-between bg-neutral-500/[0.01]">
                <div>
                  <p className="text-xs font-sans text-neutral-400 mb-6 font-medium">Contato direto</p>
                  
                  <div className="space-y-4">
                    {whatsappHref && (
                      <a 
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener"
                        className="flex items-center justify-between p-4.5 rounded-xl border border-[var(--pub-border)] hover:border-[var(--pub-border-strong)] hover:bg-neutral-500/5 transition-all duration-200 group text-[var(--pub-ink)] bg-[var(--pub-surface)]/30"
                      >
                        <div className="flex items-center gap-3">
                          <MessageSquare className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-medium">Falar no WhatsApp</span>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </a>
                    )}
                    {instagramHref && (
                      <a 
                        href={instagramHref}
                        target="_blank"
                        rel="noopener"
                        className="flex items-center justify-between p-4.5 rounded-xl border border-[var(--pub-border)] hover:border-[var(--pub-border-strong)] hover:bg-neutral-500/5 transition-all duration-200 group text-[var(--pub-ink)] bg-[var(--pub-surface)]/30"
                      >
                        <div className="flex items-center gap-3">
                          <Instagram className="w-4 h-4 text-pink-400" />
                          <span className="text-sm font-medium">Siga no Instagram</span>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </a>
                    )}
                    {!whatsappHref && !instagramHref && (
                      <p className="text-xs text-neutral-500 font-sans leading-relaxed">Prefere não usar o formulário? Envie um e-mail direto usando os dados de contato abaixo.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4 font-sans text-xs text-neutral-400 mt-8 pt-8 border-t border-[var(--pub-border)]">
                  {settings?.contact_email && (
                    <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-neutral-500" /> <span>{settings.contact_email}</span></div>
                  )}
                  {settings?.location && (
                    <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-neutral-500" /> <span>{settings.location}</span></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-950 border-t border-[var(--pub-border)] pt-20 pb-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          {/* Logo/Slogan column */}
          <div className="md:col-span-5 space-y-6">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={photographer.name} className="h-9 max-w-[150px] object-contain" />
            ) : (
              <span className="font-display italic text-2xl font-semibold text-white tracking-tight block">{photographer.name}</span>
            )}
            <p className="text-neutral-400 text-xs md:text-sm leading-relaxed max-w-sm font-light">
              {settings?.slogan || 'Fotografia autoral de alto padrão, sensibilidade artística e narrativas visuais premium eternizadas sob a ótica da alta-costura de lentes.'}
            </p>
            {/* Social handles if any */}
            <div className="flex items-center gap-3 pt-2">
              {instagramHref && (
                <a 
                  href={instagramHref} 
                  target="_blank" 
                  rel="noopener" 
                  className="p-2.5 rounded-full bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:border-white hover:scale-105 transition-all"
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {settings?.contact_email && (
                <a 
                  href={`mailto:${settings.contact_email}`}
                  className="p-2.5 rounded-full bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:border-white hover:scale-105 transition-all"
                  aria-label="E-mail"
                >
                  <Mail className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Quick links columns */}
          <div className="md:col-span-3 md:col-start-7 space-y-4">
            <span className="font-sans text-xs font-semibold tracking-wider text-neutral-300 uppercase block">Mapa do site</span>
            <ul className="space-y-3 text-xs text-neutral-400 font-light">
              <li><a href="#o-que-eu-capturo" className="hover:text-[var(--pub-accent,#CBD5E1)] hover:underline transition-all">Especialidades</a></li>
              <li><a href="#portfolio" className="hover:text-[var(--pub-accent,#CBD5E1)] hover:underline transition-all">Portfólio Editorial</a></li>
              <li><a href="#fotografias" className="hover:text-[var(--pub-accent,#CBD5E1)] hover:underline transition-all">Acervo de Fotos</a></li>
              <li><a href="#quem-tira-suas-fotos" className="hover:text-[var(--pub-accent,#CBD5E1)] hover:underline transition-all">Sobre Mim</a></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="md:col-span-4 space-y-4">
            <span className="font-sans text-xs font-semibold tracking-wider text-neutral-300 uppercase block">Atendimento</span>
            <ul className="space-y-3 text-xs text-neutral-400 font-light">
              {settings?.contact_email && (
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-neutral-500" />
                  <a href={`mailto:${settings.contact_email}`} className="hover:text-[var(--pub-accent,#CBD5E1)] hover:underline transition-all">{settings.contact_email}</a>
                </li>
              )}
              {settings?.whatsapp_number && (
                <li className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{settings.whatsapp_number}</span>
                </li>
              )}
              {settings?.location && (
                <li className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{settings.location}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-[var(--pub-border)] pt-8 max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-sans text-neutral-500">
          <p>© {new Date().getFullYear()} {photographer.name}. Todos os direitos reservados.</p>
          <button onClick={onNavigateHome} className="hover:text-[var(--pub-accent,#CBD5E1)] transition-colors tracking-wide text-xs">
            Voltar ao início
          </button>
        </div>
      </footer>

      {/* --- Lightbox element --- */}
      <Lightbox 
        photos={lightboxPhotos}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* --- Full Portfolio Overlay View (All Albums) --- */}
      {galleryOverlayOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/98 overflow-y-auto px-6 py-16 animate-fade-in font-sans">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 pb-6 mb-10 gap-4">
              <div>
                <p className="text-xs font-sans text-[var(--pub-accent,#CBD5E1)] mb-2 font-medium">Galeria completa</p>
                <h2 className="font-display italic text-3xl text-white">Todos os Álbuns Publicados</h2>
              </div>
              <button 
                onClick={() => setGalleryOverlayOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-sans bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer select-none"
              >
                Fechar galeria
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {albums.map((album) => (
                <button 
                  key={album.id}
                  onClick={() => {
                    setGalleryOverlayOpen(false);
                    openAlbumOverlay(album);
                  }}
                  className="relative rounded-3xl overflow-hidden aspect-[4/3] bg-[#0B0C0E] border border-neutral-800 text-left group shadow-lg transition-all duration-300 hover:border-neutral-700 cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent z-10" />
                  {album.cover_url ? (
                    <img src={album.cover_url} alt={album.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
                  )}

                  <div className="absolute inset-0 z-20 p-6 flex flex-col justify-end">
                    {album.categories?.name && (
                      <span className="text-xs font-sans text-[var(--pub-accent,#CBD5E1)] mb-1 font-medium">
                        {album.categories.name}
                      </span>
                    )}
                    <h3 className="font-display italic text-2xl text-white mb-1 font-medium">{album.title}</h3>
                    <span className="text-xs font-sans text-white/50">
                      {album.photo_count || 0} fotos
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- Album Photo Grid Overlay (Immersive Album Details) --- */}
      {selectedAlbumForOverlay && (
        <div className="fixed inset-0 z-50 bg-neutral-950/98 overflow-y-auto px-6 py-16 animate-fade-in font-sans">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-neutral-800 pb-6 mb-10 gap-4">
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-sans bg-[var(--pub-accent,#CBD5E1)] text-[var(--pub-accent-ink,#0F172A)] mb-3 font-medium">
                  {selectedAlbumForOverlay.categories?.name || 'Álbum'}
                </span>
                <h2 className="font-display italic text-3xl md:text-5xl text-white leading-tight font-medium mb-3">
                  {selectedAlbumForOverlay.title}
                </h2>
                {selectedAlbumForOverlay.description && (
                  <p className="text-neutral-400 text-sm max-w-2xl font-light leading-relaxed">
                    {selectedAlbumForOverlay.description}
                  </p>
                )}
              </div>
              <button 
                onClick={() => setSelectedAlbumForOverlay(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-sans bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer self-start"
              >
                Voltar ao portfólio
              </button>
            </div>

            {/* Photos Grid or Loading */}
            {albumPhotosLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--pub-border)] border-t-[var(--pub-accent,#CBD5E1)] animate-spin mb-4" />
                <p className="text-xs font-sans">Carregando fotografias do álbum...</p>
              </div>
            ) : albumPhotosForOverlay.length === 0 ? (
              <p className="text-neutral-500 text-xs py-16 text-center border border-dashed border-neutral-800 rounded-2xl">
                Nenhuma fotografia encontrada neste álbum.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {albumPhotosForOverlay.map((photo, idx) => (
                  <button 
                    key={photo.id}
                    onClick={() => openPhotoLightbox(albumPhotosForOverlay, idx)}
                    className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-[#0B0C0E] border border-neutral-800 group shadow-md hover:border-neutral-600 transition-all cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-black/10 hover:bg-black/0 transition-colors z-10" />
                    <img 
                      src={photo.thumbnail_url} 
                      alt={photo.title || ''} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    
                    {/* Hover title */}
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-20 opacity-0 group-hover:opacity-100 transition-opacity text-left">
                      <p className="text-white text-xs font-medium font-display italic">{photo.title || 'Sem título'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Full Photo Archive Grid Overlay (Acervo Completo) --- */}
      {photoGalleryOverlayOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/98 overflow-y-auto px-6 py-16 animate-fade-in font-sans">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 pb-6 mb-10 gap-4">
              <div>
                <p className="text-xs font-sans text-[var(--pub-accent,#CBD5E1)] mb-2 font-medium">Acervo fotográfico completo</p>
                <h2 className="font-display italic text-3xl text-white">Todas as Obras Autorais</h2>
              </div>
              <button 
                onClick={() => setPhotoGalleryOverlayOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-sans bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer"
              >
                Fechar acervo
              </button>
            </div>

            {/* Photos Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredPhotos.map((photo, idx) => (
                <button 
                  key={photo.id}
                  onClick={() => openPhotoLightbox(filteredPhotos, idx)}
                  className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-[#0B0C0E] border border-neutral-800 group shadow-md hover:border-neutral-600 transition-all cursor-pointer"
                >
                  <div className="absolute inset-0 bg-black/10 hover:bg-black/0 transition-colors z-10" />
                  <img 
                    src={photo.thumbnail_url} 
                    alt={photo.title || ''} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  
                  {/* Hover Info */}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-20 opacity-0 group-hover:opacity-100 transition-opacity text-left">
                    <p className="text-white text-xs font-medium font-display italic mb-0.5">{photo.title || 'Sem título'}</p>
                    {photo.categories?.name && (
                      <p className="text-[10px] text-[var(--pub-accent,#CBD5E1)]">{photo.categories.name}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- Floating WhatsApp assistant & scroll-to-top widgets --- */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-3">
        {showBackToTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="p-3.5 rounded-full bg-neutral-900/80 border border-white/10 backdrop-blur-md text-white/80 hover:text-white hover:border-white hover:scale-110 active:scale-95 shadow-xl transition-all duration-300"
            aria-label="Voltar ao topo"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
        
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener"
            className="p-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group"
            aria-label="Fale Conosco"
          >
            <Phone className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          </a>
        )}
      </div>
    </div>
  );
}
