import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update, get, runTransaction, query, orderByChild, equalTo, limitToLast } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
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

window.currentPage = 1;
window.itemsPerPage = 12;

// Kategori modalı sayfalandırma için
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
        alert(`Seçtiğiniz görsel ${sizeMb.toFixed(1)}MB — izin verilen en fazla ${window.MAX_IMAGE_SIZE_MB}MB. Lütfen daha küçük bir dosya seçin.`);
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
            reject(new Error(`Görsel çok büyük (${sizeMb.toFixed(1)}MB). Lütfen ${window.MAX_IMAGE_SIZE_MB}MB'dan küçük bir dosya seçin.`));
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

    if (user) {
        if (loggedOutBox) loggedOutBox.classList.add('hidden');
        if (loggedInBox) loggedInBox.classList.remove('hidden');
        
        const userRef = ref(db, 'users/' + user.uid);
        const snap = await get(userRef);
        if (snap.exists()) {
            window.userExtraData = snap.val();
            if(!window.userExtraData.favorites) window.userExtraData.favorites = {};
        } else {
            window.userExtraData = { favorites: {} };
        }
    } else {
        if (loggedOutBox) loggedOutBox.classList.remove('hidden');
        if (loggedInBox) loggedInBox.classList.add('hidden');
        window.userExtraData = { favorites: {} };
    }
    renderListings();
});

const recentListingsQuery = query(
    ref(db, 'listings'), 
    orderByChild('date'), 
    limitToLast(400)
);

onValue(recentListingsQuery, (snapshot) => {
    const items = [];
    snapshot.forEach((childSnapshot) => {
        items.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });
    
    window.listings = items;
    filterListings();
    updateMarqueeData();
});

window.handleAuthSubmit = async function(e) {
    e.preventDefault();
    const mode = document.getElementById('auth-mode').value;
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const username = document.getElementById('auth-username').value;
    const phone = document.getElementById('auth-phone').value;
    const btn = document.getElementById('auth-submit-btn');

    btn.disabled = true;
    btn.innerText = "İşlem yapılıyor...";

    try {
        if (mode === 'login') {
            const loginResult = await signInWithEmailAndPassword(auth, email, password);
            const profileSnap = await get(ref(db, 'users/' + loginResult.user.uid));
            const isPostMigrationAccount = profileSnap.exists() && !!profileSnap.val().joinedAt;

            if (isPostMigrationAccount && !loginResult.user.emailVerified) {
                try { await sendEmailVerification(loginResult.user); } catch (resendErr) {}
                await signOut(auth);
                alert("Hesabınız henüz doğrulanmamış. E-postanıza yeni bir doğrulama bağlantısı gönderdik — lütfen gelen kutunuzu (ve spam klasörünü) kontrol edip bağlantıya tıkladıktan sonra tekrar giriş yapın.");
                btn.disabled = false;
                btn.innerText = "Giriş Yap";
                return;
            }
        } else {
            if (!username || !username.trim()) {
                alert("Lütfen bir kullanıcı adı girin.");
                btn.disabled = false;
                btn.innerText = "Kayıt Ol";
                return;
            }

            const usernameKey = window.sanitizeUsernameKey(username);
            let isUsernameTaken = false;
            try {
                const usernameSnap = await get(ref(db, 'usernames/' + usernameKey));
                isUsernameTaken = usernameSnap.exists();
            } catch (checkErr) {
                console.warn('Kullanıcı adı kontrolü yapılamadı:', checkErr);
            }

            if (isUsernameTaken) {
                alert("❌ Bu kullanıcı adı daha önceden alınmış! Lütfen başka bir kullanıcı adı belirleyin.");
                btn.disabled = false;
                btn.innerText = "Kayıt Ol";
                return;
            }

            const res = await createUserWithEmailAndPassword(auth, email, password);
            if (username) await updateProfile(res.user, { displayName: username });
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

            await sendEmailVerification(res.user);
            await signOut(auth);
            alert("Kayıt işlemi başarıyla gerçekleşti! Lütfen e-posta adresinize gelen doğrulama bağlantısına tıklayın (Spam klasörünü kontrol etmeyi unutmayın).");
            toggleAuthMode();
            btn.disabled = false;
            btn.innerText = "Giriş Yap";
            return;
        }
        closeAuthModal();
        const addForm = document.getElementById('add-listing-form');
        if (addForm) addForm.reset();
    } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
            alert("Bu e-posta adresi zaten daha önceden kayıtlı! Lütfen giriş yapın veya şifrenizi unuttuysanız sıfırlayın.");
        } else {
            alert("Hata: " + err.message);
        }
    } finally {
        btn.disabled = false;
        btn.innerText = mode === 'login' ? "Giriş Yap" : "Kayıt Ol";
    }
};

