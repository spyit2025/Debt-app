// ===== PERFORMANCE OPTIMIZER - E-LEARNING PLATFORM =====

// การตั้งค่าความเร็วและประสิทธิภาพ
const PERFORMANCE_CONFIG = {
    // การตั้งค่า Cache
    CACHE_DURATION: 5 * 60 * 1000, // 5 นาที
    MAX_CACHE_SIZE: 100, // จำนวนรายการสูงสุดใน cache
    
    // การตั้งค่า Lazy Loading
    LAZY_LOAD_DELAY: 100, // มิลลิวินาที
    LAZY_LOAD_THRESHOLD: 0.1, // 10% ของหน้าจอ
    
    // การตั้งค่า Debounce
    DEBOUNCE_DELAY: 300, // มิลลิวินาที
    
    // การตั้งค่า Throttle
    THROTTLE_DELAY: 100, // มิลลิวินาที
};

// Cache Manager สำหรับเก็บข้อมูล
class CacheManager {
    constructor() {
        this.cache = new Map();
        this.maxSize = PERFORMANCE_CONFIG.MAX_CACHE_SIZE;
    }
    
    // เพิ่มข้อมูลลง cache
    set(key, data, ttl = PERFORMANCE_CONFIG.CACHE_DURATION) {
        // ลบข้อมูลเก่าถ้า cache เต็ม
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        const item = {
            data: data,
            timestamp: Date.now(),
            ttl: ttl
        };
        
        this.cache.set(key, item);
        console.log(`Cache: เพิ่มข้อมูล "${key}"`);
    }
    
    // ดึงข้อมูลจาก cache
    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            return null;
        }
        
        // ตรวจสอบว่า cache หมดอายุหรือไม่
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        console.log(`Cache: ดึงข้อมูล "${key}"`);
        return item.data;
    }
    
    // ลบข้อมูลจาก cache
    delete(key) {
        this.cache.delete(key);
        console.log(`Cache: ลบข้อมูล "${key}"`);
    }
    
    // ล้าง cache ทั้งหมด
    clear() {
        this.cache.clear();
        console.log('Cache: ล้างข้อมูลทั้งหมด');
    }
    
    // ดูขนาด cache
    get size() {
        return this.cache.size;
    }
}

// Performance Monitor สำหรับติดตามประสิทธิภาพ
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            pageLoadTime: 0,
            apiResponseTime: 0,
            cacheHitRate: 0,
            memoryUsage: 0
        };
        this.startTime = performance.now();
    }
    
    // วัดเวลาการโหลดหน้า
    measurePageLoad() {
        const loadTime = performance.now() - this.startTime;
        this.metrics.pageLoadTime = loadTime;
        console.log(`Performance: หน้าโหลดใน ${loadTime.toFixed(2)}ms`);
        return loadTime;
    }
    
    // วัดเวลาการตอบสนอง API
    measureApiCall(apiName, startTime) {
        const responseTime = performance.now() - startTime;
        this.metrics.apiResponseTime = responseTime;
        console.log(`Performance: ${apiName} ตอบสนองใน ${responseTime.toFixed(2)}ms`);
        return responseTime;
    }
    
    // อัปเดต Cache Hit Rate
    updateCacheHitRate(hits, total) {
        this.metrics.cacheHitRate = (hits / total) * 100;
        console.log(`Performance: Cache Hit Rate ${this.metrics.cacheHitRate.toFixed(1)}%`);
    }
    
    // ดูการใช้ Memory
    measureMemoryUsage() {
        if ('memory' in performance) {
            this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
            console.log(`Performance: ใช้ Memory ${this.metrics.memoryUsage.toFixed(2)}MB`);
        }
        return this.metrics.memoryUsage;
    }
    
    // แสดงรายงานประสิทธิภาพ
    getReport() {
        return {
            pageLoadTime: `${this.metrics.pageLoadTime.toFixed(2)}ms`,
            apiResponseTime: `${this.metrics.apiResponseTime.toFixed(2)}ms`,
            cacheHitRate: `${this.metrics.cacheHitRate.toFixed(1)}%`,
            memoryUsage: `${this.metrics.memoryUsage.toFixed(2)}MB`,
            cacheSize: cacheManager.size
        };
    }
}

// Debounce Function สำหรับลดการเรียกฟังก์ชันบ่อยเกินไป
function debounce(func, delay = PERFORMANCE_CONFIG.DEBOUNCE_DELAY) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Throttle Function สำหรับจำกัดการเรียกฟังก์ชัน
function throttle(func, delay = PERFORMANCE_CONFIG.THROTTLE_DELAY) {
    let lastCall = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            return func.apply(this, args);
        }
    };
}

