// Mobile Card System for Tables
// Converts all tables to mobile-friendly cards on small screens

class MobileCardSystem {
    constructor() {
        this.isMobile = window.innerWidth <= 768;
        this.cardContainers = new Map();
        this.init();
        
        // Add resize listener
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    init() {
        // Remove any existing emergency indicators first
        this.removeEmergencyIndicators();
        
        // Initialize on page load
        this.createCardContainers();
        this.convertTablesToCards();
    }

    removeEmergencyIndicators() {
        // Remove all existing emergency indicators
        const emergencyIndicators = document.querySelectorAll('.emergency-indicator');
        emergencyIndicators.forEach(indicator => {
            indicator.remove();
        });
        
        // Also clean up any emergency styling from containers
        const cardContainers = document.querySelectorAll('.mobile-card-container');
        cardContainers.forEach(container => {
            container.style.removeProperty('height');
            container.style.removeProperty('min-height');
            container.style.removeProperty('background-color');
            container.style.removeProperty('border');
            container.style.removeProperty('padding');
            container.style.removeProperty('margin');
        });
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;
        

        if (wasMobile !== this.isMobile) {
            if (this.isMobile) {
                this.convertTablesToCards();
            } else {
                this.convertCardsToTables();
            }
        }
    }

    createCardContainers() {
        // Find all tables and create card containers
        const tables = document.querySelectorAll('table[id$="Table"]');
        
        tables.forEach(table => {
            const tableId = table.id;
            let cardContainerId = `${tableId}CardContainer`;
            
            // Map specific table IDs to their actual container IDs
            const tableToContainerMap = {
                'debtsTable': 'debtsMobileCards',
                'paymentHistoryTable': 'paymentHistoryMobileCards',
                'mainPaymentHistoryTable': 'paymentHistoryMobileCards',
                'modalPaymentHistoryTable': 'modalPaymentHistoryTableCardContainer'
            };
            
            // Check if we have a specific mapping for this table
            if (tableToContainerMap[tableId]) {
                cardContainerId = tableToContainerMap[tableId];
            }
            
            // Check if card container already exists in HTML
            let cardContainer = document.getElementById(cardContainerId);
            
            // If not found, try alternative naming patterns
            if (!cardContainer) {
                // Try common mobile container IDs - prioritize the correct container for each table
                let alternativeIds = [];
                
                if (tableId === 'debtsTable') {
                    alternativeIds = ['debtsMobileCards', 'mobileDebtsList', `${tableId}MobileCards`];
                } else if (tableId === 'paymentHistoryTable') {
                    alternativeIds = ['paymentHistoryMobileCards', `${tableId}MobileCards`];
                } else if (tableId === 'modalPaymentHistoryTable') {
                    alternativeIds = ['modalPaymentHistoryTableCardContainer', 'paymentHistoryMobileCards', `${tableId}MobileCards`];
                } else {
                    alternativeIds = [`${tableId}MobileCards`, 'paymentHistoryMobileCards', 'debtsMobileCards'];
                }
                
                for (const altId of alternativeIds) {
                    cardContainer = document.getElementById(altId);
                    if (cardContainer) {
                        // Don't change the container ID, just use it as is
                        break;
                    }
                }
            }
            
            // Create card container if it doesn't exist
            if (!cardContainer) {
                cardContainer = document.createElement('div');
                cardContainer.id = cardContainerId;
                cardContainer.className = 'mobile-card-container';
                
                // Use Bootstrap responsive classes instead of inline styles
                if (this.isMobile) {
                    cardContainer.classList.add('d-block');
                    cardContainer.classList.remove('d-none');
                    // Force visibility with inline styles
                    cardContainer.style.display = 'block';
                    cardContainer.style.visibility = 'visible';
                    cardContainer.style.opacity = '1';
                } else {
                    cardContainer.classList.add('d-none');
                    cardContainer.classList.remove('d-block');
                }
                
                // Insert after the table's parent container
                const tableContainer = table.closest('.table-responsive, .debt-list, .payment-history-container, .desktop-table-container');
                if (tableContainer) {
                    tableContainer.parentNode.insertBefore(cardContainer, tableContainer.nextSibling);
                } else {
                    // Fallback: insert after the table itself
                    table.parentNode.insertBefore(cardContainer, table.nextSibling);
                }
            } else {
                // Ensure existing container has proper styling
                cardContainer.className = 'mobile-card-container';
                
                // Use Bootstrap responsive classes instead of inline styles
                if (this.isMobile) {
                    cardContainer.classList.add('d-block');
                    cardContainer.classList.remove('d-none');
                    // Force visibility with inline styles
                    cardContainer.style.display = 'block';
                    cardContainer.style.visibility = 'visible';
                    cardContainer.style.opacity = '1';
                } else {
                    cardContainer.classList.add('d-none');
                    cardContainer.classList.remove('d-block');
                }
            }
            
            // Always add to map using the actual container ID found
            this.cardContainers.set(tableId, cardContainer.id);
            
            // Also map to the expected container ID for consistency
            if (tableToContainerMap[tableId] && cardContainer.id !== tableToContainerMap[tableId]) {
                this.cardContainers.set(tableId, tableToContainerMap[tableId]);
            }
        });
    }

    convertTablesToCards() {
        
        if (!this.isMobile) {
            return;
        }


        this.cardContainers.forEach((cardContainerId, tableId) => {
            const table = document.getElementById(tableId);
            let cardContainer = document.getElementById(cardContainerId);
            
            // If container not found, try to find it using alternative IDs
            if (!cardContainer) {
                const tableToContainerMap = {
                    'debtsTable': 'debtsMobileCards',
                    'paymentHistoryTable': 'paymentHistoryMobileCards',
                    'mainPaymentHistoryTable': 'paymentHistoryMobileCards',
                    'modalPaymentHistoryTable': 'modalPaymentHistoryTableCardContainer'
                };
                
                if (tableToContainerMap[tableId]) {
                    cardContainer = document.getElementById(tableToContainerMap[tableId]);
                    if (cardContainer) {
                    }
                }
            }
            
            
            if (!table || !cardContainer) {
                return;
            }
            
            // Check if table is in visible section or modal
            const tableSection = table.closest('.content-section');
            const isInModal = table.closest('.modal') !== null;
            const isVisible = !tableSection?.classList.contains('hidden') || isInModal;
            
            
            if (!isVisible) {
                cardContainer.style.display = 'none';
                return;
            }

            // Generate cards based on table type (while table is still visible)
            this.generateCardsForTable(table, cardContainer);
            
            // Show card container - use Bootstrap classes instead of inline styles
            cardContainer.classList.remove('d-none');
            cardContainer.classList.add('d-block');
            cardContainer.style.display = 'block';
            
            
            // Additional debugging and force visibility
            this.forceContainerVisibility(cardContainer, tableId);
            
            // Double-check after a short delay
            setTimeout(() => {
                const computedStyle = window.getComputedStyle(cardContainer);
                if (computedStyle.display === 'none' || cardContainer.offsetHeight === 0) {
                    this.forceContainerVisibility(cardContainer, tableId);
                }
            }, 50);
        });
        
    }

    forceContainerVisibility(cardContainer, tableId) {
        
        // Force visibility with multiple approaches - more aggressive
        cardContainer.style.setProperty('display', 'block', 'important');
        cardContainer.style.setProperty('visibility', 'visible', 'important');
        cardContainer.style.setProperty('opacity', '1', 'important');
        cardContainer.style.setProperty('position', 'relative', 'important');
        cardContainer.style.setProperty('z-index', '999', 'important');
        cardContainer.style.setProperty('width', '100%', 'important');
        cardContainer.style.setProperty('min-height', '50px', 'important');
        cardContainer.style.setProperty('height', 'auto', 'important');
        cardContainer.style.setProperty('max-height', 'none', 'important');
        cardContainer.style.setProperty('overflow', 'visible', 'important');
        
        // Remove any conflicting classes
        cardContainer.classList.remove('d-none', 'hidden');
        cardContainer.classList.add('d-block', 'mobile-card-container');
        
        // Force a reflow
        cardContainer.offsetHeight;
        
        // Additional aggressive approach - directly manipulate computed styles
        const computedStyle = window.getComputedStyle(cardContainer);
        if (computedStyle.display === 'none') {
            cardContainer.style.cssText += '; display: block !important; visibility: visible !important; opacity: 1 !important;';
        }
        
        
        // If still not visible, apply emergency styles
        if (cardContainer.offsetHeight === 0) {
            cardContainer.style.setProperty('height', 'auto', 'important');
            cardContainer.style.setProperty('min-height', '50px', 'important');
            cardContainer.style.setProperty('background-color', 'transparent', 'important');
            cardContainer.style.setProperty('border', 'none', 'important');
            cardContainer.style.setProperty('padding', '0', 'important');
            cardContainer.style.setProperty('margin', '0', 'important');
            
            // Remove any existing emergency indicator
            const existingIndicator = cardContainer.querySelector('.emergency-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
        }
    }

    convertCardsToTables() {
        if (this.isMobile) return;

        this.cardContainers.forEach((cardContainerId, tableId) => {
            const table = document.getElementById(tableId);
            const cardContainer = document.getElementById(cardContainerId);
            
            if (!table || !cardContainer) return;

            // Check if table is in visible section or modal
            const tableSection = table.closest('.content-section');
            const isInModal = table.closest('.modal') !== null;
            const isVisible = !tableSection?.classList.contains('hidden') || isInModal;
            
            if (!isVisible) {
                // Hide both table and card container if section is hidden
                cardContainer.classList.add('d-none');
                cardContainer.classList.remove('d-block');
                return;
            }

            // Hide card container on desktop - use Bootstrap classes
            cardContainer.classList.add('d-none');
            cardContainer.classList.remove('d-block');
        });
    }
    
    // Method to refresh card containers when page section changes
    refreshCardContainers() {
        this.cardContainers.clear();
        this.createCardContainers();
        if (this.isMobile) {
            this.convertTablesToCards();
        }
    }

    generateCardsForTable(table, cardContainer) {
        const tableId = table.id;
        const tbody = table.querySelector('tbody');
        
        
        if (!tbody) {
            return;
        }

        // Try to get rows from DataTable if it exists
        let rows = tbody.querySelectorAll('tr');
        
        // Check if this is a DataTable and try to get visible rows
        if (window.jQuery && window.jQuery.fn.DataTable) {
            try {
                // Check if DataTable is initialized
                if (window.jQuery.fn.DataTable.isDataTable('#' + tableId)) {
                    const dataTable = window.jQuery('#' + tableId).DataTable();
                    
                    
                    // Get visible rows from DataTable
                    const visibleRows = dataTable.rows({ page: 'current' }).nodes();
                    
                    
                    if (visibleRows && visibleRows.length > 0) {
                        // Convert to Array safely - handle jQuery objects
                        if (window.jQuery && visibleRows.jquery) {
                            // It's a jQuery object
                            rows = Array.from(visibleRows);
                        } else if (Array.isArray(visibleRows)) {
                            rows = visibleRows;
                        } else {
                            rows = Array.from(visibleRows);
                        }
                        
                    } else {
                        // Try to get all rows if no visible rows
                        const allRows = dataTable.rows().nodes();
                        
                        
                        if (allRows && allRows.length > 0) {
                            // Convert to Array safely - handle jQuery objects
                            if (window.jQuery && allRows.jquery) {
                                // It's a jQuery object
                                rows = Array.from(allRows);
                            } else if (Array.isArray(allRows)) {
                                rows = allRows;
                            } else {
                                rows = Array.from(allRows);
                            }
                            
                        }
                    }
                }
            } catch (error) {
                // DataTable access failed, continue with regular rows
            }
        }
        
        // Ensure rows is an array
        if (!Array.isArray(rows)) {
            rows = Array.from(rows);
        }
        
        
        // Clear existing cards
        cardContainer.innerHTML = '';
        
        // Check if card container is in the correct section or modal
        const cardSection = cardContainer.closest('.content-section');
        const tableSection = table.closest('.content-section');
        const isInModal = table.closest('.modal') !== null;
        
        
        if (cardSection && tableSection && cardSection.id !== tableSection.id && !isInModal) {
            return;
        }
        
        if (rows.length === 0) {
            // Show "no data" message in mobile cards
            let noDataMessage = '';
            if (tableId.includes('debtsTable')) {
                noDataMessage = `
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-3x mb-3"></i>
                        <h5>ไม่มีข้อมูลหนี้</h5>
                        <p>ไม่มีหนี้ที่ต้องชำระ</p>
                    </div>
                `;
            } else if (tableId.includes('paymentHistoryTable') || tableId.includes('PaymentHistory')) {
                noDataMessage = `
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-3x mb-3"></i>
                        <h5>ไม่มีข้อมูล</h5>
                        <p>ไม่มีข้อมูลการชำระ</p>
                    </div>
                `;
            } else {
                noDataMessage = `
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-3x mb-3"></i>
                        <h5>ไม่มีข้อมูล</h5>
                        <p>ไม่มีข้อมูล</p>
                    </div>
                `;
            }
            cardContainer.innerHTML = noDataMessage;
            return;
        }

        // Check if first row is "no data" row
        const firstRow = rows[0];
        const firstCell = firstRow.querySelector('td');
        
        // Check for colspan (old format) or all cells with "-" (new format)
        const allCells = Array.from(firstRow.querySelectorAll('td'));
        const cellTexts = allCells.map(cell => cell.textContent?.trim());
        
        const isNoDataRow = firstCell && (
            firstCell.hasAttribute('colspan') || 
            (firstCell.textContent?.trim() === '-' && 
             allCells.every(cell => 
                 cell.textContent?.trim() === '-' || 
                 cell.textContent?.trim().includes('ไม่มีข้อมูล')
             ))
        );
        
        if (isNoDataRow) {
            // Show "no data" message in mobile cards
            let noDataMessage = '';
            if (tableId.includes('debtsTable')) {
                noDataMessage = `
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-3x mb-3"></i>
                        <h5>ไม่มีข้อมูลหนี้</h5>
                        <p>ไม่มีหนี้ที่ต้องชำระ</p>
                    </div>
                `;
            } else if (tableId.includes('paymentHistoryTable') || tableId.includes('PaymentHistory')) {
                noDataMessage = `
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-3x mb-3"></i>
                        <h5>ไม่มีข้อมูล</h5>
                        <p>ไม่มีข้อมูลการชำระ</p>
                    </div>
                `;
            } else {
                noDataMessage = `
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-3x mb-3"></i>
                        <h5>ไม่มีข้อมูล</h5>
                        <p>ไม่มีข้อมูล</p>
                    </div>
                `;
            }
            cardContainer.innerHTML = noDataMessage;
            return;
        }

        // Clear existing cards
        cardContainer.innerHTML = '';

        // Get table headers
        const headers = this.getTableHeaders(table);
        
        // Final safety check before forEach
        if (!Array.isArray(rows)) {
            return;
        }

        rows.forEach((row, index) => {
            const cells = row.querySelectorAll('td');
            
            if (cells.length === 0) return;
            
            
            const card = this.createCard(tableId, headers, cells, index);
            cardContainer.appendChild(card);
            
        });
        
        
        
    }

    getTableHeaders(table) {
        const thead = table.querySelector('thead');
        if (!thead) return [];

        const headerRow = thead.querySelector('tr');
        if (!headerRow) return [];

        const headers = [];
        headerRow.querySelectorAll('th').forEach(th => {
            headers.push(th.textContent.trim());
        });

        return headers;
    }

    createCard(tableId, headers, cells, index) {
        
        const card = document.createElement('div');
        card.className = 'mobile-card mb-3';

        // Add card styling
        const isInModal = tableId.includes('modal');
        const cardStyle = isInModal ? `
            background: white !important;
            border-radius: 8px !important;
            box-shadow: 0 1px 4px rgba(0,0,0,0.1) !important;
            padding: 0.75rem !important;
            border: 1px solid #e9ecef !important;
            transition: all 0.3s ease !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 100% !important;
            min-height: 80px !important;
            margin-bottom: 0.75rem !important;
            position: relative !important;
            z-index: 10 !important;
        ` : `
            background: white !important;
            border-radius: 12px !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
            padding: 1rem !important;
            border: 1px solid #e9ecef !important;
            transition: all 0.3s ease !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 100% !important;
            min-height: 100px !important;
            margin-bottom: 1rem !important;
            position: relative !important;
            z-index: 10 !important;
        `;
        
        card.style.cssText = cardStyle;


        // Add hover effect
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        });

        // Generate card content based on table type
        let cardContent = '';
        
        if (tableId.includes('debtsTable')) {
            cardContent = this.createDebtCard(headers, cells, index);
        } else if (tableId.includes('mainPaymentHistoryTable') || tableId.includes('paymentHistoryTable') || tableId.includes('PaymentHistory')) {
            cardContent = this.createPaymentCard(headers, cells, index);
        } else {
            cardContent = this.createGenericCard(headers, cells, index);
        }
        
        card.innerHTML = cardContent;
        

        return card;
    }

