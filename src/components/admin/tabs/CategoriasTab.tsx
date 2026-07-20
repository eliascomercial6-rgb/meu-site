/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Category } from '../../../types';
import { Plus, X, Pencil, Trash, Sparkles, Check } from 'lucide-react';

interface CategoriasTabProps {
  userId: string;
  onShowToast: (message: string, isError?: boolean) => void;
}

export default function CategoriasTab({ userId, onShowToast }: CategoriasTabProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const refreshCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('photographer_id', userId)
        .order('sort_order', { ascending: true });

      if (error) {
        onShowToast('Erro ao carregar categorias.', true);
        return;
      }
      setCategories(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCategories();
  }, [userId]);

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleOpenModal = (cat: Category | null = null) => {
    if (cat) {
      setCategoryId(cat.id);
      setName(cat.name);
      setDescription(cat.description || '');
    } else {
      setCategoryId('');
      setName('');
      setDescription('');
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setCategoryId('');
    setName('');
    setDescription('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    const slug = slugify(name);

    try {
      if (categoryId) {
        // Update category
        const { error } = await supabase
          .from('categories')
          .update({ name: name.trim(), slug, description: description.trim() || null })
          .eq('id', categoryId);

        if (error) throw error;
        onShowToast('Categoria atualizada com sucesso.');
      } else {
        // Create category
        const { error } = await supabase
          .from('categories')
          .insert({
            photographer_id: userId,
            name: name.trim(),
            slug,
            description: description.trim() || null
          });

        if (error) throw error;
        onShowToast('Categoria cadastrada com sucesso.');
      }
      handleCloseModal();
      refreshCategories();
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Erro ao salvar categoria.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirm = window.confirm(`Tem certeza que deseja excluir a categoria "${name}"? As fotos vinculadas a ela não serão apagadas, mas perderão a referência de categoria.`);
    if (!confirm) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      onShowToast('Categoria removida com sucesso.');
      refreshCategories();
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Erro ao remover categoria.', true);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-display italic text-white font-medium">Categorias</h2>
        <button 
          onClick={() => handleOpenModal()}
          className="px-4 py-2 rounded-xl text-xs font-semibold app-btn-accent transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Nova Categoria
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[var(--app-accent)] animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
          <Sparkles className="w-8 h-8 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-500 font-sans text-xs">Nenhuma categoria cadastrada ainda.</p>
        </div>
      ) : (
        <div className="border border-white/5 bg-neutral-950/20 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-neutral-950/40">
                <th className="p-4 text-[10px] font-sans uppercase text-neutral-500 tracking-wider">Nome</th>
                <th className="p-4 text-[10px] font-sans uppercase text-neutral-500 tracking-wider">Slug</th>
                <th className="p-4 text-[10px] font-sans uppercase text-neutral-500 tracking-wider">Descrição (SaaS / Card)</th>
                <th className="p-4 text-[10px] font-sans uppercase text-neutral-500 tracking-wider w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                  <td className="p-4 font-medium text-neutral-200">{cat.name}</td>
                  <td className="p-4 text-neutral-400 font-sans text-xs">{cat.slug}</td>
                  <td className="p-4 text-neutral-500 max-w-xs truncate">
                    {cat.description ? (
                      cat.description.startsWith('http') ? (
                        <span className="text-zinc-300 text-xs font-medium border border-white/10 bg-white/5 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                          <Check className="w-3 h-3" /> Especialidade com Capa
                        </span>
                      ) : (
                        cat.description
                      )
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-4 flex gap-2">
                    <button 
                      onClick={() => handleOpenModal(cat)}
                      className="p-1.5 rounded bg-white/5 border border-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(cat.id, cat.name)}
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

      {/* Category Modal */}
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
              {categoryId ? 'Editar Categoria' : 'Nova Categoria'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-2">Nome</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                  placeholder="Ex: Casamentos, Ensaios, Street"
                  className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-2">Descrição / Capa da Especialidade</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Registros espontâneos, fotos externas ou insira uma URL de imagem direta para ser a capa do card na landing page."
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none resize-none focus:border-[var(--app-accent)] transition-all"
                />
                <p className="text-[10px] font-sans text-neutral-500 mt-1.5 leading-relaxed">
                  Para customizar a imagem de fundo do card desta especialidade no site público, digite ou cole uma URL completa começando com `http` neste campo.
                </p>
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
