# Create project directory and navigate into it
New-Item -ItemType Directory -Name "audio_recorder_app_modern" -ErrorAction SilentlyContinue
Set-Location "audio_recorder_app_modern"

# Create a Python virtual environment
python -m venv venv

# Activate the virtual environment and install dependencies
.\venv\Scripts\Activate.ps1
pip install Flask cryptography

# Create application directories
New-Item -ItemType Directory -Name "templates" -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "." -Name "recordings" -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Name "static" -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "static" -Name "js" -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "static" -Name "css" -ErrorAction SilentlyContinue

# --- Create the Python backend file (app.py) ---
@"
import os
from flask import Flask, render_template, request, jsonify, send_from_directory
from datetime import datetime

app = Flask(__name__)
RECORDINGS_DIR = os.path.join(os.getcwd(), 'recordings')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    audio_file = request.files.get('audio_data')
    if not audio_file:
        return jsonify({"error": "No audio file found"}), 400

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"recording_{timestamp}.wav"
    save_path = os.path.join(RECORDINGS_DIR, filename)
    
    audio_file.save(save_path)
    return jsonify({"success": True, "filename": filename})

@app.route('/recordings')
def list_recordings():
    files = [f for f in os.listdir(RECORDINGS_DIR) if f.endswith('.wav')]
    files.sort(key=lambda x: os.path.getmtime(os.path.join(RECORDINGS_DIR, x)), reverse=True)
    return jsonify(files)

@app.route('/recordings/<filename>')
def get_recording(filename):
    return send_from_directory(RECORDINGS_DIR, filename)

if __name__ == '__main__':
    os.makedirs(RECORDINGS_DIR, exist_ok=True)
    app.run(debug=True, host='0.0.0.0', ssl_context='adhoc')
"@ | Set-Content "app.py"


# --- Create the HTML frontend file (templates/index.html) ---
@"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modern Audio Recorder</title>
    <link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}">
</head>
<body>
    <div class="container">
        <h1>Audio Recorder</h1>
        <div class="recorder">
            <div id="status" class="status">Press Record to Start</div>
            <div class="buttons">
                <button id="recordButton" class="record-btn">Record</button>
                <button id="stopButton" class="stop-btn" disabled>Stop</button>
            </div>
        </div>

        <div class="playback">
            <h2>Recordings</h2>
            <audio id="audioPlayer" controls></audio>
            <ul id="recordingsList"></ul>
        </div>
    </div>
    <script src="{{ url_for('static', filename='js/main.js') }}"></script>
</body>
</html>
"@ | Set-Content "templates\index.html"


# --- Create the new Modern CSS file (static/css/style.css) ---
@"
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');

:root {
    --primary-color: #007bff;
    --primary-hover: #0056b3;
    --record-color: #dc3545;
    --record-hover: #a71d2a;
    --stop-color: #6c757d;
    --stop-hover: #545b62;
    --bg-dark: #212529;
    --bg-light: #343a40;
    --text-color: #f8f9fa;
    --border-color: #495057;
}

body {
    font-family: 'Roboto', sans-serif;
    background-color: var(--bg-dark);
    color: var(--text-color);
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    margin: 0;
}

.container {
    background-color: var(--bg-light);
    padding: 2rem;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    width: 90%;
    max-width: 500px;
    text-align: center;
}

h1, h2 {
    margin-top: 0;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5rem;
    margin-bottom: 1.5rem;
}

.recorder {
    margin-bottom: 2rem;
}

.status {
    font-size: 1.2rem;
    margin-bottom: 1.5rem;
    padding: 10px;
    border-radius: 5px;
    background-color: rgba(0,0,0,0.2);
    transition: all 0.3s ease;
}

.status.recording {
    color: var(--record-color);
    font-weight: bold;
    animation: pulse 1.5s infinite;
}

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

.buttons {
    display: flex;
    justify-content: center;
    gap: 1rem;
}

button {
    padding: 15px 30px;
    font-size: 1rem;
    font-weight: bold;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
}

