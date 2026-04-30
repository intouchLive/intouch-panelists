import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabase = createClient('https://gvkjvbpaavaofdelvnlz.supabase.co', 'sb_publishable_kEz5hrc6H4B1QsK5M7Zarg_t6FL-oAV')

const DEFAULT_SESSION_ROWS = [
  { id:'s1a', group_key:'s1', time:'8:55 – 9:30 AM', label:'Breakout Session 1', room:'Room A', topic:'Fractional Resources To Grow and Protect Your Small Business', sort_order:1, is_break:false, is_keynote:false, is_active:true },
  { id:'s1b', group_key:'s1', time:'8:55 – 9:30 AM', label:'Breakout Session 1', room:'Room B', topic:'Who Owns Risk? Insurance, Cyber, and the Next 10 Years', sort_order:2, is_break:false, is_keynote:false, is_active:true },
  { id:'s2a', group_key:'s2', time:'9:40 – 10:15 AM', label:'Breakout Session 2', room:'Room A', topic:'Cyber Threats, Protection Strategies, and Risk Perspective', sort_order:3, is_break:false, is_keynote:false, is_active:true },
  { id:'s2b', group_key:'s2', time:'9:40 – 10:15 AM', label:'Breakout Session 2', room:'Room B', topic:'Topic TBD', sort_order:4, is_break:false, is_keynote:false, is_active:true },
  { id:'net', group_key:'net', time:'10:15 – 11:15 AM', label:'Networking Session', room:'', topic:'', sort_order:5, is_break:true, is_keynote:false, is_active:true },
  { id:'s3a', group_key:'s3', time:'11:15 – 11:50 AM', label:'Breakout Session 3', room:'Room A', topic:'Keeping the Humans in Human Capital', sort_order:6, is_break:false, is_keynote:false, is_active:true },
  { id:'s3b', group_key:'s3', time:'11:15 – 11:50 AM', label:'Breakout Session 3', room:'Room B', topic:'Cyber Resilience in Action — A Tabletop Exercise', sort_order:7, is_break:false, is_keynote:false, is_active:true },
  { id:'s4a', group_key:'s4', time:'12:00 – 12:35 PM', label:'Breakout Session 4', room:'Room A', topic:'You Have AI Questions, We Have Answers', sort_order:8, is_break:false, is_keynote:false, is_active:true },
  { id:'s4b', group_key:'s4', time:'12:00 – 12:35 PM', label:'Breakout Session 4', room:'Room B', topic:'Topic TBD', sort_order:9, is_break:false, is_keynote:false, is_active:true },
  { id:'keynote', group_key:'keynote', time:'12:35 – 2:00 PM', label:'Networking Lunch & Keynote', room:'', topic:"Engineering, Identification and Prevention for All. Don't be the Next Victim", sort_order:10, is_break:false, is_keynote:true, is_active:true },
]

let panelists = []
let scheduleRows = []
let currentTab = 'sessions'
let activeFilter = 'All'
let searchVal = ''

function speakers() { return panelists.filter(p => p.type !== 'organizer') }
function organizers() { return panelists.filter(p => p.type === 'organizer') }

function normalizeSessionId(value) {
  if (!value) return ''
  const v = String(value).trim()
  if (scheduleRows.map(r=>r.id).includes(v)) return v
  const map = { 'Keynote':'keynote','Networking Lunch & Keynote':'keynote' }
  return map[v] || v
}

function normalizeRow(row) {
  const sessionId = normalizeSessionId(row.session_id ?? row.sessionId ?? row.panel_name ?? row.Panel_Name)
  const role = row.role ?? row.Role ?? (sessionId === 'keynote' ? 'Keynote Speaker' : 'Panelist')
  return {
    id: String(row.id),
    name: row.name ?? '',
    title: row.title ?? '',
    company: row.company ?? '',
    email: row.email ?? '',
    role,
    sessionId,
    type: row.type ?? 'speaker',
    linkedin: row.linkedin ?? '',
    bio: row.bio ?? '',
    headshot: row.headshot_url ?? row.headshot ?? null,
  }
}

