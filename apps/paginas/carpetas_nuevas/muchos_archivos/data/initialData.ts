
import { AppData } from '../types';
// FIX: Import 'getYouTubeThumbnail' which was used on line 45 but not imported.
import { generateId, slugify, getYouTubeThumbnail } from '../utils/helpers';

const FOLDER_1_ID = generateId('folder');
const FOLDER_2_ID = generateId('folder');

export const initialData: AppData = {
  settings: {
    theme: 'dark',
  },
  folders: [
    {
      id: FOLDER_1_ID,
      name: 'React Tutorials',
      description: 'Links and resources for learning React.',
      iconUrl: `https://picsum.photos/64?random=react`,
      slug: slugify('React Tutorials'),
    },
    {
      id: FOLDER_2_ID,
      name: 'Gemini API Projects',
      description: 'Cool projects and guides using the Gemini API.',
      iconUrl: `https://picsum.photos/64?random=gemini`,
      slug: slugify('Gemini API Projects'),
    },
  ],
  videos: [
    {
      id: generateId('video'),
      title: 'Official React Tutorial',
      url: 'https://react.dev/learn',
      note: 'The best place to start learning React.',
      thumbnailUrl: `https://picsum.photos/480/270?random=react-official`,
      tags: ['official', 'beginner'],
      folderId: FOLDER_1_ID,
      timestampAdded: Date.now() - 20000,
      locked: true,
    },
    {
      id: generateId('video'),
      title: 'React State Management',
      url: 'https://www.youtube.com/watch?v=Nqkdcrb_g_4',
      note: 'A deep dive into different state management patterns.',
      thumbnailUrl: getYouTubeThumbnail('https://www.youtube.com/watch?v=Nqkdcrb_g_4'),
      tags: ['state', 'advanced'],
      folderId: FOLDER_1_ID,
      timestampAdded: Date.now() - 10000,
      locked: false,
    },
     {
      id: generateId('video'),
      title: 'Intro to Gemini API',
      url: 'https://ai.google.dev/tutorials/get_started_web',
      note: 'Official getting started guide from Google.',
      thumbnailUrl: `https://picsum.photos/480/270?random=gemini-intro`,
      tags: ['gemini', 'beginner', 'official'],
      folderId: FOLDER_2_ID,
      timestampAdded: Date.now() - 5000,
      locked: false,
    },
  ],
};
