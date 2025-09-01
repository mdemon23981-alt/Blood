import React, { useEffect, useState } from "react";

/**
 BloodConnect — Single File React (Tailwind)
 ---------------------------------------------
 - Default export: <BloodDonationApp />
 - TailwindCSS utility classes are used for styling.
 - Persists data to localStorage so you can test without a backend.
 - Optional: connect to Firebase or Supabase by replacing the save/load functions.

 Sections included:
  - Hero / Intro
  - Donor Registration Form
  - Donor Directory + Search / Filter
  - Blood Request Form
  - Requests List (admin view)
  - Simple notifications & validation

 How to use:
 1) Drop this file into a React app (Create React App / Vite) with Tailwind configured.
 2) Optional: Replace the localStorage helpers with API calls to your backend or Firebase.
 3) Deploy to Vercel / Netlify / GitHub Pages.

 NOTE: This is a starter app. For production you must add security, validation, rate-limits,
       spam protection (captcha), and a real backend with authentication.
*/

const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

// --- helpers: localStorage persistence (replace with API as needed) ---
const STORAGE_KEYS = { donors: "bd_donors_v1", requests: "bd_requests_v1" };

function loadDonors() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.donors);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("loadDonors", e);
    return [];
  }
}
function saveDonors(list) {
  localStorage.setItem(STORAGE_KEYS.donors, JSON.stringify(list));
}

function loadRequests() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.requests);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("loadRequests", e);
    return [];
  }
}
function saveRequests(list) {
  localStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(list));
}

// --- small UI components ---
function Badge({ children, className = "" }){
  return <span className={`inline-block px-2 py-1 text-xs rounded-full border ${className}`}>{children}</span>;
}

function Input({ label, ...rest }){
  return (
    <label className="block text-sm">
      <div className="text-slate-700 mb-1">{label}</div>
      <input {...rest} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
    </label>
  );
}

function Textarea({ label, ...rest }){
  return (
    <label className="block text-sm">
      <div className="text-slate-700 mb-1">{label}</div>
      <textarea {...rest} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
    </label>
  );
}

