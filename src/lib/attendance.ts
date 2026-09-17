import { useEffect, useState } from "react";

export const WINDOW_MS = 120_000;
const STORAGE_KEY = "presencegrid:session:v1";
const CHANNEL = "presencegrid";

export type AttendanceStatus = "present" | "absent" | "pending";

export type Teacher = {
  name: string;
  facultyId: string;
  subject: string;
  faceVerifiedAt: number | null;
};

export type StudentRecord = {
  id: string;
  name: string;
  collegeId: string;
  roll: string;
  rssi: number | null;
  inRange: boolean;
  faceVerifiedAt: number | null;
  markedAt: number | null;
  status: AttendanceStatus;
  manual: boolean;
};

export type Session = {
  id: string;
  teacher: Teacher;
  openedAt: number | null;
  closesAt: number | null;
  locked: boolean;
  lockedAt: number | null;
  hash: string | null;
  students: StudentRecord[];
};

export const emptySession = (): Session => ({
  id: `SES-${Date.now().toString(36).toUpperCase()}`,
  teacher: { name: "", facultyId: "", subject: "", faceVerifiedAt: null },
  openedAt: null,
  closesAt: null,
  locked: false,
  lockedAt: null,
  hash: null,
  students: [],
});

const DEMO = [
  ["Aarav Menon", "CS21-014", "14"],
  ["Diya Kulkarni", "CS21-022", "22"],
  ["Rohan Iyer", "CS21-031", "31"],
  ["Sara Fernandes", "CS21-047", "47"],
  ["Kabir Malhotra", "CS21-052", "52"],
];

export function demoRoster(): StudentRecord[] {
  return DEMO.map(([name, collegeId, roll], i) => ({
    id: `demo-${collegeId}`,
    name: name!,
    collegeId: collegeId!,
    roll: roll!,
    rssi: i % 4 === 3 ? -92 : -52 - i * 6,
    inRange: i % 4 !== 3,
    faceVerifiedAt: i % 3 === 2 ? null : Date.now(),
    markedAt: null,
    status: "pending",
    manual: false,
  }));
}

export function verificationHash(session: Session): string {
  const payload = JSON.stringify({
    id: session.id,
    teacher: session.teacher.facultyId,
    subject: session.teacher.subject,
    openedAt: session.openedAt,
    lockedAt: session.lockedAt,
    rows: session.students.map((s) => [s.collegeId, s.status, s.markedAt]),
  });
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < payload.length; i++) {
    h1 = (h1 ^ payload.charCodeAt(i)) >>> 0;
    h1 = (h1 * 0x01000193) >>> 0;
    h2 = (h2 + payload.charCodeAt(i) * (i + 7)) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`.toUpperCase();
}

function read(): Session {
  if (typeof window === "undefined") return emptySession();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySession();
    return JSON.parse(raw) as Session;
  } catch {
    return emptySession();
  }
}

let channel: BroadcastChannel | null = null;
function bus(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  channel ??= new BroadcastChannel(CHANNEL);
  return channel;
}

const listeners = new Set<(s: Session) => void>();

function emit(session: Session) {
  listeners.forEach((l) => l(session));
}

function write(session: Session) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  bus()?.postMessage("changed");
  emit(session);
}

export function getSession(): Session {
  return read();
}

export function update(mutate: (s: Session) => Session): Session {
  const next = mutate(read());
  write(next);
  return next;
}

/** Teacher signs in and (re)creates a fresh session shell. */
export function startSession(teacher: Omit<Teacher, "faceVerifiedAt">, faceVerifiedAt: number) {
  return update(() => ({
    ...emptySession(),
    teacher: { ...teacher, faceVerifiedAt },
    students: demoRoster(),
  }));
}

export function openWindow() {
  return update((s) => {
    if (s.locked) return s;
    const now = Date.now();
    return { ...s, openedAt: now, closesAt: now + WINDOW_MS };
  });
}

export function isWindowOpen(s: Session, now = Date.now()) {
  return !s.locked && s.closesAt !== null && now < s.closesAt;
}

export function upsertStudent(student: Omit<StudentRecord, "status" | "markedAt" | "manual">) {
  return update((s) => {
    if (s.locked) return s;
    const existing = s.students.find((x) => x.id === student.id);
    const students = existing
      ? s.students.map((x) => (x.id === student.id ? { ...x, ...student } : x))
      : [
          ...s.students,
          { ...student, status: "pending" as AttendanceStatus, markedAt: null, manual: false },
        ];
    return { ...s, students };
  });
}

export function patchStudent(id: string, patch: Partial<StudentRecord>) {
  return update((s) => {
    if (s.locked) return s;
    return { ...s, students: s.students.map((x) => (x.id === id ? { ...x, ...patch } : x)) };
  });
}

export function markPresent(id: string) {
  return update((s) => {
    if (s.locked || !isWindowOpen(s)) return s;
    return {
      ...s,
      students: s.students.map((x) =>
        x.id === id ? { ...x, status: "present" as AttendanceStatus, markedAt: Date.now() } : x,
      ),
    };
  });
}

export function lockSession() {
  return update((s) => {
    if (s.locked) return s;
    const lockedAt = Date.now();
    const finalized: Session = {
      ...s,
      locked: true,
      lockedAt,
      closesAt: s.closesAt,
      students: s.students.map((x) =>
        x.status === "pending" ? { ...x, status: "absent" as AttendanceStatus } : x,
      ),
    };
    return { ...finalized, hash: verificationHash(finalized) };
  });
}

export function resetSession() {
  return update(() => emptySession());
}

/** Subscribe to the shared session across tabs/windows. */
export function useSession(): Session {
  const [session, setSession] = useState<Session>(emptySession);

  useEffect(() => {
    setSession(read());
    const onChange = () => setSession(read());
    listeners.add(setSession);
    const b = bus();
    b?.addEventListener("message", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      listeners.delete(setSession);
      b?.removeEventListener("message", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return session;
}

/** Ticking clock, used for countdown UIs. */
export function useNow(active: boolean, interval = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(t);
  }, [active, interval]);
  return now;
}

export function fmtClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function fmtTime(ts: number | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function toCsv(session: Session) {
  const head = [
    "session_id",
    "subject",
    "faculty_id",
    "roll",
    "name",
    "college_id",
    "status",
    "rssi_dbm",
    "proximity",
    "face_verified_at",
    "marked_at",
    "manual_override",
  ];
  const rows = session.students.map((s) => [
    session.id,
    session.teacher.subject,
    session.teacher.facultyId,
    s.roll,
    s.name,
    s.collegeId,
    s.status,
    s.rssi ?? "",
    s.inRange ? "in-range" : "out-of-range",
    s.faceVerifiedAt ? new Date(s.faceVerifiedAt).toISOString() : "",
    s.markedAt ? new Date(s.markedAt).toISOString() : "",
    s.manual ? "yes" : "no",
  ]);
  return [head, ...rows].map((r) => r.join(",")).join("\n");
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