function normalizeSessionRow(row) {
  return {
    id: String(row.id),
    group_key: row.group_key ?? String(row.id),
    time: row.time ?? '',
    label: row.label ?? '',
    room: row.room ?? '',
    topic: row.topic ?? '',
    sort_order: Number(row.sort_order ?? 0),
    is_break: Boolean(row.is_break ?? false),
    is_keynote: Boolean(row.is_keynote ?? false),
    is_active: row.is_active ?? true,
  }
}

async function loadSchedule() {
  const { data, error } = await supabase.from('sessions').select('*').order('sort_order', { ascending: true })
  scheduleRows = (error || !data || data.length===0)
    ? DEFAULT_SESSION_ROWS.map(normalizeSessionRow)
    : data.filter(r=>r.is_active!==false).map(normalizeSessionRow).sort((a,b)=>a.sort_order-b.sort_order)
}

async function loadPanelists() {
  const { data, error } = await supabase.from('panelists').select('*').order('display_order', { ascending: true })
  panelists = (error || !data) ? [] : data.map(normalizeRow)
}

function groupedSchedule() {
  const rows = scheduleRows.filter(r=>r.is_active!==false).sort((a,b)=>a.sort_order-b.sort_order)
  const groups = []; const seen = new Set()
  for (const row of rows) {
    const key = row.group_key || row.id
    if (seen.has(key)) continue; seen.add(key)
    const members = rows.filter(r=>(r.group_key||r.id)===key)
    const first = members[0]
    if (first.is_break) groups.push({ type:'break', id:key, time:first.time, label:first.label, sort_order:first.sort_order })
    else if (first.is_keynote) groups.push({ type:'keynote', id:key, time:first.time, label:first.label, topic:first.topic, sessionId:first.id, sort_order:first.sort_order })
    else groups.push({ type:'session', id:key, time:first.time, label:first.label, rooms:members, sort_order:first.sort_order })
  }
  return groups.sort((a,b)=>a.sort_order-b.sort_order)
}

function initials(name) { return (name||'?').split(' ').filter(Boolean).map(n=>n[0]).join('').slice(0,2).toUpperCase() }

function badgeHTML(role) {
  if (role==='Keynote Speaker') return `<span class="sdbs-badge sdbs-badge-Keynote">${role}</span>`
  if (role==='Featured Sponsor') return `<span class="sdbs-badge sdbs-badge-Sponsor">Diamond Sponsor</span>`
  return `<span class="sdbs-badge sdbs-badge-${role}">${role}</span>`
}

function cardHTML(p) {
  const src = p.headshot
  const inits = initials(p.name)
  const isSponsor = p.role === 'Featured Sponsor'
  const hasMeta = p.bio || p.linkedin
  return `
    <div class="p-card${isSponsor?' sponsor-card':''}" onclick="openModal('${p.id}')">
      <div class="p-card-img">
        ${src
          ? `<img src="${src}" alt="${p.name}">`
          : `<div class="p-card-initials"><span style="font-size:42px;font-weight:700;color:var(--brand);opacity:0.7;">${inits}</span></div>`
        }
        <div class="p-card-badge-wrap">${badgeHTML(p.role)}</div>
        <div class="p-card-fade"></div>
      </div>
      <div class="p-card-info">
        <div class="p-card-name">${p.name}</div>
        <div class="p-card-title">${p.title||''}</div>
        ${p.company?`<div class="p-card-company">${p.company}</div>`:''}
        <div class="p-card-footer">
          <span class="p-card-cta" style="color:${hasMeta?(isSponsor?'var(--sponsor)':'var(--brand)'):'transparent'}">${hasMeta?'View profile →':''}</span>
          ${p.linkedin?`<a href="${p.linkedin}" target="_blank" rel="noopener" onclick="event.stopPropagation()" class="li-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--brand)"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          </a>`:''}
        </div>
      </div>
    </div>`
}

