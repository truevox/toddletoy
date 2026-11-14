/** Scoped styles for the orrery toy (all selectors start with #orrery-toy). */
export const ORRERY_CSS = `
#orrery-toy{position:fixed;inset:0;background:#02030f;z-index:500;overflow:hidden;color:#fff;
  font-family:'Trebuchet MS','Segoe UI',Arial,sans-serif;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;
  --side:300px;--sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px);--sal:env(safe-area-inset-left,0px);--sar:env(safe-area-inset-right,0px)}
#orrery-toy canvas.orr-canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block}
#orrery-toy button{font:inherit;color:#fff;cursor:pointer;touch-action:manipulation}
#orrery-toy button:focus-visible{outline:3px solid #ffd54f;outline-offset:2px}
#orrery-toy .orr-back{position:absolute;top:calc(8px + var(--sat));left:max(12px,var(--sal));min-height:48px;min-width:48px;padding:0 18px;
  background:rgba(20,28,64,.78);border:1px solid rgba(255,255,255,.35);border-radius:30px;font-size:1rem;z-index:20}
#orrery-toy .orr-tools{position:absolute;top:calc(8px + var(--sat));right:max(12px,var(--sar));display:flex;gap:8px;z-index:20}
#orrery-toy .orr-round{width:48px;height:48px;border-radius:50%;background:rgba(20,28,64,.78);border:1px solid rgba(255,255,255,.35);
  font-size:1.35rem;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;position:relative}
#orrery-toy .orr-round[aria-pressed="true"]{background:#ffd54f;color:#1a1a40;border-color:#fff}
#orrery-toy .orr-title{position:absolute;top:calc(18px + var(--sat));left:50%;transform:translateX(-50%);pointer-events:none;
  font-size:1.1rem;color:rgba(255,255,255,.75);white-space:nowrap}
#orrery-toy .orr-note{position:absolute;top:calc(64px + var(--sat));right:max(12px,var(--sar));max-width:min(270px,calc(100% - 24px));z-index:25;
  background:rgba(12,18,48,.94);border:1px solid rgba(255,255,255,.4);border-radius:14px;padding:10px 14px;font-size:.95rem;line-height:1.35}
#orrery-toy .orr-note[hidden]{display:none}
#orrery-toy .orr-dock{position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;gap:8px;
  padding:6px 8px calc(8px + var(--sab));z-index:10}
#orrery-toy .orr-side{display:contents}
#orrery-toy .orr-card,#orrery-toy .orr-game{width:100%;max-width:560px;box-sizing:border-box;background:rgba(12,18,52,.9);
  border:1px solid rgba(255,255,255,.28);border-radius:20px;padding:8px 12px;display:grid;grid-template-columns:56px 1fr auto;
  column-gap:12px;align-items:center;position:relative}
#orrery-toy .orr-card[hidden],#orrery-toy .orr-game[hidden]{display:none}
#orrery-toy .orr-portrait{width:56px;height:56px;display:block}
#orrery-toy .orr-name{font-size:1.45rem;font-weight:700;line-height:1.1}
#orrery-toy .orr-line{font-size:1rem;line-height:1.25;color:#dfe6ff;margin-top:2px}
#orrery-toy .orr-more{min-height:48px;min-width:48px;border-radius:24px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.35);
  padding:0 12px;font-size:.95rem;white-space:nowrap}
#orrery-toy .orr-facts{grid-column:1/-1;margin:8px 0 2px;padding:8px 0 0;border-top:1px solid rgba(255,255,255,.2);
  display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:.95rem;line-height:1.3;max-height:34vh;overflow:auto}
#orrery-toy .orr-facts[hidden]{display:none}
#orrery-toy .orr-facts dt{color:#ffd54f;white-space:nowrap}
#orrery-toy .orr-facts dd{margin:0}
#orrery-toy .orr-scale{grid-column:1/-1;font-size:.82rem;color:#aab4e6;margin-top:6px}
#orrery-toy .orr-game .orr-name{font-size:1.25rem}
#orrery-toy .orr-stars{font-size:1rem;letter-spacing:2px;min-height:1.2em}
#orrery-toy .orr-game.orr-cheer{background:rgba(70,50,10,.92);border-color:#ffd54f}
#orrery-toy .orr-actions{display:flex;gap:4px;justify-content:center;flex-wrap:nowrap}
#orrery-toy .orr-actions .orr-round{width:48px;height:48px;font-size:1.25rem}
#orrery-toy .orr-gap{width:10px}
#orrery-toy .orr-bars{position:absolute;bottom:5px;left:50%;transform:translateX(-50%);display:flex;gap:2px;align-items:flex-end;height:6px}
#orrery-toy .orr-bars i{display:block;width:4px;background:rgba(255,255,255,.3);border-radius:1px}
#orrery-toy .orr-bars i.on{background:#ffd54f}
#orrery-toy .orr-play{font-size:1.1rem}
#orrery-toy .orr-play .orr-ico{position:relative;top:-4px}
#orrery-toy .orr-strip{display:flex;flex-wrap:wrap;justify-content:center;gap:4px}
#orrery-toy .orr-pb{width:48px;height:48px;border-radius:50%;padding:0;background:rgba(12,18,52,.85);border:2px solid rgba(255,255,255,.25);
  display:flex;align-items:center;justify-content:center;transition:transform .2s,border-color .2s,box-shadow .2s}
#orrery-toy .orr-pb canvas{width:38px;height:38px;display:block;pointer-events:none}
#orrery-toy .orr-pb[aria-pressed="true"]{border-color:#ffd54f;box-shadow:0 0 14px rgba(255,213,79,.8);transform:scale(1.08);background:rgba(50,44,90,.95)}
#orrery-toy .orr-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
#orrery-toy[data-mode="landscape"] .orr-dock{display:contents}
#orrery-toy[data-mode="landscape"] .orr-side{display:flex;flex-direction:column;gap:8px;position:absolute;top:calc(64px + var(--sat));right:max(8px,var(--sar));
  bottom:calc(8px + var(--sab));width:calc(var(--side) - 16px);z-index:10;align-items:stretch}
#orrery-toy[data-mode="landscape"] .orr-actions{order:0}
#orrery-toy[data-mode="landscape"] .orr-card,#orrery-toy[data-mode="landscape"] .orr-game{order:1;max-width:none;overflow:auto;max-height:100%}
#orrery-toy[data-mode="landscape"] .orr-strip{position:absolute;left:0;bottom:calc(6px + var(--sab));width:calc(100% - var(--side));z-index:10;padding:0 8px;box-sizing:border-box}
#orrery-toy[data-mode="landscape"] .orr-note{right:max(12px,var(--sar))}
@media (max-width:540px),(max-height:520px){#orrery-toy .orr-title{display:none}}
@media (max-width:360px){#orrery-toy .orr-name{font-size:1.25rem}#orrery-toy .orr-line{font-size:.92rem}}
@media (prefers-reduced-motion:reduce){#orrery-toy *{transition:none!important}}
`;