window.handleForgotPassword = async function() {
    const email = document.getElementById('auth-email').value;
    if (!email) {
        alert("Lütfen önce üstteki e-posta alanına hesabınıza ait e-posta adresinizi yazın.");
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        alert("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.");
    } catch(err) {
        alert("Hata: " + err.message);
    }
};

window.handleLogout = function() { signOut(auth); };

// Şifre Göster / Gizle Özelliği
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
        alert("Favorilere eklemek için giriş yapmalısınız.");
        openAuthModal('login');
        return;
    }

    const favRef = ref(db, `users/${window.currentUser.uid}/favorites/${id}`);
    if (window.userExtraData.favorites && window.userExtraData.favorites[id]) {
        await remove(favRef);
        delete window.userExtraData.favorites[id];
        alert("İlan favorilerinizden çıkarıldı.");
    } else {
        await update(ref(db, `users/${window.currentUser.uid}/favorites`), { [id]: true });
        if(!window.userExtraData.favorites) window.userExtraData.favorites = {};
        window.userExtraData.favorites[id] = true;
        alert("İlan favorilerinize eklendi!");
    }
    renderListings();
    updateFavBtnStyle(id);
};

window.submitPriceOffer = async function() {
    if (!window.currentUser) {
        alert("Teklif vermek için giriş yapmalısınız.");
        openAuthModal('login');
        return;
    }
    const price = document.getElementById('offer-price-input').value;
    const note = document.getElementById('offer-note-input').value;

    if (!price) {
        alert("Lütfen teklif ettiğiniz birim fiyatı girin.");
        return;
    }

    const item = window.listings.find(l => l.id === window.activeListingId);
    if (!item) return;

    if (item.uid === window.currentUser.uid) {
        alert("Kendi ilanınıza teklif gönderemezsiniz.");
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
        alert("Teklifiniz ilan sahibine başarıyla iletildi!");
        document.getElementById('offer-price-input').value = '';
        document.getElementById('offer-note-input').value = '';
    } catch (err) {
        alert("Hata: " + err.message);
    }
};

