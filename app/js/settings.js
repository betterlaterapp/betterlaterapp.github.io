var SettingsModule = (function () {
    // Private variables
    var json;

    function setupLiveStatsDisplayHandlers() {
        // Handle individual stat checkboxes (exclude category checkboxes)
        $(".statistics-display-options .form-check-input:not(.category-checkbox)").on('change', function () {
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

    function setupCategoryToggleHandlers() {
        // Handle category toggle checkboxes
        $(".category-checkbox").on('change', function () {
            var $category = $(this).closest('.stats-category');
            var categoryName = $category.data('category');
            var isChecked = $(this).is(':checked');
            
            if (isChecked) {
                $category.removeClass('category-disabled');
                // Enable all child checkboxes
                $category.find('.category-options .form-check-input').prop('disabled', false);
            } else {
                $category.addClass('category-disabled');
                // Disable all child checkboxes
                $category.find('.category-options .form-check-input').prop('disabled', true);
            }

            // Update baseline value in storage
            var jsonObject = StorageModule.retrieveStorageObject();
            if (categoryName && jsonObject.baseline.hasOwnProperty(categoryName)) {
                jsonObject.baseline[categoryName] = isChecked;
                json.baseline[categoryName] = isChecked;
                StorageModule.setStorageObject(jsonObject);
                
                // Sync with baseline questionnaire checkbox
                $("input." + categoryName).prop('checked', isChecked);
                
                // Show/hide related goal question-set
                var togglesMap = {
                    'valuesTimesDone': '.usage-goal-questions',
                    'valuesTime': '.time-goal-questions',
                    'valuesMoney': '.spending-goal-questions'
                };
                if (togglesMap[categoryName]) {
                    isChecked ? $(togglesMap[categoryName]).show() : $(togglesMap[categoryName]).hide();
                }
            }

            UIModule.showActiveStatistics(json);
            UIModule.toggleActiveStatGroups(json);
            UIModule.hideInactiveStatistics(json);
        });
    }

    function initializeCategoryStates() {
        // Set initial category states based on baseline values
        if (StorageModule.hasStorageData()) {
            var jsonObject = StorageModule.retrieveStorageObject();
            
            // valuesTimesDone category
            if (jsonObject.baseline.valuesTimesDone === false) {
                $('#valuesTimesDoneCategory').prop('checked', false);
                $('[data-category="valuesTimesDone"]').addClass('category-disabled');
                $('[data-category="valuesTimesDone"] .category-options .form-check-input').prop('disabled', true);
            }
            
            // valuesTime category
            if (jsonObject.baseline.valuesTime === false) {
                $('#valuesTimeCategory').prop('checked', false);
                $('[data-category="valuesTime"]').addClass('category-disabled');
                $('[data-category="valuesTime"] .category-options .form-check-input').prop('disabled', true);
            }
            
            // valuesMoney category
            if (jsonObject.baseline.valuesMoney === false) {
                $('#valuesMoneyCategory').prop('checked', false);
                $('[data-category="valuesMoney"]').addClass('category-disabled');
                $('[data-category="valuesMoney"] .category-options .form-check-input').prop('disabled', true);
            }
        }
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
                StatsDisplayModule.createReportForEndStamp(reportEndStamp, json);
            } else {
                $('.previous-report').prop("disabled", true)
                $('html').animate({ scrollTop: 0 })
            }
        });

        $(".next-report").on("click", function () {
            $('.previous-report').prop("disabled", false)
            if (json.report.activeEndStamp + (60 * 60 * 24 * 7) < json.report.maxEndStamp) {
                var reportEndStamp = json.report.activeEndStamp + (60 * 60 * 24 * 7);
                StatsDisplayModule.createReportForEndStamp(reportEndStamp, json);
            } else {
                $('.next-report').prop("disabled", true)
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
        setupCategoryToggleHandlers();
        initializeCategoryStates();
        setupHabitLogDisplayHandlers();
        setupReportDisplayHandlers();
        setupReportNavigationHandlers();
        setupSettingsMenuHandlers();
    }

    // Public API
    return {
        setupLiveStatsDisplayHandlers: setupLiveStatsDisplayHandlers,
        setupCategoryToggleHandlers: setupCategoryToggleHandlers,
        initializeCategoryStates: initializeCategoryStates,
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


