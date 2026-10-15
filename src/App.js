import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, query, where, getDocs } from 'firebase/firestore';

// ==========================================
// 1. FIREBASE SETUP (PASTE CONFIG LU DI SINI)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyAITcwanrRvdAr9FSdrQr-otRujZhGQs00",
  authDomain: "pertanggungjawaban-nalar.firebaseapp.com",
  projectId: "pertanggungjawaban-nalar",
  storageBucket: "pertanggungjawaban-nalar.firebasestorage.app",
  messagingSenderId: "1351310726213",
  appId: "1:351310726213:web:fbc826b633efc189bf8f2c"
};

let app, db;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase belum di-config dengan benar:", error);
}

// ==========================================
// 2. SESSION HELPER (Biar Tahan Refresh)
// ==========================================
const session = {
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  get: (key, fallback) => {
    try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : fallback; } 
    catch (e) { return fallback; }
  },
  clear: () => ['PENA_ROLE', 'PENA_TAB', 'PENA_CLASS', 'PENA_STUDENT', 'PENA_AI_KEY'].forEach(k => localStorage.removeItem(k))
};

// ==========================================
// 3. MAIN APP CONTAINER
// ==========================================
export default function App() {
  // Ambil state dari memori (kalau di-refresh tetep inget)
  const [userRole, setUserRole] = useState(() => session.get('PENA_ROLE', null));
  const [activeTab, setActiveTab] = useState(() => session.get('PENA_TAB', 'landing'));
  const [currentClass, setCurrentClass] = useState(() => session.get('PENA_CLASS', null));
  const [currentStudent, setCurrentStudent] = useState(() => session.get('PENA_STUDENT', null));
  const [apiKey, setApiKey] = useState(() => session.get('PENA_AI_KEY', ''));

  // Auto-save tiap kali ada state yang berubah
  useEffect(() => {
    session.set('PENA_ROLE', userRole);
    session.set('PENA_TAB', activeTab);
    session.set('PENA_CLASS', currentClass);
    session.set('PENA_STUDENT', currentStudent);
    session.set('PENA_AI_KEY', apiKey);
  }, [userRole, activeTab, currentClass, currentStudent, apiKey]);

  const handleLogout = () => {
    session.clear();
    setUserRole(null); setActiveTab('landing');
    setCurrentClass(null); setCurrentStudent(null);
  };

  // Warning UI kalau Firebase belum diisi
  if (!db) return <div style={{padding: 20, textAlign:'center'}}><h2>Menunggu Konfigurasi Firebase...</h2><p>Pastikan firebaseConfig di App.js sudah diisi.</p></div>;

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

      {!userRole && <LandingPage setActiveTab={setActiveTab} />}
      {!userRole && activeTab === 'loginSiswa' && (
        <LoginSiswa db={db} setCurrentClass={setCurrentClass} setCurrentStudent={setCurrentStudent} setUserRole={setUserRole} setActiveTab={setActiveTab} />
      )}
      {!userRole && activeTab === 'loginGuru' && (
        <LoginGuru db={db} setCurrentClass={setCurrentClass} setUserRole={setUserRole} setActiveTab={setActiveTab} />
      )}
      {!userRole && activeTab === 'loginMandiri' && (
        <LoginMandiri setCurrentStudent={setCurrentStudent} setUserRole={setUserRole} setActiveTab={setActiveTab} />
      )}

      {userRole && (
        <>
          <NavigationBar userRole={userRole} activeTab={activeTab} setActiveTab={setActiveTab} currentClass={currentClass} />
          
          <main style={styles.main}>
            {(userRole === 'siswa' || userRole === 'mandiri') && (
              <>
                {activeTab === 'introSiswa' && <IntroSiswa setActiveTab={setActiveTab} name={currentStudent?.name} />}
                {activeTab === 'apiKey' && <ApiKeySetup apiKey={apiKey} setApiKey={setApiKey} setActiveTab={setActiveTab} />}
                {activeTab === 'workspace' && (
                  <KanvasWorkspace db={db} apiKey={apiKey} currentStudent={currentStudent} currentClass={currentClass} userRole={userRole} setActiveTab={setActiveTab} />
                )}
                {activeTab === 'portfolio' && <Portofolio db={db} currentStudent={currentStudent} currentClass={currentClass} />}
              </>
            )}

            {userRole === 'guru' && currentClass && (
              <>
                {activeTab === 'guruDashboard' && <GuruDashboard db={db} currentClass={currentClass} />}
                {activeTab === 'guruSiswa' && <GuruSiswa db={db} currentClass={currentClass} />}
              </>
            )}
          </main>
        </>
      )}
    </div>
  );
}

