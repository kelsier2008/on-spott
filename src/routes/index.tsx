import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bluetooth,
  Fingerprint,
  GraduationCap,
  Lock,
  ScanFace,
  Timer,
  Presentation,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PresenceGrid — Biometric Classroom Attendance" },
      {
        name: "description",
        content:
          "Automated classroom attendance with face verification, Bluetooth proximity checks and 120-second attendance windows for students and teachers.",
      },
      { property: "og:title", content: "PresenceGrid — Biometric Classroom Attendance" },
      {
        property: "og:description",
        content:
          "Face-verified, proximity-checked attendance in a 2-minute window. Dual portals for students and teachers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const pillars = [
  {
    icon: ScanFace,
    title: "Face verification",
    body: "Live camera stream with landmark tracking, liveness pass and a confidence score before any mark is accepted.",
  },
  {
    icon: Bluetooth,
    title: "Proximity enforced",
    body: "RSSI from the classroom beacon must clear −75 dBm, so remote check-ins are rejected outright.",
  },
  {
    icon: Timer,
    title: "120-second window",
    body: "The teacher opens a hard two-minute window. When the radial timer empties, submissions stop.",
  },
  {
    icon: Lock,
    title: "Locked & hashed",
    body: "Final submit freezes the roster forever and issues a verification hash with CSV / JSON export.",
  },
];

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-50" />

      <div className="relative mx-auto w-full max-w-6xl px-5 py-14 sm:py-20">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="glass flex size-10 items-center justify-center rounded-xl">
              <Fingerprint className="size-5 text-primary" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">PresenceGrid</span>
          </div>
          <span className="mono-label hidden sm:block">room cr-204 · beacon live</span>
        </header>

        <section className="mt-16 max-w-3xl animate-rise">
          <span className="mono-label glass inline-block rounded-full px-3 py-1.5">
            automated attendance protocol
          </span>
          <h1 className="mt-6 text-5xl leading-[1.03] font-semibold sm:text-7xl">
            Attendance that <span className="text-gradient">proves</span> you were in the room.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Three gates, one two-minute window: a verified face, a Bluetooth beacon within range and
            a teacher-controlled session that locks itself shut.
          </p>
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          <PortalCard
            to="/student"
            icon={GraduationCap}
            eyebrow="for students"
            title="Student Portal"
            body="Verify your face, catch the live window, prove proximity and collect a signed attendance ticket."
          />
          <PortalCard
            to="/teacher"
            icon={Presentation}
            eyebrow="for faculty"
            title="Teacher Portal"
            body="Open the 120-second window, watch the roster fill in real time, override anything, then lock it."
          />
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map(({ icon: Icon, title, body }) => (
            <article key={title} className="glass rounded-2xl p-5">
              <Icon className="size-5 text-primary" />
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </article>
          ))}
        </section>

        <p className="mt-14 text-xs text-muted-foreground">
          Demo build: open the teacher portal in one tab and the student portal in another — the
          session state syncs live between them.
        </p>
      </div>
    </main>
  );
}

function PortalCard({
  to,
  icon: Icon,
  eyebrow,
  title,
  body,
}: {
  to: "/student" | "/teacher";
  icon: typeof GraduationCap;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className="glass-strong group relative overflow-hidden rounded-3xl p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/45"
    >
      <div className="absolute -right-16 -top-16 size-40 rounded-full bg-primary/15 blur-3xl transition-opacity duration-300 group-hover:bg-accent/25" />
      <div className="relative">
        <span className="mono-label">{eyebrow}</span>
        <Icon className="mt-4 size-8 text-primary transition-transform duration-300 group-hover:scale-110" />
        <h2 className="mt-5 text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
          Enter portal
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
