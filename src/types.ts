/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Photographer {
  id: string;
  name: string;
  slug: string;
  bio?: string;
  experience_years?: number;
  specialties?: string[];
  equipment?: string;
  email?: string;

  trial_ends_at?: string | null;
  plan?: string;
}

export interface SiteSettings {
  photographer_id: string;
  slogan?: string;
  whatsapp_number?: string;
  instagram_handle?: string;
  primary_color?: string;
  logo_url?: string;
  hero_photo_url?: string;
  avatar_url?: string;
  seo_title?: string;
  seo_description?: string;
  contact_email?: string;
  location?: string;
}

export interface Category {
  id: string;
  photographer_id: string;
  name: string;
  slug: string;
  description?: string;
  sort_order?: number;
}

export interface Album {
  id: string;
  photographer_id: string;
  title: string;
  description?: string;
  category_id?: string;
  cover_photo_id?: string;
  is_published: boolean;
  sort_order?: number;
  created_at: string;
  // Enriched fields
  photo_count?: number;
  cover_url?: string;
  categories?: {
    name: string;
  };
}

export interface Photo {
  id: string;
  photographer_id: string;
  category_id?: string;
  album_id?: string;
  title?: string;
  description?: string;
  image_url: string;
  thumbnail_url: string;
  storage_path: string;
  file_size_bytes?: number;
  deleted_at?: string;
  created_at: string;
  is_published: boolean;
  categories?: {
    name: string;
  };
}

export interface Testimonial {
  id: string;
  photographer_id: string;
  client_name: string;
  content: string;
  rating?: number;
  is_published: boolean;
  created_at: string;
}

export interface ContactMessage {
  id: string;
  photographer_id: string;
  name: string;
  phone?: string;
  email?: string;
  message: string;
  created_at: string;
}