// ==========================================
// 4. SUB-COMPONENTS & LOGIKA FIREBASE
// ==========================================

function LandingPage({ setActiveTab }) {
  return (
    <div style={styles.card} className="no-print">
      <h1 style={styles.title}>PENA</h1>
      <p style={styles.subtitle}>Platform Pertanggungjawaban Nalar & Evaluasi Kritis</p>
      <div style={styles.gridMenu}>
        <div style={styles.menuBox} onClick={() => setActiveTab('loginSiswa')}>
          <h3>Siswa</h3><p>Masuk menggunakan kode kelas & PIN.</p>
        </div>
        <div style={styles.menuBox} onClick={() => setActiveTab('loginMandiri')}>
          <h3>Mandiri</h3><p>Simulasi latihan personal (Isolasi).</p>
        </div>
        <div style={styles.menuBox} onClick={() => setActiveTab('loginGuru')}>
          <h3>Guru</h3><p>Kelola kelas & evaluasi.</p>
        </div>
      </div>
    </div>
  );
}

function LoginSiswa({ db, setCurrentClass, setCurrentStudent, setUserRole, setActiveTab }) {
  const [step, setStep] = useState(1);
  const [classCode, setClassCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentPin, setStudentPin] = useState('');
  const [resolvedClass, setResolvedClass] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Verifikasi Kode Kelas ke Firestore
  const handleVerifyClass = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const q = query(collection(db, "pena_classes"), where("pin", "==", classCode.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const cls = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setResolvedClass(cls); setCurrentClass(cls); setStep(2);
      } else { alert('❌ Kode Akses Kelas tidak ditemukan.'); }
    } catch (err) { alert('Gagal memuat kelas. Cek koneksi.'); }
    setIsLoading(false);
  };

  // Login Siswa dengan Toleransi Typo (Trim + Lowercase)
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const q = query(collection(db, "pena_students"), where("classId", "==", resolvedClass.id));
      const snap = await getDocs(q);
      
      const inputNameNorm = studentName.trim().toLowerCase();
      let foundStudent = null;

      snap.forEach(doc => {
        const data = doc.data();
        if (data.name.trim().toLowerCase() === inputNameNorm && data.pin === studentPin.trim()) {
          foundStudent = { id: doc.id, ...data };
        }
      });

      if (foundStudent) {
        setCurrentStudent(foundStudent); setUserRole('siswa'); setActiveTab('introSiswa');
      } else { alert('❌ Nama atau PIN Siswa salah. Pastikan ejaan sesuai.'); }
    } catch (err) { alert('Gagal masuk kelas.'); }
    setIsLoading(false);
  };

  return (
    <div style={styles.card} className="no-print">
      <button style={styles.backBtn} onClick={() => setActiveTab('landing')}>← Kembali</button>
      <h2>Akses Ruang Kelas</h2>
      {step === 1 ? (
        <form onSubmit={handleVerifyClass} style={styles.form}>
          <label>Masukkan Kode Kelas dari Guru:</label>
          <input type="password" value={classCode} onChange={e => setClassCode(e.target.value)} style={styles.input} required />
          <button type="submit" style={styles.btnPrimary} disabled={isLoading}>{isLoading ? 'Mencari...' : 'Verifikasi Kelas'}</button>
        </form>
      ) : (
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={{background: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '13px', marginBottom: '10px'}}>
            📚 Kelas: <b>{resolvedClass.subject}</b> ({resolvedClass.teacher})
          </div>
          <label>Nama Lengkap (Manual):</label>
          <input type="text" placeholder="Masukkan nama..." value={studentName} onChange={e => setStudentName(e.target.value)} style={styles.input} required />
          <label>PIN Siswa (4 Digit):</label>
          <input type="password" placeholder="Masukkan PIN..." value={studentPin} onChange={e => setStudentPin(e.target.value)} style={styles.input} required />
          <div style={styles.modalActions}>
            <button type="submit" style={styles.btnPrimary} disabled={isLoading}>{isLoading ? 'Masuk...' : 'Masuk Kelas'}</button>
            <button type="button" style={styles.textBtn} onClick={() => setStep(1)}>Ganti Kelas</button>
          </div>
        </form>
      )}
    </div>
  );
}