window.handleFormSubmit = async function(e) {
    e.preventDefault();
    if (!window.currentUser) {
        alert("İlan vermek için giriş yapmalısınız.");
        return;
    }

    const editId = document.getElementById('edit-listing-id').value;
    let existingItem = null;
    if (editId) {
        existingItem = (window.listings || []).find(l => l.id === editId);
        if (!existingItem || existingItem.uid !== window.currentUser.uid) {
            alert("Bu ilanı düzenleme yetkiniz yok.");
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
            price: Number(document.getElementById('form-price').value),
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
            alert('İlan başarıyla güncellendi!');
        } else {
            await push(ref(db, 'listings'), listingData);
            if (isFirst100) {
                alert('🚀 İlanınız yayınlandı! İlk 100 ilan kapsamında 3 AYLIK ÜCRETSİZ VIP VİTRİN rozeti eklendi.');
            } else {
                alert('İlan yayınlandı!');
            }
        }
        closeFormModal();
        closeDetailModal();
    } catch (err) {
        alert('Hata: ' + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "İlanı Kaydet";
    }
};

window.updateAccountDetails = async function() {
    if (!window.currentUser) return;
    const newUsername = document.getElementById('update-username').value;
    const newPhone = document.getElementById('update-phone').value;
    const newPass = document.getElementById('update-new-password').value;
    const currentPass = document.getElementById('update-current-password').value;
    const btn = document.getElementById('update-acc-btn');

    if (!currentPass) {
        alert("Bilgilerinizi güncelleyebilmek için lütfen mevcut şifrenizi girin.");
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
                alert("❌ Bu kullanıcı adı başkası tarafından alınmış!");
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
                alert("Yeni şifre en az 6 karakter olmalıdır.");
                btn.disabled = false;
                btn.innerText = "Değişiklikleri Kaydet";
                return;
            }
            await updatePassword(window.currentUser, newPass);
            alert("Şifreniz ve profil bilgileriniz başarıyla güncellendi!");
        } else {
            alert("Profil bilgileriniz başarıyla güncellendi!");
        }

        window.userExtraData.username = newUsername;
        window.userExtraData.phone = newPhone;
        document.getElementById('update-current-password').value = '';
        document.getElementById('update-new-password').value = '';
        closeAccountModal();
    } catch (err) {
        alert("Hata: Mevcut şifrenizi yanlış girdiniz veya işlem başarısız oldu.");
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

        alert("Hesabınız ve ilanlarınız kalıcı olarak silindi.");
        closeAccountModal();
    } catch (err) {
        alert("Hata: Şifre yanlış veya işlem gerçekleştirilemedi. " + err.message);
    }
};

