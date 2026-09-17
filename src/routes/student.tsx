import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Fingerprint,
  Hand,
  Lock,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FaceScan } from "@/components/FaceScan";
import { ProximityMeter } from "@/components/ProximityMeter";
import {
  fmtClock,
  fmtTime,
  isWindowOpen,
  markPresent,
  patchStudent,
  upsertStudent,
  useNow,
  useSession,
} from "@/lib/attendance";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "Student Attendance Portal — PresenceGrid" },
      {
        name: "description",
        content:
          "Verify your face, confirm Bluetooth proximity to the classroom beacon and mark yourself present inside the live 120-second window.",
      },
      { property: "og:title", content: "Student Attendance Portal — PresenceGrid" },
      {
        property: "og:description",
        content:
          "Face-verified, proximity-checked attendance with an instant digital confirmation ticket.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentPortal,
});

type Identity = { id: string; name: string; collegeId: string; roll: string };

function StudentPortal() {
  const session = useSession();
  const now = useNow(true);
  const [form, setForm] = useState({ name: "", collegeId: "" });
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [faceAt, setFaceAt] = useState<number | null>(null);
  const [proximity, setProximity] = useState<{ rssi: number; inRange: boolean } | null>(null);

  const me = identity ? session.students.find((s) => s.id === identity.id) ?? null : null;
  const windowOpen = isWindowOpen(session, now);
  const remaining = session.closesAt ? Math.max(0, session.closesAt - now) : 0;

  useEffect(() => {
    if (!identity || !faceAt) return;
    upsertStudent({
      ...identity,
      rssi: proximity?.rssi ?? null,
      inRange: proximity?.inRange ?? false,
      faceVerifiedAt: faceAt,
    });
  }, [identity, faceAt, proximity]);

  const handleProximity = useCallback((rssi: number, inRange: boolean) => {
    setProximity({ rssi, inRange });
  }, []);

  useEffect(() => {
    if (identity && proximity && me && me.status !== "present") {
      patchStudent(identity.id, { rssi: proximity.rssi, inRange: proximity.inRange });
    }
  }, [identity, proximity, me]);

  const canMark = Boolean(faceAt) && windowOpen && Boolean(proximity?.inRange) && !session.locked;

  if (!identity) {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-lg">
          <form
            className="glass-strong animate-rise rounded-3xl p-7"
            onSubmit={(e) => {
              e.preventDefault();
              const roll = form.collegeId.replace(/\D/g, "").slice(-2) || "00";
              setIdentity({
                id: `stu-${form.collegeId.trim().toUpperCase()}`,
                name: form.name.trim(),
                collegeId: form.collegeId.trim().toUpperCase(),
                roll,
              });
            }}
          >
            <span className="mono-label">student access</span>
            <h1 className="mt-3 text-3xl font-semibold">Student sign-in</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your name and college ID are matched against the roster before biometric verification.
            </p>
            <div className="mt-7 space-y-4">
              <Field
                id="s-name"
                label="Full name"
                placeholder="Aarav Menon"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
              />
              <Field
                id="s-id"
                label="College ID"
                placeholder="CS21-014"
                value={form.collegeId}
                onChange={(v) => setForm({ ...form, collegeId: v })}
              />
            </div>
            <Button type="submit" variant="hero" size="lg" className="mt-7 w-full">
              Continue to face verification
            </Button>
          </form>
        </div>
      </Shell>
    );
  }

  if (me?.status === "present" && me.markedAt) {
    return (
      <Shell>
        <Ticket
          name={me.name}
          collegeId={me.collegeId}
          roll={me.roll}
          subject={session.teacher.subject}
          sessionId={session.id}
          markedAt={me.markedAt}
          rssi={me.rssi}
          locked={session.locked}
          hash={session.hash}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="animate-rise grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="glass-strong rounded-3xl p-6">
            <span className="mono-label">signed in as</span>
            <h1 className="mt-2 text-2xl font-semibold">{identity.name}</h1>
            <p className="text-sm text-muted-foreground">
              {identity.collegeId} · roll {identity.roll}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {faceAt ? (
              <GateDone
                title="Face verified"
                detail={`Biometric match locked at ${fmtTime(faceAt)}`}
              />
            ) : (
              <FaceScan label={identity.name} onVerified={(ts) => setFaceAt(ts)} />
            )}
            <ProximityMeter onChange={handleProximity} />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="glass-strong rounded-3xl p-6">
            <span className="mono-label">attendance window</span>
            <div className="mt-3 flex items-center gap-3">
              <Clock className={`size-5 ${windowOpen ? "text-success" : "text-muted-foreground"}`} />
              <span className="font-mono text-3xl font-semibold">{fmtClock(remaining)}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {session.locked
                ? "This session is locked. No further submissions are accepted."
                : windowOpen
                  ? `${session.teacher.subject || "Session"} is accepting marks right now.`
                  : "Waiting for your teacher to open the 120-second window."}
            </p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-linear-to-r from-primary to-accent transition-all duration-200"
                style={{ width: `${(remaining / 120000) * 100}%` }}
              />
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <span className="mono-label">gates</span>
            <ul className="mt-3 space-y-2.5">
              <Gate ok={Boolean(faceAt)} label="Face biometrically verified" />
              <Gate ok={Boolean(proximity?.inRange)} label="Bluetooth proximity satisfied" />
              <Gate ok={windowOpen} label="120-second window active" />
            </ul>
            <Button
              variant="hero"
              size="xl"
              className="mt-6 w-full"
              disabled={!canMark}
              onClick={() => markPresent(identity.id)}
            >
              {session.locked ? (
                <>
                  <Lock className="size-4" /> Session locked
                </>
              ) : (
                <>
                  <Hand className="size-4" /> Mark present
                </>
              )}
            </Button>
            {!canMark && !session.locked && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                All three gates must be green before you can mark attendance.
              </p>
            )}
          </div>
        </aside>
      </div>
    </Shell>
  );
}

