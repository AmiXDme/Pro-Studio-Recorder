document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const refreshBtn = document.getElementById('refreshBtn');
    const autoRefreshBtn = document.getElementById('autoRefreshBtn');
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    const testAudioBtn = document.getElementById('testAudioBtn');
    const debugAudioBtn = document.getElementById('debugAudioBtn');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const recordingsTableBody = document.getElementById('recordingsTableBody');
    const deleteModal = document.getElementById('deleteModal');
    const confirmDelete = document.getElementById('confirmDelete');
    const cancelDelete = document.getElementById('cancelDelete');
    const deleteModalText = document.getElementById('deleteModalText');

    // State
    let recordings = [];
    let filteredRecordings = [];
    let currentDeleteTarget = null;
    let currentlyPlaying = null;
    let audioElements = new Map(); // Track audio elements by filename
    let isAutoRefreshEnabled = true;

    // Initialize
    loadDashboard();
    loadRecordings();
    
    // Test audio system on load
    testAudioSystem();
    
    // Auto-refresh functionality
    let autoRefreshInterval;
    const AUTO_REFRESH_DELAY = 5000; // 5 seconds
    
    function startAutoRefresh() {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
        }
        
        autoRefreshInterval = setInterval(() => {
            console.log('Auto-refreshing admin data...');
            loadDashboard();
            loadRecordings();
        }, AUTO_REFRESH_DELAY);
        
        console.log(`Auto-refresh started: updating every ${AUTO_REFRESH_DELAY/1000} seconds`);
    }
    
    function stopAutoRefresh() {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
            console.log('Auto-refresh stopped');
        }
    }
    
    // Start auto-refresh by default
    startAutoRefresh();

    // Event listeners
    refreshBtn.addEventListener('click', () => {
        loadDashboard();
        loadRecordings();
    });

    autoRefreshBtn.addEventListener('click', () => {
        if (isAutoRefreshEnabled) {
            stopAutoRefresh();
            isAutoRefreshEnabled = false;
            autoRefreshBtn.innerHTML = '<i class="fas fa-pause"></i> Auto-Refresh: OFF';
            autoRefreshBtn.classList.remove('btn-secondary');
            autoRefreshBtn.classList.add('btn-danger');
        } else {
            startAutoRefresh();
            isAutoRefreshEnabled = true;
            autoRefreshBtn.innerHTML = '<i class="fas fa-play"></i> Auto-Refresh: ON';
            autoRefreshBtn.classList.remove('btn-danger');
            autoRefreshBtn.classList.add('btn-secondary');
        }
    });

    testAudioBtn.addEventListener('click', () => {
        testAudioSystem();
        testAudioPlayback();
    });

    debugAudioBtn.addEventListener('click', () => {
        debugAudioFiles();
    });

    deleteAllBtn.addEventListener('click', () => {
        showDeleteModal('all', 'Are you sure you want to delete ALL recordings? This action cannot be undone.');
    });

    searchInput.addEventListener('input', filterRecordings);
    sortSelect.addEventListener('change', filterRecordings);

    confirmDelete.addEventListener('click', handleDelete);
    cancelDelete.addEventListener('click', hideDeleteModal);

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            hideDeleteModal();
        }
    });

    // Cleanup audio when page is unloaded
    window.addEventListener('beforeunload', () => {
        stopAllAudio();
    });

    // Functions
    function testAudioSystem() {
        console.log('=== TESTING AUDIO SYSTEM ===');
        
        // Test if Audio API is supported
        if (typeof Audio === 'undefined') {
            console.error('❌ Audio API not supported in this browser');
            alert('Audio API not supported in this browser');
            return;
        }
        
        // Test if we can create an audio element
        try {
            const testAudio = new Audio();
            console.log('✅ Audio element creation: SUCCESS');
            console.log('✅ Audio element properties:', {
                readyState: testAudio.readyState,
                networkState: testAudio.networkState,
                error: testAudio.error
            });
        } catch (error) {
            console.error('❌ Audio element creation: FAILED', error);
        }
        
        // Test if we can access the recordings endpoint
        fetch('/admin/recordings')
            .then(response => {
                console.log('✅ Recordings endpoint: SUCCESS', response.status);
                return response.json();
            })
            .then(data => {
                console.log('✅ Recordings data: SUCCESS', data.length, 'recordings found');
            })
            .catch(error => {
                console.error('❌ Recordings endpoint: FAILED', error);
            });
        
        console.log('=== AUDIO SYSTEM TEST COMPLETE ===');
    }

    function testAudioPlayback() {
        console.log('=== TESTING AUDIO PLAYBACK ===');
        
        // Create a simple test audio (1 second of silence)
        const testAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        
        testAudio.addEventListener('loadstart', () => {
            console.log('✅ Test audio loadstart');
        });
        
        testAudio.addEventListener('canplay', () => {
            console.log('✅ Test audio canplay');
        });
        
        testAudio.addEventListener('play', () => {
            console.log('✅ Test audio play event');
        });
        
        testAudio.addEventListener('ended', () => {
            console.log('✅ Test audio ended');
        });
        
        testAudio.addEventListener('error', (e) => {
            console.error('❌ Test audio error:', e);
        });
        
        // Try to play the test audio
        testAudio.play().then(() => {
            console.log('✅ Test audio playback: SUCCESS');
            alert('Audio system test: SUCCESS\nCheck console for details');
        }).catch(error => {
            console.error('❌ Test audio playback: FAILED', error);
            alert(`Audio system test: FAILED\nError: ${error.message}\nCheck console for details`);
        });
        
        console.log('=== AUDIO PLAYBACK TEST COMPLETE ===');
    }

    function debugAudioFiles() {
        console.log('=== DEBUGGING AUDIO FILES ===');
        
        if (recordings.length === 0) {
            alert('No recordings to debug. Please refresh the data first.');
            return;
        }
        
        let debugResults = [];
        
        // Debug each recording
        recordings.forEach(async (recording, index) => {
            try {
                const response = await fetch(`/debug/audio/${recording.filename}`);
                const debugInfo = await response.json();
                
                if (debugInfo.error) {
                    console.error(`❌ Error debugging ${recording.filename}:`, debugInfo.error);
                    debugResults.push({
                        filename: recording.filename,
                        status: 'ERROR',
                        error: debugInfo.error
                    });
                } else {
                    console.log(`✅ Debug info for ${recording.filename}:`, debugInfo);
                    debugResults.push({
                        filename: recording.filename,
                        status: 'SUCCESS',
                        format: debugInfo.format_detected,
                        duration: debugInfo.duration_formatted,
                        size: debugInfo.size_mb + ' MB',
                        header: debugInfo.file_header_ascii
                    });
                }
                
                // Show results when all files are processed
                if (index === recordings.length - 1) {
                    showDebugResults(debugResults);
                }
                
            } catch (error) {
                console.error(`❌ Failed to debug ${recording.filename}:`, error);
                debugResults.push({
                    filename: recording.filename,
                    status: 'FAILED',
                    error: error.message
                });
                
                if (index === recordings.length - 1) {
                    showDebugResults(debugResults);
                }
            }
        });
    }

    function showDebugResults(results) {
        let message = '=== AUDIO FILE DEBUG RESULTS ===\n\n';
        
        results.forEach(result => {
            message += `📁 ${result.filename}\n`;
            message += `Status: ${result.status}\n`;
            
            if (result.status === 'SUCCESS') {
                message += `Format: ${result.format}\n`;
                message += `Duration: ${result.duration}\n`;
                message += `Size: ${result.size}\n`;
                message += `Header: ${result.header}\n`;
            } else {
                message += `Error: ${result.error}\n`;
            }
            message += '\n';
        });
        
        message += 'Check console for detailed information.';
        
        alert(message);
        console.table(results);
    }

    function stopAllAudio() {
        if (currentlyPlaying) {
            currentlyPlaying.pause();
            currentlyPlaying.currentTime = 0;
            currentlyPlaying = null;
        }
        
        // Stop all audio elements
        audioElements.forEach(audio => {
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
        audioElements.clear();
        
        // Reset all play buttons
        const allPlayButtons = document.querySelectorAll('.btn-play');
        allPlayButtons.forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-play"></i> Play';
            btn.classList.remove('playing', 'loading', 'paused');
        });
    }

    function stopCurrentlyPlaying() {
        if (currentlyPlaying) {
            currentlyPlaying.pause();
            currentlyPlaying.currentTime = 0;
            currentlyPlaying = null;
            
            // Reset all play buttons
            const allPlayButtons = document.querySelectorAll('.btn-play');
            allPlayButtons.forEach(btn => {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-play"></i> Play';
                btn.classList.remove('playing', 'loading', 'paused');
            });
        }
    }

    async function loadDashboard() {
        try {
            const response = await fetch('/system-info');
            const data = await response.json();
            
            if (data.error) {
                console.error('Error loading system info:', data.error);
                return;
            }

            document.getElementById('recordingsCount').textContent = data.recordings_count;
            document.getElementById('totalSize').textContent = `${data.total_size_mb} MB`;
            document.getElementById('diskUsage').textContent = `${data.disk_percent}%`;
            document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    async function loadRecordings() {
        try {
            const response = await fetch('/admin/recordings');
            recordings = await response.json();
            filteredRecordings = [...recordings];
            renderRecordingsTable();
        } catch (error) {
            console.error('Error loading recordings:', error);
            recordingsTableBody.innerHTML = '<tr><td colspan="6" class="loading">Error loading recordings</td></tr>';
        }
    }

    function renderRecordingsTable() {
        if (filteredRecordings.length === 0) {
            recordingsTableBody.innerHTML = '<tr><td colspan="7" class="loading">No recordings found</td></tr>';
            return;
        }

        recordingsTableBody.innerHTML = filteredRecordings.map(recording => `
            <tr>
                <td>
                    <div class="filename-cell">
                        <strong>${recording.filename}</strong>
                        ${recording.duration ? `<br><small>Duration: ${formatDuration(recording.duration)}</small>` : ''}
                    </div>
                </td>
                <td>${recording.duration ? formatDuration(recording.duration) : 'Unknown'}</td>
                <td>
                    <span class="format-badge ${recording.format ? recording.format.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'unknown'}">
                        ${recording.format || 'Unknown'}
                    </span>
                </td>
                <td>${recording.size_mb} MB</td>
                <td>${recording.created}</td>
                <td>${recording.modified}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-play" onclick="playRecording('${recording.filename}', this)" data-filename="${recording.filename}">
                            <i class="fas fa-play"></i> Play
                        </button>
                        <button class="btn btn-sm btn-stop" onclick="stopRecording('${recording.filename}', this)" data-filename="${recording.filename}">
                            <i class="fas fa-stop"></i> Stop
                        </button>
                        <button class="btn btn-sm btn-delete" onclick="showDeleteModal('single', '${recording.filename}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function filterRecordings() {
        const searchTerm = searchInput.value.toLowerCase();
        const sortBy = sortSelect.value;

        filteredRecordings = recordings.filter(recording => 
            recording.filename.toLowerCase().includes(searchTerm)
        );

        // Sort recordings
        switch (sortBy) {
            case 'newest':
                filteredRecordings.sort((a, b) => new Date(b.modified) - new Date(a.modified));
                break;
            case 'oldest':
                filteredRecordings.sort((a, b) => new Date(a.modified) - new Date(b.modified));
                break;
            case 'name':
                filteredRecordings.sort((a, b) => a.filename.localeCompare(b.filename));
                break;
            case 'size':
                filteredRecordings.sort((a, b) => b.size_mb - a.size_mb);
                break;
            case 'duration':
                filteredRecordings.sort((a, b) => (b.duration || 0) - (a.duration || 0));
                break;
        }

        renderRecordingsTable();
    }

    function showDeleteModal(type, filename) {
        currentDeleteTarget = { type, filename };
        
        if (type === 'all') {
            deleteModalText.textContent = filename;
        } else {
            deleteModalText.textContent = `Are you sure you want to delete "${filename}"?`;
        }
        
        deleteModal.style.display = 'block';
    }

    function hideDeleteModal() {
        deleteModal.style.display = 'none';
        currentDeleteTarget = null;
    }

    async function handleDelete() {
        if (!currentDeleteTarget) return;

        try {
            if (currentDeleteTarget.type === 'all') {
                // Delete all recordings
                for (const recording of recordings) {
                    await deleteRecording(recording.filename);
                }
            } else {
                // Delete single recording
                await deleteRecording(currentDeleteTarget.filename);
            }

            hideDeleteModal();
            loadDashboard();
            loadRecordings();
        } catch (error) {
            console.error('Error deleting recording:', error);
            alert('Error deleting recording. Please try again.');
        }
    }

    async function deleteRecording(filename) {
        const response = await fetch(`/delete/${filename}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Failed to delete ${filename}`);
        }

        return response.json();
    }

    function formatDuration(seconds) {
        if (!seconds) return 'Unknown';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // Global functions for onclick handlers
    window.playRecording = function(filename, button) {
        try {
            console.log(`=== AUDIO PLAYBACK DEBUG ===`);
            console.log(`Attempting to play: ${filename}`);
            console.log(`Button element:`, button);
            console.log(`Button classes:`, button.className);
            
            // Validate button element
            if (!button || !button.classList) {
                console.error('Invalid button element');
                return;
            }
            
            // If this button is currently playing, pause it
            if (button.classList.contains('playing')) {
                console.log('Pausing currently playing audio');
                if (currentlyPlaying) {
                    currentlyPlaying.pause();
                    currentlyPlaying = null;
                }
                button.innerHTML = '<i class="fas fa-play"></i> Resume';
                button.classList.remove('playing');
                button.classList.add('paused');
                return;
            }

            // If this button is paused, resume it
            if (button.classList.contains('paused')) {
                console.log('Resuming paused audio');
                const audio = audioElements.get(filename);
                if (audio) {
                    audio.play().then(() => {
                        currentlyPlaying = audio;
                        button.innerHTML = '<i class="fas fa-pause"></i> Playing...';
                        button.classList.remove('paused');
                        button.classList.add('playing');
                        console.log(`🎵 Resumed playing: ${filename}`);
                    }).catch(error => {
                        console.error('❌ Error resuming audio:', error);
                        resetButton(button);
                    });
                }
                return;
            }

            // Stop any currently playing audio
            stopCurrentlyPlaying();

            // Validate filename
            if (!filename || typeof filename !== 'string') {
                console.error('Invalid filename:', filename);
                alert('Invalid filename provided');
                return;
            }

            // Create new audio element
            const audio = new Audio(`/recordings/${filename}`);
            audioElements.set(filename, audio);
            
            console.log(`Audio element created for: ${filename}`);
            console.log(`Audio source: /recordings/${filename}`);
            console.log(`Audio element properties:`, {
                readyState: audio.readyState,
                networkState: audio.networkState,
                error: audio.error,
                src: audio.src
            });
            
            // Set up event listeners
            audio.addEventListener('loadstart', () => {
                console.log(`✅ loadstart event: ${filename}`);
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                button.classList.add('loading');
            });
            
            audio.addEventListener('canplay', () => {
                console.log(`✅ canplay event: ${filename}`);
                button.innerHTML = '<i class="fas fa-pause"></i> Playing...';
                button.disabled = false;
                button.classList.remove('loading');
                button.classList.add('playing');
                
                // Start playing
                console.log(`Attempting to start playback...`);
                audio.play().then(() => {
                    currentlyPlaying = audio;
                    console.log(`🎵 Successfully started playing: ${filename}`);
                }).catch(error => {
                    console.error('❌ Error playing audio:', error);
                    console.error('Audio state at error:', {
                        readyState: audio.readyState,
                        networkState: audio.networkState,
                        error: audio.error,
                        paused: audio.paused,
                        ended: audio.ended
                    });
                    alert(`Error playing audio: ${error.message}`);
                    resetButton(button);
                });
            });
            
            audio.addEventListener('play', () => {
                console.log(`✅ play event fired: ${filename}`);
                button.innerHTML = '<i class="fas fa-pause"></i> Playing...';
                button.disabled = false;
                button.classList.add('playing');
            });
            
            audio.addEventListener('pause', () => {
                console.log(`✅ pause event fired: ${filename}`);
                // Don't reset button here - let the click handler manage it
                if (currentlyPlaying === audio) {
                    currentlyPlaying = null;
                }
            });
            
            audio.addEventListener('ended', () => {
                console.log(`✅ ended event: ${filename}`);
                resetButton(button);
                if (currentlyPlaying === audio) {
                    currentlyPlaying = null;
                }
                audioElements.delete(filename);
            });
            
            audio.addEventListener('error', (e) => {
                console.error('❌ Audio error event:', e);
                console.error('Audio error details:', audio.error);
                console.error('Audio network state:', audio.networkState);
                console.error('Audio ready state:', audio.readyState);
                
                let errorMessage = `Error loading audio file: ${filename}`;
                if (audio.error) {
                    errorMessage += `\nError code: ${audio.error.code}`;
                    errorMessage += `\nError message: ${audio.error.message}`;
                }
                
                alert(errorMessage);
                resetButton(button);
                audioElements.delete(filename);
            });
            
            // Additional debugging events
            audio.addEventListener('loadstart', () => console.log(`🔄 loadstart: ${filename}`));
            audio.addEventListener('durationchange', () => console.log(`⏱️ durationchange: ${filename} - Duration: ${audio.duration}`));
            audio.addEventListener('loadedmetadata', () => console.log(`📊 loadedmetadata: ${filename}`));
            audio.addEventListener('loadeddata', () => console.log(`📁 loadeddata: ${filename}`));
            audio.addEventListener('progress', () => console.log(`📈 progress: ${filename}`));
            audio.addEventListener('canplaythrough', () => console.log(`🎯 canplaythrough: ${filename}`));
            
            // Load the audio
            console.log(`🔄 Loading audio file: ${filename}`);
            audio.load();
            
            // Set a timeout to detect if loading takes too long
            setTimeout(() => {
                if (button.classList.contains('loading')) {
                    console.warn(`⚠️ Audio loading timeout for: ${filename}`);
                    alert(`Audio loading timeout for ${filename}. Please try again.`);
                    resetButton(button);
                }
            }, 10000); // 10 second timeout
            
        } catch (error) {
            console.error('❌ Fatal error in playRecording:', error);
            alert(`Fatal error creating audio player: ${error.message}`);
            resetButton(button);
        }
    };

    // Add stop functionality
    window.stopRecording = function(filename, button) {
        console.log(`Stopping audio: ${filename}`);
        const audio = audioElements.get(filename);
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            if (currentlyPlaying === audio) {
                currentlyPlaying = null;
            }
            audioElements.delete(filename);
        }
        resetButton(button);
    };

    function resetButton(button) {
        button.innerHTML = '<i class="fas fa-play"></i> Play';
        button.disabled = false;
        button.classList.remove('playing', 'loading', 'paused');
    }

    window.showDeleteModal = function(type, filename) {
        showDeleteModal(type, filename);
    };
});
