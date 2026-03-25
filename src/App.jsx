import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Moon, Sun, Utensils, Edit2, Shield, X, Save, 
  Home, Clock, User, Plus, ChevronRight, PieChart, Trash2,
  Calculator, Users, ArrowUpDown, LogOut, Lock, Scan
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, signOut 
} from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc, addDoc } from 'firebase/firestore';

// ============================================================================
// 1. FIREBASE SETUP
// TRAGE HIER DEINE ECHTEN FIREBASE DATEN EIN FÜR DEINE LOKALE TESTUMGEBUNG:
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDYJNiJtKccTPlnyykZwWMrOgza0qjW4ZY",
  authDomain: "pointtracker-aa3ef.firebaseapp.com",
  projectId: "pointtracker-aa3ef",
  storageBucket: "pointtracker-aa3ef.firebasestorage.app",
  messagingSenderId: "412618494533",
  appId: "1:412618494533:web:cad5143f3c16b761c7c92c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "pointtracker-app";
// ============================================================================

// --- 2. HELPER FUNKTIONEN ---
const getLogicalDayInfo = (dateString = null) => {
  const d = dateString ? new Date(dateString) : new Date();
  if (d.getHours() < 3) d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateKey = `${year}-${month}-${day}`;
  const startOfDay = new Date(year, d.getMonth(), d.getDate(), 3, 0, 0, 0);
  return { dateKey, startOfDay };
};

const formatDate = (dateString) => {
  const options = { weekday: 'long', day: '2-digit', month: 'long' };
  return new Date(dateString).toLocaleDateString('de-DE', options);
};

// Wandelt Benutzernamen in Fake-Email um
const usernameToFakeEmail = (uname) => {
  const lower = uname.trim().toLowerCase();
  let hex = '';
  for(let i=0; i<lower.length; i++) {
    hex += lower.charCodeAt(i).toString(16);
  }
  return `${hex}@pointtracker.local`;
};

