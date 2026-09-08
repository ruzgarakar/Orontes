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

window.AVAILABLE_REVIEW_BADGES = ["Hızlı Teslimat", "Doğal / Organik Ürün", "İyi İletişim", "Güvenilir", "Kaliteli Hizmet", "Özenli Paketleme"];
window.notifiedPriceDrops = new Set();
window.globalMapInstance = null;
window.markerClusterGroup = null;

window.showErrorPage = function(statusCode = 400, message = "Kötü İstek (Bad Request)") {
    document.body.innerHTML = `
        <div style="height:100vh; width:100vw; display:flex; flex-direction:column; justify-content:center; align-items:center; background-color:#f8f9fa; color:#1a1a1a; font-family:sans-serif; text-align:center; padding:20px; z-index:999999; position:fixed; top:0; left:0;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 60px; color:#dc2626; margin-bottom: 20px;"></i>
            <h1 style="font-size: 80px; margin:0; color:#dc2626; font-weight: 900; line-height: 1;">${statusCode}</h1>
            <h2 style="font-size: 24px; margin-top:10px; font-weight: bold;">${message}</h2>
            <p style="color:#666; margin-top:15px; max-width:400px; font-size: 15px;">Sistem isteğinizi işleyemedi veya geçersiz bir veri gönderildi. Lütfen sayfayı yenileyerek tekrar deneyin.</p>
            <button onclick="window.location.reload()" style="margin-top:25px; padding:12px 24px; background:#10b981; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:bold; font-size: 16px; box-shadow: 0 4px 6px rgba(16,185,129,0.3); transition: transform 0.2s;">
                <i class="fa-solid fa-rotate-right" style="margin-right: 8px;"></i> Sayfayı Yenile
            </button>
        </div>
    `;
};

window.showToast = function(message, type = 'success') {
    const toast = document.createElement('div');
    toast.innerHTML = `<div style="display:flex; align-items:center; gap:10px;">
        <i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : (type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-check')}"></i>
        <span>${message}</span>
    </div>`;
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

/* ---------------------------------------------------------------------------
   ERKEN TANIM: Dosyanın ilerleyen bölümlerindeki modüller yüklenene kadar
   güvenli varsayılanlar. Modül 3 bunları tam sürümleriyle değiştirir.
   --------------------------------------------------------------------------- */
window.currentLang = window.currentLang || 'tr';

window.t = function (key, trText) {
    if (window.currentLang === 'ar' && window.I18N_AR && window.I18N_AR[key]) return window.I18N_AR[key];
    return trText !== undefined ? trText : key;
};

window.jsAttr = function (v) {
    return String(v === null || v === undefined ? '' : v)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
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
window.userExtraData = { favorites: {}, offers: {}, avatar: '' };
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
    return String(name || '').trim().toLowerCase().replace(/[.#$\[\]\/\s]+/g, '_');
};

window.MAX_IMAGE_SIZE_MB = 8;

window.checkFileSize = function(inputEl) {
    const file = inputEl.files && inputEl.files[0];
    if (!file) return;
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > window.MAX_IMAGE_SIZE_MB) {
        window.showToast(`Seçtiğiniz görsel ${sizeMb.toFixed(1)}MB — izin verilen en fazla ${window.MAX_IMAGE_SIZE_MB}MB.`, 'error');
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
            reject(new Error(`Görsel çok büyük (${sizeMb.toFixed(1)}MB). Maksimum ${window.MAX_IMAGE_SIZE_MB}MB olmalıdır.`));
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
    // E-postası doğrulanmamış kullanıcıyı UI tarafında login yapmamak için kontrol
    if (user && !user.emailVerified) {
        window.currentUser = null;
        const loggedOutBox = document.getElementById('auth-logged-out');
        const loggedInBox = document.getElementById('auth-logged-in');
        if (loggedOutBox) loggedOutBox.classList.remove('hidden');
        if (loggedInBox) loggedInBox.classList.add('hidden');
        return;
    }

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
                window.userExtraData = { favorites: {}, avatar: '' };
            }
        } catch(err) {
            console.error("Kullanıcı verisi çekilemedi:", err);
            window.userExtraData = { favorites: {}, avatar: '' };
        }

        if (typeof window.refreshHarvestAlertBadge === 'function') window.refreshHarvestAlertBadge();

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
        window.userExtraData = { favorites: {}, avatar: '' };
        window.pendingOffersCount = 0;
        window.harvestAlertCount = 0;
        window.updateNotificationBadge();
    }
    window.filterListings();
});

window.updateNotificationBadge = function() {
    const badge = document.getElementById('notification-badge');
    const totalNotifications = (window.pendingOffersCount || 0) + (window.harvestAlertCount || 0);
    if (badge) {
        if (totalNotifications > 0) {
            badge.innerText = totalNotifications > 99 ? '99+' : totalNotifications;
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
        
        if (window.currentUser && window.userExtraData && window.userExtraData.favorites) {
            items.forEach(item => {
                if (window.userExtraData.favorites[item.id] && item.priceHistory && item.priceHistory.length > 0) {
                    const oldPrice = item.priceHistory[item.priceHistory.length - 1].price;
                    if (item.price !== oldPrice && !window.notifiedPriceDrops.has(item.id)) {
                        const isDrop = item.price < oldPrice;
                        const msgType = isDrop ? "success" : "warning";
                        const verb = isDrop ? "düştü" : "yükseldi";
                        window.showToast(`İlgilendiğiniz "${item.title}" ilanında fiyat ${verb}! (${oldPrice} TL ➔ ${item.price} TL)`, msgType);
                        window.notifiedPriceDrops.add(item.id);
                    }
                }
            });
        }

        window.listings = items;
        window.executeLocalFilters();
        window.updateMarqueeData(); 
        
        if(typeof window.renderGlobalMap === 'function') {
            window.renderGlobalMap();
        }
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
    
    if(typeof window.renderGlobalMap === 'function') {
        window.renderGlobalMap();
    }
};

setTimeout(() => { window.filterListings(); }, 300);

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
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            if (!userCredential.user.emailVerified) {
                window.showToast("Lütfen e-postanıza gelen linke tıklayarak hesabınızı doğrulayın.", "warning");
                btn.disabled = false;
                btn.innerText = "Giriş Yap";
                
                let resendBtn = document.getElementById('resend-verification-btn');
                if (!resendBtn) {
                    resendBtn = document.createElement('button');
                    resendBtn.id = 'resend-verification-btn';
                    resendBtn.type = 'button';
                    resendBtn.className = 'w-full bg-lux-gold hover:bg-[#ad9868] text-lux-dark font-bold py-2.5 rounded-xl shadow transition text-xs mt-3';
                    const form = document.querySelector('#auth-modal form');
                    if(form) form.appendChild(resendBtn);
                }
                resendBtn.innerText = "Doğrulama Kodunu Tekrar Gönder";
                resendBtn.classList.remove('hidden');
                
                resendBtn.onclick = async () => {
                    resendBtn.disabled = true;
                    resendBtn.innerText = "Gönderiliyor...";
                    try {
                        await sendEmailVerification(userCredential.user);
                        window.showToast("Doğrulama e-postası başarıyla gönderildi! Lütfen gereksiz/spam kutunuzu da kontrol edin.", "success");
                        resendBtn.classList.add('hidden');
                    } catch(err) {
                        if(err.code === 'auth/too-many-requests') {
                            window.showToast("Çok fazla istek yaptınız. Lütfen biraz bekleyip tekrar deneyin.", "error");
                        } else {
                            window.showToast("E-posta gönderilemedi: " + err.message, "error");
                        }
                    } finally {
                        resendBtn.disabled = false;
                        resendBtn.innerText = "Doğrulama Kodunu Tekrar Gönder";
                        await signOut(auth);
                    }
                };
                return; 
            }

            window.showToast("Giriş başarılı, yönlendiriliyorsunuz...", "success");
            const resendBtn = document.getElementById('resend-verification-btn');
            if (resendBtn) resendBtn.classList.add('hidden');
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
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }
    
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

    const favRef = ref(db, `users/${window.currentUser.uid}/favorites/${id}`);
    if (window.userExtraData.favorites && window.userExtraData.favorites[id]) {
        await remove(favRef);
        delete window.userExtraData.favorites[id];
        window.showToast("İlan favorilerinizden çıkarıldı.", "success");
    } else {
        await update(ref(db, `users/${window.currentUser.uid}/favorites`), { [id]: true });
        if(!window.userExtraData.favorites) window.userExtraData.favorites = {};
        window.userExtraData.favorites[id] = true;
        window.showToast("İlan favorilerinize eklendi!", "success");
    }
    renderListings();
    updateFavBtnStyle(id);
};

window.submitPriceOffer = async function() {
    if (!window.currentUser) {
        window.showToast("Teklif vermek/İletişime geçmek için giriş yapmalısınız.", "warning");
        openAuthModal('login');
        return;
    }
    const price = document.getElementById('offer-price-input').value;
    const note = document.getElementById('offer-note-input').value;

    if (!price) {
        window.showToast("Lütfen bir teklif veya bütçe tutarı girin.", "warning");
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
        window.showToast("İletişim/Teklif talebiniz başarıyla iletildi!", "success");
        document.getElementById('offer-price-input').value = '';
        document.getElementById('offer-note-input').value = '';
    } catch (err) {
        window.showToast("Talep iletilemedi: " + err.message, "error");
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
        
        const lTypeEl = document.getElementById('form-listing-type');
        const listingType = lTypeEl ? lTypeEl.value : 'tarim';
        
        const customEl = document.getElementById('form-customizable');
        const isCustomizable = customEl ? customEl.checked : false;

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
            listingType: listingType,          
            isCustomizable: isCustomizable,    
            harvestDate: document.getElementById('form-harvest-date') ? document.getElementById('form-harvest-date').value : null,
            producerStory: document.getElementById('form-producer-story') ? (document.getElementById('form-producer-story').value.trim() || null) : null,
            videoUrl: document.getElementById('form-video-url') ? (document.getElementById('form-video-url').value.trim() || null) : null,
            acceptsSubscription: document.getElementById('form-accepts-subscription') ? document.getElementById('form-accepts-subscription').checked : false,
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
    
    const avatarInputEl = document.getElementById('update-avatar-base64');
    const newAvatar = avatarInputEl ? avatarInputEl.value : '';

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

        let userUpdatePayload = {
            username: newUsername,
            phone: newPhone
        };
        let publicProfilePayload = {
            username: newUsername
        };

        if (newAvatar) {
            userUpdatePayload.avatar = newAvatar;
            publicProfilePayload.avatar = newAvatar;
        }

        await update(ref(db, 'users/' + window.currentUser.uid), userUpdatePayload);
        await update(ref(db, 'publicProfiles/' + window.currentUser.uid), publicProfilePayload);
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
        if (newAvatar) {
            window.userExtraData.avatar = newAvatar;
        }
        
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
            joinedText = `Üye: ${d.toLocaleDateString('tr-TR', { year:'numeric', month:'long' })} · `;
        }
        joinedEl.innerText = `${joinedText}${listingCount} ilan`;
    } catch (err) {
        joinedEl.innerText = `${listingCount} ilan`;
    }

    try {
        const ratingsSnap = await get(ref(db, 'ratings/' + sellerUid));
        const ratingsData = ratingsSnap.val() || {};
        const ratingsArray = Object.values(ratingsData);
        const sellerRoleRatings = ratingsArray.filter(r => (r.role || 'seller') !== 'buyer');
        const verifiedCount = ratingsArray.filter(r => r.verified).length;
        const scores = sellerRoleRatings.map(r => r.score).filter(s => typeof s === 'number');
        const avg = scores.length ? (scores.reduce((a,b) => a+b, 0) / scores.length) : 0;
        const roundedStars = Math.round(avg);
        ratingEl.innerText = scores.length
            ? `${'★'.repeat(roundedStars)}${'☆'.repeat(5 - roundedStars)} ${avg.toFixed(1)} (${scores.length})${verifiedCount ? ' · ✅' + verifiedCount : ''}`
            : 'Henüz değerlendirme yok';

        if (window.currentUser && window.currentUser.uid !== sellerUid && rateBox) {
            rateBox.classList.remove('hidden');
            const myRatingData = ratingsData[window.currentUser.uid] || {};
            const myRating = myRatingData.score || 0;
            const myBadges = myRatingData.badges || [];

            starsEl.innerHTML = '';
            
            const starContainer = document.createElement('div');
            starContainer.className = "flex space-x-1 mb-2";
            let currentSelectedScore = myRating;

            for (let i = 1; i <= 5; i++) {
                const star = document.createElement('span');
                star.innerText = i <= myRating ? '★' : '☆';
                star.style.color = i <= myRating ? '#bca879' : '#c7c7c7';
                star.style.cursor = 'pointer';
                star.style.fontSize = '20px';
                star.onclick = () => {
                    currentSelectedScore = i;
                    Array.from(starContainer.children).forEach((s, idx) => {
                        s.innerText = idx < currentSelectedScore ? '★' : '☆';
                        s.style.color = idx < currentSelectedScore ? '#bca879' : '#c7c7c7';
                    });
                };
                starContainer.appendChild(star);
            }
            starsEl.appendChild(starContainer);

            const badgesContainer = document.createElement('div');
            badgesContainer.className = "flex flex-wrap gap-1.5 my-2";
            const selectedBadges = new Set(myBadges);
            
            window.AVAILABLE_REVIEW_BADGES.forEach(badge => {
                const badgeEl = document.createElement('span');
                badgeEl.innerText = badge;
                const isSelected = selectedBadges.has(badge);
                badgeEl.className = `cursor-pointer text-[10px] px-2 py-1 rounded-full border transition-all ${isSelected ? 'bg-lux-dark text-lux-gold border-lux-gold font-bold' : 'bg-lux-bg hover:bg-gray-200 text-lux-dark border-lux-olive font-medium'}`;
                
                badgeEl.onclick = () => {
                    if (selectedBadges.has(badge)) {
                        selectedBadges.delete(badge);
                        badgeEl.className = "cursor-pointer text-[10px] px-2 py-1 rounded-full border transition-all bg-lux-bg hover:bg-gray-200 text-lux-dark border-lux-olive font-medium";
                    } else {
                        selectedBadges.add(badge);
                        badgeEl.className = "cursor-pointer text-[10px] px-2 py-1 rounded-full border transition-all bg-lux-dark text-lux-gold border-lux-gold font-bold";
                    }
                };
                badgesContainer.appendChild(badgeEl);
            });
            starsEl.appendChild(badgesContainer);

            const submitBtn = document.createElement('button');
            submitBtn.innerText = "Puanla & Gönder";
            submitBtn.className = "bg-lux-gold text-lux-dark font-bold text-xs px-3 py-1.5 rounded-lg w-full hover:bg-yellow-500 transition shadow-sm mt-1";
            submitBtn.onclick = () => {
                if(currentSelectedScore === 0) {
                    window.showToast("Lütfen önce bir yıldız seçin.", "warning");
                    return;
                }
                window.submitRating(sellerUid, currentSelectedScore, Array.from(selectedBadges));
            };
            starsEl.appendChild(submitBtn);
        }
    } catch (err) {
        ratingEl.innerText = 'Puanlar yüklenemedi';
    }
};

window.submitRating = async function(sellerUid, score, badges = []) {
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
        await update(ref(db, `ratings/${sellerUid}/${window.currentUser.uid}`), {
            score: score,
            badges: badges,
            date: Date.now()
        });
        window.showToast("Değerlendirme başarıyla kaydedildi!", "success");
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
    const avatarTextEl = document.getElementById('seller-profile-avatar-text');
    const avatarImgEl = document.getElementById('seller-profile-avatar-img');
    const joinedEl = document.getElementById('seller-profile-joined');
    const ratingEl = document.getElementById('seller-profile-rating');
    const countEl = document.getElementById('seller-profile-count');
    const listingsEl = document.getElementById('seller-profile-listings');
    const badgesDOM = document.getElementById('seller-profile-badges');

    const sellerListings = (window.listings || []).filter(l => l.uid === sellerUid).sort((a,b) => b.date - a.date);
    const displayName = sellerListings.length ? sellerListings[0].seller : 'Satıcı/Hizmet Veren';

    nameEl.innerText = displayName;
    if(avatarTextEl) {
        avatarTextEl.innerText = (displayName || 'U').charAt(0).toUpperCase();
        avatarTextEl.classList.remove('hidden');
    }
    if(avatarImgEl) {
        avatarImgEl.classList.add('hidden');
        avatarImgEl.src = '';
    }
    
    joinedEl.innerText = "Üyelik bilgisi yükleniyor...";
    ratingEl.innerText = "☆☆☆☆☆";
    countEl.innerText = `${sellerListings.length} ilan`;
    listingsEl.innerHTML = '';
    if(badgesDOM) badgesDOM.innerHTML = '';

    document.getElementById('seller-profile-modal').classList.remove('hidden');
    if (typeof window.renderSellerRoleStats === 'function') window.renderSellerRoleStats(sellerUid);

    try {
        const profileSnap = await get(ref(db, 'publicProfiles/' + sellerUid));
        if (profileSnap.exists()) {
            const pData = profileSnap.val();
            
            if (pData.joinedAt) {
                const d = new Date(pData.joinedAt);
                const now = Date.now();
                const years = Math.floor((now - pData.joinedAt) / (365 * 24 * 60 * 60 * 1000));
                const sinceText = years >= 1 ? `${years} yıldır üye` : `${d.toLocaleDateString('tr-TR', { year:'numeric', month:'long' })} tarihinden beri üye`;
                joinedEl.innerText = sinceText;
            } else {
                joinedEl.innerText = "Üyelik tarihi bilinmiyor";
            }
            
            if (pData.avatar && avatarImgEl && avatarTextEl) {
                avatarImgEl.src = pData.avatar;
                avatarImgEl.classList.remove('hidden');
                avatarTextEl.classList.add('hidden');
            }
        } else {
            joinedEl.innerText = "Üyelik tarihi bilinmiyor";
        }
    } catch (err) {
        joinedEl.innerText = "Üyelik tarihi bilinmiyor";
    }

    try {
        const ratingsSnap = await get(ref(db, 'ratings/' + sellerUid));
        const ratingsData = ratingsSnap.val() || {};
        const ratingsArray = Object.values(ratingsData);
        
        const scores = ratingsArray.filter(r => (r.role || 'seller') !== 'buyer').map(r => r.score).filter(s => typeof s === 'number');
        const avg = scores.length ? (scores.reduce((a,b) => a+b, 0) / scores.length) : 0;
        const roundedStars = Math.round(avg);
        ratingEl.innerText = scores.length
            ? `${'★'.repeat(roundedStars)}${'☆'.repeat(5 - roundedStars)} ${avg.toFixed(1)} (${scores.length})`
            : 'Henüz değerlendirme yok';
            
        const badgeCounts = {};
        ratingsArray.forEach(r => {
            if (r.badges && Array.isArray(r.badges)) {
                r.badges.forEach(b => {
                    badgeCounts[b] = (badgeCounts[b] || 0) + 1;
                });
            }
        });
        
        if (badgesDOM) {
            const sortedBadges = Object.entries(badgeCounts).sort((a,b) => b[1] - a[1]);
            if (sortedBadges.length > 0) {
                sortedBadges.forEach(([badgeName, count]) => {
                    const bSpan = document.createElement('span');
                    bSpan.className = "bg-lux-dark text-lux-gold text-[10px] font-bold px-2.5 py-1 rounded-full mr-1.5 mb-1.5 inline-flex items-center border border-lux-gold shadow-sm";
                    bSpan.innerHTML = `${badgeName} <span class="bg-lux-gold text-lux-dark rounded-full px-1.5 py-0.5 text-[9px] ml-1.5 font-extrabold">${count}</span>`;
                    badgesDOM.appendChild(bSpan);
                });
            }
        }
    } catch (err) {
        ratingEl.innerText = 'Puanlar yüklenemedi';
    }

    if (sellerListings.length === 0) {
        listingsEl.innerHTML = `<p class="text-xs text-gray-400 italic">Kullanıcının aktif ilanı yok.</p>`;
    } else {
        sellerListings.forEach(item => {
            const row = document.createElement('div');
            row.className = "flex justify-between items-center bg-lux-bg/40 p-2.5 rounded-xl border border-gray-200/60 text-xs cursor-pointer hover:bg-lux-sage/20 transition";
            row.onclick = () => { closeSellerProfileModal(); openDetailModal(item.id); };
            row.innerHTML = `
                <div class="flex items-center gap-2 min-w-0">
                    <img src="${escapeHtml(item.image)}" class="w-10 h-10 rounded-lg object-cover shrink-0">
                    <div class="min-w-0">
                        <span class="font-bold text-lux-dark block line-clamp-1">${escapeHtml(item.title)}</span>
                        <span class="text-[10px] text-gray-500">${item.price} TL · ${escapeHtml(item.outsideHatay ? (item.realDistrict || item.realProvince || 'Hatay dışı') : item.district)}</span>
                    </div>
                </div>
            `;
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
        
        let incomingData = {};
        let outgoingData = {};
        let offersLoadFailed = false;
        try {
            const [inSnap, outSnap] = await Promise.all([get(incomingQuery), get(outgoingQuery)]);
            incomingData = inSnap.val() || {};
            outgoingData = outSnap.val() || {};
        } catch (offerErr) {
            // Teklifler yüklenemese bile favori/hasat bildirimleri gösterilmeye devam etsin
            offersLoadFailed = true;
            console.warn('Teklifler yüklenemedi:', offerErr);
        }

        const incomingOffers = Object.keys(incomingData).map(k => ({id: k, type: 'incoming', ...incomingData[k]}));
        const outgoingOffers = Object.keys(outgoingData).map(k => ({id: k, type: 'outgoing', ...outgoingData[k]}));

        // FAVORİ FİYAT DEĞİŞİKLİĞİ BİLDİRİMLERİ (YENİ EKLENEN KISIM)
        const priceAlerts = [];
        if (window.userExtraData && window.userExtraData.favorites) {
            Object.keys(window.userExtraData.favorites).forEach(favId => {
                const item = (window.listings || []).find(l => l.id === favId);
                if (item && item.priceHistory && item.priceHistory.length > 0) {
                    const lastHistory = item.priceHistory[item.priceHistory.length - 1];
                    // Eğer ilan fiyatı değiştiyse bunu diziye ekliyoruz
                    if (item.price !== lastHistory.price) {
                        priceAlerts.push({
                            id: 'alert_' + item.id,
                            type: 'price_alert',
                            listingId: item.id,
                            listingTitle: item.title,
                            oldPrice: lastHistory.price,
                            newPrice: item.price,
                            date: lastHistory.date,
                            isDrop: item.price < lastHistory.price
                        });
                    }
                }
            });
        }

        // Fiyat değişim bildirimleri ve teklifleri tarihe göre birleştir ve sırala
        const harvestNotifs = (typeof window.getHarvestNotifications === 'function') ? window.getHarvestNotifications() : [];

        // Fiyat değişim, hasat bildirimleri ve teklifleri tarihe göre birleştir ve sırala
        const allOffers = [...incomingOffers, ...outgoingOffers, ...priceAlerts, ...harvestNotifs].sort((a,b) => b.date - a.date);

        container.innerHTML = '';

        if (offersLoadFailed) {
            container.innerHTML = `<p class="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 mb-2"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Teklif kutunuz şu anda yüklenemedi; aşağıda yalnızca bildirimleriniz gösteriliyor.</p>`;
        }

        if (allOffers.length === 0) {
            container.innerHTML += `<p class="text-xs text-gray-400 italic">Henüz aldığınız, gönderdiğiniz teklif ya da favori/hasat bildiriminiz bulunmuyor.</p>`;
            return;
        }

        allOffers.forEach(o => {
            const div = document.createElement('div');
            
            if (o.type === 'price_alert') {
                // FİYAT BİLDİRİM KARTI
                div.className = "bg-blue-50 p-3 rounded-xl border border-blue-200 text-xs space-y-2 mb-2";
                const trendColor = o.isDrop ? "text-emerald-600" : "text-red-600";
                const trendIcon = o.isDrop ? "fa-arrow-trend-down" : "fa-arrow-trend-up";
                const trendBg = o.isDrop ? "bg-emerald-100" : "bg-red-100";
                
                div.innerHTML = `
                    <div class="flex justify-between items-center font-bold text-blue-900 border-b border-blue-200/50 pb-1 mb-1">
                        <span class="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded"><i class="fa-solid fa-star text-amber-500 mr-1"></i> FAVORİ BİLDİRİMİ</span>
                        <span class="${trendColor}"><i class="fa-solid ${trendIcon}"></i> ${window.escapeHtml(String(o.newPrice))} TL</span>
                    </div>
                    <p class="font-bold cursor-pointer hover:text-blue-700" onclick="closeAccountModal(); openDetailModal('${window.escapeHtml(o.listingId)}')">📌 ${window.escapeHtml(o.listingTitle)} <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i></p>
                    <div class="flex justify-between items-center mt-2">
                        <span class="text-[10px] font-semibold px-2 py-0.5 rounded ${trendBg} ${trendColor}">
                            Eski: ${o.oldPrice} TL ➔ Yeni: ${o.newPrice} TL
                        </span>
                        <button onclick="closeAccountModal(); openDetailModal('${window.escapeHtml(o.listingId)}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-[10px] font-bold shadow-sm transition">İlanı İncele</button>
                    </div>
                `;
            } else if (o.type === 'harvest_alert') {
                // HASAT BİLDİRİM KARTI ("Bana Haber Ver")
                div.className = "bg-orange-50 p-3 rounded-xl border border-orange-200 text-xs space-y-2 mb-2";
                div.innerHTML = `
                    <div class="flex justify-between items-center font-bold text-orange-900 border-b border-orange-200/50 pb-1 mb-1">
                        <span class="text-[10px] bg-orange-200 text-orange-900 px-1.5 py-0.5 rounded"><i class="fa-solid fa-seedling mr-0.5"></i> HASAT BİLDİRİMİ</span>
                        <span class="text-orange-700">${window.escapeHtml(o.monthLabel || '')}</span>
                    </div>
                    <p class="font-bold">🌱 ${window.escapeHtml(o.productName || '')} ${o.inSeason ? 'hasat sezonuna girdi!' : 'sezonu yaklaşıyor'}</p>
                    <p class="text-[10px] text-gray-600">${o.inSeason
                        ? (o.isPeak ? 'Bu ay <b>rekolte zirvesinde</b> — toplu alım için en uygun dönem.' : 'Ürün şu anda tedarik edilebilir durumda.')
                        : 'Önümüzdeki ay hasat başlıyor; üreticilerle şimdiden ön bağlantı kurabilirsiniz.'}</p>
                    ${o.district ? `<p class="text-[10px] text-gray-500"><i class="fa-solid fa-location-dot text-lux-gold mr-0.5"></i>Takip ettiğiniz ilçe: ${window.escapeHtml(o.district)}</p>` : ''}
                    <div class="flex gap-1.5 mt-2">
                        <button onclick="closeAccountModal(); window.harvestSearchListings('${window.jsAttr(o.category)}', '${window.jsAttr(o.keyword)}')" class="flex-1 bg-lux-dark hover:bg-lux-olive text-white px-2 py-1.5 rounded text-[10px] font-bold transition">İlanları Gör</button>
                        <button onclick="closeAccountModal(); window.harvestCreateRequest('${window.jsAttr(o.category)}', '${window.jsAttr(o.productName)}')" class="flex-1 bg-lux-gold hover:bg-[#ad9868] text-lux-dark px-2 py-1.5 rounded text-[10px] font-bold transition">Alım Talebi Aç</button>
                    </div>
                `;
            } else {
                // MEVCUT TEKLİF KARTLARI (Gelen/Giden)
                const isIncoming = o.type === 'incoming';
                div.className = isIncoming 
                    ? "bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs space-y-2 mb-2"
                    : "bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs space-y-2 mb-2";

                const statusColor = o.status === 'Onaylandı' ? 'text-emerald-700 bg-emerald-100' : (o.status === 'Reddedildi' ? 'text-red-700 bg-red-100' : 'text-amber-700 bg-amber-100');

                if (isIncoming) {
                    let cleanPhone = o.buyerPhone ? o.buyerPhone.replace(/[^0-9]/g, '') : '';
                    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
                    const isSupply = o.offerKind === 'supply';
                    const waMsg = isSupply
                        ? `Merhaba ${o.buyerName || 'Üretici'}, ORONTES'teki "${o.listingTitle || 'alım talebim'}" başlıklı ALIM TALEBİME gönderdiğiniz ${o.offeredPrice || 'belirtilmemiş'} TL'lik tedarik teklifi hakkında görüşmek istiyorum.`
                        : `Merhaba ${o.buyerName || 'Alıcı'}, "${o.listingTitle || 'İlan'}" ilanım için verdiğiniz ${o.offeredPrice || 'belirtilmemiş'} TL teklif/mesaj üzerine görüşmek istiyorum.`;
                    const waUrl = cleanPhone ? `https://wa.me/90${cleanPhone}?text=${encodeURIComponent(waMsg)}` : '#';

                    div.innerHTML = `
                        <div class="flex justify-between items-center font-bold text-amber-900 border-b border-amber-200/50 pb-1 mb-1">
                            ${window.getOfferKindBadge(o.offerKind, true)}
                            <span class="text-emerald-700">${window.escapeHtml(String(o.offeredPrice || '?'))} TL</span>
                        </div>
                        <p class="font-bold ${isSupply ? 'cursor-pointer hover:text-lux-olive' : ''}" ${isSupply ? `onclick="closeAccountModal(); window.openOfferTargetModal('supply', '${window.escapeHtml(o.listingId)}')"` : ''}>📌 ${window.escapeHtml(o.listingTitle || 'İlan')} ${isSupply ? '<i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>' : ''}</p>
                        <p class="text-[10px] text-gray-600">Gönderen: <b>${window.escapeHtml(o.buyerName || 'Belirtilmemiş')}</b> (${window.escapeHtml(o.buyerPhone || 'Belirtilmedi')})</p>
                        <div class="flex justify-between items-center mt-2">
                            <span class="text-[10px] font-semibold px-2 py-0.5 rounded ${statusColor}">Durum: ${window.escapeHtml(o.status || 'Beklemede')}</span>
                            <div class="space-x-1">
                                <button onclick="updateOfferStatus('${window.escapeHtml(o.id)}', 'Onaylandı')" class="bg-emerald-600 text-white px-2 py-1 rounded text-[10px]">Onayla</button>
                                <button onclick="updateOfferStatus('${window.escapeHtml(o.id)}', 'Reddedildi')" class="bg-red-600 text-white px-2 py-1 rounded text-[10px]">Reddet</button>
                            </div>
                        </div>
                        ${o.note ? `<p class="text-[10px] text-gray-500 italic bg-amber-100/50 p-1.5 rounded">Not: "${window.escapeHtml(o.note)}"</p>` : ''}
                        ${cleanPhone ? `
                            <a href="${waUrl}" target="_blank" class="inline-flex items-center justify-center space-x-1 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-[11px] transition shadow-sm mt-1">
                                <i class="fa-brands fa-whatsapp text-sm"></i>
                                <span>Kişiyle WhatsApp'tan Yazış</span>
                            </a>
                        ` : '<p class="text-[10px] text-red-500 italic">Telefon numarası belirtilmemiş.</p>'}
                        ${o.offerKind === 'subscription' && o.frequency ? `<p class="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 p-1.5 rounded mt-1"><i class="fa-solid fa-rotate mr-1"></i>Periyot: ${window.escapeHtml(o.frequency)}${o.subQty ? ` · Her teslimatta ${window.escapeHtml(String(o.subQty))}` : ''}${o.startDate ? ` · Başlangıç: ${window.escapeHtml(o.startDate)}` : ''}</p>` : ''}
                        ${o.status === 'Onaylandı' ? `
                            <div class="flex gap-1.5 pt-2 mt-1 border-t border-amber-200/60">
                                <button onclick="window.openRatingModal('${window.jsAttr(o.buyerUid)}', '${window.jsAttr(o.buyerName || 'Alıcı')}', 'buyer', '${window.jsAttr(o.id)}')" class="flex-1 bg-lux-gold hover:bg-[#ad9868] text-lux-dark font-bold py-1.5 rounded-lg text-[10px] transition">
                                    <i class="fa-solid fa-star mr-1"></i>${o.buyerRated ? 'Puanımı Güncelle' : 'Alıcıyı Değerlendir'}
                                </button>
                                <button onclick="window.openDisputeModal('${window.jsAttr(o.id)}', '${window.jsAttr(o.buyerUid)}', '${window.jsAttr(o.buyerName || '')}', '${window.jsAttr(o.listingTitle || '')}')" class="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-1.5 px-2.5 rounded-lg text-[10px] transition border border-red-200 whitespace-nowrap">
                                    <i class="fa-solid fa-shield-halved mr-1"></i>Sorun Bildir
                                </button>
                            </div>
                        ` : ''}
                    `;
                } else {
                    const targetListing = (window.listings || []).find(l => l.id === o.listingId);
                    const counterpartyName = targetListing
                        ? (targetListing.seller || 'Satıcı')
                        : ((o.offerKind === 'supply' || o.offerKind === 'group') ? 'Alıcı' : 'Satıcı');
                    div.innerHTML = `
                        <div class="flex justify-between items-center font-bold text-gray-700 border-b border-gray-200 pb-1 mb-1">
                            ${window.getOfferKindBadge(o.offerKind, false)}
                            <span class="text-emerald-700">${window.escapeHtml(String(o.offeredPrice || '?'))} TL</span>
                        </div>
                        <p class="font-bold cursor-pointer hover:text-lux-olive" onclick="closeAccountModal(); window.openOfferTargetModal('${o.offerKind || 'listing'}', '${window.escapeHtml(o.listingId)}')">📌 ${window.escapeHtml(o.listingTitle || 'İlan')} <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i></p>
                        <div class="flex justify-between items-center mt-2">
                            <span class="text-[10px] font-semibold px-2 py-0.5 rounded ${statusColor}">Karşı Taraf Yanıtı: ${window.escapeHtml(o.status || 'Beklemede')}</span>
                            ${o.status === 'Onaylandı' ? `<span class="text-[10px] text-emerald-600 font-bold"><i class="fa-solid fa-check-circle"></i> Onaylandı, iletişime geçilecektir.</span>` : ''}
                        </div>
                        ${o.note ? `<p class="text-[10px] text-gray-500 italic bg-gray-100 p-1.5 rounded mt-1">İlettiğim Not: "${window.escapeHtml(o.note)}"</p>` : ''}
                        ${o.offerKind === 'subscription' && o.frequency ? `<p class="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 p-1.5 rounded mt-1"><i class="fa-solid fa-rotate mr-1"></i>Periyot: ${window.escapeHtml(o.frequency)}${o.subQty ? ` · ${window.escapeHtml(String(o.subQty))}` : ''}</p>` : ''}
                        ${o.status === 'Onaylandı' ? `
                            <div class="flex gap-1.5 pt-2 mt-1 border-t border-gray-200">
                                <button onclick="window.openRatingModal('${window.jsAttr(o.sellerUid)}', '${window.jsAttr(counterpartyName)}', 'seller', '${window.jsAttr(o.id)}')" class="flex-1 bg-lux-gold hover:bg-[#ad9868] text-lux-dark font-bold py-1.5 rounded-lg text-[10px] transition">
                                    <i class="fa-solid fa-star mr-1"></i>${o.sellerRated ? 'Puanımı Güncelle' : 'Satıcıyı Değerlendir'}
                                </button>
                                <button onclick="window.openDisputeModal('${window.jsAttr(o.id)}', '${window.jsAttr(o.sellerUid)}', '${window.jsAttr(counterpartyName)}', '${window.jsAttr(o.listingTitle || '')}')" class="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-1.5 px-2.5 rounded-lg text-[10px] transition border border-red-200 whitespace-nowrap">
                                    <i class="fa-solid fa-shield-halved mr-1"></i>Sorun Bildir
                                </button>
                            </div>
                        ` : ''}
                    `;
                }
            }
            container.appendChild(div);
        });
    } catch(err) {
        container.innerHTML = `<p class="text-xs text-red-400">Talepler yüklenirken hata oluştu.</p>`;
    }
};

window.updateOfferStatus = async function(offerId, status) {
    try {
        await update(ref(db, `offers/${offerId}`), { status: status });
        window.showToast(`Talep durumu "${status}" olarak güncellendi.`, "success");
        window.loadIncomingOffers();
    } catch(err) {
        window.showToast("Hata: " + err.message, "error");
    }
};

window.escapeHtml = function(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[ch]));
};

