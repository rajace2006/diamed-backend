import { useState } from "react";

const baseUrl = import.meta.env.VITE_API_BASE_URL;

function App() {
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState("Patient reports mild chest pain during exertion, no nausea or dizziness.");
  const [noteFormat, setNoteFormat] = useState("soap");
  const [codes, setCodes] = useState([
    "SNOMED: 29857009 (Angina pectoris)",
    "ICD-10: I20.9 (Angina, unspecified)",
  ]);
  const [soapNote, setSoapNote] = useState(`S: Patient reports mild chest pain during exertion.\nO: Vitals WNL. ECG pending.\nA: Suspected angina.\nP: Order ECG, refer to cardiology.`);
  const [narrativeNote, setNarrativeNote] = useState("The patient presents with mild chest pain experienced during exertion. There is no associated nausea or dizziness. Vitals are within normal limits. ECG has been ordered and cardiology referral planned.");

  const handleFHIRPush = async () => {
    const response = await fetch(`${baseUrl}/api/fhir-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, soapNote, codes }),
    });
    if (response.ok) alert("Data synced with EHR");
    else alert("FHIR sync failed");
  };

  const handleASRSummarization = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${baseUrl}/api/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript })
      });
      const data = await response.json();
      const formattedSOAP = `S: ${data.soap.subjective}\nO: ${data.soap.objective}\nA: ${data.soap.assessment}\nP: ${data.soap.plan}`;
      setSoapNote(formattedSOAP);
      setNarrativeNote(data.narrative);
      setCodes(data.codes);
      setNoteFormat("soap");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMicRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        const formData = new FormData();
        formData.append("file", blob, "audio.wav");
        console.log("Sending audio to backend...");
        const response = await fetch(`${baseUrl}/api/transcribe`, {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        console.log("Response from backend:", data);
        setTranscript(data.transcript);
      };
      mediaRecorder.start();
      setTimeout(() => {
        mediaRecorder.stop();
      }, 5000);
    } catch (err) {
      alert("Microphone access denied or error occurred.");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
        <p className="text-lg font-semibold">Processing your request...</p>
      </div>
    );
  }

  return (
    <div className="p-6 font-sans">
      <h2 className="text-2xl font-bold mb-4">Live Transcript</h2>
      <textarea
        className="w-full h-32 p-2 border rounded mb-4"
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
      />
      <div className="flex flex-wrap gap-4 mb-6">
        <button onClick={handleMicRecord} className="bg-red-500 text-white px-4 py-2 rounded">
          🎙️ Record (5s)
        </button>
        <button onClick={handleASRSummarization} className="bg-blue-500 text-white px-4 py-2 rounded">
          Start Listening / Summarize
        </button>
      </div>

      <h2 className="text-2xl font-bold mb-2">EHR Note Preview</h2>
      <div className="space-x-4 mb-2">
        <button onClick={() => setNoteFormat("soap")} className="bg-gray-300 px-3 py-1 rounded">SOAP</button>
        <button onClick={() => setNoteFormat("narrative")} className="bg-gray-300 px-3 py-1 rounded">Narrative</button>
      </div>
      <pre className="bg-gray-100 p-4 rounded mb-8 whitespace-pre-wrap">
        {noteFormat === "soap" ? soapNote : narrativeNote}
      </pre>

      <h2 className="text-2xl font-bold mb-2">Clinical Decision Support</h2>
      <div className="bg-yellow-100 p-4 rounded mb-2">
        ⚠️ Chest pain + exertion → Consider urgent ECG and troponin if symptoms persist.
      </div>
      <button className="border border-yellow-400 text-yellow-700 px-4 py-2 rounded mb-8">Explain This Alert</button>

      <h2 className="text-2xl font-bold mb-2">Coding Assistant</h2>
      <ul className="list-disc pl-5 mb-4">
        {codes.map((code, index) => (
          <li key={index}>{code}</li>
        ))}
      </ul>
      <button className="bg-green-500 text-white px-4 py-2 rounded mb-8">Copy to EHR</button>

      <h2 className="text-2xl font-bold mb-2">FHIR Integration</h2>
      <button onClick={handleFHIRPush} className="bg-purple-500 text-white px-4 py-2 rounded mb-8">Sync with EHR</button>

      <h2 className="text-2xl font-bold mb-2">Patient-Friendly Summary</h2>
      <p className="mb-2">
        You mentioned feeling pain in your chest when you're active. We're checking your heart to make sure everything's okay. You may need to see a heart doctor.
      </p>
      <button className="bg-indigo-500 text-white px-4 py-2 rounded">Export as PDF</button>
    </div>
  );
}

export default App;
