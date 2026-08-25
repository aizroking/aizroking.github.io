# 🎯 دليل التكامل - الميزات الجديدة للموقع

## 📋 الفهرس
1. نظام تسجيل الدخول اليومي
2. نظام هدايا المستخدمين الجدد
3. نظام إدارة المنتجات المحدودة
4. التكامل مع Firebase
5. أمثلة الاستخدام

---

## 1️⃣ نظام تسجيل الدخول اليومي (Daily Login Rewards)

### الميزات:
- **جوائز يومية**: 100 نقطة (اليوم 1) → 10 نقاط (اليوم 2) → 20 نقطة (اليوم 3)
- **أيام عشوائية**: من اليوم 4 فما فوق: عشوائي من 10-100 نقطة
- **سلسلة متتالية**: تتبع عدد الأيام المتتالية للدخول
- **إشعارات فورية**: عرض المكافآت المكتسبة على الفور

### كيفية الاستخدام:

#### 1. إضافة البرنامج النصي:
```html
<!-- في ملف index.html قبل closing </body> -->
<script src="daily_login_rewards.js"></script>
```

#### 2. استدعاء الدالة عند تحميل الصفحة:
```javascript
// في دالة initialization
(function initPage() {
  // ... الكود الموجود ...
  
  // استدعِ هذا عند تحميل الصفحة
  checkAndApplyDailyLoginReward();
})();
```

#### 3. عرض معلومات تسجيل الدخول (اختياري):
```javascript
// احصل على معلومات المستخدم
const loginInfo = await getDailyLoginInfo();

if (loginInfo) {
  console.log('أيام متتالية:', loginInfo.consecutiveDays);
  console.log('دخول اليوم:', loginInfo.loginToday);
  console.log('المكافأة القادمة:', loginInfo.nextRewardAmount);
}
```

### قاعدة البيانات (Firebase):
```
users/{userId}
├── lastLoginDate: "2024-01-15" (string: YYYY-MM-DD)
├── consecutiveDays: 5 (number)
├── totalDailyRewards: 10 (number)
└── balance: 1500 (number)

users/{userId}/dailyRewards/{docId}
├── timestamp: Timestamp
├── amount: 100 (number)
├── day: 5 (number)
└── type: "daily_login"
```

### التخصيص:

تعديل جدول الجوائز في `daily_login_rewards.js`:
```javascript
const DAILY_LOGIN_SCHEDULE = {
  1: 100,   // اليوم الأول
  2: 10,    // اليوم الثاني
  3: 20,    // اليوم الثالث
  // أضف أيام إضافية حسب الحاجة
  4: 50,
  5: 75,
};

const MIN_RANDOM_REWARD = 10;    // الحد الأدنى
const MAX_RANDOM_REWARD = 100;   // الحد الأقصى
```

---

## 2️⃣ نظام هدايا المستخدمين الجدد (New User Gifts)

### الميزات:
- **ثلاث أنواع هدايا**:
  - 💰 **نقاط**: إضافة نقاط مباشرة للمحفظة
  - 🎟️ **أكواد/كوبونات**: توزيع أكواد خصم أو هدايا
  - 📦 **منتجات مجانية**: منتجات حصرية للمستخدمين الجدد

- **إدارة من لوحة التحكم**: الأدمين يمكنهم إضافة/تعديل الهدايا
- **تطبيق تلقائي**: تُطبق الهدايا مرة واحدة فقط عند التسجيل الأول

### كيفية الاستخدام:

#### 1. إضافة البرنامج النصي:
```html
<script src="daily_login_rewards.js"></script> <!-- يحتوي على النظام -->
```

#### 2. استدعاء عند تسجيل المستخدم الجديد:
```javascript
// بعد إنشاء حساب جديد
(async function() {
  // ... إنشاء المستخدم ...
  
  // طبّق هدايا المستخدمين الجدد
  await checkAndApplyNewUserGift();
})();
```

#### 3. إضافة هدايا من لوحة التحكم:
- انتقل إلى "إدارة هدايا المستخدمين الجدد"
- اضغط "+ إضافة هدية جديدة"
- اختر نوع الهدية وأدخل التفاصيل
- اضغط "حفظ الهدية"

### قاعدة البيانات:

```
settings/newUserGifts
├── enabled: true (boolean)
└── gifts: [ (array)
  {
    id: "gift_1",
    type: "points", // points, coupon, product
    description: "1000 نقطة ترحيبية",
    amount: 1000 (للنقاط فقط),
    code: "WELCOME2024" (للأكواد فقط),
    productId: "prod_123" (للمنتجات فقط),
    productName: "منتج مميز",
    enabled: true,
    createdAt: Timestamp
  }
]

users/{userId}
├── newUserGiftApplied: true
├── newUserGiftAppliedDate: Timestamp
└── ...

users/{userId}/coupons/{docId}
├── code: "WELCOME2024"
├── description: "خصم 20%"
├── appliedDate: Timestamp
└── used: false

users/{userId}/freeProducts/{docId}
├── productId: "prod_123"
├── productName: "منتج"
├── appliedDate: Timestamp
└── claimed: false
```

