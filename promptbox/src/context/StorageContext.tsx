/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Prompt, Category, Collection, Version } from '../types';
import { INITIAL_CATEGORIES, INITIAL_COLLECTIONS, INITIAL_PROMPTS } from '../utils/initialData';
import { extractVariables } from '../utils/parser';

// DBSchema definition
interface PromptBoxDB extends DBSchema {
  prompts: {
    key: string;
    value: Prompt;
  };
  categories: {
    key: string;
    value: Category;
  };
  collections: {
    key: string;
    value: Collection;
  };
  settings: {
    key: string;
    value: any; // { key: 'theme', value: 'light' | 'dark' } etc.
  };
}

const DB_NAME = 'promptbox_db_v1';

interface StorageContextType {
  prompts: Prompt[];
  categories: Category[];
  collections: Collection[];
  theme: 'light' | 'dark';
  isLoading: boolean;
  
  // Prompt CRUD
  createPrompt: (promptData: {
    title: string;
    content: string;
    description: string;
    categoryId?: string;
    collectionId?: string;
    tags: string[];
    imageUrl?: string;
  }) => Promise<void>;
  updatePrompt: (id: string, updates: Partial<Prompt>) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>; // Moves to trash
  restorePrompt: (id: string) => Promise<void>; // Restores from trash
  permanentlyDeletePrompt: (id: string) => Promise<void>; // Hard delete
  
  // Versions
  createVersion: (promptId: string, content: string, note: string) => Promise<void>;
  restoreVersion: (promptId: string, versionId: string) => Promise<void>;
  
