export interface VisualStyle {
  id: string;
  name: string;
  thumbnail: string;
  description: string;
}

export interface AspectRatioOption {
  id: string;
  label: string;
  subLabel: string;
  ratio: string; // Tailwind representation
  displayRatio: string; // e.g., "16:9"
  icon: string; // name of lucide-icon to render
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  style: string;
  aspectRatio: string;
  seed: number;
  steps: number;
  cfgScale: number;
  sampler: string;
  generationTime: string; // e.g. "1.24s"
  description: string;
  tags: string[];
  referenceImage?: string | null;
  createdAt: string;
}

export interface GenerationSettings {
  prompt: string;
  styleId: string;
  aspectRatioId: string;
  referenceImage: string | null;
  steps: number;
  cfgScale: number;
  sampler: string;
}
