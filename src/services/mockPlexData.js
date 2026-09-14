export const mockArtists = [
  {
    id: 'art-1',
    title: 'Daft Punk',
    thumb: '/api/thumb?mock=art-1',
    albumCount: 2,
    trackCount: 6,
    summary: 'Electronic music duo from Paris, France formed in 1993.'
  },
  {
    id: 'art-2',
    title: 'Pink Floyd',
    thumb: '/api/thumb?mock=art-2',
    albumCount: 2,
    trackCount: 6,
    summary: 'English rock band formed in London in 1965.'
  },
  {
    id: 'art-3',
    title: 'Radiohead',
    thumb: '/api/thumb?mock=art-3',
    albumCount: 1,
    trackCount: 3,
    summary: 'English rock band formed in Abingdon, Oxfordshire in 1985.'
  },
  {
    id: 'art-4',
    title: 'Hans Zimmer',
    thumb: '/api/thumb?mock=art-4',
    albumCount: 1,
    trackCount: 3,
    summary: 'German film score composer and music producer.'
  },
  {
    id: 'art-5',
    title: 'Miles Davis',
    thumb: '/api/thumb?mock=art-5',
    albumCount: 1,
    trackCount: 3,
    summary: 'American jazz trumpeter, bandleader, and composer.'
  }
];

export const mockAlbums = [
  // Daft Punk
  {
    id: 'alb-1',
    artistId: 'art-1',
    artistTitle: 'Daft Punk',
    title: 'Random Access Memories',
    year: 2013,
    thumb: '/api/thumb?mock=alb-1',
    trackCount: 3
  },
  {
    id: 'alb-2',
    artistId: 'art-1',
    artistTitle: 'Daft Punk',
    title: 'Discovery',
    year: 2001,
    thumb: '/api/thumb?mock=alb-2',
    trackCount: 3
  },
  // Pink Floyd
  {
    id: 'alb-3',
    artistId: 'art-2',
    artistTitle: 'Pink Floyd',
    title: 'The Dark Side of the Moon',
    year: 1973,
    thumb: '/api/thumb?mock=alb-3',
    trackCount: 3
  },
  {
    id: 'alb-4',
    artistId: 'art-2',
    artistTitle: 'Pink Floyd',
    title: 'Wish You Were Here',
    year: 1975,
    thumb: '/api/thumb?mock=alb-4',
    trackCount: 3
  },
  // Radiohead
  {
    id: 'alb-5',
    artistId: 'art-3',
    artistTitle: 'Radiohead',
    title: 'OK Computer',
    year: 1997,
    thumb: '/api/thumb?mock=alb-5',
    trackCount: 3
  },
  // Hans Zimmer
  {
    id: 'alb-6',
    artistId: 'art-4',
    artistTitle: 'Hans Zimmer',
    title: 'Interstellar (OST)',
    year: 2014,
    thumb: '/api/thumb?mock=alb-6',
    trackCount: 3
  },
  // Miles Davis
  {
    id: 'alb-7',
    artistId: 'art-5',
    artistTitle: 'Miles Davis',
    title: 'Kind of Blue',
    year: 1959,
    thumb: '/api/thumb?mock=alb-7',
    trackCount: 3
  }
];

