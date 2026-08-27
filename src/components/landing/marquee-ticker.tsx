export function MarqueeTicker() {
  const itemsRow1 = [
    "● SECTION 318(4) BNS · CHEATING & PROPERTY INDUCEMENT",
    "● DELHI HIGH COURT · SINGLE BENCH · COURT ROOM 14",
    "● SECTION 106 TPA · 15-DAY MANDATORY RESIDENTIAL NOTICE",
    "● 25 HIGH COURTS & 680+ DISTRICT COURTS INTEGRATION",
    "● SECTION 74 ICA · PENALTY CLAUSES VOID AB INITIO",
    "● SECTION 138 NI ACT · 30-DAY STATUTORY NOTICE COUNTDOWN",
    "● BSA SECTION 61 · ELECTRONIC RECORD EVIDENCE GROUNDING",
    "● NJDG REAL-TIME eCOURTS CAUSE LIST SYNC",
  ];

  const itemsRow2 = [
    "◆ AADHAAR & PAN CLIENT-SIDE AUTOMATIC REDACTION",
    "◆ BNS 103(1) · PUNISHMENT FOR OFFENCE OF MURDER",
    "◆ CPC ORDER VIII RULE 1 · WRITTEN STATEMENT TIMELINE",
    "◆ SECTION 27 CONTRACT ACT · NON-COMPETE BONDS VOID",
    "◆ ACTS NO. 45, 46 & 47 OF 2023 GAZETTE GROUNDED",
    "◆ OPEN-SOURCE LEGAL NAVIGATION INITIATIVE",
    "◆ CONSUMER PROTECTION ACT SECTION 35 COMPLAINT TREE",
    "◆ NO PUBLIC LLM TRAINING ON PRIVATE USER DISPUTES",
  ];

  const doubled1 = [...itemsRow1, ...itemsRow1];
  const doubled2 = [...itemsRow2, ...itemsRow2];

  return (
    <div className="overflow-hidden border-y border-border bg-[#181d24] py-3 text-white selection:bg-white selection:text-black">
      {/* Row 1: Leftward moving */}
      <div className="animate-marquee flex items-center gap-8 font-mono text-[11px] uppercase tracking-[0.18em] text-white/90">
        {doubled1.map((item, idx) => (
          <span key={idx} className="flex items-center gap-3 whitespace-nowrap">
            <span className="text-emerald-400 font-bold">{item.slice(0, 1)}</span>
            <span className="text-white/90 font-medium">{item.slice(2)}</span>
            <span className="text-white/20 ml-5">/</span>
          </span>
        ))}
      </div>

      {/* Row 2: Rightward moving subtle second track */}
      <div className="animate-marquee-reverse mt-2.5 flex items-center gap-8 font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">
        {doubled2.map((item, idx) => (
          <span key={idx} className="flex items-center gap-3 whitespace-nowrap">
            <span className="text-amber-400 font-bold">{item.slice(0, 1)}</span>
            <span className="text-white/70">{item.slice(2)}</span>
            <span className="text-white/20 ml-5">/</span>
          </span>
        ))}
      </div>
    </div>
  );
}
