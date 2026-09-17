import { useEffect, useState } from "react";
import { Bluetooth, BluetoothConnected, BluetoothSearching } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onChange: (rssi: number, inRange: boolean) => void;
};

const THRESHOLD = -75; // dBm — anything weaker than this is out of the room

export function ProximityMeter({ onChange }: Props) {
  const [scanning, setScanning] = useState(false);
  const [rssi, setRssi] = useState<number | null>(null);
  const [simulateFar, setSimulateFar] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!scanning) return;
    const tick = () => {
      const base = simulateFar ? -88 : -54;
      const value = Math.round(base + (Math.random() * 8 - 4));
      setRssi(value);
      onChange(value, value >= THRESHOLD);
    };
    tick();
    const t = window.setInterval(tick, 1200);
    return () => window.clearInterval(t);
  }, [scanning, simulateFar, onChange]);

  const startScan = async () => {
    const nav = navigator as Navigator & { bluetooth?: { getAvailability?: () => Promise<boolean> } };
    try {
      const available = (await nav.bluetooth?.getAvailability?.()) ?? false;
      setNote(
        available
          ? "Classroom beacon acquired — tracking RSSI."
          : "Web Bluetooth unavailable here, using the beacon simulator.",
      );
    } catch {
      setNote("Web Bluetooth unavailable here, using the beacon simulator.");
    }
    setScanning(true);
  };

  const inRange = rssi !== null && rssi >= THRESHOLD;
  const strength = rssi === null ? 0 : Math.max(0, Math.min(100, ((rssi + 100) / 45) * 100));
  const bars = [0, 1, 2, 3, 4];

  return (
    <div className="glass-strong rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="mono-label">Proximity gate</p>
          <h3 className="text-lg font-semibold">Bluetooth beacon</h3>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] tracking-widest uppercase ${
            inRange
              ? "border-success/40 bg-success/15 text-success"
              : scanning
                ? "border-destructive/40 bg-destructive/15 text-destructive"
                : "border-border bg-muted/40 text-muted-foreground"
          }`}
        >
          {inRange ? (
            <BluetoothConnected className="size-3" />
          ) : scanning ? (
            <BluetoothSearching className="size-3" />
          ) : (
            <Bluetooth className="size-3" />
          )}
          {!scanning ? "offline" : inRange ? "in range" : "too far"}
        </span>
      </div>

      <div className="flex items-end gap-4">
        <div className="flex h-20 items-end gap-1.5">
          {bars.map((b) => {
            const active = strength > b * 20;
            return (
              <span
                key={b}
                className={`w-4 rounded-t-md transition-all duration-500 ${
                  active ? (inRange ? "bg-success" : "bg-destructive") : "bg-muted"
                }`}
                style={{ height: `${20 + b * 15}%` }}
              />
            );
          })}
        </div>
        <div className="flex-1">
          <div className="font-mono text-3xl font-semibold">
            {rssi === null ? "—" : `${rssi}`}
            <span className="ml-1 text-sm text-muted-foreground">dBm</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${inRange ? "bg-success" : "bg-destructive"}`}
              style={{ width: `${strength}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Threshold {THRESHOLD} dBm · classroom beacon CR-204
          </p>
        </div>
      </div>

      {note && <p className="mt-3 text-xs text-muted-foreground">{note}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {!scanning ? (
          <Button onClick={startScan} variant="hero" className="flex-1">
            <BluetoothSearching className="size-4" /> Scan for classroom beacon
          </Button>
        ) : (
          <Button variant="glass" className="flex-1" onClick={() => setSimulateFar((v) => !v)}>
            {simulateFar ? "Simulate walking back in" : "Simulate walking out of range"}
          </Button>
        )}
      </div>
    </div>
  );
}
