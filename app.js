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
            sellerName: item.seller || null,
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
            story: (document.getElementById('form-story') ? document.getElementById('form-story').value.trim() : '') || null,
            videoUrl: (document.getElementById('form-video') ? document.getElementById('form-video').value.trim() : '') || null,
            allowSubscription: document.getElementById('form-allow-subscription') ? document.getElementById('form-allow-subscription').checked : false,
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
        const scores = ratingsArray.filter(r => (r.role || 'seller') !== 'buyer').map(r => r.score).filter(s => typeof s === 'number');
        const avg = scores.length ? (scores.reduce((a,b) => a+b, 0) / scores.length) : 0;
        const roundedStars = Math.round(avg);
        ratingEl.innerText = scores.length
            ? `${'★'.repeat(roundedStars)}${'☆'.repeat(5 - roundedStars)} ${avg.toFixed(1)} (${scores.length})`
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

        if (typeof window.renderProfileExtraRatings === 'function') window.renderProfileExtraRatings(ratingsData);
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
        
        const [inSnap, outSnap] = await Promise.all([get(incomingQuery), get(outgoingQuery)]);
        
        const incomingData = inSnap.val() || {};
        const outgoingData = outSnap.val() || {};

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
        const harvestAlerts = (typeof window.buildHarvestAlerts === 'function') ? window.buildHarvestAlerts() : [];
        const allOffers = [...incomingOffers, ...outgoingOffers, ...priceAlerts, ...harvestAlerts].sort((a,b) => b.date - a.date);

        container.innerHTML = '';

        if (allOffers.length === 0) {
            container.innerHTML = `<p class="text-xs text-gray-400 italic">Henüz aldığınız, gönderdiğiniz teklif veya favori bildiriminiz bulunmuyor.</p>`;
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
                // HASAT BILDIRIM KARTI
                div.className = "bg-orange-50 p-3 rounded-xl border border-orange-200 text-xs space-y-2 mb-2";
                div.innerHTML = window.renderHarvestAlertCard(o);
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
                            ${isSupply
                                ? '<span class="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded"><i class="fa-solid fa-cart-shopping mr-0.5"></i> ALIM TALEBİME TEDARİK TEKLİFİ</span>'
                                : '<span class="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">GELEN TALEP</span>'}
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
                        ${typeof window.offerExtraInfo === 'function' ? window.offerExtraInfo(o) : ''}
                        ${typeof window.offerActionButtons === 'function' ? window.offerActionButtons(o, true) : ''}
                    `;
                } else {
                    div.innerHTML = `
                        <div class="flex justify-between items-center font-bold text-gray-700 border-b border-gray-200 pb-1 mb-1">
                            ${o.offerKind === 'supply'
                                ? '<span class="text-[10px] bg-lux-olive text-white px-1.5 py-0.5 rounded"><i class="fa-solid fa-truck-field mr-0.5"></i> GÖNDERDİĞİM TEDARİK TEKLİFİ</span>'
                                : '<span class="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">GÖNDERDİĞİM TALEP</span>'}
                            <span class="text-emerald-700">${window.escapeHtml(String(o.offeredPrice || '?'))} TL</span>
                        </div>
                        <p class="font-bold cursor-pointer hover:text-lux-olive" onclick="closeAccountModal(); window.openOfferTargetModal('${o.offerKind || 'listing'}', '${window.escapeHtml(o.listingId)}')">📌 ${window.escapeHtml(o.listingTitle || 'İlan')} <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i></p>
                        <div class="flex justify-between items-center mt-2">
                            <span class="text-[10px] font-semibold px-2 py-0.5 rounded ${statusColor}">Karşı Taraf Yanıtı: ${window.escapeHtml(o.status || 'Beklemede')}</span>
                            ${o.status === 'Onaylandı' ? `<span class="text-[10px] text-emerald-600 font-bold"><i class="fa-solid fa-check-circle"></i> Onaylandı, iletişime geçilecektir.</span>` : ''}
                        </div>
                        ${o.note ? `<p class="text-[10px] text-gray-500 italic bg-gray-100 p-1.5 rounded mt-1">İlettiğim Not: "${window.escapeHtml(o.note)}"</p>` : ''}
                        ${typeof window.offerExtraInfo === 'function' ? window.offerExtraInfo(o) : ''}
                        ${typeof window.offerActionButtons === 'function' ? window.offerActionButtons(o, false) : ''}
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
                <span><b>${escapeHtml(typeof window.trCategory === 'function' ? window.trCategory(cat) : cat)}</b> (${catListings.length} ${escapeHtml(typeof window.t === 'function' ? window.t('harvest.listing', 'İlan') : 'İlan')}) ${trendIcon}</span>
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
    if (document.getElementById('form-story')) document.getElementById('form-story').value = '';
    if (document.getElementById('form-video')) document.getElementById('form-video').value = '';
    if (document.getElementById('form-allow-subscription')) document.getElementById('form-allow-subscription').checked = false;
    
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
    if (document.getElementById('form-story')) document.getElementById('form-story').value = item.story || '';
    if (document.getElementById('form-video')) document.getElementById('form-video').value = item.videoUrl || '';
    if (document.getElementById('form-allow-subscription')) document.getElementById('form-allow-subscription').checked = item.allowSubscription || false;

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
    if (countEl) countEl.innerText = `${items.length} ${typeof window.t === 'function' ? window.t('listings.count', 'İlan/Hizmet Bulundu') : 'İlan/Hizmet Bulundu'}`;
    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-16 bg-white rounded-2xl border border-gray-200 text-gray-400 text-xs">${typeof window.t === 'function' ? window.t('listings.empty', 'Aradığınız kriterlere uygun sonuç bulunamadı.') : 'Aradığınız kriterlere uygun sonuç bulunamadı.'}</div>`;
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
            ? (typeof window.t === 'function' ? window.t('card.getOffer', 'Teklif Al') : 'Teklif Al')
            : (typeof window.t === 'function' ? window.t('card.inspect', 'İncele') : 'İncele');

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
                        ${item.allowSubscription ? '<span class="bg-indigo-600 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow">🔁 ABONELİK</span>' : ''}
                        ${(item.videoUrl || item.story) ? '<span class="bg-rose-600 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow">🎥 HİKAYE</span>' : ''}

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

    const dmBody = document.getElementById('district-map-body');
    if (dmBody && !dmBody.classList.contains('hidden') && typeof window.renderDistrictMap === 'function') {
        window.renderDistrictMap();
    }
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

    if (typeof window.renderListingExtras === 'function') window.renderListingExtras(item);

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
                    ${rq.recurring ? '<span class="bg-lux-olive text-white font-bold text-[9px] px-2 py-0.5 rounded">🔁 DÜZENLİ ALIM</span>' : ''}
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

    if (document.getElementById('br-groupbuy')) document.getElementById('br-groupbuy').checked = false;
    if (document.getElementById('br-frequency')) document.getElementById('br-frequency').value = '';

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
    document.getElementById('br-urgent').checked = !!rq.isUrgent;
    if (document.getElementById('br-groupbuy')) document.getElementById('br-groupbuy').checked = !!rq.groupBuy;
    if (document.getElementById('br-frequency')) document.getElementById('br-frequency').value = rq.frequency || '';

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
        frequency: document.getElementById('br-frequency') ? (document.getElementById('br-frequency').value || null) : null,
        groupBuy: document.getElementById('br-groupbuy') ? document.getElementById('br-groupbuy').checked : false,
        participants: existing ? (existing.participants || null) : null,
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
        ${rq.recurring ? '<span class="bg-lux-olive text-white font-bold text-[9px] px-2 py-0.5 rounded">🔁 DÜZENLİ ALIM</span>' : ''}
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

    if (typeof window.renderGroupBuyBox === 'function') window.renderGroupBuyBox(rq);
    const brdShareBtn = document.getElementById('brd-share-btn');
    if (brdShareBtn) brdShareBtn.onclick = () => window.shareBuyRequest(rq.id);

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
            sellerName: rq.buyerName || null,
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
                <div class="flex gap-1.5 shrink-0">
                    <button onclick="window.harvestSearchListings('${escapeHtml(p.category)}', '${escapeHtml(p.keyword)}')" class="bg-lux-dark hover:bg-lux-olive text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                        <i class="fa-solid fa-magnifying-glass mr-0.5"></i> İlanları Gör
                    </button>
                    <button onclick="window.harvestCreateRequest('${escapeHtml(p.category)}', '${escapeHtml(p.name)}')" class="bg-lux-gold hover:bg-[#ad9868] text-lux-dark text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                        <i class="fa-solid fa-cart-shopping mr-0.5"></i> Alım Talebi Aç
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
   ORONTES — 3. AŞAMA MODÜLLERİ / BÖLÜM A
   · Çok dilli altyapı (Türkçe / Arapça + RTL)
   · Derin bağlantı (?ilan= / ?talep=)
   · İlan paylaşım kartı (otomatik görsel üretimi)
   · QR kod üretimi
   · Üretici hikayesi & kısa video
   · İnteraktif ilçe haritası
   · Katlanabilir (aç/kapa) bölümler
   · Hasat takvimi "Bana Haber Ver" bildirimleri
   ========================================================================================= */

/* ---------------------------------------------------------------------------------------
   1) ÇOK DİLLİ ALTYAPI (TR / AR)
   --------------------------------------------------------------------------------------- */

window.I18N = {
    tr: {
        'announce.title': '🚀 ORONTES PAZARYERİ LANSMANINA ÖZEL:',
        'announce.badge': 'İlk 100 İlana 3 Aylık VIP Vitrin ÜCRETSİZ!',
        'btn.filter': 'Filtre',
        'btn.postListing': 'İlan Ver',
        'btn.login': 'Giriş Yap',
        'btn.register': 'Kayıt Ol',
        'btn.account': 'Hesabım',
        'btn.close': 'Kapat',
        'btn.save': 'Kaydet',
        'btn.send': 'Gönder',
        'btn.cancel': 'Vazgeç',

        'hero.title': 'Hatay’ın Yerel Pazaryeri ve Hizmet Ağı',
        'hero.sub': 'Üreticiden, el emeğinden ve yerel ustadan doğrudan alıcıya; komisyonsuz dijital pazar yeri.',
        'nav.showcase': 'Vitrin İlanları',
        'nav.buyRequests': 'Alım Talepleri (Ne Arıyorsun?)',
        'nav.harvest': 'Hasat & Sezon Takvimi',
        'nav.map': 'İlçe Haritası',

        'filter.searchPh': 'Ürün, zeytinyağı, el işi, boyacı, nakliye ara...',
        'filter.allCategories': 'Tüm Kategoriler',
        'filter.allDistricts': 'Tüm Hatay (İlçeler)',
        'filter.price': 'Fiyat (TL):',
        'filter.minPh': 'Min TL',
        'filter.maxPh': 'Maks TL',
        'sort.newest': 'En Yeniler',
        'sort.oldest': 'En Eskiler',
        'sort.priceLow': 'Fiyat: Artan',
        'sort.priceHigh': 'Fiyat: Azalan',

        'section.showcase': 'Vitrin İlanları',
        'listings.count': 'İlan/Hizmet Bulundu',
        'listings.empty': 'Aradığınız kriterlere uygun sonuç bulunamadı.',
        'card.inspect': 'İncele',
        'card.getOffer': 'Teklif Al',
        'card.minOrder': 'Min. sipariş:',
        'card.old': 'Eski:',

        'map.title': 'Hatay İlçe Haritası',
        'map.sub': 'İlçelere göre ilan yoğunluğunu görün; bir ilçeye tıklayarak vitrini filtreleyin.',
        'map.hint': 'Daire büyüklüğü o ilçedeki ilan sayısını gösterir.',

        'br.title': 'Alım Talepleri — "Ne Arıyorsun?"',
        'br.sub': 'Toptancı, hal esnafı, restoran, otel, market ve ihracatçılar aradıkları ürünü buraya yazar; üreticiler doğrudan teklif verir.',
        'br.subStrong': 'Ürünü tek tek aramak yerine teklif toplayın.',
        'br.create': 'Alım Talebi Oluştur',
        'br.searchPh': 'Alım talebi ara: mandalina, zeytinyağı, salçalık biber...',
        'br.onlyOpen': 'Sadece Açık Talepler',
        'br.withClosed': 'Kapananlar Dahil',
        'br.sortUrgent': 'Önce Acil Talepler',
        'br.sortBudgetHigh': 'Bütçe: Azalan',
        'br.sortBudgetLow': 'Bütçe: Artan',
        'br.offer': 'Teklif Ver',
        'br.detail': 'Detay',
        'br.badge': 'Alım Talebi',
        'br.wanted': 'Aranan miktar:',
        'br.deadline': 'Teslim / Termin:',
        'br.matching': 'Vitrinde',
        'br.matchingSuffix': 'uygun ilan var',
        'br.waiting': 'Teklif Bekliyor',
        'br.closed': 'KAPANDI',
        'br.open': 'AÇIK TALEP',
        'br.urgent': 'ACİL',
        'br.recurring': 'DÜZENLİ ALIM',
        'br.groupBuy': 'BİRLİKTE AL',
        'br.empty': 'Bu kriterlerde alım talebi bulunamadı.',

        'harvest.title': 'Hatay Hasat & Sezon Takvimi',
        'harvest.sub': 'Hangi ürün, hangi ilçede, hangi ayda hasat ediliyor? Rekolte dönemlerini görün, hasattan önce üreticiyle ön bağlantı kurun.',
        'harvest.thisMonth': 'Bu Aya Dön',
        'harvest.allYear': 'Tüm Yıl',
        'harvest.searchPh': 'Ürün ara: zeytin, mandalina, defne, biber, bal...',
        'harvest.peak': 'Rekolte zirvesi',
        'harvest.active': 'Hasat / tedarik var',
        'harvest.off': 'Sezon dışı',
        'harvest.seeListings': 'İlanları Gör',
        'harvest.createRequest': 'Alım Talebi Aç',
        'harvest.notifyMe': 'Bana Haber Ver',
        'harvest.notifyOn': 'Bildirim Açık',
        'harvest.hide': 'Gizle',
        'harvest.show': 'Göster',
        'harvest.peakBadge': 'REKOLTE ZİRVESİ',
        'harvest.inShowcase': 'Vitrinde',
        'harvest.listing': 'ilan',

        'detail.desc': 'Açıklama',
        'detail.location': 'Konum',
        'detail.owner': 'İlan Sahibi',
        'detail.contact': 'İletişim',
        'detail.share': 'Paylaş',
        'detail.shareCard': 'Paylaşım Kartı',
        'detail.qr': 'QR Kod',
        'detail.story': 'Üreticinin Hikayesi',
        'detail.video': 'Tanıtım Videosu',
        'detail.subscription': 'Düzenli Sipariş / Abonelik Talebi',
        'detail.offerTitle': 'Fiyat Teklifi / İletişim Talebi Gönder',
        'detail.report': 'Şikayet Et',
        'detail.edit': 'Düzenle',
        'detail.delete': 'Sil',

        'rating.title': 'Değerlendirme Yap',
        'rating.rateSeller': 'Satıcıyı Değerlendir',
        'rating.rateBuyer': 'Alıcıyı Değerlendir',
        'rating.commentPh': 'Kısa yorumunuz (isteğe bağlı)',
        'rating.submit': 'Değerlendirmeyi Gönder',
        'rating.asSeller': 'Satıcı puanı',
        'rating.asBuyer': 'Alıcı puanı',
        'rating.verified': 'Alışveriş Doğrulandı',
        'rating.none': 'Henüz değerlendirme yok',

        'dispute.title': 'Sorun Bildir',
        'dispute.sub': 'Bu işlemle ilgili yaşadığınız sorunu bize iletin. Bildiriminiz kayıt altına alınır.',
        'dispute.reason': 'Sorun Nedeni Seçin*',
        'dispute.notePh': 'Ne yaşandığını kısaca anlatın...',
        'dispute.submit': 'Sorunu Bildir',
        'dispute.btn': 'Sorun Bildir',

        'group.title': 'Birlikte Al (Toplu Alım)',
        'group.join': 'Ben de Katılıyorum',
        'group.leave': 'Katılımdan Ayrıl',
        'group.participants': 'Katılımcılar',
        'group.collected': 'Toplanan',
        'group.target': 'Hedef',
        'group.share': 'Katılımcı Çağır (WhatsApp)',

        'sub.frequency': 'Sıklık',
        'sub.weekly': 'Haftalık',
        'sub.biweekly': '2 Haftada Bir',
        'sub.monthly': 'Aylık',
        'sub.quarterly': '3 Ayda Bir',
        'sub.seasonal': 'Sezonluk',
        'sub.send': 'Abonelik Talebi Gönder',
        'sub.accepted': 'Bu satıcı düzenli/abonelik siparişi kabul ediyor.',

        'inbox.rate': 'Değerlendir',
        'inbox.rated': 'Değerlendirildi',
        'inbox.harvestAlert': 'HASAT BİLDİRİMİ',
        'inbox.subBadge': 'ABONELİK TALEBİ',
        'lang.switch': 'العربية'
    },

    ar: {
        'announce.title': '🚀 عرض خاص بإطلاق سوق أورونتس:',
        'announce.badge': 'أول 100 إعلان يحصلون على واجهة VIP لمدة 3 أشهر مجاناً!',
        'btn.filter': 'تصفية',
        'btn.postListing': 'أضف إعلاناً',
        'btn.login': 'تسجيل الدخول',
        'btn.register': 'إنشاء حساب',
        'btn.account': 'حسابي',
        'btn.close': 'إغلاق',
        'btn.save': 'حفظ',
        'btn.send': 'إرسال',
        'btn.cancel': 'إلغاء',

        'hero.title': 'السوق المحلي وشبكة الخدمات في هاتاي',
        'hero.sub': 'من المنتج والحرفي والصانع المحلي إلى المشتري مباشرة؛ سوق رقمي بدون عمولة.',
        'nav.showcase': 'إعلانات الواجهة',
        'nav.buyRequests': 'طلبات الشراء (ماذا تبحث؟)',
        'nav.harvest': 'تقويم الحصاد والمواسم',
        'nav.map': 'خريطة الأقضية',

        'filter.searchPh': 'ابحث عن منتج، زيت زيتون، حرف يدوية، دهان، نقل...',
        'filter.allCategories': 'جميع الفئات',
        'filter.allDistricts': 'كل هاتاي (الأقضية)',
        'filter.price': 'السعر (ليرة):',
        'filter.minPh': 'أدنى',
        'filter.maxPh': 'أقصى',
        'sort.newest': 'الأحدث',
        'sort.oldest': 'الأقدم',
        'sort.priceLow': 'السعر: تصاعدي',
        'sort.priceHigh': 'السعر: تنازلي',

        'section.showcase': 'إعلانات الواجهة',
        'listings.count': 'إعلان / خدمة',
        'listings.empty': 'لا توجد نتائج مطابقة لمعايير البحث.',
        'card.inspect': 'عرض',
        'card.getOffer': 'اطلب عرض سعر',
        'card.minOrder': 'الحد الأدنى للطلب:',
        'card.old': 'السابق:',

        'map.title': 'خريطة أقضية هاتاي',
        'map.sub': 'شاهد كثافة الإعلانات حسب القضاء، واضغط على قضاء لتصفية الواجهة.',
        'map.hint': 'حجم الدائرة يدل على عدد الإعلانات في ذلك القضاء.',

        'br.title': 'طلبات الشراء — "ماذا تبحث؟"',
        'br.sub': 'تجار الجملة وأصحاب الهال والمطاعم والفنادق والأسواق والمصدّرون يكتبون ما يبحثون عنه هنا، والمنتجون يقدمون عروضهم مباشرة.',
        'br.subStrong': 'اجمع العروض بدل البحث عن كل منتج على حدة.',
        'br.create': 'أنشئ طلب شراء',
        'br.searchPh': 'ابحث في طلبات الشراء: يوسفي، زيت زيتون، فلفل...',
        'br.onlyOpen': 'الطلبات المفتوحة فقط',
        'br.withClosed': 'مع الطلبات المغلقة',
        'br.sortUrgent': 'العاجلة أولاً',
        'br.sortBudgetHigh': 'الميزانية: تنازلي',
        'br.sortBudgetLow': 'الميزانية: تصاعدي',
        'br.offer': 'قدّم عرضاً',
        'br.detail': 'التفاصيل',
        'br.badge': 'طلب شراء',
        'br.wanted': 'الكمية المطلوبة:',
        'br.deadline': 'موعد التسليم:',
        'br.matching': 'يوجد',
        'br.matchingSuffix': 'إعلان مناسب في الواجهة',
        'br.waiting': 'بانتظار العروض',
        'br.closed': 'مغلق',
        'br.open': 'طلب مفتوح',
        'br.urgent': 'عاجل',
        'br.recurring': 'شراء منتظم',
        'br.groupBuy': 'شراء جماعي',
        'br.empty': 'لا توجد طلبات شراء بهذه المعايير.',

        'harvest.title': 'تقويم الحصاد والمواسم في هاتاي',
        'harvest.sub': 'أي منتج يُحصد في أي قضاء وفي أي شهر؟ اطّلع على مواسم الإنتاج وتواصل مع المنتج قبل الحصاد.',
        'harvest.thisMonth': 'العودة لهذا الشهر',
        'harvest.allYear': 'كل السنة',
        'harvest.searchPh': 'ابحث عن منتج: زيتون، يوسفي، غار، فلفل، عسل...',
        'harvest.peak': 'ذروة الموسم',
        'harvest.active': 'يوجد حصاد / توريد',
        'harvest.off': 'خارج الموسم',
        'harvest.seeListings': 'شاهد الإعلانات',
        'harvest.createRequest': 'أنشئ طلب شراء',
        'harvest.notifyMe': 'نبّهني',
        'harvest.notifyOn': 'التنبيه مفعّل',
        'harvest.hide': 'إخفاء',
        'harvest.show': 'إظهار',
        'harvest.peakBadge': 'ذروة الموسم',
        'harvest.inShowcase': 'في الواجهة',
        'harvest.listing': 'إعلان',

        'detail.desc': 'الوصف',
        'detail.location': 'الموقع',
        'detail.owner': 'صاحب الإعلان',
        'detail.contact': 'تواصل',
        'detail.share': 'مشاركة',
        'detail.shareCard': 'بطاقة المشاركة',
        'detail.qr': 'رمز QR',
        'detail.story': 'قصة المنتج',
        'detail.video': 'فيديو تعريفي',
        'detail.subscription': 'طلب اشتراك / توريد منتظم',
        'detail.offerTitle': 'أرسل عرض سعر / طلب تواصل',
        'detail.report': 'إبلاغ',
        'detail.edit': 'تعديل',
        'detail.delete': 'حذف',

        'rating.title': 'أضف تقييماً',
        'rating.rateSeller': 'قيّم البائع',
        'rating.rateBuyer': 'قيّم المشتري',
        'rating.commentPh': 'تعليق قصير (اختياري)',
        'rating.submit': 'إرسال التقييم',
        'rating.asSeller': 'تقييمه كبائع',
        'rating.asBuyer': 'تقييمه كمشترٍ',
        'rating.verified': 'عملية موثّقة',
        'rating.none': 'لا توجد تقييمات بعد',

        'dispute.title': 'الإبلاغ عن مشكلة',
        'dispute.sub': 'أخبرنا بالمشكلة التي واجهتها في هذه المعاملة. سيتم تسجيل بلاغك.',
        'dispute.reason': 'اختر سبب المشكلة*',
        'dispute.notePh': 'اشرح باختصار ما حدث...',
        'dispute.submit': 'إرسال البلاغ',
        'dispute.btn': 'الإبلاغ عن مشكلة',

        'group.title': 'الشراء الجماعي',
        'group.join': 'أريد المشاركة',
        'group.leave': 'إلغاء مشاركتي',
        'group.participants': 'المشاركون',
        'group.collected': 'تم جمع',
        'group.target': 'الهدف',
        'group.share': 'ادعُ مشاركين (واتساب)',

        'sub.frequency': 'التكرار',
        'sub.weekly': 'أسبوعياً',
        'sub.biweekly': 'كل أسبوعين',
        'sub.monthly': 'شهرياً',
        'sub.quarterly': 'كل 3 أشهر',
        'sub.seasonal': 'موسمياً',
        'sub.send': 'إرسال طلب الاشتراك',
        'sub.accepted': 'هذا البائع يقبل الطلبات المنتظمة / الاشتراكات.',

        'inbox.rate': 'قيّم',
        'inbox.rated': 'تم التقييم',
        'inbox.harvestAlert': 'تنبيه حصاد',
        'inbox.subBadge': 'طلب اشتراك',
        'lang.switch': 'Türkçe'
    }
};

window.currentLang = (function () {
    try { return localStorage.getItem('orontes_lang') || 'tr'; } catch (e) { return 'tr'; }
})();

/* t('anahtar', 'Türkçe yedek metin') */
window.t = function (key, fallbackTr) {
    const dict = window.I18N[window.currentLang] || window.I18N.tr;
    if (dict && dict[key]) return dict[key];
    if (window.I18N.tr[key]) return window.I18N.tr[key];
    return fallbackTr !== undefined ? fallbackTr : key;
};

window.applyTranslations = function () {
    const lang = window.currentLang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const val = window.t(el.getAttribute('data-i18n'), el.textContent);
        el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        el.setAttribute('placeholder', window.t(el.getAttribute('data-i18n-ph'), el.getAttribute('placeholder')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.setAttribute('title', window.t(el.getAttribute('data-i18n-title'), el.getAttribute('title')));
    });

    document.documentElement.setAttribute('lang', lang === 'ar' ? 'ar' : 'tr');
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.body.classList.toggle('orontes-rtl', lang === 'ar');

    // İlçe ve kategori seçeneklerinin etiketlerini çevir (value'lar Türkçe kalır)
    ['district-filter', 'br-district-filter', 'form-district'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        Array.from(sel.options).forEach(opt => {
            if (!opt.value) return;
            if (window.AR_DISTRICTS[opt.value] === undefined) return;
            const warn = opt.value === 'Hatay Dışı' ? '⚠️ ' : '';
            opt.textContent = warn + window.trDistrict(opt.value);
        });
    });

    ['category-filter', 'br-category-filter', 'form-category'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        Array.from(sel.options).forEach(opt => {
            if (!opt.value) return;
            if (window.AR_CATEGORIES[opt.value] === undefined) return;
            const emoji = categoryEmojis[opt.value] || '';
            opt.textContent = `${emoji} ${window.trCategory(opt.value)}`.trim();
        });
    });

    const langBtn = document.getElementById('lang-toggle-text');
    if (langBtn) langBtn.textContent = window.t('lang.switch', 'العربية');
};

