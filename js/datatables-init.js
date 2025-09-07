// DataTables Initialization with Error Handling
if (typeof DataTablesInit === 'undefined') {
class DataTablesInit {
    constructor() {
        this.isInitialized = false;
        this.initializedTables = new Set();
    }

    // Initialize DataTables with error handling
    initDataTable(tableId, options = {}) {
        if (this.initializedTables.has(tableId)) {
            if (window.logger) {
                window.logger.warn(`DataTable ${tableId} already initialized`);
            }
            return;
        }

        // Check if jQuery is available
        if (typeof jQuery === 'undefined') {
            if (window.logger) {
                window.logger.error('jQuery is not loaded. DataTables requires jQuery.');
            }
            return;
        }

        // Check if DataTable is available
        if (typeof jQuery.fn.DataTable === 'undefined') {
            if (window.logger) {
                window.logger.error('DataTables is not loaded.');
            }
            return;
        }

        try {
            // Thai language configuration with fallback
            const thaiLanguageConfig = {
                "decimal": "",
                "emptyTable": "ไม่มีข้อมูลในตาราง",
                "info": "แสดง _START_ ถึง _END_ จาก _TOTAL_ รายการ",
                "infoEmpty": "แสดง 0 ถึง 0 จาก 0 รายการ",
                "infoFiltered": "(กรองข้อมูล _MAX_ ทุกรายการ)",
                "infoPostFix": "",
                "thousands": ",",
                "lengthMenu": "แสดง _MENU_ รายการ",
                "loadingRecords": "กำลังโหลด...",
                "processing": "กำลังดำเนินการ...",
                "search": "ค้นหา:",
                "zeroRecords": "ไม่พบข้อมูลที่ค้นหา",
                "paginate": {
                    "first": "หน้าแรก",
                    "last": "หน้าสุดท้าย",
                    "next": "ถัดไป",
                    "previous": "ก่อนหน้า"
                },
                "aria": {
                    "sortAscending": ": เปิดใช้งานการเรียงข้อมูลจากน้อยไปมาก",
                    "sortDescending": ": เปิดใช้งานการเรียงข้อมูลจากมากไปน้อย"
                }
            };

            const defaultOptions = {
                responsive: true,
                language: thaiLanguageConfig,
                pageLength: 10,
                lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "ทั้งหมด"]],
                order: [[0, 'desc']],
                columnDefs: [
                    { orderable: false, targets: -1 } // Disable ordering on last column (actions)
                ],
                dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                     '<"row"<"col-sm-12"tr>>' +
                     '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
                ...options
            };

            const table = jQuery(`#${tableId}`).DataTable(defaultOptions);
            this.initializedTables.add(tableId);
            
            if (window.logger) {
                window.logger.debug(`DataTable ${tableId} initialized successfully with Thai language`);
            }

            return table;
        } catch (error) {
            if (window.logger) {
                window.logger.error(`Failed to initialize DataTable ${tableId}:`, error);
            }
            return null;
        }
    }

    // Initialize all DataTables on page
    initAllDataTables() {
        if (this.isInitialized) {
            return;
        }

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this._initTables();
            });
        } else {
            this._initTables();
        }
    }

    _initTables() {
        // Find all tables with data-table attribute
        const tables = document.querySelectorAll('[data-table]');
        
        tables.forEach(table => {
            const tableId = table.id;
            if (tableId) {
                this.initDataTable(tableId);
            }
        });

        // Initialize specific tables if they exist
        const specificTables = [
            'paymentHistoryTable',
            'modalPaymentHistoryTable',
            'debtListTable',
            'creditorDebtTable'
        ];

        specificTables.forEach(tableId => {
            const table = document.getElementById(tableId);
            if (table && !this.initializedTables.has(tableId)) {
                this.initDataTable(tableId);
            }
        });

        this.isInitialized = true;
    }

    // Destroy DataTable
    destroyDataTable(tableId) {
        if (typeof jQuery !== 'undefined' && jQuery.fn.DataTable) {
            try {
                jQuery(`#${tableId}`).DataTable().destroy();
                this.initializedTables.delete(tableId);
                
                if (window.logger) {
                    window.logger.debug(`DataTable ${tableId} destroyed`);
                }
            } catch (error) {
                if (window.logger) {
                    window.logger.error(`Failed to destroy DataTable ${tableId}:`, error);
                }
            }
        }
    }

    // Refresh DataTable
    refreshDataTable(tableId) {
        if (typeof jQuery !== 'undefined' && jQuery.fn.DataTable) {
            try {
                const table = jQuery(`#${tableId}`).DataTable();
                if (table) {
                    table.ajax.reload();
                    
                    if (window.logger) {
                        window.logger.debug(`DataTable ${tableId} refreshed`);
                    }
                }
            } catch (error) {
                if (window.logger) {
                    window.logger.error(`Failed to refresh DataTable ${tableId}:`, error);
                }
            }
        }
    }

    // Check if DataTable is initialized
    isDataTableInitialized(tableId) {
        return this.initializedTables.has(tableId);
    }

    // Get all initialized tables
    getInitializedTables() {
        return Array.from(this.initializedTables);
    }
}

// Global DataTables initializer instance
window.dataTablesInit = new DataTablesInit();

// Auto-initialize on page load
window.dataTablesInit.initAllDataTables();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataTablesInit;
}
} // End of DataTablesInit check
