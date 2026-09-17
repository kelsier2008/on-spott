import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Download,
  FileJson,
  Fingerprint,
  Lock,
  Play,
  RotateCcw,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FaceScan } from "@/components/FaceScan";
import {
  WINDOW_MS,
  download,
  fmtClock,
  fmtTime,
  isWindowOpen,
  lockSession,
  openWindow,
  patchStudent,
  resetSession,
  startSession,
  toCsv,
  useNow,
  useSession,
  type AttendanceStatus,
  type StudentRecord,
} from "@/lib/attendance";

export const Route = createFileRoute("/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher Command Center — PresenceGrid" },
      {
        name: "description",
        content:
          "Open a 120-second attendance window, monitor face and Bluetooth verification live, override records and lock the session with a verification hash.",
      },
      { property: "og:title", content: "Teacher Command Center — PresenceGrid" },
      {
        property: "og:description",
        content:
          "Run a time-bounded attendance session with live roster, manual overrides and immutable lock.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeacherPortal,
});

function TeacherPortal() {
  const session = useSession();
  const [step, setStep] = useState<"form" | "face">("form");
  const [form, setForm] = useState({ name: "", facultyId: "", subject: "" });

  const signedIn = Boolean(session.teacher.faceVerifiedAt && session.teacher.facultyId);

  if (signedIn) return <CommandCenter />;

  return (
    <Shell>
      <div className="mx-auto w-full max-w-lg">
        {step === "form" ? (
          <form
            className="glass-strong animate-rise rounded-3xl p-7"
            onSubmit={(e) => {
              e.preventDefault();
              setStep("face");
            }}
          >
            <span className="mono-label">faculty access</span>
            <h1 className="mt-3 text-3xl font-semibold">Teacher sign-in</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Identify yourself, then clear the biometric gate to unlock the command center.
            </p>

            <div className="mt-7 space-y-4">
              <Field
                id="t-name"
                label="Full name"
                placeholder="Dr. Meera Raghavan"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
              />
              <Field
                id="t-id"
                label="Faculty ID"
                placeholder="FAC-2291"
                value={form.facultyId}
                onChange={(v) => setForm({ ...form, facultyId: v })}
              />
              <Field
                id="t-subject"
                label="Subject / course code"
                placeholder="CS-402 Distributed Systems"
                value={form.subject}
                onChange={(v) => setForm({ ...form, subject: v })}
              />
            </div>

            <Button type="submit" variant="hero" size="lg" className="mt-7 w-full">
              Continue to face verification
            </Button>
          </form>
        ) : (
          <div className="animate-rise space-y-4">
            <FaceScan
              label={form.name || "Faculty member"}
              onVerified={(ts) => startSession(form, ts)}
            />
            <Button variant="ghost" className="w-full" onClick={() => setStep("form")}>
              Back to details
            </Button>
          </div>
        )}
      </div>
    </Shell>
  );
}

