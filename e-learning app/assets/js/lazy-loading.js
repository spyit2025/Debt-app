// 🚀 Lazy Loading Utilities สำหรับ E-Learning Platform
// ใช้สำหรับโหลด libraries เฉพาะเมื่อจำเป็น

/**
 * Lazy Load DataTables
 * โหลด DataTables เฉพาะเมื่อมีตารางที่ต้องการใช้
 */
export async function lazyLoadDataTables() {
    // ตรวจสอบว่ามีตารางที่ต้องการ DataTables หรือไม่
    const dataTables = document.querySelectorAll('[data-datatable="true"], .datatable');
    
    if (dataTables.length === 0) {
        return; // ไม่มีตารางที่ต้องการ DataTables
    }

    // ตรวจสอบว่า DataTables ถูกโหลดแล้วหรือไม่
    if (window.jQuery && window.jQuery.fn.DataTable) {
        return; // โหลดแล้ว
    }

    try {
        console.log('🔄 กำลังโหลด DataTables...');
        
        // โหลด jQuery ถ้ายังไม่มี
        if (!window.jQuery) {
            await loadScript('https://code.jquery.com/jquery-3.7.0.min.js');
        }
        
        // โหลด DataTables core
        await loadScript('https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js');
        
        // โหลด DataTables Bootstrap 5
        await loadScript('https://cdn.datatables.net/1.13.7/js/dataTables.bootstrap5.min.js');
        
        // โหลด DataTables Responsive (ถ้าจำเป็น)
        if (document.querySelector('[data-responsive="true"]')) {
            await loadScript('https://cdn.datatables.net/responsive/2.5.0/js/dataTables.responsive.min.js');
            await loadScript('https://cdn.datatables.net/responsive/2.5.0/js/responsive.bootstrap5.min.js');
        }
        
        console.log('✅ DataTables โหลดเสร็จแล้ว');
        
        // ไม่เริ่มต้น DataTables อัตโนมัติ ให้ไฟล์อื่นจัดการเอง
        // initializeDataTables();
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการโหลด DataTables:', error);
    }
}

/**
 * โหลด Script แบบ Dynamic
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * เริ่มต้น DataTables สำหรับตารางที่มีอยู่
 */
function initializeDataTables() {
    const tables = document.querySelectorAll('[data-datatable="true"], .datatable');
    
    tables.forEach(table => {
        // ตรวจสอบว่า DataTable ถูกเริ่มต้นแล้วหรือไม่
        if (!table.classList.contains('dataTable')) {
            const tableId = table.id;
            
            // ตรวจสอบว่า DataTable ถูกเริ่มต้นแล้วหรือไม่
            if (window.jQuery && window.jQuery.fn.DataTable && !window.jQuery(table).DataTable().settings().length) {
                const options = {
                    language: {
                        url: 'https://cdn.datatables.net/plug-ins/1.13.7/i18n/th.json'
                    },
                    pageLength: 10,
                    responsive: table.hasAttribute('data-responsive'),
                    order: table.dataset.order ? JSON.parse(table.dataset.order) : [[0, 'asc']]
                };
                
                window.jQuery(table).DataTable(options);
            }
        }
    });
}

/**
 * Lazy Load Images
 * โหลดรูปภาพเมื่อเข้าถึง viewport
 */
export function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback สำหรับ browser เก่า
        images.forEach(img => {
            img.src = img.dataset.src;
            img.classList.remove('lazy');
        });
    }
}

/**
 * Preload Critical Resources
 * โหลด resources ที่สำคัญก่อน
 */
export function preloadCriticalResources() {
    const criticalResources = [
        { href: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css', as: 'style' }
    ];
    
    criticalResources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource.href;
        link.as = resource.as;
        document.head.appendChild(link);
    });
}

/**
 * Performance Monitor
 * ตรวจสอบประสิทธิภาพการโหลด
 */
export function monitorPerformance() {
    if ('performance' in window) {
        window.addEventListener('load', () => {
            const perfData = performance.getEntriesByType('navigation')[0];
            
            if (perfData && perfData.loadEventEnd > 0 && perfData.loadEventStart > 0) {
                const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
                console.log(`📊 เว็บไซต์โหลดเสร็จใน ${loadTime}ms`);
                
                // ส่งข้อมูลไปยัง analytics (ถ้ามี)
                if (window.gtag) {
                    window.gtag('event', 'page_load_time', {
                        value: loadTime,
                        custom_parameter: 'load_time_ms'
                    });
                }
            } else {
                console.log('📊 เว็บไซต์โหลดเสร็จแล้ว');
            }
        });
    }
}

// เริ่มต้นเมื่อ DOM พร้อม
document.addEventListener('DOMContentLoaded', () => {
    // Preload critical resources
    preloadCriticalResources();
    
    // Lazy load images
    lazyLoadImages();
    
    // Lazy load DataTables
    lazyLoadDataTables();
    
    // Monitor performance
    monitorPerformance();
});

// Export สำหรับให้ไฟล์อื่นเรียกใช้
window.waitForDataTables = async function() {
    let attempts = 0;
    const maxAttempts = 50; // รอสูงสุด 5 วินาที
    
    while (attempts < maxAttempts) {
        if (window.jQuery && window.jQuery.fn.DataTable) {
            console.log('✅ DataTables พร้อมใช้งาน');
            return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    console.warn('⚠️ DataTables ไม่สามารถโหลดได้ภายในเวลาที่กำหนด');
};

// Export สำหรับใช้ในไฟล์อื่น
export default {
    lazyLoadDataTables,
    lazyLoadImages,
    preloadCriticalResources,
    monitorPerformance
};