window.getListingLocationText = function(item) {
    if (item.outsideHatay) {
        if (item.realProvince && item.realDistrict) return `${item.realProvince} / ${item.realDistrict}`;
        if (item.realProvince) return item.realProvince;
        return 'Hatay Dışı';
    }
    return item.district || '';
};

const categoryEmojis = {
    "Zeytin & Yağ": "🫒",
    "Narenciye": "🍊",
    "Salça & Sos": "🌶️",
    "Bakliyat & Hububat": "🌾",
    "Sebze & Sera": "🥬",
    "Canlı Hayvan & Süt": "🐄",
    "Fide & Tohum": "🌱",
    "El Sanatları": "🎨",
    "Giyim & Aksesuar": "🧶",
    "Ev Yapımı Ürünler": "🍯",
    "Tadilat & Tamirat": "🛠️",
    "Özel Ders": "📚",
    "Temizlik": "🧹",
    "Tarım İşçiliği": "🧑‍🌾",
    "Nakliye & Lojistik": "🚛",
    "Diğer": "📦"
};

window.getDefaultImage = function(category) {
    switch(category) {
        case 'Zeytin & Yağ': return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80';
        case 'Narenciye': return 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&w=600&q=80';
        case 'Salça & Sos': return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80';
        case 'Bakliyat & Hububat': return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80';
        case 'Sebze & Sera': return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
        case 'Nakliye & Lojistik': return 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80';
        case 'El Sanatları': return 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80';
        case 'Giyim & Aksesuar': return 'https://images.unsplash.com/photo-1551232864-3f0890e580d9?auto=format&fit=crop&w=600&q=80';
        case 'Ev Yapımı Ürünler': return 'https://images.unsplash.com/photo-1589301773727-2c9388147d34?auto=format&fit=crop&w=600&q=80';
        case 'Tadilat & Tamirat': return 'https://images.unsplash.com/photo-1581141849291-1125c7b692b5?auto=format&fit=crop&w=600&q=80';
        case 'Özel Ders': return 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=600&q=80';
        case 'Temizlik': return 'https://images.unsplash.com/photo-1584820927498-cafe8c1c5a98?auto=format&fit=crop&w=600&q=80';
        case 'Tarım İşçiliği': return 'https://images.unsplash.com/photo-1592982537447-6f2b6a066c0d?auto=format&fit=crop&w=600&q=80';
        default: return 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
    }
};

const districtCoords = {
    'Altınözü': [36.1176, 36.2472],
    'Antakya': [36.2023, 36.1613],
    'Arsuz': [36.4111, 35.8858],
    'Defne': [36.1952, 36.1477],
    'Dörtyol': [36.8528, 36.2239],
    'Kumlu': [36.3627, 36.4511],
    'Payas': [36.7500, 36.2170],
    'Erzin': [36.9531, 36.2031],
    'İskenderun': [36.5872, 36.1733],
    'Kırıkhan': [36.4981, 36.3564],
    'Samandağ': [36.0842, 35.9575],
    'Reyhanlı': [36.2683, 36.5681],
    'Hassa': [36.7972, 36.5186],
    'Belen': [36.4889, 36.1944],
    'Yayladağı': [35.9033, 36.0594]
};

window.renderGlobalMap = function(containerId = 'global-map') {
    const mapEl = document.getElementById(containerId);
    if (!mapEl) return; 

    if (window.globalMapInstance) {
        window.globalMapInstance.remove();
    }

    window.globalMapInstance = L.map(containerId).setView([36.2023, 36.1613], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap'
    }).addTo(window.globalMapInstance);

    if (typeof L.markerClusterGroup === 'function') {
        window.markerClusterGroup = L.markerClusterGroup({
            chunkedLoading: true,
            maxClusterRadius: 50
        });
    }

    const items = window.filteredListings || [];
    items.forEach(item => {
        if (item.lat && item.lng) {
            const marker = L.marker([item.lat, item.lng])
                .bindPopup(`
                    <div style="text-align:center; min-width: 120px;">
                        <img src="${escapeHtml(item.image)}" style="width:100%; height:70px; object-fit:cover; border-radius:6px; margin-bottom:5px;">
                        <b style="font-size:12px; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.title)}</b>
                        <span style="color:#10b981; font-weight:bold; font-size:11px;">${item.price} TL</span><br>
                        <button onclick="openDetailModal('${escapeHtml(item.id)}')" style="margin-top:6px; padding:4px 10px; background:#1a1a1a; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:10px; width:100%;">İncele</button>
                    </div>
                `);
            
            if (window.markerClusterGroup) {
                window.markerClusterGroup.addLayer(marker);
            } else {
                marker.addTo(window.globalMapInstance);
            }
        }
    });

    if (window.markerClusterGroup) {
        window.globalMapInstance.addLayer(window.markerClusterGroup);
    }
    
    setTimeout(() => {
        if(window.globalMapInstance) window.globalMapInstance.invalidateSize();
    }, 250);
};

function renderMap(lat, lng, district) {
    const coords = (lat && lng) ? [lat, lng] : (districtCoords[district] || [36.2023, 36.1613]);
    if (window.mapInstance) {
        window.mapInstance.remove();
    }

    window.mapInstance = L.map('map').setView(coords, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap'
    }).addTo(window.mapInstance);

    L.marker(coords).addTo(window.mapInstance)
        .bindPopup(`<b>ORONTES İlan Konumu</b><br>Hatay / ${escapeHtml(district)}`)
        .openPopup();
        
    setTimeout(() => {
        if(window.mapInstance) window.mapInstance.invalidateSize();
    }, 250);
}

function initFormMap(lat, lng, district) {
    const coords = (lat && lng) ? [lat, lng] : (districtCoords[district] || [36.2023, 36.1613]);
    if (window.formMapInstance) {
        window.formMapInstance.remove();
    }
    window.formMarker = null;

    window.formMapInstance = L.map('form-map').setView(coords, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap'
    }).addTo(window.formMapInstance);

    if (lat && lng) {
        window.formMarker = L.marker([lat, lng]).addTo(window.formMapInstance);
        document.getElementById('form-lat').value = lat;
        document.getElementById('form-lng').value = lng;
    }

    window.formMapInstance.on('click', function(e) {
        const clickedLat = e.latlng.lat;
        const clickedLng = e.latlng.lng;

        if (window.formMarker) {
            window.formMarker.setLatLng([clickedLat, clickedLng]);
        } else {
            window.formMarker = L.marker([clickedLat, clickedLng]).addTo(window.formMapInstance);
        }

        window.resolveLocation(clickedLat, clickedLng);
    });

    setTimeout(() => {
        if(window.formMapInstance) window.formMapInstance.invalidateSize();
    }, 250);
}

window.locationOutsideHatay = null;

window.resolveLocation = async function(lat, lng) {
    const banner = document.getElementById('outside-hatay-warning');
    const districtSelect = document.getElementById('form-district');
    window.locationOutsideHatay = null;
    banner.classList.add('hidden');

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'tr' } });
        if(!res.ok) throw new Error("Ağ hatası");
        const data = await res.json();

        const waterTypes = ['water', 'sea', 'bay', 'strait', 'ocean', 'reef'];
        const isSea = !data || data.error || !data.address || !data.address.country ||
            waterTypes.includes(data.type) || waterTypes.includes(data.category);

        if (isSea) {
            window.showToast("Seçtiğiniz nokta kara üzerinde değil. Lütfen karayı işaretleyin.", "error");
            if (window.formMarker) {
                window.formMapInstance.removeLayer(window.formMarker);
                window.formMarker = null;
            }
            document.getElementById('form-lat').value = '';
            document.getElementById('form-lng').value = '';
            return;
        }

        document.getElementById('form-lat').value = lat;
        document.getElementById('form-lng').value = lng;

        const addr = data.address;
        const province = addr.province || addr.state || '';
        const isInsideHatay = province && province.toLocaleLowerCase('tr-TR').includes('hatay');

        if (isInsideHatay) {
            let matchedDistrict = null;
            const addressValues = Object.values(addr).map(v => String(v).toLocaleLowerCase('tr-TR'));
            
            for (const districtName of Object.keys(districtCoords)) {
                if (addressValues.some(val => val.includes(districtName.toLocaleLowerCase('tr-TR')))) {
                    matchedDistrict = districtName;
                    break;
                }
            }

            if (matchedDistrict) {
                districtSelect.value = matchedDistrict;
            } else {
                window.showToast("Konum Hatay sınırlarında ancak ilçe tam tespit edilemedi. Lütfen listeden seçin.", "warning");
            }
        } else {
            const detectedTownOrDistrict = addr.town || addr.city_district || addr.county || addr.municipality || addr.suburb || '';
            districtSelect.value = 'Hatay Dışı';
            window.locationOutsideHatay = { province, district: detectedTownOrDistrict };
            banner.innerText = `⚠️ Dikkat: Bu konum Hatay dışında — ${province}${detectedTownOrDistrict ? ' / ' + detectedTownOrDistrict : ''}. İlan "Hatay Dışı" olarak işaretlenecek.`;
            banner.classList.remove('hidden');
        }
    } catch (err) {
        console.warn('Konum çözümlenemedi:', err);
    }
};

window.geocodeAddress = async function() {
    const addressInput = document.getElementById('form-address');
    const queryStr = addressInput.value.trim();
    if (!queryStr) {
        window.showToast("Lütfen önce bir adres yazın.", "warning");
        return;
    }
    const btn = document.getElementById('geocode-btn');
    btn.disabled = true;
    btn.innerText = "Aranıyor...";

    try {
        const searchQuery = `${queryStr}, Hatay, Türkiye`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQuery)}`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'tr' } });
        if(!res.ok) { window.showErrorPage(400, "API Bağlantı Hatası"); return; }
        const results = await res.json();

        if (!results || results.length === 0) {
            window.showToast("Adres bulunamadı. Lütfen haritadan elle işaretleyin.", "error");
            return;
        }

        const foundLat = parseFloat(results[0].lat);
        const foundLng = parseFloat(results[0].lon);

        if (window.formMapInstance) {
            window.formMapInstance.setView([foundLat, foundLng], 14);
            if (window.formMarker) {
                window.formMarker.setLatLng([foundLat, foundLng]);
            } else {
                window.formMarker = L.marker([foundLat, foundLng]).addTo(window.formMapInstance);
            }
        }

        await window.resolveLocation(foundLat, foundLng);
    } catch (err) {
        window.showToast("Adres aranırken hata oluştu.", "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "Bul";
    }
};

window.toggleDynamicFields = function() {
    const bType = document.getElementById('form-business-type');
    const wholesaleBox = document.getElementById('wholesale-fields');
    if (wholesaleBox && bType) {
        wholesaleBox.classList.toggle('hidden', bType.value !== 'Toptancı');
    }

    const lTypeEl = document.getElementById('form-listing-type');
    if (!lTypeEl) return;
    const lType = lTypeEl.value;

    const bTypeContainer = document.getElementById('business-type-container'); 
    const customOrderBox = document.getElementById('custom-order-fields'); 
    const harvestContainer = document.getElementById('harvest-date-container');
    
    if (lType === 'hizmet') {
        if (bTypeContainer) bTypeContainer.classList.add('hidden'); 
        if (customOrderBox) customOrderBox.classList.add('hidden'); 
        if (harvestContainer) harvestContainer.classList.add('hidden');
    } else if (lType === 'el_yapimi') {
        if (bTypeContainer) bTypeContainer.classList.remove('hidden');
        if (customOrderBox) customOrderBox.classList.remove('hidden'); 
        if (harvestContainer) harvestContainer.classList.add('hidden');
    } else { 
        if (bTypeContainer) bTypeContainer.classList.remove('hidden');
        if (customOrderBox) customOrderBox.classList.add('hidden');
        if (harvestContainer) harvestContainer.classList.remove('hidden');
    }
};
window.toggleWholesaleFields = window.toggleDynamicFields;

function updateFormMapCenter(district) {
    const coords = districtCoords[district] || [36.2023, 36.1613];
    if (window.formMapInstance) {
        window.formMapInstance.setView(coords, 12);
    }
}

function shareOnWhatsApp() {
    const item = (window.listings || []).find(l => l.id === window.activeListingId);
    if (!item) return;
    const text = `📌 YEREL PAZAR & HİZMET AĞI\n\n📌 ${escapeHtml(item.title)}\n💰 Fiyat: ${item.price} TL ${item.unit ? '/ ' + item.unit : ''}\n📍 Konum: ${item.outsideHatay ? escapeHtml(window.getListingLocationText(item)) : 'Hatay / ' + escapeHtml(item.district)}\n\nİlanı İnceleyin: ${typeof window.getListingShareUrl === 'function' ? window.getListingShareUrl(item.id) : window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}

function updateFavBtnStyle(id) {
    const btn = document.getElementById('detail-fav-btn');
    if(!btn) return;
    if (window.userExtraData.favorites && window.userExtraData.favorites[id]) {
        btn.className = "absolute bottom-3 right-3 w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center text-base shadow hover:scale-110 transition";
    } else {
        btn.className = "absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm text-gray-600 flex items-center justify-center text-base shadow hover:scale-110 transition";
    }
}

function switchAccountTab(tab) {
    ['listings', 'favorites', 'offers', 'buyrequests', 'settings'].forEach(t => {
        const el = document.getElementById(`tab-content-${t}`);
        const btnEl = document.getElementById(`tab-btn-${t}`);
        if (el) el.classList.add('hidden');
        if (btnEl) btnEl.className = "pb-2 px-3 border-b-2 border-transparent hover:text-lux-dark";
    });

    const activeEl = document.getElementById(`tab-content-${tab}`);
    const activeBtnEl = document.getElementById(`tab-btn-${tab}`);
    if (activeEl) activeEl.classList.remove('hidden');
    if (activeBtnEl) activeBtnEl.className = "pb-2 px-3 border-b-2 border-lux-dark text-lux-dark";

    if (tab === 'favorites') loadFavoriteListings();
    if (tab === 'offers') window.loadIncomingOffers();
    if (tab === 'buyrequests' && typeof window.loadMyBuyRequests === 'function') window.loadMyBuyRequests();
    if (tab === 'buyrequests' && typeof window.loadMyGroupBuys === 'function') window.loadMyGroupBuys();
}

window.openInboxTab = function() {
    if (!window.currentUser) {
        window.openAuthModal('login');
        return;
    }
    openAccountModal();
    switchAccountTab('offers');
};

function loadFavoriteListings() {
    const container = document.getElementById('tab-content-favorites');
    if (!container) return;
    const favIds = Object.keys(window.userExtraData.favorites || {});
    const favItems = (window.listings || []).filter(l => favIds.includes(l.id));

    container.innerHTML = '';
    if (favItems.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-400 italic">Henüz favori ilanınız bulunmuyor.</p>`;
        return;
    }

    favItems.forEach(item => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-lux-bg/40 p-2.5 rounded-xl border border-gray-200/60 text-xs";
        
        let primaryBtnText = item.listingType === 'hizmet' ? 'Teklif Al / İncele' : 'İncele';
        
        div.innerHTML = `
            <div class="flex items-center space-x-2">
                <img src="${escapeHtml(item.image)}" class="w-10 h-10 rounded-lg object-cover">
                <div>
                    <span class="font-bold text-lux-dark block line-clamp-1">${escapeHtml(item.title)}</span>
                    <span class="text-[10px] text-gray-500">${item.price} TL • ${escapeHtml(window.getListingLocationText(item))}</span>
                </div>
            </div>
            <button onclick="openDetailModal('${escapeHtml(item.id)}'); closeAccountModal();" class="bg-lux-dark text-white text-[10px] px-2.5 py-1 rounded whitespace-nowrap">${primaryBtnText}</button>
        `;
        container.appendChild(div);
    });
}

function getTimeAgo(timestamp) {
    if (!timestamp || isNaN(timestamp)) return 'Yeni';
    const diff = Date.now() - Number(timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes <= 1 ? 'Az önce' : minutes + ' dk önce'}`;
    if (hours < 24) return `${hours} saat önce`;
    if (days < 30) return `${days} gün önce`;
    return `${Math.floor(days / 30)} ay önce`;
}

function updateMarqueeData() {
    const container = document.getElementById('marquee-container');
    if (!container) return;
    const items = window.listings || [];

    if (items.length === 0) {
        const brCountEmpty = (window.buyRequests || []).filter(r => (r.status || 'Açık') === 'Açık').length;
        container.innerHTML = `<div class="flex space-x-8 items-center px-4"><span class="font-bold text-lux-gold uppercase">Canlı Piyasa Endeksi:</span><span>Sitede henüz aktif ilan bulunmuyor.</span>${brCountEmpty > 0 ? `<button onclick="document.getElementById('buyrequests-section').scrollIntoView({behavior:'smooth'})" class="bg-lux-gold text-lux-dark font-bold px-2.5 py-1 rounded-lg whitespace-nowrap">🤝 ${brCountEmpty} Aktif Alım Talebi</button>` : ''}</div>`;
        return;
    }

    const categories = [
        "Zeytin & Yağ", "Narenciye", "Salça & Sos", "Bakliyat & Hububat", 
        "Sebze & Sera", "Canlı Hayvan & Süt", "Fide & Tohum", "Nakliye & Lojistik",
        "El Sanatları", "Giyim & Aksesuar", "Ev Yapımı Ürünler", 
        "Tadilat & Tamirat", "Özel Ders", "Temizlik", "Tarım İşçiliği", "Diğer"
    ];

    let contentHTML = `<div class="flex space-x-4 items-center px-4 shrink-0">
        <span class="font-bold text-lux-gold uppercase flex items-center space-x-1 mr-2"><i class="fa-solid fa-chart-line"></i><span>Canlı Piyasa Endeksi:</span></span>`;

    const openGbCount = (window.groupBuys || []).filter(g => (g.status || 'Açık') !== 'Kapandı').length;
    if (openGbCount > 0) {
        contentHTML += `<button onclick="document.getElementById('groupbuys-section').scrollIntoView({behavior:'smooth'})" title="Birlikte al kampanyaları" class="bg-lux-olive hover:bg-lux-dark text-white font-extrabold px-2.5 py-1 rounded-lg border border-lux-gold/30 cursor-pointer whitespace-nowrap transition flex items-center space-x-1">
            <span>👥</span><span>BİRLİKTE AL: ${openGbCount} Aktif Kampanya</span>
        </button>`;
    }

    const openBrCount = (window.buyRequests || []).filter(r => (r.status || 'Açık') === 'Açık').length;
    if (openBrCount > 0) {
        contentHTML += `<button onclick="document.getElementById('buyrequests-section').scrollIntoView({behavior:'smooth'})" title="Alıcıların açtığı alım talepleri" class="bg-lux-gold hover:bg-[#ad9868] text-lux-dark font-extrabold px-2.5 py-1 rounded-lg border border-lux-dark/20 cursor-pointer whitespace-nowrap transition flex items-center space-x-1">
            <span>🤝</span><span>ALICI ARIYOR: ${openBrCount} Aktif Alım Talebi</span>
        </button>`;
    }

    categories.forEach(cat => {
        const catListings = items.filter(i => i.category === cat);
        if (catListings.length > 0) {
            let drops = 0; let rises = 0;
            catListings.forEach(i => {
                if (i.priceHistory && i.priceHistory.length > 0) {
                    const oldPrice = i.priceHistory[i.priceHistory.length - 1].price;
                    if (i.price < oldPrice) drops++;
                    if (i.price > oldPrice) rises++;
                }
            });
            
            let trendIcon = '';
            if (drops > rises) trendIcon = '<i class="fa-solid fa-arrow-trend-down text-emerald-400 ml-1.5" title="Fiyatlar Düşüşte"></i>';
            else if (rises > drops) trendIcon = '<i class="fa-solid fa-arrow-trend-up text-red-400 ml-1.5" title="Fiyatlar Yükselişte"></i>';

            const emoji = categoryEmojis[cat] || '📦';
            contentHTML += `<button onclick="openCategoryDetailModal('${escapeHtml(cat)}')" class="hover:bg-lux-dark text-white font-medium px-2.5 py-1 rounded-lg bg-lux-dark/50 border border-lux-gold/30 cursor-pointer whitespace-nowrap transition flex items-center space-x-1">
                <span>${emoji}</span>
                <span><b>${escapeHtml(cat)}</b> (${catListings.length} İlan) ${trendIcon}</span>
            </button>`;
        }
    });

    contentHTML += `</div>`;
    container.innerHTML = contentHTML + contentHTML;
}

function openCategoryDetailModal(cat) {
    window.currentCategoryModalData = (window.listings || [])
        .filter(i => i.category === cat)
        .sort((a, b) => b.date - a.date);
    
    window.catModalCurrentPage = 1;
    
    const emoji = categoryEmojis[cat] || '📦';
    document.getElementById('cat-modal-title').innerText = `${emoji} ${cat} — İlanlar`;
    document.getElementById('cat-modal-sub').innerText = `${window.currentCategoryModalData.length} aktif ilan`;

    renderCategoryModalContent();
    document.getElementById('category-detail-modal').classList.remove('hidden');
}

function renderCategoryModalContent() {
    const content = document.getElementById('cat-modal-content');
    const paginationContainer = document.getElementById('cat-modal-pagination');
    if (!content) return;

    content.innerHTML = '';
    const items = window.currentCategoryModalData;

    if (items.length === 0) {
        content.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">Bu kategoride henüz ilan yok.</p>`;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const startIndex = (window.catModalCurrentPage - 1) * window.catModalItemsPerPage;
    const paginatedItems = items.slice(startIndex, startIndex + window.catModalItemsPerPage);

    paginatedItems.forEach(item => {
        const emoji = categoryEmojis[item.category] || '📦';
        
        let priceHistoryBadge = '';
        if (item.priceHistory && item.priceHistory.length > 0) {
            const oldPrice = item.priceHistory[item.priceHistory.length - 1].price;
            const isDrop = item.price < oldPrice;
            priceHistoryBadge = `<div class="text-[9px] ${isDrop ? 'text-emerald-600 bg-emerald-100' : 'text-red-600 bg-red-100'} px-1.5 rounded mt-0.5 inline-block font-bold">
                <i class="fa-solid ${isDrop ? 'fa-arrow-trend-down' : 'fa-arrow-trend-up'}"></i> Eski: ${oldPrice}
            </div>`;
        }

        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-lux-bg/40 p-2.5 rounded-xl border border-gray-200/80 text-xs cursor-pointer hover:bg-lux-sage/20 transition mb-2";
        div.onclick = () => { closeCategoryDetailModal(); openDetailModal(item.id); };
        div.innerHTML = `
            <div class="min-w-0 pr-2">
                <span class="font-bold text-lux-dark block text-xs line-clamp-1">${emoji} ${escapeHtml(item.title)}</span>
                <span class="text-[10px] text-gray-500">${escapeHtml(item.seller || '')} · ${escapeHtml(window.getListingLocationText(item))}${item.outsideHatay ? ' ⚠️' : ''}</span>
            </div>
            <div class="text-right shrink-0">
                <span class="font-extrabold text-emerald-700 text-sm">${item.price} TL</span>
                <span class="text-[9px] text-gray-400 block">${escapeHtml(item.unit || '')}</span>
                ${priceHistoryBadge}
            </div>
        `;
        content.appendChild(div);
    });

    renderCategoryModalPaginationControls();
}

