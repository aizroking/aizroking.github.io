/* ========== نظام إدارة المنتجات المحدودة (Exclusive Products Management) ========== */

/**
 * إضافة/تحديث عدد الوحدات المتاحة للمنتج
 */
async function setProductMaxLimit(productId, maxUnits, isExclusive = true) {
  try {
    const productRef = db.collection('products').doc(productId);
    
    await productRef.update({
      isExclusive: isExclusive,
      maxUnits: maxUnits || 0,
      soldUnits: (await productRef.get()).data().soldUnits || 0,
      enableStockLimit: true,
      lastUpdatedBy: getCurrentUserId(),
      lastUpdatedAt: firebase.firestore.Timestamp.now()
    });

    console.log(`Product ${productId}: Max units set to ${maxUnits}`);
    return true;
  } catch (error) {
    console.error('Error setting product max limit:', error);
    return false;
  }
}

/**
 * حدّث عدد الوحدات المباعة عند شراء منتج
 */
async function incrementProductSoldCount(productId, quantity = 1) {
  try {
    const productRef = db.collection('products').doc(productId);
    const productDoc = await productRef.get();
    
    if (!productDoc.exists) {
      throw new Error('Product not found');
    }

    const productData = productDoc.data();
    const newSoldUnits = (productData.soldUnits || 0) + quantity;
    const maxUnits = productData.maxUnits || 0;

    // التحقق من أن الكمية المباعة لم تتجاوز الحد الأقصى
    if (maxUnits > 0 && newSoldUnits > maxUnits) {
      throw new Error('Exceeded max units for this product');
    }

    await productRef.update({
      soldUnits: newSoldUnits
    });

    return {
      success: true,
      soldUnits: newSoldUnits,
      maxUnits: maxUnits,
      remainingUnits: maxUnits > 0 ? maxUnits - newSoldUnits : -1,
      isExhausted: maxUnits > 0 && newSoldUnits >= maxUnits
    };
  } catch (error) {
    console.error('Error incrementing sold count:', error);
    return { success: false, error: error.message };
  }
}

/**
 * تحقق إذا كان المنتج متاح أم لا
 */
async function isProductAvailable(productId) {
  try {
    const productDoc = await db.collection('products').doc(productId).get();
    
    if (!productDoc.exists) {
      return false;
    }

    const data = productDoc.data();
    
    // إذا لم يكن هناك حد أقصى، المنتج دائماً متاح
    if (!data.isExclusive || data.maxUnits === 0) {
      return true;
    }

    // تحقق إذا لم تتم بيع جميع الوحدات
    return (data.soldUnits || 0) < (data.maxUnits || 0);
  } catch (error) {
    console.error('Error checking product availability:', error);
    return false;
  }
}

/**
 * احصل على معلومات المخزون للمنتج
 */
async function getProductStockInfo(productId) {
  try {
    const productDoc = await db.collection('products').doc(productId).get();
    
    if (!productDoc.exists) {
      return null;
    }

    const data = productDoc.data();
    const maxUnits = data.maxUnits || 0;
    const soldUnits = data.soldUnits || 0;
    const remainingUnits = maxUnits > 0 ? maxUnits - soldUnits : -1;

    return {
      productId: productId,
      productName: data.name,
      isExclusive: data.isExclusive || false,
      maxUnits: maxUnits,
      soldUnits: soldUnits,
      remainingUnits: remainingUnits,
      isAvailable: remainingUnits === -1 || remainingUnits > 0,
      percentageSold: maxUnits > 0 ? Math.round((soldUnits / maxUnits) * 100) : 0,
      stockStatus: getStockStatus(soldUnits, maxUnits)
    };
  } catch (error) {
    console.error('Error getting stock info:', error);
    return null;
  }
}

/**
 * احصل على حالة المخزون (نصي)
 */
function getStockStatus(sold, max) {
  if (max === 0) return 'غير محدود';
  if (sold >= max) return 'نفدت الكمية';
  
  const percentage = (sold / max) * 100;
  if (percentage >= 90) return 'كمية محدودة جداً';
  if (percentage >= 70) return 'كمية محدودة';
  if (percentage >= 40) return 'متوفر';
  
  return 'متوفر بكثرة';
}

/**
 * أعد تعيين عداد المبيعات للمنتج (للأدمين فقط)
 */
async function resetProductSoldCount(productId) {
  try {
    // تحقق من صلاحيات الأدمين
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    await db.collection('products').doc(productId).update({
      soldUnits: 0,
      lastResetAt: firebase.firestore.Timestamp.now(),
      resetBy: getCurrentUserId()
    });

    return true;
  } catch (error) {
    console.error('Error resetting sold count:', error);
    return false;
  }
}

/**
 * احصل على قائمة المنتجات المحدودة فقط
 */
async function getExclusiveProducts() {
  try {
    const snapshot = await db.collection('products')
      .where('isExclusive', '==', true)
      .get();

    const products = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      products.push({
        id: doc.id,
        name: data.name,
        maxUnits: data.maxUnits,
        soldUnits: data.soldUnits || 0,
        remainingUnits: (data.maxUnits || 0) - (data.soldUnits || 0),
        percentageSold: Math.round(((data.soldUnits || 0) / (data.maxUnits || 0)) * 100)
      });
    }

    return products;
  } catch (error) {
    console.error('Error getting exclusive products:', error);
    return [];
  }
}

/**
 * تحديث إعدادات الحد الأقصى للمنتج من لوحة التحكم
 */
async function updateProductLimitSettings(productId, settings) {
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      throw new Error('Unauthorized');
    }

    const updateData = {
      isExclusive: settings.isExclusive !== undefined ? settings.isExclusive : false,
      maxUnits: settings.maxUnits || 0,
      enableStockLimit: settings.enableStockLimit !== undefined ? settings.enableStockLimit : false,
      lastUpdatedAt: firebase.firestore.Timestamp.now(),
      lastUpdatedBy: getCurrentUserId()
    };

    // إذا تم تفعيل الحد الأقصى ولم يكن هناك عداد مبيعات، ابدأ من 0
    if (updateData.enableStockLimit && updateData.maxUnits > 0) {
      const currentDoc = await db.collection('products').doc(productId).get();
      if (!currentDoc.data().soldUnits) {
        updateData.soldUnits = 0;
      }
    }

    await db.collection('products').doc(productId).update(updateData);

    // سجّل التغيير
    await logAdminAction('update_product_limits', productId, updateData);

    return { success: true };
  } catch (error) {
    console.error('Error updating product limit settings:', error);
    return { success: false, error: error.message };
  }
}

/**
 * احصل على تقرير المبيعات للمنتجات المحدودة
 */
async function getExclusiveProductsReport() {
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      throw new Error('Unauthorized');
    }

    const products = await getExclusiveProducts();
    
    const report = {
      totalProducts: products.length,
      totalMaxUnits: products.reduce((sum, p) => sum + p.maxUnits, 0),
      totalSoldUnits: products.reduce((sum, p) => sum + p.soldUnits, 0),
      exhaustedProducts: products.filter(p => p.remainingUnits <= 0).length,
      products: products,
      generatedAt: new Date().toISOString()
    };

    return report;
  } catch (error) {
    console.error('Error generating report:', error);
    return null;
  }
}

/**
 * سجّل إجراء الأدمين
 */
async function logAdminAction(action, target, details) {
  try {
    const userId = getCurrentUserId();
    await db.collection('adminLogs').add({
      action: action,
      target: target,
      details: details,
      performedBy: userId,
      timestamp: firebase.firestore.Timestamp.now()
    });
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
}
