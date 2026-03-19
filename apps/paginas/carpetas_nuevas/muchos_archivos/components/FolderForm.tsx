
import React, { useState, useEffect } from 'react';
import { Folder } from '../types';
import { Input, Textarea, Button, FormGroup } from './FormControls';

interface FolderFormProps {
    folder?: Folder | null;
    onSave: (folderData: Omit<Folder, 'id' | 'slug'>) => void;
    onClose: () => void;
}

const FolderForm: React.FC<FolderFormProps> = ({ folder, onSave, onClose }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [iconUrl, setIconUrl] = useState('');

    useEffect(() => {
        if (folder) {
            setName(folder.name);
            setDescription(folder.description);
            setIconUrl(folder.iconUrl);
        } else {
            setName('');
            setDescription('');
            setIconUrl('');
        }
    }, [folder]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            alert('El nombre de la carpeta es obligatorio.');
            return;
        }
        onSave({ name, description, iconUrl });
    };

    return (
        <form onSubmit={handleSubmit}>
            <FormGroup label="Nombre de la Carpeta">
                <Input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </FormGroup>
            <FormGroup label="Descripción">
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </FormGroup>
            <FormGroup label="URL del Icono">
                <Input type="text" value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="https://..." />
            </FormGroup>
            <div className="flex justify-end gap-4 mt-6">
                <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button type="submit">Guardar</Button>
            </div>
        </form>
    );
};

export default FolderForm;
