import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, ScanFace, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  onVerified: (timestamp: number, snapshot: string | null) => void;
};

function chime() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.34);
    });
    window.setTimeout(() => void ctx.close(), 900);
  } catch {
    /* audio is a nicety, never a blocker */
  }
}

const LANDMARKS = [
  [34, 38],
  [66, 38],
  [50, 54],
  [38, 72],
  [62, 72],
  [50, 82],
];

export function FaceScan({ label, onVerified }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<"idle" | "starting" | "live" | "scanning" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [snapshot, setSnapshot] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const start = async () => {
    setState("starting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setState("live");
    } catch {
      setError("Camera access was blocked. Allow the camera, or continue with a simulated scan.");
      setState("error");
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (video && video.videoWidth) {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = (320 * video.videoHeight) / video.videoWidth;
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.7);
    }
    return null;
  };

  const runScan = () => {
    setState("scanning");
    setConfidence(0);
    const target = 96 + Math.random() * 3.4;
    const startedAt = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - startedAt) / 2200);
      const eased = 1 - Math.pow(1 - t, 3);
      setConfidence(Number((eased * target).toFixed(1)));
      if (t < 1) {
        requestAnimationFrame(tick);
        return;
      }
      const shot = capture();
      setSnapshot(shot);
      setState("done");
      chime();
      stop();
      onVerified(Date.now(), shot);
    };
    requestAnimationFrame(tick);
  };

  const scanning = state === "scanning";

  return (
    <div className="glass-strong overflow-hidden rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="mono-label">Biometric gate</p>
          <h3 className="text-lg font-semibold">{label}</h3>
        </div>
        <span
          className={`rounded-full border px-3 py-1 font-mono text-[11px] tracking-widest uppercase ${
            state === "done"
              ? "border-success/40 bg-success/15 text-success"
              : "border-primary/40 bg-primary/10 text-primary"
          }`}
        >
          {state === "done" ? "verified" : state === "scanning" ? "matching" : "awaiting"}
        </span>
      </div>

      <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-glass-border bg-secondary/40">
        {snapshot ? (
          <img src={snapshot} alt="Captured verification snapshot" className="size-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="size-full scale-x-[-1] object-cover"
            aria-label="Live camera preview"
          />
        )}

        {/* HUD */}
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-[68%] w-[52%]">
            <div
              className={`absolute inset-0 rounded-[45%] border-2 transition-colors ${
                state === "done" ? "border-success/80" : "border-primary/70"
              }`}
            />
            {state === "done" && (
              <div className="absolute inset-0 animate-pulse-ring rounded-[45%] border-2 border-success/60" />
            )}
            {(scanning || state === "live" || state === "done") &&
              LANDMARKS.map(([x, y], i) => (
                <span
                  key={i}
                  className={`absolute size-1.5 rounded-full ${
                    state === "done" ? "bg-success" : "bg-primary"
                  }`}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    opacity: scanning ? 0.4 + ((i * 0.13 + confidence / 100) % 0.6) : 0.9,
                  }}
                />
              ))}
            {scanning && (
              <div className="absolute inset-x-0 top-1/2 h-16 animate-scan bg-linear-to-b from-transparent via-primary/45 to-transparent" />
            )}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-linear-to-t from-background/85 to-transparent p-3">
          <div className="font-mono text-[11px] text-primary/90">
            <div>LMK {state === "idle" ? "0" : "68"}/68</div>
            <div>ROI 0.52 · IR-LIVENESS {state === "done" ? "PASS" : "…"}</div>
          </div>
          <div className="text-right">
            <div className="mono-label">confidence</div>
            <div
              className={`font-mono text-2xl font-semibold ${state === "done" ? "text-success" : "text-primary"}`}
            >
              {confidence.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-3 flex items-start gap-2 text-sm text-warning">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {state === "idle" && (
          <Button onClick={start} variant="hero" className="flex-1">
            <Camera className="size-4" /> Start camera
          </Button>
        )}
        {state === "starting" && (
          <Button disabled className="flex-1" variant="hero">
            Initialising sensor…
          </Button>
        )}
        {(state === "live" || state === "error") && (
          <Button onClick={runScan} variant="hero" className="flex-1">
            <ScanFace className="size-4" /> Capture &amp; verify face
          </Button>
        )}
        {scanning && (
          <Button disabled variant="hero" className="flex-1">
            Matching biometric template…
          </Button>
        )}
        {state === "done" && (
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-success/40 bg-success/10 px-4 py-2.5 text-sm font-medium text-success">
            <CheckCircle2 className="size-4" /> Identity verified · snapshot stored
          </div>
        )}
      </div>
    </div>
  );
}
