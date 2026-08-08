import { NewMatterForm } from "@/components/matter/new-matter-form";

export const metadata = { title: "New matter" };

export default function NewMatterPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-navy-950">
          New matter
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Describe your situation — NyayAI can auto-detect the category and
          likely pathways before you save.
        </p>
      </div>
      <NewMatterForm />
    </div>
  );
}