function LoginGuru({ db, setCurrentClass, setUserRole, setActiveTab }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const tName = e.target.tName.value.trim();
    const sName = e.target.sName.value.trim();
    const pin = e.target.pin.value.trim();

    try {
      const q = query(collection(db, "pena_classes"), where("teacher", "==", tName), where("subject", "==", sName));
      const snap = await getDocs(q);
      
      let targetClass;
      if (!snap.empty) {
        targetClass = { id: snap.docs[0].id, ...snap.docs[0].data() };
        if (targetClass.pin !== pin) { alert('❌ Sandi (PIN) kelas salah!'); setIsLoading(false); return; }
      } else {
        // Buat kelas baru di Firestore
        const docRef = await addDoc(collection(db, "pena_classes"), { teacher: tName, subject: sName, pin: pin });
        targetClass = { id: docRef.id, teacher: tName, subject: sName, pin: pin };
      }
      
      setCurrentClass(targetClass); setUserRole('guru'); setActiveTab('guruDashboard');
    } catch (err) { alert('Gagal menghubungkan ke server.'); }
    setIsLoading(false);
  };

  return (
    <div style={styles.card} className="no-print">
      <button style={styles.backBtn} onClick={() => setActiveTab('landing')}>← Kembali</button>
      <h2>Otorisasi Guru</h2>
      <form onSubmit={handleLogin} style={styles.form}>
        <input name="tName" type="text" placeholder="Nama Guru (Cth: Bu Novi)" style={styles.input} required />
        <input name="sName" type="text" placeholder="Mata Pelajaran (Cth: Fisika)" style={styles.input} required />
        <input name="pin" type="password" placeholder="PIN Unik Kelas (Cth: 2900)" style={styles.input} required />
        <button type="submit" style={styles.btnPrimary} disabled={isLoading}>{isLoading ? 'Memproses...' : 'Akses Ruang'}</button>
      </form>
    </div>
  );
}

function LoginMandiri({ setCurrentStudent, setUserRole, setActiveTab }) {
  return (
    <div style={styles.card} className="no-print">
      <button style={styles.backBtn} onClick={() => setActiveTab('landing')}>← Kembali</button>
      <h2>Mode Mandiri</h2>
      <form onSubmit={(e) => {
        e.preventDefault();
        setCurrentStudent({ id: 'mandiri-' + Date.now(), name: e.target.name.value.trim(), classId: 'mandiri' });
        setUserRole('mandiri'); setActiveTab('introSiswa');
      }} style={styles.form}>
        <input name="name" type="text" placeholder="Masukkan nama..." style={styles.input} required />
        <button type="submit" style={styles.btnPrimary}>Mulai</button>
      </form>
    </div>
  );
}

function NavigationBar({ userRole, activeTab, setActiveTab, currentClass }) {
  return (
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
  );
}

function IntroSiswa({ setActiveTab, name }) {
  return (
    <div style={styles.card} className="no-print">
      <h2>Halo, {name}.</h2>
      <p style={{color: '#555'}}>Pastikan naskah dan argumen dikerjakan secara otentik. Sistem memantau perpindahan tab dan integritas teks.</p>
      <button style={styles.btnPrimary} onClick={() => setActiveTab('apiKey')}>Lanjut ke Setup AI →</button>
    </div>
  );
}

