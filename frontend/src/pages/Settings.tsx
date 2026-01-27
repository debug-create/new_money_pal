import { useState, useEffect } from "react";
import { User, Bell, Globe, Camera, ToggleLeft, ToggleRight, Shield } from "lucide-react";

export default function Settings() {
  const [profile, setProfile] = useState<any>(null);
  const [emailAlerts, setEmailAlerts] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch("http://127.0.0.1:8000/api/users/me", { headers: { "Authorization": `Bearer ${token}` } });
        if (res.ok) setProfile(await res.json());
    };
    fetchProfile();
  }, []);

  if (!profile) return <div style={{padding:'40px', textAlign: 'center'}}>Loading Profile...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 style={{fontSize:'32px', fontWeight:'800', color:'#1e293b'}}>Settings</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '30px', alignItems:'start' }}>
        
        {/* LEFT: Profile Card */}
        <div className="glass-panel" style={{textAlign:'center', padding:'50px 30px'}}>
          <div style={{width:'110px', height:'110px', borderRadius:'50%', background:'linear-gradient(135deg, #8b5cf6, #6366f1)', color:'white', fontSize:'40px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 25px auto', boxShadow:'0 15px 30px rgba(139, 92, 246, 0.4)'}}>
            {profile.full_name?.charAt(0).toUpperCase()}
          </div>
          <h2 style={{fontSize:'24px', fontWeight:'800', margin:'0 0 5px 0'}}>{profile.full_name}</h2>
          <p style={{color:'#8b5cf6', fontWeight:'700', margin:0, fontSize:'14px', textTransform:'uppercase', letterSpacing:'1px'}}>Premium Member</p>
          
          <div style={{marginTop:'40px', padding:'20px', background:'#f8fafc', borderRadius:'16px', textAlign:'left', border:'1px solid #e2e8f0'}}>
             <label style={{fontSize:'11px', fontWeight:'700', color:'#94a3b8', letterSpacing:'0.5px', display:'block', marginBottom:'5px'}}>EMAIL ADDRESS</label>
             <div style={{color:'#334155', fontWeight:'600', fontSize:'15px'}}>{profile.email}</div>
          </div>
        </div>
        
        {/* RIGHT: Preferences */}
        <div style={{display:'flex', flexDirection:'column', gap:'30px'}}>
          
          <div className="glass-panel">
            <h3 style={{marginTop:0, marginBottom:'25px', display:'flex', alignItems:'center', gap:'12px', fontSize:'20px', fontWeight:'700'}}><Globe size={24} color="#8b5cf6"/> Preferences</h3>
            
            <div style={{display:'flex', justifyContent:'space-between', padding:'15px 0', borderBottom:'1px solid #f1f5f9', alignItems:'center'}}>
                <div><span style={{fontWeight:'600', display:'block', fontSize:'15px'}}>Currency</span><span style={{fontSize:'13px', color:'#64748b'}}>Select your display currency</span></div>
                <select className="input-glass" style={{width:'auto', padding:'8px 15px'}}><option>INR (₹)</option><option>USD ($)</option></select>
            </div>

            <div style={{display:'flex', justifyContent:'space-between', padding:'15px 0', alignItems:'center'}}>
                <div><span style={{fontWeight:'600', display:'block', fontSize:'15px'}}>Monthly Budget</span><span style={{fontSize:'13px', color:'#64748b'}}>Edit your spending limit</span></div>
                <input type="number" defaultValue={profile.monthly_allowance} className="input-glass" style={{width:'120px', padding:'8px 15px'}} />
            </div>
          </div>

          <div className="glass-panel">
            <h3 style={{marginTop:0, marginBottom:'25px', display:'flex', alignItems:'center', gap:'12px', fontSize:'20px', fontWeight:'700'}}><Bell size={24} color="#8b5cf6"/> Notifications</h3>
            <div style={{display:'flex', justifyContent:'space-between', padding:'10px 0', alignItems:'center'}}>
                <div>
                    <div style={{fontWeight:'600', fontSize:'15px'}}>Budget Alerts</div>
                    <div style={{fontSize:'13px', color:'#64748b'}}>Get notified when you hit 80%</div>
                </div>
                <button onClick={() => setEmailAlerts(!emailAlerts)} style={{background:'none', border:'none', cursor:'pointer'}}>
                    {emailAlerts ? <ToggleRight size={44} color="#8b5cf6" fill="#f3e8ff"/> : <ToggleLeft size={44} color="#cbd5e1"/>}
                </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}