/* ========== نظام المكافآت اليومية (Daily Login Rewards) ========== */

// جدول المكافآت للأيام الأولى
const DAILY_LOGIN_SCHEDULE = {
  1: 100,  // اليوم الأول: 100 نقطة
  2: 10,   // اليوم الثاني: 10 نقاط
  3: 20,   // اليوم الثالث: 20 نقاط
  // باقي الأيام: عشوائي من 10 إلى 100
};

const MIN_RANDOM_REWARD = 10;
const MAX_RANDOM_REWARD = 100;

/**
 * احصل على المكافأة للدخول اليومي
 * @param {number} dayNumber - رقم اليوم (1, 2, 3...)
 * @returns {number} - عدد النقاط المكتسبة
 */
function getDailyRewardAmount(dayNumber) {
  if (DAILY_LOGIN_SCHEDULE[dayNumber]) {
    return DAILY_LOGIN_SCHEDULE[dayNumber];
  }
  // عشوائي للأيام الأخرى
  return Math.floor(Math.random() * (MAX_RANDOM_REWARD - MIN_RANDOM_REWARD + 1)) + MIN_RANDOM_REWARD;
}

/**
 * تحقق من آخر تسجيل دخول وأضف المكافأة إن لزم الأمر
 */
async function checkAndApplyDailyLoginReward() {
  const userId = getCurrentUserId();
  if (!userId) return false;

  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.warn('User document not found');
      return false;
    }

    const userData = userDoc.data();
    const now = new Date();
    const today = formatDateKey(now);
    
    // تحقق إذا قام المستخدم بالدخول اليوم
    if (userData.lastLoginDate === today) {
      console.log('Already logged in today');
      return false;
    }

    // احسب أيام التسجيل المتتالية
    let consecutiveDays = 1;
    if (userData.lastLoginDate) {
      const lastLogin = new Date(userData.lastLoginDate);
      const daysDiff = getDaysDifference(lastLogin, now);
      
      if (daysDiff === 1) {
        // دخول متتالي
        consecutiveDays = (userData.consecutiveDays || 0) + 1;
      } else if (daysDiff > 1) {
        // تم كسر السلسلة
        consecutiveDays = 1;
      }
    }

    // احصل على مبلغ المكافأة
    const rewardAmount = getDailyRewardAmount(consecutiveDays);

    // حدّث بيانات المستخدم
    await userRef.update({
      lastLoginDate: today,
      consecutiveDays: consecutiveDays,
      balance: firebase.firestore.FieldValue.increment(rewardAmount),
      totalDailyRewards: firebase.firestore.FieldValue.increment(1),
    });

    // سجّل المكافأة
    await logDailyReward(userId, rewardAmount, consecutiveDays);

    // عرّض الإشعار للمستخدم
    showDailyRewardNotification(rewardAmount, consecutiveDays);

    return true;
  } catch (error) {
    console.error('Error applying daily login reward:', error);
    return false;
  }
}

/**
 * احسب الفرق بين تاريخين بالأيام
 */
function getDaysDifference(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor((date2 - date1) / oneDay);
}

/**
 * تنسيق التاريخ (YYYY-MM-DD)
 */
function formatDateKey(date) {
  return date.toISOString().split('T')[0];
}

/**
 * سجّل المكافأة اليومية في قاعدة البيانات
 */
async function logDailyReward(userId, amount, day) {
  try {
    await db.collection('users').doc(userId).collection('dailyRewards').add({
      timestamp: firebase.firestore.Timestamp.now(),
      amount: amount,
      day: day,
      type: 'daily_login'
    });
  } catch (error) {
    console.error('Error logging daily reward:', error);
  }
}

/**
 * عرّض إشعار المكافأة للمستخدم
 */
