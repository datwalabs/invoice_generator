// Initialize variables
let lineItemCount = 1;
const taxRates = {
    cgst: 0.09,  // 9%
    sgst: 0.09,  // 9%
    igst: 0.18   // 18%
};

// Set today's date as default for invoice date
document.addEventListener('DOMContentLoaded', function() {

    let deployed_url = "https://script.google.com/macros/s/AKfycbxKr-jwkiqIAAzOJsEehkNt8KjAa9KWPqmgbLYaQQNEeq-LbXmdQ5aHqptjWc9lALQ/exec?callback=handleData"
    fetch(deployed_url)
        .then(response => response.json())
        .then(data => console.log(data));

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    
    // Set due date as 30 days from today
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];
    
    // Set current month as default billing period
    const currentMonth = new Date().toISOString().substring(0, 7);
    document.getElementById('billingPeriod').value = currentMonth;
    
    // Add event listeners
    document.getElementById('addLine').addEventListener('click', addLineItem);
    document.getElementById('generateInvoice').addEventListener('click', generateInvoice);
    document.getElementById('downloadPdf').addEventListener('click', downloadPdf);
    document.getElementById('backToForm').addEventListener('click', backToForm);
    document.getElementById('billingType').addEventListener('change', toggleBillingFields);
    document.getElementById('clientType').addEventListener('change', updateTaxFields);
    
    // Add event listeners for calculation
    document.querySelectorAll('input[id^="hours"], input[id^="rate"], input[id^="amount"]').forEach(input => {
        input.addEventListener('input', calculateTotals);
    });
    
    // Initialize tax fields
    updateTaxFields();
});

// Toggle between hourly and fixed price fields
function toggleBillingFields() {
    const billingType = document.getElementById('billingType').value;
    const billingPeriodGroup = document.getElementById('billingPeriodGroup');
    const hourlyFields = document.querySelectorAll('.hourly-field');
    const fixedFields = document.querySelectorAll('.fixed-field');
    
    if (billingType === 'hourly') {
        billingPeriodGroup.style.display = 'block';
        hourlyFields.forEach(field => field.style.display = 'block');
        fixedFields.forEach(field => field.style.display = 'none');
    } else {
        billingPeriodGroup.style.display = 'none';
        hourlyFields.forEach(field => field.style.display = 'none');
        fixedFields.forEach(field => field.style.display = 'block');
    }
    
    calculateTotals();
}

// Update tax fields based on client type
function updateTaxFields() {
    const clientType = document.getElementById('clientType').value;
    const cgstContainer = document.getElementById('cgstContainer');
    const sgstContainer = document.getElementById('sgstContainer');
    const igstContainer = document.getElementById('igstContainer');
    
    // Hide all tax containers first
    cgstContainer.style.display = 'none';
    sgstContainer.style.display = 'none';
    igstContainer.style.display = 'none';
    
    // Show relevant tax containers based on client type
    if (clientType === 'clientA') {
        cgstContainer.style.display = 'flex';
        sgstContainer.style.display = 'flex';
    } else if (clientType === 'clientB') {
        cgstContainer.style.display = 'flex';
        igstContainer.style.display = 'flex';
    }
    
    calculateTotals();
}

// Add a new line item
function addLineItem() {
    const lineItems = document.getElementById('lineItems');
    const newItem = document.createElement('div');
    newItem.className = 'line-item';
    
    const billingType = document.getElementById('billingType').value;
    const hourlyDisplay = billingType === 'hourly' ? 'block' : 'none';
    const fixedDisplay = billingType === 'fixed' ? 'block' : 'none';
    
    newItem.innerHTML = `
        <div class="form-group">
            <label for="description${lineItemCount}">Description:</label>
            <input type="text" id="description${lineItemCount}" placeholder="Consulting Service">
        </div>
        
        <div class="form-group hourly-field" style="display: ${hourlyDisplay}">
            <label for="hours${lineItemCount}">Hours:</label>
            <input type="number" id="hours${lineItemCount}" min="0" step="0.5" value="0">
        </div>
        
        <div class="form-group hourly-field" style="display: ${hourlyDisplay}">
            <label for="rate${lineItemCount}">Rate (₹):</label>
            <input type="number" id="rate${lineItemCount}" min="0" value="0">
        </div>
        
        <div class="form-group fixed-field" style="display: ${fixedDisplay}">
            <label for="amount${lineItemCount}">Amount (₹):</label>
            <input type="number" id="amount${lineItemCount}" min="0" value="0">
        </div>
        
        <div class="form-group">
            <label>Line Total:</label>
            <span id="lineTotal${lineItemCount}">₹0.00</span>
        </div>
        
        <button type="button" class="remove-line" onclick="removeLine(this)">Remove</button>
    `;
    
    lineItems.appendChild(newItem);
    
    // Add event listeners for the new inputs
    document.getElementById(`hours${lineItemCount}`).addEventListener('input', calculateTotals);
    document.getElementById(`rate${lineItemCount}`).addEventListener('input', calculateTotals);
    document.getElementById(`amount${lineItemCount}`).addEventListener('input', calculateTotals);
    
    // Enable all remove buttons if we have more than one line item
    if (lineItems.children.length > 1) {
        document.querySelectorAll('.remove-line').forEach(button => {
            button.disabled = false;
        });
    }
    
    lineItemCount++;
    calculateTotals();
}

