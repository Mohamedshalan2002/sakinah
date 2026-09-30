/* ==========================================================================
   سَكِينَة — الأيقونات والزخارف
   كلها SVG مرسومة برمجيًا داخل الملف: لا أصول مصوّرة محميّة ولا ملفات خارجية.
   ========================================================================== */
(function (global) {
  'use strict';

  const S = 'stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';

  /* ---------- زخارف إسلامية هندسية ---------- */

  // نجمة ثمانية (مربعان متقاطعان) — أساس الزخرفة
  function star8(size) {
    size = size || 24;
    const c = size / 2;
    const r = size * 0.42;
    let sq = '';
    [0, 45].forEach(function (rot) {
      const pts = [];
      for (let k = 0; k < 4; k++) {
        const a = (rot + 90 * k) * Math.PI / 180;
        pts.push((c + r * Math.cos(a)).toFixed(2) + ',' + (c + r * Math.sin(a)).toFixed(2));
      }
      sq += '<polygon points="' + pts.join(' ') + '" fill="none" stroke="currentColor" stroke-width="' + (size > 30 ? 1.6 : 1.2) + '"/>';
    });
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true">' + sq +
      '<circle cx="' + c + '" cy="' + c + '" r="' + (size * 0.07).toFixed(2) + '" fill="currentColor"/></svg>';
  }

  // شريط زخرفي متكرر (يُستخدم كخلفية)
  function patternStrip() {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="90" height="26" viewBox="0 0 90 26">' +
      '<g fill="none" stroke="#c6a265" stroke-width="1" opacity="0.85">' +
      '<polygon points="15,4 26,13 15,22 4,13"/>' +
      '<polygon points="15,8.5 21.5,13 15,17.5 8.5,13"/>' +
      '<path d="M26 13h11M53 13h11"/>' +
      '<polygon points="45,6 52,13 45,20 38,13"/>' +
      '<polygon points="75,3 84,13 75,23 66,13"/>' +
      '<polygon points="75,8 80,13 75,18 70,13"/>' +
      '</g></svg>';
    return 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '")';
  }

  /* ---------- أيقونات الواجهة ---------- */
  const ICONS = {
    quran: '<svg viewBox="0 0 24 24" ' + S + '><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/><path d="M9.5 8.5h5.5M9.5 12h5.5"/></svg>',
    beads: '<svg viewBox="0 0 24 24" ' + S + '><circle cx="12" cy="4.6" r="1.7"/><circle cx="18.4" cy="7.6" r="1.7"/><circle cx="20" cy="14.2" r="1.7"/><circle cx="15.6" cy="19.4" r="1.7"/><circle cx="8.4" cy="19.4" r="1.7"/><circle cx="4" cy="14.2" r="1.7"/><circle cx="5.6" cy="7.6" r="1.7"/><path d="M12 8.6v7" stroke-dasharray="1.6 2"/></svg>',
    compass: '<svg viewBox="0 0 24 24" ' + S + '><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg>',
    heart: '<svg viewBox="0 0 24 24" ' + S + '><path d="M12 20s-7-4.6-7-9.6A4.4 4.4 0 0 1 12 7.9 4.4 4.4 0 0 1 19 10.4c0 5-7 9.6-7 9.6z"/></svg>',
    handHeart: '<svg viewBox="0 0 24 24" ' + S + '><path d="M11 20s-6-3.8-6-8a3.7 3.7 0 0 1 6-2.9 3.7 3.7 0 0 1 6 2.9c0 4.2-6 8-6 8z"/><path d="M3 20.5h18"/></svg>',
    check: '<svg viewBox="0 0 24 24" ' + S + '><path d="M4.5 12.5l5 5 10-11"/></svg>',
    checkCircle: '<svg viewBox="0 0 24 24" ' + S + '><circle cx="12" cy="12" r="9"/><path d="M8 12.4l2.6 2.6L16 9.6"/></svg>',
    close: '<svg viewBox="0 0 24 24" ' + S + '><path d="M6 6l12 12M18 6L6 18"/></svg>',
    back: '<svg viewBox="0 0 24 24" ' + S + '><path d="M15 5l-7 7 7 7"/></svg>',
    sun: '<svg viewBox="0 0 24 24" ' + S + '><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.5 1.5M17.3 17.3l1.5 1.5M18.8 5.2l-1.5 1.5M6.7 17.3l-1.5 1.5"/></svg>',
    moon: '<svg viewBox="0 0 24 24" ' + S + '><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>',
    sunrise: '<svg viewBox="0 0 24 24" ' + S + '><path d="M3 18h18M6 18a6 6 0 0 1 12 0"/><path d="M12 3v4M4.5 8l2 2M19.5 8l-2 2"/></svg>',
    sunset: '<svg viewBox="0 0 24 24" ' + S + '><path d="M3 18h18M6 18a6 6 0 0 1 12 0"/><path d="M12 9V5M4.5 12l2-2M19.5 12l-2-2"/></svg>',
    bell: '<svg viewBox="0 0 24 24" ' + S + '><path d="M18 15V10a6 6 0 1 0-12 0v5l-1.5 3h15z"/><path d="M10 21h4"/></svg>',
    bellOff: '<svg viewBox="0 0 24 24" ' + S + '><path d="M18 15V10a6 6 0 0 0-9.3-5"/><path d="M6.2 6.2A6 6 0 0 0 6 10v5l-1.5 3h15"/><path d="M10 21h4"/><path d="M3 3l18 18"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" ' + S + '><path d="M7 3.5h10a1 1 0 0 1 1 1v16l-6-4-6 4v-16a1 1 0 0 1 1-1z"/></svg>',
    bookmarkFilled: '<svg viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M7 3.5h10a1 1 0 0 1 1 1v16l-6-4-6 4v-16a1 1 0 0 1 1-1z"/></svg>',
    settings: '<svg viewBox="0 0 24 24" ' + S + '><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1"/></svg>',
    search: '<svg viewBox="0 0 24 24" ' + S + '><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" ' + S + '><path d="M17 3l3 3-3 3"/><path d="M20 6H8a4 4 0 0 0-4 4v1"/><path d="M7 21l-3-3 3-3"/><path d="M4 18h12a4 4 0 0 0 4-4v-1"/></svg>',
    play: '<svg viewBox="0 0 24 24" ' + S + '><path d="M8 5.5l10 6.5-10 6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" ' + S + '><path d="M9 5v14M15 5v14"/></svg>',
    download: '<svg viewBox="0 0 24 24" ' + S + '><path d="M12 3.5v11"/><path d="M7.5 10.5l4.5 4.5 4.5-4.5"/><path d="M4.5 20.5h15"/></svg>',
    location: '<svg viewBox="0 0 24 24" ' + S + '><path d="M12 21s-6.5-6-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.4"/></svg>',
    info: '<svg viewBox="0 0 24 24" ' + S + '><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.4"/></svg>',
    shield: '<svg viewBox="0 0 24 24" ' + S + '><path d="M12 3l7 3v5.5c0 4.4-3 7.6-7 9.5-4-1.9-7-5.1-7-9.5V6z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4"/></svg>',
    cloudRain: '<svg viewBox="0 0 24 24" ' + S + '><path d="M7 15.5A3.5 3.5 0 0 1 7 8.5a5 5 0 0 1 9.6-1.2A3.6 3.6 0 0 1 18 15.5"/><path d="M8.5 18.5l-1 2M12.5 18.5l-1 2M16.5 18.5l-1 2"/></svg>',
    route: '<svg viewBox="0 0 24 24" ' + S + '><circle cx="6" cy="18.5" r="2.5"/><circle cx="18" cy="5.5" r="2.5"/><path d="M8.5 18.5h6a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7h5.5"/></svg>',
    coins: '<svg viewBox="0 0 24 24" ' + S + '><ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7"/><path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/></svg>',
    users: '<svg viewBox="0 0 24 24" ' + S + '><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6.1M17.5 20a5.6 5.6 0 0 0-1.6-3.9"/></svg>',
    sprout: '<svg viewBox="0 0 24 24" ' + S + '><path d="M12 21v-8"/><path d="M12 13c0-3.3-2.7-6-6-6 0 3.3 2.7 6 6 6z"/><path d="M12 11c0-2.8 2.2-5 5-5 0 2.8-2.2 5-5 5z"/></svg>',
    mosque: '<svg viewBox="0 0 24 24" ' + S + '><path d="M12 3c2.4 2 4 3.6 4 5.6 0 1.3-.8 2.4-2 2.9"/><path d="M12 3C9.6 5 8 6.6 8 8.6c0 1.3.8 2.4 2 2.9"/><path d="M4 20.5V13a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7.5"/><path d="M3 20.5h18"/><path d="M10 20.5v-3.2a2 2 0 0 1 4 0v3.2"/></svg>',
    heartPulse: '<svg viewBox="0 0 24 24" ' + S + '><path d="M12 20s-7-4.6-7-9.6A4.4 4.4 0 0 1 12 7.9 4.4 4.4 0 0 1 19 10.4c0 5-7 9.6-7 9.6z"/><path d="M4.5 12.5h4l1.5-2 2 3.4 1.6-2.4h5.5"/></svg>',
    palette: '<svg viewBox="0 0 24 24" ' + S + '><path d="M12 3a9 9 0 1 0 0 18c1.3 0 2-.9 2-1.8 0-1.6-1.4-1.7-1.4-3 0-1 .8-1.7 1.9-1.7H17A4 4 0 0 0 21 10.5C21 6.4 17 3 12 3z"/><circle cx="8" cy="10" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="7.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.8" cy="9.8" r="1.1" fill="currentColor" stroke="none"/></svg>',
    list: '<svg viewBox="0 0 24 24" ' + S + '><path d="M8 6.5h12M8 12h12M8 17.5h12"/><circle cx="4.5" cy="6.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="17.5" r="1.1" fill="currentColor" stroke="none"/></svg>',
    trash: '<svg viewBox="0 0 24 24" ' + S + '><path d="M5 7h14"/><path d="M9.5 7V4.8h5V7"/><path d="M6.5 7l.9 12.2a1 1 0 0 0 1 .8h7.2a1 1 0 0 0 1-.8L17.5 7"/></svg>',
    share: '<svg viewBox="0 0 24 24" ' + S + '><path d="M12 3.5v11"/><path d="M8 7.5l4-4 4 4"/><path d="M5 14v5.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V14"/></svg>',
    copy: '<svg viewBox="0 0 24 24" ' + S + '><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3"/></svg>',
    star: '<svg viewBox="0 0 24 24" ' + S + '><path d="M12 3.8l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.5 10l5.9-.8z"/></svg>',
    fire: '<svg viewBox="0 0 24 24" ' + S + '><path d="M12 21c3.6 0 6-2.4 6-5.6 0-4.4-4.4-5.3-4.4-9.4-2 .8-3.6 3-3.6 5 0 1.4-1 1.8-1.6 1.2-.7-.7-1-1.7-1-2.7C5.9 11 6 12.6 6 15.4 6 18.6 8.4 21 12 21z"/></svg>',
    target: '<svg viewBox="0 0 24 24" ' + S + '><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" ' + S + '><rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M3.5 10.5h17M8 3.5v4M16 3.5v4"/></svg>',
    book: '<svg viewBox="0 0 24 24" ' + S + '><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15.5H5.5A1.5 1.5 0 0 0 4 20z"/><path d="M4 20a1.5 1.5 0 0 1 1.5-1.5H19V21H5.5A1.5 1.5 0 0 1 4 20z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" ' + S + '><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" ' + S + '><path d="M12 3.5l1.8 4.7 4.7 1.8-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.8z"/><path d="M18.5 16.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
    water: '<svg viewBox="0 0 24 24" ' + S + '><path d="M12 3.5s5.5 6 5.5 10a5.5 5.5 0 0 1-11 0c0-4 5.5-10 5.5-10z"/></svg>',
    soul: '<svg viewBox="0 0 24 24" ' + S + '><path d="M12 3c1.6 2.2 3 4 3 5.8A3 3 0 0 1 12 12a3 3 0 0 1-3-3.2C9 7 10.4 5.2 12 3z"/><path d="M8 13.5h8M9 20h6"/><path d="M12 13.5V17"/></svg>',
    calendarHeart: '<svg viewBox="0 0 24 24" ' + S + '><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M12 18.6s-2.6-1.6-2.6-3.4a1.3 1.3 0 0 1 2.6-.6 1.3 1.3 0 0 1 2.6.6c0 1.8-2.6 3.4-2.6 3.4z"/></svg>',
    moonStar: '<svg viewBox="0 0 24 24" ' + S + '><path d="M19 13.5A7.5 7.5 0 0 1 9.5 4a7.5 7.5 0 1 0 9.5 9.5z"/><path d="M17.5 3.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
  };

  function icon(name, sizeClass) {
    const raw = ICONS[name] || ICONS.info;
    if (!sizeClass) return raw;
    return raw.replace('<svg ', '<svg class="' + sizeClass + '" ');
  }

  global.Icons = {
    star8: star8,
    patternStrip: patternStrip,
    icon: icon,
    ICONS: ICONS,
  };
})(window);
