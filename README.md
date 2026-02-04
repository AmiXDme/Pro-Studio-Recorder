# 🎙️ Professional Audio Recorder Modern

[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.3.3-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

A high-performance, professional-grade web application for recording, processing, and managing studio-quality audio directly from your browser. Optimized for both desktop and mobile workflows.

---

## 🏗️ System Architecture

The application follows a modern client-server architecture designed for high-fidelity audio capture and reliable background processing.

```mermaid
graph TD
    subgraph "Client Side (Browser)"
        UI[Modern Web UI]
        MR[MediaRecorder API]
        UA[User Action: Record/Stop]
    end

    subgraph "Backend Services (Flask)"
        API[Flask REST API]
        PROC[Audio Recovery & Processing]
        CONV[Pydub + FFmpeg Conversion]
    end

    subgraph "Storage Layer"
        DISK[(Local Storage /recordings)]
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
- **HTTPS/SSL Ready**: Built-in adhoc SSL support to enable microphone access on modern mobile browsers.
- **Adaptive UI**: Fully responsive interface that scales from 4K monitors down to mobile screens.

---

## 🔄 Recording Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Browser
    participant S as Server
    participant F as FFmpeg/Pydub

    U->>B: Starts Recording
    B->>B: Captures Media Stream (Opus/WebM)
    U->>B: Stops Recording
    B->>S: POST /upload (Audio Blob)
    Note over S: Processing Started
    S->>F: Load Stream + Convert to PCM
    F->>S: Return Lossless WAV
    S->>S: Write to /recordings
    S-->>B: JSON Success (Metadata)
    B->>U: Display New Recording
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python 3.8+** installed on your system.
- **FFmpeg** (Recommended for advanced audio conversion).

### 2. Automatic Installation (Windows)
Simply run the included batch script to set up the environment and start the application:
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
├── static/                # Assets
│   ├── css/               # Modern Glassmorphism Styles
│   └── js/                # Recorder & UI Logic
└── templates/             # HTML5 Jinja2 Templates
```

---

## 🛠️ Troubleshooting

- **Microphone Not Found**: Ensure you are accessing via `https://`. Browsers block microphone access on insecure `http://` connections.
- **Conversion Error**: Verify that FFmpeg is installed and added to your system PATH.
- **Permission Denied**: Run the application as an Administrator if the `/recordings` folder cannot be created.

---

## 📱 Mobile Recording Guide

This application is optimized for remote recording scenarios, allowing you to use your smartphone as a high-quality field recorder.

### 1. Network Preparation
Ensure both your host computer and mobile device are connected to the **same WiFi network**.

### 2. Identify Host IP
Open a terminal on your host and run:
```bash
ipconfig  # Windows
# Look for 'IPv4 Address' (e.g., 192.168.1.5)
```

### 3. Mobile Access
1. Open Chrome or Safari on your phone.
2. Navigate to `https://<YOUR-IP-ADDRESS>:5000`.
3. **Security Bypass**: Tap "Advanced" and then "Proceed" (Self-signed certificate).
4. **Permissions**: Grant microphone access when prompted.

---

## 🔒 Security & Privacy

- **On-Device Processing**: No audio data is sent to external clouds. Everything stays on your local machine.
- **Localhost Admin**: The dashboard is intentionally locked to the host OS to prevent network-based deletions.

---

## 🤝 Contributing & Support

This project is built for simplicity and power. If you find a bug or have a feature request, please feel free to fork and submit a PR!

**Developed with ❤️ for High-Quality Audio Enthusiasts.**
