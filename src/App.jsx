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
  LayoutDashboard,
  Tags,
  Calendar,
  PieChart
} from 'lucide-react';

// --- КОНФІГУРАЦІЯ FIREBASE ---
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

// Категорії для випадаючого списку
const EXPENSE_CATEGORIES = ['Продукти', 'Транспорт', 'Кафе та ресторани', 'Комунальні послуги', 'Здоров\'я', 'Улюбленці', 'Одяг', 'Розваги', 'Інше'];
const INCOME_CATEGORIES = ['Зарплата', 'Премія', 'Подарунок', 'Переказ', 'Інше'];

export default function App() {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  
  // Стани для розумної форми
  const [transactionType, setTransactionType] = useState('expense');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Додано вибір дати
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Спрощуємо запит до бази даних, щоб уникнути помилки індексів Firebase
    const ref = collection(db, 'artifacts', 'skarbnychka', 'users', user.uid, 'transactions');

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Сортуємо дані прямо в пам'яті браузера (JavaScript)
      data.sort((a, b) => {
        // Спочатку сортуємо за обраною датою (свіжіші зверху)
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        
        if (dateB !== dateA) {
          return dateB - dateA;
        }
        
        // Якщо дати однакові, сортуємо за точним часом створення
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });

      setTransactions(data);
    }, (error) => {
      console.error("Помилка Firestore:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleTypeChange = (type) => {
    setTransactionType(type);
    setCategory(type === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Помилка входу:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const addTransaction = async () => {
    if (!amount || !category || !date) return;

    try {
      await addDoc(collection(db, 'artifacts', 'skarbnychka', 'users', user.uid, 'transactions'), {
        amount: parseFloat(amount),
        description: category,
        type: transactionType,
        date: date, // Зберігаємо обрану користувачем дату
        createdAt: serverTimestamp()
      });
      setAmount('');
    } catch (error) {
      console.error("Помилка при додаванні запису:", error);
    }
  };

  const deleteTransaction = async (id) => {
    try {
      await deleteDoc(doc(db, 'artifacts', 'skarbnychka', 'users', user.uid, 'transactions', id));
    } catch (error) {
      console.error("Помилка видалення:", error);
    }
  };

  // --- ОБЧИСЛЕННЯ АНАЛІТИКИ ---
  const totalBalance = transactions.reduce((acc, curr) => {
    return curr.type === 'income' ? acc + curr.amount : acc - curr.amount;
  }, 0);

  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
  
  // Рахуємо суми по категоріях витрат
  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => {
      acc[curr.description] = (acc[curr.description] || 0) + curr.amount;
      return acc;
    }, {});

  // Беремо Топ-3 найбільших витрат
  const topExpenses = Object.entries(expenseByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  // --- ЕКРАНИ ---
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
      {/* Шапка */}
      <header className="bg-emerald-600 text-white p-8 rounded-b-[3.5rem] shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-emerald-500 rounded-full opacity-20"></div>
        <div className="max-w-md mx-auto flex justify-between items-center mb-10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <Wallet size={24} />
            </div>
            <span className="font-black text-xl uppercase tracking-tighter">Скарбничка</span>
          </div>
          <button onClick={handleLogout} className="bg-white/20 p-2.5 rounded-xl hover:bg-white/30 transition-colors backdrop-blur-md">
            <LogOut size={22} />
          </button>
        </div>

        <div className="max-w-md mx-auto text-center pb-4 relative z-10">
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
              <span className="font-black text-lg">-{totalExpenses.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5">
        {/* Форма */}
        <div className="bg-white p-7 rounded-[2.5rem] shadow-xl shadow-emerald-900/5 mb-10 border border-emerald-100/50">
          <h3 className="text-gray-800 font-black text-xl mb-6 flex items-center gap-3">
            <PlusCircle className="text-emerald-500" size={24} />
            Нова операція
          </h3>
          
          <div className="space-y-5">
            {/* Перемикач типу */}
            <div className="flex bg-emerald-50 p-1.5 rounded-2xl">
              <button
                onClick={() => handleTypeChange('expense')}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${transactionType === 'expense' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                ВИТРАТА
              </button>
              <button
                onClick={() => handleTypeChange('income')}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${transactionType === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                ДОХІД
              </button>
            </div>

            {/* Сума */}
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

            <div className="grid grid-cols-2 gap-3">
                {/* Категорія */}
                <div className="relative col-span-1">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600">
                      <Tags size={18} />
                    </div>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-emerald-50 border-2 border-transparent rounded-2xl p-4 pl-10 focus:border-emerald-500 outline-none font-bold text-gray-700 text-sm transition-all appearance-none cursor-pointer"
                    >
                      {transactionType === 'expense' 
                        ? EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)
                        : INCOME_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)
                      }
                    </select>
                </div>
                
                {/* Дата */}
                <div className="relative col-span-1">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600">
                      <Calendar size={18} />
                    </div>
                    <input 
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-emerald-50 border-2 border-transparent rounded-2xl p-4 pl-10 focus:border-emerald-500 outline-none font-bold text-gray-700 text-sm transition-all cursor-pointer"
                    />
                </div>
            </div>

            <button 
              onClick={addTransaction}
              className={`w-full text-white py-5 rounded-2xl font-black transition-all active:scale-95 shadow-lg ${transactionType === 'expense' ? 'bg-gray-800 hover:bg-gray-900 shadow-gray-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
            >
              ДОДАТИ {transactionType === 'expense' ? 'ВИТРАТУ' : 'ДОХІД'}
            </button>
          </div>
        </div>

        {/* АНАЛІТИКА (З'являється тільки якщо є витрати) */}
        {topExpenses.length > 0 && (
          <div className="bg-white p-7 rounded-[2.5rem] shadow-xl shadow-emerald-900/5 mb-10 border border-emerald-100/50">
            <h3 className="text-gray-800 font-black text-xl mb-6 flex items-center gap-3">
              <PieChart className="text-emerald-500" size={24} />
              Топові витрати
            </h3>
            <div className="space-y-5">
              {topExpenses.map(([cat, amt]) => {
                const percent = Math.round((amt / totalExpenses) * 100);
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm font-bold text-gray-700 mb-2">
                      <span>{cat}</span>
                      <span>{amt.toLocaleString()} ₴ <span className="text-emerald-500 ml-1">({percent}%)</span></span>
                    </div>
                    <div className="w-full bg-emerald-50 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-3 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Історія */}
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
                      {/* Відображаємо обрану дату */}
                      {t.date ? new Date(t.date).toLocaleDateString('uk-UA') : (t.createdAt ? t.createdAt.toDate().toLocaleDateString('uk-UA') : '...')}
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