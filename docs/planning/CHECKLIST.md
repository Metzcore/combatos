# APEX PROTOCOL / COMBATOS CHECKLIST

## Project A — current app hardening
- [x] A1. State management bug fix completed.
- [x] Manual localhost test passed for HUD/tab-switch persistence.
- [x] Manual localhost test passed for stopwatch persistence across tabs.
- [x] Manual localhost test passed for countdown persistence across tabs.
- [x] Payload shape preserved after state fix.
- [x] Android PWA/installability fix completed.
- [x] Cloudflare redeploy completed after PWA fix.
- [x] Fresh phone reinstall completed after PWA fix.
- [x] Manual production test passed for Android install flow.
- [x] HUD scroll-return diagnostic completed.
- [x] HUD scroll-position restore implementation completed.
- [x] Manual production test passed for HUD scroll restore across tabs.
- [x] Commit current hardening checkpoint to Git.

- [x] A2. Timer upgrade diagnostic prompt.
- [x] A2. Timer upgrade implementation prompt.
- [x] Test custom rounds timer.
- [x] Test two bell channels.
- [x] Test saved timer setups.
- [x] Test portrait mobile usability for Timer.

- [~] A3. Mobility tab diagnostic/prompt. (Deferred to Project B)
- [x] A4. Daily Ignition diagnostic/prompt.
- [x] A4. Daily Ignition implementation.
- [x] Test splash on app open.
- [x] Test auto-fade and manual dismiss.
- [x] Test bookmark save/remove.
- [x] Test settings toggle on/off.

- [x] A4. Commit all Project A changes.
- [x] Push Project A to GitHub.
- [x] Verify Cloudflare Pages deployment.
- [x] Final mobile browser test on hardened app.

## Project B — only after Project A is stable
- [ ] Duplicate stable Project A repo.
- [ ] Create Project B Cloudflare deployment.
- [ ] Rebrand to APEX PROTOCOL.
- [ ] Load Emmanuel training plan into HUD.
- [ ] Replace %1RM logic with RPE display/logging where needed.
- [ ] Add Real G tab.
- [ ] Reuse Daily Ignition system.
- [ ] Add Mobility tab for Emmanuel version.
- [ ] Connect new Google Sheet/webhook target.
- [ ] Test in iPhone Safari browser.
- [ ] Test Add to Home Screen flow on iPhone.
- [ ] Test installed iPhone home-screen app.
- [ ] Test state persistence on iPhone across tabs.
- [ ] Test timer/audio behavior on iPhone.
- [ ] Deploy and verify Emmanuel version.

## Guardrails
- [x] Do not mix current app work with future app customization.
- [x] Diagnostic before modification.
- [x] State management fix was first.
- [x] Keep prompts surgical and scoped to one change at a time.
- [x] Do not start Project B before Project A is complete and verified.