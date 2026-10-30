/* GetAnywhere — SPA with localStorage backend */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const Store = {
  read(key, def){ try{ return JSON.parse(localStorage.getItem(key)) ?? def }catch{ return def } },
  write(key, val){ localStorage.setItem(key, JSON.stringify(val)) },
  uid(){ return Math.random().toString(36).slice(2,9) },
};

const DB = {
  init() {
    // Initialize default data if missing
    if (!Store.read('ga_categories')) 
      Store.write('ga_categories', ['Electronics', 'Mobiles', 'PC & Laptops', 'Gaming', 'Home', 'Fashion']);
    
    if (!Store.read('ga_products')) 
      Store.write('ga_products', []);
    
    if (!Store.read('ga_users')) 
      Store.write('ga_users', []);
    
    if (!Store.read('ga_tickets')) 
      Store.write('ga_tickets', []);
    
    if (!Store.read('ga_settings')) 
      Store.write('ga_settings', { fee: 5, minHours: 1 });
    
    if (!Store.read('ga_session')) 
      Store.write('ga_session', null);

    // Create default admin accounts only once
    if (!Store.read('ga_admin_created')) {
      const defaultAdmins = [
        {
          id: Store.uid(),
          name: 'Administrator',
          email: 'teamvnxesp@gmail.com',
          pass: 'Varun917@',
          role: 'admin',
          joined: Date.now()
        },
        {
          id: Store.uid(),
          name: 'Administrator',
          email: 'srgaming1710@gmail.com',
          pass: '9838872456',
          role: 'admin',
          joined: Date.now()
        }
      ];

      let users = Store.read('ga_users') || [];
      
      // Prevent duplicates
      defaultAdmins.forEach(admin => {
        if (!users.some(u => u.email === admin.email)) {
          users.push(admin);
        }
      });

      Store.write('ga_users', users);
      Store.write('ga_admin_created', true);
    }
  },
  categories(){ return Store.read('ga_categories', []) },
  users(){ return Store.read('ga_users', []) },
  session(){ return Store.read('ga_session', null) },
  products(){ return Store.read('ga_products', []) },
  tickets(){ return Store.read('ga_tickets', []) },
  settings(){ return Store.read('ga_settings', {}) }
};


const Router = {
  routes: {},
  go(path){ history.pushState({}, '', `#${path}`); Router.render() },
  on(path, fn){ Router.routes[path] = fn },
  current(){ return location.hash.slice(1) || '/login' },
  render(){ 
    const path = Router.current();
    const app = $('#app');
    if(path.startsWith('/product/')) return Views.product(path.split('/').pop());

    const view = Router.routes[path] || Views.login;
    view();
    UI.updateHeader();
  }
};



const Views = {
  tpl(id){ return document.getElementById(id).content.cloneNode(true) },
  login(){
    $('#app').innerHTML = '';
    $('#app').appendChild(Views.tpl('tpl-login'));
    UI.bindLogin();
  },
  home(){
    $('#app').innerHTML = '';
    $('#app').appendChild(Views.tpl('tpl-home'));
    UI.renderHome();
  },
  sell(){
    if(!Auth.require()) return;
    $('#app').innerHTML = '';
    $('#app').appendChild(Views.tpl('tpl-sell'));
    UI.renderSell();
  },
  product(id){
    $('#app').innerHTML = '';
    $('#app').appendChild(Views.tpl('tpl-product'));
    UI.renderProduct(id);
  },
  tickets(){
    if(!Auth.require()) return;
    $('#app').innerHTML = '';
    $('#app').appendChild(Views.tpl('tpl-tickets'));
    UI.renderTickets();
  },
  admin(){
    if(!Auth.require('admin')) return;
    $('#app').innerHTML = '';
    $('#app').appendChild(Views.tpl('tpl-admin'));
    UI.renderAdmin();
  },

};

