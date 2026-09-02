// Moduli di gioco: ogni slot = {roles:[...accettati], x%, y%} sul campo.
// ════════════════════════════════════════════════════════════════
// FORMATIONS — slots: {roles:[...], x%, y%}
// roles = lista ruoli accettati dallo slot (tutti primari, nessuna penalità)
// ════════════════════════════════════════════════════════════════
const FORMS = {
  "3-4-3": [
    {roles:["Por"],        x:50,y:90},
    {roles:["Dc"],         x:25,y:73},{roles:["Dc"],      x:50,y:73},{roles:["Dc","B"],   x:75,y:73},
    {roles:["E"],          x:10,y:51},{roles:["M","C"],   x:33,y:51},{roles:["C"],        x:60,y:51},{roles:["E"],        x:90,y:51},
    {roles:["W","A"],      x:18,y:18},{roles:["A","Pc"],  x:50,y:18},{roles:["W","A"],    x:82,y:18},
  ],
  "3-4-1-2": [
    {roles:["Por"],        x:50,y:90},
    {roles:["Dc"],         x:25,y:73},{roles:["Dc"],      x:50,y:73},{roles:["Dc","B"],   x:75,y:73},
    {roles:["E"],          x:10,y:53},{roles:["M","C"],   x:33,y:53},{roles:["C"],        x:60,y:53},{roles:["E"],        x:90,y:53},
    {roles:["T"],          x:50,y:34},
    {roles:["A","Pc"],     x:33,y:14},{roles:["A","Pc"],  x:67,y:14},
  ],
  "3-4-2-1": [
    {roles:["Por"],        x:50,y:90},
    {roles:["Dc"],         x:25,y:73},{roles:["Dc"],      x:50,y:73},{roles:["Dc","B"],   x:75,y:73},
    {roles:["E","W"],      x:10,y:53},{roles:["M"],       x:33,y:53},{roles:["M","C"],    x:60,y:53},{roles:["E"],        x:90,y:53},
    {roles:["T"],          x:33,y:31},{roles:["T","A"],   x:67,y:31},
    {roles:["A","Pc"],     x:50,y:12},
  ],
  "3-5-2": [
    {roles:["Por"],        x:50,y:90},
    {roles:["Dc"],         x:25,y:73},{roles:["Dc"],      x:50,y:73},{roles:["Dc","B"],   x:75,y:73},
    {roles:["E","W"],      x:8, y:51},{roles:["M","C"],   x:28,y:51},{roles:["M"],        x:50,y:51},{roles:["C"],        x:72,y:51},{roles:["E"],        x:92,y:51},
    {roles:["A","Pc"],     x:33,y:18},{roles:["A","Pc"],  x:67,y:18},
  ],
  "3-5-1-1": [
    {roles:["Por"],        x:50,y:90},
    {roles:["Dc"],         x:25,y:73},{roles:["Dc"],      x:50,y:73},{roles:["Dc","B"],   x:75,y:73},
    {roles:["E","W"],      x:8, y:51},{roles:["M"],       x:28,y:51},{roles:["C"],        x:50,y:51},{roles:["M"],        x:72,y:51},{roles:["E","W"],    x:92,y:51},
    {roles:["T","A"],      x:50,y:32},
    {roles:["A","Pc"],     x:50,y:13},
  ],
  "4-3-3": [
    {roles:["Por"],        x:50,y:90},
    {roles:["Ds"],         x:14,y:73},{roles:["Dc"],      x:38,y:73},{roles:["Dc"],       x:62,y:73},{roles:["Dd"],       x:86,y:73},
    {roles:["M","C"],      x:25,y:51},{roles:["M"],       x:50,y:51},{roles:["C"],        x:75,y:51},
    {roles:["W","A"],      x:15,y:18},{roles:["A","Pc"],  x:50,y:18},{roles:["W","A"],    x:85,y:18},
  ],
  "4-3-1-2": [
    {roles:["Por"],        x:50,y:90},
    {roles:["Ds"],         x:14,y:73},{roles:["Dc"],      x:38,y:73},{roles:["Dc"],       x:62,y:73},{roles:["Dd"],       x:86,y:73},
    {roles:["M","C"],      x:25,y:54},{roles:["M"],       x:50,y:54},{roles:["C"],        x:75,y:54},
    {roles:["T"],          x:50,y:34},
    {roles:["T","A","Pc"], x:33,y:13},{roles:["A","Pc"],  x:67,y:13},
  ],
  "4-4-2": [
    {roles:["Por"],        x:50,y:90},
    {roles:["Ds"],         x:14,y:73},{roles:["Dc"],      x:38,y:73},{roles:["Dc"],       x:62,y:73},{roles:["Dd"],       x:86,y:73},
    {roles:["E","W"],      x:12,y:51},{roles:["M","C"],   x:38,y:51},{roles:["C"],        x:62,y:51},{roles:["E"],        x:88,y:51},
    {roles:["A","Pc"],     x:33,y:18},{roles:["A","Pc"],  x:67,y:18},
  ],
  "4-1-4-1": [
    {roles:["Por"],        x:50,y:90},
    {roles:["Ds"],         x:14,y:75},{roles:["Dc"],      x:38,y:75},{roles:["Dc"],       x:62,y:75},{roles:["Dd"],       x:86,y:75},
    {roles:["M"],          x:50,y:57},
    {roles:["E","W"],      x:12,y:37},{roles:["C","T"],   x:38,y:37},{roles:["T"],        x:62,y:37},{roles:["W"],        x:88,y:37},
    {roles:["A","Pc"],     x:50,y:14},
  ],
  "4-4-1-1": [
    {roles:["Por"],        x:50,y:90},
    {roles:["Ds"],         x:14,y:73},{roles:["Dc"],      x:38,y:73},{roles:["Dc"],       x:62,y:73},{roles:["Dd"],       x:86,y:73},
    {roles:["E","W"],      x:12,y:52},{roles:["M"],       x:38,y:52},{roles:["C"],        x:62,y:52},{roles:["E","W"],    x:88,y:52},
    {roles:["T","A"],      x:50,y:32},
    {roles:["A","Pc"],     x:50,y:13},
  ],
  "4-2-3-1": [
    {roles:["Por"],        x:50,y:90},
    {roles:["Ds"],         x:14,y:75},{roles:["Dc"],      x:38,y:75},{roles:["Dc"],       x:62,y:75},{roles:["Dd"],       x:86,y:75},
    {roles:["M"],          x:35,y:57},{roles:["M","C"],   x:65,y:57},
    {roles:["W","T"],      x:14,y:36},{roles:["T"],       x:50,y:36},{roles:["W","A"],    x:86,y:36},
    {roles:["A","Pc"],     x:50,y:14},
  ],
};

