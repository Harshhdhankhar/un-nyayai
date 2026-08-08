import { CaseLawSearch } from "@/components/research/case-law-search";

export const metadata = { title: "Research" };

export default function ResearchPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-950">
          Case-law research
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Search judgments and statutes. Results are marked as live or mock so
          you always know what to trust.
        </p>
      </div>
      <CaseLawSearch />
    </div>
  );
}
