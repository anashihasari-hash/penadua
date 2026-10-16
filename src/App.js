import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';

// ==========================================
// KONEKSI FIREBASE (ONLINE LINTAS HP) - AMAN TIDAK DISENTUH
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDgur_aBdmwrzJF9bAgP-HbiHXfnB3Scbw",
  authDomain: "penadua-220ff.firebaseapp.com",
  projectId: "penadua-220ff",
  storageBucket: "penadua-220ff.firebasestorage.app",
  messagingSenderId: "238367788618",
  appId: "1:238367788618:web:0b3c202b5c84c7caa468b3"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// SESSION HELPER (KHUSUS DATA DEVICE LOKAL)
// ==========================================
const session = {
  set: (key, val) => {
    if (val === null || val === undefined || val === 'null') { localStorage.removeItem(key); } 
    else { localStorage.setItem(key, JSON.stringify(val)); }
  },
  get: (key, fallback) => {
    try { 
      const item = localStorage.getItem(key); 
      if (!item || item === 'null' || item === 'undefined') return fallback;
      const parsed = JSON.parse(item);
      return parsed !== null ? parsed : fallback;
    } catch (e) { return fallback; }
  },
  clear: () => {
    ['PENA_ROLE', 'PENA_TAB', 'PENA_CLASS', 'PENA_STUDENT'].forEach(k => localStorage.removeItem(k));
  }
};

const MASTER_ADMIN_PASSWORD = "adminpena"; 
const GEMINI_MODEL = "gemini-3.8-flash"; 

// 9 INDIKATOR FUNDAMENTAL BAWAAN (ENNIS & POLYA)
const DEFAULT_INDICATORS = [
  { id: 'e1', name: 'Ennis 1: Penjelasan Sederhana', prompt: 'Fokuskan pertanyaan, analisis argumen, dan klarifikasi makna dari naskah.' },
  { id: 'e2', name: 'Ennis 2: Keterampilan Dasar', prompt: 'Evaluasi kredibilitas sumber dan hasil observasi pada masalah tersebut.' },
  { id: 'e3', name: 'Ennis 3: Deduksi & Induksi', prompt: 'Uraikan deduksi/induksi yang logis serta evaluasi kesimpulan masalah.' },
  { id: 'e4', name: 'Ennis 4: Penjelasan Lanjut', prompt: 'Identifikasi asumsi tersembunyi dan definisikan istilah dengan tepat.' },
  { id: 'e5', name: 'Ennis 5: Strategi & Taktik', prompt: 'Tentukan tindakan strategis dan taktis logis untuk penyelesaiannya.' },
  { id: 'p1', name: 'Polya 1: Memahami Masalah', prompt: 'Apa yang tidak diketahui? Data apa yang diberikan? Identifikasi kondisi utama.' },
  { id: 'p2', name: 'Polya 2: Menyusun Rencana', prompt: 'Temukan hubungan data. Susun rencana pemecahan strategis.' },
  { id: 'p3', name: 'Polya 3: Melaksanakan Rencana', prompt: 'Eksekusi rencana penyelesaian masalah dan periksa setiap langkah secara logis.' },
  { id: 'p4', name: 'Polya 4: Melihat Kembali', prompt: 'Evaluasi solusi yang didapat, periksa argumen, dan sanggah jika ada kontradiksi.' }
];

// ==========================================
// 🧠 OTAK AI PENDIDIK (PROMPT DINAMIS)
// ==========================================
const callGeminiAPI = async (prompt, apiKey, retries = 3) => {
  if (!apiKey || !apiKey.trim()) throw new Error("API Key belum dimasukkan!");
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey.trim()}`;
  
  const payload = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if ((response.status === 429 || response.status >= 500) && attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000)); 
        continue;
      }
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ditolak Google (Status ${response.status}): ${errText}`);
      }
      const result = await response.json();
      if (result.candidates && result.candidates.length > 0) return result.candidates[0].content.parts[0].text;
      throw new Error("Format respon AI tidak terbaca");
    } catch (err) {
      if (attempt === retries - 1) throw err;
    }
  }
};

