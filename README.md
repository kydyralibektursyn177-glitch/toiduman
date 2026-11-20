# Қазақ Шоу

A local TikTok LIVE gift overlay for OBS and TikTok LIVE Studio. The control page and transparent overlay share a room through Socket.IO. After you start your TikTok LIVE and connect once, gifts and chat events drive the overlay automatically.

## Run locally

Install Node.js 22 or newer. Open a terminal in this folder and run:

```sh
npm install
npm start
```

1. Open [http://127.0.0.1:3000](http://127.0.0.1:3000). To preview offline, leave the username empty, open the overlay link for the demo room, and click any test gift in the control page.
2. Start your TikTok LIVE in TikTok. Enter its username with or without @, then press **Қосылу / Подключиться**.
3. Select a format and copy the overlay URL into an OBS Browser Source or a TikTok LIVE Studio link source. Use **1080 × 1920** for vertical, or **1920 × 1080** for horizontal. The horizontal URL uses `&mode=horizontal`. The overlay fits other viewport sizes proportionally.
4. In OBS, right-click the browser source and choose **Interact**, then click **Дыбысты қосу / Включить звук** if shown. Enable **Control audio via OBS** to manage the source in the audio mixer. In LIVE Studio, use source interaction if available. If your source cannot receive clicks and blocks autoplay, open the overlay in a regular browser, enable sound there, and capture its audio and window.

## Gifts, goal and region battle

Edit `gifts.json` and restart the server. Gift names match case-insensitively. A name match overrides the value tiers, which use the **per-gift** TikTok `diamondCount`. Galaxy is explicitly mapped to the cinematic effect by name. A completed streak scores its full quantity once. High-value animations go to the front of the waiting queue while the current animation finishes.

The goal counts units of the gift name entered in the control panel. Team commands are `!almaty`, `!astana`, and `!shymkent`. Gifts made after choosing a team add their value times quantity to that team. The donor leaderboard uses the same scoring. Goal configuration and session statistics are kept in memory and reset when the app restarts. Test events are labelled and preview their own stats without adding to real results.

## Optional settings

Copy `.env.example` to `.env`. Set `PORT` to change the listener port. Set `SIGN_API_KEY` if your Euler Stream signing configuration requires it. By default the app binds to `127.0.0.1`. Use this local setup for OBS or LIVE Studio on the same computer. The control room has no authentication, so keep it on loopback or behind authenticated access.

[TikTok LIVE Connector](https://github.com/zerodytrash/TikTok-Live-Connector) is unofficial and may break after TikTok updates. The server retries dropped connections, offline rooms and rate limits with capped exponential backoff. The control page displays the current connection state and retry timing.

## Audio

The WAV clips in `public/sounds` are original synthesized cues made for this project, including the plucked-string dombra-style cue. Use or replace them freely. If a file cannot be loaded, the overlay plays a generated Web Audio phrase after audio is enabled.
