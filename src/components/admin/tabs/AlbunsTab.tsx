/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Album, Category, Photo } from '../../../types';
import { Plus, X, Pencil, Trash, Sparkles, FolderHeart, Image as ImageIcon, Check } from 'lucide-react';

interface AlbunsTabProps {
  userId: string;
  onShowToast: (message: string, isError?: boolean) => void;
}

export default function AlbunsTab({ userId, onShowToast }: AlbunsTabProps) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availablePhotos, setAvailablePhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form fields
  const [albumId, setAlbumId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [coverPhotoId, setCoverPhotoId] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  // Cover Selection Overlay
  const [coverSelectOpen, setCoverSelectOpen] = useState(false);

  // Photo organizer modal (manage album photos)
  const [organizerOpen, setOrganizerOpen] = useState(false);
  const [organizerAlbum, setOrganizerAlbum] = useState<Album | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<Photo[]>([]);
  const [unlinkedPhotos, setUnlinkedPhotos] = useState<Photo[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      // 1. Load categories
      const categoriesRes = await supabase
        .from('categories')
        .select('*')
        .eq('photographer_id', userId)
        .order('sort_order', { ascending: true });
      if (categoriesRes.data) setCategories(categoriesRes.data);

      // 2. Load photos for covers
      const photosRes = await supabase
        .from('photos')
        .select('*')
        .eq('photographer_id', userId)
        .is('deleted_at', null);
      if (photosRes.data) setAvailablePhotos(photosRes.data);

      // 3. Load albums
      const { data: albumsData, error } = await supabase
        .from('albums')
        .select('*, categories(name)')
        .eq('photographer_id', userId)
        .order('sort_order', { ascending: true });

      if (error) {
        onShowToast('Erro ao carregar álbuns.', true);
        return;
      }

      // Enrich albums count and cover URLs in batch
      const albumsRaw = albumsData || [];
      if (albumsRaw.length > 0 && photosRes.data) {
        const photoMap = Object.fromEntries(photosRes.data.map(p => [p.id, p]));
        const photoList = photosRes.data;

        const enriched = albumsRaw.map(album => {
          const aPhotos = photoList.filter(p => p.album_id === album.id);
          const cover = photoMap[album.cover_photo_id || ''] || aPhotos[0] || null;
          return {
            ...album,
            photo_count: aPhotos.length,
            cover_url: cover?.thumbnail_url || undefined
          };
        });
        setAlbums(enriched);
      } else {
        setAlbums(albumsRaw as any);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleOpenModal = (album: Album | null = null) => {
    if (album) {
      setAlbumId(album.id);
      setTitle(album.title);
      setDescription(album.description || '');
      setCategoryId(album.category_id || '');
      setCoverPhotoId(album.cover_photo_id || '');
      setIsPublished(album.is_published);
    } else {
      setAlbumId('');
      setTitle('');
      setDescription('');
      setCategoryId('');
      setCoverPhotoId('');
      setIsPublished(true);
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setAlbumId('');
    setTitle('');
    setDescription('');
    setCategoryId('');
    setCoverPhotoId('');
    setIsPublished(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    const fields = {
      title: title.trim(),
      description: description.trim() || null,
      category_id: categoryId || null,
      cover_photo_id: coverPhotoId || null,
      is_published: isPublished
    };

    try {
      if (albumId) {
        // Update
        const { error } = await supabase
          .from('albums')
          .update(fields)
          .eq('id', albumId);

        if (error) throw error;
        onShowToast('Álbum atualizado com sucesso.');
      } else {
        // Create
        const { error } = await supabase
          .from('albums')
          .insert({
            photographer_id: userId,
            ...fields
          });

        if (error) throw error;
        onShowToast('Álbum criado com sucesso.');
      }
      handleCloseModal();
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao salvar álbum.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const confirm = window.confirm(`Deseja mesmo remover o álbum "${title}"? As fotos associadas a ele não serão apagadas, mas perderão a referência de álbum.`);
    if (!confirm) return;

    try {
      const { error } = await supabase
        .from('albums')
        .delete()
        .eq('id', id);

      if (error) throw error;
      onShowToast('Álbum removido com sucesso.');
      loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao remover álbum.', true);
    }
  };

  // --- Photo organizer logic ---
  const handleOpenOrganizer = async (album: Album) => {
    setOrganizerAlbum(album);
    setOrganizerOpen(true);
    await refreshOrganizerPhotos(album.id);
  };

  const refreshOrganizerPhotos = async (id: string) => {
    try {
      const { data: allPhotos } = await supabase
        .from('photos')
        .select('*')
        .eq('photographer_id', userId)
        .is('deleted_at', null);

      if (allPhotos) {
        setAlbumPhotos(allPhotos.filter(p => p.album_id === id));
        setUnlinkedPhotos(allPhotos.filter(p => !p.album_id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLinkPhoto = async (photoId: string) => {
    if (!organizerAlbum) return;
    try {
      const { error } = await supabase
        .from('photos')
        .update({ album_id: organizerAlbum.id })
        .eq('id', photoId);

      if (error) throw error;
      await refreshOrganizerPhotos(organizerAlbum.id);
      loadData();
    } catch (err) {
      onShowToast('Erro ao associar foto.', true);
    }
  };

  const handleUnlinkPhoto = async (photoId: string) => {
    if (!organizerAlbum) return;
    try {
      const { error } = await supabase
        .from('photos')
        .update({ album_id: null })
        .eq('id', photoId);

      if (error) throw error;
      await refreshOrganizerPhotos(organizerAlbum.id);
      loadData();
    } catch (err) {
      onShowToast('Erro ao desvincular foto.', true);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-display italic text-white font-medium">Álbuns Editoriais</h2>
        <button 
          onClick={() => handleOpenModal()}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-950 bg-gradient-to-b from-white via-zinc-200 to-zinc-300 hover:from-white hover:via-zinc-100 hover:to-zinc-200 border border-zinc-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_1.5px_3px_rgba(0,0,0,0.15)] transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-zinc-950" /> Novo Álbum
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[var(--app-accent)] animate-spin" />
        </div>
      ) : albums.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
          <Sparkles className="w-8 h-8 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-500 font-sans text-xs">Nenhum álbum editorial cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {albums.map((album) => (
            <div 
              key={album.id}
              className="group relative rounded-2xl border border-white/5 bg-neutral-950/40 overflow-hidden flex flex-col justify-between"
            >
              <div className="aspect-[3/2] w-full bg-neutral-900 relative overflow-hidden">
                {album.cover_url ? (
                  <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-neutral-900 to-neutral-950 flex flex-col items-center justify-center text-neutral-600">
                    <FolderHeart className="w-10 h-10 mb-2 opacity-50" />
                    <span className="text-[10px] font-sans tracking-widest text-neutral-500">SEM CAPA</span>
                  </div>
                )}
                
                {/* Publish tag */}
                <span className={`absolute top-3 right-3 px-2 py-0.5 rounded text-[8px] font-sans uppercase border tracking-wider font-semibold ${album.is_published ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-neutral-400'}`}>
                  {album.is_published ? 'Publicado' : 'Rascunho'}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <h3 className="font-display italic text-2xl text-white font-medium truncate">{album.title}</h3>
                    <span className="text-[10px] font-sans text-neutral-500 shrink-0">{album.photo_count || 0} FOTOS</span>
                  </div>
                  {album.categories?.name && (
                    <span className="text-xs text-zinc-400 font-medium tracking-wide block mb-4">{album.categories.name}</span>
                  )}
                  <p className="text-neutral-400 text-xs leading-relaxed line-clamp-2 font-light mb-6">
                    {album.description || 'Álbum autoral de fotografias.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <button 
                    onClick={() => handleOpenOrganizer(album)}
                    className="w-full py-2 rounded-xl text-xs font-semibold text-neutral-300 bg-white/5 border border-white/10 hover:border-white/20 hover:text-white transition-all flex items-center justify-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Organizar Fotos
                  </button>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenModal(album)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold text-neutral-300 bg-white/5 border border-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
                    >
                      Editar Metadados
                    </button>
                    <button 
                      onClick={() => handleDelete(album.id, album.title)}
                      className="p-2 rounded-xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 text-red-400 transition-colors"
                      title="Excluir"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Album Creation/Edit Modal */}
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
              {albumId ? 'Editar Álbum' : 'Novo Álbum'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-2">Título do Álbum</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required 
                  placeholder="Ex: Editorial Streetwear São Paulo"
                  className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-2">Descrição</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Campanha de Outono focada no minimalismo urbano e cores sóbrias..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none resize-none focus:border-[var(--app-accent)] transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-2">Categoria</label>
                  <select 
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-200 text-sm outline-none focus:border-[var(--app-accent)] select-refined animate-fade-in"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-2">Capa do Álbum</label>
                  <button 
                    type="button" 
                    onClick={() => setCoverSelectOpen(true)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/5 text-neutral-400 text-xs text-left outline-none hover:bg-white/[0.02] flex justify-between items-center"
                  >
                    {coverPhotoId ? 'Foto Selecionada' : 'Escolher Foto'}
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 py-2">
                <input 
                  type="checkbox" 
                  id="album-pub-check"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 accent-[#E4E4E7] cursor-pointer"
                />
                <label htmlFor="album-pub-check" className="text-sm text-neutral-300 select-none cursor-pointer">
                  Publicar álbum e torná-lo visível no site público
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold app-btn-accent transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cover Selector Overlay Modal */}
      {coverSelectOpen && (() => {
        const albumPhotosOnly = albumId 
          ? availablePhotos.filter(photo => photo.album_id === albumId)
          : [];
        return (
          <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/85 backdrop-blur-md px-6 pt-12 md:pt-24 overflow-y-auto" onClick={() => setCoverSelectOpen(false)}>
            <div className="w-full max-w-2xl bg-neutral-950 border border-white/10 rounded-2xl shadow-2xl p-6 relative" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setCoverSelectOpen(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="font-display italic text-2xl text-white mb-2">Escolher Foto de Capa</h3>
              <p className="text-xs text-neutral-400 mb-6">Apenas fotos associadas a este álbum podem ser usadas como capa.</p>

              {!albumId ? (
                <div className="py-12 text-center max-w-md mx-auto">
                  <p className="text-neutral-400 font-sans text-sm leading-relaxed mb-2">Este álbum ainda não foi criado.</p>
                  <p className="text-neutral-500 font-sans text-xs">Por favor, salve as informações básicas do álbum primeiro, vincule as fotos desejadas pelo painel e depois retorne para escolher a capa.</p>
                </div>
              ) : albumPhotosOnly.length === 0 ? (
                <div className="py-12 text-center max-w-md mx-auto">
                  <p className="text-neutral-400 font-sans text-sm leading-relaxed mb-2">Nenhuma foto vinculada a este álbum ainda.</p>
                  <p className="text-neutral-500 font-sans text-xs">Vincule fotos a ele usando o botão <strong className="text-neutral-300">"Organizar Fotos"</strong> na listagem antes de escolher uma capa.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[360px] overflow-y-auto pr-2">
                  {albumPhotosOnly.map((photo) => {
                    const isCover = coverPhotoId === photo.id;
                    return (
                      <button 
                        key={photo.id}
                        type="button"
                        onClick={() => {
                          setCoverPhotoId(photo.id);
                          setCoverSelectOpen(false);
                        }}
                        className={`relative aspect-square rounded-lg overflow-hidden border p-[2px] transition-all ${isCover ? 'border-white bg-white/10' : 'border-white/5 hover:border-white/15'}`}
                      >
                        <img src={photo.thumbnail_url} className="w-full h-full object-cover rounded-md" />
                        {isCover && (
                          <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                            <Check className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Photo Organizer / Linker Overlay Modal */}
      {organizerOpen && organizerAlbum && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/85 backdrop-blur-md px-6 pt-6 md:pt-12 overflow-y-auto">
          <div className="w-full max-w-4xl bg-neutral-950 border border-white/10 rounded-3xl shadow-2xl p-8 relative h-[90vh] flex flex-col justify-between">
            <button 
              onClick={() => {
                setOrganizerOpen(false);
                setOrganizerAlbum(null);
              }}
              className="absolute top-6 right-6 text-neutral-400 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <p className="text-xs text-zinc-400 font-medium tracking-wide mb-2">Gerenciador de fotos</p>
              <h3 className="font-display italic text-3xl text-white mb-2">{organizerAlbum.title}</h3>
              <p className="text-neutral-400 text-xs max-w-xl leading-relaxed">
                Adicione fotos do seu acervo geral a este álbum ou remova as vinculadas atualmente sem excluí-las do acervo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 overflow-hidden my-6">
              {/* Left Column: Linked photos in this album */}
              <div className="flex flex-col border border-white/5 bg-black/20 rounded-2xl p-4 overflow-hidden">
                <span className="font-sans text-[9px] uppercase tracking-widest text-neutral-400 mb-4 block">Fotos neste Álbum ({albumPhotos.length})</span>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                  {albumPhotos.length === 0 ? (
                    <p className="text-neutral-600 font-sans text-[10px] uppercase text-center py-12">Nenhuma foto vinculada.</p>
                  ) : (
                    albumPhotos.map((photo) => (
                      <div key={photo.id} className="flex items-center justify-between gap-4 p-2 bg-neutral-900/60 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={photo.thumbnail_url} className="w-10 h-10 object-cover rounded-lg border border-white/10 shrink-0" />
                          <span className="text-xs text-neutral-300 truncate font-semibold">{photo.title || '(sem título)'}</span>
                        </div>
                        <button 
                          onClick={() => handleUnlinkPhoto(photo.id)}
                          className="px-2.5 py-1 text-[10px] font-sans uppercase bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-400 rounded-lg transition-all"
                        >
                          Remover
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Unlinked photos */}
              <div className="flex flex-col border border-white/5 bg-black/20 rounded-2xl p-4 overflow-hidden">
                <span className="font-sans text-[9px] uppercase tracking-widest text-neutral-400 mb-4 block">Acervo Geral disponível ({unlinkedPhotos.length})</span>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                  {unlinkedPhotos.length === 0 ? (
                    <p className="text-neutral-600 font-sans text-[10px] uppercase text-center py-12">Todas as fotos do acervo já possuem álbuns vinculados.</p>
                  ) : (
                    unlinkedPhotos.map((photo) => (
                      <div key={photo.id} className="flex items-center justify-between gap-4 p-2 bg-neutral-900/60 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={photo.thumbnail_url} className="w-10 h-10 object-cover rounded-lg border border-white/10 shrink-0" />
                          <span className="text-xs text-neutral-300 truncate font-semibold">{photo.title || '(sem título)'}</span>
                        </div>
                        <button 
                          onClick={() => handleLinkPhoto(photo.id)}
                          className="px-2.5 py-1 text-[10px] font-sans uppercase bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 rounded-lg transition-all"
                        >
                          Vincular
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button 
                onClick={() => {
                  setOrganizerOpen(false);
                  setOrganizerAlbum(null);
                }}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold app-btn-accent transition-all cursor-pointer"
              >
                Concluir Organização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
