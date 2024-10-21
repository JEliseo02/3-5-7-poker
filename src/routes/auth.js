// Middelware to check is user is authenticated
const isAuthenticated = (req,res,next) => {
    if(req.session && req.session.userId) {
        return next();
    }

    //If user isn't authenticated, redirect to login page
    req.flash('error', 'Please log in to access this page');
    res.redirect('/login');
};


// Middelware to check if user is NOT authenticated (for login/register page)
const isNotAuthenticated = (req,res,next) => {
    if (!req.session || !req.session.userId){
        return next();
    }

    //If user is already logged in, redirect to home
    res.redirect('/');
};


module.exports = {
    isAuthenticated,
    isNotAuthenticated
}