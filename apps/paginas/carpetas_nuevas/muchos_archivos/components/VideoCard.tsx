
import React, { useState } from 'react';
import { Video } from '../types';
import { EditIcon, TrashIcon, LockIcon } from './icons';

interface VideoCardProps {
    video: Video;
    onEdit: () => void;
    onDelete: () => void;
}

const ActionButton: React.FC<{ onClick: (e: React.MouseEvent) => void; children: React.ReactNode; className?: string; title: string }> = ({ onClick, children, className, title }) => (
    <button
        onClick={onClick}
        title={title}
        className={`p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors ${className}`}
    >
        {children}
    </button>
);


const VideoCard: React.FC<VideoCardProps> = ({ video, onEdit, onDelete }) => {
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    const handleActionClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
    };

    return (
        <div className="group relative perspective-1000 w-full">
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-custom-accent-3 via-custom-accent to-custom-accent-2 opacity-0 group-hover:opacity-75 transition-opacity duration-500 blur"></div>
            <div className="relative transform-style-preserve-3d transition-transform duration-300 group-hover:-translate-y-1">
                 <div className="relative flex flex-col bg-custom-card-light dark:bg-custom-card-dark border border-custom-border-light dark:border-custom-border-dark rounded-2xl shadow-xl hover:shadow-2xl transition-shadow overflow-hidden text-custom-text-light dark:text-custom-text-dark">
                    <div className="relative aspect-video bg-black/20">
                        {!isImageLoaded && <div className="absolute inset-0 bg-slate-800 animate-pulse"></div>}
                        <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className={`w-full h-full object-cover transition-opacity duration-300 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                            onLoad={() => setIsImageLoaded(true)}
                        />
                         {video.locked && (
                            <div className="absolute top-2 left-2 p-1.5 bg-black/50 backdrop-blur-sm rounded-full" title="Este enlace está bloqueado">
                                <LockIcon className="w-4 h-4 text-yellow-400" />
                            </div>
                        )}
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                        <h3 className="font-inter font-bold text-base text-custom-text-light dark:text-custom-text-dark mb-1">{video.title}</h3>
                        <p className="text-custom-muted-light dark:text-custom-muted-dark text-sm mb-3 flex-grow">{video.note}</p>
                        
                        {video.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {video.tags.map(tag => (
                                    <span key={tag} className="px-2 py-1 text-xs font-bold rounded-full bg-custom-accent/10 text-custom-accent">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-auto">
                            <a 
                                href={video.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-4 py-2 text-sm font-bold text-white rounded-xl shadow-lg bg-gradient-to-br from-custom-accent to-custom-accent-2 hover:opacity-90 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Abrir
                            </a>
                            <div className="flex items-center gap-2">
                                <ActionButton onClick={(e) => handleActionClick(e, onEdit)} title="Editar">
                                    <EditIcon className="w-4 h-4 text-custom-muted-dark hover:text-white" />
                                </ActionButton>
                                <ActionButton onClick={(e) => handleActionClick(e, onDelete)} title="Eliminar">
                                    <TrashIcon className="w-4 h-4 text-custom-muted-dark hover:text-red-500" />
                                </ActionButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoCard;
