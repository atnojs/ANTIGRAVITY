
import React, { useState, useEffect, useMemo } from 'react';
import { AppData, Folder, Video } from './types';
import { initialData } from './data/initialData';
import useLocalStorage from './hooks/useLocalStorage';
import { slugify, generateId, getYouTubeThumbnail } from './utils/helpers';
import Header from './components/Header';
import FolderItem from './components/FolderItem';
import VideoCard from './components/VideoCard';
import Modal from './components/Modal';
import FolderForm from './components/FolderForm';
import VideoForm from './components/VideoForm';
import { PlusIcon, BackIcon } from './components/icons';

const App: React.FC = () => {
    const [data, setData] = useLocalStorage<AppData>('ai-tutorials-app', initialData);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    const [editingVideo, setEditingVideo] = useState<Video | null>(null);

    const { settings, folders, videos } = data;

    useEffect(() => {
        document.documentElement.classList.toggle('dark', settings.theme === 'dark');
        document.body.className = settings.theme === 'dark'
            ? 'bg-gradient-to-b from-custom-bg1-dark to-custom-bg2-dark'
            : 'bg-gradient-to-b from-custom-bg1-light to-custom-bg2-light';
    }, [settings.theme]);

    const handleThemeToggle = () => {
        setData({
            ...data,
            settings: { theme: settings.theme === 'dark' ? 'light' : 'dark' },
        });
    };

    // Derived state for current folder and its videos
    const currentFolder = useMemo(() => folders.find(f => f.id === currentFolderId), [folders, currentFolderId]);
    
    const sortedVideosInFolder = useMemo(() => {
        if (!currentFolderId) return [];
        const folderVideos = videos.filter(v => v.folderId === currentFolderId);

        const lockedVideos = folderVideos.filter(v => v.locked);
        const unlockedVideos = folderVideos.filter(v => !v.locked);

        lockedVideos.sort((a, b) => a.timestampAdded - b.timestampAdded);
        unlockedVideos.sort((a, b) => b.timestampAdded - a.timestampAdded);

        return [...lockedVideos, ...unlockedVideos];
    }, [videos, currentFolderId]);

    // Filtering logic
    const filteredFolders = useMemo(() => folders.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase())), [folders, searchTerm]);
    const filteredVideos = useMemo(() => sortedVideosInFolder.filter(v => v.title.toLowerCase().includes(searchTerm.toLowerCase())), [sortedVideosInFolder, searchTerm]);

    // Folder CRUD
    const handleSaveFolder = (folderData: Omit<Folder, 'id' | 'slug'>) => {
        if (editingFolder) {
            setData({ ...data, folders: folders.map(f => f.id === editingFolder.id ? { ...f, ...folderData, slug: slugify(folderData.name) } : f) });
        } else {
            const newFolder = { ...folderData, id: generateId('folder'), slug: slugify(folderData.name) };
            setData({ ...data, folders: [...folders, newFolder] });
        }
        setIsFolderModalOpen(false);
        setEditingFolder(null);
    };

    const handleDeleteFolder = (folderId: string) => {
        if (window.confirm("¿Seguro que quieres eliminar esta carpeta? Los enlaces no se borrarán.")) {
            setData({ ...data, folders: folders.filter(f => f.id !== folderId) });
        }
    };

    // Video CRUD
    const handleSaveVideo = (videoData: Omit<Video, 'id'|'folderId'|'timestampAdded'|'thumbnailUrl'> & Partial<Pick<Video, 'id'>>) => {
        if (editingVideo) {
            setData({ ...data, videos: videos.map(v => v.id === editingVideo.id ? { ...v, ...videoData, thumbnailUrl: getYouTubeThumbnail(videoData.url) } : v) });
        } else if (currentFolderId) {
            const newVideo: Video = {
                ...videoData,
                id: generateId('video'),
                folderId: currentFolderId,
                timestampAdded: Date.now(),
                thumbnailUrl: getYouTubeThumbnail(videoData.url),
            };
            setData({ ...data, videos: [...videos, newVideo] });
        }
        setIsVideoModalOpen(false);
        setEditingVideo(null);
    };

    const handleDeleteVideo = (videoId: string) => {
        if (window.confirm("¿Seguro que quieres eliminar este enlace?")) {
            setData({ ...data, videos: videos.filter(v => v.id !== videoId) });
        }
    };

    const renderFolders = () => (
        <>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-inter font-bold bg-gradient-to-r from-custom-accent to-custom-accent-2 bg-clip-text text-transparent">
                    Carpetas
                </h2>
                <button
                    onClick={() => { setEditingFolder(null); setIsFolderModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 font-bold text-white rounded-xl shadow-lg bg-gradient-to-br from-custom-accent to-custom-accent-3 hover:opacity-90 transition-opacity"
                >
                    <PlusIcon /> Añadir Carpeta
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFolders.map(folder => (
                    <FolderItem
                        key={folder.id}
                        folder={folder}
                        onClick={() => setCurrentFolderId(folder.id)}
                        onEdit={() => { setEditingFolder(folder); setIsFolderModalOpen(true); }}
                        onDelete={() => handleDeleteFolder(folder.id)}
                    />
                ))}
            </div>
        </>
    );

    const renderFolderView = () => (
        <>
            <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
                 <button
                    onClick={() => setCurrentFolderId(null)}
                    className="flex items-center gap-2 px-4 py-2 font-bold text-custom-text-light dark:text-custom-text-dark rounded-xl shadow-lg bg-custom-card-light dark:bg-custom-card-dark border border-custom-border-light dark:border-custom-border-dark hover:opacity-90 transition-opacity"
                >
                    <BackIcon /> Volver
                </button>
                <h2 className="text-3xl font-inter font-bold bg-gradient-to-r from-custom-accent to-custom-accent-2 bg-clip-text text-transparent">
                    {currentFolder?.name}
                </h2>
                <button
                    onClick={() => { setEditingVideo(null); setIsVideoModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 font-bold text-white rounded-xl shadow-lg bg-gradient-to-br from-custom-accent to-custom-accent-3 hover:opacity-90 transition-opacity"
                >
                   <PlusIcon /> Añadir Enlace
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {filteredVideos.map(video => (
                    <VideoCard
                        key={video.id}
                        video={video}
                        onEdit={() => { setEditingVideo(video); setIsVideoModalOpen(true); }}
                        onDelete={() => handleDeleteVideo(video.id)}
                    />
                ))}
            </div>
        </>
    );

    return (
        <div className="min-h-screen text-custom-text-light dark:text-custom-text-dark font-sans transition-colors duration-300">
            <Header
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                theme={settings.theme}
                onThemeToggle={handleThemeToggle}
            />
            <main className="max-w-7xl mx-auto px-4 pt-28 pb-12">
                {currentFolderId ? renderFolderView() : renderFolders()}
            </main>

            <Modal isOpen={isFolderModalOpen} onClose={() => setIsFolderModalOpen(false)} title={editingFolder ? 'Editar Carpeta' : 'Nueva Carpeta'}>
                <FolderForm folder={editingFolder} onSave={handleSaveFolder} onClose={() => setIsFolderModalOpen(false)} />
            </Modal>

            <Modal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} title={editingVideo ? 'Editar Enlace' : 'Nuevo Enlace'}>
                <VideoForm video={editingVideo} onSave={handleSaveVideo} onClose={() => setIsVideoModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default App;
