from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper


app = Flask(__name__)
CORS(app)

@app.route("/api/summarize", methods=["POST"])
def summarize():
    data = request.get_json()
    transcript = data.get("transcript", "")

    return jsonify({
        "soap": {
            "subjective": "Patient reports mild chest pain during exertion.",
            "objective": "Vitals WNL. ECG pending.",
            "assessment": "Suspected angina.",
            "plan": "Order ECG, refer to cardiology."
        },
        "narrative": (
            "The patient presents with mild chest pain during exertion. "
            "No associated nausea or dizziness. ECG pending. Cardiology referral advised."
        ),
        "codes": [
            "SNOMED: 29857009 (Angina pectoris)",
            "ICD-10: I20.9 (Angina, unspecified)"
        ]
    })

@app.route("/api/fhir-sync", methods=["POST"])
def fhir_sync():
    data = request.get_json()
    print("FHIR data received:", data)
    return jsonify({"status": "success"})

@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    if 'file' not in request.files:
        return {"error": "No file provided"}, 400

    audio_file = request.files['file']
    audio_path = "temp_audio.wav"
    audio_file.save(audio_path)

    model = whisper.load_model("base")
    result = model.transcribe(audio_path)
    print("Transcribed text:", result["text"])


    return {"transcript": result["text"]}

if __name__ == "__main__":
    app.run(debug=True)
