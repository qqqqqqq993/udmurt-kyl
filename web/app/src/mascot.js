// Гондырпи — медвежонок-первоклассник в удмуртской рубахе и с ранцем. Собственный рисунок (SVG).
(function () {
  let uid = 0;

  function band(x, y, w, h, c1, c2) {
    let s = "";
    const step = h * 1.15;
    for (let px = x + step / 2; px < x + w - h / 4; px += step) {
      s += `<path d="M${px} ${y} l${h / 2} ${h / 2} -${h / 2} ${h / 2} -${h / 2} -${h / 2}z" fill="${c1}"/>`;
      s += `<rect x="${px - h * 0.11}" y="${y + h / 2 - h * 0.11}" width="${h * 0.22}" height="${h * 0.22}" fill="${c2}"/>`;
    }
    return s;
  }

  // руки: from = плечо, to = кисть
  function arm(from, to, id, cls) {
    const [x1, y1] = from, [x2, y2] = to;
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const cx = x2 - (dx / len) * 9, cy = y2 - (dy / len) * 9;
    const cx2 = x2 - (dx / len) * 3, cy2 = y2 - (dy / len) * 3;
    return `<g class="${cls || ""}">
      <path d="M${x1} ${y1} L${cx} ${cy}" stroke="url(#sh${id})" stroke-width="21" stroke-linecap="round"/>
      <path d="M${cx} ${cy} L${cx2} ${cy2}" stroke="#D7262E" stroke-width="22" stroke-linecap="butt"/>
      <circle cx="${x2}" cy="${y2}" r="11.5" fill="url(#fur${id})"/>
      <ellipse cx="${x2 - 2}" cy="${y2 - 3}" rx="4" ry="3" fill="#fff" opacity=".18"/>
    </g>`;
  }

  function face(mood, id) {
    const eyes = {
      happy: `<g class="m-eyes"><ellipse cx="80" cy="70" rx="8.5" ry="10" fill="#2A1A12"/><ellipse cx="120" cy="70" rx="8.5" ry="10" fill="#2A1A12"/><circle cx="83" cy="66" r="3.4" fill="#fff"/><circle cx="123" cy="66" r="3.4" fill="#fff"/><circle cx="78" cy="74" r="1.6" fill="#fff" opacity=".8"/><circle cx="118" cy="74" r="1.6" fill="#fff" opacity=".8"/></g>`,
      joy: `<path d="M71 71 q9 -11 18 0" stroke="#2A1A12" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M111 71 q9 -11 18 0" stroke="#2A1A12" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
      sad: `<g class="m-eyes"><ellipse cx="80" cy="72" rx="8" ry="9" fill="#2A1A12"/><ellipse cx="120" cy="72" rx="8" ry="9" fill="#2A1A12"/><circle cx="83" cy="68" r="3" fill="#fff"/><circle cx="123" cy="68" r="3" fill="#fff"/></g><path d="M70 56 l16 -5M130 56 l-16 -5" stroke="#5C3519" stroke-width="3.5" stroke-linecap="round"/>`
    };
    const mouths = {
      happy: `<path d="M90 98 q10 9 20 0" stroke="#2A1A12" stroke-width="3.2" fill="none" stroke-linecap="round"/>`,
      joy: `<path d="M87 96 q13 18 26 0 z" fill="#7A2430"/><path d="M93 102 q7 5 14 0" fill="#F27A8A"/>`,
      sad: `<path d="M91 102 q9 -6 18 0" stroke="#2A1A12" stroke-width="3.2" fill="none" stroke-linecap="round"/>`,
      wow: `<ellipse cx="100" cy="101" rx="6" ry="7" fill="#7A2430"/>`
    };
    const e = mood === "joy" ? eyes.joy : mood === "sad" ? eyes.sad : eyes.happy;
    const m = mouths[mood] || mouths.happy;
    return `${e}
      <ellipse cx="68" cy="88" rx="9" ry="6" fill="#FF8A8A" opacity=".55"/><ellipse cx="132" cy="88" rx="9" ry="6" fill="#FF8A8A" opacity=".55"/>
      <path d="M92 84 q8 -5 16 0 q-2 8 -8 9 q-6 -1 -8 -9z" fill="#2A1A12"/>
      <ellipse cx="97" cy="84.5" rx="3" ry="1.6" fill="#fff" opacity=".5"/>
      <path d="M100 92 v4" stroke="#2A1A12" stroke-width="3" stroke-linecap="round"/>
      ${m}`;
  }

  function svg(pose, mood) {
    const id = ++uid;
    pose = pose || "idle"; mood = mood || (pose === "cheer" ? "joy" : pose === "think" ? "happy" : "happy");
    const L = [64, 134], R = [136, 134];
    const arms = {
      idle: [arm(L, [57, 176], id), arm(R, [143, 176], id)],
      wave: [arm(L, [57, 176], id), arm(R, [170, 92], id, "m-wave")],
      cheer: [arm(L, [30, 96], id, "m-cheer-l"), arm(R, [170, 96], id, "m-cheer-r")],
      point: [arm(L, [57, 176], id), arm(R, [184, 126], id)],
      think: [arm(L, [57, 176], id), arm(R, [116, 112], id)]
    }[pose] || [];
    const waveLines = pose === "wave" ? `<path d="M184 74 q6 6 4 14M190 66 q10 10 7 24" stroke="#FFC23D" stroke-width="3.5" fill="none" stroke-linecap="round"/>` : "";
    const thinkDots = pose === "think" ? `<circle cx="166" cy="44" r="5" fill="#fff" stroke="#E6DCCF" stroke-width="2"/><circle cx="178" cy="28" r="7" fill="#fff" stroke="#E6DCCF" stroke-width="2"/><text x="178" y="32.5" text-anchor="middle" font-size="11" font-weight="900" fill="#D7262E" font-family="Rubik, sans-serif">?</text>` : "";
    return `<svg class="mascot-svg pose-${pose}" viewBox="0 0 200 222" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Медвежонок Гондырпи">
    <defs>
      <radialGradient id="fur${id}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#C98A4E"/><stop offset=".65" stop-color="#9C5F2C"/><stop offset="1" stop-color="#7A4520"/></radialGradient>
      <radialGradient id="head${id}" cx="42%" cy="34%" r="68%"><stop offset="0" stop-color="#D49A5E"/><stop offset=".6" stop-color="#A86733"/><stop offset="1" stop-color="#7F4A22"/></radialGradient>
      <linearGradient id="sh${id}" x1="0" x2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E9DFD2"/></linearGradient>
      <linearGradient id="shirt${id}" x1="0" x2="1"><stop offset="0" stop-color="#F1E9DE"/><stop offset=".45" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E6DBCD"/></linearGradient>
      <linearGradient id="bag${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8343C"/><stop offset="1" stop-color="#A9161E"/></linearGradient>
    </defs>
    <ellipse cx="100" cy="214" rx="58" ry="7" fill="#3A1D10" opacity=".14"/>
    <!-- ранец -->
    <rect x="40" y="112" width="120" height="76" rx="22" fill="url(#bag${id})"/>
    <rect x="40" y="150" width="14" height="30" rx="6" fill="#FFC23D"/><rect x="146" y="150" width="14" height="30" rx="6" fill="#FFC23D"/>
    <path d="M150 112 l10 -16 l6 3 l-8 15z" fill="#3E8EDE"/><path d="M160 96 l6 3 l2 -6z" fill="#FFE0A8"/>
    <!-- ноги -->
    <ellipse cx="78" cy="198" rx="17" ry="15" fill="url(#fur${id})"/><ellipse cx="122" cy="198" rx="17" ry="15" fill="url(#fur${id})"/>
    <ellipse cx="78" cy="203" rx="9" ry="6" fill="#F3D7B0"/><ellipse cx="122" cy="203" rx="9" ry="6" fill="#F3D7B0"/>
    <!-- рубаха -->
    <path d="M70 124 Q100 116 130 124 L140 190 Q100 198 60 190 Z" fill="url(#shirt${id})" stroke="#DCCFBF" stroke-width="1"/>
    <path d="M61.5 180 Q100 188 138.5 180 L140 190 Q100 198 60 190 Z" fill="#D7262E"/>
    <g>${band(64, 181.5, 72, 6.5, "#FFF6E8", "#1E1A1D")}</g>
    <rect x="93" y="122" width="14" height="30" rx="2" fill="#D7262E"/>
    <g>${band(93, 124, 14, 6, "#FFF6E8", "#1E1A1D")}${band(93, 132, 14, 6, "#1E1A1D", "#FFF6E8")}${band(93, 140, 14, 6, "#FFF6E8", "#1E1A1D")}</g>
    <!-- лямки ранца -->
    <path d="M74 124 Q70 150 72 170" stroke="#1E1A1D" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M126 124 Q130 150 128 170" stroke="#1E1A1D" stroke-width="8" fill="none" stroke-linecap="round"/>
    <rect x="67" y="146" width="10" height="7" rx="2" fill="#FFC23D"/><rect x="123" y="146" width="10" height="7" rx="2" fill="#FFC23D"/>
    <!-- пояс-кушак -->
    <path d="M62 164 Q100 172 138 164 l.8 8 Q100 180 62.8 172z" fill="#1E1A1D"/>
    <path d="M70 168 Q100 175 130 168" stroke="#D7262E" stroke-width="2" fill="none" stroke-dasharray="4 3"/>
    <path d="M134 172 l4 16 M138 171 l6 15 M131 173 l1 15" stroke="#D7262E" stroke-width="3" stroke-linecap="round"/>
    <!-- руки -->
    ${arms.join("")}
    ${waveLines}
    <!-- голова -->
    <g class="m-head">
      <circle cx="58" cy="34" r="19" fill="url(#head${id})"/><circle cx="142" cy="34" r="19" fill="url(#head${id})"/>
      <circle cx="58" cy="35" r="10" fill="#E8A9A0"/><circle cx="142" cy="35" r="10" fill="#E8A9A0"/>
      <ellipse cx="100" cy="74" rx="56" ry="52" fill="url(#head${id})"/>
      <ellipse cx="84" cy="40" rx="20" ry="10" fill="#fff" opacity=".12" transform="rotate(-15 84 40)"/>
      <ellipse cx="100" cy="94" rx="27" ry="20" fill="#F3D7B0"/>
      ${face(mood, id)}
    </g>
    ${thinkDots}
  </svg>`;
  }

  window.UDM_MASCOT = { svg, NAME: "Гондырпи" };
})();
