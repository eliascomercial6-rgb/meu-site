/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Photo, Category } from '../../../types';
import { getPlanLimits, PlanLimits } from '../../../lib/plan-limits';
import { 
  Plus, Upload, Trash, Trash2, RotateCcw, 
  CheckSquare, Square, Pencil, Check, Sparkles, X, ChevronDown, Lock
} from 'lucide-react';

// crypto.randomUUID() requires a "secure context" (HTTPS or localhost) and a
// modern browser. It's undefined on some webviews / older browsers / plain
// HTTP previews, which is what was throwing "crypto.randomUUID is not a
// function". This fallback keeps working everywhere.
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface FotosTabProps {
  userId: string;
  onShowToast: (message: string, isError?: boolean) => void;
}

export default function FotosTab({ userId, onShowToast }: FotosTabProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');

  // Plan / trial limits — fetched fresh so uploads always respect the
  // photographer's CURRENT plan, not a stale global constant.
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [storageUsedBytes, setStorageUsedBytes] = useState(0);

  // Selected item tracking
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Upload fields
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploading, setUploading] = useState(false);

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editIsPublished, setEditIsPublished] = useState(true);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Load photos & categories
  const loadPhotos = async () => {
    try {
      setLoading(true);
      setSelectedIds(new Set());

      let query = supabase
        .from('photos')
        .select('*, categories(name)')
        .eq('photographer_id', userId);

      if (activeTab === 'active') {
        query = query.is('deleted_at', null);
      } else {
        query = query.not('deleted_at', 'is', null);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        onShowToast('Erro ao carregar acervo.', true);
        return;
      }
      setPhotos(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, [userId, activeTab]);

  // Load the photographer's plan/trial info + their CURRENT total storage
  // usage (this photographer only) so uploads can be limited correctly.
  const loadPlanAndUsage = async () => {
    try {
      const { data: photographer } = await supabase
        .from('photographers')
        .select('trial_ends_at, plan, created_at')
        .eq('id', userId)
        .maybeSingle();

      setPlanLimits(getPlanLimits(photographer));

      const { data: sizeRows } = await supabase
        .from('photos')
        .select('file_size_bytes')
        .eq('photographer_id', userId)
        .is('deleted_at', null);

      const totalBytes = (sizeRows || []).reduce((acc, p) => acc + (p.file_size_bytes || 0), 0);
      setStorageUsedBytes(totalBytes);
    } catch (err) {
      console.error('Error loading plan/usage:', err);
    }
  };

  useEffect(() => {
    loadPlanAndUsage();
  }, [userId]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const { data } = await supabase
          .from('categories')
          .select('*')
          .eq('photographer_id', userId)
          .order('sort_order', { ascending: true });
        
        if (data) setCategories(data);
      } catch (err) {
        console.error(err);
      }
    }
    loadCategories();
  }, [userId]);

  // Selection helpers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === photos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(photos.map(p => p.id)));
    }
  };

  // Upload Logic (Canvas Compression Client-side)
  const resizeAndCompress = (file: File, maxDimension: number, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round(height * (maxDimension / width));
            width = maxDimension;
          } else {
            width = Math.round(width * (maxDimension / height));
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas conversion failed'));
          }, 'image/jpeg', quality);
        } else {
          reject(new Error('Canvas context unavailable'));
        }
      };
      img.onerror = () => reject(new Error('Image reading failed'));
    });
  };

  const handleFileUploads = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    // Re-check plan/usage right before uploading so the limit is never stale.
    await loadPlanAndUsage();

    if (planLimits?.isExpired) {
      onShowToast('Seu teste grátis de 14 dias expirou. Faça upgrade do seu plano para continuar enviando fotos.', true);
      e.target.value = '';
      return;
    }

    const limitBytes = (planLimits?.storageLimitGB ?? 1) * 1024 ** 3;
    const incomingBytes = files.reduce((acc, f) => acc + f.size, 0);

    if (storageUsedBytes + incomingBytes > limitBytes) {
      const limitGb = (planLimits?.storageLimitGB ?? 1).toFixed(0);
      onShowToast(
        `Envio bloqueado: isso ultrapassaria o limite de ${limitGb} GB do seu plano${planLimits?.isTrial ? ' de teste grátis' : ''}. Libere espaço na lixeira ou faça upgrade.`,
        true
      );
      e.target.value = '';
      return;
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Processando ${i + 1} de ${files.length}...`);

      try {
        // Compress Original (2000px, 0.82) and Thumbnail (800px, 0.85)
        const originalBlob = await resizeAndCompress(file, 2000, 0.82);
        const thumbBlob = await resizeAndCompress(file, 800, 0.85);

        const filename = `${generateUUID()}.jpg`;
        const originalPath = `${userId}/${filename}`;
        const thumbPath = `${userId}/thumb_${filename}`;

        // Upload Original
        const { error: uploadOrigError } = await supabase.storage
          .from('photos')
          .upload(originalPath, originalBlob, { contentType: 'image/jpeg', upsert: false });

        if (uploadOrigError) throw uploadOrigError;

        // Upload Thumbnail
        const { error: uploadThumbError } = await supabase.storage
          .from('photos')
          .upload(thumbPath, thumbBlob, { contentType: 'image/jpeg', upsert: false });

        if (uploadThumbError) {
          // Rollback original if thumbnail fails
          await supabase.storage.from('photos').remove([originalPath]);
          throw uploadThumbError;
        }

        // Retrieve public URLs
        const origUrl = supabase.storage.from('photos').getPublicUrl(originalPath).data.publicUrl;
        const thumbUrl = supabase.storage.from('photos').getPublicUrl(thumbPath).data.publicUrl;

        // Insert database record
        const { error: dbError } = await supabase
          .from('photos')
          .insert({
            photographer_id: userId,
            category_id: selectedCategoryId || null,
            title: file.name.replace(/\.[^.]+$/, ''),
            description: '',
            image_url: origUrl,
            thumbnail_url: thumbUrl,
            storage_path: originalPath,
            file_size_bytes: originalBlob.size,
            is_published: true
          });

        if (dbError) {
          // Cleanup storage if database register fails
          await supabase.storage.from('photos').remove([originalPath, thumbPath]);
          throw dbError;
        }

        successCount++;
      } catch (err) {
        console.error('Error uploading photo:', err);
        failCount++;
      }
    }

    setUploading(false);
    setUploadProgress('');
    
    if (failCount > 0) {
      onShowToast(`${successCount} fotos enviadas. ${failCount} falharam.`, true);
    } else {
      onShowToast(`${successCount} fotos enviadas com sucesso!`);
    }

    loadPhotos();
    loadPlanAndUsage();
  };

  // Move to trash
  const handleMoveToTrash = async (id: string) => {
    try {
      const { error } = await supabase
        .from('photos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      onShowToast('Foto movida para a lixeira.');
      loadPhotos();
    } catch (err: any) {
      onShowToast('Erro ao mover foto para lixeira.', true);
    }
  };

  // Restore from trash
  const handleRestore = async (id: string) => {
    try {
      const { error } = await supabase
        .from('photos')
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw error;
      onShowToast('Foto restaurada do lixo.');
      loadPhotos();
    } catch (err) {
      onShowToast('Erro ao restaurar foto.', true);
    }
  };

  // Delete forever
  const handleDeleteForever = async (photo: Photo) => {
    const confirm = window.confirm('Deseja excluir DEFINITIVAMENTE esta imagem do servidor e do acervo? Esta ação não pode ser desfeita.');
    if (!confirm) return;

    try {
      // 1. Remove storage files
      const thumbPath = photo.storage_path.replace(/^([^/]+)\//, '$1/thumb_');
      await supabase.storage.from('photos').remove([photo.storage_path, thumbPath]);

      // 2. Remove database row
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', photo.id);

      if (error) throw error;
      onShowToast('Foto excluída permanentemente.');
      loadPhotos();
      loadPlanAndUsage();
    } catch (err) {
      onShowToast('Erro ao excluir imagem.', true);
    }
  };

  // Bulk operations
  const handleBulkTrash = async () => {
    const confirm = window.confirm(`Deseja mover as ${selectedIds.size} fotos selecionadas para a lixeira?`);
    if (!confirm) return;

    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('photos')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;
      onShowToast(`${ids.length} fotos movidas para a lixeira.`);
      loadPhotos();
    } catch (err) {
      onShowToast('Erro ao mover lote para a lixeira.', true);
    }
  };

  const handleBulkRestore = async () => {
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('photos')
        .update({ deleted_at: null })
        .in('id', ids);

      if (error) throw error;
      onShowToast(`${ids.length} fotos restauradas com sucesso.`);
      loadPhotos();
    } catch (err) {
      onShowToast('Erro ao restaurar lote.', true);
    }
  };

  const handleBulkDeleteForever = async () => {
    const confirm = window.confirm(`Deseja EXCLUIR DEFINITIVAMENTE as ${selectedIds.size} fotos selecionadas? Esta ação remove os arquivos de forma permanente e não pode ser desfeita.`);
    if (!confirm) return;

    try {
      const selectedPhotos = photos.filter(p => selectedIds.has(p.id));
      const filePaths: string[] = [];

      selectedPhotos.forEach(p => {
        const thumbPath = p.storage_path.replace(/^([^/]+)\//, '$1/thumb_');
        filePaths.push(p.storage_path, thumbPath);
      });

      // Remove from storage
      await supabase.storage.from('photos').remove(filePaths);

      // Remove database registers
      const ids = selectedPhotos.map(p => p.id);
      const { error } = await supabase
        .from('photos')
        .delete()
        .in('id', ids);

      if (error) throw error;
      onShowToast(`${ids.length} fotos excluídas definitivamente.`);
      loadPhotos();
      loadPlanAndUsage();
    } catch (err) {
      onShowToast('Erro ao excluir lote definitivamente.', true);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (photo: Photo) => {
    setEditingPhoto(photo);
    setEditTitle(photo.title || '');
    setEditDescription(photo.description || '');
    setEditCategoryId(photo.category_id || '');
    setEditIsPublished(photo.is_published);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingPhoto(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto) return;

    setSubmittingEdit(true);
    try {
      const { error } = await supabase
        .from('photos')
        .update({
          title: editTitle.trim() || null,
          description: editDescription.trim() || null,
          category_id: editCategoryId || null,
          is_published: editIsPublished
        })
        .eq('id', editingPhoto.id);

      if (error) throw error;
      onShowToast('Metadados da foto atualizados.');
      handleCloseEditModal();
      loadPhotos();
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao salvar alterações.', true);
    } finally {
      setSubmittingEdit(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Header and triggers */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Toggle filters */}
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${activeTab === 'active' ? 'bg-white text-neutral-950 shadow-sm' : 'bg-white/5 border border-white/5 hover:bg-white/10 text-neutral-400 hover:text-white'}`}
          >
            Ativas
          </button>
          <button 
            onClick={() => setActiveTab('trash')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${activeTab === 'trash' ? 'bg-white text-neutral-950 shadow-sm' : 'bg-white/5 border border-white/5 hover:bg-white/10 text-neutral-400 hover:text-white'}`}
          >
            Lixeira
          </button>
          <button 
            onClick={handleSelectAll}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all duration-200 flex items-center gap-1.5"
          >
            {selectedIds.size === photos.length && photos.length > 0 ? (
              <><Square className="w-3.5 h-3.5" /> Desmarcar tudo</>
            ) : (
              <><CheckSquare className="w-3.5 h-3.5" /> Selecionar tudo</>
            )}
          </button>
        </div>

        {/* Upload inputs */}
        {activeTab === 'active' && (
          <div className="flex flex-col items-end gap-2 w-full md:w-auto">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <select 
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/5 text-neutral-200 text-xs outline-none focus:border-[var(--app-accent)] select-refined"
              >
                <option value="">Sem categoria</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <label className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 select-none ${
                planLimits?.isExpired
                  ? 'bg-neutral-900 border border-white/5 text-neutral-500 cursor-not-allowed'
                  : 'app-btn-accent cursor-pointer'
              }`}>
                {planLimits?.isExpired ? <Lock className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                {planLimits?.isExpired ? 'Teste grátis expirado' : 'Enviar fotos'}
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  onChange={handleFileUploads}
                  disabled={uploading || planLimits?.isExpired}
                  className="hidden" 
                />
              </label>
            </div>

            {planLimits && (
              <p className={`text-[10px] font-sans uppercase tracking-wider mt-1.5 pr-1 ${planLimits.isExpired ? 'text-red-400' : planLimits.isTrial ? 'text-zinc-400' : 'text-neutral-500'}`}>
                {planLimits.isExpired
                  ? 'Faça upgrade para voltar a enviar fotos'
                  : planLimits.isTrial
                    ? `Teste grátis · ${planLimits.daysLeft} ${planLimits.daysLeft === 1 ? 'dia restante' : 'dias restantes'} · ${(storageUsedBytes / 1024 ** 3).toFixed(2)} / ${planLimits.storageLimitGB} GB`
                    : `${(storageUsedBytes / 1024 ** 3).toFixed(2)} / ${planLimits.storageLimitGB} GB usados`}
              </p>
            )}
          </div>
        )}
      </div>

      {uploadProgress && (
        <p className="text-xs font-sans text-zinc-300 tracking-wide animate-pulse">{uploadProgress}</p>
      )}

      {/* Bulk actions banner bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300">
          <span className="font-sans">{selectedIds.size} {selectedIds.size === 1 ? 'foto selecionada' : 'fotos selecionadas'}</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-lg border border-white/5 hover:bg-white/10 text-neutral-300 transition-colors"
            >
              Limpar Seleção
            </button>
            {activeTab === 'active' ? (
              <button 
                onClick={handleBulkTrash}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 flex items-center gap-1"
              >
                <Trash className="w-3.5 h-3.5" /> Enviar à lixeira
              </button>
            ) : (
              <>
                <button 
                  onClick={handleBulkRestore}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                </button>
                <button 
                  onClick={handleBulkDeleteForever}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir permanentemente
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Grid Display */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[var(--app-accent)] animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
          <Sparkles className="w-8 h-8 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-500 text-xs">
            {activeTab === 'active' ? 'Nenhuma foto enviada ainda.' : 'A lixeira está vazia.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {photos.map((photo) => {
            const isSelected = selectedIds.has(photo.id);
            return (
              <div 
                key={photo.id}
                className={`group relative rounded-xl overflow-hidden border p-[2px] transition-all duration-300 ${isSelected ? 'border-white bg-white/10 shadow-lg' : 'border-white/5 hover:border-white/15 bg-neutral-950/40'}`}
              >
                {/* Checkbox trigger overlay */}
                <button 
                  type="button"
                  onClick={() => handleToggleSelect(photo.id)}
                  className="absolute top-2 left-2 z-20 w-5 h-5 rounded bg-black/60 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </button>

                <div className="aspect-square rounded-lg overflow-hidden relative">
                  <img 
                    src={photo.thumbnail_url} 
                    alt={photo.title || ''} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {photo.is_published && activeTab === 'active' && (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[8px] font-sans uppercase bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-semibold tracking-wider">
                      Publicada
                    </span>
                  )}
                </div>

                <div className="p-3 space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-200 truncate">{photo.title || '(Sem título)'}</h4>
                    {photo.categories?.name && (
                      <span className="text-[9px] font-sans text-neutral-500 uppercase tracking-wider">{photo.categories.name}</span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    {activeTab === 'active' ? (
                      <>
                        <button 
                          onClick={() => handleOpenEditModal(photo)}
                          className="flex-1 py-1.5 rounded bg-white/5 border border-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors flex items-center justify-center gap-1 text-xs font-medium"
                        >
                          <Pencil className="w-3 h-3" /> Editar
                        </button>
                        <button 
                          onClick={() => handleMoveToTrash(photo.id)}
                          className="p-1.5 rounded bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 text-red-400 transition-colors"
                          title="Lixeira"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleRestore(photo.id)}
                          className="flex-1 py-1.5 rounded bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 text-emerald-400 transition-colors flex items-center justify-center gap-1 text-xs font-medium"
                        >
                          <RotateCcw className="w-3 h-3" /> Restaurar
                        </button>
                        <button 
                          onClick={() => handleDeleteForever(photo)}
                          className="p-1.5 rounded bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 text-red-400 transition-colors"
                          title="Excluir Definitivo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Meta Modal */}
      {editModalOpen && editingPhoto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-sm px-6 pt-12 md:pt-24 overflow-y-auto" onClick={handleCloseEditModal}>
          <div className="w-full max-w-md bg-neutral-950 border border-white/10 rounded-2xl shadow-2xl p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={handleCloseEditModal}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-display italic text-2xl text-white mb-6">Editar Foto</h3>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-2">Título</label>
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-2">Descrição (opcional)</label>
                <textarea 
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none resize-none focus:border-[var(--app-accent)] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-2">Categoria</label>
                <select 
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] select-refined"
                >
                  <option value="">Sem categoria</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 py-2">
                <input 
                  type="checkbox" 
                  id="edit-pub-check"
                  checked={editIsPublished}
                  onChange={(e) => setEditIsPublished(e.target.checked)}
                  className="w-4 h-4 accent-[#E4E4E7] cursor-pointer"
                />
                <label htmlFor="edit-pub-check" className="text-sm text-neutral-300 select-none cursor-pointer">
                  Disponível para exibição no site público
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={submittingEdit}
                  className="px-4 py-2 rounded-xl text-xs font-semibold app-btn-accent transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submittingEdit ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
