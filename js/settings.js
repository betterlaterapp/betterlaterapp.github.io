var SettingsModule = (function () {
    // Private variables
    var json;

    function setupLiveStatsDisplayHandlers() {
        $(".statistics-display-options .form-check-input").on('change', function () {
            //detect specific id
            var itemHandle = this.id;
            var displayCorrespondingStat = false;

            if ($("#" + itemHandle).is(":checked")) {
                displayCorrespondingStat = true;
            }

            //change value in JSON
            var jsonHandle = itemHandle.replace("Displayed", "");
            json.option.liveStatsToDisplay[jsonHandle] = displayCorrespondingStat;

            //update option table value
            var jsonObject = StorageModule.retrieveStorageObject();
            jsonObject.option.liveStatsToDisplay[jsonHandle] = displayCorrespondingStat;

            StorageModule.setStorageObject(jsonObject);
            UIModule.showActiveStatistics(json);
            UIModule.toggleActiveStatGroups(json);
            UIModule.hideInactiveStatistics(json);
        });
    }

    function setupHabitLogDisplayHandlers() {
        $(".habit-log-display-options .form-check-input").on('change', function () {
            //detect specific id
            var itemHandle = this.id;
            var jsonHandle = itemHandle.replace("RecordDisplayed", "");
            var displayCorrespondingStat = false;

            if ($("#" + itemHandle).is(":checked")) {
                displayCorrespondingStat = true;
                //remove display none from relevant habit log items
                $("#habit-log .item." + jsonHandle + "-record").removeClass("d-none");

            } else {
                //add display none to relevant habit log items
                $("#habit-log .item." + jsonHandle + "-record").addClass("d-none");
            }

            //change value in JSON
            json.option.logItemsToDisplay[jsonHandle] = displayCorrespondingStat;

            //update option table value
            var jsonObject = StorageModule.retrieveStorageObject();
            jsonObject.option.logItemsToDisplay[jsonHandle] = displayCorrespondingStat;

            StorageModule.setStorageObject(jsonObject);
        });
    }

    function setupReportDisplayHandlers() {
        $(".report-display-options .form-check-input").on('change', function () {
            //detect specific id
            var itemHandle = this.id;
            var displayCorrespondingStat = false;

            if ($("#" + itemHandle).is(":checked")) {
                displayCorrespondingStat = true;
            }

            //change value in JSON
            var jsonHandle = itemHandle.replace("Displayed", "");
            json.option.reportItemsToDisplay[jsonHandle] = displayCorrespondingStat;

            //update option table value
            var jsonObject = StorageModule.retrieveStorageObject();
            jsonObject.option.reportItemsToDisplay[jsonHandle] = displayCorrespondingStat;

            //case to remove an existing graph
            if (!json.option.reportItemsToDisplay.useVsResistsGraph) {
                $(".weekly-report .chart-title").hide();
                $(".weekly-report .bar-chart").hide();
                $(".weekly-report .week-range").hide();
            } else {
                $(".weekly-report .chart-title").show();
                $(".weekly-report .bar-chart").show();
                $(".weekly-report .week-range").show();
            }

            StorageModule.setStorageObject(jsonObject);
        });
    }

    function setupReportNavigationHandlers() {
        $(".previous-report").on("click", function () {
            $('.next-report').prop("disabled", false)
            if (json.report.activeEndStamp - (60 * 60 * 24 * 7) >= json.report.minEndStamp) {
                var reportEndStamp = json.report.activeEndStamp - (60 * 60 * 24 * 7);
                StatisticsModule.createReportForEndStamp(reportEndStamp, json);
            } else {
                $('.previous-report').prop("disabled", true)
                NotificationsModule.createNotification("Looks like there isn't enough data to make that report!");

                $('html').animate({ scrollTop: 0 })
            }
        });

        $(".next-report").on("click", function () {
            $('.previous-report').prop("disabled", false)
            if (json.report.activeEndStamp + (60 * 60 * 24 * 7) < json.report.maxEndStamp) {
                var reportEndStamp = json.report.activeEndStamp + (60 * 60 * 24 * 7);
                StatisticsModule.createReportForEndStamp(reportEndStamp, json);
            } else {
                $('.next-report').prop("disabled", true)
                NotificationsModule.createNotification("The next report is for a week that has not happened yet!");

                $('html').animate({ scrollTop: 0 })
            }
        });
    }

    function undoLastAction() {
        var undoneActionClickType = StorageModule.undoLastAction();

        //UNBREAK GOAL
        //if action could have broken a goal
        if (undoneActionClickType == "used" || undoneActionClickType == "bought") {
            var jsonObject = StorageModule.retrieveStorageObject();
            //cycle back through records until you find most recent goal
            for (var i = jsonObject["action"].length - 1; i >= 0; i--) {
                var currRecord = jsonObject["action"][i];
                var goalTypeIsRelevant = (currRecord.goalType == "both" || currRecord.goalType == undoneActionClickType);
                if (goalTypeIsRelevant && currRecord.clickType == "goal") {
                    //if this first finds a goal which would have been broken by undoneActionClickType, 
                    //change this.status to active, exit loop 
                    StorageModule.changeGoalStatus(1, currRecord.goalType, -1);
                    break;

                } else if (currRecord.clickType == undoneActionClickType) {
                    //if this first finds an action.clickType == undoneActionClickType, 
                    //then a goal could not have been broken, so exit loop without changing goal status
                    break;
                }
            }
        }
        window.location.reload();
    }

    function clearActions() {
        StorageModule.clearStorage();
        window.location.reload();
    }

    function setupSettingsMenuHandlers() {
        $("#undoActionButton").click(function (event) {
            event.preventDefault();
            if (confirm("Your last click will be undone - irreversibly. Are you sure?")) {
                undoLastAction();
            }
        });

        $("#clearTablesButton").click(function (event) {
            event.preventDefault();
            if (confirm("ALL your data will be cleared - irreversibly. Are you sure??")) {
                clearActions();
            }
        });
    }

    function init(appJson) {
        json = appJson;

        setupLiveStatsDisplayHandlers();
        setupHabitLogDisplayHandlers();
        setupReportDisplayHandlers();
        setupReportNavigationHandlers();
        setupSettingsMenuHandlers();
    }

    // Public API
    return {
        setupLiveStatsDisplayHandlers: setupLiveStatsDisplayHandlers,
        setupHabitLogDisplayHandlers: setupHabitLogDisplayHandlers,
        setupReportDisplayHandlers: setupReportDisplayHandlers,
        setupReportNavigationHandlers: setupReportNavigationHandlers,
        undoLastAction: undoLastAction,
        clearActions: clearActions,
        init: init
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsModule;
} else {
    window.SettingsModule = SettingsModule;
}


