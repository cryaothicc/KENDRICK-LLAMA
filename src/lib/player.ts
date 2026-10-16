export type Track = { id: string; title: string; artist: string; album: string; src: string; duration: number; local?: boolean };

export const demoTracks: Track[] = [
  { id: '01', title: 'Is It Love? (feat. Angela McCluskey)', artist: 'Kendrick Lamar', album: 'Kendrick Lamar EP', src: '/music/01 Is It Love_ (feat. Angela McCluskey).mp3', duration: 0 },
  { id: '02', title: 'Celebration',                          artist: 'Kendrick Lamar', album: 'Kendrick Lamar EP', src: '/music/02 Celebration.mp3', duration: 0 },
  { id: '03', title: 'P&P (feat. Ab-Soul)',                  artist: 'Kendrick Lamar', album: 'Kendrick Lamar EP', src: '/music/03 P&P (feat. Ab-Soul).mp3', duration: 0 },
  { id: '04', title: 'She Needs Me (feat. JaVonté)',         artist: 'Kendrick Lamar', album: 'Kendrick Lamar EP', src: '/music/04 She Needs Me (feat. JaVonté).mp3', duration: 0 },
  { id: '05', title: 'I Am (Interlude)',                     artist: 'Kendrick Lamar', album: 'Kendrick Lamar EP', src: '/music/05 I Am (Interlude).mp3', duration: 0 },
  { id: '06', title: 'Wanna Be Heard',                       artist: 'Kendrick Lamar', album: 'Kendrick Lamar EP', src: '/music/06 Wanna Be Heard.mp3', duration: 0 },
  { id: '07', title: 'I Do This (feat. Jay Rock)',           artist: 'Kendrick Lamar', album: 'Kendrick Lamar EP', src: '/music/07 I Do This (feat. Jay Rock).mp3', duration: 0 },
  { id: '08', title: 'Uncle Bobby & Jason Keaton (feat. JaVonté)', artist: 'Kendrick Lamar', album: 'Kendrick Lamar EP', src: '/music/08 Uncle Bobby & Jason Keaton (feat. JaVonté).mp3', duration: 0 },
  { id: '09', title: 'Faith (feat. BJ The Chicago Kid & Punch)', artist: 'Kendrick Lamar', album: 'Kendrick Lamar EP', src: '/music/09 Faith (feat. BJ The Chicago Kid & Punch).mp3', duration: 0 },
  { id: '10', title: 'Trip',                                 artist: 'Kendrick Lamar', album: 'Kendrick Lamar EP', src: '/music/10 Trip.mp3', duration: 0 },
  { id: '11', title: 'Vanity Slaves',                        artist: 'Kendrick Lamar', album: 'Kendrick Lamar EP', src: '/music/11 Vanity Slaves.mp3', duration: 0 },
  { id: '12', title: 'Far From Here (feat. ScHoolboy Q)',    artist: 'Kendrick Lamar', album: 'Kendrick Lamar EP', src: '/music/12 Far From Here (feat. ScHoolboy Q).mp3', duration: 0 },
  { id: '13', title: 'Thanksgiving (feat. Big Pooh)',        artist: 'Kendrick Lamar', album: 'Kendrick Lamar EP', src: '/music/13 Thanksgiving (feat. Big Pooh).mp3', duration: 0 },
  { id: '14', title: 'Let Me Be Me',                        artist: 'Kendrick Lamar', album: 'Kendrick Lamar EP', src: '/music/14 Let Me Be Me.mp3', duration: 0 },
  { id: '15', title: 'Determined (feat. Ash Riser)',         artist: 'Kendrick Lamar', album: 'Kendrick Lamar EP', src: '/music/15 Determined (feat. Ash Riser).mp3', duration: 0 },
];

export function formatTime(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

export function nextTrackIndex(current: number, count: number, shuffle: boolean) {
  if (count < 2) return 0;
  if (!shuffle) return (current + 1) % count;
  return (current + 1 + Math.floor(Math.random() * (count - 1))) % count;
}
