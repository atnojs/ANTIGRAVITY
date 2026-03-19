
import React from 'react';

const baseInputClasses = "w-full px-4 py-3 rounded-xl border border-custom-border-light dark:border-custom-border-dark bg-white/5 dark:bg-white/5 text-custom-text-light dark:text-custom-text-dark placeholder-custom-muted-light dark:placeholder-custom-muted-dark focus:ring-2 focus:ring-custom-accent focus:outline-none transition-all";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export const Input: React.FC<InputProps> = (props) => {
    return <input {...props} className={`${baseInputClasses} ${props.className || ''}`} />;
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
export const Textarea: React.FC<TextareaProps> = (props) => {
    return <textarea {...props} className={`${baseInputClasses} ${props.className || ''}`} />;
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary';
}
export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', ...props }) => {
    const primaryClasses = "text-white bg-gradient-to-br from-custom-accent to-custom-accent-2 hover:opacity-90";
    const secondaryClasses = "text-custom-text-light dark:text-custom-text-dark bg-gray-500 hover:bg-gray-600";
    
    return (
        <button {...props} className={`px-5 py-2.5 font-bold rounded-xl shadow-lg transition-opacity disabled:opacity-50 ${variant === 'primary' ? primaryClasses : secondaryClasses} ${props.className || ''}`}>
            {children}
        </button>
    );
};

interface FormGroupProps {
    label: string;
    children: React.ReactNode;
}
export const FormGroup: React.FC<FormGroupProps> = ({ label, children }) => (
    <div className="mb-4">
        <label className="block mb-2 font-bold font-inter text-custom-text-light dark:text-custom-text-dark">{label}</label>
        {children}
    </div>
);
