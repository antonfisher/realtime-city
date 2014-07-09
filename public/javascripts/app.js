'use strict';

var MAP_CENTER_LAT = MAP_CENTER_LAT || 0;
var MAP_CENTER_LONG = MAP_CENTER_LONG || 0;
var TWITTER = 'twitter';
var INSTAGRAM = 'instagram';
var POINTS_LIMIT = 20;

/**
 * @type {Function} map contoller class
 */
var MapController = function (map) {
    var self = this;

    self.map = map;
    self.points = [];

    self.onNewData = function (data) {
        var i;
        for (i in data) {
            if (data.hasOwnProperty(i)) {
                console.log("-- object", data[i]);
                self.addPoint(data[i]);
            }
        }
    };

    self.addPoint = function (data) {
        var offset = (new Date()).getTimezoneOffset() * 60;

        var createLink = function (data) {
            if (data.type === TWITTER) {
                // http://twitter.com/username/status/295272204353019901
                return [
                    'http://twitter.com',
                    data.screen_name,
                    'status',
                    data.source.id_str
                ].join('/');
            }

            console.log("-- bad object type");
            return null;
        };

        var image = '';
        if (data.image_url) {
            image = [
                '<br>',
                '<span class="yicon-text">',
                    '<img src="', data.image_url, '" width="150"/>',
                '</span>'
            ].join('');
        }

        var placemark = new ymaps.Placemark(
            [data.coordinates[0], data.coordinates[1]],
            {
                iconContent: [
                    '<div class="yicon-div">',
                        '<img class="yicon-img" src="',
                            data.profile_image_url,
                            '" />',
                        '<span class="yicon-link">',
                            '<a href="',
                                createLink(data),
                                '" target="_blank">@',
                                data.screen_name,
                            '</a>',
                        '</span>',
                        '<span class="yicon-text">: ' + data.text + '</span>',
                        '<br>',
                        '<span class="yicon-text">',
                            moment.unix(data['created_at'] - offset)
                                  .format("HH:mm:ss, DD MMM"),
                        '</span>',
                        image,
                    '</div>'
                ].join('')
            }, {
                preset: (data.type === TWITTER ?
                            'twirl#lightblueStretchyIcon' :
                            'twirl#greyStretchyIcon'),
                balloonCloseButton: true,
                hideIconOnBalloonOpen: true
            }
        );

        placemark.events.add('balloonclose', function () {
            console.log("-- close", arguments, placemark);
            //map.geoObjects.remove(b);
        }, self);

        self.map.geoObjects.add(placemark);

        console.log("-- self.points.length", self.points.length);
        if (self.points.length >= POINTS_LIMIT) {
            console.log("-- shift");
            self.map.geoObjects.remove(self.points.shift());
        }
        self.points.push(placemark);
        console.log("-- add", self.points);
    };

}


/**
 * @type {Function} SockJS connerction controller class
 *
 * @param {Object} onMessageListener object {scope:..., fn:....}
 */
var SockController = function (onMessageListener) {
    var self = this;

    self.onMessageListener = onMessageListener;
    self.sock = null;

    self.createSock = function () {
        //console.log('-- sock', self.sock);
        if (!self.sock || !self.sock.protocol) {
            //console.log('-- create');
            self.sock = new SockJS(
                '/sock', undefined, {debug: true, devel: true}
            );

            self.sock.onopen = function () {
                console.log('open');
            };

            self.sock.onmessage = function (e) {
                console.log('message', e.data, e);
                self.onMessageListener.fn.call(
                    onMessageListener.scope, e.data
                );
            };

            self.sock.onclose = function () {
                console.log('close');
                self.sock = null;
            };
        }
    };

    self.createSock();
    setInterval(function () {
        self.createSock();
    }, 3000);

};

/**
 * void main()
 */
ymaps.ready(function () {

    // create Yandex Map object
    var map = new ymaps.Map('ymaps-map', {
        center: [MAP_CENTER_LAT, MAP_CENTER_LONG],
        zoom: 13,
        type: 'yandex#map'
    });

    map.controls.add(
        'smallZoomControl', {left: '5px', top: '5px'}, {noTips: true}
    );

    // init momentjs
    moment.lang('ru');

    // create map controller object
    var mapController = new MapController(map);

    // create SockJS controller object
    var sockController = new SockController({
        'scope': mapController,
        'fn': mapController.onNewData
    });

    // init Twitter Bootstrap
    $('.tooltips-init').tooltip('hide');

});
