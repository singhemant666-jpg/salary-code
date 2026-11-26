import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MPCG Employee Portal',
    short_name: 'MPCG Portal',
    description: 'My Pain Clinic Global - Employee Self-Service Portal for attendance, leaves, and verified salary slips.',
    start_url: '/portal',
    scope: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0284c7',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['business', 'productivity', 'utilities'],
    shortcuts: [
      {
        name: 'Attendance',
        short_name: 'Attendance',
        description: 'View daily punches & attendance',
        url: '/portal',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Salary Slips',
        short_name: 'Slips',
        description: 'Download verified payslips',
        url: '/portal?tab=slips',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Apply Leave',
        short_name: 'Leave',
        description: 'Submit leave request',
        url: '/portal?tab=leaves',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
