angular.module('chatapp.services', [])

.factory('LocalStorage', [function () {
    return {
        set: function (key, value) {
            return localStorage.setItem(key, JSON.stringify(value));
        },

        get: function (key) {
            return JSON.parse(localStorage.getItem(key));
        },

        remove: function (key) {
            return localStorage.removeItem(key);
        },
    };
}])

.factory('Loader', ['$ionicLoading', '$timeout',
    function ($ionicLoading, $timeout) {

        return {
            show: function (text) {
                //console.log('show', text);
                $ionicLoading.show({
                    content: (text || 'Loading...'),
                    noBackdrop: true
                });
            },

            hide: function () {
                //console.log('hide');
                $ionicLoading.hide();
            },

            toggle: function (text, timeout) {
                var that = this;
                that.show(text);

                $timeout(function () {
                    that.hide();
                }, timeout || 3000);
            }
        };
    }
])

.factory('FBFactory', ['$firebaseAuth', '$firebaseArray', 'FBURL', 'Utils',
    function ($firebaseAuth, $firebaseArray, FBURL, Utils) {
        return {
            auth: function () {
                var FBRef = new Firebase(FBURL);
                return $firebaseAuth(FBRef);
            },
            olUsers: function () {
                var olUsersRef = new Firebase(FBURL + 'onlineUsers');
                return $firebaseArray(olUsersRef);
            },
            chatBase: function () {
                var chatRef = new Firebase(FBURL + 'chats');
                return $firebaseArray(chatRef);
            },
            chatRef: function (loggedInUser, OtherUser) {
                var chatRef = new Firebase(FBURL + 'chats/chat_' + Utils.getHash(OtherUser, loggedInUser));
                return $firebaseArray(chatRef);
            }
        };
    }
])

.factory('UserFactory', ['LocalStorage', function (LocalStorage) {

    var userKey = 'user',
        presenceKey = 'presence',
        olUsersKey = 'onlineusers';

    return {
        onlineUsers: {},
        setUser: function (user) {
            return LocalStorage.set(userKey, user);
        },
        getUser: function () {
            return LocalStorage.get(userKey);
        },
        cleanUser: function () {
            return LocalStorage.remove(userKey);
        },
        setOLUsers: function (users) {
            // >> we need to store users as pure object.
            // else we loose the $ method of FB.

            // >> sometime, onlineUsers becomes null while
            // navigating between tabs, so we save a copy in LS
            LocalStorage.set(olUsersKey, users);
            return this.onlineUsers = users;
        },
        getOLUsers: function () {
            if(this.onlineUsers && this.onlineUsers.length > 0) {
                return this.onlineUsers
            } else {
                return LocalStorage.get(olUsersKey);
            }
        },
        cleanOLUsers: function () {
            LocalStorage.remove(olUsersKey);
            return onlineUsers = null;
        },
        setPresenceId: function (presenceId) {
            return LocalStorage.set(presenceKey, presenceId);
        },
        getPresenceId: function () {
            return LocalStorage.get(presenceKey);
        },
        cleanPresenceId: function () {
            return LocalStorage.remove(presenceKey);
        },
    };
}])

.factory('Utils', [function () {
    return {
        escapeEmailAddress: function (email) {
            if(!email) return false
                // Replace '.' (not allowed in a Firebase key) with ','
            email = email.toLowerCase();
            email = email.replace(/\./g, ',');
            return email.trim();
        },
        unescapeEmailAddress: function (email) {
            if(!email) return false
            email = email.toLowerCase();
            email = email.replace(/,/g, '.');
            return email.trim();
        },
        getHash: function (chatToUser, loggedInUser) {
            var hash = '';
            if(chatToUser > loggedInUser) {
                hash = this.escapeEmailAddress(chatToUser) + '_' + this.escapeEmailAddress(loggedInUser);
            } else {
                hash = this.escapeEmailAddress(loggedInUser) + '_' + this.escapeEmailAddress(chatToUser);
            }
            return hash;
        },
        getBase64ImageFromInput: function (input, callback) {
            window.resolveLocalFileSystemURL(input, function (fileEntry) {
                    fileEntry.file(function (file) {
                            var reader = new FileReader();
                            reader.onloadend = function (evt) {
                                callback(null, evt.target.result);
                            };
                            reader.readAsDataURL(file);
                        },
                        function () {
                            callback('failed', null);
                        });
                },
                function () {
                    callback('failed', null);
                });
        }
    };
}])
