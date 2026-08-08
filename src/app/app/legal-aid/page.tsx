import { getLegalAidServices } from "@/lib/legal/aid";
import { LegalAidQuiz } from "@/components/legal-aid/legal-aid-quiz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Free legal aid" };

export default async function LegalAidPage() {
  const services = await getLegalAidServices(12);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-950">
          Free legal aid
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Legal aid is free legal service for those who qualify. Answer a few
          questions to see if you may be eligible. NyayAI does not provide
          representation — it connects you to official channels.
        </p>
      </div>

      <LegalAidQuiz />

      <Card>
        <CardHeader>
          <CardTitle>Legal aid services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {services.length === 0 ? (
            <p className="text-sm text-ink-400">No services listed yet.</p>
          ) : (
            services.map((s) => (
              <div key={s.id} className="rounded-md border border-ink-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink-900">{s.name}</p>
                  {s.state && <span className="text-xs text-ink-400">{s.state}</span>}
                </div>
                {s.description && (
                  <p className="mt-1 text-xs text-ink-500">{s.description}</p>
                )}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {s.phone && (
                    <a href={`tel:${s.phone}`} className="text-xs text-navy-700 underline">
                      {s.phone}
                    </a>
                  )}
                  {s.address && <span className="text-xs text-ink-400">· {s.address}</span>}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-ink-400">
        Eligibility is decided by the legal services authorities. This is an
        indicative pre-check only.
      </p>
    </div>
  );
}
