/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Aperture, Globe, ArrowLeft, KeyRound, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050506] text-neutral-100 font-sans p-6 relative">
      {/* Decorative premium silver subtle lighting */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-zinc-700/[0.03] blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md rounded-3xl border border-zinc-900 bg-neutral-950/90 p-8 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[linear-gradient(135deg,#6B6E76_0%,#F4F5F7_45%,#FFFFFF_55%,#9AA0AA_100%)] p-[1px] flex items-center justify-center mb-4 shadow-[0_4px_15px_rgba(0,0,0,0.4)]">
            <div className="w-full h-full rounded-2xl bg-black flex items-center justify-center">
              <Aperture className="w-6 h-6 text-zinc-200" />
            </div>
          </div>
          
          <p className="text-[10px] tracking-widest text-zinc-500 font-semibold uppercase font-sans mb-1">Moldura Editorial</p>
          <h1 className="font-display italic text-3xl text-white font-normal">
            {mode === 'login' ? 'Entrar no Painel' : mode === 'signup' ? 'Criar Meu Portfólio' : 'Recuperar Senha'}
          </h1>
          <p className="text-xs text-neutral-400 mt-2 font-light">
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

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full mt-2 py-4 rounded-xl text-xs font-semibold app-btn-accent active:scale-95 transition-all duration-200 disabled:opacity-50 cursor-pointer"
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
              className="w-full mt-2 py-4 rounded-xl text-xs font-semibold app-btn-accent active:scale-95 transition-all duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
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
              className="w-full py-4 rounded-xl text-xs font-semibold app-btn-accent active:scale-95 transition-all duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
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
  );
}
