# ❓ الأسئلة الشائعة وحل المشاكل

## 🎁 نظام المكافآت اليومية

### س: لماذا لم تظهر المكافأة اليومية؟

**الأسباب المحتملة والحلول:**

1. **لم تُستدعَ الدالة بعد**
   ```javascript
   // تأكد من استدعاء هذا عند تحميل الصفحة
   checkAndApplyDailyLoginReward();
   ```

2. **المستخدم قام بالدخول مسبقاً اليوم**
   - يتم منح المكافأة مرة واحدة فقط يومياً
   - الحل: انتظر حتى منتصف الليل

3. **مشكلة في الاتصال بـ Firebase**
   ```javascript
   // أضف معالجة الأخطاء
   try {
     await checkAndApplyDailyLoginReward();
   } catch (error) {
     console.error('Firebase error:', error);
   }
   ```

---

### س: كيف أعيّن جوائز مختلفة للأيام؟

**الحل:**
```javascript
// عدّل هذا الجدول في daily_login_rewards.js
const DAILY_LOGIN_SCHEDULE = {
  1: 100,   // اليوم الأول
  2: 10,    // اليوم الثاني
  3: 20,    // اليوم الثالث
  4: 50,    // اليوم الرابع
  5: 75,    // اليوم الخامس
  6: 100,   // اليوم السادس
  7: 200,   // اليوم السابع (هدية أسبوعية)
  // استمر حسب الحاجة
};

// للأيام بعد 7، ستكون عشوائية من 10-100
```

---

### س: كيف أعرض عدد الأيام المتتالية للمستخدم؟

**الحل:**
```javascript
// احصل على المعلومات
const loginInfo = await getDailyLoginInfo();

// عرّض في الواجهة
if (loginInfo) {
  document.getElementById('consecutiveDays').textContent = loginInfo.consecutiveDays;
  
  // عرّض إشعار خاص
  if (loginInfo.consecutiveDays === 7) {
    showAchievementBadge('تم! 7 أيام متتالية 🔥');
  }
}
```

---

### س: هل يمكن إعادة تعيين العد للمستخدمين؟

**الحل (للأدمين فقط):**
```javascript
async function resetUserStreak(userId) {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) return;

  await db.collection('users').doc(userId).update({
    consecutiveDays: 0,
    lastLoginDate: null
  });
}
```

---

## 🎀 نظام هدايا المستخدمين الجدد

### س: هدية المستخدم الجديد لا تظهر

**تحقق من:**

1. **هل تم تفعيل الهدايا؟**
   ```javascript
   const gifts = await getNewUserGifts();
   console.log('Gifts enabled:', gifts && gifts.length > 0);
   ```

2. **هل استدعيت الدالة؟**
   ```javascript
   // يجب استدعاء هذا عند إنشاء حساب جديد
   await checkAndApplyNewUserGift();
   ```

3. **هل المستخدم حقاً جديد؟**
   ```javascript
   const userDoc = await db.collection('users').doc(userId).get();
   console.log('newUserGiftApplied:', userDoc.data().newUserGiftApplied);
   // يجب أن يكون false للمستخدمين الجدد
   ```

---

### س: كيف أضيف منتج مجاني كهدية؟

**الحل:**
```javascript
// 1. من لوحة التحكم
// اختر "منتج مجاني" من القائمة المنسدلة

// 2. أو برمجياً
const gift = {
  id: 'gift_free_product',
  type: 'product',
  description: 'منتج حصري للأعضاء الجدد',
  productId: 'prod_12345',
  productName: 'منتج مميز مجاني',
  enabled: true
};

// أضف إلى الإعدادات
const settingsRef = db.collection('settings').doc('newUserGifts');
const current = await settingsRef.get();
const gifts = [...(current.data()?.gifts || []), gift];

await settingsRef.set({ enabled: true, gifts });
```

---

### س: كيف أعطيل هدايا معينة؟

**الحل:**
```javascript
async function disableGift(giftId) {
  const settingsRef = db.collection('settings').doc('newUserGifts');
  const current = await settingsRef.get();
  
  const updatedGifts = current.data().gifts.map(gift => ({
    ...gift,
    enabled: gift.id === giftId ? false : gift.enabled
  }));
  
  await settingsRef.update({ gifts: updatedGifts });
}
```

---

### س: كيف أرى من استقبل الهدايا؟