// Remove a line item
function removeLine(button) {
    const lineItems = document.getElementById('lineItems');
    const lineItem = button.parentElement;
    
    lineItems.removeChild(lineItem);
    
    // Disable remove buttons if only one line item remains
    if (lineItems.children.length <= 1) {
        document.querySelectorAll('.remove-line').forEach(button => {
            button.disabled = true;
        });
    }
    
    calculateTotals();
}

// Calculate totals for all line items and the invoice
function calculateTotals() {
    const billingType = document.getElementById('billingType').value;
    const clientType = document.getElementById('clientType').value;
    let subtotal = 0;
    
    // Calculate line totals
    const lineItems = document.getElementById('lineItems').children;
    for (let i = 0; i < lineItems.length; i++) {
        let lineTotal = 0;
        const lineItem = lineItems[i];
        const index = lineItem.querySelector('[id^="description"]').id.replace('description', '');
        
        if (billingType === 'hourly') {
            const hoursElement = document.getElementById(`hours${index}`);
            const rateElement = document.getElementById(`rate${index}`);
            
            if (hoursElement && rateElement) {
                const hours = parseFloat(hoursElement.value) || 0;
                const rate = parseFloat(rateElement.value) || 0;
                lineTotal = hours * rate;
            }
        } else {
            const amountElement = document.getElementById(`amount${index}`);
            if (amountElement) {
                lineTotal = parseFloat(amountElement.value) || 0;
            }
        }
        
        const lineTotalElement = document.getElementById(`lineTotal${index}`);
        if (lineTotalElement) {
            lineTotalElement.textContent = `₹${lineTotal.toFixed(2)}`;
        }
        
        subtotal += lineTotal;
    }
    
    // Update subtotal
    document.getElementById('subtotal').textContent = `₹${subtotal.toFixed(2)}`;
    
    // Calculate taxes
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    
    if (clientType === 'clientA') {
        cgstAmount = subtotal * taxRates.cgst;
        sgstAmount = subtotal * taxRates.sgst;
    } else if (clientType === 'clientB') {
        cgstAmount = subtotal * taxRates.cgst;
        igstAmount = subtotal * taxRates.igst;
    }
    
    // Update tax amounts
    document.getElementById('cgst').textContent = `₹${cgstAmount.toFixed(2)}`;
    document.getElementById('sgst').textContent = `₹${sgstAmount.toFixed(2)}`;
    document.getElementById('igst').textContent = `₹${igstAmount.toFixed(2)}`;
    
    // Calculate total
    const total = subtotal + cgstAmount + sgstAmount + igstAmount;
    document.getElementById('total').textContent = `₹${total.toFixed(2)}`;
}

