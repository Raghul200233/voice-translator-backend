import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { 
  Mic, Upload, FileText, History, Trash2, Star, 
  FolderOpen, BarChart3, RefreshCw, X, Loader2,
  Music, Clock, Database, Heart, Tag, Filter, Edit2,
  Save, Copy, Check, AlertCircle, Volume2, Download,
  Grid3x3, List, Sun, Moon, ChevronDown, ChevronUp
} from 'lucide-react';

function App() {
  // State management
  const [transcriptions, setTranscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [dbStatus, setDbStatus] = useState('checking');
  const [stats, setStats] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFavorites, setShowFavorites] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [darkMode, setDarkMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const API_URL = 'https://speech-to-text-ial4.onrender.com';
  
  // Categories
  const categories = [
    { value: 'all', label: 'All', icon: FolderOpen, color: 'gray' },
    { value: 'meeting', label: 'Meeting', icon: Users, color: 'blue' },
    { value: 'lecture', label: 'Lecture', icon: BookOpen, color: 'green' },
    { value: 'interview', label: 'Interview', icon: Mic, color: 'purple' },
    { value: 'note', label: 'Note', icon: FileText, color: 'yellow' },
    { value: 'personal', label: 'Personal', icon: Heart, color: 'red' },
    { value: 'work', label: 'Work', icon: Briefcase, color: 'indigo' }
  ];
  
  // Dark mode toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  // Fetch data
  useEffect(() => {
    fetchTranscriptions();
    fetchStatistics();
    checkDatabaseStatus();
    
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  useEffect(() => {
    fetchTranscriptions();
  }, [selectedCategory, showFavorites, searchTerm]);
  
  const checkDatabaseStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      setDbStatus(data.database === 'connected' ? 'connected' : 'disconnected');
      if (data.database === 'connected') {
        toast.success('Database connected successfully!');
      }
    } catch (error) {
      setDbStatus('disconnected');
      toast.error('Database connection failed. Using local storage.');
    }
  };
  
  const fetchTranscriptions = async () => {
    try {
      let url = `${API_URL}/transcriptions?`;
      if (selectedCategory !== 'all') url += `category=${selectedCategory}&`;
      if (showFavorites) url += `favorite=true&`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setTranscriptions(data.data);
      }
    } catch (error) {
      console.error('Error fetching transcriptions:', error);
      toast.error('Failed to load transcriptions');
    }
  };
  
  const fetchStatistics = async () => {
    try {
      const response = await fetch(`${API_URL}/statistics`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validation
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File too large! Maximum size is 25MB.');
      return;
    }
    
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/webm', 'audio/m4a'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type! Please upload an audio file (MP3, WAV, WebM, M4A).');
      return;
    }
    
    setLoading(true);
    const formData = new FormData();
    formData.append('audio', file);
    
    try {
      const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      if (data.success) {
        setCurrentTranscription(data.transcription);
        await fetchTranscriptions();
        await fetchStatistics();
        toast.success('✅ Audio transcribed successfully!');
      } else {
        toast.error(data.error || 'Failed to process audio');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error processing audio. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        
        setLoading(true);
        const formData = new FormData();
        formData.append('audio', file);
        
        try {
          const response = await fetch(`${API_URL}/transcribe`, {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          
          if (data.success) {
            setCurrentTranscription(data.transcription);
            await fetchTranscriptions();
            await fetchStatistics();
            toast.success('🎤 Recording transcribed successfully!');
          }
        } catch (error) {
          console.error('Error transcribing recording:', error);
          toast.error('Error processing recording');
        } finally {
          setLoading(false);
          setRecordingTime(0);
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        }
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };
      
      recorder.start(1000);
      setMediaRecorder(recorder);
      setRecording(true);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast.success('Recording started! Speak now...');
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Unable to access microphone. Please check permissions.');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      toast('Recording stopped', { icon: '⏹️' });
    }
  };
  
  const toggleFavorite = async (id, currentStatus) => {
    try {
      const response = await fetch(`${API_URL}/transcriptions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !currentStatus })
      });
      const data = await response.json();
      if (data.success) {
        await fetchTranscriptions();
        await fetchStatistics();
        toast.success(currentStatus ? 'Removed from favorites' : 'Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite status');
    }
  };
  
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditText(item.text);
  };
  
  const saveEdit = async (id) => {
    try {
      const response = await fetch(`${API_URL}/transcriptions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText })
      });
      const data = await response.json();
      if (data.success) {
        await fetchTranscriptions();
        setEditingId(null);
        toast.success('Transcription updated!');
      }
    } catch (error) {
      console.error('Error saving edit:', error);
      toast.error('Failed to update transcription');
    }
  };
  
  const deleteTranscription = async (id) => {
    if (!confirm('Are you sure you want to delete this transcription?')) return;
    
    try {
      const response = await fetch(`${API_URL}/transcriptions/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        await fetchTranscriptions();
        await fetchStatistics();
        toast.success('Transcription deleted');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete transcription');
    }
  };
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };
  
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
      <Toaster position="top-right" />
      
      {/* Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`sticky top-0 z-20 shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-3"
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Speech-to-Text Converter
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Powered by Groq Whisper API</p>
              </div>
            </motion.div>
            
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-full transition ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </motion.button>
              
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className={`flex items-center gap-2 px-3 py-1 rounded-full ${dbStatus === 'connected' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}
              >
                <Database className="w-4 h-4" />
                <span className="text-sm font-medium">{dbStatus === 'connected' ? 'Database Connected' : 'Offline Mode'}</span>
              </motion.div>
              
              <motion.button
                whileHover={{ rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { fetchTranscriptions(); fetchStatistics(); }}
                className={`p-2 rounded-full transition ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <RefreshCw className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>
      
      {/* Stats Bar */}
      {stats && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex gap-6 flex-wrap text-sm">
              <motion.div whileHover={{ scale: 1.05 }} className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <FileText className="w-4 h-4 text-blue-600" />
                <span>{stats.totalTranscriptions || 0} transcriptions</span>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <Tag className="w-4 h-4 text-green-600" />
                <span>{stats.totalWords?.toLocaleString() || 0} words</span>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <Heart className="w-4 h-4 text-red-500" />
                <span>{stats.favorites || 0} favorites</span>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
      
      <main className="container mx-auto px-4 py-6">
        {/* Upload Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className={`rounded-xl shadow-lg p-6 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
        >
          <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Upload or Record Audio
          </h2>
          
          <div className="flex gap-4 flex-wrap">
            <motion.label
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="cursor-pointer"
            >
              <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" disabled={loading} />
              <div className={`bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition shadow-md ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Upload className="w-5 h-5" />
                Upload Audio
              </div>
            </motion.label>
            
            {!recording ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startRecording}
                disabled={loading}
                className={`bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition shadow-md ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Mic className="w-5 h-5" />
                Start Recording
              </motion.button>
            ) : (
              <motion.button
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                onClick={stopRecording}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition shadow-md"
              >
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                Stop Recording ({formatTime(recordingTime)})
              </motion.button>
            )}
          </div>
          
          {recording && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
            >
              <p className="text-red-600 dark:text-red-400 flex items-center gap-2">
                <span className="animate-pulse">🔴</span>
                Recording in progress... Maximum 30 seconds recommended
              </p>
            </motion.div>
          )}
          
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                <p className="text-blue-600 dark:text-blue-400">Processing audio with Groq Whisper API...</p>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-3">
                <motion.div 
                  className="bg-blue-600 h-1.5 rounded-full"
                  animate={{ width: ['0%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
            </motion.div>
          )}
        </motion.div>
        
        {/* Current Transcription */}
        <AnimatePresence>
          {currentTranscription && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl shadow-lg p-6 mb-6 border border-blue-200 dark:border-blue-800`}
            >
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-800 dark:text-white">
                <FileText className="w-5 h-5 text-blue-600" />
                Current Transcription
              </h2>
              <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <p className={`leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>{currentTranscription}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`rounded-xl shadow-lg p-4 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
        >
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => {
                const Icon = cat.icon;
                return (
                  <motion.button
                    key={cat.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition ${selectedCategory === cat.value ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                  >
                    <Icon className="w-3 h-3" />
                    {cat.label}
                  </motion.button>
                );
              })}
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFavorites(!showFavorites)}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition ${showFavorites ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            >
              <Heart className="w-4 h-4" fill={showFavorites ? "currentColor" : "none"} />
              Favorites
            </motion.button>
            
            <div className="flex-1 max-w-xs">
              <input 
                type="text" 
                placeholder="Search transcriptions..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              />
            </div>
            
            <div className="flex gap-1">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
              >
                <Grid3x3 className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
              >
                <List className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
        
        {/* History Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
        >
          <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            <History className="w-5 h-5" />
            Transcription History
            <span className="text-sm text-gray-500 ml-2">({transcriptions.length} items)</span>
          </h2>
          
          {transcriptions.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Music className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No transcriptions yet. Upload or record audio to get started!</p>
            </motion.div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {transcriptions.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                    className={`border rounded-lg p-4 transition-all duration-300 ${darkMode ? 'border-gray-700 hover:border-blue-500' : 'border-gray-200 hover:shadow-xl'}`}
                  >
                    {editingId === item.id ? (
                      <div>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className={`w-full p-2 border rounded-lg text-sm mb-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                          rows={4}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(item.id)} className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1">
                            <Save className="w-3 h-3" /> Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-600 text-white rounded-lg text-sm flex items-center gap-1">
                            <X className="w-3 h-3" /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className={`text-sm leading-relaxed mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                          {expandedId === item.id ? item.text : `${item.text.substring(0, 150)}...`}
                        </p>
                        {item.text.length > 150 && (
                          <button onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className="text-blue-600 text-xs mb-2 flex items-center gap-1">
                            {expandedId === item.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {expandedId === item.id ? 'Show less' : 'Read more'}
                          </button>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(item.createdAt).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Volume2 className="w-3 h-3" />{item.wordCount} words</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(item)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                            <Edit2 className="w-4 h-4 text-gray-500" />
                          </button>
                          <button onClick={() => copyToClipboard(item.text)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                            <Copy className="w-4 h-4 text-gray-500" />
                          </button>
                          <button onClick={() => toggleFavorite(item.id, item.isFavorite)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                            <Star className={`w-4 h-4 ${item.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                          </button>
                          <button onClick={() => deleteTranscription(item.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {transcriptions.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border rounded-lg p-4 transition-all duration-300 ${darkMode ? 'border-gray-700 hover:border-blue-500' : 'border-gray-200 hover:shadow-md'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className={`text-sm leading-relaxed mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                          {expandedId === item.id ? item.text : `${item.text.substring(0, 200)}...`}
                        </p>
                        {item.text.length > 200 && (
                          <button onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className="text-blue-600 text-xs mb-2">
                            {expandedId === item.id ? 'Show less' : 'Read more'}
                          </button>
                        )}
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(item.createdAt).toLocaleString()}</span>
                          <span className="flex items-center gap-1"><Volume2 className="w-3 h-3" />{item.wordCount} words</span>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-3">
                        <button onClick={() => startEdit(item)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </button>
                        <button onClick={() => copyToClipboard(item.text)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                          <Copy className="w-4 h-4 text-gray-500" />
                        </button>
                        <button onClick={() => toggleFavorite(item.id, item.isFavorite)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                          <Star className={`w-4 h-4 ${item.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                        </button>
                        <button onClick={() => deleteTranscription(item.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

// Missing icons - add these imports
function Users(props) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function BookOpen(props) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>; }
function Briefcase(props) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>; }

export default App;