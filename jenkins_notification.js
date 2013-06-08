var RED = [0,1,1],
    GREEN = [1,0,1],
    BLUE = [1,1,0];

var BLINK_TIME = 300;

var JENKINS_REFRESH_TIME = 10000,

    JENKINS_STATUS_BLUE = "blue",
    JENKINS_STATUS_RED  = "red",
    JENKINS_STATUS_ABORTED    = "aborted",
    JENKINS_STATUS_PROCESSING = "_anime",

    JENKINS_FAILED = 1,
    JENKINS_NORMAL = 2,
    JENKINS_PROCESSING = 3;

var globalStatus = 0,
    fireRedBlinkId = 0;

var ignoreJobs = [
    'shopzone_develop_with_javascript'
];

var five = require("johnny-five"),
    jenkins = require('jenkins')('<jenkis host>'),
    board = new five.Board();

var getJobList = jenkins.job.list;

var pinAccord = [
    // a is arduino No pin, l is matrix panel No pin
    {l:1, a:22}, {l:2, a:24}, {l:3, a:26}, {l:4, a:28},
    {l:5, a:30}, {l:6, a:32}, {l:7, a:34}, {l:8, a:36},
    {l:9, a:38}, {l:10, a:40}, {l:11, a:42}, {l:12, a:44},
    {l:13, a:46}, {l:14, a:48}, {l:15, a:50}, {l:16, a:52},

    {l:32, a:23}, {l:31, a:25}, {l:30, a:27}, {l:29, a:29},
    {l:28, a:31}, {l:27, a:33}, {l:26, a:35}, {l:25, a:37},
    {l:24, a:39}, {l:23, a:41}, {l:22, a:43}, {l:21, a:45},
    {l:20, a:47}, {l:19, a:49}, {l:18, a:51}, {l:17, a:53}
];

var matrixPanel = {
    anode: [17, 18, 19, 20, 29, 30, 31, 32],
    red: [9, 10, 11, 12, 13, 14, 15, 16],
    green: [28, 27, 26, 25, 24, 23, 22, 21],
    blue: [1, 2, 3, 4, 5, 6, 7, 8]
};

var matrix = function(pin) {
    var pinArduino = 0;
    pinAccord.forEach(function (value) {
        if (pin === value.l) {
            pinArduino = value.a;
        }
    });
    return pinArduino;
};

var initMatrixPin = function(arrPin, value) {
    arrPin.forEach(function (pin) {
        board.digitalWrite(matrix(pin), value);
    });
};

var initMatrixByColor = function(color, anodeLevel) {
    anodeLevel = (anodeLevel !== undefined) ? anodeLevel : 1;
    initMatrixPin(matrixPanel.anode, anodeLevel);
    initMatrixPin(matrixPanel.red, color[0]);
    initMatrixPin(matrixPanel.green, color[1]);
    initMatrixPin(matrixPanel.blue, color[2]);
};

var fireRed = function() {
    initMatrixByColor(RED);
};

var fireRedBlink = function() {
    var val = 0;
    fireRedBlinkId = setInterval(function () {
        initMatrixByColor(RED, val = val ? 0 : 1)
    }, BLINK_TIME);
};

var fireGreen = function() {
    initMatrixByColor(GREEN)
};

var fireBlue = function() {
    initMatrixByColor(BLUE);
};

var updateStatus = function() {
    getJobList(function (err, jobList) {
        var temporaryStatus = 0;

        if (err) { fireBlue(); }

        if (Object.prototype.toString.call(jobList) === '[object Array]') {

            jobList = jobList.filter(function (job) {

                return !inArray(job.name, ignoreJobs);
            });

            // processing
            jobList.every(function (job) {
                var status = job.color;
                if (/.+_anime$/.test(status)) {
                    temporaryStatus = JENKINS_PROCESSING;
                }
                return true;
            });

            if (temporaryStatus !== JENKINS_PROCESSING) {
                // failed
                jobList.every(function (job) {
                    var status = job.color;
                    if (status == JENKINS_STATUS_RED
                        || status == JENKINS_STATUS_ABORTED) {
                        temporaryStatus = JENKINS_FAILED;
                    }
                    return true;
                });

                if (temporaryStatus !== JENKINS_FAILED) {
                    // successfully
                    jobList.every(function (job) {
                        var status = job.color;
                        if (status == JENKINS_STATUS_BLUE
                            || status == JENKINS_STATUS_ABORTED) {
                            temporaryStatus = JENKINS_NORMAL;
                        }
                        return true;
                    });
                }
            }

            globalStatus = temporaryStatus;

            fire();
        } else {
            fireBlue();
        }

    });
};

var fire = function() {
    clearInterval(fireRedBlinkId);

    switch (globalStatus) {
        case JENKINS_FAILED:
            fireRed();
            break;
        case JENKINS_PROCESSING:
            fireRedBlink();
            break;
        case JENKINS_NORMAL:
            fireGreen();
            break;
        default:
            fireGreen();
            break;
    }
};

var init = function() {
    board.on('ready', function() {
        updateStatus();
        board.loop(JENKINS_REFRESH_TIME, updateStatus);
    });
};

var inArray = function(needle, haystack, strict) {
    var found = false, key, strict = !!strict;

    for (key in haystack) {
        if ((strict && haystack[key] === needle) || (!strict && haystack[key] == needle)) {
            found = true;
            break;
        }
    }

    return found;
};

init();