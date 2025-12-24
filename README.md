# Better Later

The easy-going habit tracking app. Study your own subconscious behaviors to incrementally achieve your goals—self-guided, non-judgmental, and verifiably private. Better Later helps you recognize your incremental successes, make realistic goals based on real data about your habits, and see your progress visually with charts, graphs, and statistics

- **Incremental approach** — Set your own pace to cut back using hard data, not willpower alone
- **Non-judgmental** — You could be tracking anything; the app makes no assumptions about your choices
- **Discreet** — No account, no download required—just visit the site (works offline too)
- **Data-driven** — Generate visualizations to make informed decisions and break out of autopilot

This project is open source and licensed under [GNU GPL v3.0](https://github.com/betterlaterapp/betterlaterapp.github.io?tab=GPL-3.0-1-ov-file).

## Data Privacy: designed to be verified by you

TL;DR
- ✅ Works offline → Shows no data is being sent
- ✅ No account needed → Shows we can't identify you  
- ✅ Open source → Shows we have nothing to hide
- ✅ GitHub Pages hosting → Shows there's no server collecting data
- ✅ Generic habit terms → Shows your specific habit stays private

**Your privacy is protected by design, not by promises.** Better Later was built from the ground up to ensure your personal habit data stays private. Here's a guide so that anyone can verify for themselves.

## Your Data Never Leaves Your Device

**What this means:** When you use Better Later, all your habit tracking data (what you track, when you did it, how you felt) is stored directly on your phone or computer. It never gets sent to any server, company, or third party.

**How to verify this yourself:**
1. After having visted Better Later at least once, put your phone in airplane mode (completely offline)
2. Open Better Later and use it normally - add entries, check your stats
3. If data was being sent somewhere, the app would break offline

**Ask an AI assistant:** *"Can a website that runs offline and works without internet connection be sending my data somewhere?"* (The answer is no - data can only be sent when you're connected to the internet)

**What if the app waits until I'm back online?** *For those who want EXTRA assurance*

You can verify this by confirming the code in this repository matches what runs on your device, and that the code contains no data transmission. An AI assistant can walk you through each step:

1. **Verify the code you're running matches this repository:**
   - Open Developer Tools in your browser (F12 or right-click → Inspect)
   - Go to Sources tab → find files under `betterlaterapp.github.io`
   - Compare any file (like `app/app.js`) to the same file in this GitHub repository 
   - They should be identical—if not, you may have an outdated cached version

2. **Verify this code doesn't send data anywhere:**
   - First, confirm with any AI: *"In a web browser, what methods can JavaScript use to send data to an external server?"* (The answer will include `fetch`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon`)
   - Go to the [`app/js/` folder in this repository](https://github.com/betterlaterapp/betterlaterapp.github.io/tree/main/app/js) and note all the `.js` files
   - Upload those files to an AI and ask: *"Do any of these files contain fetch, XMLHttpRequest, WebSocket, sendBeacon, or any other method of sending data to external servers?"*
   - The AI will confirm: none of them do

**Understanding cookies and localStorage**

You may have heard that websites track you using "cookies." Here's how that works and why Better Later is different:

- **Third-party tracking cookies** (used by Facebook, Google, ad networks) work by embedding their code on many websites. When you visit Site A and Site B, both sites load Facebook's tracking pixel, allowing Facebook to connect your activity across both sites. This is documented extensively by the [Electronic Frontier Foundation](https://www.eff.org/issues/online-behavioral-tracking) and [Mozilla's tracking protection documentation](https://support.mozilla.org/en-US/kb/trackers-and-scripts-firefox-blocks-enhanced-track).

- **Better Later uses localStorage**, which is fundamentally different. LocalStorage is sandboxed—only `betterlaterapp.github.io` can read data stored by `betterlaterapp.github.io`. No other website can access it. This is enforced by your browser's [Same-Origin Policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy), a core web security feature.

- **We load zero third-party scripts.** No Facebook SDK, no Google Analytics, no advertising pixels. You can verify this in Developer Tools → Network tab: all requests go only to `betterlaterapp.github.io` or `github.io`.

**Why GitHub Pages is trustworthy for hosting:**

GitHub is owned by Microsoft and is the world's largest platform for open-source software development, used by over 100 million developers ([GitHub About page](https://github.com/about)). GitHub Pages is their free static website hosting service with a key limitation: **it can only serve files, not run server-side code**. This isn't a policy we follow—it's a technical constraint GitHub enforces. There's physically no way for a GitHub Pages site to receive or store data from visitors. The code you see in the repository is exactly what gets served to your browser, with no hidden server processing in between. 

**What about browser-level tracking?**

Some browsers (particularly Chrome) collect browsing data for their parent companies. This is separate from website-level tracking—it happens at the browser level regardless of what websites you visit. For privacy-conscious users, organizations like the [EFF](https://www.eff.org/pages/tools) and [PrivacyGuides.org](https://www.privacyguides.org/en/desktop-browsers/) maintain recommendations for privacy-respecting browsers like Firefox, Brave, or Safari. Using one of these browsers adds another layer of protection, though Better Later's design means even Chrome users' habit data stays local to their device. 

## You Control When (and If) the App Updates

**What this means:** Unlike most apps that update automatically (potentially changing how your data is handled), Better Later only updates when YOU choose to press the update button. You're always in control.

**Why this matters:** Even if someone wanted to add tracking in a future version, you'd have to manually approve that update. You can review changes before updating.

**How to verify this yourself:**
1. Go to Settings in the app
2. Look for the "current version" and "available version" numbers
3. Notice they might be different - but nothing changes until you click "Update app"

**What if it's actually updating silently?** *For those who want EXTRA assurance*

Service workers (the technology that enables offline use) can technically update in the background. Here's how to confirm Better Later only updates when you choose:

1. **Check your cached version:**
   - Open Better Later from a computer and open Developer Tools (F12) → Application tab → Cache Storage
   - Look for a cache named like `v1.2.3::pages` — the version number is visible
   - This version should match what's shown in Settings under "current version"

2. **Monitor for unauthorized changes:**
   - Go to Application → Service Workers
   - Check "Update on reload" is NOT enabled by default
   - The service worker status shows when it was last updated. 

3. **Compare before and after:**
   - Note your current version number
   - Close the app completely and reopen it a day later
   - The version should remain unchanged unless you clicked "Update app"

4. **Ask an AI to verify the update logic:**
   - Find the file `sw_cached_pages.js` in this repository
   - Ask: *"Does this service worker auto-update, or does it require user action?"*
   - The code shows updates only trigger when explicitly requested

## No Account, No Email, No Phone Number

**What this means:** You never create an account. You never give your email. You never give your phone number. We literally have no way to know who you are, even if we wanted to.

**How to verify this yourself:**
1. Think back to when you first used the app
2. Did it ever ask for your email? Your name? A phone number?
3. No? That's because we don't want it and don't need it!

**Ask an AI assistant:** *"If I never gave an app my email or phone number, and there's no login, how could they possibly identify me or contact me?"* (They can't!)

## Runs Entirely in Your Browser (No Server Backend)

**What this means:** Better Later is what's called a "static website" or "frontend-only" application. There is no company server running behind the scenes. The code runs directly in your browser, like a calculator app.

**How to verify this yourself:**
1. Notice the app runs on `github.io` - GitHub Pages only hosts static files (no server code)
2. The entire source code is visible at: [github.com/betterlaterapp](https://github.com/betterlaterapp/betterlaterapp.github.io)
3. You can read every single line of code yourself

**Ask an AI assistant:** *"Can a website hosted on GitHub Pages have a backend server that receives user data?"* (No - GitHub Pages is specifically designed to only serve static files, with no ability to run server code or receive data)

## 100% Open Source - The app doesn't reference any cloud services

**What this means:** Every line of code that makes this app work is publicly visible. Anyone can read it, verify it, and confirm there's no hidden tracking.

**How to verify this yourself:**
1. Visit [github.com/betterlaterapp/betterlaterapp.github.io](https://github.com/betterlaterapp/betterlaterapp.github.io)
2. Browse the code - particularly the `app/` folder
3. Search for words like "fetch", "http", "send", "post", "api" - you won't find any data being sent anywhere

**Ask an AI assistant:** Copy any JavaScript file from the repository and ask: *"Does this code send any user data to external servers?"* The AI can analyze the code and confirm there's no data transmission.

##  Technical Verification (For Those Who Want to Dig Deeper)

If you're technically inclined or want to ask someone technical to verify:

1. **Network Inspection:** Open your browser's Developer Tools (F12), go to the Network tab, and use the app. You'll see it only loads static files - no data is ever sent out.

2. **Local Storage:** All data is stored in your browser's Local Storage. Go to Developer Tools → Application → Local Storage to see your own data stored locally.

3. **Service Worker:** The app uses a service worker for offline capability, not for tracking. You can inspect this in Developer Tools → Application → Service Workers.

4. **No Analytics:** There's no Google Analytics, no Facebook Pixel, no tracking scripts of any kind.

