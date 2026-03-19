
export interface Video {
  id: string;
  title: string;
  url: string;
  note: string;
  thumbnailUrl: string;
  tags: string[];
  folderId: string;
  timestampAdded: number;
  locked: boolean;
}

export interface Folder {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  slug: string;
}

export interface Settings {
  theme: 'light' | 'dark';
}

export interface AppData {
  settings: Settings;
  folders: Folder[];
  videos: Video[];
}
