import { Card } from "@/components/ui/Card";

export function PlaceholderPage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-cyan">Module planifie</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-muted">{subtitle}</p>
      </div>
      <Card className="min-h-72">
        <div className="grid h-60 place-items-center rounded-lg border border-dashed border-line bg-white/[0.025] text-center">
          <div>
            <p className="font-medium">Architecture prete</p>
            <p className="mt-2 max-w-md text-sm text-muted">Ce module sera branche au fur et a mesure, avec routes, validations, permissions et tests dedies.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