    createDebtCard(headers, cells, index) {
        
        const debtorName = cells[0]?.textContent?.trim() || '';
        const description = cells[1]?.textContent?.trim() || '';
        const status = cells[2]?.innerHTML || '';
        const amount = cells[3]?.textContent?.trim() || '';
        const dueDate = cells[4]?.textContent?.trim() || '';
        const actionButton = cells[5]?.innerHTML || '';


        return `
            <div class="debt-item">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h6 class="mb-1 text-primary">${debtorName}</h6>
                        <small class="text-muted">${description}</small>
                    </div>
                    <div class="text-end">
                        ${status}
                    </div>
                </div>
                
                <div class="row mb-2">
                    <div class="col-6">
                        <small class="text-muted">จำนวนเงิน:</small>
                        <div class="fw-bold text-success">${amount}</div>
                    </div>
                    <div class="col-6">
                        <small class="text-muted">วันครบกำหนด:</small>
                        <div class="fw-bold">${dueDate}</div>
                    </div>
                </div>
                
                <div class="d-flex justify-content-end mt-3">
                    ${actionButton}
                </div>
            </div>
        `;
    }

    createPaymentCard(headers, cells, index) {
        const paymentCode = cells[0]?.textContent?.trim() || '';
        const paymentDate = cells[1]?.textContent?.trim() || '';
        const debtorName = cells[2]?.textContent?.trim() || '';
        const installment = cells[3]?.textContent?.trim() || '';
        const amount = cells[4]?.innerHTML || '';
        const notes = cells[5]?.textContent?.trim() || '-';
        const actionButton = cells[6]?.innerHTML || '';

        // Payment card data object
        const paymentCardData = {
            paymentCode,
            paymentDate,
            debtorName,
            installment,
            amount,
            notes,
            actionButton
        };

        // Check if this is a modal payment card (fewer columns)
        const isModalCard = cells.length <= 4;
        
        if (isModalCard) {
            // Modal payment card layout (simpler)
            return `
                <div class="payment-card">
                    <div class="card-header d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <h6 class="mb-1 text-primary">${paymentDate}</h6>
                            <small class="text-muted">${paymentCode}</small>
                        </div>
                        <div class="text-end">
                            <div class="fw-bold text-success">${amount}</div>
                        </div>
                    </div>
                    
                    <div class="card-body p-0">
                        <div class="row mb-2">
                            <div class="col-12">
                                <small class="text-muted">หมายเหตุ:</small>
                                <div class="text-truncate">${notes}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Regular payment card layout
            return `
                <div class="payment-card">
                    <div class="card-header d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h6 class="mb-1 text-primary">${debtorName}</h6>
                            <small class="text-muted">รหัส: ${paymentCode}</small>
                        </div>
                        <div class="text-end">
                            <small class="text-muted">${paymentDate}</small>
                        </div>
                    </div>
                    
                    <div class="card-body p-0">
                        <div class="row mb-2">
                            <div class="col-6">
                                <small class="text-muted">งวดที่:</small>
                                <div class="fw-bold">${installment}</div>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">จำนวนเงิน:</small>
                                <div class="fw-bold text-success">${amount}</div>
                            </div>
                        </div>
                        
                        <div class="row mb-2">
                            <div class="col-12">
                                <small class="text-muted">หมายเหตุ:</small>
                                <div class="text-truncate">${notes}</div>
                            </div>
                        </div>
                        
                        <div class="d-flex justify-content-end mt-3">
                            ${actionButton}
                        </div>
                    </div>
                </div>
            `;
        }
    }

    createGenericCard(headers, cells, index) {
        let content = '<div class="generic-card">';
        
        cells.forEach((cell, cellIndex) => {
            if (cellIndex < headers.length) {
                const header = headers[cellIndex];
                const value = cell.innerHTML || cell.textContent?.trim() || '';
                
                content += `
                    <div class="row mb-2">
                        <div class="col-4">
                            <small class="text-muted">${header}:</small>
                        </div>
                        <div class="col-8">
                            <div>${value}</div>
                        </div>
                    </div>
                `;
            }
        });
        
        content += '</div>';
        return content;
    }

    // Method to refresh cards when table data changes
    refreshCards() {
        if (this.isMobile) {
            // Remove emergency indicators first
            this.removeEmergencyIndicators();
            
            // Add a small delay to ensure DataTables are ready
            setTimeout(() => {
                this.convertTablesToCards();
                
                // Force visibility for all containers after refresh
                this.cardContainers.forEach((cardContainerId, tableId) => {
                    const cardContainer = document.getElementById(cardContainerId);
                    if (cardContainer) {
                        this.forceContainerVisibility(cardContainer, tableId);
                    }
                });
            }, 100);
        }
    }
    
    // Method to refresh cards when modal opens
    refreshModalCards(modalId) {
        if (this.isMobile) {
            // Remove emergency indicators first
            this.removeEmergencyIndicators();
            
            // Find all tables in the modal
            const modal = document.getElementById(modalId);
            if (modal) {
                const modalTables = modal.querySelectorAll('table[id$="Table"]');
                modalTables.forEach(table => {
                    const tableId = table.id;
                    const cardContainerId = this.cardContainers.get(tableId);
                    if (cardContainerId) {
                        const cardContainer = document.getElementById(cardContainerId);
                        if (cardContainer) {
                            this.generateCardsForTable(table, cardContainer);
                            this.forceContainerVisibility(cardContainer, tableId);
                        }
                    }
                });
            }
        }
    }

    // Method to add new card when new row is added
    addCard(tableId, rowData) {
        if (!this.isMobile) return;

        const cardContainerId = this.cardContainers.get(tableId);
        if (!cardContainerId) return;
        
        const cardContainer = document.getElementById(cardContainerId);
        if (!cardContainer) return;

        const table = document.getElementById(tableId);
        if (!table) return;

        const headers = this.getTableHeaders(table);
        const card = this.createCard(tableId, headers, rowData, cardContainer.children.length);
        cardContainer.appendChild(card);
    }
}

// Initialize mobile card system
document.addEventListener('DOMContentLoaded', function() {
    window.mobileCardSystem = new MobileCardSystem();
    
    // Add global function to remove emergency indicators
    window.removeEmergencyIndicators = function() {
        if (window.mobileCardSystem) {
            window.mobileCardSystem.removeEmergencyIndicators();
        }
    };
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileCardSystem;
}
