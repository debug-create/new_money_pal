import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function Analytics() {
  const [pieData, setPieData] = useState([]);
  const [barData, setBarData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const response = await fetch("http://127.0.0.1:8000/api/transactions/", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const transactions = await response.json();
                
                // 1. Process Pie Data
                const categoryMap: Record<string, number> = {};
                transactions.forEach((t: any) => {
                    if (t.transaction_type === "debit") {
                        categoryMap[t.category] = (categoryMap[t.category] || 0) + Number(t.amount);
                    }
                });
                const newPieData = Object.keys(categoryMap).map((cat, index) => ({
                    name: cat, value: categoryMap[cat],
                    color: ["#8b5cf6", "#ec4899", "#3b82f6", "#14b8a6", "#f59e0b"][index % 5]
                }));
                setPieData(newPieData as any);

                // 2. Process Bar Data
                const income = transactions.filter((t: any) => t.transaction_type === "credit").reduce((a:any, b:any) => a + Number(b.amount), 0);
                const expense = transactions.filter((t: any) => t.transaction_type === "debit").reduce((a:any, b:any) => a + Number(b.amount), 0);
                setBarData([{ name: "Overview", income, expense }] as any);
            }
        } catch (error) { console.error("Analytics fetch error", error); }
    };
    fetchData();
  }, []);

  // Custom Tooltip to show ₹
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#1e293b' }}>{payload[0].name}</p>
          <p style={{ margin: 0, color: payload[0].payload.color || '#8b5cf6' }}>
            ₹{payload[0].value.toLocaleString('en-IN')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Financial Analytics</h1>
        <p>Real-time visualization of your spending habits.</p>
      </div>
      <div className="dashboard-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="glass-panel" style={{ minHeight: '400px', padding: '20px', backgroundColor: 'white', borderRadius: '20px' }}>
          <h3>Spending Breakdown</h3>
          <div className="chart-wrapper" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {pieData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-panel" style={{ minHeight: '400px', padding: '20px', backgroundColor: 'white', borderRadius: '20px' }}>
            <h3>Cash Flow Analysis</h3>
            <div className="chart-wrapper" style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px'}} />
                        <Legend />
                        <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={40} name="Income" />
                        <Bar dataKey="expense" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={40} name="Expense" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
}