from flask import Flask, request, jsonify
from flask_cors import CORS
import librosa
import os
import uuid

app = Flask(__name__)
CORS(app, supports_credentials=True, origins="*")

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/analysera', methods=['POST'])
def analysera():
    if 'file' not in request.files:
        return jsonify({'error': 'Ingen fil bifogad'}), 400

    file = request.files['file']
    filename = f"{uuid.uuid4()}.wav"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    try:
        y, sr = librosa.load(filepath)
        tempo_result = librosa.beat.beat_track(y=y, sr=sr)
        tempo = float(tempo_result[0])  
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        chroma_avg = chroma.mean(axis=1)
        noter = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        tonart = noter[chroma_avg.argmax()]
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        os.remove(filepath)  # Clean up the uploaded file

    return jsonify({
        'tempo': round(float(tempo), 2),
        'tonart': tonart
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))  # default to 5000 locally
    app.run(host='0.0.0.0', port=port)