export default function App() {
  // --- STATES ---
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [initError, setInitError] = useState(null);
  const [userProfile, setUserProfile] = useState(null); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Login Form States
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  // Data States
  const [dbGlobalFoods, setDbGlobalFoods] = useState([]);
  const [customFoods, setCustomFoods] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // UI States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortOption, setSortOption] = useState('name_asc');
  const [selectedFood, setSelectedFood] = useState(null);
  const [editingFood, setEditingFood] = useState(null);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(30);

  // Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState(null); // null | 'loading' | 'not_found' | 'error'
  const scannerRef = useRef(null);

  const [showGoalCalculator, setShowGoalCalculator] = useState(false);
  const [goalData, setGoalData] = useState({ gender: '', age: '', weight: '', height: '', activity: '' });

  const [allProfiles, setAllProfiles] = useState([]);
  const [pendingUserChanges, setPendingUserChanges] = useState({});

  const isAdmin = userProfile?.role === 'admin';

  // --- FIREBASE INITIALIZATION & AUTH ---
  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
      });

      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDarkMode(true);
      }
      return () => unsubscribe();
    } catch (err) {
      console.error("Firebase Start-Fehler:", err);
      setInitError(err.message);
      setAuthLoading(false);
    }
  }, []);

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!user) return;

    const profileRef = doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid);
    const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
        if (docSnap.data().dailyGoal) setDailyGoal(docSnap.data().dailyGoal);
      } else {
        const fallbackName = `Nutzer ${user.uid.substring(0,5)}`;
        const newProfile = { uid: user.uid, name: fallbackName, role: 'user', isDeleted: false, dailyGoal: 30 };
        setDoc(profileRef, newProfile);
        setUserProfile(newProfile);
      }
    });

    const unsubscribeGlobal = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'global_foods'), (snapshot) => {
      const fetched = [];
      snapshot.forEach(d => fetched.push({ id: d.id, ...d.data() }));
      setDbGlobalFoods(fetched);
    });

    const unsubscribeCustom = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'custom_foods'), (snapshot) => {
      const fetched = [];
      snapshot.forEach(d => fetched.push({ id: d.id, ...d.data(), isCustom: true }));
      setCustomFoods(fetched);
    });

    const unsubscribeLogs = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'logs'), (snapshot) => {
      const fetched = [];
      snapshot.forEach(d => fetched.push({ id: d.id, ...d.data() }));
      fetched.sort((a, b) => new Date(b.consumedAt) - new Date(a.consumedAt));
      setLogs(fetched);
    });

    return () => { unsubscribeProfile(); unsubscribeGlobal(); unsubscribeCustom(); unsubscribeLogs(); };
  }, [user]);

  // Admin: Alle User abfragen
  useEffect(() => {
    if (!user || !isAdmin) return;
    const unsubscribeAllProfiles = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'profiles'), (snapshot) => {
      const fetched = [];
      snapshot.forEach(d => fetched.push(d.data()));
      setAllProfiles(fetched);
    });
    return () => unsubscribeAllProfiles();
  }, [user, isAdmin]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // --- BARCODE SCANNER LOGIK ---
  const handleBarcodeScanned = async (barcode) => {
    setScanStatus('loading');
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await res.json();
      
      if (data.status === 1) {
        const p = data.product;
        const name = p.product_name || 'Unbekanntes Produkt';
        const brand = p.brands ? ` (${p.brands.split(',')[0]})` : '';
        const kcal = p.nutriments?.['energy-kcal_100g'] || 0;
        const fat = p.nutriments?.fat_100g || 0;
        
        // Automatische Punkteberechnung nach Formel
        const points = Math.round(((kcal / 60) + (fat / 9)) * 2) / 2;

        setIsScanning(false);
        setScanStatus(null);
        
        setEditingFood({
          id: '',
          name: `${name}${brand} (100g)`,
          category: '', 
          kcal: kcal,
          fett: fat,
          points: points,
          isCustom: true
        });
        setShowNewCategoryInput(false);
      } else {
        setScanStatus('not_found');
      }
    } catch(e) {
      setScanStatus('not_found');
    }
  };

  useEffect(() => {
    if (isScanning && !scanStatus) {
      const startCamera = async () => {
        const Html5Qrcode = window.Html5Qrcode;
        if (!Html5Qrcode) return;

        // NEU: Verhindert den Absturz (weißen Bildschirm) auf HTTP-Verbindungen
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error("Kamera API blockiert. HTTPS wird benötigt.");
          setScanStatus('https_required');
          return;
        }

        scannerRef.current = new Html5Qrcode("reader");
        try {
          await scannerRef.current.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            async (decodedText) => {
              if(scannerRef.current && scannerRef.current.isScanning) {
                await scannerRef.current.stop();
                scannerRef.current.clear();
              }
              handleBarcodeScanned(decodedText);
            },
            (errorMessage) => { /* Ignorieren bei Nicht-Erkennung */ }
          );
        } catch (err) {
          console.error("Camera start failed", err);
          setScanStatus('error');
        }
      };

      if (!window.Html5Qrcode) {
        const script = document.createElement('script');
        script.src = "https://unpkg.com/html5-qrcode";
        script.onload = startCamera;
        document.body.appendChild(script);
      } else {
        startCamera();
      }
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(console.error);
      }
    }
  }, [isScanning, scanStatus]);

  const closeScanner = () => {
    setIsScanning(false);
    setScanStatus(null);
  };

  // --- AUTHENTICATION ACTIONS ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    if (!usernameInput.trim()) {
      setAuthError('Bitte gib einen Benutzernamen ein.');
      return;
    }

    const fakeEmail = usernameToFakeEmail(usernameInput);

    try {
      if (isRegistering) {
        const userCred = await createUserWithEmailAndPassword(auth, fakeEmail, password);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', userCred.user.uid), {
           uid: userCred.user.uid,
           name: usernameInput.trim(),
           role: 'user',
           isDeleted: false,
           dailyGoal: 30
        });
      } else {
        await signInWithEmailAndPassword(auth, fakeEmail, password);
      }
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setAuthError('Dieser Benutzername ist bereits vergeben.');
      else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') setAuthError('Falsches Passwort oder Benutzername existiert nicht.');
      else if (err.code === 'auth/weak-password') setAuthError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      else setAuthError('Ein Fehler ist aufgetreten: ' + err.message);
    }
  };

  const handleLogout = () => signOut(auth);

  // --- DATENVERARBEITUNG ---
  const allFoods = useMemo(() => {
    return [...dbGlobalFoods.filter(f => !f.isDeleted), ...customFoods];
  }, [dbGlobalFoods, customFoods]);

  const allCategories = useMemo(() => {
    const cats = new Set(allFoods.map(f => f.category));
    return Array.from(cats).sort();
  }, [allFoods]);

  const filteredFoods = useMemo(() => {
    const searchTerms = search.toLowerCase().split(' ').filter(term => term !== '');
    let result = allFoods.filter((food) => {
      const searchableText = `${food.name} ${food.category}`.toLowerCase();
      const matchesSearch = searchTerms.every(term => searchableText.includes(term));
      const matchesCategory = selectedCategory ? food.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      if (sortOption === 'name_asc') return a.name.localeCompare(b.name);
      if (sortOption === 'name_desc') return b.name.localeCompare(a.name);
      if (sortOption === 'points_asc') return a.points - b.points;
      if (sortOption === 'points_desc') return b.points - a.points;
      return 0;
    });
    return result;
  }, [allFoods, search, selectedCategory, sortOption]);

  const { todayLogs, todayPoints, groupedHistory } = useMemo(() => {
    const { startOfDay } = getLogicalDayInfo();
    const todayL = [];
    const history = {};
    let tPoints = 0;

    logs.forEach(log => {
      const logDate = new Date(log.consumedAt);
      const { dateKey } = getLogicalDayInfo(log.consumedAt);
      if (logDate >= startOfDay) {
        todayL.push(log);
        tPoints += log.points;
      }
      if (!history[dateKey]) history[dateKey] = { points: 0, logs: [] };
      history[dateKey].points += log.points;
      history[dateKey].logs.push(log);
    });

    const historyArray = Object.keys(history)
      .sort((a, b) => new Date(b) - new Date(a))
      .map(dateKey => ({ dateKey, dateFormatted: formatDate(dateKey), ...history[dateKey] }));

    return { todayLogs: todayL, todayPoints: tPoints, groupedHistory: historyArray };
  }, [logs]);

  // --- ACTIONS ---
  const handleAddLog = async (food, multiplier = 1) => {
    if (!user) return;
    try {
      const logEntry = {
        foodId: food.id, name: food.name, category: food.category,
        points: food.points * multiplier, multiplier: multiplier,
        consumedAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'logs'), logEntry);
      setSelectedFood(null);
      setActiveTab('dashboard');
    } catch (e) { console.error("Error adding log", e); }
  };

  const handleDeleteLog = async (logId) => {
    if (!user) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'logs', logId)); } 
    catch (e) { console.error("Error", e); }
  };

  const handleSaveFood = async (e) => {
    e.preventDefault();
    if (!user || !editingFood) return;
    try {
      if (editingFood.isCustom) {
        const foodRef = doc(db, 'artifacts', appId, 'users', user.uid, 'custom_foods', editingFood.id || Date.now().toString());
        await setDoc(foodRef, {
          name: editingFood.name, category: editingFood.category,
          kcal: Number(editingFood.kcal) || 0, fett: Number(editingFood.fett) || 0,
          points: parseFloat(editingFood.points)
        });
      } else if (isAdmin) {
        const foodRef = doc(db, 'artifacts', appId, 'public', 'data', 'global_foods', editingFood.id || Date.now().toString());
        await setDoc(foodRef, {
          name: editingFood.name, category: editingFood.category,
          kcal: Number(editingFood.kcal) || 0, fett: Number(editingFood.fett) || 0,
          points: parseFloat(editingFood.points), isGlobal: true
        });
      }
      setEditingFood(null);
    } catch (err) { console.error("Error saving food", err); }
  };

  const handleDeleteFood = async () => {
    if (!user || !editingFood) return;
    try {
      if (editingFood.isCustom) {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'custom_foods', editingFood.id));
      } else if (isAdmin) {
        const foodRef = doc(db, 'artifacts', appId, 'public', 'data', 'global_foods', editingFood.id);
        await deleteDoc(foodRef); 
      }
      setEditingFood(null);
    } catch (err) { console.error("Error deleting food", err); }
  };

  const saveDailyGoalToDB = async (newGoal) => {
    setDailyGoal(newGoal);
    if(user) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid), { dailyGoal: newGoal }, { merge: true });
  };

  const calculateGoal = () => {
    let sum = 0;
    if (goalData.gender === 'W') sum += 7; else if (goalData.gender === 'M') sum += 15;
    if (goalData.age === '17-26') sum += 4; else if (goalData.age === '27-36') sum += 3; else if (goalData.age === '37-47') sum += 2; else if (goalData.age === '48-58') sum += 1;
    if (goalData.weight) sum += Math.floor(Number(goalData.weight) / 10);
    if (goalData.height === '<1.60') sum += 1; else if (goalData.height === '>=1.60') sum += 2;
    if (goalData.activity === '0') sum += 0; else if (goalData.activity === '2') sum += 2; else if (goalData.activity === '4') sum += 4; else if (goalData.activity === '6') sum += 6;
    saveDailyGoalToDB(sum || 30);
    setShowGoalCalculator(false);
  };

  const handleAdminUserChange = (uid, field, value) => {
    setPendingUserChanges(prev => ({ ...prev, [uid]: { ...prev[uid], [field]: value } }));
  };

  const saveAdminUserChanges = async () => {
    const promises = Object.entries(pendingUserChanges).map(([uid, changes]) => {
      return setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', uid), changes, { merge: true });
    });
    await Promise.all(promises);
    setPendingUserChanges({});
    alert("Änderungen erfolgreich gespeichert!");
  };

  const handleFoodCalcChange = (field, value) => {
    const newFood = { ...editingFood, [field]: value };
    const kcal = Number(newFood.kcal) || 0;
    const fett = Number(newFood.fett) || 0;
    if (kcal > 0 || fett > 0) {
      const p = (kcal / 60) + (fett / 9);
      newFood.points = Math.round(p * 2) / 2;
    }
    setEditingFood(newFood);
  };

  // --- RENDER SCREENS ---

  if (initError) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-black' : 'bg-[#F2F2F7]'} font-sans flex items-center justify-center p-4`}>
        <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-xl p-8 text-center border-2 border-red-500/20">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Datenbank-Fehler</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            Bitte trage deine echten Firebase-Daten in der Datei <b>App.jsx</b> (ab Zeile 16) ein.
          </p>
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-left">
            <p className="text-xs text-red-600 dark:text-red-400 font-mono break-words">{initError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 dark:border-teal-400 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  // LOGIN SCREEN
  if (!user) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-black' : 'bg-[#F2F2F7]'} font-sans flex items-center justify-center p-4`}>
        <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-500 dark:bg-teal-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30 dark:shadow-teal-500/30">
              <Utensils className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PointTracker</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">{isRegistering ? 'Erstelle einen Account' : 'Willkommen zurück'}</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authError && <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-xl text-center font-medium">{authError}</div>}
            
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" required placeholder="Benutzername"
                value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 transition-all"
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="password" required placeholder="Passwort"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 transition-all"
              />
            </div>

            <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-teal-500 dark:hover:bg-teal-600 text-white py-3.5 rounded-2xl font-bold transition-all shadow-md active:scale-95 mt-2">
              {isRegistering ? 'Registrieren' : 'Einloggen'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); setUsernameInput(''); setPassword(''); }}
              className="text-sm font-medium text-blue-500 hover:text-blue-600 dark:text-teal-400 dark:hover:text-teal-300"
            >
              {isRegistering ? 'Bereits registriert? Einloggen' : 'Neu hier? Account erstellen'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SPERRBILDSCHIRM
  if (userProfile?.isDeleted) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex items-center justify-center p-6 text-center">
        <div className="bg-white dark:bg-[#1C1C1E] p-8 rounded-3xl shadow-xl max-w-sm w-full">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Account gesperrt</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Dein Account wurde von einem Administrator deaktiviert.</p>
          <button onClick={handleLogout} className="px-6 py-2 bg-gray-200 dark:bg-[#2C2C2E] text-gray-900 dark:text-white rounded-xl font-bold">Abmelden</button>
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    const remainingPoints = dailyGoal - todayPoints;
    const isOverBudget = remainingPoints < 0;
    
    const progress = Math.max((remainingPoints / dailyGoal) * 100, 0); 
    const radius = 54; 
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    const ringColor = isOverBudget ? 'text-red-500' : 'text-blue-500 dark:text-teal-400';

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="px-5 pt-6 pb-2 bg-[#F2F2F7] dark:bg-black mb-2">
          <h2 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-widest mb-1">Heute</h2>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Hallo {userProfile?.name || 'Nutzer'} 👋</h1>
        </div>
        
        <div className="flex items-center justify-between p-6 bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-sm mx-4 relative">
          <div className="flex flex-col items-center flex-1">
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              {dailyGoal.toString().replace('.', ',')}
            </span>
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Ziel</span>
          </div>

          <div className="relative flex items-center justify-center w-36 h-36 shrink-0">
            <svg className="transform -rotate-90 w-36 h-36">
              <circle cx="72" cy="72" r={radius} stroke="currentColor" strokeWidth="10" fill="transparent" className="text-gray-100 dark:text-gray-800" />
              <circle cx="72" cy="72" r={radius} stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className={`${ringColor} transition-all duration-1000 ease-out`} />
            </svg>
            <div className="absolute flex flex-col items-center mt-1">
              <span className={`text-4xl font-bold tracking-tighter ${isOverBudget ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                {remainingPoints.toString().replace('.', ',')}
              </span>
              <span className={`text-xs font-bold mt-0.5 ${isOverBudget ? 'text-red-400' : 'text-gray-400 dark:text-gray-500 uppercase tracking-widest'}`}>übrig</span>
            </div>
          </div>

          <div className="flex flex-col items-center flex-1">
            <span className={`text-xl font-bold ${isOverBudget ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
              {todayPoints.toString().replace('.', ',')}
            </span>
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Genutzt</span>
          </div>
        </div>

        <div className="px-4 pb-24">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Gegessen</h2>
          {todayLogs.length === 0 ? (
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-8 text-center shadow-sm mb-4">
              <PieChart className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Noch keine Einträge heute.</p>
            </div>
          ) : (
            <ul className="space-y-3 mb-4">
              {todayLogs.map(log => (
                <li key={log.id} className="flex justify-between items-center bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl shadow-sm group">
                  <div className="flex-1">
                    <p className="font-semibold text-[17px] text-gray-900 dark:text-white">{log.name}</p>
                    <p className="text-[14px] text-gray-500">{log.multiplier}x Portion</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-blue-500 dark:text-teal-400">{log.points.toString().replace('.', ',')}</span>
                    <button onClick={() => handleDeleteLog(log.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setActiveTab('search')} className="w-full py-4 bg-blue-50 dark:bg-teal-900/20 hover:bg-blue-100 dark:hover:bg-teal-900/40 text-blue-600 dark:text-teal-400 rounded-2xl font-semibold flex justify-center items-center gap-2 transition-colors">
            <Plus size={20} /> Lebensmittel hinzufügen
          </button>
        </div>
      </div>
    );
  };

  const renderSearch = () => (
    <div className="space-y-4 animate-in fade-in duration-500 px-4 pt-6 pb-24 h-full flex flex-col">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Suchen</h1>
      
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-[#1C1C1E] shadow-sm shrink-0 focus-within:ring-2 ring-blue-500 dark:ring-teal-500 transition-all">
        <Search size={20} className="text-gray-400" />
        <input type="text" placeholder="Lebensmittel suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent outline-none text-[17px] text-gray-900 dark:text-white placeholder-gray-400" />
        <button onClick={() => { setIsScanning(true); setScanStatus(null); }} className="p-2 -mr-2 bg-blue-50 dark:bg-teal-900/30 text-blue-500 dark:text-teal-400 rounded-xl hover:bg-blue-100 dark:hover:bg-teal-900/50 transition-colors" title="Barcode Scannen">
          <Scan size={20} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 pt-1 shrink-0">
        <div className="flex items-center bg-white dark:bg-[#1C1C1E] rounded-full px-3 py-1.5 border border-gray-200 dark:border-gray-800 shrink-0">
          <ArrowUpDown size={14} className="text-gray-400 mr-2" />
          <select value={sortOption} onChange={e => setSortOption(e.target.value)} className="bg-transparent text-sm text-gray-600 dark:text-gray-300 outline-none appearance-none pr-4">
            <option value="name_asc" className="text-black dark:bg-[#1C1C1E] dark:text-white">A - Z</option>
            <option value="name_desc" className="text-black dark:bg-[#1C1C1E] dark:text-white">Z - A</option>
            <option value="points_asc" className="text-black dark:bg-[#1C1C1E] dark:text-white">Punkte aufsteigend</option>
            <option value="points_desc" className="text-black dark:bg-[#1C1C1E] dark:text-white">Punkte absteigend</option>
          </select>
        </div>

        <button onClick={() => setSelectedCategory('')} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${!selectedCategory ? 'bg-blue-500 dark:bg-teal-500 text-white' : 'bg-white dark:bg-[#1C1C1E] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800'}`}>
          Alle
        </button>
        {allCategories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-blue-500 dark:bg-teal-500 text-white' : 'bg-white dark:bg-[#1C1C1E] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-sm">
        {filteredFoods.length > 0 ? (
          <ul className="divide-y divide-gray-100 dark:divide-[#2C2C2E]">
            {filteredFoods.map((food) => (
              <li key={food.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-colors cursor-pointer group">
                <div className="flex-1 flex items-start gap-4" onClick={() => setSelectedFood(food)}>
                  <div className="mt-1 p-2 rounded-full bg-blue-50 dark:bg-teal-900/20 text-blue-500 dark:text-teal-400 shrink-0">
                    <Utensils size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[17px] text-gray-900 dark:text-white leading-tight">{food.name}</p>
                      {food.isCustom && <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full font-medium shrink-0">Eigenes</span>}
                    </div>
                    <p className="text-[14px] text-gray-500 mt-1">{food.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {(isAdmin || food.isCustom) && (
                    <button onClick={(e) => { e.stopPropagation(); setEditingFood(food); setShowNewCategoryInput(!allCategories.includes(food.category)); }} className="p-2 text-gray-400 hover:text-blue-500 dark:hover:text-teal-400">
                      <Edit2 size={18} />
                    </button>
                  )}
                  <div onClick={() => setSelectedFood(food)} className="flex items-center justify-center bg-gray-100 dark:bg-[#2C2C2E] text-gray-900 dark:text-gray-300 px-3 py-1.5 rounded-xl font-semibold min-w-[3.5rem]">
                    {food.points.toString().replace('.', ',')}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-10 text-center text-gray-500">Nichts gefunden. Nutze den Scanner oder lege es manuell an!</div>
        )}
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-6 animate-in fade-in duration-500 px-4 pt-6 pb-24">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Historie</h1>
      {groupedHistory.length === 0 ? (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-8 text-center shadow-sm">
          <Clock className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Deine Historie ist noch leer.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedHistory.map(day => (
            <div key={day.dateKey} className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                <h3 className="font-bold text-[18px] text-gray-900 dark:text-white">{day.dateFormatted}</h3>
                <span className={`font-bold px-3 py-1 rounded-full text-sm ${day.points > dailyGoal ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                  {day.points.toString().replace('.', ',')} P.
                </span>
              </div>
              <ul className="space-y-2">
                {day.logs.map(log => (
                  <li key={log.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{log.multiplier}x {log.name}</span>
                    <span className="text-gray-900 dark:text-gray-300 font-medium">{log.points}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6 animate-in fade-in duration-500 px-4 pt-6 pb-24">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profil</h1>

      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Moon className="text-gray-400 dark:text-teal-400" size={20} />
            <span className="font-medium text-gray-900 dark:text-white">Dark-Mode</span>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-14 h-8 bg-gray-200 dark:bg-[#2C2C2E] rounded-full relative transition-colors">
            <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform shadow-sm ${isDarkMode ? 'translate-x-7 bg-teal-500' : 'translate-x-1 bg-white'}`} />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Calculator className="text-gray-400 dark:text-teal-400" size={20} />
            <span className="font-medium text-gray-900 dark:text-white">Mein Tagesziel</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-blue-500 dark:text-teal-400">{dailyGoal} P.</span>
            <button onClick={() => setShowGoalCalculator(true)} className="px-3 py-1.5 bg-blue-50 dark:bg-teal-900/20 rounded-xl text-sm font-semibold text-blue-600 dark:text-teal-400">Neu berechnen</button>
          </div>
        </div>
      </div>

      <button onClick={() => { setEditingFood({ id: '', name: '', category: '', kcal: '', fett: '', points: 0, isCustom: true }); setShowNewCategoryInput(false); }} className="w-full bg-white dark:bg-[#1C1C1E] p-4 rounded-3xl shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-teal-900/20 text-blue-500 dark:text-teal-400 rounded-xl"><Plus size={20} /></div>
          <span className="font-medium text-[17px] text-gray-900 dark:text-white">Eigenes Lebensmittel anlegen</span>
        </div>
        <ChevronRight className="text-gray-400 group-hover:text-blue-500 dark:group-hover:text-teal-400 transition-colors" />
      </button>

      <button onClick={handleLogout} className="w-full bg-red-50 dark:bg-red-900/10 p-4 rounded-3xl shadow-sm flex items-center justify-center gap-3 group active:scale-[0.98] transition-all mt-4 border border-red-100 dark:border-red-900/30">
        <LogOut size={20} className="text-red-500" />
        <span className="font-bold text-[17px] text-red-500">Abmelden</span>
      </button>

      <div className="text-center mt-8">
        <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">PointTracker v4.6 (Scanner Edition)</p>
        <p className="text-xs text-gray-400 mt-1">
          Nutzer: <span className="font-bold">{userProfile?.name}</span> {isAdmin && '(Admin)'}
        </p>
      </div>
    </div>
  );

  const renderAdminUsers = () => (
    <div className="space-y-6 animate-in fade-in duration-500 px-4 pt-6 pb-24">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nutzer verwalten</h1>
        {Object.keys(pendingUserChanges).length > 0 && (
          <button onClick={saveAdminUserChanges} className="px-4 py-2 bg-blue-500 dark:bg-teal-500 text-white rounded-xl font-bold shadow-md active:scale-95 transition-all">Speichern</button>
        )}
      </div>
      <div className="space-y-3">
        {allProfiles.map(p => {
          const isPendingDelete = pendingUserChanges[p.uid]?.isDeleted ?? p.isDeleted;
          const currentRole = pendingUserChanges[p.uid]?.role ?? p.role;
          return (
            <div key={p.uid} className={`bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm border-2 transition-colors ${isPendingDelete ? 'border-red-500/50 opacity-60' : 'border-transparent'}`}>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{p.name || 'Unbekannt'}</p>
                  <p className="text-xs text-gray-500 font-mono">ID: {p.uid}</p>
                </div>
                {p.uid === user.uid && <span className="bg-blue-100 dark:bg-teal-900/30 text-blue-700 dark:text-teal-400 text-xs px-2 py-1 rounded-lg font-bold">Du</span>}
              </div>
              <div className="flex gap-2">
                <select disabled={p.uid === user.uid} value={currentRole} onChange={(e) => handleAdminUserChange(p.uid, 'role', e.target.value)} className="flex-1 bg-gray-50 dark:bg-[#2C2C2E] text-sm text-gray-900 dark:text-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500">
                  <option value="user" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">User</option>
                  <option value="admin" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Admin</option>
                </select>
                <button disabled={p.uid === user.uid} onClick={() => handleAdminUserChange(p.uid, 'isDeleted', !isPendingDelete)} className={`px-3 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-colors ${isPendingDelete ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>
                  {isPendingDelete ? 'Gesperrt' : 'Sperren'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 bg-[#F2F2F7] dark:bg-black font-sans selection:bg-blue-500/30 dark:selection:bg-teal-500/30`}>
      <div className="max-w-md mx-auto h-screen relative shadow-2xl bg-[#F2F2F7] dark:bg-black overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto hide-scrollbar relative">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'search' && renderSearch()}
          {activeTab === 'history' && renderHistory()}
          {activeTab === 'profile' && renderProfile()}
          {activeTab === 'users' && isAdmin && renderAdminUsers()}
        </div>

        <div className="absolute bottom-0 w-full bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 pb-safe pt-2 px-4 flex justify-around items-center z-40">
          {[
            { id: 'dashboard', icon: Home, label: 'Heute' },
            { id: 'search', icon: Search, label: 'Suche' },
            { id: 'history', icon: Clock, label: 'Historie' },
            { id: 'profile', icon: User, label: 'Profil' },
            ...(isAdmin ? [{ id: 'users', icon: Users, label: 'Nutzer' }] : [])
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center p-2 transition-all ${activeTab === item.id ? 'text-blue-500 dark:text-teal-400 scale-110' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
              <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-semibold">{item.label}</span>
            </button>
          ))}
        </div>

        {/* MODAL: BARCODE SCANNER */}
        {isScanning && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl p-6 relative overflow-hidden">
              <button onClick={closeScanner} className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-[#2C2C2E] rounded-full text-gray-500 z-50">
                <X size={20} />
              </button>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">Barcode scannen</h3>

              {scanStatus === 'loading' ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                   <div className="w-12 h-12 border-4 border-blue-500 dark:border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                   <p className="text-gray-600 dark:text-gray-300 font-medium">Produkt wird in der Datenbank gesucht...</p>
                </div>
              ) : scanStatus === 'https_required' ? (
                <div className="py-8 text-center animate-in fade-in zoom-in duration-300">
                   <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Shield size={28}/>
                   </div>
                   <p className="text-gray-900 dark:text-white text-xl font-bold mb-2">Sichere Verbindung fehlt</p>
                   <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Handy-Browser erlauben die Kamera nur über eine sichere Verbindung (HTTPS). Bitte lade die App bei Netlify hoch, um den Scanner auf dem Handy zu testen.</p>
                   <button onClick={closeScanner} className="w-full py-4 bg-gray-200 dark:bg-[#2C2C2E] text-gray-900 dark:text-white rounded-2xl font-bold">
                     Verstanden
                   </button>
                </div>
              ) : scanStatus === 'not_found' ? (
                <div className="py-8 text-center animate-in fade-in zoom-in duration-300">
                   <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Search size={28}/>
                   </div>
                   <p className="text-gray-900 dark:text-white text-xl font-bold mb-2">Nicht gefunden</p>
                   <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Dieses Produkt ist noch nicht in der Datenbank.</p>
                   <button onClick={() => { closeScanner(); setEditingFood({ id: '', name: '', category: '', kcal: '', fett: '', points: 0, isCustom: true }); setShowNewCategoryInput(false); }} className="w-full py-4 bg-blue-500 dark:bg-teal-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 dark:shadow-teal-500/30">
                     Manuell anlegen
                   </button>
                </div>
              ) : scanStatus === 'error' ? (
                <div className="py-8 text-center">
                   <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Lock size={28}/>
                   </div>
                   <p className="text-gray-900 dark:text-white text-xl font-bold mb-2">Kamera blockiert</p>
                   <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Erlaube in deinem Browser den Kamera-Zugriff, um scannen zu können.</p>
                   <button onClick={closeScanner} className="w-full py-4 bg-gray-200 dark:bg-[#2C2C2E] text-gray-900 dark:text-white rounded-2xl font-bold">
                     Schließen
                   </button>
                </div>
              ) : (
                <div>
                   <div id="reader" className="w-full bg-black rounded-2xl overflow-hidden shadow-inner aspect-square relative flex items-center justify-center">
                      <p className="text-gray-500 text-sm absolute">Kamera wird gestartet...</p>
                   </div>
                   <p className="text-center text-sm font-medium text-gray-500 mt-6 animate-pulse">Halte den Strichcode in das Bild</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: Portion wählen */}
        {selectedFood && (
          <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
            <div className="w-full sm:w-11/12 max-w-sm bg-white dark:bg-[#1C1C1E] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-full sm:fade-in duration-300">
              <div className="p-6 relative">
                <button onClick={() => setSelectedFood(null)} className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-[#2C2C2E] rounded-full text-gray-500"><X size={20} /></button>
                <div className="mt-2 mb-6 text-center">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{selectedFood.name}</h3>
                  <p className="text-gray-500 mt-1">{selectedFood.category} • {selectedFood.points.toString().replace('.', ',')} P.</p>
                </div>
                <div className="space-y-4">
                  <button onClick={() => handleAddLog(selectedFood, 0.5)} className="w-full py-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl font-semibold text-gray-900 dark:text-white flex justify-between px-6 focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500">
                    <span>Halbe Portion (0,5x)</span>
                    <span className="text-blue-500 dark:text-teal-400">{(selectedFood.points * 0.5).toString().replace('.', ',')} P.</span>
                  </button>
                  <button onClick={() => handleAddLog(selectedFood, 1)} className="w-full py-4 bg-blue-500 dark:bg-teal-500 text-white shadow-lg shadow-blue-500/30 dark:shadow-teal-500/30 rounded-2xl font-bold flex justify-between px-6">
                    <span>Normale Portion (1x)</span>
                    <span>{selectedFood.points.toString().replace('.', ',')} P.</span>
                  </button>
                  <button onClick={() => handleAddLog(selectedFood, 2)} className="w-full py-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl font-semibold text-gray-900 dark:text-white flex justify-between px-6 focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500">
                    <span>Doppelte Portion (2x)</span>
                    <span className="text-blue-500 dark:text-teal-400">{(selectedFood.points * 2).toString().replace('.', ',')} P.</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Lebensmittel bearbeiten / neu erstellen */}
        {editingFood && (
          <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto pt-10 pb-10">
            <div className="w-full sm:w-11/12 max-w-sm bg-white dark:bg-[#1C1C1E] rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 relative">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{editingFood.id ? 'Bearbeiten' : 'Neu anlegen'}</h3>
                <div className="flex gap-2">
                  {editingFood.id && <button onClick={handleDeleteFood} className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-500"><Trash2 size={20} /></button>}
                  <button onClick={() => setEditingFood(null)} className="p-2 bg-gray-100 dark:bg-[#2C2C2E] rounded-full text-gray-500"><X size={20} /></button>
                </div>
              </div>
              <form onSubmit={handleSaveFood} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-600 dark:text-gray-400 ml-1">Name & Menge</label>
                  <input type="text" required value={editingFood.name} onChange={e => setEditingFood({...editingFood, name: e.target.value})} className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white border-2 border-transparent focus:border-blue-500 dark:focus:border-teal-500 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-600 dark:text-gray-400 ml-1">Kategorie</label>
                  {showNewCategoryInput ? (
                    <div className="flex gap-2">
                      <input type="text" required autoFocus placeholder="Neue Kategorie..." value={editingFood.category} onChange={e => setEditingFood({...editingFood, category: e.target.value})} className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white border-2 border-transparent focus:border-blue-500 dark:focus:border-teal-500 outline-none transition-colors" />
                      <button type="button" onClick={() => setShowNewCategoryInput(false)} className="px-4 bg-gray-200 dark:bg-[#2C2C2E] rounded-2xl text-gray-600 dark:text-gray-300"><X size={20} /></button>
                    </div>
                  ) : (
                    <div className="relative">
                      <select required value={editingFood.category} onChange={(e) => { if (e.target.value === '___NEW___') { setShowNewCategoryInput(true); setEditingFood({...editingFood, category: ''}); } else setEditingFood({...editingFood, category: e.target.value}); }} className={`w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] border-2 border-transparent focus:border-blue-500 dark:focus:border-teal-500 outline-none appearance-none transition-colors ${!editingFood.category ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                        <option value="" disabled className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Bitte wählen...</option>
                        {allCategories.map(cat => <option key={cat} value={cat} className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">{cat}</option>)}
                        <option value="___NEW___" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">+ Neue Kategorie erstellen...</option>
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none rotate-90" size={18} />
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1.5 text-gray-600 dark:text-gray-400 ml-1">Kalorien (kcal)</label>
                    <input type="number" required={!editingFood.id} value={editingFood.kcal || ''} onChange={e => handleFoodCalcChange('kcal', e.target.value)} placeholder="0" className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white border-2 border-transparent focus:border-blue-500 dark:focus:border-teal-500 outline-none transition-colors" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1.5 text-gray-600 dark:text-gray-400 ml-1">Fett (g)</label>
                    <input type="number" step="0.1" required={!editingFood.id} value={editingFood.fett || ''} onChange={e => handleFoodCalcChange('fett', e.target.value)} placeholder="0" className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white border-2 border-transparent focus:border-blue-500 dark:focus:border-teal-500 outline-none transition-colors" />
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-teal-900/20 rounded-2xl p-4 flex justify-between items-center mt-2 border border-blue-100 dark:border-teal-900/50 transition-colors">
                  <span className="font-semibold text-blue-600 dark:text-teal-400">Punkte gesamt:</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-teal-400">{editingFood.points.toString().replace('.', ',')}</span>
                </div>
                <button type="submit" className="w-full mt-6 flex items-center justify-center gap-2 bg-blue-500 dark:bg-teal-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 dark:shadow-teal-500/30 active:scale-[0.98] transition-all">
                  <Save size={20} /> Speichern
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Tagesziel Rechner */}
        {showGoalCalculator && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Punkte-Quiz</h3>
                <button onClick={() => setShowGoalCalculator(false)} className="p-2 bg-gray-100 dark:bg-[#2C2C2E] rounded-full text-gray-500"><X size={20} /></button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block font-bold mb-2 text-gray-900 dark:text-white">A. Geschlecht</label>
                  <select value={goalData.gender} onChange={e => setGoalData({...goalData, gender: e.target.value})} className="w-full bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white p-3 rounded-xl border border-gray-200 dark:border-gray-700 outline-none appearance-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500">
                    <option value="" disabled className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Wählen...</option>
                    <option value="W" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Weiblich</option>
                    <option value="M" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Männlich</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-2 text-gray-900 dark:text-white">B. Alter</label>
                  <select value={goalData.age} onChange={e => setGoalData({...goalData, age: e.target.value})} className="w-full bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white p-3 rounded-xl border border-gray-200 dark:border-gray-700 outline-none appearance-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500">
                    <option value="" disabled className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Wählen...</option>
                    <option value="17-26" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">17–26 Jahre</option>
                    <option value="27-36" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">27–36 Jahre</option>
                    <option value="37-47" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">37–47 Jahre</option>
                    <option value="48-58" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">48–58 Jahre</option>
                    <option value=">58" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Über 58 Jahre</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-2 text-gray-900 dark:text-white">C. Gewicht (in kg)</label>
                  <input type="number" value={goalData.weight} onChange={e => setGoalData({...goalData, weight: e.target.value})} placeholder="z.B. 84" className="w-full bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white p-3 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block font-bold mb-2 text-gray-900 dark:text-white">D. Körpergröße</label>
                  <select value={goalData.height} onChange={e => setGoalData({...goalData, height: e.target.value})} className="w-full bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white p-3 rounded-xl border border-gray-200 dark:border-gray-700 outline-none appearance-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500">
                    <option value="" disabled className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Wählen...</option>
                    <option value="<1.60" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Unter 1,60 m</option>
                    <option value=">=1.60" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">1,60 m oder größer</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-2 text-gray-900 dark:text-white">E. Aktivität (Alltag)</label>
                  <select value={goalData.activity} onChange={e => setGoalData({...goalData, activity: e.target.value})} className="w-full bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white p-3 rounded-xl border border-gray-200 dark:border-gray-700 outline-none appearance-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500">
                    <option value="" disabled className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Wählen...</option>
                    <option value="0" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Hauptsächlich sitzend</option>
                    <option value="2" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Hauptsächlich stehend</option>
                    <option value="4" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Gehend / Körperlich anstrengend</option>
                    <option value="6" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Sehr anstrengende körperliche Arbeit</option>
                  </select>
                </div>
                <button onClick={calculateGoal} disabled={!goalData.gender || !goalData.age || !goalData.weight || !goalData.height || !goalData.activity} className="w-full mt-4 flex justify-center items-center gap-2 bg-blue-500 dark:bg-teal-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white py-4 rounded-2xl font-bold transition-all active:scale-95">
                  Tagesziel festlegen
                </button>
              </div>
            </div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{__html: `
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .pb-safe { padding-bottom: calc(1rem + env(safe-area-inset-bottom)); }
        `}} />
      </div>
    </div>
  );
}