window.toggleLanguage = function () {
    window.currentLang = window.currentLang === 'tr' ? 'ar' : 'tr';
    try { localStorage.setItem('orontes_lang', window.currentLang); } catch (e) {}

    window.applyTranslations();

    // Dinamik içerikleri yeniden bas
    if (typeof window.renderListings === 'function') window.renderListings();
    if (typeof window.renderBuyRequests === 'function') window.renderBuyRequests();
    if (typeof window.renderHarvestCalendar === 'function') window.renderHarvestCalendar();
    if (typeof window.updateMarqueeData === 'function') window.updateMarqueeData();

    window.showToast(window.currentLang === 'ar' ? 'تم تغيير اللغة إلى العربية.' : 'Dil Türkçe olarak ayarlandı.', 'success');
};

/* Arapça ilçe & kategori & ay adları */
window.AR_DISTRICTS = {
    'Altınözü': 'ألتن أوزو', 'Antakya': 'أنطاكيا', 'Arsuz': 'أرسوز', 'Belen': 'بيلان',
    'Defne': 'دفنة', 'Dörtyol': 'دورتيول', 'Erzin': 'أرزين', 'Hassa': 'حاصة',
    'İskenderun': 'الإسكندرونة', 'Kırıkhan': 'كريخان', 'Kumlu': 'كوملو', 'Payas': 'بياس',
    'Reyhanlı': 'الريحانية', 'Samandağ': 'سمنداغ', 'Yayladağı': 'يايلاداغ',
    'Tüm Hatay': 'كل هاتاي', 'Hatay Dışı': 'خارج هاتاي'
};

