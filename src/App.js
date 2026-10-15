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
    if (role === 'mandiri') return { students: 'PENA_MANDIRI_STU_ISOLATED', submissions: 'PENA_MANDIRI_SUB_ISOLATED' };
    if (!kelas) return { students: 'PENA_STU_DEFAULT', submissions: 'PENA_SUB_DEFAULT' };
    const prefix = `PENA_${kelas.teacher}_${kelas.subject}_${kelas.pin}`.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    return { students: `${prefix}_STUDENTS`, submissions: `${prefix}_SUBMISSIONS` };
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

  // Polling Sinkronisasi Realtime (Sesuai kode awal lu)
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

  useEffect(() => {
    localStorage.setItem('PENA_ALL_CLASSES', JSON.stringify(allClasses));
    const keys = getStorageKeys(currentClass, userRole);
    if (userRole !== 'mandiri' && currentClass) {
      localStorage.setItem(keys.students, JSON.stringify(students));
    }
    localStorage.setItem(keys.submissions, JSON.stringify(submissions));
  }, [students, submissions, currentClass, allClasses, userRole]);

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

  // Mekanisme Keamanan Login Siswa (Manual Input + Typo Tolerance)
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
    setCurrentStudent({ id: 'mandiri-' + Date.now(), name });
    setUserRole('mandiri');
    setShowMandiriModal(false);
    setActiveTab('introSiswa');
  };

  const handleLogout = () => {
    session.clear(); // Bersihkan ingatan refresh
    setCurrentStudent(null);
    setCurrentClass(null);
    setUserRole(null);
    setIsApiValid(false);
    setActiveTab('landing');
    setClassCodeInput('');
  };

  // Pelanggaran & Kanvas Nalar dengan Pemantik Elaborasi
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

  // Mesin Analisis Kritis AI (Simulasi Dummy Sesuai Kode Awal)
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
        diagnosis = `[TIDAK LOLOS KRITIS] Penjabaran terlalu dangkal (${wordCount} kata). Gagal menjawab pertanyaan pemantik elaborasi kerangka ${formData.ennisIndicator} & tahap ${formData.polyaStep}. Diperlukan uraian kausalitas yang lebih mendalam.`;
      } else if (text.toLowerCase().includes('gak tau') || text.toLowerCase().includes('asal')) {
        diagnosis = `[DITOLAK] Respons terdeteksi tidak serius atau asal-asalan. Analisis nalar logis tidak terpenuhi sama sekali.`;
      } else {
        diagnosis = `[LOLOS KRITIS MENDALAM] Analisis otentik terverifikasi. Siswa berhasil menjawab pemantik konseptual ${formData.ennisIndicator} dengan eksekusi metodologis ${formData.polyaStep}. Argumen valid, logis, dan dapat dipertanggungjawabkan.`;
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
      setSubmissions([newSubmission, ...filtered]);
      setIsPasted(false); setTabSwitchCount(0); setIsSubmittingTask(false);
      setActiveTab('portfolio');
    }, 900);
  };

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [teacherNoteInput, setTeacherNoteInput] = useState('');

  const handleTeacherAction = (id, status) => {
    setSubmissions(prev => prev.map(item => item.id === id ? { ...item, status, teacherFeedback: teacherNoteInput } : item));
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
        <h2 style={styles.logoText}>PENA</h2>
        {userRole && <button style={styles.textBtn} onClick={handleLogout}>Keluar</button>}
      </header>

      {/* LANDING PAGE */}
      {!userRole && activeTab === 'landing' && (
        <div style={styles.card} className="no-print">
          <h1 style={styles.title}>PENA</h1>
          <p style={styles.subtitle}>Platform Pertanggungjawaban Nalar & Evaluasi Kritis</p>
          <div style={styles.gridMenu}>
            <div style={styles.menuBox} onClick={() => setActiveTab('loginSiswa')}>
              <h3>Siswa</h3><p>Masuk menggunakan kode kelas.</p>
            </div>
            <div style={styles.menuBox} onClick={() => setShowMandiriModal(true)}>
              <h3>Mandiri</h3><p>Simulasi latihan personal (Isolasi).</p>
            </div>
            <div style={styles.menuBox} onClick={() => setShowPinModal(true)}>
              <h3>Guru</h3><p>Kelola kelas & evaluasi.</p>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN SISWA BERDASARKAN KODE AKSES KELAS */}
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
              <label>Ketik Nama Anda (Manual):</label>
              <input type="text" placeholder="Masukkan nama..." value={loginStudentName} onChange={(e) => setLoginStudentName(e.target.value)} style={styles.input} required />
              
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

      {/* MODAL SETUP / LOGIN GURU */}
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
            <h3>Mode Mandiri (Terisolasi)</h3>
            <form onSubmit={handleMandiriLogin}>
              <label>Nama:</label>
              <input type="text" placeholder="Masukkan nama..." value={mandiriNameInput} onChange={(e) => setMandiriNameInput(e.target.value)} style={styles.input} required />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Mulai</button>
                <button type="button" style={styles.textBtn} onClick={() => setShowMandiriModal(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NAVIGASI UTAMA */}
      {userRole && (
        <nav style={styles.navBar} className="no-print">
          {(userRole === 'siswa' || userRole === 'mandiri') && (
            <>
              <span style={styles.navBadge}>{userRole === 'mandiri' ? 'Mandiri' : currentClass?.subject}</span>
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
                <h2>Halo, {currentStudent.name}.</h2>
                <p style={{color: '#555', lineHeight: '1.6'}}>Pastikan naskah dan argumen dikerjakan secara otentik. Sistem memantau perpindahan tab dan integritas teks tulisan.</p>
                <button style={styles.btnPrimary} onClick={() => setActiveTab('apiKey')}>Lanjut ke Setup AI →</button>
              </div>
            )}

            {activeTab === 'apiKey' && (
              <div style={styles.card} className="no-print">
                <h2>Otentikasi Kunci AI</h2>
                <form onSubmit={checkApiValidity}>
                  <input type="password" placeholder="Masukkan kunci akses..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={styles.input} required />
                  <button type="submit" style={styles.btnPrimary}>Hubungkan</button>
                </form>
                {isApiValid && <p style={{color: '#059669', fontSize: '13px', marginTop: '10px'}}>Terhubung dengan sistem analitis.</p>}
              </div>
            )}

            {activeTab === 'workspace' && (
              <div style={styles.card} className="no-print">
                {isWorkspaceLocked ? (
                  <div style={{textAlign: 'center', padding: '30px'}}>
                    <h3>Tugas Telah Dikirim</h3>
                    <p style={{color: '#666'}}>Silakan periksa tab Portofolio untuk melihat status validasi.</p>
                  </div>
                ) : (
                  <>
                    <h2>Kanvas Nalar</h2>
                    {!isApiValid && <div style={{background: '#fef2f2', color: '#991b1b', padding: '10px', fontSize: '13px', marginBottom: '10px'}}>Hubungkan kunci AI di tab sebelumnya terlebih dahulu.</div>}
                    
                    <div style={styles.monitor}>
                      <span>Pindah Tab: <b>{tabSwitchCount}x</b></span>
                      <span>Copy-Paste: <b>{isPasted ? 'Terdeteksi' : 'Aman'}</b></span>
                    </div>

                    <form onSubmit={handleSubmitCanvas}>
                      <label>1. Kutipan Naskah Utama:</label>
                      <textarea rows="3" value={formData.naskahText} onChange={(e) => setFormData({...formData, naskahText: e.target.value})} style={styles.textarea} required />

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
                        <p style={{margin: 0, color: '#333'}}>{ennisPrompts[formData.ennisIndicator]}</p>
                        <p style={{margin: '4px 0 0 0', color: '#333'}}>{polyaPrompts[formData.polyaStep]}</p>
                      </div>

                      <label style={{marginTop: '10px', display: 'block'}}>4. Uraian Pemikiran Kritis (Jawab elaborasi di atas):</label>
                      <textarea rows="5" value={formData.deconstructionText} onChange={(e) => setFormData({...formData, deconstructionText: e.target.value})} onPaste={() => setIsPasted(true)} style={styles.textarea} required />

                      <button type="submit" style={styles.btnPrimary} disabled={!isApiValid || isSubmittingTask}>
                        {isSubmittingTask ? 'Memproses Analisis...' : 'Kirim Tugas'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            {activeTab === 'portfolio' && (
              <div>
                <div style={{marginBottom: '10px'}} className="no-print">
                  <button style={styles.btnSecondary} onClick={() => window.print()}>Cetak / Simpan PDF</button>
                </div>
                {activePortfolio ? (
                  <div id="certPrintArea" style={styles.certBox}>
                    <h3>SERTIFIKAT UJI NALAR</h3>
                    <p style={{fontSize: '11px', color: '#666'}}>ID: {activePortfolio.certNumber}</p>
                    <hr style={{border: '0', borderTop: '1px solid #ddd'}}/>
                    <p><b>Nama:</b> {activePortfolio.studentName}</p>
                    <p><b>Status:</b> {activePortfolio.status}</p>
                    <p><b>Kerangka:</b> Ennis ({activePortfolio.ennis}) & Polya ({activePortfolio.polya})</p>
                    <p><b>Naskah:</b> "{activePortfolio.naskahText}"</p>
                    <p><b>Dekonstruksi:</b> "{activePortfolio.deconstructionText}"</p>
                    <p><b>Diagnosis AI:</b> {activePortfolio.diagnosis}</p>
                    {activePortfolio.teacherFeedback && <p><b>Catatan Guru:</b> {activePortfolio.teacherFeedback}</p>}
                  </div>
                ) : <p>Belum ada data tugas.</p>}
              </div>
            )}
          </>
        )}

        {userRole === 'guru' && (
          <>
            {activeTab === 'guruDashboard' && (
              <div style={styles.card} className="no-print">
                <h2>Evaluasi Kelas ({currentClass?.subject})</h2>
                {submissions.length === 0 ? <p style={{color: '#666', fontSize: '13px'}}>Belum ada tugas masuk.</p> : (
                  <table style={styles.table}>
                    <thead><tr><th>Siswa</th><th>Status</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {submissions.map(sub => (
                        <tr key={sub.id}>
                          <td>{sub.studentName}</td>
                          <td>{sub.status}</td>
                          <td><button style={styles.btnTable} onClick={() => setSelectedSubmission(sub)}>Periksa</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'guruSiswa' && (
              <div style={styles.card} className="no-print">
                <h2>Kelola Daftar Siswa</h2>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const name = e.target.sName.value.trim();
                  if(name) {
                    const pin = Math.floor(1000 + Math.random() * 9000).toString();
                    setStudents([...students, { id: Date.now(), name, pin }]);
                    e.target.sName.value = ''; alert(`Siswa ditambahkan. PIN: ${pin}`);
                  }
                }} style={{display: 'flex', gap: '8px', marginBottom: '15px'}}>
                  <input name="sName" type="text" placeholder="Nama siswa..." style={{...styles.input, margin: 0, flex: 1}} required />
                  <button type="submit" style={{...styles.btnPrimary, width: 'auto', margin: 0}}>Tambah</button>
                </form>
                <ul style={{paddingLeft: '15px', fontSize: '13px', color: '#444'}}>
                  {students.map(s => <li key={s.id}>{s.name} (PIN: {s.pin})</li>)}
                </ul>
              </div>
            )}

            {selectedSubmission && (
              <div style={styles.modalOverlay} className="no-print">
                <div style={styles.modalCardLarge}>
                  <h3>Laporan Evaluasi: {selectedSubmission.studentName}</h3>
                  <div style={{fontSize: '13px', background: '#f9f9f9', padding: '12px', borderRadius: '4px', margin: '10px 0', maxHeight: '250px', overflowY: 'auto'}}>
                    <p><b>Mode:</b> {selectedSubmission.mode}</p>
                    <p><b>Waktu Submit:</b> {selectedSubmission.timestamp}</p>
                    <p><b>Indikator:</b> Ennis ({selectedSubmission.ennis}) & Polya ({selectedSubmission.polya})</p>
                    <hr style={{border: '0', borderTop: '1px solid #ddd'}}/>
                    <p><b>Kutipan Naskah:</b> <br/><i>"{selectedSubmission.naskahText}"</i></p>
                    <p><b>Uraian Dekonstruksi Siswa:</b> <br/>"{selectedSubmission.deconstructionText}"</p>
                    <hr style={{border: '0', borderTop: '1px solid #ddd'}}/>
                    <p><b>Hasil Diagnosis AI:</b> <br/><span style={{color: '#b91c1c'}}>{selectedSubmission.diagnosis}</span></p>
                  </div>
                  
                  <label><b>Catatan / Tindak Lanjut Guru:</b></label>
                  <textarea rows="3" placeholder="Tulis catatan revisi atau apresiasi..." value={teacherNoteInput} onChange={(e) => setTeacherNoteInput(e.target.value)} style={styles.textarea} />
                  
                  <div style={styles.modalActions}>
                    <button style={styles.btnPrimary} onClick={() => handleTeacherAction(selectedSubmission.id, 'Disetujui Guru (ACC)')}>ACC / Setujui</button>
                    <button style={styles.btnDanger} onClick={() => handleTeacherAction(selectedSubmission.id, 'Minta Revisi')}>Minta Revisi</button>
                    <button style={styles.textBtn} onClick={() => setSelectedSubmission(null)}>Tutup</button>
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
  logoText: { margin: 0, fontSize: '16px', fontWeight: '700', letterSpacing: '1px' },
  card: { background: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '25px' },
  title: { fontSize: '22px', fontWeight: '700', marginBottom: '5px', textAlign: 'center' },
  subtitle: { fontSize: '13px', color: '#666', textAlign: 'center', marginBottom: '20px' },
  gridMenu: { display: 'flex', gap: '10px' },
  menuBox: { flex: 1, border: '1px solid #e5e5e5', borderRadius: '6px', padding: '15px', cursor: 'pointer', textAlign: 'center', background: '#fafafa' },
  form: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' },
  input: { width: '100%', padding: '9px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '9px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' },
  btnPrimary: { background: '#111', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', width: '100%', fontSize: '14px' },
  btnSecondary: { background: '#555', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  btnDanger: { background: '#dc2626', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  btnTable: { background: '#111', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  textBtn: { background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' },
  backBtn: { background: 'none', border: 'none', color: '#111', cursor: 'pointer', fontSize: '13px', marginBottom: '10px', padding: 0 },
  navBar: { display: 'flex', gap: '8px', marginBottom: '15px', alignItems: 'center', flexWrap: 'wrap' },
  navBadge: { background: '#eee', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' },
  navBtn: { background: '#f5f5f5', border: '1px solid #ddd', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' },
  navActive: { background: '#111', color: '#fff', border: '1px solid #111', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  modalCard: { background: '#fff', padding: '25px', borderRadius: '8px', width: '320px', border: '1px solid #ddd' },
  modalCardLarge: { background: '#fff', padding: '25px', borderRadius: '8px', width: '480px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #ddd' },
  modalActions: { display: 'flex', gap: '10px', marginTop: '15px', alignItems: 'center' },
  monitor: { background: '#f9f9f9', border: '1px solid #eee', padding: '8px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderRadius: '4px' },
  promptBox: { background: '#f4f4f5', borderLeft: '3px solid #111', padding: '10px', fontSize: '12px', margin: '10px 0', borderRadius: '0 4px 4px 0' },
  certBox: { border: '1px solid #ccc', padding: '20px', background: '#fff', borderRadius: '4px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginTop: '10px' },
  main: { marginTop: '10px' }
};
