import React, { useState, useEffect } from 'react';

export default function App() {
  // 1. STATE DASAR & RBAC
  const [userRole, setUserRole] = useState('siswa'); // 'siswa' atau 'guru'
  const [isGuruAuthed, setIsGuruAuthed] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  const [activeTab, setActiveTab] = useState('landing');
  const [apiKey, setApiKey] = useState('');
  const [selectedMode, setSelectedMode] = useState('mandiri');

  // 2. STATE DETEKSI PELANGGARAN
  const [isPasted, setIsPasted] = useState(false);

  // Form Kanvas Siswa
  const [formData, setFormData] = useState({
    studentName: '',
    problem: '',
    ennisIndicator: 'Penjelasan Sederhana',
    polyaStep: 'Memahami Masalah',
    deconstructionText: ''
  });

  // 3. DATABASE LOKAL (PERSISTENT STATE DENGAN LOCALSTORAGE)
  const [submissions, setSubmissions] = useState(() => {
    const saved = localStorage.getItem('PENA_SUBMISSIONS');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      {
        id: 101,
        certNumber: 'PENA-2026-8831',
        studentName: 'Budi Santoso',
        mode: 'Modus Kelompok (Kelas)',
        problem: 'Apakah AI dapat menggantikan penalaran kritis manusia?',
        ennis: 'Penjelasan Sederhana',
        polya: 'Memahami Masalah',
        deconstructionText: 'AI hanya memproses data statistik. AI tidak memiliki kesadaran kritis, etika, dan empati kognitif.',
        diagnosis: 'Kritis & Mendalam',
        aiNotes: 'Penguraian nalar siswa terstruktur logis dan memenuhi kaidah kognitif.',
        hasCopyPasted: false,
        isTooShort: false,
        timestamp: '15/10/2026, 14:30',
        status: 'Pending Review',
        teacherFeedback: ''
      }
    ];
  });

  const [activeSubmissionId, setActiveSubmissionId] = useState(101);

  // Simpan Otomatis ke LocalStorage
  useEffect(() => {
    localStorage.setItem('PENA_SUBMISSIONS', JSON.stringify(submissions));
  }, [submissions]);

  // Ambil data aktif siswa
  const activePortfolio = submissions.find(s => s.id === activeSubmissionId) || submissions[0];

  // State Modal Detail Guru
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [targetSubmissionId, setTargetSubmissionId] = useState(null);
  const [teacherNoteInput, setTeacherNoteInput] = useState('');

  // Handle Akses Guru
  const handleRequestGuruAccess = () => {
    if (userRole === 'guru') {
      setUserRole('siswa');
      setActiveTab('landing');
      return;
    }
    setShowPinModal(true);
  };

  const handleVerifyPin = (e) => {
    e.preventDefault();
    if (pinInput === 'PENA2026' || pinInput === '1234') {
      setIsGuruAuthed(true);
      setUserRole('guru');
      setShowPinModal(false);
      setPinInput('');
      setActiveTab('guruDashboard');
    } else {
      alert('❌ PIN Rahasia Guru Salah! Akses Ditolak.');
      setPinInput('');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Tangkap Event Copy-Paste
  const handlePasteDetect = () => {
    setIsPasted(true);
  };

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      alert('Masukkan API Key yang valid!');
      return;
    }
    alert('API Key Google AI Berhasil Diaktifkan!');
    setActiveTab('workspace');
  };

  // SUBMIT KANVAS DENGAN SENSOR PELANGGARAN
  const handleSubmitCanvas = (e) => {
    e.preventDefault();
    const length = formData.deconstructionText.trim().length;
    const tooShort = length < 40;

    let diagnosis = 'Kritis & Mendalam';
    let aiNotes = 'Penguraian nalar terstruktur rapi berdasarkan indikator Ennis & Polya.';

    if (isPasted || tooShort) {
      diagnosis = 'PERINGATAN: Ketergantungan Instan AI / Pelanggaran Nalar';
      aiNotes = `Sistem mendeteksi indikasi kecurangan: ${isPasted ? '[Salin-Tempel Teks AI]' : ''} ${tooShort ? '[Jawaban Kurang Karakter / Dangkal]' : ''}. Dekonstruksi mandiri belum terpenuhi secara substansial.`;
    }

    const newCertNum = `PENA-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newId = Date.now();

    const newSubmission = {
      id: newId,
      certNumber: newCertNum,
      studentName: formData.studentName || 'Siswa Tanpa Nama',
      mode: selectedMode === 'mandiri' ? 'Modus Mandiri (Privat)' : 'Modus Kelompok (Kelas)',
      problem: formData.problem,
      ennis: formData.ennisIndicator,
      polya: formData.polyaStep,
      deconstructionText: formData.deconstructionText,
      diagnosis: diagnosis,
      aiNotes: aiNotes,
      hasCopyPasted: isPasted,
      isTooShort: tooShort,
      timestamp: new Date().toLocaleString(),
      status: selectedMode === 'mandiri' ? 'Disetujui Otomatis (Mandiri)' : 'Pending Review',
      teacherFeedback: ''
    };

    setSubmissions([newSubmission, ...submissions]);
    setActiveSubmissionId(newId);
    setIsPasted(false); // Reset sensor
    setActiveTab('portfolio');
  };

  // AKSI GURU: ACC
  const handleApproveByTeacher = (id) => {
    const feedback = 'Bagus! Pertanggungjawaban nalar telah memenuhi indikator berpikir kritis.';
    setSubmissions(prev =>
      prev.map(item => item.id === id ? { ...item, status: 'Disetujui Guru (ACC)', teacherFeedback: feedback } : item)
    );
    if (selectedSubmission && selectedSubmission.id === id) {
      setSelectedSubmission(prev => ({ ...prev, status: 'Disetujui Guru (ACC)', teacherFeedback: feedback }));
    }
    alert('✅ Tugas berhasil disetujui (ACC)! Status siswa otomatis ter-update.');
  };

  // AKSI GURU: REVISI
  const handleOpenRevisionModal = (id) => {
    setTargetSubmissionId(id);
    setTeacherNoteInput('');
    setShowRevisionModal(true);
  };

  const handleSaveRevision = (e) => {
    e.preventDefault();
    if (!teacherNoteInput.trim()) {
      alert('Mohon isi catatan revisi agar siswa tahu letak kesalahannya!');
      return;
    }

    setSubmissions(prev =>
      prev.map(item =>
        item.id === targetSubmissionId
          ? { ...item, status: 'Minta Revisi', teacherFeedback: teacherNoteInput }
          : item
      )
    );

    if (selectedSubmission && selectedSubmission.id === targetSubmissionId) {
      setSelectedSubmission(prev => ({ ...prev, status: 'Minta Revisi', teacherFeedback: teacherNoteInput }));
    }

    setShowRevisionModal(false);
    setTeacherNoteInput('');
    alert('❌ Status diubah menjadi Minta Revisi & Catatan terkirim ke E-Portofolio siswa!');
  };

  return (
    <div style={styles.appContainer}>
      {/* HEADER & SWITCH ROLE */}
      <header style={styles.header} className="no-print">
        <div>
          <h2 style={styles.logoText}>PENA 🛡️ (Pertanggungjawaban Nalar)</h2>
          <span style={styles.roleBadge}>
            Peran: <b>{userRole === 'siswa' ? '🎓 Siswa' : '👨‍🏫 Guru (Akses Terverifikasi)'}</b>
          </span>
        </div>

        <button 
          style={userRole === 'guru' ? styles.guruActiveBtn : styles.switchRoleBtn}
          onClick={handleRequestGuruAccess}
        >
          {userRole === 'siswa' ? '🔒 Masuk Mode Guru' : '🔓 Keluar Mode Guru'}
        </button>
      </header>

      {/* MODAL PIN GURU */}
      {showPinModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard}>
            <h3>🔐 Otentikasi Khusus Guru</h3>
            <p style={{fontSize: '13px', color: '#64748b'}}>Masukkan PIN Rahasia Guru untuk membuka Dashboard Kontrol.</p>
            <form onSubmit={handleVerifyPin}>
              <input
                type="password"
                placeholder="Masukkan PIN Guru..."
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                style={styles.input}
                autoFocus
                required
              />
              <div style={{display: 'flex', gap: '10px'}}>
                <button type="submit" style={styles.primaryBtn}>Verifikasi 🔑</button>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowPinModal(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NAVIGASI BERDASARKAN PERAN */}
      <nav style={styles.navBar} className="no-print">
        {userRole === 'siswa' ? (
          <>
            <button style={activeTab === 'landing' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('landing')}>1. Beranda</button>
            <button style={activeTab === 'apiKey' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('apiKey')}>2. API Key</button>
            <button style={activeTab === 'workspace' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('workspace')}>3,5,6. Kanvas Nalar</button>
            <button style={activeTab === 'portfolio' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('portfolio')}>4. E-Portofolio PDF</button>
          </>
        ) : (
          <button style={activeTab === 'guruDashboard' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('guruDashboard')}>
            📊 Dashboard Kontrol Guru (RBAC Active)
          </button>
        )}
      </nav>

      <main style={styles.mainContent}>
        {/* ================= 1. BERANDA ================= */}
        {activeTab === 'landing' && userRole === 'siswa' && (
          <div style={styles.card} className="no-print">
            <span style={styles.badge}>Poin 1: Landing Page</span>
            <h1 style={styles.title}>Disrupsi Ketergantungan AI dengan Nalar</h1>
            <p style={styles.paragraph}>
              Platform PENA memfasilitasi transisi dari naskah fisik (Pilar 1) menuju kanvas digital (Pilar 2) untuk memastikan setiap jawaban dipertanggungjawabkan secara kritis.
            </p>
            <button style={styles.primaryBtn} onClick={() => setActiveTab('apiKey')}>
              Mulai Setup API Key Google AI ➔
            </button>
          </div>
        )}

        {/* ================= 2. SETUP API KEY ================= */}
        {activeTab === 'apiKey' && userRole === 'siswa' && (
          <div style={styles.card} className="no-print">
            <span style={styles.badge}>Poin 2: Guide API Key</span>
            <h2>Pengaturan Google AI Studio</h2>
            <ol style={styles.list}>
              <li>Buka <b>aistudio.google.com</b>.</li>
              <li>Klik tombol <b>Create API Key</b>.</li>
              <li>Salin kode unik API Anda.</li>
              <li>Tempelkan ke kolom di bawah ini:</li>
            </ol>
            <form onSubmit={handleSaveApiKey}>
              <input
                type="password"
                placeholder="Tempel API Key di sini..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={styles.input}
                required
              />
              <button type="submit" style={styles.primaryBtn}>Simpan & Aktifkan 🔑</button>
            </form>
          </div>
        )}

        {/* ================= 3, 5, & 6. KANVAS NALAR ================= */}
        {activeTab === 'workspace' && userRole === 'siswa' && (
          <div style={styles.card} className="no-print">
            <span style={styles.badge}>Poin 3, 5, 6: WorkSpace</span>
            <h2>Kanvas Dekonstruksi Nalar</h2>

            <div style={styles.modeBox}>
              <label><b>Pilih Modus Operasional:</b></label>
              <div style={{display: 'flex', gap: '10px', marginTop: '5px'}}>
                <button 
                  type="button" 
                  style={selectedMode === 'mandiri' ? styles.modeActive : styles.modeInactive}
                  onClick={() => setSelectedMode('mandiri')}
                >
                  🟢 Modus Mandiri (Privat / Latihan)
                </button>
                <button 
                  type="button" 
                  style={selectedMode === 'kelompok' ? styles.modeActive : styles.modeInactive}
                  onClick={() => setSelectedMode('kelompok')}
                >
                  🔵 Modus Kelompok (Tugas Kelas Guru)
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitCanvas}>
              <div style={styles.formGroup}>
                <label>Nama Siswa:</label>
                <input type="text" name="studentName" value={formData.studentName} onChange={handleInputChange} style={styles.input} required />
              </div>

              <div style={styles.formGroup}>
                <label>Klaim / Kasus AI yang Diuji:</label>
                <textarea name="problem" rows="2" value={formData.problem} onChange={handleInputChange} style={styles.textarea} required />
              </div>

              <div style={{display: 'flex', gap: '10px'}}>
                <div style={{flex: 1}}>
                  <label>A. Teori Ennis (Kritis):</label>
                  <select name="ennisIndicator" value={formData.ennisIndicator} onChange={handleInputChange} style={styles.input}>
                    <option>Penjelasan Sederhana</option>
                    <option>Keterampilan Dasar</option>
                    <option>Menyimpulkan</option>
                    <option>Penjelasan Lebih Lanjut</option>
                    <option>Taktik & Strategi</option>
                  </select>
                </div>
                <div style={{flex: 1}}>
                  <label>B. Teori Polya (Masalah):</label>
                  <select name="polyaStep" value={formData.polyaStep} onChange={handleInputChange} style={styles.input}>
                    <option>Memahami Masalah</option>
                    <option>Merencanakan Penyelesaian</option>
                    <option>Melaksanakan Rencana</option>
                    <option>Memeriksa Kembali</option>
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label>
                  Dekonstruksi Nalar Mandiri 
                  <span style={{fontSize: '11px', color: '#dc2626', marginLeft: '6px'}}>(Sistem mendeteksi Copy-Paste & Karakter Singkat)</span>:
                </label>
                <textarea 
                  name="deconstructionText" 
                  rows="4" 
                  value={formData.deconstructionText} 
                  onChange={handleInputChange} 
                  onPaste={handlePasteDetect} 
                  placeholder="Ketik analisis nalar mandiri kamu di sini..." 
                  style={styles.textarea} 
                  required 
                />
                {isPasted && (
                  <p style={{color: '#dc2626', fontSize: '11px', margin: '2px 0'}}>
                    ⚠️ Terdeteksi aksi Copy-Paste! Pelanggaran ini akan dicatat di Laporan Diagnostik AI.
                  </p>
                )}
              </div>

              <button type="submit" style={styles.primaryBtn}>Kirim & Hasilkan E-Portofolio PDF 🚀</button>
            </form>
          </div>
        )}

        {/* ================= 4. SERTIFIKAT E-PORTOFOLIO RESMI (SERTA DETEKSI REALTIME) ================= */}
        {activeTab === 'portfolio' && userRole === 'siswa' && (
          <div>
            <div style={{marginBottom: '15px', display: 'flex', justifyContent: 'space-between'}} className="no-print">
              <div>
                <h3>🎓 E-Portofolio Digital & Sertifikat Nalar</h3>
                <p style={{fontSize: '12px', color: '#64748b'}}>Status terhubung otomatis dengan peninjauan Guru.</p>
              </div>
              <button style={styles.printBtn} onClick={() => window.print()}>
                📄 Cetak / Download Sertifikat PDF
              </button>
            </div>

            {activePortfolio ? (
              <div style={styles.certContainer} id="certPrintArea">
                <div style={styles.certBorder}>
                  {/* HEADER SERTIFIKAT */}
                  <div style={styles.certHeader}>
                    <h1 style={styles.certTitle}>PENA: SERTIFIKAT VERIFIKASI NALAR</h1>
                    <p style={styles.certSub}>Platform Pertanggungjawaban Nalar Kognitif Siswa</p>
                    <span style={styles.certNumber}>NO. REGISTRASI: {activePortfolio.certNumber}</span>
                  </div>

                  <hr style={styles.certDivider} />

                  {/* IDENTITAS SISWA */}
                  <div style={styles.certBody}>
                    <p>Sertifikat dan Laporan Diagnostik ini resmi diterbitkan untuk:</p>
                    <h2 style={styles.studentNameTitle}>{activePortfolio.studentName}</h2>
                    <p style={{fontSize: '13px'}}>
                      Telah menyelesaikan pengerjaan pada <b>{activePortfolio.mode}</b> pada tanggal <b>{activePortfolio.timestamp}</b>.
                    </p>

                    {/* BADGE STATUS DARI GURU (REALTIME UPDATE) */}
                    <div style={styles.statusBox}>
                      STATUS VERIFIKASI SEKARANG: 
                      <span style={{
                        marginLeft: '8px',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        backgroundColor: activePortfolio.status.includes('ACC') ? '#dcfce7' : activePortfolio.status.includes('Revisi') ? '#fee2e2' : '#fef3c7',
                        color: activePortfolio.status.includes('ACC') ? '#15803d' : activePortfolio.status.includes('Revisi') ? '#b91c1c' : '#b45309'
                      }}>
                        {activePortfolio.status}
                      </span>
                    </div>

                    {/* PELANGGARAN TERDETEKSI */}
                    {(activePortfolio.hasCopyPasted || activePortfolio.isTooShort) && (
                      <div style={styles.violationCard}>
                        <h4 style={{margin: '0 0 5px 0', color: '#991b1b'}}>⚠️ PELANGGARAN NALAR TERDETEKSI:</h4>
                        {activePortfolio.hasCopyPasted && <p style={{margin: '2px 0'}}>• Terdeteksi melakukan Copy-Paste teks instan dari AI/sumber luar.</p>}
                        {activePortfolio.isTooShort && <p style={{margin: '2px 0'}}>• Jawaban dekonstruksi terlalu pendek/dangkal (kurang dari 40 karakter).</p>}
                      </div>
                    )}

                    {/* KERANGKA TEORI */}
                    <div style={styles.frameworkGrid}>
                      <div style={styles.frameworkItem}>
                        <b>Teori Kritis (Ennis):</b>
                        <p>{activePortfolio.ennis}</p>
                      </div>
                      <div style={styles.frameworkItem}>
                        <b>Tahapan Masalah (Polya):</b>
                        <p>{activePortfolio.polya}</p>
                      </div>
                    </div>

                    {/* DEKONSTRUKSI NALAR */}
                    <div style={styles.deconstructionBox}>
                      <b>Klaim/Kasus AI yang Diuji:</b>
                      <p style={{fontStyle: 'italic', color: '#475569'}}>{activePortfolio.problem}</p>
                      <b>Uraian Dekonstruksi Nalar Siswa:</b>
                      <p style={{backgroundColor: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '5px'}}>
                        "{activePortfolio.deconstructionText}"
                      </p>
                    </div>

                    {/* DIAGNOSTIK AI */}
                    <div style={styles.diagnosticBoxCert}>
                      <b>🤖 Laporan Diagnostik AI:</b>
                      <p><b>Diagnosa:</b> {activePortfolio.diagnosis}</p>
                      <p><b>Catatan:</b> {activePortfolio.aiNotes}</p>
                    </div>

                    {/* CATATAN REVISI / EVALUASI GURU */}
                    {activePortfolio.teacherFeedback && (
                      <div style={styles.teacherFeedbackCert}>
                        <b>👨‍🏫 Evaluasi & Catatan Guru:</b>
                        <p style={{marginTop: '4px'}}>"{activePortfolio.teacherFeedback}"</p>
                      </div>
                    )}

                    {/* FOOTER & STEMPEL */}
                    <div style={styles.certFooter}>
                      <div>
                        <p style={{fontSize: '11px', color: '#64748b'}}>Terverifikasi oleh Sistem PENA AI</p>
                        <div style={styles.digitalSeal}>PENALISASI DIGITAL</div>
                      </div>
                      <div style={{textAlign: 'right'}}>
                        <p style={{fontSize: '11px', color: '#64748b'}}>Tanda Tangan Pengajar/Guru</p>
                        <p style={{marginTop: '25px', fontWeight: 'bold'}}>(_______________________)</p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ) : (
              <p>Belum ada data E-Portofolio.</p>
            )}
          </div>
        )}

        {/* ================= 7. DASHBOARD KONTROL GURU (RBAC) ================= */}
        {activeTab === 'guruDashboard' && userRole === 'guru' && isGuruAuthed && (
          <div style={styles.card} className="no-print">
            <span style={styles.badge}>Poin 7: RBAC Guru Dashboard</span>
            <h2>Panel Kontrol Administratif Guru</h2>
            <p style={{fontSize: '13px', color: '#475569'}}>
              Evaluasi kiriman siswa, periksa pelanggaran copy-paste, dan berikan ACC atau Catatan Revisi.
            </p>

            <table style={styles.table}>
              <thead>
                <tr style={{backgroundColor: '#e2e8f0', textAlign: 'left'}}>
                  <th style={styles.th}>Siswa</th>
                  <th style={styles.th}>Modus</th>
                  <th style={styles.th}>Indikasi Pelanggaran</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Aksi Guru</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id} style={{borderBottom: '1px solid #e2e8f0'}}>
                    <td style={styles.td}><b>{sub.studentName}</b></td>
                    <td style={styles.td}>{sub.mode}</td>
                    <td style={styles.td}>
                      {sub.hasCopyPasted || sub.isTooShort ? (
                        <span style={{color: '#dc2626', fontWeight: 'bold', fontSize: '11px'}}>
                          ⚠️ {sub.hasCopyPasted ? 'Copy-Pasted ' : ''}{sub.isTooShort ? 'Terlalu Singkat' : ''}
                        </span>
                      ) : (
                        <span style={{color: '#16a34a', fontSize: '11px'}}>✅ Aman</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        fontSize: '11px', 
                        padding: '3px 8px', 
                        borderRadius: '4px', 
                        fontWeight: 'bold',
                        backgroundColor: sub.status.includes('ACC') ? '#dcfce7' : sub.status.includes('Revisi') ? '#fee2e2' : '#fef3c7',
                        color: sub.status.includes('ACC') ? '#15803d' : sub.status.includes('Revisi') ? '#b91c1c' : '#b45309'
                      }}>
                        {sub.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button style={styles.inspectBtn} onClick={() => setSelectedSubmission(sub)}>
                        👁️ Periksa & Evaluasi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* MODAL PERIKSA JAWABAN SISWA */}
        {selectedSubmission && (
          <div style={styles.modalOverlay} className="no-print">
            <div style={styles.largeModalCard}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3>📝 Peninjauan Nalar Siswa: {selectedSubmission.studentName}</h3>
                <button style={styles.closeBtn} onClick={() => setSelectedSubmission(null)}>✖ Close</button>
              </div>
              <hr />
              <div style={{fontSize: '13px', lineHeight: '1.6'}}>
                <p><b>Waktu Pengerjaan:</b> {selectedSubmission.timestamp}</p>
                <p><b>Indikator Ennis:</b> {selectedSubmission.ennis} | <b>Tahapan Polya:</b> {selectedSubmission.polya}</p>
                
                {(selectedSubmission.hasCopyPasted || selectedSubmission.isTooShort) && (
                  <div style={styles.violationCard}>
                    <b>⚠️ CATATAN PELANGGARAN SISTEM:</b>
                    {selectedSubmission.hasCopyPasted && <p style={{margin: '0'}}>• Siswa terdeteksi melakukan Copy-Paste teks luar.</p>}
                    {selectedSubmission.isTooShort && <p style={{margin: '0'}}>• Teks dekonstruksi nalar sangat singkat/dangkal.</p>}
                  </div>
                )}

                <div style={styles.reviewContentBox}>
                  <b>Klaim/Kasus AI:</b>
                  <p style={{fontStyle: 'italic', color: '#334155'}}>{selectedSubmission.problem}</p>
                  
                  <b>Jawaban Dekonstruksi Nalar Siswa:</b>
                  <p style={{backgroundColor: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1'}}>
                    "{selectedSubmission.deconstructionText}"
                  </p>
                </div>

                <div style={styles.diagnosticResult}>
                  <b>🤖 Laporan Diagnostik AI:</b>
                  <p><b>Status:</b> {selectedSubmission.diagnosis}</p>
                  <p><b>Catatan:</b> {selectedSubmission.aiNotes}</p>
                </div>

                {selectedSubmission.teacherFeedback && (
                  <div style={styles.teacherFeedbackCert}>
                    <b>👨‍🏫 Catatan Guru yang Tersimpan:</b>
                    <p>"{selectedSubmission.teacherFeedback}"</p>
                  </div>
                )}
              </div>

              <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                <button style={styles.accBtnLarge} onClick={() => handleApproveByTeacher(selectedSubmission.id)}>
                  ✅ Setujui / ACC Jawaban
                </button>
                <button style={styles.rejectBtnLarge} onClick={() => handleOpenRevisionModal(selectedSubmission.id)}>
                  ❌ Minta Revisi + Tulis Catatan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CATATAN REVISI */}
        {showRevisionModal && (
          <div style={styles.modalOverlay} className="no-print">
            <div style={styles.modalCard}>
              <h3>✏️ Tulis Alasan / Catatan Revisi</h3>
              <p style={{fontSize: '12px', color: '#64748b'}}>Berikan masukan agar siswa tahu letak kekurangannya.</p>
              <form onSubmit={handleSaveRevision}>
                <textarea
                  rows="4"
                  placeholder="Contoh: Jawaban kamu terdeteksi copy-paste dan terlalu singkat. Harap jelaskan lagi sesuai indikator Ennis..."
                  value={teacherNoteInput}
                  onChange={(e) => setTeacherNoteInput(e.target.value)}
                  style={styles.textarea}
                  required
                />
                <div style={{display: 'flex', gap: '10px'}}>
                  <button type="submit" style={styles.rejectBtnLarge}>Kirim Catatan Revisi 📩</button>
                  <button type="button" style={styles.cancelBtn} onClick={() => setShowRevisionModal(false)}>Batal</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

// CSS STYLING
const styles = {
  appContainer: { fontFamily: 'sans-serif', maxWidth: '850px', margin: '20px auto', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '10px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', color: 'white', padding: '15px', borderRadius: '8px' },
  logoText: { margin: 0, fontSize: '18px' },
  roleBadge: { fontSize: '12px', color: '#93c5fd' },
  switchRoleBtn: { backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  guruActiveBtn: { backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalCard: { backgroundColor: 'white', padding: '25px', borderRadius: '10px', maxWidth: '450px', width: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
  largeModalCard: { backgroundColor: 'white', padding: '25px', borderRadius: '10px', maxWidth: '650px', width: '90%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
  closeBtn: { backgroundColor: '#e2e8f0', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  cancelBtn: { backgroundColor: '#94a3b8', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  navBar: { display: 'flex', gap: '8px', margin: '15px 0' },
  navBtn: { backgroundColor: '#cbd5e1', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  navBtnActive: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  mainContent: { marginTop: '10px' },
  card: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' },
  badge: { backgroundColor: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
  title: { fontSize: '20px', margin: '10px 0' },
  paragraph: { fontSize: '14px', color: '#475569' },
  primaryBtn: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: 1, marginTop: '10px' },
  printBtn: { backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  input: { width: '100%', padding: '8px', margin: '8px 0 15px 0', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '8px', margin: '8px 0 15px 0', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontFamily: 'inherit' },
  list: { fontSize: '13px', lineHeight: '1.6' },
  formGroup: { marginBottom: '10px' },
  modeBox: { backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '6px', marginBottom: '15px' },
  modeActive: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  modeInactive: { backgroundColor: '#e2e8f0', color: '#475569', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' },
  
  // STYLE SERTIFIKAT DIGITAL
  certContainer: { backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1' },
  certBorder: { border: '6px double #1e3a8a', padding: '25px', backgroundColor: '#fafaf9', position: 'relative' },
  certHeader: { textAlign: 'center' },
  certTitle: { color: '#1e3a8a', margin: '0', fontSize: '22px', letterSpacing: '1px' },
  certSub: { fontSize: '12px', color: '#64748b', margin: '5px 0' },
  certNumber: { fontSize: '11px', fontWeight: 'bold', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px' },
  certDivider: { border: '0', borderTop: '2px solid #1e3a8a', margin: '15px 0' },
  certBody: { fontSize: '13px', lineHeight: '1.6' },
  studentNameTitle: { fontSize: '24px', color: '#0f172a', margin: '5px 0', borderBottom: '1px dashed #cbd5e1', display: 'inline-block' },
  statusBox: { margin: '15px 0', padding: '10px', backgroundColor: '#f1f5f9', borderRadius: '6px', fontSize: '12px' },
  violationCard: { backgroundColor: '#fee2e2', borderLeft: '4px solid #dc2626', padding: '10px', borderRadius: '4px', margin: '10px 0', color: '#991b1b', fontSize: '12px' },
  frameworkGrid: { display: 'flex', gap: '15px', margin: '15px 0' },
  frameworkItem: { flex: 1, backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' },
  deconstructionBox: { backgroundColor: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', margin: '15px 0' },
  diagnosticBoxCert: { backgroundColor: '#fef3c7', padding: '12px', borderRadius: '6px', color: '#92400e', margin: '15px 0' },
  teacherFeedbackCert: { backgroundColor: '#eff6ff', borderLeft: '4px solid #2563eb', padding: '10px', borderRadius: '4px', margin: '15px 0', color: '#1e40af' },
  certFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '30px' },
  digitalSeal: { display: 'inline-block', border: '2px dashed #16a34a', color: '#16a34a', padding: '4px 8px', borderRadius: '50px', fontSize: '10px', fontWeight: 'bold', transform: 'rotate(-5deg)', marginTop: '5px' },

  reviewContentBox: { backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '6px', marginTop: '10px', marginBottom: '10px' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px', fontSize: '12px' },
  th: { padding: '8px', borderBottom: '2px solid #cbd5e1' },
  td: { padding: '8px' },
  inspectBtn: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  accBtnLarge: { backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', flex: 1, fontWeight: 'bold' },
  rejectBtnLarge: { backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', flex: 1, fontWeight: 'bold' }
};
