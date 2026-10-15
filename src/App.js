import React, { useState, useEffect } from 'react';

export default function App() {
  // 1. STATE DASAR & RBAC
  const [userRole, setUserRole] = useState('siswa');
  const [isGuruAuthed, setIsGuruAuthed] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  const [activeTab, setActiveTab] = useState('landing');
  const [apiKey, setApiKey] = useState('');
  const [selectedMode, setSelectedMode] = useState('mandiri');

  // 2. STATE DETEKSI PELANGGARAN
  const [isPasted, setIsPasted] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Form Kanvas Siswa
  const [formData, setFormData] = useState({
    studentName: '',
    problem: '',
    ennisIndicator: 'Penjelasan Sederhana',
    polyaStep: 'Memahami Masalah',
    deconstructionText: ''
  });

  // KAMUS PERTANYAAN PEMANTIK (POIN REVISI 3)
  const ennisPrompts = {
    'Penjelasan Sederhana': 'Fokus: Apakah istilah/konsep dasar dari jawaban AI ini sudah jelas dan tidak membingungkan?',
    'Keterampilan Dasar': 'Fokus: Apakah sumber atau dasar argumen AI ini bisa dipercaya kredibilitasnya?',
    'Menyimpulkan': 'Fokus: Apakah kesimpulan yang ditarik AI ini logis? Adakah alternatif kesimpulan lain?',
    'Penjelasan Lebih Lanjut': 'Fokus: Adakah asumsi tersembunyi yang dipakai AI namun tidak dijelaskan secara gamblang?',
    'Taktik & Strategi': 'Fokus: Apakah solusi/tindakan yang disarankan AI merupakan langkah yang paling tepat dan aman?'
  };

  const polyaPrompts = {
    'Memahami Masalah': 'Fokus: Apa inti dari masalah sebenarnya? Apakah AI benar-benar menjawab pokok masalahnya?',
    'Merencanakan Penyelesaian': 'Fokus: Bagaimana strategi AI menyusun jawabannya? Apakah urutannya masuk akal?',
    'Melaksanakan Rencana': 'Fokus: Coba periksa argumen AI, adakah cacat logika saat mengeksekusi penjelasan?',
    'Memeriksa Kembali': 'Fokus: Mari validasi ulang hasil akhir AI. Apakah ini jawaban mutlak atau bisa diuji lagi?'
  };

  // 3. DATABASE LOKAL DENGAN CROSS-TAB SYNC (POIN REVISI 4)
  const [submissions, setSubmissions] = useState(() => {
    const saved = localStorage.getItem('PENA_SUBMISSIONS');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeSubmissionId, setActiveSubmissionId] = useState(null);

  // Efek Sinkronisasi Antar-Tab (Biar kalau Guru ACC di Tab A, Siswa di Tab B langsung update)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'PENA_SUBMISSIONS' && e.newValue) {
        setSubmissions(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Simpan Otomatis ke LocalStorage setiap ada perubahan state
  useEffect(() => {
    localStorage.setItem('PENA_SUBMISSIONS', JSON.stringify(submissions));
  }, [submissions]);

  // SENSOR PINDAH TAB
  useEffect(() => {
    if (activeTab !== 'workspace' || userRole !== 'siswa') return;
    const handleVisibilityChange = () => {
      if (document.hidden) setTabSwitchCount(prev => prev + 1);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTab, userRole]);

  const activePortfolio = submissions.find(s => s.id === activeSubmissionId) || submissions[0];

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [targetSubmissionId, setTargetSubmissionId] = useState(null);
  const [teacherNoteInput, setTeacherNoteInput] = useState('');

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

  const handlePasteDetect = () => setIsPasted(true);

  // SUBMIT KANVAS (TANPA BATAS KARAKTER - POIN REVISI 2)
  const handleSubmitCanvas = (e) => {
    e.preventDefault();

    let diagnosis = 'Kritis & Mendalam';
    let aiNotes = 'Penguraian nalar terstruktur rapi berdasarkan indikator yang dipilih.';
    const hasViolations = isPasted || tabSwitchCount > 0;

    if (hasViolations) {
      diagnosis = 'PERINGATAN: Catatan Pelanggaran Nalar';
      aiNotes = `Terdeteksi anomali saat pengerjaan: ${isPasted ? '[Salin-Tempel Teks Luar] ' : ''}${tabSwitchCount > 0 ? `[Keluar Web/Pindah Tab ${tabSwitchCount}x]` : ''}. Integritas nalar mandiri dipertanyakan.`;
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
      tabSwitches: tabSwitchCount,
      timestamp: new Date().toLocaleString(),
      status: selectedMode === 'mandiri' ? 'Disetujui Otomatis (Mandiri)' : 'Pending Review',
      teacherFeedback: ''
    };

    setSubmissions([newSubmission, ...submissions]);
    setActiveSubmissionId(newId);
    
    setIsPasted(false);
    setTabSwitchCount(0);
    setActiveTab('portfolio');
  };

  const handleApproveByTeacher = (id) => {
    const feedback = 'Bagus! Pertanggungjawaban nalar telah memenuhi kaidah berpikir kritis.';
    setSubmissions(prev =>
      prev.map(item => item.id === id ? { ...item, status: 'Disetujui Guru (ACC)', teacherFeedback: feedback } : item)
    );
    if (selectedSubmission?.id === id) {
      setSelectedSubmission(prev => ({ ...prev, status: 'Disetujui Guru (ACC)', teacherFeedback: feedback }));
    }
    alert('✅ ACC Berhasil! Tampilan di web Siswa sudah ter-update realtime.');
  };

  const handleOpenRevisionModal = (id) => {
    setTargetSubmissionId(id);
    setTeacherNoteInput('');
    setShowRevisionModal(true);
  };

  const handleSaveRevision = (e) => {
    e.preventDefault();
    setSubmissions(prev =>
      prev.map(item => item.id === targetSubmissionId ? { ...item, status: 'Minta Revisi', teacherFeedback: teacherNoteInput } : item)
    );
    if (selectedSubmission?.id === targetSubmissionId) {
      setSelectedSubmission(prev => ({ ...prev, status: 'Minta Revisi', teacherFeedback: teacherNoteInput }));
    }
    setShowRevisionModal(false);
    alert('❌ Catatan Revisi terkirim ke E-Portofolio siswa!');
  };

  return (
    <div style={styles.appContainer}>
      {/* INJECT CSS UNTUK UKURAN A4 PRINT (POIN REVISI 1) */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #certPrintArea, #certPrintArea * { visibility: visible; }
          #certPrintArea { 
            position: absolute; left: 0; top: 0; 
            width: 210mm; /* Lebar A4 */
            min-height: 297mm; /* Tinggi A4 */
            padding: 10mm; box-sizing: border-box;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* HEADER */}
      <header style={styles.header} className="no-print">
        <div>
          <h2 style={styles.logoText}>PENA 🛡️</h2>
          <span style={styles.roleBadge}>Peran: <b>{userRole === 'siswa' ? '🎓 Siswa' : '👨‍🏫 Guru'}</b></span>
        </div>
        <button style={userRole === 'guru' ? styles.guruActiveBtn : styles.switchRoleBtn} onClick={handleRequestGuruAccess}>
          {userRole === 'siswa' ? '🔒 Masuk Mode Guru' : '🔓 Keluar Mode Guru'}
        </button>
      </header>

      {/* MODAL PIN GURU */}
      {showPinModal && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={styles.modalCard}>
            <h3>🔐 Otentikasi Khusus Guru</h3>
            <form onSubmit={handleVerifyPin}>
              <input type="password" placeholder="PIN Demo: PENA2026" value={pinInput} onChange={(e) => setPinInput(e.target.value)} style={styles.input} autoFocus required />
              <div style={{display: 'flex', gap: '10px'}}>
                <button type="submit" style={styles.primaryBtn}>Masuk 🔑</button>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowPinModal(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NAVIGASI */}
      <nav style={styles.navBar} className="no-print">
        {userRole === 'siswa' ? (
          <>
            <button style={activeTab === 'landing' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('landing')}>1. Beranda</button>
            <button style={activeTab === 'apiKey' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('apiKey')}>2. API Key</button>
            <button style={activeTab === 'workspace' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('workspace')}>3,5,6. Kanvas Nalar</button>
            <button style={activeTab === 'portfolio' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('portfolio')}>4. E-Portofolio</button>
          </>
        ) : (
          <button style={activeTab === 'guruDashboard' ? styles.navBtnActive : styles.navBtn} onClick={() => setActiveTab('guruDashboard')}>
            📊 Dashboard Kontrol Guru (Realtime Sync)
          </button>
        )}
      </nav>

      <main style={styles.mainContent}>
        
        {/* ================= 1. BERANDA ================= */}
        {activeTab === 'landing' && userRole === 'siswa' && (
          <div style={styles.card} className="no-print">
            <h1 style={styles.title}>Disrupsi Ketergantungan AI dengan Nalar</h1>
            <p style={styles.paragraph}>Transisi dari naskah fisik menuju kanvas digital untuk memastikan setiap jawaban dipertanggungjawabkan secara kritis.</p>
            <button style={styles.primaryBtn} onClick={() => setActiveTab('apiKey')}>Mulai Setup API Key ➔</button>
          </div>
        )}

        {/* ================= 2. SETUP API KEY ================= */}
        {activeTab === 'apiKey' && userRole === 'siswa' && (
          <div style={styles.card} className="no-print">
            <h2>Pengaturan Google AI Studio</h2>
            <p style={{fontSize: '12px', color: '#16a34a'}}>ℹ️ Bebas membuka tab luar di tahap ini tanpa dikurangi poin.</p>
            <form onSubmit={(e) => { e.preventDefault(); setActiveTab('workspace'); }}>
              <input type="password" placeholder="Tempel API Key di sini..." style={styles.input} required />
              <button type="submit" style={styles.primaryBtn}>Simpan & Aktifkan 🔑</button>
            </form>
          </div>
        )}

        {/* ================= 3, 5, & 6. KANVAS DEKONSTRUKSI ================= */}
        {activeTab === 'workspace' && userRole === 'siswa' && (
          <div style={styles.card} className="no-print">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h2>Kanvas Dekonstruksi Nalar Mandiri</h2>
              <span style={{fontSize: '11px', backgroundColor: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold'}}>
                🔴 Pengawasan Nalar Aktif
              </span>
            </div>

            <div style={styles.monitoringBar}>
              <span>👀 Keluar Web / Pindah Tab: <b style={{color: tabSwitchCount > 0 ? '#dc2626' : '#16a34a'}}>{tabSwitchCount} Kali</b></span>
              <span>📋 Terdeteksi Paste: <b style={{color: isPasted ? '#dc2626' : '#16a34a'}}>{isPasted ? 'YA' : 'TIDAK'}</b></span>
            </div>

            <div style={styles.modeBox}>
              <button type="button" style={selectedMode === 'mandiri' ? styles.modeActive : styles.modeInactive} onClick={() => setSelectedMode('mandiri')}>🟢 Mandiri (Privat)</button>
              <button type="button" style={selectedMode === 'kelompok' ? styles.modeActive : styles.modeInactive} onClick={() => setSelectedMode('kelompok')}>🔵 Kelompok (Tugas Guru)</button>
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

              {/* INDIKATOR DENGAN PERTANYAAN PEMANTIK (POIN REVISI 3) */}
              <div style={{display: 'flex', gap: '15px', flexDirection: 'column', marginBottom: '15px'}}>
                <div style={{flex: 1, backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1'}}>
                  <label style={{fontWeight: 'bold'}}>A. Teori Kritis (Ennis):</label>
                  <select name="ennisIndicator" value={formData.ennisIndicator} onChange={handleInputChange} style={{...styles.input, marginTop: '8px', marginBottom: '8px'}}>
                    {Object.keys(ennisPrompts).map(key => <option key={key} value={key}>{key}</option>)}
                  </select>
                  <div style={styles.promptBox}>💡 <b>Pemantik:</b> {ennisPrompts[formData.ennisIndicator]}</div>
                </div>

                <div style={{flex: 1, backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1'}}>
                  <label style={{fontWeight: 'bold'}}>B. Teori Masalah (Polya):</label>
                  <select name="polyaStep" value={formData.polyaStep} onChange={handleInputChange} style={{...styles.input, marginTop: '8px', marginBottom: '8px'}}>
                    {Object.keys(polyaPrompts).map(key => <option key={key} value={key}>{key}</option>)}
                  </select>
                  <div style={styles.promptBox}>💡 <b>Pemantik:</b> {polyaPrompts[formData.polyaStep]}</div>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label>Uraian Dekonstruksi Nalar (Elaborasikan dari pemantik di atas):</label>
                <textarea name="deconstructionText" rows="5" value={formData.deconstructionText} onChange={handleInputChange} onPaste={handlePasteDetect} placeholder="Ketik analisis kritis kamu..." style={styles.textarea} required />
              </div>

              <button type="submit" style={styles.primaryBtn}>Kirim & Hasilkan E-Portofolio 🚀</button>
            </form>
          </div>
        )}

        {/* ================= 4. SERTIFIKAT A4 (POIN REVISI 1) ================= */}
        {activeTab === 'portfolio' && userRole === 'siswa' && (
          <div>
            <div style={{marginBottom: '15px', display: 'flex', justifyContent: 'space-between'}} className="no-print">
              <div>
                <h3>🎓 E-Portofolio Digital Siswa</h3>
                <p style={{fontSize: '12px', color: '#64748b'}}>Halaman ini akan di-format ukuran A4 saat dicetak PDF.</p>
              </div>
              <button style={styles.printBtn} onClick={() => window.print()}>📄 Cetak / Download PDF (A4)</button>
            </div>

            {activePortfolio ? (
              <div id="certPrintArea" style={{backgroundColor: '#fff'}}>
                <div style={styles.certBorder}>
                  <div style={styles.certHeader}>
                    <h1 style={styles.certTitle}>SERTIFIKAT VERIFIKASI NALAR</h1>
                    <p style={styles.certSub}>Platform Pertanggungjawaban Nalar Kognitif Siswa</p>
                    <span style={styles.certNumber}>NO. REGISTRASI: {activePortfolio.certNumber}</span>
                  </div>

                  <hr style={styles.certDivider} />

                  <div style={styles.certBody}>
                    <p>Sertifikat dan Laporan Diagnostik ini diterbitkan untuk:</p>
                    <h2 style={styles.studentNameTitle}>{activePortfolio.studentName}</h2>
                    <p style={{fontSize: '13px'}}>Diselesaikan dalam <b>{activePortfolio.mode}</b> pada <b>{activePortfolio.timestamp}</b>.</p>

                    <div style={styles.statusBox}>
                      STATUS VERIFIKASI: 
                      <span style={{ marginLeft: '8px', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold',
                        backgroundColor: activePortfolio.status.includes('ACC') ? '#dcfce7' : activePortfolio.status.includes('Revisi') ? '#fee2e2' : '#fef3c7',
                        color: activePortfolio.status.includes('ACC') ? '#15803d' : activePortfolio.status.includes('Revisi') ? '#b91c1c' : '#b45309'
                      }}>
                        {activePortfolio.status}
                      </span>
                    </div>

                    {(activePortfolio.hasCopyPasted || activePortfolio.tabSwitches > 0) && (
                      <div style={styles.violationCard}>
                        <h4 style={{margin: '0 0 5px 0', color: '#991b1b'}}>⚠️ REKAM JEJAK PELANGGARAN NALAR:</h4>
                        {activePortfolio.tabSwitches > 0 && <p style={{margin: '2px 0'}}>• Keluar web / berpindah tab sebanyak <b>{activePortfolio.tabSwitches}x</b>.</p>}
                        {activePortfolio.hasCopyPasted && <p style={{margin: '2px 0'}}>• Terdeteksi aksi Copy-Paste teks.</p>}
                      </div>
                    )}

                    <div style={styles.frameworkGrid}>
                      <div style={styles.frameworkItem}><b>Teori Kritis (Ennis):</b><p>{activePortfolio.ennis}</p></div>
                      <div style={styles.frameworkItem}><b>Tahapan Masalah (Polya):</b><p>{activePortfolio.polya}</p></div>
                    </div>

                    <div style={styles.deconstructionBox}>
                      <b>Klaim/Kasus AI:</b> <p style={{fontStyle: 'italic', color: '#475569'}}>{activePortfolio.problem}</p>
                      <b style={{display:'block', marginTop:'10px'}}>Dekonstruksi Nalar:</b>
                      <p style={{backgroundColor: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '5px'}}>
                        "{activePortfolio.deconstructionText}"
                      </p>
                    </div>

                    <div style={styles.diagnosticBoxCert}>
                      <b>🤖 Diagnostik AI:</b>
                      <p><b>Diagnosa:</b> {activePortfolio.diagnosis}</p>
                      <p><b>Catatan:</b> {activePortfolio.aiNotes}</p>
                    </div>

                    {activePortfolio.teacherFeedback && (
                      <div style={styles.teacherFeedbackCert}>
                        <b>👨‍🏫 Evaluasi Guru:</b> <p>"{activePortfolio.teacherFeedback}"</p>
                      </div>
                    )}

                    {/* FOOTER & TTD GURU KONDISIONAL (POIN REVISI 1) */}
                    <div style={styles.certFooter}>
                      <div>
                        <p style={{fontSize: '11px', color: '#64748b'}}>Terverifikasi oleh Sistem PENA</p>
                        <div style={styles.digitalSeal}>VALIDASI DIGITAL</div>
                      </div>
                      
                      {/* Hanya tampilkan TTD Guru jika Mode Kelompok */}
                      {activePortfolio.mode.includes('Kelompok') && (
                        <div style={{textAlign: 'right'}}>
                          <p style={{fontSize: '11px', color: '#64748b'}}>Tanda Tangan Guru</p>
                          <p style={{marginTop: '30px', fontWeight: 'bold'}}>(_______________________)</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : <p>Belum ada data portofolio.</p>}
          </div>
        )}

        {/* ================= 7. DASHBOARD KONTROL GURU ================= */}
        {activeTab === 'guruDashboard' && userRole === 'guru' && isGuruAuthed && (
          <div style={styles.card} className="no-print">
            <h2>Panel Kontrol Administratif Guru</h2>
            <p style={{fontSize: '13px', color: '#475569'}}>Setiap perubahan ACC/Revisi di sini akan otomatis tersinkronisasi ke tab browser milik Siswa secara realtime.</p>
            
            {submissions.length === 0 ? <p style={{fontStyle:'italic'}}>Belum ada tugas siswa yang masuk.</p> : (
            <table style={styles.table}>
              <thead>
                <tr style={{backgroundColor: '#e2e8f0', textAlign: 'left'}}>
                  <th style={styles.th}>Siswa</th>
                  <th style={styles.th}>Modus</th>
                  <th style={styles.th}>Pelanggaran</th>
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
                      {sub.hasCopyPasted || sub.tabSwitches > 0 ? (
                        <span style={{color: '#dc2626', fontWeight: 'bold', fontSize: '11px'}}>⚠️ Ada Anomali</span>
                      ) : <span style={{color: '#16a34a', fontSize: '11px'}}>✅ Aman</span>}
                    </td>
                    <td style={styles.td}>
                      <span style={{fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold',
                        backgroundColor: sub.status.includes('ACC') ? '#dcfce7' : sub.status.includes('Revisi') ? '#fee2e2' : '#fef3c7',
                        color: sub.status.includes('ACC') ? '#15803d' : sub.status.includes('Revisi') ? '#b91c1c' : '#b45309'
                      }}>{sub.status}</span>
                    </td>
                    <td style={styles.td}>
                      <button style={styles.inspectBtn} onClick={() => setSelectedSubmission(sub)}>👁️ Periksa & Evaluasi</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        )}

        {/* MODAL PENINJAUAN GURU */}
        {selectedSubmission && (
          <div style={styles.modalOverlay} className="no-print">
            <div style={styles.largeModalCard}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3>📝 Peninjauan Nalar: {selectedSubmission.studentName}</h3>
                <button style={styles.closeBtn} onClick={() => setSelectedSubmission(null)}>✖ Close</button>
              </div>
              <hr />
              <div style={{fontSize: '13px', lineHeight: '1.6'}}>
                <p><b>Indikator Ennis:</b> {selectedSubmission.ennis} | <b>Tahapan Polya:</b> {selectedSubmission.polya}</p>
                
                <div style={styles.reviewContentBox}>
                  <b>Jawaban Dekonstruksi Nalar Siswa:</b>
                  <p style={{backgroundColor: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1'}}>"{selectedSubmission.deconstructionText}"</p>
                </div>
              </div>
              <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                <button style={styles.accBtnLarge} onClick={() => handleApproveByTeacher(selectedSubmission.id)}>✅ Setujui / ACC</button>
                <button style={styles.rejectBtnLarge} onClick={() => handleOpenRevisionModal(selectedSubmission.id)}>❌ Minta Revisi</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CATATAN REVISI */}
        {showRevisionModal && (
          <div style={styles.modalOverlay} className="no-print">
            <div style={styles.modalCard}>
              <h3>✏️ Catatan Revisi untuk {selectedSubmission?.studentName}</h3>
              <form onSubmit={handleSaveRevision}>
                <textarea rows="4" placeholder="Tuliskan saran perbaikan nalar..." value={teacherNoteInput} onChange={(e) => setTeacherNoteInput(e.target.value)} style={styles.textarea} required />
                <div style={{display: 'flex', gap: '10px'}}>
                  <button type="submit" style={styles.rejectBtnLarge}>Kirim Revisi 📩</button>
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

// STYLING CSS
const styles = {
  appContainer: { fontFamily: 'sans-serif', maxWidth: '850px', margin: '20px auto', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '10px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', color: 'white', padding: '15px', borderRadius: '8px' },
  logoText: { margin: 0, fontSize: '18px' },
  roleBadge: { fontSize: '12px', color: '#93c5fd' },
  switchRoleBtn: { backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  guruActiveBtn: { backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalCard: { backgroundColor: 'white', padding: '25px', borderRadius: '10px', maxWidth: '450px', width: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
  largeModalCard: { backgroundColor: 'white', padding: '25px', borderRadius: '10px', maxWidth: '650px', width: '90%', maxHeight: '85vh', overflowY: 'auto' },
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
  input: { width: '100%', padding: '8px', margin: '8px 0', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '8px', margin: '8px 0', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontFamily: 'inherit' },
  promptBox: { backgroundColor: '#fef3c7', padding: '8px 12px', borderRadius: '4px', fontSize: '12px', color: '#92400e', marginTop: '5px', borderLeft: '3px solid #f59e0b' },
  monitoringBar: { backgroundColor: '#eff6ff', padding: '8px 12px', borderRadius: '6px', margin: '10px 0', fontSize: '12px', display: 'flex', gap: '20px', border: '1px solid #bfdbfe' },
  modeBox: { backgroundColor: '#f1f5f9', padding: '8px', borderRadius: '6px', marginBottom: '15px', display: 'flex', gap: '10px' },
  modeActive: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', flex: 1 },
  modeInactive: { backgroundColor: '#e2e8f0', color: '#475569', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', flex: 1 },
  
  certBorder: { border: '6px double #1e3a8a', padding: '25px', backgroundColor: '#fafaf9' },
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
