/**
 * 🔒 نظام التشفير المحسن للبيانات الحساسة
 * يوفر تشفير آمن للبيانات المهمة مثل كلمات المرور والمعلومات الشخصية
 */

export class EnhancedEncryption {
  
  /**
   * 🔐 إنشاء مفتاح تشفير من كلمة مرور
   */
  static async generateKey(password: string, salt?: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    const saltData = salt ? encoder.encode(salt) : crypto.getRandomValues(new Uint8Array(16));
    
    // استخدام PBKDF2 لإنشاء مفتاح آمن
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltData,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  /**
   * 🔐 تشفير البيانات
   */
  static async encryptData(data: any, password: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const dataString = JSON.stringify(data);
      const dataBuffer = encoder.encode(dataString);
      
      // إنشاء مفتاح التشفير
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const key = await this.generateKey(password, new TextDecoder().decode(salt));
      
      // إنشاء IV عشوائي
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // تشفير البيانات
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBuffer
      );
      
      // دمج Salt + IV + البيانات المشفرة
      const combinedBuffer = new Uint8Array(
        salt.length + iv.length + encryptedBuffer.byteLength
      );
      
      combinedBuffer.set(salt, 0);
      combinedBuffer.set(iv, salt.length);
      combinedBuffer.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);
      
      // تحويل إلى Base64
      return btoa(String.fromCharCode.apply(null, Array.from(combinedBuffer)));
      
    } catch (error) {
      console.error('❌ [Encryption] فشل التشفير:', error);
      throw new Error('فشل في تشفير البيانات');
    }
  }
  
  /**
   * 🔓 فك تشفير البيانات
   */
  static async decryptData(encryptedData: string, password: string): Promise<any> {
    try {
      // تحويل من Base64
      const binaryString = atob(encryptedData);
      const combinedBuffer = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        combinedBuffer[i] = binaryString.charCodeAt(i);
      }
      
      // استخراج Salt, IV, والبيانات المشفرة
      const salt = combinedBuffer.slice(0, 16);
      const iv = combinedBuffer.slice(16, 28);
      const encryptedBuffer = combinedBuffer.slice(28);
      
      // إعادة إنشاء مفتاح التشفير
      const key = await this.generateKey(password, new TextDecoder().decode(salt));
      
      // فك التشفير
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedBuffer
      );
      
      // تحويل إلى نص وإعادة تحويل إلى JSON
      const decoder = new TextDecoder();
      const dataString = decoder.decode(decryptedBuffer);
      
      return JSON.parse(dataString);
      
    } catch (error) {
      console.error('❌ [Decryption] فشل فك التشفير:', error);
      throw new Error('فشل في فك تشفير البيانات');
    }
  }
  
  /**
   * 🛡️ تشفير البيانات الحساسة فقط
   */
  static async encryptSensitiveData(data: any): Promise<any> {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential'];
    const encryptedData = { ...data };
    
    for (const [key, value] of Object.entries(data)) {
      const isSensitive = sensitiveFields.some(field => 
        key.toLowerCase().includes(field)
      );
      
      if (isSensitive && typeof value === 'string') {
        try {
          // استخدام مفتاح افتراضي للبيانات الحساسة
          const defaultPassword = this.generateDefaultPassword();
          encryptedData[key] = await this.encryptData(value, defaultPassword);
          encryptedData[`${key}_encrypted`] = true;
        } catch (error) {
          console.warn(`⚠️ [Encryption] فشل تشفير ${key}:`, error);
        }
      }
    }
    
    return encryptedData;
  }
  
  /**
   * 🔑 إنشاء كلمة مرور افتراضية آمنة
   */
  private static generateDefaultPassword(): string {
    // يمكن تحسين هذه الطريقة لاستخدام مفاتيح أكثر أماناً
    const userAgent = navigator.userAgent;
    const timestamp = Date.now().toString();
    return btoa(userAgent + timestamp).slice(0, 32);
  }
}