export const mockTracks = [
  // Random Access Memories
  { id: 'trk-1', albumId: 'alb-1', artistId: 'art-1', artistTitle: 'Daft Punk', albumTitle: 'Random Access Memories', index: 1, title: 'Give Life Back to Music', duration: 274000, thumb: '/api/thumb?mock=alb-1', codec: 'flac', frequency: 330 },
  { id: 'trk-2', albumId: 'alb-1', artistId: 'art-1', artistTitle: 'Daft Punk', albumTitle: 'Random Access Memories', index: 2, title: 'Giorgio by Moroder', duration: 544000, thumb: '/api/thumb?mock=alb-1', codec: 'flac', frequency: 392 },
  { id: 'trk-3', albumId: 'alb-1', artistId: 'art-1', artistTitle: 'Daft Punk', albumTitle: 'Random Access Memories', index: 3, title: 'Get Lucky', duration: 369000, thumb: '/api/thumb?mock=alb-1', codec: 'mp3', frequency: 440 },

  // Discovery
  { id: 'trk-4', albumId: 'alb-2', artistId: 'art-1', artistTitle: 'Daft Punk', albumTitle: 'Discovery', index: 1, title: 'One More Time', duration: 320000, thumb: '/api/thumb?mock=alb-2', codec: 'mp3', frequency: 523 },
  { id: 'trk-5', albumId: 'alb-2', artistId: 'art-1', artistTitle: 'Daft Punk', albumTitle: 'Discovery', index: 2, title: 'Aerodynamic', duration: 207000, thumb: '/api/thumb?mock=alb-2', codec: 'flac', frequency: 587 },
  { id: 'trk-6', albumId: 'alb-2', artistId: 'art-1', artistTitle: 'Daft Punk', albumTitle: 'Discovery', index: 3, title: 'Harder, Better, Faster, Stronger', duration: 224000, thumb: '/api/thumb?mock=alb-2', codec: 'mp3', frequency: 659 },

  // The Dark Side of the Moon
  { id: 'trk-7', albumId: 'alb-3', artistId: 'art-2', artistTitle: 'Pink Floyd', albumTitle: 'The Dark Side of the Moon', index: 1, title: 'Speak to Me / Breathe', duration: 238000, thumb: '/api/thumb?mock=alb-3', codec: 'flac', frequency: 220 },
  { id: 'trk-8', albumId: 'alb-3', artistId: 'art-2', artistTitle: 'Pink Floyd', albumTitle: 'The Dark Side of the Moon', index: 2, title: 'Time', duration: 425000, thumb: '/api/thumb?mock=alb-3', codec: 'flac', frequency: 261 },
  { id: 'trk-9', albumId: 'alb-3', artistId: 'art-2', artistTitle: 'Pink Floyd', albumTitle: 'The Dark Side of the Moon', index: 3, title: 'Money', duration: 382000, thumb: '/api/thumb?mock=alb-3', codec: 'mp3', frequency: 293 },

  // Wish You Were Here
  { id: 'trk-10', albumId: 'alb-4', artistId: 'art-2', artistTitle: 'Pink Floyd', albumTitle: 'Wish You Were Here', index: 1, title: 'Shine On You Crazy Diamond (Pts. 1-5)', duration: 810000, thumb: '/api/thumb?mock=alb-4', codec: 'flac', frequency: 329 },
  { id: 'trk-11', albumId: 'alb-4', artistId: 'art-2', artistTitle: 'Pink Floyd', albumTitle: 'Wish You Were Here', index: 2, title: 'Welcome to the Machine', duration: 447000, thumb: '/api/thumb?mock=alb-4', codec: 'mp3', frequency: 349 },
  { id: 'trk-12', albumId: 'alb-4', artistId: 'art-2', artistTitle: 'Pink Floyd', albumTitle: 'Wish You Were Here', index: 3, title: 'Wish You Were Here', duration: 334000, thumb: '/api/thumb?mock=alb-4', codec: 'flac', frequency: 392 },

  // OK Computer
  { id: 'trk-13', albumId: 'alb-5', artistId: 'art-3', artistTitle: 'Radiohead', albumTitle: 'OK Computer', index: 1, title: 'Airbag', duration: 284000, thumb: '/api/thumb?mock=alb-5', codec: 'flac', frequency: 440 },
  { id: 'trk-14', albumId: 'alb-5', artistId: 'art-3', artistTitle: 'Radiohead', albumTitle: 'OK Computer', index: 2, title: 'Paranoid Android', duration: 383000, thumb: '/api/thumb?mock=alb-5', codec: 'flac', frequency: 493 },
  { id: 'trk-15', albumId: 'alb-5', artistId: 'art-3', artistTitle: 'Radiohead', albumTitle: 'OK Computer', index: 3, title: 'Karma Police', duration: 261000, thumb: '/api/thumb?mock=alb-5', codec: 'mp3', frequency: 523 },

  // Interstellar
  { id: 'trk-16', albumId: 'alb-6', artistId: 'art-4', artistTitle: 'Hans Zimmer', albumTitle: 'Interstellar (OST)', index: 1, title: 'Cornfield Chase', duration: 127000, thumb: '/api/thumb?mock=alb-6', codec: 'flac', frequency: 329 },
  { id: 'trk-17', albumId: 'alb-6', artistId: 'art-4', artistTitle: 'Hans Zimmer', albumTitle: 'Interstellar (OST)', index: 2, title: 'Dust', duration: 341000, thumb: '/api/thumb?mock=alb-6', codec: 'flac', frequency: 293 },
  { id: 'trk-18', albumId: 'alb-6', artistId: 'art-4', artistTitle: 'Hans Zimmer', albumTitle: 'Interstellar (OST)', index: 3, title: 'No Time for Caution', duration: 246000, thumb: '/api/thumb?mock=alb-6', codec: 'flac', frequency: 392 },

  // Kind of Blue
  { id: 'trk-19', albumId: 'alb-7', artistId: 'art-5', artistTitle: 'Miles Davis', albumTitle: 'Kind of Blue', index: 1, title: 'So What', duration: 562000, thumb: '/api/thumb?mock=alb-7', codec: 'flac', frequency: 261 },
  { id: 'trk-20', albumId: 'alb-7', artistId: 'art-5', artistTitle: 'Miles Davis', albumTitle: 'Kind of Blue', index: 2, title: 'Freddie Freeloader', duration: 589000, thumb: '/api/thumb?mock=alb-7', codec: 'mp3', frequency: 329 },
  { id: 'trk-21', albumId: 'alb-7', artistId: 'art-5', artistTitle: 'Miles Davis', albumTitle: 'Kind of Blue', index: 3, title: 'Blue in Green', duration: 337000, thumb: '/api/thumb?mock=alb-7', codec: 'flac', frequency: 349 }
];

export const mockPlaylists = [
  {
    id: 'pl-1',
    title: 'Tesla Highway Drive',
    trackCount: 5,
    duration: 1614000,
    thumb: '/api/thumb?mock=pl-1',
    trackIds: ['trk-3', 'trk-4', 'trk-8', 'trk-12', 'trk-16']
  },
  {
    id: 'pl-2',
    title: 'Late Night Chill',
    trackCount: 4,
    duration: 1849000,
    thumb: '/api/thumb?mock=pl-2',
    trackIds: ['trk-10', 'trk-15', 'trk-18', 'trk-21']
  }
];