function Gate({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      {ok ? (
        <CheckCircle2 className="size-4 shrink-0 text-success" />
      ) : (
        <XCircle className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}

function GateDone({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="glass-strong flex flex-col justify-center rounded-3xl p-6">
      <ShieldCheck className="size-7 text-success" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function Ticket(props: {
  name: string;
  collegeId: string;
  roll: string;
  subject: string;
  sessionId: string;
  markedAt: number;
  rssi: number | null;
  locked: boolean;
  hash: string | null;
}) {
  const payload = useMemo(
    () =>
      JSON.stringify({
        s: props.sessionId,
        id: props.collegeId,
        n: props.name,
        t: new Date(props.markedAt).toISOString(),
        rssi: props.rssi,
        h: props.hash,
      }),
    [props],
  );
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(payload, {
      margin: 1,
      width: 320,
      color: { dark: "#0d1420ff", light: "#eafcffff" },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [payload]);

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="glass-strong animate-rise overflow-hidden rounded-3xl">
        <div className="border-b border-dashed border-glass-border bg-success/10 px-7 py-6 text-center">
          <BadgeCheck className="mx-auto size-10 text-success" />
          <h1 className="mt-3 text-2xl font-semibold">Attendance confirmed</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {props.subject || "Class session"} · {props.sessionId}
          </p>
        </div>

        <div className="space-y-3 px-7 py-6 text-sm">
          <Line k="Student" v={props.name} />
          <Line k="College ID" v={props.collegeId} />
          <Line k="Roll" v={props.roll} />
          <Line k="Marked at" v={fmtTime(props.markedAt)} />
          <Line k="Beacon RSSI" v={props.rssi === null ? "—" : `${props.rssi} dBm`} />
          <Line k="Face match" v="Verified" />
          <Line
            k="Record state"
            v={props.locked ? `Locked · ${props.hash ?? ""}` : "Open until teacher locks"}
          />
        </div>

        <div className="flex flex-col items-center border-t border-dashed border-glass-border px-7 py-6">
          <span className="mono-label">verification qr</span>
          {qr ? (
            <img
              src={qr}
              alt="Attendance verification QR code"
              className="mt-3 size-44 rounded-xl border border-glass-border"
            />
          ) : (
            <div className="mt-3 size-44 animate-pulse rounded-xl bg-muted" />
          )}
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Present this ticket if your record is ever audited.
          </p>
        </div>
      </div>
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="mono-label">{k}</span>
      <span className="text-right font-medium break-all">{v}</span>
    </div>
  );
}

function Field({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="mono-label">
        {label}
      </Label>
      <Input
        id={id}
        required
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 border-glass-border bg-secondary/40"
      />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />
      <div className="relative mx-auto w-full max-w-6xl px-5 py-10">
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" /> Portals
          </Link>
          <div className="flex items-center gap-2">
            <Fingerprint className="size-4 text-primary" />
            <span className="font-display text-sm font-semibold">Student portal</span>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
