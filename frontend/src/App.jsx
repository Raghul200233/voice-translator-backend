import React, { useState, useEffect } from 'react';
import { Mic, Upload, FileText, History, Database, RefreshCw } from 'lucide-react';

function App() {
  const [transcriptions, setTranscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [dbStatus, setDbStatus] = useState('checking');

  // Fetch transcriptions from database on page load
  useEffect(() => {
    fetchTranscriptions();
    checkDatabaseStatus();
  }, []);

  const checkDatabaseStatus = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/health');
      const data = await response.json();
      setDbStatus(data.database === 'connected' ? 'connected' : 'disconnected');
    } catch (error) {
      setDbStatus('disconnected');
    }
  };

  const fetchTranscriptions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/transcriptions');
      const data = await response.json();
      if (data.success && data.data) {
        const formattedData = data.data.map(item => ({
          id: item._id,
          text: item.text,
          date: new Date(item.createdAt).toLocaleString(),
          filename: item.fileName,
          fileSize: (item.fileSize / 1024).toFixed(2) + ' KB'
        }));
        setTranscriptions(formattedData);
      }
    } catch (error) {
      console.error('Error fetching transcriptions:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('audio', file);

    try {
      const response = await fetch('http://localhost:5000/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      if (data.success) {
        setCurrentTranscription(data.transcription);
        // Refresh the list to show the new transcription
        await fetchTranscriptions();
      } else {
        alert('Error: ' + (data.error || 'Failed to process audio'));
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error processing audio. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        setLoading(true);
        try {
          const response = await fetch('http://localhost:5000/api/transcribe', {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          
          if (data.success) {
            setCurrentTranscription(data.transcription);
            await fetchTranscriptions();
          }
        } catch (error) {
          console.error('Error transcribing recording:', error);
          alert('Error processing recording');
        } finally {
          setLoading(false);
        }
        
        stream.getTracks().forEach(track => track.close());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);

      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
          setRecording(false);
        }
      }, 10000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-8 h-8 text-blue-600" />
                Speech-to-Text Converter
              </h1>
              <p className="text-gray-600 mt-2">Convert audio to text using AI</p>
            </div>
            <div className="flex items-center gap-2">
              <Database className={`w-5 h-5 ${dbStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`} />
              <span className={`text-sm ${dbStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                {dbStatus === 'connected' ? 'Database Connected' : 'Database Disconnected'}
              </span>
              <button 
                onClick={fetchTranscriptions}
                className="ml-2 p-2 hover:bg-gray-100 rounded-full transition"
                title="Refresh transcriptions"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload or Record Audio</h2>
          
          <div className="flex gap-4 flex-wrap">
            <label className="cursor-pointer">
              <input 
                type="file" 
                accept="audio/*" 
                onChange={handleFileUpload}
                className="hidden" 
                disabled={loading}
              />
              <div className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Upload className="w-5 h-5" />
                Upload Audio
              </div>
            </label>

            {!recording ? (
              <button 
                onClick={startRecording}
                disabled={loading}
                className={`bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Mic className="w-5 h-5" />
                Start Recording (10s)
              </button>
            ) : (
              <button 
                onClick={stopRecording}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition"
              >
                Stop Recording
              </button>
            )}
          </div>

          {recording && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg">
              <p className="text-red-600 flex items-center gap-2">
                <span className="animate-pulse">🔴</span>
                Recording... Maximum 10 seconds
              </p>
            </div>
          )}

          {loading && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-600">Processing audio...</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse w-3/4"></div>
              </div>
            </div>
          )}
        </div>

        {/* Current Transcription */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Current Transcription</h2>
          <div className="bg-gray-50 rounded-lg p-4 min-h-[100px]">
            {currentTranscription ? (
              <p className="text-gray-800">{currentTranscription}</p>
            ) : (
              <p className="text-gray-600">No transcription yet. Upload or record audio to get started.</p>
            )}
          </div>
        </div>

        {/* History Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Transcription History
            <span className="text-sm text-gray-500 ml-2">({transcriptions.length} items)</span>
          </h2>
          {transcriptions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No transcriptions yet. Upload an audio file to get started!</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {transcriptions.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition">
                  <p className="text-gray-800">{item.text.substring(0, 200)}...</p>
                  <div className="flex justify-between items-center mt-2">
                    <div>
                      <p className="text-sm text-gray-500">{item.date}</p>
                      <p className="text-xs text-gray-400">File: {item.filename} ({item.fileSize})</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;