function ApiKeySetup({ apiKey, setApiKey, setActiveTab }) {
  const [isValid, setIsValid] = useState(apiKey.length > 10);
  const handleConnect = (e) => {
    e.preventDefault();
    if (apiKey.trim().length < 15) { alert('API Key terlalu pendek.'); return; }
    setIsValid(true); setActiveTab('workspace');
  };
  return (
    <div style={styles.card} className="no-print">
      <h2>Otentikasi Kunci AI</h2>
      <form onSubmit={handleConnect} style={styles.form}>
        <input type="password" placeholder="Masukkan API Key Gemini AI Studio..." value={apiKey} onChange={e => setApiKey(e.target.value)} style={styles.input} required />
        <button type="submit" style={styles.btnPrimary}>Hubungkan</button>
      </form>
      {isValid && <p style={{color: '#059669', fontSize: '13px', marginTop: '10px'}}>✅ Terhubung.</p>}
    </div>
  );
}

function KanvasWorkspace({ db, apiKey, currentStudent, currentClass, userRole, setActiveTab }) {
  const [isPasted, setIsPasted] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false); // Blokir UI kalau udah pernah kumpul
  const [formData, setFormData] = useState({ naskahText: '', ennis: 'Penjelasan Sederhana', polya: 'Memahami Masalah', deconstructionText: '' });

  useEffect(() => {
    const handleVisibility = () => { if (document.hidden) setTabSwitchCount(p => p + 1); };
    document.addEventListener('visibilitychange', handleVisibility);
    
    // Cek apakah siswa udah pernah submit sebelumnya
    const checkSubmission = async () => {
      const q = query(collection(db, "pena_submissions"), where("studentId", "==", currentStudent.id));
      const snap = await getDocs(q);
      if (!snap.empty && snap.docs[0].data().status !== 'Minta Revisi') { setHasSubmitted(true); }
    };
    checkSubmission();

    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [db, currentStudent.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!apiKey) { alert('API Key kosong! Setup di tab AI Key.'); return; }
    setIsSubmitting(true);

    let diagnosis = "";
    if (isPasted || tabSwitchCount > 0) {
      diagnosis = `[GAGAL INTEGRITAS] Anomali terdeteksi (Tab-switch: ${tabSwitchCount}x, Paste: ${isPasted ? 'Ya' : 'Tidak'}).`;
    } else {
      try {
        const prompt = `Sebagai evaluator pendidikan kritis, evaluasi argumen siswa ini.\nNaskah asli: "${formData.naskahText}"\nArgumen Siswa: "${formData.deconstructionText}"\nFokus penilaian: ${formData.ennis} dan ${formData.polya}. Berikan respons evaluatif maksimal 40 kata apakah argumennya valid.`;
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        const aiResponse = data.candidates[0].content.parts[0].text;
        diagnosis = formData.deconstructionText.split(/\s+/).length < 25 ? `[TIDAK LOLOS] Argumen terlalu dangkal. Catatan AI: ${aiResponse}` : `[LOLOS AI] ${aiResponse}`;
      } catch (error) { diagnosis = `[ERROR AI] Gagal memproses: ${error.message}`; }
    }

    try {
      await addDoc(collection(db, "pena_submissions"), {
        classId: userRole === 'mandiri' ? 'mandiri' : currentClass.id,
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        certNumber: `PENA-26-${Math.floor(1000 + Math.random() * 9000)}`,
        mode: userRole === 'mandiri' ? 'Mandiri' : 'Tugas Kelas',
        ...formData, diagnosis, tabSwitches: tabSwitchCount, hasCopyPasted: isPasted,
        timestamp: new Date().toLocaleString(),
        status: userRole === 'mandiri' ? 'Disetujui Otomatis' : 'Pending Review Guru',
        teacherFeedback: ''
      });
      setIsPasted(false); setTabSwitchCount(0); setIsSubmitting(false); setActiveTab('portfolio');
    } catch (e) { alert('Gagal mengirim tugas.'); setIsSubmitting(false); }
  };

  if (hasSubmitted) return <div style={styles.card}><h3>Tugas Telah Dikirim</h3><p>Periksa tab Portofolio.</p></div>;

  return (
    <div style={styles.card} className="no-print">
      <h2>Kanvas Nalar</h2>
      <div style={styles.monitor}>
        <span>Pindah Tab: <b>{tabSwitchCount}x</b></span>
        <span>Copy-Paste: <b>{isPasted ? 'Terdeteksi' : 'Aman'}</b></span>
      </div>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label>1. Kutipan Naskah:</label>
        <textarea rows="3" value={formData.naskahText} onChange={e => setFormData({...formData, naskahText: e.target.value})} style={styles.textarea} required />
        <div style={{display: 'flex', gap: '10px'}}>
          <div style={{flex: 1}}>
            <label>2. Kerangka Ennis:</label>
            <select value={formData.ennis} onChange={e => setFormData({...formData, ennis: e.target.value})} style={styles.input}>
              <option>Penjelasan Sederhana</option><option>Keterampilan Dasar</option><option>Menyimpulkan</option>
            </select>
          </div>
          <div style={{flex: 1}}>
            <label>3. Tahap Polya:</label>
            <select value={formData.polya} onChange={e => setFormData({...formData, polya: e.target.value})} style={styles.input}>
              <option>Memahami Masalah</option><option>Merencanakan Penyelesaian</option><option>Memeriksa Kembali</option>
            </select>
          </div>
        </div>
        <label>4. Uraian Kritis:</label>
        <textarea rows="5" value={formData.deconstructionText} onChange={e => setFormData({...formData, deconstructionText: e.target.value})} onPaste={() => setIsPasted(true)} style={styles.textarea} required />
        <button type="submit" style={styles.btnPrimary} disabled={isSubmitting}>{isSubmitting ? 'Memproses AI & Cloud...' : 'Kirim Tugas'}</button>
      </form>
    </div>
  );
}