// --- main app ---
export default function BloodDonationApp(){
  const [donors, setDonors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState({ q: "", blood: "", city: "" });
  const [message, setMessage] = useState(null);
  const [view, setView] = useState("home"); // home | donor | find | request | admin

  useEffect(() => {
    setDonors(loadDonors());
    setRequests(loadRequests());
  }, []);

  useEffect(() => saveDonors(donors), [donors]);
  useEffect(() => saveRequests(requests), [requests]);

  // --- Donor form submit ---
  function addDonor(e, formEl){
    e.preventDefault();
    const fd = new FormData(formEl);
    const donor = {
      id: Date.now().toString(),
      name: (fd.get('name') || '').trim(),
      phone: (fd.get('phone') || '').trim(),
      blood: (fd.get('blood') || '').trim(),
      city: (fd.get('city') || '').trim(),
      last_donated: (fd.get('last_donated') || '').trim(),
      note: (fd.get('note') || '').trim(),
      created_at: new Date().toISOString()
    };
    if(!donor.name || !donor.phone || !donor.blood){
      notify('দয়া করে নাম, ফোন এবং রক্ত গ্রুপ দিন');
      return;
    }
    setDonors(prev => [donor, ...prev]);
    formEl.reset();
    notify('ধন্যবাদ! আপনি ডোনার হিসেবে রেজিস্ট্রেশন করেছেন।');
    setView('find');
  }

  // --- Request form submit ---
  function addRequest(e, formEl){
    e.preventDefault();
    const fd = new FormData(formEl);
    const req = {
      id: Date.now().toString(),
      name: (fd.get('name') || '').trim(),
      phone: (fd.get('phone') || '').trim(),
      blood: (fd.get('blood') || '').trim(),
      city: (fd.get('city') || '').trim(),
      hospital: (fd.get('hospital') || '').trim(),
      note: (fd.get('note') || '').trim(),
      created_at: new Date().toISOString(),
      fulfilled: false
    };
    if(!req.name || !req.phone || !req.blood){
      notify('দয়া করে নাম, ফোন ও রক্তের গ্রুপ দিন');
      return;
    }
    setRequests(prev => [req, ...prev]);
    formEl.reset();
    notify('আপনার রিকোয়েস্ট জমা হয়েছে — আমরা দ্রুত আপডেট রাখবো।');
    setView('home');
  }

  function notify(text, type = 'info'){
    setMessage({text, type});
    setTimeout(() => setMessage(null), 3500);
  }

  // --- search donors by blood & city & q ---
  function filteredDonors(){
    return donors.filter(d => {
      if(filter.blood && d.blood !== filter.blood) return false;
      if(filter.city && (!d.city || !d.city.toLowerCase().includes(filter.city.toLowerCase()))) return false;
      if(filter.q){
        const q = filter.q.toLowerCase();
        return (d.name && d.name.toLowerCase().includes(q)) || (d.phone && d.phone.includes(q));
      }
      return true;
    });
  }

  // --- Admin: mark request fulfilled ---
  function toggleFulfilled(id){
    setRequests(prev => prev.map(r => r.id === id ? {...r, fulfilled: !r.fulfilled} : r));
  }

  // --- small export/import to move data between devices ---
  function exportData(){
    const payload = { donors, requests };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'blood-donation-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  function importData(e){
    const f = e.target.files?.[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const obj = JSON.parse(reader.result);
        if(Array.isArray(obj.donors)) setDonors(obj.donors);
        if(Array.isArray(obj.requests)) setRequests(obj.requests);
        notify('ডেটা ইম্পোর্ট সম্পন্ন');
      }catch(err){
        notify('ফাইল পড়ে সমস্যা হয়েছে', 'error');
      }
    }
    reader.readAsText(f);
  }

  // --- small formatted time ---
  function timeAgo(iso){
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if(mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if(hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <nav className="bg-white shadow sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-600 grid place-content-center text-white font-bold">BD</div>
            <div>
              <div className="font-bold">BloodConnect</div>
              <div className="text-xs text-slate-500">Donate & Request</div>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={() => setView('home')} className={`px-3 py-2 rounded-lg ${view==='home' ? 'bg-slate-100' : ''}`}>Home</button>
            <button onClick={() => setView('donor')} className={`px-3 py-2 rounded-lg ${view==='donor' ? 'bg-slate-100' : ''}`}>Donor</button>
            <button onClick={() => setView('find')} className={`px-3 py-2 rounded-lg ${view==='find' ? 'bg-slate-100' : ''}`}>Find Donor</button>
            <button onClick={() => setView('request')} className={`px-3 py-2 rounded-lg ${view==='request' ? 'bg-slate-100' : ''}`}>Request Blood</button>
            <div className="hidden sm:flex items-center gap-2 border rounded-lg px-2 py-1">
              <input className="w-28 text-sm px-2 py-1 outline-none" placeholder="Search name/phone" value={filter.q} onChange={e=>setFilter(f=>({...f,q:e.target.value}))} />
              <select className="text-sm px-2 py-1 rounded" value={filter.blood} onChange={e=>setFilter(f=>({...f,blood:e.target.value}))}>
                <option value="">All</option>
                {BLOOD_GROUPS.map(b=> <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="border-l pl-3 ml-3">
              <button onClick={()=>{exportData(); notify('ডেটা এক্সপোর্ট করা হয়েছে');}} className="text-sm">Export</button>
            </div>
            <div className="pl-3">
              <label className="text-sm cursor-pointer">
                <input type="file" accept="application/json" onChange={importData} className="hidden" />
                Import
              </label>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg ${message.type==='error' ? 'bg-red-100 text-red-700' : 'bg-indigo-50 text-indigo-700'}`}>{message.text}</div>
        )}

        {view === 'home' && (
          <section className="grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h1 className="text-3xl font-bold">রক্ত দিন, জীবন বাঁচান</h1>
              <p className="mt-3 text-slate-600">BloodConnect-এ আপনি সহজেই ডোনার হিসেবে রেজিস্টার করতে পারবেন অথবা রক্তের অনুরোধ পোস্ট করতে পারবেন। স্থানীয় ডোনার খুঁজে নিন, দ্রুত যোগাযোগ করুন।</p>

              <div className="mt-6 flex gap-3 flex-wrap">
                <button onClick={()=>setView('donor')} className="px-5 py-3 rounded-lg bg-red-600 text-white">ডোনার হিসেবে রেজিস্টার</button>
                <button onClick={()=>setView('find')} className="px-5 py-3 rounded-lg border">ডোনার খুঁজুন</button>
                <button onClick={()=>setView('request')} className="px-5 py-3 rounded-lg border">রক্তের আবেদন</button>
              </div>

              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-white border text-center">
                  <div className="text-2xl font-bold">{donors.length}</div>
                  <div className="text-xs text-slate-500">Registered Donors</div>
                </div>
                <div className="p-3 rounded-lg bg-white border text-center">
                  <div className="text-2xl font-bold">{requests.length}</div>
                  <div className="text-xs text-slate-500">Requests</div>
                </div>
                <div className="p-3 rounded-lg bg-white border text-center">
                  <div className="text-2xl font-bold">{BLOOD_GROUPS.length}</div>
                  <div className="text-xs text-slate-500">Groups</div>
                </div>
                <div className="p-3 rounded-lg bg-white border text-center">
                  <div className="text-2xl font-bold">Free</div>
                  <div className="text-xs text-slate-500">Starter</div>
                </div>
              </div>

            </div>
            <div className="rounded-lg bg-white border p-6">
              <h3 className="font-semibold">Urgent Requests</h3>
              <div className="mt-3 space-y-3">
                {requests.length === 0 && <div className="text-sm text-slate-500">কোনো জরুরি রিকোয়েস্ট নেই</div>}
                {requests.map(r => (
                  <div key={r.id} className="p-3 border rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{r.name} • {r.blood}</div>
                        <div className="text-sm text-slate-600">{r.hospital || r.city}</div>
                      </div>
                      <div className="text-xs text-slate-500">{timeAgo(r.created_at)}</div>
                    </div>
                    <div className="mt-2 text-sm">{r.note}</div>
                    <div className="mt-2 flex gap-2">
                      <a href={`tel:${r.phone}`} className="text-sm px-3 py-1 rounded bg-green-50 border">Call</a>
                      <a href={`https://wa.me/${r.phone.replace(/[^0-9]/g,'')}`} target="_blank" rel="noreferrer" className="text-sm px-3 py-1 rounded bg-green-50 border">WhatsApp</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {view === 'donor' && (
          <section className="grid md:grid-cols-2 gap-6">
            <div className="rounded-lg bg-white border p-6">
              <h2 className="font-bold text-xl">Donor Registration</h2>
              <p className="text-sm text-slate-600 mt-1">আপনি যদি রক্ত দান করতে চান, নিচের ফর্ম পূরণ করে সাবমিট করুন।</p>
              <form className="mt-4 space-y-3" onSubmit={(e)=>addDonor(e,e.target)}>
                <Input name="name" label="Name" required />
                <Input name="phone" label="Phone (WhatsApp compatible)" required />
                <label className="block text-sm">
                  <div className="text-slate-700 mb-1">Blood Group</div>
                  <select name="blood" required className="w-full px-3 py-2 rounded-lg border border-slate-300">
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map(b=> <option key={b} value={b}>{b}</option>)}
                  </select>
                </label>
                <Input name="city" label="City / District" />
                <Input name="last_donated" label="Last Donated (YYYY-MM-DD)" placeholder="optional" />
                <Textarea name="note" label="Note (any info like blood pressure / health)" />
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 rounded-lg bg-red-600 text-white">Register</button>
                  <button type="button" onClick={()=>{navigator.clipboard?.writeText(window.location.href); notify('Share link copied');}} className="px-4 py-2 rounded-lg border">Share</button>
                </div>
              </form>
            </div>

            <div className="rounded-lg bg-white border p-6">
              <h3 className="font-semibold">Local Donors — Search</h3>
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="City" value={filter.city} onChange={e=>setFilter(f=>({...f,city:e.target.value}))} className="px-3 py-2 rounded border" />
                  <select value={filter.blood} onChange={e=>setFilter(f=>({...f,blood:e.target.value}))} className="px-3 py-2 rounded border">
                    <option value="">All blood groups</option>
                    {BLOOD_GROUPS.map(b=> <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="mt-2">
                  <div className="text-xs text-slate-500">Found {filteredDonors().length} donors</div>
                  <div className="mt-2 space-y-2 max-h-96 overflow-auto">
                    {filteredDonors().map(d => (
                      <div key={d.id} className="p-3 border rounded flex justify-between items-center">
                        <div>
                          <div className="font-semibold">{d.name} <span className="text-sm text-slate-500">• {d.city}</span></div>
                          <div className="text-sm text-slate-600">{d.blood} • {d.phone}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <a href={`tel:${d.phone}`} className="text-sm px-3 py-1 rounded bg-green-50 border">Call</a>
                          <a href={`https://wa.me/${d.phone.replace(/[^0-9]/g,'')}`} target="_blank" rel="noreferrer" className="text-sm px-3 py-1 rounded bg-green-50 border">WhatsApp</a>
                        </div>
                      </div>
                    ))}
                    {filteredDonors().length === 0 && <div className="text-sm text-slate-500">কোনো ডোনার পাওয়া যায়নি — চাইলে রেজিস্ট্রেশন করুন।</div>}
                  </div>
                </div>

              </div>
            </div>
          </section>
        )}

        {view === 'find' && (
          <section>
            <h2 className="font-bold text-xl mb-3">Find Donors</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-lg bg-white border p-4">
                <div className="text-sm text-slate-600">Filter</div>
                <div className="mt-3 space-y-2">
                  <input placeholder="Name or phone" value={filter.q} onChange={e=>setFilter(f=>({...f,q:e.target.value}))} className="w-full px-3 py-2 rounded border" />
                  <input placeholder="City" value={filter.city} onChange={e=>setFilter(f=>({...f,city:e.target.value}))} className="w-full px-3 py-2 rounded border" />
                  <select value={filter.blood} onChange={e=>setFilter(f=>({...f,blood:e.target.value}))} className="w-full px-3 py-2 rounded border">
                    <option value="">Any blood group</option>
                    {BLOOD_GROUPS.map(b=> <option key={b} value={b}>{b}</option>)}
                  </select>
                  <div className="mt-2 flex gap-2">
                    <button onClick={()=>{setFilter({q:'',blood:'',city:''});}} className="px-3 py-2 rounded border">Clear</button>
                    <button onClick={()=>notify('Search applied')} className="px-3 py-2 rounded bg-indigo-600 text-white">Search</button>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 rounded-lg bg-white border p-4">
                <div className="text-sm text-slate-600 mb-2">Results ({filteredDonors().length})</div>
                <div className="space-y-3 max-h-96 overflow-auto">
                  {filteredDonors().map(d => (
                    <div key={d.id} className="p-3 border rounded flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{d.name} • <span className="text-sm text-slate-500">{d.city}</span></div>
                        <div className="text-sm text-slate-600">{d.blood} • {d.phone}</div>
                        <div className="text-xs text-slate-400">Registered {timeAgo(d.created_at)}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <a href={`tel:${d.phone}`} className="text-sm px-3 py-1 rounded bg-green-50 border">Call</a>
                        <a href={`https://wa.me/${d.phone.replace(/[^0-9]/g,'')}`} target="_blank" rel="noreferrer" className="text-sm px-3 py-1 rounded bg-green-50 border">WhatsApp</a>
                      </div>
                    </div>
                  ))}
                  {filteredDonors().length === 0 && <div className="text-sm text-slate-500">কোনো ডোনার পাওয়া যায়নি</div>}
                </div>
              </div>
            </div>
          </section>
        )}

        {view === 'request' && (
          <section className="grid md:grid-cols-2 gap-6">
            <div className="rounded-lg bg-white border p-6">
              <h2 className="font-bold text-xl">Request Blood</h2>
              <p className="text-sm text-slate-600 mt-1">রক্ত প্রয়োজন হলে এই ফর্ম পূরণ করুন। আপনি চাইলে ফোন এবং হসপিটাল ডিটেইলস যোগ করতে পারবেন।</p>
              <form className="mt-4 space-y-3" onSubmit={(e)=>addRequest(e,e.target)}>
                <Input name="name" label="Patient / Requester Name" required />
                <Input name="phone" label="Contact Phone (WhatsApp)" required />
                <label className="block text-sm">
                  <div className="text-slate-700 mb-1">Blood Group</div>
                  <select name="blood" required className="w-full px-3 py-2 rounded-lg border border-slate-300">
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map(b=> <option key={b} value={b}>{b}</option>)}
                  </select>
                </label>
                <Input name="city" label="City / District" />
                <Input name="hospital" label="Hospital / Location" />
                <Textarea name="note" label="Note (urgency, units needed, patient info)" />
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 rounded-lg bg-red-600 text-white">Submit Request</button>
                  <button type="button" onClick={()=>{setRequests([]); notify('All requests cleared (local only)')}} className="px-4 py-2 rounded-lg border">Clear</button>
                </div>
              </form>
            </div>

            <div className="rounded-lg bg-white border p-6">
              <h3 className="font-semibold">Recent Requests</h3>
              <div className="mt-3 space-y-3 max-h-96 overflow-auto">
                {requests.map(r => (
                  <div key={r.id} className={`p-3 border rounded ${r.fulfilled ? 'opacity-60' : ''}`}>
                    <div className="flex justify-between">
                      <div>
                        <div className="font-semibold">{r.name} • {r.blood}</div>
                        <div className="text-sm text-slate-600">{r.hospital || r.city}</div>
                      </div>
                      <div className="text-xs text-slate-500">{timeAgo(r.created_at)}</div>
                    </div>
                    <div className="mt-2 text-sm">{r.note}</div>
                    <div className="mt-2 flex gap-2">
                      <a href={`tel:${r.phone}`} className="text-sm px-3 py-1 rounded bg-green-50 border">Call</a>
                      <a href={`https://wa.me/${r.phone.replace(/[^0-9]/g,'')}`} target="_blank" rel="noreferrer" className="text-sm px-3 py-1 rounded bg-green-50 border">WhatsApp</a>
                      <button onClick={()=>toggleFulfilled(r.id)} className="text-sm px-3 py-1 rounded border">{r.fulfilled ? 'Mark Unfulfilled' : 'Mark Fulfilled'}</button>
                    </div>
                  </div>
                ))}
                {requests.length === 0 && <div className="text-sm text-slate-500">কোনো রিকোয়েস্ট পাওয়া যায়নি</div>}
              </div>
            </div>
          </section>
        )}

        {view === 'admin' && (
          <section>
            <h2 className="font-bold text-xl mb-3">Admin</h2>
            <div className="rounded-lg bg-white border p-4">
              <div className="text-sm text-slate-600">Manage donors & requests (local only)</div>
              <div className="mt-3 grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Donors ({donors.length})</h3>
                  <div className="mt-2 space-y-2 max-h-72 overflow-auto">
                    {donors.map(d=> (
                      <div key={d.id} className="p-3 border rounded flex justify-between items-center">
                        <div>
                          <div className="font-semibold">{d.name}</div>
                          <div className="text-sm text-slate-600">{d.blood} • {d.city} • {d.phone}</div>
                        </div>
                        <div>
                          <button onClick={()=>{setDonors(prev=>prev.filter(x=>x.id!==d.id)); notify('Donor removed')}} className="px-3 py-1 rounded border text-sm">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">Requests ({requests.length})</h3>
                  <div className="mt-2 space-y-2 max-h-72 overflow-auto">
                    {requests.map(r=> (
                      <div key={r.id} className="p-3 border rounded flex justify-between items-center">
                        <div>
                          <div className="font-semibold">{r.name} • {r.blood}</div>
                          <div className="text-sm text-slate-600">{r.hospital} • {r.phone}</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={()=>toggleFulfilled(r.id)} className="px-3 py-1 rounded border text-sm">{r.fulfilled? 'Unfulfill':'Fulfill'}</button>
                          <button onClick={()=>{setRequests(prev=>prev.filter(x=>x.id!==r.id)); notify('Request removed')}} className="px-3 py-1 rounded border text-sm">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <footer className="mt-12 text-sm text-slate-500 text-center">Built with ❤️ — This is a starter demo. Replace local persistence with a secure backend for production.</footer>
      </main>
    </div>
  );
}
