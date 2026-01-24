(function() {
    'use strict';

    function generateRandomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 19; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    function addGenerateButton() {
        const codeField = document.querySelector('#id_code');
        if (!codeField || document.querySelector('.generate-code-btn')) {
            return;
        }

        const container = codeField.parentElement;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'generate-code-btn';
        button.textContent = '🎲 Generovať náhodný kód';
        button.style.cssText = 'margin-left: 10px; padding: 5px 15px; background: #417690; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;';
        
        button.addEventListener('mouseover', function() {
            this.style.background = '#205067';
        });
        
        button.addEventListener('mouseout', function() {
            this.style.background = '#417690';
        });
        
        button.addEventListener('click', function() {
            const code = generateRandomCode();
            codeField.value = code;
            codeField.focus();
        });

        container.appendChild(button);
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addGenerateButton);
    } else {
        addGenerateButton();
    }

    // Also run after dynamic content loads (Django admin inlines)
    window.addEventListener('load', addGenerateButton);
})();
