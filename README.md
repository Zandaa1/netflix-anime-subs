# 🎬 Netflix Custom Subs

A lightweight Chrome extension (Manifest V3) that lets you load external subtitle files (`.srt` or `.vtt`) and display them on top of Netflix video playback, with real-time manual sync offset controls to fix audio/subtitle drift.

Created by [**Zandaa1**](https://github.com/Zandaa1).

---

## ✨ Features

- **Custom Subtitle Files**: Load `.srt` or `.vtt` files directly into Netflix player.
- **Real-Time Offset Sync**: Adjust subtitle timing on the fly (`-1s`, `-0.1s`, `+0.1s`, `+1s`) to match video audio perfectly.
- **Seamless Netflix Integration**: Subtitles scale dynamically and re-position cleanly across fullscreen toggles and video resizes.
- **Hide / Show Toggle**: Quickly toggle subtitle overlay visibility without losing loaded file data.
- **Privacy First**: 100% client-side operation with zero tracking, data collection, or external network calls.

---

## 🚀 Installation Instructions

Since this is an unpacked extension, follow these steps to load it into Chrome, Brave, Edge, or any Chromium browser:

1. Download or clone this repository to your local folder.
2. Open your Chromium-based browser and navigate to the Extensions management page:
   - **Chrome**: `chrome://extensions`
   - **Brave**: `brave://extensions`
   - **Edge**: `edge://extensions`
3. Enable **Developer mode** (toggle switch in the top-right corner).
4. Click the **Load unpacked** button in the top-left area.
5. Select the `netflix-anime-subs` folder.
6. Pin the extension icon to your browser toolbar for quick access.

---

## 📖 How to Load & Use Subtitle Files

1. **Open Netflix**: Navigate to [Netflix](https://www.netflix.com) and start playing your desired anime, movie, or show.
2. **Open Extension Popup**: Click the **Netflix Custom Subs** icon in your browser toolbar while on the active Netflix video tab.
3. **Load Subtitle File**:
   - Click the **Choose File** / file input button.
   - Select your `.srt` or `.vtt` file from your device.
   - The status text will update to confirm how many subtitle lines were loaded.
4. **Enjoy Playback**: Subtitles will appear rendered over the bottom-center of the video player.
5. **Adjust Sync (If Subtitles are Off-Sync)**:
   - Use the **`-1s` / `-0.1s`** buttons if subtitles appear **too late** (shifts subtitles earlier).
   - Use the **`+0.1s` / `+1s`** buttons if subtitles appear **too early** (shifts subtitles later).
6. **Toggle Subtitles**: Click **Hide subtitles** to temporarily hide the overlay, or **Show subtitles** to turn it back on.

---

## 🔒 Privacy & Data Notice

- **No Personal Data**: This extension does not collect, record, transmit, or store any personal data, user credentials, browsing history, or analytics.
- **Local File Processing**: Subtitle files are parsed strictly inside your browser instance and are never uploaded to any remote server.

---

## ☕ Support the Project

If you find this extension helpful, consider supporting development!

[![Buy Me a Coffee / Ko-fi](https://img.shields.io/badge/Ko--fi-Buy%20me%20a%20coffee-ff5e5b?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/zandaadev)

Support link: [https://ko-fi.com/zandaadev](https://ko-fi.com/zandaadev)

---

## 📄 License

Distributed under the MIT License. Feel free to modify and contribute!
