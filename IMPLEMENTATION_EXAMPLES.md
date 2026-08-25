# 📝 أمثلة التطبيق العملي

## 1. تعديل دالة الشراء لدعم المنتجات المحدودة

### الكود الموجود (تقريبي):
```javascript
async function purchaseProduct(productId, userId) {
  // معالجة الشراء
}
```

### الكود المحسّن:
```javascript
async function purchaseProduct(productId, userId) {
  try {
    // 1. التحقق من توفر المنتج
    const available = await isProductAvailable(productId);
    if (!available) {
      showError('❌ عذراً، هذا المنتج غير متاح حالياً');
      return false;
    }

    // 2. احصل على معلومات المخزون
    const stock = await getProductStockInfo(productId);
    
    // 3. إذا كان المنتج محدوداً، عرّض تحذير
    if (stock.isExclusive && stock.remainingUnits < 5 && stock.remainingUnits > 0) {
      const confirm = await showConfirm(
        `⚠️ تحذير: لم يتبقَ إلا ${stock.remainingUnits} وحدة من هذا المنتج`
      );
      if (!confirm) return false;
    }

    // 4. معالجة الدفع
    const paymentResult = await processPayment(productId, userId);
    if (!paymentResult.success) {
      showError('❌ فشلت عملية الدفع: ' + paymentResult.error);
      return false;
    }

    // 5. تحديث عداد المبيعات
    const saleResult = await incrementProductSoldCount(productId, 1);
    if (!saleResult.success) {
      // إرجاع المال إذا فشل تحديث المبيعات
      await refundPayment(paymentResult.transactionId);
      showError('❌ حدث خطأ، تم استرجاع المبلغ');
      return false;
    }

    // 6. إذا نفدت الكمية، أخطر الأدمين
    if (saleResult.isExhausted) {
      await notifyAdminProductExhausted(productId);
      showSuccess('🎉 تم الشراء! (كان هذا آخر منتج متاح)');
    } else {
      showSuccess('🎉 تم الشراء بنجاح');
    }

    // 7. حدّث واجهة المتجر
    await refreshProductsDisplay();
    
    return true;

  } catch (error) {
    console.error('Purchase error:', error);
    showError('❌ حدث خطأ غير متوقع: ' + error.message);
    return false;
  }
}
```

---

## 2. إضافة شريط حالة المخزون على بطاقة المنتج

### HTML الموجود:
```html
<div class="card">
  <h3>اسم المنتج</h3>
  <p>الوصف</p>
  <button>اشتر الآن</button>
</div>
```

### HTML المحسّن:
```html
<div class="card" id="product_123">
  <h3>اسم المنتج</h3>
  <p>الوصف</p>
  
  <!-- شريط حالة المخزون (جديد) -->
  <div id="stockStatus_123" class="product-stock-status" style="display: none;">
    <div class="stock-info">
      <span class="stock-label" id="stockLabel_123">متوفر</span>
      <div class="stock-bar">
        <div class="stock-bar-fill" id="stockFill_123" style="width: 100%;"></div>
      </div>
      <span class="stock-percent" id="stockPercent_123">100%</span>
    </div>
  </div>
  
  <button id="buyBtn_123">اشتر الآن</button>
</div>
```

### CSS للشريط:
```css
.product-stock-status {
  background: linear-gradient(90deg, rgba(255,159,64,0.1), rgba(255,159,64,0.05));
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
  border-left: 3px solid #ff9f40;
}

.stock-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.stock-label {
  font-weight: 600;
  color: #ff9f40;
  min-width: 70px;
}

.stock-bar {
  flex: 1;
  height: 6px;
  background: rgba(255,159,64,0.2);
  border-radius: 3px;
  overflow: hidden;
}

.stock-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff9f40, #ffc107);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.stock-percent {
  font-weight: 600;
  color: #ff9f40;
  min-width: 45px;
  text-align: right;
}
```