// Generate invoice preview
function generateInvoice() {
    const invoiceNumber = document.getElementById('invoiceNumber').value || 'INV-001';
    const invoiceDate = document.getElementById('invoiceDate').value;
    const dueDate = document.getElementById('dueDate').value;
    const clientType = document.getElementById('clientType').value;
    const billingType = document.getElementById('billingType').value;
    const billingPeriod = document.getElementById('billingPeriod').value;
    
    // Format dates
    const formattedInvoiceDate = formatDate(invoiceDate);
    const formattedDueDate = formatDate(dueDate);
    
    // Get client details based on selection
    let clientName = '';
    let clientAddress = '';
    let clientGST = '';
    let clientState = '';
    let lut = null;
    
    if (clientType === 'clientA') {
        clientName = 'Kriyati Consulting Private Limited';
        clientAddress = 'Flat No-203, Surekha Orchid Apartment,\nSishu Vihar, Patia\nPatia, Bhubaneswar, Odisha - 751024';
        clientGST = 'GSTIN - 21AALCK1310P1ZN';
        clientState = 'State Name : Odisha, Code : 21';
        lut = null
    } else if (clientType === 'client B') {
        clientName = 'DemoIndian Client';
        clientAddress = 'Client B Address\nCity, State, ZIP';
        clientGST = 'GSTIN - XXXXXXXXXXXX';
        clientState = 'State Name : XXXX, Code : XX';
        lut = null

    } else if (clientType === 'clientC') {
        clientName = 'Lucid Labs';
        clientAddress = 'Blk 109a Canberra walk';
        // clientGST = 'GSTIN - XXXXXXXXXXXX';
        // clientState = 'State Name : XXXX, Code : XX';
        lut = 'AD210325007790K'
    }
    else if (clientType === 'clientD') {
        clientName = 'Tibersoft LLC';
        clientAddress = 'Cultura Technologies, Inc.\n3820 Mansell Road, Suite 350 | Alpharetta, GA 30022 USA \nCell: 404-971-5536';
        // clientGST = 'GSTIN - XXXXXXXXXXXX';
        // clientState = 'State Name : XXXX, Code : XX';
        lut = 'AD210325007790K'
    }
    else{
        clientName = 'Client C';
        clientAddress = 'Client C Address\nCity, State, ZIP';
        clientGST = 'GSTIN - XXXXXXXXXXXX';
        clientState = 'State Name : XXXX, Code : XX';
    }
    
    // Create invoice content
    let invoiceContent = `
        <div class="invoice-header" style="display: flex; justify-content: space-between; align-items: center;">
            <div style="text-align: left;">
                <img src="logo.png" alt="Company Logo" style="height: 50px; margin-bottom: 10px;">
                <div>Datwa Labs Pvt. Ltd.</div>
                <div>Plot no 67/1084/1211, Divya vihar, Lane 7, Old town,</div>
                <div>Bhubaneswar, Odisha - 751002</div>
                <div>GSTIN - 21AALCK1310P1ZN</div>
                <div>PAN - AALCD1483E</div>
            </div>
            <div style="text-align: right;">
                <div class="invoice-title">INVOICE</div>
                <div><strong>Invoice #:</strong> ${invoiceNumber}</div>
                <div><strong>Date:</strong> ${formattedInvoiceDate}</div>
                <div><strong>Due Date:</strong> ${formattedDueDate}</div>
            </div>
        </div>
        
        <div class="invoice-details">
            <div><strong>Bill To:</strong></div>
            <div>${clientName}</div>
            <div style="white-space: pre-line;">${clientAddress}</div>
    `;
    
    // Add GST information only for clients that need it
    if (clientType !== 'clientC') {
        invoiceContent += `
            <div>${clientGST}</div>
            <div>${clientState}</div>
        `;
    }
    
    invoiceContent += `</div>`;
    
    // Add billing period if hourly
    if (billingType === 'hourly' && billingPeriod) {
        const date = new Date(billingPeriod + '-01');
        const month = date.toLocaleString('default', { month: 'long' });
        const year = date.getFullYear();
        invoiceContent += `<div><strong>Billing Period:</strong> ${month} ${year}</div>`;
    }
    
    // Create table for line items
    invoiceContent += `
        <table class="invoice-table">
            <thead>
                <tr>
                    <th>Description</th>
    `;
    
    if (billingType === 'hourly') {
        invoiceContent += `
                    <th>Hours</th>
                    <th>Rate</th>
        `;
    }
    
    invoiceContent += `
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Add line items
    const lineItems = document.getElementById('lineItems').children;
    for (let i = 0; i < lineItems.length; i++) {
        const lineItem = lineItems[i];
        const index = lineItem.querySelector('[id^="description"]').id.replace('description', '');
        const description = document.getElementById(`description${index}`).value || 'Consulting Service';
        let lineTotal = 0;
        
        invoiceContent += `
            <tr>
                <td>${description}</td>
        `;
        
        if (billingType === 'hourly') {
            const hoursElement = document.getElementById(`hours${index}`);
            const rateElement = document.getElementById(`rate${index}`);
            
            if (hoursElement && rateElement) {
                const hours = parseFloat(hoursElement.value) || 0;
                const rate = parseFloat(rateElement.value) || 0;
                lineTotal = hours * rate;
                
                invoiceContent += `
                    <td>${hours}</td>
                    <td>₹${rate.toFixed(2)}</td>
                `;
            }
        } else {
            const amountElement = document.getElementById(`amount${index}`);
            if (amountElement) {
                lineTotal = parseFloat(amountElement.value) || 0;
            }
        }
        
        invoiceContent += `
                <td>${lut === null ? '₹' : '$'} ${lineTotal.toFixed(2)}</td>
            </tr>
        `;
    }
    
    invoiceContent += `
            </tbody>
        </table>
    `;
    
    // Add totals
    const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace('₹', '')) || 0;
    const cgstAmount = parseFloat(document.getElementById('cgst').textContent.replace('₹', '')) || 0;
    const sgstAmount = parseFloat(document.getElementById('sgst').textContent.replace('₹', '')) || 0;
    const igstAmount = parseFloat(document.getElementById('igst').textContent.replace('₹', '')) || 0;
    const total = parseFloat(document.getElementById('total').textContent.replace('₹', '')) || 0;
    
    invoiceContent += `
        <div class="invoice-totals">
            <div><strong>Subtotal:</strong> ${lut === null ? '₹' : '$'} ${subtotal.toFixed(2)}</div>
    `;
    
    // Add tax information based on client type
    if (clientType === 'clientA') {
        invoiceContent += `
            <div><strong>CGST (9%):</strong> ₹${cgstAmount.toFixed(2)}</div>
            <div><strong>SGST (9%):</strong> ₹${sgstAmount.toFixed(2)}</div>
        `;
    } else if (clientType === 'clientB') {
        invoiceContent += `
            <div><strong>CGST (9%):</strong> ₹${cgstAmount.toFixed(2)}</div>
            <div><strong>IGST (18%):</strong> ₹${igstAmount.toFixed(2)}</div>
        `;
    }
    
    invoiceContent += `
            <div class="invoice-total"><strong>Total:</strong> ${lut === null ? '₹' : '$'}${total.toFixed(2)}</div>
        </div>
        
        <div style="margin-top: 40px;">
            <p><strong>Payment Terms:</strong> Net 30</p>
            <div style="margin-top: 20px;">
                <p><strong>Bank Details For Payment:</strong></p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <tr>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;"><strong>Name:</strong></td>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;">Datwa Labs Private Limited</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;"><strong>Account number:</strong></td>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;">50200100496302</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;"><strong>IFSC:</strong></td>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;">HDFC0004013</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;"><strong>Bank name:</strong></td>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;">HDFC Bank</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;"><strong>Branch:</strong></td>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;">Infocity</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;"><strong>GST:</strong></td>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;">21AALCD1483E1ZZ</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;"><strong>PAN:</strong></td>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;">AALCD1483E</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;"><strong>Swift Code:</strong></td>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;">HDFCINBB</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;"><strong>Purpose Code:</strong></td>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;">P0802</td>
                    </tr>
                    ${lut !== null ? `<tr>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;"><strong>LUT:</strong></td>
                        <td style="padding: 5px 10px; border: 1px solid #ddd;">${lut}</td>
                    </tr>` : ''}
                </table>
            </div>
            <p style="margin-top: 20px; font-weight: bold; text-align: center;">Thank You For Your Business!</p>
        </div>
    `;
    
    // Display the invoice
    document.getElementById('invoiceContent').innerHTML = invoiceContent;
    document.getElementById('invoicePreview').style.display = 'block';
    document.querySelector('.form-container').style.display = 'none';
}

// Format date as DD/MM/YYYY
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}

// Download invoice as PDF using browser print
function downloadPdf() {
    // Hide the buttons temporarily
    const downloadBtn = document.getElementById('downloadPdf');
    const backBtn = document.getElementById('backToForm');
    const originalDisplayDownload = downloadBtn.style.display;
    const originalDisplayBack = backBtn.style.display;
    
    downloadBtn.style.display = 'none';
    backBtn.style.display = 'none';
    
    // Print the invoice
    window.print();
    
    // Restore the buttons
    setTimeout(() => {
        downloadBtn.style.display = originalDisplayDownload;
        backBtn.style.display = originalDisplayBack;
    }, 1000);
}

// Go back to the form
function backToForm() {
    document.getElementById('invoicePreview').style.display = 'none';
    document.querySelector('.form-container').style.display = 'block';
} 