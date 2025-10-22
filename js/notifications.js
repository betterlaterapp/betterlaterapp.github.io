/**
 * Notifications Module
 * Contains all notification-related functionality for Better Later app
 */

var NotificationsModule = (function() {
    /**
     * Clear a notification by sliding it off screen
     * @param {Event} event - The event that triggered the clear
     * @param {string} swipeDirection - Direction to slide notification ("left" or "right")
     */
    function clearNotification(event, swipeDirection) {
        //when user clicks X on a notification, slide it off the screen.
        var currNotification = $(event).parent().parent();
        var animateLeft = 0;
        if (swipeDirection == "right") {
            animateLeft = (6400);
        } else {
            animateLeft = -1 * (6400);
        }
        currNotification.animate(
            { left: animateLeft }, 600,
            function () {
                currNotification.css("display", "none");
            });
    }

    /**
     * Setup swipe detection for notifications
     */
    function setupSwipeNotification() {
        document.addEventListener('touchstart', handleTouchStart, false);
        document.addEventListener('touchmove', handleTouchMove, false);

        var xDown = null;
        var yDown = null;

        function getTouches(evt) {
            return evt.touches ||             // browser API
                evt.originalEvent.touches; // jQuery
        }

        function handleTouchStart(evt) {
            const firstTouch = getTouches(evt)[0];
            xDown = firstTouch.clientX;
            yDown = firstTouch.clientY;
        }

        function handleTouchMove(evt) {
            if (!xDown || !yDown) {
                return;
            }
            var xUp = evt.touches[0].clientX;
            var yUp = evt.touches[0].clientY;
            var xDiff = xDown - xUp;
            var yDiff = yDown - yUp;

            if (Math.abs(xDiff) > Math.abs(yDiff)) {/*most significant*/
                if (xDiff > 0) {
                    /* left swipe */
                    var selectedElem = document.elementFromPoint(xUp, yUp);
                    if ($(selectedElem).parents('.notification').length) {
                        //console.log("got class");
                        clearNotification.call(event, selectedElem, "left");
                    }
                } else {
                    /* right swipe */
                    var selectedElem = document.elementFromPoint(xUp, yUp);
                    if ($(selectedElem).parents('.notification').length) {
                        //console.log("got class");
                        clearNotification.call(event, selectedElem, "right");
                    }
                }
            }
            /* reset values */
            xDown = null;
            yDown = null;
        }
    }

    /**
     * Create and display a notification
     * @param {string} message - The notification message to display
     * @param {string} responseTools - Optional HTML for response tools in the notification
     */
    function createNotification(message, responseTools) {
        var template = '<div class="notification">' +
            '<div class="notification-message">' +
            '<p class="notification-text">' + message + '</p>' +
            '<a class="notification-close" href="#">X</a>' +
            '</div>';

        if (responseTools) {
            template += '<div class="notification-response-tools">' + responseTools + '</div>';
        } else {
            template += '<div class="spacer" style="height:15px;"></div>';
        }

        template += '</div><!--end notification div-->';

        $('#notifications-container').append(template);
    }

    /**
     * Create a notification specifically for when a goal has ended
     * @param {Object} goalHandle - The goal object
     */
    function createGoalEndNotification(goalHandle) {
        var goalType = goalHandle.goalType,
            goalTypeGerund = "";
        if (goalType == "use") {
            goalTypeGerund = "doing";
            goalType = "did";
        } else if (goalType == "bought") {
            goalTypeGerund = "buying";
        } else if (goalType == "both") {
            goalTypeGerund = "buying and doing";
        }

        var message = 'Your most recent goal ended since your last visit. ' +
            'Did you make it without ' + goalTypeGerund + ' it?';
        var responseTools =
            '<button class="notification-response-tool goal-ended-on-time" href="#" >' +
            'Yes</button>' +
            '<button class="notification-response-tool goal-ended-early" href="#">' +
            'No</button>';

        createNotification(message, responseTools);
    }

    /**
     * Initialize notification event handlers
     * @param {Object} json - The app state object
     */
    function setupNotificationEventHandlers(json) {
        // Close notification on click
        $('#notifications-container').on('click', '.notification-close, .clear-notification', function(event) {
            clearNotification.call(event, this);
        });

        // Handle notification response tools
        $('#notifications-container').on('click', '.notification-response-tool', function(event) {
            //need these variables: startStamp, endStamp, goalType
            //convert localStorage to json
            var currJsonString = localStorage.esCrave;
            var jsonObject = JSON.parse(currJsonString);

            //return active goal
            var activeGoals = jsonObject.action.filter(function(e) {
                return e.clickType == "goal" && e.status == 1;
            });
            var mostRecentGoal = activeGoals[activeGoals.length - 1];

            //grab relevant data from object
            var startStamp = mostRecentGoal.timestamp,
                endStamp = mostRecentGoal.goalStamp,
                goalType = mostRecentGoal.goalType;

            //your last goal has finished, was it successful?
            if ($(this).hasClass("goal-ended-on-time")) {
                //this is to just shoot the goal straight through the pipeline
                clearNotification.call(event, this);
                ActionLogModule.placeGoalIntoLog(startStamp, endStamp, goalType, false, json, StatisticsModule.convertSecondsToDateFormat);
                var affirmation = json.affirmations[Math.floor(Math.random() * json.affirmations.length)]
                var message = "congrats on completing your goal! " + affirmation;
                createNotification(message);
                GoalsModule.changeGoalStatus(3, goalType);

                //update json about if there's an active goal
                json.statistics.goal.activeGoalBoth = 0;
                json.statistics.goal.activeGoalUse = 0;
                json.statistics.goal.activeGoalBought = 0;
            } 
            else if ($(this).hasClass("goal-ended-early")) {
                clearNotification.call(event, this);
                var now = Math.round(new Date() / 1000);
                var min = new Date(parseInt(startStamp)).getTime();
                var max = new Date(parseInt(endStamp)).getTime();

                var minFormatted = Math.floor((now - min) / 86400),
                    maxFormatted = Math.floor((now - max) / 86400);

                if (minFormatted == 0) {
                    minFormatted = "-" + (minFormatted);
                } else {
                    minFormatted = (minFormatted * -1);
                }

                if (maxFormatted == 0) {
                    maxFormatted = "-" + (maxFormatted);
                } else {
                    maxFormatted = (maxFormatted * -1);
                }
            
                var message = "Bummmer. " +
                    "When do you think you broke your goal?";

                var responseTools = '<!-- custom Time picker-->' +
                    '<div id="goalEndTimePicker" class="time-picker-container">' +
                    '<select class="time-picker-hour" data-min="0" data-max="23" data-step="1">' +
                    '<option value="0">12</option>' +
                    '<option value="1">1</option>' +
                    '<option value="2">2</option>' +
                    '<option value="3">3</option>' +
                    '<option value="4">4</option>' +
                    '<option value="5">5</option>' +
                    '<option value="6">6</option>' +
                    '<option value="7">7</option>' +
                    '<option value="8">8</option>' +
                    '<option value="9">9</option>' +
                    '<option value="10">10</option>' +
                    '<option value="11">11</option>' +
                    '</select>' +
                    '<select class="time-picker-am-pm">' +
                    '<option value="AM">AM</option>' +
                    '<option value="PM">PM</option>' +
                    '</select>' +
                    '</div>' +
                    '<div id="datepicker-notification" style="display:inline-block;"></div>' +
                    '<script type="text/javascript">' +
                    '$( "#datepicker-notification" ).datepicker({ minDate:' + minFormatted + ', maxDate:' + maxFormatted + '});' +
                    'var currHours = new Date().getHours();' +
                    '$("#goalEndTimePicker .time-picker-hour").val(currHours%12);' +
                    'if(currHours>=12){ $("#goalEndTimePicker .time-picker-am-pm").val("PM"); }' +
                    '</script><br/>' +
                    '<button class="notification-response-tool submit-new-goal-time" href="#" >' +
                    'Submit</button>';

                createNotification(message, responseTools);
            }

            //if goal ended ahead of schedule, when did it end?
            //submitted new date/time
            if ($(this).hasClass("submit-new-goal-time")) {
                var tempEndStamp = StatisticsModule.convertDateTimeToTimestamp('#datepicker-notification', '#goalEndTimePicker');
                //console.log(tempEndStamp);
                if (tempEndStamp - startStamp > 0 || endStamp - tempEndStamp < 0) {
                    GoalsModule.changeGoalStatus(2, goalType, tempEndStamp);
                    ActionLogModule.placeGoalIntoLog(startStamp, tempEndStamp, goalType, false, json, StatisticsModule.convertSecondsToDateFormat);
                    clearNotification.call(event, this);

                    //update json about if there's an active goal
                    json.statistics.goal.activeGoalBoth = 0;
                    json.statistics.goal.activeGoalUse = 0;
                    json.statistics.goal.activeGoalBought = 0;
                } else {
                    alert('Please choose a time within your goal range!');
                }
            }
        });

        // Handle goal extension
        $('#notifications-container').on('click', '.extend-goal', function(event) {
            clearNotification.call(event, this);
            GoalsModule.extendActiveGoal(json);
        });

        // Handle goal ending
        $('#notifications-container').on('click', '.end-goal', function(event) {
            clearNotification.call(event, this);
            GoalsModule.endActiveGoal(json);
        });
    }

    // Public API
    return {
        clearNotification: clearNotification,
        setupSwipeNotification: setupSwipeNotification,
        createNotification: createNotification,
        createGoalEndNotification: createGoalEndNotification,
        setupNotificationEventHandlers: setupNotificationEventHandlers,
        init: function(json) {
            setupSwipeNotification();
            setupNotificationEventHandlers(json);
        }
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationsModule;
} else {
    window.NotificationsModule = NotificationsModule;
}