function Portofolio({ db, currentStudent, currentClass }) {
  const [portfolio, setPortfolio] = useState(null);

  // Firestore Realtime Listener untuk update status dari guru
  useEffect(() => {
    if (!currentStudent?.id) return;
    const q = query(collection(db, "pena_submissions"), where("studentId", "==", currentStudent.id));
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        // Ambil data terbaru (asumsi 1 siswa 1 tugas aktif)
        const docs = snap.docs.map(doc => doc.data());
        // Sortir descending berdasarkan timestamp (simulasi simpel)
        setPortfolio(docs[docs.length - 1]);
      }
    });
    return () => unsubscribe();
  }, [db, currentStudent?.id]);

  if (!portfolio) return <div><p>Belum ada tugas atau sedang memuat data awan...</p></div>;

  return (
    <div>
      <div className="no-print" style={{marginBottom:'10px'}}><button style={styles.btnSecondary} onClick={() => window.print()}>Cetak PDF</button></div>
      <div id="certPrintArea" style={styles.certBox}>
        <h3>SERTIFIKAT UJI NALAR</h3>
        <p style={{fontSize: '11px', color: '#666'}}>ID: {portfolio.certNumber}</p>
        <hr style={{borderTop: '1px solid #ddd'}}/>
        <p><b>Nama:</b> {portfolio.studentName} | <b>Status:</b> {portfolio.status}</p>
        <p><b>Naskah:</b> "{portfolio.naskahText}"</p>
        <p><b>Dekonstruksi:</b> "{portfolio.deconstructionText}"</p>
        <p><b>Diagnosis AI:</b> {portfolio.diagnosis}</p>
        {portfolio.teacherFeedback && <p><b>Catatan Guru:</b> {portfolio.teacherFeedback}</p>}
      </div>
    </div>
  );
}

