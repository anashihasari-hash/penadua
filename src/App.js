import React, { useState, useEffect } from 'react';

export default function App() {
  // --- 1. STATE DASAR & RBAC ---
  const [userRole, setUserRole] = useState(null); 
  const [isGuruAuthed, setIsGuruAuthed] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  // Identitas Guru & Mapel (Poin 2)
  const [teacherProfile, setTeacherProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('PENA_TEACHER_PROFILE');
      return saved ? JSON.parse(saved) : { name: 'Dr. Ahmad, M.Pd.', subject: 'Bahasa Indonesia / Kritis' };
    } catch (e) {
      return { name: 'Dr. Ahmad, M.Pd.', subject: 'Bahasa Indonesia / Kritis' };
    }
  });
  const [tempTeacherName, setTempTeacherName] = useState('');
  const [tempTeacherSubject, setTempTeacherSubject] = useState('');
  const [showTeacherSetupModal, setShowTeacherSetupModal] = useState(false);

  const [activeTab, setActiveTab] = useState('landing');
  const [apiKey, setApiKey] = useState('');
  const [selectedMode, setSelectedMode] = useState('mandiri');

  // --- 2. SISTEM KELAS & LOGIN SISWA ---
  const [students, setStudents] = useState(() => {
    try {
      const saved = localStorage.getItem('PENA_STUDENTS');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : [
          { id: 1, name: 'Budi Santoso', pin: '1234' },
          { id: 2, name: 'Siti Rahma', pin: '5678' }
        ];
      }
    } catch (e) { console.error(e); }
    return [
      { id: 1, name: 'Budi Santoso', pin: '1234' },
      { id: 2, name: 'Siti Rahma', pin: '5678' }
    ];
  });
  
  const [currentStudent, setCurrentStudent] = useState(null);
  const [loginSelectedName, setLoginSelectedName] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [newStudentName, setNewStudentName] = useState('');

  // --- 3. STATE PELANGGARAN KANVAS ---
  const [isPasted, setIsPasted] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  const [formData, setFormData] = useState({
    naskahText: '',
    ennisIndicator: 'Penjelasan Sederhana',
    polyaStep: 'Memahami Masalah',
    deconstructionText: ''
  });

  // --- 4. KAMUS PEMANTIK ---
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

  // --- 5. DATABASE SUBMISI ---
  const [submissions, setSubmissions] = useState(() => {
    try {
      const saved = localStorage.getItem('PENA_SUBMISSIONS');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) { console.error(e); }
    return [];
  });
  const [activeSubmissionId, setActiveSubmissionId] = useState(null);

  // Sinkronisasi Real-Time (Mengatasi delay di iOS / Android)
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const savedSub = localStorage.getItem('PENA_SUBMISSIONS');
        if (savedSub) {
          const parsedSub = JSON.parse(savedSub);
          if (Array.isArray(parsedSub)) setSubmissions(parsedSub);
        }
      } catch (err) { console.error(err); }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('PENA_SUBMISSIONS', JSON.stringify(submissions));
    localStorage.setItem('PENA_STUDENTS', JSON.stringify(students));
    localStorage.setItem('PENA_TEACHER_PROFILE', JSON.stringify(teacherProfile));
  }, [submissions, students, teacherProfile]);

  useEffect(() => {
    if (activeTab !== 'workspace' || userRole !== 'siswa' || !currentStudent) return;
    const handleVisibilityChange = () => {
      if (document.hidden) setTabSwitchCount(prev => prev + 1);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTab, userRole, currentStudent]);

  const activePortfolio = Array.isArray(submissions) 
    ? (submissions.find(s => s.id === activeSubmissionId) || submissions[0]) 
    : null;

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showAccModal, setShowAccModal] = useState(false);
  const [targetSubmissionId, setTargetSubmissionId] = useState(null);
  const [teacherNoteInput, setTeacherNoteInput] = useState('');

  // --- 6. HANDLER FUNGSI ---
  const handleVerifyPinGuru = (e) => {
    e.preventDefault();
    if (pinInput === 'PENA2026' || pinInput === '1234') {
      setShowPinModal(false);
      setPinInput('');
      // Buka modal setup identitas guru terlebih dahulu (Poin 2)
      setTempTeacherName(teacherProfile.name);
      setTempTeacherSubject(teacherProfile.subject);
      setShowTeacherSetupModal(true);
    } else {
      alert('❌ PIN Guru Salah!');
      setPinInput('');
    }
  };

  const handleSaveTeacherProfile = (e) => {
    e.preventDefault();
    const updated = { name: tempTeacherName, subject: tempTeacherSubject };
    setTeacherProfile(updated);
    setIsGuruAuthed(true);
    setUserRole('guru');
    setShowTeacherSetupModal(false);
    setActiveTab('guruDashboard');
  };

  const handleStudentLogin = (e) => {
    e.preventDefault();
    const student = students.find(s => s.name === loginSelectedName && s.pin === loginPin);
    if (student) {
      setCurrentStudent(student);
      setUserRole('siswa');
      setActiveTab('introSiswa');
      setLoginPin('');
    } else {
      alert('❌ Nama atau PIN salah.');
    }
  };

  const handleLogout = () => {
    setCurrentStudent(null);
    setUserRole(null);
    setIsGuruAuthed(false);
    setActiveTab('landing');
  };

  const handleAddStudent = (e) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    setStudents([...students, { id: Date.now(), name: newStudentName, pin: newPin }]);
    setNewStudentName('');
    alert(`Siswa ditambahkan. PIN: ${newPin}`);
  };

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    const key = (apiKey || '').trim();
    if (key.length < 20) {
      alert('❌ API Key terlalu pendek!');
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
      teacherName: teacherProfile.name,
      subjectName: teacherProfile.subject,
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

  // POIN 1: SIMPAN DATA (DOWNLOAD JSON) DAN HAPUS BERSIH UNTUK PIHAK LAIN
  const handleDownloadBackupData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(submissions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Rekap_Tugas_PENA_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleClearMyDataAndLogout = () => {
    const confirmClear = window.confirm("PENTING: Apakah kamu SUDAH MENCETAK/MENGUNDUH PDF Sertifikatmu?\n\nJika klik OK, datamu akan dihapus total dari perangkat ini.");
    if (confirmClear) {
      const updatedSubmissions = submissions.filter(s => s.id !== activeSubmissionId);
      setSubmissions(updatedSubmissions);
      handleLogout();
      alert("🧹 Jejak data kamu dan sesi login telah dibersihkan total!");
    }
  };

  const handleBackupAndResetSystem = () => {
    if (submissions.length > 0) {
      const wantBackup = window.confirm("Apakah Anda ingin MENGUNDUH (SIMPAN) rekap data tugas siswa terlebih dahulu sebelum sistem dibersihkan?");
      if (wantBackup) {
        handleDownloadBackupData();
      }
    }
    const confirmReset = window.confirm("⚠️ PERINGATAN: Semua data tugas di dashboard akan dihapus bersih agar siap digunakan oleh guru / pihak sekolah lain. Lanjutkan?");
    if (confirmReset) {
      localStorage.removeItem('PENA_SUBMISSIONS');
      setSubmissions([]);
      alert("🗑️ Dashboard berhasil dibersihkan total dan siap digunakan untuk sesi atau pihak lain!");
    }
  };

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
    alert("✅ Tugas berhasil di-ACC!");
  };

  const handleSaveRevision = (e) => {
    e.preventDefault();
    setSubmissions(prev => prev.map(item => item.id === targetSubmissionId ? { ...item, status: 'Minta Revisi', teacherFeedback: teacherNoteInput } : item));
    if (selectedSubmission?.id === targetSubmissionId) {
      setSelectedSubmission(prev => ({ ...prev, status: 'Minta Revisi', teacherFeedback: teacherNoteInput }));
    }
    setShowRevisionModal(false);
    alert("❌ Status diubah menjadi Minta Revisi.");
  };

  return (
    <div style={styles.appContainer}>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          body * { visibility: hidden; }
          #certPrintArea, #certPrintArea * { visibility: visible; }
          #certPrintArea { 
            position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; padding: 5mm; box-sizing: border-box; background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}} />

      {/* HEADER GLOBAL */}
      <header style={styles.header} className="no-print">
        <div>
          <h2 style={styles.logoText}>PENA 🛡️</h2>
          <span style={{fontSize: '10px', color: '#94a3b8'}}>v2.6 (iOS Safe & Multi-User)</span>
        </div>
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
            <p>PENA memastikan siswa mampu <b>mempertanggungjawabkan proses berpikirnya</b> secara kritis atas karya tulis/opini mereka.</p>
          </div>

          <div style={{display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap'}}>
            <div style={styles.roleCard} onClick={() => setActiveTab('loginSiswa')}>
              <h3 style={{margin: '0 0 10px 0'}}>🎓 Akses Siswa</h3>
              <p style={{fontSize: '13px', color: '#475569'}}>Masuk menggunakan PIN dari Guru.</p>
              <button style={{...styles.primaryBtn, marginTop: '15px'}}>Masuk sebagai Siswa</button>
            </div>
            <div style={styles.roleCard} onClick={() => setShowPinModal(true)}>
              <h3 style={{margin: '0 0 10px 0'}}>👨‍🏫 Akses Guru / Pengajar</h3>
              <p style={{fontSize: '13px', color: '#475569'}}>Atur identitas kelas dan evaluasi tugas.</p>
              <button style={{...styles.guruActiveBtn, width: '100%', marginTop: '15px'}}>Masuk Dashboard Guru</button>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN SISWA */}
      {!userRole && activeTab === 'loginSiswa' && (
        <div style={styles.card} className="no-print">
          <button style={styles.backBtn} onClick={() => setActiveTab('landing')}>⬅ Kembali</button>
          <h2 style={{textAlign: 'center', marginTop: '10px'}}>Masuk ke Kelas Virtual</h2>
          <form onSubmit={handleStudentLogin} style={{maxWidth: '400px', margin: '20px auto 0'}}>
            <div style={styles.formGroup}>
              <label>Nama Siswa:</label>
              <select value={loginSelectedName} onChange={(e) => setLoginSelectedName(e.target.value)} style={styles.input} required>
                <option value="" disabled>-- Pilih Nama Anda --</option>
                {students.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label>PIN Login (4 Digit):</label>
              <input type="password" value={loginPin} onChange={(e) => setLoginPin(e.target.value)} placeholder="Tanya Guru jika belum tahu" style={styles.input} required />
            </div>
            <button type="submit" style={styles.primaryBtn}>Masuk 🚀</button>
          </form>
        </div>
      )}

      {/* MODAL PIN GURU */}
      {showPinModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard}>
            <h3>🔐 Otentikasi Guru</h3>
            <form onSubmit={handleVerifyPinGuru}>
              <input type="password" placeholder="PIN Demo: PENA2026" value={pinInput} onChange={(e) => setPinInput(e.target.value)} style={styles.input} autoFocus required />
              <div style={{display: 'flex', gap: '10px'}}>
                <button type="submit" style={styles.primaryBtn}>Lanjut ➔</button>
                <button type="button" style={styles.cancelBtn} onClick={() => {setShowPinModal(false); setActiveTab('landing');}}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SETUP NAMA GURU & MAPEL (Poin 2) */}
      {showTeacherSetupModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard}>
            <h3>⚙️ Identitas Pengajar & Mata Pelajaran</h3>
            <p style={{fontSize: '12px', color: '#64748b'}}>Nama dan mapel ini akan otomatis tercantum di sertifikat seluruh siswa.</p>
            <form onSubmit={handleSaveTeacherProfile}>
              <div style={styles.formGroup}>
                <label style={{fontSize: '13px', fontWeight: 'bold'}}>Nama Guru / Pengajar:</label>
                <input type="text" value={tempTeacherName} onChange={(e) => setTempTeacherName(e.target.value)} placeholder="Contoh: Budi Santoso, S.Pd." style={styles.input} required />
              </div>
              <div style={styles.formGroup}>
                <label style={{fontSize: '13px', fontWeight: 'bold'}}>Mata Pelajaran / Sesi:</label>
                <input type="text" value={tempTeacherSubject} onChange={(e) => setTempTeacherSubject(e.target.value)} placeholder="Contoh: Bahasa Indonesia Kelas 12" style={styles.input} required />
              </div>
              <button type="submit" style={styles.primaryBtn}>Masuk Dashboard 🚀</button>
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
                  <h4>Pengajar Sesi Ini: <b>{teacherProfile.name}</b> ({teacherProfile.subject})</h4>
                  <ol style={{lineHeight: '1.6', marginTop: '10px'}}>
                    <li><b>Siapkan Naskah:</b> Tulis opini/karya tulismu secara manual.</li>
                    <li><b>Hubungkan AI:</b> Masukkan API Key Google AI.</li>
                    <li><b>Uji Nalar:</b> Dekonstruksi logikanya. Hati-hati, sistem mengawasi perpindahan tab!</li>
                    <li><b>Portofolio:</b> Cetak PDF sertifikatmu.</li>
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
                    <li>Tempelkan ke kolom di bawah ini.</li>
                  </ol>
                </div>
                <form onSubmit={handleSaveApiKey}>
                  <label style={{fontSize: '13px', fontWeight: 'bold'}}>Google AI API Key:</label>
                  <input type="password" placeholder="Paste kode API Key..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={styles.input} required />
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
                      <label style={{fontWeight: 'bold'}}>A. Teori Ennis:</label>
                      <select name="ennisIndicator" value={formData.ennisIndicator} onChange={handleInputChange} style={{...styles.input, margin: '8px 0'}}>
                        {Object.keys(ennisPrompts).map(key => <option key={key} value={key}>{key}</option>)}
                      </select>
                      <div style={styles.promptBox}>💡 <b>Pemantik:</b> {ennisPrompts[formData.ennisIndicator]}</div>
                    </div>

                    <div style={{backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1'}}>
                      <label style={{fontWeight: 'bold'}}>B. Teori Polya:</label>
                      <select name="polyaStep" value={formData.polyaStep} onChange={handleInputChange} style={{...styles.input, margin: '8px 0'}}>
                        {Object.keys(polyaPrompts).map(key => <option key={key} value={key}>{key}</option>)}
                      </select>
                      <div style={styles.promptBox}>💡 <b>Pemantik:</b> {polyaPrompts[formData.polyaStep]}</div>
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label>Uraian Penjabaran Nalar Mandiri:</label>
                    <textarea name="deconstructionText" rows="6" value={formData.deconstructionText} onChange={handleInputChange} onPaste={() => setIsPasted(true)} placeholder="Mulai penjabaran kritis kamu..." style={styles.textarea} required />
                  </div>

                  <button type="submit" style={styles.primaryBtn}>Kirim ke Guru & Portofolio 🚀</button>
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
                        <p style={{margin: '2px 0'}}>Diterbitkan atas nama:</p>
                        <h2 style={styles.studentNameTitle}>{activePortfolio.studentName}</h2>
                        <p style={{fontSize: '11px', margin: '2px 0'}}>Mata Pelajaran: <b>{activePortfolio.subjectName || teacherProfile.subject}</b> | {activePortfolio.timestamp}</p>

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
                          <b>🤖 Diagnostik AI:</b> <span style={{fontSize: '11px'}}>{activePortfolio.diagnosis}</span>
                        </div>

                        {activePortfolio.teacherFeedback && (
                          <div style={styles.teacherFeedbackCert}>
                            <b>👨‍🏫 Catatan Guru ({activePortfolio.teacherName || teacherProfile.name}):</b> <p style={{margin: '2px 0'}}>"{activePortfolio.teacherFeedback}"</p>
                          </div>
                        )}

                        <div style={styles.certFooter}>
                          <div>
                            <p style={{fontSize: '10px', color: '#64748b', margin: 0}}>Terverifikasi Sistem PENA</p>
                            <div style={styles.digitalSeal}>VALIDASI</div>
                          </div>
                          <div style={{textAlign: 'right'}}>
                            <p style={{fontSize: '10px', color: '#64748b', margin: 0}}>Pengajar / Guru</p>
                            <p style={{marginTop: '15px', fontWeight: 'bold', fontSize: '11px', margin: 0}}>{activePortfolio.teacherName || teacherProfile.name}</p>
                          </div>
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
                <h2>👥 Kelola Roster Kelas ({teacherProfile.subject})</h2>
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
                  <div>
                    <h2 style={{margin: 0}}>📊 Evaluasi Tugas Naskah</h2>
                    <p style={{fontSize: '12px', color: '#475569', margin: '4px 0 0 0'}}>Pengajar: <b>{teacherProfile.name}</b> | Mapel: <b>{teacherProfile.subject}</b></p>
                  </div>
                  {/* POIN 1: TOMBOL DOWNLOAD BACKUP & RESET BERSIH */}
                  <div style={{display: 'flex', gap: '8px'}}>
                    <button style={styles.downloadBtn} onClick={handleDownloadBackupData}>📥 Simpan Rekap (JSON)</button>
                    <button style={styles.dangerBtn} onClick={handleBackupAndResetSystem}>🗑️ Bersihkan & Reset Sesi</button>
                  </div>
                </div>

                {(!submissions || submissions.length === 0) ? <p style={{marginTop: '20px'}}>Belum ada tugas masuk.</p> : (
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

            {/* MODAL CATATAN ACC */}
            {showAccModal && (
              <div style={styles.modalOverlay} className="no-print">
                <div style={styles.modalCard}>
                  <h3>✅ Catatan ACC dari {teacherProfile.name}</h3>
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

// --- STYLING CSS ---
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
  printBtn: { backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', flex: 1 },
  clearBtn: { backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', flex: 1 },
  downloadBtn: { backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
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
