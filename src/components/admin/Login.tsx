/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Globe, ArrowLeft, KeyRound, Sparkles } from 'lucide-react';

interface LoginProps {
  initialMode?: 'login' | 'signup';
  onLoginSuccess: (userId: string) => void;
  onNavigateHome: () => void;
}

export default function Login({ initialMode = 'login', onLoginSuccess, onNavigateHome }: LoginProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  
  // Login & Shared states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);

  // Sign Up states
  const [fullName, setFullName] = useState('');
  const [portfolioSlug, setPortfolioSlug] = useState('');

  // Sync mode with prop changes (e.g. navigation from landing page)
  useEffect(() => {
    setMode(initialMode);
    setErrorMsg('');
    setSuccessMsg('');
  }, [initialMode]);

  // Auto generate slug from name
  useEffect(() => {
    if (mode === 'signup') {
      const generated = fullName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents
        .replace(/[^a-z0-9\s-]/g, '')    // remove special characters
        .trim()
        .replace(/\s+/g, '-');          // spaces to dashes
      setPortfolioSlug(generated);
    }
  }, [fullName, mode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        setErrorMsg(translateError(error.message));
        setSubmitting(false);
        return;
      }

      if (data.user) {
        onLoginSuccess(data.user.id);
      }
    } catch (err) {
      console.error('Error during login:', err);
      setErrorMsg('Erro interno ao tentar fazer login.');
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Por favor, informe seu nome completo.');
      return;
    }
    if (!portfolioSlug.trim()) {
      setErrorMsg('Escolha um link para seu portfólio.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Check if slug is already taken
      const { data: existingSlug } = await supabase
        .from('photographers')
        .select('id')
        .eq('slug', portfolioSlug.trim().toLowerCase())
        .maybeSingle();

      if (existingSlug) {
        setErrorMsg('Este link de portfólio já está em uso por outro fotógrafo. Escolha outro.');
        setSubmitting(false);
        return;
      }

      // 2. Perform Supabase Auth SignUp
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password
      });

      if (error) {
        setErrorMsg(translateError(error.message));
        setSubmitting(false);
        return;
      }

      if (data.user) {
        // Save pending signup info to local storage so AdminPanel can retrieve them once authenticated
        localStorage.setItem('pending_signup_fullname', fullName.trim());
        localStorage.setItem('pending_signup_slug', portfolioSlug.trim().toLowerCase());

        // Try to insert the photographer profile immediately (will work if auto-login is active/email confirmation disabled)
        const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        const { error: profileError } = await supabase
          .from('photographers')
          .insert({
            id: data.user.id,
            name: fullName.trim(),
            slug: portfolioSlug.trim().toLowerCase(),
            bio: `Olá! Eu sou ${fullName.trim()}, fotógrafo autoral focado em criar narrativas cinematográficas de alto nível.`,
            experience_years: 5,
            specialties: ['Editorial', 'Retrato', 'Moda'],
            plan: 'trial',
            trial_ends_at: trialEndsAt
          });

        if (!profileError) {
          // If profile insert succeeded, also try to insert default site settings
          await supabase
            .from('site_settings')
            .insert({
              photographer_id: data.user.id,
              avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300&h=300',
              primary_color: '#CBD5E1', // nice clean slate
              instagram_handle: '',
              whatsapp_number: ''
            });
        }

        // If a session is returned, the user is logged in immediately.
        // If no session is returned, it means they need to confirm their email address first.
        if (data.session) {
          onLoginSuccess(data.user.id);
        } else {
          setSuccessMsg('Cadastro realizado com sucesso! Por favor, verifique seu e-mail para confirmar a conta e acessar o painel.');
          setSubmitting(false);
        }
      }
    } catch (err: any) {
      console.error('Error during signup:', err);
      setErrorMsg(err.message || 'Erro interno ao realizar cadastro.');
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + '/admin/login',
      });

      if (error) {
        setErrorMsg(translateError(error.message));
      } else {
        setSuccessMsg('Se este e-mail estiver cadastrado, enviamos as instruções para recuperação de senha.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao tentar enviar recuperação de senha.');
    } finally {
      setSubmitting(false);
    }
  };

  const translateError = (msg: string) => {
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
    if (msg.includes('User already registered') || msg.includes('already exists')) return 'Este e-mail já está cadastrado na plataforma.';
    if (msg.includes('Password should be')) return 'A senha deve conter pelo menos 6 caracteres.';
    return 'Ocorreu um erro. Verifique os dados e tente novamente.';
  };

  return (
    <div className="min-h-screen bg-[#050506] text-neutral-100 font-sans relative overflow-hidden lg:grid lg:grid-cols-2">
      {/* Ambient lighting — two light masses at opposite corners (top-left /
          bottom-right) instead of one centered glow: reads more like a real
          studio setup with light falling in from a corner, and gives the
          chrome arcs below somewhere purposeful to sit instead of colliding
          in the middle. Static — no scroll-tied reveal here. */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-[22%] -left-[16%] w-[640px] h-[640px] rounded-full blur-[150px] mix-blend-screen"
          style={{ background: 'radial-gradient(circle, rgba(214,220,228,0.16) 0%, rgba(120,128,140,0.08) 45%, transparent 72%)' }}
        />
        <div
          className="absolute -top-[10%] -left-[4%] w-[360px] h-[360px] rounded-full blur-[120px] mix-blend-screen opacity-90"
          style={{ background: 'radial-gradient(circle, rgba(244,247,250,0.36) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-[20%] -right-[12%] w-[460px] h-[460px] rounded-full blur-[130px] opacity-50"
          style={{ background: 'radial-gradient(circle, rgba(52,57,64,0.45) 0%, transparent 70%)' }}
        />

        {/* Chrome arcs — one glinting off the top-left corner, its mirror off
            the bottom-right, echoing the light masses above instead of
            converging into a centered ring. */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1920 800" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="loginRingArcA" gradientUnits="userSpaceOnUse" x1="-260" y1="360" x2="300" y2="-260">
              <stop offset="0%" stopColor="#fff" stopOpacity="0" />
              <stop offset="30%" stopColor="#e4e9ee" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="loginRingArcB" gradientUnits="userSpaceOnUse" x1="2180" y1="440" x2="1620" y2="1060">
              <stop offset="0%" stopColor="#fff" stopOpacity="0" />
              <stop offset="30%" stopColor="#e2e7ec" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#f8fafb" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Top-left corner arc — circle centered just off-canvas up-left */}
          <path d="M -260 360 A 520 520 0 0 1 300 -260" fill="none" stroke="url(#loginRingArcA)" strokeWidth="34" strokeLinecap="round" className="blur-[26px]" />
          <path d="M -250 355 A 525 525 0 0 1 305 -265" fill="none" stroke="url(#loginRingArcA)" strokeWidth="11" strokeLinecap="round" className="blur-[5px]" />
          {/* Bottom-right corner arc — mirrored, circle just off-canvas down-right */}
          <path d="M 2180 440 A 520 520 0 0 1 1620 1060" fill="none" stroke="url(#loginRingArcB)" strokeWidth="30" strokeLinecap="round" className="blur-[24px]" />
          <path d="M 2170 435 A 525 525 0 0 1 1615 1065" fill="none" stroke="url(#loginRingArcB)" strokeWidth="9" strokeLinecap="round" className="blur-[4px]" />
        </svg>
        <div
          className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='ln'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23ln)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      {/* Left brand panel — desktop only, and sticky: if the right column's
          form content ever needs to scroll (a long error message, a small
          viewport), this panel stays put instead of scrolling away with it. */}
      <div className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen relative flex-col justify-between p-14 xl:p-20 border-r border-white/5 overflow-hidden">
        <img src="/focus-logo-metallic.png" alt="FocusPortfolio" className="h-6 w-auto shrink-0 object-contain relative z-10" loading="eager" />

        <div className="relative z-10 max-w-md">
          <h2 className="leading-[1.08] tracking-tight mb-6">
            <span className="block text-4xl xl:text-[2.75rem] font-sans font-extrabold text-white tracking-tighter">Sua marca merece</span>
            <span className="block text-4xl xl:text-[2.75rem] font-display italic font-light bg-[image:var(--app-accent-gradient)] bg-clip-text text-transparent">uma moldura à altura.</span>
          </h2>
          <p className="text-neutral-400 text-sm font-light leading-relaxed max-w-sm">
            O mesmo painel elegante e minimalista que seus clientes veem no seu portfólio — agora nas suas mãos, para cuidar de cada detalhe do seu acervo autoral.
          </p>
        </div>

        <div className="relative z-10 h-1" />
      </div>

      {/* Right column — the auth card itself. Scrolls independently from the
          sticky left panel above, on a lightly-tinted glass surface so the
          ambient light behind it still shows through instead of sitting on
          a flat black block. */}
      <div className="flex flex-col items-center justify-center lg:justify-start p-6 relative lg:h-screen lg:overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl border border-white/[0.06] bg-white/[0.025] p-8 md:p-10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl relative overflow-hidden animate-fade-in my-10">
        {/* Top edge sheen — a thin metallic highlight along the card's top
            border, the same quiet "brushed aluminum" cue used on cards
            throughout the landing page. */}
        <div className="absolute top-0 inset-x-0 h-px bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.35)_50%,transparent_100%)]" />
        {/* Brand Header — no boxed icon badge; the eyebrow + wordmark carry
            the identity instead of a bordered square container. */}
        <div className="flex flex-col items-center text-center mb-9 relative">
          <img src="/focus-mark.png" alt="" className="lg:hidden w-8 h-8 object-contain shrink-0 mb-5 opacity-90" />
          <h1 className="leading-tight">
            <span className="font-sans font-extrabold text-white tracking-tighter text-2xl">
              {mode === 'login' ? 'Entrar no ' : mode === 'signup' ? 'Criar Meu ' : 'Recuperar '}
            </span>
            <span className="font-display italic font-light text-2xl bg-[image:var(--app-accent-gradient)] bg-clip-text text-transparent">
              {mode === 'login' ? 'Painel' : mode === 'signup' ? 'Portfólio' : 'Senha'}
            </span>
          </h1>
          <p className={`text-xs text-neutral-400 mt-2.5 font-light ${mode === 'login' ? 'sm:whitespace-nowrap' : 'max-w-[300px]'}`}>
            {mode === 'login' 
              ? 'Acesse e gerencie suas obras com curadoria autoral.' 
              : mode === 'signup' 
                ? 'Registre-se hoje e ganhe 14 dias de teste grátis.'
                : 'Insira seu e-mail para redefinir seu acesso com segurança.'}
          </p>
        </div>

        {/* Dynamic Mode Switcher Bar */}
        {mode !== 'forgot' && (
          <div className="flex rounded-xl bg-black border border-white/5 p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${mode === 'login' ? 'app-btn-accent' : 'text-neutral-400 hover:text-white'}`}
            >
              Fazer Login
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${mode === 'signup' ? 'app-btn-accent' : 'text-neutral-400 hover:text-white'}`}
            >
              Criar Conta (Grátis)
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-xs text-red-400 text-center leading-relaxed">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs text-emerald-400 text-center leading-relaxed">
            {successMsg}
          </div>
        )}

        {/* Mode Forms */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-2 font-medium">E-mail</label>
              <input 
                type="email" 
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] focus:ring-1 focus:ring-[var(--app-accent)]/10 transition-all duration-200"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs text-neutral-400 font-medium">Senha</label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 font-sans cursor-pointer transition-all"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <input 
                type="password" 
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                placeholder="Sua senha"
                className="w-full px-4 py-3 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] focus:ring-1 focus:ring-[var(--app-accent)]/10 transition-all duration-200"
              />
            </div>

            <label className="flex items-center gap-2.5 py-1 cursor-pointer select-none w-fit">
              <input
                type="checkbox"
                checked={keepLoggedIn}
                onChange={(e) => setKeepLoggedIn(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-[#E4E4E7] cursor-pointer"
              />
              <span className="text-[11px] text-neutral-500 font-sans">Manter-me conectado neste dispositivo</span>
            </label>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full mt-2 py-4 rounded-xl text-xs font-semibold app-btn-accent active:scale-95 shadow-[0_8px_30px_-8px_rgba(var(--app-accent-rgb),0.55)] hover:shadow-[0_10px_36px_-6px_rgba(var(--app-accent-rgb),0.7)] transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Entrando...' : 'Entrar no Painel'}
            </button>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-2 font-medium">Nome Completo</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required 
                placeholder="Ex: Marina Duarte"
                className="w-full px-4 py-3 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] focus:ring-1 focus:ring-[var(--app-accent)]/10 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-2 font-medium">Link Personalizado do Portfólio</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-medium">focusportfolio.com/p/</span>
                <input 
                  type="text" 
                  value={portfolioSlug}
                  onChange={(e) => setPortfolioSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                  required 
                  placeholder="marina-duarte"
                  className="w-full pl-36 pr-4 py-3 rounded-xl bg-black border border-white/5 text-neutral-200 text-xs outline-none focus:border-[var(--app-accent)] transition-all"
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1.5 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Endereço público exclusivo para divulgar aos seus clientes.
              </p>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-2 font-medium">E-mail Profissional</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] focus:ring-1 focus:ring-[var(--app-accent)]/10 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-2 font-medium">Senha de Acesso</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-3 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] focus:ring-1 focus:ring-[var(--app-accent)]/10 transition-all duration-200"
              />
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full mt-2 py-4 rounded-xl text-xs font-semibold app-btn-accent active:scale-95 shadow-[0_8px_30px_-8px_rgba(var(--app-accent-rgb),0.55)] hover:shadow-[0_10px_36px_-6px_rgba(var(--app-accent-rgb),0.7)] transition-all duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {submitting ? 'Criando Portfólio...' : 'Criar Meu Portfólio (14 dias Grátis)'}
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-2 font-medium">Seu E-mail Cadastrado</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] focus:ring-1 focus:ring-[var(--app-accent)]/10 transition-all duration-200"
              />
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full py-4 rounded-xl text-xs font-semibold app-btn-accent active:scale-95 shadow-[0_8px_30px_-8px_rgba(var(--app-accent-rgb),0.55)] hover:shadow-[0_10px_36px_-6px_rgba(var(--app-accent-rgb),0.7)] transition-all duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              {submitting ? 'Enviando...' : 'Enviar Link de Redefinição'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              className="w-full py-3 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o Login
            </button>
          </form>
        )}

        {/* Footer actions */}
        <div className="mt-8 pt-6 border-t border-zinc-900 flex justify-between items-center text-xs text-neutral-500 font-sans">
          <button onClick={onNavigateHome} className="hover:text-neutral-300 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar à home
          </button>
          
          {mode === 'login' ? (
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Quero me cadastrar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Já possuo conta
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