### مثال إضافة هدية برمجياً:

```javascript
async function addWelcomeGift(userId) {
  const gift = {
    type: 'points',
    description: '1000 نقطة ترحيبية',
    amount: 1000
  };
  
  await applyGiftToUser(userId, gift);
}
```

---

## 3️⃣ نظام إدارة المنتجات المحدودة (Exclusive Products)

### الميزات:
- **منتجات حصرية**: تحديد عدد محدود للمنتج
- **عد تلقائي**: تتبع عدد الوحدات المباعة
- **منع الإفراط**: عدم السماح بالبيع بعد نفاد الكمية
- **إدارة من لوحة التحكم**: عرض حالة المخزون وتقارير البيعات
- **اختياري للأدمين**: المنتجات العادية تبقى غير محدودة

### كيفية الاستخدام:

#### 1. إضافة البرنامج النصي:
```html
<script src="admin_exclusive_products.js"></script>
```

#### 2. تحديد حد أقصى للمنتج:
```javascript
// جعل منتج حصرياً بـ 50 وحدة فقط
await setProductMaxLimit('product_123', 50, true);
```

#### 3. أثناء عملية الشراء:
```javascript
// قبل تأكيد الشراء
const available = await isProductAvailable('product_123');
if (!available) {
  showError('المنتج نفد من المخزون');
  return;
}

// بعد تأكيد الشراء
const result = await incrementProductSoldCount('product_123', 1);
if (result.isExhausted) {
  console.log('هذا آخر منتج متاح!');
}
```

#### 4. عرض حالة المخزون:
```javascript
const stock = await getProductStockInfo('product_123');
console.log(`المتبقي: ${stock.remainingUnits} من ${stock.maxUnits}`);
console.log(`حالة المخزون: ${stock.stockStatus}`);
```

### قاعدة البيانات:

```
products/{productId}
├── name: "اسم المنتج"
├── isExclusive: true
├── maxUnits: 50 (الحد الأقصى)
├── soldUnits: 23 (عدد المباع)
├── enableStockLimit: true
├── lastUpdatedAt: Timestamp
├── lastUpdatedBy: "userId"
└── ... (باقي حقول المنتج)
```

### واجهة الأدمين:

من لوحة التحكم، في قسم "إدارة المنتجات المحدودة":

1. **البحث والتصفية**: ابحث عن منتجات محددة
2. **تعديل الحد الأقصى**: اضغط على أيقونة الإعدادات ⚙️
3. **إعادة تعيين العداد**: اضغط على أيقونة الدوران 🔄
4. **عرض التقارير**: اضغط على "عرض تقرير المبيعات"

### مثال: منتج حصري (50 وحدة فقط)

```javascript
// 1. عند إنشاء المنتج
await setProductMaxLimit('limited_edition_item', 50, true);

// 2. في واجهة المتجر، أظهر حالة المخزون
const stock = await getProductStockInfo('limited_edition_item');
if (stock.remainingUnits < 10) {
  // أظهر تحذير "الكمية محدودة"
  showLimitedStockBadge();
}

// 3. عند الشراء
const result = await incrementProductSoldCount('limited_edition_item', 1);
if (result.isExhausted) {
  // أخف زر الشراء أو أظهر "نفدت الكمية"
  disablePurchaseButton();
}
```

---

## 4️⃣ التكامل مع Firebase

### إعدادات الأمان (Security Rules):

```javascript
// قواعد Firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // المستخدمون يمكنهم قراءة بيانات تسجيل الدخول الخاصة بهم فقط
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow update: if request.auth.uid == userId && 
                       request.resource.data.keys().hasOnly([
                         'balance', 'lastLoginDate', 'consecutiveDays', 
                         'totalDailyRewards', 'newUserGiftApplied'
                       ]);
    }
    
    // سجلات الهدايا
    match /users/{userId}/dailyRewards/{docId} {
      allow read: if request.auth.uid == userId;
      allow create: if request.auth.uid == userId;
    }
    
    // المنتجات - الجميع يقرؤون، الأدمين فقط يعدلون
    match /products/{productId} {
      allow read: if true;
      allow update: if request.auth.token.admin == true;
    }
    
    // الإعدادات - الأدمين فقط
    match /settings/{document=**} {
      allow read, write: if request.auth.token.admin == true;
    }
  }
}
```

### تفعيل Custom Claims للأدمين:

```javascript
// في Firebase Console أو عبر Admin SDK
admin.auth().setCustomUserClaims(userId, { admin: true });
```

---

## 5️⃣ أمثلة الاستخدام الكاملة

### مثال 1: تسجيل دخول جديد