**الحل:**
```javascript
async function getUsersWithGifts() {
  const snapshot = await db.collection('users')
    .where('newUserGiftApplied', '==', true)
    .get();
  
  return snapshot.docs.map(doc => ({
    userId: doc.id,
    appliedDate: doc.data().newUserGiftAppliedDate,
    email: doc.data().email
  }));
}

// الاستخدام
const usersWithGifts = await getUsersWithGifts();
console.log(`${usersWithGifts.length} مستخدم استقبلوا الهدايا`);
```

---

## ⭐ نظام المنتجات المحدودة

### س: المنتج المحدود لا يعمل بشكل صحيح

**تحقق من:**

1. **هل تم تفعيل `isExclusive`؟**
   ```javascript
   const product = await db.collection('products').doc(productId).get();
   console.log('isExclusive:', product.data().isExclusive);
   console.log('maxUnits:', product.data().maxUnits);
   // يجب أن يكون isExclusive = true و maxUnits > 0
   ```

2. **هل تحدّث عداد المبيعات؟**
   ```javascript
   // أضف هذا عند كل شراء
   await incrementProductSoldCount(productId, 1);
   ```

3. **هل قاعدة البيانات محدّثة؟**
   ```javascript
   // تحقق من القيم
   const product = await db.collection('products').doc(productId).get();
   const { maxUnits, soldUnits } = product.data();
   console.log(`متوفر: ${maxUnits - soldUnits} من ${maxUnits}`);
   ```

---

### س: كيف أحدّد عدد وحدات المنتج بشكل آمن؟

**الحل:**
```javascript
// 1. استخدم setProductMaxLimit (يتحقق من الصلاحيات)
const success = await setProductMaxLimit('product_id', 100, true);

// 2. أو من لوحة التحكم
// انقر على اسم المنتج → اضغط الإعدادات ⚙️
```

---

### س: كيف أرى الكمية المتبقية؟

**الحل:**
```javascript
// احصل على معلومات المخزون
const stock = await getProductStockInfo('product_id');

console.log(`
  المنتج: ${stock.productName}
  الحد الأقصى: ${stock.maxUnits}
  المباع: ${stock.soldUnits}
  المتبقي: ${stock.remainingUnits}
  النسبة: ${stock.percentageSold}%
  الحالة: ${stock.stockStatus}
`);
```

---

### س: كيف أعرّض إشعار "نفدت الكمية"؟

**الحل:**
```javascript
async function displayProductStatus(productId) {
  const stock = await getProductStockInfo(productId);
  
  if (!stock.isAvailable) {
    document.getElementById(`btn_${productId}`).textContent = '❌ نفدت الكمية';
    document.getElementById(`btn_${productId}`).disabled = true;
  } else if (stock.remainingUnits < 5) {
    document.getElementById(`btn_${productId}`).textContent = 
      `⚠️ ${stock.remainingUnits} متبقي`;
  }
}
```

---

### س: هل يمكن إعادة فتح المبيعات بعد نفاد الكمية؟

**الحل (للأدمين):**
```javascript
async function reopenProductSales(productId, newMaxUnits) {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) return;

  await db.collection('products').doc(productId).update({
    maxUnits: newMaxUnits,
    // اختياري: إعادة تعيين العداد
    soldUnits: 0,
    reopenedAt: firebase.firestore.Timestamp.now()
  });
}

// الاستخدام
await reopenProductSales('product_id', 50);
```

---

### س: كيف أحصل على تقرير المبيعات؟

**الحل:**
```javascript
// احصل على التقرير
const report = await getExclusiveProductsReport();

console.log(`
  إجمالي المنتجات المحدودة: ${report.totalProducts}
  إجمالي الوحدات: ${report.totalMaxUnits}
  إجمالي المباع: ${report.totalSoldUnits}
  منتجات نفدت: ${report.exhaustedProducts}
`);

// عرّض المنتجات
report.products.forEach(product => {
  console.log(`${product.name}: ${product.remainingUnits} متبقي`);
});
```

---

## 🔒 مشاكل الأمان والصلاحيات

### س: رسالة "غير مخول" (Unauthorized)

**الحل:**

1. **تحقق من أن المستخدم أدمين**
   ```javascript
   // في Firebase Console، Custom Claims
   admin.auth().setCustomUserClaims(userId, { admin: true });
   ```

