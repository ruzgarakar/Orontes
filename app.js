import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import { getDatabase, ref, push, onValue, off, remove, update, get, runTransaction, query, orderByChild, equalTo, limitToLast, onChildAdded } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, updatePassword, sendPasswordResetEmail, sendEmailVerification, EmailAuthProvider, deleteUser, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";


const firebaseConfig = {

apiKey: "AIzaSyAtOgpco-AvbSTpXnktU5SO2oNmocuY_0g",

authDomain: "orontes-886a3.firebaseapp.com",

databaseURL: "https://orontes-886a3-default-rtdb.europe-west1.firebasedatabase.app",

projectId: "orontes-886a3",

storageBucket: "orontes-886a3.appspot.com",

messagingSenderId: "220241708945",

appId: "1:220241708945:web:1a638ad256a7872282fc30",

measurementId: "G-WP8LYJG7N9"

};


const app = initializeApp(firebaseConfig);

const db = getDatabase(app);

const auth = getAuth(app);


window.showErrorPage = function(statusCode = 400, message = "Kötü İstek (Bad Request)") {

document.body.innerHTML = &lt;div style="height:100vh; width:100vw; display:flex; flex-direction:column; justify-content:center; align-items:center; background-color:#f8f9fa; color:#1a1a1a; font-family:sans-serif; text-align:center; padding:20px; z-index:999999; position:fixed; top:0; left:0;"&gt; &lt;i class="fa-solid fa-triangle-exclamation" style="font-size: 60px; color:#dc2626; margin-bottom: 20px;"&gt;&lt;/i&gt; &lt;h1 style="font-size: 80px; margin:0; color:#dc2626; font-weight: 900; line-height: 1;"&gt;${statusCode}</h1>

<h2 style="font-size: 24px; margin-top:10px; font-weight: bold;">${message}&lt;/h2&gt; &lt;p style="color:#666; margin-top:15px; max-width:400px; font-size: 15px;"&gt;Sistem isteğinizi işleyemedi veya geçersiz bir veri gönderildi. Lütfen sayfayı yenileyerek tekrar deneyin.&lt;/p&gt; &lt;button onclick="window.location.reload()" style="margin-top:25px; padding:12px 24px; background:#10b981; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:bold; font-size: 16px; box-shadow: 0 4px 6px rgba(16,185,129,0.3); transition: transform 0.2s;"&gt; &lt;i class="fa-solid fa-rotate-right" style="margin-right: 8px;"&gt;&lt;/i&gt; Sayfayı Yenile &lt;/button&gt; &lt;/div&gt;;

};


