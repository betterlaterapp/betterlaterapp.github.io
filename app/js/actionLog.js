var ActionLogModule = (function () {
    // Private variables
    var json;

    /**
     * Place action into the habit log
     * @param {number} clickStamp - Timestamp of the action
     * @param {string} clickType - Type of action (used, craved, bought, mood)
     * @param {number} amountSpent - Amount spent (for bought actions)
     * @param {string} comment - Comment for mood actions
     * @param {number} smiley - Smiley index for mood actions
     * @param {boolean} placeBelow - Whether to place below existing items
     */
    function placeActionIntoLog(clickStamp, clickType, amountSpent, comment, smiley, placeBelow) {
        //data seems to be in order
        var endDateObj = new Date(parseInt(clickStamp + "000"));
        var dayOfTheWeek = endDateObj.toString().split(' ')[0];
        var shortHandDate = (endDateObj.getMonth() + 1) + "/" +
            endDateObj.getDate() + "/" +
            (endDateObj.getFullYear());
        var shortHandTimeHours = (endDateObj.getHours()),
            shortHandTimeMinutes = (endDateObj.getMinutes()),
            shortHandTimeAMPM = "am";
        if (shortHandTimeHours == 12) {
            shortHandTimeAMPM = "pm";
        } else if (shortHandTimeHours > 12) {
            shortHandTimeHours = shortHandTimeHours % 12;
            shortHandTimeAMPM = "pm";
        }
        if (shortHandTimeMinutes < 10) {
            shortHandTimeMinutes = "0" + shortHandTimeMinutes;
        }

        var shortHandTime = shortHandTimeHours + "<b>:</b>" + shortHandTimeMinutes + shortHandTimeAMPM;

        var titleHTML = "";
        var target = "#habit-log";

        if (clickType == "bought") {
            titleHTML = '<i class="fas fa-dollar-sign"></i>&nbsp;&nbsp;' + "You spent <b>$" + parseInt(amountSpent) + "</b> on it.";
            //target = "#cost-log";
        } else if (clickType == "used") {
            titleHTML = '<i class="fas fa-cookie-bite"></i>&nbsp;' + "You did it at <b>" + shortHandTime + "</b>.";
            //target = "#use-log";
        } else if (clickType == "craved") {
            titleHTML = '<i class="fas fa-ban"></i>&nbsp;' + "You resisted it at <b>" + shortHandTime + "</b>.";
            //target = "#use-log";
        } else if (clickType == "mood") {
            var scrubbedComment = comment.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            titleHTML = '<img class="img-fluid habit-log-icon smiley mood-' + smiley + '" src="../assets/images/mood-smiley-' + smiley + '.png" />&nbsp;' + " <b>" + scrubbedComment + "</b>";
        }

        var template = '<div class="item ' + clickType + '-record">' +
            '<hr/><p class="title">' + titleHTML + '</p>' +
            '<p class="date" style="text-align:center;color:D8D8D8">' +
            '<span class="dayOfTheWeek">' + dayOfTheWeek + '</span>,&nbsp;' +
            '<span class="shortHandDate">' + shortHandDate + '</span>' +
            '</p>' +
            '</div><!--end habit-log item div-->';


        var jsonObject = StorageModule.retrieveStorageObject();
        if (jsonObject.option.logItemsToDisplay[clickType] === true) {
            if (placeBelow) {
                $(target).append(template);
            } else {
                $(target).prepend(template);
            }
            //and make sure the heading exists too
            $(target + "-heading").show();
        }
    }

    /**
    * Place a goal into the log
    * @param {number} startStamp - Start timestamp
    * @param {number} endStamp - End timestamp
    * @param {string} goalType - Goal type
    * @param {boolean} placeBelow - Whether to place the log entry below others
    * @param {Object} json - The app state object
    */
    function placeGoalIntoLog(startStamp, endStamp, goalType, placeBelow, json) {
        var endDateObj = new Date(parseInt(endStamp + "000"));
        var timeElapsed = StatsCalculationsModule.convertSecondsToDateFormat(endStamp - startStamp, false);
        var dayOfTheWeek = endDateObj.toString().split(' ')[0];

        var shortHandDate = (endDateObj.getMonth() + 1) + "/" +
            endDateObj.getDate() + "/" +
            (endDateObj.getFullYear());

        var template = '<div class="item goal-record">' +
            '<hr/><p class="title"><i class="far fa-calendar-plus"></i>&nbsp;' +
            'You waited <b><span class="timeElapsed">' + timeElapsed + '</span></b>.' +
            '</p>' +
            '<p class="date" style="text-align:center;color:D8D8D8">' +
            '<span class="dayOfTheWeek">' + dayOfTheWeek + '</span>,&nbsp;' +
            '<span class="shortHandDate">' + shortHandDate + '</span>' +
            '</p>' +
            '</div><!--end habit-log item div-->';

        // Assure user has selected to display this log item type
        // Controller is on settings pane
        if (json.option.logItemsToDisplay.goal === true) {
            if (placeBelow) {
                $('#habit-log').append(template);
            } else {
                $('#habit-log').prepend(template);
            }
            // And make sure the heading exists too
            $("#habit-log-heading").show();
        }
    }

    function populateHabitLogOnLoad() {
        var jsonObject = StorageModule.retrieveStorageObject();
        var allActions = jsonObject.action.filter(function (e) {
            return e.clickType == "used" ||
                e.clickType == "craved" ||
                e.clickType == "bought" ||
                e.clickType == "mood" ||
                (e.clickType == "goal" && (e.status == 2 || e.status == 3));
        });
        allActions = allActions.sort((a, b) => {
            return parseInt(a.timestamp) > parseInt(b.timestamp) ? 1 : -1;
        });

        /* only display a certain number of actions per page */
        var actionsToAddMax = allActions.length - 1,
            actionsToAddMin = allActions.length - 10;

        // Set up pagination data attributes
        $("#habit-log-show-more").attr("data-actions-to-add-min", actionsToAddMin);
        $("#habit-log-show-more").attr("data-actions-to-add-max", actionsToAddMax);

        if (actionsToAddMax >= 0) {
            for (var i = actionsToAddMax; i >= actionsToAddMin && i >= 0; i--) {

                var currClickStamp = allActions[i].timestamp,
                    currClickType = allActions[i].clickType,
                    currClickCost = null,
                    currGoalEndStamp = -1,
                    currGoalType = "",
                    comment = "",
                    smiley = -1;

                if (currClickType == "used" || currClickType == "craved") {
                    placeActionIntoLog(currClickStamp, currClickType, currClickCost, null, null, true);

                } else if (currClickType == "bought") {
                    currClickCost = allActions[i].spent;
                    //append curr action
                    placeActionIntoLog(currClickStamp, currClickType, currClickCost, null, null, true);

                } else if (currClickType == "goal") {
                    currGoalEndStamp = allActions[i].goalStopped,
                        currGoalType = allActions[i].goalType;
                    //append 10 new goals
                    placeGoalIntoLog(currClickStamp, currGoalEndStamp, currGoalType, true, jsonObject, StatsCalculationsModule.convertSecondsToDateFormat);
                } else if (currClickType == "mood") {
                    //append curr action
                    comment = allActions[i].comment;
                    smiley = allActions[i].smiley;

                    placeActionIntoLog(currClickStamp, currClickType, null, comment, smiley, true);

                }

                if (i == actionsToAddMin || i == 0) {
                    actionsToAddMin -= 10;
                    actionsToAddMax -= 10;

                    //if button is not displayed
                    if ($("#habit-log-show-more").hasClass("d-none") && allActions.length > 10) {
                        $("#habit-log-show-more").removeClass("d-none");
                        $("#habit-log-show-more").click(function () {
                            addMoreIntoHabitLog();
                        });
                    }
                    break;
                }
            }
        }
    }

    function addMoreIntoHabitLog() {
        var jsonObject = StorageModule.retrieveStorageObject();
        var allActions = jsonObject.action;
        var actionsToAddMin = parseInt($("#habit-log-show-more").attr("data-actions-to-add-min"));
        var actionsToAddMax = parseInt($("#habit-log-show-more").attr("data-actions-to-add-max"));

        if (actionsToAddMax >= 0) {
            for (var i = actionsToAddMax; i >= actionsToAddMin && i >= 0; i--) {

                var currClickStamp = allActions[i].timestamp,
                    currClickType = allActions[i].clickType,
                    currClickCost = null,
                    currGoalEndStamp = -1,
                    currGoalType = "",
                    comment = "",
                    smiley = -1;

                if (currClickType == "used" || currClickType == "craved") {
                    placeActionIntoLog(currClickStamp, currClickType, currClickCost, null, null, true);

                } else if (currClickType == "bought") {
                    currClickCost = allActions[i].spent;
                    //append curr action
                    placeActionIntoLog(currClickStamp, currClickType, currClickCost, null, null, true);

                } else if (currClickType == "goal") {
                    currGoalEndStamp = allActions[i].goalStopped,
                        currGoalType = allActions[i].goalType;
                    //append 10 new goals
                    placeGoalIntoLog(currClickStamp, currGoalEndStamp, currGoalType, true, jsonObject, StatsCalculationsModule.convertSecondsToDateFormat);
                } else if (currClickType == "mood") {
                    //append curr action
                    comment = allActions[i].comment;
                    smiley = allActions[i].smiley;

                    placeActionIntoLog(currClickStamp, currClickType, null, comment, smiley, true);

                }

                if (i == actionsToAddMin || i == 0) {
                    actionsToAddMin -= 10;
                    actionsToAddMax -= 10;

                    //if button is not displayed
                    if ($("#habit-log-show-more").hasClass("d-none") && allActions.length > 10) {
                        $("#habit-log-show-more").removeClass("d-none");
                        $("#habit-log-show-more").click(function () {
                            addMoreIntoHabitLog();
                        });
                    }
                    break;
                }
            }
        }
    }

    function setupMoodTracker() {
        $("#mood-tracker-area .smiley").on("mouseup", function () {
            $("#mood-tracker-area .smiley").removeClass('selected');
            $(this).addClass('selected')
        });

        $("#mood-tracker-area .response .submit").on("mouseup", function () {
            var now = Math.round(new Date() / 1000);
            var comment = $("#mood-tracker-area .response .text").val();

            $.each($("#mood-tracker-area .smiley"), function (i, value) {
                if ($(this).hasClass('selected')) {
                    StorageModule.updateActionTable(now, "mood", null, null, null, comment, i);
                    placeActionIntoLog(now, "mood", null, comment, i, false);
                }
            });

            $('#mood-tracker-area .response textarea').val("");
            $("#statistics-content .initial-instructions").hide();
        });
    }

    /**
     * Initialize the module
     * @param {Object} appJson - The application JSON object
     */
    function init(appJson) {
        json = appJson;
        setupMoodTracker();
    }

    // Public API
    return {
        placeActionIntoLog: placeActionIntoLog,
        placeGoalIntoLog: placeGoalIntoLog,
        addMoreIntoHabitLog: addMoreIntoHabitLog,
        populateHabitLogOnLoad: populateHabitLogOnLoad,
        setupMoodTracker: setupMoodTracker,
        init: init
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActionLogModule;
} else {
    window.ActionLogModule = ActionLogModule;
}