const Auth = {
  loginEmail() {
    const email = $('#login-email').value.trim().toLowerCase();
    const pass = $('#login-pass').value;

    console.log('Attempting login with:', { email, pass });
    const user = DB.users().find(u => u.email === email && u.pass === pass);
    if (!user) return alert('Invalid credentials');
    Store.write('ga_session', { id: user.id, role: user.role });
    Router.go('/home');

  },
  loginGoogleMock() {
    const name = prompt('Please enter your Full Name:');
    if (!name) return alert('Full Name is required to continue.');

    if (!confirm('Do you grant permission to use your Google account information?')) {
      return;
    }

    const email = `google_${Math.floor(Math.random() * 10000)}@example.com`; // Mocking a unique Google email
    const pass = Store.uid(); // Generate a random password for the mocked Google user

    if (DB.users().some(u => u.email === email)) return alert('Account with this Google email already exists.');

    const u = { id: Store.uid(), name, email, pass, role: 'user', joined: Date.now() };
    const users = DB.users();
    users.push(u);
    Store.write('ga_users', users);
    Store.write('ga_session', { id: u.id, role: u.role });
    Router.go('/home');
  },
  signup() {
    const name = $('#signup-name').value.trim();
    const email = $('#signup-email').value.trim().toLowerCase();
    const pass = $('#signup-pass').value;
    const pass2 = $('#signup-pass2').value;

    if (!name || !email || !pass) return alert('Please fill all fields');
    if (pass !== pass2) return alert('Passwords do not match');
    if (DB.users().some(u => u.email === email)) return alert('Email already exists');
    const u = { id: Store.uid(), name, email, pass, role: 'user', joined: Date.now() };
    const users = DB.users();
    users.push(u);
    Store.write('ga_users', users);
    Store.write('ga_session', { id: u.id, role: u.role });
    Router.go('/home');

  },
  require(role) {
    const s = DB.session();
    if (!s) { Router.go('/login'); return false; }
    if (role && s.role !== role) { alert('Admins only'); return false; }
    return true;
  },
  me() {
    const s = DB.session();
    return DB.users().find(u => u.id === s?.id);
  },
  logout() {
    Store.write('ga_session', null);
    Router.go('/login');
  }
};







