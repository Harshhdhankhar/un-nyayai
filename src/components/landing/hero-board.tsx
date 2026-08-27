"use client";

import { useEffect, useRef } from "react";

// ─── Seeded deterministic helpers ─────────────────────────────────────────────
function strHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  return h;
}
function nth<T>(arr: T[], h: number, salt: number): T {
  return arr[Math.abs(h ^ (salt * 2654435761)) % arr.length];
}

// ─── Colour palettes ─────────────────────────────────────────────────────────
const SKINS  = ["#fde6c8","#f5c98a","#d4956a","#c17f50","#8b5e3c","#5c3317"];
const HAIRS  = ["#1a1a1a","#3d2314","#7c4d2b","#94a3b8","#c9a84c","#6d28d9","#be185d","#164e63"];
const SHIRTS = ["#1e3a5f","#111827","#5b21b6","#1d4ed8","#0f766e","#991b1b","#166534","#374151","#92400e","#0e7490","#4c1d95","#0c4a6e"];
const BGS    = ["#b6e3f4","#c0aede","#d1d4f9","#ffd5dc","#ffdfbf","#e0f2fe","#dcfce7","#fef9c3","#f0fdf4","#fdf2f8","#f5f3ff","#ecfdf5"];

// ─── Open-Peeps style Avatar ──────────────────────────────────────────────────
function Avatar({ seed }: { seed: string }) {
  const h     = strHash(seed);
  const skin  = nth(SKINS,  h, 0);
  const hair  = nth(HAIRS,  h, 1);
  const shirt = nth(SHIRTS, h, 2);
  const bg    = nth(BGS,    h, 3);
  const hs    = h % 8;
  const hasGlasses = (h % 5) === 0;
  const hasBeard   = (h % 4) === 0 && hs < 4;

  const browCol = hair === "#c9a84c" ? "#8a6020" : hair === "#94a3b8" ? "#64748b" : hair;
  const noseSh  = (skin === "#fde6c8" || skin === "#f5c98a") ? "#d4845a" : "#7a3d1a";
  const mouthCl = (skin === "#fde6c8" || skin === "#f5c98a") ? "#c05040" : "#8b2010";

  // Hair back (long / wavy styles only)
  const hairBack =
    hs === 4 ? "M20 23 C20 11 25 5 32 5 C39 5 44 11 44 23 L46 58 C40 63 24 63 18 58 Z" :
    hs === 6 ? "M20 23 C20 11 25 5 32 5 C39 5 44 11 44 23 L46 48 C40 53 24 53 18 48 Z" :
    null;

  // Hair front
  const hairFront =
    hs === 0 ? "M20 23 C20 11 25 5 32 5 C39 5 44 11 44 23" :
    hs === 1 ? "M18 27 C18 12 23 6 32 6 C41 6 46 12 46 27 L46 22 C44 10 40 7 32 7 C24 7 20 10 20 22 Z" :
    hs === 3 ? "M20 29 C20 10 25 5 32 5 C39 5 44 10 44 29 L44 37 C40 41 24 41 20 37 Z" :
    (hs === 4 || hs === 5 || hs === 6) ? "M20 23 C20 11 25 5 32 5 C39 5 44 11 44 23" :
    hs === 2 ? null :
    "M21 26 C21 15 24 9 32 9 C40 9 43 15 43 26";

  return (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <circle cx="32" cy="32" r="32" fill={bg} />
      <path d="M13 64 C12 52 19 47 32 47 C45 47 52 52 51 64 Z" fill={shirt} />
      <rect x="28" y="37" width="8" height="12" rx="2" fill={skin} />
      {hairBack && <path d={hairBack} fill={hair} />}
      {hs === 2 && (
        <>
          <ellipse cx="32" cy="13" rx="17" ry="13" fill={hair} />
          <ellipse cx="17" cy="22" rx="7" ry="9" fill={hair} />
          <ellipse cx="47" cy="22" rx="7" ry="9" fill={hair} />
        </>
      )}
      <ellipse cx="20" cy="27" rx="2.8" ry="3.5" fill={skin} />
      <ellipse cx="44" cy="27" rx="2.8" ry="3.5" fill={skin} />
      <ellipse cx="32" cy="26" rx="12" ry="14" fill={skin} />
      {hairFront && <path d={hairFront} fill={hair} />}
      {hs === 5 && <circle cx="32" cy="5" r="7" fill={hair} />}
      {hs === 2 && <ellipse cx="32" cy="13" rx="17" ry="13" fill={hair} />}
      <path d="M24.5 19 Q27.5 17 30.5 19" stroke={browCol} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <path d="M33.5 19 Q36.5 17 39.5 19" stroke={browCol} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <ellipse cx="27.5" cy="24" rx="3" ry="3.2" fill="white"/>
      <circle  cx="27.5" cy="24" r="2" fill="#1a1a1a"/>
      <circle  cx="28.3" cy="23.2" r="0.6" fill="white"/>
      <ellipse cx="36.5" cy="24" rx="3" ry="3.2" fill="white"/>
      <circle  cx="36.5" cy="24" r="2" fill="#1a1a1a"/>
      <circle  cx="37.3" cy="23.2" r="0.6" fill="white"/>
      <path d="M30.5 29 Q32 32.5 33.5 29" stroke={noseSh} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <path d="M27 35 Q32 39 37 35" stroke={mouthCl} strokeWidth="2" fill="none" strokeLinecap="round"/>
      {hasBeard && <path d="M21 33 Q23 43 32 44 Q41 43 43 33" fill={hair} opacity="0.8"/>}
      {hasGlasses && !hasBeard && (
        <g stroke="#374151" strokeWidth="1.5">
          <rect x="22" y="21" width="9" height="6" rx="2.5" fill="rgba(255,255,255,0.2)"/>
          <rect x="33" y="21" width="9" height="6" rx="2.5" fill="rgba(255,255,255,0.2)"/>
          <line x1="31" y1="24" x2="33" y2="24"/>
          <line x1="18" y1="23.5" x2="22" y2="23.5"/>
          <line x1="46" y1="23.5" x2="42" y2="23.5"/>
        </g>
      )}
    </svg>
  );
}