window.AR_CATEGORIES = {
    'Zeytin & Yağ': 'الزيتون والزيت',
    'Narenciye': 'الحمضيات',
    'Salça & Sos': 'معجون الطماطم والصلصات',
    'Bakliyat & Hububat': 'البقوليات والحبوب',
    'Sebze & Sera': 'الخضار والدفيئات',
    'Canlı Hayvan & Süt': 'المواشي والحليب',
    'Fide & Tohum': 'الشتلات والبذور',
    'El Sanatları': 'الحرف اليدوية',
    'Giyim & Aksesuar': 'الملابس والإكسسوارات',
    'Ev Yapımı Ürünler': 'منتجات منزلية الصنع',
    'Tadilat & Tamirat': 'الترميم والصيانة',
    'Özel Ders': 'دروس خصوصية',
    'Temizlik': 'التنظيف',
    'Tarım İşçiliği': 'العمالة الزراعية',
    'Nakliye & Lojistik': 'النقل والخدمات اللوجستية',
    'Diğer': 'أخرى'
};

window.AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
window.AR_MONTHS_SHORT = ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'];

window.trDistrict = function (name) {
    if (window.currentLang === 'ar' && window.AR_DISTRICTS[name]) return window.AR_DISTRICTS[name];
    return name;
};
window.trCategory = function (name) {
    if (window.currentLang === 'ar' && window.AR_CATEGORIES[name]) return window.AR_CATEGORIES[name];
    return name;
};
window.trMonth = function (index1based, short) {
    const i = index1based - 1;
    if (window.currentLang === 'ar') return short ? window.AR_MONTHS_SHORT[i] : window.AR_MONTHS[i];
    return short ? window.TR_MONTHS_SHORT[i] : window.TR_MONTHS[i];
};

/* ---------------------------------------------------------------------------------------
   2) KATLANABİLİR (AÇ / KAPA) BÖLÜMLER
   --------------------------------------------------------------------------------------- */

window.toggleCollapsible = function (bodyId, btnId, storageKey) {
    const body = document.getElementById(bodyId);
    const btn = document.getElementById(btnId);
    if (!body) return;

    const willHide = !body.classList.contains('hidden');
    body.classList.toggle('hidden', willHide);

    if (btn) {
        const icon = btn.querySelector('i');
        const label = btn.querySelector('span');
        if (icon) icon.className = willHide ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
        if (label) label.textContent = willHide ? window.t('harvest.show', 'Göster') : window.t('harvest.hide', 'Gizle');
    }

    if (storageKey) {
        try { localStorage.setItem(storageKey, willHide ? 'closed' : 'open'); } catch (e) {}
    }

    // Harita/takvim yeniden görünür olduğunda boyutlandırmayı tazele
    if (!willHide) {
        setTimeout(() => {
            if (bodyId === 'district-map-body' && typeof window.renderDistrictMap === 'function') {
                window.renderDistrictMap();
                if (window.districtMapInstance) window.districtMapInstance.invalidateSize();
            }
            if (bodyId === 'harvest-body' && typeof window.renderHarvestCalendar === 'function') window.renderHarvestCalendar();
        }, 220);
    }
};

window.initCollapsibles = function () {
    const setup = (bodyId, btnId, storageKey, defaultClosed) => {
        const body = document.getElementById(bodyId);
        const btn = document.getElementById(btnId);
        if (!body || !btn) return;
        let state = null;
        try { state = localStorage.getItem(storageKey); } catch (e) {}
        const shouldClose = state ? state === 'closed' : !!defaultClosed;
        body.classList.toggle('hidden', shouldClose);
        const icon = btn.querySelector('i');
        const label = btn.querySelector('span');
        if (icon) icon.className = shouldClose ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
        if (label) label.textContent = shouldClose ? window.t('harvest.show', 'Göster') : window.t('harvest.hide', 'Gizle');
    };
    setup('harvest-body', 'harvest-toggle-btn', 'orontes_harvest_open', false);
    setup('district-map-body', 'district-map-toggle-btn', 'orontes_map_open', true);
};

/* ---------------------------------------------------------------------------------------
   3) DERİN BAĞLANTI (?ilan=... / ?talep=...)
   --------------------------------------------------------------------------------------- */

window.getListingShareUrl = function (id) {
    const base = window.location.origin + window.location.pathname;
    return `${base}?ilan=${encodeURIComponent(id)}`;
};

window.getBuyRequestShareUrl = function (id) {
    const base = window.location.origin + window.location.pathname;
    return `${base}?talep=${encodeURIComponent(id)}`;
};

/* İlanı listede bulamazsa doğrudan veritabanından çeker */
window.openListingById = async function (id) {
    if (!id) return;
    const local = (window.listings || []).find(l => l.id === id);
    if (local) { window.openDetailModal(id); return; }

    try {
        const snap = await get(ref(db, 'listings/' + id));
        if (!snap.exists()) {
            window.showToast('Bağlantıdaki ilan bulunamadı veya kaldırılmış.', 'warning');
            return;
        }
        const item = { id: snap.key, ...snap.val() };
        window.listings = [...(window.listings || []), item];
        window.openDetailModal(id);
    } catch (err) {
        window.showToast('İlan yüklenemedi.', 'error');
    }
};

window.openBuyRequestById = async function (id) {
    if (!id) return;
    const local = (window.buyRequests || []).find(r => r.id === id);
    if (local) { window.openBuyRequestDetail(id); return; }

    try {
        const snap = await get(ref(db, 'buyRequests/' + id));
        if (!snap.exists()) {
            window.showToast('Bağlantıdaki alım talebi bulunamadı.', 'warning');
            return;
        }
        window.buyRequests = [...(window.buyRequests || []), { id: snap.key, ...snap.val() }];
        window.openBuyRequestDetail(id);
    } catch (err) {
        window.showToast('Alım talebi yüklenemedi.', 'error');
    }
};

window.handleDeepLink = function () {
    try {
        const params = new URLSearchParams(window.location.search);
        const ilan = params.get('ilan');
        const talep = params.get('talep');
        if (ilan) setTimeout(() => window.openListingById(ilan), 1200);
        else if (talep) setTimeout(() => window.openBuyRequestById(talep), 1200);
    } catch (e) {}
};

/* ---------------------------------------------------------------------------------------
   4) QR KOD ÜRETİMİ
   --------------------------------------------------------------------------------------- */

window.qrTargetUrl = '';

window.buildQrCanvas = function (text, size) {
    // qrcodejs kütüphanesi ile gizli bir alanda QR üretip canvas'ı geri döndürür
    if (typeof QRCode === 'undefined') return null;
    const holder = document.createElement('div');
    holder.style.display = 'none';
    document.body.appendChild(holder);
    try {
        new QRCode(holder, {
            text: text,
            width: size || 240,
            height: size || 240,
            colorDark: '#07332c',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
        const canvas = holder.querySelector('canvas');
        let out = null;
        if (canvas) {
            out = document.createElement('canvas');
            out.width = canvas.width;
            out.height = canvas.height;
            out.getContext('2d').drawImage(canvas, 0, 0);
        }
        return out;
    } catch (err) {
        return null;
    } finally {
        holder.remove();
    }
};

window.openQrModal = function (listingId) {
    const id = listingId || window.activeListingId;
    const item = (window.listings || []).find(l => l.id === id);
    if (!item) return;

    const url = window.getListingShareUrl(id);
    window.qrTargetUrl = url;

    document.getElementById('qr-listing-title').innerText = item.title || '';
    document.getElementById('qr-link-text').innerText = url;

    const box = document.getElementById('qr-canvas-box');
    box.innerHTML = '';

    const canvas = window.buildQrCanvas(url, 240);
    if (canvas) {
        canvas.id = 'qr-main-canvas';
        canvas.className = 'mx-auto rounded-xl border-4 border-white shadow';
        box.appendChild(canvas);
    } else {
        box.innerHTML = `<p class="text-xs text-red-500 py-6">QR üretici yüklenemedi. İnternet bağlantınızı kontrol edip sayfayı yenileyin.</p>`;
    }

    document.getElementById('qr-modal').classList.remove('hidden');
};

window.closeQrModal = function () { document.getElementById('qr-modal').classList.add('hidden'); };

window.downloadQr = function () {
    const canvas = document.getElementById('qr-main-canvas');
    if (!canvas) { window.showToast('QR kod hazır değil.', 'error'); return; }

    const out = document.createElement('canvas');
    const pad = 60;
    out.width = canvas.width + pad * 2;
    out.height = canvas.height + pad * 2 + 90;
    const ctx = out.getContext('2d');

    ctx.fillStyle = '#07332c';
    ctx.fillRect(0, 0, out.width, out.height);

    ctx.fillStyle = '#bca879';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ORONTES', out.width / 2, 44);

    ctx.drawImage(canvas, pad, 64);

    ctx.fillStyle = '#afb7ac';
    ctx.font = '17px sans-serif';
    ctx.fillText('Karekodu okutun, ilanı görün', out.width / 2, out.height - 26);

    const link = document.createElement('a');
    link.download = `orontes-qr-${Date.now()}.png`;
    link.href = out.toDataURL('image/png');
    link.click();
    window.showToast('QR kod indirildi. Tezgâhınıza asabilirsiniz!', 'success');
};

window.copyQrLink = function () {
    const url = window.qrTargetUrl;
    if (!url) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url)
            .then(() => window.showToast('İlan bağlantısı kopyalandı.', 'success'))
            .catch(() => window.showToast('Kopyalanamadı, bağlantıyı elle seçin.', 'warning'));
    } else {
        window.showToast('Tarayıcınız kopyalamayı desteklemiyor.', 'warning');
    }
};

/* ---------------------------------------------------------------------------------------
   5) İLAN PAYLAŞIM KARTI (Otomatik görsel üretimi)
   --------------------------------------------------------------------------------------- */

window.shareCardBlob = null;