function teamCardHTML(p) {
  const src = p.headshot
  const inits = initials(p.name)
  const hasMeta = p.bio || p.linkedin || p.email
  return `
    <div class="team-card" onclick="openModal('${p.id}')">
      <div class="team-card-img">
        ${src
          ? `<img src="${src}" alt="${p.name}">`
          : `<div class="team-card-initials"><span style="font-size:40px;font-weight:700;color:var(--team);opacity:0.6;">${inits}</span></div>`
        }
      </div>
      <div class="team-card-info">
        <div class="team-card-name">${p.name}</div>
        <div class="team-card-title">${p.title||''}</div>
        <div class="team-card-company">${p.company||''}</div>
        ${hasMeta?`<div class="team-card-footer"><span class="team-cta">View profile →</span></div>`:''}
      </div>
    </div>`
}

function renderTeam() {
  const team = organizers()
  // Show/hide the tab based on whether team members exist
  const tab = document.getElementById('teamTab')
  if (tab) tab.style.display = team.length > 0 ? 'inline-block' : 'none'
}

function renderTeamContent() {
  const team = organizers()
  document.getElementById('content').innerHTML = `
    <div class="team-tab-header">
      <p class="team-tab-title" style="color:var(--text-muted);font-size:14px;">The people behind the San Diego Business Symposium</p>
    </div>
    ${team.length > 0
      ? `<div class="team-grid">${team.map(teamCardHTML).join('')}</div>`
      : `<div style="text-align:center;padding:60px 0;color:var(--text-faint);font-size:14px;">No team members found.</div>`
    }`
}

function updateHeroStats() {
  const spkrs = speakers()
  const sessions = scheduleRows.filter(r=>!r.is_break&&!r.is_keynote).length
  document.getElementById('heroStats').innerHTML = [
    { val: spkrs.length, lbl:'Speakers' },
    { val: Math.ceil(sessions/2), lbl:'Sessions' },
    { val: sessions, lbl:'Breakout Rooms' },
  ].map(s=>`<div><div class="hero-stat-val">${s.val}</div><div class="hero-stat-lbl">${s.lbl}</div></div>`).join('')
}

function renderCurrent() {
  if (currentTab==='sessions') renderSessions()
  else if (currentTab==='team') renderTeamContent()
  else renderAll()
}

function renderSessions() {
  const spkrs = speakers()
  let html = ''
  for (const s of groupedSchedule()) {
    if (s.type==='break') {
      html += `<div class="break-divider"><div class="break-dot"></div><span class="break-text">${s.time} · ${s.label}</span></div>`
      continue
    }
    if (s.type==='keynote') {
      const kp = spkrs.filter(p=>p.sessionId===s.sessionId)
      html += `
        <div class="session-block">
          <div class="keynote-hero">
            <div class="keynote-eyebrow">${s.time} · Keynote</div>
            <div class="keynote-title">${s.label}</div>
            <div class="keynote-topic">${s.topic||''}</div>
          </div>
          ${kp.length>0?`<div class="panelist-grid">${kp.map(cardHTML).join('')}</div>`:''}
        </div>`
      continue
    }
    html += `<div class="session-block">
      <div class="session-header-row">
        <div class="session-bar"></div>
        <div><div class="session-time-lbl">${s.time}</div><div class="session-name">${s.label}</div></div>
      </div>`
    for (const r of s.rooms) {
      const rp = spkrs.filter(p=>p.sessionId===r.id)
      const isTBD = (r.topic||'').includes('TBD')
      if (rp.length===0 && isTBD) continue
      html += `
        <div class="room-section">
          <div class="room-row">
            <span class="room-pill">${r.room||'Panel'}</span>
            <span class="room-topic${isTBD?' tbd':''}">${r.topic||'Untitled panel'}</span>
          </div>
          ${rp.length>0?`<div class="panelist-grid">${rp.map(cardHTML).join('')}</div>`:''}
        </div>`
    }
    html += '</div>'
  }
  document.getElementById('content').innerHTML = html
}

