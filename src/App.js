import React, { useState, useEffect } from 'react';

export default function App() {
  // --- 1. STATE DASAR & RBAC ---
  const [userRole, setUserRole] = useState(null); // 'siswa', 'guru', 'mandiri'
  const [activeTab, setActiveTab] = useState('landing');
  
  // API Key & Integrasi AI Asli
  const [apiKey, setApiKey] = useState('');
  const [isApiValid, setIsApiValid] = useState(false);
  const [isCheckingApi, setIsCheckingApi] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // --- 2. SISTEM MANAJEMEN KELAS & MULTI-GURU ---
  const [allClasses, setAllClasses] = useState(() => {
    try {
      const saved = localStorage.getItem('PENA_ALL_CLASSES');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [currentClass, setCurrentClass] = useState(null);
  
  // Modal Guru
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [teacherNameInput, setTeacherNameInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');

  // Modal Mandiri
  const [showMandiriModal, setShowMandiriModal] = useState(false);
  const [mandiriNameInput, setMandiriNameInput] = useState('');

  const getStorageKeys = (kelas, role) => {
    if (role === 'mandiri') return { students: 'PENA_MANDIRI_STU', submissions: 'PENA_MANDIRI_SUB' };
    if (!kelas) return { students: 'PENA_STU_DEFAULT', submissions: 'PENA_SUB_DEFAULT' };
    const prefix = `PENA_${kelas.teacher}_${kelas.subject}`.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    return { students: `${prefix}_STUDENTS`, submissions: `${prefix}_SUBMISSIONS` };
  };

  // --- 3. DATABASE TERISOLASI ---
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [currentStudent, setCurrentStudent] = useState(null);

  // Load awal data pas masuk sesi
  useEffect(() => {
    if (userRole === 'mandiri') {
      const keys = getStorageKeys(null, 'mandiri');
      const savedSub = localStorage.getItem(keys.submissions);
      if (savedSub) setSubmissions(JSON.parse(savedSub));
      return;
    }

    if (!currentClass) return;
    const keys = getStorageKeys(currentClass, userRole);
    try {
      const savedStudents = localStorage.getItem(keys.students);
      if (savedStudents) {
        setStudents(JSON.parse(savedStudents));
      } else if (userRole === 'guru') {
        const defaultStudents = [{ id: 1, name: 'Budi Santoso', pin: '1234' }];
        setStudents(defaultStudents);
        localStorage.setItem(keys.students, JSON.stringify(defaultStudents));
      }

      const savedSub = localStorage.getItem(keys.submissions);
      setSubmissions(savedSub ? JSON.parse(savedSub) : []);
    } catch (e) { console.error(e); }
  }, [currentClass, userRole]);

  // Polling Sinkronisasi Realtime (Guru & Siswa Kelas)
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const savedClasses = localStorage.getItem('PENA_ALL_CLASSES');
        if (savedClasses && JSON.stringify(allClasses) !== savedClasses) {
          setAllClasses(JSON.parse(savedClasses));
        }

        const keys = getStorageKeys(currentClass, userRole);
        const savedSub = localStorage.getItem(keys.submissions);
        if (savedSub && JSON.stringify(submissions) !== savedSub) {
          setSubmissions(JSON.parse(savedSub));
        }
        
        if (userRole !== 'mandiri' && currentClass) {
          const savedStu = localStorage.getItem(keys.students);
          if (savedStu && JSON.stringify(students) !== savedStu) {
            setStudents(JSON.parse(savedStu));
          }
        }
      } catch (err) {}
    }, 1000);
    return () => clearInterval(interval);
  }, [currentClass, userRole, allClasses, submissions, students]);

  // Auto-save State
  useEffect(() => {
    localStorage.setItem('PENA_ALL_CLASSES', JSON.stringify(allClasses));
    const keys = getStorageKeys(currentClass, userRole);
    if (userRole !== 'mandiri' && currentClass) {
      localStorage.setItem(keys.students, JSON.stringify(students));
    }
    localStorage.setItem(keys.submissions, JSON.stringify(submissions));
  }, [students, submissions, currentClass, allClasses, userRole]);

  // --- 4. LOGIN HANDLERS ---
  const [loginSelectedClassIndex, setLoginSelectedClassIndex] = useState('');
  const [loginSelectedName, setLoginSelectedName] = useState('');
  const [loginPin, setLoginPin] = useState('');
  
  const [availableStudentsForLogin, setAvailableStudentsForLogin] = useState([]);
  useEffect(() => {
    if (loginSelectedClassIndex !== '') {
      const selectedClass = allClasses[loginSelectedClassIndex];
      const keys = getStorageKeys(selectedClass, 'siswa');
      const savedStudents = localStorage.getItem(keys.students);
      setAvailableStudentsForLogin(savedStudents ? JSON.parse(savedStudents) : []);
    } else {
      setAvailableStudentsForLogin([]);
    }
  }, [loginSelectedClassIndex, allClasses]);

  const handleVerifyPinGuru = (e) => {
    e.preventDefault();
    if (pinInput === 'PENA2026' || pinInput === '1234') {
      const newClass = { teacher: teacherNameInput.trim(), subject: subjectInput.trim() };
      const classExists = allClasses.find(c => c.teacher === newClass.teacher && c.subject === newClass.subject);
      if (!classExists) {
        const updatedClasses = [...allClasses, newClass];
        setAllClasses(updatedClasses);
        localStorage.setItem('PENA_ALL_CLASSES', JSON.stringify(updatedClasses));
      }
      setCurrentClass(newClass);
      setUserRole('guru');
      setShowPinModal(false);
      setActiveTab('guruDashboard');
    } else {
      alert('❌ PIN Admin Salah!');
    }
  };

  const handleStudentLogin = (e) => {
    e.preventDefault();
    const student = availableStudentsForLogin.find(s => s.name === loginSelectedName && s.pin === loginPin);
    if (student) {
      setCurrentClass(allClasses[loginSelectedClassIndex]);
      setCurrentStudent(student);
      setUserRole('siswa');
      setActiveTab('introSiswa');
    } else {
      alert('❌ Nama atau PIN salah.');
    }
  };

  const handleMandiriLogin = (e) => {
    e.preventDefault();
    setCurrentStudent({ id: 'mandiri-' + Date.now(), name: mandiriNameInput.trim() });
    setUserRole('mandiri');
    setShowMandiriModal(false);
    setActiveTab('introSiswa');
  };

  const handleLogout = () => {
    setCurrentStudent(null);
    setCurrentClass(null);
    setUserRole(null);
    setIsApiValid(false);
    setActiveTab('landing');
  };

  // --- 5. WORKSPACE & PELANGGARAN ---
  const [isPasted, setIsPasted] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [formData, setFormData] = useState({
    naskahText: '', ennisIndicator: 'Penjelasan Sederhana',
    polyaStep: 'Memahami Masalah', deconstructionText: ''
  });

  useEffect(() => {
    if (activeTab !== 'workspace' || !currentStudent) return;
    const handleVisibilityChange = () => {
      if (document.hidden) setTabSwitchCount(prev => prev + 1);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTab, currentStudent]);

  // Mencari tugas yang lagi aktif dikerjain murid ini
  const activeSubmissionId = submissions.find(s => s.studentName === currentStudent?.name)?.id;
  const activePortfolio = submissions.find(s => s.id === activeSubmissionId);
  const isWorkspaceLocked = activePortfolio && activePortfolio.status !== 'Minta Revisi';

  // --- 6. INTEGRASI GOOGLE AI ASLI ---
  const checkApiValidity = async (e) => {
    e.preventDefault();
    if (apiKey.length < 20) { alert('❌ API Key lu ngawur, kependekan!'); return; }
    setIsCheckingApi(true);
    try {
      // Tembak dummy request ke Google Gemini buat ngetes kunci
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Balas dengan kata 'OK' saja." }] }] })
      });
      if (!res.ok) throw new Error('API Key tidak valid/limit');
      setIsApiValid(true);
      setActiveTab('workspace');
      alert('✅ API Key Valid! Berhasil Konek ke Mesin Google.');
    } catch (error) {
      alert('❌ API Key Ditolak Google! Coba cek lagi kodenya.');
      setIsApiValid(false);
    }
    setIsCheckingApi(false);
  };

  const handleSubmitCanvas = async (e) => {
    e.preventDefault();
    if (!isApiValid) { alert('Setup API Key lu dulu bang di tab ke-2!'); return; }
    setIsSubmittingTask(true);

    let aiDiagnosis = '';
    const hasViolations = isPasted || tabSwitchCount > 0;
    const violationNotes = hasViolations ? `(Siswa ini terdeteksi curang: ${isPasted ? 'Copy-Paste ' : ''}${tabSwitchCount > 0 ? `Pindah Tab ${tabSwitchCount}x` : ''})` : '';

    const promptText = `
    Saya adalah guru penguji. Tolong evaluasi singkat (maksimal 2-3 kalimat) penjabaran siswa ini.
    Naskah Asli: "${formData.naskahText}"
    Teori Kritis (Ennis - ${formData.ennisIndicator}) & (Polya - ${formData.polyaStep}).
    Penjabaran Siswa: "${formData.deconstructionText}"
    ${violationNotes}
    Apakah argumennya logis dan kritis, atau cuma ngasal/menyimpang? Berikan diagnosis yang tajam!`;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
      });
      if (!res.ok) throw new Error('Gagal proses AI');
      const data = await res.json();
      aiDiagnosis = data.candidates[0].content.parts[0].text;
    } catch (error) {
      aiDiagnosis = "⚠️ Gagal mendapatkan diagnosis AI. Periksa kuota API Key lu atau koneksi internet.";
    }

    const newSubmission = {
      id: Date.now(),
      certNumber: `PENA-26-${Math.floor(1000 + Math.random() * 9000)}`,
      studentName: currentStudent.name,
      mode: userRole === 'mandiri' ? 'Modus Mandiri (Privat)' : 'Modus Kelompok (Tugas Kelas)',
      naskahText: formData.naskahText, ennis: formData.ennisIndicator,
      polya: formData.polyaStep, deconstructionText: formData.deconstructionText,
      diagnosis: aiDiagnosis,
      hasCopyPasted: isPasted, tabSwitches: tabSwitchCount,
      timestamp: new Date().toLocaleString(),
      status: userRole === 'mandiri' ? 'Disetujui Otomatis (Mandiri)' : 'Pending Review Guru',
      teacherFeedback: ''
    };
    
    // Replace kalau dia lagi ngerjain revisi, Add new kalau baru
    const filteredSubmissions = submissions.filter(s => s.studentName !== currentStudent.name);
    setSubmissions([newSubmission, ...filteredSubmissions]);
    
    setIsPasted(false); setTabSwitchCount(0); setIsSubmittingTask(false);
    setActiveTab('portfolio');
  };

  // --- 7. HANDLER GURU ---
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [teacherNoteInput, setTeacherNoteInput] = useState('');

  const handleTeacherAction = (id, actionStatus) => {
    setSubmissions(prev => prev.map(item => item.id === id ? { ...item, status: actionStatus, teacherFeedback: teacherNoteInput } : item));
    setSelectedSubmission(null);
    alert(`✅ Status diubah menjadi: ${actionStatus}`);
  };

  return (
    <div style={styles.appContainer}>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4 portrait; margin: 10mm; }
        @media print { body * { visibility: hidden; } #certPrintArea, #certPrintArea * { visibility: visible; }
          #certPrintArea { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; padding: 5mm; box-sizing: border-box; background: white !important; }
          .no-print { display: none !important; } }
      `}} />

      <header style={styles.header} className="no-print">
        <h2 style={styles.logoText}>PENA 🛡️</h2>
        {userRole && <button style={styles.cancelBtn} onClick={handleLogout}>🚪 Keluar Sistem</button>}
      </header>

      {/* TAMPILAN AWAL (LANDING PAGE) */}
      {!userRole && activeTab === 'landing' && (
        <div style={styles.card} className="no-print">
          <h1 style={{textAlign: 'center', color: '#1e3a8a'}}>Platform Pertanggungjawaban Nalar (PENA)</h1>
          <div style={styles.introBox}>
            <h3 style={{marginTop: 0}}>Mendisrupsi Ketergantungan AI</h3>
            <p>Sistem ini dirancang dengan API cerdas untuk menguji apakah siswa benar-benar memahami naskah yang mereka tulis, atau sekadar *copy-paste* dari bot.</p>
          </div>

          <div style={{display: 'flex', gap: '15px', marginTop: '20px', flexWrap: 'wrap'}}>
            <div style={styles.roleCard} onClick={() => setActiveTab('loginSiswa')}>
              <h3 style={{margin: '0 0 10px 0'}}>🎓 Kelas (Siswa)</h3>
              <p style={{fontSize: '13px', color: '#475569'}}>Terkoneksi dengan Guru. Butuh PIN.</p>
              <button style={{...styles.primaryBtn, marginTop: '10px'}}>Masuk Siswa</button>
            </div>
            
            <div style={styles.roleCard} onClick={() => setShowMandiriModal(true)}>
              <h3 style={{margin: '0 0 10px 0'}}>👤 Jalur Mandiri</h3>
              <p style={{fontSize: '13px', color: '#475569'}}>Latihan pribadi. Tidak terhubung guru.</p>
              <button style={{...styles.mandiriBtn, marginTop: '10px'}}>Mulai Mandiri</button>
            </div>

            <div style={styles.roleCard} onClick={() => setShowPinModal(true)}>
              <h3 style={{margin: '0 0 10px 0'}}>👨‍🏫 Ruang Guru</h3>
              <p style={{fontSize: '13px', color: '#475569'}}>Bikin kelas & Evaluasi hasil siswa.</p>
              <button style={{...styles.guruActiveBtn, marginTop: '10px'}}>Masuk Guru</button>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN SISWA KELAS */}
      {!userRole && activeTab === 'loginSiswa' && (
        <div style={styles.card} className="no-print">
          <button style={styles.backBtn} onClick={() => setActiveTab('landing')}>⬅ Kembali</button>
          <h2 style={{textAlign: 'center'}}>Masuk ke Kelas Virtual</h2>
          <form onSubmit={handleStudentLogin} style={{maxWidth: '400px', margin: '20px auto 0'}}>
            <label>Pilih Ruang Kelas / Guru:</label>
            <select value={loginSelectedClassIndex} onChange={(e) => setLoginSelectedClassIndex(e.target.value)} style={styles.input} required>
              <option value="" disabled>-- Pilih Mapel & Guru --</option>
              {allClasses.map((c, i) => <option key={i} value={i}>{c.subject} - {c.teacher}</option>)}
            </select>
            {loginSelectedClassIndex !== '' && (
              <>
                <label>Nama Kamu:</label>
                <select value={loginSelectedName} onChange={(e) => setLoginSelectedName(e.target.value)} style={styles.input} required>
                  <option value="" disabled>-- Pilih Nama Anda --</option>
                  {availableStudentsForLogin.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <label>PIN Login (4 Digit):</label>
                <input type="password" value={loginPin} onChange={(e) => setLoginPin(e.target.value)} style={styles.input} required />
                <button type="submit" style={styles.primaryBtn}>Masuk 🚀</button>
              </>
            )}
          </form>
        </div>
      )}

      {/* MODAL SETUP GURU */}
      {showPinModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard}>
            <h3>⚙️ Setup Kelas Guru</h3>
            <form onSubmit={handleVerifyPinGuru}>
              <label>Nama Guru:</label><input type="text" value={teacherNameInput} onChange={(e) => setTeacherNameInput(e.target.value)} style={styles.input} required />
              <label>Mata Pelajaran:</label><input type="text" value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} style={styles.input} required />
              <label>PIN Sistem (PENA2026):</label><input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} style={styles.input} required />
              <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                <button type="submit" style={styles.primaryBtn}>Buka Kelas 🔑</button>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowPinModal(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SETUP MANDIRI */}
      {showMandiriModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard}>
            <h3>👤 Latihan Mandiri (Privat)</h3>
            <p style={{fontSize: '12px', color: '#64748b'}}>Mode ini tidak diawasi guru. Sepenuhnya dievaluasi oleh AI Google.</p>
            <form onSubmit={handleMandiriLogin}>
              <label>Nama Kamu:</label>
              <input type="text" placeholder="Masukkan nama..." value={mandiriNameInput} onChange={(e) => setMandiriNameInput(e.target.value)} style={styles.input} required />
              <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                <button type="submit" style={styles.mandiriBtn}>Mulai Simulasi 🚀</button>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowMandiriModal(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NAVIGASI WORKSPACE */}
      {userRole && (
        <nav style={styles.navBar} className="no-print">
          {(userRole === 'siswa' || userRole === 'mandiri') && (
            <>
              <div style={styles.roleBadge}>{userRole === 'mandiri' ? '👤 MANDIRI' : `📚 ${currentClass?.subject}`}</div>
              <button style={activeTab === 'introSiswa' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('introSiswa')}>1. Instruksi</button>
              <button style={activeTab === 'apiKey' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('apiKey')}>2. Mesin AI</button>
              <button style={activeTab === 'workspace' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('workspace')}>3. Kanvas</button>
              <button style={activeTab === 'portfolio' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('portfolio')}>4. Portofolio</button>
            </>
          )}
          {userRole === 'guru' && (
            <>
              <div style={styles.roleBadge}>📚 {currentClass?.subject} - {currentClass?.teacher}</div>
              <button style={activeTab === 'guruDashboard' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('guruDashboard')}>📊 Evaluasi Tugas</button>
              <button style={activeTab === 'guruSiswa' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('guruSiswa')}>👥 Daftar Siswa</button>
            </>
          )}
        </nav>
      )}

      <main style={styles.mainContent}>
        {(userRole === 'siswa' || userRole === 'mandiri') && currentStudent && (
          <>
            {activeTab === 'introSiswa' && (
              <div style={styles.card} className="no-print">
                <h2 style={{color: '#0f172a'}}>Halo, {currentStudent.name}! 👋</h2>
                <div style={styles.introBox}>
                  <p>Siapkan argumen lu. Kalo copy-paste dari ChatGPT, sistem PENA bakal nangkep dan mesin AI Google bakal ngebantai logika lu.</p>
                </div>
                <button style={styles.primaryBtn} onClick={() => setActiveTab('apiKey')}>Lanjut Setup AI ➔</button>
              </div>
            )}

            {activeTab === 'apiKey' && (
              <div style={styles.card} className="no-print">
                <h2>Otentikasi Mesin AI (Google Gemini)</h2>
                <p style={{fontSize: '13px', color: '#475569'}}>Ambil API Key gratis di: <b>aistudio.google.com/app/apikey</b></p>
                <form onSubmit={checkApiValidity}>
                  <input type="password" placeholder="Paste kode API Key milikmu..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={styles.input} required />
                  <button type="submit" style={styles.primaryBtn} disabled={isCheckingApi}>
                    {isCheckingApi ? '⏳ Mengetes Koneksi ke Google...' : 'Validasi & Hubungkan 🔑'}
                  </button>
                </form>
                {isApiValid && <p style={{color: '#16a34a', fontWeight: 'bold', marginTop: '10px'}}>✅ Mesin AI Tersambung!</p>}
              </div>
            )}

            {activeTab === 'workspace' && (
              <div style={styles.card} className="no-print">
                {isWorkspaceLocked ? (
                  <div style={{textAlign: 'center', padding: '40px 20px'}}>
                    <h1 style={{fontSize: '40px', margin: 0}}>🔒</h1>
                    <h2>Kanvas Terkunci</h2>
                    <p>Lu udah ngirim tugas (atau masih direview Guru). Cek tab <b>Portofolio</b> buat liat hasilnya.</p>
                  </div>
                ) : (
                  <>
                    <h2 style={{margin: 0, marginBottom: '15px'}}>Kanvas Dekonstruksi Nalar</h2>
                    {!isApiValid && <div style={{padding: '10px', backgroundColor: '#fee2e2', color: '#991b1b', marginBottom: '15px', borderRadius: '6px'}}>⚠️ Wajib masukin API Key di Tab 2 dulu bang!</div>}
                    
                    <div style={styles.monitoringBar}>
                      <span>👀 Pindah Tab: <b style={{color: tabSwitchCount > 0 ? '#dc2626' : '#16a34a'}}>{tabSwitchCount}x</b></span>
                      <span>📋 Copy-Paste: <b style={{color: isPasted ? '#dc2626' : '#16a34a'}}>{isPasted ? 'TERDETEKSI' : 'AMAN'}</b></span>
                    </div>

                    <form onSubmit={handleSubmitCanvas}>
                      <label>1. Kutipan Inti Naskah / Argumen Lu:</label>
                      <textarea name="naskahText" rows="3" value={formData.naskahText} onChange={(e) => setFormData({...formData, naskahText: e.target.value})} style={styles.textarea} required />

                      <div style={{display: 'flex', gap: '15px', marginTop: '10px'}}>
                        <div style={{flex: 1}}>
                          <label>2. Pisau Kritis (Ennis):</label>
                          <select value={formData.ennisIndicator} onChange={(e) => setFormData({...formData, ennisIndicator: e.target.value})} style={styles.input}>
                            <option>Penjelasan Sederhana</option><option>Keterampilan Dasar</option><option>Menyimpulkan</option>
                          </select>
                        </div>
                        <div style={{flex: 1}}>
                          <label>3. Tahap Polya:</label>
                          <select value={formData.polyaStep} onChange={(e) => setFormData({...formData, polyaStep: e.target.value})} style={styles.input}>
                            <option>Memahami Masalah</option><option>Merencanakan Penyelesaian</option><option>Memeriksa Kembali</option>
                          </select>
                        </div>
                      </div>

                      <label style={{marginTop: '15px', display: 'block'}}>4. Uraian Pemikiran Lu (Dilarang Copas):</label>
                      <textarea rows="6" value={formData.deconstructionText} onChange={(e) => setFormData({...formData, deconstructionText: e.target.value})} onPaste={() => setIsPasted(true)} style={styles.textarea} required />

                      <button type="submit" style={styles.primaryBtn} disabled={!isApiValid || isSubmittingTask}>
                        {isSubmittingTask ? '⏳ AI Sedang Menganalisis...' : 'Kirim Uji Nalar 🚀'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            {activeTab === 'portfolio' && (
              <div>
                <div style={{marginBottom: '15px', display: 'flex', gap: '10px'}} className="no-print">
                  <button style={styles.printBtn} onClick={() => window.print()}>📄 Cetak / Save PDF</button>
                </div>

                {activePortfolio ? (
                  <div id="certPrintArea" style={{backgroundColor: '#fff'}}>
                    <div style={styles.certBorder}>
                      <div style={{textAlign: 'center'}}>
                        <h1 style={{color: '#1e3a8a', margin: '0'}}>SERTIFIKAT UJI NALAR (PENA)</h1>
                        <span style={{fontSize: '10px', backgroundColor: '#e0f2fe', padding: '2px 6px'}}>{activePortfolio.certNumber}</span>
                      </div>
                      <hr style={{margin: '15px 0'}} />
                      <div style={{fontSize: '12px', lineHeight: '1.4'}}>
                        <h2>{activePortfolio.studentName}</h2>
                        <p>Pengerjaan: <b>{activePortfolio.mode}</b> | {activePortfolio.timestamp}</p>
                        
                        <div style={{padding: '8px', backgroundColor: '#f1f5f9', fontWeight: 'bold', borderRadius: '4px'}}>
                          STATUS: <span style={{color: activePortfolio.status.includes('ACC') || activePortfolio.status.includes('Otomatis') ? 'green' : activePortfolio.status.includes('Revisi') ? 'red' : 'orange'}}>{activePortfolio.status}</span>
                        </div>

                        {(activePortfolio.hasCopyPasted || activePortfolio.tabSwitches > 0) && (
                          <div style={{backgroundColor: '#fee2e2', color: '#991b1b', padding: '8px', margin: '10px 0'}}>⚠️ ANOMALI: Pindah tab {activePortfolio.tabSwitches}x, Copas: {activePortfolio.hasCopyPasted ? 'Ya' : 'Tidak'}</div>
                        )}

                        <div style={{backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '10px', margin: '10px 0'}}>
                          <b>Naskah:</b> <i>{activePortfolio.naskahText}</i><br/><br/>
                          <b>Dekonstruksi ({activePortfolio.ennis} & {activePortfolio.polya}):</b><br/>
                          "{activePortfolio.deconstructionText}"
                        </div>

                        <div style={{backgroundColor: '#fef3c7', padding: '10px', color: '#92400e'}}>
                          <b>🤖 Diagnostik Mesin AI Google:</b> <br/>{activePortfolio.diagnosis}
                        </div>

                        {activePortfolio.teacherFeedback && (
                          <div style={{backgroundColor: '#eff6ff', padding: '10px', color: '#1e40af', marginTop: '10px'}}>
                            <b>👨‍🏫 Catatan Guru:</b> "{activePortfolio.teacherFeedback}"
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : <p>Belum ada data tugas disubmit.</p>}
              </div>
            )}
          </>
        )}

        {/* ALUR GURU */}
        {userRole === 'guru' && (
          <>
            {activeTab === 'guruDashboard' && (
              <div style={styles.card} className="no-print">
                <h2>📊 Evaluasi Tugas Masuk</h2>
                {submissions.length === 0 ? <p>Belum ada tugas.</p> : (
                  <table style={styles.table}>
                    <thead><tr style={{backgroundColor: '#e2e8f0', textAlign: 'left'}}><th>Siswa</th><th>Status</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {submissions.map((sub) => (
                        <tr key={sub.id} style={{borderBottom: '1px solid #e2e8f0'}}>
                          <td style={styles.td}><b>{sub.studentName}</b></td>
                          <td style={styles.td}>{sub.status}</td>
                          <td style={styles.td}><button style={styles.primaryBtn} onClick={() => setSelectedSubmission(sub)}>👁️ Cek</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'guruSiswa' && (
              <div style={styles.card} className="no-print">
                <h2>👥 Kelola Siswa Kelas</h2>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const newName = e.target.stuName.value.trim();
                  if(newName) {
                    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
                    setStudents([...students, { id: Date.now(), name: newName, pin: newPin }]);
                    e.target.stuName.value = ''; alert('PIN: ' + newPin);
                  }
                }} style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
                  <input name="stuName" type="text" placeholder="Nama siswa..." style={{...styles.input, margin: 0, flex: 1}} required />
                  <button type="submit" style={{...styles.primaryBtn, width: 'auto', margin: 0}}>Tambah</button>
                </form>
                <ul>{students.map(s => <li key={s.id}>{s.name} - PIN: <b>{s.pin}</b></li>)}</ul>
              </div>
            )}

            {/* MODAL EVALUASI GURU */}
            {selectedSubmission && (
              <div style={styles.modalOverlay} className="no-print">
                <div style={styles.largeModalCard}>
                  <h3>📝 Evaluasi: {selectedSubmission.studentName}</h3>
                  <div style={{fontSize: '13px', lineHeight: '1.5'}}>
                    <p><b>AI bilang:</b> {selectedSubmission.diagnosis}</p>
                    <div style={{backgroundColor: '#f8fafc', padding: '10px', border: '1px solid #cbd5e1'}}>
                      <b>Naskah:</b> <i>{selectedSubmission.naskahText}</i><br/><br/>
                      <b>Dekonstruksi:</b> "{selectedSubmission.deconstructionText}"
                    </div>
                  </div>
                  <textarea rows="3" placeholder="Catatan lu buat siswa..." value={teacherNoteInput} onChange={(e) => setTeacherNoteInput(e.target.value)} style={styles.textarea} />
                  <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                    <button style={styles.accBtnLarge} onClick={() => handleTeacherAction(selectedSubmission.id, 'Disetujui Guru (ACC)')}>✅ ACC</button>
                    <button style={styles.rejectBtnLarge} onClick={() => handleTeacherAction(selectedSubmission.id, 'Minta Revisi')}>❌ Revisi</button>
                    <button style={styles.cancelBtn} onClick={() => setSelectedSubmission(null)}>Tutup</button>
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
  appContainer: { fontFamily: 'Inter, sans-serif', maxWidth: '850px', margin: '20px auto', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '10px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', color: 'white', padding: '15px 20px', borderRadius: '8px' },
  logoText: { margin: 0, fontSize: '20px' },
  backBtn: { background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold' },
  introBox: { backgroundColor: '#f1f5f9', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' },
  roleCard: { flex: 1, backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', textAlign: 'center', minWidth: '200px' },
  roleBadge: { backgroundColor: '#e2e8f0', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', color: '#1e3a8a', display: 'flex', alignItems: 'center' },
  
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalCard: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', maxWidth: '400px', width: '90%' },
  largeModalCard: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', maxWidth: '600px', width: '90%', maxHeight: '85vh', overflowY: 'auto' },
  cancelBtn: { backgroundColor: '#94a3b8', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  
  navBar: { display: 'flex', gap: '10px', margin: '20px 0', flexWrap: 'wrap' },
  navBtn: { backgroundColor: '#e2e8f0', color: '#475569', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  navBtnActive: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  
  mainContent: { marginTop: '10px' },
  card: { backgroundColor: 'white', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0' },
  primaryBtn: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%' },
  mandiriBtn: { backgroundColor: '#059669', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%' },
  guruActiveBtn: { backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%' },
  printBtn: { backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  
  input: { width: '100%', padding: '10px', margin: '8px 0', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '12px', margin: '8px 0', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', resize: 'vertical' },
  monitoringBar: { backgroundColor: '#eff6ff', padding: '10px 15px', borderRadius: '6px', marginBottom: '15px', fontSize: '13px', display: 'flex', gap: '20px', border: '1px solid #bfdbfe' },
  
  certBorder: { border: '4px double #1e3a8a', padding: '20px', height: '100%', boxSizing: 'border-box' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px' },
  td: { padding: '10px', borderBottom: '1px solid #e2e8f0', fontSize: '14px' },
  accBtnLarge: { backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', flex: 1, fontWeight: 'bold' },
  rejectBtnLarge: { backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', flex: 1, fontWeight: 'bold' }
};
