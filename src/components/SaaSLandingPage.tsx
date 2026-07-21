/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
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
  Quote,
  Star
} from 'lucide-react';

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

// Fictional demo testimonials — invented client names, not tied to any real person.
const DEMO_TESTIMONIALS = [
  { id: 'dt-1', client_name: 'Camila R.', rating: 5, content: 'Um olhar autoral raro. Cada imagem parecia já ter sido pensada antes mesmo do clique.' },
  { id: 'dt-2', client_name: 'Estúdio Nortis', rating: 5, content: 'Processo profissional do início ao fim, com uma sensibilidade visual fora da curva.' },
  { id: 'dt-3', client_name: 'Bruno T.', rating: 4, content: 'Entrega rápida e um cuidado enorme com a narrativa de cada ensaio.' }
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
  const [demoTheme, setDemoTheme] = useState<'dark' | 'light'>('dark');
  const [demoTestimonialIdx, setDemoTestimonialIdx] = useState(0);

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

  // Filtered demo photos
  const filteredDemoPhotos = demoCategory === 'Todos'
    ? DEMO_PHOTOS
    : DEMO_PHOTOS.filter(p => p.category === demoCategory);

  return (
    <div className="min-h-screen bg-[#050506] text-neutral-100 font-sans selection:bg-white/10 selection:text-zinc-200 overflow-x-hidden relative">
      {/* Chrome hairline at the very top */}
      <div className="fixed bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--app-accent)]/60 to-transparent z-50" />

      {/* Decorative Glowing Orbs */}
      <div className="absolute top-[-10%] left-[20%] w-[520px] h-[520px] rounded-full bg-[var(--app-accent)]/[0.018] blur-[130px] pointer-events-none" />
      <div className="absolute top-[35%] right-[-10%] w-[440px] h-[440px] rounded-full bg-zinc-900/[0.025] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-10%] w-[360px] h-[360px] rounded-full bg-[var(--app-accent)]/[0.018] blur-[110px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/[0.06] bg-black/80 backdrop-blur-xl sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[linear-gradient(135deg,#6B6E76_0%,#F4F5F7_45%,#FFFFFF_55%,#9AA0AA_100%)] p-[1px] flex items-center justify-center shadow-[0_0_18px_rgba(231,233,236,0.25)]">
              <div className="w-full h-full rounded-xl bg-black flex items-center justify-center">
                <Aperture className="w-5 h-5 text-zinc-200" />
              </div>
            </div>
            <span className="font-display italic text-2xl font-light tracking-tight text-white">FocusPortfolio</span>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => { window.location.href = '/admin/login'; }}
              className="text-neutral-400 hover:text-white font-medium text-sm transition-colors duration-200"
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
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase font-sans text-zinc-300 tracking-widest mb-8 font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
            <span className="app-badge-dot animate-pulse" /> Curadoria Visual de Alta Performance
          </div>
          <h1 className="font-display italic text-5xl sm:text-7xl md:text-8xl text-white font-normal tracking-tight leading-[1.05] mb-8">
            Seu trabalho merece uma <br className="hidden md:inline" />{' '}
            <span className="bg-[linear-gradient(100deg,var(--app-accent-dim)_10%,var(--app-accent)_50%,var(--app-accent-dim)_90%)] bg-clip-text text-transparent">
              Moldura Editorial.
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
        </div>

        {/* Decorative Grid Line Shadow / Main Graphic */}
        <div className="mt-20 relative max-w-5xl mx-auto aspect-[16/10] rounded-3xl border border-zinc-900 bg-[#080809] overflow-hidden p-[1px] shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--app-accent)]/[0.04] to-transparent pointer-events-none z-10" />
          <div className="w-full h-full bg-[#050506] rounded-3xl flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0F0F10_1px,transparent_1px),linear-gradient(to_bottom,#0F0F10_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-80" />
            
            <div className="relative z-10 max-w-2xl">
              <Aperture className="w-12 h-12 text-[var(--app-accent)] mx-auto mb-6 opacity-70" />
              <h3 className="font-display italic text-3xl md:text-4xl text-white mb-4">Veja a Plataforma em Ação</h3>
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
      </section>

      {/* Photographer Discovery section */}
      <section id="explorar" className="py-24 border-t border-zinc-900 bg-black/40 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <p className="text-xs text-zinc-500 mb-3 font-semibold uppercase tracking-wider">Conecte-se</p>
            <h2 className="font-display italic text-4xl md:text-5xl text-white">Fotógrafos na Plataforma</h2>
            <p className="text-neutral-400 text-sm mt-4 leading-relaxed font-light">
              Explore os portfólios autorais criados em nossa plataforma por profissionais de renome.
            </p>
          </div>

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
        <div className="text-center max-w-2xl mx-auto mb-20">
          <p className="text-xs text-zinc-500 mb-3 font-semibold uppercase tracking-wider">Diferenciais</p>
          <h2 className="font-display italic text-4xl md:text-5xl text-white">Criado por fotógrafos, para fotógrafos.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Differential 1 */}
          <div className="p-[1px] bg-gradient-to-b from-zinc-700 via-zinc-500 to-zinc-900 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.6)] transition-all duration-300 hover:from-[var(--app-accent)] hover:via-[var(--app-accent-dim)] hover:to-zinc-700 group relative">
            <div className="p-8 h-full rounded-2xl bg-[#080809] flex flex-col justify-between aspect-square">
              <LayoutGrid className="w-10 h-10 text-[var(--app-accent)] group-hover:scale-110 transition-transform duration-300" />
              <div>
                <h3 className="font-display italic text-2xl text-white mb-2">Reel Editorial</h3>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed font-light">
                  Suas fotos organizadas em um grid assimétrico cuidadosamente balanceado, valorizando composições verticais e horizontais em perfeita sintonia artística.
                </p>
              </div>
            </div>
          </div>
          
          {/* Differential 2 */}
          <div className="p-[1px] bg-gradient-to-b from-zinc-700 via-zinc-500 to-zinc-900 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.6)] transition-all duration-300 hover:from-[var(--app-accent)] hover:via-[var(--app-accent-dim)] hover:to-zinc-700 group relative">
            <div className="p-8 h-full rounded-2xl bg-[#080809] flex flex-col justify-between aspect-square">
              <Settings className="w-10 h-10 text-[var(--app-accent)] group-hover:rotate-45 transition-transform duration-500" />
              <div>
                <h3 className="font-display italic text-2xl text-white mb-2">Marca Autoral</h3>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed font-light">
                  Customize seu logo, favicon, retrato pessoal de perfil e escolha sua cor de destaque (Hex) para garantir uma identidade visual totalmente coesa e refinada.
                </p>
              </div>
            </div>
          </div>

          {/* Differential 3 */}
          <div className="p-[1px] bg-gradient-to-b from-zinc-700 via-zinc-500 to-zinc-900 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.6)] transition-all duration-300 hover:from-[var(--app-accent)] hover:via-[var(--app-accent-dim)] hover:to-zinc-700 group relative">
            <div className="p-8 h-full rounded-2xl bg-[#080809] flex flex-col justify-between aspect-square">
              <Award className="w-10 h-10 text-[var(--app-accent)] group-hover:scale-110 transition-transform duration-300" />
              <div>
                <h3 className="font-display italic text-2xl text-white mb-2">Prova Social</h3>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed font-light">
                  Exiba depoimentos reais de seus clientes com classificação de estrelas elegante, agregando imenso prestígio e atração para fechamento de novos orçamentos de valor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (Three Plans: Free Trial, Pro, Vendas) */}
      <section id="planos" className="py-24 border-t border-zinc-900 bg-neutral-950/20 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs text-zinc-500 mb-3 font-semibold uppercase tracking-wider">Valor</p>
            <h2 className="font-display italic text-4xl md:text-5xl text-white">Escolha Seu Caminho</h2>
            <p className="text-neutral-400 text-sm mt-4 leading-relaxed font-light">
              Comece agora sem compromisso com nosso teste gratuito ou ative o plano completo para expandir sua marca.
            </p>
          </div>

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
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 bg-black text-neutral-500 text-center text-xs font-sans">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} FocusPortfolio. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <button onClick={() => { window.location.href = '/admin/login'; }} className="hover:text-white transition-colors duration-200">Painel do Fotógrafo</button>
            <span className="text-neutral-800">|</span>
            <button onClick={() => { window.location.href = '/admin/login?mode=forgot'; }} className="hover:text-white transition-colors duration-200 text-neutral-500">Esqueci Minha Senha</button>
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
                onClick={() => setDemoOpen(false)}
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

            {/* Simulated Grid list of Photos */}
            <div className="pub-container w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-24">
              {filteredDemoPhotos.map((photo) => (
                <div 
                  key={photo.id}
                  onClick={() => setSelectedDemoPhoto(photo)}
                  className="group relative rounded-2xl overflow-hidden aspect-[3/4] bg-[var(--pub-surface)] border border-[var(--pub-border)] cursor-pointer shadow-lg hover:border-[var(--pub-border-strong)] transition-all duration-300"
                >
                  <img src={photo.url} alt={photo.title} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent flex flex-col justify-end p-6">
                    <span className="text-[9px] uppercase tracking-wider font-semibold mb-1.5 text-[var(--pub-accent)]">{photo.category}</span>
                    <h3 className="font-display italic text-2xl text-white">{photo.title}</h3>
                  </div>
                </div>
              ))}
            </div>

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
