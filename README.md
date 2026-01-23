# 🚀 I Go When?

A **simple yet powerful Chrome extension** that helps you with your **Zoho People attendance** — because who doesn’t want to know *when they go*? 😄

> ⚙️ **Note:**  
> This extension works **only** on the attendance page of [people.zoho.in](https://people.zoho.in).  
> ✅ **Supported Browsers:** Chromium-based (e.g., Chrome, Edge, Brave, etc.) and Firefox.

---

## 🧭 Install from Release

1. Grab the latest zip from the [**Releases Page**](https://github.com/uday-sudo/igowhen/releases).  
2. Extract it anywhere.

### Chromium (Chrome / Edge / Brave)
- Open `chrome://extensions`, toggle **Developer mode**.
- Click **Load unpacked** and pick the extracted folder (it contains `manifest.json`).

### Firefox
- Run `./create_firefox.sh` (or download `firefox_src.zip` if provided in the release) to generate the Firefox MV2 bundle in `build_firefox/` (and a `firefox_src.zip`).
- Open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → choose any file inside `build_firefox/` (e.g., `manifest.json`).

> Tip: for day-to-day dev, load `chromium_src/` in Chromium and `build_firefox/` in Firefox after running `./create_firefox.sh`.

Once loaded, reload the Zoho People attendance page.

---

## 📌 Optional: Pin the Extension

For quick access, pin it to your toolbar. (Chromium: puzzle icon → pin; Firefox: right‑click toolbar → Pin.)

---

## 🛠️ Development quick start
- `chromium_src/`: Manifest V3 source (Chrome/Edge/Brave).
- `create_firefox.sh`: builds Manifest V2 Firefox package into `build_firefox/` and `firefox_src.zip`.
- UI scripts live under `chromium_src/extras/` (shared by both browsers).
- Test manually by loading `chromium_src/` and `build_firefox/` simultaneously in their respective browsers.

---

✨ **That’s it!**  
You’re all set to use *I Go When* — effortless, seamless, and stylish.  
Happy tracking! 🕒