window.showToast = function(message, type = 'success') {

const toast = document.createElement('div');

toast.innerHTML = <div style="display:flex; align-items:center; gap:10px;"&gt; &lt;i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : (type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-check')}"></i>

<span>${message}&lt;/span&gt; &lt;/div>;

toast.style.position = 'fixed';

toast.style.bottom = '20px';

toast.style.right = '20px';

toast.style.padding = '14px 24px';

toast.style.borderRadius = '12px';

toast.style.color = '#fff';

toast.style.fontWeight = '500';

toast.style.fontFamily = 'inherit';

toast.style.fontSize = '14px';

toast.style.zIndex = '99999';

toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';

toast.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';

toast.style.transform = 'translateY(100px)';

toast.style.opacity = '0';

toast.style.maxWidth = '350px';

toast.style.lineHeight = '1.4';


if (type === 'error') toast.style.backgroundColor = '#ef4444';

else if (type === 'warning') toast.style.backgroundColor = '#f59e0b';

else toast.style.backgroundColor = '#10b981';


document.body.appendChild(toast);


setTimeout(() => {

toast.style.transform = 'translateY(0)';

toast.style.opacity = '1';

}, 10);


setTimeout(() => {

toast.style.transform = 'translateY(20px)';

toast.style.opacity = '0';

setTimeout(() => toast.remove(), 400);

}, 5000);

};


window.db = db;

window.ref = ref;

window.push = push;

window.remove = remove;

window.update = update;

window.get = get;

window.runTransaction = runTransaction;

window.query = query;

window.orderByChild = orderByChild;

window.equalTo = equalTo;

window.limitToLast = limitToLast;

window.off = off;

window.onChildAdded = onChildAdded;

window.reauthenticateWithCredential = reauthenticateWithCredential;


window.currentUser = null;

window.userExtraData = { favorites: {}, offers: {} };

window.listings = [];

window.filteredListings = [];

window.currentViewMode = 'grid';

window.activeListingId = null;

window.mapInstance = null;

window.formMapInstance = null;

window.formMarker = null;

window.activeOffersListener = null;

window.activeOffersQuery = null;

window.activeOutgoingOffersListener = null;

window.activeOutgoingOffersQuery = null;


window.pendingOffersCount = 0;


window.currentPage = 1;

window.itemsPerPage = 12;


window.catModalCurrentPage = 1;

window.catModalItemsPerPage = 5;

window.currentCategoryModalData = [];


window.sanitizeUsernameKey = function(name) {

return String(name || '').trim().toLowerCase().replace(/[.#$`[]/\s]+/g, '_');

};


window.MAX_IMAGE_SIZE_MB = 8;


window.checkFileSize = function(inputEl) {

const file = inputEl.files && inputEl.files[0];

if (!file) return;

const sizeMb = file.size / (1024 * 1024);

if (sizeMb > window.MAX_IMAGE_SIZE_MB) {

window.showToast(Seçtiğiniz görsel${sizeMb.toFixed(1)}MB — izin verilen en fazla ${window.MAX_IMAGE_SIZE_MB}MB., 'error');

inputEl.value = '';

}

};


window.compressImage = function(file) {

return new Promise((resolve, reject) => {

if (!file || !file.type || !file.type.startsWith('image/')) {

reject(new Error('Lütfen geçerli bir görsel dosyası seçin.'));

return;

}

const sizeMb = file.size / (1024 * 1024);

if (sizeMb > window.MAX_IMAGE_SIZE_MB) {

reject(new Error(Görsel çok büyük (${sizeMb.toFixed(1)}MB). Maksimum ${window.MAX_IMAGE_SIZE_MB}MB olmalıdır.));

return;

}

const reader = new FileReader();

reader.onerror = () => reject(new Error('Dosya okunamadı. Lütfen tekrar deneyin.'));

reader.readAsDataURL(file);

reader.onload = (event) => {

const img = new Image();

img.onerror = () => reject(new Error('Görsel işlenemedi. Lütfen başka bir dosya deneyin.'));

img.src = event.target.result;

img.onload = () => {

const canvas = document.createElement('canvas');

const MAX_WIDTH = 800;

const MAX_HEIGHT = 800;

let width = img.width;

let height = img.height;


if (width > height && width > MAX_WIDTH) {

height *= MAX_WIDTH / width;

width = MAX_WIDTH;

} else if (height > MAX_HEIGHT) {

width *= MAX_HEIGHT / height;

height = MAX_HEIGHT;

}


canvas.width = width;

canvas.height = height;

const ctx = canvas.getContext('2d');

ctx.drawImage(img, 0, 0, width, height);

resolve(canvas.toDataURL('image/jpeg', 0.7));

};

};

});

};


onAuthStateChanged(auth, async (user) => {

window.currentUser = user;

const loggedOutBox = document.getElementById('auth-logged-out');

const loggedInBox = document.getElementById('auth-logged-in');


if (window.activeOffersListener && window.activeOffersQuery) {

off(window.activeOffersQuery, 'value', window.activeOffersListener);

window.activeOffersListener = null;

}


if (window.activeOutgoingOffersListener && window.activeOutgoingOffersQuery) {

off(window.activeOutgoingOffersQuery, 'value', window.activeOutgoingOffersListener);

window.activeOutgoingOffersListener = null;

}


if (user) {

if (loggedOutBox) loggedOutBox.classList.add('hidden');

if (loggedInBox) loggedInBox.classList.remove('hidden');


window.loginSessionTime = Date.now();


const userRef = ref(db, 'users/' + user.uid);

try {

const snap = await get(userRef);

if (snap.exists()) {

window.userExtraData = snap.val();

if(!window.userExtraData.favorites) window.userExtraData.favorites = {};

} else {

window.userExtraData = { favorites: {} };

}

} catch(err) {

console.error("Kullanıcı verisi çekilemedi:", err);

window.userExtraData = { favorites: {} };

}


// Bize gelen teklifleri (Satıcıysak) dinleyen yapı

window.activeOffersQuery = query(ref(db, 'offers'), orderByChild('sellerUid'), equalTo(user.uid));

window.activeOffersListener = onValue(window.activeOffersQuery, (snapshot) => {

let count = 0;

let newlyAdded = false;


snapshot.forEach(child => {

const offer = child.val();

if(offer.status === 'Beklemede') {

count++;

if (offer.date > window.loginSessionTime && (Date.now() - offer.date) < 10000) {

newlyAdded = true;

}

}

});


window.pendingOffersCount = count;

window.updateNotificationBadge();


if (newlyAdded) window.showToast("🔔 Yeni bir teklif aldınız! Gelen kutunuzu kontrol edin.", "success");


const offersTabContent = document.getElementById('tab-content-offers');

if (offersTabContent && !offersTabContent.classList.contains('hidden')) window.loadIncomingOffers();

});


// Bizim gönderdiğimiz teklifleri (Alıcıysak) dinleyen yapı

window.activeOutgoingOffersQuery = query(ref(db, 'offers'), orderByChild('buyerUid'), equalTo(user.uid));

window.activeOutgoingOffersListener = onValue(window.activeOutgoingOffersQuery, (snapshot) => {

const offersTabContent = document.getElementById('tab-content-offers');

if (offersTabContent && !offersTabContent.classList.contains('hidden')) {

window.loadIncomingOffers();

}

});


} else {

if (loggedOutBox) loggedOutBox.classList.remove('hidden');

if (loggedInBox) loggedInBox.classList.add('hidden');

window.userExtraData = { favorites: {} };

window.pendingOffersCount = 0;

window.updateNotificationBadge();

}

window.filterListings();

});


window.updateNotificationBadge = function() {

const badge = document.getElementById('notification-badge');

if (badge) {

if (window.pendingOffersCount > 0) {

badge.innerText = window.pendingOffersCount > 99 ? '99+' : window.pendingOffersCount;

badge.classList.remove('hidden');

badge.style.display = 'flex';

} else {

badge.classList.add('hidden');

badge.style.display = 'none';

}

}

};


window.activeDbListener = null;

window.activeQuery = null;

window.lastFetchedCategory = null;


window.triggerDatabaseFilter = function(category = '') {

let q;

if (category) {

q = query(ref(db, 'listings'), orderByChild('category'), equalTo(category), limitToLast(150));

} else {

q = query(ref(db, 'listings'), orderByChild('date'), limitToLast(60));

}


if (window.activeQuery && window.activeDbListener) {

off(window.activeQuery, 'value', window.activeDbListener);

}


window.activeQuery = q;

window.activeDbListener = onValue(q, (snapshot) => {

const items = [];

snapshot.forEach((childSnapshot) => {

items.push({ id: childSnapshot.key, ...childSnapshot.val() });

});

window.listings = items;

window.executeLocalFilters();

window.updateMarqueeData();

});

};


window.filterListings = function() {

const categoryFilter = document.getElementById('category-filter');

const currentCategory = categoryFilter ? categoryFilter.value : '';


if (currentCategory !== window.lastFetchedCategory) {

window.lastFetchedCategory = currentCategory;

window.triggerDatabaseFilter(currentCategory);

return;

}

window.executeLocalFilters();

};


window.executeLocalFilters = function() {

const searchInput = document.getElementById('search-input');

const districtFilter = document.getElementById('district-filter');

const sortFilter = document.getElementById('sort-filter');

const minPriceFilter = document.getElementById('min-price-filter');

const maxPriceFilter = document.getElementById('max-price-filter');


const search = searchInput ? searchInput.value.toLowerCase() : '';

const district = districtFilter ? districtFilter.value : '';

const sort = sortFilter ? sortFilter.value : 'newest';

const minPrice = minPriceFilter ? (Number(minPriceFilter.value) || 0) : 0;

const maxPrice = maxPriceFilter ? (Number(maxPriceFilter.value) || Infinity) : Infinity;


window.filteredListings = (window.listings || []).filter(item => {

const matchesSearch = String(item.title || '').toLowerCase().includes(search) || String(item.desc || '').toLowerCase().includes(search);

const matchesDistrict = district === "" || item.district === district;

const matchesPrice = item.price >= minPrice && item.price <= maxPrice;

return matchesSearch && matchesDistrict && matchesPrice;

});


if (window.nearbyModeActive && window.userGeoLocation) {

window.filteredListings.forEach(item => {

item._distanceKm = (item.lat && item.lng)

? window.haversineKm(window.userGeoLocation.lat, window.userGeoLocation.lng, item.lat, item.lng)

: null;

});

window.filteredListings.sort((a, b) => {

if (a._distanceKm === null) return 1;

if (b._distanceKm === null) return -1;

return a._distanceKm - b._distanceKm;

});

} else if (sort === 'price-low') window.filteredListings.sort((a, b) => a.price - b.price);

else if (sort === 'price-high') window.filteredListings.sort((a, b) => b.price - a.price);

else if (sort === 'oldest') window.filteredListings.sort((a, b) => a.date - b.date);

else window.filteredListings.sort((a, b) => b.date - a.date);


window.currentPage = 1;

renderListings();

};


setTimeout(() => { window.filterListings(); }, 300);


// --- ÇIKIŞ YAP FONKSİYONU EKLENDİ ---

window.handleLogout = async function() {

try {

await signOut(auth);

window.showToast("Başarıyla çıkış yapıldı.", "success");

if (typeof closeAccountModal === 'function') closeAccountModal();

if (typeof closeDetailModal === 'function') closeDetailModal();

if (typeof closeFormModal === 'function') closeFormModal();

} catch(err) {

window.showToast("Çıkış yapılamadı: " + err.message, "error");

}

};

// ------------------------------------


window.handleAuthSubmit = async function(e) {

e.preventDefault();

const mode = document.getElementById('auth-mode').value;

const email = document.getElementById('auth-email').value.trim();

const password = document.getElementById('auth-password').value;

const username = document.getElementById('auth-username').value.trim();

const phone = document.getElementById('auth-phone').value.trim();

const btn = document.getElementById('auth-submit-btn');


btn.disabled = true;

btn.innerText = "İşlem yapılıyor...";


try {

if (mode === 'login') {

await signInWithEmailAndPassword(auth, email, password);

window.showToast("Giriş başarılı, yönlendiriliyorsunuz...", "success");

closeAuthModal();

} else {

if (!username) {

window.showToast("Lütfen bir kullanıcı adı belirleyin.", "error");

throw new Error("UI_VALIDATION");

}

if (password.length < 6) {

window.showToast("Şifreniz en az 6 karakter olmalıdır.", "error");

throw new Error("UI_VALIDATION");

}


const cleanPhone = phone.replace(/[^0-9]/g, '');

if (!cleanPhone || cleanPhone.length < 10) {

window.showToast("Lütfen geçerli bir telefon numarası girin (Örn: 5554443322).", "error");

throw new Error("UI_VALIDATION");

}


const usernameKey = window.sanitizeUsernameKey(username);

let isUsernameTaken = false;


try {

const usernameSnap = await get(ref(db, 'usernames/' + usernameKey));

isUsernameTaken = usernameSnap.exists();

} catch (checkErr) {

console.warn("Veritabanı Okuma Kuralları kısıtlı olabilir, kullanıcı adı kontrolü atlandı.");

}


if (isUsernameTaken) {

window.showToast("❌ Bu kullanıcı adı başkası tarafından alınmış!", "error");

throw new Error("UI_VALIDATION");

}


const res = await createUserWithEmailAndPassword(auth, email, password);


try {

await sendEmailVerification(res.user);

} catch (emailErr) {}


try { await updateProfile(res.user, { displayName: username }); } catch(e) {}


try {

await update(ref(db, 'users/' + res.user.uid), {

username: username,

phone: phone,

email: email,

joinedAt: Date.now()

});

await update(ref(db, 'publicProfiles/' + res.user.uid), {

username: username,

joinedAt: Date.now()

});

await update(ref(db, 'usernames/' + usernameKey), { uid: res.user.uid });

} catch (dbErr) {

window.showToast("Kayıt başarılı ancak Firebase kuralları veri kaydını engelledi.", "warning");

}


await signOut(auth);

window.showToast("Kayıt tamamlandı! Lütfen e-postanıza gelen linke tıklayarak hesabınızı doğrulayın.", "success");

toggleAuthMode();

}

} catch (err) {

if (err.message === "UI_VALIDATION") {

} else if (err.code === 'auth/email-already-in-use') {

window.showToast("Bu e-posta adresi zaten kayıtlı!", "error");

} else if (err.code === 'auth/invalid-email') {

window.showToast("Lütfen geçerli bir e-posta adresi yazın.", "error");

} else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {

window.showToast("E-posta adresiniz veya şifreniz hatalı.", "error");

} else {

window.showToast("Bir hata oluştu: " + err.message, "error");

}

} finally {

btn.disabled = false;

btn.innerText = mode === 'login' ? "Giriş Yap" : "Kayıt Ol";

}

};


window.handleForgotPassword = async function(e) {

// 1. Sayfanın yenilenmesini kesin olarak engelle

if (e && typeof e.preventDefault === 'function') {

e.preventDefault();

}


// 2. Boşlukları (trim) temizleyerek al

const emailInput = document.getElementById('auth-email');

const email = emailInput ? emailInput.value.trim() : '';


if (!email) {

window.showToast("Lütfen e-posta alanına kayıtlı adresinizi yazın.", "warning");

return;

}


try {

window.showToast("İstek gönderiliyor, lütfen bekleyin...", "warning");

await sendPasswordResetEmail(auth, email);

window.showToast("Şifre sıfırlama bağlantısı gönderildi! (Gereksiz/Spam kutusunu da kontrol edin)", "success");

} catch(err) {

console.error("Sıfırlama Hatası Detayı:", err);

// Hata durumunda Firebase'in gerçek hata kodunu ekrana basalım ki sorunu görelim

if (err.code === 'auth/user-not-found') {

window.showToast("Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.", "error");

} else if (err.code === 'auth/invalid-email') {

window.showToast("Geçersiz bir e-posta formatı girdiniz.", "error");

} else {

window.showToast("Bir hata oluştu: " + err.message, "error");

}

}

};


window.togglePasswordVisibility = function(inputId, iconId) {

const input = document.getElementById(inputId);

const icon = document.getElementById(iconId);

if (!input || !icon) return;

if (input.type === "password") {

input.type = "text";

icon.classList.remove("fa-eye");

icon.classList.add("fa-eye-slash");

} else {

input.type = "password";

icon.classList.remove("fa-eye-slash");

icon.classList.add("fa-eye");

}

};


window.toggleFavorite = async function(id) {

if (!window.currentUser) {

window.showToast("Favorilere eklemek için giriş yapmalısınız.", "warning");

openAuthModal('login');

return;

}


const favRef = ref(db, users/${window.currentUser.uid}/favorites/latex

{id}`); if (window.userExtraData.favorites && window.userExtraData.favorites[id]) { await remove(favRef); delete window.userExtraData.favorites[id]; window.showToast("İlan favorilerinizden çıkarıldı.", "success"); } else { await update(ref(db, `users/


{window.currentUser.uid}/favorites`), { [id]: true });

if(!window.userExtraData.favorites) window.userExtraData.favorites = {};

window.userExtraData.favorites[id] = true;

window.showToast("İlan favorilerinize eklendi!", "success");

}

renderListings();

updateFavBtnStyle(id);

};


window.submitPriceOffer = async function() {

if (!window.currentUser) {

window.showToast("Teklif vermek için giriş yapmalısınız.", "warning");

openAuthModal('login');

return;

}

const price = document.getElementById('offer-price-input').value;

const note = document.getElementById('offer-note-input').value;


if (!price) {

window.showToast("Lütfen teklif ettiğiniz fiyatı girin.", "warning");

return;

}


const item = window.listings.find(l => l.id === window.activeListingId);

if (!item) return;


if (item.uid === window.currentUser.uid) {

window.showToast("Kendi ilanınıza teklif gönderemezsiniz.", "error");

return;

}


try {

await push(ref(db, 'offers'), {

listingId: item.id,

listingTitle: item.title,

sellerUid: item.uid,

buyerUid: window.currentUser.uid,

buyerName: window.userExtraData.username || window.currentUser.displayName || window.currentUser.email,

buyerPhone: window.userExtraData.phone || 'Belirtilmedi',

offeredPrice: price,

note: note,

status: 'Beklemede',

date: Date.now()

});

window.showToast("Teklifiniz satıcıya başarıyla iletildi!", "success");

document.getElementById('offer-price-input').value = '';

document.getElementById('offer-note-input').value = '';

} catch (err) {

window.showToast("Teklif iletilemedi: " + err.message, "error");

}

};


window.handleFormSubmit = async function(e) {

e.preventDefault();

if (!window.currentUser) {

window.showToast("İlan vermek için giriş yapmalısınız.", "warning");

return;

}


const editId = document.getElementById('edit-listing-id').value;

let existingItem = null;

if (editId) {

existingItem = (window.listings || []).find(l => l.id === editId);

if (!existingItem || existingItem.uid !== window.currentUser.uid) {

window.showToast("Bu ilanı düzenleme yetkiniz yok.", "error");

return;

}

}


const submitBtn = document.getElementById('submit-btn');

submitBtn.disabled = true;

submitBtn.innerText = "İlan kaydediliyor...";


try {

let imageUrl = document.getElementById('form-image').value;

const fileInput = document.getElementById('form-file');


if (fileInput.files && fileInput.files[0]) {

const file = fileInput.files[0];

imageUrl = await window.compressImage(file);

}


const category = document.getElementById('form-category').value;

const newPrice = Number(document.getElementById('form-price').value);


let priceHistory = existingItem ? (existingItem.priceHistory || []) : [];

if (existingItem && existingItem.price !== newPrice) {

priceHistory.push({ price: existingItem.price, date: Date.now() });

}


let isFirst100 = false;

if (!editId) {

const counterRef = ref(db, 'listingCounter');

const result = await runTransaction(counterRef, (currentData) => {

let count = (currentData && currentData.count) || 0;

isFirst100 = (count < 100);

return { count: count + 1 };

});

if (!result.committed) throw new Error('Sayaç güncellenemedi.');

}


const userVipChoice = document.getElementById('form-vip').checked;

const finalVip = (!editId && isFirst100) ? true : userVipChoice;

const threeMonthsInMs = 90 * 24 * 60 * 60 * 1000;


let finalExpireDate = null;

if (finalVip) {

if (existingItem && existingItem.isVip && existingItem.vipExpireDate) {

finalExpireDate = existingItem.vipExpireDate;

} else {

finalExpireDate = Date.now() + threeMonthsInMs;

}

}


const isOutside = !!window.locationOutsideHatay;


const listingData = {

uid: window.currentUser.uid,

userEmail: window.currentUser.email,

title: document.getElementById('form-title').value,

category: category,

district: document.getElementById('form-district').value,

address: document.getElementById('form-address').value || null,

outsideHatay: isOutside,

realProvince: isOutside ? window.locationOutsideHatay.province : null,

realDistrict: isOutside ? window.locationOutsideHatay.district : null,

lat: Number(document.getElementById('form-lat').value) || null,

lng: Number(document.getElementById('form-lng').value) || null,

price: newPrice,

priceHistory: priceHistory,

unit: document.getElementById('form-unit').value || 'KG',

seller: document.getElementById('form-seller').value,

phone: document.getElementById('form-phone').value,

desc: document.getElementById('form-desc').value,

businessType: document.getElementById('form-business-type').value,

minOrderQty: document.getElementById('form-business-type').value === 'Toptancı'

? (document.getElementById('form-min-order').value || null)

: null,

image: imageUrl || window.getDefaultImage(category),

isVip: finalVip,

vipExpireDate: finalExpireDate,

isUrgent: document.getElementById('form-urgent').checked,

isDiscount: document.getElementById('form-discount').checked,

date: existingItem ? existingItem.date : Date.now()

};


if (editId) {

await update(ref(db, 'listings/' + editId), listingData);

window.showToast('İlan başarıyla güncellendi!', "success");

} else {

await push(ref(db, 'listings'), listingData);

if (isFirst100) {

window.showToast('🚀 İlan yayınlandı! İlk 100 ilana özel 3 AYLIK ÜCRETSİZ VIP tanımlandı.', "success");

} else {

window.showToast('İlanınız yayına alındı!', "success");

}

}

closeFormModal();

closeDetailModal();

} catch (err) {

window.showToast('İlan kaydedilemedi. Geçersiz veri girilmiş olabilir.', "error");

window.showErrorPage(400, "Form Gönderim Hatası");

} finally {

submitBtn.disabled = false;

submitBtn.innerText = "İlanı Kaydet";

}

};


window.updateAccountDetails = async function() {

if (!window.currentUser) return;

const newUsername = document.getElementById('update-username').value.trim();

const newPhone = document.getElementById('update-phone').value.trim();

const newPass = document.getElementById('update-new-password').value;

const currentPass = document.getElementById('update-current-password').value;

const btn = document.getElementById('update-acc-btn');


if (!currentPass) {

window.showToast("Lütfen mevcut şifrenizi girin.", "warning");

return;

}


btn.disabled = true;

btn.innerText = "Güncelleniyor...";


try {

const credential = EmailAuthProvider.credential(window.currentUser.email, currentPass);

await window.reauthenticateWithCredential(window.currentUser, credential);


if (newUsername !== window.userExtraData.username) {

const newUsernameKey = window.sanitizeUsernameKey(newUsername);

const oldUsernameKey = window.sanitizeUsernameKey(window.userExtraData.username);


const usernameSnap = await get(ref(db, 'usernames/' + newUsernameKey));

if (usernameSnap.exists()) {

window.showToast("❌ Bu kullanıcı adı başkası tarafından alınmış!", "error");

btn.disabled = false;

btn.innerText = "Değişiklikleri Kaydet";

return;

}


await update(ref(db, 'usernames/' + newUsernameKey), { uid: window.currentUser.uid });

if (window.userExtraData.username) {

await remove(ref(db, 'usernames/' + oldUsernameKey));

}

}


await update(ref(db, 'users/' + window.currentUser.uid), {

username: newUsername,

phone: newPhone

});


await update(ref(db, 'publicProfiles/' + window.currentUser.uid), {

username: newUsername

});

await updateProfile(window.currentUser, { displayName: newUsername });


if (newPass.trim() !== "") {

if (newPass.length < 6) {

window.showToast("Yeni şifre en az 6 karakter olmalıdır.", "error");

btn.disabled = false;

btn.innerText = "Değişiklikleri Kaydet";

return;

}

await updatePassword(window.currentUser, newPass);

window.showToast("Şifreniz ve profiliniz güncellendi!", "success");

} else {

window.showToast("Profil bilgileriniz başarıyla güncellendi!", "success");

}


window.userExtraData.username = newUsername;

window.userExtraData.phone = newPhone;

document.getElementById('update-current-password').value = '';

document.getElementById('update-new-password').value = '';

closeAccountModal();

} catch (err) {

window.showToast("Hata: Mevcut şifreniz yanlış veya işlem başarısız.", "error");

} finally {

btn.disabled = false;

btn.innerText = "Değişiklikleri Kaydet";

}

};


window.deleteUserAccount = async function() {

if (!window.currentUser) return;

const confirmDelete = confirm("⚠️ DİKKAT: Hesabınızı kalıcı olarak kapatmak istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz silinir.");

if (!confirmDelete) return;


const password = prompt("Hesabınızı silmek için lütfen mevcut şifrenizi girin:");

if (!password) return;


try {

const credential = EmailAuthProvider.credential(window.currentUser.email, password);

await window.reauthenticateWithCredential(window.currentUser, credential);


const myListings = (window.listings || []).filter(l => l.uid === window.currentUser.uid);

for (const listing of myListings) {

try { await remove(ref(db, 'listings/' + listing.id)); } catch(e) {}

}


try {

const usernameKey = window.sanitizeUsernameKey(window.userExtraData.username);

await remove(ref(db, 'usernames/' + usernameKey));

await remove(ref(db, 'publicProfiles/' + window.currentUser.uid));

} catch(e) {}


await remove(ref(db, 'users/' + window.currentUser.uid));

await deleteUser(window.currentUser);


window.showToast("Hesabınız kalıcı olarak silindi.", "success");

closeAccountModal();

} catch (err) {

window.showToast("Şifre yanlış veya işlem gerçekleştirilemedi.", "error");

}

};


window.deleteCurrentListing = async function(id) {

const targetId = id || window.activeListingId;

if (!targetId || !window.currentUser) return;


const target = (window.listings || []).find(l => l.id === targetId);

if (!target || target.uid !== window.currentUser.uid) {

window.showToast("Bu ilanı silme yetkiniz yok.", "error");

return;

}


if (confirm("Bu ilanı silmek istediğinizden emin misiniz?")) {

try {

await remove(ref(db, 'listings/' + targetId));

window.showToast("İlan silindi.", "success");

closeDetailModal();

closeAccountModal();

} catch (err) {

window.showToast("Silinemedi: " + err.message, "error");

}

}

};


window.loadSellerProfileBox = async function(sellerUid) {

const joinedEl = document.getElementById('detail-seller-joined');

const ratingEl = document.getElementById('detail-seller-rating');

const rateBox = document.getElementById('rate-seller-box');

const starsEl = document.getElementById('rate-seller-stars');


if (!joinedEl || !ratingEl) return;


joinedEl.innerText = "Üyelik bilgisi yükleniyor...";

ratingEl.innerText = "☆☆☆☆☆";

if (rateBox) rateBox.classList.add('hidden');

if (starsEl) starsEl.innerHTML = '';


const listingCount = (window.listings || []).filter(l => l.uid === sellerUid).length;


try {

const profileSnap = await get(ref(db, 'publicProfiles/' + sellerUid));

let joinedText = '';

if (profileSnap.exists() && profileSnap.val().joinedAt) {

const d = new Date(profileSnap.val().joinedAt);

joinedText = Üye: ${d.toLocaleDateString('tr-TR', { year:'numeric', month:'long' })} · ; } joinedEl.innerText = ``${joinedText}${listingCount} ilan; } catch (err) { joinedEl.innerText = ``${listingCount} ilan;

}


try {

const ratingsSnap = await get(ref(db, 'ratings/' + sellerUid));

const ratingsData = ratingsSnap.val() || {};

const scores = Object.values(ratingsData).map(r => r.score).filter(s => typeof s === 'number');

const avg = scores.length ? (scores.reduce((a,b) => a+b, 0) / scores.length) : 0;

const roundedStars = Math.round(avg);

ratingEl.innerText = scores.length

? ${'★'.repeat(roundedStars)}${'☆'.repeat(5 - roundedStars)} ${avg.toFixed(1)} (${scores.length})

: 'Henüz değerlendirme yok';


if (window.currentUser && window.currentUser.uid !== sellerUid && rateBox) {

rateBox.classList.remove('hidden');

const myRating = ratingsData[window.currentUser.uid] ? ratingsData[window.currentUser.uid].score : 0;

for (let i = 1; i <= 5; i++) {

const star = document.createElement('span');

star.innerText = i <= myRating ? '★' : '☆';

star.style.color = i <= myRating ? '#bca879' : '#c7c7c7';

star.onclick = () => window.submitRating(sellerUid, i);

starsEl.appendChild(star);

}

}

} catch (err) {

ratingEl.innerText = 'Puanlar yüklenemedi';

}

};


window.submitRating = async function(sellerUid, score) {

if (!window.currentUser) {

window.showToast("Değerlendirme yapmak için giriş yapmalısınız.", "warning");

openAuthModal('login');

return;

}

if (window.currentUser.uid === sellerUid) {

window.showToast("Kendi ilanınıza puan veremezsiniz.", "error");

return;

}

try {

await update(ref(db, ratings/${sellerUid}/${window.currentUser.uid}), {

score: score,

date: Date.now()

});

window.loadSellerProfileBox(sellerUid);

const sellerModal = document.getElementById('seller-profile-modal');

if (sellerModal && !sellerModal.classList.contains('hidden')) {

window.openSellerProfileModal(sellerUid);

}

} catch (err) {

window.showToast("Değerlendirme kaydedilemedi.", "error");

}

};


window.openSellerProfileModal = async function(sellerUid) {

if (!sellerUid) return;


const nameEl = document.getElementById('seller-profile-name');

const avatarEl = document.getElementById('seller-profile-avatar');

const joinedEl = document.getElementById('seller-profile-joined');

const ratingEl = document.getElementById('seller-profile-rating');

const countEl = document.getElementById('seller-profile-count');

const listingsEl = document.getElementById('seller-profile-listings');


const sellerListings = (window.listings || []).filter(l => l.uid === sellerUid).sort((a,b) => b.date - a.date);

const displayName = sellerListings.length ? sellerListings[0].seller : 'Satıcı';


nameEl.innerText = displayName;

avatarEl.innerText = (displayName || 'U').charAt(0).toUpperCase();

joinedEl.innerText = "Üyelik bilgisi yükleniyor...";

ratingEl.innerText = "☆☆☆☆☆";

countEl.innerText = ${sellerListings.length} ilan`;

listingsEl.innerHTML = '';


document.getElementById('seller-profile-modal').classList.remove('hidden');


try {

const profileSnap = await get(ref(db, 'publicProfiles/' + sellerUid));

if (profileSnap.exists() && profileSnap.val().joinedAt) {

const d = new Date(profileSnap.val().joinedAt);

const now = Date.now();

const years = Math.floor((now - profileSnap.val().joinedAt) / (365 * 24 * 60 * 60 * 1000));

const sinceText = years >= 1 ? ``${years} yıldır üye:${d.toLocaleDateString('tr-TR', { year:'numeric', month:'long' })} tarihinden beri üye;

joinedEl.innerText = sinceText;

} else {

joinedEl.innerText = "Üyelik tarihi bilinmiyor";

}

} catch (err) {

joinedEl.innerText = "Üyelik tarihi bilinmiyor";

}


try {

const ratingsSnap = await get(ref(db, 'ratings/' + sellerUid));

const ratingsData = ratingsSnap.val() || {};

const scores = Object.values(ratingsData).map(r => r.score).filter(s => typeof s === 'number');

const avg = scores.length ? (scores.reduce((a,b) => a+b, 0) / scores.length) : 0;

const roundedStars = Math.round(avg);

ratingEl.innerText = scores.length

? ``${'★'.repeat(roundedStars)}{avg.toFixed(1)} (${scores.length})

: 'Henüz değerlendirme yok';

} catch (err) {

ratingEl.innerText = 'Puanlar yüklenemedi';

}


if (sellerListings.length === 0) {

listingsEl.innerHTML = <p class="text-xs text-gray-400 italic"&gt;Bu satıcının aktif ilanı yok.&lt;/p>;

} else {

sellerListings.forEach(item => {

const row = document.createElement('div');

row.className = "flex justify-between items-center bg-lux-bg/40 p-2.5 rounded-xl border border-gray-200/60 text-xs cursor-pointer hover:bg-lux-sage/20 transition";

row.onclick = () => { closeSellerProfileModal(); openDetailModal(item.id); };

row.innerHTML = &lt;div class="flex items-center gap-2 min-w-0"&gt; &lt;img src="${escapeHtml(item.image)}" class="w-10 h-10 rounded-lg object-cover shrink-0">

<div class="min-w-0">

<span class="font-bold text-lux-dark block line-clamp-1">{item.price} TL · ${escapeHtml(item.outsideHatay ? (item.realDistrict || item.realProvince || 'Hatay dışı') : item.district)}&lt;/span&gt; &lt;/div&gt; &lt;/div&gt;;

listingsEl.appendChild(row);

});

}

};


function closeSellerProfileModal() { document.getElementById('seller-profile-modal').classList.add('hidden'); }


window.loadIncomingOffers = async function() {

const container = document.getElementById('tab-content-offers');

container.innerHTML = '<p class="text-xs text-gray-400">Yükleniyor...</p>';


try {

const incomingQuery = query(ref(db, 'offers'), orderByChild('sellerUid'), equalTo(window.currentUser.uid));

const outgoingQuery = query(ref(db, 'offers'), orderByChild('buyerUid'), equalTo(window.currentUser.uid));


const [inSnap, outSnap] = await Promise.all([get(incomingQuery), get(outgoingQuery)]);


const incomingData = inSnap.val() || {};

const outgoingData = outSnap.val() || {};


const incomingOffers = Object.keys(incomingData).map(k => ({id: k, type: 'incoming', ...incomingData[k]}));

const outgoingOffers = Object.keys(outgoingData).map(k => ({id: k, type: 'outgoing', ...outgoingData[k]}));


const allOffers = [...incomingOffers, ...outgoingOffers].sort((a,b) => b.date - a.date);


container.innerHTML = '';


if (allOffers.length === 0) {

container.innerHTML = <p class="text-xs text-gray-400 italic"&gt;Henüz aldığınız veya gönderdiğiniz bir teklif bulunmuyor.&lt;/p>;

return;

}


allOffers.forEach(o => {

const div = document.createElement('div');

const isIncoming = o.type === 'incoming';


div.className = isIncoming

? "bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs space-y-2 mb-2"

: "bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs space-y-2 mb-2";


const statusColor = o.status === 'Onaylandı' ? 'text-emerald-700 bg-emerald-100' : (o.status === 'Reddedildi' ? 'text-red-700 bg-red-100' : 'text-amber-700 bg-amber-100');


if (isIncoming) {

let cleanPhone = o.buyerPhone ? o.buyerPhone.replace(/[^0-9]/g, '') : '';

if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);

const waMsg = Merhaba${o.buyerName || 'Alıcı'}, "{o.offeredPrice || 'belirtilmemiş'} TL teklif üzerine görüşmek istiyorum.; const waUrl = cleanPhone ?https://wa.me/90{encodeURIComponent(waMsg)}` : '#';


div.innerHTML = &lt;div class="flex justify-between items-center font-bold text-amber-900 border-b border-amber-200/50 pb-1 mb-1"&gt; &lt;span class="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded"&gt;GELEN TEKLİF&lt;/span&gt; &lt;span class="text-emerald-700"&gt;${window.escapeHtml(String(o.offeredPrice || '?'))} TL Teklif</span>

</div>

<p class="font-bold">📌 ${window.escapeHtml(o.listingTitle || 'İlan')}&lt;/p&gt; &lt;p class="text-[10px] text-gray-600"&gt;Teklif Veren: &lt;b&gt;${window.escapeHtml(o.buyerName || 'Belirtilmemiş')}</b> (${window.escapeHtml(o.buyerPhone || 'Belirtilmedi')})&lt;/p&gt; &lt;div class="flex justify-between items-center mt-2"&gt; &lt;span class="text-[10px] font-semibold px-2 py-0.5 rounded ${statusColor}">Durum: ${window.escapeHtml(o.status || 'Beklemede')}&lt;/span&gt; &lt;div class="space-x-1"&gt; &lt;button onclick="updateOfferStatus('${window.escapeHtml(o.id)}', 'Onaylandı')" class="bg-emerald-600 text-white px-2 py-1 rounded text-[10px]">Onayla</button>

<button onclick="updateOfferStatus('${window.escapeHtml(o.id)}', 'Reddedildi')" class="bg-red-600 text-white px-2 py-1 rounded text-[10px]"&gt;Reddet&lt;/button&gt; &lt;/div&gt; &lt;/div&gt; ${o.note ? <p class="text-[10px] text-gray-500 italic bg-amber-100/50 p-1.5 rounded"&gt;Not: "${window.escapeHtml(o.note)}"</p>: ''} ${cleanPhone ? &lt;a href="${waUrl}" target="_blank" class="inline-flex items-center justify-center space-x-1 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-[11px] transition shadow-sm mt-1">

<i class="fa-brands fa-whatsapp text-sm"></i>

<span>Alıcı İle WhatsApp'tan Yazış</span>

</a>

: '&lt;p class="text-[10px] text-red-500 italic"&gt;Telefon numarası belirtilmemiş.&lt;/p&gt;'};

} else {

div.innerHTML = &lt;div class="flex justify-between items-center font-bold text-gray-700 border-b border-gray-200 pb-1 mb-1"&gt; &lt;span class="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded"&gt;GÖNDERDİĞİM TEKLİF&lt;/span&gt; &lt;span class="text-emerald-700"&gt;${window.escapeHtml(String(o.offeredPrice || '?'))} TL Teklifim</span>

</div>

<p class="font-bold cursor-pointer hover:text-lux-olive" onclick="closeAccountModal(); openDetailModal('${window.escapeHtml(o.listingId)}')"&gt;📌 ${window.escapeHtml(o.listingTitle || 'İlan')} <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i></p>

<div class="flex justify-between items-center mt-2">

<span class="text-[10px] font-semibold px-2 py-0.5 rounded ${statusColor}"&gt;Satıcı Yanıtı: ${window.escapeHtml(o.status || 'Beklemede')}</span>

${o.status === 'Onaylandı' ?<span class="text-[10px] text-emerald-600 font-bold"><i class="fa-solid fa-check-circle"></i> Satıcı onayladı, iletişime geçecektir.</span>: ''} &lt;/div&gt; ${o.note ? <p class="text-[10px] text-gray-500 italic bg-gray-100 p-1.5 rounded mt-1"&gt;İlettiğim Not: "${window.escapeHtml(o.note)}"</p>: ''};

}

container.appendChild(div);

});

} catch(err) {

container.innerHTML = <p class="text-xs text-red-400"&gt;Teklifler yüklenirken hata oluştu.&lt;/p>;

}

};


window.updateOfferStatus = async function(offerId, status) {

try {

await update(ref(db, offers/${offerId}), { status: status }); window.showToast(Teklif durumu "${status}" olarak güncellendi., "success");

window.loadIncomingOffers();

} catch(err) {

window.showToast("Hata: " + err.message, "error");

}

};


window.escapeHtml = function(value) {

return String(value ?? '                                        
