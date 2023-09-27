import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import credentials from '../../config.mjs';
import emailService from './mailer.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// LOGIN/LOGOUT ---------------------------------------------------------------------------------
function isLoggedIn(req, res) {
    if (req.session.user) {
        return true;
    } else if (req.cookies.user_login) {
        req.session.user = {
            email: req.cookies.user_login
        };
        return true;
    } 
    return false;
}

export function login(req, res) {
    const email = req.body.email;
    const password = req.body.password;
    const remember = req.body.remember;
    const redirect = req.body.redirect;

    if (email === "admin@coders.ninja" && password === "admin123") {
        req.session.user = {
            email: email
        };
        if (remember) {
            res.cookie('user_login', req.body.email, {maxAge: 30 * 24 * 60 * 60 * 1000});
        }

        if (redirect && redirect !== '/') {
            res.render(redirect);
        } else {
            res.render('home');
        }
    } else {
        res.render('login', { layout: null, error: "Invalid username or password." });
    }
}

export function logout(req, res) {
    req.session.destroy();
    res.clearCookie('user_login');
    res.render('login', { layout: null, message: "You have been successfully logged out." });
}

// END LOGIN/LOGOUT ------------------------------------------------------------------------------

// MAIN PAGES ------------------------------------------------------------------------------------
export function home(req, res) {
    if (isLoggedIn(req, res)) {
        res.render('home');
    } else {
        res.render('login', { layout: null, redirect: '/' });
    }
}

export function colorMode(req, res) {
    res.cookie('color_mode', req.params.mode, {maxAge: 30 * 24 * 60 * 60 * 1000});
    res.redirect(req.get('referer'));
}

export function messages(req, res) {
    if (isLoggedIn(req, res)) {
        res.render('messages');
    } else {
        res.render('login', { layout: null, redirect: 'admin/messages' });
    }
}

export function lists(req, res) {
    if (isLoggedIn(req, res)) {
        res.render('lists');
    } else {
        res.render('login', { layout: null, redirect: 'admin/lists' });
    }
}

export function sendMail(req, res) {
    if (isLoggedIn(req, res)) {
        res.render('send');
    } else {
        res.render('login', { layout: null, redirect: 'send' });
    }
}
// END MAIN PAGES --------------------------------------------------------------------------------

// LISTS API -------------------------------------------------------------------------------------
export const listApi = {
    addList: (req, res) => {
        if (!req.session.lists) req.session.lists = [];
        const { lists } = req.session;
        const listName = req.body.listName;

        if (!lists.some(list => list.name === listName)) {
            lists.push({ name: listName, addresses: [] });
            res.status(201).end();
        } else {
            res.status(409).end(); // Duplicate
        } 
    },
    getLists: (req, res) => {
        if (!req.session.lists) {
            res.status(404).end()
            return;
        };
        const { lists } = req.session;
        res.json(lists);
    },
    getList: (req, res) => {
        if (!req.session.lists) res.status(404).end();
        const { lists } = req.session;
        const listName = req.params.listName;
        const list = (lists.reduce((byName, l) => Object.assign(byName, { [l.name]: l}), {}))[listName];

        res.json(list.addresses);
    },
    addAddress: (req, res) => {
        if (!req.session.lists) res.status(404).end();
        const { lists } = req.session;
        const listName = req.params.listName;
        const newAddress = req.body.newAddress;
        const list = (lists.reduce((byName, l) => Object.assign(byName, { [l.name]: l}), {}))[listName];

        if (!list.addresses.some(address => address === newAddress)) {
            list.addresses.push(newAddress);
            res.status(201).end();
        } else {
            res.status(409).end();
        }
    },
    bulkAddAddress: (req, res) => {
        // TODO Self-Study!
    }
};
// END LIST API ----------------------------------------------------------------------------------

// MESSAGES API ----------------------------------------------------------------------------------
export const messageApi = {
    addMessage: (req, res) => {
        if (!req.session.messages) req.session.messages = [];
        const { messages } = req.session;
        const messageName = req.body.messageName;

        if (!messages.some(message => message.name === messageName)) {
            messages.push({ name: messageName, content: '' });
            res.status(201).end();
        } else {
            res.status(409).end(); // Duplicate
        } 
    },
    getMessages: (req, res) => {
        if (!req.session.messages) {
            res.status(404).end()
            return;
        };
        const { messages } = req.session;
        res.json(messages);
    },
    getMessage: (req, res) => {
        if (!req.session.messages) res.status(404).end();
        const { messages } = req.session;
        const messageName = req.params.messageName;
        const message = (messages.reduce((byName, m) => Object.assign(byName, { [m.name]: m}), {}))[messageName];

        res.json(message.content);
    },
    addMessageContent: (req, res) => {
        if (!req.session.messages) res.status(404).end();
        const { messages } = req.session;
        const messageName = req.params.messageName;
        const content = req.body.content;
        const message = (messages.reduce((byName, m) => Object.assign(byName, { [m.name]: m}), {}))[messageName];
        
        message.content = content;
        res.status(201).end();
    }
};
// END MESSAGES API ------------------------------------------------------------------------------

// SEND MESSAGE API ------------------------------------------------------------------------------
export const sendApi = {
    sendMessage: (req, res) => {
        const listName = req.body.listName;
        const messageName = req.body.messageName;
        const { lists, messages } = req.session;
        const list = (lists.reduce((byName, l) => Object.assign(byName, { [l.name]: l}), {}))[listName];
        const message = (messages.reduce((byName, m) => Object.assign(byName, { [m.name]: m}), {}))[messageName];

        const recipients = list.addresses;

        const mailer = emailService(credentials);
        mailer.send(recipients, messageName, message.content, true)
            .then(info => {
                console.log('Sent: ', info);
                res.send({ result: 'success' });
            })
            .catch(err => {
                console.error('Unable to send message: ', err.message);
                res.send( { result: 'error', error: 'Failed to send email.' });
            });
    }
};
// END SEND MESSAGE API --------------------------------------------------------------------------

// ERROR HANDLING --------------------------------------------------------------------------------
export function notFound(req, res) {
    res.render('404');
}

export function serverError(err, req, res) {
    res.render('500');
}
// END ERROR HANDLING ----------------------------------------------------------------------------

export default {
    home, 
    colorMode,
    login,
    logout,
    messages,
    lists,
    sendMail,
    listApi,
    messageApi,
    sendApi,
    notFound,
    serverError
}