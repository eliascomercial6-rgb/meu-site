/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Photographer } from '../types';
import { 
  Camera, 
  Award, 
  Sparkles, 
  LayoutGrid, 
  Check, 
  Settings, 
  ArrowRight, 
  ArrowUpRight,
  Aperture, 
  X, 
  Eye, 
  Send, 
  Palette, 
  Calendar,
  Lock,
  Compass,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Quote,
  Star,
  UserPlus,
  UploadCloud,
  Wand2,
  Rocket,
  Handshake,
  Minus,
  ShieldCheck
} from 'lucide-react';

/**
 * Reveal — lightweight scroll-triggered fade/rise wrapper (IntersectionObserver).
 * No animation library dependency; keeps the "Apple-like" progressive reveal
 * feel described in the design brief without adding new packages.
 */
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -5% 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-[1800ms] ${visible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-4 blur-[2px]'} ${className}`}
      style={{ transitionDelay: `${delay}ms`, transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      {children}
    </div>
  );
}

/** CountUp — animates a number from 0 to `value` once it scrolls into view. */
function CountUp({ value, suffix = '', duration = 1400 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started) {
            setStarted(true);
            const start = performance.now();
            const tick = (now: number) => {
              const progress = Math.min(1, (now - start) / duration);
              const eased = 1 - Math.pow(1 - progress, 3);
              setDisplay(Math.round(value * eased));
              if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [value, duration, started]);

  return <span ref={ref}>{display.toLocaleString('pt-BR')}{suffix}</span>;
}

interface SaasLandingPageProps {
  onNavigateToAdmin: () => void;
  onNavigateToSlug: (slug: string) => void;
}

// Curated high-fidelity mock editorial photos for the live interactive demo
const DEMO_PHOTOS = [
  {
    id: 'demo-1',
    title: 'Essência Brutalista',
    category: 'Arquitetura',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=85&w=1200',
    description: 'Estudo de sombras e concreto armado sob a luz direta de Brasília.'
  },
  {
    id: 'demo-2',
    title: 'Retrato Arquetípico I',
    category: 'Retratos',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=85&w=1200',
    description: 'Iluminação Rembrandt clássica focada na intensidade e textura do olhar.'
  },
  {
    id: 'demo-3',
    title: 'Minimalismo Urbano',
    category: 'Editorial',
    url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=85&w=1200',
    description: 'Paleta dessaturada contrastando alta costura e as ranhuras do asfalto paulistano.'
  },
  {
    id: 'demo-4',
    title: 'Silhueta e Geometria',
    category: 'Arquitetura',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=85&w=1200',
    description: 'Exploração de linhas puras e contra-luz dramático.'
  },
  {
    id: 'demo-5',
    title: 'Estética Cinematográfica',
    category: 'Editorial',
    url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=85&w=1200',
    description: 'Captura contínua inspirada em frames de película anamórfica de 35mm.'
  },
  {
    id: 'demo-6',
    title: 'Olhar Profundo II',
    category: 'Retratos',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=85&w=1200',
    description: 'Estudo expressionista focado no retrato contemporâneo masculino.'
  }
];

// Fictional demo specialties — mirrors the "O Que Eu Capturo" section on the real
// public site, with zero connection to any real photographer or client.
const DEMO_CATEGORIES = [
  {
    id: 'demo-cat-1',
    name: 'Editorial',
    desc: 'Narrativas de moda com direção de arte autoral e luz cinematográfica.',
    url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'demo-cat-2',
    name: 'Retratos',
    desc: 'Estudos de expressão e presença, sempre com iluminação intencional.',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'demo-cat-3',
    name: 'Arquitetura',
    desc: 'Linhas, sombra e concreto — geometria registrada com precisão técnica.',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800'
  }
];

// Fictional demo albums — groups the demo photos the same way the real
// public site organizes a photographer's work (album cards with a cover,
// category tag and photo count, opening into a photo grid). Everything here
// is invented for preview purposes only, with zero connection to any real
// photographer or client.
const DEMO_ALBUMS = [
  {
    id: 'demo-album-1',
    title: 'Concreto & Sombra',
    category: 'Arquitetura',
    description: 'Uma série sobre linhas puras, contra-luz e a geometria bruta do concreto armado.',
    photoIds: ['demo-1', 'demo-4']
  },
  {
    id: 'demo-album-2',
    title: 'Estudo do Olhar',
    category: 'Retratos',
    description: 'Retratos com iluminação intencional, explorando presença e textura de pele.',
    photoIds: ['demo-2', 'demo-6']
  },
  {
    id: 'demo-album-3',
    title: 'Alta Costura Urbana',
    category: 'Editorial',
    description: 'Moda e cenário urbano se encontram numa paleta dessaturada e cinematográfica.',
    photoIds: ['demo-3', 'demo-5']
  },
  {
    id: 'demo-album-4',
    title: 'Seleção Atemporal',
    category: 'Todos',
    description: 'Um recorte geral do acervo, com uma imagem de cada especialidade.',
    photoIds: ['demo-1', 'demo-2', 'demo-3']
  }
].map(album => ({
  ...album,
  photos: album.photoIds.map(id => DEMO_PHOTOS.find(p => p.id === id)!).filter(Boolean),
})).map(album => ({
  ...album,
  cover_url: album.photos[0]?.url,
  photo_count: album.photos.length
}));

// Fictional demo testimonials — invented client names, not tied to any real person.
const DEMO_TESTIMONIALS = [
  { id: 'dt-1', client_name: 'Camila R.', rating: 5, content: 'Um olhar autoral raro. Cada imagem parecia já ter sido pensada antes mesmo do clique.' },
  { id: 'dt-2', client_name: 'Estúdio Nortis', rating: 5, content: 'Processo profissional do início ao fim, com uma sensibilidade visual fora da curva.' },
  { id: 'dt-3', client_name: 'Bruno T.', rating: 4, content: 'Entrega rápida e um cuidado enorme com a narrativa de cada ensaio.' }
];

// "Como Funciona" — onboarding timeline
const HOW_IT_WORKS_STEPS = [
  { icon: UserPlus, title: 'Cadastro', desc: 'Crie sua conta em menos de um minuto, sem cartão de crédito.' },
  { icon: UploadCloud, title: 'Upload', desc: 'Envie seu acervo em alta resolução direto do computador ou celular.' },
  { icon: Wand2, title: 'Personalização', desc: 'Ajuste cor de destaque, logo e organize álbuns e categorias.' },
  { icon: Rocket, title: 'Publicação', desc: 'Seu portfólio vai ao ar em um endereço próprio, pronto para compartilhar.' },
  { icon: Handshake, title: 'Primeiro Cliente', desc: 'Receba propostas de orçamento direto pelo formulário do seu site.' },
];

// Comparative section — where photographers keep their work today vs FocusPortfolio
const COMPARISON_ROWS = [
  { label: 'Domínio e marca próprios', others: false, focus: true },
  { label: 'Curadoria editorial sem algoritmo', others: false, focus: true },
  { label: 'Galeria em alta resolução, sem compressão agressiva', others: false, focus: true },
  { label: 'Formulário de orçamento embutido', others: false, focus: true },
  { label: 'Identidade visual 100% customizável', others: false, focus: true },
  { label: 'Foco em portfólio, sem distrações de feed', others: false, focus: true },
];

// FAQ accordion content
const FAQ_ITEMS = [
  {
    q: 'Preciso saber programar ou mexer com design para publicar meu site?',
    a: 'Não. Todo o processo é feito pelo painel administrativo: você envia as fotos, organiza em álbuns e categorias, escolhe a cor de destaque e o site fica pronto — sem escrever uma linha de código.'
  },
  {
    q: 'O que acontece quando o teste grátis de 14 dias termina?',
    a: 'Você tem mais 7 dias após o fim do teste para assinar o Plano Pro sem perder nada. Se o prazo passar sem assinatura, a conta e os dados associados a ela são excluídos.'
  },
  {
    q: 'Posso usar meu próprio domínio (ex: meunome.com.br)?',
    a: 'O suporte a domínio personalizado faz parte do roadmap do Plano Pro. Até lá, seu portfólio fica disponível em um endereço próprio dentro da plataforma.'
  },
  {
    q: 'Como funciona o recebimento de orçamentos?',
    a: 'Cada site público tem um formulário de contato integrado. Quando um cliente envia uma proposta, ela aparece imediatamente no seu painel, na aba de Depoimentos/Orçamentos.'
  },
  {
    q: 'Consigo cancelar quando quiser?',
    a: 'Sim, direto pela aba de Configurações do painel, sem fidelidade. Atenção: cancelar exclui permanentemente a conta e todo o conteúdo publicado, então baixe uma cópia do que quiser guardar antes.'
  }
];

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}

export default function SaasLandingPage({ onNavigateToAdmin, onNavigateToSlug }: SaasLandingPageProps) {
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(true);

  // Live Demo state
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoCategory, setDemoCategory] = useState<string>('Todos');
  const [demoAccentColor, setDemoAccentColor] = useState<string>('#CBD5E1'); // Default elegant slate
  const [demoProposalSent, setDemoProposalSent] = useState(false);
  const [demoProposalName, setDemoProposalName] = useState('');
  const [selectedDemoPhoto, setSelectedDemoPhoto] = useState<typeof DEMO_PHOTOS[0] | null>(null);
  const [selectedDemoAlbum, setSelectedDemoAlbum] = useState<typeof DEMO_ALBUMS[0] | null>(null);
  const [demoTheme, setDemoTheme] = useState<'dark' | 'light'>('dark');
  const [demoTestimonialIdx, setDemoTestimonialIdx] = useState(0);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  // The header now exists as two entirely separate bars that crossfade
  // instead of one bar whose width is continuously animated:
  //  - the full-width transparent bar shown at the top of the hero
  //  - the smaller centered blurred pill shown once scrolled
  // On scrolling down: the full bar fades out first, then (after a brief
  // gap where no bar is visible at all) the pill fades in. Scrolling back
  // up mirrors the same sequence in reverse.
  const [navScrolled, setNavScrolled] = useState(false);
  const [fullBarVisible, setFullBarVisible] = useState(true);
  const [pillBarVisible, setPillBarVisible] = useState(false);

  useEffect(() => {
    const NAV_TRIGGER_DELAY_MS = 400; // pause before the scroll crossing even starts the swap
    let delayTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      const scrolled = window.scrollY > 80;
      if (delayTimeout) clearTimeout(delayTimeout);
      delayTimeout = setTimeout(() => setNavScrolled(scrolled), NAV_TRIGGER_DELAY_MS);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (delayTimeout) clearTimeout(delayTimeout);
    };
  }, []);

  useEffect(() => {
    const FADE_MS = 300; // how long each bar takes to fade out/in
    const GAP_MS = 200; // extra pause with neither bar visible, between the two fades
    let swapTimeout: ReturnType<typeof setTimeout> | null = null;

    if (navScrolled) {
      setFullBarVisible(false);
      swapTimeout = setTimeout(() => setPillBarVisible(true), FADE_MS + GAP_MS);
    } else {
      setPillBarVisible(false);
      swapTimeout = setTimeout(() => setFullBarVisible(true), FADE_MS + GAP_MS);
    }

    return () => {
      if (swapTimeout) clearTimeout(swapTimeout);
    };
  }, [navScrolled]);

  // Heavier scrolling: instead of jumping in chunks, every wheel tick just
  // moves a lot less than it normally would — same continuous feel, just
  // much less sensitive, so it takes a lot more scrolling to travel the
  // same distance.
  useEffect(() => {
    const SCROLL_SENSITIVITY = 0.4; // lower = heavier/less sensitive, higher = faster
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      window.scrollBy(0, e.deltaY * SCROLL_SENSITIVITY);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    async function loadPhotographers() {
      try {
        const { data, error } = await supabase
          .from('photographers')
          .select('id, name, slug, specialties, bio')
          .limit(10);
        
        if (!error && data) {
          setPhotographers(data);
        }
      } catch (err) {
        console.error('Error loading photographers:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPhotographers();
  }, []);

  const handleScrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDemoProposalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoProposalSent(true);
    setTimeout(() => {
      setDemoProposalSent(false);
      setDemoProposalName('');
    }, 4000);
  };

  // Filtered demo albums — mirrors how the real public site filters albums
  // by category before showing them as clickable cards.
  const filteredDemoAlbums = demoCategory === 'Todos'
    ? DEMO_ALBUMS
    : DEMO_ALBUMS.filter(a => a.category === demoCategory || a.category === 'Todos');

  return (
    <div
      className="min-h-screen bg-[#050506] text-neutral-100 font-sans selection:bg-white/10 selection:text-zinc-200 overflow-x-hidden relative"
      style={{ zoom: 0.9 }}
    >
      {/* Native scrollbar hidden — scrolling is now driven by the wheel
          handler above, so the default/visual scrollbar track+thumb would
          just be a distraction (and wouldn't reflect the custom feel).
          Scrolling itself keeps working exactly the same, it's purely
          hidden. Section-seam smoothing kept as-is. */}
      <style>{`
        html, body {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        ::-webkit-scrollbar,
        html::-webkit-scrollbar,
        body::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        .section-seam {
          height: 140px;
          margin-top: -140px;
          pointer-events: none;
          background: linear-gradient(180deg, #050506 0%, transparent 100%);
          position: relative;
          z-index: 1;
        }
      `}</style>

      {/* Chrome hairline at the very top */}
      <div className="fixed bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--app-accent)]/60 to-transparent z-50" />

      {/* Decorative Glowing Orbs */}
      <div className="absolute top-[-10%] left-[20%] w-[520px] h-[520px] rounded-full bg-[var(--app-accent)]/[0.018] blur-[130px] pointer-events-none" />
      <div className="absolute top-[35%] right-[-10%] w-[440px] h-[440px] rounded-full bg-zinc-900/[0.025] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-10%] w-[360px] h-[360px] rounded-full bg-[var(--app-accent)]/[0.018] blur-[110px] pointer-events-none" />

      {/* Header — two entirely separate bars that crossfade instead of one
          bar whose width/shape is continuously animated. Full bar fades out
          on scroll, then (after a brief gap with nothing visible) the
          centered blurred pill fades in. Reverses the same way scrolling
          back up. */}
      <header
        aria-hidden={!fullBarVisible}
        className={`fixed top-0 left-0 right-0 z-40 flex justify-center pointer-events-none transition-opacity duration-300 ${
          fullBarVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className={`flex items-center justify-between gap-6 h-16 px-6 w-full max-w-7xl ${fullBarVisible ? 'pointer-events-auto' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[linear-gradient(135deg,#6B6E76_0%,#F4F5F7_45%,#FFFFFF_55%,#9AA0AA_100%)] p-[1.5px] flex items-center justify-center shadow-[0_0_18px_rgba(231,233,236,0.25)]">
              <div className="w-full h-full rounded-xl bg-black flex items-center justify-center">
                <Aperture className="w-4.5 h-4.5 text-zinc-200" />
              </div>
            </div>
            <span className="font-display italic text-xl font-light tracking-tight text-white">FocusPortfolio</span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={() => { window.location.href = '/admin/login'; }}
              className="hidden sm:block text-neutral-400 hover:text-white font-medium text-sm transition-colors duration-200"
            >
              Acessar Painel
            </button>
            <button
              onClick={() => { window.location.href = '/cadastro'; }}
              className="app-btn-accent px-5 py-2.5 rounded-xl text-xs font-semibold hover:brightness-105 active:scale-95 transition-all duration-200 flex items-center gap-2"
            >
              Criar Portfólio <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <header
        aria-hidden={!pillBarVisible}
        className={`fixed top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-opacity duration-300 ${
          pillBarVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className={`flex items-center justify-between gap-6 h-16 px-6 w-[94vw] sm:w-auto sm:min-w-[520px] max-w-2xl rounded-full bg-black/70 backdrop-blur-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${
            pillBarVisible ? 'pointer-events-auto' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[linear-gradient(135deg,#6B6E76_0%,#F4F5F7_45%,#FFFFFF_55%,#9AA0AA_100%)] p-[1.5px] flex items-center justify-center shadow-[0_0_18px_rgba(231,233,236,0.25)]">
              <div className="w-full h-full rounded-xl bg-black flex items-center justify-center">
                <Aperture className="w-4.5 h-4.5 text-zinc-200" />
              </div>
            </div>
            <span className="font-display italic text-xl font-light tracking-tight text-white">FocusPortfolio</span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={() => { window.location.href = '/admin/login'; }}
              className="hidden sm:block text-neutral-400 hover:text-white font-medium text-sm transition-colors duration-200"
            >
              Acessar Painel
            </button>
            <button
              onClick={() => { window.location.href = '/cadastro'; }}
              className="app-btn-accent px-5 py-2.5 rounded-xl text-xs font-semibold hover:brightness-105 active:scale-95 transition-all duration-200 flex items-center gap-2"
            >
              Criar Portfólio <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>


      {/* Hero Section */}
      <section className="relative pt-28 pb-28 text-center px-6 overflow-hidden">
        {/* Signature element: aperture rings behind the headline */}
        <div className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 w-[560px] h-[560px] opacity-[0.35]">
          <div className="absolute inset-0 rounded-full border border-[var(--app-accent)]/20" />
          <div className="absolute inset-[36px] rounded-full border border-zinc-300/10" />
          <div className="absolute inset-[72px] rounded-full border border-[var(--app-accent)]/10 [mask-image:radial-gradient(circle_at_center,black_40%,transparent_75%)]" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase font-sans text-zinc-300 tracking-widest mb-8 font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
              <span className="app-badge-dot animate-pulse" /> Curadoria Visual de Alta Performance
            </div>
            <h1 className="flex flex-col items-center text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-tight leading-[1.15] mb-8">
              <span className="whitespace-nowrap font-sans font-bold text-white">Seu trabalho merece</span>
              <span className="whitespace-nowrap">
                <span className="font-sans font-bold text-white">um </span>
                <span className="font-display font-light italic bg-[linear-gradient(100deg,var(--app-accent-dim)_10%,var(--app-accent)_50%,var(--app-accent-dim)_90%)] bg-clip-text text-transparent">
                  Portfólio Editorial.
                </span>
              </span>
            </h1>
            <p className="text-neutral-400 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-12 font-light">
              A plataforma SaaS premium definitiva para fotógrafos autorais que exigem design minimalista, estética cinematográfica de galeria e controle absoluto sobre seu acervo.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button 
                onClick={() => handleScrollToSection('planos')}
                className="app-btn-accent w-full sm:w-auto px-8 py-4 rounded-xl font-semibold active:scale-95 transition-all duration-200 cursor-pointer text-xs hover:brightness-105"
              >
                Começar Grátis
              </button>
              <button 
                onClick={() => handleScrollToSection('explorar')}
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold border border-zinc-800 hover:border-zinc-700 text-white bg-white/5 hover:bg-white/10 active:scale-95 transition-all duration-200 text-xs cursor-pointer"
              >
                Explorar Portfólios
              </button>
            </div>
          </Reveal>

          {/* Trust bar — real product facts, not fabricated stats */}
          <Reveal delay={150}>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 mt-16 pt-8 border-t border-white/5">
              <div className="text-center">
                <p className="font-display italic text-2xl text-white"><CountUp value={14} /> dias</p>
                <p className="text-[9px] uppercase tracking-wider text-neutral-500 mt-1">Teste grátis, sem cartão</p>
              </div>
              <div className="w-px h-8 bg-white/10 hidden sm:block" />
              <div className="text-center">
                <p className="font-display italic text-2xl text-white flex items-center gap-1.5 justify-center"><ShieldCheck className="w-4 h-4 text-[var(--app-accent)]" /> Sem fidelidade</p>
                <p className="text-[9px] uppercase tracking-wider text-neutral-500 mt-1">Cancele quando quiser</p>
              </div>
              <div className="w-px h-8 bg-white/10 hidden sm:block" />
              <div className="text-center">
                <p className="font-display italic text-2xl text-white"><CountUp value={5} /> minutos</p>
                <p className="text-[9px] uppercase tracking-wider text-neutral-500 mt-1">Para colocar o site no ar</p>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Blurred/obfuscated preview of the actual public site — real demo
            photos, heavily blurred and darkened, standing in for "there's a
            real site behind this" instead of an abstract grid pattern. The
            radial dark overlay keeps the CTA copy readable in the center
            while the blurred imagery still reads at the edges, inviting the
            click to reveal it properly. */}
        <Reveal delay={250} className="mt-20 relative max-w-5xl mx-auto">
          <div className="relative aspect-[16/10] rounded-3xl border border-zinc-900 bg-[#080809] overflow-hidden p-[1.5px] shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--app-accent)]/[0.04] to-transparent pointer-events-none z-10" />
            <div className="w-full h-full bg-[#050506] rounded-3xl flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 grid grid-cols-4 sm:grid-cols-5">
                {[...DEMO_PHOTOS, ...DEMO_PHOTOS].slice(0, 10).map((photo, i) => (
                  <div key={`${photo.id}-${i}`} className="relative aspect-square overflow-hidden">
                    <img
                      src={photo.url}
                      alt=""
                      aria-hidden="true"
                      className="w-full h-full object-cover scale-110"
                      style={{ filter: 'blur(14px) grayscale(0.2) brightness(0.55)' }}
                    />
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-[#050506]" />
              <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_55%_55%_at_50%_45%,#000_55%,transparent_100%)] bg-[#050506]/95" />
              
              <div className="relative z-10 max-w-2xl">
                <Aperture className="w-12 h-12 text-[var(--app-accent)] mx-auto mb-6 opacity-70" />
                <h3 className="text-3xl md:text-4xl mb-4">
                  <span className="font-sans font-bold text-white">Veja a Plataforma em </span>
                  <span className="font-display italic font-light text-[var(--app-accent)]">Ação</span>
                </h3>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed mb-8 font-light max-w-lg mx-auto">
                  Não oferecemos mockups estáticos de mentira. Experimente agora mesmo o site público que seus clientes verão, filtre por categoria e mude a identidade visual em tempo real.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button 
                    onClick={() => setDemoOpen(true)}
                    className="app-btn-accent px-6 py-3 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer hover:brightness-105"
                  >
                    <Eye className="w-4 h-4" /> Ver Demonstração Interativa
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Floating glass accent cards — part of the mockup composition */}
          <div className="hidden md:flex absolute -left-10 top-10 items-center gap-2.5 px-4 py-3 rounded-2xl glass-card shadow-2xl animate-float">
            <div className="w-8 h-8 rounded-lg bg-[var(--app-accent)]/10 flex items-center justify-center">
              <Check className="w-4 h-4 text-[var(--app-accent)]" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-white">Site publicado</p>
              <p className="text-[9px] text-neutral-500">seunome.focusportfolio.com</p>
            </div>
          </div>
          <div className="hidden md:flex absolute -right-8 bottom-16 items-center gap-2.5 px-4 py-3 rounded-2xl glass-card shadow-2xl animate-float" style={{ animationDelay: '1.2s' }}>
            <div className="w-8 h-8 rounded-lg bg-[var(--app-accent)]/10 flex items-center justify-center">
              <Camera className="w-4 h-4 text-[var(--app-accent)]" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-white">Upload em lote</p>
              <p className="text-[9px] text-neutral-500">Compressão automática</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Photographer Discovery section */}
      <section id="explorar" className="py-24 border-t border-transparent relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-zinc-800/70 before:to-transparent bg-black/40">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-20">
              <p className="text-xs text-zinc-500 mb-3 font-semibold uppercase tracking-wider">Conecte-se</p>
              <h2 className="text-4xl md:text-5xl">
                <span className="font-sans font-bold text-white">Fotógrafos na </span>
                <span className="font-display italic font-light text-[var(--app-accent)]">Plataforma</span>
              </h2>
              <p className="text-neutral-400 text-sm mt-4 leading-relaxed font-light">
                Explore os portfólios autorais criados em nossa plataforma por profissionais de renome.
              </p>
            </div>
          </Reveal>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-zinc-800 border-t-white animate-spin" />
            </div>
          ) : photographers.length === 0 ? (
            <div className="text-center py-16 border border-zinc-900 rounded-3xl bg-neutral-950/40 max-w-md mx-auto">
              <Sparkles className="w-8 h-8 text-neutral-700 mx-auto mb-4" />
              <p className="text-neutral-400 text-sm font-medium">Nenhum fotógrafo cadastrado ainda.</p>
              <button 
                onClick={() => { window.location.href = '/cadastro'; }}
                className="mt-6 px-5 py-2.5 rounded-xl text-xs font-semibold app-btn-accent transition-colors cursor-pointer"
              >
                Seja o primeiro! Criar meu portfólio
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {photographers.map((p) => (
                <div 
                  key={p.id}
                  className="group relative rounded-2xl border border-zinc-900 hover:border-zinc-800 bg-[#080809] p-6 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display text-2xl text-white font-medium group-hover:text-zinc-200 transition-colors">
                        {p.name}
                      </h3>
                      <span className="text-[10px] text-zinc-400 px-2 py-0.5 rounded border border-white/5 bg-black font-semibold font-sans">
                        {p.slug}
                      </span>
                    </div>
                    <p className="text-neutral-400 text-xs leading-relaxed mb-6 line-clamp-3 font-light">
                      {p.bio || 'Profissional autoral na plataforma de portfólios FocusPortfolio.'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {p.specialties && p.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {p.specialties.slice(0, 3).map((spec, idx) => (
                          <span key={idx} className="text-[9px] text-zinc-400 border border-zinc-900 px-2 py-0.5 rounded-full bg-black">
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}
                    <button 
                      onClick={() => onNavigateToSlug(p.slug)}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold text-center text-neutral-300 bg-white/5 border border-white/10 hover:border-white/20 hover:text-white transition-all duration-200 cursor-pointer"
                    >
                      Acessar portfólio
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Feature Bento Grid (Diferenciais with Silver Brushed Premium Gradients) */}
      <section className="py-24 max-w-7xl mx-auto px-6 relative">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-20">
            <p className="text-xs text-zinc-500 mb-3 font-semibold uppercase tracking-wider">Diferenciais</p>
            <h2 className="text-4xl md:text-5xl">
              <span className="font-sans font-bold text-white">Criado por fotógrafos, para </span>
              <span className="font-display italic font-light text-[var(--app-accent)]">fotógrafos.</span>
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Differential 1 */}
          <Reveal delay={0} className="p-[1.5px] bg-gradient-to-b from-zinc-700 via-zinc-500 to-zinc-900 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.6)] transition-all duration-300 hover:from-[var(--app-accent)] hover:via-[var(--app-accent-dim)] hover:to-zinc-700 group relative">
            <div className="relative p-8 h-full rounded-2xl bg-[#080809] flex flex-col aspect-[4/5] overflow-hidden">
              {/* Light sweep on hover */}
              <div className="pointer-events-none absolute inset-0 -translate-x-[120%] group-hover:translate-x-[120%] transition-transform duration-[1200ms] ease-out bg-[linear-gradient(115deg,transparent_35%,rgba(231,233,236,0.08)_50%,transparent_65%)]" />
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 rounded-2xl bg-[linear-gradient(135deg,#6B6E76_0%,#F4F5F7_45%,#FFFFFF_55%,#9AA0AA_100%)] p-[1.5px] group-hover:scale-105 transition-transform duration-300">
                  <div className="w-full h-full rounded-2xl bg-[#0B0C0E] flex items-center justify-center">
                    <LayoutGrid className="w-6 h-6 text-zinc-200" />
                  </div>
                </div>
                <span className="font-display italic text-3xl text-white/10 group-hover:text-[var(--app-accent)]/30 transition-colors duration-500">01</span>
              </div>

              {/* Mini visual: asymmetric masonry preview exemplifying the "Reel Editorial" grid */}
              <div className="relative flex-1 min-h-[92px] my-6 grid grid-cols-3 grid-rows-2 gap-1.5">
                <div className="col-span-2 row-span-2 rounded-lg bg-[linear-gradient(150deg,#2a2a2d_0%,#141416_100%)] border border-white/5 group-hover:border-[var(--app-accent)]/25 transition-colors duration-500" />
                <div className="rounded-lg bg-[linear-gradient(150deg,#1f1f22_0%,#0e0e10_100%)] border border-white/5" />
                <div className="rounded-lg bg-[linear-gradient(150deg,rgba(var(--app-accent-rgb),0.18)_0%,#0e0e10_100%)] border border-white/5 group-hover:border-[var(--app-accent)]/30 transition-colors duration-500" />
              </div>

              <div className="relative">
                <h3 className="font-display italic text-2xl text-white mb-2">Reel Editorial</h3>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed font-light">
                  Suas fotos organizadas em um grid assimétrico cuidadosamente balanceado, valorizando composições verticais e horizontais em perfeita sintonia artística.
                </p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-[linear-gradient(90deg,transparent_0%,rgba(var(--app-accent-rgb),0.5)_50%,transparent_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          </Reveal>
          
          {/* Differential 2 */}
          <Reveal delay={120} className="p-[1.5px] bg-gradient-to-b from-zinc-700 via-zinc-500 to-zinc-900 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.6)] transition-all duration-300 hover:from-[var(--app-accent)] hover:via-[var(--app-accent-dim)] hover:to-zinc-700 group relative">
            <div className="relative p-8 h-full rounded-2xl bg-[#080809] flex flex-col aspect-[4/5] overflow-hidden">
              <div className="pointer-events-none absolute inset-0 -translate-x-[120%] group-hover:translate-x-[120%] transition-transform duration-[1200ms] ease-out bg-[linear-gradient(115deg,transparent_35%,rgba(231,233,236,0.08)_50%,transparent_65%)]" />
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 rounded-2xl bg-[linear-gradient(135deg,#6B6E76_0%,#F4F5F7_45%,#FFFFFF_55%,#9AA0AA_100%)] p-[1.5px] group-hover:scale-105 transition-transform duration-300">
                  <div className="w-full h-full rounded-2xl bg-[#0B0C0E] flex items-center justify-center">
                    <Settings className="w-6 h-6 text-zinc-200 group-hover:rotate-45 transition-transform duration-500" />
                  </div>
                </div>
                <span className="font-display italic text-3xl text-white/10 group-hover:text-[var(--app-accent)]/30 transition-colors duration-500">02</span>
              </div>

              {/* Mini visual: color/type customization preview exemplifying "Marca Autoral" */}
              <div className="relative flex-1 min-h-[92px] my-6 rounded-lg border border-white/5 bg-[#0d0d0f] p-4 flex flex-col justify-between">
                <span className="font-display italic text-lg text-white/80">Aa</span>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full border border-white/10" style={{ background: 'var(--app-accent, #9AA0AA)' }} />
                  <span className="w-5 h-5 rounded-full bg-zinc-700 border border-white/10" />
                  <span className="w-5 h-5 rounded-full bg-zinc-500 border border-white/10" />
                  <span className="text-[9px] text-neutral-500 ml-auto group-hover:text-[var(--app-accent)]/70 transition-colors duration-500">#HEX</span>
                </div>
              </div>

              <div className="relative">
                <h3 className="font-display italic text-2xl text-white mb-2">Marca Autoral</h3>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed font-light">
                  Customize seu logo, favicon, retrato pessoal de perfil e escolha sua cor de destaque (Hex) para garantir uma identidade visual totalmente coesa e refinada.
                </p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-[linear-gradient(90deg,transparent_0%,rgba(var(--app-accent-rgb),0.5)_50%,transparent_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          </Reveal>

          {/* Differential 3 */}
          <Reveal delay={240} className="p-[1.5px] bg-gradient-to-b from-zinc-700 via-zinc-500 to-zinc-900 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.6)] transition-all duration-300 hover:from-[var(--app-accent)] hover:via-[var(--app-accent-dim)] hover:to-zinc-700 group relative">
            <div className="relative p-8 h-full rounded-2xl bg-[#080809] flex flex-col aspect-[4/5] overflow-hidden">
              <div className="pointer-events-none absolute inset-0 -translate-x-[120%] group-hover:translate-x-[120%] transition-transform duration-[1200ms] ease-out bg-[linear-gradient(115deg,transparent_35%,rgba(231,233,236,0.08)_50%,transparent_65%)]" />
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 rounded-2xl bg-[linear-gradient(135deg,#6B6E76_0%,#F4F5F7_45%,#FFFFFF_55%,#9AA0AA_100%)] p-[1.5px] group-hover:scale-105 transition-transform duration-300">
                  <div className="w-full h-full rounded-2xl bg-[#0B0C0E] flex items-center justify-center">
                    <Award className="w-6 h-6 text-zinc-200" />
                  </div>
                </div>
                <span className="font-display italic text-3xl text-white/10 group-hover:text-[var(--app-accent)]/30 transition-colors duration-500">03</span>
              </div>

              {/* Mini visual: testimonial snippet exemplifying "Prova Social" */}
              <div className="relative flex-1 min-h-[92px] my-6 rounded-lg border border-white/5 bg-[#0d0d0f] p-4 flex flex-col justify-between">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-[var(--app-accent)] text-[var(--app-accent)]" />
                  ))}
                </div>
                <div className="h-1.5 w-4/5 rounded-full bg-white/10" />
              </div>

              <div className="relative">
                <h3 className="font-display italic text-2xl text-white mb-2">Prova Social</h3>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed font-light">
                  Exiba depoimentos reais de seus clientes com classificação de estrelas elegante, agregando imenso prestígio e atração para fechamento de novos orçamentos de valor.
                </p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-[linear-gradient(90deg,transparent_0%,rgba(var(--app-accent-rgb),0.5)_50%,transparent_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Como Funciona — onboarding timeline */}
      <section className="py-24 border-t border-transparent relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-zinc-800/70 before:to-transparent overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-20">
              <p className="text-xs text-zinc-500 mb-3 font-semibold uppercase tracking-wider">Do Zero ao Publicado</p>
              <h2 className="text-4xl md:text-5xl">
                <span className="font-sans font-bold text-white">Como </span>
                <span className="font-display italic font-light text-[var(--app-accent)]">Funciona</span>
              </h2>
            </div>
          </Reveal>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-6">
            {/* Connecting line (desktop only) */}
            <div className="hidden lg:block absolute top-7 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {HOW_IT_WORKS_STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <Reveal key={step.title} delay={idx * 120} className="relative flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[linear-gradient(135deg,#6B6E76_0%,#F4F5F7_45%,#FFFFFF_55%,#9AA0AA_100%)] p-[1.5px] mb-5 shadow-[0_4px_18px_rgba(0,0,0,0.5)] relative z-10">
                    <div className="w-full h-full rounded-2xl bg-[#050506] flex items-center justify-center">
                      <StepIcon className="w-5 h-5 text-zinc-200" />
                    </div>
                  </div>
                  <span className="text-[9px] uppercase tracking-widest text-neutral-600 mb-1.5">Passo {idx + 1}</span>
                  <h3 className="font-display italic text-lg text-white mb-2">{step.title}</h3>
                  <p className="text-neutral-500 text-xs leading-relaxed font-light max-w-[190px]">{step.desc}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparativo — where photographers keep their work today vs FocusPortfolio */}
      <section className="py-24 border-t border-transparent relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-zinc-800/70 before:to-transparent bg-neutral-950/20">
        <div className="max-w-4xl mx-auto px-6">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-xs text-zinc-500 mb-3 font-semibold uppercase tracking-wider">Comparativo</p>
              <h2 className="text-4xl md:text-5xl">
                <span className="font-sans font-bold text-white">Feito para portfólio. </span>
                <span className="font-display italic font-light text-[var(--app-accent)]">Não para feed.</span>
              </h2>
              <p className="text-neutral-400 text-sm mt-4 leading-relaxed font-light">
                Instagram, Behance e Google Drive são ótimos para outras coisas. Para vender seu trabalho autoral com credibilidade, você precisa de mais.
              </p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="p-[1.5px] rounded-3xl bg-gradient-to-b from-zinc-700 via-zinc-600 to-zinc-900 shadow-2xl">
              <div className="chrome-hairline-top rounded-3xl border border-zinc-900 bg-[#080809] overflow-hidden">
                <div className="grid grid-cols-[1.5fr_1fr_1fr] sm:grid-cols-[2fr_1fr_1fr] border-b border-zinc-900 text-center">
                  <div className="p-5" />
                  <div className="p-3 sm:p-5 border-l border-zinc-900 flex items-center justify-center">
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-neutral-500 leading-tight">Instagram / Drive</span>
                  </div>
                  <div className="p-3 sm:p-5 border-l border-[var(--app-accent)]/20 bg-[linear-gradient(180deg,rgba(var(--app-accent-rgb),0.08)_0%,rgba(var(--app-accent-rgb),0.02)_100%)] relative overflow-hidden flex items-center justify-center gap-1.5">
                    <div className="absolute top-0 left-0 right-0 h-px bg-[linear-gradient(90deg,transparent,rgba(var(--app-accent-rgb),0.7),transparent)]" />
                    <div className="w-5 h-5 rounded-md bg-black border border-white/25 flex items-center justify-center shrink-0">
                      <Aperture className="w-3 h-3 text-zinc-200" />
                    </div>
                    <span className="font-display italic text-xs sm:text-sm bg-[linear-gradient(100deg,var(--app-accent-dim)_10%,var(--app-accent)_50%,var(--app-accent-dim)_90%)] bg-clip-text text-transparent font-semibold whitespace-nowrap">FocusPortfolio</span>
                  </div>
                </div>
                {COMPARISON_ROWS.map((row, idx) => (
                  <div key={row.label} className={`grid grid-cols-[1.5fr_1fr_1fr] sm:grid-cols-[2fr_1fr_1fr] text-center items-center group transition-colors duration-200 hover:bg-white/[0.015] ${idx !== COMPARISON_ROWS.length - 1 ? 'border-b border-zinc-900/70' : ''}`}>
                    <div className="p-4 sm:p-5 text-left">
                      <span className="text-xs text-neutral-300 font-light">{row.label}</span>
                    </div>
                    <div className="p-4 sm:p-5 border-l border-zinc-900 flex justify-center">
                      {row.others ? <Check className="w-4 h-4 text-neutral-500" /> : <Minus className="w-4 h-4 text-neutral-700" />}
                    </div>
                    <div className="p-4 sm:p-5 border-l border-[var(--app-accent)]/20 bg-[var(--app-accent)]/[0.02] flex justify-center">
                      {row.focus ? (
                        <span className="w-6 h-6 rounded-full bg-[linear-gradient(135deg,#6B6E76_0%,#F4F5F7_45%,#FFFFFF_55%,#9AA0AA_100%)] p-[1.5px] flex items-center justify-center shadow-[0_0_10px_rgba(231,233,236,0.25)]">
                          <span className="w-full h-full rounded-full bg-[#0B0C0E] flex items-center justify-center">
                            <Check className="w-3 h-3 text-zinc-100" />
                          </span>
                        </span>
                      ) : <Minus className="w-4 h-4 text-neutral-700" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Pricing Section (Three Plans: Free Trial, Pro, Vendas) */}
      <section id="planos" className="py-24 border-t border-transparent relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-zinc-800/70 before:to-transparent bg-neutral-950/20">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-xs text-zinc-500 mb-3 font-semibold uppercase tracking-wider">Valor</p>
              <h2 className="text-4xl md:text-5xl">
                <span className="font-sans font-bold text-white">Escolha Seu </span>
                <span className="font-display italic font-light text-[var(--app-accent)]">Caminho</span>
              </h2>
              <p className="text-neutral-400 text-sm mt-4 leading-relaxed font-light">
                Comece agora sem compromisso com nosso teste gratuito ou ative o plano completo para expandir sua marca.
              </p>
            </div>
          </Reveal>

          <Reveal delay={100}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Card 1: Teste Grátis */}
            <div className="rounded-3xl border border-zinc-900 bg-neutral-950/40 p-8 flex flex-col justify-between relative shadow-xl hover:border-zinc-800 transition-all">
              <div>
                <p className="text-neutral-400 text-[10px] uppercase tracking-wider font-semibold mb-2">Período de Experiência</p>
                <h3 className="text-white text-3xl font-display italic mb-4">Teste Grátis</h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-white text-4xl font-semibold tracking-tight">R$ 0</span>
                  <span className="text-neutral-500 text-xs">/ 14 dias</span>
                </div>

                <p className="text-neutral-400 text-xs leading-relaxed font-light mb-8">
                  Acesso total ao painel para estruturar seu portfólio autoral, organizar fotos, álbuns e receber propostas de orçamentos.
                </p>

                <ul className="space-y-4 text-left mb-8 text-xs font-light text-neutral-300">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span>Armazenamento de 1 GB</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span>Até 3 Álbuns Editoriais</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span>Personalização de cores do site</span>
                  </li>
                </ul>
              </div>

              <button 
                onClick={() => { window.location.href = '/cadastro'; }}
                className="w-full py-3.5 rounded-xl text-xs font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
              >
                Criar Conta Grátis
              </button>
            </div>

            {/* Card 2: Plano Pro (Anual) */}
            <div className="rounded-3xl border border-[var(--app-accent)]/30 bg-[#080809] p-8 flex flex-col justify-between relative shadow-2xl scale-105 z-10 shadow-black/80 ring-1 ring-[var(--app-accent)]/10">
              <div className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 rounded-full bg-[var(--app-accent)] text-[var(--app-accent-ink)] text-[9px] uppercase tracking-widest font-semibold shadow-md">
                MAIS VENDIDO
              </div>
              
              <div>
                <p className="text-[var(--app-accent)] text-[10px] uppercase tracking-wider font-semibold mb-2">SaaS Premium Autoral</p>
                <h3 className="text-white text-3xl font-display italic mb-4">Plano Pro</h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-white text-5xl font-semibold tracking-tight">R$ 49</span>
                  <span className="text-neutral-400 text-sm">/mês</span>
                </div>

                <p className="text-neutral-400 text-xs leading-relaxed font-light mb-8">
                  A assinatura perfeita para fotógrafos renomados que buscam fechar mais casamentos, ensaios de moda e campanhas publicitárias de luxo.
                </p>

                <ul className="space-y-4 text-left mb-8 text-xs font-light text-neutral-300">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[var(--app-accent)] shrink-0" />
                    <span className="font-medium">Armazenamento de 10 GB</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[var(--app-accent)] shrink-0" />
                    <span>Álbuns e Categorias ilimitados</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[var(--app-accent)] shrink-0" />
                    <span>Logotipo personalizado + favicon</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[var(--app-accent)] shrink-0" />
                    <span>Suporte VIP e SEO Editorial otimizado</span>
                  </li>
                </ul>
              </div>

              <button 
                onClick={() => { window.location.href = '/cadastro'; }}
                className="app-btn-accent w-full py-4 rounded-xl text-xs font-semibold transition-all hover:brightness-105 cursor-pointer"
              >
                Criar Meu Portfólio Pro
              </button>
            </div>

            {/* Card 3: Plano Venda de Fotos */}
            <div className="rounded-3xl border border-zinc-900 bg-neutral-950/40 p-8 flex flex-col justify-between relative shadow-xl hover:border-zinc-800 transition-all opacity-80">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-neutral-500 text-[10px] uppercase tracking-wider font-semibold">Commerce Integrado</p>
                  <span className="text-[8px] bg-zinc-800/80 border border-zinc-700 px-2 py-0.5 rounded text-zinc-300 tracking-widest font-sans uppercase font-semibold">EM BREVE</span>
                </div>
                <h3 className="text-white text-3xl font-display italic mb-4">Plano Vendas</h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-white text-4xl font-semibold tracking-tight">R$ 99</span>
                  <span className="text-neutral-500 text-xs">/mês</span>
                </div>

                <p className="text-neutral-500 text-xs leading-relaxed font-light mb-8">
                  Venda arquivos digitais e pacotes em alta resolução de eventos esportivos, corporativos e casamentos diretamente por galerias privadas com senha.
                </p>

                <ul className="space-y-4 text-left mb-8 text-xs font-light text-neutral-500">
                  <li className="flex items-center gap-2.5">
                    <Lock className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                    <span>Galeria comercial protegida com senha</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Lock className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                    <span>Checkout integrado via Pix e Cartão</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Lock className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                    <span>Download automático pós-pagamento</span>
                  </li>
                </ul>
              </div>

              <button 
                disabled 
                className="w-full py-3.5 rounded-xl text-xs font-semibold text-neutral-500 bg-neutral-900 border border-zinc-900 cursor-not-allowed"
              >
                Em Breve (Q3 2026)
              </button>
            </div>
          </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="flex items-center justify-center gap-2.5 mt-10 text-neutral-500">
              <ShieldCheck className="w-4 h-4 text-[var(--app-accent)]" />
              <p className="text-xs font-light">Sem fidelidade. Cancele quando quiser, direto pelo painel.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 border-t border-transparent relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-zinc-800/70 before:to-transparent">
        <div className="max-w-3xl mx-auto px-6">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-xs text-zinc-500 mb-3 font-semibold uppercase tracking-wider">Dúvidas</p>
              <h2 className="text-4xl md:text-5xl">
                <span className="font-sans font-bold text-white">Perguntas </span>
                <span className="font-display italic font-light text-[var(--app-accent)]">Frequentes</span>
              </h2>
            </div>
          </Reveal>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <Reveal key={item.q} delay={idx * 60}>
                  <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isOpen ? 'border-[var(--app-accent)]/25 bg-[var(--app-accent)]/[0.03]' : 'border-zinc-900 bg-[#080809]'}`}>
                    <button
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer"
                    >
                      <span className="text-sm font-medium text-white">{item.q}</span>
                      <ChevronDown className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[var(--app-accent)]' : ''}`} />
                    </button>
                    <div
                      className="grid transition-all duration-300 ease-out"
                      style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                    >
                      <div className="overflow-hidden">
                        <p className="px-6 pb-5 text-xs text-neutral-400 leading-relaxed font-light">{item.a}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA — the closing note of the narrative, stronger than the hero's */}
      <section className="py-28 border-t border-transparent relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-zinc-800/70 before:to-transparent overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[var(--app-accent)]/[0.03] blur-[140px] pointer-events-none" />
        <Reveal className="relative max-w-2xl mx-auto px-6 text-center">
          <Aperture className="w-10 h-10 text-[var(--app-accent)] mx-auto mb-6 opacity-70" />
          <h2 className="text-4xl sm:text-6xl tracking-tight leading-tight mb-6">
            <span className="font-sans font-bold text-white">Seu portfólio merece sair do </span>
            <span className="font-display italic font-light text-[var(--app-accent)]">rascunho hoje.</span>
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base leading-relaxed mb-10 font-light max-w-lg mx-auto">
            Comece grátis por 14 dias, sem cartão de crédito. Em poucos minutos seu trabalho está no ar, com o portfólio editorial que ele sempre mereceu.
          </p>
          <button 
            onClick={() => { window.location.href = '/cadastro'; }}
            className="app-btn-accent px-10 py-4.5 rounded-xl font-semibold active:scale-95 transition-all duration-200 cursor-pointer text-xs hover:brightness-105 inline-flex items-center gap-2"
          >
            Criar Meu Portfólio Agora <ArrowRight className="w-4 h-4" />
          </button>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-transparent relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-zinc-800/70 before:to-transparent bg-black text-neutral-500 text-xs font-sans relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-[linear-gradient(90deg,transparent_0%,rgba(231,233,236,0.25)_50%,transparent_100%)]" />
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-zinc-900">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[linear-gradient(135deg,#6B6E76_0%,#F4F5F7_45%,#FFFFFF_55%,#9AA0AA_100%)] p-[1.5px] flex items-center justify-center">
                  <div className="w-full h-full rounded-xl bg-black flex items-center justify-center">
                    <Aperture className="w-4 h-4 text-zinc-200" />
                  </div>
                </div>
                <span className="font-display italic text-xl font-light tracking-tight text-white">FocusPortfolio</span>
              </div>
              <p className="text-neutral-500 text-xs leading-relaxed max-w-xs font-light">
                O portfólio editorial para o trabalho de fotógrafos autorais. Design minimalista, curadoria visual e controle absoluto sobre o seu acervo.
              </p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-semibold mb-4">Produto</p>
              <ul className="space-y-3">
                <li><button onClick={() => handleScrollToSection('explorar')} className="hover:text-white transition-colors duration-200">Fotógrafos</button></li>
                <li><button onClick={() => handleScrollToSection('planos')} className="hover:text-white transition-colors duration-200">Planos</button></li>
                <li><button onClick={() => handleScrollToSection('faq')} className="hover:text-white transition-colors duration-200">Perguntas Frequentes</button></li>
                <li><button onClick={() => setDemoOpen(true)} className="hover:text-white transition-colors duration-200">Demonstração ao vivo</button></li>
              </ul>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-semibold mb-4">Conta</p>
              <ul className="space-y-3">
                <li><button onClick={() => { window.location.href = '/admin/login'; }} className="hover:text-white transition-colors duration-200">Painel do Fotógrafo</button></li>
                <li><button onClick={() => { window.location.href = '/cadastro'; }} className="hover:text-white transition-colors duration-200">Criar Conta Grátis</button></li>
                <li><button onClick={() => { window.location.href = '/admin/login?mode=forgot'; }} className="hover:text-white transition-colors duration-200">Esqueci Minha Senha</button></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8">
            <p className="text-neutral-600">© {new Date().getFullYear()} FocusPortfolio. Todos os direitos reservados.</p>
            <p className="text-neutral-700 text-[10px] tracking-wide">Feito com cuidado editorial, para fotógrafos autorais.</p>
          </div>
        </div>
      </footer>

      {/* FULLY FUNCTIONAL LIVE DEMO INTERACTIVE OVERLAY MODAL */}
      {demoOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-neutral-100 overflow-y-auto animate-fade-in font-sans">
          {/* Demo header bar */}
          <div className="bg-neutral-900 border-b border-zinc-800 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 sticky top-0 z-50 shadow-md">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-zinc-200 text-neutral-950 font-semibold uppercase text-[9px] tracking-wider shrink-0">MODO DEMONSTRAÇÃO</span>
              <p className="text-xs text-neutral-400 hidden sm:block">Esta é uma simulação real e interativa de um site publicado no ar.</p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
              {/* Live color customizer */}
              <div className="flex items-center gap-2 rounded-xl bg-black border border-white/5 p-1 px-2 flex-wrap">
                <Palette className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="text-[10px] text-zinc-400 font-medium hidden md:inline">Cor de destaque do site:</span>
                <div className="flex gap-1.5">
                  {[
                    { hex: '#CBD5E1', name: 'Prata Mineral' },
                    { hex: '#e7bd0f', name: 'Ouro Real' },
                    { hex: '#10B981', name: 'Esmeralda' },
                    { hex: '#3B82F6', name: 'Cobalto' },
                    { hex: '#F43F5E', name: 'Rosa Coral' }
                  ].map((color) => (
                    <button
                      key={color.hex}
                      title={color.name}
                      onClick={() => setDemoAccentColor(color.hex)}
                      className={`w-4.5 h-4.5 rounded-full border transition-transform ${demoAccentColor === color.hex ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={() => { setDemoOpen(false); setSelectedDemoAlbum(null); setSelectedDemoPhoto(null); }}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                title="Fechar Demonstração"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* SIMULATED PUBLIC PORTFOLIO VIEW — built with the SAME classes and
              CSS custom properties (--pub-*, .pub-section, .pub-btn...) as the
              real public site component, so this demo is a faithful preview
              instead of a disconnected mockup. */}
          <div
            className={`flex-1 text-[var(--pub-ink)] flex flex-col min-h-screen ${demoTheme === 'light' ? 'light-mode' : ''}`}
            style={{
              // @ts-ignore — CSS custom properties
              '--pub-accent': demoAccentColor,
              '--pub-accent-rgb': hexToRgb(demoAccentColor),
              backgroundColor: 'var(--pub-bg)'
            } as React.CSSProperties}
          >
            <div className="bg-[var(--pub-accent)]/10 border-b border-[var(--pub-border)] text-center py-2 px-4">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--pub-accent)]">
                Site Teste Beta — pré-visualização do site público
              </span>
            </div>

            {/* Navigation */}
            <nav className="h-16 pub-container w-full flex items-center justify-between border-b border-[var(--pub-border)]">
              <div className="flex flex-col">
                <span className="font-display italic text-2xl font-light text-[var(--pub-ink)] tracking-tight">Marina Duarte</span>
                <span className="text-[8px] uppercase tracking-widest text-[var(--pub-ink-muted)] font-semibold mt-1 font-sans">PORTFÓLIO EDITORIAL AUTORAL</span>
              </div>
              <div className="flex items-center gap-4 sm:gap-6 text-xs text-[var(--pub-ink-muted)]">
                <span className="hidden sm:inline hover:text-[var(--pub-ink)] cursor-pointer transition-colors">Portfólio</span>
                <span className="hidden sm:inline hover:text-[var(--pub-ink)] cursor-pointer transition-colors" onClick={() => handleScrollToSection('demo-contato')}>Orçamento</span>
                <button
                  onClick={() => setDemoTheme(t => t === 'dark' ? 'light' : 'dark')}
                  className="w-8 h-8 rounded-full border border-[var(--pub-border)] flex items-center justify-center text-[var(--pub-ink-muted)] hover:text-[var(--pub-ink)] hover:border-[var(--pub-border-strong)] transition-colors"
                  aria-label="Alternar tema"
                >
                  {demoTheme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                </button>
              </div>
            </nav>

            {/* Hero Section */}
            <header className="pub-section pt-20 pb-0 text-center max-w-4xl mx-auto px-6">
              <p className="pub-section__eyebrow">Exemplo de site publicado</p>
              <h2 className="font-display italic text-4xl sm:text-6xl text-[var(--pub-ink)] tracking-tight leading-tight mb-6">
                Narrativas de alta costura, retratos arquetípicos e luz editorial expressiva.
              </h2>
              <p className="text-[var(--pub-ink-muted)] text-xs sm:text-sm font-light max-w-xl mx-auto leading-relaxed">
                Fotógrafo autoral baseado em São Paulo. Exploro as sombras brutas do asfalto, a complexidade silenciosa do olhar contemporâneo e texturas orgânicas.
              </p>
            </header>

            {/* Specialties — same section as "O Que Eu Capturo" on the real public site */}
            <section className="pub-section bg-[var(--pub-bg-elevated)]" id="demo-especialidades">
              <div className="pub-container">
                <div className="text-center mb-16">
                  <p className="pub-section__eyebrow">Especialidades</p>
                  <h2 className="pub-section__title mb-0">O Que Eu Capturo</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {DEMO_CATEGORIES.map((cat) => (
                    <div
                      key={cat.id}
                      className="relative rounded-3xl overflow-hidden aspect-[3/4] w-full bg-[#0B0C0E] border border-[var(--pub-border)] group shadow-xl transition-all duration-500 hover:border-[var(--pub-accent)]/40"
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/95 z-10" />
                      <img src={cat.url} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                      <div className="absolute inset-0 z-20 p-8 flex flex-col justify-end">
                        <span className="text-xs font-sans text-[var(--pub-accent)] mb-2 font-medium">Especialidade</span>
                        <h3 className="font-display italic text-2xl text-white mb-3 font-medium">{cat.name}</h3>
                        <p className="text-neutral-300 text-xs leading-relaxed line-clamp-3 opacity-90">{cat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Category selection */}
            <div className="pub-container w-full mb-12 mt-12">
              <div className="flex justify-center flex-wrap gap-2.5">
                {['Todos', 'Retratos', 'Editorial', 'Arquitetura'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setDemoCategory(cat)}
                    className={`pub-btn ${demoCategory === cat ? 'pub-btn-primary' : 'pub-btn-outline'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Albums Grid — mirrors the real public site: album
                cards with a cover photo, category tag and photo count,
                opening into a photo grid overlay instead of one flat wall
                of images. */}
            <div className="pub-container w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-24">
              {filteredDemoAlbums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => setSelectedDemoAlbum(album)}
                  className="group relative rounded-2xl overflow-hidden aspect-[3/4] bg-[var(--pub-surface)] border border-[var(--pub-border)] text-left cursor-pointer shadow-lg hover:border-[var(--pub-border-strong)] transition-all duration-300"
                >
                  <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent flex flex-col justify-end p-6">
                    <span className="text-[9px] uppercase tracking-wider font-semibold mb-1.5 text-[var(--pub-accent)]">{album.category}</span>
                    <h3 className="font-display italic text-2xl text-white mb-1">{album.title}</h3>
                    <span className="text-[10px] text-white/50 font-sans">{album.photo_count} fotos</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Album Photo Grid Overlay — same pattern as the real public
                site's album detail view. */}
            {selectedDemoAlbum && (
              <div
                className="fixed inset-0 z-[55] bg-neutral-950/98 overflow-y-auto px-6 py-16 animate-fade-in font-sans"
                onClick={() => setSelectedDemoAlbum(null)}
              >
                <div className="max-w-5xl mx-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-neutral-800 pb-6 mb-10 gap-4">
                    <div>
                      <span
                        className="inline-block px-3 py-1 rounded-full text-xs font-sans mb-3 font-medium"
                        style={{ backgroundColor: demoAccentColor, color: '#0F172A' }}
                      >
                        {selectedDemoAlbum.category}
                      </span>
                      <h2 className="font-display italic text-3xl md:text-5xl text-white leading-tight font-medium mb-3">
                        {selectedDemoAlbum.title}
                      </h2>
                      <p className="text-neutral-400 text-sm max-w-2xl font-light leading-relaxed">
                        {selectedDemoAlbum.description}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedDemoAlbum(null)}
                      className="px-5 py-2.5 rounded-xl text-xs font-sans bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer self-start"
                    >
                      Voltar ao portfólio
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {selectedDemoAlbum.photos.map((photo) => (
                      <button
                        key={photo.id}
                        onClick={() => setSelectedDemoPhoto(photo)}
                        className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-[#0B0C0E] border border-neutral-800 group shadow-md hover:border-neutral-600 transition-all cursor-pointer"
                      >
                        <img
                          src={photo.url}
                          alt={photo.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity text-left">
                          <p className="text-white text-xs font-medium font-display italic">{photo.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Testimonials — same interactive slider style as the real public site */}
            <section className="pub-section bg-[var(--pub-bg-elevated)]" id="demo-depoimentos">
              <div className="pub-container max-w-4xl">
                <div className="text-center mb-12">
                  <p className="pub-section__eyebrow">Reconhecimento</p>
                  <h2 className="pub-section__title mb-0">Depoimentos dos Clientes</h2>
                </div>
                <div className="relative p-8 md:p-14 rounded-3xl border border-[var(--pub-border)] bg-[var(--pub-bg)] text-center shadow-xl overflow-hidden glass-card">
                  <Quote className="w-12 h-12 text-[var(--pub-accent)]/25 mx-auto mb-6" />
                  <div className="min-h-[140px] flex flex-col justify-center">
                    <p className="font-display italic text-lg md:text-2xl leading-relaxed text-white/90 mb-8 font-light">
                      "{DEMO_TESTIMONIALS[demoTestimonialIdx].content}"
                    </p>
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      {Array.from({ length: DEMO_TESTIMONIALS[demoTestimonialIdx].rating }).map((_, idx) => (
                        <Star key={idx} className="w-4 h-4 fill-[var(--pub-accent)] text-[var(--pub-accent)]" />
                      ))}
                    </div>
                    <p className="font-sans text-xs text-[var(--pub-accent)] font-medium">
                      — {DEMO_TESTIMONIALS[demoTestimonialIdx].client_name}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-10">
                    <button
                      onClick={() => setDemoTestimonialIdx((demoTestimonialIdx - 1 + DEMO_TESTIMONIALS.length) % DEMO_TESTIMONIALS.length)}
                      className="w-10 h-10 rounded-full border border-[var(--pub-border)] flex items-center justify-center text-neutral-400 hover:text-white hover:border-white transition-all duration-200"
                      aria-label="Anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-sans text-xs text-neutral-500">
                      {demoTestimonialIdx + 1} de {DEMO_TESTIMONIALS.length}
                    </span>
                    <button
                      onClick={() => setDemoTestimonialIdx((demoTestimonialIdx + 1) % DEMO_TESTIMONIALS.length)}
                      className="w-10 h-10 rounded-full border border-[var(--pub-border)] flex items-center justify-center text-neutral-400 hover:text-white hover:border-white transition-all duration-200"
                      aria-label="Próximo"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Simulated Contact Form */}
            <section id="demo-contato" className="pub-section pt-20 border-t border-[var(--pub-border)] bg-[var(--pub-bg-elevated)] relative">
              <div className="max-w-xl mx-auto px-6 text-center">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-[var(--pub-accent)]/10 border border-[var(--pub-border)] mb-6">
                  <Calendar className="w-5 h-5 text-[var(--pub-accent)]" />
                </div>
                <h3 className="font-display italic text-3xl text-[var(--pub-ink)] mb-2">Solicitar Orçamento de Ensaio</h3>
                <p className="text-[var(--pub-ink-muted)] text-xs mb-8">Experimente preencher e enviar o formulário interativo de proposta.</p>

                {demoProposalSent ? (
                  <div className="p-6 rounded-2xl glass-card text-center animate-fade-in">
                    <Sparkles className="w-8 h-8 mx-auto mb-3 text-[var(--pub-accent)]" />
                    <p className="text-[var(--pub-ink)] text-sm font-semibold mb-1">Proposta Simulada Enviada com Sucesso!</p>
                    <p className="text-[var(--pub-ink-muted)] text-xs leading-relaxed">No painel real, Marina Duarte receberia este Lead de orçamento imediatamente por e-mail e aba de Depoimentos/Orçamentos.</p>
                  </div>
                ) : (
                  <form onSubmit={handleDemoProposalSubmit} className="space-y-4 text-left">
                    <div>
                      <label className="block text-[10px] uppercase text-[var(--pub-ink-muted)] mb-1.5 font-semibold">Seu Nome</label>
                      <input 
                        type="text" 
                        value={demoProposalName}
                        onChange={(e) => setDemoProposalName(e.target.value)}
                        required 
                        placeholder="Ex: Gabriela Duarte"
                        className="w-full px-4 py-3 rounded-xl bg-[var(--pub-surface)] border border-[var(--pub-border)] text-[var(--pub-ink)] text-sm outline-none focus:border-[var(--pub-accent)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-[var(--pub-ink-muted)] mb-1.5 font-semibold">Data Proposta</label>
                      <input 
                        type="date" 
                        required 
                        className="w-full px-4 py-3 rounded-xl bg-[var(--pub-surface)] border border-[var(--pub-border)] text-[var(--pub-ink)] text-sm outline-none focus:border-[var(--pub-accent)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-[var(--pub-ink-muted)] mb-1.5 font-semibold">Mensagem / Ideia do Ensaio</label>
                      <textarea 
                        rows={3}
                        required
                        placeholder="Ex: Ensaio de retrato corporativo editorial focado no estilo clássico..."
                        className="w-full px-4 py-3 rounded-xl bg-[var(--pub-surface)] border border-[var(--pub-border)] text-[var(--pub-ink)] text-sm outline-none resize-none focus:border-[var(--pub-accent)] transition-all"
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="pub-btn pub-btn-primary w-full py-3.5"
                    >
                      <Send className="w-3.5 h-3.5" /> Enviar Mensagem de Teste
                    </button>
                  </form>
                )}
              </div>
            </section>

            {/* Footer — same treatment as the real public site */}
            <footer className="bg-neutral-950 border-t border-[var(--pub-border)] pt-14 pb-8 mt-auto">
              <div className="pub-container flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <span className="font-display italic text-lg text-[var(--pub-ink)]">Marina Duarte</span>
                <p className="text-[10px] text-[var(--pub-ink-muted)] font-sans">Prévia gerada apenas para fins de demonstração — sem vínculo com pessoas reais.</p>
              </div>
            </footer>
          </div>

          {/* Lightbox for Selected Photo */}
          {selectedDemoPhoto && (
            <div 
              className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-6"
              onClick={() => setSelectedDemoPhoto(null)}
            >
              <div 
                className="relative max-w-3xl w-full bg-neutral-950 border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-4"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={() => setSelectedDemoPhoto(null)}
                  className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors p-1.5 rounded-full bg-black/50 border border-white/5 z-10"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black border border-white/5">
                  <img src={selectedDemoPhoto.url} className="w-full h-full object-cover" />
                </div>
                <div className="px-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: demoAccentColor }}>{selectedDemoPhoto.category}</span>
                  <h3 className="font-display italic text-2xl text-white mt-1">{selectedDemoPhoto.title}</h3>
                  <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed font-light">{selectedDemoPhoto.description}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