function GuruDashboard({ db, currentClass }) {
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');

  // Firestore Realtime Listener
  useEffect(() => {
    if (!currentClass?.id) return;
    const q = query(collection(db, "pena_submissions"), where("classId", "==", currentClass.id));
    const unsubscribe = onSnapshot(q, (snap) => {
      setSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [db, currentClass?.id]);

  const handleAction = async (id, status) => {
    const docRef = doc(db, "pena_submissions", id);
    await updateDoc(docRef, { status, teacherFeedback: note });
    setSelected(null); setNote('');
  };

  return (
    <div style={styles.card} className="no-print">
      <h2>Evaluasi Kelas ({currentClass?.subject})</h2>
      {submissions.length === 0 ? <p>Belum ada tugas masuk.</p> : (
        <table style={styles.table}>
          <thead><tr><th>Siswa</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            {submissions.map(sub => (
              <tr key={sub.id}>
                <td>{sub.studentName}</td><td>{sub.status}</td>
                <td><button style={styles.btnTable} onClick={() => setSelected(sub)}>Periksa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCardLarge}>
            <h3>Laporan: {selected.studentName}</h3>
            <div style={{fontSize: '13px', background: '#f9f9f9', padding: '10px'}}>
              <p><b>Siswa:</b> {selected.studentName} (Tab Pindah: {selected.tabSwitches}x)</p>
              <p><b>Dekonstruksi:</b> "{selected.deconstructionText}"</p>
              <p><b>Diagnosis AI:</b> <span style={{color: '#b91c1c'}}>{selected.diagnosis}</span></p>
            </div>
            <textarea rows="2" placeholder="Catatan guru..." value={note} onChange={e => setNote(e.target.value)} style={{...styles.textarea, marginTop:'10px'}} />
            <div style={styles.modalActions}>
              <button style={styles.btnPrimary} onClick={() => handleAction(selected.id, 'Disetujui Guru (ACC)')}>ACC</button>
              <button style={styles.btnDanger} onClick={() => handleAction(selected.id, 'Minta Revisi')}>Revisi</button>
              <button style={styles.textBtn} onClick={() => setSelected(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GuruSiswa({ db, currentClass }) {
  const [students, setStudents] = useState([]);

  // Firestore Realtime Listener
  useEffect(() => {
    if (!currentClass?.id) return;
    const q = query(collection(db, "pena_students"), where("classId", "==", currentClass.id));
    const unsubscribe = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [db, currentClass?.id]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = e.target.sName.value.trim();
    if(name) {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      await addDoc(collection(db, "pena_students"), { classId: currentClass.id, name, pin });
      e.target.sName.value = '';
    }
  };

  return (
    <div style={styles.card} className="no-print">
      <h2>Kelola Siswa</h2>
      <p style={{fontSize: '12px', color: '#666'}}>Berikan PIN ini ke siswa secara privat.</p>
      <form onSubmit={handleAdd} style={{display: 'flex', gap: '8px', marginBottom: '15px'}}>
        <input name="sName" type="text" placeholder="Nama Lengkap..." style={{...styles.input, margin: 0, flex: 1}} required />
        <button type="submit" style={{...styles.btnPrimary, width: 'auto', margin: 0}}>Tambah</button>
      </form>
      <ul style={{fontSize: '13px'}}>
        {students.map(s => <li key={s.id}><b>{s.name}</b> - PIN: <span style={{color: '#dc2626', fontWeight: 'bold'}}>{s.pin}</span></li>)}
      </ul>
    </div>
  );
}

// ==========================================
// 5. STYLE CONFIGURATION
// ==========================================
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
  modalCardLarge: { background: '#fff', padding: '25px', borderRadius: '8px', width: '480px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #ddd' },
  modalActions: { display: 'flex', gap: '10px', marginTop: '15px', alignItems: 'center' },
  monitor: { background: '#f9f9f9', border: '1px solid #eee', padding: '8px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderRadius: '4px' },
  certBox: { border: '1px solid #ccc', padding: '20px', background: '#fff', borderRadius: '4px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginTop: '10px' },
  main: { marginTop: '10px' }
};
