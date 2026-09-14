import test from 'node:test';
import assert from 'node:assert/strict';
import { plexService } from '../src/services/plexService.js';
import { generateToneWav } from '../src/services/audioGenerator.js';
import { generateSvgArtwork } from '../src/services/svgArtwork.js';

test('PlexService & Utilities Unit Tests', async (t) => {
  await t.test('generateToneWav creates a valid WAV buffer with proper header and samples', () => {
    const wav = generateToneWav(2, 440, 22050);
    assert.ok(wav instanceof Buffer);
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    assert.equal(wav.toString('ascii', 12, 16), 'fmt ');
    assert.equal(wav.toString('ascii', 36, 40), 'data');

    // Total file size header check
    const riffSize = wav.readUInt32LE(4);
    assert.equal(riffSize + 8, wav.length);

    // Data size header check
    const dataSize = wav.readUInt32LE(40);
    assert.equal(dataSize + 44, wav.length);
  });

  await t.test('generateSvgArtwork produces well-formed SVG markup', () => {
    const svg = generateSvgArtwork('Daft Punk', 'Artist', 'amber');
    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('</svg>'));
    assert.ok(svg.includes('Daft Punk'));
    assert.ok(svg.includes('Artist'));
  });

  await t.test('plexService.getArtists() returns mock artists in mock mode', async () => {
    const artists = await plexService.getArtists();
    assert.ok(Array.isArray(artists));
    assert.ok(artists.length >= 3);
    const daft = artists.find(a => a.title.includes('Daft Punk'));
    assert.ok(daft);
    assert.equal(daft.id, 'art-1');
  });

  await t.test('plexService.getArtistAlbums() filters albums by artist', async () => {
    const albums = await plexService.getArtistAlbums('art-1');
    assert.ok(Array.isArray(albums));
    assert.equal(albums.length, 2);
    albums.forEach(album => assert.equal(album.artistId, 'art-1'));
  });

  await t.test('plexService.getAlbumTracks() retrieves tracks for specific album', async () => {
    const tracks = await plexService.getAlbumTracks('alb-1');
    assert.ok(Array.isArray(tracks));
    assert.equal(tracks.length, 3);
    assert.equal(tracks[0].title, 'Give Life Back to Music');
  });

  await t.test('plexService.getPlaylists() retrieves playlists', async () => {
    const playlists = await plexService.getPlaylists();
    assert.ok(Array.isArray(playlists));
    assert.ok(playlists.length >= 2);
  });

  await t.test('plexService.getPlaylistTracks() retrieves mapped tracks', async () => {
    const tracks = await plexService.getPlaylistTracks('pl-1');
    assert.ok(Array.isArray(tracks));
    assert.equal(tracks.length, 5);
  });

  await t.test('plexService.search() queries artists, albums, tracks', async () => {
    const res = await plexService.search('pink');
    assert.ok(res.artists.some(a => a.title.toLowerCase().includes('pink')));
    assert.ok(res.albums.some(a => a.artistTitle.toLowerCase().includes('pink')));
  });

  await t.test('plexService.getShuffleTracks() handles different container types', async () => {
    const shuffledArt = await plexService.getShuffleTracks('art-1');
    assert.ok(Array.isArray(shuffledArt));
    assert.equal(shuffledArt.length, 6);

    const shuffledAlb = await plexService.getShuffleTracks('alb-1');
    assert.ok(Array.isArray(shuffledAlb));
    assert.equal(shuffledAlb.length, 3);

    const shuffledAll = await plexService.getShuffleTracks('all');
    assert.ok(Array.isArray(shuffledAll));
    assert.ok(shuffledAll.length > 10);
  });

  await t.test('plexService.getTrackStreamInfo() returns mock streaming details', async () => {
    const info = await plexService.getTrackStreamInfo('trk-1');
    assert.ok(info.isMock);
    assert.equal(info.frequency, 330);
    assert.ok(info.durationSeconds > 0);
  });
});
