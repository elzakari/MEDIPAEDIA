const fs = require("fs");
const files = [
  ["hospital-admin", "C:\\Users\\Public\\Documents\\MEDIPAEDIA\\medipaedia\\apps\\hospital-web\\src\\app\\(hospital-admin)\\hospital-admin\\page.tsx"],
  ["patient-store", "C:\\Users\\Public\\Documents\\MEDIPAEDIA\\medipaedia\\apps\\patient-store\\src\\app\\(dashboard)\\dashboard\\page.tsx"],
  ["pharmacy-admin", "C:\\Users\\Public\\Documents\\MEDIPAEDIA\\medipaedia\\apps\\pharmacy-pos\\src\\app\\(pharmacy-admin)\\pharmacy-admin\\page.tsx"],
  ["clinical", "C:\\Users\\Public\\Documents\\MEDIPAEDIA\\medipaedia\\apps\\hospital-web\\src\\app\\(clinical)\\page.tsx"],
  ["reception", "C:\\Users\\Public\\Documents\\MEDIPAEDIA\\medipaedia\\apps\\hospital-web\\src\\app\\(reception)\\reception\\page.tsx"],
  ["nurse", "C:\\Users\\Public\\Documents\\MEDIPAEDIA\\medipaedia\\apps\\hospital-web\\src\\app\\(nurse)\\nurse\\page.tsx"],
  ["doctor", "C:\\Users\\Public\\Documents\\MEDIPAEDIA\\medipaedia\\apps\\hospital-web\\src\\app\\(doctor)\\doctor\\page.tsx"],
  ["hospital-finance", "C:\\Users\\Public\\Documents\\MEDIPAEDIA\\medipaedia\\apps\\hospital-web\\src\\app\\(hospital-finance)\\hospital-finance\\page.tsx"],
  ["dispensary", "C:\\Users\\Public\\Documents\\MEDIPAEDIA\\medipaedia\\apps\\pharmacy-pos\\src\\app\\(dispensary)\\page.tsx"],
  ["superintendent", "C:\\Users\\Public\\Documents\\MEDIPAEDIA\\medipaedia\\apps\\pharmacy-pos\\src\\app\\(superintendent)\\superintendent\\page.tsx"],
];
const reFlex = /className="flex(?!-col)[^"]*(gap-3|gap-4)[^"]*"[^>]*>[^<]*<(Card|div[^>]*rounded|div[^>]*p-\d)/g;
const reBadMinw = /min-w-\[(760|700|740|750|780|800)px\]/g;
for (let i = 0; i < files.length; i++) {
  const name = files[i][0];
  const p = files[i][1];
  const s = fs.readFileSync(p, "utf8");
  const wrappers = s.split("overflow-x-auto pb-2 scrollbar-thin").length - 1;
  const minw720 = s.split("min-w-[720px]").length - 1;
  const minwOther = (s.match(reBadMinw) || []);
  const flexGapCards = (s.match(reFlex) || []);
  const unwrapped = [];
  for (let j = 0; j < flexGapCards.length; j++) {
    const sn = flexGapCards[j];
    if (/pipeline|queue|kanban|waiting|flow|stages?|status/i.test(sn) || sn.length > 120) unwrapped.push(sn.substring(0, 140));
  }
  console.log("FILE: " + name);
  console.log("  Pattern B wrapper count (overflow-x-auto pb-2 scrollbar-thin): " + wrappers);
  console.log("  Inner min-w-[720px] count: " + minw720);
  if (minwOther.length > 0) console.log("  WRONG min-w tokens (not 720): " + JSON.stringify(minwOther));
  if (unwrapped.length > 0) {
    console.log("  Likely pipeline/flow flex rows found: " + unwrapped.length);
    unwrapped.slice(0, 2).forEach(u => console.log("    -> " + u));
  }
  console.log("");
}