2. **إعادة تحميل التوكن**
   ```javascript
   // بعد تعيين الصلاحيات، أعد تحميل التوكن
   await user.getIdToken(true);
   ```

3. **تحقق من قواعد الأمان**
   ```javascript
   // تأكد من أن قواعد Firestore صحيحة
   // match /settings/{document=**} {
   //   allow read, write: if request.auth.token.admin == true;
   // }
   ```

---

### س: كيف أسمح لأدمين معينين فقط؟

**الحل:**
```javascript
// أضف قائمة الأدمين المسموح بهم
async function setAdminAccess(userId) {
  const isOwner = await checkOwnerAccess(); // تحقق من المالك
  if (!isOwner) return;

  await db.collection('settings').doc('admins').set({
    allowedAdmins: firebase.firestore.FieldValue.arrayUnion(userId)
  }, { merge: true });

  // قيّم Custom Claims
  await admin.auth().setCustomUserClaims(userId, { admin: true });
}

// التحقق
async function checkAdminAccess() {
  const user = getCurrentUser();
  if (!user) return false;

  const token = await user.getIdTokenResult();
  return token.claims.admin === true;
}
```

---

## 🐛 مشاكل عامة

### س: خطأ "Firebase not defined"

**الحل:**
```html
<!-- تأكد من إضافة Firebase قبل البرامج النصية الأخرى -->
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-firestore.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-auth.js"></script>

<!-- ثم البرامج النصية الخاصة بك -->
<script src="daily_login_rewards.js"></script>
```

---

### س: البيانات لا تحفظ في Firebase

**التحقق:**
```javascript
// 1. تأكد من اتصال Firebase
console.log('Firebase initialized:', !!db);

// 2. تحقق من الأخطاء
try {
  await db.collection('test').add({ test: true });
  console.log('Firebase is working');
} catch (error) {
  console.error('Firebase error:', error);
}

// 3. تحقق من قواعس الأمان
// قد تحتاج لتعديل Security Rules
```

---

### س: الأداء بطيء عند تحميل المنتجات

**الحل:**
```javascript
// استخدم Firestore Index
// أضف Index لـ:
// - collections: products
// - fields: isExclusive, soldUnits

// أو استخدم التخزين المؤقت
const CACHE_DURATION = 60000; // دقيقة واحدة
let productCache = {};
let cacheTime = 0;

async function getCachedProduct(productId) {
  const now = Date.now();
  
  if (productCache[productId] && (now - cacheTime) < CACHE_DURATION) {
    return productCache[productId];
  }
  
  const product = await db.collection('products').doc(productId).get();
  productCache[productId] = product.data();
  cacheTime = now;
  
  return productCache[productId];
}
```

---

### س: الإشعارات لا تظهر

**الحل:**
```javascript
// تأكد من أن الدالة موجودة
if (typeof showDailyRewardNotification !== 'function') {
  console.error('showDailyRewardNotification is not defined');
}

// تحقق من الكونسول
showDailyRewardNotification(100, 5); // يجب أن يظهر إشعار

// تحقق من CSS
// تأكد من أن .daily-reward-toast له موضع fixed
```

---

## 💡 نصائح مفيدة

1. **استخدم وحدة التحكم (Console)**
   ```javascript
   // اختبر الدوال مباشرة
   checkAndApplyDailyLoginReward();
   getProductStockInfo('product_id');
   ```

2. **استخدم Firebase Emulator**
   ```bash
   firebase emulators:start
   ```

3. **سجّل جميع الأخطاء**
   ```javascript
   window.addEventListener('error', (e) => {
     console.error('Error:', e);
     logErrorToDatabase(e);
   });
   ```

4. **استخدم Batch للتحديثات الكبيرة**
   ```javascript
   const batch = db.batch();
   
   // أضف عمليات متعددة
   batch.update(db.collection('products').doc('id1'), { soldUnits: 10 });
   batch.update(db.collection('products').doc('id2'), { soldUnits: 20 });
   
   // نفّذ الكل مرة واحدة
   await batch.commit();
   ```

---

## 📞 الدعم والمساعدة

- اطلب مساعدة من فريق التطوير
- تحقق من سجلات Firebase
- استخدم Firebase Analytics لتتبع المشاكل
- أنشئ تقرير خطأ مفصلاً

---

✅ **آخر تحديث:** 2024