window.loadImageForCanvas = function (src) {
    return new Promise((resolve) => {
        if (!src) { resolve(null); return; }
        const img = new Image();
        if (!/^data:/i.test(src)) img.crossOrigin = 'anonymous';
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
        cut[maxLines - 1] = cut[maxLines - 1].replace(/.{3}$/, '') + '...';
        return cut;
    }
    return lines;
};

window.openShareCardModal = async function (listingId) {
    const id = listingId || window.activeListingId;
    const item = (window.listings || []).find(l => l.id === id);
    if (!item) return;

    document.getElementById('sharecard-modal').classList.remove('hidden');
    const box = document.getElementById('sharecard-canvas-box');
    box.innerHTML = `<div class="py-16 text-center text-xs text-gray-400"><i class="fa-solid fa-spinner fa-spin text-2xl block mb-2"></i>Paylaşım kartı hazırlanıyor...</div>`;

    const W = 1080, H = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Arka plan
    ctx.fillStyle = '#07332c';
    ctx.fillRect(0, 0, W, H);

    // Ürün görseli (üst alan)
    const photoH = 600;
    const img = await window.loadImageForCanvas(item.image);
    let tainted = false;

    if (img) {
        const ratio = Math.max(W / img.width, photoH / img.height);
        const dw = img.width * ratio, dh = img.height * ratio;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, photoH);
        ctx.clip();
        ctx.drawImage(img, (W - dw) / 2, (photoH - dh) / 2, dw, dh);
        ctx.restore();
        // Alt karartma
        const grad = ctx.createLinearGradient(0, photoH - 220, 0, photoH);
        grad.addColorStop(0, 'rgba(7,51,44,0)');
        grad.addColorStop(1, 'rgba(7,51,44,0.95)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, photoH - 220, W, 220);
    } else {
        ctx.fillStyle = '#485b46';
        ctx.fillRect(0, 0, W, photoH);
        ctx.fillStyle = '#afb7ac';
        ctx.font = 'bold 180px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(categoryEmojis[item.category] || '📦', W / 2, photoH / 2 + 60);
    }

    // ORONTES logosu (altın rozet)
    const logoW = 300, logoH = 78;
    ctx.fillStyle = '#bca879';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(50, 46, logoW, logoH, 20); ctx.fill(); }
    else ctx.fillRect(50, 46, logoW, logoH);
    ctx.fillStyle = '#07332c';
    ctx.font = 'bold 46px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ORONTES', 50 + logoW / 2, 46 + 56);

    // Rozetler
    let badgeX = 50;
    const badgeY = photoH - 96;
    const drawBadge = (text, bg, fg) => {
        ctx.font = 'bold 30px sans-serif';
        const w = ctx.measureText(text).width + 44;
        ctx.fillStyle = bg;
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(badgeX, badgeY, w, 52, 14); ctx.fill(); }
        else ctx.fillRect(badgeX, badgeY, w, 52);
        ctx.fillStyle = fg;
        ctx.textAlign = 'left';
        ctx.fillText(text, badgeX + 22, badgeY + 36);
        badgeX += w + 14;
    };
    const isVipActive = item.isVip && (!item.vipExpireDate || Date.now() < item.vipExpireDate);
    if (isVipActive) drawBadge('VIP', '#bca879', '#07332c');
    if (item.isUrgent) drawBadge('ACİL', '#dc2626', '#ffffff');
    if (item.businessType === 'Toptancı') drawBadge('TOPTAN', '#485b46', '#ffffff');
    if (item.harvestDate) drawBadge('ÖN SİPARİŞ', '#f97316', '#ffffff');

    // Başlık
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 58px sans-serif';
    const titleLines = window.wrapCanvasText(ctx, item.title || '', W - 100, 2);
    let ty = photoH + 96;
    titleLines.forEach(l => { ctx.fillText(l, 50, ty); ty += 68; });

    // Konum + kategori
    ctx.fillStyle = '#afb7ac';
    ctx.font = '36px sans-serif';
    const locText = `📍 ${item.outsideHatay ? window.getListingLocationText(item) : 'Hatay / ' + (item.district || '')}`;
    ctx.fillText(locText, 50, ty + 8);
    ctx.fillText(`${categoryEmojis[item.category] || '📦'} ${item.category || ''}`, 50, ty + 62);

    // Fiyat kutusu
    const priceBoxY = H - 250;
    ctx.fillStyle = '#bca879';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(50, priceBoxY, 560, 140, 24); ctx.fill(); }
    else ctx.fillRect(50, priceBoxY, 560, 140);
    ctx.fillStyle = '#07332c';
    ctx.font = 'bold 78px sans-serif';
    ctx.fillText(`${item.price} TL`, 84, priceBoxY + 96);
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(item.unit ? `/ ${item.unit}` : '', 84 + ctx.measureText(`${item.price} TL`).width + 20, priceBoxY + 96);

    // QR kod (sağ alt)
    const qr = window.buildQrCanvas(window.getListingShareUrl(id), 190);
    if (qr) {
        ctx.fillStyle = '#ffffff';
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(W - 240, priceBoxY - 6, 200, 200, 18); ctx.fill(); }
        else ctx.fillRect(W - 240, priceBoxY - 6, 200, 200);
        ctx.drawImage(qr, W - 235, priceBoxY - 1, 190, 190);
    }

    // Alt bilgi
    ctx.fillStyle = '#afb7ac';
    ctx.font = '30px sans-serif';
    ctx.fillText('Hatay Yerel Pazaryeri · Komisyonsuz', 50, H - 60);

    // Önizleme
    let dataUrl = null;
    try {
        dataUrl = canvas.toDataURL('image/png');
    } catch (err) {
        tainted = true;
    }

    if (tainted) {
        // Görsel CORS nedeniyle canvas'ı kirletti → fotoğrafsız sürüm üret
        ctx.fillStyle = '#485b46';
        ctx.fillRect(0, 0, W, photoH);
        ctx.fillStyle = '#afb7ac';
        ctx.font = 'bold 180px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(categoryEmojis[item.category] || '📦', W / 2, photoH / 2 + 60);
        try { dataUrl = canvas.toDataURL('image/png'); } catch (e2) { dataUrl = null; }
    }

    box.innerHTML = '';
    if (!dataUrl) {
        box.innerHTML = `<p class="text-xs text-red-500 py-8 text-center">Paylaşım kartı oluşturulamadı.</p>`;
        return;
    }

    const preview = document.createElement('img');
    preview.src = dataUrl;
    preview.className = 'w-full rounded-xl border border-gray-200 shadow-sm';
    box.appendChild(preview);

    window.shareCardDataUrl = dataUrl;
    window.shareCardListingId = id;
};

window.closeShareCardModal = function () { document.getElementById('sharecard-modal').classList.add('hidden'); };

window.downloadShareCard = function () {
    if (!window.shareCardDataUrl) { window.showToast('Kart henüz hazır değil.', 'warning'); return; }
    const link = document.createElement('a');
    link.download = `orontes-ilan-${window.shareCardListingId || Date.now()}.png`;
    link.href = window.shareCardDataUrl;
    link.click();
    window.showToast('Paylaşım kartı indirildi. Instagram/WhatsApp’ta paylaşabilirsiniz!', 'success');
};

window.shareCardNative = async function () {
    if (!window.shareCardDataUrl) { window.showToast('Kart henüz hazır değil.', 'warning'); return; }
    const item = (window.listings || []).find(l => l.id === window.shareCardListingId);
    const shareText = `📌 ${item ? item.title : 'ORONTES ilanı'}\n💰 ${item ? item.price + ' TL' : ''} ${item && item.unit ? '/ ' + item.unit : ''}\n📍 ${item ? window.getListingLocationText(item) : 'Hatay'}\n\n${window.getListingShareUrl(window.shareCardListingId)}`;

    try {
        const res = await fetch(window.shareCardDataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'orontes-ilan.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'ORONTES', text: shareText });
            return;
        }
    } catch (err) { /* paylaşım desteklenmiyorsa aşağıya düşer */ }

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
    window.showToast('Görseli WhatsApp’a eklemek için önce "Görseli İndir" deyin.', 'warning');
};

/* ---------------------------------------------------------------------------------------
   6) ÜRETİCİ HİKAYESİ & KISA VİDEO
   --------------------------------------------------------------------------------------- */

window.getEmbedVideoUrl = function (url) {
    const u = String(url || '').trim();
    if (!u) return null;
    let m = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    if (m) return { type: 'iframe', src: `https://www.youtube.com/embed/${m[1]}` };
    if (/^https?:\/\//i.test(u)) return { type: 'link', src: u };
    return null;
};

window.renderListingExtras = function (item) {
    // Üretici hikayesi
    const storyBox = document.getElementById('detail-story-box');
    const storyText = document.getElementById('detail-story-text');
    if (storyBox && storyText) {
        if (item.story && String(item.story).trim()) {
            storyText.innerText = item.story;
            storyBox.classList.remove('hidden');
        } else {
            storyBox.classList.add('hidden');
        }
    }

    // Video
    const videoBox = document.getElementById('detail-video-box');
    const videoInner = document.getElementById('detail-video-inner');
    if (videoBox && videoInner) {
        const embed = window.getEmbedVideoUrl(item.videoUrl);
        if (embed) {
            videoInner.innerHTML = embed.type === 'iframe'
                ? `<iframe src="${escapeHtml(embed.src)}" class="w-full h-48 rounded-xl border-0" allowfullscreen loading="lazy" title="Tanıtım videosu"></iframe>`
                : `<a href="${escapeHtml(embed.src)}" target="_blank" rel="noopener" class="flex items-center justify-center gap-2 bg-lux-dark text-white font-bold py-2.5 rounded-xl text-xs hover:bg-lux-olive transition"><i class="fa-solid fa-circle-play"></i> Videoyu Aç</a>`;
            videoBox.classList.remove('hidden');
        } else {
            videoInner.innerHTML = '';
            videoBox.classList.add('hidden');
        }
    }

    // Abonelik kutusu (hizmet ilanları hariç)
    const subBox = document.getElementById('detail-subscription-box');
    const subNote = document.getElementById('detail-sub-accepted-note');
    if (subBox) {
        const isService = item.listingType === 'hizmet';
        subBox.classList.toggle('hidden', isService);
        if (subNote) subNote.classList.toggle('hidden', !item.allowSubscription);
        const q = document.getElementById('sub-qty-input');
        const n = document.getElementById('sub-note-input');
        if (q) q.value = '';
        if (n) n.value = '';
    }
};

/* ---------------------------------------------------------------------------------------
   7) İNTERAKTİF İLÇE HARİTASI
   --------------------------------------------------------------------------------------- */

window.districtMapInstance = null;
window.districtMapLayer = null;

window.renderDistrictMap = function () {
    const el = document.getElementById('district-map');
    if (!el || typeof L === 'undefined') return;

    if (!window.districtMapInstance) {
        window.districtMapInstance = L.map('district-map', { scrollWheelZoom: false }).setView([36.35, 36.2], 9);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18, attribution: '© OpenStreetMap'
        }).addTo(window.districtMapInstance);
    }

    if (window.districtMapLayer) {
        window.districtMapInstance.removeLayer(window.districtMapLayer);
    }
    window.districtMapLayer = L.layerGroup();

    const counts = {};
    (window.listings || []).forEach(l => {
        if (l.district && !l.outsideHatay) counts[l.district] = (counts[l.district] || 0) + 1;
    });

    const activeDistrict = (document.getElementById('district-filter') || {}).value || '';

    window.HATAY_DISTRICT_LIST.forEach(name => {
        const coords = districtCoords[name];
        if (!coords) return;
        const count = counts[name] || 0;
        const isActive = activeDistrict === name;

        const marker = L.circleMarker(coords, {
            radius: Math.min(30, 9 + count * 2.6),
            fillColor: isActive ? '#bca879' : (count > 0 ? '#07332c' : '#afb7ac'),
            color: isActive ? '#07332c' : '#ffffff',
            weight: isActive ? 3 : 2,
            opacity: 1,
            fillOpacity: count > 0 ? 0.85 : 0.45
        });

        marker.bindTooltip(`${window.trDistrict(name)} — ${count} ${window.t('harvest.listing', 'ilan')}`, {
            permanent: false, direction: 'top', className: 'orontes-map-tip'
        });

        marker.bindPopup(`
            <div style="text-align:center; min-width:150px;">
                <b style="font-size:13px; color:#07332c;">${escapeHtml(window.trDistrict(name))}</b><br>
                <span style="font-size:11px; color:#666;">${count} ${escapeHtml(window.t('harvest.listing', 'ilan'))}</span><br>
                <button onclick="window.filterByDistrictFromMap('${escapeHtml(name)}')" style="margin-top:8px; padding:5px 12px; background:#07332c; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:11px; width:100%;">
                    ${escapeHtml(window.t('harvest.seeListings', 'İlanları Gör'))}
                </button>
            </div>
        `);

        marker.on('click', () => marker.openPopup());
        window.districtMapLayer.addLayer(marker);
    });

    window.districtMapLayer.addTo(window.districtMapInstance);

    setTimeout(() => {
        if (window.districtMapInstance) window.districtMapInstance.invalidateSize();
    }, 250);
};

