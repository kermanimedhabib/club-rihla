let lang = 'fr';
let trips = [];
let requests = [];
let currentTripId = null;
let adminTab = 'trips';
let adminToken = localStorage.getItem('rihla_admin_token') || null;

const T = {
  fr: {
    brandSub:'رحلة — voyage', eyebrow:'Places limitées',
    heroTitle:'Chaque voyage commence par une place à bord.',
    heroSub:"Choisissez un voyage, réservez votre place. Si c'est complet, vous le voyez tout de suite.",
    routeLabel:'Alger → ailleurs',
    tripsTitle:'Prochains voyages',
    empty:'Aucun voyage publié pour le moment.',
    seatsLeft:'places restantes', full:'COMPLET', join:'Rejoindre ce voyage', joinFull:'Complet',
    modalTitle:'Réserver ma place', modalSub:d=>`Pour : ${d}`,
    name:'Nom complet', phone:'Téléphone', seats:'Nombre de places',
    submit:'Envoyer la demande', cancel:'Annuler',
    successTitle:'Demande envoyée !', successSub:'On vous contacte bientôt pour confirmer.', close:'Fermer',
    pinTitle:'Connexion admin', pinCancel:'Annuler', pinOk:'Se connecter', pinWrong:'Mot de passe incorrect',
    adminTitle:'Panneau admin', tabTrips:'Voyages', tabRequests:'Demandes',
    addTrip:'+ Ajouter un voyage', destFr:'Destination (Français)', destAr:'Destination (Arabe)',
    date:'Date', price:'Prix (DA)', totalSeats:'Places totales', save:'Enregistrer',
    delete:'Supprimer', edit:'Modifier', noRequests:'Aucune demande reçue.', seatsWord:'places',
    closeAdmin:'Fermer', logout:'Se déconnecter', networkError:'Erreur réseau, réessayez.',
    tripFull:'Ce voyage vient de se remplir.'
  },
  ar: {
    brandSub:'Club Rihla — نادي رحلة', eyebrow:'أماكن محدودة',
    heroTitle:'كل رحلة تبدأ بمكان على متنها.',
    heroSub:'اختر رحلتك واحجز مكانك. وإذا كانت مكتملة، سترى ذلك مباشرة.',
    routeLabel:'الجزائر ← وجهة أخرى',
    tripsTitle:'الرحلات القادمة',
    empty:'لا توجد رحلات منشورة حالياً.',
    seatsLeft:'أماكن متبقية', full:'مكتمل', join:'احجز مكانك', joinFull:'مكتمل',
    modalTitle:'احجز مكانك', modalSub:d=>`الرحلة: ${d}`,
    name:'الاسم الكامل', phone:'الهاتف', seats:'عدد الأماكن',
    submit:'إرسال الطلب', cancel:'إلغاء',
    successTitle:'تم إرسال طلبك!', successSub:'سنتواصل معك قريباً للتأكيد.', close:'إغلاق',
    pinTitle:'دخول الإدارة', pinCancel:'إلغاء', pinOk:'دخول', pinWrong:'كلمة مرور غير صحيحة',
    adminTitle:'لوحة الإدارة', tabTrips:'الرحلات', tabRequests:'الطلبات',
    addTrip:'+ إضافة رحلة', destFr:'الوجهة (بالفرنسية)', destAr:'الوجهة (بالعربية)',
    date:'التاريخ', price:'السعر (دج)', totalSeats:'إجمالي الأماكن', save:'حفظ',
    delete:'حذف', edit:'تعديل', noRequests:'لا توجد طلبات مستلمة.', seatsWord:'أماكن',
    closeAdmin:'إغلاق', logout:'تسجيل الخروج', networkError:'خطأ في الشبكة، حاول مجدداً.',
    tripFull:'هذه الرحلة اكتملت للتو.'
  }
};
function tr(){ return T[lang]; }

function setLang(l){
  lang = l;
  document.body.dir = l === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('btnFr').classList.toggle('active', l==='fr');
  document.getElementById('btnAr').classList.toggle('active', l==='ar');
  document.getElementById('brandSub').textContent = tr().brandSub;
  document.getElementById('heroEyebrow').textContent = tr().eyebrow;
  document.getElementById('heroTitle').textContent = tr().heroTitle;
  document.getElementById('heroSub').textContent = tr().heroSub;
  document.getElementById('heroRouteLabel').textContent = tr().routeLabel;
  document.getElementById('tripsTitle').textContent = tr().tripsTitle;
  renderTrips();
}

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (opts.auth && adminToken) headers['Authorization'] = 'Bearer ' + adminToken;
  const res = await fetch(path, { ...opts, headers });
  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || 'request_failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function loadTrips(){
  try {
    trips = await api('/api/trips');
  } catch (e) {
    trips = [];
  }
}

