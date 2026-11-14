/** Stylesheet for the globe toy UI (scoped with the gt- prefix, lives inside #globe-toy). */
export const GLOBE_CSS = `
#globe-toy{position:fixed;inset:0;background:#030612;z-index:500;overflow:hidden;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#fff;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
#globe-toy canvas{position:absolute;inset:0;width:100%;height:100%}
#globe-toy .gt-main{touch-action:none;cursor:grab;outline:none}
#globe-toy .gt-main:focus-visible{outline:3px solid #ffe36e;outline-offset:-3px}
#globe-toy button{font-family:inherit;cursor:pointer;color:#fff;-webkit-appearance:none;appearance:none}
#globe-toy button:focus-visible{outline:3px solid #ffe36e;outline-offset:3px}
#globe-toy .gt-back{position:absolute;min-height:48px;min-width:48px;padding:0 20px;border-radius:30px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.32);font-size:1rem;z-index:10}
#globe-toy .gt-zoom{position:absolute;display:flex;gap:8px;z-index:10}
#globe-toy .gt-z{width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.34);font-size:1.7rem;line-height:1;padding:0;display:flex;align-items:center;justify-content:center}
#globe-toy .gt-z:disabled{opacity:.35;cursor:default}
#globe-toy .gt-play{position:absolute;display:flex;gap:22px;justify-content:center;align-items:center;z-index:10}
#globe-toy .gt-btn{position:relative;width:60px;height:60px;border-radius:50%;border:3px solid rgba(255,255,255,.85);font-size:1.9rem;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.45);transition:transform .12s}
#globe-toy .gt-btn:active{transform:scale(.92)}
#globe-toy .gt-surprise{background:linear-gradient(145deg,#c06bff,#ff6fb0)}
#globe-toy .gt-find{background:linear-gradient(145deg,#ffb23f,#ff7a3f)}
#globe-toy .gt-pass-btn{background:linear-gradient(145deg,#2fc8b6,#2b8fd6)}
#globe-toy .gt-find.gt-on{box-shadow:0 0 0 5px rgba(255,227,110,.75),0 4px 14px rgba(0,0,0,.45)}
#globe-toy .gt-badge{position:absolute;right:-6px;top:-8px;min-width:26px;height:26px;padding:0 6px;border-radius:13px;background:#fff;color:#16335c;font-size:.85rem;font-weight:800;display:flex;align-items:center;justify-content:center;box-sizing:border-box;box-shadow:0 2px 6px rgba(0,0,0,.4)}
#globe-toy .gt-card{position:absolute;box-sizing:border-box;background:rgba(8,18,46,.86);border:1px solid rgba(255,255,255,.26);border-radius:22px;padding:10px 14px;z-index:9;overflow-y:auto;overscroll-behavior:contain;opacity:0;visibility:hidden;pointer-events:none;transform:translateY(8px);transition:opacity .25s,transform .25s,visibility 0s .25s}
#globe-toy .gt-card.gt-show{opacity:1;visibility:visible;pointer-events:auto;transform:none;transition:opacity .25s,transform .25s}
#globe-toy .gt-card-main{display:flex;align-items:center;gap:12px;width:100%;background:none;border:0;padding:0;text-align:left;font-size:inherit;min-height:56px}
#globe-toy .gt-flag{font-size:clamp(2.6rem,12vw,3.6rem);line-height:1;flex:none;font-family:"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif}
#globe-toy .gt-text{min-width:0;flex:1}
#globe-toy .gt-name{font-size:clamp(1.3rem,5.4vw,2rem);font-weight:800;line-height:1.12;overflow-wrap:break-word;hyphens:auto}
#globe-toy.gt-land .gt-flag{font-size:2.5rem}
#globe-toy.gt-land .gt-name{font-size:clamp(1.15rem,2.2vw,1.6rem)}
#globe-toy .gt-sub{font-size:clamp(.85rem,3.4vw,1.05rem);color:rgba(255,255,255,.72);margin-top:3px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center}
#globe-toy .gt-chip{display:inline-block;border:1px solid rgba(255,255,255,.5);border-radius:14px;padding:2px 10px;font-size:.8rem;color:#fff}
#globe-toy .gt-new{display:inline-block;background:#ffe36e;color:#4a3300;border-radius:12px;padding:1px 9px;font-weight:800;font-size:.8rem}
#globe-toy .gt-more{margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.2);font-size:1rem;display:grid;gap:5px;overflow-wrap:anywhere}
#globe-toy .gt-more[hidden]{display:none}
#globe-toy .gt-more b{color:rgba(255,255,255,.62);font-weight:700;font-size:.78rem;margin-right:6px;letter-spacing:.04em}
#globe-toy .gt-pass{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,560px);max-height:min(82vh,640px);overflow:auto;box-sizing:border-box;padding:16px 16px 18px;border-radius:24px;background:rgba(8,18,46,.95);border:1px solid rgba(255,255,255,.3);z-index:30}
#globe-toy .gt-pass h2{margin:0 0 2px;font-size:1.35rem}
#globe-toy .gt-pass .gt-total{font-size:1.05rem;color:rgba(255,255,255,.8);margin-bottom:10px}
#globe-toy .gt-pass h3{margin:12px 0 4px;font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.6)}
#globe-toy .gt-flags{display:flex;flex-wrap:wrap;gap:4px;font-size:2rem;line-height:1.15;font-family:"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif}
#globe-toy .gt-x{position:absolute;right:8px;top:8px;width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);font-size:1.3rem;padding:0}
#globe-toy .gt-reset{position:relative;overflow:hidden;margin-top:16px;min-height:44px;padding:0 16px;border-radius:22px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.3);font-size:.85rem;color:rgba(255,255,255,.8)}
#globe-toy .gt-reset i{position:absolute;left:0;top:0;bottom:0;width:0;background:rgba(255,110,110,.5)}
#globe-toy .gt-reset.gt-holding i{width:100%;transition:width 2s linear}
#globe-toy .gt-ghost{position:absolute;left:0;top:0;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.55),rgba(255,255,255,.15) 70%);border:2px solid rgba(255,255,255,.55);display:none;align-items:center;justify-content:center;font-size:1.5rem;pointer-events:none;z-index:8;opacity:0}
#globe-toy .gt-ghost.gt-go{display:flex;animation:gt-swipe 2s ease-in-out 2 both}
@keyframes gt-swipe{0%{opacity:0;transform:translate(0,0) scale(1.15)}12%{opacity:.9;transform:translate(0,0) scale(.9)}78%{opacity:.9;transform:translate(var(--gdx),0) scale(.9)}100%{opacity:0;transform:translate(var(--gdx),0) scale(1.1)}}
#globe-toy .gt-stars i{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;pointer-events:none;animation:gt-tw 3.4s ease-in-out infinite}
@keyframes gt-tw{0%,100%{opacity:.15}50%{opacity:1}}
#globe-toy .gt-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
#globe-toy .gt-probe{position:absolute;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)}
@media (prefers-reduced-motion:reduce){#globe-toy .gt-stars i{animation:none;opacity:.6}#globe-toy .gt-card,#globe-toy .gt-btn{transition:none}#globe-toy .gt-ghost.gt-go{animation-duration:.01s}}
`;