function CommandCenter() {
  const session = useSession();
  const now = useNow(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const open = isWindowOpen(session, now);
  const remaining = session.closesAt ? Math.max(0, session.closesAt - now) : 0;
  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, pending: 0 };
    session.students.forEach((s) => (c[s.status] += 1));
    return c;
  }, [session.students]);

  const exportJson = () =>
    download(
      `${session.id}-attendance.json`,
      JSON.stringify({ ...session, exportedAt: new Date().toISOString() }, null, 2),
      "application/json",
    );

  return (
    <Shell>
      <div className="animate-rise space-y-6">
        <div className="glass-strong flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6">
          <div>
            <span className="mono-label">session {session.id}</span>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{session.teacher.subject}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {session.teacher.name} · {session.teacher.facultyId} · face verified{" "}
              {fmtTime(session.teacher.faceVerifiedAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {session.locked ? (
              <span className="flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/15 px-4 py-2 text-sm font-medium text-destructive">
                <Lock className="size-4" /> Session locked
              </span>
            ) : (
              <span
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
                  open
                    ? "border-success/40 bg-success/15 text-success"
                    : "border-border bg-muted/40 text-muted-foreground"
                }`}
              >
                <Circle className="size-3 fill-current" /> {open ? "Window open" : "Window closed"}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <div className="glass-strong flex flex-col items-center rounded-3xl p-7">
              <RadialTimer remaining={remaining} open={open} />
              <div className="mt-6 w-full space-y-2">
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={session.locked || open}
                  onClick={() => openWindow()}
                >
                  <Play className="size-4" />
                  {session.openedAt ? "Reopen 120s window" : "Open attendance window"}
                </Button>
                <Button
                  variant="glass"
                  className="w-full"
                  disabled={session.locked}
                  onClick={() => setConfirmOpen(true)}
                >
                  <Lock className="size-4" /> Final submit &amp; lock
                </Button>
              </div>
            </div>

            <div className="glass rounded-3xl p-5">
              <p className="mono-label">tally</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Tally label="Present" value={counts.present} tone="text-success" />
                <Tally label="Pending" value={counts.pending} tone="text-warning" />
                <Tally label="Absent" value={counts.absent} tone="text-destructive" />
              </div>
            </div>

            {session.locked && (
              <div className="glass rounded-3xl p-5">
                <p className="mono-label">verification hash</p>
                <p className="mt-2 break-all font-mono text-sm text-primary">{session.hash}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Locked at {fmtTime(session.lockedAt)} · records immutable
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    variant="glass"
                    onClick={() =>
                      download(`${session.id}-attendance.csv`, toCsv(session), "text/csv")
                    }
                  >
                    <Download className="size-4" /> Export CSV
                  </Button>
                  <Button variant="glass" onClick={exportJson}>
                    <FileJson className="size-4" /> Export JSON
                  </Button>
                  <Button variant="ghost" onClick={() => resetSession()}>
                    <RotateCcw className="size-4" /> Start a new session
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="glass-strong overflow-hidden rounded-3xl">
            <div className="flex items-center justify-between gap-3 border-b border-glass-border px-6 py-4">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <h2 className="text-base font-semibold">Live roster</h2>
              </div>
              <span className="mono-label">{session.students.length} enrolled</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-3xl text-sm">
                <thead>
                  <tr className="border-b border-glass-border text-left">
                    {["Roll", "Student", "Proximity", "Face verified", "Status", "Override"].map(
                      (h) => (
                        <th key={h} className="mono-label px-6 py-3 font-normal">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {session.students.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        No students have joined this session yet.
                      </td>
                    </tr>
                  )}
                  {session.students.map((s) => (
                    <Row key={s.id} student={s} locked={session.locked} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="glass-strong border-glass-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Lock this attendance session?</AlertDialogTitle>
            <AlertDialogDescription>
              Every pending student becomes Absent, the window closes permanently and no student
              submission or teacher override will be accepted afterwards. A verification hash is
              generated for the frozen record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep session open</AlertDialogCancel>
            <AlertDialogAction onClick={() => lockSession()}>
              <ShieldCheck className="size-4" /> Submit &amp; lock forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}

function Row({ student: s, locked }: { student: StudentRecord; locked: boolean }) {
  const cycle: AttendanceStatus[] = ["present", "absent", "pending"];
  const next = cycle[(cycle.indexOf(s.status) + 1) % cycle.length]!;

  return (
    <tr className="border-b border-glass-border/60 transition-colors last:border-0 hover:bg-primary/5">
      <td className="px-6 py-3.5 font-mono text-muted-foreground">{s.roll}</td>
      <td className="px-6 py-3.5">
        <div className="font-medium">{s.name}</div>
        <div className="font-mono text-xs text-muted-foreground">{s.collegeId}</div>
      </td>
      <td className="px-6 py-3.5">
        <span
          className={`font-mono text-xs ${s.inRange ? "text-success" : "text-destructive"}`}
        >
          {s.rssi === null ? "no beacon" : `${s.rssi} dBm`}
        </span>
        <div className="text-xs text-muted-foreground">{s.inRange ? "in range" : "out of range"}</div>
      </td>
      <td className="px-6 py-3.5 font-mono text-xs">
        {s.faceVerifiedAt ? (
          <span className="text-success">{fmtTime(s.faceVerifiedAt)}</span>
        ) : (
          <span className="text-muted-foreground">unverified</span>
        )}
      </td>
      <td className="px-6 py-3.5">
        <StatusPill status={s.status} manual={s.manual} />
      </td>
      <td className="px-6 py-3.5">
        <Button
          size="sm"
          variant="glass"
          disabled={locked}
          onClick={() => patchStudent(s.id, { status: next, manual: true, markedAt: Date.now() })}
        >
          Set {next}
        </Button>
      </td>
    </tr>
  );
}

function StatusPill({ status, manual }: { status: AttendanceStatus; manual: boolean }) {
  const map = {
    present: { cls: "border-success/40 bg-success/15 text-success", Icon: CheckCircle2 },
    absent: { cls: "border-destructive/40 bg-destructive/15 text-destructive", Icon: XCircle },
    pending: { cls: "border-warning/40 bg-warning/15 text-warning", Icon: Circle },
  } as const;
  const { cls, Icon } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] tracking-wider uppercase ${cls}`}
    >
      <Icon className="size-3" /> {status}
      {manual && <span className="opacity-70">· manual</span>}
    </span>
  );
}

function Tally({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-glass-border bg-secondary/30 py-3">
      <div className={`font-mono text-2xl font-semibold ${tone}`}>{value}</div>
      <div className="mono-label mt-1">{label}</div>
    </div>
  );
}

function RadialTimer({ remaining, open }: { remaining: number; open: boolean }) {
  const pct = Math.max(0, Math.min(1, remaining / WINDOW_MS));
  const r = 78;
  const c = 2 * Math.PI * r;

  return (
    <div className="relative size-52">
      <svg viewBox="0 0 180 180" className="size-full -rotate-90">
        <circle cx="90" cy="90" r={r} className="fill-none stroke-muted" strokeWidth="10" />
        <circle
          cx="90"
          cy="90"
          r={r}
          className={`fill-none transition-[stroke-dashoffset] duration-200 ${open ? "stroke-primary" : "stroke-border"}`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="mono-label">window</span>
        <span className="font-mono text-4xl font-semibold">{fmtClock(remaining)}</span>
        <span className="mt-1 text-xs text-muted-foreground">
          {open ? "accepting marks" : "closed"}
        </span>
      </div>
      {open && (
        <div className="absolute inset-6 animate-pulse-ring rounded-full border border-primary/40" />
      )}
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
      <div className="relative mx-auto w-full max-w-7xl px-5 py-10">
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" /> Portals
          </Link>
          <div className="flex items-center gap-2">
            <Fingerprint className="size-4 text-primary" />
            <span className="font-display text-sm font-semibold">Teacher command center</span>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