// ─── Crowd ────────────────────────────────────────────────────────────────────
const SEEDS = [
  "Priya","Rohan","Arvind","Vikram","Kavita","Sneha",
  "Rajesh","Ananya","Farhan","Tanya","Manish","Sunil",
  "Divya","Harish","Meera","Alok","Pooja","Satish",
  "Karan","Shweta","Arjun","Neha","Mohit","Sunita",
  "Deepak","Girish","Rashmi","Kunal","Smriti","Ashok",
  "Tanvi","Raghav","Bhavna","Aditya","Nidhi","Prashant",
  "Shalini","Kabir","Ritu","Om","Kishore",
  "Simran","Gaurav","Aparna","Devendra","Rohit",
  "Pallavi","Nitin","Bharat","Monika","Sanjay","Vandana",
  "Pawan","Tarun","Geeta","Sachin","Anil","Felix","Zara",
];

const HIGHLIGHTED = new Set(["Priya","Rohan","Sneha","Aditya","Tanvi"]);

const PERSONAS: Record<string, { name: string; role: string; city: string }> = {
  Priya:     { name: "Adv. Priya Sharma",    role: "High Court Litigator",        city: "Delhi"        },
  Rohan:     { name: "Rohan Kumar",          role: "Tenant (Deposit Resolved)",   city: "Bengaluru"    },
  Arvind:    { name: "Dr. Arvind Mehta",     role: "Consumer Grievance",          city: "Ahmedabad"    },
  Vikram:    { name: "Vikram Malhotra",      role: "District Court Bar",          city: "Chandigarh"   },
  Kavita:    { name: "Kavita Mishra",        role: "HR Compliance Lead",          city: "Mumbai"       },
  Sneha:     { name: "Sneha Nair",           role: "Property Owner",              city: "Kochi"        },
  Rajesh:    { name: "Adv. Rajesh Verma",   role: "Civil Litigator",             city: "Jaipur"       },
  Ananya:    { name: "Ananya Roy",           role: "Startup Founder (138 Act)",   city: "Kolkata"      },
  Farhan:    { name: "Farhan Qureshi",       role: "Commercial Lease",            city: "Hyderabad"    },
  Tanya:     { name: "Tanya Sen",            role: "Tenant",                      city: "Pune"         },
  Manish:    { name: "Adv. Manish Goel",    role: "District Court Bar",          city: "Lucknow"      },
  Sunil:     { name: "Sunil Joshi",          role: "Retailer (Dispute Won)",      city: "Indore"       },
  Divya:     { name: "Divya Pathak",         role: "Employment Rights",           city: "Gurugram"     },
  Harish:    { name: "Harish Iyer",          role: "RERA Complainant",            city: "Chennai"      },
  Meera:     { name: "Adv. Meera Seth",     role: "Matrimonial Counsel",         city: "Delhi"        },
  Alok:      { name: "Alok Bansal",          role: "MSME Recovery",              city: "Noida"        },
  Pooja:     { name: "Pooja Hegde",          role: "Tenant Rights",               city: "Bengaluru"    },
  Satish:    { name: "Adv. Satish Rao",     role: "High Court Advocate",         city: "Mumbai"       },
  Karan:     { name: "Karan Johar",          role: "IP Dispute",                  city: "Mumbai"       },
  Shweta:    { name: "Shweta Tiwari",        role: "Homeowner",                   city: "Dehradun"     },
  Arjun:     { name: "Adv. Arjun Roy",      role: "Company Law",                 city: "Kolkata"      },
  Neha:      { name: "Neha Saxena",          role: "Consumer Forum",              city: "Bhopal"       },
  Mohit:     { name: "Mohit Bansal",         role: "Tenant",                      city: "Noida"        },
  Sunita:    { name: "Adv. Sunita K.",      role: "Civil Defense",               city: "Ranchi"       },
  Deepak:    { name: "Deepak Rawat",         role: "Property Owner",              city: "Shimla"       },
  Girish:    { name: "Girish Kulkarni",      role: "MSME Founder",               city: "Nagpur"       },
  Rashmi:    { name: "Adv. Rashmi D.",      role: "Arbitration",                 city: "Pune"         },
  Kunal:     { name: "Kunal Shah",           role: "Lease Dispute",               city: "Mumbai"       },
  Smriti:    { name: "Smriti Irani",         role: "Tenancy Rights",              city: "Delhi"        },
  Ashok:     { name: "Adv. Ashok Sen",      role: "Criminal Counsel",            city: "Patna"        },
  Tanvi:     { name: "Adv. Tanvi Deshmukh", role: "Arbitration Counsel",         city: "Mumbai"       },
  Raghav:    { name: "Raghav Suri",          role: "Tenant (Notice Countered)",   city: "Delhi"        },
  Bhavna:    { name: "Bhavna Patel",         role: "Consumer Forum",              city: "Surat"        },
  Aditya:    { name: "Aditya Sen",           role: "MSME Founder",               city: "Bengaluru"    },
  Nidhi:     { name: "Adv. Nidhi Rao",      role: "Criminal Defense",            city: "Delhi"        },
  Prashant:  { name: "Prashant Joshi",       role: "Property Dispute",            city: "Nagpur"       },
  Shalini:   { name: "Shalini Gupta",        role: "HR Consultant",               city: "Noida"        },
  Kabir:     { name: "Adv. Kabir Khan",     role: "Civil Litigator",             city: "Bhopal"       },
  Ritu:      { name: "Ritu Chawla",          role: "Contract Reviewer",           city: "Chandigarh"   },
  Om:        { name: "Adv. Om Prakash",     role: "District Court",              city: "Patna"        },
  Kishore:   { name: "Kishore Kumar",        role: "138 NI Act Respondent",       city: "Varanasi"     },
  Simran:    { name: "Simran Kaur",          role: "Tenant",                      city: "Amritsar"     },
  Gaurav:    { name: "Gaurav Aggarwal",      role: "Business Owner",              city: "Faridabad"    },
  Aparna:    { name: "Aparna Nair",          role: "Tenancy Rights",              city: "Trivandrum"   },
  Devendra:  { name: "Devendra Patil",       role: "RERA Complainant",            city: "Pune"         },
  Rohit:     { name: "Adv. Rohit Sharma",   role: "Corporate Counsel",           city: "Delhi"        },
  Pallavi:   { name: "Pallavi Ghosh",        role: "Consumer Dispute",            city: "Guwahati"     },
  Nitin:     { name: "Nitin Gadgil",         role: "Property Owner",              city: "Nashik"       },
  Bharat:    { name: "Adv. Bharat Reddy",   role: "Civil Litigator",             city: "Hyderabad"    },
  Monika:    { name: "Monika Sen",           role: "Contract Analyst",            city: "Kolkata"      },
  Sanjay:    { name: "Sanjay Singhal",       role: "Tenant",                      city: "Jaipur"       },
  Vandana:   { name: "Adv. Vandana Sood",   role: "Family Law",                  city: "Chandigarh"   },
  Pawan:     { name: "Pawan Kalyan",         role: "MSME Partner",               city: "Visakhapatnam"},
  Tarun:     { name: "Tarun Bajaj",          role: "Commercial Tenant",           city: "Gurugram"     },
  Geeta:     { name: "Adv. Geeta Pillai",   role: "High Court Counsel",          city: "Kochi"        },
  Sachin:    { name: "Sachin Tendulkar",     role: "IP Dispute",                  city: "Mumbai"       },
  Anil:      { name: "Anil Kapoor",          role: "Property Dispute",            city: "Delhi"        },
  Felix:     { name: "Felix D'Souza",        role: "Landlord-Tenant Mediation",   city: "Goa"          },
  Zara:      { name: "Zara Khan",            role: "Employment Rights",           city: "Bengaluru"    },
};


