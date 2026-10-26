// Собственные векторные иллюстрации и удмуртский орнамент
(function () {
  let uid = 0;
  const id = (p) => p + (++uid);

  // Восьмиконечный солярный знак (мотив флага Удмуртии)
  function sunSign(cx, cy, r, fill) {
    let s = "";
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const tipX = cx + Math.cos(a) * r, tipY = cy + Math.sin(a) * r;
      const midR = r * 0.55, w = r * 0.2;
      const mx = cx + Math.cos(a) * midR, my = cy + Math.sin(a) * midR;
      const px = -Math.sin(a) * w, py = Math.cos(a) * w;
      s += `<path d="M${cx} ${cy} L${mx + px} ${my + py} L${tipX} ${tipY} L${mx - px} ${my - py} Z" fill="${fill}"/>`;
    }
    s += `<rect x="${cx - r * 0.17}" y="${cy - r * 0.17}" width="${r * 0.34}" height="${r * 0.34}" transform="rotate(45 ${cx} ${cy})" fill="#fff"/>`;
    return s;
  }

  // Полоса вышивки: ромбы с крючками
  function band(x, y, w, h, c1, c2) {
    let s = "";
    const step = h * 1.1;
    for (let px = x + step / 2; px < x + w; px += step) {
      s += `<path d="M${px} ${y} L${px + h / 2} ${y + h / 2} L${px} ${y + h} L${px - h / 2} ${y + h / 2} Z" fill="${c1}"/>`;
      s += `<rect x="${px - h * 0.12}" y="${y + h / 2 - h * 0.12}" width="${h * 0.24}" height="${h * 0.24}" fill="${c2}"/>`;
    }
    return s;
  }

  const shadow = (cx, cy, rx) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 0.16}" fill="#3a1d10" opacity=".13"/>`;

  function colorBlob(hex) {
    const g = id("cb"), h = id("hl");
    const white = hex.toUpperCase() === "#FFFFFF";
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="${g}" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="${hex}" stop-opacity=".75"/><stop offset=".45" stop-color="${hex}"/><stop offset="1" stop-color="${white ? "#D9D0C4" : hex}" /></radialGradient>
        <radialGradient id="${h}" cx="35%" cy="28%" r="30%"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      </defs>
      ${shadow(50, 90, 30)}
      <path d="M50 10c14 0 20 9 30 13s12 15 9 27-2 19-11 26-18 9-28 9-21-3-28-11-11-16-10-27 5-19 13-26 11-11 25-11z" fill="url(#${g})" ${white ? 'stroke="#D9CFC4" stroke-width="2.5"' : ""}/>
      <path d="M50 10c14 0 20 9 30 13s12 15 9 27-2 19-11 26-18 9-28 9-21-3-28-11-11-16-10-27 5-19 13-26 11-11 25-11z" fill="url(#${h})"/>
      <circle cx="82" cy="22" r="5" fill="${hex}" ${white ? 'stroke="#D9CFC4" stroke-width="2"' : ""}/>
      <circle cx="15" cy="78" r="3.5" fill="${hex}" ${white ? 'stroke="#D9CFC4" stroke-width="2"' : ""}/>
    </svg>`;
  }

  function dress() {
    const g = id("dr");
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="${g}" x1="0" x2="1"><stop offset="0" stop-color="#F3ECE2"/><stop offset=".5" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E9DFD2"/></linearGradient></defs>
      ${shadow(50, 94, 34)}
      <path d="M38 10h24l4 6 14 6 8 26-9 3-6-16 5 55H22l5-55-6 16-9-3 8-26 14-6z" fill="url(#${g})" stroke="#CDBFAF" stroke-width="1.2"/>
      <path d="M42 10c2 6 14 6 16 0" fill="none" stroke="#D7262E" stroke-width="3"/>
      <rect x="44" y="16" width="12" height="22" fill="#D7262E" rx="1"/>
      ${band(44, 18, 12, 5, "#fff", "#1E1A1D")}${band(44, 26, 12, 5, "#1E1A1D", "#fff")}${band(44, 32, 12, 5, "#fff", "#1E1A1D")}
      <path d="M12 45l9 3" stroke="#D7262E" stroke-width="4"/><path d="M79 48l9-3" stroke="#D7262E" stroke-width="4"/>
      <rect x="22.6" y="74" width="54.8" height="10" fill="#D7262E"/>
      ${band(23, 75, 54, 8, "#fff", "#1E1A1D")}
      <rect x="22.2" y="85" width="55.6" height="3" fill="#1E1A1D"/>
    </svg>`;
  }

  function apron() {
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      ${shadow(50, 94, 30)}
      <path d="M36 10h28v18H36z" fill="#C81F27"/>
      <path d="M36 12 18 6M64 12l18-6" stroke="#1E1A1D" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M22 30h56l-4 58H26z" fill="#D7262E"/>
      <path d="M22 30h56l-1 8H23z" fill="#1E1A1D"/>
      <path d="M14 32h20M66 32h20" stroke="#1E1A1D" stroke-width="3" stroke-linecap="round"/>
      ${band(28, 46, 44, 7, "#FFF6E8", "#1E1A1D")}
      ${band(27, 70, 46, 9, "#FFF6E8", "#1E1A1D")}
      <path d="M26 82h48l-.4 6H26.4z" fill="#FFF6E8"/>
      <path d="M40 14h20v10H40z" fill="none" stroke="#FFF6E8" stroke-width="1.5" stroke-dasharray="2 2"/>
    </svg>`;
  }

  function kerchief() {
    const g = id("kf");
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8333B"/><stop offset="1" stop-color="#B81820"/></linearGradient></defs>
      ${shadow(50, 92, 32)}
      <path d="M8 20h84L50 88z" fill="url(#${g})"/>
      <path d="M8 20h84l-4 6H12z" fill="#1E1A1D"/>
      ${band(16, 27, 68, 6, "#FFF6E8", "#1E1A1D")}
      <path d="M18 36 50 82 82 36" fill="none" stroke="#FFF6E8" stroke-width="2" stroke-dasharray="3 3"/>
      <g transform="translate(0 4)">${sunSign(50, 52, 11, "#FFF6E8")}</g>
      <path d="M50 88l-4 6M50 88l4 6M50 88v7" stroke="#B81820" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }

  function cabbage() {
    const g = id("cg"), g2 = id("cg2");
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="${g}" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#E4F7B8"/><stop offset=".6" stop-color="#A9DA6B"/><stop offset="1" stop-color="#6FB23C"/></radialGradient>
        <radialGradient id="${g2}" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#9AD260"/><stop offset="1" stop-color="#3F8F2A"/></radialGradient>
      </defs>
      ${shadow(50, 92, 36)}
      <path d="M10 62c0-22 16-38 40-38s40 16 40 38c0 16-14 26-40 26S10 78 10 62z" fill="url(#${g2})"/>
      <circle cx="50" cy="55" r="27" fill="url(#${g})"/>
      <path d="M50 30c-6 10-6 40 0 52M36 38c6 6 10 20 9 36M64 38c-6 6-10 20-9 36" stroke="#7DBE45" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M14 64c8 6 16 6 22 2M86 64c-8 6-16 6-22 2" stroke="#2F7A22" stroke-width="2" fill="none"/>
      <ellipse cx="42" cy="42" rx="8" ry="5" fill="#fff" opacity=".45"/>
    </svg>`;
  }

  function beet() {
    const g = id("bt"), l = id("lf");
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="${g}" cx="38%" cy="35%" r="70%"><stop offset="0" stop-color="#C2366E"/><stop offset=".6" stop-color="#8E1446"/><stop offset="1" stop-color="#5E0A2E"/></radialGradient>
        <linearGradient id="${l}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#6CC24A"/><stop offset="1" stop-color="#2E8A3A"/></linearGradient>
      </defs>
      ${shadow(50, 94, 22)}
      <path d="M48 36C40 20 30 10 20 8c4 12 12 22 26 30z" fill="url(#${l})"/>
      <path d="M52 36c4-16 12-28 24-32-2 14-10 26-22 34z" fill="url(#${l})"/>
      <path d="M50 38c0-14 2-24 6-32" stroke="#A3174E" stroke-width="3" fill="none"/>
      <path d="M50 34c19 0 28 13 28 26S64 84 50 88c-14-4-28-15-28-28s9-26 28-26z" fill="url(#${g})"/>
      <path d="M50 88c0 4-1 7-3 9" stroke="#8E1446" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="40" cy="48" rx="7" ry="5" fill="#fff" opacity=".3"/>
    </svg>`;
  }

  function berry(kind) {
    const cfg = {
      wild: { c: "#E0262F", d: "#9C0F16", r: 8, n: 6, shape: "cone" },
      kalina: { c: "#F23B2E", d: "#B5160F", r: 7.5, n: 13, shape: "round" },
      brusnika: { c: "#C8102E", d: "#7E0A1C", r: 6.5, n: 10, shape: "round" },
      klukva: { c: "#D3173A", d: "#8A0B23", r: 9, n: 6, shape: "round" }
    }[kind];
    const g = id("br");
    // фиксированные позиции, чтобы картинка не «прыгала»
    const pos = {
      wild: [[30, 58], [52, 50], [72, 62], [40, 76], [62, 80], [50, 66]],
      kalina: [[36, 46], [50, 42], [64, 46], [30, 58], [44, 56], [58, 56], [72, 58], [38, 69], [52, 68], [66, 69], [45, 80], [59, 80], [52, 90]],
      brusnika: [[40, 50], [54, 48], [66, 54], [34, 62], [48, 61], [62, 64], [42, 73], [56, 74], [68, 74], [50, 84]],
      klukva: [[34, 62], [56, 58], [74, 68], [44, 80], [64, 84], [24, 80]]
    }[kind];
    let s = `<defs><radialGradient id="${g}" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".25" stop-color="${cfg.c}"/><stop offset="1" stop-color="${cfg.d}"/></radialGradient></defs>`;
    s += shadow(50, 95, 30);
    if (kind === "kalina") {
      s += `<path d="M50 8v24M50 20 36 40M50 20l14 20M50 26 30 52M50 26l22 26" stroke="#7A4A2A" stroke-width="2" fill="none"/>`;
      s += `<path d="M50 12c-14-6-26 0-30 10 12 4 24 0 30-10zM52 12c12-8 26-4 30 6-12 6-24 4-30-6z" fill="#3E9B3A"/>`;
    } else if (kind === "brusnika") {
      s += `<path d="M50 6v40" stroke="#6B4A2E" stroke-width="2.5"/>`;
      s += `<ellipse cx="38" cy="22" rx="12" ry="6" transform="rotate(-25 38 22)" fill="#2F7D32"/><ellipse cx="62" cy="18" rx="12" ry="6" transform="rotate(25 62 18)" fill="#3C9440"/><ellipse cx="40" cy="36" rx="11" ry="5.5" transform="rotate(-15 40 36)" fill="#3C9440"/><ellipse cx="62" cy="34" rx="11" ry="5.5" transform="rotate(15 62 34)" fill="#2F7D32"/>`;
    } else if (kind === "klukva") {
      s += `<path d="M8 40c20-6 40 0 60-4s24-4 26-2" stroke="#7A4A2A" stroke-width="2" fill="none"/>`;
      s += `<path d="M34 42v14M56 38v14M74 40v22M44 44v30M64 40v38M24 44v30" stroke="#7A4A2A" stroke-width="1.4"/>`;
      s += `<ellipse cx="20" cy="38" rx="5" ry="2.5" fill="#3C9440"/><ellipse cx="46" cy="36" rx="5" ry="2.5" fill="#3C9440"/><ellipse cx="82" cy="34" rx="5" ry="2.5" fill="#3C9440"/>`;
    } else {
      s += `<path d="M50 10c-6 14-14 26-20 40M50 10c4 14 4 26 2 40M50 10c10 14 18 30 22 44" stroke="#4E8E2E" stroke-width="2" fill="none"/>`;
      s += `<path d="M50 14c-16-8-30-2-34 10 14 6 28 2 34-10zM50 14c14-10 30-6 34 6-14 8-28 6-34-6z" fill="#3E9B3A"/><path d="M50 14c-4-8-2-12 0-14 2 2 4 6 0 14z" fill="#2F7D32"/>`;
    }
    pos.forEach(([x, y]) => {
      if (cfg.shape === "cone") {
        s += `<path d="M${x} ${y + cfg.r * 1.5}c-${cfg.r} -${cfg.r * 0.6} -${cfg.r * 1.1} -${cfg.r * 2} -${cfg.r * 0.6} -${cfg.r * 2.4}s${cfg.r * 1.2} -${cfg.r * 0.2} ${cfg.r * 1.2} 0 ${cfg.r * 0.4} ${cfg.r * 1.8} -${cfg.r * 0.6} ${cfg.r * 2.4}z" fill="url(#${g})"/>`;
        s += `<path d="M${x - 5} ${y - 9}l5 3 5-3" stroke="#3E9B3A" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
        s += `<circle cx="${x - 2}" cy="${y}" r=".9" fill="#FFE08A"/><circle cx="${x + 2}" cy="${y + 4}" r=".9" fill="#FFE08A"/><circle cx="${x + 1}" cy="${y - 3}" r=".9" fill="#FFE08A"/>`;
      } else {
        s += `<circle cx="${x}" cy="${y}" r="${cfg.r}" fill="url(#${g})"/>`;
        if (kind !== "kalina") s += `<circle cx="${x}" cy="${y + cfg.r * 0.75}" r="1" fill="${cfg.d}"/>`;
      }
    });
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
  }

  function flag() {
    const cl = id("fc");
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id="${cl}"><path d="M14 20c12-6 24-6 36 0s24 6 36 0v50c-12 6-24 6-36 0s-24-6-36 0z"/></clipPath></defs>
      ${shadow(50, 94, 32)}
      <rect x="10" y="14" width="4" height="80" rx="2" fill="#8C6A4F"/>
      <circle cx="12" cy="13" r="4" fill="#FFC23D"/>
      <g clip-path="url(#${cl})">
        <rect x="14" y="10" width="24" height="70" fill="#1E1A1D"/>
        <rect x="38" y="10" width="24" height="70" fill="#FFFFFF"/>
        <rect x="62" y="10" width="24" height="70" fill="#D7262E"/>
        ${sunSign(50, 46, 10, "#D7262E")}
        <path d="M14 20c12-6 24-6 36 0s24 6 36 0v50c-12 6-24 6-36 0s-24-6-36 0z" fill="#000" opacity=".06"/>
      </g>
      <path d="M14 20c12-6 24-6 36 0s24 6 36 0v50c-12 6-24 6-36 0s-24-6-36 0z" fill="none" stroke="#1E1A1D" stroke-opacity=".15"/>
    </svg>`;
  }

  // Орнаментальная лента для фона (data URI)
  function ornamentStrip(c1, c2, bg) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="14" viewBox="0 0 28 14">${bg ? `<rect width="28" height="14" fill="${bg}"/>` : ""}<path d="M7 1l6 6-6 6-6-6z" fill="${c1}"/><rect x="5.5" y="5.5" width="3" height="3" fill="${bg || "#fff"}"/><path d="M21 3l4 4-4 4-4-4z" fill="${c2}"/><path d="M14 0v2M14 12v2" stroke="${c2}" stroke-width="2"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  window.UDM_ART = {
    render(key) {
      if (key.startsWith("c:color:")) return colorBlob(key.slice(8));
      if (key.startsWith("c:berry:")) return berry(key.slice(8));
      switch (key) {
        case "c:dress": return dress();
        case "c:apron": return apron();
        case "c:kerchief": return kerchief();
        case "c:cabbage": return cabbage();
        case "c:beet": return beet();
        case "c:flag": return flag();
      }
      return "";
    },
    sunSignSVG(fill) {
      return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">${sunSign(20, 20, 18, fill)}</svg>`;
    },
    ornamentStrip
  };
})();
