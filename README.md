# 🎙️ Pro-Studio Recorder Modern

![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-2.3.3-000000?style=for-the-badge&logo=flask&logoColor=white)
![FFmpeg](https://img.shields.io/badge/FFmpeg-Ready-0078D4?style=for-the-badge&logo=ffmpeg&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-4fb325?style=for-the-badge)

A high-performance, professional-grade web application for recording, processing, and managing studio-quality audio directly from your browser. Optimized for both desktop and mobile workflows with zero-latency monitoring.

---

## 🏗️ System Architecture

The application follows a modern client-server architecture designed for high-fidelity audio capture and reliable background processing.

```mermaid
graph TD
    subgraph Client ["Client Side (Browser)"]
        UI["Modern Web UI"]
        MR["MediaRecorder API"]
        UA["User Action: Record/Stop"]
    end

    subgraph Backend ["Backend Services (Flask)"]
        API["Flask REST API"]
        PROC["Audio Recovery & Processing"]
        CONV["Pydub + FFmpeg Conversion"]
    end

    subgraph Storage ["Storage Layer"]
        DISK[("Local Storage /recordings")]
    end

    UA --> MR
    MR -- "WebM/Opus Stream" --> API
    API --> PROC
    PROC --> CONV
    CONV -- "Lossless WAV" --> DISK
    DISK -.-> UI
```

---

## ✨ Key Features

### 💎 Studio Quality Audio
- **Lossless Output**: Every recording is converted to high-fidelity PCM WAV format.
- **Configurable Profiles**:
  - **High**: 48kHz, 24-bit Stereo (Studio Standard)
  - **Medium**: 44.1kHz, 16-bit Stereo (CD Quality)
  - **Low**: 22.05kHz, 16-bit Mono (Voice Optimized)

### 🛠️ Advanced Admin Ecosystem
- **System Monitoring**: Real-time disk usage and process status tracking.
- **Deep Analysis**: HEX/ASCII header inspection for debugging audio corruption.
- **Security**: Localhost-locked administrative panel to prevent unauthorized management.

### 📱 Seamless Mobile Integration
- **Zero Install**: Access the recorder via local network IP.
- **HTTPS/SSL Ready**: Built-in adhoc SSL support to enable microphone access on modern browsers.
- **Adaptive UI**: Fully responsive interface that scales from 4K monitors to mobile screens.

---

## 🔄 Recording Workflow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Server
    participant FFmpeg_Pydub

    User->>Browser: Starts Recording
    Browser->>Browser: Captures Media Stream (Opus/WebM)
    User->>Browser: Stops Recording
    Browser->>Server: POST /upload (Audio Blob)
    Note over Server: Processing Started
    Server->>FFmpeg_Pydub: Load Stream + Convert to PCM
    FFmpeg_Pydub->>Server: Return Lossless WAV
    Server->>Server: Write to /recordings
    Server-->>Browser: JSON Success (Metadata)
    Browser->>User: Display New Recording
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python 3.8+**
- **FFmpeg** (Recommended for advanced audio conversion)

### 2. Automatic Installation (Windows)
Simply run the included batch script:
```powershell
./setup_and_run.bat
```

### 3. Accessing the App
| Destination | URL | Access |
| :--- | :--- | :--- |
| **Main Recorder** | `https://localhost:5000` | Local/Network |
| **Admin Panel** | `https://localhost:5000/admin` | PC Only |

> **Note**: Since the app uses self-signed SSL for microphone access, you will see a security warning. Click **Advanced** -> **Proceed to localhost**.

---

## 📊 Technical Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Backend** | Python / Flask | Web Server & API |
| **Processing** | Pydub / FFmpeg | Audio Transcoding |
| **Frontend** | Vanilla JS / CSS3 | Pulse UI & Media Capture |
| **System** | Psutil | Metrics & Monitoring |
| **Security** | Cryptography | SSL/HTTPS Support |

---

## 📂 Project Structure

```text
audio_recorder_app_modern/
├── app.py                 # Core Logic & API Endpoints
├── requirements.txt       # Environment Dependencies
├── setup_and_run.bat      # Windows Deployment Script
├── recordings/            # Physical Audio Storage
├── static/                # Assets (CSS/JS)
└── templates/             # HTML5 Jinja2 Templates
```

---

## 📱 Mobile Recording Guide

1. **WiFi**: Connect computer and phone to the same network.
2. **IP**: Run `ipconfig` on host to find your IP (e.g., `192.168.1.5`).
3. **Connect**: Open browser on phone to `https://192.168.1.5:5000`.
4. **Bypass**: Tap "Advanced" ➔ "Proceed" (SSL Warning).

---

## 🔒 Security & Privacy

- **On-Device**: No audio is sent to external clouds.
- **Localhost Admin**: Dashboard is locked to the host OS.

---

## 🤝 Contributing

This project is open-source. Feel free to fork and submit a PR!

**Developed with ❤️ for High-Quality Audio Enthusiasts.**