// Lazy Loading สำหรับรูปภาพ
function setupLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    }, {
        threshold: PERFORMANCE_CONFIG.LAZY_LOAD_THRESHOLD,
        rootMargin: '50px'
    });
    
    images.forEach(img => imageObserver.observe(img));
    console.log('Performance: ตั้งค่า Lazy Loading สำหรับรูปภาพ');
}

// Preload ข้อมูลสำคัญ
async function preloadCriticalData() {
    try {
        console.log('Performance: เริ่ม Preload ข้อมูลสำคัญ...');
        
        // ตรวจสอบว่า auth และ db พร้อมใช้งานหรือไม่
        if (typeof auth !== 'undefined' && auth && typeof db !== 'undefined' && db) {
            // Preload ข้อมูลผู้ใช้ปัจจุบัน
            const currentUser = auth.currentUser;
            if (currentUser) {
                const userKey = `user_${currentUser.uid}`;
                if (!cacheManager.get(userKey)) {
                    try {
                        // ดึงข้อมูลผู้ใช้และเก็บใน cache
                        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                        if (userDoc.exists()) {
                            cacheManager.set(userKey, userDoc.data(), 10 * 60 * 1000); // 10 นาที
                        }
                    } catch (dbError) {
                        console.warn('Performance: ไม่สามารถดึงข้อมูลผู้ใช้จากฐานข้อมูล:', dbError);
                    }
                }
            }
        } else {
            console.log('Performance: Firebase ยังไม่พร้อมใช้งาน ข้ามการ Preload');
        }
        
        console.log('Performance: Preload ข้อมูลสำคัญเสร็จสิ้น');
    } catch (error) {
        console.warn('Performance: เกิดข้อผิดพลาดในการ Preload:', error);
    }
}

// Optimize DOM Operations
function optimizeDOMOperations() {
    // ใช้ DocumentFragment สำหรับการเพิ่ม elements หลายตัว
    const fragment = document.createDocumentFragment();
    
    // ใช้ requestAnimationFrame สำหรับการอัปเดต UI
    function updateUI(callback) {
        requestAnimationFrame(() => {
            callback();
        });
    }
    
    // ใช้ ResizeObserver แทน window resize event
    if ('ResizeObserver' in window) {
        const resizeObserver = new ResizeObserver(debounce((entries) => {
            entries.forEach(entry => {
                // จัดการการเปลี่ยนแปลงขนาด
                console.log('Performance: หน้าจอเปลี่ยนขนาด');
            });
        }, 100));
        
        resizeObserver.observe(document.body);
    }
    
    console.log('Performance: ตั้งค่า DOM Optimization');
}

// Memory Management
function setupMemoryManagement() {
    // ล้าง cache เมื่อ memory ใช้มากเกินไป
    setInterval(() => {
        const memoryUsage = performanceMonitor.measureMemoryUsage();
        if (memoryUsage > 100) { // มากกว่า 100MB
            console.warn('Performance: Memory ใช้มากเกินไป กำลังล้าง cache');
            cacheManager.clear();
        }
    }, 30000); // ตรวจสอบทุก 30 วินาที
    
    // ล้าง cache เมื่อผู้ใช้ออกจากหน้า
    window.addEventListener('beforeunload', () => {
        cacheManager.clear();
    });
    
    console.log('Performance: ตั้งค่า Memory Management');
}

// สร้าง instances
const cacheManager = new CacheManager();
const performanceMonitor = new PerformanceMonitor();

// ฟังก์ชันเริ่มต้น Performance Optimizer
export function initializePerformanceOptimizer() {
    console.log('Performance: เริ่มต้น Performance Optimizer...');
    
    // ตั้งค่าต่างๆ
    setupLazyLoading();
    optimizeDOMOperations();
    setupMemoryManagement();
    
    // Preload ข้อมูลสำคัญ
    preloadCriticalData();
    
    // วัดเวลาการโหลดหน้า
    window.addEventListener('load', () => {
        performanceMonitor.measurePageLoad();
    });
    
    console.log('Performance: Performance Optimizer พร้อมใช้งาน');
}

// ฟังก์ชันสำหรับดูรายงานประสิทธิภาพ
export function getPerformanceReport() {
    return performanceMonitor.getReport();
}

// ฟังก์ชันสำหรับล้าง cache
export function clearCache() {
    cacheManager.clear();
}

// ส่งออก utilities
export { 
    cacheManager, 
    performanceMonitor, 
    debounce, 
    throttle,
    PERFORMANCE_CONFIG 
};
