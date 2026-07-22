/**
 * 게임 효과음 — 오디오 파일 없이 Web Audio API로 즉석 합성한다(무설치·오프라인·경량).
 *
 * 브라우저 자동재생 정책상 AudioContext 는 사용자 제스처 전엔 suspended 다 —
 * 첫 클릭/터치/키 입력에서 resume 하도록 전역 리스너를 걸어 잠금을 푼다.
 * 음소거 상태는 localStorage 에 저장한다.
 *
 * 소리는 store 상태 변화를 관찰하는 useGameSounds 가 서버 이벤트 시점에 재생하므로,
 * 호스트·참가자 모두 같은 순간에 같은 소리를 듣는다.
 */

export type SoundName =
  | 'start'
  | 'spin'
  | 'win'
  | 'reveal'
  | 'shuffle'
  | 'pickSafe'
  | 'pickBlank'
  | 'pump'
  | 'pop'
  | 'descend'
  | 'vote'
  | 'pass';

const MUTE_KEY = 'pmu.sound.muted';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  muted = false;
}

/** AudioContext 를 지연 생성하고, suspended 면 resume 한다. */
function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.2; // 전체 볼륨(과하지 않게)
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// 첫 사용자 제스처에서 오디오 잠금 해제(모바일은 이후에도 재-suspend 될 수 있어 계속 듣는다).
if (typeof window !== 'undefined') {
  const unlock = () => {
    if (!muted) ensure();
  };
  for (const evt of ['pointerdown', 'keydown', 'touchstart']) {
    window.addEventListener(evt, unlock, { passive: true });
  }
}

/** 감쇠 엔벨로프를 가진 오실레이터 한 음. freqTo 를 주면 그 값으로 글라이드한다. */
function tone(
  c: AudioContext,
  o: {
    freq: number;
    dur: number;
    type?: OscillatorType;
    when?: number;
    gain?: number;
    freqTo?: number;
  },
): void {
  if (!master) return;
  const t0 = c.currentTime + (o.when ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.freqTo) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqTo), t0 + o.dur);
  }
  const peak = o.gain ?? 0.5;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.02);
}

/** 필터링된 화이트 노이즈 한 방(터짐·섞기·스와이프용). */
function noise(
  c: AudioContext,
  o: { dur: number; when?: number; gain?: number; type?: BiquadFilterType; freq?: number },
): void {
  if (!master) return;
  const t0 = c.currentTime + (o.when ?? 0);
  const n = Math.max(1, Math.floor(c.sampleRate * o.dur));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = o.type ?? 'highpass';
  filter.frequency.value = o.freq ?? 1000;
  const g = c.createGain();
  g.gain.setValueAtTime(o.gain ?? 0.5, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + o.dur);
}

/**
 * 이름 있는 효과음 재생. 음소거이거나 오디오 미지원이면 조용히 무시한다.
 * pump 는 opts.level(0..1)로 음높이가 올라가 풍선이 팽팽해지는 긴장감을 준다.
 */
export function playSound(name: SoundName, opts: { level?: number } = {}): void {
  if (muted) return;
  const c = ensure();
  if (!c || !master) return;

  switch (name) {
    case 'start': // 게임 시작 — 밝게 올라가는 두 음
      tone(c, { freq: 523, dur: 0.12, type: 'triangle', gain: 0.5 });
      tone(c, { freq: 784, dur: 0.18, type: 'triangle', gain: 0.5, when: 0.1 });
      break;
    case 'spin': {
      // 룰렛 회전 — 점점 느려지는 딸깍 소리(~3.6s, 원판 회전과 맞춘다)
      let t = 0;
      let interval = 0.05;
      for (let i = 0; i < 44 && t < 3.6; i++) {
        tone(c, { freq: 900, dur: 0.028, type: 'square', gain: 0.22, when: t });
        t += interval;
        interval *= 1.085;
      }
      break;
    }
    case 'win': {
      // 당첨 — 메이저 아르페지오
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) =>
        tone(c, { freq: f, dur: 0.24, type: 'triangle', gain: 0.5, when: i * 0.11 }),
      );
      break;
    }
    case 'reveal': // 순서 공개 — 위로 훑는 글라이드
      tone(c, { freq: 400, freqTo: 1200, dur: 0.5, type: 'sine', gain: 0.45 });
      break;
    case 'shuffle': // 섞기 — 두 번의 스와이프
      noise(c, { dur: 0.22, gain: 0.32, type: 'bandpass', freq: 1200 });
      noise(c, { dur: 0.22, gain: 0.28, type: 'bandpass', freq: 1700, when: 0.16 });
      break;
    case 'pickSafe': // 안전한 제비 — 밝은 딩동
      tone(c, { freq: 659, dur: 0.12, type: 'triangle', gain: 0.5 });
      tone(c, { freq: 988, dur: 0.16, type: 'triangle', gain: 0.42, when: 0.09 });
      break;
    case 'pickBlank': // 꽝 — 아래로 처지는 부저
      tone(c, { freq: 200, freqTo: 110, dur: 0.3, type: 'sawtooth', gain: 0.4 });
      break;
    case 'pump': {
      // 풍선 펌프 — 누적 펌프가 많을수록 높은 음(긴장감)
      const lvl = Math.min(1, Math.max(0, opts.level ?? 0.3));
      const base = 300 + lvl * 520;
      tone(c, { freq: base, freqTo: base * 1.5, dur: 0.16, type: 'sine', gain: 0.5 });
      break;
    }
    case 'pop': // 풍선 터짐 — 노이즈 펑 + 낮은 쿵
      noise(c, { dur: 0.12, gain: 0.85, type: 'highpass', freq: 700 });
      tone(c, { freq: 160, freqTo: 55, dur: 0.24, type: 'sawtooth', gain: 0.6, when: 0.005 });
      break;
    case 'descend': {
      // 사다리 내려가기 — 내려가는 계단 음
      const notes = [784, 659, 523, 440];
      notes.forEach((f, i) =>
        tone(c, { freq: f, dur: 0.1, type: 'square', gain: 0.3, when: i * 0.08 }),
      );
      break;
    }
    case 'vote': // 투표 한 표 — 짧고 부드러운 딩
      tone(c, { freq: 520, dur: 0.08, type: 'sine', gain: 0.4 });
      tone(c, { freq: 680, dur: 0.1, type: 'sine', gain: 0.34, when: 0.06 });
      break;
    case 'pass': // 넘기기 — 짧은 스와이프
      noise(c, { dur: 0.28, gain: 0.28, type: 'bandpass', freq: 900 });
      break;
  }
}

export function isMuted(): boolean {
  return muted;
}

/** 음소거 설정(저장). 켜면 오디오 잠금도 함께 해제해 다음 소리가 바로 난다. */
export function setMuted(next: boolean): void {
  muted = next;
  try {
    localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  } catch {
    /* 저장 실패는 무시 */
  }
  if (!next) ensure();
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}