### JavaScript لتحديث الشريط:
```javascript
async function updateProductStockDisplay(productId) {
  try {
    const stock = await getProductStockInfo(productId);
    
    if (!stock || !stock.isExclusive) {
      // إخفاء شريط المخزون للمنتجات غير المحدودة
      document.getElementById(`stockStatus_${productId}`)?.style.display = 'none';
      return;
    }

    // إظهار شريط المخزون
    document.getElementById(`stockStatus_${productId}`).style.display = 'block';

    // تحديث معلومات المخزون
    const label = stock.remainingUnits <= 0 
      ? '❌ نفدت الكمية' 
      : stock.remainingUnits < 5 
      ? `⚠️ ${stock.remainingUnits} متبقي`
      : '✅ متوفر';

    document.getElementById(`stockLabel_${productId}`).textContent = label;
    document.getElementById(`stockFill_${productId}`).style.width = 
      (100 - stock.percentageSold) + '%';
    document.getElementById(`stockPercent_${productId}`).textContent = 
      stock.percentageSold + '%';

    // تعطيل زر الشراء إذا نفدت الكمية
    const buyBtn = document.getElementById(`buyBtn_${productId}`);
    if (stock.remainingUnits <= 0) {
      buyBtn.disabled = true;
      buyBtn.textContent = 'نفدت الكمية';
      buyBtn.style.opacity = '0.5';
      buyBtn.style.cursor = 'not-allowed';
    } else {
      buyBtn.disabled = false;
      buyBtn.textContent = 'اشتر الآن';
      buyBtn.style.opacity = '1';
      buyBtn.style.cursor = 'pointer';
    }

  } catch (error) {
    console.error('Error updating stock display:', error);
  }
}

// استدعِ هذا عند تحميل المنتجات
document.querySelectorAll('.card').forEach(card => {
  const productId = card.id.replace('product_', '');
  updateProductStockDisplay(productId);
});

// حدّث المخزون كل 30 ثانية (اختياري)
setInterval(() => {
  document.querySelectorAll('.card').forEach(card => {
    const productId = card.id.replace('product_', '');
    updateProductStockDisplay(productId);
  });
}, 30000);
```

---

## 3. تفعيل المكافآت اليومية على الصفحة الرئيسية

### إضافة Widget المكافآت:
```html
<!-- في الجزء العلوي من الصفحة -->
<div id="dailyRewardWidget" class="daily-reward-widget" style="display: none;">
  <div class="reward-header">
    <span class="reward-icon">🎁</span>
    <h4>مكافأة التسجيل اليومي</h4>
  </div>
  
  <div class="reward-info">
    <div class="reward-stat">
      <span class="stat-label">أيام متتالية:</span>
      <span class="stat-value" id="consecutiveDaysValue">0</span>
    </div>
    <div class="reward-stat">
      <span class="stat-label">المكافأة القادمة:</span>
      <span class="stat-value" id="nextRewardValue">0</span>
      <span class="stat-unit">نقطة</span>
    </div>
  </div>

  <div class="reward-progress">
    <div class="progress-bar">
      <div class="progress-fill" id="rewardProgressFill"></div>
    </div>
    <span class="progress-text" id="progressText">استمر في التسجيل اليومي!</span>
  </div>

  <button id="claimRewardBtn" class="reward-btn" style="display: none;">
    ادعِ المكافأة الآن 🚀
  </button>
</div>
```

### CSS للـ Widget:
```css
.daily-reward-widget {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  color: #fff;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
}

.reward-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.reward-icon {
  font-size: 28px;
}

.reward-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.reward-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px;
}

.reward-stat {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  font-size: 12px;
  opacity: 0.9;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
}

.stat-unit {
  font-size: 12px;
  opacity: 0.9;
}

.reward-progress {
  margin-bottom: 16px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: #4ece71;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  opacity: 0.95;
}

.reward-btn {
  width: 100%;
  padding: 12px;
  background: #fff;
  color: #667eea;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reward-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
}

@media (max-width: 640px) {
  .reward-info {
    grid-template-columns: 1fr;
  }
}
```

### JavaScript لتحديث Widget:
```javascript
async function updateDailyRewardWidget() {
  const loginInfo = await getDailyLoginInfo();
  
  if (!loginInfo) {
    document.getElementById('dailyRewardWidget').style.display = 'none';
    return;
  }

  const widget = document.getElementById('dailyRewardWidget');
  
  // إذا لم يقم المستخدم بالدخول اليوم
  if (!loginInfo.loginToday) {
    widget.style.display = 'block';
    
    document.getElementById('consecutiveDaysValue').textContent = 
      loginInfo.consecutiveDays;
    document.getElementById('nextRewardValue').textContent = 
      loginInfo.nextRewardAmount;
    
    // حساب التقدم (متوسط المكافأة)
    const avgReward = 50;
    const progress = (loginInfo.nextRewardAmount / 100) * 100;
    document.getElementById('rewardProgressFill').style.width = progress + '%';
    
    document.getElementById('claimRewardBtn').style.display = 'block';
  } else {
    // تم استدعاء المكافأة اليوم
    widget.style.display = 'block';
    document.getElementById('claimRewardBtn').style.display = 'none';
    document.getElementById('progressText').textContent = 
      '✅ تم الحصول على مكافأة اليوم! عد غداً للمزيد';
  }
}

// استدعِ عند تحميل الصفحة
updateDailyRewardWidget();
```

