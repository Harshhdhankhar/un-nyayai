import { db } from "@/lib/db/client";
import { lawMappings } from "@/lib/db/schema";
import { LawCompare } from "@/components/law-compare/law-compare";
export const metadata = { title: "Old vs new law" };
export default async function LawComparePage() { const all = await db.select().from(lawMappings).orderBy(lawMappings.oldAct, lawMappings.oldSection); return <div className="workspace-page"><header className="max-w-4xl"><p className="eyebrow text-navy-700">Old vs new criminal law</p><h1 className="mt-3 font-serif-display text-4xl text-navy-950 sm:text-5xl">What changed?</h1><p className="mt-3 text-sm leading-6 text-ink-600">Compare IPC with BNS, CrPC with BNSS, and the Evidence Act with BSA by section or topic. Always verify against the linked official text.</p></header><div className="mt-8"><LawCompare mappings={all} /></div></div>; }
