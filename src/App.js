import React, { useState, useEffect } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";

// --- KONFIGURASI FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAITCwanrRvdAr9FSdrQr-otRujZhGQs00",
  authDomain: "pertanggungjawaban-nalar.firebaseapp.com",
  projectId: "pertanggungjawaban-nalar",
  storageBucket: "pertanggungjawaban-nalar.firebasestorage.app",
  messagingSenderId: "351310726213",
  appId: "1:351310726213:web:fbc826b633efc189bf8f2c",
  measurementId: "G-ZE20694VRP"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const GEMINI_MODEL = "gemini-3.8-flash";

// Pemanggilan AI Dinamis Menggunakan API Key Masing-masing Siswa + Fitur Auto-Retry
const callGeminiAPI = async (prompt, responseSchema, apiKey, retries = 5) => {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("API Key Gemini belum dimasukkan!");
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey.trim()}`;
  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  };

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if ((response.status === 429 || response.status === 503 || response.status >= 500) && attempt < retries - 1) {
        console.warn(`Server sibuk (${response.status}). Mencoba ulang otomatis... (${attempt + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, 4000));
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google AI Error (${response.status}): ${errText}`);
      }

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0) {
        return JSON.parse(result.candidates[0].content.parts[0].text);
      }
      throw new Error("Format respon AI tidak terbaca");
    } catch (err) {
      if (attempt === retries - 1) throw err;
    }
  }
};

export default function App() {
  const [peran, setPeran] = useState("identitas_siswa"); // "identitas_siswa", "siswa", "guru", "portofolio"
  const [namaSiswa, setNamaSiswa] = useState("");
  const [kelasSiswa, setKelasSiswa] = useState("");
  const [studentApiKey, setStudentApiKey] = useState("");
  const [isGuruAuthenticated, setIsGuruAuthenticated] = useState(false);

  const [teksArtikel, setTeksArtikel] = useState("");
  const [pertanyaanAI, setPertanyaanAI] = useState([]);
  const [jawabanSiswa, setJawabanSiswa] = useState({});
  const [pindahTabCount, setPindahTabCount] = useState(0);

  const [nilaiGuruInput, setNilaiGuruInput] = useState({});
  const [catatanGuruInput, setCatatanGuruInput] = useState({});
  
  const [statusApp, setStatusApp] = useState("idle"); 
  const [artikelList, setArtikelList] = useState([]);
  const [pesanError, setPesanError] = useState("");

  // Sync Data Realtime dari Firebase
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "artikel_siswa"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArtikelList(data);
    }, (error) => console.error("Firebase Error:", error));
    return () => unsub();
  }, []);

  // Anti-Cheat: Lacak Pindah Tab saat siswa menjawab
  useEffect(() => {
    if (peran === "siswa" && statusApp === "menjawab_pertanyaan") {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          setPindahTabCount(prev => {
            const nextVal = prev + 1;
            alert(`⚠️ DETEKSI PENGAWASAN: Kamu terdeteksi meninggalkan tab/keluar dari web! (Pelanggaran ke-${nextVal})`);
            return nextVal;
          });
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
  }, [peran, statusApp]);

  // Handler Identitas Siswa + Validasi Konek API Key
  const handleStartSiswa = (e) => {
    e.preventDefault();
    if (!namaSiswa.trim() || !kelasSiswa.trim()) {
      return alert("Nama dan Kelas wajib diisi!");
    }
    if (!studentApiKey.trim()) {
      return alert("Kamu wajib memasukkan Gemini API Key kamu sendiri!");
    }
    setPeran("siswa");
  };

  // Handler Access Dashboard Guru
  const handleAccessGuru = () => {
    if (isGuruAuthenticated) {
      setPeran("guru");
    } else {
      const pw = prompt("Masukkan PIN/Password Akses Guru:");
      if (pw === "gurukeren123") {
        setIsGuruAuthenticated(true);
        setPeran("guru");
      } else if (pw !== null) {
        alert("Password Guru Salah!");
      }
    }
  };

  // FASE 1: AI Meracik 10 Pertanyaan
  const generate10Pertanyaan = async () => {
    if (!teksArtikel.trim()) return alert("Naskah artikel tidak boleh kosong!");
    setStatusApp("loading_ai");
    setPesanError("");

    const prompt = `Bertindaklah sebagai penguji nalar kritis (Polya & Ennis). 
    Baca artikel siswa ini, lalu buat TEPAT 10 pertanyaan kritis yang meminta siswa mengklarifikasi premis, logika, dan argumen mereka.
    Format respons: HANYA array JSON berisi 10 string pertanyaan. 
    Naskah Artikel: "${teksArtikel}"`;

    const schema = { type: "ARRAY", items: { type: "STRING" } };

    try {
      const pertanyaan = await callGeminiAPI(prompt, schema, studentApiKey);
      setPertanyaanAI(pertanyaan);
      setStatusApp("menjawab_pertanyaan");
    } catch (err) {
      setPesanError("Koneksi API Gagal: " + err.message);
      setStatusApp("idle");
    }
  };

  // FASE 2: Validasi AI Lapis 1 & Penilaian AI
  const submitJawabanKeGuru = async () => {
    const qaList = pertanyaanAI.map((q, i) => ({
      pertanyaan: q,
      jawaban: jawabanSiswa[i] || ""
    }));

    if (qaList.some(item => !item.jawaban.trim())) {
      return alert("Semua 10 pertanyaan wajib dijawab sebelum dikirim!");
    }

    setStatusApp("memvalidasi_ai");
    setPesanError("");

    const promptVal = `Evaluasi apakah jawaban-jawaban siswa berikut logis, relevan dengan artikelnya, dan tidak ngasal/asal-asalan.
    Berikan nilai skor AI dari 0 sampai 100 berdasarkan kedalaman nalar logisnya, beserta ulasan ringkas.
    Jika ada jawaban yang ngasal/asal-asalan, set "lolos": false.
    Naskah Artikel: "${teksArtikel}"
    Tanya Jawab: ${JSON.stringify(qaList)}`;

    const schemaVal = {
      type: "OBJECT",
      properties: {
        lolos: { type: "BOOLEAN" },
        nilaiAI: { type: "NUMBER" },
        pesan: { type: "STRING" }
      }
    };

    try {
      const hasilVal = await callGeminiAPI(promptVal, schemaVal, studentApiKey);

      if (!hasilVal.lolos) {
        setPesanError(`❌ PENOLAKAN AI LAPIS 1: ${hasilVal.pesan}. Silakan revisi jawabanmu.`);
        setStatusApp("menjawab_pertanyaan");
        return;
      }

      await addDoc(collection(db, "artikel_siswa"), {
        namaSiswa,
        kelasSiswa,
        teksArtikel,
        pertanyaanAI,
        jawabanSiswa,
        pindahTabCount,
        nilaiAI: hasilVal.nilaiAI || 80,
        evaluasiAI: hasilVal.pesan || "Jawaban memenuhi kaidah logika kritis awal.",
        statusGuru: "Menunggu Review",
        nilaiGuru: null,
        catatanGuru: "",
        timestamp: serverTimestamp()
      });

      alert("🎉 Selamat! Artikel dan jawabanmu lolos Uji AI Lapis 1 dan telah dikirim ke Dashboard Guru.");
      setTeksArtikel("");
      setPertanyaanAI([]);
      setJawabanSiswa({});
      setPindahTabCount(0);
      setStatusApp("idle");
    } catch (err) {
      setPesanError("Gagal memvalidasi: " + err.message);
      setStatusApp("menjawab_pertanyaan");
    }
  };

  const approveArtikel = async (id) => {
    const nilai = nilaiGuruInput[id];
    const catatan = catatanGuruInput[id] || "Artikel disetujui tanpa catatan tambahan.";

    if (!nilai || isNaN(nilai) || nilai < 0 || nilai > 100) {
      return alert("Harap masukkan Nilai Guru yang valid (0 - 100) sebelum menyetujui!");
    }

    try {
      await updateDoc(doc(db, "artikel_siswa", id), {
        statusGuru: "Approved",
        nilaiGuru: Number(nilai),
        catatanGuru: catatan
      });
      alert("✅ Artikel berhasil disetujui dan diterbitkan ke E-Portofolio!");
    } catch (err) {
      alert("Gagal memperbarui status artikel.");
    }
  };

  const tolakArtikel = async (id) => {
    try {
      await updateDoc(doc(db, "artikel_siswa", id), { statusGuru: "Ditolak" });
    } catch (err) {
      alert("Gagal menolak artikel.");
    }
  };

  // Fungsi Cetak / Simpan ke PDF
  const handleCetakPDF = () => {
    window.print();
  };

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f4f6f8", minHeight: "100vh", color: "#333" }}>
      
      {/* CSS KHUSUS PRINT PDF (Sembunyikan Navigasi saat di-Cetak) */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background-color: #fff !important; }
          .card-portofolio { border: 2px solid #000 !important; background: #fff !important; page-break-inside: avoid; }
        }
      `}</style>

      {/* NAVBAR */}
      <div className="no-print" style={{ background: "#0f172a", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" }}>
        <strong style={{ fontSize: "1.2rem", letterSpacing: "0.5px" }}>🛡️ Canvas Pertanggungjawaban Nalar</strong>
        <div>
          <button onClick={() => setPeran("identitas_siswa")} style={{ padding: "6px 12px", marginRight: "5px", background: peran === "siswa" || peran === "identitas_siswa" ? "#2563eb" : "#334155", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>👤 Ruang Siswa</button>
          <button onClick={handleAccessGuru} style={{ padding: "6px 12px", marginRight: "5px", background: peran === "guru" ? "#059669" : "#334155", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>🔒 Dashboard Guru</button>
          <button onClick={() => setPeran("portofolio")} style={{ padding: "6px 12px", background: peran === "portofolio" ? "#d97706" : "#334155", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>📚 E-Portofolio</button>
        </div>
      </div>

      <div style={{ maxWidth: "880px", margin: "25px auto", padding: "20px" }}>

        {/* INPUT IDENTITAS & API KEY SISWA */}
        {peran === "identitas_siswa" && (
          <div className="no-print" style={{ background: "#fff", padding: "25px", borderRadius: "6px", border: "1px solid #ccc" }}>
            <h3>👤 Masuk Ruang Dekonstruksi Artikel</h3>
            <p style={{ color: "#666", fontSize: "0.9rem" }}>Isi data diri dan API Key Gemini milikmu untuk menghubungkan sistem AI secara mandiri.</p>
            <form onSubmit={handleStartSiswa}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Nama Lengkap Siswa:</label>
                <input 
                  type="text" 
                  style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid #ccc", borderRadius: "4px" }}
                  placeholder="Contoh: Budi Santoso"
                  value={namaSiswa}
                  onChange={(e) => setNamaSiswa(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Kelas / NIS:</label>
                <input 
                  type="text" 
                  style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid #ccc", borderRadius: "4px" }}
                  placeholder="Contoh: XII MIPA 1 / 1024"
                  value={kelasSiswa}
                  onChange={(e) => setKelasSiswa(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>🔑 Google Gemini API Key Kamu:</label>
                <input 
                  type="password" 
                  style={{ width: "100%", padding: "8px", boxSizing: "border-box", border: "1px solid #ccc", borderRadius: "4px", fontFamily: "monospace" }}
                  placeholder="Paste API Key Gemini kamu di sini..."
                  value={studentApiKey}
                  onChange={(e) => setStudentApiKey(e.target.value)}
                />
                <small style={{ color: "#666", display: "block", marginTop: "4px" }}>
                  *Dapatkan key gratis di <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>.
                </small>
              </div>
              <button type="submit" style={{ width: "100%", padding: "10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>
                Konek Sistem & Mulai Pengerjaan Artikel →
              </button>
            </form>
          </div>
        )}

        {/* WORKSPACE SISWA */}
        {peran === "siswa" && (
          <div className="no-print" style={{ background: "#fff", padding: "20px", borderRadius: "6px", border: "1px solid #ccc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: "10px", marginBottom: "15px" }}>
              <span>Siswa: <strong>{namaSiswa}</strong> ({kelasSiswa}) | <span style={{ color: "#059669", fontWeight: "bold" }}>🔑 API Connected</span></span>
              <button onClick={() => setPeran("identitas_siswa")} style={{ fontSize: "0.8rem", cursor: "pointer" }}>Ganti Identitas/Key</button>
            </div>

            {pesanError && (
              <div style={{ padding: "10px", background: "#f8d7da", color: "#721c24", borderRadius: "4px", marginBottom: "15px", border: "1px solid #f5c6cb" }}>
                {pesanError}
              </div>
            )}

            {statusApp === "idle" || statusApp === "loading_ai" ? (
              <>
                <h4>1. Unggah Naskah Artikel</h4>
                <textarea 
                  rows="9"
                  style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box", fontSize: "0.95rem" }}
                  placeholder="Tempelkan naskah artikel tulisanmu di sini..."
                  value={teksArtikel}
                  onChange={(e) => setTeksArtikel(e.target.value)}
                  disabled={statusApp === "loading_ai"}
                />
                <button 
                  onClick={generate10Pertanyaan}
                  disabled={statusApp === "loading_ai"}
                  style={{ width: "100%", marginTop: "12px", padding: "12px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
                >
                  {statusApp === "loading_ai" ? "⌛ AI sedang membedah naskah artikel & meracik 10 soal..." : "✨ Minta 10 Pertanyaan Dekonstruksi AI"}
                </button>
              </>
            ) : (
              <>
                <div style={{ background: "#fffbe6", padding: "10px", borderRadius: "4px", border: "1px solid #ffe58f", marginBottom: "15px", fontSize: "0.85rem" }}>
                  ⚠️ <strong>Sistem Pengawasan Aktif:</strong> Fitur Copy-Paste dinonaktifkan. Jangan meminimize atau berpindah tab browser (Pelanggaran Tab Tercatat: <strong>{pindahTabCount}</strong>).
                </div>

                <h4>2. Dekonstruksi Nalar (Jawab 10 Pertanyaan AI)</h4>
                
                <div style={{ maxHeight: "450px", overflowY: "auto", border: "1px solid #eee", padding: "10px", borderRadius: "4px", marginBottom: "15px" }}>
                  {pertanyaanAI.map((q, idx) => (
                    <div key={idx} style={{ marginBottom: "15px", borderBottom: "1px solid #f0f0f0", paddingBottom: "10px" }}>
                      <p style={{ fontWeight: "bold", margin: "0 0 6px 0", fontSize: "0.9rem" }}>Q{idx + 1}: {q}</p>
                      <textarea 
                        rows="2"
                        style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box", fontSize: "0.9rem" }}
                        placeholder="Ketik penjelasan argumen logismu..."
                        value={jawabanSiswa[idx] || ""}
                        onChange={(e) => setJawabanSiswa({...jawabanSiswa, [idx]: e.target.value})}
                        onPaste={(e) => {
                          e.preventDefault();
                          alert("⚠️ Demi menguji pemikiran kritis murni, fitur Copy-Paste dinonaktifkan.");
                        }}
                      />
                    </div>
                  ))}
                </div>

                <button 
                  onClick={submitJawabanKeGuru}
                  disabled={statusApp === "memvalidasi_ai"}
                  style={{ width: "100%", padding: "12px", background: "#15803d", color: "#fff", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
                >
                  {statusApp === "memvalidasi_ai" ? "🔍 AI Sedang Memeriksa Kelogisan Jawaban & Menilai..." : "🚀 Kirim ke Dashboard Guru (Filter AI Lapis 1)"}
                </button>
              </>
            )}
          </div>
        )}

        {/* DASHBOARD GURU */}
        {peran === "guru" && (
          <div className="no-print" style={{ background: "#fff", padding: "20px", borderRadius: "6px", border: "1px solid #ccc" }}>
            <h3>👨‍🏫 Dashboard Review Guru (Lapis 2)</h3>
            <p style={{ color: "#666", fontSize: "0.85rem" }}>Tinjau artikel siswa, hasil evaluasi AI Lapis 1, beri Nilai Guru & Catatan Refleksi sebelum diterbitkan.</p>
            
            {artikelList.filter(k => k.statusGuru === "Menunggu Review").length === 0 ? (
              <p style={{ textAlign: "center", color: "#888", margin: "30px 0" }}>Belum ada kiriman artikel siswa yang perlu ditinjau.</p>
            ) : (
              artikelList.filter(k => k.statusGuru === "Menunggu Review").map((art) => (
                <div key={art.id} style={{ border: "1px solid #ddd", padding: "15px", borderRadius: "6px", marginBottom: "15px", background: "#fafafa" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>
                    <strong>{art.namaSiswa} ({art.kelasSiswa})</strong>
                    <span style={{ fontSize: "0.8rem", background: art.pindahTabCount > 2 ? "#ffccc7" : "#e6f7ff", padding: "2px 8px", borderRadius: "4px" }}>
                      Pelanggaran Tab: {art.pindahTabCount}x
                    </span>
                  </div>

                  <p style={{ fontSize: "0.9rem", margin: "10px 0" }}><strong>Naskah Artikel:</strong> "{art.teksArtikel.substring(0, 200)}..."</p>

                  <div style={{ background: "#f0fdf4", padding: "10px", borderRadius: "4px", border: "1px solid #bbf7d0", marginBottom: "10px", fontSize: "0.85rem" }}>
                    <strong>📊 Hasil Evaluasi AI Lapis 1:</strong> Skor AI: <strong>{art.nilaiAI}/100</strong><br/>
                    <em>"{art.evaluasiAI}"</em>
                  </div>

                  <details style={{ background: "#fff", padding: "8px", border: "1px solid #eee", borderRadius: "4px", marginBottom: "12px" }}>
                    <summary style={{ cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}>Lihat Detail 10 Tanya Jawab Dekonstruksi Nalar</summary>
                    <div style={{ marginTop: "10px", maxHeight: "200px", overflowY: "auto" }}>
                      {art.pertanyaanAI?.map((q, i) => (
                        <div key={i} style={{ marginBottom: "8px", fontSize: "0.85rem" }}>
                          <div style={{ color: "#1d4ed8" }}>Q{i+1}: {q}</div>
                          <div style={{ color: "#15803d" }}>A{i+1}: {art.jawabanSiswa?.[i] || "-"}</div>
                        </div>
                      ))}
                    </div>
                  </details>

                  {/* FORM PENILAIAN GURU */}
                  <div style={{ background: "#fff", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "4px", marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "4px" }}>Nilai Guru (0 - 100):</label>
                    <input 
                      type="number" 
                      style={{ width: "100px", padding: "6px", marginBottom: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                      placeholder="Contoh: 88"
                      value={nilaiGuruInput[art.id] || ""}
                      onChange={(e) => setNilaiGuruInput({...nilaiGuruInput, [art.id]: e.target.value})}
                    />

                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "4px" }}>Catatan & Refleksi Guru:</label>
                    <input 
                      type="text" 
                      style={{ width: "100%", padding: "6px", boxSizing: "border-box", border: "1px solid #ccc", borderRadius: "4px" }}
                      placeholder="Tuliskan apresiasi atau masukan guru..."
                      value={catatanGuruInput[art.id] || ""}
                      onChange={(e) => setCatatanGuruInput({...catatanGuruInput, [art.id]: e.target.value})}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => approveArtikel(art.id)} style={{ flex: 1, padding: "8px", background: "#15803d", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>✅ Approve & Terbitkan dengan Nilai</button>
                    <button onClick={() => tolakArtikel(art.id)} style={{ padding: "8px 15px", background: "#b91c1c", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>❌ Tolak</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* E-PORTOFOLIO PUBLIK */}
        {peran === "portofolio" && (
          <div style={{ background: "#fff", padding: "20px", borderRadius: "6px", border: "1px solid #ccc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #e2e8f0", paddingBottom: "12px", marginBottom: "20px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0" }}>📚 E-Portofolio Pertanggungjawaban Artikel Publik</h3>
                <p style={{ color: "#666", fontSize: "0.85rem", margin: 0 }}>Galeri kurasi artikel terverifikasi lengkap dengan validasi AI & Guru.</p>
              </div>
              <button 
                className="no-print"
                onClick={handleCetakPDF}
                style={{ padding: "8px 16px", background: "#0284c7", color: "#fff", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
              >
                🖨️ Cetak / Simpan Ke PDF
              </button>
            </div>

            {artikelList.filter(k => k.statusGuru === "Approved").length === 0 ? (
              <p style={{ textAlign: "center", color: "#888", margin: "30px 0" }}>Belum ada artikel terverifikasi yang diterbitkan.</p>
            ) : (
              artikelList.filter(k => k.statusGuru === "Approved").map((art) => (
                <div key={art.id} className="card-portofolio" style={{ border: "2px solid #f59e0b", background: "#fffbeb", padding: "18px", borderRadius: "8px", marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #fef08a", paddingBottom: "8px" }}>
                    <div>
                      <h4 style={{ margin: "0 0 4px 0", color: "#b45309", fontSize: "1.1rem" }}>{art.namaSiswa} ({art.kelasSiswa})</h4>
                      <small style={{ color: "#92400e" }}>✓ Terverifikasi Lulus Uji Nalar Polya & Ennis</small>
                    </div>
                    {/* SKOR DUAL VALIDASI */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{ background: "#dcfce7", color: "#166534", padding: "4px 8px", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold", border: "1px solid #86efac" }}>
                        Skor AI: {art.nilaiAI}/100
                      </span>
                      <span style={{ background: "#dbeafe", color: "#1e40af", padding: "4px 8px", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold", border: "1px solid #93c5fd" }}>
                        Nilai Guru: {art.nilaiGuru}/100
                      </span>
                    </div>
                  </div>

                  <p style={{ fontStyle: "italic", fontSize: "0.95rem", color: "#374151", margin: "12px 0", lineHeight: "1.5" }}>"{art.teksArtikel}"</p>

                  <div style={{ background: "#fff", padding: "10px", borderRadius: "4px", border: "1px solid #fde68a", fontSize: "0.85rem", marginBottom: "10px" }}>
                    <strong>👨‍🏫 Catatan Refleksi Guru:</strong> "{art.catatanGuru}"
                  </div>

                  <details style={{ background: "#fff", padding: "8px", border: "1px solid #fde68a", borderRadius: "4px" }}>
                    <summary style={{ cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", color: "#b45309" }}>📄 Rekam Data 10 Dekonstruksi Nalar Artikel</summary>
                    <div style={{ marginTop: "10px", maxHeight: "250px", overflowY: "auto" }}>
                      {art.pertanyaanAI?.map((q, i) => (
                        <div key={i} style={{ marginBottom: "8px", fontSize: "0.85rem", borderBottom: "1px solid #fef3c7", paddingBottom: "4px" }}>
                          <div style={{ color: "#1d4ed8" }}>Q{i+1}: {q}</div>
                          <div style={{ color: "#15803d" }}>A{i+1}: {art.jawabanSiswa?.[i] || "-"}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}