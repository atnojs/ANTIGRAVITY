/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Version {
  id: string;
  content: string;
  createdAt: string;
  note: string;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  description: string;
  categoryId?: string;
  collectionId?: string;
  isFavorite: boolean;
  isTrash: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  imageUrl?: string; // Base64 or ObjectURL or elegant gradient
  variables: string[];
  versions: Version[];
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon key, e.g., "Compass", "Code", "PenTool"
  color: string; // CSS color string or preset
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  icon: string;
}
