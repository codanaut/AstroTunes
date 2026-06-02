# ![Astrotunes](/src-tauri/icons/192x192.png) AstroTunes 

> *My take on a Navidrome frontend.*

## 🤔 Why?
I don't like the default Navidrome UI and want an experience that's better than the default. Navidrome is great, but the UI is just not vibing with me and my tunes.

Why not just use Feishin or one of the many other apps? I do, and you should too, they are great! But I wanted to do my own thing while using the learning experience to experiment with Svelte 5 and Tauri.

## ✨ Does it do anything different than other Navidrome frontends?
Yep, well... sort of if you don't count all the other frontends that do similar things. 

AstroTunes is entirely JS-based and runs locally in your browser. This gives you some options for how you'd like to use it:

* **Desktop App:** You can download and install the desktop version to use it like any other music app with your Navidrome library.
* **Docker:** If you want, you can run it in Docker and access it from any browser or device.
* **Browser:** Or, since it's completely browser-based, you can just...

## 🌐 Try it out
Give the latest build a spin right here: [AstroTunes on GitHub Pages](https://codanaut.github.io/AstroTunes/)

> ⚠️ **A quick heads-up on limitations using the web link:** It will work with your local Navidrome IP the same way the desktop and Docker versions do. The hang-up is that some browsers block mixed content (HTTPS -> HTTP). For instance, Firefox is pretty strict and will only work with Navidrome instances secured with HTTPS. Edge did seem to be working last I checked.

None of these issues will happen with the desktop app or self-hosted versions. It's just a GitHub Pages quirk!

## 📱 Download the latest iOS build for SideStore
Head over to the [releases page](https://github.com/Codanaut/AstroTunes/releases/) to download the latest iOS IPA build. 
Or the [latest beta build can be found here](https://github.com/Codanaut/AstroTunes/releases/tag/ios-latest).
You can then install it on your device using [SideStore](https://sidestore.io/).

## 🛰️ My Goal for AstroTunes
* **Be fast.** (Built with Svelte 5 and Vite).
* **Look good.** (Dark mode, modern UI, no clutter).
* **Work everywhere.** (Browser/Desktop/Mobile).

## 🛠 Features?
* **Your whole library:** Browse Albums, Artists, and Songs without a headache.
* **An actual home screen:** Welcome back! Instead of just dumping you into a sea of album covers (eyeing you, Navidrome).
* **A real favorites page:** It's not just a playlist with a heart icon.
* **Grid or List views:** Because people have very strong opinions about this for some reason.
* **Similar Artists** section when viewing an artist.
* **"Appears On"** section so an artist's main albums aren't mixed up with every random feature they've done with someone else.
* **A working PWA** that isn't janky... usually.
* **Fun themes.**
* My own personal touch of magic and a bit of AI slop.

## 🔮 Coming Soon
I have a bunch of stuff I want to implement as the project matures:
* **Smart Playlists:** Native Navidrome smart playlist creation.
* **Advanced search.**
* **Playlist import & export.**
* **User & library management.**

You can track my to-do list in the issues tab. I try to keep it updated as I go, and I'm always open to suggestions if theres a feature you'd like to see.

### Long-term Goal:
Once I have all the core features I want and everything is stable, I'd like to take it a step further. I want to add a small local database to support a bunch of features I've been dreaming up but currently can't do because I'm limited by being a serverless frontend relying purely on the Navidrome API.

## 🧪 Development Status
**This is very much a Work in Progress!** - UI may change at any time and functionality is subject to breaking changes.

AstroTunes was partially "vibe coded." I do some and Gemini does some, but right now it's a mix of features that were put in place by AI, and me going through to flesh them out and "de-slop" the codebase.

So that's AstroTunes. Use it or don't use it 🤷‍♂️ I'll be using it either way and improving it along the way.

## 🛰 Tech Stack
* **Framework:** Svelte 5
* **Styling:** Tailwind CSS
* **Icons:** Lucide Svelte
* **Audio:** Howler.js
* **Build Tool:** Vite
* **Desktop App:** Tauri

---
*Built with ❤️ for the self-hosted music community. (And because I wanted a better music player).*