function renderCategoryModalPaginationControls() {
    const container = document.getElementById('cat-modal-pagination');
    if (!container) return;
    
    const totalPages = Math.ceil(window.currentCategoryModalData.length / window.catModalItemsPerPage);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = `<button onclick="changeCategoryModalPage(${window.catModalCurrentPage - 1})" ${window.catModalCurrentPage === 1 ? 'disabled' : ''} class="px-2.5 py-1 rounded-lg border bg-white text-xs disabled:opacity-40"><i class="fa-solid fa-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button onclick="changeCategoryModalPage(${i})" class="px-2.5 py-1 rounded-lg text-xs font-bold ${i === window.catModalCurrentPage ? 'bg-lux-dark text-white' : 'bg-white border text-gray-700'}">${i}</button>`;
    }
    html += `<button onclick="changeCategoryModalPage(${window.catModalCurrentPage + 1})" ${window.catModalCurrentPage === totalPages ? 'disabled' : ''} class="px-2.5 py-1 rounded-lg border bg-white text-xs disabled:opacity-40"><i class="fa-solid fa-chevron-right"></i></button>`;
    container.innerHTML = html;
}

window.changeCategoryModalPage = function(page) {
    const totalPages = Math.max(1, Math.ceil(window.currentCategoryModalData.length / window.catModalItemsPerPage));
    window.catModalCurrentPage = Math.min(Math.max(1, page), totalPages);
    renderCategoryModalContent();
};

function closeCategoryDetailModal() {
    const modal = document.getElementById('category-detail-modal');
    if (modal) modal.classList.add('hidden');
}