  // Category CRD
  createCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Collection CRD
  createCollection: (collection: Omit<Collection, 'id'>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;

  // Management
  toggleTheme: () => void;
  importBackup: (backupText: string) => Promise<{ success: boolean; message: string }>;
  getBackupData: () => string;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export function useStorage() {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
}

export function StorageProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<IDBPDatabase<PromptBoxDB> | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize DB
  useEffect(() => {
    async function initDb() {
      try {
        const connectedDb = await openDB<PromptBoxDB>(DB_NAME, 1, {
          upgrade(dbInstance, oldVersion, newVersion, transaction) {
            if (!dbInstance.objectStoreNames.contains('categories')) {
              dbInstance.createObjectStore('categories', { keyPath: 'id' });
            }
            if (!dbInstance.objectStoreNames.contains('collections')) {
              dbInstance.createObjectStore('collections', { keyPath: 'id' });
            }
            if (!dbInstance.objectStoreNames.contains('prompts')) {
              dbInstance.createObjectStore('prompts', { keyPath: 'id' });
            }
            if (!dbInstance.objectStoreNames.contains('settings')) {
              dbInstance.createObjectStore('settings', { keyPath: 'key' });
            }
          },
        });

        // Seed initial data if empty
        const tx = connectedDb.transaction(['categories', 'collections', 'prompts', 'settings'], 'readwrite');
        
        const countCats = await tx.objectStore('categories').count();
        if (countCats === 0) {
          for (const cat of INITIAL_CATEGORIES) {
            await tx.objectStore('categories').put(cat);
          }
        }

        const countColls = await tx.objectStore('collections').count();
        if (countColls === 0) {
          for (const coll of INITIAL_COLLECTIONS) {
            await tx.objectStore('collections').put(coll);
          }
        }

        const countPrompts = await tx.objectStore('prompts').count();
        if (countPrompts === 0) {
          for (const pr of INITIAL_PROMPTS) {
            await tx.objectStore('prompts').put(pr);
          }
        }

        // Initialize theme setting if exists
        const storedThemeSetting = await tx.objectStore('settings').get('theme');
        let initialTheme: 'light' | 'dark' = 'light';
        if (storedThemeSetting) {
          initialTheme = storedThemeSetting.value;
        } else {
          await tx.objectStore('settings').put({ key: 'theme', value: 'light' });
        }

        await tx.done;

        setDb(connectedDb);
        setThemeState(initialTheme);
        
        // Apply theme to document element
        if (initialTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }

        // Load into memory
        const allCats = await connectedDb.getAll('categories');
        const allColls = await connectedDb.getAll('collections');
        const allPrompts = await connectedDb.getAll('prompts');

        setCategories(allCats);
        setCollections(allColls);
        setPrompts(allPrompts);
      } catch (error) {
        console.error('Error initializing IndexedDB storage:', error);
      } finally {
        setIsLoading(false);
      }
    }
    initDb();
  }, []);

  // Theme Toggler
  const toggleTheme = async () => {
    if (!db) return;
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setThemeState(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    await db.put('settings', { key: 'theme', value: newTheme });
  };

  // Sync state helpers
  const refreshState = async (database: IDBPDatabase<PromptBoxDB>) => {
    const allCats = await database.getAll('categories');
    const allColls = await database.getAll('collections');
    const allPrompts = await database.getAll('prompts');
    setCategories(allCats);
    setCollections(allColls);
    setPrompts(allPrompts);
  };

  // Create Prompt
  const createPrompt = async (promptData: {
    title: string;
    content: string;
    description: string;
    categoryId?: string;
    collectionId?: string;
    tags: string[];
    imageUrl?: string;
  }) => {
    if (!db) return;
    const id = `prompt-${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();
    
    // Automatically extract variables from dynamic regex parser
    const variables = extractVariables(promptData.content);

    const newPrompt: Prompt = {
      ...promptData,
      id,
      isFavorite: false,
      isTrash: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      variables,
      versions: [
        {
          id: `v-init-${crypto.randomUUID().slice(0, 8)}`,
          content: promptData.content,
          createdAt: timestamp,
          note: 'Creación original del Prompt',
        }
      ],
    };

    await db.put('prompts', newPrompt);
    await refreshState(db);
  };

  // Update Prompt
  const updatePrompt = async (id: string, updates: Partial<Prompt>) => {
    if (!db) return;
    const existing = await db.get('prompts', id);
    if (!existing) return;

    const timestamp = new Date().toISOString();
    const finalUpdates: Partial<Prompt> = {
      ...updates,
      updatedAt: timestamp,
    };

    // If contents changed, reparse variables automatically
    if (updates.content !== undefined && updates.content !== existing.content) {
      finalUpdates.variables = extractVariables(updates.content);
    }

    const merged: Prompt = {
      ...existing,
      ...finalUpdates,
    } as Prompt;

    await db.put('prompts', merged);
    await refreshState(db);
  };

  // Move to trash
  const deletePrompt = async (id: string) => {
    await updatePrompt(id, { isTrash: true });
  };

  // Restore from trash
  const restorePrompt = async (id: string) => {
    await updatePrompt(id, { isTrash: false });
  };

  // Permanently delete prompt
  const permanentlyDeletePrompt = async (id: string) => {
    if (!db) return;
    await db.delete('prompts', id);
    await refreshState(db);
  };

  // Versions Helper
  const createVersion = async (promptId: string, content: string, note: string) => {
    if (!db) return;
    const existing = await db.get('prompts', promptId);
    if (!existing) return;

    const newVer: Version = {
      id: `v-${crypto.randomUUID().slice(0, 8)}`,
      content,
      createdAt: new Date().toISOString(),
      note: note || `Cambio en versión a las ${new Date().toLocaleTimeString()}`,
    };

    const updatedVersions = [newVer, ...existing.versions]; // newest first

    const merged: Prompt = {
      ...existing,
      content, // Set prompt content to the newly saved version content
      variables: extractVariables(content),
      versions: updatedVersions,
      updatedAt: new Date().toISOString(),
    };

    await db.put('prompts', merged);
    await refreshState(db);
  };

  const restoreVersion = async (promptId: string, versionId: string) => {
    if (!db) return;
    const existing = await db.get('prompts', promptId);
    if (!existing) return;

    const targetVer = existing.versions.find(v => v.id === versionId);
    if (!targetVer) return;

    // Create a new version entry noting the restoration
    const restoredVer: Version = {
      id: `v-restore-${crypto.randomUUID().slice(0, 8)}`,
      content: targetVer.content,
      createdAt: new Date().toISOString(),
      note: `Restaurado desde versión editada el ${new Date(targetVer.createdAt).toLocaleDateString()}`,
    };

    const updatedVersions = [restoredVer, ...existing.versions];

    const merged: Prompt = {
      ...existing,
      content: targetVer.content,
      variables: extractVariables(targetVer.content),
      versions: updatedVersions,
      updatedAt: new Date().toISOString(),
    };

    await db.put('prompts', merged);
    await refreshState(db);
  };

  // Category CRUD
  const createCategory = async (categoryData: Omit<Category, 'id'>) => {
    if (!db) return;
    const id = `cat-${crypto.randomUUID().slice(0, 8)}`;
    const newCat = { ...categoryData, id };
    await db.put('categories', newCat);
    await refreshState(db);
  };

  const deleteCategory = async (id: string) => {
    if (!db) return;
    // Delete the category
    await db.delete('categories', id);
    
    // Dissociate from prompts
    const allPrompts = await db.getAll('prompts');
    for (const pr of allPrompts) {
      if (pr.categoryId === id) {
        await db.put('prompts', { ...pr, categoryId: undefined });
      }
    }
    await refreshState(db);
  };

  // Collection CRUD
  const createCollection = async (collectionData: Omit<Collection, 'id'>) => {
    if (!db) return;
    const id = `coll-${crypto.randomUUID().slice(0, 8)}`;
    const newColl = { ...collectionData, id };
    await db.put('collections', newColl);
    await refreshState(db);
  };

  const deleteCollection = async (id: string) => {
    if (!db) return;
    // Delete the collection
    await db.delete('collections', id);

    // Dissociate from prompts
    const allPrompts = await db.getAll('prompts');
    for (const pr of allPrompts) {
      if (pr.collectionId === id) {
        await db.put('prompts', { ...pr, collectionId: undefined });
      }
    }
    await refreshState(db);
  };

  // Backups / Data serializers
  const getBackupData = () => {
    const backupObj = {
      prompts,
      categories,
      collections,
      version: '1.0.0',
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(backupObj, null, 2);
  };

  const importBackup = async (backupText: string) => {
    if (!db) return { success: false, message: 'La base de datos aún no está lista.' };
    try {
      const parsed = JSON.parse(backupText);
      if (!parsed.prompts || !Array.isArray(parsed.prompts)) {
        return { success: false, message: 'El formato de importación no es válido (faltan prompts).' };
      }

      const tx = db.transaction(['prompts', 'categories', 'collections'], 'readwrite');

      // Put incoming tags
      if (parsed.categories && Array.isArray(parsed.categories)) {
        for (const cat of parsed.categories) {
          await tx.objectStore('categories').put(cat);
        }
      }

      if (parsed.collections && Array.isArray(parsed.collections)) {
        for (const coll of parsed.collections) {
          await tx.objectStore('collections').put(coll);
        }
      }

      for (const pr of parsed.prompts) {
        // Validation/Sanitizing import
        if (pr.id && pr.title && pr.content) {
          const sanitizedPrompt: Prompt = {
            id: pr.id,
            title: pr.title,
            content: pr.content,
            description: pr.description || '',
            categoryId: pr.categoryId,
            collectionId: pr.collectionId,
            isFavorite: !!pr.isFavorite,
            isTrash: !!pr.isTrash,
            tags: Array.isArray(pr.tags) ? pr.tags : [],
            createdAt: pr.createdAt || new Date().toISOString(),
            updatedAt: pr.updatedAt || new Date().toISOString(),
            imageUrl: pr.imageUrl || '',
            variables: Array.isArray(pr.variables) ? pr.variables : extractVariables(pr.content),
            versions: Array.isArray(pr.versions) ? pr.versions : [{
              id: `v-import-${crypto.randomUUID().slice(0, 8)}`,
              content: pr.content,
              createdAt: new Date().toISOString(),
              note: 'Importado de archivo externo'
            }]
          };
          await tx.objectStore('prompts').put(sanitizedPrompt);
        }
      }

      await tx.done;
      await refreshState(db);

      return { success: true, message: `Se importaron con éxito ${parsed.prompts.length} prompts.` };
    } catch (e: any) {
      return { success: false, message: `Error al procesar archivo JSON: ${e.message}` };
    }
  };

  return (
    <StorageContext.Provider
      value={{
        prompts,
        categories,
        collections,
        theme,
        isLoading,
        createPrompt,
        updatePrompt,
        deletePrompt,
        restorePrompt,
        permanentlyDeletePrompt,
        createVersion,
        restoreVersion,
        createCategory,
        deleteCategory,
        createCollection,
        deleteCollection,
        toggleTheme,
        importBackup,
        getBackupData,
      }}
    >
      {children}
    </StorageContext.Provider>
  );
}