function renderTrips(){
  const grid = document.getElementById('tripGrid');
  const empty = document.getElementById('emptyState');
  grid.innerHTML = '';
  if (!trips || trips.length === 0){
    empty.style.display = 'block';
    empty.textContent = tr().empty;
    return;
  }
  empty.style.display = 'none';
  trips.forEach(t=>{
    const remaining = t.remainingSeats;
    const isFull = remaining <= 0;
    const pct = Math.min(100, Math.round(((t.totalSeats - remaining) / t.totalSeats) * 100));
    const dest = lang === 'ar' ? t.destAr : t.destFr;
    const el = document.createElement('div');
    el.className = 'ticket' + (isFull ? ' full' : '');
    el.innerHTML = `
      ${isFull ? `<div class="stamp-full">${tr().full}</div>` : ''}
      <div class="ticket-top">
        <div class="ticket-dest">${dest}</div>
        <div class="ticket-date mono">${t.date}</div>
      </div>
      <div class="ticket-perf"></div>
      <div class="ticket-bottom">
        <div class="capacity-row">
          <span class="capacity-label">${isFull ? tr().full : remaining + ' ' + tr().seatsLeft}</span>
          <span class="price-tag">${t.price.toLocaleString()} DA</span>
        </div>
        <div class="gauge"><div class="gauge-fill" style="width:${pct}%"></div></div>
        <button class="join-btn" ${isFull?'disabled':''} onclick="openBooking('${t.id}')">
          ${isFull ? tr().joinFull : tr().join}
        </button>
      </div>
    `;
    grid.appendChild(el);
  });
}

function openBooking(tripId){
  currentTripId = tripId;
  const t = trips.find(x=>x.id===tripId);
  const dest = lang === 'ar' ? t.destAr : t.destFr;
  document.getElementById('bookModal').innerHTML = `
    <h3>${tr().modalTitle}</h3>
    <div class="modal-sub">${tr().modalSub(dest)}</div>
    <div class="field"><label>${tr().name}</label><input id="fName" type="text" /></div>
    <div class="field"><label>${tr().phone}</label><input id="fPhone" type="tel" /></div>
    <div class="field"><label>${tr().seats}</label><input id="fSeats" type="number" min="1" max="${t.remainingSeats}" value="1" /></div>
    <div class="field-error" id="bookError"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeOverlay('bookOverlay')">${tr().cancel}</button>
      <button class="btn btn-primary" onclick="submitBooking()">${tr().submit}</button>
    </div>
  `;
  document.getElementById('bookOverlay').classList.add('show');
}

async function submitBooking(){
  const name = document.getElementById('fName').value.trim();
  const phone = document.getElementById('fPhone').value.trim();
  const seats = parseInt(document.getElementById('fSeats').value, 10) || 1;
  const errBox = document.getElementById('bookError');
  if(!name || !phone){ errBox.textContent = tr().networkError; return; }

  try{
    await api('/api/bookings', { method:'POST', body: JSON.stringify({ tripId: currentTripId, name, phone, seats }) });
    await loadTrips();
    renderTrips();
    document.getElementById('bookModal').innerHTML = `
      <div class="success-box">
        <div class="check">✓</div>
        <h3>${tr().successTitle}</h3>
        <p class="modal-sub">${tr().successSub}</p>
        <button class="btn btn-primary" style="margin-top:10px;" onclick="closeOverlay('bookOverlay')">${tr().close}</button>
      </div>
    `;
  }catch(e){
    if(e.status === 409){
      errBox.textContent = tr().tripFull;
      await loadTrips();
      renderTrips();
    } else {
      errBox.textContent = tr().networkError;
    }
  }
}

function closeOverlay(id){ document.getElementById(id).classList.remove('show'); }

/* ---------- Admin ---------- */
function openAdminGate(){
  if (adminToken) { openAdmin(); return; }
  document.getElementById('pinTitle').textContent = tr().pinTitle;
  document.getElementById('pinCancel').textContent = tr().pinCancel;
  document.getElementById('pinSubmit').textContent = tr().pinOk;
  document.getElementById('pinInput').value = '';
  document.getElementById('pinError').textContent = '';
  document.getElementById('pinOverlay').classList.add('show');
}

async function checkPin(){
  const val = document.getElementById('pinInput').value;
  try{
    const data = await api('/api/admin/login', { method:'POST', body: JSON.stringify({ password: val }) });
    adminToken = data.token;
    localStorage.setItem('rihla_admin_token', adminToken);
    closeOverlay('pinOverlay');
    openAdmin();
  }catch(e){
    document.getElementById('pinError').textContent = tr().pinWrong;
  }
}

function logoutAdmin(){
  adminToken = null;
  localStorage.removeItem('rihla_admin_token');
  closeOverlay('adminOverlay');
}

async function openAdmin(){
  adminTab = 'trips';
  try {
    requests = await api('/api/admin/requests', { auth: true });
  } catch(e) {
    if (e.status === 401) { logoutAdmin(); openAdminGate(); return; }
  }
  renderAdmin();
  document.getElementById('adminOverlay').classList.add('show');
}