```javascript
// عند تحميل الصفحة الرئيسية
(async function initializeUser() {
  const user = getCurrentUser();
  
  if (!user) return;
  
  // 1. تحقق من تسجيل الدخول اليومي
  await checkAndApplyDailyLoginReward();
  
  // 2. تحقق من هدايا المستخدمين الجدد
  await checkAndApplyNewUserGift();
  
  // 3. عدّل واجهة المستخدم
  refreshBalanceUI();
})();
```

### مثال 2: شراء منتج حصري

```javascript
async function purchaseExclusiveProduct(productId, userId) {
  try {
    // 1. تحقق من التوفر
    const available = await isProductAvailable(productId);
    if (!available) {
      throw new Error('المنتج غير متاح');
    }
    
    // 2. احصل على معلومات المخزون
    const stock = await getProductStockInfo(productId);
    console.log(`المتبقي: ${stock.remainingUnits}`);
    
    // 3. معالجة الدفع
    const paymentResult = await processPayment(productId, userId);
    if (!paymentResult.success) {
      throw new Error('فشلت عملية الدفع');
    }
    
    // 4. زيادة عداد المبيعات
    const result = await incrementProductSoldCount(productId, 1);
    
    if (result.isExhausted) {
      showNotification('هذا كان آخر منتج متاح!');
    }
    
    // 5. أخطر المستخدم بالنجاح
    showSuccess('تم الشراء بنجاح');
    
  } catch (error) {
    showError(error.message);
  }
}
```

### مثال 3: لوحة التحكم - إضافة هدية جديدة

```javascript
async function saveNewUserGift() {
  const type = document.getElementById('giftTypeSelect').value;
  
  const giftData = {
    id: generateId(),
    type: type,
    enabled: document.getElementById('giftEnabled').checked,
    createdAt: firebase.firestore.Timestamp.now()
  };
  
  if (type === 'points') {
    giftData.description = document.getElementById('pointsDesc').value;
    giftData.amount = parseInt(document.getElementById('pointsAmount').value);
  } else if (type === 'coupon') {
    giftData.code = document.getElementById('couponCode').value;
    giftData.description = document.getElementById('couponDesc').value;
  } else if (type === 'product') {
    const productId = document.getElementById('productSelect').value;
    const productDoc = await db.collection('products').doc(productId).get();
    giftData.productId = productId;
    giftData.productName = productDoc.data().name;
  }
  
  // حفظ في Firebase
  const settingsRef = db.collection('settings').doc('newUserGifts');
  const currentData = (await settingsRef.get()).data();
  
  const updatedGifts = [...(currentData?.gifts || []), giftData];
  
  await settingsRef.set({
    enabled: true,
    gifts: updatedGifts
  });
  
  showSuccess('تم إضافة الهدية بنجاح');
  loadGiftsSection(); // أعد تحميل القائمة
}
```

---

## 🔧 استكشاف الأخطاء

### مشكلة: المكافآت اليومية لا تظهر
- ✅ تأكد من استدعاء `checkAndApplyDailyLoginReward()`
- ✅ تحقق من اتصال Firebase
- ✅ تأكد من أن المستخدم مسجل دخول

### مشكلة: المنتج المحدود غير يعمل
- ✅ تأكد من تفعيل `isExclusive` و `maxUnits` > 0
- ✅ تحقق من أن `incrementProductSoldCount()` تُستدعى عند كل شراء
- ✅ تأكد من قواعس الأمان في Firebase

### مشكلة: هدايا المستخدمين الجدد لا تُطبق
- ✅ تحقق من أن `checkAndApplyNewUserGift()` تُستدعى
- ✅ تأكد من أن الهدايا مفعلة في الإعدادات
- ✅ تحقق من أن المستخدم جديد (`newUserGiftApplied === false`)

---

## 📱 الملفات المطلوبة

| الملف | الوصف | الموقع |
|------|--------|--------|
| `daily_login_rewards.js` | نظام المكافآت اليومية | `/home/claude/` |
| `admin_exclusive_products.js` | إدارة المنتجات المحدودة | `/home/claude/` |
| `admin_panel_additions.html` | واجهة الأدمين | `/home/claude/` |

---

## ✅ قائمة التحقق من التكامل

- [ ] إضافة `daily_login_rewards.js` إلى `index.html`
- [ ] إضافة `admin_exclusive_products.js` إلى `admin.html`
- [ ] دمج `admin_panel_additions.html` في لوحة التحكم
- [ ] استدعاء `checkAndApplyDailyLoginReward()` عند تحميل الصفحة
- [ ] استدعاء `checkAndApplyNewUserGift()` عند إنشاء حساب جديد
- [ ] تعديل دالة الشراء لاستخدام `incrementProductSoldCount()`
- [ ] اختبار جميع الميزات
- [ ] إعداد قواعس الأمان في Firebase

---

دعني إذا كنت تحتاج لمساعدة إضافية! 🚀
