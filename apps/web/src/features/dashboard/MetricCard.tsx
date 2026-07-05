import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

const tones = {
  cyan: "text-cyan",
  brand: "text-brand",
  mint: "text-mint",
  coral: "text-coral",
  amber: "text-amber"
};

export function MetricCard({ label, value, delta, tone }: { label: string; value: string; delta: string; tone: keyof typeof tones }) {
  return (
    <Card className="group overflow-hidden">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted">{label}</p>
        <ArrowUpRight className={cn("transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5", tones[tone])} size={17} />
      </div>
      <div className="mt-5 flex items-end justify-between">
        <p className="text-3xl font-semibold">{value}</p>
        <span className="rounded-md border border-line bg-white/[0.04] px-2 py-1 text-xs text-muted">{delta}</span>
      </div>
    </Card>
  );
}
