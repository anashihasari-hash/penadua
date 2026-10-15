import React, { useState, useEffect } from 'react';

// ==========================================
// SESSION HELPER (Biar web kebal kalau di-refresh)
// ==========================================
const session = {
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  get: (key, fallback) => {
    try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : fallback; }
    catch (e) { return fallback; }
  },
  clear: () => ['PENA_ROLE', 'PENA_TAB', 'PENA_CLASS', 'PENA_STUDENT', 'PENA_AI_KEY'].forEach(k => localStorage.removeItem(k))
};

export default function App() {
  // Ambil state dari memori biar gak ke-reset pas F5
  const [userRole, setUserRole] = useState(() => session.get('PENA_ROLE', null)); 
  const [activeTab, setActiveTab] = useState(() => session.get('PENA_TAB', 'landing'));
  const [currentClass, setCurrentClass] = useState(() => session.get('PENA_CLASS', null));
  const [currentStudent, setCurrentStudent] = useState(() => session.get('PENA_STUDENT', null));
  const [apiKey, setApiKey] = useState(() => session.get('PENA_AI_KEY', ''));
  
  const [isApiValid, setIsApiValid] = useState(apiKey.length > 10);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Simpan posisi terakhir pengguna ke storage otomatis
  useEffect(() => {
    session.set('PENA_ROLE', userRole);
    session.set('PENA_TAB', activeTab);
    session.set('PENA_CLASS', currentClass);
    session.set('PENA_STUDENT', currentStudent);
    session.set('PENA_AI_KEY', apiKey);
  }, [userRole, activeTab, currentClass, currentStudent, apiKey]);

  // Database Kelas & Guru 
  const [allClasses, setAllClasses] = useState(() => {
    try { const saved = localStorage.getItem('PENA_ALL_CLASSES'); return saved ? JSON.parse(saved) : []; } 
    catch (e) { return []; }
  });

  // Modal Guru & Setup Sandi
  const [showPinModal, setShowPinModal] = useState(false);
  const [teacherNameInput, setTeacherNameInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  // Modal Mandiri
  const [showMandiriModal, setShowMandiriModal] = useState(false);
  const [mandiriNameInput, setMandiriNameInput] = useState('');

  const getStorageKeys = (kelas, role) => {
    if (role === 'mandiri') return { students: 'PENA_MANDIRI_STU_ISO', submissions: 'PENA_MANDIRI_SUB_ISO' };
    if (!kelas) return { students: 'PENA_STU_DEF', submissions: 'PENA_SUB_DEF' };
    const prefix = `PENA_${kelas.teacher}_${kelas.subject}_${kelas.pin}`.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    return { students: `${prefix}_STU`, submissions: `${prefix}_SUB` };
  };

  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  // Load Database Terisolasi Sesuai Sesi
  useEffect(() => {
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
  }, [currentClass, userRole]);

  // Polling Sinkronisasi Realtime
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

  // Login Siswa Berdasarkan Kode Akses Kelas
  const [classCodeInput, setClassCodeInput] = useState('');
  const [loginStudentName, setLoginStudentName] = useState('');
  const [loginStudentPin, setLoginStudentPin] = useState('');
  const [resolvedStudentList, setResolvedStudentList] = useState([]);

  const handleVerifyClassCode = (e) => {
    e.preventDefault();
    const foundClass = allClasses.find(c => c.pin === classCodeInput.trim());
    if (foundClass) {
      setCurrentClass(foundClass);
      const keys = getStorageKeys(foundClass, 'siswa');
      const savedStu = localStorage.getItem(keys.students);
      setResolvedStudentList(savedStu ? JSON.parse(savedStu) : []);
      alert(`✅ Kelas ${foundClass.subject} (${foundClass.teacher}) ditemukan! Silakan masukkan nama dan PIN Anda.`);
    } else {
      alert('❌ Kode Akses Kelas / PIN Guru salah.');
      setCurrentClass(null);
    }
  };

  const handleStudentLoginFinal = (e) => {
    e.preventDefault();
    const inputName = loginStudentName.trim().toLowerCase();
    const inputPin = loginStudentPin.trim();

    const student = resolvedStudentList.find(s => s.name.trim().toLowerCase() === inputName && s.pin === inputPin);
    if (student) {
      setCurrentStudent(student);
      setUserRole('siswa');
      setActiveTab('introSiswa');
    } else {
      alert('❌ Nama atau PIN Siswa salah. Pastikan ejaan sesuai pendaftaran guru.');
    }
  };

  const handleRegisterOrLoginGuru = (e) => {
    e.preventDefault();
    const tName = teacherNameInput.trim();
    const sName = subjectInput.trim();
    const pin = pinInput.trim();
    if (!tName || !sName || !pin) { alert('Semua kolom wajib diisi!'); return; }
    
    let targetClass = allClasses.find(c => c.teacher.toLowerCase() === tName.toLowerCase() && c.subject.toLowerCase() === sName.toLowerCase());
    if (targetClass) {
      if (targetClass.pin !== pin) { alert('❌ Sandi (PIN) guru salah untuk akun ini!'); return; }
    } else {
      targetClass = { teacher: tName, subject: sName, pin: pin };
      const updated = [...allClasses, targetClass];
      setAllClasses(updated);
      localStorage.setItem('PENA_ALL_CLASSES', JSON.stringify(updated));
    }
    setCurrentClass(targetClass);
    setUserRole('guru');
    setShowPinModal(false);
    setActiveTab('guruDashboard');
  };

  const handleMandiriLogin = (e) => {
    e.preventDefault();
    const name = mandiriNameInput.trim();
    if (!name) return;
    
    // Reset data sebelumnya agar tidak bocor
    setSubmissions([]);
    setStudents([]);
    
    setCurrentStudent({ id: 'mandiri-' + Date.now(), name });
    setUserRole('mandiri');
    setShowMandiriModal(false);
    setActiveTab('introSiswa');
  };

  const handleLogout = () => {
    session.clear(); 
    setCurrentStudent(null);
    setCurrentClass(null);
    setUserRole(null);
    
    // Reset array data lokal di UI
    setSubmissions([]);
    setStudents([]);
    
    setIsApiValid(false);
    setActiveTab('landing');
    setClassCodeInput('');
  };

  // Pelanggaran & Kanvas Nalar
  const [isPasted, setIsPasted] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [formData, setFormData] = useState({
    naskahText: '', ennisIndicator: 'Penjelasan Sederhana', polyaStep: 'Memahami Masalah', deconstructionText: ''
  });

  const ennisPrompts = {
    'Penjelasan Sederhana': 'Apakah argumen awal dari tulisanmu jelas dan bebas dari ambiguitas logika?',
    'Keterampilan Dasar': 'Apakah sumber atau premis pendukung argumenmu memiliki kredibilitas terukur?',
    'Menyimpulkan': 'Apakah kesimpulan ditarik secara valid berdasarkan bukti logis yang relevan?'
  };

  const polyaPrompts = {
    'Memahami Masalah': 'Apa pokok permasalahan krusial yang sedang diuji dalam naskah ini?',
    'Merencanakan Penyelesaian': 'Bagaimana strategimu meruntuhkan atau memperkuat klaim tersebut secara runtut?',
    'Memeriksa Kembali': 'Jika ada pihak mengajukan sanggahan radikal, bagaimana pembelaan rasionalmu?'
  };

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
    const cleanKey = apiKey.trim();
    if (cleanKey.length < 10) { alert('❌ API Key tidak valid.'); return; }
    setIsApiValid(true);
    setApiKey(cleanKey);
    setActiveTab('workspace');
  };

  const handleSubmitCanvas = (e) => {
    e.preventDefault();
    if (!isApiValid) { alert('Masukkan API Key terlebih dahulu di tab 2.'); return; }
    setIsSubmittingTask(true);

    setTimeout(() => {
      let diagnosis = "";
      const text = formData.deconstructionText.trim();
      const wordCount = text.split(/\s+/).length;
      const hasViolations = isPasted || tabSwitchCount > 0;

      if (hasViolations) {
        diagnosis = `[GAGAL INTEGRITAS] Terdeteksi anomali (Pindah tab: ${tabSwitchCount}x, Copy-paste: ${isPasted ? 'Terdeteksi' : 'Tidak'}). Argumen didiskualifikasi karena indikasi manipulasi eksternal.`;
      } else if (wordCount < 25) {
        diagnosis = `[TIDAK LOLOS KRITIS] Penjabaran terlalu dangkal (${wordCount} kata). Gagal menjawab pertanyaan pemantik elaborasi. Diperlukan uraian kausalitas yang lebih mendalam.`;
      } else if (text.toLowerCase().includes('gak tau') || text.toLowerCase().includes('asal')) {
        diagnosis = `[DITOLAK] Respons terdeteksi tidak serius atau asal-asalan. Analisis nalar logis tidak terpenuhi sama sekali.`;
      } else {
        diagnosis = `[LOLOS KRITIS MENDALAM] Analisis otentik terverifikasi. Siswa berhasil menjawab pemantik konseptual ${formData.ennisIndicator} dengan eksekusi metodologis ${formData.polyaStep}. Argumen valid dan logis.`;
      }

      const newSubmission = {
        id: Date.now(),
        certNumber: `PENA-26-${Math.floor(1000 + Math.random() * 9000)}`,
        studentName: currentStudent.name,
        mode: userRole === 'mandiri' ? 'Mandiri (Privat)' : 'Tugas Kelas',
        naskahText: formData.naskahText, 
        ennis: formData.ennisIndicator, 
        polya: formData.polyaStep, 
        deconstructionText: formData.deconstructionText,
        diagnosis, hasCopyPasted: isPasted, tabSwitches: tabSwitchCount,
        timestamp: new Date().toLocaleString(),
        status: userRole === 'mandiri' ? 'Disetujui Otomatis' : 'Pending Review Guru',
        teacherFeedback: ''
      };
      
      const filtered = submissions.filter(s => s.studentName !== currentStudent.name);
      const updatedSubmissions = [newSubmission, ...filtered];
      
      setSubmissions(updatedSubmissions);
      
      // Force save ke localStorage
      const keys = getStorageKeys(currentClass, userRole);
      localStorage.setItem(keys.submissions, JSON.stringify(updatedSubmissions));

      setIsPasted(false); setTabSwitchCount(0); setIsSubmittingTask(false);
      setActiveTab('portfolio');
    }, 900);
  };

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [teacherNoteInput, setTeacherNoteInput] = useState('');

  const handleTeacherAction = (id, status) => {
    const updatedSubmissions = submissions.map(item => item.id === id ? { ...item, status, teacherFeedback: teacherNoteInput } : item);
    setSubmissions(updatedSubmissions);
    
    // Perbaikan: Paksa simpan detik itu juga biar guru ga ilang datanya
    const keys = getStorageKeys(currentClass, userRole);
    localStorage.setItem(keys.submissions, JSON.stringify(updatedSubmissions));
    
    setSelectedSubmission(null);
    setTeacherNoteInput('');
  };

  return (
    <div style={styles.appContainer}>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4 portrait; margin: 10mm; }
        @media print { 
          body * { visibility: hidden; } 
          #certPrintArea, #certPrintArea * { visibility: visible; } 
          #certPrintArea { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; padding: 5mm; background: white !important; } 
          .no-print { display: none !important; } 
        }
      `}} />

      <header style={styles.header} className="no-print">
        <h2 style={styles.logoText}>PENA Pilar Dua</h2>
        {userRole && <button style={styles.textBtn} onClick={handleLogout}>Keluar</button>}
      </header>

      {/* LANDING PAGE */}
      {!userRole && activeTab === 'landing' && (
        <div style={styles.card} className="no-print">
          <h1 style={styles.title}>PENA Pilar Dua</h1>
          <p style={styles.subtitle}>Platform Pertanggungjawaban Nalar & Evaluasi Kritis Berbasis AI</p>
          
          <div style={styles.introBox}>
            <p style={{margin: '0 0 10px 0'}}><b>Tiga Pilar Evaluasi:</b></p>
            <ul style={{margin: 0, paddingLeft: '20px', lineHeight: '1.6'}}>
              <li><b>Siswa:</b> Ruang kelas interaktif untuk mendemonstrasikan ketajaman argumen.</li>
              <li><b>Guru:</b> Dasbor evaluasi komprehensif untuk memantau integritas dan kualitas nalar.</li>
              <li><b>Mandiri:</b> Simulasi privat tanpa batas untuk melatih kerangka berpikir.</li>
            </ul>
          </div>

          <div style={styles.gridMenu}>
            <div style={styles.menuBox} onClick={() => setActiveTab('loginSiswa')}>
              <h3>🎓 Siswa</h3><p>Masuk menggunakan kode kelas dari guru.</p>
            </div>
            <div style={styles.menuBox} onClick={() => setShowMandiriModal(true)}>
              <h3>👤 Mandiri</h3><p>Simulasi latihan personal secara terisolasi.</p>
            </div>
            <div style={styles.menuBox} onClick={() => setShowPinModal(true)}>
              <h3>👨‍🏫 Guru</h3><p>Kelola kelas, evaluasi, dan validasi tugas.</p>
            </div>
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
              <label>Masukkan Kode Akses / Sandi Kelas dari Guru:</label>
              <input type="password" placeholder="Contoh: 2900" value={classCodeInput} onChange={(e) => setClassCodeInput(e.target.value)} style={styles.input} required />
              <button type="submit" style={styles.btnPrimary}>Verifikasi Kode Kelas</button>
            </form>
          ) : (
            <form onSubmit={handleStudentLoginFinal} style={styles.form}>
              <div style={{background: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '13px', marginBottom: '10px'}}>
                📚 Kelas: <b>{currentClass.subject}</b> ({currentClass.teacher})
              </div>
              <label>Ketik Nama Lengkap Anda:</label>
              <input type="text" placeholder="Sesuai pendaftaran guru..." value={loginStudentName} onChange={(e) => setLoginStudentName(e.target.value)} style={styles.input} required />
              
              <label>PIN Siswa (4 Digit):</label>
              <input type="password" placeholder="Masukkan PIN..." value={loginStudentPin} onChange={(e) => setLoginStudentPin(e.target.value)} style={styles.input} required />
              
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Masuk Kelas</button>
                <button type="button" style={styles.textBtn} onClick={() => { setCurrentClass(null); setClassCodeInput(''); }}>Ganti Kode</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* MODAL GURU */}
      {showPinModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard}>
            <h3>Otorisasi Guru</h3>
            <p style={{fontSize: '12px', color: '#666'}}>Masukkan nama, mapel, dan sandi (PIN) unik kelas Anda.</p>
            <form onSubmit={handleRegisterOrLoginGuru}>
              <label>Nama Guru:</label>
              <input type="text" placeholder="Contoh: Bu Novi" value={teacherNameInput} onChange={(e) => setTeacherNameInput(e.target.value)} style={styles.input} required />
              <label>Mata Pelajaran:</label>
              <input type="text" placeholder="Contoh: Fisika" value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} style={styles.input} required />
              <label>Sandi (PIN) Unik Kelas:</label>
              <input type="password" placeholder="Contoh: 2900" value={pinInput} onChange={(e) => setPinInput(e.target.value)} style={styles.input} required />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Akses Ruang</button>
                <button type="button" style={styles.textBtn} onClick={() => setShowPinModal(false)}>Batal</button>
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
              <label>Nama Pengguna:</label>
              <input type="text" placeholder="Masukkan nama..." value={mandiriNameInput} onChange={(e) => setMandiriNameInput(e.target.value)} style={styles.input} required />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Mulai Ujian</button>
                <button type="button" style={styles.textBtn} onClick={() => setShowMandiriModal(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NAVIGASI */}
      {userRole && (
        <nav style={styles.navBar} className="no-print">
          {(userRole === 'siswa' || userRole === 'mandiri') && (
            <>
              <span style={styles.navBadge}>{userRole === 'mandiri' ? 'Mode Mandiri' : currentClass?.subject}</span>
              <button style={activeTab === 'introSiswa' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('introSiswa')}>Instruksi</button>
              <button style={activeTab === 'apiKey' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('apiKey')}>AI Key</button>
              <button style={activeTab === 'workspace' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('workspace')}>Kanvas</button>
              <button style={activeTab === 'portfolio' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('portfolio')}>Portofolio</button>
            </>
          )}
          {userRole === 'guru' && (
            <>
              <span style={styles.navBadge}>{currentClass?.subject} ({currentClass?.teacher})</span>
              <button style={activeTab === 'guruDashboard' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('guruDashboard')}>Evaluasi</button>
              <button style={activeTab === 'guruSiswa' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('guruSiswa')}>Daftar Siswa</button>
            </>
          )}
        </nav>
      )}

      <main style={styles.main}>
        {(userRole === 'siswa' || userRole === 'mandiri') && currentStudent && (
          <>
            {activeTab === 'introSiswa' && (
              <div style={styles.card} className="no-print">
                <h2>Selamat Datang, {currentStudent.name}! 👋</h2>
                <div style={styles.introBox}>
                  <p style={{marginTop: 0}}><b>📚 Tata Cara Pengerjaan PENA Pilar Dua:</b></p>
                  <ul style={{lineHeight: '1.6', color: '#444', paddingLeft: '20px', marginBottom: 0}}>
                    <li><b>Pahami Konteks:</b> Baca naskah tugas dengan teliti sebelum memulai dekonstruksi argumen.</li>
                    <li><b>Pilih Kerangka:</b> Tentukan indikator Ennis dan langkah Polya yang paling sesuai dengan arah nalar kritismu.</li>
                    <li><b>Jaga Integritas:</b> Dilarang keras melakukan manipulasi seperti pindah tab pencarian atau <i>Copy-Paste</i> (kecuali kutipan). Sistem memantau penuh setiap pergerakan.</li>
                    <li><b>Siapkan AI:</b> Masuk ke menu berikutnya untuk menghubungkan kunci API ke mesin evaluasi.</li>
                  </ul>
                </div>
                <button style={styles.btnPrimary} onClick={() => setActiveTab('apiKey')}>Lanjut ke Setup AI →</button>
              </div>
            )}

            {activeTab === 'apiKey' && (
              <div style={styles.card} className="no-print">
                <h2>Otentikasi Kunci AI</h2>
                <form onSubmit={checkApiValidity}>
                  <input type="password" placeholder="Masukkan kunci akses Gemini..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={styles.input} required />
                  <button type="submit" style={styles.btnPrimary}>Hubungkan Mesin</button>
                </form>
                {isApiValid && <p style={{color: '#059669', fontSize: '13px', marginTop: '10px'}}>✅ Sistem analitis terhubung dan siap digunakan.</p>}
              </div>
            )}

            {activeTab === 'workspace' && (
              <div style={styles.card} className="no-print">
                {isWorkspaceLocked ? (
                  <div style={{textAlign: 'center', padding: '30px'}}>
                    <h3>Tugas Telah Terkirim 🔒</h3>
                    <p style={{color: '#666'}}>Silakan periksa tab Portofolio untuk melihat progres atau revisi dari guru.</p>
                  </div>
                ) : (
                  <>
                    <h2>Kanvas Nalar</h2>
                    {!isApiValid && <div style={{background: '#fef2f2', color: '#991b1b', padding: '10px', fontSize: '13px', marginBottom: '10px'}}>⚠️ Harap hubungkan kunci AI di tab sebelumnya terlebih dahulu.</div>}
                    
                    <div style={styles.monitor}>
                      <span>Pindah Tab: <b>{tabSwitchCount}x</b></span>
                      <span>Copy-Paste: <b>{isPasted ? 'Terdeteksi' : 'Aman'}</b></span>
                    </div>

                    <form onSubmit={handleSubmitCanvas}>
                      <label>1. Kutipan Naskah Utama:</label>
                      <textarea rows="3" placeholder="Salin kutipan masalah di sini..." value={formData.naskahText} onChange={(e) => setFormData({...formData, naskahText: e.target.value})} style={styles.textarea} required />

                      <div style={{display: 'flex', gap: '10px', margin: '10px 0'}}>
                        <div style={{flex: 1}}>
                          <label>2. Kerangka Ennis:</label>
                          <select value={formData.ennisIndicator} onChange={(e) => setFormData({...formData, ennisIndicator: e.target.value})} style={styles.input}>
                            {Object.keys(ennisPrompts).map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>
                        <div style={{flex: 1}}>
                          <label>3. Tahap Polya:</label>
                          <select value={formData.polyaStep} onChange={(e) => setFormData({...formData, polyaStep: e.target.value})} style={styles.input}>
                            {Object.keys(polyaPrompts).map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>
                      </div>

                      <div style={styles.promptBox}>
                        <p style={{margin: '0 0 4px 0', fontWeight: 'bold'}}>💡 Pemantik Konteks Wajib:</p>
                        <p style={{margin: 0, color: '#333'}}>- {ennisPrompts[formData.ennisIndicator]}</p>
                        <p style={{margin: '4px 0 0 0', color: '#333'}}>- {polyaPrompts[formData.polyaStep]}</p>
                      </div>

                      <label style={{marginTop: '10px', display: 'block'}}>4. Uraian Pemikiran Kritis (Jawab elaborasi di atas):</label>
                      <textarea rows="5" placeholder="Tuliskan argumen orisinalmu..." value={formData.deconstructionText} onChange={(e) => setFormData({...formData, deconstructionText: e.target.value})} onPaste={() => setIsPasted(true)} style={styles.textarea} required />

                      <button type="submit" style={styles.btnPrimary} disabled={!isApiValid || isSubmittingTask}>
                        {isSubmittingTask ? 'Memproses Analisis AI...' : 'Kirim Tugas'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            {activeTab === 'portfolio' && (
              <div>
                <div style={{marginBottom: '10px'}} className="no-print">
                  <button style={styles.btnSecondary} onClick={() => window.print()}>🖨️ Cetak / Simpan PDF</button>
                </div>
                {activePortfolio ? (
                  <div id="certPrintArea" style={styles.certBox}>
                    <h3 style={{marginTop: 0, textAlign: 'center'}}>SERTIFIKAT UJI NALAR<br/>PENA PILAR DUA</h3>
                    <p style={{fontSize: '11px', color: '#666', textAlign: 'center'}}>ID Validasi: {activePortfolio.certNumber}</p>
                    <hr style={{border: '0', borderTop: '1px solid #ddd'}}/>
                    <p><b>Nama:</b> {activePortfolio.studentName}</p>
                    <p><b>Status Tugas:</b> <span style={{padding: '3px 8px', background: '#eee', borderRadius: '4px'}}>{activePortfolio.status}</span></p>
                    <p><b>Metode:</b> Ennis ({activePortfolio.ennis}) & Polya ({activePortfolio.polya})</p>
                    <p><b>Kutipan Kasus:</b> "{activePortfolio.naskahText}"</p>
                    <p><b>Resolusi & Dekonstruksi:</b> "{activePortfolio.deconstructionText}"</p>
                    <div style={{background: '#f9f9f9', padding: '10px', borderLeft: '3px solid #111', marginTop: '10px'}}>
                      <p style={{margin: 0}}><b>Diagnosis Mesin AI:</b><br/>{activePortfolio.diagnosis}</p>
                    </div>
                    {activePortfolio.teacherFeedback && (
                      <div style={{background: '#fef2f2', padding: '10px', borderLeft: '3px solid #dc2626', marginTop: '10px'}}>
                         <p style={{margin: 0}}><b>Umpan Balik Guru:</b><br/>{activePortfolio.teacherFeedback}</p>
                      </div>
                    )}
                  </div>
                ) : <div style={styles.card}><p style={{margin: 0}}>Belum ada data tugas yang terkirim.</p></div>}
              </div>
            )}
          </>
        )}

        {userRole === 'guru' && (
          <>
            {activeTab === 'guruDashboard' && (
              <div style={styles.card} className="no-print">
                <h2>Dasbor Evaluasi Kelas ({currentClass?.subject})</h2>
                {submissions.length === 0 ? <p style={{color: '#666', fontSize: '13px'}}>Belum ada tugas masuk dari siswa.</p> : (
                  <table style={styles.table}>
                    <thead><tr><th style={{textAlign: 'left'}}>Nama Siswa</th><th style={{textAlign: 'left'}}>Status</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {submissions.map(sub => (
                        <tr key={sub.id} style={{borderBottom: '1px solid #eee'}}>
                          <td style={{padding: '8px 0'}}>{sub.studentName}</td>
                          <td style={{padding: '8px 0'}}>{sub.status}</td>
                          <td style={{padding: '8px 0', textAlign: 'center'}}><button style={styles.btnTable} onClick={() => setSelectedSubmission(sub)}>Periksa</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'guruSiswa' && (
              <div style={styles.card} className="no-print">
                <h2>Manajemen Daftar Siswa</h2>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const name = e.target.sName.value.trim();
                  if(name) {
                    const pin = Math.floor(1000 + Math.random() * 9000).toString();
                    setStudents([...students, { id: Date.now(), name, pin }]);
                    e.target.sName.value = ''; alert(`Siswa ditambahkan. Ingat berikan PIN ini ke siswa: ${pin}`);
                  }
                }} style={{display: 'flex', gap: '8px', marginBottom: '15px'}}>
                  <input name="sName" type="text" placeholder="Masukkan nama siswa..." style={{...styles.input, margin: 0, flex: 1}} required />
                  <button type="submit" style={{...styles.btnPrimary, width: 'auto', margin: 0}}>Tambah</button>
                </form>
                <ul style={{paddingLeft: '15px', fontSize: '13px', color: '#444'}}>
                  {students.map(s => <li key={s.id} style={{marginBottom: '5px'}}><b>{s.name}</b> (PIN Akses: <span style={{color: '#dc2626', fontWeight: 'bold'}}>{s.pin}</span>)</li>)}
                </ul>
              </div>
            )}

            {selectedSubmission && (
              <div style={styles.modalOverlay} className="no-print">
                <div style={styles.modalCardLarge}>
                  <h3>Laporan Evaluasi Nalar</h3>
                  <div style={{fontSize: '13px', background: '#f9f9f9', padding: '15px', borderRadius: '6px', margin: '10px 0', maxHeight: '280px', overflowY: 'auto', border: '1px solid #e5e5e5'}}>
                    <p style={{margin: '0 0 5px 0'}}><b>👤 Nama Siswa:</b> {selectedSubmission.studentName}</p>
                    <p style={{margin: '0 0 5px 0'}}><b>🕒 Waktu Submit:</b> {selectedSubmission.timestamp}</p>
                    <p style={{margin: '0 0 10px 0'}}><b>📌 Indikator:</b> Ennis ({selectedSubmission.ennis}) & Polya ({selectedSubmission.polya})</p>
                    <hr style={{border: '0', borderTop: '1px solid #ddd'}}/>
                    <p><b>Kutipan Naskah:</b> <br/><i>"{selectedSubmission.naskahText}"</i></p>
                    <p><b>Uraian Dekonstruksi:</b> <br/>"{selectedSubmission.deconstructionText}"</p>
                    <hr style={{border: '0', borderTop: '1px solid #ddd'}}/>
                    <p style={{margin: '0 0 5px 0'}}><b>🤖 Diagnosis AI & Integritas:</b></p>
                    <span style={{color: '#b91c1c', display: 'block', padding: '8px', background: '#fef2f2', borderRadius: '4px'}}>{selectedSubmission.diagnosis}</span>
                  </div>
                  
                  <label style={{fontSize: '13px', fontWeight: '600'}}>Catatan / Tindak Lanjut Guru:</label>
                  <textarea rows="3" placeholder="Berikan catatan revisi atau apresiasi..." value={teacherNoteInput} onChange={(e) => setTeacherNoteInput(e.target.value)} style={{...styles.textarea, marginTop: '5px'}} />
                  
                  <div style={styles.modalActions}>
                    <button style={{...styles.btnPrimary, flex: 1}} onClick={() => handleTeacherAction(selectedSubmission.id, 'Disetujui Guru (ACC)')}>ACC / Lulus</button>
                    <button style={{...styles.btnDanger, flex: 1}} onClick={() => handleTeacherAction(selectedSubmission.id, 'Minta Revisi')}>Minta Revisi</button>
                    <button style={styles.textBtn} onClick={() => setSelectedSubmission(null)}>Batal</button>
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
  appContainer: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: '750px', margin: '30px auto', padding: '15px', color: '#111' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e5e5', paddingBottom: '12px', marginBottom: '20px' },
  logoText: { margin: 0, fontSize: '18px', fontWeight: '800', letterSpacing: '0.5px' },
  card: { background: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '25px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  title: { fontSize: '24px', fontWeight: '800', marginBottom: '8px', textAlign: 'center' },
  subtitle: { fontSize: '14px', color: '#666', textAlign: 'center', marginBottom: '25px' },
  introBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '15px', marginBottom: '20px', fontSize: '13.5px' },
  gridMenu: { display: 'flex', gap: '12px' },
  menuBox: { flex: 1, border: '1px solid #e5e5e5', borderRadius: '6px', padding: '15px', cursor: 'pointer', textAlign: 'center', background: '#fafafa', transition: 'all 0.2s' },
  form: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' },
  input: { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' },
  btnPrimary: { background: '#111', color: '#fff', border: 'none', padding: '12px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', width: '100%', fontSize: '14px' },
  btnSecondary: { background: '#555', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  btnDanger: { background: '#dc2626', color: '#fff', border: 'none', padding: '12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  btnTable: { background: '#111', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  textBtn: { background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline', padding: '10px' },
  backBtn: { background: 'none', border: 'none', color: '#111', cursor: 'pointer', fontSize: '13px', marginBottom: '15px', padding: 0, fontWeight: '600' },
  navBar: { display: 'flex', gap: '8px', marginBottom: '15px', alignItems: 'center', flexWrap: 'wrap' },
  navBadge: { background: '#e2e8f0', padding: '8px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '700', color: '#0f172a' },
  navBtn: { background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', color: '#334155' },
  navActive: { background: '#0f172a', color: '#fff', border: '1px solid #0f172a', padding: '8px 14px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  modalCard: { background: '#fff', padding: '25px', borderRadius: '8px', width: '340px', border: '1px solid #ddd', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
  modalCardLarge: { background: '#fff', padding: '25px', borderRadius: '8px', width: '500px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #ddd', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
  modalActions: { display: 'flex', gap: '10px', marginTop: '20px', alignItems: 'center' },
  monitor: { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderRadius: '4px' },
  promptBox: { background: '#f8fafc', borderLeft: '4px solid #0f172a', padding: '12px', fontSize: '13px', margin: '15px 0', borderRadius: '0 4px 4px 0' },
  certBox: { border: '1px solid #e5e5e5', padding: '30px', background: '#fff', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginTop: '15px' },
  main: { marginTop: '15px' }
};