const UI = {
  year: new Date().getFullYear(),
  bindLogin(){
    console.log('UI.bindLogin() called');
    $('.signup').classList.add('hidden');
    UI.toggleAuthMode = ()=>{
      $('.signup').classList.toggle('hidden');
    };
  },
  updateHeader(){
    $('#year').textContent = UI.year;
    const s = DB.session();
    $('#login-btn').classList.toggle('hidden', !!s);
    $('#logout-btn').classList.toggle('hidden', !s);
    $('#user-chip').classList.toggle('hidden', !s);
    if(s){
      const me = Auth.me();
      $('#user-chip').textContent = `${me.name} (${me.role})`;
    }
    // categories to search dropdowns
    const cats = DB.categories();
    const fill = (sel)=>{
      const el = $(sel); if(!el) return;
      el.innerHTML = `<option value="">All</option>` + cats.map(c=>`<option>${c}</option>`).join('');
    };
    fill('#global-filter-category'); fill('#m-filter-category');
    // theme
    $('#theme-toggle').onchange = (e)=>{
      document.body.classList.toggle('light', e.target.checked);
    };
  },
  renderHome(){
    // carousel
    const carousel = $('#carousel');
    const slides = [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1516387938699-a93567ec168e?q=80&w=1200&auto=format&fit=crop'
    ];
    carousel.innerHTML = `
      <div class="carousel-track">${slides.map(s=>`<div class="slide"><img src="${s}"/></div>`).join('')}</div>
      <div class="dots">${slides.map((_,i)=>`<div class="dot ${i? '':'active'}"></div>`).join('')}</div>
    `;
    let idx=0; const track = carousel.querySelector('.carousel-track'); const dots = carousel.querySelectorAll('.dot');
    setInterval(()=>{ idx=(idx+1)%slides.length; track.style.transform=`translateX(-${idx*100}%)`; dots.forEach((d,i)=>d.classList.toggle('active', i===idx)); }, 3500);

    // categories
    const cats = DB.categories();
    $('#cat-list').innerHTML = cats.map(c=>`<a href="#" class="chip" onclick="UI.filterCategory('${c}')">${c}</a>`).join('');

    UI.renderProducts();
  },
  triggerGlobalSearch(){
    const q = $('#global-search').value.trim().toLowerCase();
    const c = $('#global-filter-category').value;
    UI.renderProducts(q, c);
  },
  triggerMobileSearch(){
    const q = $('#m-search').value.trim().toLowerCase();
    const c = $('#m-filter-category').value;
    UI.renderProducts(q, c);
  },
  filterCategory(cat){ UI.renderProducts('', cat) },
  sortProducts(mode){
    const state = Store.read('ga_ui_state', {});
    state.sort = mode; Store.write('ga_ui_state', state);
    UI.renderProducts(state.q || '', state.cat || '');
  },
  renderProducts(q='', cat=''){
    const state = Store.read('ga_ui_state', {});
    state.q=q; state.cat=cat; Store.write('ga_ui_state', state);

    let list = DB.products().filter(p=>p.status!=='removed');
    if(q) list = list.filter(p => `${p.title} ${p.desc}`.toLowerCase().includes(q));
    if(cat) list = list.filter(p => p.category===cat);

    const mode = Store.read('ga_ui_state', {}).sort || 'recom';
    if(mode==='price-asc') list.sort((a,b)=>a.price-b.price);
    if(mode==='price-desc') list.sort((a,b)=>b.price-a.price);
    if(mode==='rating-desc') list.sort((a,b)=> (b.rating||0)-(a.rating||0) );
    if(mode==='newest') list.sort((a,b)=> b.created - a.created);

    $('#result-count').textContent = `${list.length} products`;

    const grid = $('#product-grid');
    grid.innerHTML = list.map(p=>UI.cardProduct(p)).join('') || `<div class="muted">No products yet.</div>`;
  },
  cardProduct(p){
    const img = (p.images&&p.images[0]) || 'https://dummyimage.com/600x400/0a0f14/ffffff&text=No+Image';
    const stars = '★'.repeat(Math.round(p.rating||0)) + '☆'.repeat(5-Math.round(p.rating||0));
    return `
    <div class="product card">
      <div class="thumb"><img src="${img}"/></div>
      <div class="body">
        <div class="row"><strong>${p.title}</strong><span class="space"></span><span class="badge">${p.category}</span></div>
        <div class="muted small">${p.desc.slice(0,80)}${p.desc.length>80?'…':''}</div>
        <div class="row"><div class="stars">${'★'.repeat(Math.round(p.rating||0))}</div><span class="muted small">${p.rating?.toFixed?.(1)||'—'} (${p.reviews?.length||0})</span></div>
        <div class="row"><div class="price">₹${p.price.toLocaleString()}</div><span class="space"></span>
          <button class="ghost" onclick="Router.go('/product/${p.id}')">View</button></div>
      </div>
    </div>`;
  },
  renderSell(){
    // categories
    const cats = DB.categories();
    $('#p-category').innerHTML = cats.map(c=>`<option>${c}</option>`).join('');

    // my listings
    UI.renderMyProducts();
    // handle file inputs -> base64
    $('#p-images').onchange = async (e)=>{
      const files = Array.from(e.target.files||[]);
      const imgs = await Promise.all(files.map(f=> new Promise(res=>{
        const reader=new FileReader(); reader.onload=()=>res(reader.result); reader.readAsDataURL(f);
      })));
      e.target.dataset.imgs = JSON.stringify(imgs);
    };
  },
  renderMyProducts(){
    const s = DB.session(); if(!s) return;
    const my = DB.products().filter(p=>p.sellerId===s.id && p.status!=='removed');
    $('#my-products').innerHTML = my.map(p=>`
      <div class="product card">
        <div class="thumb"><img src="${(p.images&&p.images[0])||'https://dummyimage.com/600x400/0a0f14/ffffff&text=No+Image'}"/></div>
        <div class="body">
          <strong>${p.title}</strong>
          <div class="row"><div class="price">₹${p.price.toLocaleString()}</div><span class="space"></span>
            <button class="ghost" onclick="Products.remove('${p.id}')">Remove</button>
          </div>
        </div>
      </div>
    `).join('') || `<div class="muted">No listings yet.</div>`;
  },
  renderProduct(id){
    const p = DB.products().find(x=>x.id===id); if(!p){ alert('Not found'); Router.go('/home'); }
    $('#d-title').textContent = p.title;
    $('#d-price').textContent = `₹${p.price.toLocaleString()}`;
    $('#d-cat').textContent = p.category;
    $('#d-desc').textContent = p.desc;
    $('#d-stars').innerHTML = '★'.repeat(Math.round(p.rating||0));
    $('#d-rating').textContent = `${p.rating?.toFixed?.(1)||'—'} (${p.reviews?.length||0})`;
    $('#detail-images').innerHTML = (p.images?.length? p.images: [null,null,null,null]).map(img=>`<img src="${img||'https://dummyimage.com/600x400/0a0f14/ffffff&text=No+Image'}"/>`).join('');
    // reviews
    const r = p.reviews||[];
    $('#reviews').innerHTML = r.map(rv=>`<div class="row"><div class="stars">${'★'.repeat(rv.stars)}</div><div>${rv.text}</div><span class="muted small">— ${rv.user}</span></div>`).join('') || `<div class="muted">Be the first to review.</div>`;
    // store current
    Store.write('ga_current_product', id);
  },
  renderTickets(){
    const me = Auth.me();
    const tickets = DB.tickets().filter(t=> (t.visibleTo && t.visibleTo.includes(me.id)) || me.role==='admin');
    $('#ticket-list').innerHTML = tickets.map(t=>`
      <div class="card pad" onclick="UI.openTicket('${t.id}')" style="cursor:pointer">
        <div class="row">
          <strong>#${t.id.slice(0,6)}</strong>
          <span class="badge">${t.product.title}</span>
          <span class="space"></span>
          <span class="status ${t.state}">${t.state}</span>
        </div>
        <div class="muted small">Buyer pays platform → escrow; Seller ships → staff releases/refunds.</div>
      </div>`).join('') || `<div class="muted">No tickets yet.</div>`;
  },
  openTicket(id){
    const me = Auth.me(); const t = DB.tickets().find(x=>x.id===id); if(!t) return;
    const room = $('#ticket-room');
    room.innerHTML = `
      <div class="row"><strong>Ticket #${t.id.slice(0,6)}</strong><span class="badge">${t.product.title}</span><span class="space"></span><span class="status ${t.state}">${t.state}</span></div>
      <div class="chat" id="chat">${t.messages.map(m=>`
        <div class="msg ${m.authorId===me.id?'me':''}">
          <div class="bubble"><div class="small muted">${m.author}</div>${m.text}</div>
        </div>`).join('')}</div>
      <div class="row">
        <input id="chat-text" class="input" placeholder="Message staff…"/>
        <button class="ghost" onclick="Tickets.send('${t.id}')">Send</button>
        ${me.role==='admin'? `<button<button class="ghost" onclick="Tickets.action('${t.id}','markShipped')">Mark Shipped</button>
        <button class="ghost" onclick="Tickets.action('${t.id}','release')">Release Payment</button>
        <button class="ghost" onclick="Tickets.action('${t.id}','refund')">Refund</button>
        <select onchange="Tickets.assignUser('${t.id}', this.value)">
          <option value="">Assign User</option>
          ${DB.users().map(u => `<option value="${u.id}">${u.name} (${u.email})</option>`).join('')}
        </select>`:''}
      </div>
    `;
  },
  renderAdmin(){
    // users
    const users = DB.users();
    $('#admin-users').innerHTML = users.map(u=>`
      <tr><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td><td>${new Date(u.joined).toLocaleDateString()}</td>
      <td class="row"><button class="ghost" onclick="Admin.toggleRole('${u.id}')">${u.role==='admin'?'Make User':'Make Admin'}</button>
      <button class="ghost" onclick="Admin.removeUser('${u.id}')">Remove</button></td></tr>
    `).join('');

    // products
    const ps = DB.products().filter(p => p.status !== 'removed');
    $('#admin-products').innerHTML = ps.map(p=>`
      <tr><td>${p.title}</td><td>${DB.users().find(u=>u.id===p.sellerId)?.name||'—'}</td><td>₹${p.price}</td><td>${p.category}</td><td>${p.status||'active'}</td>
      <td class="row"><button class="ghost" onclick="Router.go('/product/${p.id}')">Open</button><button class="ghost" onclick="Products.remove('${p.id}', true)">Remove</button></td></tr>
    `).join('');

    // tickets
    const ts = DB.tickets();
    $('#admin-tickets').innerHTML = ts.map(t=>`
      <tr><td>#${t.id.slice(0,6)}</td><td>${t.product.title}</td><td>${DB.users().find(u=>u.id===t.buyerId)?.name}</td>
      <td>${DB.users().find(u=>u.id===t.sellerId)?.name}</td><td>${t.state}</td>
      <td class="row"><button class="ghost" onclick="Router.go('/tickets'); setTimeout(()=>UI.openTicket('${t.id}'), 50)">Open</button><button class="ghost" onclick="Tickets.remove('${t.id}')">Remove</button></td></tr>
    `).join('');

    // categories
    const cats = DB.categories();
    $('#admin-cats').innerHTML = cats.map((c,i)=>`<span class="chip">${c} <a href="#" onclick="Admin.removeCategory(${i})">✕</a></span>`).join('');
  },
  switchTab(btn){
    $$('.admin-tab-button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const id = btn.dataset.tab;
    ['users','products','tickets','categories','settings'].forEach(t=>{
      document.getElementById('tab-'+t).classList.toggle('hidden', t!==id);
    });
  }
};

const Products = {
  add(){
    const s = DB.session(); const me = Auth.me(); if(!s) return;
    const title = $('#p-title').value.trim();
    const price = Number($('#p-price').value||0);
    const category = $('#p-category').value;
    const qty = parseInt($('#p-qty').value||1);
    const desc = $('#p-desc').value.trim();
    const images = JSON.parse($('#p-images').dataset.imgs||'[]');
    const phone = $('#p-phone').value.trim();
    const address = $('#p-address').value.trim();
    if(!title||!price||!category||!qty||!desc||!phone||!address){ return alert('Please fill all required fields (*)') }
    const prod = {id:Store.uid(), title, price, category, qty, desc, images, sellerId:s.id, sellerPrivate:{phone,address}, created:Date.now(), status:'active', reviews:[], rating:0};
    const list = DB.products(); list.push(prod); Store.write('ga_products', list);
    UI.renderMyProducts(); Router.go('/home');
  },
  remove(id, fromAdmin=false){
    const list = DB.products(); const idx = list.findIndex(p=>p.id===id); if(idx<0) return;
    list[idx].status='removed'; Store.write('ga_products', list);
    fromAdmin? UI.renderAdmin() : UI.renderMyProducts();
  },
  addReview(){
    if(!Auth.require()) return;
    const pid = Store.read('ga_current_product'); const p = DB.products().find(x=>x.id===pid); if(!p) return;
    const stars = Number($('#rev-stars').value); const text = $('#rev-text').value.trim(); if(!text) return;
    const me = Auth.me(); p.reviews = p.reviews||[]; p.reviews.push({user:me.name, stars, text});
    p.rating = p.reviews.reduce((a,b)=>a+b.stars,0)/p.reviews.length;
    const list = DB.products(); const idx=list.findIndex(x=>x.id===p.id); list[idx]=p; Store.write('ga_products', list);
    UI.renderProduct(p.id);
  }
};

const Escrow = {
  buyNow(){
    if(!Auth.require()) return;
    const me = Auth.me();
    const pid = Store.read('ga_current_product');
    const p = DB.products().find(x=>x.id===pid);
    if (p.sellerId === Auth.me().id) return alert('You cannot buy your own product.');
    // create ticket
    const t = { id:Store.uid(), buyerId:me.id, sellerId:p.sellerId, product:{id:p.id, title:p.title, price:p.price},
      state:'pending', created:Date.now(), messages:[{authorId:me.id, author:me.name, text:'Hi staff, I want to buy this item. Initiating payment to escrow.'}] };
    const ts = DB.tickets(); ts.push(t); Store.write('ga_tickets', ts);
    
    alert('Ticket opened!'); Router.go('/tickets'); setTimeout(()=>UI.openTicket(t.id), 100);
  }
};

const Tickets = {
  createSupportTicket() {
    if (!Auth.require()) return;
    const me = Auth.me();
    const subject = prompt('Enter subject for support ticket:');
    if (!subject) return alert('Subject cannot be empty.');

    const t = { 
      id: Store.uid(), 
      buyerId: me.id, 
      sellerId: 'admin',
      product: { id: 'support', title: subject, price: 0 },
      state: 'open', 
      created: Date.now(), 
      messages: [{ authorId: me.id, author: me.name, text: `Support ticket opened: ${subject}` }],
      visibleTo: [me.id] // Only visible to creator initially
    };
    const ts = DB.tickets(); 
    ts.push(t); 
    Store.write('ga_tickets', ts);
    
    alert('Support ticket opened! Admins will review and assign users.');
    Router.go('/tickets'); 
    setTimeout(() => UI.openTicket(t.id), 100);
  },
  
  assignUser(tid, uid) {
    if (!Auth.require('admin')) return;
    const ts = DB.tickets();
    const t = ts.find(t => t.id === tid);
    if (!t) return alert('Ticket not found');
    
    if (!t.visibleTo) t.visibleTo = [t.buyerId];
    if (!t.visibleTo.includes(uid)) {
      t.visibleTo.push(uid);
      Store.write('ga_tickets', ts);
      alert('User added to ticket');
    }
  },

  send(tid){
    const t = DB.tickets().find(x=>x.id===tid); if(!t) return;
    const me = Auth.me(); const text = $('#chat-text').value.trim(); if(!text) return;
    t.messages.push({authorId:me.id, author:me.name, text});
    Store.write('ga_tickets', DB.tickets().map(x=>x.id===t.id? t:x));
  },

  // Remove ticket
  remove(tid, bypassConfirm=false) {

    if(!bypassConfirm && !confirm('Are you sure you want to delete this ticket?')) return;
    Store.write('ga_tickets', DB.tickets().filter(t=>t.id!==tid));
    UI.renderAdmin();
     Router.go('/admin');
  },

  action(tid, act){
    const set = DB.tickets().slice(); const i = set.findIndex(x=>x.id===tid); if(i<0) return;
    const t = set[i]; const settings = DB.settings(); const fee = settings.fee;
    if(act==='markShipped') t.state='shipped';
    if(act==='release') { t.state='released'; t.releasedAmount = Math.round(t.product.price*(1-fee/100)); }
    if(act==='refund') t.state='refunded';
    set[i]=t; Store.write('ga_tickets', set); UI.openTicket(t.id); UI.renderAdmin();
  }
};

const Admin = {
  toggleRole(uid){
    const us = DB.users(); const i = us.findIndex(u=>u.id===uid); if(i<0) return;
    us[i].role = us[i].role==='admin'? 'user':'admin'; Store.write('ga_users', us); UI.renderAdmin();
  },
  removeUser(uid){
    if(!confirm('Remove this user?')) return;
    const us = DB.users().filter(u=>u.id!==uid); Store.write('ga_users', us); UI.renderAdmin();
  },
  addCategory(){
    const val = $('#cat-new').value.trim(); if(!val) return;
    const cs = DB.categories(); cs.push(val); Store.write('ga_categories', cs); UI.renderAdmin();
  },
  removeCategory(i){
    const cs = DB.categories(); cs.splice(i,1); Store.write('ga_categories', cs); UI.renderAdmin();
  },
  saveSettings(){
    const fee = Number($('#fee-percent').value||5), minHours = Number($('#min-release').value||1);
    Store.write('ga_settings', {fee, minHours});
    alert('Settings saved!');
  },
  export(){
    const data = {
      users: DB.users(), products: DB.products(), tickets: DB.tickets(), categories: DB.categories(), settings: DB.settings()
    };
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='getanywhere-export.json'; a.click(); URL.revokeObjectURL(url);
  },
  reset(){
    if(!confirm('Reset demo database?')) return;
    ['ga_users','ga_products','ga_tickets','ga_categories','ga_settings','ga_session','ga_admin_created','ga_ui_state'].forEach(k=>localStorage.removeItem(k));
    DB.init(); Router.go('/login');
  },
  seed(){
    const users = DB.users();
    const u1 = {id:Store.uid(), name:'Aarav Sharma', email:'aarav@example.com', pass:'pass', role:'user', joined:Date.now()-86400000*5};
    const u2 = {id:Store.uid(), name:'Priya Nair', email:'priya@example.com', pass:'pass', role:'user', joined:Date.now()-86400000*15};
    users.push(u1,u2); Store.write('ga_users', users);
    const prods = DB.products();
    const sample = (title,price,cat,desc,imgs)=>({id:Store.uid(), title, price, category:cat, qty:5, desc, images:imgs, sellerId:u1.id, sellerPrivate:{phone:'98xxxxxx12', address:'Bengaluru'}, created:Date.now()-Math.random()*1e7, status:'active', reviews:[], rating:4+Math.random()});
    prods.push(
      sample('iPhone 13 (128GB)', 42000, 'Mobiles','Gently used, battery health 90%, all accessories.', ['https://images.unsplash.com/photo-1603899123235-8316b51d2305?q=80&w=1200&auto=format&fit=crop']),
      sample('PlayStation 5', 45000, 'Gaming','Disc edition, with extra controller.', ['https://images.unsplash.com/photo-1606813907291-76e7c3ccef94?q=80&w=1200&auto=format&fit=crop']),
      sample('Dell XPS 13', 78000, 'PC & Laptops','i7, 16GB RAM, 512GB SSD.', ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1200&auto=format&fit=crop']),
      sample('Mechanical Keyboard', 3500, 'Electronics','Hot‑swappable, RGB.', ['https://images.unsplash.com/photo-1516387938699-a93567ec168e?q=80&w=1200&auto=format&fit=crop'])
    );
    Store.write('ga_products', prods);
    
    UI.renderAdmin();
  }
};

// helpers & boot
function starIcon(){ return '<i>★</i>' }
function htmlEscape(s){ return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])) }

window.addEventListener('DOMContentLoaded', ()=>{
  DB.init();
  Router.on('/login', Views.login);
  Router.on('/home', Views.home);
  Router.on('/sell', Views.sell);
  Router.on('/tickets', Views.tickets);
  Router.on('/admin', Views.admin);
  Router.render();
  // header search enter
  $('#global-search')?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') UI.triggerGlobalSearch() });
});


document.addEventListener("DOMContentLoaded", function () {
    const loginBtn = document.getElementById("login-btn");

    if (loginBtn) {
        loginBtn.addEventListener("click", function (e) {
            e.preventDefault();
            Auth.loginEmail();
        });
    }
});

