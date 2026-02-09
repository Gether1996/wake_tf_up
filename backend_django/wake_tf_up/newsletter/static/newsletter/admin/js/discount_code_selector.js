(function() {
    'use strict';
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    function init() {
        console.log('Discount code selector script loaded');
        
        // Get the discount code dropdown
        var discountSelect = document.getElementById('id_selected_discount_code');
        
        if (!discountSelect) {
            console.log('Discount code select field not found');
            return;
        }
        
        console.log('Discount code select field found');
        
        // Function to update discount fields from API
        function updateDiscountFields() {
            var selectedOption = discountSelect.options[discountSelect.selectedIndex];
            
            if (!selectedOption.value || selectedOption.value === '') {
                // Clear fields if no selection
                clearFields();
                return;
            }
            
            console.log('Selected discount code ID:', selectedOption.value);
            
            // Fetch discount code details via AJAX
            fetch('/api/v1/loyalty/discount-codes/' + selectedOption.value + '/', {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin'
            })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP error ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                console.log('Received discount code data:', data);
                
                // Update the readonly fields
                var codeField = document.getElementById('id_discount_code');
                var percentageField = document.getElementById('id_discount_percentage');
                var validUntilDate = document.getElementById('id_valid_until_0');
                var validUntilTime = document.getElementById('id_valid_until_1');
                
                if (codeField) codeField.value = data.code || '';
                if (percentageField) percentageField.value = data.discount_percentage ? Math.round(data.discount_percentage) : '';
                
                // Update valid_until datetime field
                if (data.valid_until && validUntilDate && validUntilTime) {
                    try {
                        var date = new Date(data.valid_until);
                        
                        // Format date as YYYY-MM-DD
                        var year = date.getFullYear();
                        var month = String(date.getMonth() + 1).padStart(2, '0');
                        var day = String(date.getDate()).padStart(2, '0');
                        validUntilDate.value = year + '-' + month + '-' + day;
                        
                        // Format time as HH:MM:SS
                        var hours = String(date.getHours()).padStart(2, '0');
                        var minutes = String(date.getMinutes()).padStart(2, '0');
                        var seconds = String(date.getSeconds()).padStart(2, '0');
                        validUntilTime.value = hours + ':' + minutes + ':' + seconds;
                        
                        console.log('Fields updated successfully');
                    } catch (e) {
                        console.error('Error parsing date:', e);
                    }
                }
            })
            .catch(function(error) {
                console.error('Error fetching discount code:', error);
            });
        }
        
        function clearFields() {
            var codeField = document.getElementById('id_discount_code');
            var percentageField = document.getElementById('id_discount_percentage');
            var validUntilDate = document.getElementById('id_valid_until_0');
            var validUntilTime = document.getElementById('id_valid_until_1');
            
            if (codeField) codeField.value = '';
            if (percentageField) percentageField.value = '';
            if (validUntilDate) validUntilDate.value = '';
            if (validUntilTime) validUntilTime.value = '';
        }
        
        // Bind change event to immediately update fields
        discountSelect.addEventListener('change', function() {
            console.log('Discount code dropdown changed');
            updateDiscountFields();
        });
        
        // Initialize on page load if there's already a selection
        if (discountSelect.value) {
            console.log('Initial value found, updating fields');
            updateDiscountFields();
        }
    }
})();