// 4× repetition ensures the grid is always wider than 2× the viewport,
// so both left and right visible zones stay filled as the animation drifts.
const CROWD = [...SEEDS, ...SEEDS, ...SEEDS, ...SEEDS];

// ─── HeroBoard ────────────────────────────────────────────────────────────────
export function HeroBoard() {
  const innerRef  = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    let rafId: number;
    let last = performance.now();
    function tick(now: number) {
      const dt = now - last;
      last = now;
      if (!pausedRef.current && innerRef.current) {
        offsetRef.current += (dt / 1000) * 22;
        // Reset after exactly 1 copy of SEEDS scrolled past (grid is 4× SEEDS)
        const loopWidth = innerRef.current.scrollWidth / 4;
        if (loopWidth > 0 && offsetRef.current >= loopWidth) offsetRef.current = 0;
        innerRef.current.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`;
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, black 7%, black 22%, transparent 31%, transparent 69%, black 78%, black 93%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 7%, black 22%, transparent 31%, transparent 69%, black 78%, black 93%, transparent 100%)",
      }}
    >
      <div
        ref={innerRef}
        className="grid h-full w-max grid-flow-col content-center gap-x-5 gap-y-6 [grid-auto-columns:64px] [grid-template-rows:repeat(6,64px)] will-change-transform"
        onMouseEnter={() => { pausedRef.current = true;  }}
        onMouseLeave={() => { pausedRef.current = false; }}
        style={{ pointerEvents: "auto" }}
      >
        {CROWD.map((seed, idx) => {
          const isHighlighted = HIGHLIGHTED.has(seed);
          const persona = PERSONAS[seed];
          return (
            <div key={`${seed}-${idx}`} className="group/cell relative size-16 cursor-default">
              <div className={
                "size-16 overflow-hidden rounded-full transition-transform duration-200 group-hover/cell:scale-110 " +
                (isHighlighted ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-white" : "")
              }>
                <Avatar seed={seed} />
              </div>
              {/* Tooltip — shown for every avatar */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 flex-col items-center whitespace-nowrap rounded-md border border-border bg-white px-2.5 py-1.5 shadow-lg group-hover/cell:flex">
                <span className="font-sans text-xs font-semibold text-foreground">
                  {persona?.name ?? seed}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {persona?.role ?? "Navigating Indian law"} · {persona?.city ?? "India"}
                </span>
                <div className="absolute top-full left-1/2 -mt-px -translate-x-1/2 border-4 border-transparent border-t-white" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
