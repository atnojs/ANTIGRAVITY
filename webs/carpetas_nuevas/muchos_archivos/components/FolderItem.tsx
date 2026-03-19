
import React from 'react';
import { Folder } from '../types';
import { EditIcon, TrashIcon } from './icons';

interface FolderItemProps {
    folder: Folder;
    onClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const ActionButton: React.FC<{ onClick: (e: React.MouseEvent) => void; children: React.ReactNode; className?: string }> = ({ onClick, children, className }) => (
    <button
        onClick={onClick}
        className={`p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors ${className}`}
    >
        {children}
    </button>
);

const FolderItem: React.FC<FolderItemProps> = ({ folder, onClick, onEdit, onDelete }) => {
    const handleActionClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
    };

    return (
        <div 
            onClick={onClick}
            className="group relative perspective-1000 w-full max-w-sm cursor-pointer"
        >
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-custom-accent-3 via-custom-accent to-custom-accent-2 opacity-0 group-hover:opacity-75 transition-opacity duration-500 blur"></div>
            <div className="relative transform-style-preserve-3d transition-transform duration-300 group-hover:-translate-y-1 h-full">
                <div className="relative p-5 overflow-hidden h-full bg-custom-card-light dark:bg-custom-card-dark border border-custom-border-light dark:border-custom-border-dark rounded-2xl shadow-xl hover:shadow-2xl transition-shadow text-custom-text-light dark:text-custom-text-dark">
                    <div className="flex items-center gap-4 mb-3">
                        <img
                            src={folder.iconUrl}
                            alt={folder.name}
                            className="w-16 h-16 rounded-xl object-cover bg-black/20"
                        />
                        <div>
                            <h3 className="font-inter text-xl font-bold bg-gradient-to-r from-custom-accent to-custom-accent-2 bg-clip-text text-transparent">
                                {folder.name}
                            </h3>
                        </div>
                    </div>
                    <p className="text-custom-muted-light dark:text-custom-muted-dark text-sm min-h-[40px]">
                        {folder.description}
                    </p>
                    <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionButton onClick={(e) => handleActionClick(e, onEdit)}>
                            <EditIcon className="w-4 h-4 text-custom-muted-dark hover:text-white" />
                        </ActionButton>
                        <ActionButton onClick={(e) => handleActionClick(e, onDelete)}>
                            <TrashIcon className="w-4 h-4 text-custom-muted-dark hover:text-red-500" />
                        </ActionButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FolderItem;
