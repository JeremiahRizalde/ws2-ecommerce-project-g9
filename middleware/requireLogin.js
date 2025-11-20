// middleware/requireLogin.js
function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        req.flash('error', 'You must be logged in to access this page.');
        return res.redirect('/users/login');
    }
    next();
}

module.exports = requireLogin;
