// Simple cart functionality

let cart = [];
let cartCount = 0;

function addToCart(productId, name, price, image) {
    // Check if product is already in cart
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        // Increase quantity if already in cart
        existingItem.quantity += 1;
    } else {
        // Add new item to cart
        cart.push({
            id: productId,
            name: name,
            price: price,
            image: image,
            quantity: 1
        });
    }
    
    // Update cart count
    cartCount += 1;
    updateCartCount();
    
    // Show cart notification
    showCartNotification(name);
    
    // Save cart to localStorage
    saveCart();
    
    return false; // Prevent default form submission
}

function showCartNotification(productName) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.innerHTML = `
        <p><strong>${productName}</strong> added to cart!</p>
        <a href="/cart" class="pixel-btn">View Cart</a>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('fadeOut');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

// Initialize cart when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadCart();
    
    // Add click event listeners to all "Add to Cart" buttons
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', function() {
            const productCard = this.closest('.product-card');
            const productId = productCard.getAttribute('data-product-id');
            const productName = productCard.querySelector('h3').textContent;
            const productPrice = productCard.querySelector('.product-price').textContent.replace('$', '');
            const productImage = productCard.querySelector('img').getAttribute('src');
            addToCart(productId, productName, productPrice, productImage);
        });
    });
});