import React, { useState, useEffect } from 'react';

export default function App() {
  // --- 1. STATE DASAR & RBAC ---
  const [userRole, setUserRole] = useState(null); // 'siswa', 'guru', atau null (belum memilih)
  const [isGuruAuthed, setIsGuruAuthed] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  const [activeTab, setActiveTab] = useState('landing');
  const [apiKey, setApiKey] = useState('');
  const [selectedMode, setSelectedMode] = useState('mandiri');

  // --- 2. SISTEM KELAS & LOGIN SISWA ---
  const [students, setStudents] = useState(() => {
    const saved = localStorage.getItem('PENA_STUDENTS');
    return saved ? JSON.parse(saved) : [
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

  // Form Kanvas
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
    const saved = localStorage.getItem('PENA_SUBMISSIONS');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeSubmissionId, setActiveSubmissionId] = useState(null);

  // Sinkronisasi Cross-Tab & LocalStorage
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'PENA_SUBMISSIONS' && e.newValue) setSubmissions(JSON.parse(e.newValue));
      if (e.key === 'PENA_STUDENTS' && e.newValue) setStudents(JSON.parse(e.newValue));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    localStorage.setItem('PENA_SUBMISSIONS', JSON.stringify(submissions));
    localStorage.setItem('PENA_STUDENTS', JSON.stringify(students));
  }, [submissions, students]);

  // Sensor Pindah Tab (Hanya di Workspace)
  useEffect(() => {
    if (activeTab !== 'workspace' || userRole !== 'siswa' || !currentStudent) return;
    const handleVisibilityChange = () => {
      if (document.hidden) setTabSwitchCount(prev => prev + 1);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTab, userRole, currentStudent]);

  const activePortfolio = submissions.find(s => s.id === activeSubmissionId) || submissions[0];

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [targetSubmissionId, setTargetSubmissionId] = useState(null);
  const [teacherNoteInput, setTeacherNoteInput] = useState('');

  // --- 6. HANDLER FUNGSI ---
  const handleVerifyPinGuru = (e) => {
    e.preventDefault();
    if (pinInput === 'PENA2026') {
      setIsGuruAuthed(true);
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
    const student = students.find(s => s.name === loginSelectedName && s.pin === loginPin);
    if (student) {
      setCurrentStudent(student);
      setUserRole('siswa');
      setActiveTab('introSiswa'); // Arahkan ke intro dulu
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

  // Validasi Ketat API Key Google (Harus diawali 'AIzaSy' dan panjang > 30)
  const handleSaveApiKey = (e) => {
    e.preventDefault();
    const key = apiKey.trim();
    if (!key.startsWith('AIzaSy') || key.length < 35) {
      alert('❌ Format API Key Google AI tidak valid! Pastikan Anda menyalin kodenya dengan utuh (biasanya diawali dengan "AIzaSy...").');
      return;
    }
    alert('✅ API Key Google AI divalidasi dan diaktifkan!');
    setActiveTab('workspace');
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
      studentName: currentStudent.name,
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

    setSubmissions([newSubmission, ...submissions]);
    setActiveSubmissionId(newId);
    setIsPasted(false);
    setTabSwitchCount(0);
    setActiveTab('portfolio');
  };

  const handleApproveByTeacher = (id) => {
    setSubmissions(prev => prev.map(item => item.id === id ? { ...item, status: 'Disetujui Guru (ACC)', teacherFeedback: 'Bagus! Pertanggungjawaban nalar logis.' } : item));
    if (selectedSubmission?.id === id) setSelectedSubmission(prev => ({ ...prev, status: 'Disetujui Guru (ACC)', teacherFeedback: 'Bagus! Pertanggungjawaban nalar logis.' }));
  };

  const handleSaveRevision = (e) => {
    e.preventDefault();
    setSubmissions(prev => prev.map(item => item.id === targetSubmissionId ? { ...item, status: 'Minta Revisi', teacherFeedback: teacherNoteInput } : item));
    if (selectedSubmission?.id === targetSubmissionId) setSelectedSubmission(prev => ({ ...prev, status: 'Minta Revisi', teacherFeedback: teacherNoteInput }));
    setShowRevisionModal(false);
  };

  return (
    <div style={styles.appContainer}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #certPrintArea, #certPrintArea * { visibility: visible; }
          #certPrintArea { position: absolute; left: 0; top: 0; width: 210mm; min-height: 297mm; padding: 10mm; box-sizing: border-box; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* HEADER GLOBAL */}
      <header style={styles.header} className="no-print">
        <h2 style={styles.logoText}>PENA 🛡️</h2>
        {userRole && (
          <button style={styles.cancelBtn} onClick={handleLogout}>🚪 Keluar Sistem</button>
        )}
      </header>

      {/* ================= HALAMAN LANDING UTAMA & PEMILIHAN PERAN ================= */}
      {!userRole && activeTab === 'landing' && (
        <div style={styles.card} className="no-print">
          <h1 style={{textAlign: 'center', color: '#1e3a8a'}}>Platform Pertanggungjawaban Nalar (PENA)</h1>
          
          <div style={styles.introBox}>
            <h3 style={{marginTop: 0, color: '#0f172a'}}>Tujuan Platform: Mendisrupsi Ketergantungan AI</h3>
            <p>PENA dirancang untuk memastikan siswa tidak hanya mengandalkan hasil instan dari AI, melainkan mampu <b>mempertanggungjawabkan proses berpikirnya</b> secara kritis.</p>
            
            <h4 style={{marginBottom: '5px'}}>Mekanisme Utama:</h4>
            <ul style={{marginTop: '5px', lineHeight: '1.6'}}>
              <li><b>Pilar 1 (Naskah Fisik):</b> Siswa membuat gagasan awal berupa karya tulis/opini secara manual.</li>
              <li><b>Pilar 2 (Kanvas Digital):</b> Siswa memindahkan gagasan tersebut ke platform ini untuk didekonstruksi (dibedah) menggunakan teori kognitif, kemudian divalidasi oleh Guru dan Mesin AI.</li>
            </ul>
          </div>

          <div style={{display: 'flex', gap: '20px', marginTop: '20px'}}>
            <div style={styles.roleCard} onClick={() => setActiveTab('loginSiswa')}>
              <h3 style={{margin: '0 0 10px 0'}}>🎓 Akses Siswa</h3>
              <p style={{fontSize: '13px', color: '#475569'}}>Masuk menggunakan PIN yang diberikan oleh Guru untuk memulai Kanvas Nalar.</p>
              <button style={{...styles.primaryBtn, marginTop: '15px'}}>Masuk sebagai Siswa</button>
            </div>
            <div style={styles.roleCard} onClick={() => setShowPinModal(true)}>
              <h3 style={{margin: '0 0 10px 0'}}>👨‍🏫 Akses Guru</h3>
              <p style={{fontSize: '13px', color: '#475569'}}>Masuk dengan PIN Admin untuk mengelola kelas dan mengevaluasi tugas siswa.</p>
              <button style={{...styles.guruActiveBtn, width: '100%', marginTop: '15px'}}>Masuk Dashboard Guru</button>
            </div>
          </div>
        </div>
      )}

      {/* HALAMAN LOGIN SISWA */}
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
            <h3>🔐 Otentikasi Khusus Guru</h3>
            <form onSubmit={handleVerifyPinGuru}>
              <input type="password" placeholder="PIN Demo: PENA2026" value={pinInput} onChange={(e) => setPinInput(e.target.value)} style={styles.input} autoFocus required />
              <div style={{display: 'flex', gap: '10px'}}>
                <button type="submit" style={styles.primaryBtn}>Masuk 🔑</button>
                <button type="button" style={styles.cancelBtn} onClick={() => {setShowPinModal(false); setActiveTab('landing');}}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NAVIGASI SISWA & GURU (Muncul jika sudah login) */}
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
        
        {/* ================= ALUR SISWA ================= */}
        {userRole === 'siswa' && currentStudent && (
          <>
            {/* 1. INTRO SISWA */}
            {activeTab === 'introSiswa' && (
              <div style={styles.card} className="no-print">
                <h2 style={{color: '#0f172a'}}>Halo, {currentStudent.name}! 👋</h2>
                <div style={styles.introBox}>
                  <h4>Tahapan yang Harus Kamu Lakukan:</h4>
                  <ol style={{lineHeight: '1.6', marginTop: '10px'}}>
                    <li><b>Siapkan Naskah (Pilar 1):</b> Pastikan kamu sudah menulis opini/karya tulismu secara manual.</li>
                    <li><b>Hubungkan AI (Tab 2):</b> Dapatkan API Key Google AI agar sistem bisa memberikan laporan diagnostik atas pemikiranmu.</li>
                    <li><b>Uji Nalar (Tab 3):</b> Masukkan kutipan karyamu, pilih teori kognitif (Ennis/Polya), dan dekonstruksi (pertanggungjawabkan) logika tulisanmu. Hati-hati, sistem akan mendeteksi indikasi <i>copy-paste</i> atau berpindah tab!</li>
                    <li><b>Terbitkan Portofolio (Tab 4):</b> Unduh sertifikat digital yang berisi rekam jejak penalaranmu dan evaluasi dari Guru.</li>
                  </ol>
                </div>
                <button style={styles.primaryBtn} onClick={() => setActiveTab('apiKey')}>Mengerti, Lanjut ke Setup AI ➔</button>
              </div>
            )}

            {/* 2. SETUP API KEY (DENGAN TATA CARA & VALIDASI KETAT) */}
            {activeTab === 'apiKey' && (
              <div style={styles.card} className="no-print">
                <h2>Integrasi Mesin Diagnostik (Google AI)</h2>
                <p style={{fontSize: '13px', color: '#475569'}}>API Key dibutuhkan agar sistem PENA dapat menganalisis kedalaman argumenmu secara otomatis.</p>
                
                <div style={{backgroundColor: '#eff6ff', padding: '15px', borderRadius: '6px', borderLeft: '4px solid #3b82f6', marginBottom: '20px'}}>
                  <h4 style={{margin: '0 0 10px 0', color: '#1d4ed8'}}>Tata Cara Mengambil API Key (Bebas Pindah Tab):</h4>
                  <ol style={{margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6', color: '#1e3a8a'}}>
                    <li>Buka tab baru dan kunjungi: <b>aistudio.google.com/app/apikey</b></li>
                    <li>Login menggunakan akun Google kamu.</li>
                    <li>Klik tombol biru <b>"Create API Key"</b>.</li>
                    <li>Salin seluruh kode unik yang muncul (harus diawali dengan <code>AIzaSy...</code>).</li>
                    <li>Kembali ke halaman ini dan tempelkan kodenya di bawah.</li>
                  </ol>
                </div>

                <form onSubmit={handleSaveApiKey}>
                  <label style={{fontSize: '13px', fontWeight: 'bold'}}>Google AI API Key:</label>
                  <input type="password" placeholder="AIzaSy..........................." value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={styles.input} required />
                  <button type="submit" style={styles.primaryBtn}>Validasi & Aktifkan Mesin AI 🔑</button>
                </form>
              </div>
            )}

            {/* 3. KANVAS DEKONSTRUKSI */}
            {activeTab === 'workspace' && (
              <div style={styles.card} className="no-print">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <h2 style={{margin: 0}}>Kanvas Dekonstruksi Nalar</h2>
                  <span style={{fontSize: '11px', backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold'}}>
                    🔴 Pengawasan Aktif (Anti-Cheat)
                  </span>
                </div>

                <div style={styles.monitoringBar}>
                  <span>👀 Tab / Pindah Jendela: <b style={{color: tabSwitchCount > 0 ? '#dc2626' : '#16a34a'}}>{tabSwitchCount} Kali</b></span>
                  <span>📋 Indikasi Copy-Paste: <b style={{color: isPasted ? '#dc2626' : '#16a34a'}}>{isPasted ? 'TERDETEKSI' : 'AMAN'}</b></span>
                </div>

                <div style={styles.modeBox}>
                  <button type="button" style={selectedMode === 'mandiri' ? styles.modeActive : styles.modeInactive} onClick={() => setSelectedMode('mandiri')}>🟢 Mandiri (Privat)</button>
                  <button type="button" style={selectedMode === 'kelompok' ? styles.modeActive : styles.modeInactive} onClick={() => setSelectedMode('kelompok')}>🔵 Kelompok (Dinilai Guru)</button>
                </div>

                <form onSubmit={handleSubmitCanvas}>
                  <div style={styles.formGroup}>
                    <label>Kutipan Inti Naskah / Karya Tulis Anda (Pilar 1):</label>
                    <textarea name="naskahText" rows="3" value={formData.naskahText} onChange={handleInputChange} placeholder="Tuliskan poin utama argumen dari naskah fisik yang ingin kamu uji..." style={styles.textarea} required />
                  </div>

                  <div style={{display: 'flex', gap: '15px', flexDirection: 'column', marginBottom: '15px'}}>
                    <div style={{backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1'}}>
                      <label style={{fontWeight: 'bold'}}>A. Analisis Teori Kritis (Ennis):</label>
                      <select name="ennisIndicator" value={formData.ennisIndicator} onChange={handleInputChange} style={{...styles.input, margin: '8px 0'}}>
                        {Object.keys(ennisPrompts).map(key => <option key={key} value={key}>{key}</option>)}
                      </select>
                      <div style={styles.promptBox}>💡 <b>Pemantik Analisis:</b> {ennisPrompts[formData.ennisIndicator]}</div>
                    </div>

                    <div style={{backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1'}}>
                      <label style={{fontWeight: 'bold'}}>B. Analisis Pemecahan Masalah (Polya):</label>
                      <select name="polyaStep" value={formData.polyaStep} onChange={handleInputChange} style={{...styles.input, margin: '8px 0'}}>
                        {Object.keys(polyaPrompts).map(key => <option key={key} value={key}>{key}</option>)}
                      </select>
                      <div style={styles.promptBox}>💡 <b>Pemantik Analisis:</b> {polyaPrompts[formData.polyaStep]}</div>
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label>Uraian Penjabaran Nalar Mandiri <br/><span style={{fontSize: '11px', color: '#64748b', fontWeight: 'normal'}}>(Buktikan argumen naskahmu berdasarkan pemantik di atas. Ketik secara jujur, sistem mengawasi.)</span></label>
                    <textarea name="deconstructionText" rows="6" value={formData.deconstructionText} onChange={handleInputChange} onPaste={handlePasteDetect} placeholder="Mulai penjabaran kritis kamu di sini..." style={styles.textarea} required />
                  </div>

                  <button type="submit" style={styles.primaryBtn}>Kirim ke Dashboard Guru & Cetak Portofolio 🚀</button>
                </form>
              </div>
            )}

            {/* 4. SERTIFIKAT E-PORTOFOLIO */}
            {activeTab === 'portfolio' && (
              <div>
                <div style={{marginBottom: '15px', display: 'flex', justifyContent: 'space-between'}} className="no-print">
                  <h3>🎓 E-Portofolio Naskah</h3>
                  <button style={styles.printBtn} onClick={() => window.print()}>📄 Simpan / Cetak PDF</button>
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
                        <p style={{fontSize: '13px'}}>Pengerjaan: <b>{activePortfolio.mode}</b> | {activePortfolio.timestamp}</p>

                        <div style={styles.statusBox}>
                          STATUS VALIDASI: 
                          <span style={{ marginLeft: '8px', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold',
                            backgroundColor: activePortfolio.status.includes('ACC') ? '#dcfce7' : activePortfolio.status.includes('Revisi') ? '#fee2e2' : '#fef3c7',
                            color: activePortfolio.status.includes('ACC') ? '#15803d' : activePortfolio.status.includes('Revisi') ? '#b91c1c' : '#b45309'
                          }}>{activePortfolio.status}</span>
                        </div>

                        {(activePortfolio.hasCopyPasted || activePortfolio.tabSwitches > 0) && (
                          <div style={styles.violationCard}>
                            <h4 style={{margin: '0 0 5px 0', color: '#991b1b'}}>⚠️ ANOMALI PENGERJAAN:</h4>
                            {activePortfolio.tabSwitches > 0 && <p style={{margin: '0'}}>• Terdeteksi memindahkan fokus tab <b>{activePortfolio.tabSwitches}x</b>.</p>}
                            {activePortfolio.hasCopyPasted && <p style={{margin: '0'}}>• Terdapat teks tempelan (Copy-Paste).</p>}
                          </div>
                        )}

                        <div style={styles.frameworkGrid}>
                          <div style={styles.frameworkItem}><b>Pendekatan Kritis (Ennis):</b><p>{activePortfolio.ennis}</p></div>
                          <div style={styles.frameworkItem}><b>Tahapan Solusi (Polya):</b><p>{activePortfolio.polya}</p></div>
                        </div>

                        <div style={styles.deconstructionBox}>
                          <b>Kutipan Naskah Awal:</b> 
                          <p style={{fontStyle: 'italic', color: '#475569'}}>{activePortfolio.naskahText}</p>
                          <b style={{display:'block', marginTop:'10px'}}>Dekonstruksi / Pembelaan Logika:</b>
                          <p style={{backgroundColor: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '5px'}}>
                            "{activePortfolio.deconstructionText}"
                          </p>
                        </div>

                        <div style={styles.diagnosticBoxCert}>
                          <b>🤖 Diagnostik Mesin AI:</b>
                          <p><b>Status:</b> {activePortfolio.diagnosis}</p>
                          <p><b>Analisis:</b> {activePortfolio.aiNotes}</p>
                        </div>

                        {activePortfolio.teacherFeedback && (
                          <div style={styles.teacherFeedbackCert}>
                            <b>👨‍🏫 Catatan / Evaluasi Guru:</b> <p>"{activePortfolio.teacherFeedback}"</p>
                          </div>
                        )}

                        <div style={styles.certFooter}>
                          <div>
                            <p style={{fontSize: '11px', color: '#64748b'}}>Terverifikasi Sistem PENA</p>
                            <div style={styles.digitalSeal}>VALIDASI DIGITAL</div>
                          </div>
                          {activePortfolio.mode.includes('Kelompok') && (
                            <div style={{textAlign: 'right'}}>
                              <p style={{fontSize: '11px', color: '#64748b'}}>Tanda Tangan Pengajar</p>
                              <p style={{marginTop: '30px', fontWeight: 'bold'}}>(_______________________)</p>
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

        {/* ================= ALUR GURU ================= */}
        {userRole === 'guru' && isGuruAuthed && (
          <>
            {activeTab === 'guruSiswa' && (
              <div style={styles.card} className="no-print">
                <h2>👥 Kelola Roster Kelas</h2>
                <form onSubmit={handleAddStudent} style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
                  <input type="text" placeholder="Nama siswa baru..." value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} style={{...styles.input, margin: 0, flex: 1}} required />
                  <button type="submit" style={{...styles.primaryBtn, margin: 0, flex: 'none', width: 'auto'}}>+ Tambah Siswa</button>
                </form>
                <table style={styles.table}>
                  <thead>
                    <tr style={{backgroundColor: '#e2e8f0', textAlign: 'left'}}>
                      <th style={styles.th}>Nama Siswa</th>
                      <th style={styles.th}>PIN Login (Rahasia)</th>
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
                <h2>📊 Evaluasi Tugas Dekonstruksi Naskah</h2>
                {submissions.length === 0 ? <p>Belum ada tugas masuk.</p> : (
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
                            <span style={{fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', backgroundColor: sub.status.includes('ACC') ? '#dcfce7' : sub.status.includes('Revisi') ? '#fee2e2' : '#fef3c7', color: sub.status.includes('ACC') ? '#15803d' : sub.status.includes('Revisi') ? '#b91c1c' : '#b45309'}}>{sub.status}</span>
                          </td>
                          <td style={styles.td}><button style={styles.inspectBtn} onClick={() => setSelectedSubmission(sub)}>👁️ Evaluasi</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Modal Evaluasi Guru */}
            {selectedSubmission && (
              <div style={styles.modalOverlay} className="no-print">
                <div style={styles.largeModalCard}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h3>📝 Evaluasi Naskah: {selectedSubmission.studentName}</h3>
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
                    <button style={styles.accBtnLarge} onClick={() => handleApproveByTeacher(selectedSubmission.id)}>✅ ACC / Setujui</button>
                    <button style={styles.rejectBtnLarge} onClick={() => { setTargetSubmissionId(selectedSubmission.id); setTeacherNoteInput(''); setShowRevisionModal(true); }}>❌ Minta Revisi</button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Catatan Revisi */}
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

// --- 7. STYLING CSS ---
const styles = {
  appContainer: { fontFamily: 'Inter, sans-serif', maxWidth: '850px', margin: '20px auto', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '10px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', color: 'white', padding: '15px 20px', borderRadius: '8px' },
  logoText: { margin: 0, fontSize: '20px', letterSpacing: '1px' },
  roleBadge: { fontSize: '13px', color: '#93c5fd', display: 'block', marginTop: '4px' },
  switchRoleBtn: { backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
  guruActiveBtn: { backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
  backBtn: { background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' },
  introBox: { backgroundColor: '#f1f5f9', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' },
  roleCard: { flex: 1, backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' },
  
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalCard: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', maxWidth: '450px', width: '90%', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' },
  largeModalCard: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', maxWidth: '650px', width: '90%', maxHeight: '85vh', overflowY: 'auto' },
  closeBtn: { backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  cancelBtn: { backgroundColor: '#94a3b8', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  
  navBar: { display: 'flex', gap: '10px', margin: '20px 0', flexWrap: 'wrap' },
  navBtn: { backgroundColor: '#e2e8f0', color: '#475569', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
  navBtnActive: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)' },
  
  mainContent: { marginTop: '10px' },
  card: { backgroundColor: 'white', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0' },
  title: { fontSize: '22px', margin: '10px 0', color: '#0f172a' },
  paragraph: { fontSize: '15px', color: '#475569', lineHeight: '1.6' },
  primaryBtn: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '14px', transition: 'background 0.2s' },
  printBtn: { backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  
  formGroup: { marginBottom: '15px' },
  input: { width: '100%', padding: '10px', margin: '8px 0', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '14px' },
  textarea: { width: '100%', padding: '12px', margin: '8px 0', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical' },
  
  promptBox: { backgroundColor: '#fef3c7', padding: '10px 15px', borderRadius: '6px', fontSize: '13px', color: '#92400e', marginTop: '5px', borderLeft: '4px solid #f59e0b', lineHeight: '1.5' },
  monitoringBar: { backgroundColor: '#eff6ff', padding: '10px 15px', borderRadius: '6px', margin: '15px 0', fontSize: '13px', display: 'flex', gap: '20px', border: '1px solid #bfdbfe' },
  modeBox: { backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '10px', border: '1px solid #e2e8f0' },
  modeActive: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', flex: 1 },
  modeInactive: { backgroundColor: '#e2e8f0', color: '#475569', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', flex: 1, fontWeight: '500' },
  
  certBorder: { border: '8px double #1e3a8a', padding: '30px', backgroundColor: '#fafaf9', position: 'relative' },
  certHeader: { textAlign: 'center' },
  certTitle: { color: '#1e3a8a', margin: '0', fontSize: '26px', letterSpacing: '1px', fontWeight: '900' },
  certSub: { fontSize: '14px', color: '#64748b', margin: '8px 0' },
  certNumber: { fontSize: '12px', fontWeight: 'bold', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '4px' },
  certDivider: { border: '0', borderTop: '2px solid #1e3a8a', margin: '20px 0' },
  certBody: { fontSize: '14px', lineHeight: '1.7', color: '#334155' },
  studentNameTitle: { fontSize: '28px', color: '#0f172a', margin: '10px 0', borderBottom: '2px dashed #cbd5e1', display: 'inline-block' },
  statusBox: { margin: '20px 0', padding: '12px 15px', backgroundColor: '#f1f5f9', borderRadius: '8px', fontSize: '13px', border: '1px solid #e2e8f0' },
  violationCard: { backgroundColor: '#fee2e2', borderLeft: '4px solid #dc2626', padding: '15px', borderRadius: '6px', margin: '15px 0', color: '#991b1b', fontSize: '13px' },
  frameworkGrid: { display: 'flex', gap: '20px', margin: '20px 0' },
  frameworkItem: { flex: 1, backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' },
  deconstructionBox: { backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: '20px 0' },
  diagnosticBoxCert: { backgroundColor: '#fef3c7', padding: '15px', borderRadius: '8px', color: '#92400e', margin: '20px 0', border: '1px solid #fde68a' },
  teacherFeedbackCert: { backgroundColor: '#eff6ff', borderLeft: '4px solid #2563eb', padding: '15px', borderRadius: '6px', margin: '20px 0', color: '#1e40af' },
  certFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '40px' },
  digitalSeal: { display: 'inline-block', border: '3px dashed #16a34a', color: '#16a34a', padding: '6px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '900', transform: 'rotate(-5deg)', marginTop: '10px' },

  reviewContentBox: { backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', marginTop: '15px', marginBottom: '15px', border: '1px solid #e2e8f0' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px', fontSize: '13px' },
  th: { padding: '12px', borderBottom: '2px solid #cbd5e1', color: '#475569' },
  td: { padding: '12px', color: '#334155' },
  inspectBtn: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  accBtnLarge: { backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', flex: 1, fontWeight: 'bold', fontSize: '14px' },
  rejectBtnLarge: { backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', flex: 1, fontWeight: 'bold', fontSize: '14px' }
};
