var SettingsModule = (function () {
    // Private variables
    var json;

    function setupDisplayedOptionHandlers() {
        $(".displayed-statistics .form-check-input:not(.category-checkbox)").on('change', function () {
            var itemHandle = this.id;
            var isChecked = $("#" + itemHandle).is(":checked");

            var jsonObject = StorageModule.retrieveStorageObject();

            // Habit journal record toggles
            if (itemHandle.endsWith("RecordDisplayed")) {
                var logHandle = itemHandle.replace("RecordDisplayed", "");
                json.option.logItemsToDisplay[logHandle] = isChecked;
                jsonObject.option.logItemsToDisplay[logHandle] = isChecked;

                if (isChecked) {
                    $("#habit-log .item." + logHandle + "-record").removeClass("d-none");
                } else {
                    $("#habit-log .item." + logHandle + "-record").addClass("d-none");
                }

                StorageModule.setStorageObject(jsonObject);
                return;
            }

            // Displayed toggles (either live stats OR weekly report)
            if (itemHandle.endsWith("Displayed")) {
                var handle = itemHandle.replace("Displayed", "");

                if (json.option.liveStatsToDisplay.hasOwnProperty(handle)) {
                    json.option.liveStatsToDisplay[handle] = isChecked;
                    jsonObject.option.liveStatsToDisplay[handle] = isChecked;
                    StorageModule.setStorageObject(jsonObject);

                    UIModule.showActiveStatistics(json);
                    UIModule.toggleActiveStatGroups(json);
                    UIModule.hideInactiveStatistics(json);
                    return;
                }

                if (json.option.reportItemsToDisplay.hasOwnProperty(handle)) {
                    json.option.reportItemsToDisplay[handle] = isChecked;
                    jsonObject.option.reportItemsToDisplay[handle] = isChecked;
                    StorageModule.setStorageObject(jsonObject);

                    // case to remove an existing graph
                    if (!json.option.reportItemsToDisplay.useVsResistsGraph) {
                        $(".weekly-report .chart-title").hide();
                        $(".weekly-report .bar-chart").hide();
                        $(".weekly-report .week-range").hide();
                    } else {
                        $(".weekly-report .chart-title").show();
                        $(".weekly-report .bar-chart").show();
                        $(".weekly-report .week-range").show();
                    }
                    return;
                }
            }
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
                    'valuesMoney': '.spending-goal-questions',
                    'valuesHealth': '.wellness-goal-questions'
                };
                if (togglesMap[categoryName]) {
                    isChecked ? $(togglesMap[categoryName]).show() : $(togglesMap[categoryName]).hide();
                }
                
                // Call saveBaselineValues to ensure all derived options stay in sync
                if (typeof BaselineModule !== 'undefined' && BaselineModule.saveBaselineValues) {
                    BaselineModule.saveBaselineValues();
                }
            }

            // Update conditional options (buttons, log items, report items)
            updateConditionalOptions();
            
            UIModule.showActiveStatistics(json);
            UIModule.toggleActiveStatGroups(json);
            UIModule.hideInactiveStatistics(json);
        });
    }

    function initializeCategoryStates() {
        // Set initial category states based on baseline values
        if (StorageModule.hasStorageData()) {
            var jsonObject = StorageModule.retrieveStorageObject();
            var baseline = jsonObject.baseline;

            // Categories should be OPEN iff their baseline values* is true.
            // (Buttons category is always open / always available.)
            syncCategoryFromBaseline('valuesTimesDone', baseline.valuesTimesDone);
            syncCategoryFromBaseline('valuesTime', baseline.valuesTime);
            syncCategoryFromBaseline('valuesMoney', baseline.valuesMoney);
            syncCategoryFromBaseline('valuesHealth', baseline.valuesHealth);

            // Initialize conditional option visibility based on baseline
            initializeConditionalOptions(baseline);
        }
    }

    function syncCategoryFromBaseline(categoryKey, isEnabled) {
        var $category = $('[data-category="' + categoryKey + '"]');
        var $checkbox = $('#' + categoryKey);
        var enabled = isEnabled === true;

        $checkbox.prop('checked', enabled);
        if (enabled) {
            $category.removeClass('category-disabled');
            $category.find('.category-options .form-check-input').prop('disabled', false);
        } else {
            $category.addClass('category-disabled');
            $category.find('.category-options .form-check-input').prop('disabled', true);
        }
    }
    
    function initializeConditionalOptions(baseline) {
        // Handle elements with data-requires attribute
        // These elements are shown/hidden based on baseline values
        $('[data-requires]').each(function() {
            var $element = $(this);
            var requires = $element.data('requires').split(',');
            
            // Check if any of the required baseline values are true
            var shouldShow = requires.some(function(req) {
                return baseline[req.trim()] === true;
            });
            
            if (shouldShow) {
                $element.show();
                $element.find('.form-check-input').prop('disabled', false);
            } else {
                $element.hide();
                $element.find('.form-check-input').prop('disabled', true);
            }
        });
    }
    
    function updateConditionalOptions() {
        // Called when baseline values change - update visibility of conditional options
        if (StorageModule.hasStorageData()) {
            var jsonObject = StorageModule.retrieveStorageObject();
            initializeConditionalOptions(jsonObject.baseline);
            updatePrerequisiteToggles(jsonObject);
        }
    }

    /**
     * Disable/enable setting checkboxes based on missing prerequisite information
     * @param {Object} jsonObject - The storage object
     */
    function updatePrerequisiteToggles(jsonObject) {
        var baseline = jsonObject.baseline;
        var stats = json ? json.statistics : null;

        if (!stats) return;

        // Helper to toggle disabled state and title attribute
        function toggleOption(id, isDisabled, reason) {
            var $input = $("#" + id);
            var $label = $input.closest('label');
            
            $input.prop('disabled', isDisabled);
            if (isDisabled) {
                $label.css('opacity', '0.5');
                $label.attr('title', reason);
                // Also uncheck if disabled? The user might want to keep their preference 
                // but the app won't show it anyway. Let's just disable for now.
            } else {
                $label.css('opacity', '1');
                $label.removeAttr('title');
            }
        }

        // 1. Weekly report: usage change vs. baseline
        var hasUsageBaseline = baseline.amountDonePerWeek > 0;
        toggleOption('useChangeVsBaselineDisplayed', !hasUsageBaseline, "Requires baseline usage amount");

        // 2. Weekly report: usage this week vs. goal
        var hasUsageGoal = baseline.goalDonePerWeek > 0;
        toggleOption('useGoalVsThisWeekDisplayed', !hasUsageGoal, "Requires usage goal amount");

        // 3. Weekly report: cost change vs. baseline
        var hasCostBaseline = baseline.amountSpentPerWeek > 0;
        toggleOption('costChangeVsBaselineDisplayed', !hasCostBaseline, "Requires baseline spending amount");

        // 4. Weekly report: usage this week vs. goal
        var hasCostGoal = baseline.goalSpentPerWeek > 0;
        toggleOption('costGoalVsThisWeekDisplayed', !hasCostGoal, "Requires spending goal amount");

        // 5. Longest Goal completed
        var hasCompletedGoals = stats.goal.completedGoals > 0;
        toggleOption('longestGoalDisplayed', !hasCompletedGoals, "Requires at least one completed goal");

        // 6. Time until goal end
        var hasActiveGoal = stats.goal.activeGoalUse || stats.goal.activeGoalBought || stats.goal.activeGoalBoth;
        toggleOption('untilGoalEndDisplayed', !hasActiveGoal, "Requires an active goal timer");

        // 7. Time since last 'did it'
        var hasUsageActions = stats.use.clickCounter > 0;
        toggleOption('sinceLastDoneDisplayed', !hasUsageActions, "Requires at least one 'did it' action");

        // 8. Average time between 'did it'
        var hasMultipleUsageActions = stats.use.clickCounter > 1;
        toggleOption('avgBetweenDoneDisplayed', !hasMultipleUsageActions, "Requires at least two 'did it' actions");

        // 9. Time since last 'spent'
        var hasSpendingActions = stats.cost.clickCounter > 0;
        toggleOption('sinceLastSpentDisplayed', !hasSpendingActions, "Requires at least one 'spent' action");

        // 10. Average time between 'spent'
        var hasMultipleSpendingActions = stats.cost.clickCounter > 1;
        toggleOption('avgBetweenSpentDisplayed', !hasMultipleSpendingActions, "Requires at least two 'spent' actions");
    }

    function refreshSettingsUI() {
        if (!StorageModule.hasStorageData()) return;

        var jsonObject = StorageModule.retrieveStorageObject();

        // Keep in-memory json in sync
        json.baseline = jsonObject.baseline;
        json.option = jsonObject.option;

        // Sync displayed option checkboxes (live stats + journal records + weekly reports)
        if (json.option && json.option.liveStatsToDisplay) {
            for (var key in json.option.liveStatsToDisplay) {
                $("#" + key + "Displayed").prop('checked', json.option.liveStatsToDisplay[key]);
            }
        }
        if (json.option && json.option.logItemsToDisplay) {
            for (var k2 in json.option.logItemsToDisplay) {
                $("#" + k2 + "RecordDisplayed").prop('checked', json.option.logItemsToDisplay[k2]);
            }
        }
        if (json.option && json.option.reportItemsToDisplay) {
            for (var k3 in json.option.reportItemsToDisplay) {
                $("#" + k3 + "Displayed").prop('checked', json.option.reportItemsToDisplay[k3]);
            }
        }

        // Sync category dropdown open/closed state from baseline
        initializeCategoryStates();

        // Sync conditional (data-requires) items
        updateConditionalOptions();
        
        // Disable options with missing prerequisites
        updatePrerequisiteToggles(jsonObject);
    }

    // (Habit log + report handlers consolidated into setupDisplayedOptionHandlers)

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

        setupDisplayedOptionHandlers();
        setupCategoryToggleHandlers();
        initializeCategoryStates();
        setupReportNavigationHandlers();
        setupSettingsMenuHandlers();
    }

    // Public API
    return {
        setupDisplayedOptionHandlers: setupDisplayedOptionHandlers,
        setupCategoryToggleHandlers: setupCategoryToggleHandlers,
        initializeCategoryStates: initializeCategoryStates,
        initializeConditionalOptions: initializeConditionalOptions,
        updateConditionalOptions: updateConditionalOptions,
        refreshSettingsUI: refreshSettingsUI,
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


