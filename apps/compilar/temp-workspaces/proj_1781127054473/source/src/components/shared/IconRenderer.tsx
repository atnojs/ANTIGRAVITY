/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Icons from 'lucide-react';

interface IconRendererProps {
  name: string;
  className?: string;
  size?: number;
}

export function IconRenderer({ name, className, size }: IconRendererProps) {
  // Safe fallbacks for icons
  const MyIcon = (Icons as any)[name];
  
  if (!MyIcon) {
    // If the icon isn't found, default to HelpCircle or some sensible fallback
    const Spark = Icons.HelpCircle;
    return <Spark className={className} size={size} />;
  }

  return <MyIcon className={className} size={size} />;
}

// Preset selection for creating categories/collections
export const ICON_PRESETS = [
  'Code',
  'Image',
  'Megaphone',
  'Sparkles',
  'Camera',
  'Rocket',
  'Cpu',
  'Compass',
  'BookOpen',
  'Mail',
  'Terminal',
  'Bot',
  'PenTool',
  'Clock',
  'MessageSquare',
  'Settings',
];

export const COLOR_PRESETS = [
  { label: 'Indigo', value: 'bg-indigo-500 text-white', hover: 'hover:bg-indigo-600', ring: 'ring-indigo-500' },
  { label: 'Emerald', value: 'bg-emerald-500 text-white', hover: 'hover:bg-emerald-600', ring: 'ring-emerald-500' },
  { label: 'Rose', value: 'bg-rose-500 text-white', hover: 'hover:bg-rose-600', ring: 'ring-rose-500' },
  { label: 'Amber', value: 'bg-amber-500 text-white', hover: 'hover:bg-amber-600', ring: 'ring-amber-500' },
  { label: 'Violet', value: 'bg-violet-500 text-white', hover: 'hover:bg-violet-600', ring: 'ring-violet-500' },
  { label: 'Cyan', value: 'bg-cyan-500 text-white', hover: 'hover:bg-cyan-600', ring: 'ring-cyan-500' },
  { label: 'Pink', value: 'bg-pink-500 text-white', hover: 'hover:bg-pink-600', ring: 'ring-pink-500' },
];
