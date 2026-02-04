import os
import wave
from flask import Flask, render_template, request, jsonify, send_from_directory, redirect, url_for
from datetime import datetime
import json
from functools import wraps

app = Flask(__name__)
RECORDINGS_DIR = os.path.join(os.getcwd(), 'recordings')

# Simple process status tracking
process_status = {
    'audio_processing': 'idle',
    'file_conversion': 'idle'
}
last_errors = {
    'audio_processing': None,
    'file_conversion': None
}

def localhost_only(f):
    """Decorator to restrict access to localhost only"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.remote_addr not in ['127.0.0.1', 'localhost', '::1']:
            return render_template('admin_restricted.html'), 403
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin')
@localhost_only
def admin():
    return render_template('admin.html')

@app.route('/upload', methods=['POST'])
def upload():
    audio_file = request.files.get('audio_data')
    if not audio_file:
        return jsonify({"error": "No audio file found"}), 400

    # Get quality settings from form data
    quality = request.form.get('quality', 'high')
    sample_rate = int(request.form.get('sample_rate', 48000))
    channels = int(request.form.get('channels', 2))
    
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"recording_{timestamp}_{quality}.wav"
    save_path = os.path.join(RECORDINGS_DIR, filename)
    
    try:
        process_status['audio_processing'] = 'processing'
        process_status['file_conversion'] = 'idle'
        last_errors['audio_processing'] = None
        last_errors['file_conversion'] = None

        # Save the original audio file temporarily (likely webm/opus)
        temp_path = os.path.join(RECORDINGS_DIR, f"temp_{timestamp}.webm")
        audio_file.save(temp_path)
        
        # Convert to high-quality WAV using pydub + ffmpeg
        try:
            from pydub import AudioSegment
            
            # Load the audio file
            if temp_path.endswith('.webm'):
                audio = AudioSegment.from_file(temp_path, format="webm")
            else:
                audio = AudioSegment.from_file(temp_path)
            
            # Apply target properties
            if quality == 'high':
                target_rate = 48000
                target_width = 3  # 24-bit
                target_channels = 2
            elif quality == 'medium':
                target_rate = 44100
                target_width = 2  # 16-bit
                target_channels = 2
            else:
                target_rate = 22050
                target_width = 2  # 16-bit
                target_channels = 1

            audio = audio.set_frame_rate(target_rate)
            audio = audio.set_sample_width(target_width)
            audio = audio.set_channels(target_channels)

            # Choose proper PCM codec instead of invalid sample_fmt flag
            codec = 'pcm_s24le' if target_width == 3 else 'pcm_s16le'

            process_status['file_conversion'] = 'processing'

            # Export as WAV with explicit codec and rate/channels
            audio.export(
                save_path,
                format="wav",
                codec=codec,
                parameters=[
                    "-ar", str(target_rate),
                    "-ac", str(target_channels)
                ]
            )
            
            # Clean up temp
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            process_status['audio_processing'] = 'success'
            process_status['file_conversion'] = 'success'

            return jsonify({
                "success": True,
                "filename": filename,
                "quality": quality,
                "sample_rate": target_rate,
                "bit_depth": target_width * 8,
                "channels": target_channels,
                "duration": len(audio) / 1000.0
            })
            
        except ImportError as ie:
            last_errors['file_conversion'] = f"pydub not available: {ie}"
            process_status['file_conversion'] = 'error'
            # Fallback: save original upload (may not be WAV)
            audio_file.save(save_path)
            process_status['audio_processing'] = 'success'
            return jsonify({"success": True, "filename": filename, "warning": "Pydub not available"})
            
        except Exception as conversion_error:
            last_errors['file_conversion'] = str(conversion_error)
            process_status['file_conversion'] = 'error'
            # Fallback: save original upload
            audio_file.save(save_path)
            process_status['audio_processing'] = 'success'
            return jsonify({"success": True, "filename": filename, "warning": "Conversion failed"})
            
    except Exception as e:
        last_errors['audio_processing'] = str(e)
        process_status['audio_processing'] = 'error'
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

@app.route('/api/process-status')
@localhost_only
def api_process_status():
    try:
        return jsonify({
            'success': True,
            'process_status': process_status,
            'last_errors': last_errors
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def get_audio_duration(filepath):
    """Get audio duration from WAV file"""
    try:
        with wave.open(filepath, 'rb') as wav_file:
            frames = wav_file.getnframes()
            rate = wav_file.getframerate()
            duration = frames / float(rate)
            return duration
    except wave.Error as e:
        # Handle non-standard WAV files
        print(f"Warning: Non-standard WAV format for {filepath}: {e}")
        try:
            # Try alternative method using pydub if available
            try:
                from pydub import AudioSegment
                audio = AudioSegment.from_file(filepath)
                return len(audio) / 1000.0  # Convert milliseconds to seconds
            except ImportError:
                # Fallback: estimate duration from file size
                file_size = os.path.getsize(filepath)
                # Rough estimate: assume 16-bit stereo at 44.1kHz
                # This is just an approximation
                estimated_duration = file_size / (44100 * 4)  # 4 bytes per sample (16-bit stereo)
                print(f"Estimated duration for {filepath}: {estimated_duration:.2f}s")
                return estimated_duration
        except Exception as fallback_error:
            print(f"Could not determine duration for {filepath}: {fallback_error}")
            return None
    except Exception as e:
        print(f"Error getting duration for {filepath}: {e}")
        return None

def detect_audio_format(filepath):
    """Detect the actual audio format of a file"""
    try:
        with open(filepath, 'rb') as f:
            header = f.read(12)
            
        # Check for different audio formats
        if header.startswith(b'RIFF') and header[8:12] == b'WAVE':
            return 'WAV'
        elif header.startswith(b'OggS'):
            return 'OGG'
        elif header.startswith(b'fLaC'):
            return 'FLAC'
        elif header.startswith(b'ID3') or header.startswith(b'\xff\xfb') or header.startswith(b'\xff\xf3'):
            return 'MP3'
        elif header.startswith(b'\x1a\x45\xdf\xa3'):
            return 'WebM'
        elif header.startswith(b'\x00\x00\x00\x20\x66\x74\x79\x70'):
            return 'MP4'
        else:
            # Try to determine from file extension
            ext = os.path.splitext(filepath)[1].lower()
            if ext in ['.wav', '.wave']:
                return 'WAV (non-standard)'
            elif ext in ['.mp3']:
                return 'MP3'
            elif ext in ['.ogg', '.oga']:
                return 'OGG'
            elif ext in ['.flac']:
                return 'FLAC'
            elif ext in ['.webm']:
                return 'WebM'
            elif ext in ['.m4a', '.mp4']:
                return 'MP4'
            else:
                return 'Unknown'
    except Exception as e:
        print(f"Error detecting format for {filepath}: {e}")
        return 'Unknown'

def get_file_info(filename):
    """Get detailed file information"""
    filepath = os.path.join(RECORDINGS_DIR, filename)
    
    if not os.path.exists(filepath):
        return None
    
    try:
        stat = os.stat(filepath)
        size_mb = round(stat.st_size / (1024 * 1024), 2)
        
        # Get duration and format
        duration = get_audio_duration(filepath)
        format_type = detect_audio_format(filepath)
        
        return {
            'filename': filename,
            'size_mb': size_mb,
            'duration': duration,
            'format': format_type,
            'created': datetime.fromtimestamp(stat.st_ctime).strftime('%Y-%m-%d %H:%M:%S'),
            'modified': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
        }
    except Exception as e:
        print(f"Error getting file info for {filename}: {e}")
        return None

@app.route('/admin/recordings')
@localhost_only
def admin_recordings():
    """Get detailed recordings information for admin panel"""
    try:
        recordings = []
        for filename in os.listdir(RECORDINGS_DIR):
            if filename.endswith('.wav'):
                file_info = get_file_info(filename)
                if file_info:
                    recordings.append(file_info)
        
        # Sort by modification time (newest first)
        recordings.sort(key=lambda x: x['modified'], reverse=True)
        
        return jsonify(recordings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/recordings')
def list_recordings():
    """List all recordings for the main page"""
    try:
        files = []
        for filename in os.listdir(RECORDINGS_DIR):
            if filename.endswith('.wav'):
                file_info = get_file_info(filename)
                if file_info:
                    files.append(file_info)
        
        # Sort by modification time (newest first)
        files.sort(key=lambda x: x['modified'], reverse=True)
        return jsonify(files)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/recordings/<filename>')
def get_recording(filename):
    return send_from_directory(RECORDINGS_DIR, filename)

@app.route('/delete/<filename>', methods=['DELETE'])
@localhost_only
def delete_recording(filename):
    """Delete a recording file"""
    try:
        filepath = os.path.join(RECORDINGS_DIR, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
            return jsonify({"success": True, "message": f"Deleted {filename}"})
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/system-info')
@localhost_only
def system_info():
    """Get system information for admin panel"""
    import psutil
    try:
        disk_usage = psutil.disk_usage(RECORDINGS_DIR)
        recordings_count = len([f for f in os.listdir(RECORDINGS_DIR) if f.endswith('.wav')])
        total_size = sum(os.path.getsize(os.path.join(RECORDINGS_DIR, f)) 
                        for f in os.listdir(RECORDINGS_DIR) if f.endswith('.wav'))
        
        return jsonify({
            "recordings_count": recordings_count,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "disk_free_gb": round(disk_usage.free / (1024**3), 2),
            "disk_total_gb": round(disk_usage.total / (1024**3), 2),
            "disk_percent": round((disk_usage.used / disk_usage.total) * 100, 1)
        })
    except ImportError:
        return jsonify({"error": "psutil not installed"}), 500

@app.route('/debug/audio/<filename>')
@localhost_only
def debug_audio(filename):
    """Debug endpoint to analyze audio file format and properties"""
    filepath = os.path.join(RECORDINGS_DIR, filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404
    
    try:
        stat = os.stat(filepath)
        format_type = detect_audio_format(filepath)
        duration = get_audio_duration(filepath)
        
        # Read file header for detailed analysis
        with open(filepath, 'rb') as f:
            header = f.read(64)
        
        debug_info = {
            'filename': filename,
            'filepath': filepath,
            'size_bytes': stat.st_size,
            'size_mb': round(stat.st_size / (1024 * 1024), 2),
            'format_detected': format_type,
            'duration_seconds': duration,
            'duration_formatted': formatDuration(duration) if duration else 'Unknown',
            'file_header_hex': header.hex()[:128],  # First 64 bytes as hex
            'file_header_ascii': ''.join(chr(b) if 32 <= b <= 126 else '.' for b in header),
            'created': datetime.fromtimestamp(stat.st_ctime).strftime('%Y-%m-%d %H:%M:%S'),
            'modified': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
        }
        
        return jsonify(debug_info)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def formatDuration(seconds):
    """Format duration in seconds to MM:SS format"""
    if not seconds:
        return 'Unknown'
    minutes = int(seconds // 60)
    remaining_seconds = int(seconds % 60)
    return f"{minutes}:{remaining_seconds:02d}"

def get_local_ip():
    """Get the local IP address of the machine"""
    try:
        import socket
        # Connect to a remote server to determine local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        try:
            # Fallback method
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)
            return local_ip
        except Exception:
            return "Unable to determine IP"

if __name__ == '__main__':
    os.makedirs(RECORDINGS_DIR, exist_ok=True)
    
    # Get local IP address
    local_ip = get_local_ip()
    
    print("=" * 60)
    print("🎤 Audio Recorder App Starting...")
    print("=" * 60)
    print(f"📱 Local access:    https://localhost:5000")
    print(f"🌐 Network access:  https://{local_ip}:5000")
    print(f"⚙️  Admin panel:    https://localhost:5000/admin (PC ONLY)")
    print("=" * 60)
    print("📋 Quality Settings Available:")
    print("   • High Quality: 48kHz, 24-bit, Stereo")
    print("   • Medium Quality: 44.1kHz, 16-bit, Stereo")
    print("   • Low Quality: 22.05kHz, 16-bit, Mono")
    print("=" * 60)
    print("🔒 SSL Certificate: Self-signed (browser warning expected)")
    print("   Click 'Advanced' → 'Proceed' to continue")
    print("=" * 60)
    print("📱 Mobile Access Instructions:")
    print(f"   1. Connect phone to same WiFi network")
    print(f"   2. Open browser and go to: https://{local_ip}:5000")
    print(f"   3. Accept security warning")
    print(f"   4. Allow microphone access when prompted")
    print("=" * 60)
    print("Press Ctrl+C to stop the server")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5000, ssl_context='adhoc')
