import { createFileRoute } from "@tanstack/react-router";
import { Thermometer, Droplets, Wheat, Waves } from "lucide-react";

export const Route = createFileRoute("/_app/iot")({
  head: () => ({ meta: [{ title: "IoT Sensors — PoultryGuard AI" }] }),
  component: IoT,
});

const SENSORS = [
  { icon: Thermometer, name: "Temperature Sensor", desc: "Real-time housing temperature monitoring via ESP32" },
  { icon: Droplets, name: "Humidity Sensor", desc: "Continuous humidity tracking for biosecurity" },
  { icon: Wheat, name: "Feed Level Sensor", desc: "Automatic feed-bin level detection" },
  { icon: Waves, name: "Water Level Sensor", desc: "Water tank and drinker monitoring" },
];

function IoT() {
  return (
    <div className="p-4 sm:p-6 md:p-10 space-y-8 max-w-5xl">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-2">FUTURE INTEGRATION</p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter">IoT Sensor Monitoring</h1>
        <p className="text-sm text-foreground/60 mt-3 max-w-2xl">PoultryGuard AI is built to ingest live data from ESP32-based environmental sensors. Hardware integration is on the roadmap.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SENSORS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.name} className="bg-surface border border-border p-6 relative overflow-hidden">
              <div className="absolute top-4 right-4 px-2 py-0.5 bg-warning/10 text-warning text-[10px] font-bold uppercase tracking-widest">COMING SOON</div>
              <div className="size-12 bg-primary-soft grid place-items-center mb-4"><Icon className="size-6 text-primary" /></div>
              <h3 className="text-xl font-extrabold tracking-tighter mb-2">{s.name}</h3>
              <p className="text-sm text-foreground/60">{s.desc}</p>
              <div className="mt-6 h-2 bg-background border border-border" />
              <p className="mt-2 font-mono text-[10px] text-foreground/30 uppercase tracking-widest">SENSOR_STATUS · OFFLINE</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