window.filterByDistrictFromMap = function (district) {
    const distEl = document.getElementById('district-filter');
    if (distEl) distEl.value = district;
    window.filterListings();
    window.showToast(`${window.trDistrict(district)} ilçesindeki ilanlar listelendi.`, 'success');
    const target = document.getElementById('filter-section');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/* ---------------------------------------------------------------------------------------
   8) HASAT TAKVİMİ "BANA HABER VER" BİLDİRİMLERİ
   --------------------------------------------------------------------------------------- */

window.harvestAlertKey = function (name) {
    return String(name || '')
        .toLocaleLowerCase('tr-TR')
        .replace(/[ığüşöç]/g, ch => ({ 'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c' }[ch]))
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
};

window.isHarvestAlertOn = function (productName) {
    const key = window.harvestAlertKey(productName);
    return !!(window.userExtraData && window.userExtraData.harvestAlerts && window.userExtraData.harvestAlerts[key]);
};

window.toggleHarvestAlert = async function (productName) {
    if (!window.currentUser) {
        window.showToast('Hasat bildirimi almak için giriş yapmalısınız.', 'warning');
        window.openAuthModal('login');
        return;
    }

    const key = window.harvestAlertKey(productName);
    const product = (window.HATAY_HARVEST_DATA || []).find(p => window.harvestAlertKey(p.name) === key);
    if (!product) return;

    if (!window.userExtraData.harvestAlerts) window.userExtraData.harvestAlerts = {};

    try {
        if (window.userExtraData.harvestAlerts[key]) {
            await remove(ref(db, `users/${window.currentUser.uid}/harvestAlerts/${key}`));
            delete window.userExtraData.harvestAlerts[key];
            window.showToast(`"${product.name}" hasat bildirimi kapatıldı.`, 'success');
        } else {
            const payload = {
                name: product.name,
                category: product.category,
                keyword: product.keyword,
                months: product.months,
                districts: product.districts,
                createdAt: Date.now()
            };
            await update(ref(db, `users/${window.currentUser.uid}/harvestAlerts/${key}`), payload);
            window.userExtraData.harvestAlerts[key] = payload;

            const nowMonth = new Date().getMonth() + 1;
            const inSeason = product.months.includes(nowMonth);
            window.showToast(
                inSeason
                    ? `🔔 "${product.name}" bildirimi açıldı — ürün şu an hasat sezonunda! Gelen kutunuzu kontrol edin.`
                    : `🔔 "${product.name}" hasat sezonu başlayınca gelen kutunuza bildirim düşecek.`,
                'success'
            );
        }
        window.renderHarvestCalendar();
    } catch (err) {
        window.showToast('Bildirim ayarı kaydedilemedi: ' + err.message, 'error');
    }
};

/* Gelen kutusu için sanal hasat bildirimleri üretir */
window.buildHarvestAlerts = function () {
    const out = [];
    if (!window.currentUser || !window.userExtraData || !window.userExtraData.harvestAlerts) return out;

    const now = new Date();
    const month = now.getMonth() + 1;
    const nextMonth = month === 12 ? 1 : month + 1;

    Object.keys(window.userExtraData.harvestAlerts).forEach(key => {
        const a = window.userExtraData.harvestAlerts[key] || {};
        const months = Array.isArray(a.months) ? a.months : [];
        if (!months.length) return;

        const inSeason = months.includes(month);
        const startingSoon = !inSeason && months.includes(nextMonth);
        if (!inSeason && !startingSoon) return;

        const matchCount = (window.listings || []).filter(l =>
            l.category === a.category &&
            `${l.title} ${l.desc || ''}`.toLocaleLowerCase('tr-TR').includes(String(a.keyword || '').toLocaleLowerCase('tr-TR'))
        ).length;

        out.push({
            id: 'harvest_' + key,
            type: 'harvest_alert',
            alertKey: key,
            productName: a.name,
            category: a.category,
            keyword: a.keyword,
            districts: a.districts || [],
            inSeason: inSeason,
            month: inSeason ? month : nextMonth,
            matchCount: matchCount,
            date: Date.now() - (inSeason ? 1000 : 2000)
        });
    });

    return out;
};

window.renderHarvestAlertCard = function (o) {
    const monthName = window.trMonth(o.month);
    const districts = (o.districts || []).slice(0, 4).map(d => window.trDistrict(d)).join(' · ');

    return `
        <div class="flex justify-between items-center font-bold text-orange-900 border-b border-orange-200/50 pb-1 mb-1">
            <span class="text-[10px] bg-orange-200 text-orange-900 px-1.5 py-0.5 rounded"><i class="fa-solid fa-seedling mr-1"></i> ${escapeHtml(window.t('inbox.harvestAlert', 'HASAT BİLDİRİMİ'))}</span>
            <span class="text-orange-700 text-[10px] font-bold">${escapeHtml(monthName)}</span>
        </div>
        <p class="font-bold text-lux-dark">🌱 ${escapeHtml(o.productName || '')}</p>
        <p class="text-[10px] text-gray-600">
            ${o.inSeason
                ? `Bu ürün <b>${escapeHtml(monthName)}</b> ayında hasat sezonunda. Üreticiyle şimdi bağlantı kurabilirsiniz.`
                : `Hasat sezonu <b>${escapeHtml(monthName)}</b> ayında başlıyor. Ön bağlantı için doğru zaman!`}
        </p>
        ${districts ? `<p class="text-[10px] text-gray-500"><i class="fa-solid fa-location-dot text-lux-gold"></i> ${escapeHtml(districts)}</p>` : ''}
        ${o.matchCount > 0 ? `<p class="text-[10px] text-emerald-700 font-semibold"><i class="fa-solid fa-store"></i> Vitrinde ${o.matchCount} uygun ilan var</p>` : ''}
        <div class="flex justify-between items-center mt-2 gap-1.5">
            <button onclick="closeAccountModal(); window.harvestSearchListings('${escapeHtml(o.category)}', '${escapeHtml(o.keyword)}')" class="bg-lux-dark hover:bg-lux-olive text-white px-3 py-1 rounded text-[10px] font-bold transition flex-1">
                <i class="fa-solid fa-magnifying-glass mr-1"></i> İlanları Gör
            </button>
            <button onclick="closeAccountModal(); window.harvestCreateRequest('${escapeHtml(o.category)}', '${escapeHtml(o.productName)}')" class="bg-lux-gold hover:bg-[#ad9868] text-lux-dark px-3 py-1 rounded text-[10px] font-bold transition flex-1">
                <i class="fa-solid fa-cart-shopping mr-1"></i> Alım Talebi Aç
            </button>
            <button onclick="window.toggleHarvestAlert('${escapeHtml(o.productName)}'); window.loadIncomingOffers();" title="Bildirimi kapat" class="bg-gray-100 hover:bg-gray-200 text-gray-500 px-2 py-1 rounded text-[10px]">
                <i class="fa-solid fa-bell-slash"></i>
            </button>
        </div>
    `;
};


/* =========================================================================================
   ORONTES — 3. AŞAMA MODÜLLERİ / BÖLÜM B
   · İşlem sonrası çift taraflı puanlama (alıcı ↔ satıcı)
   · Anlaşmazlık / "Sorun Bildir" sistemi
   · Düzenli sipariş (abonelik) talepleri
   · Toplu alım / "Birlikte Al"
   ========================================================================================= */

/* ---------------------------------------------------------------------------------------
   1) ÇİFT TARAFLI PUANLAMA
   --------------------------------------------------------------------------------------- */

window.AVAILABLE_BUYER_BADGES = [
    "Hızlı Ödeme", "Net İletişim", "Sözünde Durdu", "Sorunsuz Teslim Aldı", "Güvenilir Alıcı", "Nazik İletişim"
];

/* Puan kaydı anahtarı: satıcı puanı eski yapıyla uyumlu kalsın diye sade uid,
   alıcı puanı ise ayrı anahtar altında tutulur (biri diğerinin üzerine yazmaz). */
window.ratingRecordKey = function (raterUid, role) {
    return role === 'buyer' ? `${raterUid}__buyer` : raterUid;
};

window.computeRatingStats = function (ratingsData) {
    const entries = Object.entries(ratingsData || {});
    const stats = {
        sellerScores: [], buyerScores: [],
        sellerAvg: 0, buyerAvg: 0,
        sellerCount: 0, buyerCount: 0,
        verifiedCount: 0,
        badgeCounts: {},
        comments: []
    };

    entries.forEach(([, r]) => {
        if (!r || typeof r.score !== 'number') return;
        const role = r.role === 'buyer' ? 'buyer' : 'seller';
        if (role === 'buyer') stats.buyerScores.push(r.score);
        else stats.sellerScores.push(r.score);

        if (r.offerId) stats.verifiedCount++;

        if (Array.isArray(r.badges)) {
            r.badges.forEach(b => { stats.badgeCounts[b] = (stats.badgeCounts[b] || 0) + 1; });
        }
        if (r.comment && String(r.comment).trim()) {
            stats.comments.push({
                comment: r.comment,
                score: r.score,
                role: role,
                verified: !!r.offerId,
                raterName: r.raterName || 'Kullanıcı',
                date: r.date || 0
            });
        }
    });

    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    stats.sellerAvg = avg(stats.sellerScores);
    stats.buyerAvg = avg(stats.buyerScores);
    stats.sellerCount = stats.sellerScores.length;
    stats.buyerCount = stats.buyerScores.length;
    stats.comments.sort((a, b) => b.date - a.date);
    return stats;
};

window.starText = function (avg, count) {
    if (!count) return window.t('rating.none', 'Henüz değerlendirme yok');
    const rounded = Math.round(avg);
    return `${'★'.repeat(rounded)}${'☆'.repeat(5 - rounded)} ${avg.toFixed(1)} (${count})`;
};

window.hasRatedBefore = function (targetUid, role) {
    const given = (window.userExtraData && window.userExtraData.givenRatings) || {};
    return !!given[window.ratingRecordKey(targetUid, role)];
};

/* --- Puanlama modalı --- */
window.ratingContext = { offerId: null, targetUid: null, targetName: '', role: 'seller', score: 0, badges: new Set() };

window.openRatingModal = function (offerId, targetUid, targetName, role) {
    if (!window.currentUser) {
        window.showToast('Değerlendirme için giriş yapmalısınız.', 'warning');
        window.openAuthModal('login');
        return;
    }
    if (targetUid === window.currentUser.uid) {
        window.showToast('Kendinizi değerlendiremezsiniz.', 'error');
        return;
    }

    window.ratingContext = {
        offerId: offerId || null,
        targetUid: targetUid,
        targetName: targetName || 'Kullanıcı',
        role: role === 'buyer' ? 'buyer' : 'seller',
        score: 0,
        badges: new Set()
    };

    document.getElementById('rating-modal-title').innerText =
        window.ratingContext.role === 'buyer'
            ? window.t('rating.rateBuyer', 'Alıcıyı Değerlendir')
            : window.t('rating.rateSeller', 'Satıcıyı Değerlendir');

    document.getElementById('rating-target-name').innerText = window.ratingContext.targetName;
    document.getElementById('rating-context-note').innerText = offerId
        ? '✔ Bu değerlendirme gerçekleşen bir işleme dayanıyor (doğrulanmış).'
        : 'Bu değerlendirme genel profil değerlendirmesidir.';

    const commentEl = document.getElementById('rating-comment');
    if (commentEl) commentEl.value = '';

    window.renderRatingStars();
    window.renderRatingBadges();

    document.getElementById('rating-modal').classList.remove('hidden');
};

window.closeRatingModal = function () { document.getElementById('rating-modal').classList.add('hidden'); };

window.renderRatingStars = function () {
    const box = document.getElementById('rating-stars');
    if (!box) return;
    box.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.innerText = i <= window.ratingContext.score ? '★' : '☆';
        star.style.color = i <= window.ratingContext.score ? '#bca879' : '#c7c7c7';
        star.style.cursor = 'pointer';
        star.style.fontSize = '32px';
        star.style.lineHeight = '1';
        star.onclick = () => { window.ratingContext.score = i; window.renderRatingStars(); };
        box.appendChild(star);
    }
};

window.renderRatingBadges = function () {
    const box = document.getElementById('rating-badges');
    if (!box) return;
    box.innerHTML = '';
    const list = window.ratingContext.role === 'buyer' ? window.AVAILABLE_BUYER_BADGES : window.AVAILABLE_REVIEW_BADGES;

    list.forEach(badge => {
        const el = document.createElement('span');
        el.innerText = badge;
        const selected = window.ratingContext.badges.has(badge);
        el.className = `cursor-pointer text-[10px] px-2 py-1 rounded-full border transition-all ${selected ? 'bg-lux-dark text-lux-gold border-lux-gold font-bold' : 'bg-lux-bg hover:bg-gray-200 text-lux-dark border-lux-olive font-medium'}`;
        el.onclick = () => {
            if (window.ratingContext.badges.has(badge)) window.ratingContext.badges.delete(badge);
            else window.ratingContext.badges.add(badge);
            window.renderRatingBadges();
        };
        box.appendChild(el);
    });
};

