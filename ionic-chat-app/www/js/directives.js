angular.module('chatapp.directives', [])

.directive('map', function () {
    return {
        restrict: 'E',
        scope: {
            onCreate: '&'
        },
        link: function ($scope, $element, $attr) {
            function initialize() {
                var lat = $attr.lat || 43.07493;
                var lon = $attr.lon || -89.381388;

                var myLatlng = new google.maps.LatLng(lat, lon);
                var mapOptions = {
                    center: myLatlng,
                    zoom: 16,
                    mapTypeId: google.maps.MapTypeId.ROADMAP
                };

                if($attr.inline) {
                    mapOptions.disableDefaultUI = true;
                    mapOptions.disableDoubleClickZoom = true;
                    mapOptions.draggable = true;
                    mapOptions.mapMaker = true;
                    mapOptions.mapTypeControl = false;
                    mapOptions.panControl = false;
                    mapOptions.rotateControl = false;
                }

                var map = new google.maps.Map($element[0], mapOptions);

                // custom function to manage markers
                map.__setMarker = function (map, lat, lon) {
                    var marker = new google.maps.Marker({
                        map: map,
                        position: new google.maps.LatLng(lat, lon)
                    });
                }

                $scope.onCreate({
                    map: map
                });

                map.__setMarker(map, lat, lon);
            }

            if(document.readyState === 'complete') {
                initialize();
            } else {
                google.maps.event.addDomListener(window, 'load', initialize);
            }
        }
    }
});
