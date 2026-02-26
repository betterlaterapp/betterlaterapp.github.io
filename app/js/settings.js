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
            var baseline = jsonObject.option.baseline;
            if (categoryName && baseline.hasOwnProperty(categoryName)) {
                baseline[categoryName] = isChecked;
                json.option.baseline[categoryName] = isChecked;
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
            
            // Update baseline values UI visibility
            syncBaselineValuesUI(jsonObject);
            
            UIModule.showActiveStatistics(json);
            UIModule.toggleActiveStatGroups(json);
            UIModule.hideInactiveStatistics(json);
        });
    }

    function initializeCategoryStates() {
        // Set initial category states based on baseline values
        if (StorageModule.hasStorageData()) {
            var jsonObject = StorageModule.retrieveStorageObject();
            var baseline = jsonObject.option.baseline;

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
            initializeConditionalOptions(jsonObject.option.baseline);
            updatePrerequisiteToggles(jsonObject);
        }
    }

    /**
     * Disable/enable setting checkboxes based on missing prerequisite information
     * @param {Object} jsonObject - The storage object
     */
    function updatePrerequisiteToggles(jsonObject) {
        var baseline = jsonObject.option.baseline;
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
        var hasUsageBaseline = baseline.timesDone > 0;
        toggleOption('useChangeVsBaselineDisplayed', !hasUsageBaseline, "Requires baseline usage amount");

        // 2. Weekly report: usage this week vs. goal (check behavioralGoals for active goal)
        var hasUsageGoal = jsonObject.behavioralGoals && jsonObject.behavioralGoals.some(function(g) {
            return g && g.unit === 'times' && !g.completed;
        });
        toggleOption('useGoalVsThisWeekDisplayed', !hasUsageGoal, "Requires active usage goal");

        // 3. Weekly report: cost change vs. baseline
        var hasCostBaseline = baseline.moneySpent > 0;
        toggleOption('costChangeVsBaselineDisplayed', !hasCostBaseline, "Requires baseline spending amount");

        // 4. Weekly report: spending this week vs. goal (check behavioralGoals for active goal)
        var hasCostGoal = jsonObject.behavioralGoals && jsonObject.behavioralGoals.some(function(g) {
            return g && g.unit === 'dollars' && !g.completed;
        });
        toggleOption('costGoalVsThisWeekDisplayed', !hasCostGoal, "Requires active spending goal");

        // 5. Longest Wait completed
        var hasCompletedWaits = stats.wait.completedWaits > 0;
        toggleOption('longestGoalDisplayed', !hasCompletedWaits, "Requires at least one completed wait");

        // 6. Time until wait end
        var hasActiveWait = stats.wait.activeWaitUse || stats.wait.activeWaitBought || stats.wait.activeWaitBoth;
        toggleOption('untilGoalEndDisplayed', !hasActiveWait, "Requires an active wait timer");

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
        
        // Sync baseline values UI
        syncBaselineValuesUI(jsonObject);
    }
    
    /**
     * Initialize baseline values settings UI and event handlers
     */
    function setupBaselineValuesHandlers() {
        // Handle baseline value input changes
        $('.baseline-values-settings .baseline-input, .baseline-values-settings .baseline-timeline-select').on('change', function() {
            saveBaselineValuesFromSettings();
        });

        // Update chunk visibility when times done amount or timeline changes
        $('.settings-amountDonePerWeek, .settings-usage-timeline-select').on('change input', function() {
            updateSettingsChunkVisibility();
        });

        // Update spending chunk visibility when spending amount or timeline changes
        $('.settings-amountSpentPerWeek, .settings-spending-timeline-select').on('change input', function() {
            updateSettingsSpendingChunkVisibility();
        });

        // Handle settings importance checkboxes
        $('.settings-importance-option input[type="checkbox"]').on('change', function() {
            var $checkbox = $(this);
            var isChecked = $checkbox.is(':checked');
            
            // Determine which category this is
            var categoryKey = '';
            if ($checkbox.hasClass('settings-valuesTimesDone')) {
                categoryKey = 'valuesTimesDone';
            } else if ($checkbox.hasClass('settings-valuesTime')) {
                categoryKey = 'valuesTime';
            } else if ($checkbox.hasClass('settings-valuesMoney')) {
                categoryKey = 'valuesMoney';
            } else if ($checkbox.hasClass('settings-valuesHealth')) {
                categoryKey = 'valuesHealth';
            }
            
            if (!categoryKey) return;
            
            // Update storage
            var jsonObject = StorageModule.retrieveStorageObject();
            if (!jsonObject.option) jsonObject.option = {};
            if (!jsonObject.option.baseline) jsonObject.option.baseline = {};
            jsonObject.option.baseline[categoryKey] = isChecked;
            StorageModule.setStorageObject(jsonObject);
            
            // Sync baseline questionnaire checkbox
            $('input.' + categoryKey).prop('checked', isChecked);
            
            // Update category state in settings
            syncCategoryFromBaseline(categoryKey, isChecked);
            
            // Update baseline values UI visibility
            syncBaselineValuesUI(jsonObject);
            
            // Update conditional options (buttons, stats, etc)
            updateConditionalOptions();
            
            // Toggle related goal question-set in baseline questionnaire
            var togglesMap = {
                'valuesTimesDone': '.usage-goal-questions',
                'valuesTime': '.time-goal-questions',
                'valuesMoney': '.spending-goal-questions',
                'valuesHealth': '.wellness-goal-questions'
            };
            if (togglesMap[categoryKey]) {
                if (isChecked) {
                    $(togglesMap[categoryKey]).slideDown();
                } else {
                    $(togglesMap[categoryKey]).slideUp();
                }
            }
            
            // Update UI
            if (json) {
                UIModule.showActiveStatistics(json);
                UIModule.toggleActiveStatGroups(json);
                UIModule.hideInactiveStatistics(json);
            }
        });

        // Handle direction toggle changes (doMore, doLess, justObserve)
        $('.settings-behavior-direction input[type="radio"]').on('change', function() {
            var $radio = $(this);

            // Determine which direction is selected
            var isDecrease = $('.settings-doLess').is(':checked');
            var isIncrease = $('.settings-doMore').is(':checked');
            var isNeutral = $('.settings-doEqual').is(':checked');

            // Update storage
            var jsonObject = StorageModule.retrieveStorageObject();
            if (!jsonObject.option) jsonObject.option = {};
            if (!jsonObject.option.baseline) jsonObject.option.baseline = {};
            jsonObject.option.baseline.doLess = isDecrease;
            jsonObject.option.baseline.doMore = isIncrease;
            jsonObject.option.baseline.doEqual = isNeutral;
            StorageModule.setStorageObject(jsonObject);

            // Sync baseline questionnaire radio buttons
            $('input.doLess').prop('checked', isDecrease);
            $('input.doMore').prop('checked', isIncrease);
            $('input.doEqual').prop('checked', isNeutral);

            // Update body classes for UI styling
            if (typeof BaselineModule !== 'undefined' && BaselineModule.updateBodyClasses) {
                BaselineModule.updateBodyClasses(isDecrease, isIncrease, isNeutral);
            }
        });
    }

    /**
     * Sync baseline values UI with stored values
     */
    function syncBaselineValuesUI(jsonObject) {
        var baseline = (jsonObject.option && jsonObject.option.baseline) || {};

        // Sync direction toggles
        $('.settings-doLess').prop('checked', baseline.doLess === true);
        $('.settings-doMore').prop('checked', baseline.doMore === true);
        $('.settings-doEqual').prop('checked', baseline.doEqual === true);
        // Default to doEqual if nothing is selected
        if (!baseline.doLess && !baseline.doMore && !baseline.doEqual) {
            $('.settings-doEqual').prop('checked', true);
        }

        // Track if any category is enabled
        var anyEnabled = false;

        // Sync settings importance checkboxes
        $('.settings-valuesTimesDone').prop('checked', baseline.valuesTimesDone === true);
        $('.settings-valuesTime').prop('checked', baseline.valuesTime === true);
        $('.settings-valuesMoney').prop('checked', baseline.valuesMoney === true);
        $('.settings-valuesHealth').prop('checked', baseline.valuesHealth === true);
        
        // Times Done baseline
        if (baseline.valuesTimesDone) {
            anyEnabled = true;
            $('[data-baseline-category="valuesTimesDone"]').show();
            $('.settings-amountDonePerWeek').val(baseline.timesDone || '');
            $('.settings-usage-timeline-select').val(baseline.usageTimeline || 'week');
            $('.settings-usageChunkSize').val(baseline.usageChunkSize || 1);
            // Show chunk row if amount is high (>40/day equivalent)
            updateSettingsChunkVisibility();
        } else {
            $('[data-baseline-category="valuesTimesDone"]').hide();
        }

        // Time Spent baseline
        if (baseline.valuesTime) {
            anyEnabled = true;
            $('[data-baseline-category="valuesTime"]').show();
            $('.settings-currentTimeHours').val(baseline.timeSpentHours || '');
            $('.settings-currentTimeMinutes').val(baseline.timeSpentMinutes || '');
            $('.settings-time-timeline-select').val(baseline.timeTimeline || 'week');
            $('.settings-sessionTimeHours').val(baseline.sessionTimeHours || 1);
            $('.settings-sessionTimeMinutes').val(baseline.sessionTimeMinutes || 0);
        } else {
            $('[data-baseline-category="valuesTime"]').hide();
        }
        
        // Money Spent baseline
        if (baseline.valuesMoney) {
            anyEnabled = true;
            $('[data-baseline-category="valuesMoney"]').show();
            $('.settings-amountSpentPerWeek').val(baseline.moneySpent || '');
            $('.settings-spending-timeline-select').val(baseline.spendingTimeline || 'week');
            $('.settings-spendingChunkSize').val(baseline.spendingChunkSize || '');
            updateSettingsSpendingChunkVisibility();
        } else {
            $('[data-baseline-category="valuesMoney"]').hide();
        }
        
        // Show/hide empty message
        if (anyEnabled) {
            $('.baseline-values-empty-message').hide();
        } else {
            $('.baseline-values-empty-message').show();
        }
    }
    
    /**
     * Save baseline values from settings UI to storage
     */
    function saveBaselineValuesFromSettings() {
        var jsonObject = StorageModule.retrieveStorageObject();
        if (!jsonObject) return;
        
        var baseline = jsonObject.option.baseline;
        
        // Times Done
        if (baseline.valuesTimesDone) {
            var amountDone = parseInt($('.settings-amountDonePerWeek').val()) || 0;
            var usageTimeline = $('.settings-usage-timeline-select').val();
            var chunkSize = parseInt($('.settings-usageChunkSize').val()) || 1;
            baseline.timesDone = amountDone;
            baseline.usageTimeline = usageTimeline;
            baseline.usageChunkSize = chunkSize;
        }

        // Time Spent
        if (baseline.valuesTime) {
            var timeHours = parseInt($('.settings-currentTimeHours').val()) || 0;
            var timeMinutes = parseInt($('.settings-currentTimeMinutes').val()) || 0;
            var timeTimeline = $('.settings-time-timeline-select').val();
            var sessionHours = parseInt($('.settings-sessionTimeHours').val()) || 1;
            var sessionMinutes = parseInt($('.settings-sessionTimeMinutes').val()) || 0;
            baseline.timeSpentHours = timeHours;
            baseline.timeSpentMinutes = timeMinutes;
            baseline.timeTimeline = timeTimeline;
            baseline.sessionTimeHours = sessionHours;
            baseline.sessionTimeMinutes = sessionMinutes;
        }
        
        // Money Spent
        if (baseline.valuesMoney) {
            var amountSpent = parseInt($('.settings-amountSpentPerWeek').val()) || 0;
            var spendingTimeline = $('.settings-spending-timeline-select').val();
            var spendingChunkSize = parseInt($('.settings-spendingChunkSize').val()) || 0;
            baseline.moneySpent = amountSpent;
            baseline.spendingTimeline = spendingTimeline;
            baseline.spendingChunkSize = spendingChunkSize;
        }
        
        // Save to storage
        StorageModule.setStorageObject(jsonObject);
        
        // Keep in-memory json in sync
        json.option = jsonObject.option;
        
        // Also sync the baseline questionnaire inputs
        syncBaselineQuestionnaireFromSettings(baseline);

        // Update chunk visibility based on amount
        updateSettingsChunkVisibility();
    }

    /**
     * Show/hide chunk row based on usage amount (>40/day equivalent)
     */
    function updateSettingsChunkVisibility() {
        var amount = parseInt($('.settings-amountDonePerWeek').val()) || 0;
        var timeline = $('.settings-usage-timeline-select').val();

        // Convert to per-day equivalent
        var perDay;
        if (timeline === 'day') {
            perDay = amount;
        } else if (timeline === 'week') {
            perDay = amount / 7;
        } else { // month
            perDay = amount / 30;
        }

        // Show chunk input if >40 per day
        if (perDay > 40) {
            $('.settings-chunk-row').slideDown();
        } else {
            $('.settings-chunk-row').slideUp();
        }
    }

    /**
     * Show/hide spending chunk row based on spending amount (>40/day equivalent)
     * or if a spending chunk size is already set
     */
    function updateSettingsSpendingChunkVisibility() {
        var amount = parseInt($('.settings-amountSpentPerWeek').val()) || 0;
        var timeline = $('.settings-spending-timeline-select').val();
        var existingChunk = parseInt($('.settings-spendingChunkSize').val()) || 0;

        // Convert to per-day equivalent
        var perDay;
        if (timeline === 'day') {
            perDay = amount;
        } else if (timeline === 'week') {
            perDay = amount / 7;
        } else { // month
            perDay = amount / 30;
        }

        // Show chunk input if >40 per day or chunk already set
        if (perDay > 40 || existingChunk > 0) {
            $('.settings-spending-chunk-row').slideDown();
        } else {
            $('.settings-spending-chunk-row').slideUp();
        }
    }

    /**
     * Sync baseline questionnaire inputs with settings values
     */
    function syncBaselineQuestionnaireFromSettings(baseline) {
        // Times Done
        if (baseline.timesDone !== undefined) {
            $('.baseline-amountDonePerWeek').val(baseline.timesDone);
        }
        if (baseline.usageTimeline) {
            $('.baseline-usage-timeline-select').val(baseline.usageTimeline);
        }
        if (baseline.usageChunkSize !== undefined) {
            $('.baseline-usageChunkSize').val(baseline.usageChunkSize);
        }

        // Time Spent
        if (baseline.timeSpentHours !== undefined) {
            $('.baseline-currentTimeHours').val(baseline.timeSpentHours);
        }
        if (baseline.timeSpentMinutes !== undefined) {
            $('.baseline-currentTimeMinutes').val(baseline.timeSpentMinutes);
        }
        if (baseline.timeTimeline) {
            $('.baseline-time-timeline-select').val(baseline.timeTimeline);
        }
        if (baseline.sessionTimeHours !== undefined) {
            $('.baseline-sessionTimeHours').val(baseline.sessionTimeHours);
        }
        if (baseline.sessionTimeMinutes !== undefined) {
            $('.baseline-sessionTimeMinutes').val(baseline.sessionTimeMinutes);
        }

        // Money Spent
        if (baseline.moneySpent !== undefined) {
            $('.baseline-amountSpentPerWeek').val(baseline.moneySpent);
        }
        if (baseline.spendingTimeline) {
            $('.baseline-spending-timeline-select').val(baseline.spendingTimeline);
        }
        if (baseline.spendingChunkSize !== undefined) {
            $('.baseline-spendingChunkSize').val(baseline.spendingChunkSize);
        }
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
            //cycle back through records until you find most recent wait
            for (var i = jsonObject["action"].length - 1; i >= 0; i--) {
                var currRecord = jsonObject["action"][i];
                var waitTypeIsRelevant = (currRecord.waitType == "both" || currRecord.waitType == undoneActionClickType);
                if (waitTypeIsRelevant && currRecord.clickType == "wait") {
                    //if this first finds a wait which would have been broken by undoneActionClickType,
                    //change this.status to active, exit loop
                    StorageModule.changeWaitStatus(1, currRecord.waitType, -1);
                    break;

                } else if (currRecord.clickType == undoneActionClickType) {
                    //if this first finds an action.clickType == undoneActionClickType,
                    //then a wait could not have been broken, so exit loop without changing wait status
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
        setupBaselineValuesHandlers();
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
        syncBaselineValuesUI: syncBaselineValuesUI,
        init: init
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsModule;
} else {
    window.SettingsModule = SettingsModule;
}