window.deleteCurrentListing = async function(id) {
    const targetId = id || window.activeListingId;
    if (!targetId || !window.currentUser) return;

    const target = (window.listings || []).find(l => l.id === targetId);
    if (!target || target.uid !== window.currentUser.uid) {
        alert("Bu ilanı silme yetkiniz yok.");
        return;
    }

    if (confirm("Bu ilanı silmek istediğinizden emin misiniz?")) {
        try {
            await remove(ref(db, 'listings/' + targetId));
            alert("İlan başarıyla silindi.");
            closeDetailModal();
            closeAccountModal();
        } catch (err) {
            alert("Hata: " + err.message);
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
        const scores = Object.values(ratingsData).map(r => r.score).filter(s => typeof s === 'number');
        const avg = scores.length ? (scores.reduce((a,b) => a+b, 0) / scores.length) : 0;
        const roundedStars = Math.round(avg);
        ratingEl.innerText = scores.length
            ? `${'★'.repeat(roundedStars)}${'☆'.repeat(5 - roundedStars)} ${avg.toFixed(1)} (${scores.length})`
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
        alert("Değerlendirme yapmak için giriş yapmalısınız.");
        openAuthModal('login');
        return;
    }
    if (window.currentUser.uid === sellerUid) {
        alert("Kendi ilanınıza puan veremezsiniz.");
        return;
    }
    try {
        await update(ref(db, `ratings/${sellerUid}/${window.currentUser.uid}`), {
            score: score,
            date: Date.now()
        });
        window.loadSellerProfileBox(sellerUid);
        const sellerModal = document.getElementById('seller-profile-modal');
        if (sellerModal && !sellerModal.classList.contains('hidden')) {
            window.openSellerProfileModal(sellerUid);
        }
    } catch (err) {
        alert("Değerlendirme kaydedilemedi: " + err.message);
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
    countEl.innerText = `${sellerListings.length} ilan`;
    listingsEl.innerHTML = '';

    document.getElementById('seller-profile-modal').classList.remove('hidden');

    try {
        const profileSnap = await get(ref(db, 'publicProfiles/' + sellerUid));
        if (profileSnap.exists() && profileSnap.val().joinedAt) {
            const d = new Date(profileSnap.val().joinedAt);
            const now = Date.now();
            const years = Math.floor((now - profileSnap.val().joinedAt) / (365 * 24 * 60 * 60 * 1000));
            const sinceText = years >= 1 ? `${years} yıldır üye` : `${d.toLocaleDateString('tr-TR', { year:'numeric', month:'long' })} tarihinden beri üye`;
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
            ? `${'★'.repeat(roundedStars)}${'☆'.repeat(5 - roundedStars)} ${avg.toFixed(1)} (${scores.length})`
            : 'Henüz değerlendirme yok';
    } catch (err) {
        ratingEl.innerText = 'Puanlar yüklenemedi';
    }

    if (sellerListings.length === 0) {
        listingsEl.innerHTML = `<p class="text-xs text-gray-400 italic">Bu satıcının aktif ilanı yok.</p>`;
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

function closeSellerProfileModal() {
    document.getElementById('seller-profile-modal').classList.add('hidden');
}

window.loadIncomingOffers = async function() {
    const container = document.getElementById('tab-content-offers');
    container.innerHTML = '<p class="text-xs text-gray-400">Yükleniyor...</p>';

    try {
        const offersQuery = query(ref(db, 'offers'), orderByChild('sellerUid'), equalTo(window.currentUser.uid));
        const snap = await get(offersQuery);
        const data = snap.val();

        if (!data) {
            container.innerHTML = `<p class="text-xs text-gray-400 italic">Henüz tarafınıza iletilen bir teklif bulunmuyor.</p>`;
            return;
        }

        const myOffers = Object.keys(data).map(k => ({id: k, ...data[k]}));
        container.innerHTML = '';

        if (myOffers.length === 0) {
            container.innerHTML = `<p class="text-xs text-gray-400 italic">Henüz tarafınıza iletilen bir teklif bulunmuyor.</p>`;
            return;
        }

        myOffers.forEach(o => {
            const div = document.createElement('div');
            div.className = "bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs space-y-2";
            
            let cleanPhone = o.buyerPhone ? o.buyerPhone.replace(/[^0-9]/g, '') : '';
            if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
            const waMsg = `Merhaba ${o.buyerName || 'Alıcı'}, "${o.listingTitle || 'İlan'}" ilanım için verdiğiniz ${o.offeredPrice || 'belirtilmemiş'} TL teklif üzerine görüşmek istiyorum.`;
            const waUrl = cleanPhone ? `https://wa.me/90${cleanPhone}?text=${encodeURIComponent(waMsg)}` : '#';

            const statusColor = o.status === 'Onaylandı' ? 'text-emerald-700 bg-emerald-100' : (o.status === 'Reddedildi' ? 'text-red-700 bg-red-100' : 'text-amber-700 bg-amber-100');

            div.innerHTML = `
                <div class="flex justify-between font-bold text-amber-900">
                    <span>📌 ${window.escapeHtml(o.listingTitle || 'İlan')}</span>
                    <span class="text-emerald-700">${window.escapeHtml(String(o.offeredPrice || '?'))} TL Teklif</span>
                </div>
                <p class="text-[10px] text-gray-600">Teklif Veren: <b>${window.escapeHtml(o.buyerName || 'Belirtilmemiş')}</b> (${window.escapeHtml(o.buyerPhone || 'Belirtilmedi')})</p>
                <div class="flex justify-between items-center">
                    <span class="text-[10px] font-semibold px-2 py-0.5 rounded ${statusColor}">Durum: ${window.escapeHtml(o.status || 'Beklemede')}</span>
                    <div class="space-x-1">
                        <button onclick="updateOfferStatus('${window.escapeHtml(o.id)}', 'Onaylandı')" class="bg-emerald-600 text-white px-2 py-1 rounded text-[10px]">Onayla</button>
                        <button onclick="updateOfferStatus('${window.escapeHtml(o.id)}', 'Reddedildi')" class="bg-red-600 text-white px-2 py-1 rounded text-[10px]">Reddet</button>
                    </div>
                </div>
                ${o.note ? `<p class="text-[10px] text-gray-500 italic bg-amber-100/50 p-1.5 rounded">Not: "${window.escapeHtml(o.note)}"</p>` : ''}
                ${cleanPhone ? `
                    <a href="${waUrl}" target="_blank" class="inline-flex items-center justify-center space-x-1 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-[11px] transition shadow-sm">
                        <i class="fa-brands fa-whatsapp text-sm"></i>
                        <span>Teklif Veren İle WhatsApp'tan Yazış</span>
                    </a>
                ` : '<p class="text-[10px] text-red-500 italic">Telefon numarası belirtilmemiş.</p>'}
            `;
            container.appendChild(div);
        });
    } catch(err) {
        container.innerHTML = `<p class="text-xs text-red-400">Teklifler yüklenirken hata oluştu.</p>`;
    }
};

window.updateOfferStatus = async function(offerId, status) {
    try {
        await update(ref(db, `offers/${offerId}`), { status: status });
        alert(`Teklif durumu "${status}" olarak güncellendi.`);
        window.loadIncomingOffers();
    } catch(err) {
        alert("Hata: " + err.message);
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

window.getDefaultImage = function(category) {
    switch(category) {
        case 'Zeytin & Yağ': return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80';
        case 'Narenciye': return 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&w=600&q=80';
        case 'Salça & Sos': return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80';
        case 'Bakliyat & Hububat': return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80';
        case 'Sebze & Sera': return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
        case 'Nakliye': return 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80';
        default: return 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
    }
};

const categoryEmojis = {
    "Zeytin & Yağ": "🫒",
    "Narenciye": "🍊",
    "Salça & Sos": "🌶️",
    "Bakliyat & Hububat": "🌾",
    "Sebze & Sera": "🥬",
    "Canlı Hayvan & Süt": "🐄",
    "Fide & Tohum": "🌱",
    "Nakliye": "🚛",
    "Diğer": "📦"
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

// Geliştirilmiş Konum ve İlçe Sınır Çözümlemesi
window.resolveLocation = async function(lat, lng) {
    const banner = document.getElementById('outside-hatay-warning');
    const districtSelect = document.getElementById('form-district');
    window.locationOutsideHatay = null;
    banner.classList.add('hidden');

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'tr' } });
        const data = await res.json();

        const waterTypes = ['water', 'sea', 'bay', 'strait', 'ocean', 'reef'];
        const isSea = !data || data.error || !data.address || !data.address.country ||
            waterTypes.includes(data.type) || waterTypes.includes(data.category);

        if (isSea) {
            alert("Seçtiğiniz nokta kara üzerinde değil (deniz/açık su olabilir). Lütfen kara üzerinde bir nokta seçin.");
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
        const detectedTownOrDistrict = addr.town || addr.city_district || addr.county || addr.municipality || addr.suburb || '';
        const isInsideHatay = province && province.toLocaleLowerCase('tr-TR').includes('hatay');

        if (isInsideHatay) {
            // Adres verisinde doğrudan Hatay ilçelerinden biri geçiyor mu kontrol et
            let matchedDistrict = null;
            const cleanDetected = detectedTownOrDistrict.toLocaleLowerCase('tr-TR');
            
            for (const districtName of Object.keys(districtCoords)) {
                if (cleanDetected.includes(districtName.toLocaleLowerCase('tr-TR'))) {
                    matchedDistrict = districtName;
                    break;
                }
            }

            if (matchedDistrict) {
                districtSelect.value = matchedDistrict;
            } else {
                // Eğer doğrudan ilçe adı dönmediyse, harita koordinatlarına göre en yakın ilçe merkezini seç
                let nearest = null, nearestDist = Infinity;
                for (const [name, coords] of Object.entries(districtCoords)) {
                    const d = window.haversineKm(lat, lng, coords[0], coords[1]);
                    if (d < nearestDist) { nearestDist = d; nearest = name; }
                }
                if (nearest) districtSelect.value = nearest;
            }
        } else {
            districtSelect.value = 'Hatay Dışı';
            window.locationOutsideHatay = { province, district: detectedTownOrDistrict };
            banner.innerText = `⚠️ Dikkat: Bu konum Hatay dışında — ${province}${detectedTownOrDistrict ? ' / ' + detectedTownOrDistrict : ''}. İlanı yine de yayınlayabilirsiniz, ancak "Hatay Dışı" olarak işaretlenip alıcılara böyle gösterilecektir.`;
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
        alert("Lütfen önce bir adres yazın.");
        return;
    }
    const btn = document.getElementById('geocode-btn');
    btn.disabled = true;
    btn.innerText = "Aranıyor...";

    try {
        const searchQuery = `${queryStr}, Hatay, Türkiye`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQuery)}`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'tr' } });
        const results = await res.json();

        if (!results || results.length === 0) {
            alert("Adres bulunamadı. Lütfen haritadan tıklayarak konumu elle işaretleyin.");
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
        alert("Adres aranırken bir sorun oluştu. Lütfen haritadan tıklayarak konumu elle işaretleyin.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Bul";
    }
};

window.toggleWholesaleFields = function() {
    const type = document.getElementById('form-business-type').value;
    const box = document.getElementById('wholesale-fields');
    if (box) box.classList.toggle('hidden', type !== 'Toptancı');
};

function updateFormMapCenter(district) {
    const coords = districtCoords[district] || [36.2023, 36.1613];
    if (window.formMapInstance) {
        window.formMapInstance.setView(coords, 12);
    }
}

function shareOnWhatsApp() {
    const item = (window.listings || []).find(l => l.id === window.activeListingId);
    if (!item) return;
    const text = `📌 ORONTES HATAY PAZARI\n\n🌾 ${escapeHtml(item.title)}\n💰 Fiyat: ${item.price} TL / ${item.unit}\n📍 Konum: ${item.outsideHatay ? escapeHtml(window.getListingLocationText(item)) : 'Hatay / ' + escapeHtml(item.district)}\n\nİlanı İnceleyin: ${window.location.href}`;
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
    ['listings', 'favorites', 'offers', 'settings'].forEach(t => {
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
}

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
        div.innerHTML = `
            <div class="flex items-center space-x-2">
                <img src="${escapeHtml(item.image)}" class="w-10 h-10 rounded-lg object-cover">
                <div>
                    <span class="font-bold text-lux-dark block line-clamp-1">${escapeHtml(item.title)}</span>
                    <span class="text-[10px] text-gray-500">${item.price} TL • ${escapeHtml(window.getListingLocationText(item))}</span>
                </div>
            </div>
            <button onclick="openDetailModal('${escapeHtml(item.id)}'); closeAccountModal();" class="bg-lux-dark text-white text-[10px] px-2.5 py-1 rounded">İncele</button>
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
        container.innerHTML = `<div class="flex space-x-8 items-center px-4"><span class="font-bold text-lux-gold uppercase">Hatay Piyasa Endeksi:</span><span>Sitede henüz aktif ilan bulunmuyor.</span></div>`;
        return;
    }

    const categories = [
        "Zeytin & Yağ", "Narenciye", "Salça & Sos", "Bakliyat & Hububat", 
        "Sebze & Sera", "Canlı Hayvan & Süt", "Fide & Tohum", "Nakliye", "Diğer"
    ];

    let contentHTML = `<div class="flex space-x-4 items-center px-4 shrink-0">
        <span class="font-bold text-lux-gold uppercase flex items-center space-x-1 mr-2"><i class="fa-solid fa-chart-line"></i><span>Hatay Canlı Piyasa Endeksi:</span></span>`;

    categories.forEach(cat => {
        const catListings = items.filter(i => i.category === cat);
        if (catListings.length > 0) {
            const emoji = categoryEmojis[cat] || '🌾';
            contentHTML += `<button onclick="openCategoryDetailModal('${escapeHtml(cat)}')" class="hover:bg-lux-dark text-white font-medium px-2.5 py-1 rounded-lg bg-lux-dark/50 border border-lux-gold/30 cursor-pointer whitespace-nowrap transition flex items-center space-x-1">
                <span>${emoji}</span>
                <span><b>${escapeHtml(cat)}</b> (${catListings.length} İlan)</span>
            </button>`;
        }
    });

    contentHTML += `</div>`;
    container.innerHTML = contentHTML + contentHTML;
}

// Kategori Detay Modal & Sayfalandırma Mantığı
function openCategoryDetailModal(cat) {
    window.currentCategoryModalData = (window.listings || [])
        .filter(i => i.category === cat)
        .sort((a, b) => b.date - a.date);
    window.catModalCurrentPage = 1;
    
    const emoji = categoryEmojis[cat] || '🌾';
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
        const emoji = categoryEmojis[item.category] || '🌾';
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
    document.getElementById('account-avatar').innerText = name.charAt(0).toUpperCase();

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
        alert("İlan eklemek için önce giriş yapmalısınız.");
        openAuthModal('login');
        return;
    }
    const addForm = document.getElementById('add-listing-form');
    if (addForm) addForm.reset();
    document.getElementById('edit-listing-id').value = '';
    document.getElementById('form-lat').value = '';
    document.getElementById('form-lng').value = '';
    document.getElementById('form-address').value = '';
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
    document.getElementById('form-business-type').value = 'Üretici';
    document.getElementById('form-min-order').value = '';
    window.toggleWholesaleFields();
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
    document.getElementById('form-category').value = item.category;
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
    document.getElementById('form-business-type').value = item.businessType || 'Üretici';
    document.getElementById('form-min-order').value = item.minOrderQty || '';
    window.toggleWholesaleFields();

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
function toggleAuthMode() { 
    const currentMode = document.getElementById('auth-mode').value;
    const targetMode = currentMode === 'login' ? 'register' : 'login';
    
    document.getElementById('auth-username').value = '';
    document.getElementById('auth-phone').value = '';
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-password').value = '';
    
    openAuthModal(targetMode);
}

function openTermsModal() { document.getElementById('terms-modal').classList.remove('hidden'); }
function closeTermsModal() { document.getElementById('terms-modal').classList.add('hidden'); }

function openReportModal() { 
    if(!window.currentUser) {
        alert("Şikayet bildirimi için giriş yapmalısınız.");
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
        alert("Şikayetiniz iletildi.");
        closeReportModal();
    } catch(err) {
        alert("Hata: " + err.message);
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
    if (countEl) countEl.innerText = `${items.length} İlan`;
    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-16 bg-white rounded-2xl border border-gray-200 text-gray-400 text-xs">Aradığınız kriterlere uygun ilan bulunamadı.</div>`;
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
        const emoji = categoryEmojis[item.category] || '🌾';

        card.className = `bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 ${window.currentViewMode === 'list' ? 'flex flex-row' : 'flex flex-col justify-between'} ${cardStyle}`;
        card.innerHTML = `
            <div>
                <div class="listing-card-image relative h-44 overflow-hidden bg-lux-bg/50">
                    <img src="${escapeHtml(item.image)}" class="w-full h-full object-cover">
                    <button onclick="toggleFavorite('${escapeHtml(item.id)}')" class="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm ${isFav ? 'text-red-600' : 'text-gray-400'} flex items-center justify-center text-xs shadow transition">
                        <i class="fa-solid fa-heart"></i>
                    </button>
                    <div class="absolute top-2.5 left-2.5 flex flex-col gap-1">
                        ${isVipActive ? '<span class="bg-lux-gold text-lux-dark font-extrabold text-[9px] px-2 py-0.5 rounded">VIP</span>' : ''}
                        ${item.isUrgent ? '<span class="bg-red-600 text-white font-bold text-[9px] px-2 py-0.5 rounded animate-pulse">ACİL</span>' : ''}
                        ${item.businessType === 'Toptancı' ? '<span class="bg-lux-olive text-white font-bold text-[9px] px-2 py-0.5 rounded">🏢 TOPTANCI</span>' : ''}
                        ${item.outsideHatay ? '<span class="bg-red-600 text-white font-bold text-[9px] px-2 py-0.5 rounded">⚠️ HATAY DIŞI</span>' : ''}
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
                        <span class="text-[9px] text-gray-400 block">${escapeHtml(item.unit || 'Birim Fiyat')}</span>
                        <span class="text-base font-bold text-lux-dark">${item.price} TL</span>
                        ${item.businessType === 'Toptancı' && item.minOrderQty ? `<span class="text-[9px] text-lux-olive font-semibold block mt-0.5">Min. sipariş: ${escapeHtml(item.minOrderQty)}</span>` : ''}
                    </div>
                    <button onclick="openDetailModal('${escapeHtml(item.id)}')" class="text-[11px] bg-lux-bg hover:bg-lux-sage/30 text-lux-dark font-semibold px-2.5 py-1.5 rounded-lg transition">İncele</button>
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

function filterListings() {
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const districtFilter = document.getElementById('district-filter');
    const sortFilter = document.getElementById('sort-filter');
    const minPriceFilter = document.getElementById('min-price-filter');
    const maxPriceFilter = document.getElementById('max-price-filter');

    const search = searchInput ? searchInput.value.toLowerCase() : '';
    const category = categoryFilter ? categoryFilter.value : '';
    const district = districtFilter ? districtFilter.value : '';
    const sort = sortFilter ? sortFilter.value : 'newest';
    const minPrice = minPriceFilter ? (Number(minPriceFilter.value) || 0) : 0;
    const maxPrice = maxPriceFilter ? (Number(maxPriceFilter.value) || Infinity) : Infinity;

    window.filteredListings = (window.listings || []).filter(item => {
        const matchesSearch = String(item.title || '').toLowerCase().includes(search) || String(item.desc || '').toLowerCase().includes(search);
        const matchesCategory = category === "" || item.category === category;
        const matchesDistrict = district === "" || item.district === district;
        const matchesPrice = item.price >= minPrice && item.price <= maxPrice;
        return matchesSearch && matchesCategory && matchesDistrict && matchesPrice;
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
        filterListings();
        return;
    }
    if (!navigator.geolocation) {
        alert("Tarayıcınız konum özelliğini desteklemiyor.");
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
            filterListings();
        },
        (err) => {
            if (btn) btn.disabled = false;
            alert("Konumunuza erişilemedi. Lütfen tarayıcı ayarlarından konum iznini kontrol edin.");
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
    filterListings();
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
    document.getElementById('detail-price').innerText = `${item.price} TL`;
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

    const outsideBox = document.getElementById('detail-outside-hatay-box');
    if (item.outsideHatay) {
        const cityPart = item.realProvince ? `${item.realProvince} şehrinde` : 'Hatay dışında bir şehirde';
        const districtPart = item.realDistrict ? `, ${item.realDistrict} ilçesinde` : '';
        document.getElementById('detail-outside-hatay-text').innerText = `Bu ilan Hatay dışında — ${cityPart}${districtPart} bulunuyor.`;
        outsideBox.classList.remove('hidden');
    } else {
        outsideBox.classList.add('hidden');
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

    let cleanPhone = item.phone ? item.phone.replace(/[^0-9]/g, '') : '';
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
    const waMsg = `Merhaba ${item.seller}, ORONTES üzerindeki "${escapeHtml(item.title)}" ilanınız hakkında görüşmek istiyorum.`;
    document.getElementById('detail-whatsapp').href = `https://wa.me/90${cleanPhone}?text=${encodeURIComponent(waMsg)}`;

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
