// Contact form validation
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(event) {
            let isValid = true;
            
            // Get form fields
            const name = document.getElementById('name');
            const email = document.getElementById('email');
            const subject = document.getElementById('subject');
            const message = document.getElementById('message');
            
            // Clear previous error styles
            [name, email, subject, message].forEach(field => {
                field.style.borderColor = '';
            });
            
            // Validate name
            if (!name.value.trim()) {
                name.style.borderColor = 'red';
                isValid = false;
            }
            
            // Validate email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email.value.trim() || !emailRegex.test(email.value.trim())) {
                email.style.borderColor = 'red';
                isValid = false;
            }
            
            // Validate subject
            if (!subject.value) {
                subject.style.borderColor = 'red';
                isValid = false;
            }
            
            // Validate message
            if (!message.value.trim() || message.value.trim().length < 10) {
                message.style.borderColor = 'red';
                isValid = false;
            }
            
            if (!isValid) {
                event.preventDefault();
                
                // Show error message
                const errorElement = document.createElement('div');
                errorElement.className = 'alert alert-danger';
                errorElement.textContent = 'Please fill out all fields correctly.';
                
                // Insert at the top of the form
                contactForm.insertBefore(errorElement, contactForm.firstChild);
                
                // Remove error message after 5 seconds
                setTimeout(() => {
                    if (errorElement.parentNode === contactForm) {
                        contactForm.removeChild(errorElement);
                    }
                }, 5000);
            }
        });
        
        // Add input event listeners to remove error styling when user starts typing
        ['name', 'email', 'subject', 'message'].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', function() {
                    this.style.borderColor = '';
                });
            }
        });
    }
});