function openAccountModal() {
    if (!window.currentUser) return;

    const name = window.userExtraData.username || window.currentUser.displayName || window.currentUser.email.split('@')[0];
    document.getElementById('account-username').innerText = name;
    document.getElementById('account-email').innerText = window.currentUser.email;
    
    const avatarImg = document.getElementById('account-avatar-img');
    const avatarText = document.getElementById('account-avatar-text');
    const settingsPreview = document.getElementById('settings-avatar-preview');
    const settingsPlaceholder = document.getElementById('settings-avatar-placeholder');
    
    if (window.userExtraData.avatar) {
        if (avatarImg) { avatarImg.src = window.userExtraData.avatar; avatarImg.classList.remove('hidden'); }
        if (avatarText) avatarText.classList.add('hidden');
        
        if (settingsPreview) { settingsPreview.src = window.userExtraData.avatar; settingsPreview.classList.remove('hidden'); }
        if (settingsPlaceholder) settingsPlaceholder.classList.add('hidden');
    } else {
        if (avatarImg) { avatarImg.src = ''; avatarImg.classList.add('hidden'); }
        if (avatarText) { avatarText.innerText = name.charAt(0).toUpperCase(); avatarText.classList.remove('hidden'); }
        
        if (settingsPreview) { settingsPreview.src = ''; settingsPreview.classList.add('hidden'); }
        if (settingsPlaceholder) settingsPlaceholder.classList.remove('hidden');
    }

    document.getElementById('update-username').value = name;
    document.getElementById('update-phone').value = window.userExtraData.phone || '';
    document.getElementById('update-new-password').value = '';
    document.getElementById('update-current-password').value = '';

    switchAccountTab('listings');

    const myListingsContainer = document.getElementById('tab-content-listings');
    const myListings = (window.listings || []).filter(l => l.uid === window.currentUser.uid);

    myListingsContainer.innerHTML = '';
    if (myListings.length === 0) {
        myListingsContainer.innerHTML = `<p class="text-xs text-gray-400 italic">Henüz verdiğiniz bir ilan bulunmuyor.</p>`;
    } else {
        myListings.forEach(item => {
            const row = document.createElement('div');
            row.className = "flex justify-between items-center bg-lux-bg/40 p-2.5 rounded-xl border border-gray-200/60 text-xs";
            row.innerHTML = `
                <div class="flex items-center space-x-2">
                    <img src="${escapeHtml(item.image)}" class="w-10 h-10 rounded-lg object-cover">
                    <div>
                        <span class="font-bold text-lux-dark block line-clamp-1">${escapeHtml(item.title)}</span>
                        <span class="text-[10px] text-gray-500">${item.price} TL • ${escapeHtml(window.getListingLocationText(item))}</span>
                    </div>
                </div>
                <div class="flex space-x-1">
                    <button onclick="openDetailModal('${escapeHtml(item.id)}'); closeAccountModal();" class="bg-lux-dark text-white text-[10px] px-2 py-1 rounded">İncele</button>
                    <button onclick="deleteCurrentListing('${escapeHtml(item.id)}')" class="bg-red-100 text-red-600 text-[10px] px-2 py-1 rounded"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;
            myListingsContainer.appendChild(row);
        });
    }

    document.getElementById('account-modal').classList.remove('hidden');
}

function closeAccountModal() { document.getElementById('account-modal').classList.add('hidden'); }

function openFormModal() { 
    if (!window.currentUser) {
        window.showToast("İlan eklemek için önce giriş yapmalısınız.", "warning");
        openAuthModal('login');
        return;
    }
    const addForm = document.getElementById('add-listing-form');
    if (addForm) addForm.reset();
    document.getElementById('edit-listing-id').value = '';
    document.getElementById('form-lat').value = '';
    document.getElementById('form-lng').value = '';
    document.getElementById('form-address').value = '';
    if (document.getElementById('form-harvest-date')) document.getElementById('form-harvest-date').value = '';
    if (document.getElementById('form-producer-story')) document.getElementById('form-producer-story').value = '';
    if (document.getElementById('form-video-url')) document.getElementById('form-video-url').value = '';
    if (document.getElementById('form-accepts-subscription')) document.getElementById('form-accepts-subscription').checked = false;
    
    const lTypeEl = document.getElementById('form-listing-type');
    if(lTypeEl) lTypeEl.value = 'tarim';
    
    if(typeof window.filterCategoryOptions === 'function') window.filterCategoryOptions();

    const customEl = document.getElementById('form-customizable');
    if(customEl) customEl.checked = false;

    window.locationOutsideHatay = null;
    const owBanner = document.getElementById('outside-hatay-warning');
    if (owBanner) owBanner.classList.add('hidden');
    document.getElementById('form-modal-title').innerText = "Ücretsiz İlan Oluştur";
    
    const sellerInput = document.getElementById('form-seller');
    const phoneInput = document.getElementById('form-phone');
    
    const latestName = window.userExtraData.username || window.currentUser.displayName || window.currentUser.email.split('@')[0];
    const latestPhone = window.userExtraData.phone || '';

    if (sellerInput) sellerInput.value = latestName;
    if (phoneInput) phoneInput.value = latestPhone;
    
    const bType = document.getElementById('form-business-type');
    if (bType) bType.value = 'Üretici';
    const minOrd = document.getElementById('form-min-order');
    if (minOrd) minOrd.value = '';
    
    window.toggleDynamicFields(); 
    document.getElementById('form-modal').classList.remove('hidden'); 
    
    setTimeout(() => {
        initFormMap(null, null, document.getElementById('form-district').value);
    }, 200);
}

function openFormModalForEdit() {
    const item = (window.listings || []).find(l => l.id === window.activeListingId);
    if (!item) return;

    document.getElementById('edit-listing-id').value = item.id;
    document.getElementById('form-modal-title').innerText = "İlanı Düzenle";
    document.getElementById('form-title').value = item.title;
    
    const lTypeEl = document.getElementById('form-listing-type');
    if(lTypeEl) lTypeEl.value = item.listingType || 'tarim';
    
    if(typeof window.filterCategoryOptions === 'function') window.filterCategoryOptions();
    
    document.getElementById('form-category').value = item.category;

    const customEl = document.getElementById('form-customizable');
    if(customEl) customEl.checked = item.isCustomizable || false;

    if (document.getElementById('form-harvest-date')) document.getElementById('form-harvest-date').value = item.harvestDate || '';
    if (document.getElementById('form-producer-story')) document.getElementById('form-producer-story').value = item.producerStory || '';
    if (document.getElementById('form-video-url')) document.getElementById('form-video-url').value = item.videoUrl || '';
    if (document.getElementById('form-accepts-subscription')) document.getElementById('form-accepts-subscription').checked = item.acceptsSubscription || false;

    document.getElementById('form-district').value = item.district;
    document.getElementById('form-address').value = item.address || '';
    window.locationOutsideHatay = item.outsideHatay ? { province: item.realProvince, district: item.realDistrict } : null;
    const editOwBanner = document.getElementById('outside-hatay-warning');
    if (item.outsideHatay) {
        editOwBanner.innerText = `⚠️ Dikkat: Bu konum Hatay dışında görünüyor — ${item.realProvince || ''}${item.realDistrict ? ' / ' + item.realDistrict : ''}.`;
        editOwBanner.classList.remove('hidden');
    } else {
        editOwBanner.classList.add('hidden');
    }
    document.getElementById('form-lat').value = item.lat || '';
    document.getElementById('form-lng').value = item.lng || '';
    document.getElementById('form-price').value = item.price;
    document.getElementById('form-unit').value = item.unit || '';
    document.getElementById('form-seller').value = item.seller;
    document.getElementById('form-phone').value = item.phone;
    document.getElementById('form-desc').value = item.desc || '';
    document.getElementById('form-image').value = item.image;
    document.getElementById('form-vip').checked = item.isVip || false;
    document.getElementById('form-urgent').checked = item.isUrgent || false;
    document.getElementById('form-discount').checked = item.isDiscount || false;
    
    const bType = document.getElementById('form-business-type');
    if (bType) bType.value = item.businessType || 'Üretici';
    
    const minOrd = document.getElementById('form-min-order');
    if (minOrd) minOrd.value = item.minOrderQty || '';
    
    window.toggleDynamicFields(); 

    document.getElementById('detail-modal').classList.add('hidden');
    document.getElementById('form-modal').classList.remove('hidden');

    setTimeout(() => {
        initFormMap(item.lat, item.lng, item.district);
    }, 200);
}

function openAuthModal(mode) {
    document.getElementById('auth-mode').value = mode;
    const regFields = document.getElementById('register-fields-box');
    if (mode === 'login') {
        document.getElementById('auth-modal-title').innerText = "Giriş Yap";
        document.getElementById('auth-submit-btn').innerText = "Giriş Yap";
        document.getElementById('auth-switch-btn').innerText = "Hesabın yok mu? Kayıt Ol";
        if (regFields) regFields.classList.add('hidden');
    } else {
        document.getElementById('auth-modal-title').innerText = "Kayıt Ol";
        document.getElementById('auth-submit-btn').innerText = "Kayıt Ol";
        document.getElementById('auth-switch-btn').innerText = "Zaten hesabın var mı? Giriş Yap";
        if (regFields) regFields.classList.remove('hidden');
    }
    document.getElementById('auth-modal').classList.remove('hidden');
}

function closeAuthModal() { document.getElementById('auth-modal').classList.add('hidden'); }
window.toggleAuthMode = function() { 
    const currentMode = document.getElementById('auth-mode').value;
    const targetMode = currentMode === 'login' ? 'register' : 'login';
    
    document.getElementById('auth-username').value = '';
    document.getElementById('auth-phone').value = '';
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-password').value = '';
    
    const resendBtn = document.getElementById('resend-verification-btn');
    if (resendBtn) resendBtn.classList.add('hidden');
    
    openAuthModal(targetMode);
};

function openTermsModal() { document.getElementById('terms-modal').classList.remove('hidden'); }
function closeTermsModal() { document.getElementById('terms-modal').classList.add('hidden'); }

function openReportModal() { 
    if(!window.currentUser) {
        window.showToast("Şikayet bildirimi için giriş yapmalısınız.", "warning");
        openAuthModal('login');
        return;
    }
    document.getElementById('report-modal').classList.remove('hidden'); 
}
function closeReportModal() { document.getElementById('report-modal').classList.add('hidden'); }

async function handleReportSubmit(e) {
    e.preventDefault();
    try {
        await window.push(window.ref(window.db, 'reports'), {
            listingId: window.activeListingId,
            reporterUid: window.currentUser.uid,
            reason: document.getElementById('report-reason').value,
            note: document.getElementById('report-note').value,
            date: Date.now()
        });
        window.showToast("Şikayetiniz iletildi.", "success");
        closeReportModal();
    } catch(err) {
        window.showToast("Hata: " + err.message, "error");
        window.showErrorPage(400, "Şikayet Gönderilemedi");
    }
}

function renderListings() {
    const grid = document.getElementById('listings-grid');
    if (!grid) return;
    const items = window.filteredListings || [];
    grid.classList.toggle('list-mode', window.currentViewMode === 'list');
    grid.className = window.currentViewMode === 'list'
        ? 'list-mode'
        : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5';
    
    const countEl = document.getElementById('total-count');
    if (countEl) countEl.innerText = `${items.length} ${window.t('list.found', 'İlan/Hizmet Bulundu')}`;
    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-16 bg-white rounded-2xl border border-gray-200 text-gray-400 text-xs">${window.t('list.empty', 'Aradığınız kriterlere uygun sonuç bulunamadı.')}</div>`;
        const pagContainer = document.getElementById('pagination-container');
        if (pagContainer) pagContainer.innerHTML = '';
        return;
    }

    const startIndex = (window.currentPage - 1) * window.itemsPerPage;
    const paginatedItems = items.slice(startIndex, startIndex + window.itemsPerPage);

    paginatedItems.forEach(item => {
        const card = document.createElement('div');

        const isVipActive = item.isVip && (!item.vipExpireDate || Date.now() < item.vipExpireDate);

        let cardStyle = 'border border-gray-200/70';
        if (isVipActive) cardStyle = 'vip-card';
        else if (item.isUrgent) cardStyle = 'border-[1.5px] border-red-500 shadow-sm';

        const isFav = window.userExtraData.favorites && window.userExtraData.favorites[item.id];
        const emoji = categoryEmojis[item.category] || '📦';

        let priceHistoryBadge = '';
        if (item.priceHistory && item.priceHistory.length > 0) {
            const oldPrice = item.priceHistory[item.priceHistory.length - 1].price;
            const isDrop = item.price < oldPrice;
            priceHistoryBadge = `<div class="text-[9px] ${isDrop ? 'text-emerald-500' : 'text-red-500'} font-bold flex items-center mt-1">
                <i class="fa-solid ${isDrop ? 'fa-arrow-trend-down' : 'fa-arrow-trend-up'} mr-1"></i> Eski: ${oldPrice}
            </div>`;
        }
        
        let primaryBtnText = item.listingType === 'hizmet'
            ? window.t('card.getOffer', 'Teklif Al')
            : window.t('card.review', 'İncele');

        card.className = `bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 ${window.currentViewMode === 'list' ? 'flex flex-row' : 'flex flex-col justify-between'} ${cardStyle}`;
        card.innerHTML = `
            <div>
                <div class="listing-card-image relative h-44 overflow-hidden bg-lux-bg/50">
                    <img src="${escapeHtml(item.image)}" class="w-full h-full object-cover">
                    <button onclick="toggleFavorite('${escapeHtml(item.id)}')" class="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm ${isFav ? 'text-red-600' : 'text-gray-400'} flex items-center justify-center text-xs shadow transition">
                        <i class="fa-solid fa-heart"></i>
                    </button>
                    <div class="absolute top-2.5 left-2.5 flex flex-col gap-1">
                        ${isVipActive ? '<span class="bg-lux-gold text-lux-dark font-extrabold text-[9px] px-2 py-0.5 rounded shadow">VIP</span>' : ''}
                        ${item.isUrgent ? '<span class="bg-red-600 text-white font-bold text-[9px] px-2 py-0.5 rounded animate-pulse shadow">ACİL</span>' : ''}
                        
                        ${item.listingType === 'hizmet' ? '<span class="bg-blue-600 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow">🛠️ HİZMET</span>' : ''}
                        ${item.listingType === 'el_yapimi' ? '<span class="bg-purple-600 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow">🎨 EL YAPIMI</span>' : ''}
                        ${item.isCustomizable ? '<span class="bg-pink-600 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow">SİPARİŞ ÜZERİNE</span>' : ''}
                        ${item.harvestDate ? '<span class="bg-orange-500 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow">🌱 ÖN SİPARİŞ</span>' : ''}
                        ${(item.producerStory || item.videoUrl) ? '<span class="bg-teal-600 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow">🎥 ÜRETİCİ HİKAYESİ</span>' : ''}
                        ${item.acceptsSubscription ? '<span class="bg-indigo-600 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow">🔁 DÜZENLİ SİPARİŞ</span>' : ''}

                        ${item.businessType === 'Toptancı' && item.listingType !== 'hizmet' ? '<span class="bg-lux-olive text-white font-bold text-[9px] px-2 py-0.5 rounded shadow">🏢 TOPTANCI</span>' : ''}
                        ${item.outsideHatay ? '<span class="bg-red-600 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow">⚠️ HATAY DIŞI</span>' : ''}
                    </div>
                </div>
                <div class="p-3.5">
                    <div class="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                        <span><i class="fa-solid fa-location-dot text-lux-gold"></i> ${escapeHtml(window.getListingLocationText(item))}${item.outsideHatay ? ' ⚠️' : ''}${window.nearbyModeActive && item._distanceKm !== null && item._distanceKm !== undefined ? ` · ${item._distanceKm.toFixed(1)} km` : ''}</span>
                        <span class="text-gray-400 text-[9px]"><i class="fa-regular fa-clock mr-0.5"></i>${getTimeAgo(item.date)}</span>
                    </div>
                    <h3 onclick="openDetailModal('${escapeHtml(item.id)}')" class="font-bold text-lux-dark text-xs hover:text-lux-olive cursor-pointer line-clamp-2 mb-1.5">${emoji} ${escapeHtml(item.title)}</h3>
                </div>
            </div>
            <div class="px-3.5 pb-3.5">
                <div class="flex justify-between items-end border-t border-gray-100 pt-2.5">
                    <div>
                        <span class="text-[9px] text-gray-400 block">${escapeHtml(item.unit || 'Fiyat')}</span>
                        <span class="text-base font-bold text-lux-dark">${item.price} TL</span>
                        ${priceHistoryBadge}
                        ${item.businessType === 'Toptancı' && item.minOrderQty ? `<span class="text-[9px] text-lux-olive font-semibold block mt-0.5">Min. sipariş: ${escapeHtml(item.minOrderQty)}</span>` : ''}
                    </div>
                    <button onclick="openDetailModal('${escapeHtml(item.id)}')" class="text-[11px] bg-lux-bg hover:bg-lux-sage/30 text-lux-dark font-semibold px-2.5 py-1.5 rounded-lg transition">${primaryBtnText}</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    renderPaginationControls(items.length);
}

function renderPaginationControls(totalItems) {
    const container = document.getElementById('pagination-container');
    if (!container) return;
    const totalPages = Math.ceil(totalItems / window.itemsPerPage);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = `<button onclick="changePage(${window.currentPage - 1})" ${window.currentPage === 1 ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg border bg-white text-xs disabled:opacity-40"><i class="fa-solid fa-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button onclick="changePage(${i})" class="px-3 py-1 rounded-lg text-xs font-bold ${i === window.currentPage ? 'bg-lux-dark text-white' : 'bg-white border text-gray-700'}">${i}</button>`;
    }
    html += `<button onclick="changePage(${window.currentPage + 1})" ${window.currentPage === totalPages ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg border bg-white text-xs disabled:opacity-40"><i class="fa-solid fa-chevron-right"></i></button>`;
    container.innerHTML = html;
}

function changePage(page) {
    const totalPages = Math.max(1, Math.ceil((window.filteredListings || []).length / window.itemsPerPage));
    window.currentPage = Math.min(Math.max(1, page), totalPages);
    renderListings();
    window.scrollTo({ top: 400, behavior: 'smooth' });
}

window.haversineKm = function(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

window.nearbyModeActive = false;
window.userGeoLocation = null;

window.toggleNearbyMode = function() {
    const btn = document.getElementById('nearby-btn');
    if (window.nearbyModeActive) {
        window.nearbyModeActive = false;
        if (btn) btn.className = "bg-lux-bg hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-xl transition text-xs";
        window.filterListings();
        return;
    }
    if (!navigator.geolocation) {
        window.showToast("Tarayıcınız konum özelliğini desteklemiyor.", "error");
        return;
    }
    if (btn) btn.disabled = true;
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            window.userGeoLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            window.nearbyModeActive = true;
            if (btn) {
                btn.disabled = false;
                btn.className = "bg-lux-dark text-white px-3 py-2 rounded-xl transition text-xs";
            }
            window.filterListings();
        },
        (err) => {
            if (btn) btn.disabled = false;
            window.showToast("Konumunuza erişilemedi. Tarayıcı izinlerini kontrol edin.", "error");
        },
        { enableHighAccuracy: false, timeout: 8000 }
    );
};

function resetAllFilters() {
    const searchEl = document.getElementById('search-input');
    const catEl = document.getElementById('category-filter');
    const distEl = document.getElementById('district-filter');
    const sortEl = document.getElementById('sort-filter');
    const minEl = document.getElementById('min-price-filter');
    const maxEl = document.getElementById('max-price-filter');

    if (searchEl) searchEl.value = '';
    if (catEl) catEl.value = '';
    if (distEl) distEl.value = '';
    if (sortEl) sortEl.value = 'newest';
    if (minEl) minEl.value = '';
    if (maxEl) maxEl.value = '';

    window.nearbyModeActive = false;
    const nearbyBtn = document.getElementById('nearby-btn');
    if (nearbyBtn) nearbyBtn.className = "bg-lux-bg hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-xl transition text-xs";
    window.filterListings();
}

function setViewMode(mode) { window.currentViewMode = mode; renderListings(); }
function closeFormModal() { document.getElementById('form-modal').classList.add('hidden'); }
function closeDetailModal() { document.getElementById('detail-modal').classList.add('hidden'); window.activeListingId = null; }

function openDetailModal(id) {
    const item = (window.listings || []).find(l => l.id === id);
    if (!item) return;

    window.activeListingId = id;
    window.activeSellerUid = item.uid;
    document.getElementById('detail-img').src = item.image;
    document.getElementById('detail-title').innerText = item.title;
    document.getElementById('detail-category').innerText = item.category;
    
    document.getElementById('detail-time-badge').innerText = getTimeAgo(item.date);
    const locationPrefix = item.outsideHatay ? '' : 'Hatay / ';
    document.getElementById('detail-location').innerHTML = `<i class="fa-solid fa-location-dot text-lux-gold"></i> ${locationPrefix}${escapeHtml(window.getListingLocationText(item))}${item.address ? ` · ${escapeHtml(item.address)}` : ''}`;
    
    let priceHTML = `${item.price} TL`;
    if (item.priceHistory && item.priceHistory.length > 0) {
        const oldPrice = item.priceHistory[item.priceHistory.length - 1].price;
        const isDrop = item.price < oldPrice;
        priceHTML += `
            <div class="text-[11px] font-bold ${isDrop ? 'text-emerald-500 bg-emerald-50' : 'text-red-500 bg-red-50'} inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ml-3 shadow-sm border border-gray-100">
                <i class="fa-solid ${isDrop ? 'fa-arrow-trend-down' : 'fa-arrow-trend-up'}"></i>
                <span>Eski: ${oldPrice} TL</span>
            </div>
        `;
    }
    document.getElementById('detail-price').innerHTML = priceHTML;
    document.getElementById('detail-unit').innerText = item.unit ? `/ ${item.unit}` : '';
    document.getElementById('detail-desc').innerText = item.desc || "Açıklama girilmedi.";
    document.getElementById('detail-seller').innerText = item.seller;

    const wholesaleBox = document.getElementById('detail-wholesale-box');
    if (item.businessType === 'Toptancı' && item.minOrderQty) {
        document.getElementById('detail-min-order').innerText = item.minOrderQty;
        wholesaleBox.classList.remove('hidden');
    } else {
        wholesaleBox.classList.add('hidden');
    }

    const customBox = document.getElementById('detail-custom-box');
    if (customBox) {
        if (item.isCustomizable) {
            customBox.classList.remove('hidden');
        } else {
            customBox.classList.add('hidden');
        }
    }
    
    const harvestBox = document.getElementById('detail-harvest-box');
    const harvestText = document.getElementById('detail-harvest-date');
    if (harvestBox && harvestText) {
        if (item.harvestDate) {
            harvestText.innerText = item.harvestDate;
            harvestBox.classList.remove('hidden');
        } else {
            harvestBox.classList.add('hidden');
        }
    }

    if (typeof window.renderProducerStory === 'function') window.renderProducerStory(item);
    if (typeof window.setupDetailExtras === 'function') window.setupDetailExtras(item);

    const outsideBox = document.getElementById('detail-outside-hatay-box');
    if (item.outsideHatay) {
        const cityPart = item.realProvince ? `${item.realProvince} şehrinde` : 'Hatay dışında bir şehirde';
        const districtPart = item.realDistrict ? `, ${item.realDistrict} ilçesinde` : '';
        document.getElementById('detail-outside-hatay-text').innerText = `Bu kayıt Hatay dışında — ${cityPart}${districtPart} bulunuyor.`;
        outsideBox.classList.remove('hidden');
    } else {
        outsideBox.classList.add('hidden');
    }

    const detailWhatsAppBtn = document.getElementById('detail-whatsapp'); 
    let cleanPhone = item.phone ? item.phone.replace(/[^0-9]/g, '') : '';
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
    
    if (item.listingType === 'hizmet' && detailWhatsAppBtn) {
        detailWhatsAppBtn.innerHTML = `<i class="fa-solid fa-clipboard-list mr-1"></i> <span>Ücretsiz Keşif / Teklif</span>`;
        detailWhatsAppBtn.onclick = (e) => {
            e.preventDefault();
            const noteInput = document.getElementById('offer-note-input');
            if (noteInput) {
                noteInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                noteInput.focus();
                window.showToast("Lütfen keşif talebi veya teklif almak için notunuzu ekleyip gönderin.", "success");
            }
        };
        detailWhatsAppBtn.href = "#";
        detailWhatsAppBtn.target = "_self";
        detailWhatsAppBtn.className = "bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold text-xs transition flex items-center space-x-1 shadow-sm";
    } else if (detailWhatsAppBtn) {
        const waMsg = `Merhaba ${item.seller}, sisteminizdeki "${escapeHtml(item.title)}" ilanınız/hizmetiniz hakkında görüşmek istiyorum.`;
        detailWhatsAppBtn.href = `https://wa.me/90${cleanPhone}?text=${encodeURIComponent(waMsg)}`;
        detailWhatsAppBtn.target = "_blank";
        detailWhatsAppBtn.innerHTML = `<i class="fa-brands fa-whatsapp text-sm"></i> <span>İletişim</span>`;
        detailWhatsAppBtn.className = "bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold text-xs transition flex items-center space-x-1 shadow-sm";
        detailWhatsAppBtn.onclick = null;
    }

    window.loadSellerProfileBox(item.uid);

    const deleteBtn = document.getElementById('delete-btn');
    const editBtn = document.getElementById('edit-btn');
    if (window.currentUser && item.uid === window.currentUser.uid) {
        deleteBtn.classList.remove('hidden');
        editBtn.classList.remove('hidden');
    } else {
        deleteBtn.classList.add('hidden');
        editBtn.classList.add('hidden');
    }

    updateFavBtnStyle(id);
    document.getElementById('detail-modal').classList.remove('hidden');

    setTimeout(() => { renderMap(item.lat, item.lng, item.district); }, 200);
}

window.openFormModal = openFormModal;
window.closeFormModal = closeFormModal;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.toggleAuthMode = toggleAuthMode;
window.openAccountModal = openAccountModal;
window.closeAccountModal = closeAccountModal;
window.switchAccountTab = switchAccountTab;
window.openTermsModal = openTermsModal;
window.closeTermsModal = closeTermsModal;
window.openReportModal = openReportModal;
window.closeReportModal = closeReportModal;
window.handleReportSubmit = handleReportSubmit;
window.openFormModalForEdit = openFormModalForEdit;
window.setViewMode = setViewMode;
window.changePage = changePage;
window.shareOnWhatsApp = shareOnWhatsApp;
window.openDetailModal = openDetailModal;                            
window.closeDetailModal = closeDetailModal;
window.filterListings = filterListings;
window.executeLocalFilters = executeLocalFilters;
window.renderListings = renderListings;
window.resetAllFilters = resetAllFilters;
window.updateFavBtnStyle = updateFavBtnStyle;
window.getTimeAgo = getTimeAgo;
window.closeSellerProfileModal = closeSellerProfileModal;
window.openCategoryDetailModal = openCategoryDetailModal;
window.closeCategoryDetailModal = closeCategoryDetailModal;
window.renderMap = renderMap;
window.initFormMap = initFormMap;
window.updateFormMapCenter = updateFormMapCenter;
window.updateMarqueeData = updateMarqueeData;
window.renderPaginationControls = renderPaginationControls;
window.loadFavoriteListings = loadFavoriteListings;
window.openInboxTab = openInboxTab;

/* =========================================================================================
   ORONTES — YENİ MODÜLLER (Mevcut özelliklerin hiçbiri değiştirilmemiş / silinmemiştir)
   1) ALIM TALEPLERİ  → Tersine Pazar Yeri ("Ne Arıyorsun?")
   2) HATAY İNTERAKTİF HASAT & SEZON TAKVİMİ
   ========================================================================================= */

/* ------------------------------- ORTAK SABİTLER ------------------------------- */

window.HATAY_DISTRICT_LIST = [
    'Altınözü', 'Antakya', 'Arsuz', 'Belen', 'Defne', 'Dörtyol', 'Erzin', 'Hassa',
    'İskenderun', 'Kırıkhan', 'Kumlu', 'Payas', 'Reyhanlı', 'Samandağ', 'Yayladağı'
];

window.ALL_CATEGORY_LIST = [
    "Zeytin & Yağ", "Narenciye", "Salça & Sos", "Bakliyat & Hububat", "Sebze & Sera",
    "Canlı Hayvan & Süt", "Fide & Tohum", "El Sanatları", "Giyim & Aksesuar",
    "Ev Yapımı Ürünler", "Tadilat & Tamirat", "Özel Ders", "Temizlik",
    "Tarım İşçiliği", "Nakliye & Lojistik", "Diğer"
];

window.BR_BUYER_TYPES = [
    "🏢 Toptancı / Hal Esnafı",
    "🍽️ Restoran & Otel",
    "🛒 Market / Zincir Market",
    "🚢 İhracatçı",
    "🏭 Fabrika / İşleme Tesisi",
    "🤝 Kooperatif / Birlik",
    "📦 E-Ticaret Satıcısı",
    "👤 Bireysel Alıcı"
];

/* =========================================================================================
   MODÜL 1 — ALIM TALEPLERİ (TERSİNE PAZAR YERİ)
   ========================================================================================= */

window.buyRequests = [];
window.filteredBuyRequests = [];
window.brCurrentPage = 1;
window.brItemsPerPage = 8;
window.activeBuyRequestId = null;
window.brDistrictSelection = new Set(['Tüm Hatay']);
window.brOnlyOpen = true;
window.activeBuyRequestsListener = null;
window.activeBuyRequestsQuery = null;
window.notifiedBuyRequests = new Set();

/* ---- Canlı veri dinleyicisi ---- */
window.startBuyRequestsListener = function () {
    try {
        const q = query(ref(db, 'buyRequests'), orderByChild('date'), limitToLast(120));

        if (window.activeBuyRequestsQuery && window.activeBuyRequestsListener) {
            off(window.activeBuyRequestsQuery, 'value', window.activeBuyRequestsListener);
        }

        window.activeBuyRequestsQuery = q;
        window.activeBuyRequestsListener = onValue(q, (snapshot) => {
            const items = [];
            snapshot.forEach((child) => {
                items.push({ id: child.key, ...child.val() });
            });
            items.sort((a, b) => (b.date || 0) - (a.date || 0));

            // Üreticiye "senin kategorinde alıcı var" bildirimi (tavuk-yumurta problemi çözümü)
            if (window.currentUser && window.loginSessionTime) {
                const myCategories = new Set(
                    (window.listings || []).filter(l => l.uid === window.currentUser.uid).map(l => l.category)
                );
                items.forEach(rq => {
                    if (!rq.date || rq.uid === window.currentUser.uid) return;
                    if (window.notifiedBuyRequests.has(rq.id)) return;
                    const isFresh = rq.date > window.loginSessionTime && (Date.now() - rq.date) < 20000;
                    if (isFresh && myCategories.has(rq.category)) {
                        window.notifiedBuyRequests.add(rq.id);
                        window.showToast(`🤝 Sizin kategorinizde yeni ALIM TALEBİ: "${rq.title}" — hemen teklif verin!`, "success");
                    }
                });
            }

            window.buyRequests = items;
            window.executeBuyRequestFilters();

            if (typeof window.updateMarqueeData === 'function') window.updateMarqueeData();

            const brTab = document.getElementById('tab-content-buyrequests');
            if (brTab && !brTab.classList.contains('hidden')) window.loadMyBuyRequests();
        }, (err) => {
            console.warn('Alım talepleri okunamadı:', err);
            const grid = document.getElementById('buyrequests-grid');
            if (grid) {
                grid.innerHTML = `<div class="col-span-full text-center py-10 bg-white rounded-2xl border border-gray-200 text-gray-500 text-xs">
                    <i class="fa-solid fa-triangle-exclamation text-lux-gold text-xl block mb-2"></i>
                    <b class="text-lux-dark block mb-1">Alım talepleri şu anda görüntülenemiyor.</b>
                    Lütfen birkaç saniye sonra sayfayı yenileyin.
                </div>`;
            }
        });
    } catch (err) {
        console.warn('Alım talebi dinleyicisi başlatılamadı:', err);
    }
};

/* ---- Filtreleme ---- */
window.executeBuyRequestFilters = function () {
    const searchEl = document.getElementById('br-search');
    const catEl = document.getElementById('br-category-filter');
    const distEl = document.getElementById('br-district-filter');
    const sortEl = document.getElementById('br-sort-filter');

    const search = searchEl ? searchEl.value.toLocaleLowerCase('tr-TR') : '';
    const category = catEl ? catEl.value : '';
    const district = distEl ? distEl.value : '';
    const sort = sortEl ? sortEl.value : 'newest';

    window.filteredBuyRequests = (window.buyRequests || []).filter(rq => {
        const haystack = `${rq.title || ''} ${rq.desc || ''} ${rq.category || ''} ${rq.buyerName || ''}`.toLocaleLowerCase('tr-TR');
        const matchesSearch = !search || haystack.includes(search);
        const matchesCategory = !category || rq.category === category;

        const districts = Array.isArray(rq.districts) ? rq.districts : (rq.districts ? [rq.districts] : []);
        const isAllHatay = districts.length === 0 || districts.includes('Tüm Hatay');
        const matchesDistrict = !district || isAllHatay || districts.includes(district);

        const matchesStatus = !window.brOnlyOpen || (rq.status || 'Açık') === 'Açık';
        return matchesSearch && matchesCategory && matchesDistrict && matchesStatus;
    });

    if (sort === 'oldest') window.filteredBuyRequests.sort((a, b) => (a.date || 0) - (b.date || 0));
    else if (sort === 'price-high') window.filteredBuyRequests.sort((a, b) => (Number(b.targetPrice) || 0) - (Number(a.targetPrice) || 0));
    else if (sort === 'price-low') window.filteredBuyRequests.sort((a, b) => (Number(a.targetPrice) || Infinity) - (Number(b.targetPrice) || Infinity));
    else if (sort === 'urgent') window.filteredBuyRequests.sort((a, b) => (b.isUrgent ? 1 : 0) - (a.isUrgent ? 1 : 0) || (b.date || 0) - (a.date || 0));
    else window.filteredBuyRequests.sort((a, b) => (b.date || 0) - (a.date || 0));

    window.brCurrentPage = 1;
    window.renderBuyRequests();
};

window.toggleBuyRequestOpenOnly = function () {
    window.brOnlyOpen = !window.brOnlyOpen;
    const btn = document.getElementById('br-open-toggle');
    if (btn) {
        btn.className = window.brOnlyOpen
            ? "bg-lux-gold text-lux-dark font-bold px-3 py-2 rounded-xl text-xs transition whitespace-nowrap"
            : "bg-lux-olive/40 text-lux-sage font-semibold px-3 py-2 rounded-xl text-xs transition whitespace-nowrap border border-lux-gold/20";
        btn.innerHTML = window.brOnlyOpen
            ? '<i class="fa-solid fa-toggle-on mr-1"></i> Sadece Açık Talepler'
            : '<i class="fa-solid fa-toggle-off mr-1"></i> Kapananlar Dahil';
    }
    window.executeBuyRequestFilters();
};

window.resetBuyRequestFilters = function () {
    const ids = ['br-search', 'br-category-filter', 'br-district-filter'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const sortEl = document.getElementById('br-sort-filter');
    if (sortEl) sortEl.value = 'newest';
    window.brOnlyOpen = true;
    const btn = document.getElementById('br-open-toggle');
    if (btn) {
        btn.className = "bg-lux-gold text-lux-dark font-bold px-3 py-2 rounded-xl text-xs transition whitespace-nowrap";
        btn.innerHTML = '<i class="fa-solid fa-toggle-on mr-1"></i> Sadece Açık Talepler';
    }
    window.executeBuyRequestFilters();
};

/* ---- Yardımcılar ---- */
window.getBuyRequestDistrictText = function (rq) {
    const districts = Array.isArray(rq.districts) ? rq.districts : (rq.districts ? [rq.districts] : []);
    if (districts.length === 0 || districts.includes('Tüm Hatay')) return 'Tüm Hatay (Farketmez)';
    return districts.join(' · ');
};

window.getMatchingListingsForRequest = function (rq) {
    const districts = Array.isArray(rq.districts) ? rq.districts : (rq.districts ? [rq.districts] : []);
    const isAllHatay = districts.length === 0 || districts.includes('Tüm Hatay');
    return (window.listings || []).filter(l => {
        if (rq.category && l.category !== rq.category) return false;
        if (!isAllHatay && !districts.includes(l.district)) return false;
        return true;
    }).sort((a, b) => (b.date || 0) - (a.date || 0));
};

/* ---- Kart listesi ---- */
window.renderBuyRequests = function () {
    const grid = document.getElementById('buyrequests-grid');
    if (!grid) return;

    const items = window.filteredBuyRequests || [];
    const countEl = document.getElementById('br-total-count');
    const openCount = (window.buyRequests || []).filter(r => (r.status || 'Açık') === 'Açık').length;
    if (countEl) countEl.innerText = `${items.length} talep listelendi · ${openCount} açık alım talebi`;

    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-lux-olive/40 text-gray-500 text-xs">
            <i class="fa-solid fa-cart-flatbed text-2xl text-lux-sage block mb-2"></i>
            <b class="text-lux-dark block mb-1">Bu kriterlerde alım talebi bulunamadı.</b>
            Toptancı, restoran, otel veya hal esnafıysanız aradığınız ürünü buraya yazın; üreticiler size teklif getirsin.
            <button onclick="window.openBuyRequestForm()" class="block mx-auto mt-3 bg-lux-dark text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-lux-olive transition">
                <i class="fa-solid fa-plus mr-1"></i> Alım Talebi Oluştur
            </button>
        </div>`;
        const pag = document.getElementById('br-pagination');
        if (pag) pag.innerHTML = '';
        return;
    }

    const startIndex = (window.brCurrentPage - 1) * window.brItemsPerPage;
    const pageItems = items.slice(startIndex, startIndex + window.brItemsPerPage);

    pageItems.forEach(rq => {
        const isClosed = (rq.status || 'Açık') !== 'Açık';
        const emoji = categoryEmojis[rq.category] || '📦';
        const matchCount = window.getMatchingListingsForRequest(rq).length;

        const card = document.createElement('div');
        card.className = `bg-white rounded-2xl border ${isClosed ? 'border-gray-200 opacity-70' : (rq.isUrgent ? 'border-[1.5px] border-red-500' : 'border-lux-olive/30')} p-4 flex flex-col justify-between hover:shadow-lg transition-all duration-300`;
        card.innerHTML = `
            <div>
                <div class="flex items-start justify-between gap-2 mb-2">
                    <span class="bg-lux-dark text-lux-gold text-[9px] font-extrabold px-2 py-1 rounded-md uppercase tracking-wide whitespace-nowrap">
                        <i class="fa-solid fa-cart-shopping mr-0.5"></i> Alım Talebi
                    </span>
                    <span class="text-[9px] text-gray-400 whitespace-nowrap"><i class="fa-regular fa-clock mr-0.5"></i>${getTimeAgo(rq.date)}</span>
                </div>

                <div class="flex flex-wrap gap-1 mb-2">
                    ${isClosed ? '<span class="bg-gray-500 text-white font-bold text-[9px] px-2 py-0.5 rounded">KAPANDI</span>' : ''}
                    ${rq.isUrgent ? '<span class="bg-red-600 text-white font-bold text-[9px] px-2 py-0.5 rounded animate-pulse">🔥 ACİL</span>' : ''}
                    ${rq.recurring ? `<span class="bg-lux-olive text-white font-bold text-[9px] px-2 py-0.5 rounded">🔁 DÜZENLİ ALIM${rq.frequency ? ' · ' + escapeHtml(rq.frequency) : ''}</span>` : ''}
                    ${rq.buyerType ? `<span class="bg-lux-bg text-lux-dark font-semibold text-[9px] px-2 py-0.5 rounded border border-gray-200">${escapeHtml(rq.buyerType)}</span>` : ''}
                </div>

                <h3 onclick="window.openBuyRequestDetail('${escapeHtml(rq.id)}')" class="font-bold text-lux-dark text-xs hover:text-lux-olive cursor-pointer line-clamp-2 mb-1.5">
                    ${emoji} ${escapeHtml(rq.title || 'Alım talebi')}
                </h3>

                <div class="text-[10px] text-gray-500 space-y-1">
                    <p><i class="fa-solid fa-weight-hanging text-lux-gold w-3"></i> Aranan miktar: <b class="text-lux-dark">${escapeHtml(rq.quantity || 'Belirtilmedi')} ${escapeHtml(rq.unit || '')}</b></p>
                    <p><i class="fa-solid fa-location-dot text-lux-gold w-3"></i> ${escapeHtml(window.getBuyRequestDistrictText(rq))}</p>
                    ${rq.deadline ? `<p><i class="fa-solid fa-calendar-day text-lux-gold w-3"></i> Teslim / Termin: ${escapeHtml(rq.deadline)}</p>` : ''}
                    ${matchCount > 0 ? `<p class="text-emerald-700 font-semibold"><i class="fa-solid fa-seedling w-3"></i> Vitrinde ${matchCount} uygun ilan var</p>` : ''}
                </div>
            </div>

            <div class="border-t border-gray-100 mt-3 pt-2.5 flex items-end justify-between gap-2">
                <div>
                    <span class="text-[9px] text-gray-400 block">${rq.targetPrice ? 'Hedef / Bütçe' : 'Fiyat'}</span>
                    <span class="text-base font-bold text-lux-dark">${rq.targetPrice ? `${escapeHtml(String(rq.targetPrice))} TL` : 'Teklif Bekliyor'}</span>
                    <span class="text-[9px] text-gray-400 block">${escapeHtml(rq.buyerName || 'Alıcı')}</span>
                </div>
                <button onclick="window.openBuyRequestDetail('${escapeHtml(rq.id)}')" class="text-[11px] ${isClosed ? 'bg-lux-bg text-gray-500' : 'bg-lux-gold text-lux-dark hover:bg-[#ad9868]'} font-bold px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                    ${isClosed ? 'Detay' : 'Teklif Ver'}
                </button>
            </div>
        `;
        grid.appendChild(card);
    });

    window.renderBuyRequestPagination(items.length);
};

window.renderBuyRequestPagination = function (totalItems) {
    const container = document.getElementById('br-pagination');
    if (!container) return;
    const totalPages = Math.ceil(totalItems / window.brItemsPerPage);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = `<button onclick="window.changeBuyRequestPage(${window.brCurrentPage - 1})" ${window.brCurrentPage === 1 ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg border bg-white text-xs disabled:opacity-40"><i class="fa-solid fa-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button onclick="window.changeBuyRequestPage(${i})" class="px-3 py-1 rounded-lg text-xs font-bold ${i === window.brCurrentPage ? 'bg-lux-dark text-white' : 'bg-white border text-gray-700'}">${i}</button>`;
    }
    html += `<button onclick="window.changeBuyRequestPage(${window.brCurrentPage + 1})" ${window.brCurrentPage === totalPages ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg border bg-white text-xs disabled:opacity-40"><i class="fa-solid fa-chevron-right"></i></button>`;
    container.innerHTML = html;
};

window.changeBuyRequestPage = function (page) {
    const totalPages = Math.max(1, Math.ceil((window.filteredBuyRequests || []).length / window.brItemsPerPage));
    window.brCurrentPage = Math.min(Math.max(1, page), totalPages);
    window.renderBuyRequests();
    const sec = document.getElementById('buyrequests-section');
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/* ---- İlçe seçim çipleri (form) ---- */
window.renderBrDistrictChips = function () {
    const box = document.getElementById('br-district-chips');
    if (!box) return;
    box.innerHTML = '';

    const makeChip = (label) => {
        const chip = document.createElement('span');
        const isSelected = window.brDistrictSelection.has(label);
        chip.innerText = label;
        chip.className = `cursor-pointer text-[10px] px-2 py-1 rounded-full border transition-all ${isSelected ? 'bg-lux-dark text-lux-gold border-lux-gold font-bold' : 'bg-white hover:bg-lux-bg text-lux-dark border-gray-300 font-medium'}`;
        chip.onclick = () => {
            if (label === 'Tüm Hatay') {
                window.brDistrictSelection.clear();
                window.brDistrictSelection.add('Tüm Hatay');
            } else {
                window.brDistrictSelection.delete('Tüm Hatay');
                if (window.brDistrictSelection.has(label)) window.brDistrictSelection.delete(label);
                else window.brDistrictSelection.add(label);
                if (window.brDistrictSelection.size === 0) window.brDistrictSelection.add('Tüm Hatay');
            }
            window.renderBrDistrictChips();
        };
        box.appendChild(chip);
    };

    makeChip('Tüm Hatay');
    window.HATAY_DISTRICT_LIST.forEach(d => makeChip(d));
};

/* ---- Form modalı ---- */
window.openBuyRequestForm = function (prefill) {
    if (!window.currentUser) {
        window.showToast("Alım talebi oluşturmak için giriş yapmalısınız.", "warning");
        window.openAuthModal('login');
        return;
    }

    const form = document.getElementById('buyrequest-form');
    if (form) form.reset();

    document.getElementById('br-edit-id').value = '';
    document.getElementById('br-form-title-text').innerText = 'Alım Talebi Oluştur (Ne Arıyorsun?)';
    document.getElementById('br-submit-btn').innerText = 'Talebi Yayınla';

    window.brDistrictSelection = new Set(['Tüm Hatay']);
    window.renderBrDistrictChips();
    if (typeof window.toggleBrFrequency === 'function') window.toggleBrFrequency();

    const nameEl = document.getElementById('br-name');
    const phoneEl = document.getElementById('br-phone');
    if (nameEl) nameEl.value = window.userExtraData.username || window.currentUser.displayName || (window.currentUser.email || '').split('@')[0];
    if (phoneEl) phoneEl.value = window.userExtraData.phone || '';

    if (prefill && prefill.category) {
        const catEl = document.getElementById('br-category');
        if (catEl) catEl.value = prefill.category;
    }
    if (prefill && prefill.title) {
        const tEl = document.getElementById('br-title');
        if (tEl) tEl.value = prefill.title;
    }
    if (prefill && prefill.districts && prefill.districts.length) {
        window.brDistrictSelection = new Set(prefill.districts);
        window.renderBrDistrictChips();
    }

    document.getElementById('buyrequest-detail-modal').classList.add('hidden');
    document.getElementById('buyrequest-form-modal').classList.remove('hidden');
};

window.closeBuyRequestForm = function () {
    document.getElementById('buyrequest-form-modal').classList.add('hidden');
};

window.openBuyRequestFormForEdit = function (id) {
    const rq = (window.buyRequests || []).find(r => r.id === id);
    if (!rq) return;
    if (!window.currentUser || rq.uid !== window.currentUser.uid) {
        window.showToast("Bu talebi düzenleme yetkiniz yok.", "error");
        return;
    }

    document.getElementById('br-edit-id').value = rq.id;
    document.getElementById('br-form-title-text').innerText = 'Alım Talebini Düzenle';
    document.getElementById('br-submit-btn').innerText = 'Değişiklikleri Kaydet';

    document.getElementById('br-buyer-type').value = rq.buyerType || window.BR_BUYER_TYPES[0];
    document.getElementById('br-category').value = rq.category || '';
    document.getElementById('br-title').value = rq.title || '';
    document.getElementById('br-quantity').value = rq.quantity || '';
    document.getElementById('br-unit').value = rq.unit || '';
    document.getElementById('br-target-price').value = rq.targetPrice || '';
    document.getElementById('br-deadline').value = rq.deadline || '';
    document.getElementById('br-desc').value = rq.desc || '';
    document.getElementById('br-name').value = rq.buyerName || '';
    document.getElementById('br-phone').value = rq.phone || '';
    document.getElementById('br-recurring').checked = !!rq.recurring;
    if (document.getElementById('br-frequency') && rq.frequency) document.getElementById('br-frequency').value = rq.frequency;
    if (typeof window.toggleBrFrequency === 'function') window.toggleBrFrequency();
    document.getElementById('br-urgent').checked = !!rq.isUrgent;

    const districts = Array.isArray(rq.districts) ? rq.districts : (rq.districts ? [rq.districts] : ['Tüm Hatay']);
    window.brDistrictSelection = new Set(districts.length ? districts : ['Tüm Hatay']);
    window.renderBrDistrictChips();

    document.getElementById('buyrequest-detail-modal').classList.add('hidden');
    document.getElementById('buyrequest-form-modal').classList.remove('hidden');
};

window.handleBuyRequestSubmit = async function (e) {
    e.preventDefault();
    if (!window.currentUser) {
        window.showToast("Alım talebi için giriş yapmalısınız.", "warning");
        return;
    }

    const btn = document.getElementById('br-submit-btn');
    const editId = document.getElementById('br-edit-id').value;

    const title = document.getElementById('br-title').value.trim();
    const category = document.getElementById('br-category').value;
    const quantity = document.getElementById('br-quantity').value.trim();
    const phone = document.getElementById('br-phone').value.trim();
    const buyerName = document.getElementById('br-name').value.trim();

    if (!title || !category || !quantity || !buyerName || !phone) {
        window.showToast("Lütfen zorunlu (*) alanları doldurun.", "warning");
        return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
        window.showToast("Lütfen geçerli bir WhatsApp numarası girin.", "warning");
        return;
    }

    const districts = Array.from(window.brDistrictSelection);
    const existing = editId ? (window.buyRequests || []).find(r => r.id === editId) : null;

    if (editId && (!existing || existing.uid !== window.currentUser.uid)) {
        window.showToast("Bu talebi düzenleme yetkiniz yok.", "error");
        return;
    }

    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Kaydediliyor...";

    const payload = {
        uid: window.currentUser.uid,
        userEmail: window.currentUser.email,
        buyerName: buyerName,
        phone: phone,
        buyerType: document.getElementById('br-buyer-type').value,
        title: title,
        category: category,
        quantity: quantity,
        unit: document.getElementById('br-unit').value.trim() || 'KG',
        targetPrice: Number(document.getElementById('br-target-price').value) || null,
        deadline: document.getElementById('br-deadline').value.trim() || null,
        districts: districts.length ? districts : ['Tüm Hatay'],
        recurring: document.getElementById('br-recurring').checked,
        frequency: (document.getElementById('br-recurring').checked && document.getElementById('br-frequency'))
            ? document.getElementById('br-frequency').value : null,
        isUrgent: document.getElementById('br-urgent').checked,
        desc: document.getElementById('br-desc').value.trim() || null,
        status: existing ? (existing.status || 'Açık') : 'Açık',
        date: existing ? existing.date : Date.now(),
        updatedAt: Date.now()
    };

    try {
        if (editId) {
            await update(ref(db, 'buyRequests/' + editId), payload);
            window.showToast("Alım talebiniz güncellendi.", "success");
        } else {
            await push(ref(db, 'buyRequests'), payload);
            window.showToast("🤝 Alım talebiniz yayınlandı! Üreticiler size teklif gönderebilir.", "success");
        }
        window.closeBuyRequestForm();
        const sec = document.getElementById('buyrequests-section');
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
        console.error(err);
        window.showToast("Talep kaydedilemedi: " + (err && err.message ? err.message : 'Bilinmeyen hata'), "error");
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
};

/* ---- Detay modalı ---- */
window.openBuyRequestDetail = function (id) {
    const rq = (window.buyRequests || []).find(r => r.id === id);
    if (!rq) return;

    window.activeBuyRequestId = id;
    const isClosed = (rq.status || 'Açık') !== 'Açık';
    const isOwner = window.currentUser && rq.uid === window.currentUser.uid;
    const emoji = categoryEmojis[rq.category] || '📦';

    document.getElementById('brd-title').innerText = `${emoji} ${rq.title || 'Alım Talebi'}`;
    document.getElementById('brd-category').innerText = rq.category || '-';
    document.getElementById('brd-time').innerText = getTimeAgo(rq.date);
    document.getElementById('brd-quantity').innerText = `${rq.quantity || 'Belirtilmedi'} ${rq.unit || ''}`;
    document.getElementById('brd-target-price').innerText = rq.targetPrice ? `${rq.targetPrice} TL` : 'Belirtilmedi (Teklif bekleniyor)';
    document.getElementById('brd-deadline').innerText = rq.deadline || 'Belirtilmedi';
    document.getElementById('brd-districts').innerText = window.getBuyRequestDistrictText(rq);
    document.getElementById('brd-desc').innerText = rq.desc || 'Ek açıklama girilmedi.';
    document.getElementById('brd-buyer').innerText = rq.buyerName || 'Alıcı';
    document.getElementById('brd-buyer-type').innerText = rq.buyerType || '-';

    const badges = document.getElementById('brd-badges');
    badges.innerHTML = `
        ${isClosed ? '<span class="bg-gray-500 text-white font-bold text-[9px] px-2 py-0.5 rounded">KAPANDI</span>' : '<span class="bg-emerald-600 text-white font-bold text-[9px] px-2 py-0.5 rounded">AÇIK TALEP</span>'}
        ${rq.isUrgent ? '<span class="bg-red-600 text-white font-bold text-[9px] px-2 py-0.5 rounded">🔥 ACİL</span>' : ''}
        ${rq.recurring ? `<span class="bg-lux-olive text-white font-bold text-[9px] px-2 py-0.5 rounded">🔁 DÜZENLİ ALIM${rq.frequency ? ' · ' + escapeHtml(rq.frequency) : ''}</span>` : ''}
    `;

    // WhatsApp köprüsü
    const waBtn = document.getElementById('brd-whatsapp');
    let cleanPhone = rq.phone ? rq.phone.replace(/[^0-9]/g, '') : '';
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
    if (waBtn) {
        if (cleanPhone) {
            const waMsg = `Merhaba ${rq.buyerName || ''}, ORONTES üzerindeki "${rq.title}" alım talebiniz için ürünüm/teklifim var. Görüşmek isterim.`;
            waBtn.href = `https://wa.me/90${cleanPhone}?text=${encodeURIComponent(waMsg)}`;
            waBtn.classList.remove('hidden');
        } else {
            waBtn.classList.add('hidden');
        }
    }

    // Sahibi kontrolleri
    const ownerBox = document.getElementById('brd-owner-actions');
    const offerBox = document.getElementById('brd-offer-box');
    if (isOwner) {
        ownerBox.classList.remove('hidden');
        offerBox.classList.add('hidden');
        document.getElementById('brd-status-btn').innerHTML = isClosed
            ? '<i class="fa-solid fa-lock-open mr-1"></i> Talebi Yeniden Aç'
            : '<i class="fa-solid fa-lock mr-1"></i> Talebi Kapat';
    } else {
        ownerBox.classList.add('hidden');
        offerBox.classList.toggle('hidden', isClosed);
    }

    const closedNote = document.getElementById('brd-closed-note');
    if (closedNote) closedNote.classList.toggle('hidden', !isClosed);

    // Vitrindeki uygun ilanlar
    const matchBox = document.getElementById('brd-matches');
    const matches = window.getMatchingListingsForRequest(rq).slice(0, 6);
    if (matchBox) {
        if (matches.length === 0) {
            matchBox.innerHTML = `<p class="text-[11px] text-gray-400 italic">Bu kritere uygun vitrin ilanı şu an görünmüyor. Talebiniz yayında kaldıkça üreticiler size ulaşabilir.</p>`;
        } else {
            matchBox.innerHTML = '';
            matches.forEach(item => {
                const row = document.createElement('div');
                row.className = "flex justify-between items-center bg-lux-bg/40 p-2 rounded-xl border border-gray-200/60 text-xs cursor-pointer hover:bg-lux-sage/20 transition";
                row.onclick = () => { window.closeBuyRequestDetail(); window.openDetailModal(item.id); };
                row.innerHTML = `
                    <div class="flex items-center gap-2 min-w-0">
                        <img src="${escapeHtml(item.image)}" class="w-9 h-9 rounded-lg object-cover shrink-0">
                        <div class="min-w-0">
                            <span class="font-bold text-lux-dark block line-clamp-1">${escapeHtml(item.title)}</span>
                            <span class="text-[10px] text-gray-500">${item.price} TL · ${escapeHtml(window.getListingLocationText(item))}</span>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-gray-400 text-[10px]"></i>
                `;
                matchBox.appendChild(row);
            });
        }
    }

    const priceInput = document.getElementById('brd-offer-price');
    const noteInput = document.getElementById('brd-offer-note');
    if (priceInput) priceInput.value = '';
    if (noteInput) noteInput.value = '';

    document.getElementById('buyrequest-detail-modal').classList.remove('hidden');
};

window.closeBuyRequestDetail = function () {
    document.getElementById('buyrequest-detail-modal').classList.add('hidden');
    window.activeBuyRequestId = null;
};

/* ---- Üreticiden alıcıya tedarik teklifi (mevcut 'offers' altyapısını kullanır) ---- */
window.submitSupplyOffer = async function () {
    if (!window.currentUser) {
        window.showToast("Teklif göndermek için giriş yapmalısınız.", "warning");
        window.openAuthModal('login');
        return;
    }
    const rq = (window.buyRequests || []).find(r => r.id === window.activeBuyRequestId);
    if (!rq) return;

    if (rq.uid === window.currentUser.uid) {
        window.showToast("Kendi alım talebinize teklif gönderemezsiniz.", "error");
        return;
    }
    if ((rq.status || 'Açık') !== 'Açık') {
        window.showToast("Bu alım talebi kapatılmış.", "warning");
        return;
    }

    const price = document.getElementById('brd-offer-price').value;
    const note = document.getElementById('brd-offer-note').value;

    if (!price) {
        window.showToast("Lütfen ürün/hizmet için birim fiyatınızı girin.", "warning");
        return;
    }

    const btn = document.getElementById('brd-offer-btn');
    if (btn) { btn.disabled = true; btn.innerText = "Gönderiliyor..."; }

    try {
        await push(ref(db, 'offers'), {
            offerKind: 'supply',
            requestId: rq.id,
            listingId: rq.id,
            listingTitle: rq.title,
            sellerUid: rq.uid,
            buyerUid: window.currentUser.uid,
            buyerName: window.userExtraData.username || window.currentUser.displayName || window.currentUser.email,
            buyerPhone: window.userExtraData.phone || 'Belirtilmedi',
            offeredPrice: price,
            note: note,
            status: 'Beklemede',
            date: Date.now()
        });
        window.showToast("Tedarik teklifiniz alıcıya iletildi! Yanıtı 'Gelen / Gönderilen' sekmesinden takip edebilirsiniz.", "success");
        document.getElementById('brd-offer-price').value = '';
        document.getElementById('brd-offer-note').value = '';
    } catch (err) {
        window.showToast("Teklif iletilemedi: " + (err && err.message ? err.message : 'Bilinmeyen hata'), "error");
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "Tedarik Teklifimi Gönder"; }
    }
};

window.toggleBuyRequestStatus = async function () {
    const rq = (window.buyRequests || []).find(r => r.id === window.activeBuyRequestId);
    if (!rq || !window.currentUser || rq.uid !== window.currentUser.uid) return;
    const newStatus = (rq.status || 'Açık') === 'Açık' ? 'Kapandı' : 'Açık';
    try {
        await update(ref(db, 'buyRequests/' + rq.id), { status: newStatus, updatedAt: Date.now() });
        window.showToast(`Talep durumu "${newStatus}" olarak güncellendi.`, "success");
        setTimeout(() => window.openBuyRequestDetail(rq.id), 300);
    } catch (err) {
        window.showToast("Durum güncellenemedi: " + err.message, "error");
    }
};

window.deleteBuyRequest = async function (id) {
    const targetId = id || window.activeBuyRequestId;
    const rq = (window.buyRequests || []).find(r => r.id === targetId);
    if (!rq || !window.currentUser || rq.uid !== window.currentUser.uid) {
        window.showToast("Bu talebi silme yetkiniz yok.", "error");
        return;
    }
    if (!confirm("Bu alım talebini silmek istediğinizden emin misiniz?")) return;
    try {
        await remove(ref(db, 'buyRequests/' + targetId));
        window.showToast("Alım talebi silindi.", "success");
        window.closeBuyRequestDetail();
        if (typeof window.loadMyBuyRequests === 'function') window.loadMyBuyRequests();
    } catch (err) {
        window.showToast("Silinemedi: " + err.message, "error");
    }
};

/* ---- Hesabım > Alım Taleplerim sekmesi ---- */
window.loadMyBuyRequests = function () {
    const container = document.getElementById('tab-content-buyrequests');
    if (!container) return;
    if (!window.currentUser) { container.innerHTML = ''; return; }

    const mine = (window.buyRequests || []).filter(r => r.uid === window.currentUser.uid);
    container.innerHTML = `
        <button onclick="closeAccountModal(); window.openBuyRequestForm();" class="w-full bg-lux-dark text-white font-bold py-2 rounded-xl text-xs hover:bg-lux-olive transition mb-2">
            <i class="fa-solid fa-plus mr-1"></i> Yeni Alım Talebi Oluştur
        </button>
    `;

    if (mine.length === 0) {
        container.innerHTML += `<p class="text-xs text-gray-400 italic">Henüz bir alım talebiniz yok. Aradığınız ürünü yazın, üreticiler size teklif getirsin.</p>`;
        return;
    }

    mine.forEach(rq => {
        const isClosed = (rq.status || 'Açık') !== 'Açık';
        const row = document.createElement('div');
        row.className = "flex justify-between items-center bg-lux-bg/40 p-2.5 rounded-xl border border-gray-200/60 text-xs";
        row.innerHTML = `
            <div class="min-w-0 pr-2">
                <span class="font-bold text-lux-dark block line-clamp-1">${categoryEmojis[rq.category] || '📦'} ${escapeHtml(rq.title)}</span>
                <span class="text-[10px] text-gray-500">${escapeHtml(rq.quantity || '')} ${escapeHtml(rq.unit || '')} · ${escapeHtml(window.getBuyRequestDistrictText(rq))}</span>
                <span class="text-[9px] font-bold ${isClosed ? 'text-gray-500' : 'text-emerald-700'} block">${isClosed ? 'KAPANDI' : 'AÇIK'}</span>
            </div>
            <div class="flex space-x-1 shrink-0">
                <button onclick="closeAccountModal(); window.openBuyRequestDetail('${escapeHtml(rq.id)}')" class="bg-lux-dark text-white text-[10px] px-2 py-1 rounded">İncele</button>
                <button onclick="closeAccountModal(); window.openBuyRequestFormForEdit('${escapeHtml(rq.id)}')" class="bg-amber-100 text-amber-800 text-[10px] px-2 py-1 rounded"><i class="fa-solid fa-pen"></i></button>
                <button onclick="window.deleteBuyRequest('${escapeHtml(rq.id)}')" class="bg-red-100 text-red-600 text-[10px] px-2 py-1 rounded"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;
        container.appendChild(row);
    });
};

/* ---- Gelen kutusundaki teklif kartından hedefe gitme (ilan veya alım talebi) ---- */
window.openOfferTargetModal = function (kind, targetId) {
    if (kind === 'supply') {
        const rq = (window.buyRequests || []).find(r => r.id === targetId);
        if (rq) { window.openBuyRequestDetail(targetId); return; }
        window.showToast("Bu alım talebi kaldırılmış veya artık listede değil.", "warning");
        return;
    }
    window.openDetailModal(targetId);
};

/* =========================================================================================
   MODÜL 2 — HATAY İNTERAKTİF HASAT & SEZON TAKVİMİ
   ========================================================================================= */

window.TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
window.TR_MONTHS_SHORT = ['Oc', 'Şu', 'Mr', 'Ni', 'My', 'Hz', 'Tm', 'Ağ', 'Ey', 'Ek', 'Ka', 'Ar'];

/* months: hasat ayları (1-12) · peak: rekoltenin en yoğun olduğu aylar */
window.HATAY_HARVEST_DATA = [
    {
        name: 'Sofralık & Yağlık Zeytin', emoji: '🫒', category: 'Zeytin & Yağ', keyword: 'zeytin',
        districts: ['Altınözü', 'Yayladağı', 'Antakya', 'Kırıkhan', 'Belen', 'Reyhanlı', 'Hassa'],
        months: [9, 10, 11, 12], peak: [10, 11],
        note: 'Halhalı ve Sarı Haşebi çeşitleri öne çıkar. Ekim–Kasım rekolte zirvesidir; ön bağlantı Eylül başında yapılır.'
    },
    {
        name: 'Soğuk Sıkım Zeytinyağı', emoji: '🫗', category: 'Zeytin & Yağ', keyword: 'zeytinyağı',
        districts: ['Altınözü', 'Yayladağı', 'Antakya', 'Belen', 'Kırıkhan'],
        months: [11, 12, 1], peak: [11, 12],
        note: 'Sıkım sezonu hasadın hemen ardından açılır. Yeni sezon (erken hasat) yağ için Kasım ayı takip edilmelidir.'
    },
    {
        name: 'Mandalina (Nova / Satsuma)', emoji: '🍊', category: 'Narenciye', keyword: 'mandalina',
        districts: ['Dörtyol', 'Erzin', 'Payas', 'Samandağ', 'Arsuz', 'İskenderun'],
        months: [10, 11, 12], peak: [11],
        note: 'Erkenci çeşitler Ekim ortasında piyasaya çıkar. Zincir market tedarikçileri Eylül’de ön bağlantı yapar.'
    },
    {
        name: 'W. Murcott Mandalina', emoji: '🍊', category: 'Narenciye', keyword: 'murcott',
        districts: ['Dörtyol', 'Erzin', 'Payas', 'Arsuz'],
        months: [1, 2, 3], peak: [2],
        note: 'İhracatın lokomotifi geç çeşit. Şubat en yoğun dönem; soğuk hava deposu ile Mart sonuna kadar sürebilir.'
    },
    {
        name: 'Portakal (Washington / Valencia)', emoji: '🍊', category: 'Narenciye', keyword: 'portakal',
        districts: ['Dörtyol', 'Erzin', 'Samandağ', 'Arsuz', 'Payas'],
        months: [12, 1, 2, 3, 4], peak: [1, 2],
        note: 'Washington kışın, Valencia ilkbaharda toplanır. Meyve suyu fabrikaları için sıkımlık tonaj bu dönemde bulunur.'
    },
    {
        name: 'Limon (Enterdonat / Mayer)', emoji: '🍋', category: 'Narenciye', keyword: 'limon',
        districts: ['Dörtyol', 'Erzin', 'Samandağ', 'Arsuz'],
        months: [9, 10, 11, 12], peak: [10, 11],
        note: 'Enterdonat Eylül sonunda başlar. Depolanabilir olduğu için yıl boyu bağlantı yapılabilir.'
    },
    {
        name: 'Greyfurt', emoji: '🍊', category: 'Narenciye', keyword: 'greyfurt',
        districts: ['Dörtyol', 'Erzin', 'Arsuz'],
        months: [11, 12, 1, 2], peak: [12],
        note: 'Star Ruby çeşidi ihracatta öne çıkar; Aralık ayı en verimli dönemdir.'
    },
    {
        name: 'Salçalık Kırmızı Biber', emoji: '🌶️', category: 'Salça & Sos', keyword: 'biber',
        districts: ['Samandağ', 'Antakya', 'Defne', 'Kumlu', 'Altınözü'],
        months: [8, 9, 10], peak: [9],
        note: 'Hatay usulü salça ve pul biber üretiminin ana dönemi. Eylül ayında toplu alım fiyatları en uygun seviyededir.'
    },
    {
        name: 'Sivri / Çarliston Biber (Sera)', emoji: '🫑', category: 'Sebze & Sera', keyword: 'biber',
        districts: ['Samandağ', 'Arsuz', 'Defne', 'Erzin'],
        months: [3, 4, 5, 6, 10, 11, 12], peak: [4, 11],
        note: 'Örtüaltı üretim sayesinde yılın büyük kısmında tedarik edilebilir; kış aylarında fiyat yükselir.'
    },
    {
        name: 'Domates (Sera)', emoji: '🍅', category: 'Sebze & Sera', keyword: 'domates',
        districts: ['Samandağ', 'Arsuz', 'Erzin', 'Dörtyol'],
        months: [3, 4, 5, 6, 10, 11, 12], peak: [5, 11],
        note: 'İki dönemli sera üretimi vardır. Hal ve market tedariki için Mayıs ve Kasım en bol dönemlerdir.'
    },
    {
        name: 'Patlıcan & Kabak (Sera)', emoji: '🍆', category: 'Sebze & Sera', keyword: 'patlıcan',
        districts: ['Samandağ', 'Arsuz', 'Defne', 'Antakya'],
        months: [4, 5, 6, 10, 11], peak: [5],
        note: 'Restoran ve otel tedarikinde düzenli haftalık alım için uygundur.'
    },
    {
        name: 'Sofralık Üzüm', emoji: '🍇', category: 'Sebze & Sera', keyword: 'üzüm',
        districts: ['Hassa', 'Kırıkhan', 'Belen', 'Yayladağı'],
        months: [7, 8, 9], peak: [8],
        note: 'Hassa üzümü bölgenin tescilli lezzetidir. Ağustos ayı hem sofralık hem pekmezlik için zirve dönemdir.'
    },
    {
        name: 'Nar', emoji: '🍎', category: 'Sebze & Sera', keyword: 'nar',
        districts: ['Erzin', 'Dörtyol', 'Hassa', 'Kırıkhan'],
        months: [9, 10, 11], peak: [10],
        note: 'Hicaznar çeşidi öne çıkar. Nar ekşisi üreticileri için Ekim ayı toplu alım dönemidir.'
    },
    {
        name: 'İncir', emoji: '🌿', category: 'Sebze & Sera', keyword: 'incir',
        districts: ['Samandağ', 'Yayladağı', 'Altınözü', 'Belen'],
        months: [7, 8, 9], peak: [8],
        note: 'Taze incir çabuk bozulduğu için kısa mesafeli ve hızlı lojistik gerektirir.'
    },
    {
        name: 'Muz (Örtüaltı)', emoji: '🍌', category: 'Sebze & Sera', keyword: 'muz',
        districts: ['Samandağ', 'Arsuz', 'Erzin', 'Dörtyol'],
        months: [9, 10, 11, 12, 1], peak: [11, 12],
        note: 'Örtüaltı üretim yıl boyu sürer; kesim yoğunluğu sonbahar–kış aylarındadır.'
    },
    {
        name: 'Avokado', emoji: '🥑', category: 'Sebze & Sera', keyword: 'avokado',
        districts: ['Samandağ', 'Arsuz', 'Dörtyol', 'Erzin'],
        months: [10, 11, 12, 1], peak: [11, 12],
        note: 'Hass çeşidi hızla yaygınlaşıyor. E-ticaret satıcıları için yüksek katma değerli üründür.'
    },
    {
        name: 'Karpuz & Kavun', emoji: '🍉', category: 'Sebze & Sera', keyword: 'karpuz',
        districts: ['Erzin', 'Dörtyol', 'Payas', 'Kumlu'],
        months: [6, 7, 8], peak: [7],
        note: 'Erzin karpuzu tır bazlı toptan alımda yaz aylarının ana ürünüdür.'
    },
    {
        name: 'Buğday & Arpa', emoji: '🌾', category: 'Bakliyat & Hububat', keyword: 'buğday',
        districts: ['Reyhanlı', 'Kırıkhan', 'Kumlu', 'Hassa', 'Antakya'],
        months: [6, 7], peak: [6],
        note: 'Amik Ovası hasadı Haziran’da başlar. Un ve yem fabrikaları için ton bazlı alım dönemi.'
    },
    {
        name: 'Dane Mısır (2. Ürün)', emoji: '🌽', category: 'Bakliyat & Hububat', keyword: 'mısır',
        districts: ['Reyhanlı', 'Kumlu', 'Kırıkhan', 'Antakya'],
        months: [9, 10], peak: [9],
        note: 'Buğday sonrası ikinci ürün olarak ekilir; yem sanayii için sonbaharda tedarik edilir.'
    },
    {
        name: 'Pamuk (Kütlü)', emoji: '🧵', category: 'Bakliyat & Hububat', keyword: 'pamuk',
        districts: ['Reyhanlı', 'Kırıkhan', 'Kumlu'],
        months: [9, 10], peak: [9],
        note: 'Amik Ovası kütlü pamuğu çırçır tesisleri için Eylül–Ekim döneminde toplanır.'
    },
    {
        name: 'Kuru Soğan & Sarımsak', emoji: '🧅', category: 'Bakliyat & Hububat', keyword: 'soğan',
        districts: ['Kumlu', 'Reyhanlı', 'Antakya', 'Kırıkhan'],
        months: [6, 7, 8], peak: [7],
        note: 'Depolanabilir ürün; yaz hasadı sonrası kış boyunca toptan tedarik edilebilir.'
    },
    {
        name: 'Defne Yaprağı', emoji: '🌿', category: 'Ev Yapımı Ürünler', keyword: 'defne',
        districts: ['Belen', 'Yayladağı', 'Antakya', 'Samandağ', 'Altınözü'],
        months: [6, 7, 8, 9], peak: [7, 8],
        note: 'Türkiye ihracatının önemli bölümü bu bölgeden çıkar; ihracatçılar için kritik sezon.'
    },
    {
        name: 'Kekik, Adaçayı & Kuru Bitki', emoji: '🌱', category: 'Ev Yapımı Ürünler', keyword: 'kekik',
        districts: ['Yayladağı', 'Altınözü', 'Belen', 'Hassa'],
        months: [5, 6, 7], peak: [6],
        note: 'Çiçeklenme döneminde toplanır. Aktar ve baharat firmaları için ideal alım dönemi.'
    },
    {
        name: 'Süzme Bal & Arı Ürünleri', emoji: '🍯', category: 'Ev Yapımı Ürünler', keyword: 'bal',
        districts: ['Belen', 'Yayladağı', 'Hassa', 'Altınözü', 'Kırıkhan'],
        months: [5, 6, 7, 8, 9], peak: [6, 7],
        note: 'Narenciye balı ilkbaharda, yayla/çiçek balı yaz sonunda süzülür.'
    },
    {
        name: 'Süt, Sürk & Tuzlu Yoğurt', emoji: '🐄', category: 'Canlı Hayvan & Süt', keyword: 'süt',
        districts: ['Antakya', 'Altınözü', 'Kırıkhan', 'Reyhanlı', 'Yayladağı', 'Kumlu'],
        months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], peak: [3, 4, 5],
        note: 'Yıl boyu tedarik edilebilir; süt verimi ilkbaharda zirve yapar (Sürk/çökelek üretimi).'
    },
    {
        name: 'Narenciye Fidanı & Sebze Fidesi', emoji: '🌱', category: 'Fide & Tohum', keyword: 'fide',
        districts: ['Dörtyol', 'Erzin', 'Samandağ', 'Antakya', 'Arsuz'],
        months: [1, 2, 3, 8, 9, 10], peak: [2, 9],
        note: 'Dikim öncesi dönemlerde talep artar. Sera üreticileri için Ağustos–Eylül fide dönemidir.'
    }
];

window.harvestSelectedMonth = new Date().getMonth() + 1;
window.harvestSelectedDistrict = '';
window.harvestSearchTerm = '';

window.initHarvestCalendar = function () {
    const monthsBox = document.getElementById('harvest-months');
    if (!monthsBox) return;

    // Ay çipleri
    monthsBox.innerHTML = '';
    const allChip = document.createElement('button');
    allChip.type = 'button';
    allChip.dataset.month = '0';
    allChip.innerText = 'Tüm Yıl';
    allChip.onclick = () => window.setHarvestMonth(0);
    monthsBox.appendChild(allChip);

    window.TR_MONTHS.forEach((m, idx) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.dataset.month = String(idx + 1);
        chip.innerText = m;
        chip.onclick = () => window.setHarvestMonth(idx + 1);
        monthsBox.appendChild(chip);
    });

    // İlçe seçimi
    const distSel = document.getElementById('harvest-district');
    if (distSel && distSel.options.length <= 1) {
        window.HATAY_DISTRICT_LIST.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.innerText = d;
            distSel.appendChild(opt);
        });
    }

    window.renderHarvestCalendar();
};

window.setHarvestMonth = function (month) {
    window.harvestSelectedMonth = Number(month) || 0;
    window.renderHarvestCalendar();
};

window.onHarvestFilterChange = function () {
    const distSel = document.getElementById('harvest-district');
    const searchEl = document.getElementById('harvest-search');
    window.harvestSelectedDistrict = distSel ? distSel.value : '';
    window.harvestSearchTerm = searchEl ? searchEl.value.toLocaleLowerCase('tr-TR') : '';
    window.renderHarvestCalendar();
};

window.resetHarvestFilters = function () {
    window.harvestSelectedMonth = new Date().getMonth() + 1;
    window.harvestSelectedDistrict = '';
    window.harvestSearchTerm = '';
    const distSel = document.getElementById('harvest-district');
    const searchEl = document.getElementById('harvest-search');
    if (distSel) distSel.value = '';
    if (searchEl) searchEl.value = '';
    window.renderHarvestCalendar();
};

window.renderHarvestCalendar = function () {
    const list = document.getElementById('harvest-list');
    const summary = document.getElementById('harvest-summary');
    const monthsBox = document.getElementById('harvest-months');
    if (!list) return;

    // Ay çiplerinin aktif görünümü
    if (monthsBox) {
        Array.from(monthsBox.children).forEach(btn => {
            const isActive = Number(btn.dataset.month) === window.harvestSelectedMonth;
            btn.className = isActive
                ? 'bg-lux-dark text-lux-gold font-bold text-[11px] px-2.5 py-1.5 rounded-lg border border-lux-gold shadow-sm whitespace-nowrap transition'
                : 'bg-lux-bg hover:bg-lux-sage/30 text-lux-dark font-medium text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-200 whitespace-nowrap transition';
        });
    }

    const month = window.harvestSelectedMonth;
    const district = window.harvestSelectedDistrict;
    const term = window.harvestSearchTerm;

    let data = window.HATAY_HARVEST_DATA.filter(p => {
        const matchesDistrict = !district || p.districts.includes(district);
        const haystack = `${p.name} ${p.category} ${p.keyword} ${p.districts.join(' ')}`.toLocaleLowerCase('tr-TR');
        const matchesTerm = !term || haystack.includes(term);
        const matchesMonth = !month || p.months.includes(month);
        return matchesDistrict && matchesTerm && matchesMonth;
    });

    // Seçili ayda zirve yapanlar üstte
    if (month) {
        data = data.sort((a, b) => (b.peak.includes(month) ? 1 : 0) - (a.peak.includes(month) ? 1 : 0));
    } else {
        data = data.sort((a, b) => a.months[0] - b.months[0]);
    }

    // Özet bandı
    if (summary) {
        const monthLabel = month ? `${window.TR_MONTHS[month - 1]} ayında` : 'Yıl boyunca';
        const nextMonth = month ? (month === 12 ? 1 : month + 1) : 0;
        const upcoming = nextMonth
            ? window.HATAY_HARVEST_DATA.filter(p =>
                p.months.includes(nextMonth) && !p.months.includes(month) &&
                (!district || p.districts.includes(district)))
            : [];

        summary.innerHTML = `
            <div class="flex flex-wrap items-center gap-2 justify-between">
                <p class="text-xs text-lux-dark font-semibold">
                    <i class="fa-solid fa-tractor text-lux-gold mr-1"></i>
                    ${district ? escapeHtml(district) + ' ilçesinde ' : 'Hatay genelinde '}${monthLabel}
                    <b class="text-lux-olive">${data.length} ürün</b> hasat / tedarik sezonunda.
                </p>
                ${upcoming.length ? `<p class="text-[11px] text-gray-500"><i class="fa-solid fa-forward text-lux-olive mr-1"></i><b>${window.TR_MONTHS[nextMonth - 1]}</b> ayında başlayacaklar: ${upcoming.slice(0, 4).map(u => escapeHtml(u.name)).join(', ')}${upcoming.length > 4 ? ' …' : ''}</p>` : ''}
            </div>
        `;
    }

    list.innerHTML = '';

    if (data.length === 0) {
        list.innerHTML = `<div class="text-center py-10 text-xs text-gray-400 bg-lux-bg/30 rounded-xl border border-dashed border-gray-300">
            Bu ay / ilçe / arama kriterinde hasat kaydı bulunamadı. "Tüm Yıl" seçeneğini deneyin.
        </div>`;
        return;
    }

    data.forEach(p => {
        const isPeakNow = month && p.peak.includes(month);
        const alertOn = (typeof window.isHarvestAlertOn === 'function') && window.isHarvestAlertOn(p.name);
        const listingCount = (window.listings || []).filter(l =>
            l.category === p.category &&
            (`${l.title} ${l.desc || ''}`.toLocaleLowerCase('tr-TR').includes(p.keyword.toLocaleLowerCase('tr-TR')))
        ).length;

        const row = document.createElement('div');
        row.className = `bg-white border ${isPeakNow ? 'border-lux-gold shadow-sm' : 'border-gray-200'} rounded-xl p-3.5 hover:border-lux-olive transition`;

        let monthBar = '<div class="grid grid-cols-12 gap-[2px] mt-2.5">';
        for (let m = 1; m <= 12; m++) {
            const isActive = p.months.includes(m);
            const isPeak = p.peak.includes(m);
            const isSelected = month === m;
            let cellClass = 'bg-gray-100 text-gray-400';
            if (isActive) cellClass = isPeak ? 'bg-lux-gold text-lux-dark font-extrabold' : 'bg-lux-sage/60 text-lux-dark font-semibold';
            monthBar += `<div title="${window.TR_MONTHS[m - 1]}${isPeak ? ' (Rekolte zirvesi)' : (isActive ? ' (Hasat var)' : ' (Sezon dışı)')}"
                class="text-center text-[8px] leading-none py-1.5 rounded ${cellClass} ${isSelected ? 'ring-2 ring-lux-dark' : ''}">
                ${window.TR_MONTHS_SHORT[m - 1]}
            </div>`;
        }
        monthBar += '</div>';

        row.innerHTML = `
            <div class="flex justify-between items-start gap-3 flex-wrap">
                <div class="min-w-0">
                    <span class="font-bold text-lux-dark text-xs">
                        ${p.emoji} ${escapeHtml(p.name)}
                        ${isPeakNow ? '<span class="bg-lux-gold text-lux-dark text-[8px] font-extrabold px-1.5 py-0.5 rounded ml-1 align-middle">REKOLTE ZİRVESİ</span>' : ''}
                    </span>
                    <span class="block text-[10px] text-gray-500 mt-0.5">
                        <i class="fa-solid fa-location-dot text-lux-gold"></i> ${p.districts.map(d => escapeHtml(d)).join(' · ')}
                    </span>
                    <span class="inline-block text-[9px] bg-lux-bg text-lux-dark font-semibold px-1.5 py-0.5 rounded mt-1 border border-gray-200">
                        ${categoryEmojis[p.category] || '📦'} ${escapeHtml(p.category)}
                    </span>
                    ${listingCount > 0 ? `<span class="inline-block text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded mt-1 border border-emerald-200 ml-1">Vitrinde ${listingCount} ilan</span>` : ''}
                </div>
                <div class="flex gap-1.5 shrink-0 flex-wrap justify-end">
                    <button onclick="window.toggleHarvestAlert('${window.jsAttr(p.name)}')" title="Bu ürün hasat sezonuna girince gelen kutunuzdan haber verelim"
                        class="${alertOn ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 border border-orange-300 hover:bg-orange-100'} text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                        <i class="fa-solid ${alertOn ? 'fa-bell' : 'fa-bell-slash'} mr-0.5"></i> ${alertOn ? window.t('hv.notifyOn', 'Bildirim Açık') : window.t('hv.notify', 'Bana Haber Ver')}
                    </button>
                    <button onclick="window.harvestSearchListings('${window.jsAttr(p.category)}', '${window.jsAttr(p.keyword)}')" class="bg-lux-dark hover:bg-lux-olive text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                        <i class="fa-solid fa-magnifying-glass mr-0.5"></i> ${window.t('hv.seeListings', 'İlanları Gör')}
                    </button>
                    <button onclick="window.harvestCreateRequest('${window.jsAttr(p.category)}', '${window.jsAttr(p.name)}')" class="bg-lux-gold hover:bg-[#ad9868] text-lux-dark text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                        <i class="fa-solid fa-cart-shopping mr-0.5"></i> ${window.t('hv.openRequest', 'Alım Talebi Aç')}
                    </button>
                </div>
            </div>
            ${monthBar}
            <p class="text-[10px] text-gray-500 mt-2 leading-relaxed"><i class="fa-solid fa-circle-info text-lux-sage mr-1"></i>${escapeHtml(p.note)}</p>
        `;
        list.appendChild(row);
    });
};

/* Takvimden vitrine köprü */
window.harvestSearchListings = function (category, keyword) {
    const catFilter = document.getElementById('category-filter');
    const searchInput = document.getElementById('search-input');
    const distFilter = document.getElementById('district-filter');

    if (catFilter) {
        const hasOption = Array.from(catFilter.options).some(o => o.value === category);
        catFilter.value = hasOption ? category : '';
    }
    if (searchInput) searchInput.value = keyword || '';
    if (distFilter && window.harvestSelectedDistrict) distFilter.value = window.harvestSelectedDistrict;

    window.filterListings();
    window.showToast(`🔎 "${keyword}" için vitrin ilanları listelendi.`, "success");
    const target = document.getElementById('filter-section');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/* Takvimden alım talebine köprü */
window.harvestCreateRequest = function (category, productName) {
    const districts = window.harvestSelectedDistrict ? [window.harvestSelectedDistrict] : ['Tüm Hatay'];
    const monthText = window.harvestSelectedMonth ? ` (${window.TR_MONTHS[window.harvestSelectedMonth - 1]} teslim)` : '';
    window.openBuyRequestForm({
        category: category,
        title: `${productName} alınacaktır${monthText}`,
        districts: districts
    });
};

/* =========================================================================================
   BAŞLATMA
   ========================================================================================= */

window.startBuyRequestsListener();
window.initHarvestCalendar();
window.renderBrDistrictChips();

/* Hesabım modalı açıldığında alım taleplerini de tazele */
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.initHarvestCalendar === 'function') window.initHarvestCalendar();
});

/* =========================================================================================
   ORONTES — MODÜL 3 / BÖLÜM A
   • Çok dilli altyapı (Türkçe / Arapça + RTL)
   • Açılır-kapanır (collapsible) bölüm altyapısı
   • İnteraktif ilçe haritası
   • Güvenli inline-handler yardımcıları
   ========================================================================================= */

window.I18N_AR = {
    "nav.login": "تسجيل الدخول",
    "nav.register": "إنشاء حساب",
    "nav.account": "حسابي",
    "nav.newListing": "أضف إعلاناً",
    "nav.filter": "تصفية",
    "nav.showcase": "إعلانات المعرض",
    "nav.buyRequests": "طلبات الشراء (ماذا تبحث؟)",
    "nav.harvest": "روزنامة الحصاد والمواسم",
    "nav.groupBuy": "الشراء الجماعي",

    "hero.title": "سوق هاتاي المحلي وشبكة الخدمات",
    "hero.sub": "من المنتج والحرفي والصنايعي المحلي مباشرة إلى المشتري؛ سوق رقمي بدون عمولة.",

    "filter.searchPh": "ابحث عن منتج، زيت زيتون، حرفة يدوية، دهّان، نقل...",
    "filter.allCategories": "كل الفئات",
    "filter.allDistricts": "كل هاتاي (الأقضية)",
    "filter.newest": "الأحدث",
    "filter.oldest": "الأقدم",
    "filter.priceLow": "السعر: تصاعدي",
    "filter.priceHigh": "السعر: تنازلي",
    "filter.priceLabel": "السعر (ليرة):",
    "filter.minPh": "الأدنى",
    "filter.maxPh": "الأعلى",
    "filter.nearby": "الإعلانات القريبة مني",
    "filter.reset": "إعادة ضبط الفلاتر",
    "filter.districtMap": "🗺️ اختر القضاء من الخريطة",

    "list.title": "إعلانات المعرض",
    "list.found": "إعلان/خدمة",
    "list.empty": "لا توجد نتائج مطابقة لبحثك.",
    "card.review": "عرض التفاصيل",
    "card.getOffer": "اطلب عرض سعر",

    "detail.desc": "الوصف",
    "detail.location": "الموقع",
    "detail.owner": "صاحب الإعلان",
    "detail.contact": "تواصل",
    "detail.share": "مشاركة",
    "detail.report": "إبلاغ",
    "detail.offerTitle": "أرسل عرض سعر / طلب تواصل",
    "detail.sendOffer": "إرسال الطلب",
    "detail.story": "قصة المنتِج",
    "detail.video": "شاهد فيديو المنتِج",
    "detail.qr": "رمز QR",
    "detail.shareCard": "بطاقة المشاركة ورمز QR",
    "detail.problem": "الإبلاغ عن مشكلة",

    "br.title": "طلبات الشراء — \"ماذا تبحث؟\"",
    "br.sub": "تجار الجملة وأصحاب المطاعم والفنادق والأسواق والمصدّرون يكتبون ما يبحثون عنه هنا؛ والمنتجون يرسلون عروضهم مباشرة.",
    "br.create": "أنشئ طلب شراء",
    "br.searchPh": "ابحث في طلبات الشراء: يوسفي، زيت زيتون، فلفل...",
    "br.detail": "التفاصيل",
    "br.giveOffer": "قدّم عرضاً",
    "br.empty": "لا توجد طلبات شراء بهذه المعايير.",
    "br.supplySend": "إرسال عرض التوريد",

    "hv.title": "روزنامة الحصاد والمواسم في هاتاي",
    "hv.thisMonth": "العودة لهذا الشهر",
    "hv.searchPh": "ابحث عن منتج: زيتون، يوسفي، غار، فلفل، عسل...",
    "hv.seeListings": "عرض الإعلانات",
    "hv.openRequest": "أنشئ طلب شراء",
    "hv.notify": "أعلمني",
    "hv.notifyOn": "التنبيه مفعّل",
    "hv.hide": "إخفاء",
    "hv.show": "إظهار",

    "gb.title": "الشراء الجماعي — \"لنشترِ معاً\"",
    "gb.sub": "عدة مشترين صغار يجتمعون على منتج واحد للوصول إلى سعر الجملة. حدّد الكمية وانضم.",
    "gb.create": "افتح شراءً جماعياً",
    "gb.join": "انضم",
    "gb.joined": "أنت مشارك",
    "gb.target": "الهدف",
    "gb.collected": "المجمّع",
    "gb.participants": "مشارك",
    "gb.reached": "تم بلوغ الهدف",
    "gb.empty": "لا توجد حملة شراء جماعي حالياً.",

    "rate.send": "أرسل التقييم",
    "rate.verified": "عملية موثّقة",
    "rate.asSeller": "تقييمه كبائع",
    "rate.asBuyer": "تقييمه كمشتري",
    "dispute.title": "الإبلاغ عن مشكلة / نزاع",
    "dispute.send": "إرسال البلاغ",

    "sub.title": "طلب دوري / اشتراك",
    "sub.send": "أرسل طلب الاشتراك",

    "acc.myListings": "إعلاناتي",
    "acc.favorites": "المفضلة",
    "acc.myRequests": "طلبات الشراء الخاصة بي",

    "faq.title": "الأسئلة الشائعة",
    "support.title": "الدعم والتواصل",
    "legal.btn": "إخلاء المسؤولية القانونية",

    "form.storyLabel": "🌿 قصة المنتِج (اختياري)",
    "form.storyPh": "من أين يأتي هذا المنتج؟ كيف يُنتج؟ اكتب قصتك القصيرة...",
    "form.videoLabel": "🎥 رابط فيديو قصير (YouTube / Instagram)",
    "form.videoPh": "https://youtube.com/... أو رابط Instagram"
};

try { window.currentLang = localStorage.getItem('orontes_lang') || 'tr'; } catch (e) { window.currentLang = 'tr'; }

/* Türkçe metin daima fallback'tir; TR modunda çıktı birebir aynı kalır. */
window.t = function (key, trText) {
    if (window.currentLang !== 'ar') return trText !== undefined ? trText : key;
    return window.I18N_AR[key] || (trText !== undefined ? trText : key);
};

window.applyLanguage = function (lang) {
    window.currentLang = (lang === 'ar') ? 'ar' : 'tr';
    try { localStorage.setItem('orontes_lang', window.currentLang); } catch (e) {}

    const isAr = window.currentLang === 'ar';
    document.documentElement.lang = isAr ? 'ar' : 'tr';
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.body.classList.toggle('orontes-rtl', isAr);

    document.querySelectorAll('[data-i18n]').forEach(el => {
        if (!el.dataset.trText) el.dataset.trText = el.textContent;
        const key = el.getAttribute('data-i18n');
        el.textContent = isAr ? (window.I18N_AR[key] || el.dataset.trText) : el.dataset.trText;
    });

    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        if (!el.dataset.trPh) el.dataset.trPh = el.getAttribute('placeholder') || '';
        const key = el.getAttribute('data-i18n-ph');
        el.setAttribute('placeholder', isAr ? (window.I18N_AR[key] || el.dataset.trPh) : el.dataset.trPh);
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        if (!el.dataset.trTitle) el.dataset.trTitle = el.getAttribute('title') || '';
        const key = el.getAttribute('data-i18n-title');
        el.setAttribute('title', isAr ? (window.I18N_AR[key] || el.dataset.trTitle) : el.dataset.trTitle);
    });

    const trBtn = document.getElementById('lang-btn-tr');
    const arBtn = document.getElementById('lang-btn-ar');
    if (trBtn && arBtn) {
        trBtn.className = !isAr
            ? "px-2 py-1 rounded-lg text-[11px] font-bold bg-lux-gold text-lux-dark transition"
            : "px-2 py-1 rounded-lg text-[11px] font-semibold text-lux-sage hover:text-white transition";
        arBtn.className = isAr
            ? "px-2 py-1 rounded-lg text-[11px] font-bold bg-lux-gold text-lux-dark transition"
            : "px-2 py-1 rounded-lg text-[11px] font-semibold text-lux-sage hover:text-white transition";
    }

    try {
        if (typeof window.renderListings === 'function') window.renderListings();
        if (typeof window.renderBuyRequests === 'function') window.renderBuyRequests();
        if (typeof window.renderHarvestCalendar === 'function') window.renderHarvestCalendar();
        if (typeof window.renderGroupBuys === 'function') window.renderGroupBuys();
    } catch (e) { console.warn('Dil değişiminde yeniden çizim hatası:', e); }
};

window.setLanguage = function (lang) {
    window.applyLanguage(lang);
    window.showToast(lang === 'ar' ? "تم تغيير اللغة إلى العربية." : "Site dili Türkçe olarak ayarlandı.", "success");
};

/* ------------------------------- AÇILIR / KAPANIR BÖLÜMLER ------------------------------- */

window.toggleCollapse = function (bodyId, btnId, storageKey) {
    const body = document.getElementById(bodyId);
    const btn = document.getElementById(btnId);
    if (!body) return;

    const willHide = !body.classList.contains('hidden');
    body.classList.toggle('hidden', willHide);

    if (btn) {
        const icon = btn.querySelector('i');
        const label = btn.querySelector('span');
        if (icon) icon.className = willHide ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
        if (label) label.innerText = willHide ? window.t('hv.show', 'Göster') : window.t('hv.hide', 'Gizle');
    }

    if (storageKey) {
        try { localStorage.setItem(storageKey, willHide ? 'closed' : 'open'); } catch (e) {}
    }

    if (!willHide) {
        setTimeout(() => {
            if (window.districtMapInstance) window.districtMapInstance.invalidateSize();
        }, 220);
    }
};

window.restoreCollapseState = function (bodyId, btnId, storageKey, defaultOpen) {
    const body = document.getElementById(bodyId);
    const btn = document.getElementById(btnId);
    if (!body) return;

    let state = null;
    try { state = localStorage.getItem(storageKey); } catch (e) {}
    const shouldOpen = state ? (state === 'open') : !!defaultOpen;

    body.classList.toggle('hidden', !shouldOpen);
    if (btn) {
        const icon = btn.querySelector('i');
        const label = btn.querySelector('span');
        if (icon) icon.className = shouldOpen ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
        if (label) label.innerText = shouldOpen ? window.t('hv.hide', 'Gizle') : window.t('hv.show', 'Göster');
    }
};

/* ------------------------------- İNTERAKTİF İLÇE HARİTASI ------------------------------- */

window.districtMapInstance = null;

window.toggleDistrictMap = function () {
    const panel = document.getElementById('district-map-panel');
    if (!panel) return;
    const willOpen = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !willOpen);

    const btn = document.getElementById('district-map-btn');
    if (btn) {
        btn.className = willOpen
            ? "bg-lux-dark text-white px-3 py-2 rounded-xl transition text-xs font-semibold whitespace-nowrap"
            : "bg-lux-bg hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-xl transition text-xs font-semibold whitespace-nowrap";
    }

    if (willOpen) setTimeout(() => window.renderDistrictMap(), 150);
};

window.renderDistrictMap = function () {
    const el = document.getElementById('district-map');
    if (!el || typeof L === 'undefined') return;

    if (window.districtMapInstance) {
        window.districtMapInstance.remove();
        window.districtMapInstance = null;
    }

    window.districtMapInstance = L.map('district-map', { scrollWheelZoom: false }).setView([36.35, 36.2], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap'
    }).addTo(window.districtMapInstance);

    const activeDistrict = (document.getElementById('district-filter') || {}).value || '';

    Object.keys(districtCoords).forEach(district => {
        const coords = districtCoords[district];
        const count = (window.listings || []).filter(l => l.district === district).length;
        const brCount = (window.buyRequests || []).filter(r => {
            const ds = Array.isArray(r.districts) ? r.districts : [];
            return (r.status || 'Açık') === 'Açık' && (ds.includes(district) || ds.includes('Tüm Hatay') || ds.length === 0);
        }).length;

        const isActive = activeDistrict === district;
        const radius = 11 + Math.min(count, 12) * 1.6;

        const marker = L.circleMarker(coords, {
            radius: radius,
            color: isActive ? '#07332c' : '#485b46',
            weight: isActive ? 3 : 1.5,
            fillColor: count > 0 ? '#bca879' : '#afb7ac',
            fillOpacity: count > 0 ? 0.85 : 0.45
        }).addTo(window.districtMapInstance);

        marker.bindTooltip(`${district} · ${count} ilan`, { direction: 'top', offset: [0, -4] });
        marker.bindPopup(`
            <div style="text-align:center; min-width:150px;">
                <b style="font-size:13px; color:#07332c;">${escapeHtml(district)}</b><br>
                <span style="font-size:11px; color:#485b46;">${count} vitrin ilanı</span><br>
                <span style="font-size:11px; color:#8a6d3b;">${brCount} açık alım talebi</span><br>
                <button onclick="window.selectDistrictFromMap('${escapeHtml(district)}')" style="margin-top:7px; padding:5px 10px; background:#07332c; color:#bca879; border:none; border-radius:6px; cursor:pointer; font-size:11px; font-weight:bold; width:100%;">
                    Bu ilçenin ilanlarını gör
                </button>
            </div>
        `);

        marker.on('click', () => marker.openPopup());
    });

    setTimeout(() => {
        if (window.districtMapInstance) window.districtMapInstance.invalidateSize();
    }, 250);
};

window.selectDistrictFromMap = function (district) {
    const distFilter = document.getElementById('district-filter');
    if (distFilter) distFilter.value = district;
    window.filterListings();
    window.showToast(`📍 ${district} ilçesinin ilanları listelendi.`, "success");
    const grid = document.getElementById('listings-grid');
    if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.districtMapInstance) window.renderDistrictMap();
};

/* ------------------------------- TEKLİF TÜRÜ ROZETİ ------------------------------- */

window.getOfferKindBadge = function (offerKind, isIncoming) {
    if (offerKind === 'supply') {
        return isIncoming
            ? '<span class="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded"><i class="fa-solid fa-cart-shopping mr-0.5"></i> ALIM TALEBİME TEDARİK TEKLİFİ</span>'
            : '<span class="text-[10px] bg-lux-olive text-white px-1.5 py-0.5 rounded"><i class="fa-solid fa-truck-field mr-0.5"></i> GÖNDERDİĞİM TEDARİK TEKLİFİ</span>';
    }
    if (offerKind === 'subscription') {
        return isIncoming
            ? '<span class="text-[10px] bg-indigo-200 text-indigo-900 px-1.5 py-0.5 rounded"><i class="fa-solid fa-rotate mr-0.5"></i> DÜZENLİ SİPARİŞ TALEBİ</span>'
            : '<span class="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded"><i class="fa-solid fa-rotate mr-0.5"></i> GÖNDERDİĞİM ABONELİK TALEBİ</span>';
    }
    if (offerKind === 'group') {
        return isIncoming
            ? '<span class="text-[10px] bg-lux-gold text-lux-dark px-1.5 py-0.5 rounded"><i class="fa-solid fa-people-group mr-0.5"></i> TOPLU ALIMIMA TEKLİF</span>'
            : '<span class="text-[10px] bg-lux-olive text-white px-1.5 py-0.5 rounded"><i class="fa-solid fa-people-group mr-0.5"></i> TOPLU ALIMA TEKLİFİM</span>';
    }
    return isIncoming
        ? '<span class="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">GELEN TALEP</span>'
        : '<span class="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">GÖNDERDİĞİM TALEP</span>';
};

/* =========================================================================================
   ORONTES — MODÜL 3 / BÖLÜM B
   • İşlem sonrası ÇİFT TARAFLI puanlama (alıcı ⇄ satıcı, doğrulanmış işlem rozeti)
   • Anlaşmazlık / "Sorun Bildir" akışı
   • Otomatik paylaşım kartı görseli + yazdırılabilir QR afişi
   • Derin bağlantı (ilan/talep/kampanya linki)
   • Üretici hikayesi & kısa video
   ========================================================================================= */

window.BUYER_REVIEW_BADGES = ["Hızlı Ödeme", "Net İletişim", "Sözünde Durdu", "Sorunsuz Teslim Aldı", "Tekrar Çalışılır", "Dürüst Alıcı"];

window.activeRatingTarget = null;
window.ratingSelectedScore = 0;
window.ratingSelectedBadges = new Set();

window.openRatingModal = function (targetUid, targetName, role, dealId) {
    if (!window.currentUser) {
        window.showToast("Değerlendirme için giriş yapmalısınız.", "warning");
        window.openAuthModal('login');
        return;
    }
    if (targetUid === window.currentUser.uid) {
        window.showToast("Kendinizi değerlendiremezsiniz.", "error");
        return;
    }

    window.activeRatingTarget = { uid: targetUid, name: targetName, role: role || 'seller', dealId: dealId || null };
    const isSellerTarget = (role || 'seller') !== 'buyer';

    document.getElementById('rating-modal-title').innerText = isSellerTarget
        ? window.t('rate.asSeller', 'Satıcıyı Değerlendir')
        : window.t('rate.asBuyer', 'Alıcıyı Değerlendir');
    document.getElementById('rating-target-name').innerText = targetName || 'Kullanıcı';
    document.getElementById('rating-deal-note').classList.toggle('hidden', !dealId);

    const commentEl = document.getElementById('rating-comment');
    if (commentEl) commentEl.value = '';

    window.ratingSelectedScore = 0;
    window.ratingSelectedBadges = new Set();

    get(ref(db, `ratings/${targetUid}/${window.currentUser.uid}`)).then(snap => {
        if (snap.exists()) {
            const prev = snap.val();
            window.ratingSelectedScore = prev.score || 0;
            window.ratingSelectedBadges = new Set(prev.badges || []);
            if (commentEl) commentEl.value = prev.comment || '';
            window.renderRatingStars();
            window.renderRatingBadges(isSellerTarget);
        }
    }).catch(() => {});

    window.renderRatingStars();
    window.renderRatingBadges(isSellerTarget);
    document.getElementById('rating-modal').classList.remove('hidden');
};

window.closeRatingModal = function () {
    document.getElementById('rating-modal').classList.add('hidden');
    window.activeRatingTarget = null;
};

window.renderRatingStars = function () {
    const box = document.getElementById('rating-stars');
    if (!box) return;
    box.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.innerText = i <= window.ratingSelectedScore ? '★' : '☆';
        star.style.color = i <= window.ratingSelectedScore ? '#bca879' : '#c7c7c7';
        star.style.cursor = 'pointer';
        star.style.fontSize = '30px';
        star.style.lineHeight = '1';
        star.onclick = () => { window.ratingSelectedScore = i; window.renderRatingStars(); };
        box.appendChild(star);
    }
};

window.renderRatingBadges = function (isSellerTarget) {
    const box = document.getElementById('rating-badges');
    if (!box) return;
    box.innerHTML = '';
    const list = isSellerTarget ? window.AVAILABLE_REVIEW_BADGES : window.BUYER_REVIEW_BADGES;

    list.forEach(badge => {
        const el = document.createElement('span');
        el.innerText = badge;
        const selected = window.ratingSelectedBadges.has(badge);
        el.className = `cursor-pointer text-[10px] px-2 py-1 rounded-full border transition-all ${selected ? 'bg-lux-dark text-lux-gold border-lux-gold font-bold' : 'bg-lux-bg hover:bg-gray-200 text-lux-dark border-lux-olive font-medium'}`;
        el.onclick = () => {
            if (window.ratingSelectedBadges.has(badge)) window.ratingSelectedBadges.delete(badge);
            else window.ratingSelectedBadges.add(badge);
            window.renderRatingBadges(isSellerTarget);
        };
        box.appendChild(el);
    });
};

window.submitTwoWayRating = async function () {
    if (!window.currentUser || !window.activeRatingTarget) return;
    if (!window.ratingSelectedScore) {
        window.showToast("Lütfen önce bir yıldız seçin.", "warning");
        return;
    }

    const btn = document.getElementById('rating-submit-btn');
    if (btn) { btn.disabled = true; btn.innerText = "Gönderiliyor..."; }

    const target = window.activeRatingTarget;
    try {
        await update(ref(db, `ratings/${target.uid}/${window.currentUser.uid}`), {
            score: window.ratingSelectedScore,
            badges: Array.from(window.ratingSelectedBadges),
            comment: (document.getElementById('rating-comment').value || '').trim() || null,
            role: target.role,
            dealId: target.dealId || null,
            verified: !!target.dealId,
            raterName: window.userExtraData.username || window.currentUser.displayName || 'Kullanıcı',
            date: Date.now()
        });

        if (target.dealId) {
            const flagField = target.role === 'buyer' ? 'sellerRated' : 'buyerRated';
            try { await update(ref(db, `offers/${target.dealId}`), { [flagField]: true }); } catch (e) {}
        }

        window.showToast("⭐ Değerlendirmeniz kaydedildi. Teşekkürler!", "success");
        window.closeRatingModal();

        const offersTab = document.getElementById('tab-content-offers');
        if (offersTab && !offersTab.classList.contains('hidden') && typeof window.loadIncomingOffers === 'function') {
            window.loadIncomingOffers();
        }
        if (window.activeSellerUid === target.uid && typeof window.loadSellerProfileBox === 'function') {
            window.loadSellerProfileBox(target.uid);
        }
    } catch (err) {
        window.showToast("Değerlendirme kaydedilemedi: " + err.message, "error");
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = window.t('rate.send', 'Değerlendirmeyi Gönder'); }
    }
};

/* Satıcı profilinde rol bazlı (satıcı/alıcı) puan dökümü ve yorumlar */
window.renderSellerRoleStats = async function (uid) {
    const box = document.getElementById('seller-profile-roles');
    if (!box) return;
    box.innerHTML = '';

    try {
        const snap = await get(ref(db, 'ratings/' + uid));
        const data = snap.val() || {};
        const all = Object.values(data);
        if (all.length === 0) return;

        const sellerR = all.filter(r => (r.role || 'seller') !== 'buyer' && typeof r.score === 'number');
        const buyerR = all.filter(r => r.role === 'buyer' && typeof r.score === 'number');
        const verified = all.filter(r => r.verified).length;

        const avg = arr => arr.length ? (arr.reduce((a, b) => a + b.score, 0) / arr.length).toFixed(1) : null;
        const sAvg = avg(sellerR);
        const bAvg = avg(buyerR);

        let html = '<div class="flex flex-wrap gap-2 mt-2">';
        if (sAvg) html += `<span class="bg-lux-olive/40 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-lux-gold/30">🛒 ${window.t('rate.asSeller', 'Satıcı puanı')}: ★ ${sAvg} (${sellerR.length})</span>`;
        if (bAvg) html += `<span class="bg-lux-olive/40 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-lux-gold/30">👤 ${window.t('rate.asBuyer', 'Alıcı puanı')}: ★ ${bAvg} (${buyerR.length})</span>`;
        if (verified > 0) html += `<span class="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">✅ ${verified} ${window.t('rate.verified', 'doğrulanmış işlem')}</span>`;
        html += '</div>';

        const comments = all.filter(r => r.comment).sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 4);
        if (comments.length) {
            html += '<div class="mt-3 space-y-1.5">';
            comments.forEach(c => {
                html += `<div class="bg-lux-olive/25 rounded-lg p-2 border border-lux-gold/20">
                    <span class="text-[10px] text-lux-gold font-bold">${'★'.repeat(c.score || 0)}${c.verified ? ' <span class="text-emerald-400">✅</span>' : ''} ${escapeHtml(c.raterName || 'Kullanıcı')}</span>
                    <p class="text-[11px] text-white/90 leading-snug mt-0.5">${escapeHtml(c.comment)}</p>
                </div>`;
            });
            html += '</div>';
        }

        box.innerHTML = html;
    } catch (err) { /* sessiz geç */ }
};

/* ------------------------- ANLAŞMAZLIK / SORUN BİLDİR ------------------------- */

window.activeDisputeContext = null;

window.openDisputeModal = function (dealId, counterpartyUid, counterpartyName, contextTitle) {
    if (!window.currentUser) {
        window.showToast("Sorun bildirmek için giriş yapmalısınız.", "warning");
        window.openAuthModal('login');
        return;
    }
    window.activeDisputeContext = {
        dealId: dealId || null,
        counterpartyUid: counterpartyUid || null,
        counterpartyName: counterpartyName || '',
        contextTitle: contextTitle || ''
    };
    document.getElementById('dispute-context').innerText = contextTitle
        ? `${contextTitle}${counterpartyName ? ' · ' + counterpartyName : ''}`
        : (counterpartyName || 'Genel bildirim');
    const form = document.getElementById('dispute-form');
    if (form) form.reset();
    document.getElementById('dispute-modal').classList.remove('hidden');
};

window.closeDisputeModal = function () {
    document.getElementById('dispute-modal').classList.add('hidden');
    window.activeDisputeContext = null;
};

window.handleDisputeSubmit = async function (e) {
    e.preventDefault();
    if (!window.currentUser || !window.activeDisputeContext) return;

    const btn = document.getElementById('dispute-submit-btn');
    btn.disabled = true;
    btn.innerText = "Gönderiliyor...";

    try {
        await push(ref(db, 'disputes'), {
            dealId: window.activeDisputeContext.dealId,
            counterpartyUid: window.activeDisputeContext.counterpartyUid,
            counterpartyName: window.activeDisputeContext.counterpartyName,
            contextTitle: window.activeDisputeContext.contextTitle,
            reporterUid: window.currentUser.uid,
            reporterName: window.userExtraData.username || window.currentUser.displayName || 'Kullanıcı',
            reporterEmail: window.currentUser.email,
            reporterPhone: window.userExtraData.phone || null,
            reason: document.getElementById('dispute-reason').value,
            desc: document.getElementById('dispute-desc').value,
            status: 'İnceleniyor',
            date: Date.now()
        });
        window.showToast("🛡️ Bildiriminiz ekibimize iletildi. En kısa sürede incelenecektir.", "success");
        window.closeDisputeModal();
    } catch (err) {
        window.showToast("Bildirim gönderilemedi: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerText = window.t('dispute.send', 'Bildirimi Gönder');
    }
};

/* ------------------------- DERİN BAĞLANTI ------------------------- */

window.getBaseUrl = function () {
    return window.location.origin + window.location.pathname;
};
window.getListingShareUrl = function (id) {
    return `${window.getBaseUrl()}?ilan=${encodeURIComponent(id)}`;
};
window.getBuyRequestShareUrl = function (id) {
    return `${window.getBaseUrl()}?talep=${encodeURIComponent(id)}`;
};
window.getGroupBuyShareUrl = function (id) {
    return `${window.getBaseUrl()}?birlikte=${encodeURIComponent(id)}`;
};

window.copyToClipboard = async function (text, successMsg) {
    try {
        await navigator.clipboard.writeText(text);
        window.showToast(successMsg || "Bağlantı kopyalandı!", "success");
    } catch (err) {
        const tmp = document.createElement('textarea');
        tmp.value = text;
        document.body.appendChild(tmp);
        tmp.select();
        try { document.execCommand('copy'); window.showToast(successMsg || "Bağlantı kopyalandı!", "success"); }
        catch (e) { window.showToast("Kopyalanamadı. Bağlantı: " + text, "warning"); }
        tmp.remove();
    }
};

window.handleDeepLink = async function () {
    const params = new URLSearchParams(window.location.search);
    const listingId = params.get('ilan');
    const requestId = params.get('talep');
    const groupId = params.get('birlikte');

    if (listingId) {
        let item = (window.listings || []).find(l => l.id === listingId);
        if (!item) {
            try {
                const snap = await get(ref(db, 'listings/' + listingId));
                if (snap.exists()) {
                    item = { id: listingId, ...snap.val() };
                    window.listings = [...(window.listings || []), item];
                }
            } catch (e) {}
        }
        if (item) window.openDetailModal(listingId);
        else window.showToast("Bağlantıdaki ilan bulunamadı veya kaldırılmış.", "warning");
        return;
    }

    if (requestId) {
        let rq = (window.buyRequests || []).find(r => r.id === requestId);
        if (!rq) {
            try {
                const snap = await get(ref(db, 'buyRequests/' + requestId));
                if (snap.exists()) {
                    rq = { id: requestId, ...snap.val() };
                    window.buyRequests = [...(window.buyRequests || []), rq];
                }
            } catch (e) {}
        }
        if (rq) window.openBuyRequestDetail(requestId);
        else window.showToast("Bağlantıdaki alım talebi bulunamadı.", "warning");
        return;
    }

    if (groupId) {
        let gb = (window.groupBuys || []).find(g => g.id === groupId);
        if (!gb) {
            try {
                const snap = await get(ref(db, 'groupBuys/' + groupId));
                if (snap.exists()) {
                    gb = { id: groupId, ...snap.val() };
                    window.groupBuys = [...(window.groupBuys || []), gb];
                }
            } catch (e) {}
        }
        if (gb) window.openGroupBuyDetail(groupId);
        else window.showToast("Bağlantıdaki toplu alım bulunamadı.", "warning");
    }
};

/* ------------------------- PAYLAŞIM KARTI & QR ------------------------- */

window.shareCardCanvas = null;
window.activeShareListingId = null;

window.loadImageForCanvas = function (src) {
    return new Promise((resolve) => {
        if (!src) { resolve(null); return; }
        const img = new Image();
        if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
};

window.wrapCanvasText = function (ctx, text, maxWidth, maxLines) {
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach(w => {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = w;
        } else {
            line = test;
        }
    });
    if (line) lines.push(line);
    if (maxLines && lines.length > maxLines) {
        const cut = lines.slice(0, maxLines);
        cut[maxLines - 1] = cut[maxLines - 1].replace(/\s+\S*$/, '') + '…';
        return cut;
    }
    return lines;
};

window.makeQrCanvas = function (text, size) {
    if (typeof QRCode === 'undefined') return null;
    try {
        const holder = document.createElement('div');
        holder.style.display = 'none';
        document.body.appendChild(holder);
        new QRCode(holder, {
            text: text,
            width: size,
            height: size,
            colorDark: '#07332c',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
        const canvas = holder.querySelector('canvas');
        let result = null;
        if (canvas) {
            result = document.createElement('canvas');
            result.width = size;
            result.height = size;
            result.getContext('2d').drawImage(canvas, 0, 0, size, size);
        }
        holder.remove();
        return result;
    } catch (err) {
        console.warn('QR üretilemedi:', err);
        return null;
    }
};

/* 1080x1350 sosyal medya / WhatsApp paylaşım kartı */
window.buildShareCard = async function (item) {
    const W = 1080, H = 1350;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#07332c';
    ctx.fillRect(0, 0, W, H);

    const imgH = 720;
    const img = await window.loadImageForCanvas(item.image);
    if (img) {
        const scale = Math.max(W / img.width, imgH / img.height);
        const dw = img.width * scale, dh = img.height * scale;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, imgH);
        ctx.clip();
        ctx.drawImage(img, (W - dw) / 2, (imgH - dh) / 2, dw, dh);
        ctx.restore();
    } else {
        const grd = ctx.createLinearGradient(0, 0, W, imgH);
        grd.addColorStop(0, '#485b46');
        grd.addColorStop(1, '#07332c');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, imgH);
        ctx.font = '160px serif';
        ctx.textAlign = 'center';
        ctx.fillText(categoryEmojis[item.category] || '📦', W / 2, imgH / 2 + 55);
        ctx.textAlign = 'left';
    }

    const fade = ctx.createLinearGradient(0, imgH - 240, 0, imgH);
    fade.addColorStop(0, 'rgba(7,51,44,0)');
    fade.addColorStop(1, 'rgba(7,51,44,0.95)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, imgH - 240, W, 240);

    ctx.fillStyle = '#bca879';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(56, 56, 330, 92, 22); else ctx.rect(56, 56, 330, 92);
    ctx.fill();
    ctx.fillStyle = '#07332c';
    ctx.font = '900 50px Inter, Segoe UI, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('ORONTES', 82, 104);
    ctx.textBaseline = 'alphabetic';

    let bx = 56;
    const by = 176;
    const drawTag = (text, bg, fg) => {
        ctx.font = '700 30px Inter, Segoe UI, system-ui, sans-serif';
        const w = ctx.measureText(text).width + 40;
        ctx.fillStyle = bg;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, w, 54, 14); else ctx.rect(bx, by, w, 54);
        ctx.fill();
        ctx.fillStyle = fg;
        ctx.textBaseline = 'middle';
        ctx.fillText(text, bx + 20, by + 28);
        ctx.textBaseline = 'alphabetic';
        bx += w + 14;
    };
    const vipActive = item.isVip && (!item.vipExpireDate || Date.now() < item.vipExpireDate);
    if (vipActive) drawTag('VIP', '#bca879', '#07332c');
    if (item.isUrgent) drawTag('ACİL', '#dc2626', '#ffffff');
    if (item.businessType === 'Toptancı') drawTag('TOPTANCI', '#485b46', '#ffffff');
    if (item.harvestDate) drawTag('ÖN SİPARİŞ', '#f97316', '#ffffff');

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 62px Inter, Segoe UI, system-ui, sans-serif';
    const titleLines = window.wrapCanvasText(ctx, item.title, W - 300, 2);
    let ty = 830;
    titleLines.forEach(l => { ctx.fillText(l, 60, ty); ty += 76; });

    ctx.fillStyle = '#afb7ac';
    ctx.font = '400 36px Inter, Segoe UI, system-ui, sans-serif';
    const loc = (item.outsideHatay ? '' : 'Hatay / ') + (window.getListingLocationText(item) || '');
    ctx.fillText('📍 ' + loc, 60, ty + 8);
    ctx.fillText('👤 ' + String(item.seller || ''), 60, ty + 62);

    ctx.fillStyle = '#bca879';
    ctx.font = '900 96px Inter, Segoe UI, system-ui, sans-serif';
    const priceText = `${item.price} TL`;
    ctx.fillText(priceText, 60, 1180);
    if (item.unit) {
        const priceW = ctx.measureText(priceText).width;
        ctx.fillStyle = '#afb7ac';
        ctx.font = '500 38px Inter, Segoe UI, system-ui, sans-serif';
        ctx.fillText('/ ' + item.unit, 76 + priceW, 1180);
    }

    const qr = window.makeQrCanvas(window.getListingShareUrl(item.id), 200);
    if (qr) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(806, 1046, 224, 224, 18); else ctx.rect(806, 1046, 224, 224);
        ctx.fill();
        ctx.drawImage(qr, 818, 1058, 200, 200);
    }

    ctx.fillStyle = 'rgba(72,91,70,0.55)';
    ctx.fillRect(0, 1274, W, 76);
    ctx.fillStyle = '#afb7ac';
    ctx.font = '600 30px Inter, Segoe UI, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('ORONTES · Hatay Yerel Pazaryeri — komisyonsuz, doğrudan üreticiden', 60, 1312);
    ctx.textBaseline = 'alphabetic';

    return canvas;
};

/* Fiziksel tezgah / dükkan için yazdırılabilir QR afişi */
window.buildQrPoster = async function (item) {
    const W = 1080, H = 1440;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#07332c';
    ctx.fillRect(0, 0, W, 220);
    ctx.fillStyle = '#bca879';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(375, 62, 330, 96, 22); else ctx.rect(375, 62, 330, 96);
    ctx.fill();
    ctx.fillStyle = '#07332c';
    ctx.font = '900 52px Inter, Segoe UI, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ORONTES', 540, 112);

    ctx.fillStyle = '#07332c';
    ctx.font = '800 56px Inter, Segoe UI, system-ui, sans-serif';
    const lines = window.wrapCanvasText(ctx, item.title, W - 160, 2);
    let ty = 320;
    lines.forEach(l => { ctx.fillText(l, W / 2, ty); ty += 68; });

    ctx.fillStyle = '#485b46';
    ctx.font = '900 78px Inter, Segoe UI, system-ui, sans-serif';
    ctx.fillText(`${item.price} TL${item.unit ? ' / ' + item.unit : ''}`, W / 2, ty + 40);

    const qr = window.makeQrCanvas(window.getListingShareUrl(item.id), 560);
    if (qr) {
        ctx.strokeStyle = '#bca879';
        ctx.lineWidth = 8;
        ctx.strokeRect(256, ty + 110, 568, 568);
        ctx.drawImage(qr, 260, ty + 114, 560, 560);
    } else {
        ctx.fillStyle = '#888888';
        ctx.font = '400 34px Inter, sans-serif';
        ctx.fillText('QR oluşturulamadı', W / 2, ty + 380);
    }

    ctx.fillStyle = '#07332c';
    ctx.font = '700 44px Inter, Segoe UI, system-ui, sans-serif';
    ctx.fillText('Telefonunuzla okutun,', W / 2, ty + 760);
    ctx.fillText('ilanın tamamını görün 📱', W / 2, ty + 818);

    ctx.fillStyle = '#485b46';
    ctx.font = '400 32px Inter, Segoe UI, system-ui, sans-serif';
    ctx.fillText('📍 ' + ((item.outsideHatay ? '' : 'Hatay / ') + (window.getListingLocationText(item) || '')), W / 2, ty + 890);
    ctx.fillText('👤 ' + String(item.seller || ''), W / 2, ty + 940);

    ctx.fillStyle = '#07332c';
    ctx.fillRect(0, H - 90, W, 90);
    ctx.fillStyle = '#afb7ac';
    ctx.font = '600 28px Inter, Segoe UI, system-ui, sans-serif';
    ctx.fillText('ORONTES · Hatay Yerel Pazaryeri ve Hizmet Ağı', W / 2, H - 36);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    return canvas;
};

window.openShareCardModal = async function (listingId) {
    const id = listingId || window.activeListingId;
    const item = (window.listings || []).find(l => l.id === id);
    if (!item) { window.showToast("İlan bulunamadı.", "error"); return; }

    window.activeShareListingId = id;

    const modal = document.getElementById('share-card-modal');
    const cardBox = document.getElementById('share-card-preview');
    const qrBox = document.getElementById('share-qr-preview');
    const linkEl = document.getElementById('share-link-text');

    cardBox.innerHTML = `<div class="text-center py-10 text-xs text-gray-400"><i class="fa-solid fa-spinner fa-spin text-xl block mb-2"></i>Paylaşım kartı hazırlanıyor...</div>`;
    qrBox.innerHTML = '';
    if (linkEl) linkEl.value = window.getListingShareUrl(id);
    modal.classList.remove('hidden');

    try {
        const cardCanvas = await window.buildShareCard(item);
        cardBox.innerHTML = '';
        cardCanvas.className = 'w-full rounded-xl border border-gray-200 shadow-sm';
        cardBox.appendChild(cardCanvas);
        window.shareCardCanvas = cardCanvas;
    } catch (err) {
        console.warn('Paylaşım kartı hatası:', err);
        cardBox.innerHTML = `<div class="text-center py-8 text-xs text-red-500">Paylaşım kartı oluşturulamadı. Görsel farklı bir sunucudan geliyorsa tarayıcı engelliyor olabilir.</div>`;
    }

    const qrCanvas = window.makeQrCanvas(window.getListingShareUrl(id), 200);
    if (qrCanvas) {
        qrCanvas.className = 'rounded-lg border border-gray-200 mx-auto';
        qrBox.appendChild(qrCanvas);
    } else {
        qrBox.innerHTML = `<p class="text-[11px] text-gray-400 text-center">QR kütüphanesi yüklenemedi.</p>`;
    }
};

window.closeShareCardModal = function () {
    document.getElementById('share-card-modal').classList.add('hidden');
};

window.downloadCanvasImage = function (canvas, filename) {
    if (!canvas) { window.showToast("Görsel henüz hazır değil.", "warning"); return; }
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        window.showToast("Görsel indirildi. WhatsApp/Instagram'da paylaşabilirsiniz!", "success");
    }, 'image/png');
};

window.safeFileName = function (text, fallback) {
    const clean = String(text || '').replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ ]/g, '').slice(0, 40).trim().replace(/\s+/g, '-');
    return clean || fallback;
};

window.downloadShareCard = function () {
    const item = (window.listings || []).find(l => l.id === window.activeShareListingId);
    window.downloadCanvasImage(window.shareCardCanvas, `orontes-${window.safeFileName(item && item.title, 'ilan')}.png`);
};

window.downloadQrPoster = async function () {
    const item = (window.listings || []).find(l => l.id === window.activeShareListingId);
    if (!item) return;
    window.showToast("QR afişi hazırlanıyor...", "warning");
    try {
        const poster = await window.buildQrPoster(item);
        window.downloadCanvasImage(poster, `orontes-qr-afis-${window.safeFileName(item.title, 'ilan')}.png`);
    } catch (err) {
        window.showToast("QR afişi oluşturulamadı.", "error");
    }
};

/* Mobilde görseli doğrudan WhatsApp/Instagram'a gönderir */
window.nativeShareCard = async function () {
    const item = (window.listings || []).find(l => l.id === window.activeShareListingId);
    if (!item) return;
    const url = window.getListingShareUrl(item.id);
    const text = `📌 ${item.title}\n💰 ${item.price} TL${item.unit ? ' / ' + item.unit : ''}\n📍 ${(item.outsideHatay ? '' : 'Hatay / ') + window.getListingLocationText(item)}\n\nORONTES'te görüntüle: ${url}`;

    try {
        if (window.shareCardCanvas && navigator.canShare) {
            const blob = await new Promise(res => window.shareCardCanvas.toBlob(res, 'image/png'));
            const file = new File([blob], 'orontes-ilan.png', { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: item.title, text: text });
                return;
            }
        }
        if (navigator.share) {
            await navigator.share({ title: item.title, text: text, url: url });
            return;
        }
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    } catch (err) {
        if (err && err.name === 'AbortError') return;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
};

window.copyShareLink = function () {
    const item = (window.listings || []).find(l => l.id === window.activeShareListingId);
    if (!item) return;
    window.copyToClipboard(window.getListingShareUrl(item.id), "İlan bağlantısı kopyalandı!");
};

/* ------------------------- ÜRETİCİ HİKAYESİ / VİDEO ------------------------- */

window.getYoutubeId = function (url) {
    if (!url) return null;
    const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : null;
};

window.renderProducerStory = function (item) {
    const box = document.getElementById('detail-story-box');
    const textEl = document.getElementById('detail-story-text');
    const videoBox = document.getElementById('detail-video-box');
    if (!box || !textEl || !videoBox) return;

    const hasStory = !!(item.producerStory && String(item.producerStory).trim());
    const hasVideo = !!(item.videoUrl && String(item.videoUrl).trim());

    box.classList.toggle('hidden', !hasStory && !hasVideo);
    textEl.innerText = hasStory ? item.producerStory : '';
    textEl.classList.toggle('hidden', !hasStory);

    videoBox.innerHTML = '';
    if (hasVideo) {
        const ytId = window.getYoutubeId(item.videoUrl);
        if (ytId) {
            videoBox.innerHTML = `<div class="rounded-xl overflow-hidden border border-lux-olive/30 mt-2" style="position:relative; padding-top:56.25%;">
                <iframe src="https://www.youtube.com/embed/${escapeHtml(ytId)}" title="Üretici videosu" allowfullscreen loading="lazy"
                    style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;"></iframe>
            </div>`;
        } else {
            videoBox.innerHTML = `<a href="${escapeHtml(item.videoUrl)}" target="_blank" rel="noopener"
                class="mt-2 inline-flex items-center gap-1.5 bg-lux-dark hover:bg-lux-olive text-white font-bold px-3 py-2 rounded-lg text-[11px] transition">
                <i class="fa-solid fa-circle-play"></i> ${window.t('detail.video', 'Üretici videosunu izle')}
            </a>`;
        }
    }
};

/* İlan detayındaki yeni alanların bağlamını hazırlar */
window.setupDetailExtras = function (item) {
    const subBox = document.getElementById('detail-subscription-box');
    if (subBox) {
        const isOwn = window.currentUser && item.uid === window.currentUser.uid;
        subBox.classList.toggle('hidden', !!isOwn);
        const hint = document.getElementById('sub-accept-hint');
        if (hint) hint.classList.toggle('hidden', !item.acceptsSubscription);
        const qtyUnit = document.getElementById('sub-unit-label');
        if (qtyUnit) qtyUnit.innerText = item.unit || 'KG';
    }

    const problemBtn = document.getElementById('detail-problem-btn');
    if (problemBtn) {
        problemBtn.onclick = () => window.openDisputeModal(null, item.uid, item.seller || '', item.title || '');
    }

    const shareBtn = document.getElementById('detail-sharecard-btn');
    if (shareBtn) shareBtn.onclick = () => window.openShareCardModal(item.id);
};

/* =========================================================================================
   ORONTES — MODÜL 3 / BÖLÜM C
   • Hasat takviminde "Bana Haber Ver" bildirim kancası
   • Düzenli / abonelik siparişi
   • Toplu alım — "Birlikte Al"
   ========================================================================================= */

/* ------------------------- HASAT BİLDİRİMLERİ ------------------------- */

window.harvestAlertCount = 0;
window.notifiedHarvestSeasons = new Set();

window.harvestKey = function (name) {
    return String(name || '')
        .toLocaleLowerCase('tr-TR')
        .replace(/[.#$\[\]\/]/g, '')
        .replace(/[^a-z0-9çğıöşü]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
};

window.isHarvestAlertOn = function (productName) {
    const alerts = (window.userExtraData && window.userExtraData.harvestAlerts) || {};
    return !!alerts[window.harvestKey(productName)];
};

window.toggleHarvestAlert = async function (productName) {
    if (!window.currentUser) {
        window.showToast("Hasat bildirimi kurmak için giriş yapmalısınız.", "warning");
        window.openAuthModal('login');
        return;
    }

    const product = (window.HATAY_HARVEST_DATA || []).find(p => p.name === productName);
    if (!product) return;

    const key = window.harvestKey(productName);
    if (!window.userExtraData.harvestAlerts) window.userExtraData.harvestAlerts = {};

    try {
        if (window.userExtraData.harvestAlerts[key]) {
            await remove(ref(db, `users/${window.currentUser.uid}/harvestAlerts/${key}`));
            delete window.userExtraData.harvestAlerts[key];
            window.showToast(`🔕 "${productName}" hasat bildirimi kapatıldı.`, "success");
        } else {
            const payload = {
                name: product.name,
                category: product.category,
                keyword: product.keyword,
                months: product.months,
                peak: product.peak,
                district: window.harvestSelectedDistrict || null,
                createdAt: Date.now()
            };
            await update(ref(db, `users/${window.currentUser.uid}/harvestAlerts/${key}`), payload);
            window.userExtraData.harvestAlerts[key] = payload;
            window.showToast(`🔔 "${productName}" hasat sezonuna girince gelen kutunuzdan haber vereceğiz!`, "success");
        }
        window.renderHarvestCalendar();
        window.refreshHarvestAlertBadge();
    } catch (err) {
        window.showToast("Bildirim kaydedilemedi: " + err.message, "error");
    }
};

/* Gelen kutusuna basılacak hasat bildirim kartlarını üretir */
window.getHarvestNotifications = function () {
    const alerts = (window.userExtraData && window.userExtraData.harvestAlerts) || {};
    const now = new Date();
    const month = now.getMonth() + 1;
    const nextMonth = month === 12 ? 1 : month + 1;
    const items = [];

    Object.keys(alerts).forEach(key => {
        const a = alerts[key];
        if (!a || !Array.isArray(a.months)) return;

        const inSeason = a.months.includes(month);
        const startingSoon = !inSeason && a.months.includes(nextMonth);
        if (!inSeason && !startingSoon) return;

        items.push({
            id: 'harvest_' + key,
            type: 'harvest_alert',
            productName: a.name,
            category: a.category,
            keyword: a.keyword,
            district: a.district || null,
            inSeason: inSeason,
            isPeak: Array.isArray(a.peak) && a.peak.includes(month),
            monthLabel: window.TR_MONTHS[(inSeason ? month : nextMonth) - 1],
            date: Date.now() - (inSeason ? 0 : 1000)
        });
    });

    return items;
};

window.refreshHarvestAlertBadge = function () {
    const notifs = window.getHarvestNotifications();
    window.harvestAlertCount = notifs.length;
    if (typeof window.updateNotificationBadge === 'function') window.updateNotificationBadge();

    if (window.currentUser) {
        notifs.forEach(n => {
            if (n.inSeason && !window.notifiedHarvestSeasons.has(n.id)) {
                window.notifiedHarvestSeasons.add(n.id);
                window.showToast(`🌱 Takip ettiğiniz "${n.productName}" hasat sezonuna girdi! Gelen kutunuza bakın.`, "success");
            }
        });
    }
};

/* ------------------------- DÜZENLİ / ABONELİK SİPARİŞİ ------------------------- */

window.submitSubscriptionRequest = async function () {
    if (!window.currentUser) {
        window.showToast("Düzenli sipariş talebi için giriş yapmalısınız.", "warning");
        window.openAuthModal('login');
        return;
    }

    const item = (window.listings || []).find(l => l.id === window.activeListingId);
    if (!item) return;

    if (item.uid === window.currentUser.uid) {
        window.showToast("Kendi ilanınıza abonelik talebi gönderemezsiniz.", "error");
        return;
    }

    const frequency = document.getElementById('sub-frequency').value;
    const qty = document.getElementById('sub-qty').value.trim();
    const start = document.getElementById('sub-start').value.trim();
    const note = document.getElementById('sub-note').value.trim();

    if (!qty) {
        window.showToast("Lütfen her teslimatta almak istediğiniz miktarı yazın.", "warning");
        return;
    }

    const btn = document.getElementById('sub-submit-btn');
    if (btn) { btn.disabled = true; btn.innerText = "Gönderiliyor..."; }

    try {
        await push(ref(db, 'offers'), {
            offerKind: 'subscription',
            listingId: item.id,
            listingTitle: item.title,
            sellerUid: item.uid,
            buyerUid: window.currentUser.uid,
            buyerName: window.userExtraData.username || window.currentUser.displayName || window.currentUser.email,
            buyerPhone: window.userExtraData.phone || 'Belirtilmedi',
            offeredPrice: item.price,
            frequency: frequency,
            subQty: qty,
            startDate: start || null,
            note: note ? `[DÜZENLİ SİPARİŞ] ${note}` : `[DÜZENLİ SİPARİŞ] ${frequency} · ${qty} ${item.unit || ''}`,
            status: 'Beklemede',
            date: Date.now()
        });

        window.showToast("🔁 Düzenli sipariş talebiniz iletildi! Satıcı onaylarsa periyodik tedarik başlar.", "success");
        document.getElementById('sub-qty').value = '';
        document.getElementById('sub-start').value = '';
        document.getElementById('sub-note').value = '';
    } catch (err) {
        window.showToast("Talep iletilemedi: " + err.message, "error");
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = window.t('sub.send', 'Düzenli Sipariş Talebi Gönder'); }
    }
};

/* Alım talebi formunda "düzenli alım" seçilince periyot alanını göster */
window.toggleBrFrequency = function () {
    const cb = document.getElementById('br-recurring');
    const box = document.getElementById('br-frequency-box');
    if (!cb || !box) return;
    box.classList.toggle('hidden', !cb.checked);
};

/* ------------------------- TOPLU ALIM — "BİRLİKTE AL" ------------------------- */

window.groupBuys = [];
window.filteredGroupBuys = [];
window.gbOnlyOpen = true;
window.activeGroupBuyId = null;
window.activeGroupBuysListener = null;
window.activeGroupBuysQuery = null;
window.gbDistrictSelection = new Set(['Tüm Hatay']);

window.startGroupBuysListener = function () {
    try {
        const q = query(ref(db, 'groupBuys'), orderByChild('date'), limitToLast(80));

        if (window.activeGroupBuysQuery && window.activeGroupBuysListener) {
            off(window.activeGroupBuysQuery, 'value', window.activeGroupBuysListener);
        }

        window.activeGroupBuysQuery = q;
        window.activeGroupBuysListener = onValue(q, (snapshot) => {
            const items = [];
            snapshot.forEach(child => items.push({ id: child.key, ...child.val() }));
            items.sort((a, b) => (b.date || 0) - (a.date || 0));
            window.groupBuys = items;
            window.executeGroupBuyFilters();

            if (typeof window.updateMarqueeData === 'function') window.updateMarqueeData();

            const detailModal = document.getElementById('groupbuy-detail-modal');
            if (detailModal && !detailModal.classList.contains('hidden') && window.activeGroupBuyId) {
                window.openGroupBuyDetail(window.activeGroupBuyId, true);
            }
        }, (err) => {
            console.warn('Toplu alımlar okunamadı:', err);
            const grid = document.getElementById('groupbuys-grid');
            if (grid) {
                grid.innerHTML = `<div class="col-span-full text-center py-10 bg-white rounded-2xl border border-gray-200 text-gray-500 text-xs">
                    <i class="fa-solid fa-triangle-exclamation text-lux-gold text-xl block mb-2"></i>
                    <b class="text-lux-dark block mb-1">Toplu alım kampanyaları görüntülenemiyor.</b>
                    Lütfen birkaç saniye sonra sayfayı yenileyin.
                </div>`;
            }
        });
    } catch (err) {
        console.warn('Toplu alım dinleyicisi başlatılamadı:', err);
    }
};

window.getGroupBuyProgress = function (gb) {
    const parts = gb.participants || {};
    const collected = Object.values(parts).reduce((sum, p) => sum + (Number(p.qty) || 0), 0);
    const target = Number(gb.targetQty) || 0;
    const percent = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0;
    return { collected, target, percent, count: Object.keys(parts).length };
};

window.executeGroupBuyFilters = function () {
    const searchEl = document.getElementById('gb-search');
    const catEl = document.getElementById('gb-category-filter');
    const search = searchEl ? searchEl.value.toLocaleLowerCase('tr-TR') : '';
    const category = catEl ? catEl.value : '';

    window.filteredGroupBuys = (window.groupBuys || []).filter(gb => {
        const haystack = `${gb.title || ''} ${gb.desc || ''} ${gb.category || ''}`.toLocaleLowerCase('tr-TR');
        const matchesSearch = !search || haystack.includes(search);
        const matchesCat = !category || gb.category === category;
        const matchesStatus = !window.gbOnlyOpen || (gb.status || 'Açık') !== 'Kapandı';
        return matchesSearch && matchesCat && matchesStatus;
    });

    window.renderGroupBuys();
};

window.toggleGroupBuyOpenOnly = function () {
    window.gbOnlyOpen = !window.gbOnlyOpen;
    const btn = document.getElementById('gb-open-toggle');
    if (btn) {
        btn.className = window.gbOnlyOpen
            ? "bg-lux-gold text-lux-dark font-bold px-3 py-2 rounded-xl text-xs transition whitespace-nowrap"
            : "bg-lux-bg text-gray-600 font-semibold px-3 py-2 rounded-xl text-xs transition whitespace-nowrap border border-gray-200";
        btn.innerHTML = window.gbOnlyOpen
            ? '<i class="fa-solid fa-toggle-on mr-1"></i> Sadece Aktif Kampanyalar'
            : '<i class="fa-solid fa-toggle-off mr-1"></i> Kapananlar Dahil';
    }
    window.executeGroupBuyFilters();
};

window.renderGroupBuys = function () {
    const grid = document.getElementById('groupbuys-grid');
    if (!grid) return;

    const items = window.filteredGroupBuys || [];
    const countEl = document.getElementById('gb-total-count');
    if (countEl) {
        const active = (window.groupBuys || []).filter(g => (g.status || 'Açık') !== 'Kapandı').length;
        countEl.innerText = `${items.length} kampanya listelendi · ${active} aktif toplu alım`;
    }

    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-lux-olive/40 text-gray-500 text-xs">
            <i class="fa-solid fa-people-group text-2xl text-lux-sage block mb-2"></i>
            <b class="text-lux-dark block mb-1">${window.t('gb.empty', 'Şu anda aktif toplu alım kampanyası yok.')}</b>
            Küçük alıcılar birleşip toptan fiyat yakalayabilir — ilk kampanyayı siz başlatın.
            <button onclick="window.openGroupBuyForm()" class="block mx-auto mt-3 bg-lux-dark text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-lux-olive transition">
                <i class="fa-solid fa-plus mr-1"></i> ${window.t('gb.create', 'Toplu Alım Başlat')}
            </button>
        </div>`;
        return;
    }

    items.forEach(gb => {
        const p = window.getGroupBuyProgress(gb);
        const isClosed = (gb.status || 'Açık') === 'Kapandı';
        const reached = p.percent >= 100;
        const emoji = categoryEmojis[gb.category] || '📦';
        const joined = window.currentUser && gb.participants && gb.participants[window.currentUser.uid];

        const card = document.createElement('div');
        card.className = `bg-white rounded-2xl border ${isClosed ? 'border-gray-200 opacity-70' : (reached ? 'border-[1.5px] border-emerald-500' : 'border-lux-olive/30')} p-4 flex flex-col justify-between hover:shadow-lg transition-all duration-300`;
        card.innerHTML = `
            <div>
                <div class="flex items-start justify-between gap-2 mb-2">
                    <span class="bg-lux-olive text-white text-[9px] font-extrabold px-2 py-1 rounded-md uppercase tracking-wide whitespace-nowrap">
                        <i class="fa-solid fa-people-group mr-0.5"></i> BİRLİKTE AL
                    </span>
                    <span class="text-[9px] text-gray-400 whitespace-nowrap"><i class="fa-regular fa-clock mr-0.5"></i>${getTimeAgo(gb.date)}</span>
                </div>

                <div class="flex flex-wrap gap-1 mb-2">
                    ${isClosed ? '<span class="bg-gray-500 text-white font-bold text-[9px] px-2 py-0.5 rounded">KAPANDI</span>' : ''}
                    ${reached && !isClosed ? `<span class="bg-emerald-600 text-white font-bold text-[9px] px-2 py-0.5 rounded">🎯 ${window.t('gb.reached', 'HEDEFE ULAŞILDI')}</span>` : ''}
                    ${joined ? `<span class="bg-lux-gold text-lux-dark font-bold text-[9px] px-2 py-0.5 rounded">✓ ${window.t('gb.joined', 'KATILDIN')}</span>` : ''}
                </div>

                <h3 onclick="window.openGroupBuyDetail('${escapeHtml(gb.id)}')" class="font-bold text-lux-dark text-xs hover:text-lux-olive cursor-pointer line-clamp-2 mb-2">
                    ${emoji} ${escapeHtml(gb.title || 'Toplu alım')}
                </h3>

                <div class="mb-2">
                    <div class="flex justify-between text-[10px] font-semibold mb-1">
                        <span class="text-lux-olive">${window.t('gb.collected', 'Toplanan')}: ${p.collected} ${escapeHtml(gb.unit || '')}</span>
                        <span class="text-gray-500">${window.t('gb.target', 'Hedef')}: ${p.target} ${escapeHtml(gb.unit || '')}</span>
                    </div>
                    <div class="w-full h-2.5 bg-lux-bg rounded-full overflow-hidden border border-gray-200">
                        <div class="h-full ${reached ? 'bg-emerald-500' : 'bg-lux-gold'} transition-all" style="width:${p.percent}%"></div>
                    </div>
                    <div class="flex justify-between text-[9px] text-gray-400 mt-1">
                        <span>%${p.percent}</span>
                        <span><i class="fa-solid fa-users mr-0.5"></i>${p.count} ${window.t('gb.participants', 'katılımcı')}</span>
                    </div>
                </div>

                <div class="text-[10px] text-gray-500 space-y-0.5">
                    ${gb.targetPrice ? `<p><i class="fa-solid fa-tag text-lux-gold w-3"></i> Hedef fiyat: <b class="text-lux-dark">${escapeHtml(String(gb.targetPrice))} TL</b></p>` : ''}
                    ${gb.deadline ? `<p><i class="fa-solid fa-calendar-day text-lux-gold w-3"></i> Son katılım: ${escapeHtml(gb.deadline)}</p>` : ''}
                    <p><i class="fa-solid fa-location-dot text-lux-gold w-3"></i> ${escapeHtml(Array.isArray(gb.districts) && gb.districts.length ? gb.districts.join(' · ') : 'Tüm Hatay')}</p>
                </div>
            </div>

            <div class="border-t border-gray-100 mt-3 pt-2.5 flex items-center justify-between gap-2">
                <span class="text-[9px] text-gray-400">${escapeHtml(gb.creatorName || '')}</span>
                <button onclick="window.openGroupBuyDetail('${escapeHtml(gb.id)}')" class="text-[11px] ${isClosed ? 'bg-lux-bg text-gray-500' : 'bg-lux-olive text-white hover:bg-lux-dark'} font-bold px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                    ${isClosed || joined ? window.t('br.detail', 'Detay') : window.t('gb.join', 'Katıl')}
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
};

window.renderGbDistrictChips = function () {
    const box = document.getElementById('gb-district-chips');
    if (!box) return;
    box.innerHTML = '';

    const makeChip = (label) => {
        const chip = document.createElement('span');
        const isSelected = window.gbDistrictSelection.has(label);
        chip.innerText = label;
        chip.className = `cursor-pointer text-[10px] px-2 py-1 rounded-full border transition-all ${isSelected ? 'bg-lux-dark text-lux-gold border-lux-gold font-bold' : 'bg-white hover:bg-lux-bg text-lux-dark border-gray-300 font-medium'}`;
        chip.onclick = () => {
            if (label === 'Tüm Hatay') {
                window.gbDistrictSelection.clear();
                window.gbDistrictSelection.add('Tüm Hatay');
            } else {
                window.gbDistrictSelection.delete('Tüm Hatay');
                if (window.gbDistrictSelection.has(label)) window.gbDistrictSelection.delete(label);
                else window.gbDistrictSelection.add(label);
                if (window.gbDistrictSelection.size === 0) window.gbDistrictSelection.add('Tüm Hatay');
            }
            window.renderGbDistrictChips();
        };
        box.appendChild(chip);
    };

    makeChip('Tüm Hatay');
    (window.HATAY_DISTRICT_LIST || []).forEach(d => makeChip(d));
};

window.openGroupBuyForm = function (prefill) {
    if (!window.currentUser) {
        window.showToast("Toplu alım başlatmak için giriş yapmalısınız.", "warning");
        window.openAuthModal('login');
        return;
    }

    const form = document.getElementById('groupbuy-form');
    if (form) form.reset();
    document.getElementById('gb-edit-id').value = '';
    document.getElementById('gb-form-title-text').innerText = window.t('gb.create', 'Toplu Alım Başlat');
    document.getElementById('gb-submit-btn').innerText = 'Kampanyayı Başlat';

    window.gbDistrictSelection = new Set(['Tüm Hatay']);
    window.renderGbDistrictChips();

    const nameEl = document.getElementById('gb-name');
    const phoneEl = document.getElementById('gb-phone');
    if (nameEl) nameEl.value = window.userExtraData.username || window.currentUser.displayName || (window.currentUser.email || '').split('@')[0];
    if (phoneEl) phoneEl.value = window.userExtraData.phone || '';

    if (prefill && prefill.category) document.getElementById('gb-category').value = prefill.category;
    if (prefill && prefill.title) document.getElementById('gb-title').value = prefill.title;

    document.getElementById('groupbuy-detail-modal').classList.add('hidden');
    document.getElementById('groupbuy-form-modal').classList.remove('hidden');
};

window.closeGroupBuyForm = function () {
    document.getElementById('groupbuy-form-modal').classList.add('hidden');
};

window.openGroupBuyFormForEdit = function (id) {
    const gb = (window.groupBuys || []).find(g => g.id === id);
    if (!gb || !window.currentUser || gb.creatorUid !== window.currentUser.uid) {
        window.showToast("Bu kampanyayı düzenleme yetkiniz yok.", "error");
        return;
    }

    document.getElementById('gb-edit-id').value = gb.id;
    document.getElementById('gb-form-title-text').innerText = 'Toplu Alımı Düzenle';
    document.getElementById('gb-submit-btn').innerText = 'Değişiklikleri Kaydet';
    document.getElementById('gb-title').value = gb.title || '';
    document.getElementById('gb-category').value = gb.category || '';
    document.getElementById('gb-target-qty').value = gb.targetQty || '';
    document.getElementById('gb-unit').value = gb.unit || '';
    document.getElementById('gb-target-price').value = gb.targetPrice || '';
    document.getElementById('gb-deadline').value = gb.deadline || '';
    document.getElementById('gb-desc').value = gb.desc || '';
    document.getElementById('gb-name').value = gb.creatorName || '';
    document.getElementById('gb-phone').value = gb.phone || '';
    document.getElementById('gb-my-qty').value = (gb.participants && gb.participants[window.currentUser.uid])
        ? gb.participants[window.currentUser.uid].qty : '';

    window.gbDistrictSelection = new Set(Array.isArray(gb.districts) && gb.districts.length ? gb.districts : ['Tüm Hatay']);
    window.renderGbDistrictChips();

    document.getElementById('groupbuy-detail-modal').classList.add('hidden');
    document.getElementById('groupbuy-form-modal').classList.remove('hidden');
};

window.handleGroupBuySubmit = async function (e) {
    e.preventDefault();
    if (!window.currentUser) return;

    const editId = document.getElementById('gb-edit-id').value;
    const title = document.getElementById('gb-title').value.trim();
    const category = document.getElementById('gb-category').value;
    const targetQty = Number(document.getElementById('gb-target-qty').value);
    const myQty = Number(document.getElementById('gb-my-qty').value);
    const name = document.getElementById('gb-name').value.trim();
    const phone = document.getElementById('gb-phone').value.trim();

    if (!title || !category || !targetQty || !name || !phone) {
        window.showToast("Lütfen zorunlu (*) alanları doldurun.", "warning");
        return;
    }
    if (targetQty <= 0) {
        window.showToast("Hedef miktar 0'dan büyük olmalıdır.", "warning");
        return;
    }

    const existing = editId ? (window.groupBuys || []).find(g => g.id === editId) : null;
    if (editId && (!existing || existing.creatorUid !== window.currentUser.uid)) {
        window.showToast("Bu kampanyayı düzenleme yetkiniz yok.", "error");
        return;
    }

    const btn = document.getElementById('gb-submit-btn');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Kaydediliyor...";

    const payload = {
        creatorUid: window.currentUser.uid,
        creatorName: name,
        phone: phone,
        title: title,
        category: category,
        targetQty: targetQty,
        unit: document.getElementById('gb-unit').value.trim() || 'KG',
        targetPrice: Number(document.getElementById('gb-target-price').value) || null,
        deadline: document.getElementById('gb-deadline').value.trim() || null,
        districts: Array.from(window.gbDistrictSelection),
        desc: document.getElementById('gb-desc').value.trim() || null,
        status: existing ? (existing.status || 'Açık') : 'Açık',
        date: existing ? existing.date : Date.now(),
        updatedAt: Date.now()
    };

    try {
        let targetId = editId;
        if (editId) {
            await update(ref(db, 'groupBuys/' + editId), payload);
            window.showToast("Toplu alım kampanyanız güncellendi.", "success");
        } else {
            const newRef = await push(ref(db, 'groupBuys'), payload);
            targetId = newRef.key;
            window.showToast("🤝 Toplu alım kampanyanız başladı! Bağlantıyı paylaşarak katılımcı toplayın.", "success");
        }

        if (myQty > 0 && targetId) {
            await update(ref(db, `groupBuys/${targetId}/participants/${window.currentUser.uid}`), {
                name: name, phone: phone, qty: myQty, joinedAt: Date.now()
            });
        }

        window.closeGroupBuyForm();
        const sec = document.getElementById('groupbuys-section');
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
        window.showToast("Kampanya kaydedilemedi: " + (err && err.message ? err.message : 'Bilinmeyen hata'), "error");
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
};

window.openGroupBuyDetail = function (id, silentRefresh) {
    const gb = (window.groupBuys || []).find(g => g.id === id);
    if (!gb) return;

    window.activeGroupBuyId = id;
    const p = window.getGroupBuyProgress(gb);
    const isCreator = window.currentUser && gb.creatorUid === window.currentUser.uid;
    const isClosed = (gb.status || 'Açık') === 'Kapandı';
    const myPart = window.currentUser && gb.participants ? gb.participants[window.currentUser.uid] : null;

    document.getElementById('gbd-title').innerText = `${categoryEmojis[gb.category] || '📦'} ${gb.title}`;
    document.getElementById('gbd-category').innerText = gb.category || '-';
    document.getElementById('gbd-time').innerText = getTimeAgo(gb.date);
    document.getElementById('gbd-desc').innerText = gb.desc || 'Ek açıklama girilmedi.';
    document.getElementById('gbd-creator').innerText = gb.creatorName || '-';
    document.getElementById('gbd-deadline').innerText = gb.deadline || 'Belirtilmedi';
    document.getElementById('gbd-target-price').innerText = gb.targetPrice ? `${gb.targetPrice} TL` : 'Üretici teklifine göre';
    document.getElementById('gbd-districts').innerText = Array.isArray(gb.districts) && gb.districts.length ? gb.districts.join(' · ') : 'Tüm Hatay';

    const bar = document.getElementById('gbd-progress-bar');
    bar.style.width = p.percent + '%';
    bar.className = `h-full ${p.percent >= 100 ? 'bg-emerald-500' : 'bg-lux-gold'} transition-all`;
    document.getElementById('gbd-progress-text').innerText = `${p.collected} / ${p.target} ${gb.unit || ''} (%${p.percent}) · ${p.count} katılımcı`;

    document.getElementById('gbd-badges').innerHTML = `
        ${isClosed ? '<span class="bg-gray-500 text-white font-bold text-[9px] px-2 py-0.5 rounded">KAPANDI</span>' : '<span class="bg-emerald-600 text-white font-bold text-[9px] px-2 py-0.5 rounded">AKTİF KAMPANYA</span>'}
        ${p.percent >= 100 ? '<span class="bg-lux-gold text-lux-dark font-bold text-[9px] px-2 py-0.5 rounded">🎯 HEDEFE ULAŞILDI</span>' : ''}
        ${myPart ? '<span class="bg-white/20 text-white font-bold text-[9px] px-2 py-0.5 rounded">✓ KATILDIN</span>' : ''}
    `;

    const listEl = document.getElementById('gbd-participants');
    listEl.innerHTML = '';
    const parts = gb.participants || {};
    if (Object.keys(parts).length === 0) {
        listEl.innerHTML = `<p class="text-[11px] text-gray-400 italic">Henüz katılımcı yok — ilk katılan siz olun!</p>`;
    } else {
        Object.keys(parts).forEach(uid => {
            const part = parts[uid];
            const row = document.createElement('div');
            row.className = "flex justify-between items-center bg-lux-bg/40 p-2 rounded-lg border border-gray-200/60 text-[11px]";
            row.innerHTML = `
                <span class="font-semibold text-lux-dark">${escapeHtml(part.name || 'Katılımcı')}${uid === gb.creatorUid ? ' <span class="text-[9px] bg-lux-gold text-lux-dark px-1 rounded">BAŞLATAN</span>' : ''}</span>
                <span class="text-lux-olive font-bold">${escapeHtml(String(part.qty || 0))} ${escapeHtml(gb.unit || '')}</span>
            `;
            listEl.appendChild(row);
        });
    }

    const joinBox = document.getElementById('gbd-join-box');
    joinBox.classList.toggle('hidden', isClosed);
    document.getElementById('gbd-join-btn').innerText = myPart
        ? 'Katılım Miktarımı Güncelle'
        : window.t('gb.join', 'Kampanyaya Katıl');
    document.getElementById('gbd-leave-btn').classList.toggle('hidden', !myPart);
    if (!silentRefresh) document.getElementById('gbd-join-qty').value = myPart ? myPart.qty : '';
    document.getElementById('gbd-join-unit').innerText = gb.unit || 'KG';

    document.getElementById('gbd-supply-box').classList.toggle('hidden', isClosed || !!isCreator);

    document.getElementById('gbd-owner-actions').classList.toggle('hidden', !isCreator);
    const statusBtn = document.getElementById('gbd-status-btn');
    if (statusBtn) statusBtn.innerHTML = isClosed
        ? '<i class="fa-solid fa-lock-open mr-1"></i> Kampanyayı Yeniden Aç'
        : '<i class="fa-solid fa-lock mr-1"></i> Kampanyayı Kapat';

    document.getElementById('groupbuy-detail-modal').classList.remove('hidden');
};

window.closeGroupBuyDetail = function () {
    document.getElementById('groupbuy-detail-modal').classList.add('hidden');
    window.activeGroupBuyId = null;
};

window.joinGroupBuy = async function () {
    if (!window.currentUser) {
        window.showToast("Katılmak için giriş yapmalısınız.", "warning");
        window.openAuthModal('login');
        return;
    }
    const gb = (window.groupBuys || []).find(g => g.id === window.activeGroupBuyId);
    if (!gb) return;

    const qty = Number(document.getElementById('gbd-join-qty').value);
    if (!qty || qty <= 0) {
        window.showToast("Lütfen almak istediğiniz miktarı girin.", "warning");
        return;
    }

    const btn = document.getElementById('gbd-join-btn');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Kaydediliyor...";

    try {
        await update(ref(db, `groupBuys/${gb.id}/participants/${window.currentUser.uid}`), {
            name: window.userExtraData.username || window.currentUser.displayName || 'Katılımcı',
            phone: window.userExtraData.phone || 'Belirtilmedi',
            qty: qty,
            joinedAt: Date.now()
        });
        window.showToast(`🤝 Kampanyaya ${qty} ${gb.unit || ''} ile katıldınız!`, "success");
    } catch (err) {
        window.showToast("Katılım kaydedilemedi: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
};

window.leaveGroupBuy = async function () {
    if (!window.currentUser || !window.activeGroupBuyId) return;
    if (!confirm("Bu toplu alım kampanyasından çıkmak istediğinize emin misiniz?")) return;
    try {
        await remove(ref(db, `groupBuys/${window.activeGroupBuyId}/participants/${window.currentUser.uid}`));
        window.showToast("Kampanyadan çıkarıldınız.", "success");
    } catch (err) {
        window.showToast("İşlem başarısız: " + err.message, "error");
    }
};

window.toggleGroupBuyStatus = async function () {
    const gb = (window.groupBuys || []).find(g => g.id === window.activeGroupBuyId);
    if (!gb || !window.currentUser || gb.creatorUid !== window.currentUser.uid) return;
    const newStatus = (gb.status || 'Açık') === 'Açık' ? 'Kapandı' : 'Açık';
    try {
        await update(ref(db, 'groupBuys/' + gb.id), { status: newStatus, updatedAt: Date.now() });
        window.showToast(`Kampanya durumu "${newStatus}" olarak güncellendi.`, "success");
    } catch (err) {
        window.showToast("Durum güncellenemedi: " + err.message, "error");
    }
};

window.deleteGroupBuy = async function (id) {
    const targetId = id || window.activeGroupBuyId;
    const gb = (window.groupBuys || []).find(g => g.id === targetId);
    if (!gb || !window.currentUser || gb.creatorUid !== window.currentUser.uid) {
        window.showToast("Bu kampanyayı silme yetkiniz yok.", "error");
        return;
    }
    if (!confirm("Bu toplu alım kampanyasını silmek istediğinize emin misiniz?")) return;
    try {
        await remove(ref(db, 'groupBuys/' + targetId));
        window.showToast("Toplu alım kampanyası silindi.", "success");
        window.closeGroupBuyDetail();
    } catch (err) {
        window.showToast("Silinemedi: " + err.message, "error");
    }
};

window.submitGroupSupplyOffer = async function () {
    if (!window.currentUser) {
        window.showToast("Teklif göndermek için giriş yapmalısınız.", "warning");
        window.openAuthModal('login');
        return;
    }
    const gb = (window.groupBuys || []).find(g => g.id === window.activeGroupBuyId);
    if (!gb) return;
    if (gb.creatorUid === window.currentUser.uid) {
        window.showToast("Kendi kampanyanıza teklif gönderemezsiniz.", "error");
        return;
    }

    const price = document.getElementById('gbd-supply-price').value;
    const note = document.getElementById('gbd-supply-note').value;
    if (!price) {
        window.showToast("Lütfen birim fiyatınızı girin.", "warning");
        return;
    }

    const btn = document.getElementById('gbd-supply-btn');
    btn.disabled = true;
    btn.innerText = "Gönderiliyor...";

    try {
        const p = window.getGroupBuyProgress(gb);
        await push(ref(db, 'offers'), {
            offerKind: 'group',
            requestId: gb.id,
            listingId: gb.id,
            listingTitle: gb.title,
            sellerUid: gb.creatorUid,
            buyerUid: window.currentUser.uid,
            buyerName: window.userExtraData.username || window.currentUser.displayName || window.currentUser.email,
            buyerPhone: window.userExtraData.phone || 'Belirtilmedi',
            offeredPrice: price,
            note: note
                ? `[TOPLU ALIM TEKLİFİ · ${p.collected} ${gb.unit || ''}] ${note}`
                : `[TOPLU ALIM TEKLİFİ] Toplam ${p.collected} ${gb.unit || ''} için birim fiyat teklifi`,
            status: 'Beklemede',
            date: Date.now()
        });
        window.showToast("Toplu alım teklifiniz kampanya sahibine iletildi!", "success");
        document.getElementById('gbd-supply-price').value = '';
        document.getElementById('gbd-supply-note').value = '';
    } catch (err) {
        window.showToast("Teklif iletilemedi: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerText = window.t('br.supplySend', 'Tedarik Teklifi Gönder');
    }
};

window.shareGroupBuy = function () {
    const gb = (window.groupBuys || []).find(g => g.id === window.activeGroupBuyId);
    if (!gb) return;
    const p = window.getGroupBuyProgress(gb);
    const url = window.getGroupBuyShareUrl(gb.id);
    const text = `🤝 BİRLİKTE ALALIM — ${gb.title}\n🎯 Hedef: ${p.target} ${gb.unit || ''} · Toplanan: ${p.collected} ${gb.unit || ''} (%${p.percent})\n\nKatılmak için: ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
};

/* Hesabım > Alım Taleplerim sekmesinde toplu alımlarım */
window.loadMyGroupBuys = function () {
    const container = document.getElementById('tab-content-buyrequests');
    if (!container || !window.currentUser) return;

    const mine = (window.groupBuys || []).filter(g => g.creatorUid === window.currentUser.uid);
    const joined = (window.groupBuys || []).filter(g =>
        g.creatorUid !== window.currentUser.uid && g.participants && g.participants[window.currentUser.uid]);

    const divider = document.createElement('div');
    divider.className = "pt-3 mt-3 border-t border-gray-200";
    divider.innerHTML = `
        <span class="text-[11px] font-bold text-lux-dark block mb-2"><i class="fa-solid fa-people-group text-lux-olive mr-1"></i> Toplu Alım Kampanyalarım</span>
        <button onclick="closeAccountModal(); window.openGroupBuyForm();" class="w-full bg-lux-olive text-white font-bold py-2 rounded-xl text-xs hover:bg-lux-dark transition mb-2">
            <i class="fa-solid fa-plus mr-1"></i> Yeni Toplu Alım Başlat
        </button>
    `;
    container.appendChild(divider);

    const all = [...mine, ...joined];
    if (all.length === 0) {
        const empty = document.createElement('p');
        empty.className = "text-xs text-gray-400 italic";
        empty.innerText = "Henüz başlattığınız veya katıldığınız bir toplu alım yok.";
        container.appendChild(empty);
        return;
    }

    all.forEach(gb => {
        const p = window.getGroupBuyProgress(gb);
        const isMine = gb.creatorUid === window.currentUser.uid;
        const row = document.createElement('div');
        row.className = "flex justify-between items-center bg-lux-bg/40 p-2.5 rounded-xl border border-gray-200/60 text-xs mb-2";
        row.innerHTML = `
            <div class="min-w-0 pr-2">
                <span class="font-bold text-lux-dark block line-clamp-1">${categoryEmojis[gb.category] || '📦'} ${escapeHtml(gb.title)}</span>
                <span class="text-[10px] text-gray-500">${p.collected}/${p.target} ${escapeHtml(gb.unit || '')} · %${p.percent} · ${p.count} katılımcı</span>
                <span class="text-[9px] font-bold ${isMine ? 'text-lux-olive' : 'text-gray-500'} block">${isMine ? 'BAŞLATAN BENİM' : 'KATILDIM'}</span>
            </div>
            <div class="flex space-x-1 shrink-0">
                <button onclick="closeAccountModal(); window.openGroupBuyDetail('${escapeHtml(gb.id)}')" class="bg-lux-dark text-white text-[10px] px-2 py-1 rounded">İncele</button>
                ${isMine ? `<button onclick="closeAccountModal(); window.openGroupBuyFormForEdit('${escapeHtml(gb.id)}')" class="bg-amber-100 text-amber-800 text-[10px] px-2 py-1 rounded"><i class="fa-solid fa-pen"></i></button>
                <button onclick="window.deleteGroupBuy('${escapeHtml(gb.id)}')" class="bg-red-100 text-red-600 text-[10px] px-2 py-1 rounded"><i class="fa-solid fa-trash-can"></i></button>` : ''}
            </div>
        `;
        container.appendChild(row);
    });
};

/* =========================================================================================
   MODÜL 3 — BAŞLATMA
   ========================================================================================= */

window.startGroupBuysListener();
window.renderGbDistrictChips();

function orontesModule3Init() {
    window.applyLanguage(window.currentLang);
    window.restoreCollapseState('harvest-body', 'harvest-collapse-btn', 'orontes_harvest_open', true);
    window.restoreCollapseState('groupbuys-body', 'gb-collapse-btn', 'orontes_gb_open', true);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', orontesModule3Init);
} else {
    orontesModule3Init();
}

setTimeout(() => {
    window.handleDeepLink();
    window.refreshHarvestAlertBadge();
}, 1800);
