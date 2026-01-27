import { useEffect, useState } from "react";
import { Search, Download, Plus, ArrowUpRight, ArrowDownLeft, Sparkles, X, Loader2 } from "lucide-react";

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // AI Audit States
  const [auditResult, setAuditResult] = useState("");
  const [isAuditing, setIsAuditing] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // --- 1. LOAD REAL DATA ---
  useEffect(() => {
    const fetchTransactions = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const response = await fetch("http://127.0.0.1:8000/api/transactions/", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTransactions(data);
            }
        } catch (error) {
            console.error("Fetch error", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchTransactions();
  }, []);

  // --- 2. EXPORT FUNCTION ---
  const handleExport = () => {
    if (transactions.length === 0) return alert("No data to export!");
    
    const headers = ["Date", "Description", "Category", "Type", "Amount"];
    const csvRows = [
      headers.join(","),
      ...transactions.map(tx => [
        new Date(tx.date).toLocaleDateString(),
        `"${tx.description.replace(/"/g, '""')}"`,
        tx.category,
        tx.transaction_type,
        tx.amount
      ].join(","))
    ];
    
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `moneypal_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- 3. AI AUDIT FUNCTION ---
  const handleAIAudit = async () => {
    setIsAuditing(true);
    setShowAuditModal(true);
    setAuditResult(""); 

    try {
        const token = localStorage.getItem("token");
        // Send top 20 transactions for analysis
        const recentTx = transactions.slice(0, 20); 
        
        const response = await fetch("http://127.0.0.1:8000/api/audit", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ transactions: recentTx })
        });
        
        const data = await response.json();
        setAuditResult(data.audit);
    } catch (err) {
        setAuditResult("My brain is offline. Please try again later!");
    } finally {
        setIsAuditing(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesFilter = filter === "All" ? true : 
      filter === "Income" ? tx.transaction_type === "credit" : 
      filter === "Expense" ? tx.transaction_type === "debit" : true; 
    
    const desc = tx.description ? tx.description.toLowerCase() : "";
    return matchesFilter && desc.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
            <h1>Transactions</h1>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Manage and export your expenses.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleAIAudit} className="btn-primary-sm" style={{display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', padding: '10px 20px', borderRadius: '10px', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>
                <Sparkles size={18} /> AI Audit
            </button>
            <button onClick={handleExport} className="btn-outline" style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer', fontWeight: 'bold', color: '#64748b'}}>
                <Download size={18} /> Export
            </button>
        </div>
      </div>

      {/* FILTER BAR (Fixed Layout) */}
      <div className="controls-bar glass-panel" style={{ 
          marginTop: '24px', 
          backgroundColor: 'white', 
          padding: '15px', 
          borderRadius: '16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          gap: '20px', 
          flexWrap: 'wrap' // Allows wrapping on small screens
      }}>
        <div className="search-wrapper" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            backgroundColor: '#f1f5f9', 
            padding: '10px 15px', 
            borderRadius: '12px', 
            flex: '1', // Takes available space
            minWidth: '200px' 
        }}>
          <Search className="search-icon" size={18} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '10px', width: '100%', fontSize: '15px' }} 
          />
        </div>
        
        <div className="filter-tabs" style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {["All", "Income", "Expense"].map(type => (
            <button 
                key={type} 
                className={`filter-tab ${filter === type ? 'active' : ''}`} 
                onClick={() => setFilter(type)}
                style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '600',
                    backgroundColor: filter === type ? '#ede9fe' : 'transparent',
                    color: filter === type ? '#8b5cf6' : '#64748b',
                    transition: 'all 0.2s'
                }}
            >
                {type}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="glass-panel table-container" style={{ marginTop: '24px' }}>
        <table className="custom-table">
          <thead><tr><th>Transaction</th><th>Category</th><th>Date</th><th>Type</th><th>Amount</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={5} style={{textAlign: 'center', padding:'20px'}}>Loading...</td></tr> : 
             filteredTransactions.length > 0 ? filteredTransactions.map((tx) => (
              <tr key={tx.id || tx._id}>
                <td>
                  <div className="tx-info">
                    <div className={`icon-box ${tx.transaction_type === 'credit' ? 'income' : 'expense'}`}>
                      {tx.transaction_type === 'credit' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                    </div>
                    {tx.description}
                  </div>
                </td>
                <td><span className="category-tag">{tx.category}</span></td>
                <td style={{ color: 'var(--text-muted)' }}>{new Date(tx.date).toLocaleDateString()}</td>
                <td><span className={`status-badge ${tx.transaction_type === 'credit' ? 'completed' : 'pending'}`}>{tx.transaction_type === 'credit' ? 'Income' : 'Expense'}</span></td>
                <td className={`amount ${tx.transaction_type === 'credit' ? 'income' : 'expense'}`}>
                  {tx.transaction_type === 'credit' ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                </td>
              </tr>
            )) : <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* SCROLLABLE AUDIT MODAL (Fixed Header) */}
      {showAuditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '500px', maxWidth: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                
                {/* 1. HEADER (Locked at top) */}
                <div style={{ padding: '20px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{width: '40px', height: '40px', background: '#f3e8ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            <Sparkles size={20} color="#9333ea" />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Smart Audit</h2>
                    </div>
                    {/* The X Button is now safe inside this locked header */}
                    <button onClick={() => setShowAuditModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                        <X size={24} />
                    </button>
                </div>
                
                {/* 2. BODY (This part scrolls) */}
                <div style={{ padding: '25px', overflowY: 'auto' }}>
                    {isAuditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', padding: '30px 0' }}>
                            <Loader2 className="animate-spin" size={40} color="#8b5cf6" />
                            <p style={{ color: '#64748b', fontSize: '14px' }}>Analyzing spending patterns...</p>
                        </div>
                    ) : (
                        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#334155', lineHeight: '1.6', fontSize: '15px', whiteSpace: 'pre-wrap' }}>
                            {auditResult}
                        </div>
                    )}
                </div>

            </div>
        </div>
      )}

    </div>
  );
}