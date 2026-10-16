import { useEffect, useRef, type RefObject } from 'react';

type Props = {
  analyserRef:  RefObject<AnalyserNode | null>;
  playingRef:   RefObject<boolean>;
  modeRef:      RefObject<number>;
  intensityRef: RefObject<number>;
};

class BeatDetector {
  private history: number[] = [];
  private readonly size = 43;
  pulse = 0;

  tick(energy: number) {
    this.history.push(energy);
    if (this.history.length > this.size) this.history.shift();
    const avg = this.history.reduce((a, b) => a + b, 0) / this.history.length;
    if (energy > avg * 1.45 && energy > 0.08) this.pulse = 1.0;
    this.pulse *= 0.88;
  }
}

function bands(data: Uint8Array, n: number) {
  const avg = (lo: number, hi: number) => {
    let s = 0, end = Math.min(hi, n - 1);
    for (let i = lo; i <= end; i++) s += data[i];
    return s / ((end - lo + 1) * 255);
  };
  return { sub: avg(0,3), bass: avg(4,12), mid: avg(13,50), high: avg(51,120) };
}

export function Visualizer({ analyserRef, playingRef, modeRef, intensityRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const style  = getComputedStyle(canvas);
    const colors = style.getPropertyValue('--visual-colors').trim().split('|');
    const fall   = style.getPropertyValue('--display-text').trim() || '#fff';
    const bg     = '#000000';
    const c      = (i: number) => colors[i % colors.length] ?? fall;

    const beat = new BeatDetector();
    let data   = new Uint8Array(128);
    let sBass  = 0, sMid = 0, sHigh = 0;
    let time   = 0;
    let frame  = 0;

    const draw = () => {
      frame = requestAnimationFrame(draw);

      const an        = analyserRef.current;
      const isPlaying = playingRef.current;
      const mode      = modeRef.current;
      const intScale  = (intensityRef.current ?? 65) / 65;

      // Sync data buffer size to analyser
      const binCount = an ? an.frequencyBinCount : 128;
      if (data.length !== binCount) data = new Uint8Array(binCount);

      if (an && isPlaying) {
        an.getByteFrequencyData(data);
      } else {
        data.fill(0);
      }

      const b = bands(data, binCount);
      beat.tick(b.sub + b.bass);

      const k = 0.18;
      sBass += (b.bass - sBass) * k;
      sMid  += (b.mid  - sMid)  * k;
      sHigh += (b.high - sHigh) * k;
      const pulse = beat.pulse;

      time += isPlaying ? 0.018 : 0.004;

      // Resize
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * 2 || canvas.height !== h * 2) {
        canvas.width = w * 2; canvas.height = h * 2;
      }
      ctx.setTransform(2, 0, 0, 2, 0, 0);

      // Clear
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // ── MODE 1: Spectrum bars ──────────────────────────────────────────
      if (mode === 1) {
        const bars = Math.min(binCount, 64);
        const bw   = w / bars;
        ctx.globalCompositeOperation = 'screen';

        for (let i = 0; i < bars; i++) {
          const raw   = isPlaying && an
            ? (data[i] ?? 0) / 255
            : 0.08 + Math.abs(Math.sin(i * 0.4 + time)) * 0.18;
          const boost = i < 6 ? 1 + pulse * 0.6 * intScale : 1;
          const val   = Math.min(raw * boost, 1);
          const barH  = val * h * 0.9 * intScale;
          const x     = i * bw;
          const y     = h / 2 - barH / 2;

          const grad = ctx.createLinearGradient(0, y, 0, y + barH);
          grad.addColorStop(0,   c(i));
          grad.addColorStop(0.5, c(i + 1));
          grad.addColorStop(1,   c(i));
          ctx.fillStyle   = grad;
          ctx.shadowColor = c(i);
          ctx.shadowBlur  = val > 0.5 ? 8 + pulse * 14 : 0;
          ctx.globalAlpha = 0.75 + val * 0.25;
          ctx.fillRect(x + 1, y, bw - 2, barH || 1);

          if (pulse > 0.5 && i < 8) {
            ctx.globalAlpha = pulse * 0.9;
            ctx.fillStyle   = '#fff';
            ctx.fillRect(x + 1, y - 2, bw - 2, 2);
          }
        }
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';

      // ── MODE 0 & 2: Radial waveform ────────────────────────────────────
      } else {
        const LAYERS = 28;
        ctx.globalCompositeOperation = 'screen';

        for (let layer = 0; layer < LAYERS; layer++) {
          const angle      = layer * 0.08 + time * 0.14;
          const bandEnergy = layer < 10 ? sBass * intScale
            : layer < 20 ? sMid  * intScale
            :               sHigh * intScale;
          const beatR = layer < 8 ? pulse * h * 0.065 * intScale : 0;

          ctx.beginPath();
          for (let i = 0; i <= 90; i++) {
            const a = (i / 90) * Math.PI * 2;
            const wobble = Math.sin(a * (mode === 2 ? 5 : 3) + time * 2 + layer * 0.055)
              * h * (0.10 + bandEnergy * 0.22);
            const r = h * (0.12 + layer * 0.008) + wobble + beatR;
            const x = w / 2 + Math.cos(a + angle) * r * (1.3 + Math.sin(time * 0.18) * 0.12);
            const y = h / 2 + Math.sin(a) * r * 0.78
              + Math.sin(a * 2 + time + layer * 0.09) * h * 0.08;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.strokeStyle = c(Math.floor(layer / 10));
          ctx.globalAlpha = 0.28 + (layer / LAYERS) * 0.45;
          ctx.lineWidth   = 1 + bandEnergy * 2;
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur  = layer % 4 === 0 ? 4 + bandEnergy * 10 + pulse * 8 : 0;
          ctx.stroke();
        }
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    };

    draw();
    return () => cancelAnimationFrame(frame);
  }, []); // single loop, reads refs every frame

  return (
    <canvas
      ref={canvasRef}
      className="visualizer-canvas"
      aria-label="Animated music visualization"
    />
  );
}
