export default (req, res, next) => {
    res.locals.currentPage = req.originalUrl.slice(1);
    res.locals.colorMode = req.cookies.color_mode;
    res.locals.user = () => {
        if ('user' in req.session) {
            return req.session.user.email;
        } else if ('user_login' in req.cookies) {
            return req.cookies.user_login;
        }
        return null;
    };
    next();
};