---

## 4. لوحة التحكم - إضافة علامات تبويب جديدة

### HTML:
```html
<!-- في لوحة التحكم -->
<div class="admin-tabs">
  <button class="admin-tab active" onclick="switchTab('products')">المنتجات</button>
  <button class="admin-tab" onclick="switchTab('dailyRewards')">المكافآت اليومية</button>
  <button class="admin-tab" onclick="switchTab('newUserGifts')">هدايا المستخدمين الجدد</button>
  <button class="admin-tab" onclick="switchTab('exclusiveProducts')">المنتجات المحدودة</button>
</div>

<div id="productsTab" class="admin-panel-content">
  <!-- الكود الموجود -->
</div>

<div id="dailyRewardsTab" class="admin-panel-content" style="display: none;">
  <!-- إحصائيات المكافآت اليومية -->
</div>

<div id="newUserGiftsTab" class="admin-panel-content" style="display: none;">
  <!-- إدارة هدايا المستخدمين الجدد -->
</div>

<div id="exclusiveProductsTab" class="admin-panel-content" style="display: none;">
  <!-- إدارة المنتجات المحدودة -->
</div>
```

### JavaScript:
```javascript
function switchTab(tabName) {
  // إخفاء جميع التبويبات
  document.querySelectorAll('.admin-panel-content').forEach(el => {
    el.style.display = 'none';
  });
  
  // إلغاء تفعيل جميع الأزرار
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // إظهار التبويب المختار
  document.getElementById(tabName + 'Tab').style.display = 'block';
  
  // تفعيل الزر المختار
  event.target.classList.add('active');
  
  // تحميل البيانات المناسبة
  loadTabData(tabName);
}

async function loadTabData(tabName) {
  if (tabName === 'dailyRewards') {
    // تحميل إحصائيات المكافآت
    const stats = await getDailyRewardsStats();
    displayDailyRewardsStats(stats);
  } else if (tabName === 'newUserGifts') {
    // تحميل الهدايا
    await loadGiftsSection();
  } else if (tabName === 'exclusiveProducts') {
    // تحميل المنتجات المحدودة
    await loadExclusiveProducts();
  }
}

async function getDailyRewardsStats() {
  // احسب إحصائيات المكافآت
  return {
    totalRewardsDistributed: 0,
    usersWithActiveStreak: 0,
    averageStreak: 0,
    topReward: 0
  };
}
```

---

## 5. إشعارات المستخدم المتقدمة

### عرض إشعار متقدم:
```javascript
function showAdvancedNotification(type, title, message, duration = 4000) {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  
  const icons = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️'
  };
  
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${icons[type]}</span>
      <div class="notification-text">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
      </div>
      <button class="notification-close">×</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // إضافة حدث إغلاق
  notification.querySelector('.notification-close').addEventListener('click', () => {
    notification.classList.add('hide');
    setTimeout(() => notification.remove(), 300);
  });
  
  // إغلاق تلقائي
  setTimeout(() => {
    notification.classList.add('hide');
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// الاستخدام:
showAdvancedNotification('success', 'مكافأة التسجيل', 'تم إضافة 100 نقطة لحسابك! 🎉');
showAdvancedNotification('warning', 'تنبيه', 'لم يتبقَ إلا 3 وحدات من هذا المنتج');
showAdvancedNotification('error', 'خطأ', 'فشلت عملية الدفع. يرجى المحاولة مرة أخرى');
```

---

## ⚡ نصائح الأداء

1. **تخزين مؤقت للمنتجات**: عدّل حالة المخزون كل 30 ثانية فقط
2. **تحميل كسول**: حمّل بيانات المخزون عند الحاجة فقط
3. **تقليل استدعاءات Firebase**: جمّع التحديثات في استدعاء واحد
4. **استخدم Batch Operations**: لتحديث عدة منتجات في نفس الوقت

---

دعني إذا كنت بحاجة لتوضيحات إضافية! 🚀
