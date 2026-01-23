var ButtonsModule = (function() {
    // Private variables
    var json;

    /**
     * Setup tab switching for the 'Did it' dialog
     */
    function setupDialogTabs() {
        // Tab click handler
        $(document).on('click', '.use-dialog-tab', function() {
            var tabId = $(this).data('tab');
            
            // Update active tab button
            $('.use-dialog-tab').removeClass('active');
            $(this).addClass('active');
            
            // Show corresponding tab content
            $('.use-dialog-tab-content').removeClass('active').hide();
            $('.use-dialog-tab-content[data-tab-content="' + tabId + '"]').addClass('active').show();
        });

        // Custom unit selector handler
        $(document).on('change', '.how-much-unit-select', function() {
            var value = $(this).val();
            if (value === '__custom__') {
                $(this).hide();
                $(this).siblings('.custom-unit-input').show().find('input').focus();
            }
        });

        // Save custom unit handler
        $(document).on('click', '.custom-unit-save-btn', function() {
            var input = $(this).siblings('.how-much-custom-unit');
            var customUnit = input.val().trim();
            
            if (customUnit) {
                // Add to storage
                StorageModule.addCustomUnit(customUnit);
                
                // Add to dropdown and select it
                var select = $(this).closest('.how-much-unit-container').find('.how-much-unit-select');
                var optionExists = select.find('option[value="' + customUnit + '"]').length > 0;
                
                if (!optionExists) {
                    select.find('option[value="__custom__"]').before(
                        '<option value="' + customUnit + '">' + customUnit + '</option>'
                    );
                }
                select.val(customUnit).show();
                
                // Hide custom input
                $(this).closest('.custom-unit-input').hide();
                input.val('');
            }
        });

        // "How long" radio button change
        $(document).on('change', 'input[name="howLongRadios"]', function() {
            var value = $(this).val();
            if (value === 'startTimer') {
                $('.how-long-manual-inputs').hide();
            } else {
                $('.how-long-manual-inputs').show();
            }
        });
    }

    /**
     * Update the dialog tabs visibility based on baseline settings
     */
    function updateDialogTabsVisibility() {
        var jsonObject = StorageModule.retrieveStorageObject();
        var baseline = jsonObject.option.baseline;

        // "How much" tab - visible if valuesTimesDone is selected
        if (baseline.valuesTimesDone) {
            $('.use-dialog-tab[data-tab="how-much"]').show();
        } else {
            $('.use-dialog-tab[data-tab="how-much"]').hide();
        }

        // "How long" tab - visible if valuesTime is selected
        if (baseline.valuesTime) {
            $('.use-dialog-tab[data-tab="how-long"]').show();
        } else {
            $('.use-dialog-tab[data-tab="how-long"]').hide();
        }
    }

    /**
     * Reset dialog to initial state
     */
    function resetDialogState() {
        // Reset to "When" tab
        $('.use-dialog-tab').removeClass('active');
        $('.use-dialog-tab[data-tab="when"]').addClass('active');
        $('.use-dialog-tab-content').removeClass('active').hide();
        $('.use-dialog-tab-content[data-tab-content="when"]').addClass('active').show();

        // Reset "How much" inputs
        $('.how-much-amount').val('');
        $('.how-much-unit-select').val('').show();
        $('.custom-unit-input').hide();
        $('.how-much-custom-unit').val('');

        // Reset "How long" inputs
        $('#manualDurationRadio').prop('checked', true);
        $('.duration-picker-hours').val('0');
        $('.duration-picker-minutes').val('0');
        $('.how-long-manual-inputs').show();

        // Populate custom units from storage
        populateCustomUnits();
    }

    /**
     * Populate custom units dropdown from storage
     */
    function populateCustomUnits() {
        var customUnits = StorageModule.getCustomUnits();
        var select = $('.how-much-unit-select');
        
        // Remove existing custom units (keep default ones)
        select.find('option').each(function() {
            var val = $(this).val();
            if (val && val !== '__custom__' && !isDefaultUnit(val)) {
                $(this).remove();
            }
        });

        // Add custom units before the "Add custom" option
        customUnits.forEach(function(unit) {
            if (!select.find('option[value="' + unit + '"]').length) {
                select.find('option[value="__custom__"]').before(
                    '<option value="' + unit + '">' + unit + '</option>'
                );
            }
        });
    }

    /**
     * Check if a unit is one of the default units
     */
    function isDefaultUnit(unit) {
        var defaults = ['', 'times', 'reps', 'laps', 'sets', 'grams', 'oz', 'ml', 'cups', 'pages', 'minutes'];
        return defaults.includes(unit);
    }

    /**
     * Get "How much" data from the dialog
     */
    function getHowMuchData() {
        var amount = parseFloat($('.how-much-amount').val());
        var unit = $('.how-much-unit-select').val();
        
        if (isNaN(amount) || amount <= 0) {
            return null;
        }
        
        return {
            amount: amount,
            unit: unit || null
        };
    }

    /**
     * Get "How long" data from the dialog
     */
    function getHowLongData() {
        var selectedOption = $('input[name="howLongRadios"]:checked').val();
        
        if (selectedOption === 'startTimer') {
            return { type: 'startTimer' };
        } else {
            var hours = parseInt($('.duration-picker-hours').val()) || 0;
            var minutes = parseInt($('.duration-picker-minutes').val()) || 0;
            var totalSeconds = (hours * 3600) + (minutes * 60);
            
            if (totalSeconds <= 0) {
                return null;
            }
            
            return {
                type: 'manual',
                duration: totalSeconds
            };
        }
    }

    function handleCraveButtonClick() {

        var timestampSeconds = Math.round(new Date() / 1000);
        
        // Don't allow clicks more recent than 1 seconds
        if (timestampSeconds - json.statistics.use.lastClickStampCrave >= 0) {
            // Return user to stats page
            $(".statistics-tab-toggler").click();

            // Update relevant statistics
            json.statistics.use.craveCounter++;
            $("#crave-total").html(json.statistics.use.craveCounter);
            StorageModule.updateActionTable(timestampSeconds, "craved");

            // Add record into log
            ActionLogModule.placeActionIntoLog(timestampSeconds, "craved", null, null, null, false);

            var bestStreak = parseInt($('.stat-group.resistStreak .statistic.total').html());
            if (bestStreak == json.statistics.use.cravingsInARow) {
                $('.stat-group.resistStreak .statistic.total').html(bestStreak + 1);
            }

            json.statistics.use.cravingsInARow++;
            $("#cravingsResistedInARow").html(json.statistics.use.cravingsInARow);

            if (json.option.baseline.decreaseHabit == true) {
                UIModule.shootConfetti();
            }
            
            UIModule.showActiveStatistics(json);

            // Keep lastClickStamp up to date while using app
            json.statistics.use.lastClickStampCrave = timestampSeconds;
    
            StatsDisplayModule.initiateReport(json, StorageModule.retrieveStorageObject, StatsDisplayModule.createReport);
            
            // Refresh brief stats
            if (typeof BriefStatsModule !== 'undefined') {
                BriefStatsModule.refresh();
            }
        } else {
            alert("You're awesome.");
        }
    }

    function handleUseButtonClick() {
        UIModule.openClickDialog(".use");

        // Reset dialog state and update tab visibility
        resetDialogState();
        updateDialogTabsVisibility();

        var date = new Date();
        var currHours = date.getHours(),
            currMinutes = date.getMinutes();
        if (currHours >= 12) {
            $(".use.log-more-info .time-picker-am-pm").val("PM");
            currHours = currHours % 12;
        }

        // Set minutes to approx. what time it is
        if (currMinutes >= 45) {
            currMinutes = 45;
        } else if (currMinutes >= 30) {
            currMinutes = 30;
        } else if (currMinutes >= 15) {
            currMinutes = 15;
        } else {
            currMinutes = 0;
        }
        
        $(".use.log-more-info .time-picker-hour").val(currHours);
        $(".use.log-more-info .time-picker-minute").val(currMinutes);

        UIModule.showActiveStatistics(json, StatsDisplayModule.recalculateAverageTimeBetween, StatsDisplayModule.displayLongestWait);
    }

    function calculateRequestedTimestamp() {
        var date = new Date();
        var timestampSeconds = Math.round(date / 1000);
        
        var requestedTimeStartHours = parseInt($(".use.log-more-info select.time-picker-hour").val());
        var requestedTimeStartMinutes = parseInt($(".use.log-more-info select.time-picker-minute").val());
        var userDidItNow = $("#nowUseRadio").is(':checked');
        
        if (userDidItNow) {
            requestedTimeStartHours = date.getHours();
            requestedTimeStartMinutes = date.getMinutes();
        }

        // Convert 12-hour to 24-hour format
        if (requestedTimeStartHours == 12) {
            requestedTimeStartHours = 0;
        }
        if ($(".use.log-more-info select.time-picker-am-pm").val() == "PM") {
            requestedTimeStartHours += 12;
        }

        var requestedTimeDiffSeconds = (date.getHours() - requestedTimeStartHours) * 60 * 60 + 
                                      (date.getMinutes() - requestedTimeStartMinutes) * 60;
        var requestedTimestamp = timestampSeconds - requestedTimeDiffSeconds;

        // Handle future times (interpret as previous day)
        if (!userDidItNow) {
            var secondsToNow = date.getHours() * 60 * 60 + date.getMinutes() * 60;
            var secondsToRequested = requestedTimeStartHours * 60 * 60 + requestedTimeStartMinutes * 60;
            
            if (secondsToRequested > secondsToNow) {
                requestedTimestamp -= (24 * 60 * 60); // Subtract one day
            }
        }

        return { timestampSeconds, requestedTimestamp, userDidItNow };
    }

    function updateUseStatistics() {
        var newTotals = {
            total: parseInt($(".statistic.use.totals.total").html()) + 1,
            week: parseInt($(".statistic.use.totals.week").html()) + 1,
            month: parseInt($(".statistic.use.totals.month").html()) + 1,
            year: parseInt($(".statistic.use.totals.year").html()) + 1
        };
        
        $(".statistic.use.totals.total").html(newTotals.total);
        $(".statistic.use.totals.week").html(newTotals.week);
        $(".statistic.use.totals.month").html(newTotals.month);
        $(".statistic.use.totals.year").html(newTotals.year);

        var betweenClicks = json.statistics.use.betweenClicks;
        $(".statistic.use.timeBetween.total").html(betweenClicks.total);
        $(".statistic.use.timeBetween.week").html(betweenClicks.week);
        $(".statistic.use.timeBetween.month").html(betweenClicks.month);
        $(".statistic.use.timeBetween.year").html(betweenClicks.year);
    }

    function handleUseWaitCompletion(requestedTimestamp) {
        if (json.statistics.wait.activeWaitUse === 0 && json.statistics.wait.activeWaitBoth === 0) {
            return;
        }

        var waitType = json.statistics.wait.activeWaitUse !== 0 ? "use" : "both";
        var message = json.affirmations[Math.floor(Math.random() * json.affirmations.length)];
        
        // Reset active wait
        json.statistics.wait.activeWaitUse = 0;
        json.statistics.wait.activeWaitBoth = 0;

        StorageModule.changeWaitStatus(2, waitType, requestedTimestamp);
        NotificationsModule.createNotification(message, null, { type: 'wait_ended_early' });

        UIModule.toggleActiveStatGroups(json);
        UIModule.hideInactiveStatistics(json);

        // Log completed wait
        var startStamp = json.statistics.wait.lastClickStamp;
        ActionLogModule.placeActionIntoLog(startStamp, "used", null, null, null, false);
        WaitModule.replaceLongestWait(startStamp, requestedTimestamp, json);

        // Update wait counter
        json.statistics.wait.completedWaits++;
        $("#numberOfWaitsCompleted").html(json.statistics.wait.completedWaits);
    }

    function handleUseButtonDialog() {
        if (json.option.baseline.decreaseHabit === false) {
            UIModule.shootConfetti();
        }

        var timeData = calculateRequestedTimestamp();
        var { timestampSeconds, requestedTimestamp, userDidItNow } = timeData;

        // Get optional "How much" data
        var howMuchData = getHowMuchData();

        // Get optional "How long" data (only if valuesTime is set)
        var howLongData = null;
        var jsonObject = StorageModule.retrieveStorageObject();
        if (jsonObject.option.baseline.valuesTime) {
            howLongData = getHowLongData();
        }

        // Handle "Start Timer" option - don't log action yet, start timer instead
        if (howLongData && howLongData.type === 'startTimer') {
            UIModule.closeClickDialog(".use");
            $(".statistics-tab-toggler").click();
            // End any active wait timer since user is starting activity
            if (typeof WaitTimerModule !== 'undefined' && WaitTimerModule.endActiveWaitTimerOnAction) {
                WaitTimerModule.endActiveWaitTimerOnAction('started_timer');
            }
            ActivityTimerModule.startNewTimer();
            return;
        }

        // End any active wait timer since user "did it"
        if (typeof WaitTimerModule !== 'undefined' && WaitTimerModule.endActiveWaitTimerOnAction) {
            WaitTimerModule.endActiveWaitTimerOnAction('did_it');
        }

        // Return to statistics screen
        $(".statistics-tab-toggler").click();

        // Update click counter
        if (json.statistics.use.clickCounter === 0) {
            json.statistics.use.firstClickStamp += timestampSeconds;
        }
        json.statistics.use.clickCounter++;
        $("#use-total").html(json.statistics.use.clickCounter);

        // Reset cravings streak
        json.statistics.use.cravingsInARow = 0;
        $("#cravingsResistedInARow").html(json.statistics.use.cravingsInARow);

        // Determine what type of action to record
        var actionTimestamp = userDidItNow ? timestampSeconds : requestedTimestamp;
        
        // Handle "How long" with manual duration - creates a 'timed' action
        if (howLongData && howLongData.type === 'manual' && howLongData.duration > 0) {
            StorageModule.updateTimedAction(
                actionTimestamp, 
                howLongData.duration,
                howMuchData ? howMuchData.amount : null,
                howMuchData ? howMuchData.unit : null
            );
            ActionLogModule.placeActionIntoLog(actionTimestamp, "timed", null, null, null, false, howLongData.duration);
            
            // Update time spent stats
            if (typeof ActivityTimerModule !== 'undefined') {
                ActivityTimerModule.updateTimeSpentStats();
            }
        }
        // Handle "How much" data with optional amount/unit
        else if (howMuchData) {
            StorageModule.updateUsedActionWithAmount(
                actionTimestamp,
                howMuchData.amount,
                howMuchData.unit
            );
            ActionLogModule.placeActionIntoLog(actionTimestamp, "used", null, null, null, false);
        }
        // Standard "used" action
        else {
            StorageModule.updateActionTable(actionTimestamp, "used");
            ActionLogModule.placeActionIntoLog(actionTimestamp, "used", null, null, null, false);
        }

        // Handle timer
        if (userDidItNow) {
            TimerStateManager.initiate('smoke', undefined, json);
        } else {
            TimerStateManager.initiate('smoke', requestedTimestamp, json);
        }

        // Update statistics display
        updateUseStatistics();

        // Handle wait completion
        handleUseWaitCompletion(requestedTimestamp);

        // Final updates
        StatsDisplayModule.initiateReport(json, StorageModule.retrieveStorageObject, StatsDisplayModule.createReport);
        UIModule.showActiveStatistics(json, StatsDisplayModule.recalculateAverageTimeBetween, StatsDisplayModule.displayLongestWait);
        json.statistics.use.lastClickStamp = timestampSeconds;
        UIModule.closeClickDialog(".use");
        
        // Refresh brief stats
        if (typeof BriefStatsModule !== 'undefined') {
            BriefStatsModule.refresh();
        }
    }

    function handleBoughtButtonClick() {
        UIModule.openClickDialog(".cost");
    }

    function updateCostStatistics(amountSpent) {
        // Update totals in JSON
        json.statistics.cost.totals.total = parseInt(json.statistics.cost.totals.total) + parseInt(amountSpent);
        json.statistics.cost.totals.week = parseInt(json.statistics.cost.totals.week) + parseInt(amountSpent);
        json.statistics.cost.totals.month = parseInt(json.statistics.cost.totals.month) + parseInt(amountSpent);
        json.statistics.cost.totals.year = parseInt(json.statistics.cost.totals.year) + parseInt(amountSpent);

        // Update display
        $(".statistic.cost.totals.total").html("$" + json.statistics.cost.totals.total);
        $(".statistic.cost.totals.week").html("$" + json.statistics.cost.totals.week);
        $(".statistic.cost.totals.month").html("$" + json.statistics.cost.totals.month);
        $(".statistic.cost.totals.year").html("$" + json.statistics.cost.totals.year);
    }

    function handleBoughtWaitCompletion(timestampSeconds) {
        // End any 'bought' type wait timer via WaitTimerModule
        if (typeof WaitTimerModule !== 'undefined' && WaitTimerModule.endActiveWaitTimerOnAction) {
            WaitTimerModule.endActiveWaitTimerOnAction('spent');
        }
        
        // Also handle in-memory state for backwards compatibility
        if (json.statistics.wait.activeWaitBought === 0 && json.statistics.wait.activeWaitBoth === 0) {
            return;
        }

        var waitType = json.statistics.wait.activeWaitBought !== 0 ? "bought" : "both";
        var message = json.affirmations[Math.floor(Math.random() * json.affirmations.length)];
        
        // Reset active wait
        json.statistics.wait.activeWaitBought = 0;
        json.statistics.wait.activeWaitBoth = 0;

        StorageModule.changeWaitStatus(2, waitType, timestampSeconds);
        NotificationsModule.createNotification(message, null, { type: 'wait_ended_early' });

        UIModule.toggleActiveStatGroups(json);
        UIModule.hideInactiveStatistics(json);

        // Log completed wait
        var startStamp = json.statistics.wait.lastClickStamp;
        ActionLogModule.placeWaitIntoLog(startStamp, timestampSeconds, waitType, false, json);
        WaitModule.replaceLongestWait(startStamp, timestampSeconds, json);

        // Update wait counter
        json.statistics.wait.completedWaits++;
        $("#numberOfWaitsCompleted").html(json.statistics.wait.completedWaits);
    }

    function handleBoughtButtonDialog() {
        var amountSpent = $("#spentInput").val();

        if (!$.isNumeric(amountSpent)) {
            alert("Please enter in a number!");
            return;
        }

        // Return to statistics screen
        $(".statistics-tab-toggler").click();

        var timestampSeconds = Math.round(new Date() / 1000);
        
        // Record the action
        StorageModule.updateActionTable(timestampSeconds, "bought", amountSpent);
        ActionLogModule.placeActionIntoLog(timestampSeconds, "bought", amountSpent, null, null, false);

        // Update click counter and first click stamp
        if (json.statistics.cost.clickCounter === 0) {
            json.statistics.cost.firstClickStamp += timestampSeconds;
        } else if (json.statistics.cost.clickCounter === 1) {
            json.statistics.cost.betweenClicks.total = timestampSeconds - json.statistics.cost.firstClickStamp;
        }

        json.statistics.cost.clickCounter++;
        $("#bought-total").html(json.statistics.cost.clickCounter);

        // Update cost statistics
        updateCostStatistics(amountSpent);

        // Handle wait completion
        handleBoughtWaitCompletion(timestampSeconds);

        // Final updates
        UIModule.closeClickDialog(".cost");
        TimerStateManager.initiate('bought', undefined, json);
        UIModule.showActiveStatistics(json, StatsDisplayModule.recalculateAverageTimeBetween, StatsDisplayModule.displayLongestWait);
        UIModule.toggleActiveStatGroups(json);
        UIModule.hideInactiveStatistics(json);
        TimersModule.adjustFibonacciTimerToBoxes("bought-timer");
        json.statistics.cost.lastClickStamp = timestampSeconds;
        
        // Refresh report to show new spending data
        StatsDisplayModule.initiateReport(json);
        
        // Refresh brief stats
        if (typeof BriefStatsModule !== 'undefined') {
            BriefStatsModule.refresh();
        }
    }
    
    function handleGoalButtonClick() {
        UIModule.openClickDialog(".wait");

        // Setup goal dialog with current time
        GoalsModule.setupGoalDialog();
    }

    function setupButtonHandlers() {
        // Setup dialog tabs for the "Did it" dialog
        setupDialogTabs();

        $("#bought-button, #crave-button, #use-button, #wait-button").click(function() {
            if (this.id == "crave-button") {
                handleCraveButtonClick();
            } else if (this.id == "use-button") {
                handleUseButtonClick();
            } else if (this.id == "bought-button") {
                handleBoughtButtonClick();
            } else if (this.id == "wait-button") {
                handleGoalButtonClick();
            }
        });

        // Totals should trigger clicks of button
        $("#bought-total").click(function() {
            $("#bought-button").click();
        });
        $("#crave-total").click(function() {
            $("#crave-button").click();
        });
        $("#use-total").click(function() {
            $("#use-button").click();
        });
        $("#wait-total").click(function() {
            $("#wait-button").click();
        });

        //USE DIALOG CLICK
        $(".use.log-more-info button.submit").click(function () {
            handleUseButtonDialog();
        });
        $(".use.log-more-info button.cancel").click(function () {
            UIModule.closeClickDialog(".use");
        });

        //COST DIALOG CLICK
        $(".cost.log-more-info button.submit").click(function () {
            handleBoughtButtonDialog()

        });

        $(".cost.log-more-info button.cancel").click(function () {
            UIModule.closeClickDialog(".cost");
        })
        
    }

    function init(appJson) {
        json = appJson;
        setupButtonHandlers();
    }

    // Public API
    return {
        handleCraveButtonClick: handleCraveButtonClick,
        handleUseButtonClick: handleUseButtonClick,
        handleUseButtonDialog: handleUseButtonDialog,
        handleBoughtButtonClick: handleBoughtButtonClick,
        handleBoughtButtonDialog: handleBoughtButtonDialog,
        handleGoalButtonClick: handleGoalButtonClick,
        setupButtonHandlers: setupButtonHandlers,
        setupDialogTabs: setupDialogTabs,
        updateDialogTabsVisibility: updateDialogTabsVisibility,
        init: init
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ButtonsModule;
} else {
    window.ButtonsModule = ButtonsModule;
}
