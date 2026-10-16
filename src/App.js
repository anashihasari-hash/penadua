import React, { useState, useEffect } from 'react';

// ==========================================
// SESSION HELPER & CONFIG (UTUH 100%)
// ==========================================
const session = {
  set: (key, val) => {
    if (val === null || val === undefined || val === 'null') {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(val));
    }
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
const GEMINI_MODEL = "gemini-3.8-flash"; // MESIN AI SAKTI TERBUKTI JALAN

// ==========================================
// 🧠 OTAK AI SAKTI (AUTO-RETRY & PAYLOAD LENGKAP)
// ==========================================
const callGeminiAPI = async (prompt, apiKey, retries = 3) => {
  if (!apiKey || !apiKey.trim()) throw new Error("API Key belum dimasukkan!");

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey.trim()}`;
  
  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  };

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if ((response.status === 429 || response.status >= 500) && attempt < retries - 1) {
        console.warn(`Server AI Google Sibuk (${response.status}). Mencoba ulang... (${attempt + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, 3000)); 
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ditolak Google (Status ${response.status}): ${errText}`);
      }

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0) {
        return result.candidates[0].content.parts[0].text;
      }
      throw new Error("Format respon AI tidak terbaca");
    } catch (err) {
      if (attempt === retries - 1) throw err;
    }
  }
};

export default function App() {
  const [userRole, setUserRole] = useState(() => session.get('PENA_ROLE', null)); 
  const [activeTab, setActiveTab] = useState(() => session.get('PENA_TAB', 'landing'));
  const [currentClass, setCurrentClass] = useState(() => session.get('PENA_CLASS', null));
  const [currentStudent, setCurrentStudent] = useState(() => session.get('PENA_STUDENT', null));
  
  const defaultSysKey = process.env.REACT_APP_GEMINI_API_KEY || "";
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('PENA_AI_KEY') || defaultSysKey);
  
  const [isApiValid, setIsApiValid] = useState(() => {
    const active = localStorage.getItem('PENA_AI_KEY') || defaultSysKey;
    return active.length > 5;
  });

  const [isBypassAI, setIsBypassAI] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [isValidatingApi, setIsValidatingApi] = useState(false);

  const [isPasted, setIsPasted] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [formData, setFormData] = useState({ naskahText: '', ennisText: '', polyaText: '' });

  const [classCodeInput, setClassCodeInput] = useState('');
  const [loginStudentName, setLoginStudentName] = useState('');
  const [loginStudentPin, setLoginStudentPin] = useState('');

  // 🛡️ AUTO-HEALING & SAFETY SESSION SYNC
  useEffect(() => {
    if ((userRole === 'siswa' || userRole === 'mandiri') && !currentStudent) {
        handleLogout();
        return;
    }
    if (userRole === 'siswa' || userRole === 'mandiri') {
        if (activeTab === 'guruDashboard' || activeTab === 'guruSiswa') {
            setActiveTab('introSiswa');
        }
    } else if (userRole === 'guru') {
        if (activeTab !== 'guruDashboard' && activeTab !== 'guruSiswa') {
            setActiveTab('guruDashboard');
        }
    }
    
    session.set('PENA_ROLE', userRole);
    session.set('PENA_TAB', activeTab);
    session.set('PENA_CLASS', currentClass);
    session.set('PENA_STUDENT', currentStudent);
  }, [userRole, activeTab, currentClass, currentStudent]);

  // 🌐 SINKRONISASI KELAS GLOBAL (MENGATASI KELAS TIDAK TERBUKA DI HP LAIN)
  const [allClasses, setAllClasses] = useState(() => {
    try { 
      const saved = localStorage.getItem('PENA_ALL_CLASSES'); 
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
    return [{ teacher: "Admin Utama", subject: "Pilar 2 Nalar", pin: "1234", classCode: "99999" }];
  });

  const [showAdminGate, setShowAdminGate] = useState(false);
  const [adminGateInput, setAdminGateInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  
  const [teacherNameInput, setTeacherNameInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  const [showMandiriModal, setShowMandiriModal] = useState(false);
  const [mandiriNameInput, setMandiriNameInput] = useState('');

  const getStorageKeys = (kelas, role) => {
    if (role === 'mandiri') return { students: 'PENA_MDR_STU_ISO', submissions: `PENA_MDR_SUB_ISO` };
    const safeCode = kelas?.classCode || kelas?.pin || '99999';
    return { students: `PENA_C_${safeCode}_STU`, submissions: `PENA_C_${safeCode}_SUB` };
  };

  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const safeSubmissions = Array.isArray(submissions) ? submissions : [];
  const safeStudents = Array.isArray(students) ? students : [];

  useEffect(() => {
    const loadClassData = () => {
      if (userRole === 'mandiri' && currentStudent) {
        const keys = getStorageKeys(null, 'mandiri');
        const savedSub = localStorage.getItem(keys.submissions);
        let parsedSub = [];
        try { if(savedSub) parsedSub = JSON.parse(savedSub); } catch(e){}
        setSubmissions(Array.isArray(parsedSub) ? parsedSub : []);
        setStudents([]);
        return;
      }
      const activeClassTarget = currentClass || allClasses[0];
      const keys = getStorageKeys(activeClassTarget, userRole);
      try {
        const savedStudents = localStorage.getItem(keys.students);
        let parsedStu = [];
        if (savedStudents) {
          try { parsedStu = JSON.parse(savedStudents); } catch(e){}
        }
        
        if (Array.isArray(parsedStu) && parsedStu.length > 0) { 
          setStudents(parsedStu); 
        } else if (userRole === 'guru') {
          const defaultStudents = [{ id: 1, name: 'Siswa Contoh', pin: '1234' }];
          setStudents(defaultStudents);
          localStorage.setItem(keys.students, JSON.stringify(defaultStudents));
        } else {
          setStudents([]);
        }

        const savedSub = localStorage.getItem(keys.submissions);
        let parsedSub = [];
        if (savedSub) {
          try { parsedSub = JSON.parse(savedSub); } catch(e){}
        }
        setSubmissions(Array.isArray(parsedSub) ? parsedSub : []);
      } catch (e) { 
        setSubmissions([]); setStudents([]);
      }
    };

    loadClassData();
    window.addEventListener('storage', loadClassData);
    return () => window.removeEventListener('storage', loadClassData);
  }, [currentClass, userRole, currentStudent]);

  const resetCanvasState = () => {
    setFormData({ naskahText: '', ennisText: '', polyaText: '' });
    setIsPasted(false);
    setTabSwitchCount(0);
  };

  const handleVerifyClassCode = (e) => {
    e.preventDefault();
    const cleanCode = classCodeInput.trim();
    const foundClass = allClasses.find(c => c?.classCode === cleanCode || c?.pin === cleanCode);
    if (foundClass) {
      setCurrentClass(foundClass);
      alert(`✅ Kelas ${foundClass.subject} (${foundClass.teacher}) ditemukan!`);
    } else {
      alert('❌ Kode Akses Kelas tidak ditemukan. Pastikan guru sudah membuat kelas atau gunakan kode universal: 99999');
      setCurrentClass(null);
    }
  };

  const handleStudentLoginFinal = (e) => {
    e.preventDefault();
    const inputName = loginStudentName.trim().toLowerCase();
    const keys = getStorageKeys(currentClass || allClasses[0], 'siswa');
    const savedStu = localStorage.getItem(keys.students);
    
    let freshStudentList = [];
    try { 
      const parsed = JSON.parse(savedStu); 
      if (Array.isArray(parsed)) freshStudentList = parsed;
    } catch(err) {}

    const student = freshStudentList.find(s => s?.name?.trim().toLowerCase() === inputName && s?.pin === loginStudentPin.trim());
    
    if (student) {
      setCurrentStudent(student);
      setUserRole('siswa');
      setIsBypassAI(false);
      resetCanvasState(); 
      setActiveTab('introSiswa'); 
    } else {
      alert('❌ Nama atau PIN Siswa salah.');
    }
  };

  const handleAdminGateSubmit = (e) => {
    e.preventDefault();
    if (adminGateInput === MASTER_ADMIN_PASSWORD) {
      setShowAdminGate(false);
      setTeacherNameInput(''); setSubjectInput(''); setPinInput('');
      setShowPinModal(true);
      setAdminGateInput('');
    } else { alert('❌ Sandi Admin salah.'); }
  };

  const handleRegisterOrLoginGuru = (e) => {
    e.preventDefault();
    const tName = teacherNameInput.trim();
    const sName = subjectInput.trim();
    const pin = pinInput.trim();
    
    let targetClass = allClasses.find(c => c?.teacher?.toLowerCase() === tName.toLowerCase() && c?.subject?.toLowerCase() === sName.toLowerCase());
    if (targetClass) { if (targetClass.pin !== pin) { alert('❌ Sandi (PIN) guru salah!'); return; } } 
    else {
      const classCode = Math.floor(10000 + Math.random() * 90000).toString();
      targetClass = { teacher: tName, subject: sName, pin: pin, classCode: classCode };
      const updated = [...allClasses, targetClass];
      setAllClasses(updated);
      localStorage.setItem('PENA_ALL_CLASSES', JSON.stringify(updated));
      alert(`🎉 KELAS DIBUAT!\nKODE AKSES MURID: ${classCode}`);
    }
    
    setCurrentClass(targetClass); setUserRole('guru');
    setShowPinModal(false); setActiveTab('guruDashboard');
  };

  const handleForceDeleteGuruClass = () => {
    if(window.confirm('🚨 Hapus paksa histori kelas ini?')) {
      const tName = teacherNameInput.trim().toLowerCase();
      const sName = subjectInput.trim().toLowerCase();
      const updatedClasses = allClasses.filter(c => !(c?.teacher?.toLowerCase() === tName && c?.subject?.toLowerCase() === sName));
      setAllClasses(updatedClasses);
      localStorage.setItem('PENA_ALL_CLASSES', JSON.stringify(updatedClasses));
      alert('Histori dibersihkan.');
    }
  };

  const handleMandiriLogin = (e) => {
    e.preventDefault();
    const name = mandiriNameInput.trim();
    if (!name) return;
    
    localStorage.removeItem('PENA_MDR_SUB_ISO');
    setCurrentClass(null);
    const newMandiriStudent = { id: 'mandiri-' + Date.now(), name };
    setCurrentStudent(newMandiriStudent);
    setUserRole('mandiri'); 
    setSubmissions([]); 
    setIsBypassAI(false);
    resetCanvasState(); 
    
    setShowMandiriModal(false); 
    setActiveTab('introSiswa'); 
  };

  const handleLogout = () => {
    session.clear(); 
    setCurrentStudent(null); setCurrentClass(null); setUserRole(null);
    setSubmissions([]); setStudents([]); 
    setActiveTab('landing'); 
    resetCanvasState();
    setClassCodeInput(''); setLoginStudentName(''); setLoginStudentPin('');
    setTeacherNameInput(''); setSubjectInput(''); setPinInput(''); setMandiriNameInput('');
    setIsApiValid(false);
  };

  // Anti-Cheat: Lacak Pindah Tab saat siswa menjawab
  useEffect(() => {
    if (activeTab !== 'workspace' || !currentStudent) return;
    const handleVisibilityChange = () => { if (document.hidden) setTabSwitchCount(prev => prev + 1); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTab, currentStudent]);

  const activeSubmissionId = safeSubmissions.find(s => s?.studentName === currentStudent?.name)?.id;
  const activePortfolio = safeSubmissions.find(s => s?.id === activeSubmissionId);
  
  const isWorkspaceLocked = activePortfolio && activePortfolio?.status !== 'Karya Ditolak / Revisi';
  const isWorkspaceAllowed = isApiValid || isBypassAI; 

  const checkApiValidity = async (e) => {
    e.preventDefault();
    const cleanKey = apiKey.trim();
    if (cleanKey.length < 5) { alert('❌ API Key tidak valid.'); return; }
    
    setIsValidatingApi(true);
    try {
      await callGeminiAPI("Balas dengan kata: KONEKSI OK", cleanKey, 2);
      
      localStorage.setItem('PENA_AI_KEY', cleanKey);
      setIsApiValid(true);
      setIsBypassAI(false);
      alert('✅ Kunci Tervalidasi Google! Segel Kanvas Terbuka.');
      setActiveTab('workspace');
    } catch (err) {
      setIsApiValid(false);
      alert(`❌ UJI PING GAGAL!\nPastikan API Key valid dan bukan akun di bawah 18 tahun.\n\nDetail: ${err.message}`);
    } finally {
      setIsValidatingApi(false);
    }
  };

  const handleBypassAI = () => {
    setIsBypassAI(true);
    alert('⚠️ Mesin AI Dinonaktifkan. Tugas akan dievaluasi secara manual oleh instruktur/guru.');
    setActiveTab('workspace');
  };

  const handleSubmitCanvas = async (e) => {
    e.preventDefault();
    setIsSubmittingTask(true);
    let diagnosis = "";
    const hasViolations = isPasted || tabSwitchCount > 0;

    if (hasViolations) {
      diagnosis = `[GAGAL INTEGRITAS] Terdeteksi perpindahan tab (${tabSwitchCount}x) atau copy-paste. Argumen didiskualifikasi otomatis.`;
    } else if (isBypassAI) {
      diagnosis = `[EVALUASI MANUAL] Mesin AI dinonaktifkan oleh pengguna. Menunggu tinjauan langsung dan validasi dari Guru.`;
    } else {
      const activeKeyToUse = localStorage.getItem('PENA_AI_KEY') || defaultSysKey;
      if (!activeKeyToUse) {
        alert('API Key tidak ditemukan. Silakan atur kembali di Pengaturan API Key.');
        setActiveTab('introSiswa'); setIsSubmittingTask(false); return;
      }
      try {
        const prompt = `Evaluasi karya analitis siswa berikut secara kritis dan tajam.\n\nKutipan Masalah Utama: "${formData.naskahText}"\n\nAnalisis Aspek Ennis Siswa: "${formData.ennisText}"\nAnalisis Aspek Polya Siswa: "${formData.polyaText}"\n\nInstruksi Evaluasi:\nNilai apakah analisis siswa logis, komprehensif, dan tidak asal-asalan dalam mengimplementasikan indikator Ennis dan Polya. Berikan diagnosis evaluatif (maksimal 4 kalimat) yang langsung menilai esensi jawaban siswa.`;
        
        const aiResponse = await callGeminiAPI(prompt, activeKeyToUse, 3);
        diagnosis = `[HASIL EVALUASI AI] ${aiResponse}`;

      } catch (err) {
        diagnosis = `[ERROR KONEKSI AI] Gagal menghubungi mesin analitis. Detail: ${err.message}.`;
      }
    }

    const combinedDeconstruction = `[ENNIS]: ${formData.ennisText}\n\n[POLYA]: ${formData.polyaText}`;

    const newSubmission = {
      id: Date.now(),
      certNumber: `PENA-26-${Math.floor(1000 + Math.random() * 9000)}`,
      studentName: currentStudent.name,
      mode: userRole === 'mandiri' ? 'Mandiri (Privat)' : 'Tugas Kelas',
      naskahText: formData.naskahText, 
      deconstructionText: combinedDeconstruction,
      diagnosis, hasCopyPasted: isPasted, tabSwitches: tabSwitchCount,
      timestamp: new Date().toLocaleString(),
      status: userRole === 'mandiri' ? 'Selesai (Auto)' : 'Pending Review Guru',
      teacherFeedback: ''
    };
    
    const updatedSubmissions = [newSubmission, ...safeSubmissions.filter(s => s?.studentName !== currentStudent.name)];
    setSubmissions(updatedSubmissions);
    
    const keys = getStorageKeys(currentClass || allClasses[0], userRole);
    localStorage.setItem(keys.submissions, JSON.stringify(updatedSubmissions));

    setIsPasted(false); setTabSwitchCount(0); setIsSubmittingTask(false);
    setActiveTab('portfolio');
  };

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [teacherNoteInput, setTeacherNoteInput] = useState('');

  const handleTeacherAction = (id, status) => {
    const updatedSubmissions = safeSubmissions.map(item => item?.id === id ? { ...item, status, teacherFeedback: teacherNoteInput } : item);
    setSubmissions(updatedSubmissions);
    const keys = getStorageKeys(currentClass || allClasses[0], userRole);
    localStorage.setItem(keys.submissions, JSON.stringify(updatedSubmissions));
    setSelectedSubmission(null); setTeacherNoteInput('');
  };

  const handleDeleteSubmission = (id) => {
    if(window.confirm('Yakin ingin menghapus hasil evaluasi siswa ini? Siswa harus mengulang tugasnya dari awal.')){
      const updatedSubmissions = safeSubmissions.filter(item => item?.id !== id);
      setSubmissions(updatedSubmissions);
      const keys = getStorageKeys(currentClass || allClasses[0], userRole);
      localStorage.setItem(keys.submissions, JSON.stringify(updatedSubmissions));
    }
  };

  const handleExportCSV = () => {
    if(safeSubmissions.length === 0) { alert("Tidak ada data untuk diekspor"); return; }
    
    const sanitize = (str) => {
      if(!str || typeof str !== 'string') return '""';
      const cleanStr = str.replace(/[\r\n]+/g, ' ').replace(/"/g, '""');
      return `"${cleanStr}"`;
    };

    const headers = ["ID Validasi", "Nama Siswa", "Waktu", "Status Putusan", "Pindah Tab", "Kutipan Naskah", "Uraian Siswa", "Laporan Hasil AI", "Catatan Guru"];
    const rows = safeSubmissions.map(s => [
      sanitize(s?.certNumber), sanitize(s?.studentName), sanitize(s?.timestamp), sanitize(s?.status), 
      s?.tabSwitches || 0, sanitize(s?.naskahText), sanitize(s?.deconstructionText), 
      sanitize(s?.diagnosis), sanitize(s?.teacherFeedback)
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Evaluasi_PENA_${currentClass?.subject || 'Mandiri'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDynamicPrompt = (text) => {
    if (!text || typeof text !== 'string' || text.trim() === '') return 'naskah tersebut';
    const words = text.trim().split(/\s+/);
    const preview = words.slice(0, 5).join(' ');
    return words.length > 5 ? `"${preview}..."` : `"${preview}"`;
  };

  return (
    <div style={styles.appContainer}>
      <style dangerouslySetInnerHTML={{ __html: `
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background-color: #f4f6f8; }
        @media print { 
          body * { visibility: hidden; } 
          .print-area, .print-area * { visibility: visible; } 
          .print-area { position: absolute; left: 0; top: 0; width: 100vw; padding: 0; margin: 0; background: white !important; } 
          .no-print { display: none !important; } 
        }
      `}} />

      <header style={styles.header} className="no-print">
        <h2 style={styles.logoText}>🛡️ PENA Pilar 2</h2>
        {userRole && <button style={styles.textBtn} onClick={handleLogout}>Keluar Sesi</button>}
      </header>

      {!userRole && activeTab === 'landing' && (
        <div style={styles.card} className="no-print">
          <h1 style={styles.title}>Platform Pertanggungjawaban Nalar</h1>
          <p style={styles.subtitle}>Proyek kanvas berbasis web untuk menguji orisinalitas karya dan kerangka pemikiran kritis (Ennis & Polya).</p>
          
          <div style={styles.gridMenu}>
            <div style={styles.menuBox} onClick={() => setActiveTab('loginSiswa')}>
              <h3>🎓 Siswa</h3><p>Masuk menggunakan kode akses kelas dari instruktur.</p>
            </div>
            <div style={styles.menuBox} onClick={() => setShowMandiriModal(true)}>
              <h3>👤 Mandiri</h3><p>Simulasi dan ujian personal secara terisolasi.</p>
            </div>
            <div style={styles.menuBox} onClick={() => setShowAdminGate(true)}>
              <h3>👨‍🏫 Guru / Admin</h3><p>Kelola evaluasi dan validasi nalar siswa.</p>
            </div>
          </div>
        </div>
      )}

      {showAdminGate && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard}>
            <h3>Akses Terbatas</h3>
            <form onSubmit={handleAdminGateSubmit}>
              <input type="password" placeholder="Sandi Master..." value={adminGateInput} onChange={(e) => setAdminGateInput(e.target.value)} style={styles.input} required />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Buka Portal</button>
                <button type="button" style={styles.textBtn} onClick={() => setShowAdminGate(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!userRole && activeTab === 'loginSiswa' && (
        <div style={styles.card} className="no-print">
          <button style={styles.backBtn} onClick={() => setActiveTab('landing')}>← Kembali</button>
          <h2>Akses Ruang Kelas</h2>
          {!currentClass ? (
            <form onSubmit={handleVerifyClassCode} style={styles.form}>
              <label>Kode Akses Kelas (5 Digit atau 99999):</label>
              <input type="text" placeholder="Contoh: 12345 / 99999" value={classCodeInput} onChange={(e) => setClassCodeInput(e.target.value)} style={styles.input} required autoComplete="off" />
              <button type="submit" style={styles.btnPrimary}>Cari Kelas</button>
            </form>
          ) : (
            <form onSubmit={handleStudentLoginFinal} style={styles.form}>
              <div style={styles.introBox}>📚 Kelas: <b>{currentClass?.subject || ''}</b> ({currentClass?.teacher || ''})</div>
              <label>Nama Lengkap:</label>
              <input type="text" value={loginStudentName} onChange={(e) => setLoginStudentName(e.target.value)} style={styles.input} required />
              <label>PIN Identitas (4 Digit):</label>
              <input type="password" value={loginStudentPin} onChange={(e) => setLoginStudentPin(e.target.value)} style={styles.input} required />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Masuk</button>
                <button type="button" style={styles.textBtn} onClick={() => setCurrentClass(null)}>Ganti Kelas</button>
              </div>
            </form>
          )}
        </div>
      )}

      {showPinModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard}>
            <h3>Otorisasi Instruktur</h3>
            <form onSubmit={handleRegisterOrLoginGuru} autoComplete="off">
              <label>Nama Guru:</label>
              <input type="text" value={teacherNameInput} onChange={(e) => setTeacherNameInput(e.target.value)} style={styles.input} required autoComplete="off" />
              <label>Mata Pelajaran:</label>
              <input type="text" value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} style={styles.input} required autoComplete="off" />
              <label>PIN Kelas Pengaman:</label>
              <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} style={styles.input} required autoComplete="new-password" />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Masuk / Buat Baru</button>
                <button type="button" style={styles.textBtn} onClick={() => setShowPinModal(false)}>Tutup</button>
              </div>
              <div style={{marginTop: '15px', textAlign: 'center'}}>
                <button type="button" onClick={handleForceDeleteGuruClass} style={{background: 'none', border: 'none', color: '#b91c1c', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer'}}>Lupa PIN? Hapus Histori Kelas</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMandiriModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard}>
            <h3>Mode Mandiri</h3>
            <form onSubmit={handleMandiriLogin}>
              <label>Nama Peserta Uji:</label>
              <input type="text" value={mandiriNameInput} onChange={(e) => setMandiriNameInput(e.target.value)} style={styles.input} required autoComplete="off" />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Mulai Eksekusi</button>
                <button type="button" style={styles.textBtn} onClick={() => setShowMandiriModal(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {userRole && (
        <nav style={styles.navBar} className="no-print">
          {(userRole === 'siswa' || userRole === 'mandiri') && (
            <>
              <span style={styles.navBadge}>{userRole === 'mandiri' ? 'Mode Privat' : (currentClass?.subject || 'Kelas')}</span>
              <button style={activeTab === 'introSiswa' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('introSiswa')}>Pengaturan API Key</button>
              
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
                Portofolio AI
              </button>
            </>
          )}
          {userRole === 'guru' && (
            <>
              <span style={styles.navBadge}>{currentClass?.subject || 'Kelas'} (Kode: {currentClass?.classCode || '99999'})</span>
              <button style={activeTab === 'guruDashboard' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('guruDashboard')}>Dasbor Evaluasi</button>
              <button style={activeTab === 'guruSiswa' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('guruSiswa')}>Kelola Peserta</button>
            </>
          )}
        </nav>
      )}

      <main style={styles.main}>
        {(userRole === 'siswa' || userRole === 'mandiri') && currentStudent && (
          <>
            {activeTab === 'introSiswa' && (
              <div style={styles.card} className="no-print">
                <h2>Konfigurasi Sistem Evaluasi</h2>
                
                <div style={{...styles.introBox, background: isApiValid ? '#f0fdf4' : '#fefce8', borderColor: isApiValid ? '#bbf7d0' : '#fef08a'}}>
                  <p style={{margin: '0 0 8px 0', color: isApiValid ? '#166534' : '#854d0e', fontSize: '13.5px'}}>
                    <b>Status Sistem Vercel Saat Ini: {isApiValid ? '✅ Siap (Tinggal Gas)' : '⚠️ Terkena Limit / Kosong'}</b>
                  </p>
                  {!isApiValid && (
                    <p style={{margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.5'}}>Sistem Utama AI belum mendeteksi sesi aktif. Selesaikan opsi di bawah untuk membuka segel Kanvas.</p>
                  )}
                </div>

                <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                  <div style={{border: '1px solid #e2e8f0', padding: '15px', borderRadius: '8px'}}>
                    <h3 style={{marginTop: 0, color: '#0f172a', fontSize: '16px'}}>Opsi Utama: Validasi Kunci AI Pribadi</h3>
                    <p style={{fontSize: '12.5px', color: '#475569', lineHeight: '1.5'}}>Mesin AI Gemini mengunci akses tanpa API Key yang sah. Dapatkan kunci AQ... di <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{color: '#2563eb', fontWeight: 'bold'}}>Google AI Studio</a>. <br/><b style={{color: '#dc2626'}}>(Wajib gunakan email @gmail.com pribadi dan usia 18+).</b></p>
                    
                    <form onSubmit={checkApiValidity}>
                      <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={{...styles.input, marginTop: '8px'}} placeholder="Tempel kunci API AQ... di sini..." required />
                      <button type="submit" style={{...styles.btnPrimary, marginTop: '12px', background: '#0f172a'}} disabled={isValidatingApi}>
                        {isValidatingApi ? 'Menguji Koneksi Google...' : 'Uji Ping & Buka Segel Kanvas'}
                      </button>
                    </form>
                  </div>

                  {userRole === 'siswa' && (
                    <div style={{border: '1px solid #fecaca', background: '#fef2f2', padding: '15px', borderRadius: '8px'}}>
                      <h3 style={{marginTop: 0, color: '#991b1b', fontSize: '16px'}}>Opsi Cadangan: Bypass Sistem (Evaluasi Manual)</h3>
                      <p style={{fontSize: '12.5px', color: '#991b1b', lineHeight: '1.5'}}>Jika kamu tidak memiliki kunci API, matikan integrasi AI. Jawaban Kanvas kamu akan langsung dikirim untuk dibaca dan dinilai secara manual oleh Guru.</p>
                      <button onClick={handleBypassAI} style={{...styles.btnPrimary, marginTop: '10px', background: '#dc2626'}}>Lanjutkan Tanpa AI (Manual Guru)</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'workspace' && (
              <div style={styles.card} className="no-print">
                {isWorkspaceLocked ? (
                  <div style={{textAlign: 'center', padding: '30px 15px'}}>
                    <h3 style={{fontSize: '20px'}}>Karya Telah Disegel 🔒</h3>
                    <p style={{color: '#64748b', fontSize: '13.5px', lineHeight: '1.5'}}>Tugas kamu sudah dikunci dan sedang direview. Buka tab Portofolio AI untuk melihat hasil analisis dan status dari guru.</p>
                  </div>
                ) : (
                  <>
                    <h2 style={{marginTop: 0, fontSize: '18px'}}>Kanvas Evaluasi Nalar Terpadu</h2>
                    
                    {isBypassAI && (
                       <div style={{background: '#fefce8', borderLeft: '4px solid #eab308', padding: '10px', marginBottom: '15px', borderRadius: '4px'}}>
                         <p style={{margin: 0, color: '#854d0e', fontSize: '13px'}}><b>ℹ️ Mode Bypass Aktif.</b> Sistem AI mati. Pastikan mengetik dengan jelas agar Guru mudah membaca.</p>
                       </div>
                    )}
                    {activePortfolio && activePortfolio?.status === 'Karya Ditolak / Revisi' && (
                       <div style={{background: '#fef2f2', borderLeft: '4px solid #dc2626', padding: '12px', marginBottom: '15px', borderRadius: '4px'}}>
                         <p style={{margin: 0, color: '#b91c1c', fontSize: '13px'}}><b>⚠️ Status: Revisi.</b> Segel telah dibuka oleh guru. Silakan perbaiki dekonstruksi Anda dan kirim ulang.</p>
                       </div>
                    )}

                    <div style={styles.monitor}>
                      <span>Tab Switch: <b style={{color: tabSwitchCount > 0 ? '#dc2626' : '#16a34a'}}>{tabSwitchCount}x</b></span>
                      <span>Paste: <b style={{color: isPasted ? '#dc2626' : '#16a34a'}}>{isPasted ? 'Gagal' : 'Aman'}</b></span>
                    </div>

                    <form onSubmit={handleSubmitCanvas}>
                      <label style={{fontWeight: '700', color: '#1e293b', fontSize: '13.5px'}}>1. Kutipan Sumber Masalah Utama:</label>
                      <textarea rows="3" placeholder="Masukkan premis asli..." value={formData.naskahText} onChange={(e) => setFormData({...formData, naskahText: e.target.value})} style={{...styles.textarea, marginBottom: '15px', marginTop: '5px'}} required />

                      <div style={styles.promptBox}>
                        <p style={{margin: '0 0 5px 0', fontWeight: 'bold', color: '#0f172a', fontSize: '13px'}}>🧠 Aspek Dekonstruksi ENNIS (5 Indikator)</p>
                        <p style={{margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.4'}}>
                          <b>Pemantik:</b> Uraikan penjelasan sederhana, kredibilitas data, deduksi/induksi, asumsi tersembunyi, dan taktik strategisnya terhadap topik <b>{getDynamicPrompt(formData.naskahText)}</b>!
                        </p>
                      </div>
                      <textarea rows="5" placeholder="Uraikan aspek Ennis..." value={formData.ennisText} onChange={(e) => setFormData({...formData, ennisText: e.target.value})} onPaste={() => setIsPasted(true)} style={{...styles.textarea, marginBottom: '15px'}} required />

                      <div style={{...styles.promptBox, borderLeftColor: '#3b82f6'}}>
                        <p style={{margin: '0 0 5px 0', fontWeight: 'bold', color: '#1d4ed8', fontSize: '13px'}}>⚙️ Aspek Penyelesaian POLYA (4 Tahapan)</p>
                        <p style={{margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.4'}}>
                          <b>Pemantik:</b> Jabarkan pemahaman masalah, rencana pemecahan, eksekusi data, dan evaluasi ulang terhadap konteks <b>{getDynamicPrompt(formData.naskahText)}</b>!
                        </p>
                      </div>
                      <textarea rows="5" placeholder="Uraikan aspek Polya..." value={formData.polyaText} onChange={(e) => setFormData({...formData, polyaText: e.target.value})} onPaste={() => setIsPasted(true)} style={{...styles.textarea, marginBottom: '15px'}} required />

                      <button type="submit" style={{...styles.btnPrimary, opacity: isSubmittingTask ? 0.7 : 1}} disabled={isSubmittingTask}>
                        {isSubmittingTask ? 'Memproses Karya...' : isBypassAI ? 'Kirim Kanvas ke Guru' : 'Kunci Nalar & Dapatkan Penilaian AI'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            {activeTab === 'portfolio' && (
              <div className={activeTab === 'portfolio' ? "print-area" : ""}>
                <div style={{marginBottom: '15px'}} className="no-print">
                  <button style={styles.btnSecondary} onClick={() => window.print()}>🖨️ Cetak Lembar Portofolio</button>
                </div>
                {activePortfolio ? (
                  <div style={styles.certBox}>
                    <h3 style={{marginTop: 0, textAlign: 'center', fontSize: '16px'}}>BUKTI OTENTISITAS NALAR<br/>Platform 5 - Buletin Pilar Pertama</h3>
                    <p style={{fontSize: '11px', color: '#666', textAlign: 'center', marginBottom: '15px'}}>Sistem Validasi ID: {activePortfolio?.certNumber || 'PENA-XX'}</p>
                    <p style={{fontSize: '13.5px'}}><b>Kreator / Peserta:</b> {activePortfolio?.studentName}</p>
                    <p style={{fontSize: '13.5px'}}><b>Status Dokumen:</b> <span style={{padding: '3px 8px', background: activePortfolio?.status?.includes('Ditolak') ? '#fee2e2' : '#e2e8f0', color: activePortfolio?.status?.includes('Ditolak') ? '#b91c1c' : '#0f172a', borderRadius: '4px', fontWeight: '700', fontSize: '12px'}}>{activePortfolio?.status || 'Pending'}</span></p>
                    
                    <hr style={{border: '0', borderTop: '1px dashed #cbd5e1', margin: '15px 0'}}/>
                    <p style={{fontSize: '12.5px', color: '#64748b', marginBottom: '4px'}}>Kutipan Permasalahan Original:</p>
                    <p style={{background: '#f8fafc', padding: '10px', borderRadius: '6px', fontStyle: 'italic', border: '1px solid #e2e8f0', fontSize: '13px'}}>"{activePortfolio?.naskahText || ''}"</p>
                    
                    <p style={{fontSize: '12.5px', color: '#64748b', marginTop: '12px', marginBottom: '4px'}}>Resolusi Kritis (Ennis & Polya):</p>
                    <div style={{background: '#f8fafc', padding: '12px', borderRadius: '6px', whiteSpace: 'pre-wrap', border: '1px solid #e2e8f0', lineHeight: '1.5', fontSize: '13px'}}>
                      {activePortfolio?.deconstructionText || ''}
                    </div>

                    <div style={{background: activePortfolio?.diagnosis?.includes('MANUAL') ? '#fefce8' : '#f0fdf4', padding: '12px', borderLeft: `4px solid ${activePortfolio?.diagnosis?.includes('MANUAL') ? '#eab308' : '#16a34a'}`, marginTop: '15px', borderRadius: '0 6px 6px 0', fontSize: '13px'}}>
                      <p style={{margin: '0 0 6px 0', color: activePortfolio?.diagnosis?.includes('MANUAL') ? '#854d0e' : '#166534', display: 'flex', alignItems: 'center', gap: '5px'}}><b>🤖 Laporan Analisis Mesin AI:</b></p>
                      <p style={{margin: 0, lineHeight: '1.5', color: activePortfolio?.diagnosis?.includes('MANUAL') ? '#713f12' : '#14532d'}}>{activePortfolio?.diagnosis || 'Sistem belum merekam diagnosis'}</p>
                    </div>
                    
                    {activePortfolio?.teacherFeedback && (
                      <div style={{background: '#eff6ff', padding: '12px', borderLeft: '4px solid #2563eb', marginTop: '12px', borderRadius: '0 6px 6px 0', fontSize: '13px'}}>
                         <p style={{margin: '0 0 6px 0', color: '#1e3a8a'}}><b>👨‍🏫 Respon dan Pendapat Guru:</b></p>
                         <p style={{margin: 0, color: '#1e40af', lineHeight: '1.5'}}>{activePortfolio?.teacherFeedback}</p>
                      </div>
                    )}
                  </div>
                ) : <div style={styles.card}><p style={{margin: 0, color: '#64748b', fontSize: '13px'}}>Belum ada artefak pemikiran yang diproses.</p></div>}
              </div>
            )}
          </>
        )}

        {userRole === 'guru' && (
          <>
            {activeTab === 'guruDashboard' && (
              <div className={activeTab === 'guruDashboard' ? "print-area" : ""}>
                <div style={styles.card}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px'}}>
                    <h2 style={{margin: 0, fontSize: '18px'}}>Dasbor Penilaian Karya</h2>
                    <div className="no-print" style={{display: 'flex', gap: '8px'}}>
                      <button style={{...styles.btnPrimary, background: '#16a34a', padding: '8px 12px', width: 'auto'}} onClick={handleExportCSV}>📥 CSV</button>
                      <button style={styles.btnSecondary} onClick={() => window.print()}>🖨️ Cetak</button>
                    </div>
                  </div>
                  
                  {safeSubmissions.length === 0 ? <p style={{color: '#64748b', fontSize: '13px', background: '#f8fafc', padding: '15px', borderRadius: '6px', textAlign: 'center'}}>Belum ada artefak siswa yang masuk.</p> : (
                    <div style={{overflowX: 'auto'}}>
                      <table style={styles.table}>
                        <thead>
                          <tr style={{borderBottom: '2px solid #e2e8f0', textAlign: 'left'}}>
                            <th style={{padding: '10px 8px', fontSize: '13px'}}>Identitas Siswa</th>
                            <th style={{padding: '10px 8px', fontSize: '13px'}}>Status</th>
                            <th className="no-print" style={{padding: '10px 8px', textAlign: 'right', fontSize: '13px'}}>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {safeSubmissions.map(sub => (
                            <tr key={sub?.id} style={{borderBottom: '1px solid #f1f5f9'}}>
                              <td style={{padding: '10px 8px', fontSize: '13px'}}>
                                <b>{sub?.studentName || 'Anonim'}</b><br/>
                                <span style={{fontSize: '11px', color: '#64748b'}}>
                                  Tab: {sub?.tabSwitches || 0} | 
                                  <span style={{color: sub?.diagnosis?.includes('MANUAL') ? '#d97706' : (sub?.diagnosis?.includes('GAGAL') || sub?.diagnosis?.includes('ERROR')) ? '#dc2626' : '#16a34a', fontWeight: 'bold', marginLeft: '3px'}}>
                                    {sub?.diagnosis?.includes('MANUAL') ? 'Manual' : (sub?.diagnosis?.includes('GAGAL') || sub?.diagnosis?.includes('ERROR')) ? 'Ditolak' : 'AI Lolos'}
                                  </span>
                                </span>
                              </td>
                              <td style={{padding: '10px 8px', fontWeight: '600', color: sub?.status?.includes('Ditolak') ? '#dc2626' : '#334155', fontSize: '12.5px'}}>
                                {sub?.status || 'Menunggu'}
                              </td>
                              <td style={{padding: '10px 8px', textAlign: 'right'}} className="no-print">
                                <div style={{display: 'flex', gap: '6px', justifyContent: 'flex-end'}}>
                                  <button style={styles.btnTable} onClick={() => setSelectedSubmission(sub)}>Tinjau</button>
                                  <button style={{...styles.btnTable, background: '#fee2e2', color: '#b91c1c'}} onClick={() => handleDeleteSubmission(sub?.id)}>Hapus</button>
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
              <div style={styles.card} className="no-print">
                <h2>Otoritas Peserta Uji</h2>
                <div style={{background: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px', border: '1px solid #e2e8f0'}}>
                  🔑 <b>KODE KELAS: <span style={{color: '#b91c1c', fontSize: '16px'}}>{currentClass?.classCode || '99999'}</span></b><br/><br/>
                  <span style={{color: '#475569'}}>Bagikan kode ini ke siswa agar mereka bisa login dari perangkat HP/browser masing-masing.</span>
                </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const name = e.target.sName.value.trim();
                  if(name) {
                    const pin = Math.floor(1000 + Math.random() * 9000).toString();
                    const newStudents = [...safeStudents, { id: Date.now(), name, pin }];
                    setStudents(newStudents);
                    const keys = getStorageKeys(currentClass || allClasses[0], userRole);
                    localStorage.setItem(keys.students, JSON.stringify(newStudents));
                    e.target.sName.value = ''; alert(`Berhasil! PIN otentikasi untuk ${name} adalah: ${pin}`);
                  }
                }} style={{display: 'flex', gap: '8px', marginBottom: '15px'}}>
                  <input name="sName" type="text" placeholder="Nama lengkap siswa..." style={{...styles.input, margin: 0, flex: 1}} required autoComplete="off" />
                  <button type="submit" style={{...styles.btnPrimary, width: 'auto', margin: 0, padding: '0 15px', fontSize: '13px'}}>Daftar</button>
                </form>
                
                <ul style={{paddingLeft: 0, listStyle: 'none', fontSize: '13px', color: '#334155'}}>
                  {safeStudents.map(s => (
                    <li key={s?.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #f1f5f9', background: '#fafafa', borderRadius: '6px', marginBottom: '6px'}}>
                      <span><b>{s?.name}</b> | PIN: <span style={{color: '#dc2626', fontWeight: 'bold'}}>{s?.pin}</span></span>
                      <button style={{background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px'}} onClick={() => {
                        const updated = safeStudents.filter(st => st?.id !== s?.id);
                        setStudents(updated);
                        localStorage.setItem(getStorageKeys(currentClass || allClasses[0], userRole).students, JSON.stringify(updated));
                      }}>Cabut</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedSubmission && (
              <div style={styles.modalOverlay} className="no-print">
                <div style={styles.modalCardLarge}>
                  <h3 style={{marginTop: 0, color: '#0f172a', fontSize: '18px'}}>Tinjauan Orisinalitas & Nalar</h3>
                  
                  <div style={{fontSize: '13px', background: '#f8fafc', padding: '15px', borderRadius: '8px', margin: '15px 0', maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px', marginBottom: '10px'}}>
                      <p style={{margin: 0}}><b>Kreator:</b> {selectedSubmission?.studentName || 'Anonim'}</p>
                      <p style={{margin: 0, color: '#64748b', fontSize: '11.5px'}}>{selectedSubmission?.timestamp || '-'}</p>
                    </div>
                    
                    <p style={{color: '#475569', margin: '0 0 4px 0'}}><b>Kutipan Kasus:</b></p>
                    <p style={{background: '#fff', padding: '10px', borderRadius: '6px', fontStyle: 'italic', border: '1px solid #e2e8f0', margin: '0 0 15px 0'}}>"{selectedSubmission?.naskahText || ''}"</p>
                    
                    <p style={{color: '#475569', margin: '0 0 4px 0'}}><b>Argumen Dekonstruksi Terpadu:</b></p>
                    <div style={{whiteSpace: 'pre-wrap', color: '#1e293b', background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', lineHeight: '1.5'}}>{selectedSubmission?.deconstructionText || ''}</div>
                    
                    <div style={{background: selectedSubmission?.diagnosis?.includes('MANUAL') ? '#fefce8' : '#f0fdf4', padding: '12px', borderLeft: `4px solid ${selectedSubmission?.diagnosis?.includes('MANUAL') ? '#eab308' : '#16a34a'}`, marginTop: '15px', borderRadius: '0 6px 6px 0'}}>
                      <p style={{margin: '0 0 4px 0', color: selectedSubmission?.diagnosis?.includes('MANUAL') ? '#854d0e' : '#166534'}}><b>🤖 Laporan Analisis Sistem:</b></p>
                      <span style={{color: selectedSubmission?.diagnosis?.includes('MANUAL') ? '#713f12' : '#14532d', lineHeight: '1.5'}}>{selectedSubmission?.diagnosis || 'Sistem belum merekam diagnosis'}</span>
                    </div>
                  </div>
                  
                  <label style={{fontSize: '13px', fontWeight: '700', color: '#1e293b'}}>Respon dan Pendapat Guru (Catatan Khusus):</label>
                  <textarea rows="3" placeholder="Sampaikan keputusan final..." value={teacherNoteInput} onChange={(e) => setTeacherNoteInput(e.target.value)} style={{...styles.textarea, marginTop: '6px', marginBottom: '15px'}} />
                  
                  <div style={styles.modalActions}>
                    <button style={{...styles.btnPrimary, flex: 1, background: '#16a34a'}} onClick={() => handleTeacherAction(selectedSubmission?.id, 'Disetujui Otoritas (ACC)')}>ACC</button>
                    <button style={{...styles.btnDanger, flex: 1}} onClick={() => handleTeacherAction(selectedSubmission?.id, 'Karya Ditolak / Revisi')}>Revisi</button>
                  </div>
                  <button style={{...styles.textBtn, width: '100%', marginTop: '8px'}} onClick={() => setSelectedSubmission(null)}>Tutup</button>
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
  appContainer: { width: '100%', maxWidth: '780px', margin: '0 auto', padding: '12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' },
  logoText: { margin: 0, fontSize: '18px', fontWeight: '900', letterSpacing: '0.5px', color: '#0f172a' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', marginBottom: '15px' },
  title: { fontSize: '22px', fontWeight: '900', marginBottom: '8px', textAlign: 'center', color: '#0f172a' },
  subtitle: { fontSize: '13.5px', color: '#475569', textAlign: 'center', marginBottom: '20px', lineHeight: '1.5' },
  introBox: { border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', marginBottom: '15px', fontSize: '13px' },
  gridMenu: { display: 'flex', flexDirection: 'column', gap: '10px' },
  menuBox: { border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', cursor: 'pointer', textAlign: 'center', background: '#fff' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' },
  input: { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' },
  textarea: { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical', lineHeight: '1.4' },
  btnPrimary: { background: '#0f172a', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', width: '100%', fontSize: '14px' },
  btnSecondary: { background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' },
  btnDanger: { background: '#dc2626', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  btnTable: { background: '#0f172a', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  textBtn: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13.5px', textDecoration: 'underline', padding: '5px', fontWeight: '600' },
  backBtn: { background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', fontSize: '13px', marginBottom: '10px', padding: 0, fontWeight: '700' },
  navBar: { display: 'flex', gap: '6px', marginBottom: '15px', alignItems: 'center', overflowX: 'auto', paddingBottom: '5px' },
  navBadge: { background: '#e2e8f0', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '800', whiteSpace: 'nowrap', color: '#0f172a' },
  navBtn: { background: '#fff', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '6px', fontSize: '12.5px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '600', color: '#334155' },
  navActive: { background: '#0f172a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '12.5px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '700' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999, padding: '15px' },
  modalCard: { background: '#fff', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '340px' },
  modalCardLarge: { background: '#fff', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto' },
  modalActions: { display: 'flex', gap: '8px', marginTop: '15px', alignItems: 'center' },
  monitor: { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', fontSize: '12.5px', display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderRadius: '6px' },
  promptBox: { background: '#f8fafc', borderLeft: '4px solid #0f172a', padding: '12px', margin: '12px 0', borderRadius: '0 6px 6px 0' },
  certBox: { border: '1px solid #e2e8f0', padding: '20px', background: '#fff', borderRadius: '8px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginTop: '10px' },
  main: { marginTop: '15px' }
};
