// Responsive Table to Card Conversion
// This script converts table rows to mobile-friendly cards

function convertTableToCards() {
    const tableBody = document.getElementById('paymentHistoryTableBody');
    const mobileContainer = document.querySelector('.mobile-card-container');
    
    if (!tableBody || !mobileContainer) return;
    
    // Clear existing mobile cards
    mobileContainer.innerHTML = '';
    
    // Get all table rows
    const rows = tableBody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length === 0) return;
        
        // Extract data from table cells
        const paymentDate = cells[0]?.textContent?.trim() || '';
        const debtorInfo = cells[1]?.innerHTML || '';
        const debtCode = cells[2]?.textContent?.trim() || '';
        const installment = cells[3]?.innerHTML || '';
        const amount = cells[4]?.innerHTML || '';
        const notes = cells[5]?.textContent?.trim() || '-';
        const actionButton = cells[6]?.innerHTML || '';
        
        // Extract debtor name from HTML
        const debtorNameMatch = debtorInfo.match(/<strong>(.*?)<\/strong>/);
        const debtorName = debtorNameMatch ? debtorNameMatch[1] : '';
        
        // Create mobile card
        const card = document.createElement('div');
        card.className = 'payment-card';
        card.innerHTML = `
            <div class="payment-card-header">
                <div class="payment-date">${paymentDate}</div>
                <div class="payment-amount">${amount}</div>
            </div>
            <div class="payment-card-body">
                <div class="payment-field">
                    <div class="payment-label">ลูกหนี้</div>
                    <div class="payment-value debtor-name">${debtorName}</div>
                </div>
                <div class="payment-field">
                    <div class="payment-label">รหัสหนี้</div>
                    <div class="payment-value debt-code">${debtCode}</div>
                </div>
                <div class="payment-field">
                    <div class="payment-label">งวดที่</div>
                    <div class="payment-value installment">${installment}</div>
                </div>
                <div class="payment-field">
                    <div class="payment-label">หมายเหตุ</div>
                    <div class="payment-value notes">${notes}</div>
                </div>
            </div>
            <div class="payment-card-footer">
                ${actionButton}
            </div>
        `;
        
        mobileContainer.appendChild(card);
    });
}

// Function to check screen size and toggle between table and cards
function toggleTableCards() {
    const desktopContainer = document.querySelector('.desktop-table-container');
    const mobileContainer = document.querySelector('.mobile-card-container');
    
    if (!desktopContainer || !mobileContainer) return;
    
    if (window.innerWidth <= 767.98) {
        // Mobile view - show cards, hide table
        desktopContainer.style.display = 'none';
        mobileContainer.style.display = 'block';
        convertTableToCards();
    } else {
        // Desktop view - show table, hide cards
        desktopContainer.style.display = 'block';
        mobileContainer.style.display = 'none';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    toggleTableCards();
    
    // Listen for window resize
    window.addEventListener('resize', function() {
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(toggleTableCards, 250);
    });
});

// Function to refresh mobile cards when table data changes
function refreshMobileCards() {
    if (window.innerWidth <= 767.98) {
        convertTableToCards();
    }
}

// Export functions for global use
window.convertTableToCards = convertTableToCards;
window.toggleTableCards = toggleTableCards;
window.refreshMobileCards = refreshMobileCards;
