import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { AudioLines, ChevronDown, Disc3, Expand, Heart, ListMusic, Minus, Pause, Play, Plus, Repeat2, Settings2, Shuffle, SkipBack, SkipForward, Square, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Visualizer } from '@/components/visualizer';
import { demoTracks, formatTime, nextTrackIndex, type Track } from '@/lib/player';
const cover = '/cover/ep-cover.jpg';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: '2K CORE' }, { name: 'description', content: 'A retro chrome music player with live visualizations and your own music.' }, { property: 'og:title', content: '2K CORE' }, { property: 'og:description', content: 'Your music. A chrome desktop player with live visualizations.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: MusicPlayer,
});

function WindowTitle({ children, icon = 'audio' }: { children: React.ReactNode; icon?: string }) {
  return (
    <div className="title-bar">
      <div className="title-label">
        {icon === 'audio' ? <AudioLines size={12} /> : icon === 'list' ? <ListMusic size={12} /> : <Disc3 size={12} />}
        {children}
      </div>
      <div className="title-controls" aria-hidden="true"><i>−</i><i>×</i></div>
    </div>
  );
}

function MusicPlayer() {
  const [tracks, setTracks] = useState<Track[]>(demoTracks);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [mode, setMode] = useState(0);
  const [intensity, setIntensity] = useState(65);
  const [settings, setSettings] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [notice, setNotice] = useState('');
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const objectUrls = useRef<string[]>([]);
  const playIntent = useRef(false);

  // All visualizer/meter state lives in refs — zero render-cycle lag
  const meterRefs    = useRef<(HTMLElement | null)[]>([]);
  const meterFrameRef = useRef<number>(0);
  const analyserRef  = useRef<AnalyserNode | null>(null);
  const playingRef   = useRef(false);
  const modeRef      = useRef(0);
  const intensityRef = useRef(65);

  const track = tracks[index];
  const modeNames = ['Prismatic flow', 'Spectrum', 'Liquid bloom'];

  // Keep mode/intensity refs in sync for the visualizer loop
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { intensityRef.current = intensity; }, [intensity]);

  // Preload durations for all demo tracks at startup
  useEffect(() => {
    demoTracks.forEach(t => {
      if (t.duration > 0) return; // already known
      const a = new Audio();
      a.preload = 'metadata';
      a.src = t.src;
      a.onloadedmetadata = () => {
        const d = a.duration;
        if (Number.isFinite(d) && d > 0) {
          setTracks(prev => prev.map(p => p.id === t.id ? { ...p, duration: d } : p));
        }
        a.src = ''; // release
      };
    });
  }, []);

  // Live mini-meter — reads analyser directly, no React state
  useEffect(() => {
    const data = new Uint8Array(80);
    const tick = () => {
      meterFrameRef.current = requestAnimationFrame(tick);
      if (analyserRef.current && playingRef.current) {
        analyserRef.current.getByteFrequencyData(data);
        meterRefs.current.forEach((el, i) => {
          if (!el) return;
          const bin = Math.floor(i * (80 / 18));
          const h = Math.max(4, (data[bin] / 255) * 100);
          el.style.height = h + '%';
          el.style.opacity = String(0.4 + (data[bin] / 255) * 0.6);
        });
      } else {
        const t = performance.now() / 400;
        meterRefs.current.forEach((el, i) => {
          if (!el) return;
          el.style.height = (10 + Math.abs(Math.sin(t + i * 0.45)) * 18) + '%';
          el.style.opacity = '0.3';
        });
      }
    };
    tick();
    return () => cancelAnimationFrame(meterFrameRef.current);
  }, []);

  useEffect(() => () => {
    objectUrls.current.forEach(URL.revokeObjectURL);
    contextRef.current?.close();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    setElapsed(0);
    setDuration(track?.duration ?? 0);
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    if (playIntent.current && track) {
      audio.play().catch(() => {
        setPlaying(false);
        setNotice('Playback could not start. Press play to try again.');
      });
    }
  }, [track?.id]);

  async function play() {
    const audio = audioRef.current;
    if (!audio || !track) return;
    try {
      if (!contextRef.current) {
        const context = new AudioContext();
        contextRef.current = context;
        const node = context.createAnalyser();
        node.fftSize = 1024;
        node.smoothingTimeConstant = 0.8;
        const source = context.createMediaElementSource(audio);
        source.connect(node);
        node.connect(context.destination);
        // Set ref FIRST so visualizer draw loop sees it immediately
        analyserRef.current = node;
        setAnalyser(node);
      }
      await contextRef.current.resume();
      await audio.play();
      playIntent.current = true;
      playingRef.current = true;
      setNotice('');
    } catch (e) {
      console.error('Playback error:', e);
      setNotice('This audio file could not play. Try another file.');
      setPlaying(false);
      playIntent.current = false;
    }
  }

  function togglePlay() {
    if (playing) {
      audioRef.current?.pause();
      playIntent.current = false;
      playingRef.current = false;
    } else void play();
  }
  function chooseTrack(i: number) {
    if (i === index) { void play(); return; }
    playIntent.current = true;
    setIndex(i);
  }
  function next() { if (tracks.length) chooseTrack(nextTrackIndex(index, tracks.length, shuffle)); }
  function stop() {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setElapsed(0);
    playIntent.current = false;
  }
  function remove() {
    if (!track) return;
    stop();
    setTracks(tracks.filter(t => t.id !== track.id));
    setIndex(Math.max(0, Math.min(index, tracks.length - 2)));
  }
  function importFiles(files: FileList | null) {
    if (!files) return;
    const imported = Array.from(files)
      .filter(f => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f.name))
      .map(f => {
        const src = URL.createObjectURL(f);
        objectUrls.current.push(src);
        return { id: crypto.randomUUID(), title: f.name.replace(/\.[^.]+$/, ''), artist: 'Local music', album: 'Your collection', src, duration: 0, local: true };
      });
    if (!imported.length) { setNotice('Please choose an audio file.'); return; }
    setTracks(old => [...old, ...imported]);
    setNotice('');
  }
  function seek(value: number) {
    if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
      audioRef.current.currentTime = value;
      setElapsed(value);
    }
  }

  return (
    <main className={`app-shell${expanded ? ' expanded' : ''}`}>
      <div className="desktop">
        <section className="window player-window" aria-label="Music player">
          <WindowTitle>2K CORE</WindowTitle>
          <nav className="menu-bar" aria-label="Player menu">
            <Button variant="player" onClick={() => fileRef.current?.click()}>File</Button>
            <Button variant="player" onClick={togglePlay}>Play</Button>
            <Button variant="player" onClick={() => setSettings(!settings)} data-active={settings}>Options</Button>
            <Button variant="player" onClick={() => setMode((mode + 1) % 3)}>View</Button>
            <Button variant="player" onClick={() => setNotice(notice ? '' : 'Add your audio files with the + Add button.')}>Help</Button>
          </nav>
          <div className="visual-toolbar">
            <Button variant="chrome" onClick={() => setMode((mode + 1) % 3)}><AudioLines /> Visualizer <ChevronDown /></Button>
            <div className="visual-buttons">
              <span className="tiny-label self-center">{(modeNames[mode] ?? 'Prismatic flow').toUpperCase()}</span>
              <Button variant="chrome" size="icon" title={expanded ? 'Exit expanded view' : 'Expand visualizer'} aria-label="Expand visualizer" onClick={() => setExpanded(!expanded)}><Expand /></Button>
            </div>
          </div>
          <div className="visual-screen">
            <Visualizer analyserRef={analyserRef} playingRef={playingRef} modeRef={modeRef} intensityRef={intensityRef} />
            <div className="screen-top"><span>2K CORE VISUAL ENGINE</span><span>LIVE / {String(mode + 1).padStart(2, '0')}</span></div>
            <div className="screen-bottom"><span>✧ {(modeNames[mode] ?? 'Prismatic flow').toUpperCase()}</span><span>{playing ? '2K CORE ACTIVE' : 'AWAITING SIGNAL'} · 60 FPS</span></div>
          </div>
          <div className="visual-bottom">
            <div className="visual-buttons">
              <Button variant="chrome" title="Previous visualization" aria-label="Previous visualization" onClick={() => setMode((mode + 2) % 3)}><SkipBack /></Button>
              <Button variant="chrome" title="Next visualization" aria-label="Next visualization" onClick={() => setMode((mode + 1) % 3)}><SkipForward /></Button>
              <Button variant="chrome" onClick={() => setMode(Math.floor(Math.random() * 3))}><Shuffle /> Random</Button>
            </div>
            <span className="tiny-label">PRESET {String(mode + 1).padStart(2, '0')} / 03</span>
          </div>
          {settings && (
            <div className="settings-strip">
              <Settings2 size={14} />
              <label htmlFor="intensity">Intensity</label>
              <input id="intensity" type="range" min={20} max={100} value={intensity} onChange={e => setIntensity(Number(e.target.value))} />
              <span>{intensity}%</span>
            </div>
          )}
          <div className="now-playing">
            <div>
              <div className="digital-time">{formatTime(elapsed).padStart(5, '0')}</div>
              <div className="audio-info"><span>172 KBPS</span><span>44 KHZ</span><span>STEREO</span></div>
            </div>
            <div className="track-display">
              <small>{playing ? '▶ NOW PLAYING' : 'Ⅱ READY TO PLAY'}</small>
              <h2>{track?.title ?? 'Nothing in the queue'}</h2>
              <p>{track?.artist ?? '2K CORE'} — {track?.album ?? 'Your collection'}</p>
            </div>
            {/* Live mini-meter — bars driven by analyser ref loop, no React re-renders */}
            <div className="mini-meter" aria-hidden="true">
              {Array.from({ length: 18 }, (_, i) => (
                <i key={i} ref={el => { meterRefs.current[i] = el; }} style={{ transition: 'height 0.05s, opacity 0.05s' }} />
              ))}
            </div>
          </div>
          <div className="seek-row">
            <span>{formatTime(elapsed)}</span>
            <input type="range" className="seek-slider" aria-label="Playback position" min={0} max={duration || 1} step={0.1} value={Math.min(elapsed, duration || 1)} onChange={e => seek(Number(e.target.value))} />
            <span>{formatTime(duration)}</span>
          </div>
          <div className="transport-row">
            <div className="transport-group">
              <Button variant="transport" aria-label="Previous track" title="Previous track" onClick={() => chooseTrack((index - 1 + tracks.length) % tracks.length)} disabled={!track}><SkipBack /></Button>
              <Button variant="transport" className="play-main" aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause' : 'Play'} onClick={togglePlay} disabled={!track}>{playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</Button>
              <Button variant="transport" aria-label="Stop" title="Stop" onClick={stop}><Square size={12} fill="currentColor" /></Button>
              <Button variant="transport" aria-label="Next track" title="Next track" onClick={next} disabled={!track}><SkipForward /></Button>
            </div>
            <div className="volume-control">
              <Button variant="player" size="icon" aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted(!muted)}>{muted ? <VolumeX /> : <Volume2 />}</Button>
              <input type="range" aria-label="Volume" min={0} max={1} step={0.01} value={volume} onChange={e => setVolume(Number(e.target.value))} />
            </div>
            <div className="visual-buttons">
              <Button variant="chrome" size="icon" aria-label="Shuffle" title="Shuffle" data-active={shuffle} aria-pressed={shuffle} onClick={() => setShuffle(!shuffle)}><Shuffle /></Button>
              <Button variant="chrome" size="icon" aria-label="Repeat track" title="Repeat track" data-active={repeat} aria-pressed={repeat} onClick={() => setRepeat(!repeat)}><Repeat2 /></Button>
              <Button variant="chrome" size="icon" aria-label="Sound settings" title="Sound settings" data-active={settings} onClick={() => setSettings(!settings)}><Settings2 /></Button>
            </div>
          </div>
          {notice && <div role="status" className="notice">{notice}</div>}
          <div className="status-bar">
            <span><span className="signal-dot" />{playing ? 'PLAYING' : 'STANDBY'} · {track?.local ? 'LOCAL AUDIO' : 'KENDRICK LAMAR EP'}</span>
            <span>2K CORE AUDIO ENGINE</span>
          </div>
        </section>

        <aside className="right-stack">
          <section className="window playlist-window">
            <WindowTitle icon="list">PLAYLIST EDITOR</WindowTitle>
            <div className="playlist-top">
              <span>{tracks.some(t => t.local) ? 'YOUR COLLECTION' : '2K CORE'}</span>
              <span>{String(tracks.length).padStart(2, '0')} TRACKS</span>
            </div>
            <div className="playlist-screen">
              {tracks.map((t, i) => (
                <Button key={t.id} variant="player" className={`track-row${i === index ? ' selected' : ''}`} onClick={() => chooseTrack(i)} aria-label={`Play ${t.title}`}>
                  <span className="track-name">
                    <span className="track-number">{i === index && playing ? <AudioLines /> : String(i + 1).padStart(2, '0')}</span>
                    <span>{t.title}</span>
                  </span>
                  <span className="track-duration">{formatTime(t.duration)}</span>
                </Button>
              ))}
              {tracks.length === 0 && <div className="empty-queue">Your queue is empty.</div>}
            </div>
            <div className="playlist-actions">
              <div className="visual-buttons">
                <Button variant="chrome" onClick={() => fileRef.current?.click()}><Plus /> Add</Button>
                <Button variant="chrome" onClick={remove} disabled={!track}><Minus /> Rem</Button>
              </div>
              <Button variant="chrome" title="Reverse playlist" aria-label="Reverse playlist" onClick={() => { setTracks([...tracks].reverse()); setIndex(tracks.length - 1 - index); }}><ListMusic /></Button>
              <Button variant="chrome" onClick={() => { stop(); setTracks(demoTracks); setIndex(0); }}>Reset</Button>
            </div>
            <div className="status-bar">
              <span>{tracks.length} items</span>
              <span>{formatTime(tracks.reduce((sum, t) => sum + t.duration, 0))} total</span>
            </div>
          </section>

          <section className="window album-window">
            <WindowTitle icon="disc">ALBUM ART</WindowTitle>
            <div className="album-art-stage">
              <img className="album-cover" src={cover} alt="Album art" width={1024} height={1024} />
            </div>
            <div className="album-caption">
              <div>
                <h3>{track?.album ?? '2K CORE'}</h3>
                <p>{track?.artist ?? '2K CORE'}</p>
              </div>
              <button
                onClick={() => setLiked(!liked)}
                aria-label="Like album"
                aria-pressed={liked}
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'grid',
                  placeItems: 'center',
                  color: liked ? 'oklch(.75 .18 10)' : 'oklch(.55 .018 260)',
                  flexShrink: 0,
                }}
              >
                <Heart size={18} fill="currentColor" />
              </button>
            </div>
          </section>
        </aside>
      </div>

      <input ref={fileRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac" multiple hidden onChange={e => { importFiles(e.target.files); e.target.value = ''; }} />

      {/* crossOrigin removed — it blocks AudioContext.createMediaElementSource on local files */}
      <audio
        ref={audioRef}
        src={track?.src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={e => setElapsed(e.currentTarget.currentTime)}
        onLoadedMetadata={e => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d)) {
            setDuration(d);
            if (track?.local) setTracks(old => old.map(t => t.id === track.id ? { ...t, duration: d } : t));
          }
        }}
        onEnded={() => { if (repeat) { if (audioRef.current) audioRef.current.currentTime = 0; void play(); } else next(); }}
        onError={() => { setPlaying(false); setNotice('Unable to load this track. Try adding another audio file.'); }}
      />
    </main>
  );
}
