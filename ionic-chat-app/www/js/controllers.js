angular.module('chatapp.controllers', [])

.run(['FBFactory', '$rootScope', 'UserFactory', 'Utils',
    function (FBFactory, $rootScope, UserFactory, Utils) {

        $rootScope.chatHistory = [];
        var baseChatMonitor = FBFactory.chatBase();
        var unwatch = baseChatMonitor.$watch(function (snapshot) {
            var user = UserFactory.getUser();

            if(!user) return;

            if(snapshot.event == 'child_added' || snapshot.event == 'child_changed') {
                var key = snapshot.key;
                if(key.indexOf(Utils.escapeEmailAddress(user.email)) >= 0) {
                    var otherUser = snapshot.key.replace(/_/g, '').replace('chat', '').replace(Utils.escapeEmailAddress(user.email), '');
                    if($rootScope.chatHistory.join('_').indexOf(otherUser) === -1) {
                        $rootScope.chatHistory.push(otherUser);
                    }
                    $rootScope.$broadcast('newChatHistory');
                    /*
                     *  TODO: PRACTICE
                     *  Fire a local notification when a new chat comes in.
                     */
                }
            }
        });
    }
])

.controller('MainCtrl', ['$scope', 'Loader', '$ionicPlatform', '$cordovaOauth', 'FBFactory', 'GOOGLEKEY', 'GOOGLEAUTHSCOPE', 'UserFactory', 'currentAuth', '$state',
    function ($scope, Loader, $ionicPlatform, $cordovaOauth, FBFactory, GOOGLEKEY, GOOGLEAUTHSCOPE, UserFactory, currentAuth, $state) {
        $ionicPlatform.ready(function () {
            Loader.hide();
            $scope.$on('showChatInterface', function ($event, authData) {
                if(authData.google) {
                    authData = authData.google;
                }
                UserFactory.setUser(authData);
                Loader.toggle('Redirecting..');
                $scope.onlineusers = FBFactory.olUsers();

                $scope.onlineusers.$loaded().then(function () {
                    $scope
                        .onlineusers
                        .$add({
                            picture: authData.cachedUserProfile.picture,
                            name: authData.displayName,
                            email: authData.email,
                            login: Date.now()
                        })
                        .then(function (ref) {
                            UserFactory.setPresenceId(ref.key());
                            UserFactory.setOLUsers($scope.onlineusers);
                            $state.go('tab.dash');
                        });
                });
                return;
            });

            if(currentAuth) {
                $scope.$broadcast('showChatInterface', currentAuth.google);
            }

            $scope.loginWithGoogle = function () {
                Loader.show('Authenticating..');
                $cordovaOauth.google(GOOGLEKEY, GOOGLEAUTHSCOPE).then(function (result) {
                    FBFactory.auth()
                        .$authWithOAuthToken('google', result.access_token)
                        .then(function (authData) {
                            $scope.$broadcast('showChatInterface', authData);
                        }, function (error) {
                            Loader.toggle(error);
                        });
                }, function (error) {
                    Loader.toggle(error);
                });
            }

        });
    }
])

.controller('DashCtrl', ['$scope', 'UserFactory', '$ionicPlatform', '$state', '$ionicHistory',
    function ($scope, UserFactory, $ionicPlatform, $state, $ionicHistory) {
        $ionicPlatform.ready(function () {
            $ionicHistory.clearHistory();

            $scope.users = UserFactory.getOLUsers();
            $scope.currUser = UserFactory.getUser();
            var presenceId = UserFactory.getPresenceId();

            $scope.redir = function (user) {
                $state.go('chat-detail', {
                    otherUser: user
                });
            }

        });
    }
])

.controller('ChatsCtrl', ['$scope', '$rootScope', 'UserFactory', 'Utils', '$ionicPlatform', '$state', function ($scope, $rootScope, UserFactory, Utils, $ionicPlatform, $state) {
    $ionicPlatform.ready(function () {
        $scope.$on('$ionicView.enter', function (scopes, states) {
            var olUsers = UserFactory.getOLUsers();
            $scope.chatHistory = [];
            $scope.$on('AddNewChatHistory', function () {
                var ch = $rootScope.chatHistory,
                    matchedUser;
                for(var i = 0; i < ch.length; i++) {
                    for(var j = 0; j < olUsers.length; j++) {
                        if(Utils.escapeEmailAddress(olUsers[j].email) == ch[i]) {
                            matchedUser = olUsers[j];
                        }
                    };
                    if(matchedUser) {
                        $scope.chatHistory.push(matchedUser);
                    } else {
                        $scope.chatHistory.push({
                            email: Utils.unescapeEmailAddress(ch[i]),
                            name: 'User Offline'
                        })
                    }
                };

            });
            $scope.redir = function (user) {
                $state.go('chat-detail', {
                    otherUser: user
                });
            }
            $rootScope.$on('newChatHistory', function ($event) {
                $scope.$broadcast('AddNewChatHistory');
            });
            $scope.$broadcast('AddNewChatHistory');
        })
    });
}])

