import React, { useState, useEffect } from 'react';

// ==========================================
// SESSION HELPER & CONFIG
// ==========================================
const session = {
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  get: (key, fallback) => {
    try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : fallback; }
    catch (e) { return fallback; }
  },
  clear: () => ['PENA_ROLE', 'PENA_TAB', 'PENA_CLASS', 'PENA_STUDENT'].forEach(k => localStorage.removeItem(k))
};

// Kunci ditarik dari brankas rahasia Vercel (Environment Variables)
const DEFAULT_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || ""; 
const MASTER_ADMIN_PASSWORD = "adminpena"; // Sandi utama untuk akses menu Guru

export default function App() {
  const [userRole, setUserRole] = useState(() => session.get('PENA_ROLE', null)); 
  const [activeTab, setActiveTab] = useState(() => session.get('PENA_TAB', 'landing'));
  const [currentClass, setCurrentClass] = useState(() => session.get('PENA_CLASS', null));
  const [currentStudent, setCurrentStudent] = useState(() => session.get('PENA_STUDENT', null));
  
  const [apiKey, setApiKey] = useState(() => {
    const savedKey = localStorage.getItem('PENA_AI_KEY');
    return savedKey ? savedKey : DEFAULT_API_KEY;
  });
  
  const [isApiValid, setIsApiValid] = useState(apiKey.length > 10);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  useEffect(() => {
    session.set('PENA_ROLE', userRole);
    session.set('PENA_TAB', activeTab);
    session.set('PENA_CLASS', currentClass);
    session.set('PENA_STUDENT', currentStudent);
  }, [userRole, activeTab, currentClass, currentStudent]);

  const [allClasses, setAllClasses] = useState(() => {
    try { const saved = localStorage.getItem('PENA_ALL_CLASSES'); return saved ? JSON.parse(saved) : []; } 
    catch (e) { return []; }
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
    if (role === 'mandiri') return { students: 'PENA_MDR_STU_ISO', submissions: 'PENA_MDR_SUB_ISO' };
    if (!kelas) return { students: 'PENA_STU_DEF', submissions: 'PENA_SUB_DEF' };
    const safeCode = kelas.classCode ? kelas.classCode : kelas.pin; 
    return { students: `PENA_C_${safeCode}_STU`, submissions: `PENA_C_${safeCode}_SUB` };
  };

  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    const loadClassData = () => {
      if (userRole === 'mandiri') {
        const keys = getStorageKeys(null, 'mandiri');
        const savedSub = localStorage.getItem(keys.submissions);
        setSubmissions(savedSub ? JSON.parse(savedSub) : []);
        return;
      }
      if (!currentClass) return;
      
      const keys = getStorageKeys(currentClass, userRole);
      try {
        const savedStudents = localStorage.getItem(keys.students);
        if (savedStudents) { setStudents(JSON.parse(savedStudents)); } 
        else if (userRole === 'guru') {
          const defaultStudents = [{ id: 1, name: 'Siswa Contoh', pin: '1234' }];
          setStudents(defaultStudents);
          localStorage.setItem(keys.students, JSON.stringify(defaultStudents));
        }
        const savedSub = localStorage.getItem(keys.submissions);
        setSubmissions(savedSub ? JSON.parse(savedSub) : []);
      } catch (e) { console.error(e); }
    };

    loadClassData();
    window.addEventListener('storage', loadClassData);
    return () => window.removeEventListener('storage', loadClassData);
  }, [currentClass, userRole]);

  // --- LOGIN LOGIC ---
  const [classCodeInput, setClassCodeInput] = useState('');
  const [loginStudentName, setLoginStudentName] = useState('');
  const [loginStudentPin, setLoginStudentPin] = useState('');

  const handleVerifyClassCode = (e) => {
    e.preventDefault();
    const foundClass = allClasses.find(c => c.classCode === classCodeInput.trim() || c.pin === classCodeInput.trim());
    if (foundClass) {
      setCurrentClass(foundClass);
      alert(`✅ Kelas ${foundClass.subject} (${foundClass.teacher}) ditemukan!`);
    } else {
      alert('❌ Kode Akses Kelas tidak ditemukan.');
      setCurrentClass(null);
    }
  };

  const handleStudentLoginFinal = (e) => {
    e.preventDefault();
    const inputName = loginStudentName.trim().toLowerCase();
    const keys = getStorageKeys(currentClass, 'siswa');
    const savedStu = localStorage.getItem(keys.students);
    const freshStudentList = savedStu ? JSON.parse(savedStu) : [];

    const student = freshStudentList.find(s => s.name.trim().toLowerCase() === inputName && s.pin === loginStudentPin.trim());
    if (student) {
      setCurrentStudent(student);
      setUserRole('siswa');
      setActiveTab(isApiValid ? 'workspace' : 'introSiswa');
    } else {
      alert('❌ Nama atau PIN Siswa salah.');
    }
  };

  const handleAdminGateSubmit = (e) => {
    e.preventDefault();
    if (adminGateInput === MASTER_ADMIN_PASSWORD) {
      setShowAdminGate(false);
      setShowPinModal(true);
      setAdminGateInput('');
    } else {
      alert('❌ Sandi Admin salah. Akses ditolak.');
    }
  };

  const handleRegisterOrLoginGuru = (e) => {
    e.preventDefault();
    const tName = teacherNameInput.trim();
    const sName = subjectInput.trim();
    const pin = pinInput.trim();
    
    let targetClass = allClasses.find(c => c.teacher.toLowerCase() === tName.toLowerCase() && c.subject.toLowerCase() === sName.toLowerCase());
    
    if (targetClass) {
      if (targetClass.pin !== pin) { 
        alert('❌ Sandi (PIN) guru salah untuk akun ini! (Gunakan tombol Hapus Data jika lupa PIN)'); 
        return; 
      }
    } else {
      const classCode = Math.floor(10000 + Math.random() * 90000).toString();
      targetClass = { teacher: tName, subject: sName, pin: pin, classCode: classCode };
      const updated = [...allClasses, targetClass];
      setAllClasses(updated);
      localStorage.setItem('PENA_ALL_CLASSES', JSON.stringify(updated));
      alert(`🎉 KELAS DIBUAT!\nKODE AKSES MURID: ${classCode}`);
    }
    
    setCurrentClass(targetClass);
    setUserRole('guru');
    setShowPinModal(false);
    setActiveTab('guruDashboard');
  };

  const handleForceDeleteGuruClass = () => {
    if(window.confirm('🚨 Hapus paksa histori kelas ini dari penyimpanan lokal?')) {
      const tName = teacherNameInput.trim().toLowerCase();
      const sName = subjectInput.trim().toLowerCase();
      const updatedClasses = allClasses.filter(c => !(c.teacher.toLowerCase() === tName && c.subject.toLowerCase() === sName));
      setAllClasses(updatedClasses);
      localStorage.setItem('PENA_ALL_CLASSES', JSON.stringify(updatedClasses));
      alert('Histori kelas berhasil dibersihkan.');
    }
  };

  const handleMandiriLogin = (e) => {
    e.preventDefault();
    if (!mandiriNameInput.trim()) return;
    setSubmissions([]); setStudents([]); setCurrentClass(null);
    setCurrentStudent({ id: 'mandiri-' + Date.now(), name: mandiriNameInput });
    setUserRole('mandiri'); setShowMandiriModal(false); 
    setActiveTab(isApiValid ? 'workspace' : 'introSiswa');
  };

  const handleLogout = () => {
    session.clear(); 
    setCurrentStudent(null); setCurrentClass(null); setUserRole(null);
    setSubmissions([]); setStudents([]); 
    setActiveTab('landing'); setClassCodeInput('');
  };

  // --- KANVAS LOGIC ---
  const [isPasted, setIsPasted] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [formData, setFormData] = useState({ naskahText: '', ennisText: '', polyaText: '' });

  useEffect(() => {
    if (activeTab !== 'workspace' || !currentStudent) return;
    const handleVisibilityChange = () => { if (document.hidden) setTabSwitchCount(prev => prev + 1); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTab, currentStudent]);

  const activeSubmissionId = submissions.find(s => s.studentName === currentStudent?.name)?.id;
  const activePortfolio = submissions.find(s => s.id === activeSubmissionId);
  const isWorkspaceLocked = activePortfolio && activePortfolio.status !== 'Minta Revisi';

  const checkApiValidity = (e) => {
    e.preventDefault();
    if (apiKey.trim().length < 10) { alert('❌ API Key tidak valid.'); return; }
    localStorage.setItem('PENA_AI_KEY', apiKey.trim());
    setIsApiValid(true);
    setActiveTab('workspace');
  };

  const handleSubmitCanvas = async (e) => {
    e.preventDefault();
    if (!isApiValid) { alert('API Key sistem bermasalah.'); return; }
    setIsSubmittingTask(true);

    let diagnosis = "";
    const hasViolations = isPasted || tabSwitchCount > 0;

    if (hasViolations) {
      diagnosis = `[GAGAL INTEGRITAS] Terdeteksi perpindahan tab (${tabSwitchCount}x) atau copy-paste. Argumen didiskualifikasi otomatis.`;
    } else {
      try {
        const prompt = `Evaluasi karya analitis siswa berikut secara kritis dan tajam.\n\nKutipan Masalah Utama: "${formData.naskahText}"\n\nAnalisis Aspek Ennis Siswa: "${formData.ennisText}"\nAnalisis Aspek Polya Siswa: "${formData.polyaText}"\n\nInstruksi Evaluasi:\nNilai apakah analisis siswa benar-benar logis, komprehensif, dan tidak asal-asalan dalam mengimplementasikan indikator Ennis (Fokus, Kredibilitas, Deduksi, Asumsi, Strategi) dan Polya (Pahami Masalah, Rencana, Eksekusi, Cek Kembali). Jangan hanya menghitung kata. Jika isinya tidak relevan atau asal-asalan, tolak dengan tegas. Berikan diagnosis evaluatif (maksimal 4 kalimat) yang langsung menilai esensi jawaban siswa.`;
        
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
          diagnosis = `[HASIL EVALUASI AI] ${data.candidates[0].content.parts[0].text}`;
        } else {
          diagnosis = `[ERROR AI] Gagal menyimpulkan. Respon diblokir oleh standar keamanan mesin.`;
        }
      } catch (err) {
        diagnosis = `[ERROR KONEKSI] Mesin AI gagal diakses. Error: ${err.message}`;
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
    
    const updatedSubmissions = [newSubmission, ...submissions.filter(s => s.studentName !== currentStudent.name)];
    setSubmissions(updatedSubmissions);
    
    const keys = getStorageKeys(currentClass, userRole);
    localStorage.setItem(keys.submissions, JSON.stringify(updatedSubmissions));

    setIsPasted(false); setTabSwitchCount(0); setIsSubmittingTask(false);
    setActiveTab('portfolio');
  };

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [teacherNoteInput, setTeacherNoteInput] = useState('');

  const handleTeacherAction = (id, status) => {
    const updatedSubmissions = submissions.map(item => item.id === id ? { ...item, status, teacherFeedback: teacherNoteInput } : item);
    setSubmissions(updatedSubmissions);
    const keys = getStorageKeys(currentClass, userRole);
    localStorage.setItem(keys.submissions, JSON.stringify(updatedSubmissions));
    setSelectedSubmission(null); setTeacherNoteInput('');
  };

  return (
    <div style={styles.appContainer}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print { 
          body * { visibility: hidden; } 
          .print-area, .print-area * { visibility: visible; } 
          .print-area { position: absolute; left: 0; top: 0; width: 100vw; padding: 0; margin: 0; background: white !important; } 
          .no-print { display: none !important; } 
        }
      `}} />

      <header style={styles.header} className="no-print">
        <h2 style={styles.logoText}>PENA</h2>
        {userRole && <button style={styles.textBtn} onClick={handleLogout}>Keluar Sesi</button>}
      </header>

      {/* LANDING PAGE UTAMA */}
      {!userRole && activeTab === 'landing' && (
        <div style={styles.card} className="no-print">
          <h1 style={styles.title}>Platform Pertanggungjawaban Nalar</h1>
          <p style={styles.subtitle}>Proyek kanvas berbasis web untuk menguji orisinalitas karya dan kerangka pemikiran (Pilar 1 - Platform 5 Buletin).</p>
          
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

      {/* MODAL GATE ADMIN */}
      {showAdminGate && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard}>
            <h3>Akses Terbatas</h3>
            <p style={{fontSize: '12px', color: '#666'}}>Masukkan sandi utama administrator untuk membuka portal Guru.</p>
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

      {/* LOGIN SISWA */}
      {!userRole && activeTab === 'loginSiswa' && (
        <div style={styles.card} className="no-print">
          <button style={styles.backBtn} onClick={() => setActiveTab('landing')}>← Kembali</button>
          <h2>Akses Ruang Kelas</h2>
          {!currentClass ? (
            <form onSubmit={handleVerifyClassCode} style={styles.form}>
              <label>Kode Akses Kelas (5 Digit):</label>
              <input type="text" placeholder="Contoh: 12345" value={classCodeInput} onChange={(e) => setClassCodeInput(e.target.value)} style={styles.input} required autoComplete="off" />
              <button type="submit" style={styles.btnPrimary}>Cari Kelas</button>
            </form>
          ) : (
            <form onSubmit={handleStudentLoginFinal} style={styles.form}>
              <div style={styles.introBox}>📚 Kelas: <b>{currentClass.subject}</b> ({currentClass.teacher})</div>
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

      {/* MODAL GURU */}
      {showPinModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard}>
            <h3>Otorisasi Instruktur</h3>
            <form onSubmit={handleRegisterOrLoginGuru}>
              <label>Nama Guru:</label>
              <input type="text" value={teacherNameInput} onChange={(e) => setTeacherNameInput(e.target.value)} style={styles.input} required />
              <label>Mata Pelajaran:</label>
              <input type="text" value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} style={styles.input} required />
              <label>PIN Kelas Pengaman:</label>
              <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} style={styles.input} required />
              
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Masuk / Buat Baru</button>
                <button type="button" style={styles.textBtn} onClick={() => setShowPinModal(false)}>Tutup</button>
              </div>
              <div style={{marginTop: '15px', textAlign: 'center'}}>
                <button type="button" onClick={handleForceDeleteGuruClass} style={{background: 'none', border: 'none', color: '#b91c1c', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer'}}>Lupa PIN? Hapus Histori Kelas Ini</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MANDIRI */}
      {showMandiriModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard}>
            <h3>Mode Mandiri</h3>
            <form onSubmit={handleMandiriLogin}>
              <label>Nama Peserta Uji:</label>
              <input type="text" value={mandiriNameInput} onChange={(e) => setMandiriNameInput(e.target.value)} style={styles.input} required />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Mulai Eksekusi</button>
                <button type="button" style={styles.textBtn} onClick={() => setShowMandiriModal(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NAVIGASI DALAM APLIKASI */}
      {userRole && (
        <nav style={styles.navBar} className="no-print">
          {(userRole === 'siswa' || userRole === 'mandiri') && (
            <>
              <span style={styles.navBadge}>{userRole === 'mandiri' ? 'Mode Privat' : currentClass?.subject}</span>
              {!isApiValid && <button style={activeTab === 'introSiswa' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('introSiswa')}>Sistem Error / Key</button>}
              <button style={activeTab === 'workspace' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('workspace')}>Kanvas Pemikiran</button>
              <button style={activeTab === 'portfolio' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('portfolio')}>Portofolio AI</button>
            </>
          )}
          {userRole === 'guru' && (
            <>
              <span style={styles.navBadge}>{currentClass?.subject} (Kode Akses: {currentClass?.classCode})</span>
              <button style={activeTab === 'guruDashboard' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('guruDashboard')}>Dasbor Evaluasi</button>
              <button style={activeTab === 'guruSiswa' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('guruSiswa')}>Kelola Peserta</button>
            </>
          )}
        </nav>
      )}

      <main style={styles.main}>
        {(userRole === 'siswa' || userRole === 'mandiri') && currentStudent && (
          <>
            {/* TAMPIL JIKA API KEY DEFAULT MATI / ERROR KONEKSI */}
            {activeTab === 'introSiswa' && (
              <div style={styles.card} className="no-print">
                <div style={{...styles.introBox, background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b'}}>
                  <p style={{margin: '0 0 10px 0', fontSize: '15px'}}><b>🚨 Sistem Analitis Utama Sedang Sibuk / Limit</b></p>
                  <p style={{margin: 0, fontSize: '13px'}}>Mesin utama sedang tidak dapat memproses data otomatis. Agar kamu tetap bisa mengumpulkan tugas, kamu perlu menyambungkan kunci API secara manual.</p>
                </div>
                <form onSubmit={checkApiValidity}>
                  <label style={{fontSize: '13px', fontWeight: 'bold'}}>Masukkan Kunci API Pribadi (Gemini AI Studio):</label>
                  <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={{...styles.input, marginTop: '5px'}} required />
                  <button type="submit" style={{...styles.btnPrimary, marginTop: '10px'}}>Hubungkan Bypass</button>
                </form>
              </div>
            )}

            {activeTab === 'workspace' && (
              <div style={styles.card} className="no-print">
                {isWorkspaceLocked ? (
                  <div style={{textAlign: 'center', padding: '30px'}}>
                    <h3>Karya Telah Disegel 🔒</h3>
                    <p style={{color: '#666'}}>Buka tab Portofolio AI untuk melihat ketajaman argumenmu di mata mesin dan guru.</p>
                  </div>
                ) : (
                  <>
                    <h2 style={{marginTop: 0}}>Kanvas Evaluasi Nalar Terpadu</h2>
                    <div style={styles.monitor}>
                      <span>Integritas Layar (Tab): <b>{tabSwitchCount}x</b></span>
                      <span>Integritas Input (Paste): <b>{isPasted ? 'Gagal' : 'Aman'}</b></span>
                    </div>

                    <form onSubmit={handleSubmitCanvas}>
                      <label style={{fontWeight: '700', color: '#1e293b'}}>1. Kutipan Sumber Masalah Utama:</label>
                      <textarea rows="3" placeholder="Masukkan premis asli atau landasan teori dari karya/naskah di sini..." value={formData.naskahText} onChange={(e) => setFormData({...formData, naskahText: e.target.value})} style={{...styles.textarea, marginBottom: '20px', marginTop: '5px'}} required />

                      {/* BLOK ENNIS */}
                      <div style={styles.promptBox}>
                        <p style={{margin: '0 0 8px 0', fontWeight: 'bold', color: '#0f172a'}}>🧠 Aspek Dekonstruksi ENNIS (5 Indikator)</p>
                        <p style={{margin: 0, fontSize: '12.5px', color: '#475569', lineHeight: '1.5'}}>
                          <b>Pemantik:</b> Uraikan penjelasan sederhananya, bagaimana kredibilitas data yang diangkat, apa deduksi/induksi akhirnya, adakah asumsi tersembunyi yang dipakai, dan bagaimana taktik strategisnya dalam naskah tersebut?
                        </p>
                      </div>
                      <textarea rows="6" placeholder="Bongkar logika naskah berdasarkan pemantik Ennis di atas..." value={formData.ennisText} onChange={(e) => setFormData({...formData, ennisText: e.target.value})} onPaste={() => setIsPasted(true)} style={{...styles.textarea, marginBottom: '20px'}} required />

                      {/* BLOK POLYA */}
                      <div style={{...styles.promptBox, borderLeftColor: '#3b82f6'}}>
                        <p style={{margin: '0 0 8px 0', fontWeight: 'bold', color: '#1d4ed8'}}>⚙️ Aspek Penyelesaian POLYA (4 Tahapan)</p>
                        <p style={{margin: 0, fontSize: '12.5px', color: '#475569', lineHeight: '1.5'}}>
                          <b>Pemantik:</b> Jabarkan pemahaman masalah inti naskah, bagaimana rencana penulis memecahkannya, apakah eksekusi datanya valid, dan coba lakukan sanggahan ulang (evaluasi) terhadap argumen naskah tersebut!
                        </p>
                      </div>
                      <textarea rows="6" placeholder="Jabarkan resolusi kritis berdasarkan pemantik Polya di atas..." value={formData.polyaText} onChange={(e) => setFormData({...formData, polyaText: e.target.value})} onPaste={() => setIsPasted(true)} style={{...styles.textarea, marginBottom: '20px'}} required />

                      <button type="submit" style={styles.btnPrimary} disabled={!isApiValid || isSubmittingTask}>
                        {isSubmittingTask ? 'Memvalidasi Orisinalitas Pemikiran...' : 'Kunci Nalar & Dapatkan Penilaian AI'}
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
                    <h3 style={{marginTop: 0, textAlign: 'center'}}>BUKTI OTENTISITAS NALAR<br/>Platform 5 - Buletin Pilar Pertama</h3>
                    <p style={{fontSize: '11px', color: '#666', textAlign: 'center', marginBottom: '20px'}}>Sistem Validasi ID: {activePortfolio.certNumber}</p>
                    <p><b>Kreator / Peserta:</b> {activePortfolio.studentName}</p>
                    <p><b>Status Dokumen:</b> <span style={{padding: '3px 8px', background: '#e2e8f0', borderRadius: '4px', fontWeight: '600'}}>{activePortfolio.status}</span></p>
                    
                    <hr style={{border: '0', borderTop: '1px dashed #cbd5e1', margin: '20px 0'}}/>
                    <p style={{fontSize: '13px', color: '#64748b', marginBottom: '5px'}}>Kutipan Permasalahan Original:</p>
                    <p style={{background: '#f8fafc', padding: '10px', borderRadius: '4px', fontStyle: 'italic'}}>"{activePortfolio.naskahText}"</p>
                    
                    <p style={{fontSize: '13px', color: '#64748b', marginTop: '15px', marginBottom: '5px'}}>Resolusi Kritis (Ennis & Polya):</p>
                    <div style={{background: '#f8fafc', padding: '15px', borderRadius: '4px', whiteSpace: 'pre-wrap'}}>
                      {activePortfolio.deconstructionText}
                    </div>

                    <div style={{background: '#f0fdf4', padding: '15px', borderLeft: '4px solid #16a34a', marginTop: '20px'}}>
                      <p style={{margin: '0 0 8px 0', color: '#166534'}}><b>🤖 Laporan Analisis Mesin AI:</b></p>
                      <p style={{margin: 0, lineHeight: '1.6', fontSize: '13.5px', color: '#14532d'}}>{activePortfolio.diagnosis}</p>
                    </div>
                    
                    {activePortfolio.teacherFeedback && (
                      <div style={{background: '#eff6ff', padding: '15px', borderLeft: '4px solid #2563eb', marginTop: '15px'}}>
                         <p style={{margin: '0 0 8px 0', color: '#1e3a8a'}}><b>👨‍🏫 Validasi Instruktur Manusia:</b></p>
                         <p style={{margin: 0, color: '#1e40af'}}>{activePortfolio.teacherFeedback}</p>
                      </div>
                    )}
                  </div>
                ) : <div style={styles.card}><p style={{margin: 0}}>Belum ada artefak pemikiran yang diproses.</p></div>}
              </div>
            )}
          </>
        )}

        {userRole === 'guru' && (
          <>
            {activeTab === 'guruDashboard' && (
              <div className={activeTab === 'guruDashboard' ? "print-area" : ""}>
                <div style={styles.card}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                    <h2 style={{margin: 0}}>Dasbor Penilaian Karya</h2>
                    <div className="no-print" style={{display: 'flex', gap: '8px'}}>
                      <button style={styles.btnSecondary} onClick={() => window.print()}>🖨️ Ekspor Data</button>
                    </div>
                  </div>
                  
                  {submissions.length === 0 ? <p style={{color: '#666', fontSize: '13px'}}>Artefak siswa kosong.</p> : (
                    <table style={styles.table}>
                      <thead><tr style={{borderBottom: '2px solid #e2e8f0'}}><th style={{textAlign: 'left', padding: '10px 0'}}>Identitas Siswa</th><th style={{textAlign: 'left'}}>Status Putusan</th><th className="no-print" style={{textAlign: 'right'}}>Aksi Validasi</th></tr></thead>
                      <tbody>
                        {submissions.map(sub => (
                          <tr key={sub.id} style={{borderBottom: '1px solid #f1f5f9'}}>
                            <td style={{padding: '12px 0'}}><b>{sub.studentName}</b><br/><span style={{fontSize: '11.5px', color: '#64748b'}}>Pelanggaran Tab: {sub.tabSwitches}x | Hasil: {sub.diagnosis.includes('GAGAL') ? 'Ditolak AI' : 'Lolos Analisis AI'}</span></td>
                            <td style={{padding: '12px 0', fontWeight: '600', color: '#334155'}}>{sub.status}</td>
                            <td style={{padding: '12px 0', textAlign: 'right'}} className="no-print"><button style={styles.btnTable} onClick={() => setSelectedSubmission(sub)}>Tinjau Naskah</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'guruSiswa' && (
              <div style={styles.card} className="no-print">
                <h2>Otoritas Peserta Uji</h2>
                <div style={{background: '#f8fafc', padding: '15px', borderRadius: '6px', fontSize: '14px', marginBottom: '20px', border: '1px solid #e2e8f0'}}>
                  🔑 <b>KODE AKSES DISTRIBUSI: <span style={{fontSize: '18px', color: '#b91c1c'}}>{currentClass?.classCode}</span></b><br/><br/>
                  Sistem mengharuskan siswa memasukkan kode di atas, diikuti PIN otentikasi spesifik tiap individu di bawah ini.
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const name = e.target.sName.value.trim();
                  if(name) {
                    const pin = Math.floor(1000 + Math.random() * 9000).toString();
                    const newStudents = [...students, { id: Date.now(), name, pin }];
                    setStudents(newStudents);
                    const keys = getStorageKeys(currentClass, userRole);
                    localStorage.setItem(keys.students, JSON.stringify(newStudents));
                    e.target.sName.value = ''; alert(`Akun dibuat. Berikan PIN ini kepada ${name}: ${pin}`);
                  }
                }} style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
                  <input name="sName" type="text" placeholder="Masukkan entitas nama siswa baru..." style={{...styles.input, margin: 0, flex: 1}} required autoComplete="off" />
                  <button type="submit" style={{...styles.btnPrimary, width: 'auto', margin: 0}}>Registrasi Peserta</button>
                </form>
                
                <ul style={{paddingLeft: 0, listStyle: 'none', fontSize: '13.5px', color: '#334155'}}>
                  {students.map(s => (
                    <li key={s.id} style={{display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #f1f5f9'}}>
                      <span><b>{s.name}</b> <span style={{color: '#94a3b8'}}>| PIN Autentikasi:</span> <span style={{color: '#dc2626', fontWeight: '800'}}>{s.pin}</span></span>
                      <button style={{background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: '600'}} onClick={() => {
                        if(window.confirm('Cabut akses siswa ini?')) {
                          const updated = students.filter(st => st.id !== s.id);
                          setStudents(updated);
                          localStorage.setItem(getStorageKeys(currentClass, userRole).students, JSON.stringify(updated));
                        }
                      }}>Hapus Akses</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedSubmission && (
              <div style={styles.modalOverlay} className="no-print">
                <div style={styles.modalCardLarge}>
                  <h3 style={{marginTop: 0, color: '#0f172a'}}>Tinjauan Orisinalitas & Nalar</h3>
                  <div style={{fontSize: '13.5px', background: '#f8fafc', padding: '15px', borderRadius: '6px', margin: '15px 0', maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0'}}>
                    <p style={{margin: '0 0 5px 0'}}><b>Kreator:</b> {selectedSubmission.studentName}</p>
                    <p style={{margin: '0 0 15px 0', color: '#64748b', fontSize: '12px'}}>Dikirim pada: {selectedSubmission.timestamp}</p>
                    <p style={{color: '#475569'}}><b>Kutipan Kasus:</b> <br/><i>"{selectedSubmission.naskahText}"</i></p>
                    <hr style={{border: '0', borderTop: '1px dashed #cbd5e1', margin: '15px 0'}}/>
                    <p style={{color: '#475569'}}><b>Argumen Dekonstruksi:</b></p>
                    <div style={{whiteSpace: 'pre-wrap', color: '#1e293b'}}>{selectedSubmission.deconstructionText}</div>
                    <hr style={{border: '0', borderTop: '1px dashed #cbd5e1', margin: '15px 0'}}/>
                    <p style={{margin: '0 0 5px 0', color: '#0f172a'}}><b>🤖 Keputusan Sistem AI:</b></p>
                    <span style={{display: 'block', padding: '10px', background: '#f0fdf4', color: '#166534', borderRadius: '4px', lineHeight: '1.6', borderLeft: '4px solid #16a34a'}}>{selectedSubmission.diagnosis}</span>
                  </div>
                  
                  <label style={{fontSize: '13px', fontWeight: '700', color: '#1e293b'}}>Keputusan Akhir Manusia (Guru):</label>
                  <textarea rows="3" placeholder="Sampaikan keputusan final Anda, apakah karya ini lolos validasi intelektual?" value={teacherNoteInput} onChange={(e) => setTeacherNoteInput(e.target.value)} style={{...styles.textarea, marginTop: '8px', marginBottom: '15px'}} />
                  
                  <div style={styles.modalActions}>
                    <button style={{...styles.btnPrimary, flex: 1, background: '#16a34a'}} onClick={() => handleTeacherAction(selectedSubmission.id, 'Disetujui Otoritas (ACC)')}>ACC Orisinal</button>
                    <button style={{...styles.btnDanger, flex: 1}} onClick={() => handleTeacherAction(selectedSubmission.id, 'Karya Ditolak / Revisi')}>Minta Revisi</button>
                    <button style={styles.textBtn} onClick={() => setSelectedSubmission(null)}>Tutup Dokumen</button>
                  </div>
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
  appContainer: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: '800px', margin: '30px auto', padding: '20px', color: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px', marginBottom: '25px' },
  logoText: { margin: 0, fontSize: '20px', fontWeight: '900', letterSpacing: '0.5px' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '30px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  title: { fontSize: '28px', fontWeight: '900', marginBottom: '10px', textAlign: 'center', color: '#0f172a' },
  subtitle: { fontSize: '15px', color: '#475569', textAlign: 'center', marginBottom: '30px', lineHeight: '1.6' },
  introBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', marginBottom: '25px', fontSize: '14px' },
  gridMenu: { display: 'flex', gap: '15px' },
  menuBox: { flex: 1, border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', cursor: 'pointer', textAlign: 'center', background: '#fff', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' },
  input: { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' },
  btnPrimary: { background: '#0f172a', color: '#fff', border: 'none', padding: '14px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', width: '100%', fontSize: '14px' },
  btnSecondary: { background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' },
  btnDanger: { background: '#dc2626', color: '#fff', border: 'none', padding: '14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  btnTable: { background: '#0f172a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12.5px', fontWeight: '600' },
  textBtn: { background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline', padding: '10px' },
  backBtn: { background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', fontSize: '13.5px', marginBottom: '20px', padding: 0, fontWeight: '700' },
  navBar: { display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' },
  navBadge: { background: '#e2e8f0', padding: '10px 14px', borderRadius: '6px', fontSize: '12.5px', fontWeight: '800', color: '#0f172a' },
  navBtn: { background: '#fff', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '6px', fontSize: '13.5px', cursor: 'pointer', color: '#334155', fontWeight: '600' },
  navActive: { background: '#0f172a', color: '#fff', border: '1px solid #0f172a', padding: '10px 16px', borderRadius: '6px', fontSize: '13.5px', cursor: 'pointer', fontWeight: '700' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  modalCard: { background: '#fff', padding: '30px', borderRadius: '10px', width: '360px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
  modalCardLarge: { background: '#fff', padding: '30px', borderRadius: '10px', width: '550px', maxHeight: '90vh', overflowY: 'auto', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
  modalActions: { display: 'flex', gap: '12px', marginTop: '25px', alignItems: 'center' },
  monitor: { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 15px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderRadius: '6px' },
  promptBox: { background: '#f8fafc', borderLeft: '4px solid #0f172a', padding: '15px', margin: '15px 0', borderRadius: '0 6px 6px 0' },
  certBox: { border: '1px solid #e2e8f0', padding: '35px', background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', marginTop: '20px' },
  main: { marginTop: '20px' }
};
