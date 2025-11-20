// Cart functionality with localStorage - User-specific carts

let cart = [];

// Get current user ID from page (if logged in)
function getCurrentUserId() {
    // Check if user data is available in the page
    const userElement = document.querySelector('[data-user-id]');
    return userElement ? userElement.getAttribute('data-user-id') : 'guest';
}

// Get cart key for current user
function getCartKey() {
    return `cart_${getCurrentUserId()}`;
}

// Load cart from localStorage
function loadCart() {
    const savedCart = localStorage.getItem(getCartKey());
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
    updateCartCount();
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem(getCartKey(), JSON.stringify(cart));
    updateCartCount();
}

// Get cart from localStorage (for cart.ejs)
function getCart() {
    return cart;
}

// Update cart count badge
function updateCartCount() {
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCountElement.textContent = totalItems;
    }
}

// Add item to cart
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
            price: parseFloat(price),
            image: image,
            quantity: 1
        });
    }
    
    // Save cart to localStorage
    saveCart();
    
    // Show cart notification
    showCartNotification(name);
    
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
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    if (addToCartButtons.length > 0) {
        addToCartButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                const productCard = this.closest('.product-card');
                const productId = productCard.getAttribute('data-product-id');
                const productName = productCard.querySelector('h3').textContent;
                const productPrice = productCard.querySelector('.product-price').textContent.replace('₱', '').replace(',', '').trim();
                const productImage = productCard.querySelector('img').getAttribute('src');
                
                addToCart(productId, productName, productPrice, productImage);
                
                // Visual feedback
                this.textContent = 'Added!';
                this.style.backgroundColor = 'var(--minecraft-green)';
                
                setTimeout(() => {
                    this.textContent = 'Add to Cart';
                    this.style.backgroundColor = '';
                }, 1500);
            });
        });
    }
});