.controller('ChatDetailCtrl', ['$scope', 'Loader', '$ionicPlatform', '$stateParams', 'UserFactory', 'FBFactory', '$ionicScrollDelegate', '$cordovaImagePicker', 'Utils', '$timeout', '$ionicActionSheet', '$cordovaCapture', '$cordovaGeolocation', '$ionicModal',
    function ($scope, Loader, $ionicPlatform, $stateParams, UserFactory, FBFactory, $ionicScrollDelegate, $cordovaImagePicker, Utils, $timeout, $ionicActionSheet, $cordovaCapture, $cordovaGeolocation, $ionicModal) {
        $ionicPlatform.ready(function () {
            Loader.show('Establishing Connection...');
            // controller code here..

            $scope.chatToUser = $stateParams.otherUser;
            $scope.chatToUser = JSON.parse($scope.chatToUser);
            $scope.user = UserFactory.getUser();

            $scope.messages = FBFactory.chatRef($scope.user.email, $scope.chatToUser.email);
            $scope.messages.$loaded().then(function () {
                Loader.hide();
                $ionicScrollDelegate.scrollBottom(true);
            });

            function postMessage(msg, type, map) {
                var d = new Date();
                d = d.toLocaleTimeString().replace(/:\d+ /, ' ');
                map = map || null;
                $scope.messages.$add({
                    content: msg,
                    time: d,
                    type: type,
                    from: $scope.user.email,
                    map: map
                });

                $scope.chatMsg = '';
                $ionicScrollDelegate.scrollBottom(true);
            }

            $scope.sendMessage = function () {
                if(!$scope.chatMsg) return;
                var msg = '<p>' + $scope.user.cachedUserProfile.name + ' says : <br/>' + $scope.chatMsg + '</p>';
                var type = 'text';
                postMessage(msg, type);
            }

            $scope.showActionSheet = function () {
                var hideSheet = $ionicActionSheet.show({
                    buttons: [{
                        text: 'Share Picture'
                    }, {
                        text: 'Take Picture'
                    }, {
                        text: 'Share My Location'
                    }],
                    cancelText: 'Cancel',
                    cancel: function () {
                        // add cancel code..
                        Loader.hide();
                    },
                    buttonClicked: function (index) {
                        // Clicked on Share Picture
                        if(index === 0) {
                            Loader.show('Processing...');
                            var options = {
                                maximumImagesCount: 1
                            };
                            $cordovaImagePicker.getPictures(options)
                                .then(function (results) {
                                    if(results.length > 0) {
                                        var imageData = results[0];
                                        Utils.getBase64ImageFromInput(imageData, function (err, base64Img) {
                                            //Process the image string. 
                                            postMessage('<p>' + $scope.user.cachedUserProfile.name + ' posted : <br/><img class="chat-img" src="' + base64Img + '">', 'img');
                                            Loader.hide();
                                        });
                                    }
                                }, function (error) {
                                    // error getting photos
                                    console.log('error', error);
                                    Loader.hide();
                                });
                        }
                        // Clicked on Take Picture
                        else if(index === 1) {
                            Loader.show('Processing...');
                            var options = {
                                limit: 1
                            };

                            $cordovaCapture.captureImage(options).then(function (imageData) {


                                Utils.getBase64ImageFromInput(imageData[0].fullPath, function (err, base64Img) {
                                    //Process the image string. 
                                    postMessage('<p>' + $scope.user.cachedUserProfile.name + ' posted : <br/><img class="chat-img" src="' + base64Img + '">', 'img');
                                    Loader.hide();
                                });
                            }, function (err) {
                                console.log(err);
                                Loader.hide();
                            });
                        }
                        // clicked on Share my location
                        else if(index === 2) {
                            $ionicModal.fromTemplateUrl('templates/map-modal.html', {
                                scope: $scope,
                                animation: 'slide-in-up'
                            }).then(function (modal) {
                                $scope.modal = modal;
                                $scope.modal.show();
                                $timeout(function () {
                                    $scope.centerOnMe();
                                }, 2000);
                            });
                        }
                        return true;
                    }
                });
            }

            $scope.mapCreated = function (map) {
                $scope.map = map;
            };

            $scope.closeModal = function () {
                $scope.modal.hide();
            };

            $scope.centerOnMe = function () {
                if(!$scope.map) {
                    return;
                }

                Loader.show('Getting current location...');
                var posOptions = {
                    timeout: 10000,
                    enableHighAccuracy: false
                };
                $cordovaGeolocation.getCurrentPosition(posOptions).then(function (pos) {
                    $scope.user.pos = {
                        lat: pos.coords.latitude,
                        lon: pos.coords.longitude
                    };
                    $scope.map.setCenter(new google.maps.LatLng($scope.user.pos.lat, $scope.user.pos.lon));
                    $scope.map.__setMarker($scope.map, $scope.user.pos.lat, $scope.user.pos.lon);
                    Loader.hide();

                }, function (error) {
                    alert('Unable to get location, please enable GPS to continue');
                    Loader.hide();
                    $scope.modal.hide();
                });
            };

            $scope.selectLocation = function () {
                var pos = $scope.user.pos;

                var map = {
                    lat: pos.lat,
                    lon: pos.lon
                };
                var type = 'geo';

                postMessage('<p>' + $scope.user.cachedUserProfile.name + ' shared : <br/>', type, map);
                $scope.modal.hide();
            }


        });
    }
])

.controller('AccountCtrl', ['$scope', 'FBFactory', 'UserFactory', '$state',
    function ($scope, FBFactory, UserFactory, $state) {

        $scope.logout = function () {
            FBFactory.auth().$unauth();
            UserFactory.cleanUser();
            UserFactory.cleanOLUsers();
            // remove presence
            var onlineUsers = UserFactory.getOLUsers();
            if(onlineUsers && onlineUsers.$getRecord) {
                var presenceId = UserFactory.getPresenceId();
                var user = onlineUsers.$getRecord();
                onlineUsers.$remove(user);
            }
            UserFactory.cleanPresenceId();
            $state.go('main');
        }

    }
]);
