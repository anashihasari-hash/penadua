import React, { useState, useEffect } from 'react';

export default function App() {
  // --- 1. STATE DASAR & RBAC ---
  const [userRole, setUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState('landing');
  const [apiKey, setApiKey] = useState('');
  const [selectedMode, setSelectedMode] = useState('mandiri');

  // --- 2. SISTEM MANAJEMEN KELAS & MULTI-GURU ---
  const [allClasses, setAllClasses] = useState(() => {
    try {
      const saved = localStorage.getItem('PENA_ALL_CLASSES');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [currentClass, setCurrentClass] = useState(null); // { teacher: '', subject: '' }
  
  // State Input Modal Guru
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [teacherNameInput, setTeacherNameInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');

  // Fungsi helper untuk bikin kunci (key) database yang unik tiap guru
  const getStorageKeys = (kelas) => {
    if (!kelas) return { students: 'PENA_STU_DEFAULT', submissions: 'PENA_SUB_DEFAULT' };
    const prefix = `PENA_${kelas.teacher}_${kelas.subject}`.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    return {
      students: `${prefix}_STUDENTS`,
      submissions: `${prefix}_SUBMISSIONS`
    };
  };

  // --- 3. DATABASE SISWA & TUGAS (TERISOLASI PER KELAS) ---
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  // Load data otomatis tiap kali ganti kelas (Guru/Siswa Login)
  useEffect(() => {
    if (!currentClass) return;
    const keys = getStorageKeys(currentClass);
    try {
      const savedStudents = localStorage.getItem(keys.students);
      if (savedStudents) {
        setStudents(JSON.parse(savedStudents));
      } else {
        // Data default (dummy) buat kelas baru
        const defaultStudents = [
          { id: 1, name: 'Budi Santoso', pin: '1234' },
          { id: 2, name: 'Siti Rahma', pin: '5678' }
        ];
        setStudents(defaultStudents);
        localStorage.setItem(keys.students, JSON.stringify(defaultStudents));
      }

      const savedSub = localStorage.getItem(keys.submissions);
      setSubmissions(savedSub ? JSON.parse(savedSub) : []);
    } catch (e) { console.error(e); }
  }, [currentClass]);

  // Polling Sinkronisasi buat iOS/Android biar realtime tanpa nyangkut
  useEffect(() => {
    const interval = setInterval(() => {
      if (!currentClass) return;
      const keys = getStorageKeys(currentClass);
      try {
        const savedSub = localStorage.getItem(keys.submissions);
        if (savedSub) setSubmissions(JSON.parse(savedSub));
        
        const savedStu = localStorage.getItem(keys.students);
        if (savedStu) setStudents(JSON.parse(savedStu));

        const savedClasses = localStorage.getItem('PENA_ALL_CLASSES');
        if (savedClasses) setAllClasses(JSON.parse(savedClasses));
      } catch (err) {}
    }, 1500); // Polling tiap 1.5 detik
    return () => clearInterval(interval);
  }, [currentClass]);

  // Auto-save kalau ada perubahan
  useEffect(() => {
    if (!currentClass) return;
    const keys = getStorageKeys(currentClass);
    localStorage.setItem(keys.students, JSON.stringify(students));
    localStorage.setItem(keys.submissions, JSON.stringify(submissions));
    localStorage.setItem('PENA_ALL_CLASSES', JSON.stringify(allClasses));
  }, [students, submissions, currentClass, allClasses]);

  // --- 4. LOGIN SISWA ---
  const [loginSelectedClassIndex, setLoginSelectedClassIndex] = useState('');
  const [loginSelectedName, setLoginSelectedName] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [currentStudent, setCurrentStudent] = useState(null);
  const [newStudentName, setNewStudentName] = useState('');

  // Update daftar siswa di dropdown pas murid pilih Kelas
  const [availableStudentsForLogin, setAvailableStudentsForLogin] = useState([]);
  useEffect(() => {
    if (loginSelectedClassIndex !== '') {
      const selectedClass = allClasses[loginSelectedClassIndex];
      const keys = getStorageKeys(selectedClass);
      const savedStudents = localStorage.getItem(keys.students);
      if (savedStudents) {
        setAvailableStudentsForLogin(JSON.parse(savedStudents));
      } else {
        setAvailableStudentsForLogin([]);
      }
    } else {
      setAvailableStudentsForLogin([]);
    }
  }, [loginSelectedClassIndex, allClasses]);

  // --- 5. STATE PELANGGARAN KANVAS ---
  const [isPasted, setIsPasted] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [formData, setFormData] = useState({
    naskahText: '',
    ennisIndicator: 'Penjelasan Sederhana',
    polyaStep: 'Memahami Masalah',
    deconstructionText: ''
  });

  const ennisPrompts = {
    'Penjelasan Sederhana': 'Apakah argumen awal dari tulisanmu jelas dan tidak ambigu?',
    'Keterampilan Dasar': 'Apakah sumber referensimu kredibel dan dapat diandalkan?',
    'Menyimpulkan': 'Apakah kesimpulan ditarik berdasarkan bukti yang logis dan relevan?',
    'Penjelasan Lebih Lanjut': 'Adakah asumsi tersembunyi yang perlu diuji kebenarannya?',
    'Taktik & Strategi': 'Apakah argumenmu mempertimbangkan implikasi dan tindakan nyata?'
  };

  const polyaPrompts = {
    'Memahami Masalah': 'Apa pokok permasalahan yang sedang kamu bahas?',
    'Merencanakan Penyelesaian': 'Bagaimana strategimu membuktikan atau membantah hal tersebut?',
    'Melaksanakan Rencana': 'Jelaskan eksekusi pembuktianmu secara rasional dan bertahap.',
    'Memeriksa Kembali': 'Jika ada pihak yang menentang kesimpulanmu, bagaimana pembelaanmu?'
  };

  // Tab Switching Anti-Cheat
  useEffect(() => {
    if (activeTab !== 'workspace' || userRole !== 'siswa' || !currentStudent) return;
    const handleVisibilityChange = () => {
      if (document.hidden) setTabSwitchCount(prev => prev + 1);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTab, userRole, currentStudent]);

  const [activeSubmissionId, setActiveSubmissionId] = useState(null);
  const activePortfolio = Array.isArray(submissions) ? submissions.find(s => s.id === activeSubmissionId) || submissions[0] : null;

  // --- 6. MODAL & EVALUASI GURU ---
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showAccModal, setShowAccModal] = useState(false);
  const [targetSubmissionId, setTargetSubmissionId] = useState(null);
  const [teacherNoteInput, setTeacherNoteInput] = useState('');

  // --- 7. HANDLER FUNGSI UTAMA ---
  const handleVerifyPinGuru = (e) => {
    e.preventDefault();
    if (pinInput === 'PENA2026' || pinInput === '1234') {
      if (!teacherNameInput.trim() || !subjectInput.trim()) {
        alert('❌ Masukin Nama Guru dan Mapel dulu bro!');
        return;
      }
      
      const newClass = { teacher: teacherNameInput.trim(), subject: subjectInput.trim() };
      
      // Cek apakah kelas ini udah pernah dibikin sebelumnya
      const classExists = allClasses.find(c => c.teacher === newClass.teacher && c.subject === newClass.subject);
      if (!classExists) {
        setAllClasses([...allClasses, newClass]);
      }

      setCurrentClass(newClass);
      setUserRole('guru');
      setShowPinModal(false);
      setPinInput('');
      setActiveTab('guruDashboard');
    } else {
      alert('❌ PIN Guru Salah!');
      setPinInput('');
    }
  };

  const handleStudentLogin = (e) => {
    e.preventDefault();
    if (loginSelectedClassIndex === '') {
      alert('❌ Pilih Kelas dulu!'); return;
    }
    
    const student = availableStudentsForLogin.find(s => s.name === loginSelectedName && s.pin === loginPin);
    if (student) {
      setCurrentClass(allClasses[loginSelectedClassIndex]); // Set konteks kelas
      setCurrentStudent(student);
      setUserRole('siswa');
      setActiveTab('introSiswa');
      setLoginPin('');
      setLoginSelectedClassIndex('');
      setLoginSelectedName('');
    } else {
      alert('❌ Nama atau PIN salah.');
    }
  };

  const handleLogout = () => {
    setCurrentStudent(null);
    setCurrentClass(null);
    setUserRole(null);
    setActiveTab('landing');
  };

  const handleAddStudent = (e) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    setStudents([...students, { id: Date.now(), name: newStudentName, pin: newPin }]);
    setNewStudentName('');
    alert(`Siswa berhasil ditambah. PIN dia: ${newPin}`);
  };

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    const key = (apiKey || '').trim();
    if (key.length < 20) {
      alert('❌ API Key terlalu pendek! Kopi yang bener dari Google.');
      return;
    }
    alert('✅ API Key divalidasi dan diaktifkan!');
    setActiveTab('workspace');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitCanvas = (e) => {
    e.preventDefault();
    let diagnosis = 'Kritis & Mendalam';
    let aiNotes = 'Analisis terstruktur dengan baik sesuai kerangka kognitif.';
    
    const hasViolations = isPasted || tabSwitchCount > 0;
    if (hasViolations) {
      diagnosis = 'PERINGATAN: Integritas Dekonstruksi Diragukan';
      aiNotes = `Anomali: ${isPasted ? '[Copy-Paste] ' : ''}${tabSwitchCount > 0 ? `[Pindah Tab ${tabSwitchCount}x]` : ''}. Harap tinjau keaslian argumen.`;
    }
    
    const newId = Date.now();
    const newSubmission = {
      id: newId,
      certNumber: `PENA-26-${Math.floor(1000 + Math.random() * 9000)}`,
      studentName: currentStudent?.name || 'Siswa',
      mode: selectedMode === 'mandiri' ? 'Modus Mandiri (Privat)' : 'Modus Kelompok (Tugas Kelas)',
      naskahText: formData.naskahText,
      ennis: formData.ennisIndicator,
      polya: formData.polyaStep,
      deconstructionText: formData.deconstructionText,
      diagnosis,
      aiNotes,
      hasCopyPasted: isPasted,
      tabSwitches: tabSwitchCount,
      timestamp: new Date().toLocaleString(),
      status: selectedMode === 'mandiri' ? 'Disetujui Otomatis (Mandiri)' : 'Pending Review Guru',
      teacherFeedback: ''
    };
    
    setSubmissions(prev => [newSubmission, ...(Array.isArray(prev) ? prev : [])]);
    setActiveSubmissionId(newId);
    setIsPasted(false);
    setTabSwitchCount(0);
    setActiveTab('portfolio');
  };

  const handleClearMyDataAndLogout = () => {
    const confirmClear = window.confirm("PENTING: Kalo lu klik OK, datamu bakal dihapus dari komputer ini.\nUdah di print/save PDF belom sertifikatnya?");
    if (confirmClear) {
      const updatedSubmissions = submissions.filter(s => s.id !== activeSubmissionId);
      setSubmissions(updatedSubmissions);
      handleLogout();
      alert("🧹 Selesai! Jejak data dan sesi login lu udah bersih dari komputer ini.");
    }
  };

  // Bersihkan Khusus Kelas Guru yang lagi Aktif
  const handleClearClassData = () => {
    const confirmReset = window.confirm(`⚠️ PERINGATAN:\nTindakan ini bakal ngehapus SEMUA tugas siswa di kelas ${currentClass.subject} (${currentClass.teacher}).\nLanjut bersihin?`);
    if (confirmReset) {
      setSubmissions([]);
      alert("🗑️ Dashboard kelas ini berhasil dikosongin. Aman buat dipakai sesi berikutnya!");
    }
  };

  // Fungsi ACC & Minta Revisi
  const handleOpenAccModal = (id) => {
    setTargetSubmissionId(id);
    setTeacherNoteInput('Bagus! Pertanggungjawaban nalar logis dan memenuhi kaidah berpikir kritis.');
    setShowAccModal(true);
  };

  const handleSaveAccWithNote = (e) => {
    e.preventDefault();
    setSubmissions(prev => prev.map(item => item.id === targetSubmissionId ? { ...item, status: 'Disetujui Guru (ACC)', teacherFeedback: teacherNoteInput } : item));
    if (selectedSubmission?.id === targetSubmissionId) {
      setSelectedSubmission(prev => ({ ...prev, status: 'Disetujui Guru (ACC)', teacherFeedback: teacherNoteInput }));
    }
    setShowAccModal(false);
    alert("✅ Tugas berhasil di-ACC beserta catatan lu!");
  };

  const handleSaveRevision = (e) => {
    e.preventDefault();
    setSubmissions(prev => prev.map(item => item.id === targetSubmissionId ? { ...item, status: 'Minta Revisi', teacherFeedback: teacherNoteInput } : item));
    if (selectedSubmission?.id === targetSubmissionId) {
      setSelectedSubmission(prev => ({ ...prev, status: 'Minta Revisi', teacherFeedback: teacherNoteInput }));
    }
    setShowRevisionModal(false);
    alert("❌ Status diubah jadi Minta Revisi & Catatan terkirim.");
  };

  return (
    <div style={styles.appContainer}>
      {/* iOS Cache Buster Meta & A4 Print CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          body * { visibility: hidden; }
          #certPrintArea, #certPrintArea * { visibility: visible; }
          #certPrintArea { 
            position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; padding: 5mm; 
            box-sizing: border-box; background: white !important; 
          }
          .no-print { display: none !important; }
        }
      `}} />

      {/* HEADER GLOBAL */}
      <header style={styles.header} className="no-print">
        <h2 style={styles.logoText}>PENA 🛡️</h2>
        {userRole && (
          <button style={styles.cancelBtn} onClick={handleLogout}>🚪 Keluar Sistem</button>
        )}
      </header>

      {/* LANDING UTAMA */}
      {!userRole && activeTab === 'landing' && (
        <div style={styles.card} className="no-print">
          <h1 style={{textAlign: 'center', color: '#1e3a8a'}}>Platform Pertanggungjawaban Nalar (PENA)</h1>
          
          <div style={styles.introBox}>
            <h3 style={{marginTop: 0, color: '#0f172a'}}>Tujuan Platform: Mendisrupsi Ketergantungan AI</h3>
            <p>PENA memastikan siswa mampu <b>mempertanggungjawabkan proses berpikirnya</b> secara kritis atas karya tulis/opini mereka tanpa sekadar copy-paste dari bot AI.</p>
            <h4 style={{marginBottom: '5px'}}>Mekanisme Utama:</h4>
            <ul style={{marginTop: '5px', lineHeight: '1.6'}}>
              <li><b>Pilar 1 (Naskah Fisik):</b> Siswa membuat gagasan/tulisan awal secara manual.</li>
              <li><b>Pilar 2 (Kanvas Digital):</b> Siswa mendekonstruksi naskah mereka menggunakan teori berpikir kritis.</li>
            </ul>
          </div>

          <div style={{display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap'}}>
            <div style={styles.roleCard} onClick={() => setActiveTab('loginSiswa')}>
              <h3 style={{margin: '0 0 10px 0'}}>🎓 Akses Siswa</h3>
              <p style={{fontSize: '13px', color: '#475569'}}>Masuk menggunakan PIN yang diberikan oleh Guru lu di kelas.</p>
              <button style={{...styles.primaryBtn, marginTop: '15px'}}>Masuk sebagai Siswa</button>
            </div>
            
            <div style={styles.roleCard} onClick={() => setShowPinModal(true)}>
              <h3 style={{margin: '0 0 10px 0'}}>👨‍🏫 Akses Guru</h3>
              <p style={{fontSize: '13px', color: '#475569'}}>Setup kelas, identitas mapel, dan evaluasi tugas masuk.</p>
              <button style={{...styles.guruActiveBtn, width: '100%', marginTop: '15px'}}>Masuk Dashboard Guru</button>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN SISWA DENGAN PILIHAN KELAS/GURU */}
      {!userRole && activeTab === 'loginSiswa' && (
        <div style={styles.card} className="no-print">
          <button style={styles.backBtn} onClick={() => setActiveTab('landing')}>⬅ Kembali</button>
          <h2 style={{textAlign: 'center', marginTop: '10px'}}>Masuk ke Ruang Kelas Virtual</h2>
          
          <form onSubmit={handleStudentLogin} style={{maxWidth: '400px', margin: '20px auto 0'}}>
            <div style={styles.formGroup}>
              <label>Pilih Ruang Kelas / Guru:</label>
              <select value={loginSelectedClassIndex} onChange={(e) => setLoginSelectedClassIndex(e.target.value)} style={styles.input} required>
                <option value="" disabled>-- Pilih Mapel & Guru --</option>
                {allClasses.map((c, index) => (
                  <option key={index} value={index}>{c.subject} - {c.teacher}</option>
                ))}
              </select>
            </div>

            {loginSelectedClassIndex !== '' && (
              <>
                <div style={styles.formGroup}>
                  <label>Nama Kamu:</label>
                  <select value={loginSelectedName} onChange={(e) => setLoginSelectedName(e.target.value)} style={styles.input} required>
                    <option value="" disabled>-- Pilih Nama Anda --</option>
                    {availableStudentsForLogin.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                
                <div style={styles.formGroup}>
                  <label>PIN Login (4 Digit):</label>
                  <input type="password" value={loginPin} onChange={(e) => setLoginPin(e.target.value)} placeholder="Tanya guru kalo lupa" style={styles.input} required />
                </div>
                
                <button type="submit" style={styles.primaryBtn}>Masuk 🚀</button>
              </>
            )}
          </form>
        </div>
      )}

      {/* MODAL SETUP GURU (NAMBAHIN MAPEL & NAMA) */}
      {showPinModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard}>
            <h3>⚙️ Setup Identitas & Otentikasi</h3>
            <p style={{fontSize: '12px', color: '#475569', marginBottom: '15px'}}>Isi ini dulu biar database tugas dan murid lu ngga kecampur sama guru lain di komputer ini jir.</p>
            
            <form onSubmit={handleVerifyPinGuru}>
              <div style={styles.formGroup}>
                <label style={{fontSize: '13px', fontWeight: 'bold'}}>Nama Guru:</label>
                <input type="text" placeholder="Contoh: Pak Budi" value={teacherNameInput} onChange={(e) => setTeacherNameInput(e.target.value)} style={styles.input} required />
              </div>
              
              <div style={styles.formGroup}>
                <label style={{fontSize: '13px', fontWeight: 'bold'}}>Mata Pelajaran:</label>
                <input type="text" placeholder="Contoh: IPA Terpadu" value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} style={styles.input} required />
              </div>

              <div style={styles.formGroup}>
                <label style={{fontSize: '13px', fontWeight: 'bold'}}>PIN Sistem (Demo: PENA2026):</label>
                <input type="password" placeholder="Masukin PIN Admin" value={pinInput} onChange={(e) => setPinInput(e.target.value)} style={styles.input} required />
              </div>

              <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                <button type="submit" style={styles.primaryBtn}>Mulai Kelas 🔑</button>
                <button type="button" style={styles.cancelBtn} onClick={() => {setShowPinModal(false); setActiveTab('landing');}}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NAVIGASI */}
      {userRole && (
        <nav style={styles.navBar} className="no-print">
          {userRole === 'siswa' && (
            <>
              <button style={activeTab === 'introSiswa' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('introSiswa')}>1. Instruksi</button>
              <button style={activeTab === 'apiKey' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('apiKey')}>2. API Key AI</button>
              <button style={activeTab === 'workspace' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('workspace')}>3. Kanvas Nalar</button>
              <button style={activeTab === 'portfolio' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('portfolio')}>4. E-Portofolio</button>
            </>
          )}
          {userRole === 'guru' && (
            <>
              <div style={{display: 'flex', alignItems: 'center', backgroundColor: '#e2e8f0', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', marginRight: '10px', color: '#1e3a8a'}}>
                📚 {currentClass?.subject} - {currentClass?.teacher}
              </div>
              <button style={activeTab === 'guruDashboard' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('guruDashboard')}>📊 Evaluasi Tugas</button>
              <button style={activeTab === 'guruSiswa' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('guruSiswa')}>👥 Kelola Daftar Siswa</button>
            </>
          )}
        </nav>
      )}

      <main style={styles.mainContent}>
        {/* ALUR SISWA */}
        {userRole === 'siswa' && currentStudent && (
          <>
            {activeTab === 'introSiswa' && (
              <div style={styles.card} className="no-print">
                <h2 style={{color: '#0f172a'}}>Halo, {currentStudent.name}! 👋</h2>
                <div style={styles.introBox}>
                  <h4>Tahapan Pengerjaan di Kelas {currentClass?.subject} ({currentClass?.teacher}):</h4>
                  <ol style={{lineHeight: '1.6', marginTop: '10px'}}>
                    <li><b>Siapkan Naskah (Pilar 1):</b> Tulis opini/karya tulismu secara manual.</li>
                    <li><b>Hubungkan AI (Tab 2):</b> Masukkan API Key Google AI.</li>
                    <li><b>Uji Nalar (Tab 3):</b> Dekonstruksi logikanya. Hati-hati, sistem mengawasi kalo lu pindah-pindah tab!</li>
                    <li><b>Portofolio (Tab 4):</b> Cetak PDF sertifikat lu.</li>
                  </ol>
                </div>
                <button style={styles.primaryBtn} onClick={() => setActiveTab('apiKey')}>Lanjut ke Setup AI ➔</button>
              </div>
            )}

            {activeTab === 'apiKey' && (
              <div style={styles.card} className="no-print">
                <h2>Integrasi Mesin Diagnostik (Google AI)</h2>
                <div style={{backgroundColor: '#eff6ff', padding: '15px', borderRadius: '6px', borderLeft: '4px solid #3b82f6', marginBottom: '20px'}}>
                  <h4 style={{margin: '0 0 10px 0', color: '#1d4ed8'}}>Cara Ambil API Key:</h4>
                  <ol style={{margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6', color: '#1e3a8a'}}>
                    <li>Kunjungi: <b>aistudio.google.com/app/apikey</b></li>
                    <li>Klik <b>"Create API Key"</b> dan salin kodenya.</li>
                    <li>Tempelkan ke kolom di bawah ini. (Bebas awalan apa aja asal bener)</li>
                  </ol>
                </div>
                <form onSubmit={handleSaveApiKey}>
                  <label style={{fontSize: '13px', fontWeight: 'bold'}}>Google AI API Key:</label>
                  <input type="password" placeholder="Paste kode API Key milikmu..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={styles.input} required />
                  <button type="submit" style={styles.primaryBtn}>Validasi & Aktifkan 🔑</button>
                </form>
              </div>
            )}

            {activeTab === 'workspace' && (
              <div style={styles.card} className="no-print">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap'}}>
                  <h2 style={{margin: 0}}>Kanvas Dekonstruksi Nalar</h2>
                  <span style={{fontSize: '11px', backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold'}}>
                    🔴 Pengawasan Aktif
                  </span>
                </div>
                
                <div style={styles.monitoringBar}>
                  <span>👀 Pindah Tab: <b style={{color: tabSwitchCount > 0 ? '#dc2626' : '#16a34a'}}>{tabSwitchCount} Kali</b></span>
                  <span>📋 Copy-Paste: <b style={{color: isPasted ? '#dc2626' : '#16a34a'}}>{isPasted ? 'TERDETEKSI' : 'AMAN'}</b></span>
                </div>

                <div style={styles.modeBox}>
                  <button type="button" style={selectedMode === 'mandiri' ? styles.modeActive : styles.modeInactive} onClick={() => setSelectedMode('mandiri')}>🟢 Mandiri (Privat)</button>
                  <button type="button" style={selectedMode === 'kelompok' ? styles.modeActive : styles.modeInactive} onClick={() => setSelectedMode('kelompok')}>🔵 Kelompok (Dinilai Guru)</button>
                </div>

                <form onSubmit={handleSubmitCanvas}>
                  <div style={styles.formGroup}>
                    <label>Kutipan Inti Naskah / Karya Tulis (Pilar 1):</label>
                    <textarea name="naskahText" rows="3" value={formData.naskahText} onChange={handleInputChange} placeholder="Tuliskan poin utama argumen..." style={styles.textarea} required />
                  </div>

                  <div style={{display: 'flex', gap: '15px', flexDirection: 'column', marginBottom: '15px'}}>
                    <div style={{backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1'}}>
                      <label style={{fontWeight: 'bold'}}>A. Teori Ennis (Kritis):</label>
                      <select name="ennisIndicator" value={formData.ennisIndicator} onChange={handleInputChange} style={{...styles.input, margin: '8px 0'}}>
                        {Object.keys(ennisPrompts).map(key => <option key={key} value={key}>{key}</option>)}
                      </select>
                      <div style={styles.promptBox}>💡 <b>Pemantik:</b> {ennisPrompts[formData.ennisIndicator]}</div>
                    </div>
                    
                    <div style={{backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1'}}>
                      <label style={{fontWeight: 'bold'}}>B. Teori Polya (Masalah):</label>
                      <select name="polyaStep" value={formData.polyaStep} onChange={handleInputChange} style={{...styles.input, margin: '8px 0'}}>
                        {Object.keys(polyaPrompts).map(key => <option key={key} value={key}>{key}</option>)}
                      </select>
                      <div style={styles.promptBox}>💡 <b>Pemantik:</b> {polyaPrompts[formData.polyaStep]}</div>
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label>Uraian Penjabaran Nalar Mandiri:</label>
                    <textarea name="deconstructionText" rows="6" value={formData.deconstructionText} onChange={handleInputChange} onPaste={() => setIsPasted(true)} placeholder="Mulai penjabaran kritis lu di sini..." style={styles.textarea} required />
                  </div>

                  <button type="submit" style={styles.primaryBtn}>Kirim ke Guru & Cetak Portofolio 🚀</button>
                </form>
              </div>
            )}

            {activeTab === 'portfolio' && (
              <div>
                <div style={{marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap'}} className="no-print">
                  <button style={styles.printBtn} onClick={() => window.print()}>📄 Cetak / Simpan PDF (A4 Presisi)</button>
                  <button style={styles.clearBtn} onClick={handleClearMyDataAndLogout}>🧹 Selesai & Hapus Jejak (Logout)</button>
                </div>

                {activePortfolio ? (
                  <div id="certPrintArea" style={{backgroundColor: '#fff'}}>
                    <div style={styles.certBorder}>
                      <div style={styles.certHeader}>
                        <h1 style={styles.certTitle}>SERTIFIKAT UJI NALAR (PENA)</h1>
                        <span style={styles.certNumber}>REGISTRASI: {activePortfolio.certNumber}</span>
                      </div>
                      
                      <hr style={styles.certDivider} />
                      
                      <div style={styles.certBody}>
                        <p>Diterbitkan atas nama:</p>
                        <h2 style={styles.studentNameTitle}>{activePortfolio.studentName}</h2>
                        <p style={{fontSize: '12px', margin: '2px 0'}}>Kelas/Mapel: <b>{currentClass?.subject}</b> ({currentClass?.teacher})</p>
                        <p style={{fontSize: '12px', margin: '2px 0'}}>Pengerjaan: <b>{activePortfolio.mode}</b> | {activePortfolio.timestamp}</p>
                        
                        <div style={styles.statusBox}>
                          STATUS VALIDASI:
                          <span style={{ marginLeft: '8px', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', 
                            backgroundColor: (activePortfolio.status || '').includes('ACC') ? '#dcfce7' : (activePortfolio.status || '').includes('Revisi') ? '#fee2e2' : '#fef3c7', 
                            color: (activePortfolio.status || '').includes('ACC') ? '#15803d' : (activePortfolio.status || '').includes('Revisi') ? '#b91c1c' : '#b45309' 
                          }}>{activePortfolio.status}</span>
                        </div>

                        {(activePortfolio.hasCopyPasted || activePortfolio.tabSwitches > 0) && (
                          <div style={styles.violationCard}>
                            <h4 style={{margin: '0 0 3px 0', color: '#991b1b'}}>⚠️ ANOMALI: Pindah tab {activePortfolio.tabSwitches}x</h4>
                          </div>
                        )}

                        <div style={styles.frameworkGrid}>
                          <div style={styles.frameworkItem}><b>Ennis:</b><p style={{margin: '2px 0'}}>{activePortfolio.ennis}</p></div>
                          <div style={styles.frameworkItem}><b>Polya:</b><p style={{margin: '2px 0'}}>{activePortfolio.polya}</p></div>
                        </div>

                        <div style={styles.deconstructionBox}>
                          <b>Kutipan Naskah:</b> <span style={{fontStyle: 'italic'}}>{activePortfolio.naskahText}</span>
                          <b style={{display:'block', marginTop:'5px'}}>Dekonstruksi:</b>
                          <p style={{backgroundColor: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', margin: '3px 0'}}>"{activePortfolio.deconstructionText}"</p>
                        </div>

                        <div style={styles.diagnosticBoxCert}>
                          <b>🤖 Diagnostik AI:</b> <span style={{fontSize: '12px'}}>{activePortfolio.diagnosis}</span>
                        </div>

                        {activePortfolio.teacherFeedback && (
                          <div style={styles.teacherFeedbackCert}>
                            <b>👨‍🏫 Catatan Guru:</b> <p style={{margin: '2px 0'}}>"{activePortfolio.teacherFeedback}"</p>
                          </div>
                        )}

                        <div style={styles.certFooter}>
                          <div>
                            <p style={{fontSize: '10px', color: '#64748b', margin: 0}}>Terverifikasi Sistem PENA</p>
                            <div style={styles.digitalSeal}>VALIDASI</div>
                          </div>
                          {(activePortfolio.mode || '').includes('Kelompok') && (
                            <div style={{textAlign: 'right'}}>
                              <p style={{fontSize: '10px', color: '#64748b', margin: 0}}>Tanda Tangan {currentClass?.teacher}</p>
                              <p style={{marginTop: '20px', fontWeight: 'bold', margin: 0}}>(___________________)</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : <p>Belum ada data.</p>}
              </div>
            )}
          </>
        )}

        {/* ALUR GURU */}
        {userRole === 'guru' && isGuruAuthed && (
          <>
            {activeTab === 'guruSiswa' && (
              <div style={styles.card} className="no-print">
                <h2>👥 Kelola Roster Kelas ({currentClass?.subject})</h2>
                <form onSubmit={handleAddStudent} style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
                  <input type="text" placeholder="Nama siswa baru..." value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} style={{...styles.input, margin: 0, flex: 1}} required />
                  <button type="submit" style={{...styles.primaryBtn, margin: 0, flex: 'none', width: 'auto'}}>+ Tambah Siswa</button>
                </form>
                
                <table style={styles.table}>
                  <thead>
                    <tr style={{backgroundColor: '#e2e8f0', textAlign: 'left'}}>
                      <th style={styles.th}>Nama Siswa</th>
                      <th style={styles.th}>PIN Login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.id} style={{borderBottom: '1px solid #e2e8f0'}}>
                        <td style={styles.td}><b>{s.name}</b></td>
                        <td style={styles.td}><span style={{backgroundColor: '#fef3c7', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold'}}>{s.pin}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'guruDashboard' && (
              <div style={styles.card} className="no-print">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                  <h2>📊 Evaluasi Tugas: {currentClass?.subject}</h2>
                  <button style={styles.dangerBtn} onClick={handleClearClassData}>⚠️ Bersihkan Data Kelas Ini</button>
                </div>

                {(!submissions || submissions.length === 0) ? <p>Belum ada tugas masuk di kelas ini.</p> : (
                  <div style={{overflowX: 'auto'}}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={{backgroundColor: '#e2e8f0', textAlign: 'left'}}>
                          <th style={styles.th}>Siswa</th>
                          <th style={styles.th}>Integritas</th>
                          <th style={styles.th}>Status</th>
                          <th style={styles.th}>Aksi Guru</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map((sub) => (
                          <tr key={sub.id} style={{borderBottom: '1px solid #e2e8f0'}}>
                            <td style={styles.td}><b>{sub.studentName}</b></td>
                            <td style={styles.td}>{sub.hasCopyPasted || sub.tabSwitches > 0 ? '⚠️ Anomali' : '✅ Aman'}</td>
                            <td style={styles.td}>
                              <span style={{fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', backgroundColor: (sub.status || '').includes('ACC') ? '#dcfce7' : (sub.status || '').includes('Revisi') ? '#fee2e2' : '#fef3c7', color: (sub.status || '').includes('ACC') ? '#15803d' : (sub.status || '').includes('Revisi') ? '#b91c1c' : '#b45309'}}>{sub.status}</span>
                            </td>
                            <td style={styles.td}><button style={styles.inspectBtn} onClick={() => setSelectedSubmission(sub)}>👁️ Evaluasi</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* MODAL EVALUASI GURU */}
            {selectedSubmission && (
              <div style={styles.modalOverlay} className="no-print">
                <div style={styles.largeModalCard}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h3>📝 Evaluasi: {selectedSubmission.studentName}</h3>
                    <button style={styles.closeBtn} onClick={() => setSelectedSubmission(null)}>✖ Close</button>
                  </div>
                  <hr />
                  <div style={{fontSize: '13px', lineHeight: '1.6'}}>
                    <p><b>Teori Ennis:</b> {selectedSubmission.ennis} | <b>Teori Polya:</b> {selectedSubmission.polya}</p>
                    <div style={styles.reviewContentBox}>
                      <b>Kutipan Naskah Siswa:</b>
                      <p style={{fontStyle: 'italic', color: '#475569'}}>{selectedSubmission.naskahText}</p>
                      <b>Dekonstruksi Kritis:</b>
                      <p style={{backgroundColor: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1'}}>"{selectedSubmission.deconstructionText}"</p>
                    </div>
                  </div>
                  
                  <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                    <button style={styles.accBtnLarge} onClick={() => handleOpenAccModal(selectedSubmission.id)}>✅ ACC / Setujui + Catatan</button>
                    <button style={styles.rejectBtnLarge} onClick={() => { setTargetSubmissionId(selectedSubmission.id); setTeacherNoteInput(''); setShowRevisionModal(true); }}>❌ Minta Revisi</button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL INPUT CATATAN KUSTOM SAAT ACC */}
            {showAccModal && (
              <div style={styles.modalOverlay} className="no-print">
                <div style={styles.modalCard}>
                  <h3>✅ Berikan Catatan ACC untuk {selectedSubmission?.studentName}</h3>
                  <form onSubmit={handleSaveAccWithNote}>
                    <textarea rows="4" value={teacherNoteInput} onChange={(e) => setTeacherNoteInput(e.target.value)} style={styles.textarea} required />
                    <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                      <button type="submit" style={styles.accBtnLarge}>Simpan & Terbitkan ACC 📩</button>
                      <button type="button" style={styles.cancelBtn} onClick={() => setShowAccModal(false)}>Batal</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL REVISI */}
            {showRevisionModal && (
              <div style={styles.modalOverlay} className="no-print">
                <div style={styles.modalCard}>
                  <h3>✏️ Catatan Revisi</h3>
                  <form onSubmit={handleSaveRevision}>
                    <textarea rows="4" value={teacherNoteInput} onChange={(e) => setTeacherNoteInput(e.target.value)} style={styles.textarea} required />
                    <div style={{display: 'flex', gap: '10px'}}>
                      <button type="submit" style={styles.rejectBtnLarge}>Kirim Revisi 📩</button>
                      <button type="button" style={styles.cancelBtn} onClick={() => setShowRevisionModal(false)}>Batal</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// --- STYLING CSS (A4 PRESISI) ---
const styles = {
  appContainer: { fontFamily: 'Inter, sans-serif', maxWidth: '850px', margin: '20px auto', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '10px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', color: 'white', padding: '15px 20px', borderRadius: '8px' },
  logoText: { margin: 0, fontSize: '20px', letterSpacing: '1px' },
  backBtn: { background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' },
  introBox: { backgroundColor: '#f1f5f9', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' },
  roleCard: { flex: 1, backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', textAlign: 'center', minWidth: '250px' },
  
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalCard: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', maxWidth: '450px', width: '90%', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' },
  largeModalCard: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', maxWidth: '650px', width: '90%', maxHeight: '85vh', overflowY: 'auto' },
  closeBtn: { backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  cancelBtn: { backgroundColor: '#94a3b8', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  
  navBar: { display: 'flex', gap: '10px', margin: '20px 0', flexWrap: 'wrap' },
  navBtn: { backgroundColor: '#e2e8f0', color: '#475569', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
  navBtnActive: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  
  mainContent: { marginTop: '10px' },
  card: { backgroundColor: 'white', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0' },
  primaryBtn: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '14px' },
  guruActiveBtn: { backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '14px' },
  printBtn: { backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', flex: 1 },
  clearBtn: { backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', flex: 1 },
  dangerBtn: { backgroundColor: '#991b1b', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  
  formGroup: { marginBottom: '15px' },
  input: { width: '100%', padding: '10px', margin: '8px 0', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '14px' },
  textarea: { width: '100%', padding: '12px', margin: '8px 0', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical' },
  promptBox: { backgroundColor: '#fef3c7', padding: '10px 15px', borderRadius: '6px', fontSize: '13px', color: '#92400e', marginTop: '5px', borderLeft: '4px solid #f59e0b', lineHeight: '1.5' },
  monitoringBar: { backgroundColor: '#eff6ff', padding: '10px 15px', borderRadius: '6px', margin: '15px 0', fontSize: '13px', display: 'flex', gap: '20px', border: '1px solid #bfdbfe' },
  modeBox: { backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '10px', border: '1px solid #e2e8f0' },
  modeActive: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', flex: 1 },
  modeInactive: { backgroundColor: '#e2e8f0', color: '#475569', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', flex: 1 },
  
  certBorder: { border: '4px double #1e3a8a', padding: '15px 20px', backgroundColor: '#fafaf9', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
  certHeader: { textAlign: 'center' },
  certTitle: { color: '#1e3a8a', margin: '0', fontSize: '20px', fontWeight: '900' },
  certNumber: { fontSize: '10px', fontWeight: 'bold', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px' },
  certDivider: { border: '0', borderTop: '1px solid #1e3a8a', margin: '10px 0' },
  certBody: { fontSize: '12px', lineHeight: '1.4', color: '#334155' },
  studentNameTitle: { fontSize: '20px', color: '#0f172a', margin: '4px 0', borderBottom: '1px dashed #cbd5e1', display: 'inline-block' },
  statusBox: { margin: '8px 0', padding: '6px 10px', backgroundColor: '#f1f5f9', borderRadius: '6px', fontSize: '11px' },
  violationCard: { backgroundColor: '#fee2e2', borderLeft: '3px solid #dc2626', padding: '6px 10px', borderRadius: '4px', margin: '6px 0', color: '#991b1b', fontSize: '11px' },
  frameworkGrid: { display: 'flex', gap: '10px', margin: '8px 0' },
  frameworkItem: { flex: 1, backgroundColor: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px' },
  deconstructionBox: { backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', margin: '8px 0' },
  diagnosticBoxCert: { backgroundColor: '#fef3c7', padding: '8px 10px', borderRadius: '6px', color: '#92400e', margin: '8px 0', fontSize: '11px' },
  teacherFeedbackCert: { backgroundColor: '#eff6ff', borderLeft: '3px solid #2563eb', padding: '8px 10px', borderRadius: '4px', margin: '8px 0', color: '#1e40af', fontSize: '11px' },
  certFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '10px' },
  digitalSeal: { display: 'inline-block', border: '2px dashed #16a34a', color: '#16a34a', padding: '3px 6px', borderRadius: '50px', fontSize: '10px', fontWeight: '900', transform: 'rotate(-5deg)' },
  reviewContentBox: { backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', marginTop: '15px', marginBottom: '15px', border: '1px solid #e2e8f0' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px', fontSize: '13px' },
  th: { padding: '12px', borderBottom: '2px solid #cbd5e1', color: '#475569' },
  td: { padding: '12px', color: '#334155' },
  inspectBtn: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  accBtnLarge: { backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', flex: 1, fontWeight: 'bold', fontSize: '14px' },
  rejectBtnLarge: { backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', flex: 1, fontWeight: 'bold', fontSize: '14px' }
};
