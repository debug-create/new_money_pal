import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Wallet, TrendingUp, DollarSign, CreditCard, X, Users, Calculator, Target, Calendar, Trash2, ArrowUpRight, ArrowDownLeft } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // REAL DATA STATES
  const [userProfile, setUserProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState<any[]>([]); 
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0); // NEW: Track Income separately
  const [chartData, setChartData] = useState<any[]>([]); 
  
  // MAGIC AI STATE
  const [isMagicMode, setIsMagicMode] = useState(true);
  const [magicText, setMagicText] = useState("");
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  
  // SIMULATOR STATE
  const [simCost, setSimCost] = useState("");
  const [simResult, setSimResult] = useState<string | null>(null);

  // Budget Setup State
  const [newBudget, setNewBudget] = useState("");

  // Transaction Form State
  const [formData, setFormData] = useState({
    description: "", 
    amount: "", 
    date: new Date().toISOString().slice(0, 10), 
    category: "General", 
    transaction_type: "debit" // Default
  });
  const [isSplit, setIsSplit] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // --- 1. FETCH REAL DATA ---
  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    try {
      const profileRes = await fetch("http://127.0.0.1:8000/api/users/me", { headers: { "Authorization": `Bearer ${token}` } });
      if (profileRes.ok) setUserProfile(await profileRes.json());

      const txRes = await fetch("http://127.0.0.1:8000/api/transactions/", { headers: { "Authorization": `Bearer ${token}` } });
      if (txRes.ok) {
        const txData = await txRes.json();
        const safeData = Array.isArray(txData) ? txData : [];
        setTransactions(safeData as any);
        
        // Calculate Totals correctly
        const exp = safeData.reduce((acc: number, t: any) => t.transaction_type === "debit" ? acc + (Number(t.amount) || 0) : acc, 0);
        const inc = safeData.reduce((acc: number, t: any) => t.transaction_type === "credit" ? acc + (Number(t.amount) || 0) : acc, 0);
        
        setTotalExpense(exp);
        setTotalIncome(inc);
      }

      const chartRes = await fetch("http://127.0.0.1:8000/api/transactions/chart-data", { headers: { "Authorization": `Bearer ${token}` } });
      if (chartRes.ok) {
          let cData = await chartRes.json();
          if (cData.length === 1 && cData[0].name !== "No Data") {
             const prevDate = new Date();
             prevDate.setDate(prevDate.getDate() - 1);
             cData = [{ name: prevDate.toISOString().slice(5, 10), amount: 0 }, ...cData];
          }
          setChartData(cData);
      }

      const goalsRes = await fetch("http://127.0.0.1:8000/api/goals/list", { headers: { "Authorization": `Bearer ${token}` } });
      if (goalsRes.ok) setGoals(await goalsRes.json());

    } catch (err) { console.error("Fetch error:", err); }
  }, [navigate]);

  useEffect(() => { fetchData(); setIsReady(true); }, [fetchData]);

  // --- 2. CALCULATORS & HANDLERS ---
  const calculateAffordability = (cost: number) => {
    if (!userProfile) return;
    // Current Balance = (Budget + Income) - Expenses
    const currentBalance = (userProfile.monthly_allowance + totalIncome) - totalExpense;
    const remainingAfterPurchase = currentBalance - cost;
    
    if (remainingAfterPurchase < 0) setSimResult("❌ You will be BROKE (Negative Balance). Don't do it.");
    else setSimResult(`✅ Safe! You'll still have ₹${remainingAfterPurchase.toLocaleString()} left.`);
  };

  const handleMagicParse = async () => {
    if (!magicText) return;
    setIsMagicLoading(true);
    const token = localStorage.getItem("token");
    
    try {
        const res = await fetch("http://127.0.0.1:8000/api/transactions/magic-parse", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ text: magicText })
        });
        const data = await res.json();
        
        setFormData(prev => ({
            ...prev,
            amount: data.amount || prev.amount,
            description: data.description || prev.description,
            category: data.category || prev.category,
            transaction_type: "debit" // AI currently defaults to debit, user can switch manually if needed
        }));
        setIsMagicMode(false); 
    } catch (e) {
        alert("AI couldn't understand that. Try manual entry.");
    } finally {
        setIsMagicLoading(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    
    let finalAmount = parseFloat(formData.amount);
    let finalDesc = formData.description;

    if (isSplit && splitCount > 1 && formData.transaction_type === 'debit') {
        finalAmount = finalAmount / splitCount;
        finalDesc = `${formData.description} (Split 1/${splitCount})`;
    }

    await fetch("http://127.0.0.1:8000/api/transactions/add", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ 
          ...formData, 
          description: finalDesc,
          amount: finalAmount,
          date: formData.date
      }),
    });
    
    setShowModal(false);
    setFormData(prev => ({ ...prev, description: "", amount: "", category: "General", transaction_type: "debit" }));
    setIsSplit(false); 
    setMagicText(""); 
    setIsMagicMode(true); 
    fetchData();
  };

  if (!isReady || !userProfile) return <div style={{padding: '40px', textAlign: 'center'}}>Loading MoneyPal...</div>;
  const allowance = userProfile.monthly_allowance || 0;
  // Correct Balance Formula: (Budget + Extra Income) - Expenses
  const currentBalance = (allowance + totalIncome) - totalExpense;

  // --- VIEW: BUDGET SETUP ---
  if (allowance === 0) {
    return (
        <div style={{ padding: '40px', textAlign: 'center', marginTop: '50px' }}>
            <h1 style={{fontSize: '3rem', marginBottom: '10px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Welcome to MoneyPal! 🚀</h1>
            <p style={{color: '#64748b', marginBottom: '30px', fontSize: '1.2rem'}}>To start tracking, tell us your monthly budget/pocket money.</p>
            <div className="glass-panel" style={{maxWidth: '450px', margin: '0 auto', padding: '40px'}}>
                <input type="number" placeholder="e.g. 5000" value={newBudget} onChange={(e) => setNewBudget(e.target.value)} className="input-glass" style={{marginBottom: '20px', fontSize: '18px'}} />
                <button onClick={async () => {
                    const token = localStorage.getItem("token");
                    await fetch("http://127.0.0.1:8000/api/users/me/budget", {
                        method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                        body: JSON.stringify({ monthly_allowance: parseFloat(newBudget) })
                    });
                    fetchData();
                }} className="btn-primary-glow" style={{width: '100%', justifyContent: 'center', fontSize: '1.1rem'}}>Set My Budget</button>
            </div>
        </div>
    );
  }

  // --- VIEW: DASHBOARD ---
  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 className="animate-fade-in" style={{ fontSize: '32px', color: '#1e293b' }}>Hi, {userProfile.full_name}! 👋</h1>
          <p style={{ color: '#64748b', fontSize: '16px' }}>Here is your real-time financial health.</p>
        </div>
        <button onClick={() => { setFormData(prev => ({ ...prev, date: new Date().toISOString().slice(0, 10) })); setShowDatePicker(false); setShowModal(true); }} className="btn-primary-glow">
            + Add Transaction
        </button>
      </div>

      <div className="stats-grid">
        {[
          { label: "Current Balance", val: currentBalance, icon: DollarSign, color: "#10b981", bg: "income-bg" },
          { label: "Monthly Budget", val: allowance, icon: TrendingUp, color: "#3b82f6", bg: "expense-bg" },
          { label: "Total Spent", val: totalExpense, icon: CreditCard, color: "#ef4444", bg: "wallet-bg" },
          { label: "Total Saved", val: Math.max(0, currentBalance), icon: Wallet, color: "#d946ef", bg: "saving-bg" }
        ].map((item, i) => (
          <div key={i} className="stat-card glass-panel">
            <div className={`stat-icon ${item.bg}`}><item.icon size={28} color={item.color} /></div>
            <div>
                <span>{item.label}</span>
                <h3>₹{item.val.toLocaleString('en-IN')}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid-2">
        {/* SIMULATOR */}
        <div className="glass-panel">
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px'}}>
                <div style={{padding:'10px', background:'#fff7ed', borderRadius:'12px'}}><Calculator size={24} color="#f59e0b" /></div>
                <h3 style={{fontSize:'20px', fontWeight:'700', margin:0}}>Can I Afford It?</h3>
            </div>
            <div style={{ display: 'flex', gap: '15px' }}>
                <input type="number" placeholder="Enter Price (₹)" value={simCost} onChange={(e) => { setSimCost(e.target.value); if(e.target.value) calculateAffordability(Number(e.target.value)); else setSimResult(null); }} className="input-glass" />
            </div>
            {simResult && (
                <div style={{ marginTop: '20px', padding: '15px', borderRadius: '16px', background: simResult.includes("❌") ? '#fee2e2' : '#dcfce7', color: simResult.includes("❌") ? '#991b1b' : '#166534', fontWeight: '700', fontSize: '15px', display:'flex', alignItems:'center', gap:'10px' }}>
                    {simResult}
                </div>
            )}
        </div>

        {/* GOAL TRACKER */}
        <div className="glass-panel" style={{position: 'relative'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px'}}>
                <div style={{padding:'10px', background:'#fdf4ff', borderRadius:'12px'}}><Target size={24} color="#d946ef" /></div>
                <h3 style={{fontSize:'20px', fontWeight:'700', margin:0}}>Active Goal</h3>
            </div>
            {goals.length > 0 ? (
                goals.slice(0, 1).map((goal: any) => {
                    const percent = Math.min(100, (currentBalance / goal.target_amount) * 100);
                    return (
                        <div key={goal.id || goal._id}>
                            <button 
                                onClick={async () => { 
                                    const token = localStorage.getItem("token"); 
                                    await fetch(`http://127.0.0.1:8000/api/goals/${goal.id || goal._id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } }); 
                                    fetchData(); 
                                }} 
                                className="btn-icon-sm"
                                style={{ position: 'absolute', top: '20px', right: '20px' }}
                                title="Delete Goal"
                            >
                                <Trash2 size={18}/>
                            </button>

                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px', paddingRight: '25px'}}>
                                <span style={{fontWeight:'700', fontSize:'16px', color:'#1e293b'}}>{goal.title}</span>
                                <span style={{fontWeight:'600', color:'#64748b'}}>₹{currentBalance} / ₹{goal.target_amount}</span>
                            </div>
                            <div className="progress-bar-bg"><div className="progress-bar-fill" style={{width: `${percent}%`}}></div></div>
                            <p style={{fontSize:'13px', color:'#94a3b8', marginTop:'12px'}}>
                                {percent >= 100 ? "🎉 Goal Achieved! Buy it!" : `You are ${percent.toFixed(0)}% there!`}
                            </p>
                        </div>
                    );
                })
            ) : (
                <div style={{ color: '#94a3b8', fontSize: '15px', fontStyle:'italic', padding:'20px', textAlign:'center' }}>No active goals. Ask the AI Coach to "Set a goal"!</div>
            )}
        </div>
      </div>

      <div className="dashboard-grid-2">
        <div className="glass-panel">
          <h3 style={{fontSize:'20px', fontWeight:'700', marginBottom:'20px'}}>Spending Trends</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{borderRadius:'16px', border:'none', boxShadow:'0 10px 40px rgba(0,0,0,0.1)'}} />
                <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={4} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel">
          <h3 style={{fontSize:'20px', fontWeight:'700', marginBottom:'20px'}}>Recent Transactions</h3>
          <div className="tx-list-compact">
            {transactions.slice(0, 5).map((tx: any) => (
                <div key={tx._id || tx.id} className="tx-item">
                    <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                        <div className={`icon-box ${tx.transaction_type === 'credit' ? 'income' : 'expense'}`}>
                            {tx.transaction_type === 'credit' ? <ArrowDownLeft size={20}/> : <ArrowUpRight size={20}/>}
                        </div>
                        <div>
                            <div className="tx-desc">{tx.description}</div>
                            <div className="tx-cat">{tx.category}</div>
                        </div>
                    </div>
                    <span className={tx.transaction_type === 'credit' ? 'text-green' : 'text-red'}>
                        {tx.transaction_type === 'credit' ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                    </span>
                </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <button onClick={() => setShowModal(false)} className="close-btn"><X size={24} /></button>
            
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                <h2 style={{fontSize:'24px', fontWeight:'800', color:'#1e293b'}}>Add Transaction</h2>
                <button 
                    onClick={() => setIsMagicMode(!isMagicMode)}
                    className="magic-button-glow"
                    style={{fontSize:'12px', padding:'5px 10px', borderRadius:'15px', cursor:'pointer'}}
                >
                    {isMagicMode ? "Switch to Manual" : "✨ Switch to Magic AI"}
                </button>
            </div>

            {isMagicMode ? (
                <div style={{textAlign:'center', padding:'20px 0'}}>
                    <div style={{marginBottom:'15px', fontSize:'14px', color:'#64748b'}}>
                        Type naturally: <br/> <i>"Spent 450 on uber to airport"</i>
                    </div>
                    <textarea 
                        value={magicText}
                        onChange={(e) => setMagicText(e.target.value)}
                        placeholder="Tell AI what you spent..."
                        style={{width:'100%', height:'80px', padding:'15px', borderRadius:'16px', border:'2px solid #a5b4fc', outline:'none', fontSize:'16px', marginBottom:'15px'}}
                    />
                    <button 
                        onClick={handleMagicParse} 
                        disabled={isMagicLoading}
                        className="btn-primary-glow" 
                        style={{width:'100%', justifyContent:'center'}}
                    >
                        {isMagicLoading ? "AI is Reading..." : "✨ Auto-Fill Form"}
                    </button>
                </div>
            ) : (
                <form onSubmit={handleAddTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* NEW: TRANSACTION TYPE TOGGLE */}
                    <div style={{display:'flex', gap:'10px', background:'#f1f5f9', padding:'5px', borderRadius:'12px'}}>
                        <button 
                            type="button"
                            onClick={() => setFormData({...formData, transaction_type: "debit"})}
                            style={{
                                flex: 1, padding:'10px', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight:'600',
                                background: formData.transaction_type === 'debit' ? '#ef4444' : 'transparent',
                                color: formData.transaction_type === 'debit' ? 'white' : '#64748b'
                            }}
                        >
                            Expense 💸
                        </button>
                        <button 
                            type="button"
                            onClick={() => setFormData({...formData, transaction_type: "credit"})}
                            style={{
                                flex: 1, padding:'10px', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight:'600',
                                background: formData.transaction_type === 'credit' ? '#10b981' : 'transparent',
                                color: formData.transaction_type === 'credit' ? 'white' : '#64748b'
                            }}
                        >
                            Income 💰
                        </button>
                    </div>

                    <input type="text" placeholder="Description" required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="input-glass" />
                    
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <input type="number" placeholder="Amount (₹)" required value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="input-glass" style={{flex: 1}} />
                        
                        {showDatePicker ? (
                            <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="input-glass" />
                        ) : (
                            <button type="button" onClick={() => setShowDatePicker(true)} className="btn-date" style={{padding:'14px', borderRadius:'14px', border:'1px solid #cbd5e1', background:'#f8fafc', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', fontSize:'14px'}}>
                                <Calendar size={18} /> {formData.date === new Date().toISOString().slice(0, 10) ? "Today" : formData.date}
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Users size={20} color="#64748b" />
                            <span style={{ fontSize: '15px', color: '#475569', fontWeight:'500' }}>Split Bill?</span>
                        </div>
                        <input type="checkbox" checked={isSplit} onChange={(e) => setIsSplit(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#8b5cf6' }} />
                    </div>

                    {isSplit && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#eff6ff', padding: '15px', borderRadius: '16px' }}>
                            <span style={{ fontSize: '14px', fontWeight:'600', color:'#1e293b' }}>Split with:</span>
                            <select value={splitCount} onChange={(e) => setSplitCount(Number(e.target.value))} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #bfdbfe', background:'white', outline:'none' }}>
                                <option value="2">1 Friend</option>
                                <option value="3">2 Friends</option>
                                <option value="4">3 Friends</option>
                            </select>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#3b82f6', marginLeft:'auto' }}>
                                My Share: ₹{(Number(formData.amount) / splitCount).toFixed(0)}
                            </span>
                        </div>
                    )}

                    <button type="submit" className="btn-primary-glow" style={{justifyContent: 'center', marginTop:'10px'}}>Save Transaction</button>
                </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}