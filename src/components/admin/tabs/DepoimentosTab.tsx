/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Testimonial } from '../../../types';
import { Plus, X, Pencil, Trash, Sparkles, Star } from 'lucide-react';

interface DepoimentosTabProps {
  userId: string;
  onShowToast: (message: string, isError?: boolean) => void;
}

export default function DepoimentosTab({ userId, onShowToast }: DepoimentosTabProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testimonialId, setTestimonialId] = useState('');
  const [clientName, setClientName] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState<number | ''>('');
  const [isPublished, setIsPublished] = useState(false);

  const refreshTestimonials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('photographer_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        onShowToast('Erro ao carregar depoimentos.', true);
        return;
      }
      setTestimonials(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshTestimonials();
  }, [userId]);

  const handleOpenModal = (t: Testimonial | null = null) => {
    if (t) {
      setTestimonialId(t.id);
      setClientName(t.client_name);
      setContent(t.content);
      setRating(t.rating || '');
      setIsPublished(t.is_published);
    } else {
      setTestimonialId('');
      setClientName('');
      setContent('');
      setRating(5);
      setIsPublished(true);
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setTestimonialId('');
    setClientName('');
    setContent('');
    setRating('');
    setIsPublished(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !content.trim()) return;

    setSubmitting(true);

    const fields = {
      client_name: clientName.trim(),
      content: content.trim(),
      rating: rating === '' ? null : Number(rating),
      is_published: isPublished
    };

    try {
      if (testimonialId) {
        // Update
        const { error } = await supabase
          .from('testimonials')
          .update(fields)
          .eq('id', testimonialId);

        if (error) throw error;
        onShowToast('Depoimento atualizado.');
      } else {
        // Insert
        const { error } = await supabase
          .from('testimonials')
          .insert({
            photographer_id: userId,
            ...fields
          });

        if (error) throw error;
        onShowToast('Depoimento cadastrado com sucesso.');
      }
      handleCloseModal();
      refreshTestimonials();
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Erro ao salvar depoimento.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirm = window.confirm(`Deseja mesmo remover o depoimento de "${name}"?`);
    if (!confirm) return;

    try {
      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      onShowToast('Depoimento excluído.');
      refreshTestimonials();
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Erro ao deletar depoimento.', true);
    }
  };

  const handleTogglePublish = async (t: Testimonial) => {
    try {
      const { error } = await supabase
        .from('testimonials')
        .update({ is_published: !t.is_published })
        .eq('id', t.id);

      if (error) throw error;
      onShowToast(t.is_published ? 'Depoimento ocultado do site.' : 'Depoimento publicado no site!');
      refreshTestimonials();
    } catch (err: any) {
      console.error(err);
      onShowToast('Erro ao atualizar status de publicação.', true);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-display italic text-white font-medium">Depoimentos</h2>
        <button 
          onClick={() => handleOpenModal()}
          className="px-4 py-2 rounded-xl text-xs font-semibold app-btn-accent transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Novo Depoimento
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[var(--app-accent)] animate-spin" />
        </div>
      ) : testimonials.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
          <Sparkles className="w-8 h-8 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-500 font-sans text-xs">Nenhum depoimento cadastrado.</p>
        </div>
      ) : (
        <div className="border border-white/5 bg-neutral-950/20 rounded-2xl overflow-x-auto shadow-sm">
          <table className="w-full text-left border-collapse text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-white/5 bg-neutral-950/40">
                <th className="p-4 text-[10px] font-sans uppercase text-neutral-500 tracking-wider">Cliente</th>
                <th className="p-4 text-[10px] font-sans uppercase text-neutral-500 tracking-wider">Conteúdo</th>
                <th className="p-4 text-[10px] font-sans uppercase text-neutral-500 tracking-wider">Estrelas</th>
                <th className="p-4 text-[10px] font-sans uppercase text-neutral-500 tracking-wider w-28">Status</th>
                <th className="p-4 text-[10px] font-sans uppercase text-neutral-500 tracking-wider w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {testimonials.map((t) => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                  <td className="p-4 font-medium text-neutral-200">{t.client_name}</td>
                  <td className="p-4 text-neutral-400 italic max-w-sm truncate">"{t.content}"</td>
                  <td className="p-4">
                    {t.rating ? (
                      <div className="flex gap-0.5 text-zinc-300">
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-[var(--app-accent)] text-[var(--app-accent)]" />
                        ))}
                      </div>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    <button 
                      onClick={() => handleTogglePublish(t)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-sans tracking-wider uppercase border ${
                        t.is_published 
                          ? 'border-[var(--app-accent)]/30 bg-[var(--app-accent)]/10 text-[var(--app-accent)] hover:bg-[var(--app-accent)]/15' 
                          : 'border-white/5 bg-white/5 text-neutral-500 hover:bg-white/10'
                      }`}
                    >
                      {t.is_published ? 'Publicado' : 'Rascunho'}
                    </button>
                  </td>
                  <td className="p-4 flex gap-2">
                    <button 
                      onClick={() => handleOpenModal(t)}
                      className="p-1.5 rounded bg-white/5 border border-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(t.id, t.client_name)}
                      className="p-1.5 rounded bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 text-red-400 transition-colors"
                      title="Excluir"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-sm px-6 pt-12 md:pt-24 overflow-y-auto" onClick={handleCloseModal}>
          <div className="w-full max-w-md bg-neutral-950 border border-white/10 rounded-2xl shadow-2xl p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-display italic text-2xl text-white mb-6">
              {testimonialId ? 'Editar Depoimento' : 'Novo Depoimento'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-2">Nome do Cliente</label>
                <input 
                  type="text" 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required 
                  placeholder="Ex: Ana Maria & Lucas"
                  className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-2">Depoimento</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required 
                  placeholder="Ex: Amamos o ensaio! Cada foto expressa exatamente quem nós somos, ficamos muito emocionados..."
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none resize-none focus:border-[var(--app-accent)] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-2">Avaliação (1 a 5 estrelas)</label>
                <input 
                  type="number" 
                  min={1}
                  max={5}
                  value={rating}
                  onChange={(e) => setRating(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="5"
                  className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] transition-all"
                />
              </div>

              <div className="flex items-center gap-3 py-2">
                <input 
                  type="checkbox" 
                  id="pub-check"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 accent-[#E4E4E7] cursor-pointer"
                />
                <label htmlFor="pub-check" className="text-sm text-neutral-300 select-none cursor-pointer">
                  Publicar imediatamente no site público
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold app-btn-accent transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