button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.record-btn {
    background-color: var(--primary-color);
    color: white;
}
.record-btn:hover:not(:disabled) {
    background-color: var(--primary-hover);
}

.stop-btn {
    background-color: var(--record-color);
    color: white;
}
.stop-btn:hover:not(:disabled) {
    background-color: var(--record-hover);
}

.playback #audioPlayer {
    width: 100%;
    margin-bottom: 1rem;
    display: none; /* Hidden by default */
}

#recordingsList {
    list-style: none;
    padding: 0;
    max-height: 200px;
    overflow-y: auto;
    background-color: rgba(0,0,0,0.2);
    border-radius: 5px;
}

#recordingsList li {
    padding: 12px;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    transition: background-color 0.2s ease;
    text-align: left;
}

#recordingsList li:last-child {
    border-bottom: none;
}

#recordingsList li:hover {
    background-color: var(--primary-color);
}
"@ | Set-Content "static\css\style.css"


# --- Create the JavaScript file (static/js/main.js) ---
# This version now requests stereo audio.
@"
document.addEventListener('DOMContentLoaded', () => {
    const recordButton = document.getElementById('recordButton');
    const stopButton = document.getElementById('stopButton');
    const statusDiv = document.getElementById('status');
    const recordingsList = document.getElementById('recordingsList');
    const audioPlayer = document.getElementById('audioPlayer');

    let mediaRecorder;
    let chunks = [];

    async function loadRecordings() {
        recordingsList.innerHTML = '';
        const response = await fetch('/recordings');
        const files = await response.json();
        if (files.length === 0) {
            recordingsList.innerHTML = '<li>No recordings yet.</li>';
        } else {
            files.forEach(file => {
                const li = document.createElement('li');
                li.textContent = file;
                li.addEventListener('click', () => {
                    audioPlayer.src = `/recordings/${file}`;
                    audioPlayer.style.display = 'block';
                    audioPlayer.play();
                });
                recordingsList.appendChild(li);
            });
        }
    }

    recordButton.addEventListener('click', async () => {
        try {
            // *** THIS IS THE CHANGED PART ***
            // Request a stereo audio stream if available
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 2
                }
            });
            // *******************************

            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.addEventListener('dataavailable', event => {
                chunks.push(event.data);
            });

            mediaRecorder.addEventListener('stop', async () => {
                const audioBlob = new Blob(chunks, { type: 'audio/wav' });
                chunks = [];
                const formData = new FormData();
                formData.append('audio_data', audioBlob);

                statusDiv.textContent = 'Uploading...';
                await fetch('/upload', { method: 'POST', body: formData });
                
                statusDiv.classList.remove('recording');
                statusDiv.textContent = 'Press Record to Start';
                await loadRecordings();
            });

            mediaRecorder.start();
            recordButton.disabled = true;
            stopButton.disabled = false;
            statusDiv.textContent = 'Recording...';
            statusDiv.classList.add('recording');

        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access the microphone. Please ensure you have given permission and that your hardware supports the requested channel count.");
        }
    });

    stopButton.addEventListener('click', () => {
        mediaRecorder.stop();
        recordButton.disabled = false;
        stopButton.disabled = true;
    });

    // Load recordings on page load
    loadRecordings();
});
"@ | Set-Content "static\js\main.js"


# --- Provide instructions and run the application ---
Write-Host "Setup complete. Starting the MODERNIZED Flask application with HTTPS support..."
Write-Host ""
Write-Host "IMPORTANT: Use the HTTPS address to connect from your phone."
Write-Host "Find your computer's IP address (e.g., ipconfig) and access the site at:"
Write-host "https://<your-ip-address>:5000"
Write-Host ""
Write-Host "Your browser will show a 'Connection is not private' warning. This is expected."
Write-Host "Click 'Advanced' and then 'Proceed' to continue to the site."
Write-Host ""
Write-Host "Press Ctrl+C to stop the server."

# Run the Flask app
python app.py