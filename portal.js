(() => {
  'use strict';
  const SUBJECTS = ['Marathi','Hindi','English','Mathematics Part 1','Mathematics Part 2','Science and Technology','History and Political Science','Geography','Sanskrit / Hindi Composite'];
  const DEMO_USERS = {
    danny_parmar: { hash: '586d54e6772fbaa957d7afc23089cbcb953d2eced3fe9d7b57d6f3d3f108a276', role: 'student', name: 'Danny Parmar' },
    harshit_patel: { hash: '91240c32762f5faabbb0a64c4657dce9403510a93ce45891145432119fe63b10', role: 'teacher', name: 'Harshit Patel' }
  };
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const state = JSON.parse(localStorage.getItem('accord-demo-data') || '{"portions":{},"tests":[],"users":{}}');
  state.users ||= {};
  let session = JSON.parse(sessionStorage.getItem('accord-demo-session') || 'null');
  const save = () => localStorage.setItem('accord-demo-data', JSON.stringify(state));
  const toast = (message) => { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2400); };
  const hash = async (value) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(x => x.toString(16).padStart(2,'0')).join('');
  const fmt = (date) => new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(date));
  const pdfValid = (file) => file && file.size <= 10 * 1024 * 1024 && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
  const fileToData = (file) => new Promise((resolve,reject) => { const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file); });

  async function login(e) {
    e.preventDefault();
    const id = $('#user-id').value.trim(); const user = DEMO_USERS[id] || state.users[id];
    if (!user || await hash($('#password').value) !== user.hash) { $('#login-error').textContent = 'That ID or password is not recognised.'; return; }
    session = { id, role:user.role, name:user.name, expires:Date.now()+30*60*1000 };
    sessionStorage.setItem('accord-demo-session',JSON.stringify(session)); showDashboard();
  }
  function logout() { sessionStorage.removeItem('accord-demo-session'); session=null; $('#dashboard').hidden=true; $('#login-view').hidden=false; $('#logout').hidden=true; }
  function showDashboard() {
    if (!session || session.expires < Date.now()) { logout(); return; }
    $('#login-view').hidden=true; $('#dashboard').hidden=false; $('#logout').hidden=false;
    const teacher=session.role==='teacher'; document.body.classList.toggle('is-teacher',teacher);
    $$('.teacher-only').forEach(el=>el.hidden=!teacher);
    $('#profile-name').textContent=session.name; $('#profile-role').textContent=teacher?'Teacher':'Student · Std 9'; $('#avatar').textContent=teacher?'HP':'DP';
    const hour=new Date().getHours(); $('#greeting').textContent=`Good ${hour<12?'morning':hour<17?'afternoon':'evening'}, ${session.name.split(' ')[0]}.`;
    $('#today').textContent=new Intl.DateTimeFormat('en-IN',{weekday:'long',month:'long',day:'numeric'}).format(new Date());
    render();
  }
  function navigate(id) { $$('.panel-page').forEach(x=>x.classList.toggle('active',x.id===id)); $$('.side-link').forEach(x=>x.classList.toggle('active',x.dataset.target===id)); $('.sidebar').classList.remove('open'); }
  function progressFor(subject) { const rows=state.portions[subject]||[]; return rows.length?Math.round(rows.filter(x=>x.status==='complete').length/rows.length*100):0; }
  function render() {
    const values=SUBJECTS.map(progressFor), overall=Math.round(values.reduce((a,b)=>a+b,0)/SUBJECTS.length);
    $('#progress-number').textContent=`${overall}%`; $('#progress-meter').style.width=`${overall}%`;
    $('#subject-preview').innerHTML=SUBJECTS.slice(0,5).map((s,i)=>`<div class="subject-line"><strong>${s}</strong><div class="meter"><i style="width:${values[i]}%"></i></div><span>${values[i]}%</span></div>`).join('');
    $('#subject-grid').innerHTML=SUBJECTS.map(s=>`<article class="subject-card"><p class="eyebrow">${progressFor(s)}% complete</p><h3>${s}</h3><div>${(state.portions[s]||[]).map((c,i)=>`<div class="chapter"><span>${escapeHtml(c.name)}</span><span class="badge ${c.status}">${c.status}</span><button class="icon-button delete-chapter" data-subject="${s}" data-index="${i}" aria-label="Delete ${escapeHtml(c.name)}">×</button></div>`).join('')||'<p class="test-meta">No chapters added yet.</p>'}</div><button class="add-chapter" data-subject="${s}">+ Add chapter</button></article>`).join('');
    renderTests();
    const students=[{id:'danny_parmar',name:'Danny Parmar'},...Object.entries(state.users).map(([id,u])=>({id,name:u.name}))];
    $('#student-list').innerHTML=students.map(s=>`<div class="panel student-row"><span class="avatar">${s.name.split(/\s+/).map(x=>x[0]).join('').slice(0,2)}</span><div><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(s.id)} · Standard 9</small></div><span class="status-dot">Active</span></div>`).join('');
  }
  function escapeHtml(v){const d=document.createElement('div');d.textContent=v;return d.innerHTML}
  function testStatus(t){const n=Date.now();return n<new Date(t.start)?'upcoming':n>new Date(t.end)?'closed':'active'}
  function renderTests(){
    const teacher=session.role==='teacher', active=state.tests.filter(t=>testStatus(t)==='active').length;
    $('#active-count').textContent=active;
    const marked=state.tests.filter(t=>Number.isFinite(t.marks)); $('#average-score').textContent=marked.length?`${Math.round(marked.reduce((a,t)=>a+t.marks,0)/marked.length)}%`:'—';
    $('#test-preview').innerHTML=active?`<div><strong>${active} test${active>1?'s':''} available</strong><p>Open Tests & marks to view details.</p></div>`:'<div><strong>You’re all caught up.</strong><p>No tests are available right now.</p></div>';
    $('#tests-list').innerHTML=state.tests.length?state.tests.map((t,i)=>{
      const status=testStatus(t), canSee=teacher||status==='active';
      return `<article class="test-card"><div class="test-card__head"><div><p class="eyebrow">${escapeHtml(t.subject)} · ${status}</p><h3>${escapeHtml(t.title)}</h3><p class="test-meta">${fmt(t.start)} – ${fmt(t.end)}</p></div><span class="badge ${status==='active'?'complete':status==='upcoming'?'learning':'planned'}">${status}</span></div><div class="test-actions">${canSee?`<a class="secondary-button" href="${t.paper}" download="${escapeHtml(t.paperName)}">Download paper</a>`:'<span class="test-meta">The paper is hidden outside its availability window.</span>'}${!teacher&&status==='active'&&!t.answer?`<input class="answer-file" data-index="${i}" type="file" accept="application/pdf,.pdf" aria-label="Upload PDF answer"><button class="primary-button upload-answer" data-index="${i}">Submit answer</button>`:''}${t.answer?`<a class="secondary-button" href="${t.answer}" download="${escapeHtml(t.answerName)}">${teacher?'View':'Your'} answer PDF</a>`:''}${teacher&&t.answer?`<form class="marks-form" data-index="${i}"><input type="number" min="0" max="100" required value="${t.marks??''}" aria-label="Marks out of 100"><button class="primary-button">Save marks</button></form>`:''}${Number.isFinite(t.marks)?`<strong>Score: ${t.marks}/100</strong>`:''}</div></article>`;
    }).join(''):'<div class="panel empty-state"><div><strong>No tests yet.</strong><p>The teacher can publish the first timed test here.</p></div></div>';
  }
  function openChapter(subject){$('#chapter-subject').value=subject;$('#chapter-title').textContent=subject;$('#chapter-name').value='';$('#chapter-dialog').showModal()}
  async function createTest(e){e.preventDefault();const file=$('#test-file').files[0],err=$('#test-error');if(!pdfValid(file)){err.textContent='Choose a PDF no larger than 10 MB.';return}if(new Date($('#test-end').value)<=new Date($('#test-start').value)){err.textContent='Closing time must be after the opening time.';return}state.tests.unshift({title:$('#test-title').value,subject:$('#test-subject').value,start:$('#test-start').value,end:$('#test-end').value,paper:await fileToData(file),paperName:file.name});save();$('#test-dialog').close();e.target.reset();toast('Test published');render()}
  async function uploadAnswer(i){const file=$(`.answer-file[data-index="${i}"]`).files[0];if(!pdfValid(file)){toast('Choose a PDF no larger than 10 MB');return}state.tests[i].answer=await fileToData(file);state.tests[i].answerName=file.name;save();toast('Answer submitted');render()}
  function report(){const lines=['ACCORD COACHING CLASSES','Student progress report','',`Student: ${session.role==='student'?session.name:'Danny Parmar'}`,'Standard: 9','',...SUBJECTS.map(s=>`${s}: ${progressFor(s)}% complete`),'','TEST RESULTS',...state.tests.filter(t=>Number.isFinite(t.marks)).map(t=>`${t.title}: ${t.marks}/100`)];const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain'}));a.download='accord-progress-report.txt';a.click();URL.revokeObjectURL(a.href)}

  $('#login-form').addEventListener('submit',login); $('#logout').addEventListener('click',logout); $('#menu-button').addEventListener('click',()=>$('.sidebar').classList.toggle('open'));
  $$('.side-link,.jump').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.target)));
  $('#subject-grid').addEventListener('click',e=>{const add=e.target.closest('.add-chapter'),del=e.target.closest('.delete-chapter');if(add)openChapter(add.dataset.subject);if(del){state.portions[del.dataset.subject].splice(+del.dataset.index,1);save();render()}});
  $('#chapter-form').addEventListener('submit',e=>{e.preventDefault();const s=$('#chapter-subject').value;(state.portions[s]??=[]).push({name:$('#chapter-name').value.trim(),status:$('#chapter-status').value});save();$('#chapter-dialog').close();toast('Portion updated');render()});
  $('#new-test').addEventListener('click',()=>$('#test-dialog').showModal()); $('#test-form').addEventListener('submit',createTest); $('#add-student').addEventListener('click',()=>$('#student-dialog').showModal());
  $('#student-form').addEventListener('submit',async e=>{e.preventDefault();const id=$('#student-id').value.trim(),err=$('#student-error');if(DEMO_USERS[id]||state.users[id]){err.textContent='That student ID already exists.';return}state.users[id]={hash:await hash($('#student-password').value),role:'student',name:$('#student-name').value.trim()};save();e.target.reset();$('#student-dialog').close();toast('Demo student created');render()});
  $('#tests-list').addEventListener('click',e=>{const b=e.target.closest('.upload-answer');if(b)uploadAnswer(+b.dataset.index)}); $('#tests-list').addEventListener('submit',e=>{if(!e.target.matches('.marks-form'))return;e.preventDefault();state.tests[+e.target.dataset.index].marks=+e.target.querySelector('input').value;save();toast('Marks updated');render()});
  $('#download-report').addEventListener('click',report); $('#test-subject').innerHTML=SUBJECTS.map(s=>`<option>${s}</option>`).join('');
  setInterval(()=>{if(session&&session.expires<Date.now()){toast('Session expired');setTimeout(logout,800)}else if(session)renderTests()},30000);
  if(session)showDashboard();
})();