function renderAdmin(){
  const box = document.getElementById('adminModal');
  let body = '';
  if(adminTab === 'trips'){
    body = `
      <button class="small-btn" style="width:100%;margin-bottom:12px;" onclick="showTripForm()">${tr().addTrip}</button>
      <div id="tripFormWrap"></div>
      <div class="admin-list">
        ${trips.map(t=>`
          <div class="admin-trip-row">
            <div class="row-top">
              <strong>${lang==='ar'?t.destAr:t.destFr}</strong>
              <span>
                <button class="icon-btn" onclick="showTripForm('${t.id}')">${tr().edit}</button>
                <button class="icon-btn" onclick="deleteTrip('${t.id}')">${tr().delete}</button>
              </span>
            </div>
            <div class="row-meta">${t.date} · ${t.price.toLocaleString()} DA · ${t.totalSeats - t.remainingSeats}/${t.totalSeats} ${tr().seatsWord}</div>
          </div>
        `).join('') || `<div class="empty-state">${tr().empty}</div>`}
      </div>
    `;
  } else {
    body = `
      ${requests.length === 0 ? `<div class="empty-state">${tr().noRequests}</div>` : requests.map(r=>{
        const destLabel = lang==='ar' ? (r.tripDestAr || r.tripDestFr) : r.tripDestFr;
        return `
          <div class="req-row">
            <div class="req-name">${r.name} — ${r.seats} ${tr().seatsWord}</div>
            <div class="req-meta">${destLabel} · ${r.phone} · ${new Date(r.timestamp).toLocaleDateString()}</div>
          </div>
        `;
      }).join('')}
    `;
  }
  box.innerHTML = `
    <h3>${tr().adminTitle}</h3>
    <div class="tabs">
      <button class="${adminTab==='trips'?'active':''}" onclick="switchAdminTab('trips')">${tr().tabTrips}</button>
      <button class="${adminTab==='requests'?'active':''}" onclick="switchAdminTab('requests')">${tr().tabRequests} (${requests.length})</button>
    </div>
    ${body}
    <div class="modal-actions" style="margin-top:16px;">
      <button class="btn btn-ghost" onclick="logoutAdmin()">${tr().logout}</button>
      <button class="btn btn-primary" onclick="closeOverlay('adminOverlay')">${tr().closeAdmin}</button>
    </div>
  `;
}

async function switchAdminTab(tab){
  adminTab = tab;
  if (tab === 'requests') {
    try { requests = await api('/api/admin/requests', { auth: true }); } catch(e){}
  }
  renderAdmin();
}

function showTripForm(tripId){
  const existing = tripId ? trips.find(t=>t.id===tripId) : null;
  const wrap = document.getElementById('tripFormWrap');
  wrap.innerHTML = `
    <div class="field"><label>${tr().destFr}</label><input id="nDestFr" value="${existing?existing.destFr:''}"></div>
    <div class="field"><label>${tr().destAr}</label><input id="nDestAr" value="${existing?existing.destAr:''}"></div>
    <div class="grid2">
      <div class="field"><label>${tr().date}</label><input id="nDate" type="date" value="${existing?existing.date:''}"></div>
      <div class="field"><label>${tr().price}</label><input id="nPrice" type="number" value="${existing?existing.price:''}"></div>
    </div>
    <div class="field"><label>${tr().totalSeats}</label><input id="nSeats" type="number" value="${existing?existing.totalSeats:''}"></div>
    <button class="btn btn-primary" style="width:100%;" onclick="saveTripForm('${tripId||''}')">${tr().save}</button>
    <hr style="border:none;border-top:1px solid var(--line);margin:16px 0;">
  `;
}

async function saveTripForm(tripId){
  const destFr = document.getElementById('nDestFr').value.trim();
  const destAr = document.getElementById('nDestAr').value.trim();
  const date = document.getElementById('nDate').value;
  const price = parseInt(document.getElementById('nPrice').value,10) || 0;
  const totalSeats = parseInt(document.getElementById('nSeats').value,10) || 0;
  if(!destFr || !date || !totalSeats) return;

  try{
    if(tripId){
      await api('/api/admin/trips/' + tripId, { method:'PUT', auth:true, body: JSON.stringify({ destFr, destAr, date, price, totalSeats }) });
    } else {
      await api('/api/admin/trips', { method:'POST', auth:true, body: JSON.stringify({ destFr, destAr, date, price, totalSeats }) });
    }
    await loadTrips();
    renderTrips();
    renderAdmin();
  }catch(e){
    if (e.status === 401) { logoutAdmin(); openAdminGate(); }
  }
}

async function deleteTrip(tripId){
  try{
    await api('/api/admin/trips/' + tripId, { method:'DELETE', auth:true });
    await loadTrips();
    renderTrips();
    renderAdmin();
  }catch(e){
    if (e.status === 401) { logoutAdmin(); openAdminGate(); }
  }
}

(async function init(){
  await loadTrips();
  setLang('fr');
})();