export default function App() {
  // STATE LOKAL USER AKTIF
  const [userRole, setUserRole] = useState(() => session.get('PENA_ROLE', null)); 
  const [activeTab, setActiveTab] = useState(() => session.get('PENA_TAB', 'landing'));
  const [currentClass, setCurrentClass] = useState(() => session.get('PENA_CLASS', null));
  const [currentStudent, setCurrentStudent] = useState(() => session.get('PENA_STUDENT', null));
  
  const [classCodeInput, setClassCodeInput] = useState('');
  const [loginStudentName, setLoginStudentName] = useState('');
  const [loginStudentPin, setLoginStudentPin] = useState('');

  const defaultSysKey = process.env.REACT_APP_GEMINI_API_KEY || "";
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('PENA_AI_KEY') || defaultSysKey);
  const [isApiValid, setIsApiValid] = useState(() => (localStorage.getItem('PENA_AI_KEY') || defaultSysKey).length > 5);

  const [isBypassAI, setIsBypassAI] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [isValidatingApi, setIsValidatingApi] = useState(false);

  // STATE KANVAS (MULTIPLE INDIKATOR DINAMIS)
  const [isKutipanLocked, setIsKutipanLocked] = useState(false);
  const [isPasted, setIsPasted] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [naskahText, setNaskahText] = useState('');
  const [answers, setAnswers] = useState({}); // Menyimpan jawaban per indikator

  // STATE FIREBASE
  const [allClasses, setAllClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  // STATE MANAJEMEN INDIKATOR GURU
  const [localIndicators, setLocalIndicators] = useState([]);
  const [newIndName, setNewIndName] = useState('');
  const [newIndPrompt, setNewIndPrompt] = useState('');

  const [showAdminGate, setShowAdminGate] = useState(false);
  const [adminGateInput, setAdminGateInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  
  const [teacherNameInput, setTeacherNameInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  const [showMandiriModal, setShowMandiriModal] = useState(false);
  const [mandiriNameInput, setMandiriNameInput] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [teacherNoteInput, setTeacherNoteInput] = useState('');

  const activeIndicatorsList = userRole === 'mandiri' ? DEFAULT_INDICATORS : (currentClass?.indicators || DEFAULT_INDICATORS);

  // 🛡️ SCROLL LOCK PADA POP-UP
  useEffect(() => {
    if (showAdminGate || showPinModal || showMandiriModal || selectedSubmission) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [showAdminGate, showPinModal, showMandiriModal, selectedSubmission]);

  const doLogout = () => {
    session.clear(); 
    setCurrentStudent(null); setCurrentClass(null); setUserRole(null);
    setSubmissions([]); setStudents([]); setActiveTab('landing'); resetCanvasState();
    setClassCodeInput(''); setLoginStudentName(''); setLoginStudentPin('');
    setTeacherNameInput(''); setSubjectInput(''); setPinInput(''); setMandiriNameInput('');
    setIsApiValid(false);
  };

  // 🛡️ AUTO-HEALING SYSTEM
  useEffect(() => {
    if (!userRole) {
      if (activeTab !== 'landing' && activeTab !== 'loginSiswa') setActiveTab('landing');
      return;
    }
    if ((userRole === 'siswa' || userRole === 'mandiri') && !currentStudent) {
        doLogout(); return;
    }
    if (userRole === 'siswa' || userRole === 'mandiri') {
        if (activeTab === 'guruDashboard' || activeTab === 'guruSiswa' || activeTab === 'guruIndikator') setActiveTab('introSiswa');
    } else if (userRole === 'guru') {
        if (activeTab !== 'guruDashboard' && activeTab !== 'guruSiswa' && activeTab !== 'guruIndikator') setActiveTab('guruDashboard');
    }
    session.set('PENA_ROLE', userRole); session.set('PENA_TAB', activeTab);
    session.set('PENA_CLASS', currentClass); session.set('PENA_STUDENT', currentStudent);
  }, [userRole, activeTab, currentClass, currentStudent]);

  // 🔥 TARIK DATA KELAS REAL-TIME
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'classes'), (snap) => {
      const cls = [];
      snap.forEach(d => cls.push({ id: d.id, ...d.data() })); 
      setAllClasses(cls);
      
      // Update state indikator guru jika kelas berubah di DB
      if (currentClass) {
         const updatedClass = cls.find(c => c.id === currentClass.id);
         if (updatedClass) {
             setCurrentClass(updatedClass);
             setLocalIndicators(updatedClass.indicators || DEFAULT_INDICATORS);
         }
      }
    });
    return () => unsub();
  }, [currentClass?.id]); // HANYA rerender jika id kelas yang aktif berubah

  // 🔥 TARIK DATA SISWA & TUGAS
  useEffect(() => {
    if (!currentClass && userRole !== 'mandiri') { setSubmissions([]); setStudents([]); return; }

    let qStu, qSub;
    if (userRole === 'mandiri') {
      qSub = query(collection(db, 'submissions'), where('mode', '==', 'Mandiri (Privat)'), where('studentName', '==', currentStudent?.name || ''));
      qStu = null;
    } else {
      qStu = query(collection(db, 'students'), where('classCode', '==', currentClass.classCode));
      qSub = query(collection(db, 'submissions'), where('classCode', '==', currentClass.classCode));
    }

    let unsubStu = () => {};
    if (qStu) {
      unsubStu = onSnapshot(qStu, (snap) => {
        const stu = []; snap.forEach(d => stu.push({ id: d.id, ...d.data() })); 
        setStudents(stu);
        
        if (userRole === 'siswa' && currentStudent) {
            const isExist = stu.some(s => s.name === currentStudent.name && s.pin === currentStudent.pin);
            if (!isExist && !snap.metadata.hasPendingWrites) {
                alert("Akses kamu ke kelas ini telah dicabut oleh instruktur.");
                doLogout();
            }
        }
      });
    }

    let unsubSub = () => {};
    if (qSub) {
       unsubSub = onSnapshot(qSub, (snap) => {
        const sub = []; snap.forEach(d => sub.push({ id: d.id, ...d.data() }));
        setSubmissions(sub.sort((a,b) => b.timestampMs - a.timestampMs)); 
      });
    }

    return () => { unsubStu(); unsubSub(); };
  }, [currentClass, userRole, currentStudent]);

  const resetCanvasState = () => {
    setNaskahText(''); setAnswers({});
    setIsPasted(false); setTabSwitchCount(0); setIsKutipanLocked(false);
  };

  const handleVerifyClassCode = (e) => {
    e.preventDefault();
    const foundClass = allClasses.find(c => c.classCode === classCodeInput.trim() || c.pin === classCodeInput.trim());
    if (foundClass) {
      setCurrentClass(foundClass); alert(`✅ Kelas ${foundClass.subject} (${foundClass.teacher}) ditemukan!`);
    } else { alert('❌ Kode Akses Kelas tidak ditemukan.'); setCurrentClass(null); }
  };

  const handleStudentLoginFinal = (e) => {
    e.preventDefault();
    const inputName = loginStudentName.trim().toLowerCase();
    const student = students.find(s => s?.name?.trim().toLowerCase() === inputName && s?.pin === loginStudentPin.trim());
    
    if (student) {
      setCurrentStudent(student); setUserRole('siswa'); setIsBypassAI(false);
      resetCanvasState(); setActiveTab('introSiswa'); 
    } else { alert('❌ Nama atau PIN Siswa salah.'); }
  };

  const handleAdminGateSubmit = (e) => {
    e.preventDefault();
    if (adminGateInput === MASTER_ADMIN_PASSWORD) {
      setShowAdminGate(false); setTeacherNameInput(''); setSubjectInput(''); setPinInput('');
      setShowPinModal(true); setAdminGateInput('');
    } else { alert('❌ Sandi Admin salah. Silakan hubungi admin.'); }
  };

  const handleRegisterOrLoginGuru = async (e) => {
    e.preventDefault();
    const tName = teacherNameInput.trim();
    const sName = subjectInput.trim();
    const pin = pinInput.trim();
    
    let targetClass = allClasses.find(c => c.teacher.toLowerCase() === tName.toLowerCase() && c.subject.toLowerCase() === sName.toLowerCase());
    
    if (targetClass) { 
      if (targetClass.pin !== pin) { alert('❌ Sandi (PIN) guru salah!'); return; } 
    } else {
      const classCode = Math.floor(10000 + Math.random() * 90000).toString();
      targetClass = { teacher: tName, subject: sName, pin: pin, classCode: classCode, indicators: DEFAULT_INDICATORS };
      await addDoc(collection(db, 'classes'), targetClass);
      alert(`🎉 KELAS DIBUAT!\nKODE AKSES MURID: ${classCode}`);
    }
    
    setCurrentClass(targetClass); setUserRole('guru'); setLocalIndicators(targetClass.indicators || DEFAULT_INDICATORS);
    setShowPinModal(false); setActiveTab('guruDashboard');
  };

  const handleForceDeleteGuruClass = async () => {
    if(window.confirm('🚨 Hapus paksa histori kelas ini beserta siswa dan tugasnya?')) {
      const tName = teacherNameInput.trim().toLowerCase();
      const sName = subjectInput.trim().toLowerCase();
      const target = allClasses.find(c => c.teacher.toLowerCase() === tName && c.subject.toLowerCase() === sName);
      if(target) {
        await deleteDoc(doc(db, 'classes', target.id));
        alert('Histori kelas dibersihkan.');
      }
    }
  };

  // FUNGSI MANAJEMEN INDIKATOR GURU
  const handleAddIndicator = () => {
     if (localIndicators.length >= 10) { alert('Maksimal 10 Indikator.'); return; }
     if (!newIndName.trim() || !newIndPrompt.trim()) return;
     const baru = { id: `ind-${Date.now()}`, name: newIndName.trim(), prompt: newIndPrompt.trim() };
     setLocalIndicators([...localIndicators, baru]);
     setNewIndName(''); setNewIndPrompt('');
  };
  const handleRemoveIndicator = (id) => {
     if (localIndicators.length <= 1) { alert('Kelas minimal memiliki 1 indikator analisis.'); return; }
     setLocalIndicators(localIndicators.filter(i => i.id !== id));
  };
  const handleSaveIndicatorsToDB = async () => {
     try {
       await updateDoc(doc(db, 'classes', currentClass.id), { indicators: localIndicators });
       alert('✅ Indikator berhasil disimpan & diperbarui untuk siswa!');
     } catch (err) { alert('Gagal menyimpan indikator: ' + err.message); }
  };

  const handleMandiriLogin = (e) => {
    e.preventDefault();
    const name = mandiriNameInput.trim();
    if (!name) return;
    
    setCurrentClass(null);
    const newMandiriStudent = { id: 'mandiri-' + Date.now(), name };
    setCurrentStudent(newMandiriStudent);
    setUserRole('mandiri'); setSubmissions([]); setIsBypassAI(false);
    resetCanvasState(); setShowMandiriModal(false); setActiveTab('introSiswa'); 
  };

  // PENDETEKSI TAB SWITCH
  useEffect(() => {
    if (activeTab !== 'workspace' || !currentStudent || !isKutipanLocked) return;
    const handleVisibilityChange = () => { if (document.hidden) setTabSwitchCount(prev => prev + 1); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTab, currentStudent, isKutipanLocked]);

  const activePortfolio = submissions.find(s => s?.studentName === currentStudent?.name);
  const isWorkspaceLocked = activePortfolio && activePortfolio.status !== 'Karya Ditolak / Revisi';
  const isWorkspaceAllowed = isApiValid || isBypassAI; 

  const checkApiValidity = async (e) => {
    e.preventDefault();
    const cleanKey = apiKey.trim();
    if (cleanKey.length < 5) { alert('❌ API Key tidak valid.'); return; }
    
    setIsValidatingApi(true);
    try {
      await callGeminiAPI("Balas dengan kata: KONEKSI OK", cleanKey, 2);
      localStorage.setItem('PENA_AI_KEY', cleanKey);
      setIsApiValid(true); setIsBypassAI(false);
      alert('✅ Kunci Tervalidasi Google! Segel Kanvas Terbuka.');
      setActiveTab('workspace');
    } catch (err) {
      setIsApiValid(false);
      alert(`❌ UJI PING GAGAL!\nPastikan API Key valid dan bukan akun di bawah 18 tahun.\n\nDetail: ${err.message}`);
    } finally { setIsValidatingApi(false); }
  };

  const handleBypassAI = () => {
    setIsBypassAI(true);
    alert('⚠️ Mesin AI Dinonaktifkan. Tugas akan dievaluasi secara manual oleh instruktur/guru.');
    setActiveTab('workspace');
  };

  const handleLockKutipan = () => {
    if (naskahText.trim().length < 15) {
      alert('Kutipan naskah terlalu pendek, silakan lengkapi dulu.'); return;
    }
    setIsKutipanLocked(true);
  };

  const handleAnswerChange = (id, text) => {
    setAnswers({ ...answers, [id]: text });
  };

  const handleSubmitCanvas = async (e) => {
    e.preventDefault();
    
    // Cek apakah semua indikator sudah diisi
    const incomplete = activeIndicatorsList.some(ind => !answers[ind.id] || answers[ind.id].trim() === '');
    if (incomplete) { alert('Mohon lengkapi seluruh uraian analisis sebelum mengirim.'); return; }

    setIsSubmittingTask(true);
    let diagnosis = "";

    // GABUNGKAN DEKONSTRUKSI
    let combinedDeconstruction = "";
    activeIndicatorsList.forEach((ind) => {
       combinedDeconstruction += `[${ind.name.toUpperCase()}]:\n${answers[ind.id]}\n\n`;
    });

    if (isBypassAI) {
      diagnosis = `[EVALUASI MANUAL] Mesin AI dinonaktifkan oleh pengguna. Menunggu tinjauan langsung dan validasi dari Guru.`;
    } else {
      const activeKeyToUse = localStorage.getItem('PENA_AI_KEY') || defaultSysKey;
      if (!activeKeyToUse) {
        alert('API Key tidak ditemukan. Silakan atur kembali di Pengaturan AI.');
        setActiveTab('introSiswa'); setIsSubmittingTask(false); return;
      }
      try {
        const prompt = `Bertindaklah sebagai "Pendidik Kritis yang Membangun". Tugas Anda mengevaluasi karya analitis siswa secara komprehensif, obyektif, dan suportif.
HINDARI KATA MERENDAHKAN (seperti dangkal, gagal, asal-asalan). Apresiasi logika yang benar, berikan masukan jika ada celah nalar.

Kutipan Masalah Utama Siswa: "${naskahText}"

Uraian Analisis Siswa Berdasarkan Indikator yang Ditetapkan:
${combinedDeconstruction}

Instruksi Evaluasi:
1. Bedah korelasi argumen siswa pada setiap indikator dengan kutipan naskah awal. Jangan sekadar merangkum.
2. Nilai pemahaman masalah, validasi argumen, dan logika rasional yang disusun oleh siswa.
3. Berikan diagnosis evaluatif (maksimal 3 paragraf padat). Jelaskan spesifik apa yang sudah logis dan apa yang masih perlu diperbaiki.`;
        
        const aiResponse = await callGeminiAPI(prompt, activeKeyToUse, 3);
        diagnosis = `[HASIL EVALUASI AI] ${aiResponse}`;
      } catch (err) {
        diagnosis = `[ERROR KONEKSI AI] Gagal menghubungi mesin analitis. Detail: ${err.message}.`;
      }
    }
    
    const submissionData = {
      classCode: currentClass?.classCode || 'MANDIRI',
      studentName: currentStudent.name,
      mode: userRole === 'mandiri' ? 'Mandiri (Privat)' : 'Tugas Kelas',
      naskahText: naskahText, 
      deconstructionText: combinedDeconstruction.trim(),
      diagnosis, hasCopyPasted: isPasted, tabSwitches: tabSwitchCount,
      timestamp: new Date().toLocaleString(),
      timestampMs: Date.now(),
      status: userRole === 'mandiri' ? 'Selesai (Auto)' : 'Pending Review Guru',
      teacherFeedback: ''
    };

    if (activePortfolio && activePortfolio.status === 'Karya Ditolak / Revisi') {
       await updateDoc(doc(db, 'submissions', activePortfolio.id), submissionData);
    } else {
       await addDoc(collection(db, 'submissions'), { ...submissionData, certNumber: `PENA-26-${Math.floor(1000 + Math.random() * 9000)}` });
    }

    setIsPasted(false); setTabSwitchCount(0); setIsSubmittingTask(false);
    setActiveTab('portfolio');
  };

  const handleTeacherAction = async (id, status) => {
    await updateDoc(doc(db, 'submissions', id), { status, teacherFeedback: teacherNoteInput });
    setSelectedSubmission(null); setTeacherNoteInput('');
  };

  const handleDeleteSubmission = async (id) => {
    if(window.confirm('Yakin ingin menghapus hasil evaluasi siswa ini? Siswa harus mengulang tugasnya dari awal.')){
      await deleteDoc(doc(db, 'submissions', id));
      setSelectedSubmission(null);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    const name = e.target.sName.value.trim();
    if(name) {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      await addDoc(collection(db, 'students'), { classCode: currentClass.classCode, name, pin });
      e.target.sName.value = ''; alert(`Berhasil! PIN otentikasi untuk ${name} adalah: ${pin}`);
    }
  };

  const handleRemoveStudent = async (id) => {
    if(window.confirm('Cabut akses siswa ini dari kelas? (Siswa akan otomatis ditendang dari layar mereka saat ini)')) {
      await deleteDoc(doc(db, 'students', id));
    }
  };

  const handleExportCSV = () => {
    if(submissions.length === 0) { alert("Tidak ada data untuk diekspor"); return; }
    const sanitize = (str) => {
      if(!str) return '""';
      return `"${str.replace(/[\r\n]+/g, ' ').replace(/"/g, '""')}"`;
    };
    const headers = ["ID Validasi", "Nama Siswa", "Waktu", "Status Putusan", "Pindah Tab", "Kutipan Naskah", "Uraian Siswa", "Laporan Hasil AI", "Catatan Guru"];
    const rows = submissions.map(s => [
      sanitize(s.certNumber), sanitize(s.studentName), sanitize(s.timestamp), sanitize(s.status), 
      s.tabSwitches, sanitize(s.naskahText), sanitize(s.deconstructionText), 
      sanitize(s.diagnosis), sanitize(s.teacherFeedback)
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Evaluasi_PENA_${currentClass?.subject || 'Mandiri'}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const getDynamicPrompt = (text) => {
    if (!text || text.trim() === '') return 'naskah tersebut';
    const words = text.trim().split(/\s+/);
    const preview = words.slice(0, 5).join(' ');
    return words.length > 5 ? `"${preview}..."` : `"${preview}"`;
  };

  return (
    <div style={styles.appContainer}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        body { margin: 0; background-color: #f8fafc; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        
        /* 📱 RESPONSIVE MEDIA QUERIES UNTUK HP */
        @media screen and (max-width: 600px) {
           .responsive-hero { padding: 8% 5% !important; }
           .responsive-title { fontSize: 26px !important; }
           .responsive-subtitle { fontSize: 14.5px !important; }
           .responsive-card { padding: 25px 20px !important; }
           .responsive-grid { flexDirection: column !important; }
           .responsive-nav { flexDirection: column !important; alignItems: stretch !important; }
           .responsive-nav button { width: 100% !important; margin-bottom: 5px; }
           .responsive-table th, .responsive-table td { padding: 12px 10px !important; fontSize: 13px !important; }
        }

        @media print { 
          body * { visibility: hidden; } 
          .print-area, .print-area * { visibility: visible; } 
          .print-area { position: absolute; left: 0; top: 0; width: 100vw; padding: 0; margin: 0; background: white !important; } 
          .no-print { display: none !important; } 
        }
      `}} />

      <header style={styles.header} className="no-print">
        <h2 style={styles.logoText}>PENA Pilar 2</h2>
        {userRole && <button style={styles.textBtn} onClick={doLogout}>Keluar Sesi</button>}
      </header>

      {!userRole && activeTab === 'landing' && (
        <div style={styles.heroCard} className="no-print responsive-hero">
          <div style={{textAlign: 'center', marginBottom: '40px'}}>
            <span style={styles.badgeLabel}>Platform Elaborasi Nalar Aksara (PENA 1)</span>
            <h1 style={{...styles.titleHero}} className="responsive-title">Platform Pertanggungjawaban Nalar</h1>
            <p style={{...styles.subtitleHero}} className="responsive-subtitle">
              Bermula sebagai alat uji orisinalitas di <b>Platform 5 (Buletin - Karya Murid)</b>, <b>PENA Pilar 2</b> kini berevolusi secara fundamental menjadi instrumen validasi nalar mandiri. Sistem ini siap membedah pemikiran siswa dan terintegrasi baik dalam ruang kelas maupun simulasi personal tanpa pengawasan Instruktur.
            </p>
          </div>
          
          <div style={{...styles.gridMenu}} className="responsive-grid">
            <div style={styles.menuBox} onClick={() => setActiveTab('loginSiswa')}>
              <div style={styles.iconCircle}>🎓</div>
              <h3 style={styles.menuTitle}>Ruang Siswa</h3>
              <p style={styles.menuDesc}>Masuk menggunakan kode akses kelas resmi dari instruktur untuk mengirim artefak nalar.</p>
            </div>
            <div style={styles.menuBox} onClick={() => setShowMandiriModal(true)}>
              <div style={styles.iconCircle}>👤</div>
              <h3 style={styles.menuTitle}>Mode Mandiri</h3>
              <p style={styles.menuDesc}>Lakukan simulasi dan validasi pemikiran personal secara terisolasi tanpa guru.</p>
            </div>
            <div style={styles.menuBox} onClick={() => setShowAdminGate(true)}>
              <div style={styles.iconCircle}>👨‍🏫</div>
              <h3 style={styles.menuTitle}>Gerbang Instruktur</h3>
              <p style={styles.menuDesc}>Manajemen kelas, pengaturan indikator analitik, dan validasi evaluasi siswa.</p>
            </div>
          </div>
        </div>
      )}

      {showAdminGate && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard} className="responsive-card">
            <div style={{textAlign: 'center', marginBottom: '20px'}}>
              <h3 style={styles.modalTitle}>Gerbang Terbatas Instruktur</h3>
              <p style={styles.modalDesc}>Sistem manajemen evaluasi siswa memerlukan otorisasi. Silakan masukkan Sandi Master.</p>
            </div>
            <form onSubmit={handleAdminGateSubmit}>
              <input type="password" placeholder="Masukkan Sandi Master..." value={adminGateInput} onChange={(e) => setAdminGateInput(e.target.value)} style={styles.input} required />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Buka Portal Instruktur</button>
                <button type="button" style={styles.btnSecondary} onClick={() => setShowAdminGate(false)}>Kembali</button>
              </div>
            </form>
            <div style={styles.contactBox}>
              <p style={{margin: 0}}><b>Belum Punya Akses?</b></p>
              <p style={{margin: '5px 0 0 0'}}>Dapatkan lisensi Trial & Berbayar khusus Instruktur dengan menghubungi:<br/><a href="mailto:anashihasari@gmail.com" style={styles.contactLink}>anashihasari@gmail.com</a></p>
            </div>
          </div>
        </div>
      )}

      {!userRole && activeTab === 'loginSiswa' && (
        <div style={styles.card} className="no-print responsive-card">
          <button style={styles.backBtn} onClick={() => setActiveTab('landing')}>← Kembali ke Beranda</button>
          <h2 style={{color: '#0f172a'}}>Akses Ruang Kelas</h2>
          {!currentClass ? (
            <form onSubmit={handleVerifyClassCode} style={styles.form}>
              <label style={styles.label}>Kode Akses Kelas (5 Digit):</label>
              <input type="text" placeholder="Contoh: 12345" value={classCodeInput} onChange={(e) => setClassCodeInput(e.target.value)} style={styles.input} required autoComplete="off" />
              <button type="submit" style={styles.btnPrimary}>Cari Kelas</button>
            </form>
          ) : (
            <form onSubmit={handleStudentLoginFinal} style={styles.form}>
              <div style={styles.introBox}>📚 Kelas Ditemukan: <b>{currentClass.subject}</b> (Instruktur: {currentClass.teacher})</div>
              <label style={styles.label}>Nama Lengkap:</label>
              <input type="text" value={loginStudentName} onChange={(e) => setLoginStudentName(e.target.value)} style={styles.input} required />
              <label style={styles.label}>PIN Identitas (4 Digit):</label>
              <input type="password" value={loginStudentPin} onChange={(e) => setLoginStudentPin(e.target.value)} style={styles.input} required />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Masuk ke Kelas</button>
                <button type="button" style={styles.textBtn} onClick={() => setCurrentClass(null)}>Ganti Kelas</button>
              </div>
            </form>
          )}
        </div>
      )}

      {showPinModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard} className="responsive-card">
            <h3 style={styles.modalTitle}>Otorisasi Instruktur</h3>
            <p style={styles.modalDesc}>Buat kelas baru atau masuk ke kelas yang sudah ada menggunakan identitas Anda.</p>
            <form onSubmit={handleRegisterOrLoginGuru} autoComplete="off">
              <label style={styles.label}>Nama Guru:</label>
              <input type="text" value={teacherNameInput} onChange={(e) => setTeacherNameInput(e.target.value)} style={styles.input} required autoComplete="off" />
              <label style={styles.label}>Mata Pelajaran:</label>
              <input type="text" value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} style={styles.input} required autoComplete="off" />
              <label style={styles.label}>PIN Kelas Pengaman (Buat Bebas):</label>
              <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} style={styles.input} required autoComplete="new-password" />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Masuk / Buat Ruang</button>
                <button type="button" style={styles.btnSecondary} onClick={() => setShowPinModal(false)}>Tutup</button>
              </div>
              <div style={{marginTop: '20px', textAlign: 'center'}}>
                <button type="button" onClick={handleForceDeleteGuruClass} style={{background: 'none', border: 'none', color: '#dc2626', fontSize: '13px', textDecoration: 'underline', cursor: 'pointer', fontWeight: '600'}}>Lupa PIN? Hapus Histori Kelas Ini</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMandiriModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard} className="responsive-card">
            <h3 style={styles.modalTitle}>Simulasi Mode Mandiri</h3>
            <p style={styles.modalDesc}>Uji orisinalitas dan dekonstruksi nalar Anda secara pribadi tanpa campur tangan Instruktur.</p>
            <form onSubmit={handleMandiriLogin}>
              <label style={styles.label}>Nama Peserta Uji:</label>
              <input type="text" placeholder="Masukkan nama Anda..." value={mandiriNameInput} onChange={(e) => setMandiriNameInput(e.target.value)} style={styles.input} required autoComplete="off" />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Mulai Eksekusi Mandiri</button>
                <button type="button" style={styles.btnSecondary} onClick={() => setShowMandiriModal(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {userRole && (
        <nav style={{...styles.navBar}} className="no-print responsive-nav">
          {(userRole === 'siswa' || userRole === 'mandiri') && (
            <>
              <span style={styles.navBadge}>{userRole === 'mandiri' ? 'Mode Privat' : currentClass?.subject}</span>
              <button style={activeTab === 'introSiswa' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('introSiswa')}>Pengaturan AI</button>
              
              <button 
                style={activeTab === 'workspace' ? styles.navActive : (!isWorkspaceAllowed ? {...styles.navBtn, opacity: 0.5, cursor: 'not-allowed'} : styles.navBtn)} 
                onClick={() => { if(isWorkspaceAllowed) setActiveTab('workspace') }}
                disabled={!isWorkspaceAllowed}
              >
                Kanvas Pemikiran
              </button>
              <button 
                style={activeTab === 'portfolio' ? styles.navActive : (!isWorkspaceAllowed ? {...styles.navBtn, opacity: 0.5, cursor: 'not-allowed'} : styles.navBtn)} 
                onClick={() => { if(isWorkspaceAllowed) setActiveTab('portfolio') }}
                disabled={!isWorkspaceAllowed}
              >
                Portofolio Hasil
              </button>
            </>
          )}
          {userRole === 'guru' && (
            <>
              <span style={styles.navBadge}>{currentClass?.subject} (Kode: {currentClass?.classCode})</span>
              <button style={activeTab === 'guruDashboard' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('guruDashboard')}>Dasbor Evaluasi</button>
              <button style={activeTab === 'guruSiswa' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('guruSiswa')}>Manajemen Peserta</button>
              <button style={activeTab === 'guruIndikator' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('guruIndikator')}>Manajemen Indikator</button>
            </>
          )}
        </nav>
      )}

      <main style={styles.main}>
        {(userRole === 'siswa' || userRole === 'mandiri') && currentStudent && (
          <>
            {activeTab === 'introSiswa' && (
              <div style={styles.card} className="no-print responsive-card">
                <h2 style={{color: '#0f172a', marginTop: 0}}>Konfigurasi Sistem Evaluasi</h2>
                <div style={{...styles.introBox, background: isApiValid ? '#f0fdf4' : '#fefce8', borderColor: isApiValid ? '#bbf7d0' : '#fef08a'}}>
                  <p style={{margin: '0 0 8px 0', color: isApiValid ? '#166534' : '#854d0e', fontSize: '15px'}}>
                    <b>Status Sistem: {isApiValid ? '✅ Tersambung & Siap Digunakan' : '⚠️ Menunggu Integrasi Kunci AI'}</b>
                  </p>
                  {!isApiValid && (
                    <p style={{margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.6'}}>Mesin Penilaian AI belum diaktifkan. Ikuti langkah di bawah untuk menghubungkan kunci API Anda secara aman.</p>
                  )}
                </div>

                <div style={{display: 'flex', flexDirection: 'column', gap: '30px'}}>
                  <div style={{border: '1px solid #e2e8f0', padding: '25px', borderRadius: '12px', background: '#fff'}}>
                    <h3 style={{marginTop: 0, color: '#0f172a'}}>Cara Validasi Kunci AI Pribadi</h3>
                    <ol style={{fontSize: '14px', color: '#475569', lineHeight: '1.7', paddingLeft: '20px'}}>
                       <li>Buka situs <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{color: '#2563eb', fontWeight: '600'}}>Google AI Studio</a>.</li>
                       <li>Login menggunakan Email pribadi (Pastikan pengaturan usia akun 18+).</li>
                       <li>Klik tombol <b>Create API Key</b> untuk mendapatkan kode yang berawalan "AQ...".</li>
                       <li>Salin kode tersebut dan tempelkan pada kolom pengaman di bawah ini.</li>
                    </ol>
                    <form onSubmit={checkApiValidity}>
                      <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={{...styles.input, marginTop: '10px'}} placeholder="Tempel kunci API AQ... di sini..." required />
                      <button type="submit" style={{...styles.btnPrimary, marginTop: '15px'}} disabled={isValidatingApi}>
                        {isValidatingApi ? 'Menguji Koneksi Otentikasi...' : 'Uji & Aktifkan Kanvas Nalar'}
                      </button>
                    </form>
                  </div>

                  {userRole === 'siswa' && (
                    <div style={{border: '1px solid #fecaca', background: '#fef2f2', padding: '25px', borderRadius: '12px'}}>
                      <h3 style={{marginTop: 0, color: '#991b1b'}}>Opsi Cadangan: Evaluasi Manual Guru</h3>
                      <p style={{fontSize: '14px', color: '#991b1b', lineHeight: '1.6'}}>Jika kamu terkendala dalam mengaktifkan mesin AI, kamu dapat memotong (*bypass*) sistem AI. Jawabanmu akan langsung diteruskan dan dievaluasi secara manual oleh Instruktur.</p>
                      <button onClick={handleBypassAI} style={{...styles.btnPrimary, marginTop: '10px', background: '#dc2626'}}>Lanjutkan Tanpa Mesin AI (Manual)</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'workspace' && (
              <div style={styles.card} className="no-print responsive-card">
                {isWorkspaceLocked ? (
                  <div style={{textAlign: 'center', padding: '50px 20px'}}>
                    <h3 style={{fontSize: '26px', color: '#0f172a', marginBottom: '10px'}}>Karya Telah Disegel 🔒</h3>
                    <p style={{color: '#64748b', fontSize: '15px', lineHeight: '1.6'}}>Tugas pemikiran kamu sudah dikunci dalam sistem. Buka tab <b>Portofolio AI</b> untuk memantau hasil analisis orisinalitas dan keputusan Instruktur.</p>
                  </div>
                ) : (
                  <>
                    <h2 style={{marginTop: 0, color: '#0f172a'}}>Kanvas Evaluasi Nalar Terpadu</h2>
                    
                    {isBypassAI && (
                       <div style={{background: '#fefce8', borderLeft: '4px solid #eab308', padding: '15px', marginBottom: '25px', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'}}>
                         <p style={{margin: 0, color: '#854d0e', fontSize: '14px'}}><b>ℹ️ Mode Bypass Aktif.</b> Sistem evaluasi AI dinonaktifkan. Susun argumen Anda dengan jelas agar mudah dievaluasi manual oleh Instruktur.</p>
                       </div>
                    )}
                    {activePortfolio && activePortfolio.status === 'Karya Ditolak / Revisi' && (
                       <div style={{background: '#fef2f2', borderLeft: '4px solid #dc2626', padding: '15px', marginBottom: '25px', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'}}>
                         <p style={{margin: 0, color: '#b91c1c', fontSize: '14px'}}><b>⚠️ Status: Butuh Revisi.</b> Segel naskah telah dibuka oleh Instruktur. Silakan perbaiki celah pemikiran dan kirim ulang naskah Anda.</p>
                       </div>
                    )}

                    {!isKutipanLocked ? (
                       <div style={{border: '1px solid #e2e8f0', padding: '25px', borderRadius: '12px', background: '#f8fafc', boxShadow: '0 2px 4px rgba(0,0,0,0.01)'}}>
                          <label style={{fontWeight: '800', color: '#0f172a', fontSize: '16px'}}>Tahap 1: Masukkan Kutipan Masalah Utama</label>
                          <p style={{fontSize: '14px', color: '#64748b', marginTop: '8px', marginBottom: '20px', lineHeight: '1.6'}}>Pada tahap awal ini, kamu masih dibebaskan mencari dan menempel (*copy-paste*) premis rujukan. Setelah kutipan dikunci, **Sistem Integritas Anti-Kecurangan** akan langsung aktif mengawasi layar.</p>
                          <textarea rows="4" placeholder="Tempelkan premis atau kutipan asli dari sumber yang ingin dianalisis di sini..." value={naskahText} onChange={(e) => setNaskahText(e.target.value)} style={{...styles.textarea, marginBottom: '20px'}} required />
                          <button type="button" style={styles.btnPrimary} onClick={handleLockKutipan}>
                             Kunci Kutipan & Lanjut Tahap Analisis
                          </button>
                       </div>
                    ) : (
                       <form onSubmit={handleSubmitCanvas}>
                          <div style={styles.monitor}>
                            <span>Integritas Layar (Pindah Tab): <b style={{color: tabSwitchCount > 0 ? '#dc2626' : '#16a34a'}}>{tabSwitchCount}x</b></span>
                            <span>Integritas Input (Paste): <b style={{color: isPasted ? '#dc2626' : '#16a34a'}}>{isPasted ? 'Terdeteksi' : 'Aman'}</b></span>
                          </div>

                          <div style={{background: '#f1f5f9', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #e2e8f0'}}>
                             <p style={{margin: '0 0 8px 0', fontSize: '14px', color: '#475569', fontWeight: '700'}}>Kutipan Tersimpan:</p>
                             <p style={{margin: 0, fontStyle: 'italic', color: '#334155', lineHeight: '1.6'}}>{naskahText}</p>
                             <button type="button" onClick={() => setIsKutipanLocked(false)} style={{...styles.textBtn, padding: '10px 0 0 0', fontSize: '13px', marginTop: '10px', color: '#2563eb'}}>Buka Kunci & Edit Kutipan</button>
                          </div>

                          <h3 style={{borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px', color: '#0f172a'}}>Tahap 2: Dekonstruksi Berdasarkan Indikator</h3>
                          
                          {activeIndicatorsList.map((ind, index) => (
                             <div key={ind.id} style={{marginBottom: '30px'}}>
                               <div style={styles.promptBox}>
                                  <p style={{margin: '0 0 8px 0', fontWeight: '800', color: '#0f172a', fontSize: '15px'}}>KOTAK {index + 1}: {ind.name}</p>
                                  <p style={{margin: 0, fontSize: '13.5px', color: '#475569', lineHeight: '1.6'}}>
                                    <b>Pemantik:</b> {ind.prompt}
                                  </p>
                               </div>
                               <textarea 
                                 rows="4" 
                                 placeholder={`Ketik analisis untuk ${ind.name} di sini...`} 
                                 value={answers[ind.id] || ''} 
                                 onChange={(e) => handleAnswerChange(ind.id, e.target.value)} 
                                 onPaste={() => setIsPasted(true)} 
                                 style={{...styles.textarea, marginBottom: '10px'}} 
                                 required 
                               />
                             </div>
                          ))}

                          <button type="submit" style={{...styles.btnPrimary, opacity: isSubmittingTask ? 0.7 : 1, marginTop: '10px'}} disabled={isSubmittingTask}>
                            {isSubmittingTask ? 'Memproses Validasi Karya...' : isBypassAI ? 'Kirim Kanvas ke Meja Instruktur' : 'Kunci Nalar & Dapatkan Evaluasi AI Sistem'}
                          </button>
                       </form>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'portfolio' && (
              <div className={activeTab === 'portfolio' ? "print-area" : ""}>
                <div style={{marginBottom: '15px', display: 'flex', justifyContent: 'flex-end'}} className="no-print">
                  <button style={styles.btnSecondary} onClick={() => window.print()}>🖨️ Cetak Lembar Dokumen</button>
                </div>
                {activePortfolio ? (
                  <div style={styles.certBox}>
                    <h3 style={{marginTop: 0, textAlign: 'center', fontSize: '20px', color: '#0f172a'}}>DOKUMEN VALIDASI NALAR<br/><span style={{fontSize: '15px', color: '#475569', fontWeight: '600'}}>PENA Pilar 2 - Ekosistem Platform 5</span></h3>
                    <p style={{fontSize: '12px', color: '#64748b', textAlign: 'center', marginBottom: '25px', letterSpacing: '1px'}}>ID Validasi Sistem: {activePortfolio.certNumber}</p>
                    
                    <div style={{display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '25px'}}>
                        <p style={{margin: 0, fontSize: '14px'}}><b>Kreator/Peserta:</b><br/>{activePortfolio.studentName}</p>
                        <div style={{textAlign: 'right'}}>
                            <p style={{margin: '0 0 5px 0', fontSize: '14px'}}><b>Status Dokumen:</b></p>
                            <span style={{padding: '6px 12px', background: activePortfolio.status.includes('Ditolak') ? '#fee2e2' : '#e2e8f0', color: activePortfolio.status.includes('Ditolak') ? '#b91c1c' : '#0f172a', borderRadius: '6px', fontWeight: '800', fontSize: '13px'}}>{activePortfolio.status}</span>
                        </div>
                    </div>
                    
                    <p style={{fontSize: '14px', color: '#475569', marginBottom: '8px', fontWeight: '600'}}>Kutipan Permasalahan Fundamental:</p>
                    <p style={{background: '#fff', padding: '15px', borderRadius: '8px', fontStyle: 'italic', border: '1px solid #e2e8f0', color: '#334155', lineHeight: '1.6'}}>{activePortfolio.naskahText}</p>
                    
                    <p style={{fontSize: '14px', color: '#475569', marginTop: '25px', marginBottom: '8px', fontWeight: '600'}}>Resolusi Kritis Berdasarkan Indikator:</p>
                    <div style={{background: '#fff', padding: '20px', borderRadius: '8px', whiteSpace: 'pre-wrap', border: '1px solid #e2e8f0', lineHeight: '1.7', color: '#1e293b', fontSize: '14.5px'}}>
                      {activePortfolio.deconstructionText}
                    </div>

                    <div style={{background: activePortfolio.diagnosis.includes('MANUAL') ? '#fefce8' : '#f0fdf4', padding: '20px', borderLeft: `5px solid ${activePortfolio.diagnosis.includes('MANUAL') ? '#eab308' : '#16a34a'}`, marginTop: '25px', borderRadius: '0 8px 8px 0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'}}>
                      <p style={{margin: '0 0 10px 0', color: activePortfolio.diagnosis.includes('MANUAL') ? '#854d0e' : '#166534', fontSize: '15px'}}><b>🤖 Laporan Evaluasi Mesin AI PENA:</b></p>
                      <p style={{margin: 0, lineHeight: '1.7', fontSize: '14px', color: activePortfolio.diagnosis.includes('MANUAL') ? '#713f12' : '#14532d'}}>{activePortfolio.diagnosis.replace('[HASIL EVALUASI AI] ', '')}</p>
                    </div>
                    
                    {activePortfolio.teacherFeedback && (
                      <div style={{background: '#eff6ff', padding: '20px', borderLeft: '5px solid #2563eb', marginTop: '20px', borderRadius: '0 8px 8px 0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'}}>
                         <p style={{margin: '0 0 10px 0', color: '#1e3a8a', fontSize: '15px'}}><b>👨‍🏫 Catatan Otentik Instruktur:</b></p>
                         <p style={{margin: 0, color: '#1e40af', lineHeight: '1.7', fontSize: '14px'}}>{activePortfolio.teacherFeedback}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{...styles.card, textAlign: 'center', padding: '40px'}}><p style={{margin: 0, color: '#64748b', fontSize: '15px'}}>Belum ada artefak pemikiran yang diproses dalam sistem.</p></div>
                )}
              </div>
            )}
          </>
        )}

        {userRole === 'guru' && (
          <>
            {activeTab === 'guruDashboard' && (
              <div className={activeTab === 'guruDashboard' ? "print-area" : ""}>
                <div style={styles.card} className="responsive-card">
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px'}}>
                    <h2 style={{margin: 0, color: '#0f172a'}}>Dasbor Penilaian Karya</h2>
                    <div className="no-print" style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
                      <button style={{...styles.btnPrimary, background: '#16a34a', padding: '10px 18px', width: 'auto'}} onClick={handleExportCSV}>📥 Ekspor CSV</button>
                      <button style={styles.btnSecondary} onClick={() => window.print()}>🖨️ Cetak Arsip</button>
                    </div>
                  </div>
                  
                  {submissions.length === 0 ? <p style={{color: '#64748b', fontSize: '14.5px', background: '#f8fafc', padding: '25px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center'}}>Belum ada artefak nalar siswa yang masuk ke dalam sistem evaluasi.</p> : (
                    <div style={{overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px'}}>
                      <table style={styles.table} className="responsive-table">
                        <thead style={{background: '#f8fafc'}}>
                          <tr>
                            <th style={{textAlign: 'left', padding: '15px', color: '#475569'}}>Identitas Peserta</th>
                            <th style={{textAlign: 'left', padding: '15px', color: '#475569'}}>Status Putusan</th>
                            <th className="no-print" style={{textAlign: 'right', padding: '15px', color: '#475569'}}>Aksi Manajerial</th>
                          </tr>
                        </thead>
                        <tbody>
                          {submissions.map(sub => (
                            <tr key={sub.id} style={{borderTop: '1px solid #e2e8f0', transition: 'all 0.2s', background: '#fff'}}>
                              <td style={{padding: '18px 15px'}}>
                                <b style={{fontSize: '15px', color: '#0f172a'}}>{sub.studentName}</b><br/>
                                <span style={{fontSize: '12.5px', color: '#64748b', marginTop: '5px', display: 'inline-block'}}>
                                  Pelanggaran: <span style={{color: sub.tabSwitches > 0 || sub.hasCopyPasted ? '#dc2626' : '#16a34a', fontWeight: '800'}}>{sub.tabSwitches} Tab | {sub.hasCopyPasted ? 'Indikasi Paste' : 'Bersih'}</span>
                                </span>
                              </td>
                              <td style={{padding: '18px 15px', fontWeight: '700', fontSize: '14px', color: sub.status.includes('Ditolak') ? '#dc2626' : '#334155'}}>{sub.status}</td>
                              <td style={{padding: '18px 15px', textAlign: 'right'}} className="no-print">
                                <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap'}}>
                                  <button style={styles.btnTable} onClick={() => setSelectedSubmission(sub)}>Tinjau Artefak</button>
                                  <button style={{...styles.btnTable, background: '#fee2e2', color: '#b91c1c'}} onClick={() => handleDeleteSubmission(sub.id)}>Hapus</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'guruSiswa' && (
              <div style={styles.card} className="no-print responsive-card">
                <h2 style={{color: '#0f172a', marginTop: 0}}>Otoritas Peserta Uji</h2>
                <div style={{background: '#f8fafc', padding: '20px', borderRadius: '12px', fontSize: '14.5px', marginBottom: '30px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.01)'}}>
                  🔑 <b>KODE AKSES RESMI KELAS: <span style={{fontSize: '24px', color: '#b91c1c', letterSpacing: '3px', marginLeft: '10px'}}>{currentClass?.classCode}</span></b><br/><br/>
                  <span style={{color: '#475569', lineHeight: '1.6'}}>Berikan kode di atas kepada peserta. Daftarkan nama asli peserta di bawah ini untuk menghasilkan **PIN Unik Otentikasi** milik mereka.</span>
                </div>
                
                <form onSubmit={handleAddStudent} style={{display: 'flex', gap: '12px', marginBottom: '30px', flexWrap: 'wrap'}}>
                  <input name="sName" type="text" placeholder="Masukkan nama lengkap siswa..." style={{...styles.input, margin: 0, flex: '1 1 200px'}} required autoComplete="off" />
                  <button type="submit" style={{...styles.btnPrimary, flex: '1 1 auto', margin: 0, padding: '15px 30px'}}>Daftarkan Peserta</button>
                </form>
                
                <ul style={{paddingLeft: 0, listStyle: 'none', margin: 0}}>
                  {students.map(s => (
                    <li key={s.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', marginBottom: '10px', flexWrap: 'wrap', gap: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.01)'}}>
                      <span style={{fontSize: '15px'}}><b>{s.name}</b> <span style={{margin: '0 12px', color: '#cbd5e1'}}>|</span> PIN Identitas: <span style={{color: '#dc2626', fontWeight: '900', letterSpacing: '1.5px', fontSize: '16px'}}>{s.pin}</span></span>
                      <button style={{background: '#fee2e2', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: '800', padding: '10px 15px', borderRadius: '6px', fontSize: '13px'}} onClick={() => handleRemoveStudent(s.id)}>Cabut Akses Siswa</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeTab === 'guruIndikator' && (
               <div style={styles.card} className="no-print responsive-card">
                  <h2 style={{color: '#0f172a', marginTop: 0}}>Manajemen Indikator Analitik</h2>
                  <p style={{fontSize: '14.5px', color: '#475569', marginBottom: '25px', lineHeight: '1.6'}}>Indikator ini akan menjadi acuan isian kotak tugas bagi siswa dan menjadi patokan mutlak evaluasi bagi Mesin AI. (Maksimal 10 Indikator)</p>
                  
                  <div style={{background: '#f1f5f9', padding: '20px', borderRadius: '12px', marginBottom: '30px'}}>
                     <h3 style={{marginTop: 0, fontSize: '16px'}}>Tambah Indikator Baru</h3>
                     <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                        <input type="text" placeholder="Nama Indikator (Contoh: Analisis SWOT)" value={newIndName} onChange={(e) => setNewIndName(e.target.value)} style={styles.input} />
                        <textarea rows="2" placeholder="Pemantik/Instruksi Siswa (Contoh: Jabarkan kekuatan dan kelemahan...)" value={newIndPrompt} onChange={(e) => setNewIndPrompt(e.target.value)} style={styles.textarea} />
                        <button type="button" onClick={handleAddIndicator} style={{...styles.btnSecondary, background: '#e2e8f0', color: '#0f172a', border: 'none'}}>+ Tambahkan ke Daftar</button>
                     </div>
                  </div>

                  <ul style={{paddingLeft: 0, listStyle: 'none', margin: 0, marginBottom: '30px'}}>
                     {localIndicators.map((ind, index) => (
                        <li key={ind.id} style={{background: '#fff', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '8px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px'}}>
                           <div style={{flex: '1 1 200px'}}>
                              <p style={{margin: '0 0 5px 0', fontWeight: '800', color: '#0f172a'}}>KOTAK {index + 1}: {ind.name}</p>
                              <p style={{margin: 0, fontSize: '13.5px', color: '#64748b', lineHeight: '1.5'}}>{ind.prompt}</p>
                           </div>
                           <button style={{background: '#fee2e2', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: '800', padding: '8px 12px', borderRadius: '6px', fontSize: '12px'}} onClick={() => handleRemoveIndicator(ind.id)}>Hapus</button>
                        </li>
                     ))}
                  </ul>

                  <button type="button" onClick={handleSaveIndicatorsToDB} style={{...styles.btnPrimary, background: '#2563eb'}}>Simpan Seluruh Indikator ke Kelas</button>
               </div>
            )}

            {selectedSubmission && (
              <div style={styles.modalOverlay} className="no-print">
                <div style={styles.modalCardLarge} className="responsive-card">
                  <h3 style={{marginTop: 0, color: '#0f172a', fontSize: '22px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px'}}>Tinjauan Orisinalitas & Nalar</h3>
                  
                  {(selectedSubmission.tabSwitches > 0 || selectedSubmission.hasCopyPasted) && (
                     <div style={{background: '#fef2f2', borderLeft: '4px solid #dc2626', padding: '15px', marginBottom: '20px', borderRadius: '6px'}}>
                        <p style={{margin: 0, color: '#b91c1c', fontSize: '14px', fontWeight: '800'}}>🚩 PERINGATAN KECURANGAN: Anak ini terdeteksi {selectedSubmission.tabSwitches > 0 ? `Pindah Tab ${selectedSubmission.tabSwitches} kali` : ''} {selectedSubmission.hasCopyPasted ? '& Melakukan Copy-Paste' : ''} saat menyusun kerangka argumen.</p>
                     </div>
                  )}

                  <div style={{fontSize: '14.5px', background: '#f8fafc', padding: '25px', borderRadius: '12px', margin: '20px 0', maxHeight: '400px', overflowY: 'auto', border: '1px solid #e2e8f0'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #cbd5e1', paddingBottom: '15px', marginBottom: '20px'}}>
                      <p style={{margin: 0, fontSize: '15px'}}><b>Kreator Naskah:</b> {selectedSubmission.studentName}</p>
                      <p style={{margin: 0, color: '#64748b'}}>Waktu Kirim: {selectedSubmission.timestamp}</p>
                    </div>
                    
                    <p style={{color: '#475569', margin: '0 0 8px 0', fontWeight: '700'}}>Kutipan Permasalahan (Premis):</p>
                    <p style={{background: '#fff', padding: '15px', borderRadius: '8px', fontStyle: 'italic', border: '1px solid #e2e8f0', margin: '0 0 25px 0', overflowWrap: 'break-word', color: '#334155'}}>{selectedSubmission.naskahText}</p>
                    
                    <p style={{color: '#475569', margin: '0 0 8px 0', fontWeight: '700'}}>Argumen Dekonstruksi Siswa:</p>
                    <div style={{whiteSpace: 'pre-wrap', color: '#1e293b', background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', lineHeight: '1.7', overflowWrap: 'break-word'}}>{selectedSubmission.deconstructionText}</div>
                    
                    <div style={{background: selectedSubmission.diagnosis.includes('MANUAL') ? '#fefce8' : '#f0fdf4', padding: '20px', borderLeft: `5px solid ${selectedSubmission.diagnosis.includes('MANUAL') ? '#eab308' : '#16a34a'}`, marginTop: '25px', borderRadius: '0 8px 8px 0'}}>
                      <p style={{margin: '0 0 10px 0', color: selectedSubmission.diagnosis.includes('MANUAL') ? '#854d0e' : '#166534', fontSize: '15px'}}><b>🤖 Laporan Evaluasi Mesin AI PENA:</b></p>
                      <span style={{color: selectedSubmission.diagnosis.includes('MANUAL') ? '#713f12' : '#14532d', lineHeight: '1.7', display: 'block', overflowWrap: 'break-word'}}>{selectedSubmission.diagnosis.replace('[HASIL EVALUASI AI] ', '')}</span>
                    </div>
                  </div>
                  
                  <label style={{fontSize: '14.5px', fontWeight: '800', color: '#0f172a'}}>Keputusan Otentik Instruktur (Catatan Rapor):</label>
                  <textarea rows="3" placeholder="Sampaikan keputusan final Anda secara komprehensif..." value={teacherNoteInput} onChange={(e) => setTeacherNoteInput(e.target.value)} style={{...styles.textarea, marginTop: '10px', marginBottom: '25px'}} />
                  
                  <div style={styles.modalActions}>
                    <button style={{...styles.btnPrimary, flex: '1 1 200px', background: '#16a34a'}} onClick={() => handleTeacherAction(selectedSubmission.id, 'Disetujui Otoritas (ACC)')}>ACC (Lolos Validasi Nalar)</button>
                    <button style={{...styles.btnDanger, flex: '1 1 200px'}} onClick={() => handleTeacherAction(selectedSubmission.id, 'Karya Ditolak / Revisi')}>Buka Segel (Kembalikan/Revisi)</button>
                  </div>
                  <button style={{...styles.textBtn, width: '100%', marginTop: '15px', color: '#64748b'}} onClick={() => setSelectedSubmission(null)}>Batal & Tutup Panel Dokumen</button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

const styles = {
  appContainer: { maxWidth: '950px', width: '100%', boxSizing: 'border-box', margin: '30px auto', padding: '20px', color: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '30px', flexWrap: 'wrap', gap: '10px' },
  logoText: { margin: 0, fontSize: '24px', fontWeight: '900', letterSpacing: '0.5px', color: '#0f172a' },
  
  heroCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '5%', boxSizing: 'border-box', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)' },
  badgeLabel: { background: '#eff6ff', color: '#1d4ed8', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '800', display: 'inline-block', marginBottom: '15px' },
  titleHero: { fontSize: '30px', fontWeight: '900', marginBottom: '15px', color: '#0f172a', lineHeight: '1.2' },
  subtitleHero: { fontSize: '15px', color: '#475569', lineHeight: '1.7', maxWidth: '750px', margin: '0 auto' },
  
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '5%', boxSizing: 'border-box', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' },
  introBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '30px', fontSize: '14.5px', overflowWrap: 'break-word', color: '#334155' },
  
  gridMenu: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
  menuBox: { flex: '1 1 230px', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '30px 25px', cursor: 'pointer', textAlign: 'center', background: '#fff', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', boxSizing: 'border-box' },
  iconCircle: { fontSize: '40px', marginBottom: '15px' },
  menuTitle: { fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px 0' },
  menuDesc: { fontSize: '14px', color: '#64748b', margin: 0, lineHeight: '1.6' },
  
  form: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' },
  label: { fontSize: '14.5px', fontWeight: '700', color: '#334155', marginBottom: '-5px' },
  input: { width: '100%', padding: '16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '15px', boxSizing: 'border-box', outline: 'none', background: '#f8fafc' },
  textarea: { width: '100%', padding: '16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '15px', boxSizing: 'border-box', resize: 'vertical', outline: 'none', lineHeight: '1.6', background: '#f8fafc' },
  
  btnPrimary: { background: '#0f172a', color: '#fff', border: 'none', padding: '16px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', width: '100%', fontSize: '15px', boxSizing: 'border-box' },
  btnSecondary: { background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '14px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14.5px' },
  btnDanger: { background: '#dc2626', color: '#fff', border: 'none', padding: '16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', fontSize: '15px', boxSizing: 'border-box' },
  btnTable: { background: '#0f172a', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13.5px', fontWeight: '700', whiteSpace: 'nowrap' },
  textBtn: { background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '14.5px', textDecoration: 'underline', padding: '10px', fontWeight: '700' },
  backBtn: { background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', fontSize: '15px', marginBottom: '25px', padding: 0, fontWeight: '900' },
  
  navBar: { display: 'flex', gap: '12px', marginBottom: '30px', alignItems: 'center', flexWrap: 'wrap' },
  navBadge: { background: '#e2e8f0', padding: '12px 18px', borderRadius: '10px', fontSize: '13.5px', fontWeight: '800', color: '#0f172a', display: 'inline-block' },
  navBtn: { background: '#fff', border: '1px solid #cbd5e1', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', color: '#334155', fontWeight: '700', flex: '1 1 auto', textAlign: 'center', boxSizing: 'border-box' },
  navActive: { background: '#0f172a', color: '#fff', border: '1px solid #0f172a', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', fontWeight: '800', flex: '1 1 auto', textAlign: 'center', boxSizing: 'border-box' },
  
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999, padding: '20px', boxSizing: 'border-box', backdropFilter: 'blur(4px)' },
  modalCard: { background: '#fff', padding: '40px 30px', borderRadius: '16px', width: '100%', maxWidth: '420px', boxSizing: 'border-box', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', maxHeight: '90vh', overflowY: 'auto' },
  modalCardLarge: { background: '#fff', padding: '40px 30px', borderRadius: '16px', width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)' },
  modalTitle: { margin: '0 0 10px 0', fontSize: '22px', color: '#0f172a', fontWeight: '900', textAlign: 'center' },
  modalDesc: { margin: '0 0 25px 0', fontSize: '14px', color: '#64748b', textAlign: 'center', lineHeight: '1.6' },
  modalActions: { display: 'flex', gap: '15px', marginTop: '30px', alignItems: 'center', flexWrap: 'wrap' },
  
  contactBox: { marginTop: '30px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '13.5px', color: '#475569' },
  contactLink: { color: '#2563eb', fontWeight: '800', textDecoration: 'none', fontSize: '15px' },
  
  monitor: { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '18px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '30px', borderRadius: '10px' },
  promptBox: { background: '#f8fafc', borderLeft: '5px solid #0f172a', padding: '22px', margin: '20px 0', borderRadius: '0 10px 10px 0' },
  certBox: { border: '1px solid #e2e8f0', padding: '6%', background: '#fff', borderRadius: '16px', boxSizing: 'border-box', overflowWrap: 'break-word', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '550px' },
  main: { marginTop: '30px' }
};