function showDailyRewardNotification(amount, day) {
  const message = `تم إضافة ${amount} نقطة! 🎉 (اليوم ${day})`;
  
  // إنشاء عنصر إشعار
  const notification = document.createElement('div');
  notification.className = 'daily-reward-toast';
  notification.innerHTML = `
    <div class="toast-icon">🎁</div>
    <div class="toast-content">
      <div class="toast-title">مكافأة التسجيل اليومي</div>
      <div class="toast-message">${message}</div>
    </div>
  `;
  
  document.body.appendChild(notification);

  // اطلب إعادة تصيير رصيد المحفظة
  if (typeof refreshBalanceUI === 'function') {
    refreshBalanceUI();
  }

  // إزالة الإشعار بعد 4 ثوان
  setTimeout(() => {
    notification.classList.add('hide');
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

/**
 * احصل على معلومات تسجيل الدخول اليومي (للواجهة)
 */
async function getDailyLoginInfo() {
  const userId = getCurrentUserId();
  if (!userId) return null;

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return null;

    const data = userDoc.data();
    const today = formatDateKey(new Date());

    return {
      lastLoginDate: data.lastLoginDate || null,
      consecutiveDays: data.consecutiveDays || 0,
      totalDailyRewards: data.totalDailyRewards || 0,
      loginToday: data.lastLoginDate === today,
      nextRewardAmount: getDailyRewardAmount((data.consecutiveDays || 0) + 1)
    };
  } catch (error) {
    console.error('Error getting daily login info:', error);
    return null;
  }
}

/* ========== نظام الهدايا للمستخدمين الجدد (New User Gifts) ========== */

/**
 * تحقق إذا كان المستخدم جديداً وطبّق الهدايا المقررة
 */
async function checkAndApplyNewUserGift() {
  const userId = getCurrentUserId();
  if (!userId) return false;

  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) return false;

    const userData = userDoc.data();
    
    // تحقق إذا تم تطبيق الهدية سابقاً
    if (userData.newUserGiftApplied) {
      return false;
    }

    // احصل على هدايا المستخدمين الجدد من الإعدادات
    const newUserGifts = await getNewUserGifts();
    if (!newUserGifts || newUserGifts.length === 0) {
      return false;
    }

    // طبّق جميع الهدايا
    for (const gift of newUserGifts) {
      await applyGiftToUser(userId, gift);
    }

    // ضع علامة على أن الهدية تم تطبيقها
    await userRef.update({
      newUserGiftApplied: true,
      newUserGiftAppliedDate: firebase.firestore.Timestamp.now()
    });

    showNewUserGiftNotification(newUserGifts);
    return true;
  } catch (error) {
    console.error('Error applying new user gift:', error);
    return false;
  }
}

/**
 * احصل على هدايا المستخدمين الجدد من الإعدادات
 */
async function getNewUserGifts() {
  try {
    const settingsDoc = await db.collection('settings').doc('newUserGifts').get();
    if (settingsDoc.exists && settingsDoc.data().enabled) {
      return settingsDoc.data().gifts || [];
    }
    return [];
  } catch (error) {
    console.error('Error getting new user gifts:', error);
    return [];
  }
}

/**
 * طبّق هدية واحدة على المستخدم
 */
async function applyGiftToUser(userId, gift) {
  const userId_ref = db.collection('users').doc(userId);

  try {
    switch (gift.type) {
      case 'points':
        await userId_ref.update({
          balance: firebase.firestore.FieldValue.increment(gift.amount || 0)
        });
        break;
      
      case 'coupon':
      case 'code':
        // أضف الكوبون/الكود للمستخدم
        await userId_ref.collection('coupons').add({
          code: gift.code,
          description: gift.description,
          appliedDate: firebase.firestore.Timestamp.now(),
          used: false
        });
        break;
      
      case 'product':
        // أضف منتج مجاني
        await userId_ref.collection('freeProducts').add({
          productId: gift.productId,
          productName: gift.productName,
          appliedDate: firebase.firestore.Timestamp.now(),
          claimed: false
        });
        break;
    }

    // سجّل الهدية
    await userId_ref.collection('giftHistory').add({
      giftId: gift.id,
      type: gift.type,
      description: gift.description,
      appliedDate: firebase.firestore.Timestamp.now()
    });
  } catch (error) {
    console.error('Error applying gift:', error);
  }
}

/**
 * عرّض إشعار هدية المستخدم الجديد
 */
function showNewUserGiftNotification(gifts) {
  const giftList = gifts.map(g => {
    if (g.type === 'points') return `${g.amount} نقطة`;
    if (g.type === 'product') return `منتج: ${g.productName}`;
    if (g.type === 'coupon' || g.type === 'code') return `كوبون: ${g.code}`;
    return g.description;
  }).join(' + ');

  const notification = document.createElement('div');
  notification.className = 'welcome-gift-toast';
  notification.innerHTML = `
    <div class="toast-icon">🎁</div>
    <div class="toast-content">
      <div class="toast-title">أهلاً وسهلاً بك! 👋</div>
      <div class="toast-message">تم إضافة هديتك الترحيبية: ${giftList}</div>
    </div>
  `;
  
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('hide');
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// إضافة تنسيقات الإشعارات
const style = document.createElement('style');
style.textContent = `
  .daily-reward-toast,
  .welcome-gift-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 20px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    max-width: 350px;
  }

  .daily-reward-toast .toast-icon,
  .welcome-gift-toast .toast-icon {
    font-size: 28px;
    flex-shrink: 0;
  }

  .toast-content {
    flex: 1;
  }

  .toast-title {
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 4px;
  }

  .toast-message {
    font-size: 13px;
    opacity: 0.95;
  }

  .daily-reward-toast.hide,
  .welcome-gift-toast.hide {
    animation: slideOut 0.3s ease-in forwards;
  }

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }

  @media (max-width: 600px) {
    .daily-reward-toast,
    .welcome-gift-toast {
      top: auto;
      bottom: 20px;
      right: 10px;
      left: 10px;
      max-width: none;
    }
  }
`;
document.head.appendChild(style);
