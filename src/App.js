import React, { useState, useEffect } from 'react';

export default function App() {
  // --- 1. STATE DASAR & RBAC ---
  const [userRole, setUserRole] = useState(null); // 'siswa', 'guru', 'mandiri'
  const [activeTab, setActiveTab] = useState('landing');
  
  const [apiKey, setApiKey] = useState('');
  const [isApiValid, setIsApiValid] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [isValidatingApi, setIsValidatingApi] = useState(false);

  // Database Global Kelas
  const [allClasses, setAllClasses] = useState(() => {
    try {
      const saved = localStorage.getItem('PENA_ALL_CLASSES');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [currentClass, setCurrentClass] = useState(null);
  
  // State Modals
  const [showPinModal, setShowPinModal] = useState(false);
  const [teacherNameInput, setTeacherNameInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  const [showMandiriModal, setShowMandiriModal] = useState(false);
  const [mandiriNameInput, setMandiriNameInput] = useState('');

  // --- 2. KAMUS PEMANTIK ENNIS & POLYA ---
  const ennisPrompts = {
    'Penjelasan Sederhana': 'Apakah argumen awal dari tulisanmu jelas, fokus, dan tidak ambigu?',
    'Keterampilan Dasar': 'Apakah sumber referensi atau premis dasar naskah tersebut kredibel?',
    'Menyimpulkan': 'Apakah kesimpulan ditarik berdasarkan bukti yang logis dan relevan?',
    'Penjelasan Lebih Lanjut': 'Adakah asumsi tersembunyi yang perlu diuji kebenarannya dalam naskah tersebut?',
    'Taktik & Strategi': 'Apakah argumenmu mempertimbangkan implikasi dan tindakan nyata?'
  };

  const polyaPrompts = {
    'Memahami Masalah': 'Apa pokok permasalahan krusial yang sedang dibahas pada naskah?',
    'Merencanakan Penyelesaian': 'Bagaimana logikamu membuktikan atau membantah naskah tersebut?',
    'Melaksanakan Rencana': 'Jelaskan eksekusi pembuktianmu secara rasional dan bertahap di sini.',
    'Memeriksa Kembali': 'Jika ada pihak yang menentang kesimpulanmu, bagaimana pembelaanmu?'
  };

  // --- 3. MANAJEMEN DATABASE TERISOLASI ---
  const getStorageKeys = (kelas, role) => {
    if (role === 'mandiri') return { students: 'PENA_MANDIRI_STU', submissions: 'PENA_MANDIRI_SUB' };
    if (!kelas) return { students: 'PENA_STU_DEFAULT', submissions: 'PENA_SUB_DEFAULT' };
    const prefix = `PENA_${kelas.teacher}_${kelas.subject}_${kelas.pin}`.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    return { students: `${prefix}_STUDENTS`, submissions: `${prefix}_SUBMISSIONS` };
  };

  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [currentStudent, setCurrentStudent] = useState(null);

  // Load Data
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
        const defaultStudents = [];
        setStudents(defaultStudents);
      }

      const savedSub = localStorage.getItem(keys.submissions);
      setSubmissions(savedSub ? JSON.parse(savedSub) : []);
    } catch (e) { console.error(e); }
  }, [currentClass, userRole]);

  // Save Data Realtime
  useEffect(() => {
    localStorage.setItem('PENA_ALL_CLASSES', JSON.stringify(allClasses));
    if (userRole && (currentClass || userRole === 'mandiri')) {
      const keys = getStorageKeys(currentClass, userRole);
      if (userRole !== 'mandiri') {
        localStorage.setItem(keys.students, JSON.stringify(students));
      }
      localStorage.setItem(keys.submissions, JSON.stringify(submissions));
    }
  }, [students, submissions, currentClass, allClasses, userRole]);

  // --- 4. HANDLER LOGIN & LOGOUT ---
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
      const parsedStu = savedStu ? JSON.parse(savedStu) : [];
      setResolvedStudentList(parsedStu);
      
      // PERBAIKAN: Beritahu siswa jika guru belum input nama absensi
      if(parsedStu.length === 0) {
        alert('⚠️ Kelas ditemukan, TAPI Guru belum memasukkan daftar nama satupun. Minta guru tambahkan namamu di dashboardnya agar bisa dipilih!');
      }
    } else {
      alert('❌ Kode Akses Kelas tidak ditemukan!');
      setCurrentClass(null);
    }
  };

  const handleStudentLoginFinal = (e) => {
    e.preventDefault();
    const student = resolvedStudentList.find(s => s.name === loginStudentName && s.pin === loginStudentPin);
    if (student) {
      setCurrentStudent(student);
      setUserRole('siswa');
      setActiveTab('introSiswa');
    } else {
      alert('❌ Nama atau PIN Siswa salah.');
    }
  };

  const handleRegisterOrLoginGuru = (e) => {
    e.preventDefault();
    const tName = teacherNameInput.trim();
    const sName = subjectInput.trim();
    const pin = pinInput.trim();

    if (!tName || !sName || !pin) return alert('Semua kolom wajib diisi!');
    
    let targetClass = allClasses.find(c => c.teacher.toLowerCase() === tName.toLowerCase() && c.subject.toLowerCase() === sName.toLowerCase());
    
    if (targetClass) {
      // Guru login ke kelas lamanya
      if (targetClass.pin !== pin) return alert('❌ Sandi (PIN) guru salah untuk kelas ini!');
    } else {
      // PERBAIKAN: Mencegah PIN sama dipakai 2 kelas/guru berbeda agar data siswa tidak bentrok
      const isPinTaken = allClasses.find(c => c.pin === pin);
      if (isPinTaken) {
        return alert(`❌ PIN "${pin}" sudah dipakai oleh kelas lain. Gunakan PIN/Sandi yang lebih unik!`);
      }
      targetClass = { teacher: tName, subject: sName, pin: pin, id: Date.now() };
      setAllClasses([...allClasses, targetClass]);
    }

    setCurrentClass(targetClass);
    setUserRole('guru');
    setShowPinModal(false);
    setActiveTab('guruDashboard');
  };

  const handleMandiriLogin = (e) => {
    e.preventDefault();
    setCurrentStudent({ id: 'mandiri-' + Date.now(), name: mandiriNameInput.trim() });
    setUserRole('mandiri');
    setShowMandiriModal(false);
    setActiveTab('introSiswa');
  };

  const handleLogout = () => {
    if (userRole === 'mandiri') {
      const keys = getStorageKeys(null, 'mandiri');
      localStorage.removeItem(keys.submissions); 
    }
    setCurrentStudent(null);
    setCurrentClass(null);
    setUserRole(null);
    setIsApiValid(false);
    setActiveTab('landing');
    setClassCodeInput('');
  };

  // --- 5. KANVAS & INTEGRASI GEMINI AI ---
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

  const activeSubmissionId = submissions.find(s => s.studentName === currentStudent?.name)?.id;
  const activePortfolio = submissions.find(s => s.id === activeSubmissionId);
  const isWorkspaceLocked = activePortfolio && activePortfolio.status !== 'Minta Revisi';

  const checkApiValidity = async (e) => {
    e.preventDefault();
    const cleanKey = apiKey.trim();
    
    // BACKDOOR DEVELOPER: Bypass untuk ngetes UI kalau AI Google down
    if (cleanKey === 'BYPASS_API_2026') {
      setIsApiValid(true);
      setApiKey(cleanKey);
      setActiveTab('workspace');
      alert('✅ [DEV MODE] Kunci Bypass Aktif! Anda mem-bypass pengecekan API Google.');
      return;
    }

    if (cleanKey.length < 15) return alert('❌ API Key tidak valid (Terlalu Pendek).');
    
    setIsValidatingApi(true);
    // PERBAIKAN: Menangkap dan memunculkan error asli dari Google (bukan dipukul rata)
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Balas dengan kata 'OK'" }] }] })
      });
      const data = await res.json();
      setIsValidatingApi(false);

      if (!res.ok) {
        throw new Error(data.error?.message || "Koneksi ditolak oleh server Google.");
      }
      
      setIsApiValid(true);
      setApiKey(cleanKey);
      setActiveTab('workspace');
      alert('✅ Kunci AI Berhasil Terhubung!');
    } catch (err) {
      setIsValidatingApi(false);
      alert(`❌ GAGAL TERHUBUNG KE GOOGLE:\n\n${err.message}\n\nTips: Jika API Key benar-benar baru, tunggu 2-3 menit untuk aktif. Pastikan tidak ada spasi tercopy.`);
    }
  };

  const handleSubmitCanvas = async (e) => {
    e.preventDefault();
    if (!isApiValid) return alert('Masukkan API Key terlebih dahulu di tab 2.');
    setIsSubmittingTask(true);

    let diagnosis = "";
    const hasViolations = isPasted || tabSwitchCount > 0;

    if (hasViolations) {
      diagnosis = `⚠️ ANOMALI TERDETEKSI: Pindah tab ${tabSwitchCount}x, Copy-paste: ${isPasted ? 'Ya' : 'Tidak'}. Argumen kehilangan validitas analitis karena indikasi manipulasi atau bantuan luar.`;
    } else {
      if (apiKey === 'BYPASS_API_2026') {
        diagnosis = "🤖 [DEV BYPASS] Analisis pura-pura dieksekusi. Karena mode BYPASS aktif, naskah ini otomatis dianggap valid tanpa hit ke server Google Gemini.";
      } else {
        try {
          const prompt = `
            Tugas Evaluasi Kritis Pendidikan:
            Siswa sedang dekonstruksi logika sebuah naskah.
            - Kutipan Naskah: "${formData.naskahText}"
            - Pemikiran Siswa (Fokus ${formData.ennisIndicator} & Tahap ${formData.polyaStep}): "${formData.deconstructionText}"
            
            Instruksi untuk AI:
            Jadilah guru yang sangat kritis. Evaluasi apakah dekonstruksi siswa ini BENAR-BENAR nyambung dengan naskahnya, logis, dan menjawab secara kritis. Jika ngawur, tidak nyambung, atau cuma asal ketik, bantai dan katakan salah/ngawur. Jika bagus, puji analisisnya. 
            Jawab dengan maksimal 3 kalimat tegas.
          `;

          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          
          const data = await res.json();
          if(!res.ok) throw new Error(data.error?.message || "Gangguan Server API");
          diagnosis = "🤖 Evaluasi AI (Gemini): " + data.candidates[0].content.parts[0].text;
        } catch (err) {
          diagnosis = `⚠️ Sistem AI Gagal memproses: ${err.message}. Teks tersimpan secara lokal tanpa evaluasi AI.`;
        }
      }
    }

    const newSubmission = {
      id: Date.now(),
      certNumber: `PENA-26-${Math.floor(1000 + Math.random() * 9000)}`,
      studentName: currentStudent.name,
      mode: userRole === 'mandiri' ? 'Mandiri (Privat)' : 'Tugas Kelas',
      naskahText: formData.naskahText, ennis: formData.ennisIndicator,
      polya: formData.polyaStep, deconstructionText: formData.deconstructionText,
      diagnosis, hasCopyPasted: isPasted, tabSwitches: tabSwitchCount,
      timestamp: new Date().toLocaleString(),
      status: userRole === 'mandiri' ? 'Selesai (Simulasi)' : 'Pending Review Guru',
      teacherFeedback: ''
    };
    
    const filtered = submissions.filter(s => s.studentName !== currentStudent.name);
    setSubmissions([newSubmission, ...filtered]);
    setIsPasted(false); setTabSwitchCount(0); setIsSubmittingTask(false);
    setActiveTab('portfolio');
  };

  // --- 6. HANDLER GURU (EVALUASI & MANAJEMEN) ---
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [teacherNoteInput, setTeacherNoteInput] = useState('');

  const handleTeacherAction = (id, status) => {
    setSubmissions(prev => prev.map(item => item.id === id ? { ...item, status, teacherFeedback: teacherNoteInput } : item));
    setSelectedSubmission(null);
    setTeacherNoteInput('');
  };

  const handleDeleteStudent = (studentId) => {
    if(window.confirm('Yakin ingin menghapus siswa ini? Semua tugasnya juga akan hilang.')) {
      const studentToDelete = students.find(s => s.id === studentId);
      setStudents(students.filter(s => s.id !== studentId));
      if(studentToDelete) {
        setSubmissions(submissions.filter(sub => sub.studentName !== studentToDelete.name));
      }
    }
  };

  const handleResetClass = () => {
    if(window.confirm('PERINGATAN KERAS! Ini akan MENGHAPUS SEMUA DATA SISWA DAN TUGAS di kelas ini. Lanjutkan?')) {
      setStudents([]);
      setSubmissions([]);
    }
  };

  return (
    <div style={styles.appContainer}>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4 portrait; margin: 10mm; }
        @media print { 
          body * { visibility: hidden; } 
          #printArea, #printArea * { visibility: visible; }
          #printArea { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; } 
        }
      `}} />

      <header style={styles.header} className="no-print">
        <h2 style={styles.logoText}>PENA 🛡️</h2>
        {userRole && <button style={styles.textBtn} onClick={handleLogout}>🚪 Keluar</button>}
      </header>

      {/* --- LANDING PAGE --- */}
      {!userRole && activeTab === 'landing' && (
        <div style={styles.card} className="no-print">
          <div style={{textAlign: 'center', marginBottom: '25px'}}>
            <h1 style={styles.title}>PENA</h1>
            <p style={styles.subtitle}>Platform Pertanggungjawaban Nalar & Evaluasi Kritis</p>
          </div>
          
          <div style={styles.rulesBox}>
            <h3 style={{margin: '0 0 10px 0', color: '#1e3a8a'}}>📖 Tujuan & Aturan Main</h3>
            <p style={{margin: '0 0 8px 0', fontSize: '13px'}}>Aplikasi ini diciptakan untuk mendisrupsi ketergantungan AI copy-paste. Siswa diuji untuk mendekonstruksi tulisan mereka sendiri secara logis.</p>
            <ul style={{fontSize: '13px', paddingLeft: '20px', margin: 0, color: '#475569'}}>
              <li><b>Guru:</b> Buat kelas, bagikan PIN ke siswa, dan evaluasi hasil pemikiran mereka.</li>
              <li><b>Siswa:</b> Masukkan kode kelas, sambungkan API Gemini, dan kerjakan Kanvas Nalar tanpa copas/pindah tab.</li>
            </ul>
          </div>
          
          <div style={styles.gridMenu}>
            <div style={styles.menuBox} onClick={() => setActiveTab('loginSiswa')}>
              <h3 style={{color: '#2563eb'}}>🎓 Ruang Siswa</h3>
              <p>Masuk menggunakan kode kelas dari guru.</p>
            </div>
            <div style={styles.menuBox} onClick={() => setShowPinModal(true)}>
              <h3 style={{color: '#16a34a'}}>👨‍🏫 Ruang Guru</h3>
              <p>Kelola roster kelas & evaluasi analitis.</p>
            </div>
            <div style={styles.menuBox} onClick={() => setShowMandiriModal(true)}>
              <h3 style={{color: '#9333ea'}}>👤 Mode Mandiri</h3>
              <p>Simulasi latihan personal (Tidak tersimpan).</p>
            </div>
          </div>
        </div>
      )}

      {/* --- LOGIN SISWA (KODE KELAS) --- */}
      {!userRole && activeTab === 'loginSiswa' && (
        <div style={styles.card} className="no-print">
          <button style={styles.backBtn} onClick={() => setActiveTab('landing')}>← Kembali</button>
          <h2>Akses Ruang Kelas</h2>
          
          {!currentClass ? (
            <form onSubmit={handleVerifyClassCode} style={styles.form}>
              <label>Masukkan Kode Akses / Sandi Kelas dari Guru:</label>
              <input type="password" placeholder="Minta ke Guru (Misal: 1234)" value={classCodeInput} onChange={(e) => setClassCodeInput(e.target.value)} style={styles.input} required />
              <button type="submit" style={styles.btnPrimary}>Cari & Verifikasi Kelas</button>
            </form>
          ) : (
            <form onSubmit={handleStudentLoginFinal} style={styles.form}>
              <div style={styles.badgeInfo}>
                📚 Kelas Ditemukan: <b>{currentClass.subject}</b> (Pengampu: {currentClass.teacher})
              </div>
              <label>Pilih Nama Anda di Absensi:</label>
              <select value={loginStudentName} onChange={(e) => setLoginStudentName(e.target.value)} style={styles.input} required>
                <option value="" disabled>-- Pilih Nama --</option>
                {resolvedStudentList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              <label>PIN Siswa (4 Digit Rahasia):</label>
              <input type="password" placeholder="Tanya Guru jika lupa PIN" value={loginStudentPin} onChange={(e) => setLoginStudentPin(e.target.value)} style={styles.input} required />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Masuk Kelas 🚀</button>
                <button type="button" style={styles.btnDanger} onClick={() => { setCurrentClass(null); setClassCodeInput(''); setLoginStudentName(''); }}>Ganti Kode</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* --- MODAL GURU --- */}
      {showPinModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard}>
            <h3>Otorisasi Guru</h3>
            <p style={{fontSize: '12px', color: '#666'}}>Jika kelas belum ada, sistem akan membuatkan baru. Pastikan mengingat PIN Kelas Anda.</p>
            <form onSubmit={handleRegisterOrLoginGuru} style={styles.form}>
              <label>Nama Guru:</label>
              <input type="text" placeholder="Contoh: Pak Budi" value={teacherNameInput} onChange={(e) => setTeacherNameInput(e.target.value)} style={styles.input} required />
              <label>Mata Pelajaran:</label>
              <input type="text" placeholder="Contoh: Sosiologi" value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} style={styles.input} required />
              <label>Sandi (PIN) Ruang Kelas:</label>
              <input type="password" placeholder="Wajib UNIK (Misal: 7788)" value={pinInput} onChange={(e) => setPinInput(e.target.value)} style={styles.input} required />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Akses / Buat Ruang</button>
                <button type="button" style={styles.btnSecondary} onClick={() => setShowPinModal(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL MANDIRI --- */}
      {showMandiriModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard}>
            <h3>Mode Latihan Mandiri</h3>
            <p style={{fontSize: '12px', color: '#666'}}>Data pada mode ini bersifat temporer dan akan lenyap setelah Anda keluar.</p>
            <form onSubmit={handleMandiriLogin} style={styles.form}>
              <label>Nama Simulasi:</label>
              <input type="text" placeholder="Masukkan nama Anda..." value={mandiriNameInput} onChange={(e) => setMandiriNameInput(e.target.value)} style={styles.input} required />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Mulai Simulasi</button>
                <button type="button" style={styles.btnSecondary} onClick={() => setShowMandiriModal(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- NAVIGASI DASHBOARD --- */}
      {userRole && (
        <nav style={styles.navBar} className="no-print">
          {(userRole === 'siswa' || userRole === 'mandiri') && (
            <>
              <span style={styles.navBadge}>{userRole === 'mandiri' ? 'Modus Mandiri' : `Kelas ${currentClass?.subject}`}</span>
              <button style={activeTab === 'introSiswa' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('introSiswa')}>1. Instruksi</button>
              <button style={activeTab === 'apiKey' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('apiKey')}>2. AI Key</button>
              <button style={activeTab === 'workspace' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('workspace')}>3. Kanvas</button>
              <button style={activeTab === 'portfolio' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('portfolio')}>4. Portofolio</button>
            </>
          )}
          {userRole === 'guru' && (
            <>
              <span style={styles.navBadge}>📚 {currentClass?.subject} ({currentClass?.teacher})</span>
              <button style={activeTab === 'guruDashboard' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('guruDashboard')}>📊 Evaluasi Tugas</button>
              <button style={activeTab === 'guruSiswa' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('guruSiswa')}>👥 Kelola Siswa</button>
            </>
          )}
        </nav>
      )}

      <main style={styles.main}>
        {/* ================= AREA SISWA & MANDIRI ================= */}
        {(userRole === 'siswa' || userRole === 'mandiri') && currentStudent && (
          <>
            {activeTab === 'introSiswa' && (
              <div style={styles.card} className="no-print">
                <h2>Halo, {currentStudent.name}! 👋</h2>
                <div style={styles.rulesBox}>
                  <h4 style={{marginTop: 0, color: '#0f172a'}}>Tahapan Pengerjaan:</h4>
                  <ol style={{lineHeight: '1.6', margin: 0, paddingLeft: '20px'}}>
                    <li><b>Siapkan Argumen:</b> Anda harus punya satu naskah opini/kutipan karya yang mau dibedah.</li>
                    <li><b>Hubungkan AI:</b> Siapkan Google Gemini API Key di tab kedua. AI bertindak sebagai juri mutlak.</li>
                    <li><b>Uji Nalar:</b> Dekonstruksi naskah Anda di Tab Kanvas. <b>AWAS:</b> Pindah tab atau copy-paste akan terdeteksi!</li>
                    <li><b>Portofolio:</b> Cetak PDF atau minta revisi/ACC dari Guru.</li>
                  </ol>
                </div>
                <button style={{...styles.btnPrimary, marginTop: '15px'}} onClick={() => setActiveTab('apiKey')}>Lanjut ke Setup AI →</button>
              </div>
            )}

            {activeTab === 'apiKey' && (
              <div style={styles.card} className="no-print">
                <h2>Integrasi Penguji AI (Gemini)</h2>
                <p style={{fontSize: '13px', color: '#555'}}>Dapatkan API Key gratis di <b>aistudio.google.com/app/apikey</b>. AI ini akan mengevaluasi logika dekonstruksi Anda secara real-time.</p>
                <form onSubmit={checkApiValidity} style={styles.form}>
                  <input type="password" placeholder="Paste kode API Key milikmu..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={styles.input} required />
                  <button type="submit" style={{...styles.btnPrimary, background: '#2563eb'}} disabled={isValidatingApi}>
                    {isValidatingApi ? 'Mengecek Server Google...' : 'Validasi & Hubungkan 🔑'}
                  </button>
                </form>
                {isApiValid && <div style={styles.successBadge}>✅ Kunci AI terverifikasi. Silakan lanjut ke tab Kanvas.</div>}
              </div>
            )}

            {activeTab === 'workspace' && (
              <div style={styles.card} className="no-print">
                {isWorkspaceLocked ? (
                  <div style={{textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '8px'}}>
                    <h3>Tugas Telah Dikirim 🔒</h3>
                    <p style={{color: '#666'}}>Silakan periksa tab Portofolio untuk melihat status atau revisi guru.</p>
                  </div>
                ) : (
                  <>
                    <h2 style={{marginTop: 0}}>Kanvas Dekonstruksi Nalar</h2>
                    {!isApiValid && <div style={{background: '#fef2f2', color: '#991b1b', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px'}}>⚠️ Anda harus mengaktifkan AI Key di tab sebelumnya.</div>}
                    
                    <div style={styles.monitor}>
                      <span>👀 Pindah Tab: <b style={{color: tabSwitchCount > 0 ? '#dc2626' : '#16a34a'}}>{tabSwitchCount} Kali</b></span>
                      <span>📋 Copy-Paste: <b style={{color: isPasted ? '#dc2626' : '#16a34a'}}>{isPasted ? 'TERDETEKSI' : 'AMAN'}</b></span>
                    </div>

                    <form onSubmit={handleSubmitCanvas} style={styles.form}>
                      <label style={styles.label}>1. Kutipan Naskah Utama yang Ingin Dikritik/Dipertahankan:</label>
                      <textarea rows="3" placeholder="Contoh: 'Penggunaan gadget menurunkan fokus belajar...'" value={formData.naskahText} onChange={(e) => setFormData({...formData, naskahText: e.target.value})} style={styles.textarea} required />

                      <div style={styles.frameworkGrid}>
                        <div style={styles.frameworkBox}>
                          <label style={styles.label}>Teori Kritis Ennis:</label>
                          <select value={formData.ennisIndicator} onChange={(e) => setFormData({...formData, ennisIndicator: e.target.value})} style={styles.input}>
                            {Object.keys(ennisPrompts).map(k => <option key={k}>{k}</option>)}
                          </select>
                          <div style={styles.promptBox}>💡 {ennisPrompts[formData.ennisIndicator]}</div>
                        </div>
                        <div style={styles.frameworkBox}>
                          <label style={styles.label}>Tahap Pemecahan Polya:</label>
                          <select value={formData.polyaStep} onChange={(e) => setFormData({...formData, polyaStep: e.target.value})} style={styles.input}>
                            {Object.keys(polyaPrompts).map(k => <option key={k}>{k}</option>)}
                          </select>
                          <div style={styles.promptBox}>💡 {polyaPrompts[formData.polyaStep]}</div>
                        </div>
                      </div>

                      <label style={styles.label}>2. Penjabaran Analisis Kritis Anda (Berdasarkan Pemantik di Atas):</label>
                      <textarea rows="5" placeholder="Mulai ketik analisis logis Anda di sini..." value={formData.deconstructionText} onChange={(e) => setFormData({...formData, deconstructionText: e.target.value})} onPaste={() => setIsPasted(true)} style={styles.textarea} required />

                      <button type="submit" style={styles.btnPrimary} disabled={!isApiValid || isSubmittingTask}>
                        {isSubmittingTask ? '🤖 AI Sedang Menguji Logika Anda...' : 'Kirim Uji Nalar 🚀'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            {activeTab === 'portfolio' && (
              <div>
                <div style={{marginBottom: '15px'}} className="no-print">
                  <button style={{...styles.btnPrimary, width: 'auto'}} onClick={() => window.print()}>📄 Cetak / Unduh PDF</button>
                </div>
                {activePortfolio ? (
                  <div id="printArea" style={styles.certBox}>
                    <h2 style={{textAlign: 'center', color: '#1e3a8a', margin: '0 0 5px 0'}}>SERTIFIKAT & LAPORAN NALAR</h2>
                    <p style={{textAlign: 'center', fontSize: '11px', color: '#64748b', margin: '0 0 20px 0'}}>REG: {activePortfolio.certNumber}</p>
                    
                    <div style={{fontSize: '13px', lineHeight: '1.6'}}>
                      <p><b>Nama Siswa:</b> {activePortfolio.studentName}</p>
                      <p><b>Status Tugas:</b> <span style={styles.statusBadge(activePortfolio.status)}>{activePortfolio.status}</span></p>
                      <p><b>Mode / Waktu:</b> {activePortfolio.mode} | {activePortfolio.timestamp}</p>
                      
                      <div style={styles.reviewContentBox}>
                        <b>Kutipan Naskah:</b>
                        <p style={{fontStyle: 'italic', margin: '5px 0 15px 0'}}>{activePortfolio.naskahText}</p>
                        <b>Dekonstruksi Kritis ({activePortfolio.ennis} & {activePortfolio.polya}):</b>
                        <p style={{background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', margin: '5px 0'}}>{activePortfolio.deconstructionText}</p>
                      </div>

                      <div style={styles.diagnosticBox}>
                        <b>{activePortfolio.diagnosis}</b>
                      </div>

                      {activePortfolio.teacherFeedback && (
                        <div style={styles.teacherFeedback}>
                          <b>👨‍🏫 Catatan Guru:</b> "{activePortfolio.teacherFeedback}"
                        </div>
                      )}
                    </div>
                  </div>
                ) : <div style={styles.card}><p>Belum ada portofolio tugas. Silakan kerjakan di tab Kanvas.</p></div>}
              </div>
            )}
          </>
        )}

        {/* ================= AREA GURU ================= */}
        {userRole === 'guru' && (
          <>
            {activeTab === 'guruDashboard' && (
              <div style={styles.card} id="printArea">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                  <h2 style={{margin: 0}}>Laporan Evaluasi Kelas</h2>
                  <button style={{...styles.btnSecondary, background: '#10b981'}} className="no-print" onClick={() => window.print()}>🖨️ Cetak Laporan</button>
                </div>

                {submissions.length === 0 ? <p style={{color: '#666', fontSize: '13px'}}>Belum ada tugas masuk dari siswa.</p> : (
                  <table style={styles.table}>
                    <thead><tr style={{background: '#f1f5f9'}}><th>Siswa</th><th>Status Validasi</th><th className="no-print">Aksi</th></tr></thead>
                    <tbody>
                      {submissions.map(sub => (
                        <tr key={sub.id} style={{borderBottom: '1px solid #e2e8f0'}}>
                          <td><b>{sub.studentName}</b></td>
                          <td><span style={styles.statusBadge(sub.status)}>{sub.status}</span></td>
                          <td className="no-print"><button style={styles.btnTable} onClick={() => setSelectedSubmission(sub)}>👁️ Periksa Kerjaan</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'guruSiswa' && (
              <div style={styles.card} className="no-print">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                  <h2 style={{margin: 0}}>Kelola Daftar Siswa</h2>
                  <button style={styles.btnDanger} onClick={handleResetClass}>⚠️ Kosongkan Kelas Total</button>
                </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const name = e.target.sName.value.trim();
                  if(name) {
                    const pin = Math.floor(1000 + Math.random() * 9000).toString();
                    setStudents([...students, { id: Date.now(), name, pin }]);
                    e.target.sName.value = ''; 
                    alert(`Siswa ${name} ditambahkan. PIN Login: ${pin}`);
                  }
                }} style={{display: 'flex', gap: '8px', marginBottom: '20px'}}>
                  <input name="sName" type="text" placeholder="Masukkan nama siswa..." style={{...styles.input, margin: 0, flex: 1}} required />
                  <button type="submit" style={{...styles.btnPrimary, background: '#2563eb', width: 'auto', margin: 0}}>+ Tambah Siswa</button>
                </form>

                {students.length === 0 ? <p style={{fontSize: '13px', color: '#64748b'}}>Belum ada siswa terdaftar. Tambahkan sekarang agar siswa bisa login.</p> : (
                  <table style={styles.table}>
                    <thead><tr style={{background: '#f1f5f9', textAlign: 'left'}}><th>Nama Siswa</th><th>PIN Rahasia (Untuk Siswa)</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {students.map(s => (
                        <tr key={s.id} style={{borderBottom: '1px solid #e2e8f0'}}>
                          <td>{s.name}</td>
                          <td><b style={{background: '#fef3c7', padding: '2px 8px', borderRadius: '4px'}}>{s.pin}</b></td>
                          <td><button style={styles.btnDangerTable} onClick={() => handleDeleteStudent(s.id)}>Hapus</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Modal Periksa Kerja Siswa Terperinci (Eksplisit untuk Guru) */}
            {selectedSubmission && (
              <div style={styles.modalOverlay} className="no-print">
                <div style={{...styles.modalCard, width: '600px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <h3>📝 Evaluasi: {selectedSubmission.studentName}</h3>
                    <button style={styles.btnSecondary} onClick={() => setSelectedSubmission(null)}>Tutup</button>
                  </div>
                  <hr style={{margin: '10px 0', borderTop: '1px solid #e2e8f0'}}/>
                  
                  <div style={{fontSize: '13px', lineHeight: '1.6'}}>
                    <div style={styles.reviewContentBox}>
                      <b style={{color: '#1e3a8a'}}>1. Naskah Siswa:</b>
                      <p style={{fontStyle: 'italic', margin: '5px 0 15px 0'}}>{selectedSubmission.naskahText}</p>
                      
                      <b style={{color: '#1e3a8a'}}>2. Dekonstruksi ({selectedSubmission.ennis} & {selectedSubmission.polya}):</b>
                      <p style={{background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', margin: '5px 0'}}>{selectedSubmission.deconstructionText}</p>
                    </div>

                    <div style={styles.diagnosticBox}>
                      <b>Hasil Evaluasi Mesin AI Gemini:</b><br/>
                      {selectedSubmission.diagnosis}
                    </div>
                  </div>

                  <form onSubmit={(e) => e.preventDefault()} style={{marginTop: '20px'}}>
                    <label style={styles.label}>Berikan Catatan/Komentar Guru (Opsional):</label>
                    <textarea rows="3" placeholder="Tulis masukan Anda di sini..." value={teacherNoteInput} onChange={(e) => setTeacherNoteInput(e.target.value)} style={styles.textarea} />
                    <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                      <button type="button" style={{...styles.btnPrimary, background: '#16a34a'}} onClick={() => handleTeacherAction(selectedSubmission.id, 'Disetujui Guru (ACC)')}>✅ Setujui (ACC)</button>
                      <button type="button" style={{...styles.btnDanger, padding: '10px', flex: 1}} onClick={() => handleTeacherAction(selectedSubmission.id, 'Minta Revisi')}>❌ Kembalikan / Revisi</button>
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

const styles = {
  appContainer: { fontFamily: 'Inter, system-ui, sans-serif', maxWidth: '800px', margin: '30px auto', padding: '15px', color: '#1e293b' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px' },
  logoText: { margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '1px', color: '#0f172a' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '25px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  title: { fontSize: '28px', fontWeight: '800', color: '#1e3a8a', marginBottom: '5px' },
  subtitle: { fontSize: '14px', color: '#64748b', marginBottom: '20px' },
  rulesBox: { background: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #3b82f6', marginBottom: '20px' },
  gridMenu: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
  menuBox: { flex: 1, minWidth: '200px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', cursor: 'pointer', textAlign: 'center', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'transform 0.2s' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#334155' },
  input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' },
  btnPrimary: { background: '#0f172a', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', width: '100%', fontSize: '14px' },
  btnSecondary: { background: '#64748b', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  btnDanger: { background: '#dc2626', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  btnTable: { background: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  btnDangerTable: { background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  textBtn: { background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '14px', fontWeight: '700' },
  backBtn: { background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '13px', marginBottom: '15px', padding: 0, fontWeight: '700' },
  navBar: { display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap', background: '#f1f5f9', padding: '10px', borderRadius: '8px' },
  navBadge: { background: '#e2e8f0', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', color: '#0f172a' },
  navBtn: { background: 'transparent', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', color: '#64748b' },
  navActive: { background: '#fff', color: '#2563eb', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '700', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modalCard: { background: '#fff', padding: '25px', borderRadius: '12px', width: '350px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  modalActions: { display: 'flex', gap: '10px', marginTop: '20px', alignItems: 'center' },
  monitor: { background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderRadius: '6px' },
  badgeInfo: { background: '#e0f2fe', color: '#0369a1', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '10px' },
  successBadge: { background: '#dcfce7', color: '#166534', padding: '10px', borderRadius: '6px', fontSize: '13px', marginTop: '10px', fontWeight: '600' },
  frameworkGrid: { display: 'flex', gap: '15px', margin: '15px 0', flexDirection: 'column' },
  frameworkBox: { background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' },
  promptBox: { background: '#fef3c7', color: '#92400e', padding: '8px 12px', borderRadius: '4px', fontSize: '12px', marginTop: '8px', borderLeft: '3px solid #f59e0b' },
  certBox: { border: '4px double #1e3a8a', padding: '30px', background: '#fafaf9', borderRadius: '8px' },
  reviewContentBox: { background: '#f8fafc', padding: '15px', borderRadius: '6px', marginTop: '15px', border: '1px solid #e2e8f0' },
  diagnosticBox: { background: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '12px', borderRadius: '6px', color: '#991b1b', margin: '15px 0', fontSize: '13px' },
  teacherFeedback: { background: '#eff6ff', borderLeft: '4px solid #3b82f6', padding: '12px', borderRadius: '6px', color: '#1e40af', margin: '10px 0', fontSize: '13px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginTop: '15px' },
  statusBadge: (status) => ({
    background: status?.includes('ACC') ? '#dcfce7' : status?.includes('Revisi') ? '#fee2e2' : '#fef3c7',
    color: status?.includes('ACC') ? '#166534' : status?.includes('Revisi') ? '#991b1b' : '#92400e',
    padding: '4px 8px', borderRadius: '4px', fontWeight: '700', fontSize: '11px'
  }),
  main: { marginTop: '10px' }
};
