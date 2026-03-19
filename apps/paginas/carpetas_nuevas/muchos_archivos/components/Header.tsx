
import React from 'react';

interface HeaderProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    theme: 'light' | 'dark';
    onThemeToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ searchTerm, onSearchChange, theme, onThemeToggle }) => {
    return (
        <header className="fixed inset-x-0 top-0 z-50 flex flex-wrap gap-4 items-center justify-between p-4 bg-custom-card-dark/70 dark:bg-custom-card-dark/70 bg-custom-card-light/70 backdrop-blur-lg border-b border-custom-border-light dark:border-custom-border-dark">
            <input
                type="search"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar carpetas o enlaces..."
                className="flex-grow min-w-[220px] px-4 py-3 rounded-xl border border-custom-border-light dark:border-custom-border-dark bg-white/5 dark:bg-white/5 text-custom-text-light dark:text-custom-text-dark placeholder-custom-muted-light dark:placeholder-custom-muted-dark focus:ring-2 focus:ring-custom-accent focus:outline-none transition-all"
            />
            <div className="flex items-center gap-4">
                <button
                    onClick={onThemeToggle}
                    className="px-4 py-2 font-bold text-white rounded-xl shadow-lg bg-gradient-to-br from-custom-accent to-custom-accent-2 hover:opacity-90 transition-opacity"
                >
                    {theme === 'light' ? 'Tema Oscuro' : 'Tema Claro'}
                </button>
            </div>
        </header>
    );
};

export default Header;
