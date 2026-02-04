document.addEventListener('DOMContentLoaded', () => {
    const recordButton = document.getElementById('recordButton');
    const pauseButton = document.getElementById('pauseButton');
    const stopButton = document.getElementById('stopButton');
    const statusDiv = document.getElementById('status');
    const recordingsList = document.getElementById('recordingsList');
    const audioPlayer = document.getElementById('audioPlayer');

    let mediaRecorder;
    let chunks = [];
    let recordingStartTime;
    let pausedDuration = 0;
    let pauseStartTime;
    let recordingTimer;
    let audioContext;
    let analyser;
    let microphone;
    let dataArray;
    let animationId;
    let isPaused = false;

    // Audio Quality Settings
    const audioQualitySettings = {
        high: {
            sampleRate: 48000,
            channelCount: 2,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            latency: 0,
            sampleSize: 24
        },
        medium: {
            sampleRate: 44100,
            channelCount: 2,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            latency: 0.01,
            sampleSize: 16
        },
        low: {
            sampleRate: 22050,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            latency: 0.02,
            sampleSize: 16
        }
    };

    // Default to high quality
    let currentQuality = 'high';

    function formatDuration(seconds) {
        if (seconds === null || seconds === undefined) return 'Unknown';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function updateRecordingTime() {
        if (recordingStartTime && !isPaused) {
            const elapsed = Math.floor((Date.now() - recordingStartTime - pausedDuration) / 1000);
            statusDiv.textContent = `Recording... ${formatDuration(elapsed)} (${currentQuality.toUpperCase()} Quality)`;
        } else if (isPaused && pauseStartTime) {
            const elapsed = Math.floor((pauseStartTime - recordingStartTime - pausedDuration) / 1000);
            statusDiv.textContent = `Paused... ${formatDuration(elapsed)} (${currentQuality.toUpperCase()} Quality)`;
        }
    }

    function initializeWaveform() {
        const canvas = document.getElementById('waveformCanvas');
        const canvasCtx = canvas.getContext('2d');
        const waveformContainer = document.querySelector('.waveform-container');
        const leftLevel = document.getElementById('leftLevel');
        const rightLevel = document.getElementById('rightLevel');

        function drawWaveform() {
            if (!analyser || !dataArray) return;

            analyser.getByteFrequencyData(dataArray);

            // Clear canvas
            canvasCtx.fillStyle = '#212529';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw waveform
            const barWidth = canvas.width / dataArray.length * 2.5;
            let barHeight;
            let x = 0;

            // Calculate average levels for stereo meters
            let leftSum = 0, rightSum = 0;
            const halfLength = Math.floor(dataArray.length / 2);

            for (let i = 0; i < dataArray.length; i++) {
                barHeight = (dataArray[i] / 255) * canvas.height;

                // Color gradient based on frequency
                const hue = (i / dataArray.length) * 360;
                canvasCtx.fillStyle = `hsl(${hue}, 70%, 60%)`;
                
                canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;

                // Calculate stereo levels
                if (i < halfLength) {
                    leftSum += dataArray[i];
                } else {
                    rightSum += dataArray[i];
                }
            }

            // Update level meters
            const leftLevel_pct = Math.min(100, (leftSum / halfLength / 255) * 100);
            const rightLevel_pct = Math.min(100, (rightSum / halfLength / 255) * 100);

            leftLevel.style.width = leftLevel_pct + '%';
            rightLevel.style.width = rightLevel_pct + '%';

            // Add peak flash effect
            if (leftLevel_pct > 85) leftLevel.classList.add('peak');
            else leftLevel.classList.remove('peak');
            
            if (rightLevel_pct > 85) rightLevel.classList.add('peak');
            else rightLevel.classList.remove('peak');

            animationId = requestAnimationFrame(drawWaveform);
        }

        return { drawWaveform, canvasCtx, waveformContainer };
    }

    function stopWaveform() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close();
        }

        // Reset visual elements
        const canvas = document.getElementById('waveformCanvas');
        const canvasCtx = canvas.getContext('2d');
        canvasCtx.fillStyle = '#212529';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        document.getElementById('leftLevel').style.width = '0%';
        document.getElementById('rightLevel').style.width = '0%';
        document.querySelector('.waveform-container').classList.remove('recording');
    }

    function createQualitySelector() {
        const qualityDiv = document.createElement('div');
        qualityDiv.className = 'quality-selector';
        qualityDiv.innerHTML = `
            <label for="qualitySelect">Audio Quality:</label>
            <select id="qualitySelect">
                <option value="high">High Quality (48kHz, 24-bit, Stereo)</option>
                <option value="medium">Medium Quality (44.1kHz, 16-bit, Stereo)</option>
                <option value="low">Low Quality (22.05kHz, 16-bit, Mono)</option>
            </select>
        `;

        // Insert before the recorder div
        const recorderDiv = document.querySelector('.recorder');
        recorderDiv.parentNode.insertBefore(qualityDiv, recorderDiv);

        // Add event listener
        const qualitySelect = document.getElementById('qualitySelect');
        qualitySelect.value = currentQuality;
        qualitySelect.addEventListener('change', (e) => {
            currentQuality = e.target.value;
            console.log(`Audio quality changed to: ${currentQuality}`);
        });
    }

    async function loadRecordings() {
        recordingsList.innerHTML = '';
        const response = await fetch('/recordings');
        const files = await response.json();
        if (files.length === 0) {
            recordingsList.innerHTML = '<li>No recordings yet.</li>';
        } else {
            files.forEach(file => {
                const li = document.createElement('li');
                li.className = 'recording-item';
                
                // Extract quality from filename
                let quality = 'Unknown';
                if (file.filename && file.filename.includes('_high.wav')) {
                    quality = 'HIGH';
                } else if (file.filename && file.filename.includes('_medium.wav')) {
                    quality = 'MEDIUM';
                } else if (file.filename && file.filename.includes('_low.wav')) {
                    quality = 'LOW';
                }
                
                // Set quality as data attribute for CSS
                li.setAttribute('data-quality', quality);
                
                // Create filename span
                const filenameSpan = document.createElement('span');
                filenameSpan.className = 'filename';
                filenameSpan.textContent = file.filename || file;
                
                // Create duration span
                const durationSpan = document.createElement('span');
                durationSpan.className = 'duration';
                if (file.duration !== undefined) {
                    durationSpan.textContent = formatDuration(file.duration);
                } else {
                    durationSpan.textContent = 'Unknown';
                }
                
                // Append both spans to the list item
                li.appendChild(filenameSpan);
                li.appendChild(durationSpan);
                
                li.addEventListener('click', () => {
                    const filename = file.filename || file;
                    audioPlayer.src = `/recordings/${filename}`;
                    audioPlayer.style.display = 'block';
                    audioPlayer.play();
                });
                recordingsList.appendChild(li);
            });
        }
    }

    async function startRecording() {
        try {
            const settings = audioQualitySettings[currentQuality];
            
            console.log(`Starting recording with ${currentQuality} quality:`, settings);
            
            // Request audio stream with quality settings
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: settings.sampleRate,
                    channelCount: settings.channelCount,
                    echoCancellation: settings.echoCancellation,
                    noiseSuppression: settings.noiseSuppression,
                    autoGainControl: settings.autoGainControl,
                    latency: settings.latency,
                    sampleSize: settings.sampleSize
                }
            });

            // Initialize audio context for waveform visualization
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            microphone = audioContext.createMediaStreamSource(stream);
            
            // Configure analyser
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            
            // Connect microphone to analyser
            microphone.connect(analyser);
            
            // Initialize waveform visualization
            const waveform = initializeWaveform();
            document.querySelector('.waveform-container').classList.add('recording');
            waveform.drawWaveform();

            // Get actual audio track settings
            const audioTrack = stream.getAudioTracks()[0];
            const capabilities = audioTrack.getCapabilities();
            const settings_actual = audioTrack.getSettings();
            
            console.log('Audio capabilities:', capabilities);
            console.log('Actual audio settings:', settings_actual);

            // Create MediaRecorder with optimal settings
            const options = {
                mimeType: 'audio/webm;codecs=opus', // Best quality codec
                audioBitsPerSecond: settings.sampleRate * settings.channelCount * (settings.sampleSize / 8)
            };

            // Fallback to default if opus not supported
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'audio/webm';
                console.log('Opus codec not supported, using default codec');
            }

            mediaRecorder = new MediaRecorder(stream, options);
            
            mediaRecorder.addEventListener('dataavailable', event => {
                chunks.push(event.data);
            });

            mediaRecorder.addEventListener('stop', async () => {
                const audioBlob = new Blob(chunks, { type: options.mimeType });
                chunks = [];
                const formData = new FormData();
                formData.append('audio_data', audioBlob);
                formData.append('quality', currentQuality);
                formData.append('sample_rate', settings.sampleRate);
                formData.append('channels', settings.channelCount);

                // Clear recording timer
                if (recordingTimer) {
                    clearInterval(recordingTimer);
                    recordingTimer = null;
                }
                
                // Show final recording duration
                let finalDuration = 'Unknown';
                if (recordingStartTime) {
                    const elapsed = Math.floor((Date.now() - recordingStartTime - pausedDuration) / 1000);
                    finalDuration = formatDuration(elapsed);
                    recordingStartTime = null;
                    pausedDuration = 0;
                    isPaused = false;
                }

                statusDiv.textContent = `Recording completed (${finalDuration}). Converting to WAV...`;
                
                try {
                    const response = await fetch('/upload', { method: 'POST', body: formData });
                    if (response.ok) {
                        statusDiv.textContent = `Recording saved! (${finalDuration}, ${currentQuality.toUpperCase()} Quality)`;
                    } else {
                        throw new Error(`Upload failed: ${response.status}`);
                    }
                } catch (error) {
                    console.error('Upload error:', error);
                    statusDiv.textContent = `Upload failed: ${error.message}`;
                }
                
                statusDiv.classList.remove('recording');
                await loadRecordings();
            });

            // Start recording with high data rate
            mediaRecorder.start(100); // 100ms chunks for better quality
            recordButton.disabled = true;
            pauseButton.disabled = false;
            stopButton.disabled = false;
            statusDiv.textContent = `Recording... 0:00 (${currentQuality.toUpperCase()} Quality)`;
            statusDiv.classList.add('recording');
            
            // Start recording timer
            recordingStartTime = Date.now();
            recordingTimer = setInterval(updateRecordingTime, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            
            // Provide helpful error messages
            let errorMessage = "Could not access the microphone. ";
            if (err.name === 'NotAllowedError') {
                errorMessage += "Please allow microphone access and refresh the page.";
            } else if (err.name === 'NotFoundError') {
                errorMessage += "No microphone found. Please connect a microphone and try again.";
            } else if (err.name === 'NotSupportedError') {
                errorMessage += "Your browser doesn't support the requested audio quality. Try a different quality setting.";
            } else {
                errorMessage += `Error: ${err.message}`;
            }
            
            alert(errorMessage);
        }
    }

    recordButton.addEventListener('click', startRecording);

    pauseButton.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            // Pause recording
            mediaRecorder.pause();
            isPaused = true;
            pauseStartTime = Date.now();
            
            pauseButton.textContent = 'Resume';
            pauseButton.classList.remove('pause-btn');
            pauseButton.classList.add('resume-btn');
            
            statusDiv.classList.remove('recording');
            statusDiv.classList.add('paused');
            
        } else if (mediaRecorder && mediaRecorder.state === 'paused') {
            // Resume recording
            mediaRecorder.resume();
            isPaused = false;
            
            // Add paused time to total paused duration
            if (pauseStartTime) {
                pausedDuration += Date.now() - pauseStartTime;
                pauseStartTime = null;
            }
            
            pauseButton.textContent = 'Pause';
            pauseButton.classList.remove('resume-btn');
            pauseButton.classList.add('pause-btn');
            
            statusDiv.classList.remove('paused');
            statusDiv.classList.add('recording');
        }
    });

    stopButton.addEventListener('click', () => {
        if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
            mediaRecorder.stop();
            recordButton.disabled = false;
            pauseButton.disabled = true;
            pauseButton.textContent = 'Pause';
            pauseButton.classList.remove('resume-btn');
            pauseButton.classList.add('pause-btn');
            stopButton.disabled = true;
            
            // Clear recording timer
            if (recordingTimer) {
                clearInterval(recordingTimer);
                recordingTimer = null;
            }
            recordingStartTime = null;
            pausedDuration = 0;
            isPaused = false;
            pauseStartTime = null;
            
            // Stop waveform visualization
            stopWaveform();
        }
    });

    // Create quality selector on page load
    createQualitySelector();

    // Load recordings on page load
    loadRecordings();
});
