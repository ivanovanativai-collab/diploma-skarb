import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { 
  Wallet, 
  PlusCircle, 
  LogOut, 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  History,
  LayoutDashboard
} from 'lucide-react';

// --- ВАШІ КОНФІГУРАЦІЇ FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCQlVRv6EL9R6Od2VgdXBoi3OQ9p5M9Bds",
  authDomain: "skarbnychka-ddb6a.firebaseapp.com",
  projectId: "skarbnychka-ddb6a",
  storageBucket: "skarbnychka-ddb6a.firebasestorage.app",
  messagingSenderId: "749409598042",
  appId: "1:749409598042:web:f5bb4d667f6d2cd7347663",
  measurementId: "G-1H0T57JGFD"
};

// Ініціалізація сервісів
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export default function App() {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);

  // 1. Відстеження авторизації
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Отримання даних у реальному часі
  useEffect(() => {
    if (!user) return;

    // Згідно з правилами середовища використовуємо шлях: artifacts/appId/users/userId/collection
    const q = query(
      collection(db, 'artifacts', 'skarbnychka', 'users', user.uid, 'transactions'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(data);
    }, (error) => {
      console.error("Помилка Firestore (перевірте правила доступу):", error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Помилка входу:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const addTransaction = async (type) => {
    if (!amount || !description) return;

    try {
      // Додаємо запис у базу
      await addDoc(collection(db, 'artifacts', 'skarbnychka', 'users', user.uid, 'transactions'), {
        amount: parseFloat(amount),
        description: description,
        type: type,
        createdAt: serverTimestamp()
      });
      
      // Очищуємо поля
      setAmount('');
      setDescription('');
    } catch (error) {
      console.error("Помилка при додаванні запису:", error);
      alert("Не вдалося зберегти дані. Перевірте консоль (F12) або налаштування Firestore Rules.");
    }
  };

  const deleteTransaction = async (id) => {
    try {
      await deleteDoc(doc(db, 'artifacts', 'skarbnychka', 'users', user.uid, 'transactions', id));
    } catch (error) {
      console.error("Помилка видалення:", error);
    }
  };

  const totalBalance = transactions.reduce((acc, curr) => {
    return curr.type === 'income' ? acc + curr.amount : acc - curr.amount;
  }, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-4 text-white">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center w-full max-w-md border-b-8 border-emerald-700">
          <div className="bg-emerald-100 p-5 rounded-3xl mb-6">
            <Wallet size={70} className="text-emerald-600" />
          </div>
          <h1 className="text-4xl font-black text-gray-800 mb-2">Скарбничка</h1>
          <p className="text-gray-500 text-center mb-10">Твій фінансовий помічник</p>
          
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-4 bg-emerald-600 text-white font-bold py-5 px-8 rounded-2xl hover:bg-emerald-700 transition-all active:scale-95"
          >
            <LayoutDashboard size={24} />
            <span>Увійти через Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50 pb-20 font-sans">
      <header className="bg-emerald-600 text-white p-8 rounded-b-[3.5rem] shadow-xl mb-8">
        <div className="max-w-md mx-auto flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <Wallet size={24} />
            <span className="font-black text-xl uppercase tracking-tighter">Скарбничка</span>
          </div>
          <button onClick={handleLogout} className="bg-white/20 p-2.5 rounded-xl hover:bg-white/30 transition-colors">
            <LogOut size={22} />
          </button>
        </div>

        <div className="max-w-md mx-auto text-center pb-4">
          <p className="text-emerald-100 text-xs mb-2 uppercase tracking-widest font-bold">Ваш баланс</p>
          <h2 className="text-6xl font-black mb-8 tracking-tight">
            {totalBalance.toLocaleString()} <span className="text-3xl font-light text-emerald-200">₴</span>
          </h2>
          
          <div className="flex justify-center gap-3 mt-6">
            <div className="bg-white/10 backdrop-blur-lg p-4 rounded-[2rem] flex flex-col items-center flex-1 border border-white/20">
              <TrendingUp className="text-emerald-300 mb-1" size={24} />
              <span className="font-black text-lg">+{transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0).toLocaleString()}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-lg p-4 rounded-[2rem] flex flex-col items-center flex-1 border border-white/20">
              <TrendingDown className="text-rose-300 mb-1" size={24} />
              <span className="font-black text-lg">-{transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5">
        <div className="bg-white p-7 rounded-[2.5rem] shadow-xl mb-10 border border-emerald-100/50">
          <h3 className="text-gray-800 font-black text-xl mb-6 flex items-center gap-3">
            <PlusCircle className="text-emerald-500" size={24} />
            Нова операція
          </h3>
          <div className="space-y-4">
            <div className="relative">
                <input 
                    type="number" 
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-emerald-50 border-2 border-transparent rounded-2xl p-5 pl-12 focus:border-emerald-500 outline-none text-2xl font-black text-gray-800 transition-all"
                />
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xl">₴</span>
            </div>
            <input 
                type="text" 
                placeholder="Опис (напр. Зарплата)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-emerald-50 border-2 border-transparent rounded-2xl p-5 focus:border-emerald-500 outline-none font-medium text-gray-700 transition-all"
            />
            <div className="grid grid-cols-2 gap-4">
                <button 
                onClick={() => addTransaction('income')}
                className="bg-emerald-600 text-white py-5 rounded-2xl font-black hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-200"
                >
                ДОХІД
                </button>
                <button 
                onClick={() => addTransaction('expense')}
                className="bg-gray-800 text-white py-5 rounded-2xl font-black hover:bg-gray-900 transition-all active:scale-95 shadow-lg shadow-gray-200"
                >
                ВИТРАТА
                </button>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between px-2">
          <h3 className="text-gray-800 font-black text-lg flex items-center gap-2">
            <History size={20} className="text-emerald-600" />
            Історія
          </h3>
        </div>

        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="bg-white/50 border-2 border-dashed border-emerald-200 rounded-[2rem] p-12 text-center text-emerald-300 italic">
                Тут з'являться ваші записи...
            </div>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="bg-white p-5 rounded-[2rem] shadow-sm flex items-center justify-between border border-emerald-50 group">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {t.type === 'income' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                  </div>
                  <div>
                    <p className="font-black text-gray-800">{t.description}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">
                      {t.createdAt ? t.createdAt.toDate().toLocaleDateString('uk-UA') : 'Синхронізація...'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className={`font-black text-xl ${t.type === 'income' ? 'text-emerald-600' : 'text-gray-800'}`}>
                    {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                  </p>
                  <button onClick={() => deleteTransaction(t.id)} className="text-gray-200 hover:text-rose-500 transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}