function renderAll() {
  const q = searchVal.toLowerCase()
  const spkrs = speakers()
  // Deduplicate by name
  const seen = new Map()
  for (const p of spkrs) {
    const key = p.name.trim().toLowerCase()
    if (!seen.has(key)) seen.set(key, p)
  }
  const deduped = [...seen.values()].filter(p => {
    const matchRole = activeFilter==='All' || p.role===activeFilter
    const matchSearch = !q || [p.name,p.company,p.title].join(' ').toLowerCase().includes(q)
    return matchRole && matchSearch
  })

  const filters = ['All','Moderator','Panelist','Keynote Speaker','Featured Sponsor']
  const filterBar = `
    <div class="filter-bar">
      <div style="display:flex;gap:6px;flex:1;flex-wrap:wrap;">
        ${filters.map(f=>`<button class="filter-btn${activeFilter===f?' active':''}" onclick="setFilter('${f}')">${f==='Featured Sponsor'?'Diamond Sponsor':f}</button>`).join('')}
      </div>
      <input class="filter-search" placeholder="Search speakers…" value="${searchVal}" oninput="setSearch(this.value)">
    </div>`

  const grid = deduped.length>0
    ? `<div class="panelist-grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));">${deduped.map(cardHTML).join('')}</div>`
    : `<div style="text-align:center;padding:60px 0;color:var(--text-faint);font-size:14px;">No speakers match your search.</div>`

  document.getElementById('content').innerHTML = filterBar + grid
}

window.setFilter = function(f) { activeFilter = f; renderAll() }
window.setSearch = function(v) { searchVal = v; renderAll() }

window.switchTab = function(tab, btn) {
  currentTab = tab
  document.querySelectorAll('.hero-tab').forEach(t=>t.classList.remove('active'))
  btn.classList.add('active')
  activeFilter = 'All'; searchVal = ''
  renderCurrent()
}

window.openModal = function(id) {
  const p = panelists.find(x=>String(x.id)===String(id))
  if (!p) return
  const src = p.headshot
  const inits = initials(p.name)
  const isTeam = p.type === 'organizer'

  document.getElementById('modalAccent').className = 'modal-accent' + (isTeam ? ' team-accent' : '')
  document.getElementById('modalAvatar').innerHTML = src
    ? `<img src="${src}" alt="${p.name}">`
    : `<div class="modal-avatar-initials${isTeam?' team':''}">${inits}</div>`
  document.getElementById('modalBadge').innerHTML = isTeam
    ? '<span class="sdbs-badge sdbs-badge-Team">Event Team</span>'
    : badgeHTML(p.role)
  document.getElementById('modalName').textContent = p.name
  document.getElementById('modalTitleLine').innerHTML = `<div class="modal-title-line${isTeam?' team':''}">${p.title||''}</div>`
  document.getElementById('modalCompany').textContent = p.company||''
  document.getElementById('modalBio').innerHTML = p.bio
    ? `<p class="modal-bio">${p.bio}</p>`
    : `<p class="modal-bio-empty">Bio coming soon.</p>`

  let links = ''
  if (p.linkedin) links += `<a href="${p.linkedin}" target="_blank" rel="noopener" class="modal-li-btn">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
    View LinkedIn
  </a>`
  if (p.email && isTeam) links += `<a href="mailto:${p.email}" class="modal-email-btn">✉ ${p.email}</a>`
  document.getElementById('modalLinks').innerHTML = links

  document.getElementById('modalOverlay').classList.add('visible')
}

window.closeModal = function() {
  document.getElementById('modalOverlay').classList.remove('visible')
}

await loadSchedule()
await loadPanelists()
renderTeam()
updateHeroStats()
renderCurrent()

// ── iframe resize reporting ───────────────────────────────────────────────────
function sendHeight() {
  window.parent.postMessage({ type: 'resize', height: document.documentElement.scrollHeight }, '*')
}
window.addEventListener('load', sendHeight)
window.addEventListener('resize', sendHeight)
const contentEl = document.getElementById('content')
if (contentEl) {
  new MutationObserver(() => setTimeout(sendHeight, 120)).observe(contentEl, { childList: true, subtree: true })
}

// ── Modal open/close notify parent overlay ───────────────────────────────────
const _origOpen = window.openModal
window.openModal = function(id) {
  _origOpen(id)
  window.parent.postMessage({ type: 'modalOpen' }, '*')
}
const _origClose = window.closeModal
window.closeModal = function() {
  _origClose()
  window.parent.postMessage({ type: 'modalClose' }, '*')
}

// ── Listen for parent telling us to close modal ──────────────────────────────
window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'closeModal') {
    document.getElementById('modalOverlay').classList.remove('visible')
  }
})