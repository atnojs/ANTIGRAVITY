
import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-2xl mx-4 bg-custom-card-light dark:bg-custom-card-dark border border-custom-border-light dark:border-custom-border-dark rounded-2xl shadow-2xl p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-2xl font-inter font-bold text-center mb-6 text-custom-text-light dark:text-custom-text-dark">{title}</h2>
                {children}
            </div>
        </div>
    );
};

export default Modal;
