// Middleware functions for authentication and authorization
const isLoggedIn = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    
    // Store the requested URL to redirect after login
    req.session.returnTo = req.originalUrl;
    
    req.flash('error', 'You must be logged in to access this page');
    return res.redirect('/users/login');
};

const isAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    
    req.flash('error', 'You do not have permission to access this page');
    return res.redirect('/users/dashboard');
};

// Check if user is logged in - for conditional rendering in templates
const checkAuthenticated = (req, res, next) => {
    res.locals.isAuthenticated = !!(req.session && req.session.user);
    res.locals.currentUser = req.session.user || null;
    next();
};

module.exports = {
    isLoggedIn,
    isAdmin,
    checkAuthenticated
};