window.submitTwoWayRating = async function () {
    const ctx = window.ratingContext;
    if (!window.currentUser || !ctx.targetUid) return;

    if (!ctx.score) {
        window.showToast('Lütfen önce bir yıldız seçin.', 'warning');
        return;
    }

    const btn = document.getElementById('rating-submit-btn');
    if (btn) { btn.disabled = true; btn.innerText = 'Gönderiliyor...'; }

    const recordKey = window.ratingRecordKey(window.currentUser.uid, ctx.role);
    const comment = (document.getElementById('rating-comment') || {}).value || '';

    try {
        await update(ref(db, `ratings/${ctx.targetUid}/${recordKey}`), {
            score: ctx.score,
            badges: Array.from(ctx.badges),
            comment: comment.trim() || null,
            role: ctx.role,
            offerId: ctx.offerId || null,
            raterUid: window.currentUser.uid,
            raterName: window.userExtraData.username || window.currentUser.displayName || 'Kullanıcı',
            date: Date.now()
        });

        // Kendi verdiğim puanları işaretle (gelen kutusunda "Değerlendirildi" göstermek için)
        try {
            await update(ref(db, `users/${window.currentUser.uid}/givenRatings/${window.ratingRecordKey(ctx.targetUid, ctx.role)}`), {
                score: ctx.score, offerId: ctx.offerId || null, date: Date.now()
            });
            if (!window.userExtraData.givenRatings) window.userExtraData.givenRatings = {};
            window.userExtraData.givenRatings[window.ratingRecordKey(ctx.targetUid, ctx.role)] = { score: ctx.score, offerId: ctx.offerId || null, date: Date.now() };
        } catch (e) {}

        window.showToast('Değerlendirmeniz kaydedildi. Teşekkürler!', 'success');
        window.closeRatingModal();

        const offersTab = document.getElementById('tab-content-offers');
        if (offersTab && !offersTab.classList.contains('hidden')) window.loadIncomingOffers();

        if (window.activeSellerUid === ctx.targetUid && typeof window.loadSellerProfileBox === 'function') {
            window.loadSellerProfileBox(ctx.targetUid);
        }
    } catch (err) {
        window.showToast('Değerlendirme kaydedilemedi: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = window.t('rating.submit', 'Değerlendirmeyi Gönder'); }
    }
};

/* ---------------------------------------------------------------------------------------
   2) ANLAŞMAZLIK / SORUN BİLDİR
   --------------------------------------------------------------------------------------- */

window.disputeContext = { offerId: null, againstUid: null, title: '' };

window.openDisputeModal = function (offerId, againstUid, title) {
    if (!window.currentUser) {
        window.showToast('Sorun bildirmek için giriş yapmalısınız.', 'warning');
        window.openAuthModal('login');
        return;
    }
    window.disputeContext = { offerId: offerId || null, againstUid: againstUid || null, title: title || '' };

    document.getElementById('dispute-subject').innerText = title || 'İşlem';
    const reasonEl = document.getElementById('dispute-reason');
    const noteEl = document.getElementById('dispute-note');
    if (reasonEl) reasonEl.value = '';
    if (noteEl) noteEl.value = '';

    document.getElementById('dispute-modal').classList.remove('hidden');
};

window.closeDisputeModal = function () { document.getElementById('dispute-modal').classList.add('hidden'); };

window.handleDisputeSubmit = async function (e) {
    e.preventDefault();
    if (!window.currentUser) return;

    const reason = document.getElementById('dispute-reason').value;
    const note = document.getElementById('dispute-note').value;

    if (!reason) {
        window.showToast('Lütfen bir sorun nedeni seçin.', 'warning');
        return;
    }

    const btn = document.getElementById('dispute-submit-btn');
    btn.disabled = true;
    btn.innerText = 'Gönderiliyor...';

    try {
        await push(ref(db, 'disputes'), {
            offerId: window.disputeContext.offerId || null,
            subject: window.disputeContext.title || null,
            reporterUid: window.currentUser.uid,
            reporterName: window.userExtraData.username || window.currentUser.displayName || window.currentUser.email,
            reporterPhone: window.userExtraData.phone || null,
            againstUid: window.disputeContext.againstUid || null,
            reason: reason,
            note: note || null,
            status: 'İnceleniyor',
            date: Date.now()
        });

        // Teklif kartında "sorun bildirildi" işareti (kural izin vermezse sessizce geçilir)
        if (window.disputeContext.offerId) {
            try { await update(ref(db, `offers/${window.disputeContext.offerId}`), { disputeFlag: true }); } catch (e) {}
        }

        window.showToast('Sorun bildiriminiz alındı. Ekibimiz en kısa sürede inceleyecek.', 'success');
        window.closeDisputeModal();

        const offersTab = document.getElementById('tab-content-offers');
        if (offersTab && !offersTab.classList.contains('hidden')) window.loadIncomingOffers();
    } catch (err) {
        window.showToast('Bildirim gönderilemedi: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = window.t('dispute.submit', 'Sorunu Bildir');
    }
};

/* ---------------------------------------------------------------------------------------
   3) GELEN KUTUSU AKSİYON BUTONLARI (puanlama + sorun bildir + abonelik bilgisi)
   --------------------------------------------------------------------------------------- */

window.offerCounterparty = function (o, isIncoming) {
    if (isIncoming) {
        return { uid: o.buyerUid, name: o.buyerName || 'Alıcı', role: 'buyer' };
    }
    let name = o.sellerName;
    if (!name) {
        const listing = (window.listings || []).find(l => l.id === o.listingId);
        name = listing ? listing.seller : 'Satıcı';
    }
    return { uid: o.sellerUid, name: name || 'Satıcı', role: 'seller' };
};

window.offerActionButtons = function (o, isIncoming) {
    if (o.status !== 'Onaylandı') return '';
    const cp = window.offerCounterparty(o, isIncoming);
    if (!cp.uid) return '';

    const already = window.hasRatedBefore(cp.uid, cp.role);
    const safeName = window.escapeHtml(String(cp.name).replace(/'/g, ''));

    return `
        <div class="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-200/70">
            ${already
                ? `<span class="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded text-[10px] font-bold"><i class="fa-solid fa-circle-check mr-1"></i>${window.escapeHtml(window.t('inbox.rated', 'Değerlendirildi'))}</span>`
                : `<button onclick="window.openRatingModal('${window.escapeHtml(o.id)}', '${window.escapeHtml(cp.uid)}', '${safeName}', '${cp.role}')" class="bg-lux-gold hover:bg-[#ad9868] text-lux-dark px-2.5 py-1 rounded text-[10px] font-bold transition">
                    <i class="fa-solid fa-star mr-1"></i>${window.escapeHtml(window.t('inbox.rate', 'Değerlendir'))}
                   </button>`}
            <button onclick="window.openDisputeModal('${window.escapeHtml(o.id)}', '${window.escapeHtml(cp.uid)}', '${window.escapeHtml(String(o.listingTitle || '').replace(/'/g, ''))}')" class="bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-700 px-2.5 py-1 rounded text-[10px] font-semibold transition">
                <i class="fa-solid fa-triangle-exclamation mr-1"></i>${window.escapeHtml(window.t('dispute.btn', 'Sorun Bildir'))}
            </button>
            ${o.disputeFlag ? '<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold"><i class="fa-solid fa-flag mr-1"></i>Sorun bildirildi</span>' : ''}
        </div>
    `;
};

window.offerExtraInfo = function (o) {
    if (o.offerKind !== 'subscription') return '';
    return `
        <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-2 mt-1.5">
            <p class="text-[10px] text-indigo-900 font-bold"><i class="fa-solid fa-repeat mr-1"></i>${window.escapeHtml(window.t('inbox.subBadge', 'ABONELİK TALEBİ'))}</p>
            <p class="text-[10px] text-indigo-800">Miktar: <b>${window.escapeHtml(String(o.subQuantity || '-'))}</b> · Sıklık: <b>${window.escapeHtml(String(o.subFrequency || '-'))}</b></p>
        </div>
    `;
};

/* ---------------------------------------------------------------------------------------
   4) DÜZENLİ SİPARİŞ / ABONELİK TALEBİ
   --------------------------------------------------------------------------------------- */

window.submitSubscriptionRequest = async function () {
    if (!window.currentUser) {
        window.showToast('Abonelik talebi için giriş yapmalısınız.', 'warning');
        window.openAuthModal('login');
        return;
    }

    const item = (window.listings || []).find(l => l.id === window.activeListingId);
    if (!item) return;

    if (item.uid === window.currentUser.uid) {
        window.showToast('Kendi ilanınıza abonelik talebi gönderemezsiniz.', 'error');
        return;
    }

    const qty = document.getElementById('sub-qty-input').value.trim();
    const freq = document.getElementById('sub-frequency-select').value;
    const note = document.getElementById('sub-note-input').value.trim();

    if (!qty) {
        window.showToast('Lütfen her teslimatta almak istediğiniz miktarı yazın.', 'warning');
        return;
    }

    const btn = document.getElementById('sub-submit-btn');
    btn.disabled = true;
    btn.innerText = 'Gönderiliyor...';

    try {
        await push(ref(db, 'offers'), {
            offerKind: 'subscription',
            listingId: item.id,
            listingTitle: item.title,
            sellerUid: item.uid,
            sellerName: item.seller || null,
            buyerUid: window.currentUser.uid,
            buyerName: window.userExtraData.username || window.currentUser.displayName || window.currentUser.email,
            buyerPhone: window.userExtraData.phone || 'Belirtilmedi',
            offeredPrice: item.price || 0,
            subQuantity: `${qty} ${item.unit || ''}`.trim(),
            subFrequency: freq,
            note: note ? `[Düzenli sipariş] ${note}` : `[Düzenli sipariş] ${freq} teslimat talebi`,
            status: 'Beklemede',
            date: Date.now()
        });

        window.showToast('🔁 Düzenli sipariş talebiniz satıcıya iletildi!', 'success');
        document.getElementById('sub-qty-input').value = '';
        document.getElementById('sub-note-input').value = '';
    } catch (err) {
        window.showToast('Talep iletilemedi: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = window.t('sub.send', 'Abonelik Talebi Gönder');
    }
};

/* ---------------------------------------------------------------------------------------
   5) TOPLU ALIM / "BİRLİKTE AL"
   --------------------------------------------------------------------------------------- */

window.parseQtyNumber = function (value) {
    const m = String(value || '').replace(',', '.').match(/[\d.]+/);
    return m ? parseFloat(m[0]) || 0 : 0;
};

window.getGroupBuyStats = function (rq) {
    const participants = rq.participants || {};
    const list = Object.keys(participants).map(uid => ({ uid, ...participants[uid] }));
    const collected = list.reduce((sum, p) => sum + window.parseQtyNumber(p.quantity), 0);
    const target = window.parseQtyNumber(rq.quantity);
    const percent = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0;
    return { list, collected, target, percent, count: list.length };
};

window.renderGroupBuyProgress = function (rq) {
    if (!rq.groupBuy) return '';
    const s = window.getGroupBuyStats(rq);
    return `
        <div class="mt-2 pt-2 border-t border-gray-100">
            <div class="flex justify-between items-center text-[9px] font-bold text-lux-dark mb-1">
                <span><i class="fa-solid fa-users text-lux-gold"></i> ${escapeHtml(window.t('group.title', 'Birlikte Al'))} · ${s.count} kişi</span>
                <span>${s.collected} / ${s.target || '?'} ${escapeHtml(rq.unit || '')}</span>
            </div>
            <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div class="h-full bg-lux-gold rounded-full transition-all" style="width:${s.percent}%"></div>
            </div>
        </div>
    `;
};

window.renderGroupBuyBox = function (rq) {
    const box = document.getElementById('brd-groupbuy-box');
    if (!box) return;

    if (!rq.groupBuy) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');

    const s = window.getGroupBuyStats(rq);
    const myUid = window.currentUser ? window.currentUser.uid : null;
    const iAmIn = myUid && rq.participants && rq.participants[myUid];
    const isOwner = myUid && rq.uid === myUid;

    const listHtml = s.list.length
        ? s.list.map(p => `
            <div class="flex justify-between items-center bg-white/70 px-2.5 py-1.5 rounded-lg border border-lux-gold/30 text-[11px]">
                <span class="font-semibold text-lux-dark">${escapeHtml(p.name || 'Katılımcı')}</span>
                <span class="text-lux-olive font-bold">${escapeHtml(String(p.quantity || ''))}</span>
            </div>`).join('')
        : `<p class="text-[11px] text-gray-500 italic">Henüz katılımcı yok — ilk katılan siz olun!</p>`;

    box.innerHTML = `
        <div class="flex items-center justify-between mb-2 flex-wrap gap-1">
            <span class="text-xs font-bold text-lux-dark"><i class="fa-solid fa-users text-lux-gold mr-1"></i>${escapeHtml(window.t('group.title', 'Birlikte Al (Toplu Alım)'))}</span>
            <span class="text-[10px] font-bold text-lux-olive">${escapeHtml(window.t('group.collected', 'Toplanan'))}: ${s.collected} / ${s.target || '?'} ${escapeHtml(rq.unit || '')}</span>
        </div>

        <div class="w-full h-2.5 bg-white rounded-full overflow-hidden border border-lux-gold/40 mb-2">
            <div class="h-full bg-lux-gold rounded-full transition-all" style="width:${s.percent}%"></div>
        </div>

        <p class="text-[10px] text-gray-600 mb-2">Küçük alıcılar bir araya gelip toptan fiyat avantajı yakalar. Katılım miktarınızı yazıp listeye eklenin.</p>

        <div class="space-y-1.5 mb-2 max-h-32 overflow-y-auto pr-1">${listHtml}</div>

        ${isOwner ? '' : (iAmIn
            ? `<button onclick="window.leaveGroupBuy()" class="w-full bg-white border border-red-300 text-red-600 font-bold py-1.5 rounded-lg text-xs hover:bg-red-50 transition">
                    <i class="fa-solid fa-user-minus mr-1"></i>${escapeHtml(window.t('group.leave', 'Katılımdan Ayrıl'))} (${escapeHtml(String(rq.participants[myUid].quantity || ''))})
               </button>`
            : `<div class="flex gap-2">
                    <input type="text" id="groupbuy-qty" placeholder="Miktarım (örn: 200 ${escapeHtml(rq.unit || 'KG')})" class="flex-1 border border-lux-gold/40 p-1.5 rounded-lg text-xs bg-white outline-none">
                    <button onclick="window.joinGroupBuy()" class="bg-lux-dark hover:bg-lux-olive text-white font-bold px-3 py-1.5 rounded-lg text-xs transition whitespace-nowrap">
                        <i class="fa-solid fa-user-plus mr-1"></i>${escapeHtml(window.t('group.join', 'Ben de Katılıyorum'))}
                    </button>
               </div>`)}

        <button onclick="window.shareGroupBuy('${escapeHtml(rq.id)}')" class="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-xs transition">
            <i class="fa-brands fa-whatsapp mr-1"></i>${escapeHtml(window.t('group.share', 'Katılımcı Çağır (WhatsApp)'))}
        </button>
    `;
};

window.joinGroupBuy = async function () {
    if (!window.currentUser) {
        window.showToast('Katılmak için giriş yapmalısınız.', 'warning');
        window.openAuthModal('login');
        return;
    }
    const rq = (window.buyRequests || []).find(r => r.id === window.activeBuyRequestId);
    if (!rq) return;

    const qtyEl = document.getElementById('groupbuy-qty');
    const qty = qtyEl ? qtyEl.value.trim() : '';
    if (!qty) {
        window.showToast('Lütfen almak istediğiniz miktarı yazın.', 'warning');
        return;
    }

    try {
        await update(ref(db, `buyRequests/${rq.id}/participants/${window.currentUser.uid}`), {
            name: window.userExtraData.username || window.currentUser.displayName || 'Katılımcı',
            phone: window.userExtraData.phone || null,
            quantity: qty,
            date: Date.now()
        });
        if (!rq.participants) rq.participants = {};
        rq.participants[window.currentUser.uid] = { name: window.userExtraData.username || 'Katılımcı', quantity: qty, date: Date.now() };

        window.showToast('👥 Toplu alıma katıldınız! Hedefe ulaşıldığında alıcı sizinle iletişime geçecek.', 'success');
        window.renderGroupBuyBox(rq);
        window.renderBuyRequests();
    } catch (err) {
        window.showToast('Katılım kaydedilemedi: ' + err.message, 'error');
    }
};

window.leaveGroupBuy = async function () {
    if (!window.currentUser) return;
    const rq = (window.buyRequests || []).find(r => r.id === window.activeBuyRequestId);
    if (!rq) return;

    try {
        await remove(ref(db, `buyRequests/${rq.id}/participants/${window.currentUser.uid}`));
        if (rq.participants) delete rq.participants[window.currentUser.uid];
        window.showToast('Toplu alım katılımınız kaldırıldı.', 'success');
        window.renderGroupBuyBox(rq);
        window.renderBuyRequests();
    } catch (err) {
        window.showToast('İşlem yapılamadı: ' + err.message, 'error');
    }
};

window.shareGroupBuy = function (id) {
    const rq = (window.buyRequests || []).find(r => r.id === id);
    if (!rq) return;
    const s = window.getGroupBuyStats(rq);
    const text = `👥 BİRLİKTE AL — ORONTES\n\n📌 ${rq.title}\n📦 Hedef: ${rq.quantity} ${rq.unit || ''}\n✅ Toplanan: ${s.collected} ${rq.unit || ''} (${s.count} kişi)\n📍 ${window.getBuyRequestDistrictText(rq)}\n\nToptan fiyattan almak için sen de katıl:\n${window.getBuyRequestShareUrl(id)}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
};

/* Alım talebini paylaş (genel) */
window.shareBuyRequest = function (id) {
    const rq = (window.buyRequests || []).find(r => r.id === id);
    if (!rq) return;
    const text = `🤝 ALIM TALEBİ — ORONTES\n\n📌 ${rq.title}\n📦 ${rq.quantity} ${rq.unit || ''}\n📍 ${window.getBuyRequestDistrictText(rq)}\n${rq.targetPrice ? `💰 Hedef: ${rq.targetPrice} TL\n` : ''}\nÜrünün varsa teklif ver:\n${window.getBuyRequestShareUrl(id)}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
};


/* =========================================================================================
   ORONTES — 3. AŞAMA MODÜLLERİ / BÖLÜM C
   · Hasat takvimi: "Bana Haber Ver" + çok dil + katlanabilir yapı
   · Alım talebi kartları: toplu alım göstergesi + paylaşım + çok dil
   · Başlatma
   ========================================================================================= */

/* --------------------------- Hasat verisi Arapça karşılıkları --------------------------- */
window.AR_HARVEST = {
    'Sofralık & Yağlık Zeytin': { name: 'زيتون المائدة وزيتون العصر', note: 'أصناف حلحلي وساري حاشبي هي الأبرز. ذروة الإنتاج في أكتوبر–نوفمبر، ويبدأ التعاقد المسبق مطلع سبتمبر.' },
    'Soğuk Sıkım Zeytinyağı': { name: 'زيت زيتون بكر (عصر على البارد)', note: 'موسم العصر يبدأ فور انتهاء القطاف. لزيت الموسم الجديد تابع شهر نوفمبر.' },
    'Mandalina (Nova / Satsuma)': { name: 'يوسفي (نوفا / ساتسوما)', note: 'الأصناف المبكرة تصل الأسواق منتصف أكتوبر، وموردو الأسواق الكبرى يتعاقدون في سبتمبر.' },
    'W. Murcott Mandalina': { name: 'يوسفي دبليو موركوت', note: 'صنف متأخر وقاطرة التصدير. فبراير هو الشهر الأكثف، وقد يمتد حتى نهاية مارس بالتبريد.' },
    'Portakal (Washington / Valencia)': { name: 'برتقال (واشنطن / فالنسيا)', note: 'واشنطن شتاءً وفالنسيا ربيعاً. كميات العصر لمصانع العصائر متوفرة في هذه الفترة.' },
    'Limon (Enterdonat / Mayer)': { name: 'ليمون (إنترضونات / ماير)', note: 'يبدأ الإنترضونات أواخر سبتمبر، وإمكانية التخزين تتيح التعاقد طوال العام.' },
    'Greyfurt': { name: 'جريب فروت', note: 'صنف ستار روبي هو الأبرز تصديرياً، وديسمبر أكثر الشهور إنتاجاً.' },
    'Salçalık Kırmızı Biber': { name: 'فلفل أحمر للمعجون', note: 'الفترة الأساسية لإنتاج معجون وفلفل هاتاي المطحون؛ أسعار الجملة أفضل ما تكون في سبتمبر.' },
    'Sivri / Çarliston Biber (Sera)': { name: 'فلفل حار / شارلستون (دفيئة)', note: 'الزراعة المحمية تتيح التوريد معظم العام، وترتفع الأسعار في أشهر الشتاء.' },
    'Domates (Sera)': { name: 'طماطم (دفيئة)', note: 'إنتاج دفيئات على موسمين؛ مايو ونوفمبر أوفر الفترات لتوريد الهال والأسواق.' },
    'Patlıcan & Kabak (Sera)': { name: 'باذنجان وكوسا (دفيئة)', note: 'مناسب للتوريد الأسبوعي المنتظم للمطاعم والفنادق.' },
    'Sofralık Üzüm': { name: 'عنب المائدة', note: 'عنب حاصة من نكهات المنطقة المسجلة؛ أغسطس ذروة الموسم للمائدة والدبس.' },
    'Nar': { name: 'رمان', note: 'صنف حجاز نار هو الأبرز، وأكتوبر موسم الشراء بالجملة لمنتجي دبس الرمان.' },
    'İncir': { name: 'تين', note: 'التين الطازج سريع التلف ويحتاج نقلاً سريعاً ومسافات قصيرة.' },
    'Muz (Örtüaltı)': { name: 'موز (زراعة محمية)', note: 'الإنتاج المحمي مستمر طوال العام، وكثافة القطف في الخريف والشتاء.' },
    'Avokado': { name: 'أفوكادو', note: 'صنف هاس ينتشر بسرعة، ومنتج عالي القيمة لبائعي التجارة الإلكترونية.' },
    'Karpuz & Kavun': { name: 'بطيخ وشمام', note: 'بطيخ أرزين هو منتج الصيف الأساسي في الشراء بالجملة والشحن.' },
    'Buğday & Arpa': { name: 'قمح وشعير', note: 'حصاد سهل العمق يبدأ في يونيو؛ موسم الشراء بالطن لمطاحن الدقيق ومصانع الأعلاف.' },
    'Dane Mısır (2. Ürün)': { name: 'ذرة حبوب (محصول ثانٍ)', note: 'تُزرع بعد القمح كمحصول ثانٍ وتورّد لصناعة الأعلاف في الخريف.' },
    'Pamuk (Kütlü)': { name: 'قطن (زهر)', note: 'قطن سهل العمق يُجمع في سبتمبر–أكتوبر لمحالج القطن.' },
    'Kuru Soğan & Sarımsak': { name: 'بصل جاف وثوم', note: 'منتج قابل للتخزين؛ يمكن توريده بالجملة طوال الشتاء بعد حصاد الصيف.' },
    'Defne Yaprağı': { name: 'ورق الغار', note: 'جزء كبير من صادرات تركيا يخرج من هذه المنطقة؛ موسم حاسم للمصدّرين.' },
    'Kekik, Adaçayı & Kuru Bitki': { name: 'الزعتر والمريمية والأعشاب المجففة', note: 'تُجمع في فترة الإزهار؛ موسم مثالي لشركات العطارة والتوابل.' },
    'Süzme Bal & Arı Ürünleri': { name: 'عسل مصفّى ومنتجات النحل', note: 'عسل الحمضيات في الربيع، وعسل الهضاب والأزهار في أواخر الصيف.' },
    'Süt, Sürk & Tuzlu Yoğurt': { name: 'الحليب والسرك واللبن المملح', note: 'متوفر طوال العام، وإنتاج الحليب يبلغ ذروته في الربيع.' },
    'Narenciye Fidanı & Sebze Fidesi': { name: 'شتلات الحمضيات وشتلات الخضار', note: 'يزداد الطلب قبل مواسم الزراعة؛ أغسطس–سبتمبر موسم الشتلات لمزارعي الدفيئات.' }
};

window.harvestName = function (p) {
    if (window.currentLang === 'ar' && window.AR_HARVEST[p.name]) return window.AR_HARVEST[p.name].name;
    return p.name;
};
window.harvestNote = function (p) {
    if (window.currentLang === 'ar' && window.AR_HARVEST[p.name]) return window.AR_HARVEST[p.name].note;
    return p.note;
};

/* ---------------------------------------------------------------------------------------
   HASAT TAKVİMİ (genişletilmiş sürüm — bildirim butonu, çok dil, katlanabilir gövde)
   --------------------------------------------------------------------------------------- */

window.initHarvestCalendar = function () {
    const monthsBox = document.getElementById('harvest-months');
    if (!monthsBox) return;

    monthsBox.innerHTML = '';
    const allChip = document.createElement('button');
    allChip.type = 'button';
    allChip.dataset.month = '0';
    allChip.innerText = window.t('harvest.allYear', 'Tüm Yıl');
    allChip.onclick = () => window.setHarvestMonth(0);
    monthsBox.appendChild(allChip);

    for (let i = 1; i <= 12; i++) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.dataset.month = String(i);
        chip.innerText = window.trMonth(i);
        chip.onclick = () => window.setHarvestMonth(i);
        monthsBox.appendChild(chip);
    }

    // İlçe listesi (dil değişiminde etiketler yenilenir, seçim korunur)
    const distSel = document.getElementById('harvest-district');
    if (distSel) {
        const previous = distSel.value;
        distSel.innerHTML = `<option value="">${window.t('filter.allDistricts', 'Tüm Hatay (İlçeler)')}</option>`;
        window.HATAY_DISTRICT_LIST.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.innerText = window.trDistrict(d);
            distSel.appendChild(opt);
        });
        distSel.value = previous || '';
    }

    window.renderHarvestCalendar();
};

window.renderHarvestCalendar = function () {
    const list = document.getElementById('harvest-list');
    const summary = document.getElementById('harvest-summary');
    const monthsBox = document.getElementById('harvest-months');
    if (!list) return;

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
        const arName = window.AR_HARVEST[p.name] ? window.AR_HARVEST[p.name].name : '';
        const haystack = `${p.name} ${arName} ${p.category} ${p.keyword} ${p.districts.join(' ')}`.toLocaleLowerCase('tr-TR');
        const matchesTerm = !term || haystack.includes(term);
        const matchesMonth = !month || p.months.includes(month);
        return matchesDistrict && matchesTerm && matchesMonth;
    });

    if (month) data = data.sort((a, b) => (b.peak.includes(month) ? 1 : 0) - (a.peak.includes(month) ? 1 : 0));
    else data = data.sort((a, b) => a.months[0] - b.months[0]);

    if (summary) {
        const monthLabel = month ? window.trMonth(month) : '';
        const nextMonth = month ? (month === 12 ? 1 : month + 1) : 0;
        const upcoming = nextMonth
            ? window.HATAY_HARVEST_DATA.filter(p =>
                p.months.includes(nextMonth) && !p.months.includes(month) &&
                (!district || p.districts.includes(district)))
            : [];

        const scopeText = district ? window.trDistrict(district) : (window.currentLang === 'ar' ? 'هاتاي' : 'Hatay geneli');
        const mainLine = window.currentLang === 'ar'
            ? `<b>${escapeHtml(scopeText)}</b> — ${month ? `في شهر ${escapeHtml(monthLabel)}` : 'على مدار السنة'} يوجد <b class="text-lux-olive">${data.length}</b> منتجاً في موسم الحصاد / التوريد.`
            : `${escapeHtml(scopeText)}${district ? ' ilçesinde' : 'nde'} ${month ? escapeHtml(monthLabel) + ' ayında' : 'yıl boyunca'} <b class="text-lux-olive">${data.length} ürün</b> hasat / tedarik sezonunda.`;

        const upcomingLine = upcoming.length
            ? (window.currentLang === 'ar'
                ? `<b>${escapeHtml(window.trMonth(nextMonth))}</b>: ${upcoming.slice(0, 4).map(u => escapeHtml(window.harvestName(u))).join('، ')}${upcoming.length > 4 ? ' …' : ''}`
                : `<b>${escapeHtml(window.trMonth(nextMonth))}</b> ayında başlayacaklar: ${upcoming.slice(0, 4).map(u => escapeHtml(window.harvestName(u))).join(', ')}${upcoming.length > 4 ? ' …' : ''}`)
            : '';

        summary.innerHTML = `
            <div class="flex flex-wrap items-center gap-2 justify-between">
                <p class="text-xs text-lux-dark font-semibold"><i class="fa-solid fa-tractor text-lux-gold mr-1"></i>${mainLine}</p>
                ${upcomingLine ? `<p class="text-[11px] text-gray-500"><i class="fa-solid fa-forward text-lux-olive mr-1"></i>${upcomingLine}</p>` : ''}
            </div>
        `;
    }

    list.innerHTML = '';

    if (data.length === 0) {
        list.innerHTML = `<div class="text-center py-10 text-xs text-gray-400 bg-lux-bg/30 rounded-xl border border-dashed border-gray-300">
            ${escapeHtml(window.currentLang === 'ar' ? 'لا توجد سجلات حصاد بهذه المعايير. جرّب خيار "كل السنة".' : 'Bu ay / ilçe / arama kriterinde hasat kaydı bulunamadı. "Tüm Yıl" seçeneğini deneyin.')}
        </div>`;
        return;
    }

    data.forEach(p => {
        const isPeakNow = month && p.peak.includes(month);
        const displayName = window.harvestName(p);
        const alertOn = window.isHarvestAlertOn(p.name);

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
            const tip = `${window.trMonth(m)}${isPeak ? ' — ' + window.t('harvest.peak', 'Rekolte zirvesi') : (isActive ? ' — ' + window.t('harvest.active', 'Hasat var') : ' — ' + window.t('harvest.off', 'Sezon dışı'))}`;
            monthBar += `<div title="${escapeHtml(tip)}" class="text-center text-[8px] leading-none py-1.5 rounded ${cellClass} ${isSelected ? 'ring-2 ring-lux-dark' : ''}">${escapeHtml(window.trMonth(m, true))}</div>`;
        }
        monthBar += '</div>';

        const safeName = String(p.name).replace(/'/g, '');

        row.innerHTML = `
            <div class="flex justify-between items-start gap-3 flex-wrap">
                <div class="min-w-0">
                    <span class="font-bold text-lux-dark text-xs">
                        ${p.emoji} ${escapeHtml(displayName)}
                        ${isPeakNow ? `<span class="bg-lux-gold text-lux-dark text-[8px] font-extrabold px-1.5 py-0.5 rounded ml-1 align-middle">${escapeHtml(window.t('harvest.peakBadge', 'REKOLTE ZİRVESİ'))}</span>` : ''}
                    </span>
                    <span class="block text-[10px] text-gray-500 mt-0.5">
                        <i class="fa-solid fa-location-dot text-lux-gold"></i> ${p.districts.map(d => escapeHtml(window.trDistrict(d))).join(' · ')}
                    </span>
                    <span class="inline-block text-[9px] bg-lux-bg text-lux-dark font-semibold px-1.5 py-0.5 rounded mt-1 border border-gray-200">
                        ${categoryEmojis[p.category] || '📦'} ${escapeHtml(window.trCategory(p.category))}
                    </span>
                    ${listingCount > 0 ? `<span class="inline-block text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded mt-1 border border-emerald-200 ml-1">${escapeHtml(window.t('harvest.inShowcase', 'Vitrinde'))} ${listingCount} ${escapeHtml(window.t('harvest.listing', 'ilan'))}</span>` : ''}
                </div>
                <div class="flex gap-1.5 shrink-0 flex-wrap">
                    <button onclick="window.toggleHarvestAlert('${escapeHtml(safeName)}')" title="${escapeHtml(window.t('harvest.notifyMe', 'Bana Haber Ver'))}" class="${alertOn ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-300'} text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                        <i class="fa-solid ${alertOn ? 'fa-bell' : 'fa-bell-slash'} mr-0.5"></i> ${escapeHtml(alertOn ? window.t('harvest.notifyOn', 'Bildirim Açık') : window.t('harvest.notifyMe', 'Bana Haber Ver'))}
                    </button>
                    <button onclick="window.harvestSearchListings('${escapeHtml(p.category)}', '${escapeHtml(p.keyword)}')" class="bg-lux-dark hover:bg-lux-olive text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                        <i class="fa-solid fa-magnifying-glass mr-0.5"></i> ${escapeHtml(window.t('harvest.seeListings', 'İlanları Gör'))}
                    </button>
                    <button onclick="window.harvestCreateRequest('${escapeHtml(p.category)}', '${escapeHtml(safeName)}')" class="bg-lux-gold hover:bg-[#ad9868] text-lux-dark text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                        <i class="fa-solid fa-cart-shopping mr-0.5"></i> ${escapeHtml(window.t('harvest.createRequest', 'Alım Talebi Aç'))}
                    </button>
                </div>
            </div>
            ${monthBar}
            <p class="text-[10px] text-gray-500 mt-2 leading-relaxed"><i class="fa-solid fa-circle-info text-lux-sage mr-1"></i>${escapeHtml(window.harvestNote(p))}</p>
        `;
        list.appendChild(row);
    });
};

