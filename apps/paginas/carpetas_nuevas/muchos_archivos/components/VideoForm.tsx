
import React, { useState, useEffect } from 'react';
import { Video } from '../types';
import { getYouTubeThumbnail } from '../utils/helpers';
import { Input, Textarea, Button, FormGroup } from './FormControls';

interface VideoFormProps {
    video?: Video | null;
    onSave: (videoData: Omit<Video, 'id' | 'folderId' | 'timestampAdded' | 'thumbnailUrl'> & Partial<Pick<Video, 'id'>>) => void;
    onClose: () => void;
}

const VideoForm: React.FC<VideoFormProps> = ({ video, onSave, onClose }) => {
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [note, setNote] = useState('');
    const [tags, setTags] = useState('');
    const [locked, setLocked] = useState(false);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

    useEffect(() => {
        if (video) {
            setTitle(video.title);
            setUrl(video.url);
            setNote(video.note);
            setTags(video.tags.join(', '));
            setLocked(video.locked);
            setThumbnailPreview(video.thumbnailUrl);
        } else {
            setTitle('');
            setUrl('');
            setNote('');
            setTags('');
            setLocked(false);
            setThumbnailPreview(null);
        }
    }, [video]);

    useEffect(() => {
        if(url) {
            const thumb = getYouTubeThumbnail(url);
            setThumbnailPreview(thumb);
        } else {
            setThumbnailPreview(null);
        }
    }, [url]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !url.trim()) {
            alert('El título y la URL son obligatorios.');
            return;
        }
        
        const videoData = {
            id: video?.id,
            title,
            url,
            note,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            locked,
        };
        onSave(videoData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <div>
                    <FormGroup label="Título">
                        <Input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    </FormGroup>
                    <FormGroup label="URL">
                        <Input type="text" value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://..." />
                    </FormGroup>
                     <FormGroup label="Nota (Descripción)">
                        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
                    </FormGroup>
                </div>
                <div>
                     <FormGroup label="Etiquetas (separadas por coma)">
                        <Input type="text" value={tags} onChange={(e) => setTags(e.target.value)} />
                    </FormGroup>
                    
                    {thumbnailPreview && (
                         <div className="mb-4">
                            <label className="block mb-2 font-bold font-inter text-custom-text-light dark:text-custom-text-dark">Miniatura</label>
                            <img src={thumbnailPreview} alt="Preview" className="w-full aspect-video rounded-lg object-cover" />
                        </div>
                    )}

                    <div className="flex items-center gap-3 mt-6">
                        <input
                            type="checkbox"
                            id="lock-checkbox"
                            checked={locked}
                            onChange={(e) => setLocked(e.target.checked)}
                            className="w-5 h-5 rounded text-custom-accent bg-gray-700 border-gray-600 focus:ring-custom-accent"
                        />
                        <label htmlFor="lock-checkbox" className="font-bold font-inter text-custom-text-light dark:text-custom-text-dark cursor-pointer">
                            Bloquear enlace en su posición
                        </label>
                    </div>
                     <p className="text-sm text-custom-muted-light dark:text-custom-muted-dark ml-8">Los enlaces bloqueados permanecen al principio de la lista.</p>
                </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
                <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button type="submit">Guardar</Button>
            </div>
        </form>
    );
};

export default VideoForm;
