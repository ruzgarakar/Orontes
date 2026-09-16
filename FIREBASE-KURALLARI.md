# Firebase Realtime Database Kuralları — Kurulum

Yönetici panelindeki **"Başvurular okunamadı"**, **"Şikâyetler okunamadı"** ve
**"Sorun bildirimleri okunamadı"** uyarıları bir kod hatası değildir: Firebase Realtime
Database kuralları, yönetici hesabına `verifications`, `reports` ve `disputes` düğümlerini
**liste olarak** okuma izni vermediğinde ortaya çıkar.

## Neden oluyor?

Realtime Database'de okuma izni, **okunan yolun kendisinde ya da bir üst düğümünde**
tanımlı olmak zorundadır. Kurallar şu şekilde yazıldığında:

```json
"verifications": {
  "$uid": { ".read": "auth.uid === $uid" }
}
```

her kullanıcı **yalnızca kendi** kaydını okuyabilir. Yönetici paneli ise tüm başvuruları
görebilmek için `/verifications` düğümünün **tamamını** okumak ister; bu yolda `.read`
tanımlı olmadığı için Firebase `PERMISSION_DENIED` döner ve panel boş kalır —
belge gönderilmiş olsa bile. Aynı durum ilan şikâyetlerinin tutulduğu `/reports` ve
"Sorun Bildir" kayıtlarının tutulduğu `/disputes` düğümleri için de geçerlidir.

## Çözüm (2 dakika)

1. [Firebase Console](https://console.firebase.google.com/) → projeyi seçin.
2. Sol menüden **Build → Realtime Database → Rules (Kurallar)** sekmesine girin.
3. Bu depodaki [`database.rules.json`](./database.rules.json) dosyasının içeriğini
   kopyalayıp kural alanına yapıştırın.
4. **Publish (Yayınla)** düğmesine basın.

> Kuralları yönetici panelinden de kopyalayabilirsiniz:
> **Yönetim → Firebase kuralları** düğmesi kuralların tamamını gösterir ve tek tıkla kopyalar.
> İzin hatası oluştuğunda panelin üstünde kırmızı bir uyarı şeridi ve aynı düğme belirir.

Kurallar yayınlandıktan sonra yönetici panelindeki üç sekme de dolmaya başlar:
**Doğrulama** (ÇKS / Ziraat Odası belgeleri), **İlan Şikâyetleri** ve **Sorun Bildirimleri**.
Yönetim düğmesinin üzerindeki kırmızı sayaç bu üç kuyruktaki bekleyen kayıtların toplamını
gösterir ve yalnızca yöneticilere görünür.

## Yönetici kim sayılıyor?

Kurallar iki yolu birden destekler:

* **E-posta ile:** `auth.token.email === 'orontesdestek@gmail.com'`
  (`app.js` içindeki `window.ORONTES_ADMIN_EMAILS` listesiyle aynı olmalıdır.)
* **UID ile:** Realtime Database'de `admins/<UID>` düğümü varsa o kullanıcı yöneticidir.

Yeni bir yönetici eklemek için Realtime Database'de şu kaydı oluşturmanız yeterlidir:

```json
{
  "admins": {
    "KULLANICININ_UID_DEGERI": true
  }
}
```

Yönetici e-postasını değiştirirseniz **hem** `app.js` içindeki `ORONTES_ADMIN_EMAILS`
listesini **hem de** `database.rules.json` içindeki e-posta kontrollerini güncelleyin.

## Kuralların kapsadığı düğümler

| Düğüm | Okuma | Yazma |
|---|---|---|
| `listings`, `buyRequests`, `groupBuys` | Herkes | İlan sahibi (+ yönetici) |
| `publicProfiles`, `ratings`, `verifiedProducers`, `usernames` | Herkes | Kendi kaydı (rozetler: yönetici) |
| `users` | Sadece kendisi | Sadece kendisi |
| `offers` | Giriş yapmış kullanıcılar | Giriş yapmış kullanıcılar |
| `listingCounter` | Giriş yapmış kullanıcılar | Giriş yapmış kullanıcılar |
| `verifications` | Kendi kaydı + **yönetici (tümü)** | Kendi kaydı + yönetici |
| `reports`, `disputes` | **Yalnızca yönetici** | Bildirimi açan (oluşturma) + yönetici |
| `admins` | Giriş yapmış kullanıcılar | Yalnızca Firebase Console |

> `.indexOn` tanımları uygulamadaki `orderByChild` sorguları içindir; kaldırılırsa
> listeler çalışmaya devam eder ancak Firebase konsolunda performans uyarısı görürsünüz.

## Kurallar yayınlanmadan önce ne olur?

Uygulama çökmez; yalnızca yönetici listeleri boş kalır ve panelde ne yapılması gerektiğini
anlatan kırmızı uyarı görünür. Belge yükleme, şikâyet gönderme ve sorun bildirme akışları
kullanıcı tarafında çalışmaya devam eder (kayıtlar veritabanına yazılır), kurallar
yayınlandığı anda yönetici panelinde görünür hâle gelirler.