/* ---------------------------------------------------------------------------------------
   ALIM TALEBİ KARTLARI (genişletilmiş sürüm — toplu alım göstergesi, paylaşım, çok dil)
   --------------------------------------------------------------------------------------- */

window.renderBuyRequests = function () {
    const grid = document.getElementById('buyrequests-grid');
    if (!grid) return;

    const items = window.filteredBuyRequests || [];
    const countEl = document.getElementById('br-total-count');
    const openCount = (window.buyRequests || []).filter(r => (r.status || 'Açık') === 'Açık').length;
    if (countEl) {
        countEl.innerText = window.currentLang === 'ar'
            ? `${items.length} طلباً معروضاً · ${openCount} طلب شراء مفتوح`
            : `${items.length} talep listelendi · ${openCount} açık alım talebi`;
    }

    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-lux-olive/40 text-gray-500 text-xs">
            <i class="fa-solid fa-cart-flatbed text-2xl text-lux-sage block mb-2"></i>
            <b class="text-lux-dark block mb-1">${escapeHtml(window.t('br.empty', 'Bu kriterlerde alım talebi bulunamadı.'))}</b>
            ${escapeHtml(window.t('br.sub', 'Toptancı, restoran, otel veya hal esnafıysanız aradığınız ürünü buraya yazın; üreticiler size teklif getirsin.'))}
            <button onclick="window.openBuyRequestForm()" class="block mx-auto mt-3 bg-lux-dark text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-lux-olive transition">
                <i class="fa-solid fa-plus mr-1"></i> ${escapeHtml(window.t('br.create', 'Alım Talebi Oluştur'))}
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
        card.className = `bg-white rounded-2xl border ${isClosed ? 'border-gray-200 opacity-70' : (rq.groupBuy ? 'border-[1.5px] border-lux-gold' : (rq.isUrgent ? 'border-[1.5px] border-red-500' : 'border-lux-olive/30'))} p-4 flex flex-col justify-between hover:shadow-lg transition-all duration-300`;
        card.innerHTML = `
            <div>
                <div class="flex items-start justify-between gap-2 mb-2">
                    <span class="bg-lux-dark text-lux-gold text-[9px] font-extrabold px-2 py-1 rounded-md uppercase tracking-wide whitespace-nowrap">
                        <i class="fa-solid fa-cart-shopping mr-0.5"></i> ${escapeHtml(window.t('br.badge', 'Alım Talebi'))}
                    </span>
                    <span class="text-[9px] text-gray-400 whitespace-nowrap"><i class="fa-regular fa-clock mr-0.5"></i>${getTimeAgo(rq.date)}</span>
                </div>

                <div class="flex flex-wrap gap-1 mb-2">
                    ${isClosed ? `<span class="bg-gray-500 text-white font-bold text-[9px] px-2 py-0.5 rounded">${escapeHtml(window.t('br.closed', 'KAPANDI'))}</span>` : ''}
                    ${rq.groupBuy ? `<span class="bg-lux-gold text-lux-dark font-extrabold text-[9px] px-2 py-0.5 rounded">👥 ${escapeHtml(window.t('br.groupBuy', 'BİRLİKTE AL'))}</span>` : ''}
                    ${rq.isUrgent ? `<span class="bg-red-600 text-white font-bold text-[9px] px-2 py-0.5 rounded animate-pulse">🔥 ${escapeHtml(window.t('br.urgent', 'ACİL'))}</span>` : ''}
                    ${rq.recurring ? `<span class="bg-lux-olive text-white font-bold text-[9px] px-2 py-0.5 rounded">🔁 ${escapeHtml(window.t('br.recurring', 'DÜZENLİ ALIM'))}${rq.frequency ? ' · ' + escapeHtml(rq.frequency) : ''}</span>` : ''}
                    ${rq.buyerType ? `<span class="bg-lux-bg text-lux-dark font-semibold text-[9px] px-2 py-0.5 rounded border border-gray-200">${escapeHtml(rq.buyerType)}</span>` : ''}
                </div>

                <h3 onclick="window.openBuyRequestDetail('${escapeHtml(rq.id)}')" class="font-bold text-lux-dark text-xs hover:text-lux-olive cursor-pointer line-clamp-2 mb-1.5">
                    ${emoji} ${escapeHtml(rq.title || 'Alım talebi')}
                </h3>

                <div class="text-[10px] text-gray-500 space-y-1">
                    <p><i class="fa-solid fa-weight-hanging text-lux-gold w-3"></i> ${escapeHtml(window.t('br.wanted', 'Aranan miktar:'))} <b class="text-lux-dark">${escapeHtml(rq.quantity || '-')} ${escapeHtml(rq.unit || '')}</b></p>
                    <p><i class="fa-solid fa-location-dot text-lux-gold w-3"></i> ${escapeHtml(window.getBuyRequestDistrictText(rq))}</p>
                    ${rq.deadline ? `<p><i class="fa-solid fa-calendar-day text-lux-gold w-3"></i> ${escapeHtml(window.t('br.deadline', 'Teslim / Termin:'))} ${escapeHtml(rq.deadline)}</p>` : ''}
                    ${matchCount > 0 ? `<p class="text-emerald-700 font-semibold"><i class="fa-solid fa-seedling w-3"></i> ${escapeHtml(window.t('br.matching', 'Vitrinde'))} ${matchCount} ${escapeHtml(window.t('br.matchingSuffix', 'uygun ilan var'))}</p>` : ''}
                </div>

                ${window.renderGroupBuyProgress(rq)}
            </div>

            <div class="border-t border-gray-100 mt-3 pt-2.5 flex items-end justify-between gap-2">
                <div>
                    <span class="text-[9px] text-gray-400 block">${rq.targetPrice ? 'Hedef / Bütçe' : 'Fiyat'}</span>
                    <span class="text-base font-bold text-lux-dark">${rq.targetPrice ? `${escapeHtml(String(rq.targetPrice))} TL` : escapeHtml(window.t('br.waiting', 'Teklif Bekliyor'))}</span>
                    <span class="text-[9px] text-gray-400 block">${escapeHtml(rq.buyerName || 'Alıcı')}</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <button onclick="window.shareBuyRequest('${escapeHtml(rq.id)}')" title="WhatsApp'ta paylaş" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1.5 rounded-lg text-[11px] transition">
                        <i class="fa-brands fa-whatsapp"></i>
                    </button>
                    <button onclick="window.openBuyRequestDetail('${escapeHtml(rq.id)}')" class="text-[11px] ${isClosed ? 'bg-lux-bg text-gray-500' : 'bg-lux-gold text-lux-dark hover:bg-[#ad9868]'} font-bold px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                        ${escapeHtml(isClosed ? window.t('br.detail', 'Detay') : window.t('br.offer', 'Teklif Ver'))}
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    window.renderBuyRequestPagination(items.length);
};

/* ---------------------------------------------------------------------------------------
   PROFİLDEKİ ÇİFT TARAFLI PUAN GÖSTERİMİ
   --------------------------------------------------------------------------------------- */

window.renderProfileExtraRatings = function (ratingsData) {
    const stats = window.computeRatingStats(ratingsData);

    const buyerEl = document.getElementById('seller-profile-buyer-rating');
    if (buyerEl) {
        buyerEl.innerHTML = stats.buyerCount
            ? `<i class="fa-solid fa-cart-shopping mr-1"></i>${escapeHtml(window.t('rating.asBuyer', 'Alıcı puanı'))}: ${escapeHtml(window.starText(stats.buyerAvg, stats.buyerCount))}`
            : '';
        buyerEl.classList.toggle('hidden', !stats.buyerCount);
    }

    const verifiedEl = document.getElementById('seller-profile-verified');
    if (verifiedEl) {
        verifiedEl.innerHTML = stats.verifiedCount
            ? `<i class="fa-solid fa-circle-check mr-1"></i>${stats.verifiedCount} ${escapeHtml(window.t('rating.verified', 'Alışveriş Doğrulandı'))}`
            : '';
        verifiedEl.classList.toggle('hidden', !stats.verifiedCount);
    }

    const commentsEl = document.getElementById('seller-profile-comments');
    if (commentsEl) {
        const comments = stats.comments.slice(0, 5);
        if (!comments.length) {
            commentsEl.innerHTML = '';
            const wrap = document.getElementById('seller-profile-comments-wrap');
            if (wrap) wrap.classList.add('hidden');
        } else {
            const wrap = document.getElementById('seller-profile-comments-wrap');
            if (wrap) wrap.classList.remove('hidden');
            commentsEl.innerHTML = comments.map(c => `
                <div class="bg-lux-bg/40 border border-gray-200/60 rounded-xl p-2.5">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-[10px] font-bold text-lux-dark">${escapeHtml(c.raterName)}
                            ${c.verified ? `<span class="bg-emerald-100 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded ml-1"><i class="fa-solid fa-circle-check"></i> ${escapeHtml(window.t('rating.verified', 'Alışveriş Doğrulandı'))}</span>` : ''}
                        </span>
                        <span class="text-[10px] text-lux-gold font-bold">${'★'.repeat(c.score)}${'☆'.repeat(5 - c.score)}</span>
                    </div>
                    <p class="text-[11px] text-gray-600 leading-relaxed">${escapeHtml(c.comment)}</p>
                </div>
            `).join('');
        }
    }
};

/* ---------------------------------------------------------------------------------------
   BAŞLATMA
   --------------------------------------------------------------------------------------- */

window.initOrontesPhase3 = function () {
    try { window.applyTranslations(); } catch (e) { console.warn('Çeviri uygulanamadı:', e); }
    try { window.initCollapsibles(); } catch (e) {}
    try { window.initHarvestCalendar(); } catch (e) {}
    try { window.handleDeepLink(); } catch (e) {}

    // İlçe haritası, gövdesi açıksa çizilir
    setTimeout(() => {
        const body = document.getElementById('district-map-body');
        if (body && !body.classList.contains('hidden')) window.renderDistrictMap();
    }, 900);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initOrontesPhase3);
} else {
    window.initOrontesPhase3();
}
